// src/sockets/index.ts
import { Server, Socket } from "socket.io"
import type { Server as HttpServer } from "http"
import { roomService } from "@/services/room.service"
import { chessService } from "@/services/chess.service"
import type { JoinMatchRequest, GameMove } from "@/types/game"
import Match from "@/models/Match"
import { matchResultService } from "@/services/match.result.service"

export function initSockets(server: HttpServer) {
  const io = new Server(server, { cors: { origin: "*" } })

  io.on("connection", (socket: Socket) => {
    console.log("🔌 socket connected", socket.id)

    socket.on(
      "join_match",
      async (data: JoinMatchRequest & { stakeAmount: number }) => {
        try {
          const { matchId, playerAddress } = data

          // 🔒 1. Fetch match from DB
          const match = await Match.findById(matchId)

          if (!match) {
            socket.emit("join_error", { message: "Match not found" })
            return
          }

          if (!match.player1 || !match.player2) {
            socket.emit("join_error", {
              message: "Match players not configured",
            })
            return
          }

          // 🔒 2. Enforce player1 / player2 only
          const allowedWallets = [match.player1.wallet, match.player2.wallet]

          if (!allowedWallets.includes(playerAddress)) {
            socket.emit("join_error", {
              message: "Only assigned players can join this match",
            })
            return
          }

          // ✅ 3. Join room
          const result = roomService.joinRoom(
            matchId,
            match.stakeAmount, // authoritative from DB
            playerAddress,
            socket.id
          )

          if (!result.success || !result.room) {
            socket.emit("join_error", { message: result.error })
            return
          }

          socket.join(matchId)
          chessService.initializeGame(matchId)

          socket.emit("match_joined", result.room)
          io.to(matchId).emit("match_updated", result.room)
        } catch (error) {
          console.error("join_match failed:", error)
          socket.emit("join_error", { message: "Failed to join match" })
        }
      }
    )

    socket.on(
      "make_move",
      async (data: {
        matchId: string
        move: GameMove
        playerAddress: string
      }) => {
        const room = roomService.getRoom(data.matchId)
        if (!room) return

        const player = room.players.find(
          (p) => p.address === data.playerAddress
        )
        if (!player) return

        const result = await chessService.makeMove(
          data.matchId,
          data.move,
          player.color
        )

        if (!result.success) {
          socket.emit("move_error", { message: result.error })
          return
        }

        // Get updated room to include currentTurn
        const updatedRoom = roomService.getRoom(data.matchId)

        io.to(data.matchId).emit("move_made", {
          move: data.move,
          fen: result.fen,
          isGameOver: result.isGameOver,
          winner: result.winner,
          currentTurn: updatedRoom?.currentTurn,
        })
      }
    )

    socket.on("join_spectator", async (data: { matchId: string }) => {
      try {
        const { matchId } = data

        const room = roomService.getRoom(matchId)

        if (!room) {
          socket.emit("join_error", {
            message: "Match not live or not found",
          })
          return
        }

        // Join socket room as spectator
        socket.join(matchId)

        // Send current state immediately
        socket.emit("spectator_joined", {
          matchId,
          gameState: room.gameState,
          status: room.status,
          currentTurn: room.currentTurn,
          players: room.players.map((p) => ({
            address: p.address,
            color: p.color,
          })),
        })

        console.log(`👀 Spectator joined match ${matchId}`)
      } catch (error) {
        console.error("join_spectator failed:", error)
        socket.emit("join_error", {
          message: "Failed to join as spectator",
        })
      }
    })

    socket.on("disconnect", () => {
      console.log("🔌 socket disconnected", socket.id)

      roomService["rooms"]?.forEach((_, matchId) => {
        roomService.removePlayer(matchId, socket.id)
        chessService.removeGame(matchId)
        io.to(matchId).emit("player_left")
      })
    })
  })

  global.io = io
}
