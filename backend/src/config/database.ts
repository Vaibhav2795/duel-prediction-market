// src/config/database.ts
import mongoose from "mongoose"

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/duel-prediction-market"

export const connectDatabase = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(MONGODB_URI)
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`)
  } catch (error) {
    console.error("❌ MongoDB connection error:", error)
    process.exit(1)
  }
}

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect()
    console.log("✅ MongoDB Disconnected")
  } catch (error) {
    console.error("❌ MongoDB disconnection error:", error)
  }
}

// Handle connection events
mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err)
})

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected")
})

mongoose.connection.on("reconnected", () => {
  console.log("MongoDB reconnected")
})
