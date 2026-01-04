// services/privy.service.ts
import { PrivyClient } from '@privy-io/node';

const PRIVY_APP_ID = process.env.PRIVY_APP_ID;
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;

if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) {
  throw new Error('PRIVY_APP_ID and PRIVY_APP_SECRET must be set in environment variables');
}

const privy = new PrivyClient({
  appId: PRIVY_APP_ID,
  appSecret: PRIVY_APP_SECRET,
});

export interface MovementWalletInfo {
  walletId: string;
  address: string;
  publicKey: string;
}

class PrivyService {
  /**
   * Creates a Movement wallet for a Privy user
   * @param userId - Privy user ID
   * @returns Movement wallet information
   */
  async createMovementWallet(userId: string): Promise<MovementWalletInfo> {
    try {
      console.log('🔨 Creating Movement wallet for user:', userId);
      
      // First check if Movement wallet already exists
      const existingWallet = await this.findMovementWallet(userId);
      if (existingWallet) {
        console.log('ℹ️ Movement wallet already exists, returning existing wallet');
        return existingWallet;
      }

      console.log('🆕 Creating new Movement wallet via Privy API...');
      const wallet = await privy.wallets().create({
        chain_type: 'movement',
        owner: {
          user_id: userId,
        },
      });

      console.log('✅ Movement wallet created in Privy:', {
        id: wallet.id,
        address: wallet.address,
        hasPublicKey: !!wallet.public_key,
        chainType: (wallet as any).chain_type || 'movement',
      });

      // Verify the wallet was actually created by fetching it
      const verifyWallet = await privy.wallets().get(wallet.id);
      console.log('✅ Verified wallet exists in Privy:', verifyWallet.id);

      return {
        walletId: wallet.id,
        address: wallet.address,
        publicKey: wallet.public_key || '',
      };
    } catch (error: any) {
      console.error('❌ Error creating Movement wallet:', error);
      console.error('Error details:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw new Error(`Failed to create Movement wallet: ${error.message}`);
    }
  }

  /**
   * Gets wallet information from Privy
   * @param walletId - Privy wallet ID
   * @returns Wallet information
   */
  async getWalletInfo(walletId: string): Promise<MovementWalletInfo> {
    try {
      const wallet = await privy.wallets().get(walletId);

      return {
        walletId: wallet.id,
        address: wallet.address,
        publicKey: wallet.public_key || '',
      };
    } catch (error: any) {
      console.error('Error getting wallet info:', error);
      throw new Error(`Failed to get wallet info: ${error.message}`);
    }
  }

  /**
   * Signs a transaction hash using Privy's rawSign
   * @param walletId - Privy wallet ID
   * @param hash - Transaction hash to sign (hex string with 0x prefix)
   * @returns Signature string
   */
  async rawSign(walletId: string, hash: string): Promise<string> {
    try {
      const signatureResponse = await privy.wallets().rawSign(walletId, {
        params: {
          hash: hash,
        },
      });

      return signatureResponse as unknown as string;
    } catch (error: any) {
      console.error('Error signing transaction hash:', error);
      throw new Error(`Failed to sign transaction: ${error.message}`);
    }
  }

  /**
   * Gets all wallets for a Privy user
   * @param userId - Privy user ID
   * @returns Array of wallet information
   */
  async getUserWallets(userId: string): Promise<MovementWalletInfo[]> {
    try {
      console.log('📋 Listing wallets for user:', userId);
      
      // wallets().list() returns a PagePromise, so we need to iterate through pages
      const wallets: any[] = [];
      for await (const wallet of privy.wallets().list({ user_id: userId })) {
        wallets.push(wallet);
      }
      
      console.log(`📋 Found ${wallets.length} wallet(s) for user`);
      wallets.forEach((wallet, index) => {
        console.log(`  Wallet ${index + 1}:`, {
          id: wallet.id,
          address: wallet.address,
          chainType: wallet.chain_type || 'unknown',
          hasPublicKey: !!wallet.public_key,
        });
      });

      return wallets.map((wallet) => ({
        walletId: wallet.id,
        address: wallet.address,
        publicKey: wallet.public_key || '',
      }));
    } catch (error: any) {
      console.error('❌ Error listing user wallets:', error);
      console.error('Error details:', error.message, error.response?.data || error);
      throw new Error(`Failed to list user wallets: ${error.message}`);
    }
  }

  /**
   * Finds an existing Movement wallet for a user
   * @param userId - Privy user ID
   * @returns Movement wallet information or null
   */
  async findMovementWallet(userId: string): Promise<MovementWalletInfo | null> {
    try {
      console.log('🔍 Searching for existing Movement wallet for user:', userId);
      const wallets = await this.getUserWallets(userId);
      
      // Look for Movement wallet (we'll check by trying to get wallet details)
      // Since Privy API might not directly filter by chain_type, we'll check all wallets
      for (const wallet of wallets) {
        try {
          const walletDetails = await privy.wallets().get(wallet.walletId);
          // Check if this is a Movement wallet (we can infer from address format or chain_type if available)
          const chainType = (walletDetails as any).chain_type;
          if (chainType === 'movement') {
            console.log('✅ Found existing Movement wallet:', wallet.address);
            return wallet;
          }
        } catch (err) {
          // Skip wallets we can't access
          continue;
        }
      }
      
      console.log('ℹ️ No existing Movement wallet found');
      return null;
    } catch (error: any) {
      console.error('❌ Error finding Movement wallet:', error);
      return null;
    }
  }

  /**
   * Verifies a Privy access token and returns the user ID
   * @param accessToken - Privy access token
   * @returns Privy user ID
   */
  async verifyAccessToken(accessToken: string): Promise<string> {
    try {
      console.log('🔍 Verifying access token (length:', accessToken.length, ')');
      console.log('🔍 Token preview:', accessToken.substring(0, 50) + '...');
      
      // Use utils().auth().verifyAccessToken() method
      const tokenPayload = await privy.utils().auth().verifyAccessToken(accessToken);
      console.log('✅ Token verified successfully, user ID:', tokenPayload.user_id);
      return tokenPayload.user_id;
    } catch (error: any) {
      console.error('❌ Error verifying access token:', error);
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Error status:', error.response.status);
      }
      throw new Error(`Invalid access token: ${error.message}`);
    }
  }
}

export const privyService = new PrivyService();

