// models/PlayerMatchStat.ts
import mongoose from "mongoose"

const PlayerMatchStatSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      index: true,
    },

    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Match",
      required: true,
    },

    opponentWallet: { type: String, required: true },
    opponentName: { type: String, required: true },

    color: {
      type: String,
      enum: ["WHITE", "BLACK"],
      required: true,
    },

    outcome: {
      type: String,
      enum: ["WIN", "LOSS", "DRAW"],
      required: true,
    },
  },
  { timestamps: true }
)

// 🔥 critical index for history queries
PlayerMatchStatSchema.index({ walletAddress: 1, createdAt: -1 })

export default mongoose.model("PlayerMatchStat", PlayerMatchStatSchema)
