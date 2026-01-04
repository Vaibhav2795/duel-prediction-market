import { createAccountFromPrivateKey, MODULE_ADDRESS } from "./config.js";
import { initializeEscrow, createEscrow, deposit, resolveWin, resolveDraw, checkEscrowStoreExists } from "./escrow.js";

import dotenv from "dotenv";

dotenv.config();

/**
 * Example script demonstrating escrow contract interactions
 * 
 * Usage:
 * PRIVATE_KEY=your_private_key tsx example-escrow.ts
 */

async function main() {
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    const PRIVATE_KEY2 = process.env.PRIVATE_KEY2;
    if (!PRIVATE_KEY) {
        console.error("Please set PRIVATE_KEY environment variable");
        process.exit(1);
    }
    if (!PRIVATE_KEY2) {
        console.error("Please set PRIVATE_KEY2 environment variable");
        process.exit(1);
    }

    const account = createAccountFromPrivateKey(PRIVATE_KEY);
    const account2 = createAccountFromPrivateKey(PRIVATE_KEY2);
    console.log(`Account address: ${account.accountAddress}\n`);

    // Step 1: Initialize escrow (only needed once)
    console.log("Step 1: Initializing escrow store...");
    const storeExists = await checkEscrowStoreExists(account.accountAddress.toString());
    if (storeExists) {
        console.log("✓ Escrow store already exists (skipping initialization)\n");
    } else {
        try {
            await initializeEscrow(account);
            console.log("✓ Escrow store initialized successfully\n");
        } catch (error: any) {
            console.error("❌ Failed to initialize escrow store:");
            throw error;
        }
    }

    // Step 2: Create an escrow for a match
    // Use timestamp + random number to ensure uniqueness
    const matchId = Math.floor(Date.now() / 1000) * 1000 + Math.floor(Math.random() * 1000); // Timestamp + random for uniqueness
    const player1 = "0xed101e6c098f47d3a9ff8cf2dae4331fc2a55848502942246878b2ab63b90b4d";
    const player2 = "0x2cd9c41f929c001a11e57de6b8a7d607cb1f1aca7b8d0435a393f10ee39dbcfa";
    const amount = 100000; // 0.1 APT in octas

    console.log("Step 2: Creating escrow...");
    console.log(`Using unique match_id: ${matchId}`);
    try {
        await createEscrow(account, matchId, player1, player2, amount);
        console.log("✓ Escrow created successfully\n");
    } catch (error: any) {
        if (error.message?.includes("EESCROW_ALREADY_EXISTS") || error.message?.includes("already exists")) {
            console.error("Error: Escrow already exists for this match_id. Try a different match_id.");
            process.exit(1);
        }
        throw error;
    }

    // Step 3: Players deposit
    console.log("Step 3: Players depositing...");
    try {
        await deposit(account, MODULE_ADDRESS, matchId);
        console.log("✓ Player 1 deposited successfully\n");
    } catch (error: any) {
        if (error.message?.includes("EESCROW_NOT_FOUND") || error.transaction?.vm_status?.includes("EESCROW_NOT_FOUND")) {
            console.error("Error: Escrow not found. Make sure to create the escrow first.");
            process.exit(1);
        }
        if (error.message?.includes("EALREADY_DEPOSITED") || error.transaction?.vm_status?.includes("EALREADY_DEPOSITED")) {
            console.error("Error: Player has already deposited.");
            process.exit(1);
        }
        throw error;
    }
    
    try {
        await deposit(account2, MODULE_ADDRESS, matchId);
        console.log("✓ Player 2 deposited successfully\n");
    } catch (error: any) {
        if (error.message?.includes("EESCROW_NOT_FOUND") || error.transaction?.vm_status?.includes("EESCROW_NOT_FOUND")) {
            console.error("Error: Escrow not found. Make sure to create the escrow first.");
            process.exit(1);
        }
        if (error.message?.includes("EALREADY_DEPOSITED") || error.transaction?.vm_status?.includes("EALREADY_DEPOSITED")) {
            console.error("Error: Player has already deposited.");
            process.exit(1);
        }
        throw error;
    }

    // Step 4: Resolve escrow
    console.log("Step 4: Resolving escrow...");
    // Option A: Winner takes all
    try {
        await resolveWin(account, matchId, player1);
        console.log("✓ Escrow resolved - Player 1 wins\n");
    } catch (error: any) {
        if (error.message?.includes("EESCROW_NOT_READY") || error.transaction?.vm_status?.includes("EESCROW_NOT_READY")) {
            console.error("Error: Escrow not ready. Both players must deposit first.");
            process.exit(1);
        }
        throw error;
    }
    
    // Option B: Draw - split between players (commented out since we resolved as win)
    // await resolveDraw(account, matchId);
}

main().catch(console.error);

