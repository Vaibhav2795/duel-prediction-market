import type { Market, Bet, Position, UserPortfolio, MarketStats, Outcome, MarketStatus, MarketCategory, Room, Player } from "../types/game.js";

// Helper to generate random ID
const generateId = () => Math.random().toString(36).substring(2, 15);

// Helper to generate random address
const generateAddress = () => "0x" + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

// Generate player names
const playerNames = [
	"Magnus", "Hikaru", "Fabiano", "Ding", "Ian", "Levon", "Wesley", "Anish", 
	"Alireza", "Maxime", "Sergey", "Alexander", "Viswanathan", "Garry", "Bobby"
];

const getRandomPlayerName = () => playerNames[Math.floor(Math.random() * playerNames.length)];

// Generate dummy rooms
function generateRoom(id: string, status: "waiting" | "active" | "finished", winner?: Outcome): Room {
	const players: Player[] = [
		{ id: generateId(), socketId: generateId(), address: generateAddress(), color: "white" },
		{ id: generateId(), socketId: generateId(), address: generateAddress(), color: "black" }
	];
	
	return {
		id,
		entryFee: Math.floor(Math.random() * 100) + 10,
		currency: "USD",
		players,
		gameState: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
		status,
		currentTurn: "white",
		createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
		winner
	};
}

// Generate dummy markets
function generateMarket(index: number): Market {
	const statuses: MarketStatus[] = ["active", "active", "active", "ended", "resolved"];
	const categories: MarketCategory[] = ["live", "competitive", "casual", "tournament"];
	const status = statuses[Math.floor(Math.random() * statuses.length)];
	const category = categories[Math.floor(Math.random() * categories.length)];
	
	const whiteProb = Math.floor(Math.random() * 60) + 20;
	const blackProb = Math.floor(Math.random() * (90 - whiteProb)) + 5;
	const drawProb = 100 - whiteProb - blackProb;
	
	const resolvedOutcome = status === "resolved" 
		? (["white", "black", "draw"] as Outcome[])[Math.floor(Math.random() * 3)]
		: undefined;
	
	const room = generateRoom(
		`room-${index}`, 
		status === "active" ? "active" : "finished",
		resolvedOutcome
	);
	
	const whiteName = getRandomPlayerName();
	let blackName = getRandomPlayerName();
	while (blackName === whiteName) blackName = getRandomPlayerName();
	
	return {
		id: `market-${index}`,
		title: `${whiteName} vs ${blackName}`,
		description: `Chess match between ${whiteName} (White) and ${blackName} (Black). Entry fee: $${room.entryFee}`,
		room,
		outcomes: [
			{
				outcome: "white",
				probability: whiteProb,
				volume: Math.floor(Math.random() * 50000) + 1000,
				yesPrice: whiteProb / 100,
				noPrice: 1 - whiteProb / 100
			},
			{
				outcome: "black",
				probability: blackProb,
				volume: Math.floor(Math.random() * 50000) + 1000,
				yesPrice: blackProb / 100,
				noPrice: 1 - blackProb / 100
			},
			{
				outcome: "draw",
				probability: drawProb,
				volume: Math.floor(Math.random() * 10000) + 500,
				yesPrice: drawProb / 100,
				noPrice: 1 - drawProb / 100
			}
		],
		totalVolume: Math.floor(Math.random() * 100000) + 5000,
		status,
		category,
		createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
		endTime: status === "active" 
			? new Date(Date.now() + Math.random() * 2 * 24 * 60 * 60 * 1000) 
			: undefined,
		resolvedAt: status === "resolved" ? new Date() : undefined,
		resolvedOutcome,
		playerWhite: {
			address: room.players[0].address,
			displayName: whiteName
		},
		playerBlack: {
			address: room.players[1].address,
			displayName: blackName
		}
	};
}

// Generate 25 dummy markets
export const mockMarkets: Market[] = Array.from({ length: 25 }, (_, i) => generateMarket(i + 1));

// Generate dummy bets for each market
function generateBetsForMarket(market: Market): Bet[] {
	const numBets = Math.floor(Math.random() * 10) + 3;
	return Array.from({ length: numBets }, (_, i) => {
		const outcome = (["white", "black", "draw"] as Outcome[])[Math.floor(Math.random() * 3)];
		const side = Math.random() > 0.3 ? "yes" : "no";
		const amount = Math.floor(Math.random() * 500) + 10;
		const price = side === "yes" 
			? market.outcomes.find(o => o.outcome === outcome)!.yesPrice
			: market.outcomes.find(o => o.outcome === outcome)!.noPrice;
		
		return {
			id: `bet-${market.id}-${i}`,
			marketId: market.id,
			userAddress: generateAddress(),
			outcome,
			amount,
			price,
			potentialPayout: amount / price,
			createdAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
			side
		};
	});
}

export const mockBets: Map<string, Bet[]> = new Map(
	mockMarkets.map(market => [market.id, generateBetsForMarket(market)])
);

// Generate dummy user positions
const mockUserAddress = "0x1234567890abcdef1234567890abcdef12345678";

function generateUserPositions(): Position[] {
	const numPositions = Math.floor(Math.random() * 8) + 3;
	const selectedMarkets = mockMarkets.slice(0, numPositions);
	
	return selectedMarkets.map((market, i) => {
		const outcome = (["white", "black", "draw"] as Outcome[])[Math.floor(Math.random() * 3)];
		const side = Math.random() > 0.3 ? "yes" : "no";
		const shares = Math.floor(Math.random() * 100) + 10;
		const avgPrice = Math.random() * 0.4 + 0.3;
		const currentPrice = side === "yes"
			? market.outcomes.find(o => o.outcome === outcome)!.yesPrice
			: market.outcomes.find(o => o.outcome === outcome)!.noPrice;
		const currentValue = shares * currentPrice;
		const cost = shares * avgPrice;
		const pnl = currentValue - cost;
		
		return {
			id: `position-${i}`,
			marketId: market.id,
			userAddress: mockUserAddress,
			outcome,
			side,
			shares,
			avgPrice,
			currentValue,
			pnl,
			pnlPercent: (pnl / cost) * 100,
			isResolved: market.status === "resolved",
			resolvedPayout: market.status === "resolved" 
				? (market.resolvedOutcome === outcome && side === "yes") || (market.resolvedOutcome !== outcome && side === "no")
					? shares
					: 0
				: undefined
		};
	});
}

export const mockPositions: Position[] = generateUserPositions();

// Generate user portfolio
export function getMockPortfolio(userAddress: string): UserPortfolio {
	const positions = mockPositions.filter(p => p.userAddress === mockUserAddress);
	const totalValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
	const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
	
	// Get recent bets from all markets for this user
	const recentBets: Bet[] = [];
	mockBets.forEach(bets => {
		recentBets.push(...bets.filter(() => Math.random() > 0.7)); // Randomly select some as user's
	});
	recentBets.forEach(bet => bet.userAddress = mockUserAddress);
	
	return {
		address: userAddress,
		totalValue,
		totalPnl,
		positions,
		recentBets: recentBets.slice(0, 10)
	};
}

// Market statistics
export function getMockStats(): MarketStats {
	const activeMarkets = mockMarkets.filter(m => m.status === "active").length;
	const totalVolume = mockMarkets.reduce((sum, m) => sum + m.totalVolume, 0);
	
	return {
		totalMarkets: mockMarkets.length,
		activeMarkets,
		totalVolume,
		volume24h: Math.floor(totalVolume * 0.15) // ~15% of total in last 24h
	};
}

// In-memory bet storage for simulating bet placement
const userBets: Map<string, Bet[]> = new Map();

export function placeMockBet(
	marketId: string, 
	userAddress: string, 
	outcome: Outcome, 
	side: "yes" | "no", 
	amount: number
): Bet | null {
	const market = mockMarkets.find(m => m.id === marketId);
	if (!market || market.status !== "active") return null;
	
	const outcomeData = market.outcomes.find(o => o.outcome === outcome);
	if (!outcomeData) return null;
	
	const price = side === "yes" ? outcomeData.yesPrice : outcomeData.noPrice;
	
	const bet: Bet = {
		id: `bet-${generateId()}`,
		marketId,
		userAddress,
		outcome,
		amount,
		price,
		potentialPayout: amount / price,
		createdAt: new Date(),
		side
	};
	
	// Store in user bets
	const existingBets = userBets.get(userAddress) || [];
	existingBets.push(bet);
	userBets.set(userAddress, existingBets);
	
	// Add to market bets
	const marketBets = mockBets.get(marketId) || [];
	marketBets.push(bet);
	mockBets.set(marketId, marketBets);
	
	// Update market volume
	market.totalVolume += amount;
	outcomeData.volume += amount;
	
	// Slightly adjust probability based on bet (simplified)
	const adjustment = (amount / 10000) * (side === "yes" ? 1 : -1);
	outcomeData.probability = Math.min(95, Math.max(5, outcomeData.probability + adjustment));
	outcomeData.yesPrice = outcomeData.probability / 100;
	outcomeData.noPrice = 1 - outcomeData.yesPrice;
	
	return bet;
}

export function getUserBets(userAddress: string): Bet[] {
	return userBets.get(userAddress) || [];
}

