import { io } from "socket.io-client"

// ----------------------------
// CONFIG
// ----------------------------
const SERVER_URL = "http://localhost:3000"
const MATCH_ID = "694c3221bd47a7007fca4b89"

const PLAYER1_WALLET = "0xPLAYER1"
const PLAYER2_WALLET = "0xPLAYER2"
const INTRUDER_WALLET = "0xINTRUDER"

// ----------------------------
// MOVE GUARDS
// ----------------------------
let p1Qh5 = false
let p1Bc4 = false
let p1Qxf7 = false

let p2E5 = false
let p2Nc6 = false
let p2Nf6 = false

// ----------------------------
// CLIENTS
// ----------------------------
const player1 = io(SERVER_URL)
const player2 = io(SERVER_URL)
const intruder = io(SERVER_URL)
const spectator = io(SERVER_URL)

// ----------------------------
// PLAYER 1 (WHITE)
// ----------------------------
player1.on("connect", () => {
  console.log("✅ Player 1 connected")
  player1.emit("join_match", {
    matchId: MATCH_ID,
    playerAddress: PLAYER1_WALLET,
  })
})

player1.on("match_joined", () => {
  console.log("♟️ Player 1 joined match")

  setTimeout(() => {
    console.log("♟️ P1: e2 → e4")
    player1.emit("make_move", {
      matchId: MATCH_ID,
      playerAddress: PLAYER1_WALLET,
      move: { from: "e2", to: "e4" },
    })
  }, 2000)
})

player1.on("move_made", (data) => {
  console.log("📡 P1 sees move:", data)

  const { currentTurn } = data

  if (!p1Qh5 && currentTurn === "white") {
    p1Qh5 = true
    console.log("♟️ P1: Qd1 → h5")
    player1.emit("make_move", {
      matchId: MATCH_ID,
      playerAddress: PLAYER1_WALLET,
      move: { from: "d1", to: "h5" },
    })
    return
  }

  if (!p1Bc4 && currentTurn === "white") {
    p1Bc4 = true
    console.log("♟️ P1: Bf1 → c4")
    player1.emit("make_move", {
      matchId: MATCH_ID,
      playerAddress: PLAYER1_WALLET,
      move: { from: "f1", to: "c4" },
    })
    return
  }

  if (!p1Qxf7 && currentTurn === "white") {
    p1Qxf7 = true
    console.log("♟️ P1: Qh5 → f7 (CHECKMATE)")
    player1.emit("make_move", {
      matchId: MATCH_ID,
      playerAddress: PLAYER1_WALLET,
      move: { from: "h5", to: "f7" },
    })
  }
})

player1.on("match_finished", (data) => {
  console.log("🏁 P1 sees match finished:", data)
})

// ----------------------------
// PLAYER 2 (BLACK)
// ----------------------------
player2.on("connect", () => {
  console.log("✅ Player 2 connected")

  setTimeout(() => {
    player2.emit("join_match", {
      matchId: MATCH_ID,
      playerAddress: PLAYER2_WALLET,
    })
  }, 1000)
})

player2.on("match_joined", () => {
  console.log("♟️ Player 2 joined match")
})

player2.on("move_made", (data) => {
  console.log("📡 P2 sees move:", data)

  const { currentTurn } = data

  if (!p2E5 && currentTurn === "black") {
    p2E5 = true
    console.log("♟️ P2: e7 → e5")
    player2.emit("make_move", {
      matchId: MATCH_ID,
      playerAddress: PLAYER2_WALLET,
      move: { from: "e7", to: "e5" },
    })
    return
  }

  if (!p2Nc6 && currentTurn === "black") {
    p2Nc6 = true
    console.log("♟️ P2: b8 → c6")
    player2.emit("make_move", {
      matchId: MATCH_ID,
      playerAddress: PLAYER2_WALLET,
      move: { from: "b8", to: "c6" },
    })
    return
  }

  if (!p2Nf6 && currentTurn === "black") {
    p2Nf6 = true
    console.log("♟️ P2: g8 → f6")
    player2.emit("make_move", {
      matchId: MATCH_ID,
      playerAddress: PLAYER2_WALLET,
      move: { from: "g8", to: "f6" },
    })
  }
})

player2.on("match_finished", (data) => {
  console.log("🏁 P2 sees match finished:", data)
})

// ----------------------------
// INTRUDER (SHOULD FAIL)
// ----------------------------
intruder.on("connect", () => {
  console.log("🚨 Intruder connected")

  setTimeout(() => {
    intruder.emit("join_match", {
      matchId: MATCH_ID,
      playerAddress: INTRUDER_WALLET,
    })
  }, 1500)
})

intruder.on("join_error", (err) => {
  console.log("✅ Intruder rejected:", err)
})

// ----------------------------
// SPECTATOR
// ----------------------------
spectator.on("connect", () => {
  console.log("👀 Spectator connected")

  setTimeout(() => {
    spectator.emit("join_spectator", { matchId: MATCH_ID })
  }, 1200)
})

spectator.on("spectator_joined", (data) => {
  console.log("👀 Spectator joined:", data)
})

spectator.on("move_made", (data) => {
  console.log("👀 Spectator sees move:", data)
})

spectator.on("match_finished", (data) => {
  console.log("🏁 Spectator sees match finished:", data)
})

// ----------------------------
// CLEAN EXIT
// ----------------------------
setTimeout(() => {
  console.log("🛑 Closing test sockets")
  player1.disconnect()
  player2.disconnect()
  intruder.disconnect()
  spectator.disconnect()
  process.exit(0)
}, 20000)
