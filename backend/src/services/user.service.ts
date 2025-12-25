// services/user.service.ts
import Match from "@/models/Match"
import User from "@/models/User"

interface MatchHistoryItem {
  id: string
  opponent: {
    wallet: string
    name: string
  }
  scheduledAt: Date
  stakeAmount: number
  status: string
  result?: "WIN" | "LOSS" | "DRAW"
  endedAt?: Date
  gameResult?: {
    winner: "white" | "black" | "draw"
    finalFen: string
  }
}

class UserService {
  async createUser(walletAddress: string, userName: string) {
    // Validate input
    if (!walletAddress || walletAddress.trim().length === 0) {
      throw new Error("Wallet address is required")
    }

    if (!userName || userName.trim().length === 0) {
      throw new Error("User name is required")
    }

    // Check if user already exists
    const existingUser = await User.findOne({ walletAddress })
    if (existingUser) {
      throw new Error("User with this wallet address already exists")
    }

    // Create user
    const user = await User.create({
      walletAddress: walletAddress.trim(),
      userName: userName.trim(),
    })

    return {
      id: user._id.toString(),
      walletAddress: user.walletAddress,
      userName: user.userName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }

  async getUserMatchHistory(
    walletAddress: string,
    page: number = 1,
    limit: number = 10
  ) {
    const skip = (page - 1) * limit

    // Find matches where user is player1 or player2
    // Use lean() to get raw documents including fields not in schema (like result)
    const [matches, total] = await Promise.all([
      Match.find({
        $or: [
          { "player1.wallet": walletAddress },
          { "player2.wallet": walletAddress },
        ],
      })
        .lean()
        .sort({ scheduledAt: -1 })
        .skip(skip)
        .limit(limit),
      Match.countDocuments({
        $or: [
          { "player1.wallet": walletAddress },
          { "player2.wallet": walletAddress },
        ],
      }),
    ])

    // Format matches with results
    const history: MatchHistoryItem[] = matches
      .filter((match) => match.player1 && match.player2)
      .map((match) => {
        const isPlayer1 = match.player1!.wallet === walletAddress
        const opponent = isPlayer1 ? match.player2! : match.player1!
        // With lean(), result should be directly accessible
        const matchResult = (match as any).result

        let result: "WIN" | "LOSS" | "DRAW" | undefined
        let gameResult:
          | { winner: "white" | "black" | "draw"; finalFen: string }
          | undefined

        // Check match.result first (persisted by matchResultService)
        if (matchResult?.winner && matchResult?.finalFen) {
          const winner = matchResult.winner as "white" | "black" | "draw"
          const finalFen = matchResult.finalFen

          gameResult = {
            winner,
            finalFen,
          }

          // Infer user's color from player order (player1 is typically white)
          const userWasWhite = isPlayer1

          // Determine user's result based on winner
          if (winner === "draw") {
            result = "DRAW"
          } else if (
            (userWasWhite && winner === "white") ||
            (!userWasWhite && winner === "black")
          ) {
            result = "WIN"
          } else {
            result = "LOSS"
          }
        }

        return {
          id: match._id.toString(),
          opponent: {
            wallet: opponent.wallet,
            name: opponent.name,
          },
          scheduledAt: match.scheduledAt,
          stakeAmount: match.stakeAmount,
          status: match.status,
          result,
          endedAt: matchResult?.finishedAt ?? undefined,
          gameResult,
        }
      })

    return {
      history,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }
}

export const userService = new UserService()
