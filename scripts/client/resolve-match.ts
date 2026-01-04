import { createAccountFromPrivateKey, MODULE_ADDRESS } from "../config.js";
import { 
  resolveMarket, 
  OUTCOME_PLAYER1, 
  OUTCOME_PLAYER2, 
  OUTCOME_DRAW 
} from "../prediction-market.js";

/**
 * Client script to resolve a match via blockchain
 * 
 * This script resolves the prediction market for a match by calling the blockchain contract.
 * 
 * Usage:
 * cd scripts  # Make sure you're in the scripts directory
 * PRIVATE_KEY=admin_private_key npx tsx client/resolve-match.ts
 * 
 * Environment variables:
 * - PRIVATE_KEY: Private key of the admin account (required)
 * - MATCH_ID: Match ID to resolve (required)
 * - WINNING_OUTCOME: Winning outcome (1=Player1, 2=Player2, 3=Draw) (required)
 * 
 * Example:
 * cd scripts
 * PRIVATE_KEY=0x... MATCH_ID=1234567890 WINNING_OUTCOME=1 npx tsx client/resolve-match.ts
 */

async function resolveMatch() {
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const MATCH_ID = process.env.MATCH_ID;
  const WINNING_OUTCOME = process.env.WINNING_OUTCOME;

  if (!PRIVATE_KEY) {
    console.error("❌ Error: PRIVATE_KEY environment variable is required");
    process.exit(1);
  }

  if (!MATCH_ID) {
    console.error("❌ Error: MATCH_ID environment variable is required");
    process.exit(1);
  }

  if (!WINNING_OUTCOME) {
    console.error("❌ Error: WINNING_OUTCOME environment variable is required");
    console.error("   Valid values: 1 (Player 1), 2 (Player 2), 3 (Draw)");
    process.exit(1);
  }

  const matchId = parseInt(MATCH_ID, 10);
  if (isNaN(matchId)) {
    console.error("❌ Error: MATCH_ID must be a valid number");
    process.exit(1);
  }

  const winningOutcome = parseInt(WINNING_OUTCOME, 10);
  if (![OUTCOME_PLAYER1, OUTCOME_PLAYER2, OUTCOME_DRAW].includes(winningOutcome)) {
    console.error("❌ Error: WINNING_OUTCOME must be 1 (Player 1), 2 (Player 2), or 3 (Draw)");
    process.exit(1);
  }

  const account = createAccountFromPrivateKey(PRIVATE_KEY);
  const outcomeName = 
    winningOutcome === OUTCOME_PLAYER1 ? "Player 1" :
    winningOutcome === OUTCOME_PLAYER2 ? "Player 2" : "Draw";

  console.log("\n=== Resolving Match ===");
  console.log(`Admin Address: ${account.accountAddress}`);
  console.log(`Match ID: ${matchId}`);
  console.log(`Winning Outcome: ${outcomeName} (${winningOutcome})`);
  console.log(`Module Address: ${MODULE_ADDRESS}\n`);

  try {
    const txHash = await resolveMarket(account, matchId, winningOutcome);
    
    console.log("✓ Market resolved successfully!");
    console.log(`  Transaction Hash: ${txHash}`);
    console.log(`  Explorer: https://explorer.movementnetwork.xyz/txn/${txHash}?network=custom\n`);
    
    return txHash;
  } catch (error: any) {
    console.error("❌ Failed to resolve market:");
    
    if (error.message?.includes("EMARKET_ALREADY_RESOLVED")) {
      console.error("  Error: Market already resolved for this match_id");
    } else if (error.message?.includes("ENOT_ADMIN")) {
      console.error("  Error: Only admin can resolve market");
    } else if (error.message?.includes("EMARKET_NOT_FOUND")) {
      console.error("  Error: Market not found. Make sure to create the market first.");
    } else {
      console.error(`  ${error.message || error}`);
    }
    
    if (error.transaction?.vm_status) {
      console.error(`  VM Status: ${error.transaction.vm_status}`);
    }
    
    process.exit(1);
  }
}

resolveMatch().catch(console.error);

