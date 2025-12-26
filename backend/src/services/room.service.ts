// src/services/roomService.ts
import type { LiveMatch, Player } from "../types/game"

class RoomService {
	private rooms = new Map<string, LiveMatch>();
	private readonly MAX_PLAYERS = 2;

	createOrGetRoom(matchId: string, stakeAmount: number): LiveMatch {
		let room = this.rooms.get(matchId);

		if (!room) {
			room = {
				id: matchId,
				stakeAmount,
				players: [],
				gameState:
					"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
				status: "waiting",
				currentTurn: "white",
				createdAt: new Date()
			};

			this.rooms.set(matchId, room);
		}

		return room;
	}

	joinRoom(
		matchId: string,
		stakeAmount: number,
		playerAddress: string,
		socketId: string
	): { success: boolean; room?: LiveMatch; error?: string } {
		const room = this.createOrGetRoom(matchId, stakeAmount);

		if (room.players.length >= this.MAX_PLAYERS) {
			return { success: false, error: "Match already full" };
		}

		if (room.players.some(p => p.address === playerAddress)) {
			return { success: false, error: "Player already joined" };
		}

		const color: "white" | "black" =
			room.players.length === 0 ? "white" : "black";

		const player: Player = {
			id: playerAddress,
			socketId,
			address: playerAddress,
			color
		};

		room.players.push(player);

		if (room.players.length === 2) {
			room.status = "active";
		}

		return { success: true, room };
	}

	getRoom(matchId: string) {
		return this.rooms.get(matchId);
	}

	updateRoom(matchId: string, updates: Partial<LiveMatch>) {
		const room = this.rooms.get(matchId);
		if (!room) return;
		Object.assign(room, updates);
	}

	removePlayer(matchId: string, socketId: string) {
		const room = this.rooms.get(matchId);
		if (!room) return;

		room.players = room.players.filter(p => p.socketId !== socketId);

		if (room.players.length === 0) {
			this.rooms.delete(matchId);
		} else {
			room.status = "waiting";
		}
	}

	finishRoom(matchId: string, winner: "white" | "black" | "draw") {
		const room = this.rooms.get(matchId);
		if (!room) return;

		room.status = "finished";
		room.winner = winner;
	}

	updatePlayerSocketId(
		matchId: string,
		playerAddress: string,
		newSocketId: string
	) {
		const room = this.rooms.get(matchId);
		if (!room) return;

		const player = room.players.find(p => p.address === playerAddress);
		if (player) {
			player.socketId = newSocketId;
		}
	}
}

export const roomService = new RoomService()
