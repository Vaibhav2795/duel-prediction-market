// controllers/user.controller.ts
import { userService } from "@/services/user.service"
import type { Request, Response } from "express"

export async function createUser(req: Request, res: Response) {
  try {
    const { walletAddress, userName } = req.body

    if (!walletAddress || !userName) {
      return res
        .status(400)
        .json({ error: "Wallet address and user name are required" })
    }

    const user = await userService.createUser(walletAddress, userName)

    return res.status(201).json(user)
  } catch (err: any) {
    if (err.message.includes("already exists")) {
      return res.status(409).json({ error: err.message })
    }
    if (err.message.includes("required")) {
      return res.status(400).json({ error: err.message })
    }
    console.error("Create user failed:", err)
    return res.status(500).json({ error: "Internal server error" })
  }
}

export async function getUserHistory(req: Request, res: Response) {
  try {
    const { wallet } = req.params
    console.log({ wallet })
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10

    // Validate pagination
    if (page < 1) {
      return res.status(400).json({ error: "Page must be greater than 0" })
    }
    if (limit < 1 || limit > 100) {
      return res.status(400).json({ error: "Limit must be between 1 and 100" })
    }

    // Validate wallet address format (basic check)
    if (!wallet) {
      // TODO: Improve validation
      return res.status(400).json({ error: "Invalid wallet address" })
    }

    const result = await userService.getUserMatchHistory(wallet, page, limit)

    return res.json({
      wallet,
      data: result.history,
      pagination: result.pagination,
    })
  } catch (err) {
    console.error("Get user history failed:", err)
    return res.status(500).json({ error: "Internal server error" })
  }
}
