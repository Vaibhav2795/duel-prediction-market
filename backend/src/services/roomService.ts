import { v4 as uuidv4 } from "uuid";
import type {
	Room,
	Player,
	RoomCreateRequest,
	RoomJoinRequest
} from "../types/game";

class RoomService {
	private rooms: Map<string, Room> = new Map();
	private readonly MAX_PLAYERS_PER_ROOM = 2;

	createRoom(request: RoomCreateRequest, socketId: string): Room {
		const roomId = uuidv4();
		const player: Player = {
			id: uuidv4(),
			socketId,
			address: request.playerAddress,
			color: "white" // First player is white
		};

		const room: Room = {
			id: roomId,
			entryFee: request.entryFee,
			currency: request.currency || "USD", // Default to USD if not specified
			players: [player],
			gameState:
				"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", // Starting position
			status: "waiting",
			currentTurn: "white",
			createdAt: new Date()
		};

		this.rooms.set(roomId, room);
		return room;
	}

	joinRoom(
		request: RoomJoinRequest,
		socketId: string
	): { room: Room; success: boolean; error?: string } {
		const room = this.rooms.get(request.roomId);

		if (!room) {
			return {
				room: null as any,
				success: false,
				error: "Room not found"
			};
		}

		if (room.status !== "waiting") {
			return {
				room,
				success: false,
				error: "Room is not accepting new players"
			};
		}

		if (room.players.length >= this.MAX_PLAYERS_PER_ROOM) {
			return { room, success: false, error: "Room is full" };
		}

		// Check if player is already in the room
		if (room.players.some(p => p.address === request.playerAddress)) {
			return { room, success: false, error: "Player already in room" };
		}

		const player: Player = {
			id: uuidv4(),
			socketId,
			address: request.playerAddress,
			color: "black" // Second player is black
		};

		room.players.push(player);
		room.status = "active";

		return { room, success: true };
	}

	getRoom(roomId: string): Room | undefined {
		return this.rooms.get(roomId);
	}

	getAllRooms(): Room[] {
		return Array.from(this.rooms.values());
	}

	getAvailableRooms(): Room[] {
		return this.getAllRooms().filter(
			room =>
				room.status === "waiting" &&
				room.players.length < this.MAX_PLAYERS_PER_ROOM
		);
	}

	updateRoom(roomId: string, updates: Partial<Room>): boolean {
		const room = this.rooms.get(roomId);
		if (!room) return false;

		Object.assign(room, updates);
		return true;
	}

	removePlayerFromRoom(roomId: string, socketId: string): void {
		const room = this.rooms.get(roomId);
		if (!room) return;

		room.players = room.players.filter(p => p.socketId !== socketId);

		if (room.players.length === 0) {
			this.rooms.delete(roomId);
		} else {
			room.status = "waiting";
		}
	}

	finishRoom(roomId: string, winner?: "white" | "black" | "draw"): void {
		const room = this.rooms.get(roomId);
		if (!room) return;

		room.status = "finished";
		room.winner = winner;
	}
}

export const roomService = new RoomService();
