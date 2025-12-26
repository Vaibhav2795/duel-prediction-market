import { io, Socket } from "socket.io-client";
import type { Room, GameMove, Market, Bet, Position, UserPortfolio, MarketStats, Outcome, MarketStatus, MarketCategory } from "../types/game";

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

	// Match management (aligned with backend)
	joinMatch(matchId: string, playerAddress: string, stakeAmount: number): void {
		this.socket?.emit("join_match", { matchId, playerAddress, stakeAmount });
	}

	// Game management
	makeMove(matchId: string, move: GameMove, playerAddress: string): void {
		this.socket?.emit("make_move", { matchId, move, playerAddress });
	}

	// Spectator mode
	joinSpectator(matchId: string): void {
		this.socket?.emit("join_spectator", { matchId });
	}

	// Event listeners (aligned with backend)
	onMatchJoined(callback: (room: Room) => void): void {
		this.socket?.on("match_joined", callback);
	}

	onMatchUpdated(callback: (room: Room) => void): void {
		this.socket?.on("match_updated", callback);
	}

	onRoomUpdated(callback: (room: Room) => void): void {
		this.socket?.on("room_updated", callback);
	}

	onSpectatorJoined(callback: (data: {
		matchId: string;
		gameState: string;
		status: string;
		currentTurn: "white" | "black";
		players: Array<{ address: string; color: "white" | "black" }>;
	}) => void): void {
		this.socket?.on("spectator_joined", callback);
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
		this.socket?.on("move_made", (data: any) => {
			// Normalize the data structure - backend sends gameState and room
			// But support legacy 'fen' field for backward compatibility
			const normalizedData = {
				move: data.move,
				gameState: data.gameState || data.fen || '',
				room: data.room || {
					// Fallback: construct minimal room from available data (shouldn't happen with new backend)
					id: data.matchId || '',
					gameState: data.gameState || data.fen || '',
					currentTurn: data.currentTurn || 'white',
					status: 'active',
					players: [],
					stakeAmount: 0,
					winner: data.winner,
					createdAt: new Date()
				},
				isGameOver: data.isGameOver,
				winner: data.winner
			};
			callback(normalizedData);
		});
	}

	onGameState(
		callback: (data: { room: Room; gameState: string }) => void
	): void {
		this.socket?.on("game_state", callback);
	}

	onError(callback: (error: { message: string }) => void): void {
		this.socket?.on("error", callback);
	}

	onJoinError(callback: (error: { message: string }) => void): void {
		this.socket?.on("join_error", callback);
	}

	onMatchFinished(callback: (data: {
		matchId: string;
		winner: "white" | "black" | "draw";
		finalFen: string;
	}) => void): void {
		this.socket?.on("match_finished", callback);
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

	// === MARKET / BETTING EVENTS ===

	// Get markets with filters
	getMarkets(filters?: {
		status?: MarketStatus | "all";
		category?: MarketCategory | "all";
		search?: string;
		sortBy?: "volume" | "newest" | "ending";
		limit?: number;
		offset?: number;
	}): void {
		this.socket?.emit("get_markets", filters);
	}

	// Get single market
	getMarket(marketId: string): void {
		this.socket?.emit("get_market", marketId);
	}

	// Subscribe to real-time market updates
	subscribeToMarket(marketId: string): void {
		this.socket?.emit("subscribe_market", marketId);
	}

	// Unsubscribe from market updates
	unsubscribeFromMarket(marketId: string): void {
		this.socket?.emit("unsubscribe_market", marketId);
	}

	// Get market bets
	getMarketBets(marketId: string, limit?: number): void {
		this.socket?.emit("get_market_bets", { marketId, limit });
	}

	// Place a bet
	placeBet(
		marketId: string,
		userAddress: string,
		outcome: Outcome,
		side: "yes" | "no",
		amount: number
	): void {
		this.socket?.emit("place_bet", { marketId, userAddress, outcome, side, amount });
	}

	// Get user positions
	getUserPositions(userAddress: string): void {
		this.socket?.emit("get_user_positions", userAddress);
	}

	// Get user portfolio
	getUserPortfolio(userAddress: string): void {
		this.socket?.emit("get_user_portfolio", userAddress);
	}

	// Get market stats
	getMarketStats(): void {
		this.socket?.emit("get_market_stats");
	}

	// Get trending markets
	getTrendingMarkets(limit?: number): void {
		this.socket?.emit("get_trending_markets", limit);
	}

	// === MARKET EVENT LISTENERS ===

	onMarketsList(callback: (data: { markets: Market[]; total: number }) => void): void {
		this.socket?.on("markets_list", callback);
	}

	onMarketDetails(callback: (market: Market) => void): void {
		this.socket?.on("market_details", callback);
	}

	onMarketUpdated(callback: (market: Market) => void): void {
		this.socket?.on("market_updated", callback);
	}

	onMarketBets(callback: (data: { marketId: string; bets: Bet[] }) => void): void {
		this.socket?.on("market_bets", callback);
	}

	onBetPlaced(callback: (data: { success: boolean; bet?: Bet; error?: string }) => void): void {
		this.socket?.on("bet_placed", callback);
	}

	onUserPositions(callback: (positions: Position[]) => void): void {
		this.socket?.on("user_positions", callback);
	}

	onUserPortfolio(callback: (portfolio: UserPortfolio) => void): void {
		this.socket?.on("user_portfolio", callback);
	}

	onMarketStats(callback: (stats: MarketStats) => void): void {
		this.socket?.on("market_stats", callback);
	}

	onTrendingMarkets(callback: (markets: Market[]) => void): void {
		this.socket?.on("trending_markets", callback);
	}

	onBettingError(callback: (error: { message: string }) => void): void {
		this.socket?.on("betting_error", callback);
	}
}

export const socketService = new SocketService();
