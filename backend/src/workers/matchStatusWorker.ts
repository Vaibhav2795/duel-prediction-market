// workers/matchStatusWorker.ts
import Match from "@/models/Match";
import { roomService } from "@/services/room.service";
import { chessService } from "@/services/chess.service";
import { matchResultService } from "@/services/match.result.service";

const JOIN_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const GAME_TIME_MS = 10 * 60 * 1000; // 10 minutes per player

class MatchStatusWorker {
  private intervalId: NodeJS.Timeout | null = null;
  private timerIntervals = new Map<string, NodeJS.Timeout>();

  start() {
    // Check every 30 seconds for matches that need status updates
    this.intervalId = setInterval(() => {
      this.processMatches();
    }, 30000);

    // Also process immediately on start
    this.processMatches();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    // Clear all timer intervals
    this.timerIntervals.forEach(interval => clearInterval(interval));
    this.timerIntervals.clear();
  }

  private async processMatches() {
    try {
      const now = new Date();

      // 1. Transition SCHEDULED matches to LIVE when scheduledAt arrives
      const scheduledMatches = await Match.find({
        status: "SCHEDULED",
        scheduledAt: { $lte: now },
      });

      for (const match of scheduledMatches) {
        const joinWindowEndsAt = new Date(now.getTime() + JOIN_WINDOW_MS);
        await Match.findByIdAndUpdate(match._id, {
          status: "LIVE",
          liveAt: now,
          joinWindowEndsAt,
        });
        console.log(`✅ Match ${match._id} transitioned to LIVE`);
      }

      // 2. Cancel LIVE matches where join window expired and not both players joined
      const expiredJoinWindowMatches = await Match.find({
        status: "LIVE",
        joinWindowEndsAt: { $lte: now },
        gameStartedAt: { $exists: false },
      });

      for (const match of expiredJoinWindowMatches) {
        const room = roomService.getRoom(match._id.toString());
        if (!room || room.players.length < 2) {
          await Match.findByIdAndUpdate(match._id, {
            status: "CANCELLED",
          });
          console.log(`❌ Match ${match._id} cancelled - join window expired`);
          
          // Clean up room
          if (room) {
            roomService["rooms"]?.delete(match._id.toString());
          }
        }
      }

      // 3. Check for games where time expired
      const liveMatches = await Match.find({
        status: "LIVE",
        gameStartedAt: { $exists: true },
      });

      for (const match of liveMatches) {
        const room = roomService.getRoom(match._id.toString());
        if (!room || room.status === "finished") continue;

        // Check if white time expired
        if (match.whiteTimeRemaining <= 0 && room.currentTurn === "white") {
          await this.handleTimeExpiration(match._id.toString(), "black");
          continue;
        }

        // Check if black time expired
        if (match.blackTimeRemaining <= 0 && room.currentTurn === "black") {
          await this.handleTimeExpiration(match._id.toString(), "white");
          continue;
        }
      }
    } catch (error) {
      console.error("Error processing matches:", error);
    }
  }

  startGameTimer(matchId: string) {
    // Clear existing timer if any
    if (this.timerIntervals.has(matchId)) {
      clearInterval(this.timerIntervals.get(matchId)!);
    }

    // Update timer every second
    const interval = setInterval(async () => {
      try {
        const match = await Match.findById(matchId);
        if (!match || match.status !== "LIVE") {
          clearInterval(interval);
          this.timerIntervals.delete(matchId);
          return;
        }

        const room = roomService.getRoom(matchId);
        if (!room || room.status === "finished") {
          clearInterval(interval);
          this.timerIntervals.delete(matchId);
          return;
        }

        const now = Date.now();
        const gameStartedAt = match.gameStartedAt?.getTime() || now;
        const elapsed = now - gameStartedAt;

        // Calculate time remaining based on moves made
        // For simplicity, we'll use a simple countdown from game start
        // In a real implementation, you'd track time per move
        let whiteTimeRemaining = match.whiteTimeRemaining;
        let blackTimeRemaining = match.blackTimeRemaining;

        // Decrement time for current turn
        if (room.currentTurn === "white" && whiteTimeRemaining > 0) {
          whiteTimeRemaining = Math.max(0, whiteTimeRemaining - 1000);
        } else if (room.currentTurn === "black" && blackTimeRemaining > 0) {
          blackTimeRemaining = Math.max(0, blackTimeRemaining - 1000);
        }

        await Match.findByIdAndUpdate(matchId, {
          whiteTimeRemaining,
          blackTimeRemaining,
        });

        // Update room with timer info
        roomService.updateRoom(matchId, {
          whiteTimeRemaining,
          blackTimeRemaining,
        });

        // Emit timer update to clients
        const updatedRoom = roomService.getRoom(matchId);
        if (updatedRoom) {
          global.io?.to(matchId).emit("match_updated", updatedRoom);
        }
        
        global.io?.to(matchId).emit("timer_update", {
          whiteTimeRemaining,
          blackTimeRemaining,
        });

        // Check for time expiration
        if (whiteTimeRemaining <= 0 && room.currentTurn === "white") {
          await this.handleTimeExpiration(matchId, "black");
          clearInterval(interval);
          this.timerIntervals.delete(matchId);
        } else if (blackTimeRemaining <= 0 && room.currentTurn === "black") {
          await this.handleTimeExpiration(matchId, "white");
          clearInterval(interval);
          this.timerIntervals.delete(matchId);
        }
      } catch (error) {
        console.error(`Error updating timer for match ${matchId}:`, error);
      }
    }, 1000);

    this.timerIntervals.set(matchId, interval);
  }

  private async handleTimeExpiration(matchId: string, winner: "white" | "black") {
    try {
      const match = await Match.findById(matchId);
      if (!match) return;

      const room = roomService.getRoom(matchId);
      if (!room) return;

      const finalFen = room.gameState;
      const drawWinner: "white" | "black" | "draw" = winner;

      // Update match status
      await Match.findByIdAndUpdate(matchId, {
        status: "FINISHED",
        "result.winner": drawWinner,
        "result.finalFen": finalFen,
        "result.finishedAt": new Date(),
      });

      // Update room
      roomService.finishRoom(matchId, drawWinner);

      // Persist result
      await matchResultService.persistResult(matchId, drawWinner, finalFen);

      // Emit to clients
      global.io?.to(matchId).emit("match_finished", {
        matchId,
        winner: drawWinner,
        finalFen,
        reason: "time_expired",
      });

      // Clean up timer
      if (this.timerIntervals.has(matchId)) {
        clearInterval(this.timerIntervals.get(matchId)!);
        this.timerIntervals.delete(matchId);
      }

      console.log(`⏰ Match ${matchId} finished - ${winner} won by time`);
    } catch (error) {
      console.error(`Error handling time expiration for match ${matchId}:`, error);
    }
  }

  stopGameTimer(matchId: string) {
    if (this.timerIntervals.has(matchId)) {
      clearInterval(this.timerIntervals.get(matchId)!);
      this.timerIntervals.delete(matchId);
    }
  }
}

export const matchStatusWorker = new MatchStatusWorker();

