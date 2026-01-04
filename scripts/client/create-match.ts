import { API_BASE_URL, API_ENDPOINTS } from "./config.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Client script to create a match via API
 * 
 * Usage:
 * cd scripts  # Make sure you're in the scripts directory
 * API_BASE_URL=http://localhost:3000 npx tsx client/create-match.ts
 * 
 * Environment variables:
 * - API_BASE_URL: Base URL of the API server (default: http://localhost:3000)
 * - PLAYER1_WALLET: Wallet address of player 1 (required)
 * - PLAYER1_NAME: Name of player 1 (required)
 * - PLAYER2_WALLET: Wallet address of player 2 (required)
 * - PLAYER2_NAME: Name of player 2 (required)
 * - STAKE_AMOUNT: Stake amount in octas or APT (required)
 *   - If value is < 1,000,000, it's treated as APT and converted to octas
 *   - If value is >= 1,000,000, it's treated as octas
 *   - Examples: 0.1 (0.1 APT = 10,000,000 octas), 100000000 (100M octas = 1 APT)
 * - SCHEDULED_AT: Scheduled time in ISO format (optional, defaults to now + 1 hour)
 */

interface CreateMatchRequest {
  player1: {
    wallet: string;
    name: string;
  };
  player2: {
    wallet: string;
    name: string;
  };
  scheduledAt: string;
  stakeAmount: number;
}

interface CreateMatchResponse {
  id: string;
  status: string;
  scheduledAt: string;
}

async function createMatch() {
  // Validate environment variables
  const player1Wallet = process.env.PLAYER1_WALLET;
  const player1Name = process.env.PLAYER1_NAME;
  const player2Wallet = process.env.PLAYER2_WALLET;
  const player2Name = process.env.PLAYER2_NAME;
  const stakeAmount = process.env.STAKE_AMOUNT;
  const scheduledAt = process.env.SCHEDULED_AT;

  if (!player1Wallet || !player1Name) {
    console.error("❌ Error: PLAYER1_WALLET and PLAYER1_NAME are required");
    process.exit(1);
  }

  if (!player2Wallet || !player2Name) {
    console.error("❌ Error: PLAYER2_WALLET and PLAYER2_NAME are required");
    process.exit(1);
  }

  if (!stakeAmount) {
    console.error("❌ Error: STAKE_AMOUNT is required");
    process.exit(1);
  }

  // Parse as float to handle decimal values
  const stakeAmountFloat = parseFloat(stakeAmount);
  if (isNaN(stakeAmountFloat) || stakeAmountFloat <= 0) {
    console.error("❌ Error: STAKE_AMOUNT must be a positive number");
    process.exit(1);
  }

  // Convert APT to octas if value is less than 1,000,000 (assume it's in APT)
  // 1 APT = 100,000,000 octas
  const OCTAS_PER_APT = 100_000_000;
  const stakeAmountNum = stakeAmountFloat < 1_000_000
    ? Math.floor(stakeAmountFloat * OCTAS_PER_APT)
    : Math.floor(stakeAmountFloat);

  // Default scheduledAt to 1 hour from now if not provided
  const scheduledAtDate = new Date(Date.now() + 60 * 60 * 1000);

  if (isNaN(scheduledAtDate.getTime())) {
    console.error("❌ Error: SCHEDULED_AT must be a valid ISO date string");
    process.exit(1);
  }

  const requestBody: CreateMatchRequest = {
    player1: {
      wallet: player1Wallet,
      name: player1Name,
    },
    player2: {
      wallet: player2Wallet,
      name: player2Name,
    },
    scheduledAt: scheduledAtDate.toISOString(),
    stakeAmount: stakeAmountNum,
  };

  const originalAmount = stakeAmountFloat < 1_000_000 
    ? `${stakeAmountFloat} APT (${stakeAmountNum} octas)`
    : `${stakeAmountNum} octas`;

  console.log("\n=== Creating Match ===");
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Player 1: ${player1Name} (${player1Wallet})`);
  console.log(`Player 2: ${player2Name} (${player2Wallet})`);
  console.log(`Stake Amount: ${originalAmount}`);
  console.log(`Scheduled At: ${scheduledAtDate.toISOString()}\n`);

  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CREATE_MATCH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      console.error("❌ Failed to create match:");
      console.error(`  Status: ${response.status} ${response.statusText}`);
      console.error(`  Error: ${errorData.error || "Unknown error"}`);
      
      // Provide helpful error message for common issues
      if (errorData.error?.includes("PRIVATE_KEY")) {
        console.error("\n💡 Tip: The backend server needs PRIVATE_KEY environment variable set.");
        console.error("   Set it in the backend's .env file or environment, then restart the server.");
        console.error("   Example: PRIVATE_KEY=0x... in backend/.env");
      } else if (errorData.error?.includes("module_not_found") || errorData.error?.includes("Module not found")) {
        console.error("\n💡 Tip: The escrow module needs to be deployed to the blockchain first.");
        console.error("   The module should be deployed at the address configured in backend/src/config/aptos.ts");
        console.error("   Check the contracts directory for deployment instructions.");
        console.error("   You may need to deploy the chess_escrow module using aptos CLI or a deployment script.");
      }
      
      process.exit(1);
    }

    const data: CreateMatchResponse = await response.json();
    
    console.log("✓ Match created successfully!");
    console.log(`  Match ID: ${data.id}`);
    console.log(`  Status: ${data.status}`);
    console.log(`  Scheduled At: ${data.scheduledAt}\n`);
    
    return data;
  } catch (error: any) {
    console.error("❌ Error creating match:");
    if (error.message) {
      console.error(`  ${error.message}`);
    } else {
      console.error(`  ${error}`);
    }
    
    if (error.code === "ECONNREFUSED") {
      console.error("\n💡 Tip: Make sure the backend server is running on", API_BASE_URL);
    }
    
    process.exit(1);
  }
}

createMatch().catch(console.error);

