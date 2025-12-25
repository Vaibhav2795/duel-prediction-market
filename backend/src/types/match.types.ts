export interface CreateMatchInput {
  player1: {
    wallet: string
    name: string
  }
  player2: {
    wallet: string
    name: string
  }
  scheduledAt: Date
  stakeAmount: number
}

export const ALLOWED_STATUSES = [
  "SCHEDULED",
  "LIVE",
  "FINISHED",
  "CANCELLED",
] as const

export type MatchStatus = (typeof ALLOWED_STATUSES)[number]
