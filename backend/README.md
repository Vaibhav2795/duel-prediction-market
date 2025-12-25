# Duel Prediction Market - Backend

Backend API and WebSocket server for the duel prediction market application.

## Tech Stack

- **Runtime**: Node.js with ES Modules
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **WebSocket**: Socket.IO
- **Logging**: Morgan
- **CORS**: Enabled for cross-origin requests

## Setup

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- MongoDB (local installation or MongoDB Atlas account)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
cp .env.example .env
```

Edit `.env` and configure:

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `MONGODB_URI` - MongoDB connection string (default: mongodb://localhost:27017/duel-prediction-market)

**Note**: For local MongoDB, make sure MongoDB is running. For MongoDB Atlas, use the connection string from your cluster.

3. Build the TypeScript project (for production):

```bash
npm run build
```

4. Start the development server (with hot reload):

```bash
npm run dev
```

Or start the production server (after building):

```bash
npm start
```

## Project Structure

```
backend/
├── src/
│   ├── app.ts              # Express app configuration
│   ├── server.ts           # HTTP server and Socket.IO initialization
│   ├── config/             # Configuration files
│   │   └── database.ts     # MongoDB connection configuration
│   ├── controllers/        # Route controllers
│   ├── routes/             # API routes
│   ├── services/           # Business logic services
│   ├── sockets/            # Socket.IO handlers
│   │   └── index.ts        # Socket.IO initialization
│   ├── types/              # TypeScript type definitions
│   │   └── global.d.ts     # Global type declarations
│   └── workers/            # Background workers
├── dist/                   # Compiled JavaScript (generated)
├── .env.example           # Example environment variables
├── .gitignore             # Git ignore file
├── package.json           # Project dependencies
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

## Scripts

- `npm run dev` - Start development server with hot reload (using tsx)
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start production server (requires build first)

## API Endpoints

### REST API

- `GET /` - API welcome message
- `GET /health` - Health check endpoint

### WebSocket

The server uses Socket.IO for real-time communication. Connect to the server and use the following events:

- `connection` - Client connects to the server
- `join_room` - Join a specific room (duel/match)

## Development

The project uses TypeScript with strict type checking. Make sure to:

1. Run `npm run build` to check for TypeScript errors
2. Use proper type annotations for all functions and variables
3. Follow the existing code structure when adding new features

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/duel-prediction-market
```

## License

ISC
