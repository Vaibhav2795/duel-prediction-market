// routes/wallet.routes.ts
import { Router } from 'express';
import { ensureMovementWallet, listUserWallets } from '@/controllers/wallet.controller';
import { verifyPrivyToken } from '@/middleware/auth.middleware';

const router = Router();

// All wallet routes require authentication
router.use(verifyPrivyToken);

// POST /api/wallet/ensure - Ensure Movement wallet exists for authenticated user
router.post('/ensure', ensureMovementWallet);

// GET /api/wallet/list - List all wallets for authenticated user (for debugging)
router.get('/list', listUserWallets);

export default router;

