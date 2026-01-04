import {
    AccountAddress,
    AccountAuthenticatorEd25519,
    Ed25519PublicKey,
    Ed25519Signature,
    generateSigningMessageForTransaction,
} from '@aptos-labs/ts-sdk';
import { toHex } from 'viem';
import { createMovementClient, type MovementWalletInfo, type MovementTransactionResult, submitMovementTransaction } from './movementService';
import type { Outcome } from '../types/game';

// Contract constants
const MODULE_ADDRESS = '0xed101e6c098f47d3a9ff8cf2dae4331fc2a55848502942246878b2ab63b90b4d';
const PREDICTION_MARKET_MODULE = `${MODULE_ADDRESS}::prediction_market`;

// Outcome mapping: "white" -> 1 (OUTCOME_PLAYER1), "black" -> 2 (OUTCOME_PLAYER2), "draw" -> 3 (OUTCOME_DRAW)
export const OUTCOME_PLAYER1 = 1;
export const OUTCOME_PLAYER2 = 2;
export const OUTCOME_DRAW = 3;

/**
 * Converts a market outcome string to contract outcome number
 */
export function outcomeToContractNumber(outcome: Outcome): number {
    switch (outcome) {
        case 'white':
            return OUTCOME_PLAYER1;
        case 'black':
            return OUTCOME_PLAYER2;
        case 'draw':
            return OUTCOME_DRAW;
        default:
            throw new Error(`Invalid outcome: ${outcome}`);
    }
}

/**
 * Converts a match ID string to a number for the contract
 * Uses a simple hash function to convert string to number
 */
export function matchIdToNumber(matchId: string): number {
    // Simple hash function to convert string to number
    let hash = 0;
    for (let i = 0; i < matchId.length; i++) {
        const char = matchId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    // Ensure positive number and limit to reasonable range
    return Math.abs(hash) % Number.MAX_SAFE_INTEGER;
}

/**
 * Signs a transaction hash using Privy's backend API
 */
async function signTransactionHashViaBackend(
    walletId: string,
    hash: string,
    accessToken?: string | null
): Promise<string> {
    const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
    
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    
    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${API_BASE}/api/wallet/sign`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            walletId,
            hash: toHex(hash),
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to sign transaction: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.signature;
}

/**
 * Places a bet on the blockchain
 */
export async function placeBetOnChain(
    walletInfo: MovementWalletInfo,
    matchId: string,
    outcome: Outcome,
    amount: number,
    accessToken?: string | null
): Promise<MovementTransactionResult> {
    const client = createMovementClient('testnet');
    const adminAddress = MODULE_ADDRESS;
    const contractMatchId = matchIdToNumber(matchId);
    const contractOutcome = outcomeToContractNumber(outcome);
    
    // Convert amount to octas (1 APT = 10^8 octas)
    // Note: Assuming amount is in APT. If amount is in USD, you need to convert USD to APT first
    // For now, we assume 1 USD = 1 APT (this should be updated with actual exchange rate)
    const amountInOctas = Math.floor(amount * 100_000_000);
    
    if (amountInOctas <= 0) {
        throw new Error('Bet amount must be greater than 0');
    }

    console.log('📊 Placing bet on chain:', {
        matchId,
        contractMatchId,
        outcome,
        contractOutcome,
        amount,
        amountInOctas,
        adminAddress,
        userAddress: walletInfo.address,
    });

    // Build the transaction
    const address = AccountAddress.from(walletInfo.address);
    const rawTxn = await client.transaction.build.simple({
        sender: address,
        data: {
            function: `${PREDICTION_MARKET_MODULE}::bet`,
            functionArguments: [adminAddress, contractMatchId, contractOutcome, amountInOctas],
        },
    });

    // Generate signing message
    const message = generateSigningMessageForTransaction(rawTxn);
    
    // Sign the transaction using backend API
    const signatureHex = await signTransactionHashViaBackend(
        walletInfo.walletId,
        message,
        accessToken
    );

    // Create authenticator
    const publicKey = new Ed25519PublicKey(walletInfo.publicKey);
    const signature = signatureHex.startsWith('0x') 
        ? signatureHex.slice(2) 
        : signatureHex;
    const senderAuthenticator = new AccountAuthenticatorEd25519(
        publicKey,
        new Ed25519Signature(signature)
    );

    // Submit the transaction
    return await submitMovementTransaction(client, rawTxn, senderAuthenticator);
}

