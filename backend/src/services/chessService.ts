import { Chess } from "chess.js";
import type { GameMove } from "../types/game.js";
import { roomService } from "./roomService.js";

class ChessService {
	private games: Map<string, Chess> = new Map();

	initializeGame(roomId: string): void {
		const game = new Chess();
		this.games.set(roomId, game);
	}

	makeMove(
		roomId: string,
		move: GameMove,
		playerColor: "white" | "black"
	): {
		success: boolean;
		error?: string;
		gameState?: string;
		isGameOver?: boolean;
		winner?: "white" | "black" | "draw";
	} {
		const game = this.games.get(roomId);
		if (!game) {
			return { success: false, error: "Game not found" };
		}

		const room = roomService.getRoom(roomId);
		if (!room) {
			return { success: false, error: "Room not found" };
		}

		// Check if it's the player's turn
		const currentTurn = game.turn() === "w" ? "white" : "black";
		if (currentTurn !== playerColor) {
			return { success: false, error: "Not your turn" };
		}

		try {
			const moveObj = game.move({
				from: move.from,
				to: move.to,
				promotion: move.promotion as any
			});

			if (!moveObj) {
				return { success: false, error: "Invalid move" };
			}

			const gameState = game.fen();
			const isGameOver = game.isGameOver();
			let winner: "white" | "black" | "draw" | undefined;

			if (isGameOver) {
				if (game.isCheckmate()) {
					winner = game.turn() === "w" ? "black" : "white";
				} else if (game.isDraw() || game.isStalemate()) {
					winner = "draw";
				}
			}

			// Update room state
			roomService.updateRoom(roomId, {
				gameState,
				currentTurn: game.turn() === "w" ? "white" : "black",
				status: isGameOver ? "finished" : "active",
				winner
			});

			if (isGameOver && winner) {
				roomService.finishRoom(roomId, winner);
			}

			return {
				success: true,
				gameState,
				isGameOver,
				winner
			};
		} catch (error) {
			return { success: false, error: "Invalid move" };
		}
	}

	getGameState(roomId: string): string | null {
		const game = this.games.get(roomId);
		return game ? game.fen() : null;
	}

	getGame(roomId: string): Chess | undefined {
		return this.games.get(roomId);
	}

	removeGame(roomId: string): void {
		this.games.delete(roomId);
	}
}

export const chessService = new ChessService();
