// src/types/game.ts

export interface Player {
  socketId: string
  address: string // wallet address
  color: "white" | "black"
}

export interface LiveMatch {
  id: string // matchId
  stakeAmount: number
  players: Player[]
  gameState: string // FEN
  status: "waiting" | "active" | "finished"
  currentTurn: "white" | "black"
  createdAt: Date
  winner?: "white" | "black" | "draw"
}

export interface GameMove {
  from: string
  to: string
  promotion?: string
}

export interface JoinMatchRequest {
  matchId: string
  playerAddress: string
}

export interface JoinSpectatorRequest {
  matchId: string
  spectatorAddress?: string // optional, for analytics later
}
