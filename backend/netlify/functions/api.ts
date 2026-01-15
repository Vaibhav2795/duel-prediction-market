// netlify/functions/api.ts
import "dotenv/config"
import serverless from "serverless-http"
import app from "../../src/app.js"
import { connectDatabase } from "../../src/config/database.js"

// Initialize database connection
let dbConnected = false
let connectionPromise: Promise<void> | null = null

const handler = async (event: any, context: any) => {
  // Connect to database on first invocation
  if (!dbConnected) {
    if (!connectionPromise) {
      connectionPromise = connectDatabase()
        .then(() => {
          dbConnected = true
          connectionPromise = null
        })
        .catch((error) => {
          console.error("Failed to connect to database:", error)
          connectionPromise = null
          throw error
        })
    }
    
    try {
      await connectionPromise
    } catch (error) {
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ error: "Database connection failed" })
      }
    }
  }

  // Extend Lambda timeout
  context.callbackWaitsForEmptyEventLoop = false

  // Use serverless-http to wrap Express app
  const serverlessHandler = serverless(app, {
    binary: ["image/*", "application/pdf", "application/octet-stream"]
  })

  return serverlessHandler(event, context)
}

export { handler }
