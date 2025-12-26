import { useMemo } from "react";
import type { Market, Outcome } from "../types/game";
import { formatCurrency, formatTimeRemaining, formatAddress } from "../styles/designTokens";

interface MarketCardProps {
	market: Market;
	onClick?: () => void;
	onQuickBet?: (outcome: Outcome, side: "yes" | "no") => void;
	compact?: boolean;
}

export function MarketCard({ market, onClick, onQuickBet, compact = false }: MarketCardProps) {
	const whiteOutcome = market.outcomes.find(o => o.outcome === "white");
	const blackOutcome = market.outcomes.find(o => o.outcome === "black");
	const drawOutcome = market.outcomes.find(o => o.outcome === "draw");

	const statusBadge = useMemo(() => {
		switch (market.status) {
			case "active":
				return market.room.status === "active" ? (
					<span className="badge badge-live flex items-center gap-1">
						<span className="w-1.5 h-1.5 bg-status-live rounded-full animate-pulse" />
						Live
					</span>
				) : (
					<span className="badge badge-active">Active</span>
				);
			case "ended":
				return <span className="badge badge-ending">Ending Soon</span>;
			case "resolved":
				return <span className="badge badge-resolved">Resolved</span>;
			default:
				return null;
		}
	}, [market.status, market.room.status]);

	const outcomeLabel = (outcome: Outcome) => {
		switch (outcome) {
			case "white": return "White wins";
			case "black": return "Black wins";
			case "draw": return "Draw";
		}
	};

	if (compact) {
		return (
			<div 
				className="card cursor-pointer group"
				onClick={onClick}
			>
				<div className="flex items-center justify-between mb-3">
					<h3 className="font-semibold text-text-primary truncate pr-2">{market.title}</h3>
					{statusBadge}
				</div>
				
				<div className="flex items-center gap-4">
					<div className="flex-1">
						<div className="flex items-center justify-between text-sm mb-1">
							<span className="text-text-secondary">White</span>
							<span className="text-yes font-medium">{Math.round(whiteOutcome?.probability || 0)}%</span>
						</div>
						<div className="prob-bar">
							<div className="prob-bar-yes" style={{ width: `${whiteOutcome?.probability || 0}%` }} />
						</div>
					</div>
					
					<div className="flex-1">
						<div className="flex items-center justify-between text-sm mb-1">
							<span className="text-text-secondary">Black</span>
							<span className="text-no font-medium">{Math.round(blackOutcome?.probability || 0)}%</span>
						</div>
						<div className="prob-bar">
							<div className="prob-bar-no" style={{ width: `${blackOutcome?.probability || 0}%` }} />
						</div>
					</div>
				</div>
				
				<div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
					<span className="text-sm text-text-tertiary">{formatCurrency(market.totalVolume)} Vol</span>
					{market.endTime && (
						<span className="text-sm text-text-tertiary">{formatTimeRemaining(market.endTime)}</span>
					)}
				</div>
			</div>
		);
	}

	return (
		<div 
			className="card cursor-pointer group"
			onClick={onClick}
		>
			{/* Header */}
			<div className="flex items-start justify-between mb-4">
				<div className="flex-1 pr-4">
					<h3 className="font-semibold text-lg text-text-primary group-hover:text-accent transition-colors mb-1">
						{market.title}
					</h3>
					<p className="text-sm text-text-tertiary line-clamp-2">{market.description}</p>
				</div>
				{statusBadge}
			</div>

			{/* Players */}
			<div className="flex items-center gap-4 mb-4 p-3 bg-dark-300 rounded-lg">
				<div className="flex-1">
					<div className="flex items-center gap-2">
						<div className="w-3 h-3 rounded-full bg-white border-2 border-border" />
						<span className="text-sm font-medium text-text-primary">
							{market.playerWhite?.displayName || formatAddress(market.playerWhite?.address || "")}
						</span>
					</div>
				</div>
				<span className="text-text-muted text-sm">vs</span>
				<div className="flex-1">
					<div className="flex items-center gap-2 justify-end">
						<span className="text-sm font-medium text-text-primary">
							{market.playerBlack?.displayName || formatAddress(market.playerBlack?.address || "")}
						</span>
						<div className="w-3 h-3 rounded-full bg-dark-500 border-2 border-border" />
					</div>
				</div>
			</div>

			{/* Outcomes */}
			<div className="space-y-3 mb-4">
				{/* White wins */}
				<div className="flex items-center gap-3">
					<div className="flex-1">
						<div className="flex items-center justify-between text-sm mb-1.5">
							<span className="text-text-secondary">{outcomeLabel("white")}</span>
							<span className="text-yes font-semibold">{Math.round(whiteOutcome?.probability || 0)}%</span>
						</div>
						<div className="prob-bar h-2.5">
							<div className="prob-bar-yes" style={{ width: `${whiteOutcome?.probability || 0}%` }} />
						</div>
					</div>
					{onQuickBet && market.status === "active" && (
						<button
							onClick={(e) => { e.stopPropagation(); onQuickBet("white", "yes"); }}
							className="btn btn-yes text-xs px-3 py-1.5"
						>
							Bet
						</button>
					)}
				</div>

				{/* Black wins */}
				<div className="flex items-center gap-3">
					<div className="flex-1">
						<div className="flex items-center justify-between text-sm mb-1.5">
							<span className="text-text-secondary">{outcomeLabel("black")}</span>
							<span className="text-no font-semibold">{Math.round(blackOutcome?.probability || 0)}%</span>
						</div>
						<div className="prob-bar h-2.5">
							<div className="prob-bar-no" style={{ width: `${blackOutcome?.probability || 0}%` }} />
						</div>
					</div>
					{onQuickBet && market.status === "active" && (
						<button
							onClick={(e) => { e.stopPropagation(); onQuickBet("black", "yes"); }}
							className="btn btn-no text-xs px-3 py-1.5"
						>
							Bet
						</button>
					)}
				</div>

				{/* Draw */}
				{drawOutcome && drawOutcome.probability > 0 && (
					<div className="flex items-center gap-3">
						<div className="flex-1">
							<div className="flex items-center justify-between text-sm mb-1.5">
								<span className="text-text-secondary">{outcomeLabel("draw")}</span>
								<span className="text-blue-400 font-semibold">{Math.round(drawOutcome.probability)}%</span>
							</div>
							<div className="prob-bar h-2.5">
								<div className="h-full bg-blue-400 rounded-full transition-all duration-500" style={{ width: `${drawOutcome.probability}%` }} />
							</div>
						</div>
						{onQuickBet && market.status === "active" && (
							<button
								onClick={(e) => { e.stopPropagation(); onQuickBet("draw", "yes"); }}
								className="btn btn-secondary text-xs px-3 py-1.5"
							>
								Bet
							</button>
						)}
					</div>
				)}
			</div>

			{/* Footer */}
			<div className="flex items-center justify-between pt-4 border-t border-border">
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-1.5">
						<svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span className="text-sm text-text-secondary font-medium">{formatCurrency(market.totalVolume)}</span>
					</div>
					<div className="flex items-center gap-1.5">
						<svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
						</svg>
						<span className="text-sm text-text-secondary">${market.room.entryFee} entry</span>
					</div>
				</div>
				
				{market.endTime && market.status === "active" && (
					<div className="flex items-center gap-1.5 text-text-tertiary">
						<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span className="text-sm">{formatTimeRemaining(market.endTime)}</span>
					</div>
				)}

				{market.status === "resolved" && market.resolvedOutcome && (
					<div className="flex items-center gap-1.5">
						<span className="text-sm text-text-secondary">Winner:</span>
						<span className={`text-sm font-semibold ${
							market.resolvedOutcome === "white" ? "text-yes" : 
							market.resolvedOutcome === "black" ? "text-no" : "text-blue-400"
						}`}>
							{market.resolvedOutcome === "white" ? "White" : 
							 market.resolvedOutcome === "black" ? "Black" : "Draw"}
						</span>
					</div>
				)}
			</div>
		</div>
	);
}

// Skeleton loader for market cards
export function MarketCardSkeleton() {
	return (
		<div className="card">
			<div className="flex items-start justify-between mb-4">
				<div className="flex-1">
					<div className="skeleton h-6 w-3/4 mb-2" />
					<div className="skeleton h-4 w-full" />
				</div>
				<div className="skeleton h-6 w-16 rounded-full" />
			</div>
			
			<div className="skeleton h-12 w-full rounded-lg mb-4" />
			
			<div className="space-y-3 mb-4">
				<div className="skeleton h-8 w-full rounded" />
				<div className="skeleton h-8 w-full rounded" />
			</div>
			
			<div className="flex items-center justify-between pt-4 border-t border-border">
				<div className="skeleton h-4 w-24" />
				<div className="skeleton h-4 w-16" />
			</div>
		</div>
	);
}

