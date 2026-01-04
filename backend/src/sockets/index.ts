// src/sockets/index.ts
import { Server, Socket } from "socket.io";
import type { Server as HttpServer } from "http";
import { roomService } from "@/services/room.service";
import { chessService } from "@/services/chess.service";
import type { JoinMatchRequest, GameMove } from "@/types/game";
import Match from "@/models/Match";
import { matchResultService } from "@/services/match.result.service";
import { matchStatusWorker } from "@/workers/matchStatusWorker";

export function initSockets(server: HttpServer) {
	const io = new Server(server, { cors: { origin: "*" } });

	io.on("connection", (socket: Socket) => {
		console.log("🔌 socket connected", socket.id);

		socket.on(
			"join_match",
			async (data: JoinMatchRequest & { stakeAmount: number }) => {
				try {
					const { matchId, playerAddress } = data;

					// 🔒 1. Fetch match from DB
					const match = await Match.findById(matchId);

					if (!match) {
						socket.emit("join_error", {
							message: "Match not found"
						});
						return;
					}

					if (!match.player1 || !match.player2) {
						socket.emit("join_error", {
							message: "Match players not configured"
						});
						return;
					}

					// 🔒 2. Check if match is LIVE (required for joining)
					if (match.status !== "LIVE") {
						socket.emit("join_error", {
							message: `Match is not live yet. Status: ${match.status}`
						});
						return;
					}

					// 🔒 3. Check if join window is still open
					const now = new Date();
					if (
						match.joinWindowEndsAt &&
						match.joinWindowEndsAt < now
					) {
						socket.emit("join_error", {
							message: "Join window has expired"
						});
						return;
					}

					// 🔒 4. Enforce player1 / player2 only
					const allowedWallets = [
						match.player1.wallet,
						match.player2.wallet
					];

					if (!allowedWallets.includes(playerAddress)) {
						socket.emit("join_error", {
							message: "Only assigned players can join this match"
						});
						return;
					}

					// ✅ 5. Join room
					const result = roomService.joinRoom(
						matchId,
						match.stakeAmount, // authoritative from DB
						playerAddress,
						socket.id
					);

					if (!result.success || !result.room) {
						// If player is already joined, send them the current room state instead of error
						if (result.error === "Player already joined") {
							const existingRoom = roomService.getRoom(matchId);
							if (existingRoom) {
								// Update socket ID in case it changed (reconnection)
								roomService.updatePlayerSocketId(
									matchId,
									playerAddress,
									socket.id
								);

								// Include timer info if game has started
								if (match.gameStartedAt) {
									existingRoom.gameStartedAt =
										match.gameStartedAt;
									existingRoom.whiteTimeRemaining =
										match.whiteTimeRemaining;
									existingRoom.blackTimeRemaining =
										match.blackTimeRemaining;
								}

								// Include join window info for LIVE matches
								if (
									match.status === "LIVE" &&
									match.joinWindowEndsAt
								) {
									existingRoom.joinWindowEndsAt =
										match.joinWindowEndsAt;
								}

								socket.join(matchId);
								socket.emit("match_joined", existingRoom);
								io.to(matchId).emit(
									"match_updated",
									existingRoom
								);
								return;
							}
						}
						socket.emit("join_error", { message: result.error });
						return;
					}

					socket.join(matchId);
					chessService.initializeGame(matchId);

					// ✅ 6. If both players joined, start the game timer
					if (
						result.room.players.length === 2 &&
						!match.gameStartedAt
					) {
						const gameStartedAt = new Date();
						const whiteTimeRemaining = 10 * 60 * 1000; // 10 minutes
						const blackTimeRemaining = 10 * 60 * 1000; // 10 minutes

						await Match.findByIdAndUpdate(matchId, {
							gameStartedAt,
							whiteTimeRemaining,
							blackTimeRemaining
						});

						// Update room with timer info
						result.room.gameStartedAt = gameStartedAt;
						result.room.whiteTimeRemaining = whiteTimeRemaining;
						result.room.blackTimeRemaining = blackTimeRemaining;

						// Start the game timer
						matchStatusWorker.startGameTimer(matchId);

						console.log(
							`🎮 Game started for match ${matchId} - 10 minute timer started`
						);
					} else if (match.gameStartedAt) {
						// Game already started, include timer info
						result.room.gameStartedAt = match.gameStartedAt;
						result.room.whiteTimeRemaining =
							match.whiteTimeRemaining;
						result.room.blackTimeRemaining =
							match.blackTimeRemaining;
					}

					// Include join window info for LIVE matches
					if (match.status === "LIVE" && match.joinWindowEndsAt) {
						result.room.joinWindowEndsAt = match.joinWindowEndsAt;
					}

					socket.emit("match_joined", result.room);
					io.to(matchId).emit("match_updated", result.room);
				} catch (error) {
					console.error("join_match failed:", error);
					socket.emit("join_error", {
						message: "Failed to join match"
					});
				}
			}
		);

		socket.on(
			"make_move",
			async (data: {
				matchId: string;
				move: GameMove;
				playerAddress: string;
			}) => {
				const room = roomService.getRoom(data.matchId);
				if (!room) return;

				const player = room.players.find(
					p => p.address === data.playerAddress
				);
				if (!player) return;

				const result = await chessService.makeMove(
					data.matchId,
					data.move,
					player.color
				);

				if (!result.success) {
					socket.emit("move_error", { message: result.error });
					return;
				}

				// Get updated room to include all room data
				const updatedRoom = roomService.getRoom(data.matchId);
				if (!updatedRoom) {
					socket.emit("move_error", { message: "Room not found" });
					return;
				}

				// Emit move_made with full room object and gameState
				io.to(data.matchId).emit("move_made", {
					move: data.move,
					gameState: result.fen, // Use gameState instead of fen for consistency
					room: updatedRoom, // Send full room object
					isGameOver: result.isGameOver,
					winner: result.winner
				});
			}
		);

		socket.on("join_spectator", async (data: { matchId: string }) => {
			try {
				const { matchId } = data;

				const room = roomService.getRoom(matchId);

				if (!room) {
					socket.emit("join_error", {
						message: "Match not live or not found"
					});
					return;
				}

				// Join socket room as spectator
				socket.join(matchId);

				// Send current state immediately
				socket.emit("spectator_joined", {
					matchId,
					gameState: room.gameState,
					status: room.status,
					currentTurn: room.currentTurn,
					players: room.players.map(p => ({
						address: p.address,
						color: p.color
					}))
				});

				console.log(`👀 Spectator joined match ${matchId}`);
			} catch (error) {
				console.error("join_spectator failed:", error);
				socket.emit("join_error", {
					message: "Failed to join as spectator"
				});
			}
		});

		socket.on("disconnect", () => {
			console.log("🔌 socket disconnected", socket.id);

			roomService["rooms"]?.forEach((_, matchId) => {
				roomService.removePlayer(matchId, socket.id);
				chessService.removeGame(matchId);
				io.to(matchId).emit("player_left");
			});
		});
	});

	global.io = io;
}
