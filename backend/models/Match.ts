// models/Match.ts
import mongoose from "mongoose"

const MatchSchema = new mongoose.Schema(
  {
    player1: {
      wallet: { type: String, required: true },
      name: { type: String, required: true },
    },
    player2: {
      wallet: { type: String, required: true },
      name: { type: String, required: true },
    },

    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },

    stakeAmount: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["SCHEDULED", "LIVE", "FINISHED", "CANCELLED"],
      default: "SCHEDULED",
      index: true,
    },
    result: {
      winner: {
        type: String,
        enum: ["white", "black", "draw"],
      },
      finalFen: {
        type: String,
      },
      finishedAt: {
        type: Date,
      },
    },
  },
  { timestamps: true }
)

export default mongoose.model("Match", MatchSchema)
