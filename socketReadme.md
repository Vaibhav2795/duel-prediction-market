# Chess Duel Platform

A WebSocket-based chess platform where multiple rooms can host individual games. Each room has a specific entry fee, and exactly two players can join each room.

## Features

- 🎮 **Real-time Chess Games**: Play chess in real-time using WebSocket connections
- 🏠 **Room System**: Create and join rooms with custom entry fees
- 👥 **Two-Player Rooms**: Each room supports exactly two players
- 💰 **Entry Fee System**: Set entry fees for each room (ready for blockchain integration)
- 📡 **WebSocket Broadcasting**: Real-time move broadcasting to all players in a room
- ♟️ **Chess.js Integration**: Full chess game logic with move validation

## Tech Stack

### Backend
- **Node.js** with TypeScript
- **Express.js** for HTTP server
- **Socket.IO** for WebSocket communication
- **chess.js** for chess game logic
- **uuid** for room ID generation

### Frontend
- **React** with TypeScript
- **Vite** for build tooling
- **react-chessboard** for chess board UI
- **socket.io-client** for WebSocket client
- **chess.js** for client-side game state

## Project Structure

```
duel-prediction-market/
├── backend/
│   ├── src/
│   │   ├── app.ts              # Express app configuration
│   │   ├── server.ts           # HTTP server and Socket.IO initialization
│   │   ├── services/
│   │   │   ├── roomService.ts  # Room management logic
│   │   │   └── chessService.ts # Chess game logic
│   │   ├── sockets/
│   │   │   └── index.ts        # WebSocket event handlers
│   │   └── types/
│   │       └── game.ts         # TypeScript types for games
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChessBoard.tsx  # Chess board component
│   │   │   ├── RoomList.tsx    # Available rooms list
│   │   │   └── CreateRoom.tsx  # Room creation form
│   │   ├── services/
│   │   │   └── socketService.ts # WebSocket client service
│   │   ├── types/
│   │   │   └── game.ts         # Frontend types
│   │   ├── App.tsx             # Main app component
│   │   └── main.tsx            # React entry point
│   └── package.json
└── README.md
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Start the development server:
```bash
npm run dev
```

The backend server will run on `http://localhost:3000` by default.

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173` by default.

## WebSocket Events

### Client → Server Events

- `create_room` - Create a new room with entry fee
  ```typescript
  { entryFee: string, playerAddress: string }
  ```

- `join_room` - Join an existing room
  ```typescript
  { roomId: string, playerAddress: string }
  ```

- `get_rooms` - Get list of available rooms

- `get_room` - Get details of a specific room
  ```typescript
  roomId: string
  ```

- `make_move` - Make a chess move
  ```typescript
  { roomId: string, move: { from: string, to: string, promotion?: string }, playerAddress: string }
  ```

- `get_game_state` - Get current game state
  ```typescript
  roomId: string
  ```

### Server → Client Events

- `room_created` - Room successfully created
- `room_joined` - Successfully joined a room
- `room_updated` - Room state updated (e.g., player joined)
- `rooms_list` - List of available rooms
- `rooms_updated` - Available rooms list updated
- `room_details` - Details of a specific room
- `move_made` - A move was made in the game
- `game_state` - Current game state
- `error` - Error occurred
- `join_room_error` - Error joining room
- `move_error` - Error making move
- `player_left` - A player left the room

## Usage

1. **Start the backend server** (port 3000)
2. **Start the frontend dev server** (port 5173)
3. **Open the frontend** in your browser
4. **Create a room** or **join an existing room**
5. **Wait for an opponent** (if you created a room)
6. **Play chess** once both players are in the room

## Room Lifecycle

1. **Waiting**: Room created, waiting for second player
2. **Active**: Both players joined, game in progress
3. **Finished**: Game ended (checkmate, draw, or stalemate)

## Player Colors

- First player to join a room: **White**
- Second player to join a room: **Black**

## Entry Fee

The entry fee is stored as a string (to support large numbers for blockchain integration). In a production environment, this would be integrated with a smart contract to handle payments.

## Future Enhancements

- Blockchain integration for entry fees and payouts
- User authentication and wallet connection
- Game history and statistics
- Spectator mode
- Chat functionality
- Tournament system
- Elo rating system

## License

ISC

