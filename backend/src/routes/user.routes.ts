// routes/user.routes.ts
import { Router } from "express"
import { createUser, getUserByWallet, getUserHistory } from "@/controllers/user.controller"

const router = Router()

router.post("/", createUser)
// Order matters: more specific route first
router.get("/:wallet/history", getUserHistory)
router.get("/:wallet", getUserByWallet)

export default router
