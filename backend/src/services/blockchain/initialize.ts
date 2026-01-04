/**
 * Initialization helpers to ensure all contract stores are set up
 * Call these on backend startup to ensure everything is ready
 */

import { createAccountFromPrivateKey } from "./escrow.utils"
import {
  checkEscrowStoreExists,
  initializeEscrow,
} from "./escrow.utils"
import {
  checkPredictionMarketStoreExists,
  initializePredictionMarket,
} from "./predictionMarket"
import { MODULE_ADDRESS } from "@/config/aptos"

/**
 * Initialize escrow store if it doesn't exist
 * Returns true if initialized, false if already exists
 */
export async function ensureEscrowStoreInitialized(): Promise<boolean> {
  const privateKey = process.env.PRIVATE_KEY
  if (!privateKey) {
    throw new Error("PRIVATE_KEY env variable is missing")
  }

  const adminAccount = createAccountFromPrivateKey(privateKey)
  const adminAddress = adminAccount.accountAddress.toString()

  const storeExists = await checkEscrowStoreExists(adminAddress)
  if (storeExists) {
    console.log("✓ Escrow store already exists")
    return false
  }

  console.log("Initializing escrow store...")
  await initializeEscrow(adminAccount)
  console.log("✓ Escrow store initialized successfully")
  return true
}

/**
 * Initialize prediction market stores if they don't exist
 * Returns true if initialized, false if already exists
 */
export async function ensurePredictionMarketStoresInitialized(): Promise<boolean> {
  const privateKey = process.env.PRIVATE_KEY
  if (!privateKey) {
    throw new Error("PRIVATE_KEY env variable is missing")
  }

  const adminAccount = createAccountFromPrivateKey(privateKey)
  const adminAddress = adminAccount.accountAddress.toString()

  const storeExists = await checkPredictionMarketStoreExists(adminAddress)
  if (storeExists) {
    console.log("✓ Prediction market stores already exist")
    return false
  }

  console.log("Initializing prediction market stores...")
  await initializePredictionMarket(adminAccount)
  console.log("✓ Prediction market stores initialized successfully")
  return true
}

/**
 * Initialize all contract stores
 * Call this on backend startup to ensure everything is ready
 */
export async function initializeAllStores(): Promise<{
  escrowInitialized: boolean
  predictionMarketInitialized: boolean
}> {
  console.log("\n=== Initializing Contract Stores ===\n")
  console.log(`Admin Address: ${MODULE_ADDRESS}\n`)

  const [escrowInitialized, predictionMarketInitialized] = await Promise.all([
    ensureEscrowStoreInitialized(),
    ensurePredictionMarketStoresInitialized(),
  ])

  console.log("\n=== Initialization Complete ===\n")
  return {
    escrowInitialized,
    predictionMarketInitialized,
  }
}

