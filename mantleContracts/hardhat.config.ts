import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { defineConfig } from "hardhat/config";
import { task } from "hardhat/config";
import dotenv from "dotenv";
dotenv.config();

const deployDuelSystemTask = task("deploy:duel:system", "Deploy Duel token, PredictionMarket, and ChessEscrow contracts")
  .setAction(() => import("./tasks/deploy-duel-system.ts"))
  .build();

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  tasks: [
    deployDuelSystemTask,
  ],
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    mantle: {
      type: "http",
      chainType: "l1",
      url: "https://rpc.sepolia.mantle.xyz",
      accounts: [process.env.PRIVATE_KEY || ""],
    },
  },
});
