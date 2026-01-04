// src/server.ts
import "dotenv/config"
import http from "http"
import app from "./app.js"
import { initSockets } from "./sockets/index.js"
import { connectDatabase, disconnectDatabase } from "./config/database.js"
import { matchStatusWorker } from "./workers/matchStatusWorker.js"

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000

const server = http.createServer(app)

initSockets(server)

// Initialize database connection and start server
const startServer = async () => {
  try {
    await connectDatabase()

    // Start match status worker
    matchStatusWorker.start()
    console.log("✅ Match status worker started")

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`)
    })
  } catch (error) {
    console.error("Failed to start server:", error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received: closing HTTP server")
  matchStatusWorker.stop()
  server.close(async () => {
    await disconnectDatabase()
    process.exit(0)
  })
})

process.on("SIGINT", async () => {
  console.log("SIGINT signal received: closing HTTP server")
  matchStatusWorker.stop()
  server.close(async () => {
    await disconnectDatabase()
    process.exit(0)
  })
})

startServer()
