// workers/matchStatusWorker.ts - Optimized
import Match from "@/models/Match"
import { roomService } from "@/services/room.service"
import { chessService } from "@/services/chess.service"
import { matchResultService } from "@/services/match.result.service"

const JOIN_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const CHECK_INTERVAL_MS = 30000 // 30 seconds
const TIMER_INTERVAL_MS = 1000 // 1 second

type Winner = "white" | "black" | "draw"

class MatchStatusWorker {
  private intervalId: NodeJS.Timeout | null = null
  private timerIntervals = new Map<string, NodeJS.Timeout>()

  start(): void {
    this.intervalId = setInterval(() => this.processMatches(), CHECK_INTERVAL_MS)
    this.processMatches() // Run immediately
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.timerIntervals.forEach(clearInterval)
    this.timerIntervals.clear()
  }

  private async processMatches(): Promise<void> {
    try {
      const now = new Date()

      // Batch: Transition SCHEDULED -> LIVE
      await Match.updateMany(
        { status: "SCHEDULED", scheduledAt: { $lte: now } },
        { $set: { status: "LIVE", liveAt: now, joinWindowEndsAt: new Date(now.getTime() + JOIN_WINDOW_MS) } }
      )

      // Batch: Cancel expired join windows (no game started)
      const expiredMatches = await Match.find({
        status: "LIVE",
        joinWindowEndsAt: { $lte: now },
        gameStartedAt: { $exists: false }
      }, { _id: 1, matchId: 1 }).lean()

      const expiredIds = expiredMatches
        .filter(m => {
          const room = roomService.getRoom(m.matchId?.toString() || m._id.toString())
          return !room || room.players.length < 2
        })
        .map(m => m._id)

      if (expiredIds.length > 0) {
        await Match.updateMany({ _id: { $in: expiredIds } }, { $set: { status: "CANCELLED" } })
        console.log(`❌ Cancelled ${expiredIds.length} matches - join window expired`)
      }

      // Check time expiration for active games (handled by individual timers)
    } catch (error) {
      console.error("Error processing matches:", error)
    }
  }

  startGameTimer(matchId: string): void {
    this.stopGameTimer(matchId) // Clear existing

    const interval = setInterval(async () => {
      try {
        const room = roomService.getRoom(matchId)
        if (!room || room.status === "finished") {
          return this.stopGameTimer(matchId)
        }

        const match = await Match.findOne({ matchId: parseInt(matchId) || matchId })
          .select("status whiteTimeRemaining blackTimeRemaining")
          .lean()
        
        if (!match || match.status !== "LIVE") {
          return this.stopGameTimer(matchId)
        }

        // Decrement current player's time
        const isWhiteTurn = room.currentTurn === "white"
        let { whiteTimeRemaining = 0, blackTimeRemaining = 0 } = match

        if (isWhiteTurn) {
          whiteTimeRemaining = Math.max(0, whiteTimeRemaining - TIMER_INTERVAL_MS)
        } else {
          blackTimeRemaining = Math.max(0, blackTimeRemaining - TIMER_INTERVAL_MS)
        }

        // Update DB and room
        await Match.updateOne(
          { matchId: parseInt(matchId) || matchId },
          { $set: { whiteTimeRemaining, blackTimeRemaining } }
        )
        roomService.updateRoom(matchId, { whiteTimeRemaining, blackTimeRemaining })

        // Emit updates
        const updatedRoom = roomService.getRoom(matchId)
        if (updatedRoom) {
          global.io?.to(matchId).emit("match_updated", updatedRoom)
        }
        global.io?.to(matchId).emit("timer_update", { whiteTimeRemaining, blackTimeRemaining })

        // Check time expiration
        if (isWhiteTurn && whiteTimeRemaining <= 0) {
          await this.handleTimeExpiration(matchId, "black")
          this.stopGameTimer(matchId)
        } else if (!isWhiteTurn && blackTimeRemaining <= 0) {
          await this.handleTimeExpiration(matchId, "white")
          this.stopGameTimer(matchId)
        }
      } catch (error) {
        console.error(`Timer error for ${matchId}:`, error)
      }
    }, TIMER_INTERVAL_MS)

    this.timerIntervals.set(matchId, interval)
  }

  stopGameTimer(matchId: string): void {
    const interval = this.timerIntervals.get(matchId)
    if (interval) {
      clearInterval(interval)
      this.timerIntervals.delete(matchId)
    }
  }

  private async handleTimeExpiration(matchId: string, winner: Winner): Promise<void> {
    try {
      const room = roomService.getRoom(matchId)
      const finalFen = room?.gameState || ""

      await Match.updateOne(
        { matchId: parseInt(matchId) || matchId },
        {
          $set: {
            status: "FINISHED",
            "result.winner": winner,
            "result.finalFen": finalFen,
            "result.finishedAt": new Date()
          }
        }
      )

      roomService.finishRoom(matchId, winner)
      await matchResultService.persistResult(matchId, winner, finalFen)

      global.io?.to(matchId).emit("match_finished", {
        matchId,
        winner,
        finalFen,
        reason: "time_expired"
      })

      console.log(`⏰ Match ${matchId} finished - ${winner} won by time`)
    } catch (error) {
      console.error(`Time expiration error for ${matchId}:`, error)
    }
  }
}

export const matchStatusWorker = new MatchStatusWorker()
