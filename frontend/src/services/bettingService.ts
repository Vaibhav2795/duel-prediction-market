import type {
  Market,
  Bet,
  Position,
  UserPortfolio,
  MarketStats,
  Outcome,
  MarketFilters,
} from "../types/game"

const API_BASE =
  import.meta.env.VITE_API_URL || "https://friendly-chebakia-39521d.netlify.app"

// Helper for API calls
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`)
  }

  return response.json()
}

// Markets API
export async function getMarkets(
  filters?: MarketFilters
): Promise<{ markets: Market[]; total: number }> {
  const params = new URLSearchParams()
  if (filters?.status && filters.status !== "all")
    params.set("status", filters.status)
  if (filters?.category && filters.category !== "all")
    params.set("category", filters.category)
  if (filters?.search) params.set("search", filters.search)
  if (filters?.sortBy) params.set("sortBy", filters.sortBy)

  const query = params.toString()
  return fetchApi(`/api/markets${query ? `?${query}` : ""}`)
}

export async function getMarket(marketId: string): Promise<Market> {
  return fetchApi(`/api/markets/${marketId}`)
}

export async function getMarketBets(
  marketId: string,
  limit?: number
): Promise<Bet[]> {
  const query = limit ? `?limit=${limit}` : ""
  return fetchApi(`/api/markets/${marketId}/bets${query}`)
}

export async function getTrendingMarkets(limit?: number): Promise<Market[]> {
  const query = limit ? `?limit=${limit}` : ""
  return fetchApi(`/api/markets/trending${query}`)
}

export async function getEndingSoonMarkets(limit?: number): Promise<Market[]> {
  const query = limit ? `?limit=${limit}` : ""
  return fetchApi(`/api/markets/ending-soon${query}`)
}

export async function getNewMarkets(limit?: number): Promise<Market[]> {
  const query = limit ? `?limit=${limit}` : ""
  return fetchApi(`/api/markets/new${query}`)
}

export async function getMarketStats(): Promise<MarketStats> {
  return fetchApi("/api/markets/stats")
}

// Betting API
export async function placeBet(
  marketId: string,
  userAddress: string,
  outcome: Outcome,
  amount: number
): Promise<{ success: boolean; bet?: Bet; error?: string }> {
  return fetchApi(`/api/markets/${marketId}/bet`, {
    method: "POST",
    body: JSON.stringify({ userAddress, outcome, amount }),
  })
}

// Positions API
export async function getUserPositions(
  userAddress: string
): Promise<Position[]> {
  return fetchApi(
    `/api/positions?userAddress=${encodeURIComponent(userAddress)}`
  )
}

export async function getUserPortfolio(
  userAddress: string
): Promise<UserPortfolio> {
  return fetchApi(
    `/api/positions/portfolio?userAddress=${encodeURIComponent(userAddress)}`
  )
}

export async function getUserBets(userAddress: string): Promise<Bet[]> {
  return fetchApi(
    `/api/positions/bets?userAddress=${encodeURIComponent(userAddress)}`
  )
}
