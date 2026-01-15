// User REST API service
const API_BASE = import.meta.env.VITE_API_URL || "https://friendly-chebakia-39521d.netlify.app";

export interface User {
	id: string;
	walletAddress: string;
	userName: string;
	createdAt: string;
	updatedAt: string;
}

export interface CreateUserInput {
	walletAddress: string;
	userName: string;
}

export interface MatchHistoryItem {
	id: string;
	opponent: {
		wallet: string;
		name: string;
	};
	scheduledAt: string;
	stakeAmount: number;
	status: string;
	result?: "WIN" | "LOSS" | "DRAW";
	endedAt?: string;
	gameResult?: {
		winner: "white" | "black" | "draw";
		finalFen: string;
	};
}

export interface UserHistoryResponse {
	wallet: string;
	data: MatchHistoryItem[];
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

// User API
export async function getUserByWallet(walletAddress: string): Promise<User | null> {
	try {
		return await fetchApi(`/users/${encodeURIComponent(walletAddress)}`);
	} catch (error: any) {
		if (error.message.includes('404') || error.message.includes('not found')) {
			return null;
		}
		throw error;
	}
}

export async function createUser(input: CreateUserInput): Promise<User> {
	return fetchApi("/users", {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export async function getUserMatchHistory(
	walletAddress: string,
	page: number = 1,
	limit: number = 10
): Promise<UserHistoryResponse> {
	const params = new URLSearchParams();
	params.set("page", page.toString());
	params.set("limit", limit.toString());

	return fetchApi(`/users/${encodeURIComponent(walletAddress)}/history?${params.toString()}`);
}

