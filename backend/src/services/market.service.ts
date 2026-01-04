// services/market.service.ts
import Match from "@/models/Match";
import { roomService } from "./room.service";
import type { Market, MarketStatus, MarketCategory, OutcomeData } from "@/types/game";

class MarketService {
  // Convert a match to a market
  matchToMarket(match: any): Market | null {
    const matchId = match._id.toString();
    const room = roomService.getRoom(matchId);
    
    // Determine market status from match status
    let marketStatus: MarketStatus = "active";
    if (match.status === "FINISHED") {
		marketStatus = "resolved";
	} else if (match.status === "CANCELLED") {
		marketStatus = "resolved"; // Treat cancelled as resolved for now
	} else if (match.status === "LIVE") {
		marketStatus = "active";
		// For LIVE matches, check if join window is still open
		const now = new Date();
		if (
			match.joinWindowEndsAt &&
			match.joinWindowEndsAt < now &&
			!match.gameStartedAt
		) {
			// Join window expired but game hasn't started - will be cancelled by worker
			marketStatus = "active"; // Still show as active until cancelled
		}
	} else if (match.status === "SCHEDULED") {
		const now = new Date();
		const scheduledTime = new Date(match.scheduledAt);
		const timeUntilMatch = scheduledTime.getTime() - now.getTime();
		const hoursUntilMatch = timeUntilMatch / (1000 * 60 * 60);

		// "Ending Soon" means match is scheduled within 24 hours (but not expired)
		if (timeUntilMatch > 0 && hoursUntilMatch <= 24) {
			marketStatus = "ended"; // This will display as "Ending Soon" in the UI
		} else if (timeUntilMatch <= 0) {
			// Match time has passed but not transitioned to LIVE yet - exclude from markets
			// The worker will transition it to LIVE soon, so filter it out for now
			return null as any;
		} else {
			marketStatus = "active";
		}
	}

	// Determine category based on stake amount
	let category: MarketCategory = "casual";
	if (match.stakeAmount >= 100) {
		category = "tournament";
	} else if (match.stakeAmount >= 50) {
		category = "competitive";
	} else if (match.status === "LIVE") {
		category = "live";
	}

	// Get game state from room or default
	const gameState =
		room?.gameState ||
		"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

	// Create outcomes with default probabilities (can be enhanced with real betting data)
	const whiteProb = 33;
	const blackProb = 33;
	const drawProb = 34;

	const outcomes: OutcomeData[] = [
		{
			outcome: "white",
			probability: whiteProb,
			volume: 0, // TODO: Get from betting data
			yesPrice: whiteProb / 100,
			noPrice: 1 - whiteProb / 100
		},
		{
			outcome: "black",
			probability: blackProb,
			volume: 0, // TODO: Get from betting data
			yesPrice: blackProb / 100,
			noPrice: 1 - blackProb / 100
		},
		{
			outcome: "draw",
			probability: drawProb,
			volume: 0, // TODO: Get from betting data
			yesPrice: drawProb / 100,
			noPrice: 1 - drawProb / 100
		}
	];

	// Determine resolved outcome if match is finished
	let resolvedOutcome: "white" | "black" | "draw" | undefined;
	if (match.status === "FINISHED" && match.result?.winner) {
		resolvedOutcome = match.result.winner;
	}

	// Convert match createdAt to Date if it's a string
	const createdAtDate =
		match.createdAt instanceof Date
			? match.createdAt
			: match.createdAt
			? new Date(match.createdAt)
			: new Date();

	return {
		id: matchId,
		title: `${match.player1.name} vs ${match.player2.name}`,
		description: `Chess match between ${match.player1.name} (White) and ${
			match.player2.name
		} (Black). Stake: $${match.stakeAmount.toFixed(2)}`,
		room: {
			id: matchId,
			entryFee: match.stakeAmount,
			currency: "USD",
			players: room?.players || [],
			gameState,
			status:
				match.status === "LIVE"
					? "active"
					: match.status === "FINISHED"
					? "finished"
					: "waiting",
			currentTurn: room?.currentTurn || "white",
			createdAt: createdAtDate
		},
		outcomes,
		totalVolume: 0, // TODO: Get from betting data
		status: marketStatus,
		category,
		createdAt: createdAtDate,
		endTime:
			match.status === "LIVE"
				? match.joinWindowEndsAt instanceof Date
					? match.joinWindowEndsAt
					: match.joinWindowEndsAt
					? new Date(match.joinWindowEndsAt)
					: undefined
				: match.scheduledAt instanceof Date
				? match.scheduledAt
				: new Date(match.scheduledAt),
		resolvedAt:
			match.status === "FINISHED" && match.result?.finishedAt
				? match.result.finishedAt instanceof Date
					? match.result.finishedAt
					: new Date(match.result.finishedAt)
				: undefined,
		resolvedOutcome,
		playerWhite: {
			address: match.player1.wallet,
			displayName: match.player1.name
		},
		playerBlack: {
			address: match.player2.wallet,
			displayName: match.player2.name
		}
	};
  }

  // Get all markets from matches
  async getMarkets(filters?: {
    status?: MarketStatus | "all";
    category?: MarketCategory | "all";
    search?: string;
    sortBy?: "volume" | "newest" | "ending";
    limit?: number;
    offset?: number;
  }): Promise<{ markets: Market[]; total: number }> {
    // Get all matches (both SCHEDULED and LIVE)
    const [scheduledMatches, liveMatches] = await Promise.all([
      Match.find({ status: "SCHEDULED" }).sort({ scheduledAt: 1 }),
      Match.find({ status: "LIVE" }).sort({ createdAt: -1 }),
    ]);

    // Also get finished matches for resolved markets
    const finishedMatches = await Match.find({ status: "FINISHED" })
      .sort({ createdAt: -1 })
      .limit(50); // Limit finished matches to recent ones

    const allMatches = [...scheduledMatches, ...liveMatches, ...finishedMatches];
    
    // Remove duplicates - keep only the most recent match for each player pair
    const uniqueMatches = allMatches.filter((match, index, self) => {
      // Find if there's a duplicate (same players, different match)
      const duplicateIndex = self.findIndex((m) => {
        if (m._id.toString() === match._id.toString()) return false;
        const samePlayers =
			(m.player1?.wallet === match.player1?.wallet &&
				m.player2?.wallet === match.player2?.wallet) ||
			(m.player1?.wallet === match.player2?.wallet &&
				m.player2?.wallet === match.player1?.wallet);
        return samePlayers;
      });
      
      // If duplicate found, keep the one with later scheduledAt or createdAt
      if (duplicateIndex !== -1 && duplicateIndex < index) {
        const other = self[duplicateIndex];
        const thisTime = new Date(match.scheduledAt || match.createdAt).getTime();
        const otherTime = new Date(other.scheduledAt || other.createdAt).getTime();
        return thisTime > otherTime; // Keep this one if it's newer
      }
      
      return duplicateIndex === -1; // Keep if no duplicate
    });

    // Convert matches to markets and filter out nulls (expired matches)
    let markets = uniqueMatches
      .map(match => this.matchToMarket(match))
      .filter((market): market is Market => market !== null);

    // Apply filters
    if (filters?.status && filters.status !== "all") {
      markets = markets.filter(m => m.status === filters.status);
    }

    if (filters?.category && filters.category !== "all") {
      markets = markets.filter(m => m.category === filters.category);
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      markets = markets.filter(m =>
        m.title.toLowerCase().includes(searchLower) ||
        m.description.toLowerCase().includes(searchLower) ||
        m.playerWhite?.displayName?.toLowerCase().includes(searchLower) ||
        m.playerBlack?.displayName?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    switch (filters?.sortBy) {
      case "volume":
        markets.sort((a, b) => b.totalVolume - a.totalVolume);
        break;
      case "newest":
        markets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "ending":
        markets.sort((a, b) => {
          if (!a.endTime) return 1;
          if (!b.endTime) return -1;
          return new Date(a.endTime).getTime() - new Date(b.endTime).getTime();
        });
        break;
      default:
        markets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const total = markets.length;

    // Apply pagination
    if (filters?.offset !== undefined && filters?.limit !== undefined) {
      markets = markets.slice(filters.offset, filters.offset + filters.limit);
    } else if (filters?.limit !== undefined) {
      markets = markets.slice(0, filters.limit);
    }

    return { markets, total };
  }

  // Get single market by ID
  async getMarket(marketId: string): Promise<Market | null> {
    const match = await Match.findById(marketId);
    if (!match) {
      return null;
    }
    return this.matchToMarket(match);
  }

  // Get market statistics
  async getStats(): Promise<{
    totalMarkets: number;
    activeMarkets: number;
    totalVolume: number;
    volume24h: number;
  }> {
    const [totalMatches, activeMatches] = await Promise.all([
      Match.countDocuments(),
      Match.countDocuments({ status: { $in: ["SCHEDULED", "LIVE"] } }),
    ]);

    // TODO: Calculate real volume from betting data
    return {
      totalMarkets: totalMatches,
      activeMarkets: activeMatches,
      totalVolume: 0,
      volume24h: 0,
    };
  }

  // Get trending markets (highest volume, but for now just active matches)
  async getTrendingMarkets(limit: number = 5): Promise<Market[]> {
    const matches = await Match.find({ status: "LIVE" })
      .sort({ createdAt: -1 })
      .limit(limit);
    
    return matches
		.map(match => this.matchToMarket(match))
		.filter((market): market is Market => market !== null);
  }

  // Get markets ending soon
  async getEndingSoonMarkets(limit: number = 5): Promise<Market[]> {
    const now = new Date();
    const matches = await Match.find({
      status: "SCHEDULED",
      scheduledAt: { $gte: now, $lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) },
    })
      .sort({ scheduledAt: 1 })
      .limit(limit);
    
    return matches
		.map(match => this.matchToMarket(match))
		.filter((market): market is Market => market !== null);
  }

  // Get newly created markets
  async getNewMarkets(limit: number = 5): Promise<Market[]> {
    const matches = await Match.find()
      .sort({ createdAt: -1 })
      .limit(limit);
    
    return matches
		.map(match => this.matchToMarket(match))
		.filter((market): market is Market => market !== null);
  }
}

export const marketService = new MarketService();

