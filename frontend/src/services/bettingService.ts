import type { 
	Market, 
	Bet, 
	Position, 
	UserPortfolio, 
	MarketStats, 
	Outcome, 
	MarketStatus, 
	MarketCategory,
	MarketFilters 
} from "../types/game";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Helper for API calls
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
	const response = await fetch(`${API_BASE}${endpoint}`, {
		headers: {
			"Content-Type": "application/json",
			...options?.headers,
		},
		...options,
	});
	
	if (!response.ok) {
		throw new Error(`API Error: ${response.statusText}`);
	}
	
	return response.json();
}

// Markets API
export async function getMarkets(filters?: MarketFilters): Promise<{ markets: Market[]; total: number }> {
	const params = new URLSearchParams();
	if (filters?.status && filters.status !== "all") params.set("status", filters.status);
	if (filters?.category && filters.category !== "all") params.set("category", filters.category);
	if (filters?.search) params.set("search", filters.search);
	if (filters?.sortBy) params.set("sortBy", filters.sortBy);
	
	const query = params.toString();
	return fetchApi(`/api/markets${query ? `?${query}` : ""}`);
}

export async function getMarket(marketId: string): Promise<Market> {
	return fetchApi(`/api/markets/${marketId}`);
}

export async function getMarketBets(marketId: string, limit?: number): Promise<Bet[]> {
	const query = limit ? `?limit=${limit}` : "";
	return fetchApi(`/api/markets/${marketId}/bets${query}`);
}

export async function getTrendingMarkets(limit?: number): Promise<Market[]> {
	const query = limit ? `?limit=${limit}` : "";
	return fetchApi(`/api/markets/trending${query}`);
}

export async function getEndingSoonMarkets(limit?: number): Promise<Market[]> {
	const query = limit ? `?limit=${limit}` : "";
	return fetchApi(`/api/markets/ending-soon${query}`);
}

export async function getNewMarkets(limit?: number): Promise<Market[]> {
	const query = limit ? `?limit=${limit}` : "";
	return fetchApi(`/api/markets/new${query}`);
}

export async function getMarketStats(): Promise<MarketStats> {
	return fetchApi("/api/markets/stats");
}

// Betting API
export async function placeBet(
	marketId: string,
	userAddress: string,
	outcome: Outcome,
	side: "yes" | "no",
	amount: number
): Promise<{ success: boolean; bet?: Bet; error?: string }> {
	return fetchApi(`/api/markets/${marketId}/bet`, {
		method: "POST",
		body: JSON.stringify({ userAddress, outcome, side, amount }),
	});
}

// Positions API
export async function getUserPositions(userAddress: string): Promise<Position[]> {
	return fetchApi(`/api/positions?userAddress=${encodeURIComponent(userAddress)}`);
}

export async function getUserPortfolio(userAddress: string): Promise<UserPortfolio> {
	return fetchApi(`/api/positions/portfolio?userAddress=${encodeURIComponent(userAddress)}`);
}

export async function getUserBets(userAddress: string): Promise<Bet[]> {
	return fetchApi(`/api/positions/bets?userAddress=${encodeURIComponent(userAddress)}`);
}

// For demo purposes: Generate mock data locally when backend is not available
export function generateMockMarkets(): Market[] {
	const playerNames = [
		"Magnus", "Hikaru", "Fabiano", "Ding", "Ian", "Levon", "Wesley", "Anish"
	];
	
	const statuses: MarketStatus[] = ["active", "active", "active", "ended", "resolved"];
	const categories: MarketCategory[] = ["live", "competitive", "casual", "tournament"];
	
	return Array.from({ length: 20 }, (_, i) => {
		const status = statuses[Math.floor(Math.random() * statuses.length)];
		const category = categories[Math.floor(Math.random() * categories.length)];
		
		const whiteProb = Math.floor(Math.random() * 60) + 20;
		const blackProb = Math.floor(Math.random() * (90 - whiteProb)) + 5;
		const drawProb = 100 - whiteProb - blackProb;
		
		const whiteName = playerNames[Math.floor(Math.random() * playerNames.length)];
		let blackName = playerNames[Math.floor(Math.random() * playerNames.length)];
		while (blackName === whiteName) blackName = playerNames[Math.floor(Math.random() * playerNames.length)];
		
		return {
			id: `market-${i + 1}`,
			title: `${whiteName} vs ${blackName}`,
			description: `Chess match between ${whiteName} (White) and ${blackName} (Black)`,
			room: {
				id: `room-${i + 1}`,
				entryFee: Math.floor(Math.random() * 100) + 10,
				currency: "USD",
				players: [],
				gameState: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
				status: status === "active" ? "active" : "finished",
				currentTurn: "white",
				createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
			},
			outcomes: [
				{
					outcome: "white",
					probability: whiteProb,
					volume: Math.floor(Math.random() * 50000) + 1000,
					yesPrice: whiteProb / 100,
					noPrice: 1 - whiteProb / 100,
				},
				{
					outcome: "black",
					probability: blackProb,
					volume: Math.floor(Math.random() * 50000) + 1000,
					yesPrice: blackProb / 100,
					noPrice: 1 - blackProb / 100,
				},
				{
					outcome: "draw",
					probability: drawProb,
					volume: Math.floor(Math.random() * 10000) + 500,
					yesPrice: drawProb / 100,
					noPrice: 1 - drawProb / 100,
				},
			],
			totalVolume: Math.floor(Math.random() * 100000) + 5000,
			status,
			category,
			createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
			endTime: status === "active" 
				? new Date(Date.now() + Math.random() * 2 * 24 * 60 * 60 * 1000).toISOString()
				: undefined,
			playerWhite: { address: `0x${Math.random().toString(16).slice(2, 42)}`, displayName: whiteName },
			playerBlack: { address: `0x${Math.random().toString(16).slice(2, 42)}`, displayName: blackName },
		};
	});
}

export function generateMockStats(): MarketStats {
	return {
		totalMarkets: 25,
		activeMarkets: 15,
		totalVolume: 1250000,
		volume24h: 187500,
	};
}

export function generateMockPortfolio(address: string): UserPortfolio {
	const positions: Position[] = Array.from({ length: 5 }, (_, i) => ({
		id: `position-${i}`,
		marketId: `market-${i + 1}`,
		userAddress: address,
		outcome: (["white", "black", "draw"] as const)[Math.floor(Math.random() * 3)],
		side: Math.random() > 0.3 ? "yes" : "no",
		shares: Math.floor(Math.random() * 100) + 10,
		avgPrice: Math.random() * 0.4 + 0.3,
		currentValue: Math.floor(Math.random() * 500) + 50,
		pnl: (Math.random() - 0.5) * 200,
		pnlPercent: (Math.random() - 0.5) * 50,
		isResolved: i > 2,
	}));
	
	const totalValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
	const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
	
	return {
		address,
		totalValue,
		totalPnl,
		positions,
		recentBets: [],
	};
}

