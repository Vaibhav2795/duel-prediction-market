// src/services/chessService.ts
import { Chess } from "chess.js"
import type { GameMove } from "@/types/game"
import { roomService } from "@/services/room.service"
import { matchResultService } from "./match.result.service"
import GameMoveModel from "@/models/GameMove"

class ChessService {
  private games = new Map<string, Chess>()

  initializeGame(matchId: string) {
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

    await GameMoveModel.create({
      gameId: matchId,
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

      await matchResultService.persistResult(matchId, winner, fen)

      global.io?.to(matchId).emit("match_finished", {
        matchId,
        winner,
        finalFen: fen,
      })
    }

    return { success: true, fen, isGameOver, winner }
  }

  removeGame(matchId: string) {
    this.games.delete(matchId)
  }
}

export const chessService = new ChessService()
