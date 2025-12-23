import { io, Socket } from "socket.io-client";
import type { Room, GameMove } from "../types/game";

class SocketService {
	private socket: Socket | null = null;
	// Use environment variable if set, otherwise use same origin (for production) or localhost:3000 (for dev)
	private readonly SERVER_URL =
		import.meta.env.VITE_SERVER_URL ||
		(import.meta.env.PROD ? undefined : "http://localhost:3000");

	connect(): Socket {
		if (!this.socket) {
			// If SERVER_URL is undefined, socket.io will connect to the same origin
			this.socket = io(this.SERVER_URL, {
				transports: ["websocket"]
			});
		}
		return this.socket;
	}

	disconnect(): void {
		if (this.socket) {
			this.socket.disconnect();
			this.socket = null;
		}
	}

	getSocket(): Socket | null {
		return this.socket;
	}

	// Room management
	createRoom(
		entryFee: number,
		playerAddress: string,
		currency?: string
	): void {
		this.socket?.emit("create_room", { entryFee, currency, playerAddress });
	}

	joinRoom(roomId: string, playerAddress: string): void {
		this.socket?.emit("join_room", { roomId, playerAddress });
	}

	getRooms(): void {
		this.socket?.emit("get_rooms");
	}

	getRoom(roomId: string): void {
		this.socket?.emit("get_room", roomId);
	}

	// Game management
	makeMove(roomId: string, move: GameMove, playerAddress: string): void {
		this.socket?.emit("make_move", { roomId, move, playerAddress });
	}

	getGameState(roomId: string): void {
		this.socket?.emit("get_game_state", roomId);
	}

	// Event listeners
	onRoomCreated(callback: (room: Room) => void): void {
		this.socket?.on("room_created", callback);
	}

	onRoomJoined(callback: (room: Room) => void): void {
		this.socket?.on("room_joined", callback);
	}

	onRoomUpdated(callback: (room: Room) => void): void {
		this.socket?.on("room_updated", callback);
	}

	onRoomsList(callback: (rooms: Room[]) => void): void {
		this.socket?.on("rooms_list", callback);
	}

	onRoomsUpdated(callback: (rooms: Room[]) => void): void {
		this.socket?.on("rooms_updated", callback);
	}

	onRoomDetails(callback: (room: Room) => void): void {
		this.socket?.on("room_details", callback);
	}

	onMoveMade(
		callback: (data: {
			move: GameMove;
			gameState: string;
			room: Room;
			isGameOver?: boolean;
			winner?: "white" | "black" | "draw";
		}) => void
	): void {
		this.socket?.on("move_made", callback);
	}

	onGameState(
		callback: (data: { room: Room; gameState: string }) => void
	): void {
		this.socket?.on("game_state", callback);
	}

	onError(callback: (error: { message: string }) => void): void {
		this.socket?.on("error", callback);
	}

	onJoinRoomError(callback: (error: { message: string }) => void): void {
		this.socket?.on("join_room_error", callback);
	}

	onMoveError(callback: (error: { message: string }) => void): void {
		this.socket?.on("move_error", callback);
	}

	onPlayerLeft(callback: (data: { roomId: string }) => void): void {
		this.socket?.on("player_left", callback);
	}

	// Remove event listeners
	off(event: string, callback?: (...args: any[]) => void): void {
		this.socket?.off(event, callback);
	}
}

export const socketService = new SocketService();
