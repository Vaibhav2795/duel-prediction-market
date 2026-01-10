import { Account } from "@aptos-labs/ts-sdk";
import { aptos, MODULE_ADDRESS, createAccountFromPrivateKey, waitForTransaction, getAccountBalance } from "./config.js";

// Contract function names
const PREDICTION_MARKET_MODULE = `${MODULE_ADDRESS}::prediction_market`;

// Outcome constants
export const OUTCOME_PLAYER1 = 1;
export const OUTCOME_PLAYER2 = 2;
export const OUTCOME_DRAW = 3;

// Helper to check if Prediction Market stores exist
export async function checkPredictionMarketStoreExists(adminAddress: string): Promise<boolean> {
    try {
        const resources = await aptos.getAccountResources({ accountAddress: adminAddress });
        const marketStoreType = `${MODULE_ADDRESS}::prediction_market::MarketStore`;
        const sharesStoreType = `${MODULE_ADDRESS}::prediction_market::OutcomeSharesStore`;
        const claimStoreType = `${MODULE_ADDRESS}::prediction_market::ClaimTrackingStore`;
        
        const hasMarketStore = resources.some(r => r.type === marketStoreType);
        const hasSharesStore = resources.some(r => r.type === sharesStoreType);
        const hasClaimStore = resources.some(r => r.type === claimStoreType);
        
        return hasMarketStore && hasSharesStore && hasClaimStore;
    } catch (error) {
        return false;
    }
}

// Initialize the prediction market store
export async function initializePredictionMarket(account: Account) {
    console.log("\n=== Initializing Prediction Market Store ===\n");
    console.log(`Using account: ${account.accountAddress}`);

    const transaction = await aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: {
            function: `${PREDICTION_MARKET_MODULE}::initialize`,
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

// Create a new prediction market
export async function createMarket(
    admin: Account,
    matchId: number,
    player1: string,
    player2: string
) {
    console.log("\n=== Creating Prediction Market ===\n");
    console.log(`Match ID: ${matchId}`);
    console.log(`Player 1: ${player1}`);
    console.log(`Player 2: ${player2}`);

    const transaction = await aptos.transaction.build.simple({
        sender: admin.accountAddress,
        data: {
            function: `${PREDICTION_MARKET_MODULE}::create_market`,
            functionArguments: [matchId, player1, player2],
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
    
    await waitForTransaction(committedTxn.hash);
    return committedTxn.hash;
}

// Place a bet
export async function bet(
    user: Account,
    adminAddress: string,
    matchId: number,
    outcome: number,
    amount: number
) {
    console.log("\n=== Placing Bet ===\n");
    console.log(`User: ${user.accountAddress}`);
    console.log(`Match ID: ${matchId}`);
    console.log(`Outcome: ${outcome === OUTCOME_PLAYER1 ? 'Player 1' : outcome === OUTCOME_PLAYER2 ? 'Player 2' : 'Draw'}`);
    console.log(`Amount: ${amount}`);

    const balance = await getAccountBalance(user.accountAddress.toString());
    console.log(`User balance: ${balance}`);

    const transaction = await aptos.transaction.build.simple({
        sender: user.accountAddress,
        data: {
            function: `${PREDICTION_MARKET_MODULE}::bet`,
            functionArguments: [adminAddress, matchId, outcome, amount],
        },
    });

    const signature = aptos.transaction.sign({
        signer: user,
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

// Resolve market
export async function resolveMarket(
    admin: Account,
    matchId: number,
    winningOutcome: number
) {
    console.log("\n=== Resolving Market ===\n");
    console.log(`Match ID: ${matchId}`);
    console.log(`Winning Outcome: ${winningOutcome === OUTCOME_PLAYER1 ? 'Player 1' : winningOutcome === OUTCOME_PLAYER2 ? 'Player 2' : 'Draw'}`);

    const transaction = await aptos.transaction.build.simple({
        sender: admin.accountAddress,
        data: {
            function: `${PREDICTION_MARKET_MODULE}::resolve_market`,
            functionArguments: [matchId, winningOutcome],
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
    
    await waitForTransaction(committedTxn.hash);
    return committedTxn.hash;
}

// Claim rewards
export async function claimRewards(
    user: Account,
    adminAddress: string,
    matchId: number
) {
    console.log("\n=== Claiming Rewards ===\n");
    console.log(`User: ${user.accountAddress}`);
    console.log(`Match ID: ${matchId}`);

    const balanceBefore = await getAccountBalance(user.accountAddress.toString());
    console.log(`Balance before: ${balanceBefore}`);

    const transaction = await aptos.transaction.build.simple({
        sender: user.accountAddress,
        data: {
            function: `${PREDICTION_MARKET_MODULE}::claim_rewards`,
            functionArguments: [adminAddress, matchId],
        },
    });

    const signature = aptos.transaction.sign({
        signer: user,
        transaction
    });

    const committedTxn = await aptos.transaction.submit.simple({
        transaction,
        senderAuthenticator: signature,
    });

    console.log(`Transaction submitted: ${committedTxn.hash}`);
    
    await waitForTransaction(committedTxn.hash);

    const balanceAfter = await getAccountBalance(user.accountAddress.toString());
    console.log(`Balance after: ${balanceAfter}`);
    console.log(`Reward claimed: ${balanceAfter - balanceBefore}`);

    return committedTxn.hash;
}

// View functions

// Get market statistics
export async function getMarketStats(adminAddress: string, matchId: number) {
    console.log("\n=== Getting Market Stats ===\n");
    console.log(`Match ID: ${matchId}`);

    const viewPayload = {
        function: `${PREDICTION_MARKET_MODULE}::get_market_stats`,
        functionArguments: [adminAddress, matchId],
    };

    try {
        const result = await aptos.view({ payload: viewPayload });
        const [status, winningOutcome, poolSize, player1Shares, player2Shares, drawShares] = result as [number, number, number, number, number, number];
        
        console.log("Market Stats:", {
            status: status === 1 ? "ACTIVE" : "RESOLVED",
            winningOutcome: winningOutcome === 0 ? "Not resolved" : 
                           winningOutcome === OUTCOME_PLAYER1 ? "Player 1" :
                           winningOutcome === OUTCOME_PLAYER2 ? "Player 2" : "Draw",
            poolSize,
            player1Shares,
            player2Shares,
            drawShares,
        });
        
        return { status, winningOutcome, poolSize, player1Shares, player2Shares, drawShares };
    } catch (error) {
        console.error("Error getting market stats:", error);
        throw error;
    }
}

// Get user shares in a specific outcome
// Note: Since view functions with 'acquires' aren't recognized by SDK,
// we'll use get_market_stats which works, or return 0 if we can't determine
export async function getUserShares(
    adminAddress: string,
    matchId: number,
    outcome: number,
    userAddress: string,
    silent: boolean = false
) {
    if (!silent) {
        console.log("\n=== Getting User Shares ===\n");
        console.log(`User: ${userAddress}`);
        console.log(`Match ID: ${matchId}`);
        console.log(`Outcome: ${outcome === OUTCOME_PLAYER1 ? 'Player 1' : outcome === OUTCOME_PLAYER2 ? 'Player 2' : 'Draw'}`);
    }

    // Try using view function first
    try {
        const viewPayload = {
            function: `${PREDICTION_MARKET_MODULE}::get_user_shares`,
            functionArguments: [adminAddress, matchId, outcome, userAddress],
        };
        const result = await aptos.view({ payload: viewPayload });
        const shares = result as number;
        if (!silent) {
            console.log(`User shares: ${shares}`);
        }
        return shares;
    } catch (error: any) {
        // If view function doesn't work, try reading resources directly
        if (error.message?.includes("not an view function") || error.message?.includes("not a view function")) {
            if (!silent) {
                console.log("Note: View function not available, reading from resources...");
            }
            // For now, return 0 as we can't easily read nested table structures
            // The user shares are stored in a complex nested table structure
            // that's difficult to read directly without view functions
            console.warn("⚠️  Cannot read user shares directly - view functions with 'acquires' are not supported by SDK");
            console.warn("   Consider using get_market_stats to see overall market data");
            return 0;
        }
        if (!silent) {
            console.error("Error getting user shares:", error);
        }
        throw error;
    }
}

// Get all user shares across all outcomes
// Note: View functions with 'acquires' are not supported by the SDK
// This function will attempt to call get_user_shares but may return 0 if view functions don't work
export async function getUserAllShares(
    adminAddress: string,
    matchId: number,
    userAddress: string
) {
    console.log("\n=== Getting All User Shares ===\n");
    console.log(`User: ${userAddress}`);
    console.log(`Match ID: ${matchId}`);

    try {
        // Try to call get_user_shares for each outcome individually
        // Note: These may return 0 if view functions with 'acquires' aren't supported
        const player1Shares = await getUserShares(adminAddress, matchId, OUTCOME_PLAYER1, userAddress, true);
        const player2Shares = await getUserShares(adminAddress, matchId, OUTCOME_PLAYER2, userAddress, true);
        const drawShares = await getUserShares(adminAddress, matchId, OUTCOME_DRAW, userAddress, true);
        
        console.log("User Shares Summary:", {
            player1Shares,
            player2Shares,
            drawShares,
            note: player1Shares === 0 && player2Shares === 0 && drawShares === 0 
                ? "⚠️  View functions may not be available - shares may be 0 even if user has bets"
                : undefined
        });
        
        return { player1Shares, player2Shares, drawShares };
    } catch (error) {
        console.error("Error getting all user shares:", error);
        console.warn("⚠️  View functions with 'acquires' are not supported by the Aptos SDK");
        console.warn("   User shares are stored in nested tables that require view functions to read");
        throw error;
    }
}

// Get potential reward
export async function getPotentialReward(
    adminAddress: string,
    matchId: number,
    outcome: number,
    userAddress: string
) {
    console.log("\n=== Getting Potential Reward ===\n");
    console.log(`User: ${userAddress}`);
    console.log(`Match ID: ${matchId}`);
    console.log(`Outcome: ${outcome === OUTCOME_PLAYER1 ? 'Player 1' : outcome === OUTCOME_PLAYER2 ? 'Player 2' : 'Draw'}`);

    const viewPayload = {
        function: `${PREDICTION_MARKET_MODULE}::get_potential_reward`,
        functionArguments: [adminAddress, matchId, outcome, userAddress],
    };

    try {
        const result = await aptos.view({ payload: viewPayload });
        const reward = result as number;
        console.log(`Potential reward: ${reward}`);
        return reward;
    } catch (error) {
        console.error("Error getting potential reward:", error);
        throw error;
    }
}

// Check if user has claimed
export async function hasClaimed(
    adminAddress: string,
    matchId: number,
    userAddress: string
) {
    console.log("\n=== Checking Claim Status ===\n");
    console.log(`User: ${userAddress}`);
    console.log(`Match ID: ${matchId}`);

    const viewPayload = {
        function: `${PREDICTION_MARKET_MODULE}::has_claimed`,
        functionArguments: [adminAddress, matchId, userAddress],
    };

    try {
        const result = await aptos.view({ payload: viewPayload });
        const claimed = result as boolean;
        console.log(`Has claimed: ${claimed}`);
        return claimed;
    } catch (error) {
        console.error("Error checking claim status:", error);
        throw error;
    }
}

// Check if market exists
export async function marketExists(adminAddress: string, matchId: number) {
    console.log("\n=== Checking Market Existence ===\n");
    console.log(`Match ID: ${matchId}`);

    const viewPayload = {
        function: `${PREDICTION_MARKET_MODULE}::market_exists`,
        functionArguments: [adminAddress, matchId],
    };

    try {
        const result = await aptos.view({ payload: viewPayload });
        const exists = result as boolean;
        console.log(`Market exists: ${exists}`);
        return exists;
    } catch (error) {
        console.error("Error checking market existence:", error);
        throw error;
    }
}

// Example usage
async function main() {
    // Replace with your private key
    const PRIVATE_KEY = process.env.PRIVATE_KEY || "YOUR_PRIVATE_KEY_HERE";
    
    if (PRIVATE_KEY === "YOUR_PRIVATE_KEY_HERE") {
        console.error("Please set PRIVATE_KEY environment variable");
        process.exit(1);
    }

    const account = createAccountFromPrivateKey(PRIVATE_KEY);
    console.log(`Account address: ${account.accountAddress}`);

    // Example: Initialize prediction market (only needed once)
    // await initializePredictionMarket(account);

    // Example: Create market
    // await createMarket(
    //     account,
    //     1, // match_id
    //     "0x123...", // player1 address
    //     "0x456..." // player2 address
    // );

    // Example: Place bet
    // await bet(
    //     account,
    //     MODULE_ADDRESS, // admin address
    //     1, // match_id
    //     OUTCOME_PLAYER1, // outcome
    //     100000000 // amount in octas (0.1 APT)
    // );

    // Example: Get market stats
    // await getMarketStats(MODULE_ADDRESS, 1);

    // Example: Get user shares
    // await getUserShares(MODULE_ADDRESS, 1, OUTCOME_PLAYER1, account.accountAddress);

    // Example: Resolve market
    // await resolveMarket(
    //     account,
    //     1, // match_id
    //     OUTCOME_PLAYER1 // winning outcome
    // );

    // Example: Claim rewards
    // await claimRewards(
    //     account,
    //     MODULE_ADDRESS, // admin address
    //     1 // match_id
    // );
}

// Uncomment to run as standalone script
// main().catch(console.error);

