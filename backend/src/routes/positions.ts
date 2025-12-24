import { Router } from "express";
import { mockBettingService } from "../services/mockBettingService.js";

const router = Router();

// GET /api/positions - Get user positions
router.get("/", async (req, res) => {
	try {
		const userAddress = req.query.userAddress as string;
		
		if (!userAddress) {
			return res.status(400).json({ error: "userAddress is required" });
		}
		
		const positions = await mockBettingService.getUserPositions(userAddress);
		res.json(positions);
	} catch (error) {
		console.error("Error fetching positions:", error);
		res.status(500).json({ error: "Failed to fetch positions" });
	}
});

// GET /api/positions/portfolio - Get user portfolio
router.get("/portfolio", async (req, res) => {
	try {
		const userAddress = req.query.userAddress as string;
		
		if (!userAddress) {
			return res.status(400).json({ error: "userAddress is required" });
		}
		
		const portfolio = await mockBettingService.getUserPortfolio(userAddress);
		res.json(portfolio);
	} catch (error) {
		console.error("Error fetching portfolio:", error);
		res.status(500).json({ error: "Failed to fetch portfolio" });
	}
});

// GET /api/positions/bets - Get user's bet history
router.get("/bets", async (req, res) => {
	try {
		const userAddress = req.query.userAddress as string;
		
		if (!userAddress) {
			return res.status(400).json({ error: "userAddress is required" });
		}
		
		const bets = await mockBettingService.getUserBets(userAddress);
		res.json(bets);
	} catch (error) {
		console.error("Error fetching user bets:", error);
		res.status(500).json({ error: "Failed to fetch user bets" });
	}
});

export default router;

