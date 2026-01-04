// services/user.service.ts
import Match from "@/models/Match"
import User from "@/models/User"
import { privyService, type MovementWalletInfo } from "./privy.service"

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
  async getUserByWallet(walletAddress: string) {
    // Check both walletAddress and movementWalletAddress
    const user = await User.findOne({
      $or: [
        { walletAddress },
        { movementWalletAddress: walletAddress },
      ],
    })
    if (!user) return null
    
    return {
      id: user._id.toString(),
      walletAddress: user.movementWalletAddress || user.walletAddress,
      userName: user.userName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }

  /**
   * Gets user by Privy user ID
   * @param privyUserId - Privy user ID
   * @returns User document or null
   */
  async getUserByPrivyId(privyUserId: string) {
    return await User.findOne({ privyUserId })
  }

  /**
   * Gets or creates a Movement wallet for a Privy user
   * If user doesn't exist, creates a new user record
   * If Movement wallet doesn't exist, creates it via Privy
   * @param privyUserId - Privy user ID
   * @returns Movement wallet information
   */
  async getOrCreateMovementWallet(privyUserId: string): Promise<MovementWalletInfo> {
    console.log('🔍 Checking for existing user with Privy ID:', privyUserId);
    // Check if user already exists with Movement wallet
    let user = await this.getUserByPrivyId(privyUserId)

    if (user && user.movementWalletId && user.movementWalletAddress) {
      console.log('✅ Found existing Movement wallet:', user.movementWalletAddress);
      // User and Movement wallet already exist
      return {
        walletId: user.movementWalletId,
        address: user.movementWalletAddress,
        publicKey: user.movementWalletPublicKey || '',
      }
    }

    console.log('🆕 Creating new Movement wallet...');
    // Create Movement wallet via Privy
    const walletInfo = await privyService.createMovementWallet(privyUserId)

    if (user) {
      // User exists but no Movement wallet - update it
      user.movementWalletId = walletInfo.walletId
      user.movementWalletAddress = walletInfo.address
      user.movementWalletPublicKey = walletInfo.publicKey
      // Also update walletAddress for backward compatibility
      if (!user.walletAddress) {
        user.walletAddress = walletInfo.address
      }
      await user.save()
    } else {
      // User doesn't exist - create new user record
      user = await User.create({
        privyUserId,
        movementWalletId: walletInfo.walletId,
        movementWalletAddress: walletInfo.address,
        movementWalletPublicKey: walletInfo.publicKey,
        walletAddress: walletInfo.address, // For backward compatibility
        userName: `User_${walletInfo.address.slice(0, 8)}`, // Temporary username
      })
    }

    return walletInfo
  }

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
