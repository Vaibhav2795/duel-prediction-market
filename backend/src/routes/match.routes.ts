// routes/match.routes.ts
import { Router } from "express"
import {
  createMatch,
  listMatches,
  getMatchById,
  getMatchMoves,
} from "@/controllers/match.controller"

const router = Router()

router.post("/", createMatch)
router.get("/", listMatches)
router.get("/:id", getMatchById)
router.get("/:id/moves", getMatchMoves)

export default router
