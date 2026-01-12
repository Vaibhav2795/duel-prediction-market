// models/Match.ts
import mongoose from "mongoose"
import crypto from "crypto"

// Helper function to generate numeric ID from UUID
function generateNumericId(): number {
  const uuid = crypto.randomUUID()
  // Remove hyphens and take first 13 characters (safe for JavaScript Number)
  const hexString = uuid.replace(/-/g, "").substring(0, 13)
  // Convert hex to number (max safe integer is 2^53-1, which is ~16 hex digits)
  // Using 13 hex digits gives us a number up to 2^52, which is safe
  return parseInt(hexString, 16)
}

const MatchSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
      index: true,
      default: () => generateNumericId(),
    },
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
