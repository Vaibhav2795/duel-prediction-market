import { useEffect, useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { getMovementWalletInfo, type MovementWalletInfo } from '../services/movementService';

export function useMovementWallet() {
    const { ready, authenticated, user } = usePrivy();
    const [movementWallet, setMovementWallet] = useState<MovementWalletInfo | null>(null);
    const [isMovementWallet, setIsMovementWallet] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!ready || !authenticated || !user) {
            setMovementWallet(null);
            setIsMovementWallet(false);
            setLoading(false);
            return;
        }

        const wallet = user.wallet;
        if (wallet) {
            const walletInfo = getMovementWalletInfo(user);
            if (walletInfo) {
                setMovementWallet(walletInfo);
                setIsMovementWallet(true);
            } else {
                setIsMovementWallet(false);
            }
        } else {
            setIsMovementWallet(false);
        }
        
        setLoading(false);
    }, [ready, authenticated, user]);

    const getAddress = useCallback((): string | null => {
        return movementWallet?.address || null;
    }, [movementWallet]);

    const checkIsMovementWallet = useCallback((): boolean => {
        return isMovementWallet;
    }, [isMovementWallet]);

    const getPublicKey = useCallback(async (): Promise<string | null> => {
        if (!movementWallet?.walletId) return null;
        return movementWallet.publicKey || null;
    }, [movementWallet]);

    return {
        movementWallet,
        isMovementWallet,
        loading,
        getAddress,
        checkIsMovementWallet,
        getPublicKey,
    };
}
