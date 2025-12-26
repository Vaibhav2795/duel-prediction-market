import { Router } from "express";
import { mockBettingService } from "../services/mockBettingService.js";
import type { MarketStatus, MarketCategory, Outcome } from "../types/game.js";

const router = Router();

// GET /api/markets - Get all markets with optional filters
router.get("/", async (req, res) => {
	try {
		const { status, category, search, sortBy, limit, offset } = req.query;
		
		const result = await mockBettingService.getMarkets({
			status: status as MarketStatus | "all" | undefined,
			category: category as MarketCategory | "all" | undefined,
			search: search as string | undefined,
			sortBy: sortBy as "volume" | "newest" | "ending" | undefined,
			limit: limit ? parseInt(limit as string) : undefined,
			offset: offset ? parseInt(offset as string) : undefined
		});
		
		res.json(result);
	} catch (error) {
		console.error("Error fetching markets:", error);
		res.status(500).json({ error: "Failed to fetch markets" });
	}
});

// GET /api/markets/stats - Get market statistics
router.get("/stats", async (_req, res) => {
	try {
		const stats = await mockBettingService.getStats();
		res.json(stats);
	} catch (error) {
		console.error("Error fetching stats:", error);
		res.status(500).json({ error: "Failed to fetch stats" });
	}
});

// GET /api/markets/trending - Get trending markets
router.get("/trending", async (req, res) => {
	try {
		const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
		const markets = await mockBettingService.getTrendingMarkets(limit);
		res.json(markets);
	} catch (error) {
		console.error("Error fetching trending markets:", error);
		res.status(500).json({ error: "Failed to fetch trending markets" });
	}
});

// GET /api/markets/ending-soon - Get markets ending soon
router.get("/ending-soon", async (req, res) => {
	try {
		const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
		const markets = await mockBettingService.getEndingSoonMarkets(limit);
		res.json(markets);
	} catch (error) {
		console.error("Error fetching ending soon markets:", error);
		res.status(500).json({ error: "Failed to fetch ending soon markets" });
	}
});

// GET /api/markets/new - Get newly created markets
router.get("/new", async (req, res) => {
	try {
		const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
		const markets = await mockBettingService.getNewMarkets(limit);
		res.json(markets);
	} catch (error) {
		console.error("Error fetching new markets:", error);
		res.status(500).json({ error: "Failed to fetch new markets" });
	}
});

// GET /api/markets/:id - Get single market
router.get("/:id", async (req, res) => {
	try {
		const market = await mockBettingService.getMarket(req.params.id);
		
		if (!market) {
			return res.status(404).json({ error: "Market not found" });
		}
		
		res.json(market);
	} catch (error) {
		console.error("Error fetching market:", error);
		res.status(500).json({ error: "Failed to fetch market" });
	}
});

// GET /api/markets/:id/bets - Get bets for a market
router.get("/:id/bets", async (req, res) => {
	try {
		const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
		const bets = await mockBettingService.getMarketBets(req.params.id, limit);
		res.json(bets);
	} catch (error) {
		console.error("Error fetching market bets:", error);
		res.status(500).json({ error: "Failed to fetch market bets" });
	}
});

// POST /api/markets/:id/bet - Place a bet
router.post("/:id/bet", async (req, res) => {
	try {
		const { userAddress, outcome, side, amount } = req.body;
		
		if (!userAddress || !outcome || !side || !amount) {
			return res.status(400).json({ error: "Missing required fields" });
		}
		
		const result = await mockBettingService.placeBet(
			req.params.id,
			userAddress,
			outcome as Outcome,
			side as "yes" | "no",
			parseFloat(amount)
		);
		
		if (result.success) {
			res.json({ success: true, bet: result.bet });
		} else {
			res.status(400).json({ success: false, error: result.error });
		}
	} catch (error) {
		console.error("Error placing bet:", error);
		res.status(500).json({ error: "Failed to place bet" });
	}
});

export default router;

