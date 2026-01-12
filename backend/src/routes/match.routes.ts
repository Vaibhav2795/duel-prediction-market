// routes/match.routes.ts
import { Router } from "express"
import {
  createMatch,
  listMatches,
  getMatchById,
  getMatchMoves,
  updateMatchHashes,
  deleteMatch,
} from "@/controllers/match.controller"

const router = Router()

router.post("/", createMatch)
router.get("/", listMatches)
router.get("/:id", getMatchById)
router.get("/:id/moves", getMatchMoves)
router.patch("/:id/hashes", updateMatchHashes)
router.delete("/:id", deleteMatch)

export default router
