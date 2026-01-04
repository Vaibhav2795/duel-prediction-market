// controllers/wallet.controller.ts
import type { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { privyService } from '../services/privy.service';

/**
 * Ensures a Movement wallet exists for the authenticated user
 * Creates one if it doesn't exist, returns existing one if it does
 * POST /api/wallet/ensure
 */
export async function ensureMovementWallet(req: Request, res: Response): Promise<void> {
  try {
    console.log('🔐 Wallet ensure endpoint called');
    const privyUserId = req.privyUserId;

    if (!privyUserId) {
      console.error('❌ No privyUserId found in request');
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    console.log('👤 Privy User ID:', privyUserId);
    console.log('📝 Getting or creating Movement wallet...');

    // Get or create Movement wallet
    const walletInfo = await userService.getOrCreateMovementWallet(privyUserId);

    console.log('✅ Movement wallet ready:', {
      walletId: walletInfo.walletId,
      address: walletInfo.address,
      hasPublicKey: !!walletInfo.publicKey,
    });

    res.json({
      success: true,
      wallet: {
        walletId: walletInfo.walletId,
        address: walletInfo.address,
        publicKey: walletInfo.publicKey,
      },
    });
  } catch (error: any) {
    console.error('❌ Error ensuring Movement wallet:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to ensure Movement wallet',
      message: error.message,
    });
  }
}

/**
 * Lists all wallets for the authenticated user (for debugging)
 * GET /api/wallet/list
 */
export async function listUserWallets(req: Request, res: Response): Promise<void> {
  try {
    const privyUserId = req.privyUserId;

    if (!privyUserId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    console.log('📋 Listing all wallets for user:', privyUserId);
    const wallets = await privyService.getUserWallets(privyUserId);

    res.json({
      success: true,
      userId: privyUserId,
      wallets: wallets,
      count: wallets.length,
    });
  } catch (error: any) {
    console.error('❌ Error listing wallets:', error);
    res.status(500).json({
      error: 'Failed to list wallets',
      message: error.message,
    });
  }
}

