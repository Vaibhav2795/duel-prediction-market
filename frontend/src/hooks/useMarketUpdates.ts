import { useEffect, useCallback, useRef } from 'react';
import { socketService } from '../services/socketService';
import type { Market } from '../types/game';

interface UseMarketUpdatesOptions {
	marketIds?: string[];
	onUpdate?: (market: Market) => void;
	enabled?: boolean;
}

export function useMarketUpdates({ marketIds = [], onUpdate, enabled = true }: UseMarketUpdatesOptions) {
	const subscribedIds = useRef<Set<string>>(new Set());

	// Subscribe to market updates
	useEffect(() => {
		if (!enabled) return;

		// Subscribe to new markets
		marketIds.forEach(id => {
			if (!subscribedIds.current.has(id)) {
				socketService.subscribeToMarket(id);
				subscribedIds.current.add(id);
			}
		});

		// Unsubscribe from removed markets
		subscribedIds.current.forEach(id => {
			if (!marketIds.includes(id)) {
				socketService.unsubscribeFromMarket(id);
				subscribedIds.current.delete(id);
			}
		});

		return () => {
			// Cleanup all subscriptions
			subscribedIds.current.forEach(id => {
				socketService.unsubscribeFromMarket(id);
			});
			subscribedIds.current.clear();
		};
	}, [marketIds, enabled]);

	// Listen for market updates
	useEffect(() => {
		if (!enabled || !onUpdate) return;

		const handleMarketUpdate = (market: Market) => {
			if (subscribedIds.current.has(market.id)) {
				onUpdate(market);
			}
		};

		socketService.onMarketUpdated(handleMarketUpdate);

		return () => {
			socketService.off('market_updated', handleMarketUpdate);
		};
	}, [onUpdate, enabled]);

	// Manual subscribe/unsubscribe
	const subscribe = useCallback((marketId: string) => {
		if (!subscribedIds.current.has(marketId)) {
			socketService.subscribeToMarket(marketId);
			subscribedIds.current.add(marketId);
		}
	}, []);

	const unsubscribe = useCallback((marketId: string) => {
		if (subscribedIds.current.has(marketId)) {
			socketService.unsubscribeFromMarket(marketId);
			subscribedIds.current.delete(marketId);
		}
	}, []);

	return { subscribe, unsubscribe };
}

// Hook for subscribing to a single market
export function useSingleMarketUpdates(
	marketId: string | undefined,
	onUpdate: (market: Market) => void,
	enabled = true
) {
	useEffect(() => {
		if (!enabled || !marketId) return;

		socketService.subscribeToMarket(marketId);
		socketService.onMarketUpdated(onUpdate);

		return () => {
			socketService.unsubscribeFromMarket(marketId);
			socketService.off('market_updated', onUpdate);
		};
	}, [marketId, onUpdate, enabled]);
}

