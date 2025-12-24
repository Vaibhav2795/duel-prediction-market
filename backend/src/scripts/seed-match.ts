import mongoose from "mongoose"
import dotenv from "dotenv"
import Match from "@/models/Match"

dotenv.config()

async function seedMatch() {
  try {
    console.log("🔌 Connecting to MongoDB...")
    await mongoose.connect(process.env.MONGODB_URI!)

    console.log("🧹 Cleaning old test matches...")
    await Match.deleteMany({})

    console.log("🌱 Seeding test match...")

    const match = await Match.create({
      player1: {
        wallet: "0xPLAYER1",
        name: "Alice",
      },
      player2: {
        wallet: "0xPLAYER2",
        name: "Bob",
      },
      scheduledAt: new Date(Date.now() + 60 * 60 * 1000),
      stakeAmount: 1000,
      status: "SCHEDULED",
    })

    if (!match.player1 || !match.player2) {
      throw new Error("Match players not configured")
    }

    console.log("✅ Match created")
    console.log("🆔 matchId:", match._id.toString())
    console.log("👤 player1:", match.player1.wallet)
    console.log("👤 player2:", match.player2.wallet)

    process.exit(0)
  } catch (err) {
    console.error("❌ Seeding failed:", err)
    process.exit(1)
  }
}

seedMatch()
