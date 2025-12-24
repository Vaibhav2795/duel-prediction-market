// sockets/index.ts
import { Server } from "socket.io"
import type { Server as HttpServer } from "http"
import type { Socket } from "socket.io"
import { roomService } from "../services/roomService.js";
import { chessService } from "../services/chessService.js";
import { mockBettingService } from "../services/mockBettingService.js";
import type {
	RoomCreateRequest,
	RoomJoinRequest,
	GameMove,
	Outcome,
	MarketStatus,
	MarketCategory
} from "../types/game.js";

// Store connected clients for market updates
const marketSubscribers: Map<string, Set<string>> = new Map();

// Simulate probability updates every few seconds
let probabilityInterval: NodeJS.Timeout | null = null;

export function initSockets(server: HttpServer): void {
  const io = new Server(server, {
    cors: { origin: "*" },
  })

  // Start probability simulation
  if (!probabilityInterval) {
    probabilityInterval = setInterval(() => {
      marketSubscribers.forEach((sockets, marketId) => {
        const market = mockBettingService.simulateProbabilityUpdate(marketId);
        if (market && sockets.size > 0) {
          sockets.forEach(socketId => {
            const socket = io.sockets.sockets.get(socketId);
            if (socket) {
              socket.emit("market_updated", market);
            }
          });
        }
      });
    }, 5000);
  }

  io.on("connection", (socket: Socket) => {
		console.log("🔌 socket connected", socket.id);

		// Create a new room
		socket.on("create_room", (data: RoomCreateRequest) => {
			try {
				const room = roomService.createRoom(data, socket.id);
				chessService.initializeGame(room.id);

				socket.join(room.id);
				socket.emit("room_created", room);

				// Notify all clients about available rooms update
				io.emit("rooms_updated", roomService.getAvailableRooms());

				console.log(
					`✅ Room created: ${room.id} by ${data.playerAddress}`
				);
			} catch (error) {
				socket.emit("error", { message: "Failed to create room" });
				console.error("Error creating room:", error);
			}
		});

		// Join an existing room
		socket.on("join_room", (data: RoomJoinRequest) => {
			try {
				const result = roomService.joinRoom(data, socket.id);

				if (!result.success) {
					socket.emit("join_room_error", { message: result.error });
					return;
				}

				const room = result.room;
				socket.join(room.id);

				// Initialize game if both players are present
				if (room.players.length === 2) {
					chessService.initializeGame(room.id);
				}

				// Notify the joining player
				socket.emit("room_joined", room);

				// Notify all players in the room
				io.to(room.id).emit("room_updated", room);

				// Notify all clients about available rooms update
				io.emit("rooms_updated", roomService.getAvailableRooms());

				console.log(
					`✅ Player ${data.playerAddress} joined room ${room.id}`
				);
			} catch (error) {
				socket.emit("error", { message: "Failed to join room" });
				console.error("Error joining room:", error);
			}
		});

		// Get list of available rooms
		socket.on("get_rooms", () => {
			const rooms = roomService.getAvailableRooms();
			socket.emit("rooms_list", rooms);
		});

		// Get room details
		socket.on("get_room", (roomId: string) => {
			const room = roomService.getRoom(roomId);
			if (room) {
				socket.emit("room_details", room);
			} else {
				socket.emit("error", { message: "Room not found" });
			}
		});

		// Make a chess move
		socket.on(
			"make_move",
			(data: {
				roomId: string;
				move: GameMove;
				playerAddress: string;
			}) => {
				try {
					const room = roomService.getRoom(data.roomId);
					if (!room) {
						socket.emit("move_error", {
							message: "Room not found"
						});
						return;
					}

					const player = room.players.find(
						p => p.address === data.playerAddress
					);
					if (!player) {
						socket.emit("move_error", {
							message: "Player not in room"
						});
						return;
					}

					const result = chessService.makeMove(
						data.roomId,
						data.move,
						player.color
					);

					if (!result.success) {
						socket.emit("move_error", { message: result.error });
						return;
					}

					// Broadcast move to all players in the room
					const updatedRoom = roomService.getRoom(data.roomId);
					io.to(data.roomId).emit("move_made", {
						move: data.move,
						gameState: result.gameState,
						room: updatedRoom,
						isGameOver: result.isGameOver,
						winner: result.winner
					});

					console.log(
						`♟️ Move made in room ${data.roomId} by ${data.playerAddress}`
					);
				} catch (error) {
					socket.emit("move_error", {
						message: "Failed to make move"
					});
					console.error("Error making move:", error);
				}
			}
		);

		// Get current game state
		socket.on("get_game_state", (roomId: string) => {
			const room = roomService.getRoom(roomId);
			const gameState = chessService.getGameState(roomId);

			if (room && gameState) {
				socket.emit("game_state", {
					room,
					gameState
				});
			} else {
				socket.emit("error", { message: "Game state not found" });
			}
		});

		// === BETTING SOCKET EVENTS ===

		// Get all markets
		socket.on("get_markets", async (filters?: {
			status?: MarketStatus | "all";
			category?: MarketCategory | "all";
			search?: string;
			sortBy?: "volume" | "newest" | "ending";
			limit?: number;
			offset?: number;
		}) => {
			try {
				const result = await mockBettingService.getMarkets(filters);
				socket.emit("markets_list", result);
			} catch (error) {
				socket.emit("betting_error", { message: "Failed to fetch markets" });
			}
		});

		// Get single market details
		socket.on("get_market", async (marketId: string) => {
			try {
				const market = await mockBettingService.getMarket(marketId);
				if (market) {
					socket.emit("market_details", market);
				} else {
					socket.emit("betting_error", { message: "Market not found" });
				}
			} catch (error) {
				socket.emit("betting_error", { message: "Failed to fetch market" });
			}
		});

		// Subscribe to market updates
		socket.on("subscribe_market", (marketId: string) => {
			const subscribers = marketSubscribers.get(marketId) || new Set();
			subscribers.add(socket.id);
			marketSubscribers.set(marketId, subscribers);
			console.log(`📊 Socket ${socket.id} subscribed to market ${marketId}`);
		});

		// Unsubscribe from market updates
		socket.on("unsubscribe_market", (marketId: string) => {
			const subscribers = marketSubscribers.get(marketId);
			if (subscribers) {
				subscribers.delete(socket.id);
				if (subscribers.size === 0) {
					marketSubscribers.delete(marketId);
				}
			}
		});

		// Get market bets
		socket.on("get_market_bets", async (data: { marketId: string; limit?: number }) => {
			try {
				const bets = await mockBettingService.getMarketBets(data.marketId, data.limit);
				socket.emit("market_bets", { marketId: data.marketId, bets });
			} catch (error) {
				socket.emit("betting_error", { message: "Failed to fetch bets" });
			}
		});

		// Place a bet
		socket.on("place_bet", async (data: {
			marketId: string;
			userAddress: string;
			outcome: Outcome;
			side: "yes" | "no";
			amount: number;
		}) => {
			try {
				const result = await mockBettingService.placeBet(
					data.marketId,
					data.userAddress,
					data.outcome,
					data.side,
					data.amount
				);

				if (result.success && result.bet) {
					socket.emit("bet_placed", { success: true, bet: result.bet });
					
					// Get updated market and broadcast to subscribers
					const market = await mockBettingService.getMarket(data.marketId);
					if (market) {
						const subscribers = marketSubscribers.get(data.marketId);
						if (subscribers) {
							subscribers.forEach(socketId => {
								const subSocket = io.sockets.sockets.get(socketId);
								if (subSocket) {
									subSocket.emit("market_updated", market);
								}
							});
						}
					}
					
					console.log(`💰 Bet placed by ${data.userAddress} on market ${data.marketId}`);
				} else {
					socket.emit("bet_placed", { success: false, error: result.error });
				}
			} catch (error) {
				socket.emit("betting_error", { message: "Failed to place bet" });
			}
		});

		// Get user positions
		socket.on("get_user_positions", async (userAddress: string) => {
			try {
				const positions = await mockBettingService.getUserPositions(userAddress);
				socket.emit("user_positions", positions);
			} catch (error) {
				socket.emit("betting_error", { message: "Failed to fetch positions" });
			}
		});

		// Get user portfolio
		socket.on("get_user_portfolio", async (userAddress: string) => {
			try {
				const portfolio = await mockBettingService.getUserPortfolio(userAddress);
				socket.emit("user_portfolio", portfolio);
			} catch (error) {
				socket.emit("betting_error", { message: "Failed to fetch portfolio" });
			}
		});

		// Get market stats
		socket.on("get_market_stats", async () => {
			try {
				const stats = await mockBettingService.getStats();
				socket.emit("market_stats", stats);
			} catch (error) {
				socket.emit("betting_error", { message: "Failed to fetch stats" });
			}
		});

		// Get trending markets
		socket.on("get_trending_markets", async (limit?: number) => {
			try {
				const markets = await mockBettingService.getTrendingMarkets(limit);
				socket.emit("trending_markets", markets);
			} catch (error) {
				socket.emit("betting_error", { message: "Failed to fetch trending markets" });
			}
		});

		// Handle disconnection
		socket.on("disconnect", () => {
			console.log("🔌 socket disconnected", socket.id);

			// Remove player from rooms
			const rooms = roomService.getAllRooms();
			rooms.forEach(room => {
				const player = room.players.find(p => p.socketId === socket.id);
				if (player) {
					roomService.removePlayerFromRoom(room.id, socket.id);
					chessService.removeGame(room.id);

					// Notify other players in the room
					io.to(room.id).emit("player_left", { roomId: room.id });
					io.emit("rooms_updated", roomService.getAvailableRooms());
				}
			});

			// Remove from market subscriptions
			marketSubscribers.forEach((subscribers, marketId) => {
				subscribers.delete(socket.id);
				if (subscribers.size === 0) {
					marketSubscribers.delete(marketId);
				}
			});
		});
  })

  global.io = io
}
