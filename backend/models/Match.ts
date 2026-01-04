// models/Match.ts
import mongoose from "mongoose"

const MatchSchema = new mongoose.Schema(
	{
		player1: {
			wallet: { type: String, required: true },
			name: { type: String, required: true }
		},
		player2: {
			wallet: { type: String, required: true },
			name: { type: String, required: true }
		},

		scheduledAt: {
			type: Date,
			required: true,
			index: true
		},

		stakeAmount: {
			type: Number,
			required: true
		},

		status: {
			type: String,
			enum: ["SCHEDULED", "LIVE", "FINISHED", "CANCELLED"],
			default: "SCHEDULED",
			index: true
		},
		liveAt: {
			type: Date,
			index: true
		},
		joinWindowEndsAt: {
			type: Date,
			index: true
		},
		gameStartedAt: {
			type: Date
		},
		whiteTimeRemaining: {
			type: Number, // milliseconds
			default: 10 * 60 * 1000 // 10 minutes
		},
		blackTimeRemaining: {
			type: Number, // milliseconds
			default: 10 * 60 * 1000 // 10 minutes
		},
		result: {
			winner: {
				type: String,
				enum: ["white", "black", "draw"]
			},
			finalFen: {
				type: String
			},
			finishedAt: {
				type: Date
			}
		}
	},
	{ timestamps: true }
);

export default mongoose.model("Match", MatchSchema)
