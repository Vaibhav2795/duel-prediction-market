// routes/user.routes.ts
import { Router } from "express"
import { createUser, getUserHistory } from "@/controllers/user.controller"

const router = Router()

router.post("/", createUser)
router.get("/:wallet/history", getUserHistory)

export default router
