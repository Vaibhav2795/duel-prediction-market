// services/match.service.ts
import Match from "@/models/Match"
import type { CreateMatchInput, MatchStatus } from "@/types/match.types"
import GameMove from "@/models/GameMove"

class MatchService {
  async createMatch(input: CreateMatchInput) {
    const { player1, player2, scheduledAt, stakeAmount } = input

    // Domain validation
    if (player1.wallet === player2.wallet) {
      throw new Error("Players must be different")
    }

    if (stakeAmount <= 0) {
      throw new Error("Stake amount must be greater than zero")
    }

    const match = await Match.create({
      player1,
      player2,
      scheduledAt,
      stakeAmount,
      status: "SCHEDULED",
    })

    return match
  }

  async listMatchesByStatus(
    status?: MatchStatus,
    page: number = 1,
    limit: number = 10
  ) {
    // Default behavior
    const finalStatus = status ?? "SCHEDULED"

    const skip = (page - 1) * limit

    // Build query - exclude expired matches (scheduledAt in the past)
    const now = new Date()
    const query: any = { status: finalStatus }
    
    // For SCHEDULED matches, only show those that haven't expired yet
    if (finalStatus === "SCHEDULED") {
      query.scheduledAt = { $gte: now }
    }

    const [matches, total] = await Promise.all([
      Match.find(query)
        .sort({ scheduledAt: 1 })
        .skip(skip)
        .limit(limit),
      Match.countDocuments(query),
    ])

    return {
      matches,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async getMatchById(matchId: string) {
    return Match.findById(matchId)
  }

  async getMatchDetails(matchId: string) {
    const match = await Match.findById(matchId)

    if (!match) {
      return null
    }

    return {
      id: match._id,
      player1: match.player1,
      player2: match.player2,
      scheduledAt: match.scheduledAt,
      stakeAmount: match.stakeAmount,
      status: match.status,
      createdAt: match.createdAt,
      updatedAt: match.updatedAt,
    }
  }

  async getMatchMoves(matchId: string) {
    // Verify match exists
    const match = await Match.findById(matchId)
    if (!match) {
      return null
    }

    // Get moves for this match (gameId is set to matchId in chess service)
    const moves = await GameMove.find({ gameId: matchId })
      .sort({ moveNumber: 1 })
      .select("-__v")

    return {
      matchId,
      moves: moves.map((m) => ({
        moveNumber: m.moveNumber,
        san: m.san,
        fen: m.fen,
        playedBy: m.playedBy,
        playedAt: m.playedAt,
      })),
      totalMoves: moves.length,
    }
  }
}

export const matchService = new MatchService()
