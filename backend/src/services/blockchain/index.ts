// Escrow functions
export { createEscrow } from "./createEscrow"
export { deposit } from "./deposit"
export { resolveWin, resolveDraw } from "./resolveEscrow"
export {
  initializeEscrow,
  checkEscrowStoreExists,
  createAccountFromPrivateKey,
  getAccountBalance,
} from "./escrow.utils"

// Prediction Market functions
export {
  initializePredictionMarket,
  checkPredictionMarketStoreExists,
  createMarket,
  bet,
  resolveMarket,
  claimRewards,
  getMarketStats,
  getUserShares,
  getUserAllShares,
  getPotentialReward,
  hasClaimed,
  marketExists,
  OUTCOME_PLAYER1,
  OUTCOME_PLAYER2,
  OUTCOME_DRAW,
} from "./predictionMarket"

// Initialization helpers
export {
  ensureEscrowStoreInitialized,
  ensurePredictionMarketStoresInitialized,
  initializeAllStores,
} from "./initialize"

// Types
export type {
  CreateEscrowParams,
  DepositParams,
  ResolveWinParams,
  ResolveDrawParams,
} from "./escrow.types"

export type {
  CreateMarketParams,
  BetParams,
  ResolveMarketParams,
  ClaimRewardsParams,
  GetMarketStatsParams,
  GetUserSharesParams,
  GetPotentialRewardParams,
  HasClaimedParams,
  MarketStats,
} from "./predictionMarket"

