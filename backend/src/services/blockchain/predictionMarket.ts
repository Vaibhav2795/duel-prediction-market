import { Account } from "@aptos-labs/ts-sdk"
import { aptos, MODULE_ADDRESS, waitForTransaction, getAccountBalance } from "@/config/aptos"
import { createAccountFromPrivateKey } from "./escrow.utils"

// Contract function names
const PREDICTION_MARKET_MODULE = `${MODULE_ADDRESS}::prediction_market`

// Outcome constants
export const OUTCOME_PLAYER1 = 1
export const OUTCOME_PLAYER2 = 2
export const OUTCOME_DRAW = 3

// Types
export interface CreateMarketParams {
  matchId: number
  player1: string
  player2: string
}

export interface BetParams {
  userPrivateKey: string
  adminAddress: string
  matchId: number
  outcome: number
  amount: number
}

export interface ResolveMarketParams {
  matchId: number
  winningOutcome: number
}

export interface ClaimRewardsParams {
  userPrivateKey: string
  adminAddress: string
  matchId: number
}

export interface GetMarketStatsParams {
  adminAddress: string
  matchId: number
}

export interface GetUserSharesParams {
  adminAddress: string
  matchId: number
  outcome: number
  userAddress: string
}

export interface GetPotentialRewardParams {
  adminAddress: string
  matchId: number
  outcome: number
  userAddress: string
}

export interface HasClaimedParams {
  adminAddress: string
  matchId: number
  userAddress: string
}

export interface MarketStats {
  status: number
  winningOutcome: number
  poolSize: number
  player1Shares: number
  player2Shares: number
  drawShares: number
}

// Helper to check if Prediction Market stores exist
export async function checkPredictionMarketStoreExists(
  adminAddress: string
): Promise<boolean> {
  try {
    const resources = await aptos.getAccountResources({
      accountAddress: adminAddress,
    })
    const marketStoreType = `${MODULE_ADDRESS}::prediction_market::MarketStore`
    const sharesStoreType = `${MODULE_ADDRESS}::prediction_market::OutcomeSharesStore`
    const claimStoreType = `${MODULE_ADDRESS}::prediction_market::ClaimTrackingStore`

    const hasMarketStore = resources.some((r) => r.type === marketStoreType)
    const hasSharesStore = resources.some((r) => r.type === sharesStoreType)
    const hasClaimStore = resources.some((r) => r.type === claimStoreType)

    return hasMarketStore && hasSharesStore && hasClaimStore
  } catch (error) {
    return false
  }
}

// Initialize the prediction market store
export async function initializePredictionMarket(
  account: Account
): Promise<string> {
  const transaction = await aptos.transaction.build.simple({
    sender: account.accountAddress,
    data: {
      function: `${PREDICTION_MARKET_MODULE}::initialize`,
      functionArguments: [],
    },
  })

  const signature = aptos.transaction.sign({
    signer: account,
    transaction,
  })

  const committedTxn = await aptos.transaction.submit.simple({
    transaction,
    senderAuthenticator: signature,
  })

  await waitForTransaction(committedTxn.hash)
  return committedTxn.hash
}

// Create a new prediction market
export async function createMarket({
  matchId,
  player1,
  player2,
}: CreateMarketParams): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY
  if (!privateKey) {
    throw new Error("PRIVATE_KEY env variable is missing")
  }

  const adminAccount = createAccountFromPrivateKey(privateKey)

  // Check if stores exist before proceeding
  const storeExists = await checkPredictionMarketStoreExists(
    adminAccount.accountAddress.toString()
  )
  if (!storeExists) {
    try {
      await initializePredictionMarket(adminAccount)
    } catch (error: any) {
      throw new Error(
        `Prediction market stores not initialized. Failed to initialize: ${error.message}`
      )
    }
  }

  const transaction = await aptos.transaction.build.simple({
    sender: adminAccount.accountAddress,
    data: {
      function: `${PREDICTION_MARKET_MODULE}::create_market`,
      functionArguments: [matchId, player1, player2],
    },
  })

  const signature = aptos.transaction.sign({
    signer: adminAccount,
    transaction,
  })

  const committedTxn = await aptos.transaction.submit.simple({
    transaction,
    senderAuthenticator: signature,
  })

  try {
    await waitForTransaction(committedTxn.hash)
  } catch (error: any) {
    const vmStatus = error?.transaction?.vm_status || error?.message || ""
    if (vmStatus.includes("EMARKET_ALREADY_EXISTS")) {
      throw new Error(
        `Market already exists for match_id ${matchId}. Error code: EMARKET_ALREADY_EXISTS`
      )
    }
    throw error
  }

  return committedTxn.hash
}

// Place a bet
export async function bet({
  userPrivateKey,
  adminAddress,
  matchId,
  outcome,
  amount,
}: BetParams): Promise<string> {
  const userAccount = createAccountFromPrivateKey(userPrivateKey)

  // Optional: Check balance before betting
  const balance = await getAccountBalance(userAccount.accountAddress.toString())
  if (balance < amount) {
    throw new Error(`Insufficient balance. Required: ${amount}, Available: ${balance}`)
  }

  const transaction = await aptos.transaction.build.simple({
    sender: userAccount.accountAddress,
    data: {
      function: `${PREDICTION_MARKET_MODULE}::bet`,
      functionArguments: [adminAddress, matchId, outcome, amount],
    },
  })

  const signature = aptos.transaction.sign({
    signer: userAccount,
    transaction,
  })

  const committedTxn = await aptos.transaction.submit.simple({
    transaction,
    senderAuthenticator: signature,
  })

  try {
    await waitForTransaction(committedTxn.hash)
  } catch (error: any) {
    const vmStatus = error?.transaction?.vm_status || error?.message || ""
    if (vmStatus.includes("EMARKET_NOT_FOUND")) {
      throw new Error(
        `Market not found for match_id ${matchId}. Make sure to create the market first. Error code: EMARKET_NOT_FOUND`
      )
    }
    throw error
  }

  return committedTxn.hash
}

// Resolve market
export async function resolveMarket({
  matchId,
  winningOutcome,
}: ResolveMarketParams): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY
  if (!privateKey) {
    throw new Error("PRIVATE_KEY env variable is missing")
  }

  const adminAccount = createAccountFromPrivateKey(privateKey)

  const transaction = await aptos.transaction.build.simple({
    sender: adminAccount.accountAddress,
    data: {
      function: `${PREDICTION_MARKET_MODULE}::resolve_market`,
      functionArguments: [matchId, winningOutcome],
    },
  })

  const signature = aptos.transaction.sign({
    signer: adminAccount,
    transaction,
  })

  const committedTxn = await aptos.transaction.submit.simple({
    transaction,
    senderAuthenticator: signature,
  })

  try {
    await waitForTransaction(committedTxn.hash)
  } catch (error: any) {
    const vmStatus = error?.transaction?.vm_status || error?.message || ""
    if (vmStatus.includes("EMARKET_ALREADY_RESOLVED")) {
      throw new Error(
        `Market already resolved for match_id ${matchId}. Error code: EMARKET_ALREADY_RESOLVED`
      )
    }
    if (vmStatus.includes("ENOT_ADMIN")) {
      throw new Error(`Only admin can resolve market. Error code: ENOT_ADMIN`)
    }
    throw error
  }

  return committedTxn.hash
}

// Claim rewards
export async function claimRewards({
  userPrivateKey,
  adminAddress,
  matchId,
}: ClaimRewardsParams): Promise<string> {
  const userAccount = createAccountFromPrivateKey(userPrivateKey)

  const transaction = await aptos.transaction.build.simple({
    sender: userAccount.accountAddress,
    data: {
      function: `${PREDICTION_MARKET_MODULE}::claim_rewards`,
      functionArguments: [adminAddress, matchId],
    },
  })

  const signature = aptos.transaction.sign({
    signer: userAccount,
    transaction,
  })

  const committedTxn = await aptos.transaction.submit.simple({
    transaction,
    senderAuthenticator: signature,
  })

  try {
    await waitForTransaction(committedTxn.hash)
  } catch (error: any) {
    const vmStatus = error?.transaction?.vm_status || error?.message || ""
    if (vmStatus.includes("ENO_SHARES")) {
      throw new Error(
        `No shares in winning outcome to claim. Error code: ENO_SHARES`
      )
    }
    if (vmStatus.includes("EALREADY_CLAIMED")) {
      throw new Error(`Rewards already claimed. Error code: EALREADY_CLAIMED`)
    }
    throw error
  }

  return committedTxn.hash
}

// View functions

// Get market statistics
export async function getMarketStats({
  adminAddress,
  matchId,
}: GetMarketStatsParams): Promise<MarketStats> {
  const viewPayload = {
    function: `${PREDICTION_MARKET_MODULE}::get_market_stats`,
    functionArguments: [adminAddress, matchId],
  }

  try {
    const result = await aptos.view({ payload: viewPayload })
    const [
      status,
      winningOutcome,
      poolSize,
      player1Shares,
      player2Shares,
      drawShares,
    ] = result as [number, number, number, number, number, number]

    return {
      status,
      winningOutcome,
      poolSize,
      player1Shares,
      player2Shares,
      drawShares,
    }
  } catch (error) {
    console.error("Error getting market stats:", error)
    throw error
  }
}

// Get user shares in a specific outcome
export async function getUserShares({
  adminAddress,
  matchId,
  outcome,
  userAddress,
}: GetUserSharesParams): Promise<number> {
  try {
    const viewPayload = {
      function: `${PREDICTION_MARKET_MODULE}::get_user_shares`,
      functionArguments: [adminAddress, matchId, outcome, userAddress],
    }
    const result = await aptos.view({ payload: viewPayload })
    const shares = result as number
    return shares
  } catch (error: any) {
    // If view function doesn't work, return 0
    if (
      error.message?.includes("not an view function") ||
      error.message?.includes("not a view function")
    ) {
      console.warn(
        "⚠️  Cannot read user shares directly - view functions with 'acquires' are not supported by SDK"
      )
      return 0
    }
    throw error
  }
}

// Get all user shares across all outcomes
export async function getUserAllShares(
  adminAddress: string,
  matchId: number,
  userAddress: string
): Promise<{
  player1Shares: number
  player2Shares: number
  drawShares: number
}> {
  try {
    const player1Shares = await getUserShares({
      adminAddress,
      matchId,
      outcome: OUTCOME_PLAYER1,
      userAddress,
    })
    const player2Shares = await getUserShares({
      adminAddress,
      matchId,
      outcome: OUTCOME_PLAYER2,
      userAddress,
    })
    const drawShares = await getUserShares({
      adminAddress,
      matchId,
      outcome: OUTCOME_DRAW,
      userAddress,
    })

    return { player1Shares, player2Shares, drawShares }
  } catch (error) {
    console.error("Error getting all user shares:", error)
    throw error
  }
}

// Get potential reward
export async function getPotentialReward({
  adminAddress,
  matchId,
  outcome,
  userAddress,
}: GetPotentialRewardParams): Promise<number> {
  const viewPayload = {
    function: `${PREDICTION_MARKET_MODULE}::get_potential_reward`,
    functionArguments: [adminAddress, matchId, outcome, userAddress],
  }

  try {
    const result = await aptos.view({ payload: viewPayload })
    const reward = result as number
    return reward
  } catch (error) {
    console.error("Error getting potential reward:", error)
    throw error
  }
}

// Check if user has claimed
export async function hasClaimed({
  adminAddress,
  matchId,
  userAddress,
}: HasClaimedParams): Promise<boolean> {
  const viewPayload = {
    function: `${PREDICTION_MARKET_MODULE}::has_claimed`,
    functionArguments: [adminAddress, matchId, userAddress],
  }

  try {
    const result = await aptos.view({ payload: viewPayload })
    const claimed = result as boolean
    return claimed
  } catch (error) {
    console.error("Error checking claim status:", error)
    throw error
  }
}

// Check if market exists
export async function marketExists(
  adminAddress: string,
  matchId: number
): Promise<boolean> {
  const viewPayload = {
    function: `${PREDICTION_MARKET_MODULE}::market_exists`,
    functionArguments: [adminAddress, matchId],
  }

  try {
    const result = await aptos.view({ payload: viewPayload })
    const exists = result as boolean
    return exists
  } catch (error) {
    console.error("Error checking market existence:", error)
    throw error
  }
}

