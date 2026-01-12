// hooks/blockchain/useMatchActions.ts
import { parseEther, parseUnits } from "viem"
import { useMatchContract } from "./useMatchContract"
import { Address, Outcome, TxResult } from "./types"
import {
  CHESS_ESCROW_ABI,
  CHESS_ESCROW_ADDRESS,
  PREDICTION_MARKET_ABI,
  PREDICTION_MARKET_ADDRESS,
} from "../../constants/contracts"

export function useMatchActions() {
  const escrowContractData = useMatchContract(
    CHESS_ESCROW_ADDRESS,
    CHESS_ESCROW_ABI
  )
  const marketContractData = useMatchContract(
    PREDICTION_MARKET_ADDRESS,
    PREDICTION_MARKET_ABI
  )

  async function createMatch(
    matchId: number,
    player1: Address,
    player2: Address,
    amount: string
  ): Promise<{ escrowHash: string; marketHash: string }> {
    if (!escrowContractData || !marketContractData) {
      console.error("❌ Wallet not connected")
      throw new Error("Wallet not connected")
    }
    const {
      wallet: escrowWallet,
      contract: escrowContract,
      publicClient,
    } = escrowContractData
    const { wallet: marketWallet, contract: marketContract } =
      marketContractData

    // Parse amount (assuming 18 decimals for token)
    const amountWei = parseUnits(amount, 18)
    const matchIdUint64 = BigInt(matchId)

    // Step 1: Create Escrow
    const escrowHash = await escrowWallet.writeContract({
      ...escrowContract,
      functionName: "createEscrow",
      args: [matchIdUint64, player1, player2, amountWei],
      value: BigInt(0),
    })

    // Wait for escrow transaction to be mined
    const escrowReceipt = await publicClient.waitForTransactionReceipt({
      hash: escrowHash,
    })

    // Step 2: Create Market
    const marketHash = await marketWallet.writeContract({
      ...marketContract,
      functionName: "createMarket",
      args: [matchIdUint64, player1, player2],
      value: BigInt(0),
    })

    // Wait for market transaction to be mined
    await publicClient.waitForTransactionReceipt({
      hash: marketHash,
    })

    return { escrowHash, marketHash }
  }

  async function joinMatch(matchId: number, amount: string): Promise<TxResult> {
    if (!escrowContractData) {
      throw new Error("Wallet not connected")
    }
    const { wallet, contract } = escrowContractData

    const hash = await wallet.writeContract({
      ...contract,
      functionName: "joinMatch",
      args: [matchId],
      value: parseEther(amount),
    })
    return { hash }
  }

  async function bet(
    matchId: number,
    outcome: Outcome,
    amount: string
  ): Promise<TxResult> {
    if (!marketContractData) {
      throw new Error("Wallet not connected")
    }
    const { wallet, contract } = marketContractData

    const hash = await wallet.writeContract({
      ...contract,
      functionName: "betOnMatch",
      args: [matchId, outcome],
      value: parseEther(amount),
    })
    return { hash }
  }

  async function claim(matchId: number): Promise<TxResult> {
    if (!marketContractData) {
      throw new Error("Wallet not connected")
    }
    const { wallet, contract } = marketContractData

    const hash = await wallet.writeContract({
      ...contract,
      functionName: "claimReward",
      args: [matchId],
    })
    return { hash }
  }

  return {
    createMatch,
    joinMatch,
    bet,
    claim,
    isConnected: !!escrowContractData && !!marketContractData,
  }
}
