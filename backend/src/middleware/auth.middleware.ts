// middleware/auth.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import { privyService } from '../services/privy.service';

// Extend Express Request type to include privyUserId
declare global {
  namespace Express {
    interface Request {
      privyUserId?: string;
    }
  }
}

/**
 * Middleware to verify Privy access token and extract user ID
 * Expects Authorization header with format: "Bearer <access_token>"
 */
export async function verifyPrivyToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const userIdHeader = req.headers['x-privy-user-id']; // Alternative: user ID from frontend

    console.log('🔍 Auth middleware - Authorization header:', authHeader ? `${authHeader.substring(0, 30)}...` : 'missing');
    console.log('🔍 Auth middleware - X-Privy-User-ID header:', userIdHeader || 'missing');

    // Try token verification first
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const accessToken = authHeader.substring(7); // Remove "Bearer " prefix
      console.log('🔑 Verifying access token (length:', accessToken.length, ')');

      try {
        // Verify token and get user ID
        const privyUserId = await privyService.verifyAccessToken(accessToken);
        console.log('✅ Token verified, Privy User ID:', privyUserId);

        // Attach user ID to request object
        req.privyUserId = privyUserId;
        next();
        return;
      } catch (tokenError: any) {
        console.error('⚠️ Token verification failed:', tokenError.message);
        console.error('⚠️ Error stack:', tokenError.stack);
        console.log('⚠️ Falling through to user ID fallback...');
        // Fall through to user ID fallback
      }
    }

    // Fallback: Use user ID directly from header (for debugging - less secure)
    if (userIdHeader && typeof userIdHeader === 'string') {
      console.log('⚠️ Using user ID from header (fallback mode):', userIdHeader);
      req.privyUserId = userIdHeader;
      next();
      return;
    }

    // No valid auth method found
    console.error('❌ No valid authentication method found');
    res.status(401).json({ error: 'Missing or invalid Authorization header or user ID' });
  } catch (error: any) {
    console.error('❌ Authentication middleware error:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

