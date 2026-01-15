// src/services/chessService.ts - Optimized
import { Chess } from "chess.js"
import type { GameMove } from "@/types/game"
import { roomService } from "@/services/room.service"
import { matchResultService } from "./match.result.service"
import { matchStatusWorker } from "@/workers/matchStatusWorker"
import { matchService } from "@/services/match.service"
import GameMoveModel from "@/models/GameMove"
import Match from "@/models/Match"

class ChessService {
  private games = new Map<string, Chess>()

  initializeGame(matchId: string): void {
    if (!this.games.has(matchId)) {
      this.games.set(matchId, new Chess())
    }
  }

  async makeMove(
    matchId: string,
    move: GameMove,
    playerColor: "white" | "black"
  ) {
    const game = this.games.get(matchId)
    if (!game) return { success: false, error: "Game not found" }

    const currentTurn = game.turn() === "w" ? "white" : "black"
    if (currentTurn !== playerColor) {
      return { success: false, error: "Not your turn" }
    }

    const moveResult = game.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion as any,
    })

    if (!moveResult) {
      return { success: false, error: "Invalid move" }
    }

    const fen = game.fen()

    // Get match to obtain MongoDB ObjectId for gameId
    const match = await matchService.getMatchById(matchId)
    if (!match) {
      return { success: false, error: "Match not found" }
    }

    await GameMoveModel.create({
      gameId: match._id, // Use MongoDB ObjectId, not numeric matchId
      moveNumber: game.history().length,
      san: moveResult.san,
      fen,
      playedBy: playerColor,
    })

    const isGameOver = game.isGameOver()

    let winner: "white" | "black" | "draw" | undefined

    if (isGameOver) {
      if (game.isCheckmate()) {
        winner = game.turn() === "w" ? "black" : "white"
      } else {
        winner = "draw"
      }
    }

    roomService.updateRoom(matchId, {
      gameState: fen,
      currentTurn: game.turn() === "w" ? "white" : "black",
      status: isGameOver ? "finished" : "active",
      winner,
    })

    if (isGameOver && winner) {
      roomService.finishRoom(matchId, winner)
      matchStatusWorker.stopGameTimer(matchId)
      await matchResultService.persistResult(matchId, winner, fen)

      // Use match._id for update (already fetched above)
      await Match.findByIdAndUpdate(match._id, {
        status: "FINISHED",
        "result.winner": winner,
        "result.finalFen": fen,
        "result.finishedAt": new Date(),
      })

      global.io?.to(matchId).emit("match_finished", {
        matchId,
        winner,
        finalFen: fen,
        reason: "game_over",
      })
    }

    return { success: true, fen, isGameOver, winner }
  }

  removeGame(matchId: string) {
    this.games.delete(matchId)
  }
}

export const chessService = new ChessService()
