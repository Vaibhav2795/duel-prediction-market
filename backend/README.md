# Duel Prediction Market - Backend

Backend API for the duel prediction market application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

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
│   └── index.ts       # Main entry point (TypeScript)
├── dist/              # Compiled JavaScript (generated)
├── .env.example       # Example environment variables
├── .gitignore        # Git ignore file
├── package.json      # Project dependencies
├── tsconfig.json     # TypeScript configuration
└── README.md         # This file
```

## API Endpoints

- `GET /` - API welcome message
- `GET /health` - Health check endpoint

