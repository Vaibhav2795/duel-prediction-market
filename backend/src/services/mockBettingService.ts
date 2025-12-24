import type { Market, Bet, Position, UserPortfolio, MarketStats, Outcome, MarketStatus, MarketCategory } from "../types/game.js";
import { mockMarkets, mockBets, mockPositions, getMockPortfolio, getMockStats, placeMockBet, getUserBets } from "../data/mockData.js";

// Simulated network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class MockBettingService {
	// Get all markets with optional filters
	async getMarkets(filters?: {
		status?: MarketStatus | "all";
		category?: MarketCategory | "all";
		search?: string;
		sortBy?: "volume" | "newest" | "ending";
		limit?: number;
		offset?: number;
	}): Promise<{ markets: Market[]; total: number }> {
		await delay(100 + Math.random() * 200);
		
		let filtered = [...mockMarkets];
		
		// Apply filters
		if (filters?.status && filters.status !== "all") {
			filtered = filtered.filter(m => m.status === filters.status);
		}
		
		if (filters?.category && filters.category !== "all") {
			filtered = filtered.filter(m => m.category === filters.category);
		}
		
		if (filters?.search) {
			const searchLower = filters.search.toLowerCase();
			filtered = filtered.filter(m => 
				m.title.toLowerCase().includes(searchLower) ||
				m.description.toLowerCase().includes(searchLower) ||
				m.playerWhite?.displayName?.toLowerCase().includes(searchLower) ||
				m.playerBlack?.displayName?.toLowerCase().includes(searchLower)
			);
		}
		
		// Apply sorting
		switch (filters?.sortBy) {
			case "volume":
				filtered.sort((a, b) => b.totalVolume - a.totalVolume);
				break;
			case "newest":
				filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
				break;
			case "ending":
				filtered.sort((a, b) => {
					if (!a.endTime) return 1;
					if (!b.endTime) return -1;
					return new Date(a.endTime).getTime() - new Date(b.endTime).getTime();
				});
				break;
			default:
				filtered.sort((a, b) => b.totalVolume - a.totalVolume);
		}
		
		const total = filtered.length;
		
		// Apply pagination
		if (filters?.offset !== undefined && filters?.limit !== undefined) {
			filtered = filtered.slice(filters.offset, filters.offset + filters.limit);
		} else if (filters?.limit !== undefined) {
			filtered = filtered.slice(0, filters.limit);
		}
		
		return { markets: filtered, total };
	}
	
	// Get single market by ID
	async getMarket(marketId: string): Promise<Market | null> {
		await delay(50 + Math.random() * 100);
		return mockMarkets.find(m => m.id === marketId) || null;
	}
	
	// Get bets for a market
	async getMarketBets(marketId: string, limit?: number): Promise<Bet[]> {
		await delay(50 + Math.random() * 100);
		const bets = mockBets.get(marketId) || [];
		return limit ? bets.slice(-limit) : bets;
	}
	
	// Get user positions
	async getUserPositions(userAddress: string): Promise<Position[]> {
		await delay(50 + Math.random() * 100);
		// Return mock positions for any user (simulated)
		return mockPositions;
	}
	
	// Get user portfolio
	async getUserPortfolio(userAddress: string): Promise<UserPortfolio> {
		await delay(100 + Math.random() * 150);
		return getMockPortfolio(userAddress);
	}
	
	// Place a bet
	async placeBet(
		marketId: string,
		userAddress: string,
		outcome: Outcome,
		side: "yes" | "no",
		amount: number
	): Promise<{ success: boolean; bet?: Bet; error?: string }> {
		await delay(200 + Math.random() * 300);
		
		const bet = placeMockBet(marketId, userAddress, outcome, side, amount);
		
		if (bet) {
			return { success: true, bet };
		}
		
		return { success: false, error: "Failed to place bet. Market may be inactive or invalid." };
	}
	
	// Get user's bets
	async getUserBets(userAddress: string): Promise<Bet[]> {
		await delay(50 + Math.random() * 100);
		return getUserBets(userAddress);
	}
	
	// Get market statistics
	async getStats(): Promise<MarketStats> {
		await delay(50 + Math.random() * 100);
		return getMockStats();
	}
	
	// Simulate probability update (for real-time updates)
	simulateProbabilityUpdate(marketId: string): Market | null {
		const market = mockMarkets.find(m => m.id === marketId);
		if (!market || market.status !== "active") return null;
		
		// Randomly adjust probabilities slightly
		market.outcomes.forEach(outcome => {
			const adjustment = (Math.random() - 0.5) * 2; // -1 to +1
			outcome.probability = Math.min(95, Math.max(5, outcome.probability + adjustment));
			outcome.yesPrice = outcome.probability / 100;
			outcome.noPrice = 1 - outcome.yesPrice;
		});
		
		// Normalize probabilities to sum to 100
		const total = market.outcomes.reduce((sum, o) => sum + o.probability, 0);
		market.outcomes.forEach(o => {
			o.probability = (o.probability / total) * 100;
			o.yesPrice = o.probability / 100;
			o.noPrice = 1 - o.yesPrice;
		});
		
		return market;
	}
	
	// Get markets by category
	async getMarketsByCategory(category: MarketCategory): Promise<Market[]> {
		await delay(50 + Math.random() * 100);
		return mockMarkets.filter(m => m.category === category);
	}
	
	// Get trending markets (highest volume in last 24h)
	async getTrendingMarkets(limit: number = 5): Promise<Market[]> {
		await delay(50 + Math.random() * 100);
		return [...mockMarkets]
			.filter(m => m.status === "active")
			.sort((a, b) => b.totalVolume - a.totalVolume)
			.slice(0, limit);
	}
	
	// Get markets ending soon
	async getEndingSoonMarkets(limit: number = 5): Promise<Market[]> {
		await delay(50 + Math.random() * 100);
		return [...mockMarkets]
			.filter(m => m.status === "active" && m.endTime)
			.sort((a, b) => {
				if (!a.endTime) return 1;
				if (!b.endTime) return -1;
				return new Date(a.endTime).getTime() - new Date(b.endTime).getTime();
			})
			.slice(0, limit);
	}
	
	// Get newly created markets
	async getNewMarkets(limit: number = 5): Promise<Market[]> {
		await delay(50 + Math.random() * 100);
		return [...mockMarkets]
			.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
			.slice(0, limit);
	}
}

export const mockBettingService = new MockBettingService();

