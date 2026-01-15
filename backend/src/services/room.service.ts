// src/services/roomService.ts - Optimized
import type { LiveMatch, Player } from "../types/game"

const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
const MAX_PLAYERS = 2

class RoomService {
	private rooms = new Map<string, LiveMatch>()
	// Index: socketId -> matchId for O(1) disconnect lookup
	private socketToMatch = new Map<string, string>()

	private createRoom(matchId: string, stakeAmount: number): LiveMatch {
		const room: LiveMatch = {
			id: matchId,
			stakeAmount,
			players: [],
			gameState: INITIAL_FEN,
			status: "waiting",
			currentTurn: "white",
			createdAt: new Date()
		}
		this.rooms.set(matchId, room)
		return room
	}

	getRoom(matchId: string): LiveMatch | undefined {
		return this.rooms.get(matchId)
	}

	joinRoom(
		matchId: string,
		stakeAmount: number,
		playerAddress: string,
		socketId: string
	): { success: boolean; room?: LiveMatch; error?: string } {
		const room = this.rooms.get(matchId) ?? this.createRoom(matchId, stakeAmount)
		const addressLower = playerAddress.toLowerCase()

		// Find existing player (O(n) where n <= 2)
		const existingPlayer = room.players.find(p => p.address.toLowerCase() === addressLower)

		if (existingPlayer) {
			// Reconnection: update socket mapping
			this.socketToMatch.delete(existingPlayer.socketId)
			existingPlayer.socketId = socketId
			this.socketToMatch.set(socketId, matchId)
			return { success: true, room }
		}

		if (room.players.length >= MAX_PLAYERS) {
			return { success: false, error: "Match already full" }
		}

		// Add new player
		const player: Player = {
			id: playerAddress,
			socketId,
			address: playerAddress,
			color: room.players.length === 0 ? "white" : "black"
		}

		room.players.push(player)
		this.socketToMatch.set(socketId, matchId)

		if (room.players.length === MAX_PLAYERS) {
			room.status = "active"
		}

		return { success: true, room }
	}

	updateRoom(matchId: string, updates: Partial<LiveMatch>): void {
		const room = this.rooms.get(matchId)
		if (room) Object.assign(room, updates)
	}

	// O(1) disconnect using socket index
	removePlayerBySocket(socketId: string): string | undefined {
		const matchId = this.socketToMatch.get(socketId)
		if (!matchId) return undefined

		this.socketToMatch.delete(socketId)
		const room = this.rooms.get(matchId)
		if (!room) return matchId

		const playerIndex = room.players.findIndex(p => p.socketId === socketId)
		if (playerIndex !== -1) {
			room.players.splice(playerIndex, 1)
		}

		if (room.players.length === 0) {
			this.rooms.delete(matchId)
		} else {
			room.status = "waiting"
		}

		return matchId
	}

	finishRoom(matchId: string, winner: "white" | "black" | "draw"): void {
		const room = this.rooms.get(matchId)
		if (room) {
			room.status = "finished"
			room.winner = winner
		}
	}

	// For iteration (used by worker)
	getAllRoomIds(): string[] {
		return Array.from(this.rooms.keys())
	}
}

export const roomService = new RoomService()
