// web3/wagmi.ts
import { http } from "wagmi";
import { createConfig } from "@privy-io/wagmi";
import { mantleSepolia } from "./chains";

// Use Alchemy RPC URL as primary, with fallbacks
const RPC_URL =
	import.meta.env.VITE_RPC_URL ||
	"https://mantle-sepolia.g.alchemy.com/v2/sVUSe_hStYmanofM2Ke1gb6JkQuu2PZc" ||
	mantleSepolia.rpcUrls.default.http[0] ||
	"https://rpc.sepolia.mantle.xyz";

export const wagmiConfig = createConfig({
  chains: [mantleSepolia],
  transports: {
    [mantleSepolia.id]: http(RPC_URL),
  },
});
