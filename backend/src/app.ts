// src/app.ts
import express, { type Express } from "express"
import cors from "cors"
import morgan from "morgan"
import matchRoutes from "./routes/match.routes"
import userRoutes from "./routes/user.routes"

const app: Express = express()

app.use(cors())
app.use(express.json())
app.use(morgan("dev"))

app.use("/matches", matchRoutes)
app.use("/users", userRoutes)

export default app
