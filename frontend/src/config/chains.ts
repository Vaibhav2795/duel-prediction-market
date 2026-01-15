import { type Chain } from "viem"

export const mantleSepolia = {
	id: 5003,
	name: "Mantle Sepolia Testnet",
	nativeCurrency: { name: "MNT", symbol: "MNT", decimals: 18 },
	rpcUrls: {
		default: {
			http: [
				// Alchemy RPC as primary
				"https://mantle-sepolia.g.alchemy.com/v2/sVUSe_hStYmanofM2Ke1gb6JkQuu2PZc",
				// Public RPC as fallback
				"https://rpc.sepolia.mantle.xyz"
			]
		}
	},
	blockExplorers: {
		default: {
			name: "Mantle Explorer",
			url: "https://explorer.sepolia.mantle.xyz"
		}
	},
	testnet: true
} as const satisfies Chain;
