// Match REST API service
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export interface CreateMatchInput {
	player1: {
		wallet: string;
		name: string;
	};
	player2: {
		wallet: string;
		name: string;
	};
	scheduledAt: Date | string;
	stakeAmount: number;
}

export interface Match {
	id: string;
	player1: {
		wallet: string;
		name: string;
	};
	player2: {
		wallet: string;
		name: string;
	};
	scheduledAt: string;
	stakeAmount: number;
	status: "SCHEDULED" | "LIVE" | "FINISHED" | "CANCELLED";
	result?: {
		winner: "white" | "black" | "draw";
		finalFen: string;
		finishedAt: string;
	};
	createdAt?: string;
	updatedAt?: string;
}

export interface MatchMove {
	moveNumber: number;
	san: string;
	fen: string;
	playedBy: "white" | "black";
	playedAt: string;
}

export interface MatchMovesResponse {
	matchId: string;
	moves: MatchMove[];
	totalMoves: number;
}

export interface MatchListResponse {
	data: Match[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

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
		const errorText = await response.text();
		throw new Error(`API Error: ${response.status} ${errorText}`);
	}

	return response.json();
}

// Match API
export async function createMatch(input: CreateMatchInput): Promise<{ id: string; status: string; scheduledAt: string }> {
	return fetchApi("/matches", {
		method: "POST",
		body: JSON.stringify({
			...input,
			scheduledAt: typeof input.scheduledAt === "string" 
				? input.scheduledAt 
				: input.scheduledAt.toISOString(),
		}),
	});
}

export async function listMatches(
	status?: "SCHEDULED" | "LIVE" | "FINISHED" | "CANCELLED",
	page: number = 1,
	limit: number = 10
): Promise<MatchListResponse> {
	const params = new URLSearchParams();
	if (status) params.set("status", status);
	params.set("page", page.toString());
	params.set("limit", limit.toString());

	return fetchApi(`/matches?${params.toString()}`);
}

export async function getMatchById(matchId: string): Promise<Match> {
	return fetchApi(`/matches/${matchId}`);
}

export async function getMatchMoves(matchId: string): Promise<MatchMovesResponse> {
	return fetchApi(`/matches/${matchId}/moves`);
}

