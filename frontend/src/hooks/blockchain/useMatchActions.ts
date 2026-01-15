// hooks/blockchain/useMatchActions.ts - Optimized
import { parseEther, parseUnits, maxUint256, createPublicClient, http } from "viem"
import { useAccount, useChainId, useSwitchChain } from "wagmi"
import { getWalletClient, getChainId } from "@wagmi/core"
import { useMatchContract } from "./useMatchContract"
import { Address, Outcome, TxResult } from "./types"
import { mantleSepolia } from "../../config/chains"
import { wagmiConfig } from "../../config/wagmi"
import {
  CHESS_ESCROW_ABI, CHESS_ESCROW_ADDRESS,
  PREDICTION_MARKET_ABI, PREDICTION_MARKET_ADDRESS,
  TOKEN_ABI, TOKEN_ADDRESS,
} from "../../constants/contracts"

const RPC_URL = import.meta.env.VITE_RPC_URL || "https://rpc.testnet.mantle.xyz"
const CHAIN_SWITCH_POLL_MS = 500
const CHAIN_SWITCH_MAX_ATTEMPTS = 20

// Error message mapping for better UX
const ERROR_MAP: Record<string, string> = {
  AlreadyDeposited: "You have already joined this match",
  EALREADY_DEPOSITED: "You have already joined this match",
  EscrowNotFound: "Match escrow not found or you are not assigned",
  EESCROW_NOT_FOUND: "Match escrow not found or you are not assigned",
  ERC20InsufficientAllowance: "Token approval required. Please try again.",
  "insufficient allowance": "Token approval required. Please try again.",
  ERC20InsufficientBalance: "Insufficient token balance",
  "insufficient balance": "Insufficient token balance",
}

const mapContractError = (error: any): string => {
  const msg = error?.message || error?.toString() || "Unknown error"
  for (const [key, value] of Object.entries(ERROR_MAP)) {
    if (msg.includes(key)) return value
  }
  return `Failed to join match: ${msg}`
}

export function useMatchActions() {
  const { address: userAddress, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain: switchChainHook } = useSwitchChain()
  
  const escrowContract = useMatchContract(CHESS_ESCROW_ADDRESS, CHESS_ESCROW_ABI)
  const marketContract = useMatchContract(PREDICTION_MARKET_ADDRESS, PREDICTION_MARKET_ABI)
  // Token contract hook not needed - we read/write directly via publicClient/wallet

  // Ensure correct chain, returns true if successful
  const ensureCorrectChain = async (): Promise<boolean> => {
    if (getChainId(wagmiConfig) === mantleSepolia.id) return true
    
    try {
      await switchChainHook({ chainId: mantleSepolia.id })
      for (let i = 0; i < CHAIN_SWITCH_MAX_ATTEMPTS; i++) {
        await new Promise(r => setTimeout(r, CHAIN_SWITCH_POLL_MS))
        if (getChainId(wagmiConfig) === mantleSepolia.id) return true
      }
      throw new Error("Chain switch timeout")
    } catch {
      throw new Error("Please switch to Mantle Sepolia network")
    }
  }

  // Get or create clients
  const getClients = async () => {
    if (escrowContract) {
      return {
        wallet: escrowContract.wallet,
        publicClient: escrowContract.publicClient,
        contract: escrowContract.contract
      }
    }
    
    const wallet = await getWalletClient(wagmiConfig, { chainId: mantleSepolia.id })
    if (!wallet) throw new Error("Wallet not ready")
    
    return {
      wallet,
      publicClient: createPublicClient({ chain: mantleSepolia, transport: http(RPC_URL) }),
      contract: { address: CHESS_ESCROW_ADDRESS, abi: CHESS_ESCROW_ABI }
    }
  }

  const createMatch = async (
    matchId: number,
    player1: Address,
    player2: Address,
    amount: string
  ): Promise<{ escrowHash: string; marketHash: string }> => {
    if (!escrowContract || !marketContract) throw new Error("Wallet not connected")
    
    const amountWei = parseUnits(amount, 18)
    const matchIdBn = BigInt(matchId)

    const escrowHash = await escrowContract.wallet.writeContract({
      ...escrowContract.contract,
      functionName: "createEscrow",
      args: [matchIdBn, player1, player2, amountWei],
      value: 0n,
    })
    await escrowContract.publicClient.waitForTransactionReceipt({ hash: escrowHash })

    const marketHash = await marketContract.wallet.writeContract({
      ...marketContract.contract,
      functionName: "createMarket",
      args: [matchIdBn, player1, player2],
      value: 0n,
    })
    await marketContract.publicClient.waitForTransactionReceipt({ hash: marketHash })

    return { escrowHash, marketHash }
  }

  const joinMatch = async (matchId: number, amount: string): Promise<TxResult> => {
    if (!userAddress) throw new Error("Wallet not connected")
    
    await ensureCorrectChain()
    const { wallet, publicClient, contract } = await getClients()

    try {
      const amountWei = parseUnits(amount, 18)
      const matchIdBn = BigInt(matchId)

      // Check and approve if needed
      const allowance = await publicClient.readContract({
        address: TOKEN_ADDRESS,
        abi: TOKEN_ABI,
        functionName: "allowance",
        args: [userAddress, CHESS_ESCROW_ADDRESS],
      }) as bigint

      if (allowance < amountWei) {
        const approveHash = await wallet.writeContract({
          address: TOKEN_ADDRESS,
          abi: TOKEN_ABI,
          functionName: "approve",
          args: [CHESS_ESCROW_ADDRESS, maxUint256],
        })
        await publicClient.waitForTransactionReceipt({ hash: approveHash })
      }

      // Deposit
      const hash = await wallet.writeContract({
        ...contract,
        functionName: "deposit",
        args: [matchIdBn],
      })
      await publicClient.waitForTransactionReceipt({ hash })

      return { hash }
    } catch (error) {
      throw new Error(mapContractError(error))
    }
  }

  const bet = async (matchId: number, outcome: Outcome, amount: string): Promise<TxResult> => {
    if (!marketContract) throw new Error("Wallet not connected")
    
    const hash = await marketContract.wallet.writeContract({
      ...marketContract.contract,
      functionName: "betOnMatch",
      args: [matchId, outcome],
      value: parseEther(amount),
    })
    return { hash }
  }

  const claim = async (matchId: number): Promise<TxResult> => {
    if (!marketContract) throw new Error("Wallet not connected")
    
    const hash = await marketContract.wallet.writeContract({
      ...marketContract.contract,
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
    isConnected: isConnected && !!userAddress,
    isCorrectChain: chainId === mantleSepolia.id,
    switchChain: switchChainHook,
  }
}
