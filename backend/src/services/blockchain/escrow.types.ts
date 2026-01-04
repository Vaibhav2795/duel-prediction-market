export interface CreateEscrowParams {
  matchId: number
  player1: string
  player2: string
  amount: number
}

export interface DepositParams {
  player: string // player private key (needed to sign transaction)
  adminAddress: string
  matchId: number
}

export interface ResolveWinParams {
  matchId: number
  winner: string
}

export interface ResolveDrawParams {
  matchId: number
}
