// models/Match.ts
import mongoose from "mongoose"

const MatchSchema = new mongoose.Schema(
  {
    matchId: {
      type: Number,
      unique: true,
      index: true,
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
    liveAt: {
      type: Date,
      index: true,
    },
    joinWindowEndsAt: {
      type: Date,
      index: true,
    },
    gameStartedAt: {
      type: Date,
    },
    whiteTimeRemaining: {
      type: Number, // milliseconds
      default: 10 * 60 * 1000, // 10 minutes
    },
    blackTimeRemaining: {
      type: Number, // milliseconds
      default: 10 * 60 * 1000, // 10 minutes
    },
    escrowHash: {
      type: String,
    },
    marketHash: {
      type: String,
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

// Counter schema for auto-incrementing matchId
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
})

// Get or create Counter model
const getCounterModel = () => {
  if (mongoose.models.Counter) {
    return mongoose.models.Counter
  }
  return mongoose.model("Counter", CounterSchema)
}

// Auto-increment matchId using a counter collection
MatchSchema.pre("save", async function () {
  if (this.isNew && !this.matchId) {
    const Counter = getCounterModel()

    const counter = await Counter.findByIdAndUpdate(
      { _id: "matchId" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    )

    this.matchId = counter.seq
  }
})

export default mongoose.model("Match", MatchSchema)
