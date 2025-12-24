import mongoose from "mongoose"
import dotenv from "dotenv"

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || ""

async function initDb() {
  try {
    console.log("🔌 Connecting to MongoDB...")
    await mongoose.connect(MONGODB_URI)

    const connection = mongoose.connection

    if (!connection.db) {
      throw new Error("MongoDB connection not initialized")
    }

    const db = connection.db

    console.log("📦 Creating collections (if not exist)...")

    // USERS
    await db.createCollection("users")
    await db
      .collection("users")
      .createIndex({ walletAddress: 1 }, { unique: true })

    // MATCHES
    await db.createCollection("matches")
    await db.collection("matches").createIndex({ status: 1 })
    await db.collection("matches").createIndex({ scheduledAt: 1 })

    // GAMES
    await db.createCollection("games")
    await db.collection("games").createIndex({ matchId: 1 })

    // GAME MOVES
    await db.createCollection("gamemoves")
    await db.collection("gamemoves").createIndex({ gameId: 1 })

    // PLAYER MATCH STATS
    await db.createCollection("playermatchstats")
    await db.collection("playermatchstats").createIndex({
      walletAddress: 1,
      createdAt: -1,
    })

    console.log("✅ Database initialized successfully")
    process.exit(0)
  } catch (err) {
    console.error("❌ DB init failed:", err)
    process.exit(1)
  }
}

initDb()
