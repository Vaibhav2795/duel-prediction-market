// src/server.ts
import http from "http"
import app from "./app.js"
import { initSockets } from "./sockets/index.js"

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000

const server = http.createServer(app)

initSockets(server)

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})
