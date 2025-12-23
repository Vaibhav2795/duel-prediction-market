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
