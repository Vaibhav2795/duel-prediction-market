// controllers/match.controller.ts
import { matchService } from "@/services/match.service"
import { ALLOWED_STATUSES, MatchStatus } from "@/types/match.types"
import type { Request, Response } from "express"

export async function createMatch(req: Request, res: Response) {
  try {
    const { player1, player2, scheduledAt, stakeAmount } = req.body

    if (!player1 || !player2 || !scheduledAt || !stakeAmount) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    const match = await matchService.createMatch({
      player1,
      player2,
      scheduledAt: new Date(scheduledAt),
      stakeAmount,
    })

    return res.status(201).json({
      id: match.matchId?.toString() || match._id.toString(),
      matchId: match.matchId,
      socketId: match._id.toString(),
      status: match.status,
      scheduledAt: match.scheduledAt,
    })
  } catch (err: any) {
    return res.status(400).json({ error: err.message })
  }
}

export async function listMatches(req: Request, res: Response) {
  try {
    const { status } = req.query
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10

    // Validate pagination
    if (page < 1) {
      return res.status(400).json({ error: "Page must be greater than 0" })
    }
    if (limit < 1 || limit > 100) {
      return res.status(400).json({ error: "Limit must be between 1 and 100" })
    }

    // Default: upcoming matches
    const finalStatus = status
      ? ALLOWED_STATUSES.includes(status as MatchStatus)
        ? (status as MatchStatus)
        : undefined
      : "SCHEDULED"

    if (status && !finalStatus) {
      return res.status(400).json({ error: "Invalid status" })
    }

    const result = await matchService.listMatchesByStatus(
      finalStatus,
      page,
      limit
    )

    return res.json({
      data: result.matches.map((m) => ({
        id: m.matchId?.toString() || m._id.toString(),
        matchId: m.matchId,
        player1: m.player1,
        player2: m.player2,
        scheduledAt: m.scheduledAt,
        stakeAmount: m.stakeAmount,
        status: m.status,
        socketId: m._id.toString(),
      })),
      pagination: result.pagination,
    })
  } catch (err) {
    console.error("List matches failed:", err)
    return res.status(500).json({ error: "Internal server error" })
  }
}

export async function getMatchById(req: Request, res: Response) {
  try {
    const { id } = req.params

    const match = await matchService.getMatchDetails(id)

    if (!match) {
      return res.status(404).json({ error: "Match not found" })
    }

    return res.json(match)
  } catch (err) {
    console.error("Get match failed:", err)
    return res.status(500).json({ error: "Internal server error" })
  }
}

export async function getMatchMoves(req: Request, res: Response) {
  try {
    const { id } = req.params

    const result = await matchService.getMatchMoves(id)

    if (!result) {
      return res.status(404).json({ error: "Match not found" })
    }

    return res.json(result)
  } catch (err) {
    console.error("Get match moves failed:", err)
    return res.status(500).json({ error: "Internal server error" })
  }
}

export async function updateMatchHashes(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { escrowHash, marketHash } = req.body

    if (!escrowHash && !marketHash) {
      return res
        .status(400)
        .json({ error: "At least one hash must be provided" })
    }

    const match = await matchService.updateMatchHashes(
      id,
      escrowHash,
      marketHash
    )

    return res.json({
      id: match.matchId?.toString() || match._id.toString(),
      matchId: match.matchId,
      socketId: match._id.toString(),
      escrowHash: match.escrowHash,
      marketHash: match.marketHash,
    })
  } catch (err: any) {
    if (err.message === "Match not found") {
      return res.status(404).json({ error: err.message })
    }
    console.error("Update match hashes failed:", err)
    return res.status(500).json({ error: "Internal server error" })
  }
}

export async function deleteMatch(req: Request, res: Response) {
  try {
    const { id } = req.params

    await matchService.deleteMatch(id)

    return res.json({ success: true, message: "Match deleted successfully" })
  } catch (err: any) {
    if (err.message === "Match not found") {
      return res.status(404).json({ error: err.message })
    }
    console.error("Delete match failed:", err)
    return res.status(500).json({ error: "Internal server error" })
  }
}
