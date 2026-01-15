// services/match.service.ts
import Match from "@/models/Match"
import type { CreateMatchInput, MatchStatus } from "@/types/match.types"
import GameMove from "@/models/GameMove"
import mongoose from "mongoose"

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
      Match.find(query).sort({ scheduledAt: 1 }).skip(skip).limit(limit),
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
    // Try to find match by MongoDB _id first, then by numeric matchId
    if (mongoose.Types.ObjectId.isValid(matchId)) {
      return Match.findById(matchId)
    } else {
      // It might be a numeric matchId
      const numericId = parseInt(matchId, 10)
      if (!isNaN(numericId)) {
        return Match.findOne({ matchId: numericId })
      }
    }
    return null
  }

  async getMatchDetails(matchId: string) {
    let match
    if (mongoose.Types.ObjectId.isValid(matchId)) {
      match = await Match.findById(matchId)
    } else {
      // It might be a numeric matchId
      const numericId = parseInt(matchId, 10)
      if (!isNaN(numericId)) {
        match = await Match.findOne({ matchId: numericId })
      }
    }

    if (!match) {
      return null
    }

    return {
      id: match.matchId?.toString() || match._id.toString(),
      matchId: match.matchId,
      socketId: match._id.toString(),
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
    // Get match using service to handle both ObjectId and numeric matchId
    const match = await this.getMatchById(matchId)
    if (!match) {
      return null
    }

    // Get moves using match's MongoDB ObjectId (gameId stores the ObjectId, not numeric matchId)
    const moves = await GameMove.find({ gameId: match._id })
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

  async updateMatchHashes(
    matchId: string,
    escrowHash?: string,
    marketHash?: string
  ) {
    const updateData: any = {}
    if (escrowHash !== undefined) {
      updateData.escrowHash = escrowHash
    }
    if (marketHash !== undefined) {
      updateData.marketHash = marketHash
    }

    // Try to find match by MongoDB _id first, then by numeric matchId
    let match
    if (mongoose.Types.ObjectId.isValid(matchId)) {
      // It's a valid MongoDB ObjectId
      match = await Match.findByIdAndUpdate(
        matchId,
        { $set: updateData },
        { new: true }
      )
    } else {
      // It might be a numeric matchId
      const numericId = parseInt(matchId, 10)
      if (!isNaN(numericId)) {
        match = await Match.findOneAndUpdate(
          { matchId: numericId },
          { $set: updateData },
          { new: true }
        )
      }
    }

    if (!match) {
      throw new Error("Match not found")
    }

    return match
  }

  async deleteMatch(matchId: string) {
    // Try to find match by MongoDB _id first, then by numeric matchId
    let match
    if (mongoose.Types.ObjectId.isValid(matchId)) {
      // It's a valid MongoDB ObjectId
      match = await Match.findByIdAndDelete(matchId)
    } else {
      // It might be a numeric matchId
      const numericId = parseInt(matchId, 10)
      if (!isNaN(numericId)) {
        match = await Match.findOneAndDelete({ matchId: numericId })
      }
    }

    if (!match) {
      throw new Error("Match not found")
    }
    return match
  }
}

export const matchService = new MatchService()
