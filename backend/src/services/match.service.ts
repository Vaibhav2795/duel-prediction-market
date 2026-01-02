// services/match.service.ts
import Match from "@/models/Match"
import type { CreateMatchInput, MatchStatus } from "@/types/match.types"
import GameMove from "@/models/GameMove"
import { createEscrow } from "./blockchain/createEscrow"
import mongoose from "mongoose"
// import User from "@/models/User"

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

    /*DISABLED FOR TESTING*/
    // const [player1Exists, player2Exists] = await Promise.all([
    //   User.exists({ walletAddress: player1.wallet }),
    //   User.exists({ walletAddress: player2.wallet }),
    // ])

    // if (!player1Exists || !player2Exists) {
    //   throw new Error("One or both players do not exist")
    // }

    const session = await mongoose.startSession()
    try {
      session.startTransaction()

      const match = await Match.create(
        [
          {
            player1,
            player2,
            scheduledAt,
            stakeAmount,
            status: "SCHEDULED",
          },
        ],
        { session }
      )

      const matchData = match[0]
      if (!matchData) {
        throw new Error("Failed to create match")
      }
      const escrowHash = await createEscrow({
        matchId: matchData.id,
        player1: player1?.wallet,
        player2: player2?.wallet,
        amount: stakeAmount,
      })

      await session.commitTransaction()

      console.log(`🚀 ~ escrowHash:`, escrowHash)
      return match
    } catch (error) {
      await session.abortTransaction()
      throw error
    } finally {
      session.endSession()
    }
  }

  async listMatchesByStatus(
    status?: MatchStatus,
    page: number = 1,
    limit: number = 10
  ) {
    // Default behavior
    const finalStatus = status ?? "SCHEDULED"

    const skip = (page - 1) * limit

    const [matches, total] = await Promise.all([
      Match.find({ status: finalStatus })
        .sort({ scheduledAt: 1 })
        .skip(skip)
        .limit(limit),
      Match.countDocuments({ status: finalStatus }),
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
