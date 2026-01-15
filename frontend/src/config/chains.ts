import { type Chain } from "viem"

export const mantleSepolia = {
  id: 5003,
  name: "Mantle Sepolia Testnet",
  nativeCurrency: { name: "MNT", symbol: "MNT", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        // Public RPC endpoints (fallback if Alchemy fails)
        "https://rpc.sepolia.mantle.xyz",
        "https://mantle-sepolia.g.alchemy.com/v2/sVUSe_hStYmanofM2Ke1gb6JkQuu2PZc",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Mantle Explorer",
      url: "https://explorer.sepolia.mantle.xyz",
    },
  },
  testnet: true,
} as const satisfies Chain
