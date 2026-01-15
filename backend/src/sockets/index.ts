// src/sockets/index.ts - Optimized
import { Server, Socket } from "socket.io"
import type { Server as HttpServer } from "http"
import { roomService } from "@/services/room.service"
import { chessService } from "@/services/chess.service"
import type { JoinMatchRequest, GameMove, LiveMatch } from "@/types/game"
import Match from "@/models/Match"
import { matchStatusWorker } from "@/workers/matchStatusWorker"
import { matchService } from "@/services/match.service"

const GAME_TIME_MS = 10 * 60 * 1000 // 10 minutes per player

// Helper to emit error
const emitError = (socket: Socket, message: string) => 
	socket.emit("join_error", { message })

// Attach timer info to room from match
const attachTimerInfo = (room: LiveMatch, match: any): void => {
	if (match.gameStartedAt) {
		room.gameStartedAt = match.gameStartedAt
		room.whiteTimeRemaining = match.whiteTimeRemaining
		room.blackTimeRemaining = match.blackTimeRemaining
	}
	if (match.status === "LIVE" && match.joinWindowEndsAt) {
		room.joinWindowEndsAt = match.joinWindowEndsAt
	}
}

export function initSockets(server: HttpServer) {
	const io = new Server(server, { cors: { origin: "*" } })

	io.on("connection", (socket: Socket) => {
		console.log("🔌 socket connected", socket.id)

		// JOIN MATCH
		socket.on("join_match", async (data: JoinMatchRequest & { stakeAmount: number }) => {
			const { matchId, playerAddress } = data
			
			try {
				// Validate match
				const match = await matchService.getMatchById(matchId)
				if (!match) return emitError(socket, "Match not found")
				if (!match.player1 || !match.player2) return emitError(socket, "Match players not configured")
				if (match.status !== "LIVE") return emitError(socket, `Match is not live. Status: ${match.status}`)
				if (match.joinWindowEndsAt && match.joinWindowEndsAt < new Date()) {
					return emitError(socket, "Join window has expired")
				}

				// Validate player authorization
				const allowedWallets = [match.player1.wallet.toLowerCase(), match.player2.wallet.toLowerCase()]
				if (!allowedWallets.includes(playerAddress.toLowerCase())) {
					return emitError(socket, "Only assigned players can join this match")
				}

				// Join room
				const result = roomService.joinRoom(matchId, match.stakeAmount, playerAddress, socket.id)
				if (!result.success || !result.room) {
					return emitError(socket, result.error || "Failed to join")
				}

				socket.join(matchId)
				chessService.initializeGame(matchId)

				// Start game timer when both players join
				if (result.room.players.length === 2 && !match.gameStartedAt) {
					const gameStartedAt = new Date()
					await Match.findByIdAndUpdate(match._id, {
						gameStartedAt,
						whiteTimeRemaining: GAME_TIME_MS,
						blackTimeRemaining: GAME_TIME_MS
					})
					result.room.gameStartedAt = gameStartedAt
					result.room.whiteTimeRemaining = GAME_TIME_MS
					result.room.blackTimeRemaining = GAME_TIME_MS
					matchStatusWorker.startGameTimer(matchId)
					console.log(`🎮 Game started: ${matchId}`)
				} else {
					attachTimerInfo(result.room, match)
				}

				socket.emit("match_joined", result.room)
				io.to(matchId).emit("match_updated", result.room)
			} catch (error) {
				console.error("join_match failed:", error)
				emitError(socket, error instanceof Error ? error.message : "Failed to join match")
			}
		})

		// MAKE MOVE
		socket.on("make_move", async (data: { matchId: string; move: GameMove; playerAddress: string }) => {
			const room = roomService.getRoom(data.matchId)
			if (!room) return

			const player = room.players.find(p => p.address.toLowerCase() === data.playerAddress.toLowerCase())
			if (!player) return

			const result = await chessService.makeMove(data.matchId, data.move, player.color)
			if (!result.success) {
				return socket.emit("move_error", { message: result.error })
			}

			const updatedRoom = roomService.getRoom(data.matchId)
			if (!updatedRoom) return socket.emit("move_error", { message: "Room not found" })

			io.to(data.matchId).emit("move_made", {
				move: data.move,
				gameState: result.fen,
				room: updatedRoom,
				isGameOver: result.isGameOver,
				winner: result.winner
			})
		})

		// SPECTATOR JOIN
		socket.on("join_spectator", (data: { matchId: string }) => {
			const room = roomService.getRoom(data.matchId)
			if (!room) return emitError(socket, "Match not live or not found")

			socket.join(data.matchId)
			socket.emit("spectator_joined", {
				matchId: data.matchId,
				gameState: room.gameState,
				status: room.status,
				currentTurn: room.currentTurn,
				players: room.players.map(p => ({ address: p.address, color: p.color }))
			})
		})

		// DISCONNECT - O(1) lookup using socket index
		socket.on("disconnect", () => {
			console.log("🔌 socket disconnected", socket.id)
			const matchId = roomService.removePlayerBySocket(socket.id)
			if (matchId) {
				chessService.removeGame(matchId)
				io.to(matchId).emit("player_left")
			}
		})
	})

	global.io = io
}
