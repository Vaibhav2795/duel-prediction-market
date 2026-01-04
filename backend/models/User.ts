// models/User.ts
import mongoose from "mongoose"

const UserSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
    },
    privyUserId: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      index: true,
    },
    movementWalletId: {
      type: String,
      required: false,
    },
    movementWalletAddress: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      index: true,
    },
    movementWalletPublicKey: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
)

export default mongoose.model("User", UserSchema)
