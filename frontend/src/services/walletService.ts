// services/walletService.ts

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export interface MovementWalletResponse {
    success: boolean;
    wallet: {
        walletId: string;
        address: string;
        publicKey: string;
    };
}

/**
 * Ensures a Movement wallet exists for the authenticated user
 * @param accessToken - Privy access token (optional, will use user ID if not provided)
 * @param userId - Privy user ID (optional fallback)
 * @returns Movement wallet information
 */
export async function ensureMovementWallet(accessToken?: string | null, userId?: string): Promise<MovementWalletResponse> {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    // Always send access token if available
    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
        console.log('📤 Sending Authorization header with token');
    }
    
    // Always send user ID as fallback (backend will use it if token verification fails)
    if (userId) {
        headers['X-Privy-User-ID'] = userId;
        console.log('📤 Sending X-Privy-User-ID header:', userId);
    }

    const response = await fetch(`${API_BASE}/api/wallet/ensure`, {
        method: 'POST',
        headers,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to ensure Movement wallet: ${response.status} ${errorText}`);
    }

    return response.json();
}

