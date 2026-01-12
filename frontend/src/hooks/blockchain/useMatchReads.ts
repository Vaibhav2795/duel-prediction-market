// hooks/blockchain/useMatchReads.ts
import { useMatchContract } from "./useMatchContract";
import { PredictionMarketABI } from "../../../contracts/PredictionMarketABI";
import { Address, MarketData, Outcome, UserShares } from "./types";

const CONTRACT_ADDRESS = import.meta.env
  .VITE_PREDICTION_MARKET_ADDRESS as Address;

export function useMatchReads(matchId: number, user?: Address) {
  const contractData = useMatchContract(CONTRACT_ADDRESS, PredictionMarketABI);

  async function getMarket(): Promise<MarketData> {
    if (!contractData) {
      throw new Error("Wallet not connected");
    }
    const { publicClient, contract } = contractData;

    return publicClient.readContract({
      ...contract,
      functionName: "getMarketData",
      args: [matchId],
    }) as Promise<MarketData>;
  }

  async function getAllShares(): Promise<UserShares> {
    if (!contractData) {
      throw new Error("Wallet not connected");
    }
    const { publicClient, contract } = contractData;

    return publicClient.readContract({
      ...contract,
      functionName: "getAllShares",
      args: [matchId, user],
    }) as Promise<UserShares>;
  }

  async function canClaim(): Promise<boolean> {
    if (!contractData) {
      throw new Error("Wallet not connected");
    }
    const { publicClient, contract } = contractData;

    return publicClient.readContract({
      ...contract,
      functionName: "canClaim",
      args: [matchId, user],
    }) as Promise<boolean>;
  }

  async function getPotentialReward(outcome: Outcome): Promise<string> {
    if (!contractData) {
      throw new Error("Wallet not connected");
    }
    const { publicClient, contract } = contractData;

    return publicClient.readContract({
      ...contract,
      functionName: "getPotentialReward",
      args: [matchId, outcome, user],
    }) as Promise<string>;
  }

  return { getMarket, getAllShares, canClaim, getPotentialReward };
}
