export interface Player {
	id: string;
	socketId: string;
	address: string;
	color: "white" | "black";
}

export interface Room {
	id: string;
	entryFee: number; // Entry fee in stable currency (USD)
	currency: string; // Currency code (e.g., 'USD', 'USDC')
	players: Player[];
	gameState: string;
	status: "waiting" | "active" | "finished";
	currentTurn: "white" | "black";
	createdAt: string;
	winner?: "white" | "black" | "draw";
}

export interface GameMove {
	from: string;
	to: string;
	promotion?: string;
}

// Prediction Market Types
export type Outcome = "white" | "black" | "draw";

export type MarketStatus = "active" | "ended" | "resolved";

export type MarketCategory = "live" | "competitive" | "casual" | "tournament";

export interface OutcomeData {
	outcome: Outcome;
	probability: number; // 0-100
	volume: number; // Total bet amount on this outcome
	yesPrice: number; // Price to buy Yes (0-1)
	noPrice: number; // Price to buy No (0-1)
}

export interface Market {
	id: string;
	title: string;
	description: string;
	room: Room; // Associated chess room
	outcomes: OutcomeData[];
	totalVolume: number;
	status: MarketStatus;
	category: MarketCategory;
	createdAt: string;
	endTime?: string;
	resolvedAt?: string;
	resolvedOutcome?: Outcome;
	playerWhite?: {
		address: string;
		displayName?: string;
	};
	playerBlack?: {
		address: string;
		displayName?: string;
	};
}

export interface Bet {
	id: string;
	marketId: string;
	userAddress: string;
	outcome: Outcome;
	amount: number;
	price: number; // Price at time of bet
	potentialPayout: number;
	createdAt: string;
	side: "yes" | "no"; // Betting for or against the outcome
}

export interface Position {
	id: string;
	marketId: string;
	userAddress: string;
	outcome: Outcome;
	side: "yes" | "no";
	shares: number; // Number of shares owned
	avgPrice: number; // Average buy price
	currentValue: number;
	pnl: number; // Profit/Loss
	pnlPercent: number;
	isResolved: boolean;
	resolvedPayout?: number;
}

export interface UserPortfolio {
	address: string;
	totalValue: number;
	totalPnl: number;
	positions: Position[];
	recentBets: Bet[];
}

export interface MarketStats {
	totalMarkets: number;
	activeMarkets: number;
	totalVolume: number;
	volume24h: number;
}

export interface MarketFilters {
	status?: MarketStatus | "all";
	category?: MarketCategory | "all";
	search?: string;
	sortBy?: "volume" | "newest" | "ending";
}
