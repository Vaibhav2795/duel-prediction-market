import { useState, useMemo } from "react";
import type { Position, Bet, Market, UserPortfolio, Outcome } from "../types/game";
import { PageContainer } from "../components/Layout";
import { formatCurrency, formatAddress, formatTimeRemaining } from "../styles/designTokens";

interface PortfolioPageProps {
	portfolio: UserPortfolio | null;
	markets: Market[];
	isLoading?: boolean;
	isConnected?: boolean;
	onConnect?: () => void;
	onMarketClick: (marketId: string) => void;
}

export function PortfolioPage({
	portfolio,
	markets,
	isLoading = false,
	isConnected = true,
	onConnect,
	onMarketClick
}: PortfolioPageProps) {
	const [activeTab, setActiveTab] = useState<"positions" | "history" | "resolved">("positions");
	const [filter, setFilter] = useState<"all" | "profit" | "loss">("all");

	const activePositions = useMemo(() => {
		if (!portfolio) return [];
		return portfolio.positions.filter(p => !p.isResolved);
	}, [portfolio]);

	const resolvedPositions = useMemo(() => {
		if (!portfolio) return [];
		return portfolio.positions.filter(p => p.isResolved);
	}, [portfolio]);

	const filteredPositions = useMemo(() => {
		const positions = activeTab === "resolved" ? resolvedPositions : activePositions;
		if (filter === "all") return positions;
		if (filter === "profit") return positions.filter(p => p.pnl >= 0);
		return positions.filter(p => p.pnl < 0);
	}, [activePositions, resolvedPositions, activeTab, filter]);

	const getMarket = (marketId: string) => markets.find(m => m.id === marketId);

	const outcomeLabel = (outcome: Outcome) => {
		switch (outcome) {
			case "white": return "White wins";
			case "black": return "Black wins";
			case "draw": return "Draw";
		}
	};

	if (!isConnected) {
		return (
			<PageContainer>
				<div className="text-center py-20">
					<div className="w-20 h-20 mx-auto mb-6 rounded-full bg-dark-200 flex items-center justify-center">
						<svg className="w-10 h-10 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
						</svg>
					</div>
					<h2 className="text-2xl font-bold text-text-primary mb-3">Connect Your Wallet</h2>
					<p className="text-text-secondary mb-6 max-w-md mx-auto">
						Connect your wallet to view your portfolio, positions, and betting history.
					</p>
					<button onClick={onConnect} className="btn btn-primary px-8 py-3 text-lg">
						Connect Wallet
					</button>
				</div>
			</PageContainer>
		);
	}

	if (isLoading) {
		return (
			<PageContainer>
				<div className="animate-pulse space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<div key={i} className="h-24 bg-dark-200 rounded-xl" />
						))}
					</div>
					<div className="h-12 w-64 bg-dark-200 rounded-lg" />
					<div className="space-y-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="h-24 bg-dark-200 rounded-xl" />
						))}
					</div>
				</div>
			</PageContainer>
		);
	}

	if (!portfolio) {
		return (
			<PageContainer>
				<div className="text-center py-20">
					<div className="w-20 h-20 mx-auto mb-6 rounded-full bg-dark-200 flex items-center justify-center">
						<svg className="w-10 h-10 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<h2 className="text-2xl font-bold text-text-primary mb-3">Portfolio Unavailable</h2>
					<p className="text-text-secondary">Unable to load your portfolio. Please try again.</p>
				</div>
			</PageContainer>
		);
	}

	return (
		<PageContainer>
			{/* Header */}
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-text-primary mb-2">Portfolio</h1>
				<p className="text-text-secondary">
					Track your positions and betting performance
				</p>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
				<div className="bg-dark-200 rounded-xl border border-border p-5">
					<div className="flex items-center gap-3 mb-2">
						<div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
							<svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<div className="text-sm text-text-tertiary">Portfolio Value</div>
					</div>
					<div className="text-2xl font-bold text-text-primary">{formatCurrency(portfolio.totalValue)}</div>
				</div>

				<div className="bg-dark-200 rounded-xl border border-border p-5">
					<div className="flex items-center gap-3 mb-2">
						<div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
							portfolio.totalPnl >= 0 ? "bg-yes/10" : "bg-no/10"
						}`}>
							<svg className={`w-5 h-5 ${portfolio.totalPnl >= 0 ? "text-yes" : "text-no"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
								{portfolio.totalPnl >= 0 ? (
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
								) : (
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
								)}
							</svg>
						</div>
						<div className="text-sm text-text-tertiary">Total P&L</div>
					</div>
					<div className={`text-2xl font-bold ${portfolio.totalPnl >= 0 ? "text-yes" : "text-no"}`}>
						{portfolio.totalPnl >= 0 ? "+" : ""}{formatCurrency(portfolio.totalPnl)}
					</div>
				</div>

				<div className="bg-dark-200 rounded-xl border border-border p-5">
					<div className="flex items-center gap-3 mb-2">
						<div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
							<svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
							</svg>
						</div>
						<div className="text-sm text-text-tertiary">Active Positions</div>
					</div>
					<div className="text-2xl font-bold text-text-primary">{activePositions.length}</div>
				</div>

				<div className="bg-dark-200 rounded-xl border border-border p-5">
					<div className="flex items-center gap-3 mb-2">
						<div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
							<svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
							</svg>
						</div>
						<div className="text-sm text-text-tertiary">Total Bets</div>
					</div>
					<div className="text-2xl font-bold text-text-primary">{portfolio.recentBets.length}</div>
				</div>
			</div>

			{/* Tabs */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
				<div className="flex gap-1 bg-dark-200 p-1 rounded-lg">
					{(["positions", "history", "resolved"] as const).map((tab) => (
						<button
							key={tab}
							onClick={() => setActiveTab(tab)}
							className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
								activeTab === tab
									? "bg-dark-300 text-text-primary"
									: "text-text-secondary hover:text-text-primary"
							}`}
						>
							{tab === "positions" && `Active (${activePositions.length})`}
							{tab === "history" && `Bet History (${portfolio.recentBets.length})`}
							{tab === "resolved" && `Resolved (${resolvedPositions.length})`}
						</button>
					))}
				</div>

				{activeTab !== "history" && (
					<div className="flex gap-2">
						{(["all", "profit", "loss"] as const).map((f) => (
							<button
								key={f}
								onClick={() => setFilter(f)}
								className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
									filter === f
										? f === "profit" ? "bg-yes-bg text-yes" :
											f === "loss" ? "bg-no-bg text-no" : "bg-dark-200 text-text-primary"
										: "text-text-tertiary hover:text-text-secondary"
								}`}
							>
								{f === "all" && "All"}
								{f === "profit" && "Profit"}
								{f === "loss" && "Loss"}
							</button>
						))}
					</div>
				)}
			</div>

			{/* Content */}
			{activeTab === "history" ? (
				<div className="space-y-3">
					{portfolio.recentBets.length === 0 ? (
						<div className="text-center py-16 bg-dark-200 rounded-xl border border-border">
							<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-300 flex items-center justify-center">
								<svg className="w-8 h-8 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
								</svg>
							</div>
							<h3 className="text-lg font-semibold text-text-primary mb-2">No betting history</h3>
							<p className="text-text-tertiary">Your bets will appear here</p>
						</div>
					) : (
						portfolio.recentBets.map((bet) => {
							const market = getMarket(bet.marketId);
							return (
								<div
									key={bet.id}
									onClick={() => onMarketClick(bet.marketId)}
									className="bg-dark-200 rounded-xl border border-border p-4 cursor-pointer hover:bg-dark-100 hover:border-border-secondary transition-all"
								>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
												bet.side === "yes" ? "bg-yes-bg text-yes" : "bg-no-bg text-no"
											}`}>
												{bet.side === "yes" ? "✓" : "✗"}
											</div>
											<div>
												<div className="font-medium text-text-primary">
													{market?.title || "Unknown Market"}
												</div>
												<div className="text-sm text-text-tertiary">
													<span className={bet.side === "yes" ? "text-yes" : "text-no"}>
														{bet.side.toUpperCase()}
													</span>
													{" on "}
													{outcomeLabel(bet.outcome)}
													{" @ "}
													{(bet.price * 100).toFixed(0)}¢
												</div>
											</div>
										</div>
										<div className="text-right">
											<div className="font-semibold text-text-primary">{formatCurrency(bet.amount)}</div>
											<div className="text-xs text-text-tertiary">
												{new Date(bet.createdAt).toLocaleDateString()}
											</div>
										</div>
									</div>
								</div>
							);
						})
					)}
				</div>
			) : (
				<div className="space-y-3">
					{filteredPositions.length === 0 ? (
						<div className="text-center py-16 bg-dark-200 rounded-xl border border-border">
							<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-300 flex items-center justify-center">
								<svg className="w-8 h-8 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
								</svg>
							</div>
							<h3 className="text-lg font-semibold text-text-primary mb-2">
								{filter === "all" 
									? activeTab === "resolved" ? "No resolved positions" : "No active positions"
									: `No ${filter === "profit" ? "profitable" : "losing"} positions`
								}
							</h3>
							<p className="text-text-tertiary">
								{activeTab === "positions" 
									? "Place bets to start building your portfolio"
									: "Resolved positions will appear here"
								}
							</p>
						</div>
					) : (
						filteredPositions.map((position) => {
							const market = getMarket(position.marketId);
							return (
								<div
									key={position.id}
									onClick={() => onMarketClick(position.marketId)}
									className="bg-dark-200 rounded-xl border border-border p-5 cursor-pointer hover:bg-dark-100 hover:border-border-secondary transition-all"
								>
									<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
										<div className="flex items-center gap-4">
											<div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
												position.side === "yes" 
													? position.outcome === "white" ? "bg-yes-bg" : position.outcome === "black" ? "bg-no-bg" : "bg-blue-500/10"
													: "bg-dark-300"
											}`}>
												<span className={`text-lg ${
													position.outcome === "white" ? "text-yes" :
													position.outcome === "black" ? "text-no" : "text-blue-400"
												}`}>
													{position.outcome === "white" ? "W" : position.outcome === "black" ? "B" : "D"}
												</span>
											</div>
											<div>
												<div className="font-semibold text-text-primary mb-1">
													{market?.title || "Unknown Market"}
												</div>
												<div className="flex items-center gap-2 text-sm">
													<span className={`px-2 py-0.5 rounded text-xs font-medium ${
														position.side === "yes" ? "bg-yes-bg text-yes" : "bg-no-bg text-no"
													}`}>
														{position.side.toUpperCase()}
													</span>
													<span className="text-text-secondary">{outcomeLabel(position.outcome)}</span>
													{position.isResolved && (
														<span className="badge badge-resolved">Resolved</span>
													)}
												</div>
											</div>
										</div>

										<div className="flex items-center gap-6">
											<div className="text-center">
												<div className="text-xs text-text-tertiary mb-1">Shares</div>
												<div className="font-medium text-text-primary">{position.shares.toFixed(2)}</div>
											</div>
											<div className="text-center">
												<div className="text-xs text-text-tertiary mb-1">Avg Price</div>
												<div className="font-medium text-text-primary">{(position.avgPrice * 100).toFixed(0)}¢</div>
											</div>
											<div className="text-center">
												<div className="text-xs text-text-tertiary mb-1">Value</div>
												<div className="font-medium text-text-primary">{formatCurrency(position.currentValue)}</div>
											</div>
											<div className="text-center min-w-[80px]">
												<div className="text-xs text-text-tertiary mb-1">P&L</div>
												<div className={`font-semibold ${position.pnl >= 0 ? "text-yes" : "text-no"}`}>
													{position.pnl >= 0 ? "+" : ""}{formatCurrency(position.pnl)}
													<div className="text-xs">
														({position.pnlPercent >= 0 ? "+" : ""}{position.pnlPercent.toFixed(1)}%)
													</div>
												</div>
											</div>
										</div>
									</div>

									{position.isResolved && position.resolvedPayout !== undefined && (
										<div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
											<span className="text-sm text-text-tertiary">Payout</span>
											<span className={`font-semibold ${position.resolvedPayout > 0 ? "text-yes" : "text-no"}`}>
												{position.resolvedPayout > 0 
													? `+${formatCurrency(position.resolvedPayout)}`
													: "Lost"
												}
											</span>
										</div>
									)}
								</div>
							);
						})
					)}
				</div>
			)}
		</PageContainer>
	);
}

