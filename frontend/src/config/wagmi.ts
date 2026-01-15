// web3/wagmi.ts
import { http } from "wagmi";
import { createConfig } from "@privy-io/wagmi";
import { mantleSepolia } from "./chains";

// Get RPC URL from chain config or environment variable
const RPC_URL = 
  import.meta.env.VITE_RPC_URL || 
  mantleSepolia.rpcUrls.default.http[0] || 
  "https://rpc.sepolia.mantle.xyz";

export const wagmiConfig = createConfig({
  chains: [mantleSepolia],
  transports: {
    [mantleSepolia.id]: http(RPC_URL),
  },
});
