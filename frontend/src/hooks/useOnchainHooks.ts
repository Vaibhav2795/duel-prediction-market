import { useCallback, useState } from "react"
import { usePrivy, useSendTransaction, useWallets } from "@privy-io/react-auth"
import {
  encodeFunctionData,
  createPublicClient,
  http,
  type Address,
  parseUnits,
} from "viem"
import {
  CHESS_ESCROW_ADDRESS,
  PREDICTION_MARKET_ADDRESS,
  CHESS_ESCROW_ABI,
  PREDICTION_MARKET_ABI,
  OUTCOME_PLAYER1,
  OUTCOME_PLAYER2,
  OUTCOME_DRAW,
} from "../constants/contracts"

// Get RPC URL from environment or use default
const RPC_URL = import.meta.env.VITE_RPC_URL || "https://rpc.testnet.mantle.xyz"

// Create public client for read operations
const publicClient = createPublicClient({
  transport: http(RPC_URL),
})

/**
 * Hook to create a match onchain
 * Calls: createEscrow -> createMarket -> deposit (for connected user)
 */

// DONE
export function useCreateMatchOnchain() {
  const { sendTransaction } = useSendTransaction()
  const { wallets } = useWallets()
  const { authenticated } = usePrivy()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createMatch = useCallback(
    async (
      matchId: number,
      player1: Address,
      player2: Address,
      amount: string // Amount as string (e.g., "100.0")
    ) => {
      if (!authenticated) {
        throw new Error("Wallet not connected")
      }

      const wallet = wallets[0]
      if (!wallet) {
        throw new Error("No wallet available")
      }

      setIsLoading(true)
      setError(null)

      try {
        // Parse amount (assuming 18 decimals for token)
        const amountWei = parseUnits(amount, 18)
        const matchIdUint64 = BigInt(matchId)

        // Step 1: Create Escrow
        const createEscrowData = encodeFunctionData({
          abi: CHESS_ESCROW_ABI,
          functionName: "createEscrow",
          args: [matchIdUint64, player1, player2, amountWei],
        })

        const escrowTx = await sendTransaction(
          {
            to: CHESS_ESCROW_ADDRESS,
            data: createEscrowData,
            value: BigInt(0),
          },
          {
            address: wallet.address as Address,
            uiOptions: {
              showWalletUIs: false,
            },
          }
        )

        // Wait for escrow transaction to be mined
        await publicClient.waitForTransactionReceipt({ hash: escrowTx.hash })

        // Step 2: Create Market
        const createMarketData = encodeFunctionData({
          abi: PREDICTION_MARKET_ABI,
          functionName: "createMarket",
          args: [matchIdUint64, player1, player2],
        })

        const marketTx = await sendTransaction(
          {
            to: PREDICTION_MARKET_ADDRESS,
            data: createMarketData,
            value: BigInt(0),
          },
          {
            address: wallet.address as Address,
            uiOptions: {
              showWalletUIs: false,
            },
          }
        )

        // Wait for market transaction to be mined
        await publicClient.waitForTransactionReceipt({ hash: marketTx.hash })

        // Step 3: Deposit for connected user (if they are player1 or player2)
        const userAddress = wallet.address.toLowerCase() as Address
        const isPlayer1 = userAddress.toLowerCase() === player1.toLowerCase()
        const isPlayer2 = userAddress.toLowerCase() === player2.toLowerCase()

        if (isPlayer1 || isPlayer2) {
          const depositData = encodeFunctionData({
            abi: CHESS_ESCROW_ABI,
            functionName: "deposit",
            args: [matchIdUint64],
          })

          const depositTx = await sendTransaction(
            {
              to: CHESS_ESCROW_ADDRESS,
              data: depositData,
              value: BigInt(0),
            },
            {
              address: wallet.address as Address,
              uiOptions: {
                showWalletUIs: false,
              },
            }
          )

          await publicClient.waitForTransactionReceipt({ hash: depositTx.hash })

          return {
            success: true,
            escrowTxHash: escrowTx.hash,
            marketTxHash: marketTx.hash,
            depositTxHash: depositTx.hash,
          }
        }

        return {
          success: true,
          escrowTxHash: escrowTx.hash,
          marketTxHash: marketTx.hash,
        }
      } catch (err: any) {
        const errorMessage = err?.message || "Failed to create match onchain"
        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    },
    [authenticated, wallets, sendTransaction]
  )

  return { createMatch, isLoading, error }
}

/**
 * Hook to join a match (deposit for opponent)
 */
export function useJoinMatchOnchain() {
  const { sendTransaction } = useSendTransaction()
  const { wallets } = useWallets()
  const { authenticated } = usePrivy()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const joinMatch = useCallback(
    async (matchId: number) => {
      if (!authenticated) {
        throw new Error("Wallet not connected")
      }

      const wallet = wallets[0]
      if (!wallet) {
        throw new Error("No wallet available")
      }

      setIsLoading(true)
      setError(null)

      try {
        const matchIdUint64 = BigInt(matchId)

        const depositData = encodeFunctionData({
          abi: CHESS_ESCROW_ABI,
          functionName: "deposit",
          args: [matchIdUint64],
        })

        const tx = await sendTransaction(
          {
            to: CHESS_ESCROW_ADDRESS,
            data: depositData,
            value: BigInt(0),
          },
          {
            address: wallet.address as Address,
            uiOptions: {
              showWalletUIs: false,
            },
          }
        )

        await publicClient.waitForTransactionReceipt({ hash: tx.hash })

        return {
          success: true,
          txHash: tx.hash,
        }
      } catch (err: any) {
        const errorMessage = err?.message || "Failed to join match"
        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    },
    [authenticated, wallets, sendTransaction]
  )

  return { joinMatch, isLoading, error }
}

/**
 * Hook to place a bet on a match
 */
export function useBetOnMatchOnchain() {
  const { sendTransaction } = useSendTransaction()
  const { wallets } = useWallets()
  const { authenticated } = usePrivy()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const betOnMatch = useCallback(
    async (matchId: number, outcome: 1 | 2 | 3, amount: string) => {
      if (!authenticated) {
        throw new Error("Wallet not connected")
      }

      if (
        outcome !== OUTCOME_PLAYER1 &&
        outcome !== OUTCOME_PLAYER2 &&
        outcome !== OUTCOME_DRAW
      ) {
        throw new Error(
          "Invalid outcome. Must be 1 (Player1), 2 (Player2), or 3 (Draw)"
        )
      }

      const wallet = wallets[0]
      if (!wallet) {
        throw new Error("No wallet available")
      }

      setIsLoading(true)
      setError(null)

      try {
        const matchIdUint64 = BigInt(matchId)
        const amountWei = parseUnits(amount, 18)

        const betData = encodeFunctionData({
          abi: PREDICTION_MARKET_ABI,
          functionName: "bet",
          args: [matchIdUint64, outcome, amountWei],
        })

        const tx = await sendTransaction(
          {
            to: PREDICTION_MARKET_ADDRESS,
            data: betData,
            value: BigInt(0),
          },
          {
            address: wallet.address as Address,
            uiOptions: {
              showWalletUIs: false,
            },
          }
        )

        await publicClient.waitForTransactionReceipt({ hash: tx.hash })

        return {
          success: true,
          txHash: tx.hash,
        }
      } catch (err: any) {
        const errorMessage = err?.message || "Failed to place bet"
        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    },
    [authenticated, wallets, sendTransaction]
  )

  return { betOnMatch, isLoading, error }
}

/**
 * Hook to claim rewards
 */
export function useClaimRewardOnchain() {
  const { sendTransaction } = useSendTransaction()
  const { wallets } = useWallets()
  const { authenticated } = usePrivy()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const claimReward = useCallback(
    async (matchId: number) => {
      if (!authenticated) {
        throw new Error("Wallet not connected")
      }

      const wallet = wallets[0]
      if (!wallet) {
        throw new Error("No wallet available")
      }

      setIsLoading(true)
      setError(null)

      try {
        const matchIdUint64 = BigInt(matchId)

        const claimData = encodeFunctionData({
          abi: PREDICTION_MARKET_ABI,
          functionName: "claimRewards",
          args: [matchIdUint64],
        })

        const tx = await sendTransaction(
          {
            to: PREDICTION_MARKET_ADDRESS,
            data: claimData,
            value: BigInt(0),
          },
          {
            address: wallet.address as Address,
            uiOptions: {
              showWalletUIs: false,
            },
          }
        )

        await publicClient.waitForTransactionReceipt({ hash: tx.hash })

        return {
          success: true,
          txHash: tx.hash,
        }
      } catch (err: any) {
        const errorMessage = err?.message || "Failed to claim reward"
        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    },
    [authenticated, wallets, sendTransaction]
  )

  return { claimReward, isLoading, error }
}

/**
 * Hook to get market data
 */
export function useGetMarketDataOnchain() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getMarketData = useCallback(async (matchId: number) => {
    setIsLoading(true)
    setError(null)

    try {
      const matchIdUint64 = BigInt(matchId)

      const result = (await publicClient.readContract({
        address: PREDICTION_MARKET_ADDRESS,
        abi: PREDICTION_MARKET_ABI,
        functionName: "getMarketStats",
        args: [matchIdUint64],
      })) as readonly [bigint, bigint, bigint, bigint, bigint, bigint]

      const [
        status,
        winningOutcome,
        totalPool,
        p1Shares,
        p2Shares,
        drawShares,
      ] = result

      return {
        status: Number(status),
        winningOutcome: Number(winningOutcome),
        totalPool: totalPool.toString(),
        p1Shares: p1Shares.toString(),
        p2Shares: p2Shares.toString(),
        drawShares: drawShares.toString(),
      }
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to get market data"
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { getMarketData, isLoading, error }
}

/**
 * Hook to get user shares for a specific outcome
 */
export function useGetUserSharesOnchain() {
  const { wallets } = useWallets()
  const { authenticated } = usePrivy()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getUserShares = useCallback(
    async (matchId: number, outcome: 1 | 2 | 3, userAddress?: Address) => {
      if (!authenticated) {
        throw new Error("Wallet not connected")
      }

      const wallet = wallets[0]
      if (!wallet) {
        throw new Error("No wallet available")
      }

      const address = userAddress || (wallet.address as Address)

      setIsLoading(true)
      setError(null)

      try {
        const matchIdUint64 = BigInt(matchId)

        const shares = (await publicClient.readContract({
          address: PREDICTION_MARKET_ADDRESS,
          abi: PREDICTION_MARKET_ABI,
          functionName: "getUserShares",
          args: [matchIdUint64, outcome, address],
        })) as bigint

        return shares.toString()
      } catch (err: any) {
        const errorMessage = err?.message || "Failed to get user shares"
        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    },
    [authenticated, wallets]
  )

  return { getUserShares, isLoading, error }
}

/**
 * Hook to check if user can claim rewards
 */
export function useCanClaimOnchain() {
  const { wallets } = useWallets()
  const { authenticated } = usePrivy()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canClaim = useCallback(
    async (matchId: number, userAddress?: Address) => {
      if (!authenticated) {
        return false
      }

      const wallet = wallets[0]
      if (!wallet) {
        return false
      }

      const address = userAddress || (wallet.address as Address)

      setIsLoading(true)
      setError(null)

      try {
        const matchIdUint64 = BigInt(matchId)

        const hasClaimed = await publicClient.readContract({
          address: PREDICTION_MARKET_ADDRESS,
          abi: PREDICTION_MARKET_ABI,
          functionName: "hasUserClaimed",
          args: [matchIdUint64, address],
        })

        return !hasClaimed // Can claim if not already claimed
      } catch (err: any) {
        const errorMessage = err?.message || "Failed to check claim status"
        setError(errorMessage)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [authenticated, wallets]
  )

  return { canClaim, isLoading, error }
}

/**
 * Hook to get potential reward for a user's outcome
 */
export function useGetPotentialRewardOnchain() {
  const { wallets } = useWallets()
  const { authenticated } = usePrivy()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getPotentialReward = useCallback(
    async (matchId: number, outcome: 1 | 2 | 3, userAddress?: Address) => {
      if (!authenticated) {
        throw new Error("Wallet not connected")
      }

      const wallet = wallets[0]
      if (!wallet) {
        throw new Error("No wallet available")
      }

      const address = userAddress || (wallet.address as Address)

      setIsLoading(true)
      setError(null)

      try {
        const matchIdUint64 = BigInt(matchId)

        const reward = (await publicClient.readContract({
          address: PREDICTION_MARKET_ADDRESS,
          abi: PREDICTION_MARKET_ABI,
          functionName: "getPotentialReward",
          args: [matchIdUint64, outcome, address],
        })) as bigint

        return reward.toString()
      } catch (err: any) {
        const errorMessage = err?.message || "Failed to get potential reward"
        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    },
    [authenticated, wallets]
  )

  return { getPotentialReward, isLoading, error }
}

/**
 * Hook to get all shares for a user across all outcomes
 */
export function useGetAllSharesOnchain() {
  const { wallets } = useWallets()
  const { authenticated } = usePrivy()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getAllShares = useCallback(
    async (matchId: number, userAddress?: Address) => {
      if (!authenticated) {
        throw new Error("Wallet not connected")
      }

      const wallet = wallets[0]
      if (!wallet) {
        throw new Error("No wallet available")
      }

      const address = userAddress || (wallet.address as Address)

      setIsLoading(true)
      setError(null)

      try {
        const matchIdUint64 = BigInt(matchId)

        const result = (await publicClient.readContract({
          address: PREDICTION_MARKET_ADDRESS,
          abi: PREDICTION_MARKET_ABI,
          functionName: "getUserAllShares",
          args: [matchIdUint64, address],
        })) as readonly [bigint, bigint, bigint]

        const [p1Shares, p2Shares, drawShares] = result

        return {
          p1Shares: p1Shares.toString(),
          p2Shares: p2Shares.toString(),
          drawShares: drawShares.toString(),
        }
      } catch (err: any) {
        const errorMessage = err?.message || "Failed to get all shares"
        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    },
    [authenticated, wallets]
  )

  return { getAllShares, isLoading, error }
}
