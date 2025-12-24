// models/User.ts
import mongoose from "mongoose"

const UserSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
)

export default mongoose.model("User", UserSchema)
