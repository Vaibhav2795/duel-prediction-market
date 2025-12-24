import {
    Aptos,
    AptosConfig,
    Network,
    AccountAddress,
    AccountAuthenticatorEd25519,
    Ed25519PublicKey,
    Ed25519Signature,
    generateSigningMessageForTransaction,
} from '@aptos-labs/ts-sdk';
import { toHex } from 'viem';

const MOVEMENT_TESTNET_FULLNODE = 'https://full.testnet.movementinfra.xyz/v1';
const MOVEMENT_MAINNET_FULLNODE = 'https://full.mainnet.movementinfra.xyz/v1';

export type MovementNetwork = 'testnet' | 'mainnet';

export interface MovementWalletInfo {
    walletId: string;
    address: string;
    publicKey: string;
}

export interface MovementTransactionResult {
    hash: string;
    success: boolean;
}

export function createMovementClient(network: MovementNetwork = 'testnet'): Aptos {
    const fullnodeUrl = network === 'testnet' ? MOVEMENT_TESTNET_FULLNODE : MOVEMENT_MAINNET_FULLNODE;
    return new Aptos(
        new AptosConfig({
            network: Network.TESTNET,
            fullnode: fullnodeUrl,
        })
    );
}

export function getMovementWalletInfo(user: any): MovementWalletInfo | null {
    if (!user?.wallet) return null;

    const wallet = user.wallet;
    const address = wallet.address;
    const walletId = wallet.walletId || wallet.id;
    const publicKey = wallet.publicKey || wallet.pubKey || '';
    
    if (!address || !walletId) return null;

    return { walletId, address, publicKey };
}

export async function signTransactionHash(
    walletId: string,
    hash: string,
    signFunction: (walletId: string, hash: string) => Promise<string>
): Promise<string> {
    try {
        return await signFunction(walletId, toHex(hash));
    } catch (error) {
        console.error('Error signing transaction hash:', error);
        throw error;
    }
}

export async function buildAndSignMovementTransaction(
    client: Aptos,
    walletInfo: MovementWalletInfo,
    recipientAddress: string,
    amount: number,
    signHash: (hash: string) => Promise<string>
): Promise<AccountAuthenticatorEd25519> {
    const address = AccountAddress.from(walletInfo.address);
    const publicKey = new Ed25519PublicKey(walletInfo.publicKey);

    const rawTxn = await client.transaction.build.simple({
        sender: address,
        data: {
            function: '0x1::coin::transfer',
            typeArguments: ['0x1::aptos_coin::AptosCoin'],
            functionArguments: [recipientAddress, amount],
        },
    });

    const message = generateSigningMessageForTransaction(rawTxn);
    const signature = await signHash(toHex(message));
    
    return new AccountAuthenticatorEd25519(
        publicKey,
        new Ed25519Signature(signature.slice(2))
    );
}

export async function submitMovementTransaction(
    client: Aptos,
    rawTxn: any,
    authenticator: AccountAuthenticatorEd25519
): Promise<MovementTransactionResult> {
    try {
        const pending = await client.transaction.submit.simple({
            transaction: rawTxn,
            senderAuthenticator: authenticator,
        });

        const executed = await client.waitForTransaction({
            transactionHash: pending.hash,
        });

        return { hash: executed.hash, success: true };
    } catch (error) {
        console.error('Error submitting Movement transaction:', error);
        throw error;
    }
}

export async function sendMovementTransaction(
    network: MovementNetwork,
    walletInfo: MovementWalletInfo,
    recipientAddress: string,
    amount: number,
    signHash: (hash: string) => Promise<string>
): Promise<MovementTransactionResult> {
    const client = createMovementClient(network);
    const address = AccountAddress.from(walletInfo.address);

    const rawTxn = await client.transaction.build.simple({
        sender: address,
        data: {
            function: '0x1::coin::transfer',
            typeArguments: ['0x1::aptos_coin::AptosCoin'],
            functionArguments: [recipientAddress, amount],
        },
    });

    const message = generateSigningMessageForTransaction(rawTxn);
    const signature = await signHash(toHex(message));
    const publicKey = new Ed25519PublicKey(walletInfo.publicKey);
    const senderAuthenticator = new AccountAuthenticatorEd25519(
        publicKey,
        new Ed25519Signature(signature.slice(2))
    );

    return await submitMovementTransaction(client, rawTxn, senderAuthenticator);
}
