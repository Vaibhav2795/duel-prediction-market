// src/app.ts
import express, { type Express } from "express"
import cors from "cors"
import morgan from "morgan"
import path from "path";
import { fileURLToPath } from "url";
import marketsRouter from "./routes/markets.js";
import positionsRouter from "./routes/positions.js";
import matchRoutes from "./routes/match.routes"
import userRoutes from "./routes/user.routes"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Serve static files from the React app
const publicPath = path.join(__dirname, "../public");
app.use(express.static(publicPath));

// API routes
app.use("/api/markets", marketsRouter);
app.use("/api/positions", positionsRouter);

// Catch all handler: send back React's index.html file for SPA routing
app.get("*", (_req, res) => {
	res.sendFile(path.join(publicPath, "index.html"));
});

app.use("/matches", matchRoutes)
app.use("/users", userRoutes)

export default app
