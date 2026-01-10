import { Account } from "@aptos-labs/ts-sdk";
import { aptos, MODULE_ADDRESS, createAccountFromPrivateKey, waitForTransaction, getAccountBalance } from "./config.js";

// Helper to check if EscrowStore exists
export async function checkEscrowStoreExists(adminAddress: string): Promise<boolean> {
    try {
        const resources = await aptos.getAccountResources({ accountAddress: adminAddress });
        const escrowStoreType = `${MODULE_ADDRESS}::escrow::EscrowStore`;
        return resources.some(r => r.type === escrowStoreType);
    } catch (error) {
        return false;
    }
}

// Contract function names
const ESCROW_MODULE = `${MODULE_ADDRESS}::escrow`;

// Initialize the escrow store
export async function initializeEscrow(account: Account) {
    console.log("\n=== Initializing Escrow Store ===\n");
    console.log(`Using account: ${account.accountAddress}`);

    const transaction = await aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: {
            function: `${ESCROW_MODULE}::initialize`,
            functionArguments: [],
        },
    });

    const signature = aptos.transaction.sign({
        signer: account,
        transaction
    });

    const committedTxn = await aptos.transaction.submit.simple({
        transaction,
        senderAuthenticator: signature,
    });

    console.log(`Transaction submitted: ${committedTxn.hash}`);
    
    await waitForTransaction(committedTxn.hash);
    return committedTxn.hash;
}

// Create an escrow
export async function createEscrow(
    admin: Account,
    matchId: number,
    player1: string,
    player2: string,
    amount: number
) {
    console.log("\n=== Creating Escrow ===\n");
    console.log(`Match ID: ${matchId}`);
    console.log(`Player 1: ${player1}`);
    console.log(`Player 2: ${player2}`);
    console.log(`Amount: ${amount}`);
    
    // Check if EscrowStore exists before proceeding
    const storeExists = await checkEscrowStoreExists(admin.accountAddress.toString());
    if (!storeExists) {
        throw new Error(
            `❌ EscrowStore not initialized!\n\n` +
            `The EscrowStore resource does not exist at address ${admin.accountAddress.toString()}\n` +
            `Please call initializeEscrow() first before creating escrows.\n` +
            `Example: await initializeEscrow(adminAccount);`
        );
    }

    const transaction = await aptos.transaction.build.simple({
        sender: admin.accountAddress,
        data: {
            function: `${ESCROW_MODULE}::create_escrow`,
            functionArguments: [matchId, player1, player2, amount],
        },
    });

    const signature = aptos.transaction.sign({
        signer: admin,
        transaction
    });

    const committedTxn = await aptos.transaction.submit.simple({
        transaction,
        senderAuthenticator: signature,
    });

    console.log(`Transaction submitted: ${committedTxn.hash}`);
    
    try {
        await waitForTransaction(committedTxn.hash);
    } catch (error: any) {
        const vmStatus = error.transaction?.vm_status || error.message || "";
        
        // Parse abort code from VM status
        const abortCodeMatch = vmStatus.match(/abort code: (\d+)/i);
        const abortCode = abortCodeMatch ? parseInt(abortCodeMatch[1]) : null;
        
        console.error("\n" + "=".repeat(80));
        console.error("❌ CREATE ESCROW FUNCTION FAILED");
        console.error("=".repeat(80));
        console.error("\n📋 Function Parameters:");
        console.error("  Match ID:", matchId);
        console.error("  Player 1:", player1);
        console.error("  Player 2:", player2);
        console.error("  Amount:", amount, "octas (", amount / 100000000, "APT)");
        console.error("  Admin Address:", admin.accountAddress.toString());
        
        // Check for specific error codes with proper detection
        if (abortCode === 5 || vmStatus.includes("EESCROW_ALREADY_EXISTS")) {
            console.error("\n⚠️  Error: Escrow already exists for this match_id");
            console.error("  Error Code: EESCROW_ALREADY_EXISTS (5)");
            console.error("  Solution: Use a different match_id");
            throw new Error(`Escrow already exists for match_id ${matchId}. Error code: EESCROW_ALREADY_EXISTS (5)`);
        } else if (vmStatus.includes("borrow_global") || vmStatus.includes("does not exist") || 
                   vmStatus.includes("EscrowStore") || abortCode === null && vmStatus.includes("code offset 0")) {
            console.error("\n⚠️  Error: EscrowStore resource does not exist");
            console.error("  This means the escrow store has not been initialized");
            console.error("  Solution: Call initializeEscrow() first");
            throw new Error(`EscrowStore not initialized. Please call initializeEscrow() first.`);
        } else if (abortCode === 1 || vmStatus.includes("ENOT_ADMIN")) {
            console.error("\n⚠️  Error: Not authorized as admin");
            console.error("  Error Code: ENOT_ADMIN (1)");
            throw new Error(`Not authorized as admin. Error code: ENOT_ADMIN (1)`);
        } else {
            // Unknown error - show full details
            console.error("\n⚠️  Unknown Error - Full Details Above");
            console.error("  Please check the detailed error information above");
        }
        
        console.error("=".repeat(80) + "\n");
        throw error;
    }
    return committedTxn.hash;
}

// Player deposit
export async function deposit(
    player: Account,
    adminAddress: string,
    matchId: number
) {
    console.log("\n=== Player Deposit ===\n");
    console.log(`Player: ${player.accountAddress}`);
    console.log(`Admin: ${adminAddress}`);
    console.log(`Match ID: ${matchId}`);

    const balance = await getAccountBalance(player.accountAddress.toString());
    console.log(`Player balance: ${balance}`);

    const transaction = await aptos.transaction.build.simple({
        sender: player.accountAddress,
        data: {
            function: `${ESCROW_MODULE}::deposit`,
            functionArguments: [adminAddress, matchId],
        },
    });

    const signature = aptos.transaction.sign({
        signer: player,
        transaction
    });

    const committedTxn = await aptos.transaction.submit.simple({
        transaction,
        senderAuthenticator: signature,
    });

    console.log(`Transaction submitted: ${committedTxn.hash}`);
    
    try {
        await waitForTransaction(committedTxn.hash);
    } catch (error: any) {
        if (error.transaction?.vm_status?.includes("EESCROW_NOT_FOUND")) {
            throw new Error(`Escrow not found for match_id ${matchId}. Error code: EESCROW_NOT_FOUND (4)`);
        }
        if (error.transaction?.vm_status?.includes("EALREADY_DEPOSITED")) {
            throw new Error(`Player has already deposited for match_id ${matchId}. Error code: EALREADY_DEPOSITED (2)`);
        }
        throw error;
    }
    return committedTxn.hash;
}

// Resolve escrow - winner takes all
export async function resolveWin(
    admin: Account,
    matchId: number,
    winner: string
) {
    console.log("\n=== Resolving Escrow (Winner) ===\n");
    console.log(`Match ID: ${matchId}`);
    console.log(`Winner: ${winner}`);

    const transaction = await aptos.transaction.build.simple({
        sender: admin.accountAddress,
        data: {
            function: `${ESCROW_MODULE}::resolve_win`,
            functionArguments: [matchId, winner],
        },
    });

    const signature = aptos.transaction.sign({
        signer: admin,
        transaction
    });

    const committedTxn = await aptos.transaction.submit.simple({
        transaction,
        senderAuthenticator: signature,
    });

    console.log(`Transaction submitted: ${committedTxn.hash}`);
    
    try {
        await waitForTransaction(committedTxn.hash);
    } catch (error: any) {
        if (error.transaction?.vm_status?.includes("EESCROW_NOT_FOUND")) {
            throw new Error(`Escrow not found for match_id ${matchId}. Error code: EESCROW_NOT_FOUND (4)`);
        }
        if (error.transaction?.vm_status?.includes("EESCROW_NOT_READY")) {
            throw new Error(`Escrow not ready for match_id ${matchId}. Both players must deposit first. Error code: EESCROW_NOT_READY (3)`);
        }
        if (error.transaction?.vm_status?.includes("ENOT_ADMIN")) {
            throw new Error(`Only admin can resolve escrow. Error code: ENOT_ADMIN (1)`);
        }
        throw error;
    }
    return committedTxn.hash;
}

// Resolve escrow - draw
export async function resolveDraw(
    admin: Account,
    matchId: number
) {
    console.log("\n=== Resolving Escrow (Draw) ===\n");
    console.log(`Match ID: ${matchId}`);

    const transaction = await aptos.transaction.build.simple({
        sender: admin.accountAddress,
        data: {
            function: `${ESCROW_MODULE}::resolve_draw`,
            functionArguments: [matchId],
        },
    });

    const signature = aptos.transaction.sign({
        signer: admin,
        transaction
    });

    const committedTxn = await aptos.transaction.submit.simple({
        transaction,
        senderAuthenticator: signature,
    });

    console.log(`Transaction submitted: ${committedTxn.hash}`);
    
    try {
        await waitForTransaction(committedTxn.hash);
    } catch (error: any) {
        if (error.transaction?.vm_status?.includes("EESCROW_NOT_FOUND")) {
            throw new Error(`Escrow not found for match_id ${matchId}. Error code: EESCROW_NOT_FOUND (4)`);
        }
        if (error.transaction?.vm_status?.includes("EESCROW_NOT_READY")) {
            throw new Error(`Escrow not ready for match_id ${matchId}. Both players must deposit first. Error code: EESCROW_NOT_READY (3)`);
        }
        if (error.transaction?.vm_status?.includes("ENOT_ADMIN")) {
            throw new Error(`Only admin can resolve escrow. Error code: ENOT_ADMIN (1)`);
        }
        throw error;
    }
    return committedTxn.hash;
}

// Example usage
async function main() {
    // Replace with your private key
    const PRIVATE_KEY = process.env.PRIVATE_KEY || "YOUR_PRIVATE_KEY_HERE";
    const PRIVATE_KEY2 = process.env.PRIVATE_KEY2 || "YOUR_PRIVATE_KEY_HERE";
    if (PRIVATE_KEY === "YOUR_PRIVATE_KEY_HERE") {
        console.error("Please set PRIVATE_KEY environment variable");
        process.exit(1);
    }

    const account = createAccountFromPrivateKey(PRIVATE_KEY);
    const account2 = createAccountFromPrivateKey(PRIVATE_KEY2);
    console.log(`Account address: ${account.accountAddress}`);

    // Example: Initialize escrow (only needed once)
    // await initializeEscrow(account);

    // Example: Create escrow
    // await createEscrow(
    //     account,
    //     1, // match_id
    //     "0xed101e6c098f47d3a9ff8cf2dae4331fc2a55848502942246878b2ab63b90b4d", // player1 address
    //     "0x2cd9c41f929c001a11e57de6b8a7d607cb1f1aca7b8d0435a393f10ee39dbcfa", // player2 address
    //     100000000 // amount in octas (0.1 APT)
    // );

    // Example: Player deposit
    // await deposit(
    //     account,
    //     MODULE_ADDRESS, // admin address
    //     1 // match_id
    // );

    // Example: Resolve win
    // await resolveWin(
    //     account,
    //     1, // match_id
    //     "0x123..." // winner address
    // );

    // Example: Resolve draw
    // await resolveDraw(
    //     account,
    //     1 // match_id
    // );
}

// Uncomment to run as standalone script
// main().catch(console.error);

