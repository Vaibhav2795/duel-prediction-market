import { aptos, createAccountFromPrivateKey, getAccountBalance } from "./config.js";

/**
 * Script to fund an account from the Movement Network testnet faucet
 * 
 * Usage:
 * PRIVATE_KEY=your_private_key tsx fund-account.ts
 */

async function fundAccount() {
    console.log("========================================");
    console.log("FUNDING ACCOUNT FROM FAUCET");
    console.log("========================================\n");

    // Get private key from environment or use the one from Movement config
    const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x769c5e13187a866dbdeb548944533bd6970b07017bdb3027620e8f92ead34b20";
    
    if (!PRIVATE_KEY) {
        console.error("ERROR: Please set PRIVATE_KEY environment variable");
        console.error("Or use the private key from contracts/.movement/config.yaml");
        process.exit(1);
    }

    // Create account from private key
    const account = createAccountFromPrivateKey(PRIVATE_KEY);
    const accountAddress = account.accountAddress.toString();
    
    console.log(`Account Address: ${accountAddress}`);
    console.log(`Expected Address: 0xed101e6c098f47d3a9ff8cf2dae4331fc2a55848502942246878b2ab63b90b4d\n`);

    // Check current balance
    try {
        const balance = await getAccountBalance(accountAddress);
        console.log(`Current Balance: ${balance} octas (${balance / 100_000_000} APT)`);
    } catch (error: any) {
        if (error.message?.includes("Account not found") || error.status === 404) {
            console.log("Account not found on-chain. This is normal for a new account.");
            console.log("Funding will create the account.\n");
        } else {
            throw error;
        }
    }

    // Fund account from faucet
    console.log("Requesting funds from faucet...");
    try {
        const response = await aptos.fundAccount({
            accountAddress,
            amount: 100_000_000, // 1 APT
        });

        console.log(`✓ Funding transaction submitted: ${response[0]}`);
        console.log(`Explorer: https://explorer.movementnetwork.xyz/txn/${response[0]}?network=custom\n`);

        // Wait a bit for the transaction to complete
        console.log("Waiting for transaction to complete...");
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Check new balance
        const newBalance = await getAccountBalance(accountAddress);
        console.log(`\n✓ Account funded successfully!`);
        console.log(`New Balance: ${newBalance} octas (${newBalance / 100_000_000} APT)`);
        console.log(`\nYou can now publish your Move package using:`);
        console.log(`  movement move publish`);
    } catch (error: any) {
        console.error("\n❌ Error funding account:");
        if (error.message) {
            console.error(error.message);
        }
        if (error.status) {
            console.error(`Status: ${error.status}`);
        }
        if (error.body) {
            console.error(`Response: ${JSON.stringify(error.body, null, 2)}`);
        }
        console.error("\nFull error:", error);
        process.exit(1);
    }
}

fundAccount().catch(console.error);

