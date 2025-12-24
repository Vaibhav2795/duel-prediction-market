// models/GameMove.ts
import mongoose from "mongoose"

const GameMoveSchema = new mongoose.Schema(
  {
    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Game",
      required: true,
      index: true,
    },

    moveNumber: { type: Number, required: true },
    san: { type: String, required: true },
    fen: { type: String, required: true },

    playedBy: {
      type: String,
      enum: ["white", "black"],
      required: true,
    },

    playedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
)

export default mongoose.model("GameMove", GameMoveSchema)
