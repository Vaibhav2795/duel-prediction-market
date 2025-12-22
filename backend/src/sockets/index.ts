// sockets/index.ts
import { Server } from "socket.io"
import type { Server as HttpServer } from "http"
import type { Socket } from "socket.io"

export function initSockets(server: HttpServer): void {
  const io = new Server(server, {
    cors: { origin: "*" },
  })

  io.on("connection", (socket: Socket) => {
    console.log("🔌 socket connected", socket.id)

    socket.on("join_room", (roomId: string) => {
      socket.join(roomId)
    })
  })

  global.io = io
}
