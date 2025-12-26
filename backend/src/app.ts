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
app.use("/matches", matchRoutes);
app.use("/users", userRoutes);

// Catch all handler: send back React's index.html file for SPA routing
// This must be last to avoid catching API routes
app.get("*", (_req, res) => {
	const indexPath = path.join(publicPath, "index.html");
	res.sendFile(indexPath, err => {
		if (err) {
			res.status(404).json({
				error: "Frontend not built. Please build the frontend first."
			});
		}
	});
});

app.use("/matches", matchRoutes)
app.use("/users", userRoutes)

export default app
