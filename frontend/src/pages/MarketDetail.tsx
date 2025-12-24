import { useState, useMemo } from "react";
import type { Market, Bet, Position, Outcome } from "../types/game";
import { BettingInterface } from "../components/BettingInterface";
import { PageContainer } from "../components/Layout";
import { formatCurrency, formatTimeRemaining, formatAddress } from "../styles/designTokens";
import { Chessboard } from "react-chessboard";

interface MarketDetailPageProps {
	market: Market | null;
	bets: Bet[];
	userPositions: Position[];
	isLoading?: boolean;
	onPlaceBet: (outcome: Outcome, side: "yes" | "no", amount: number) => Promise<void>;
	onBack: () => void;
	walletBalance?: number;
	isConnected?: boolean;
	userAddress?: string;
}

export function MarketDetailPage({
	market,
	bets,
	userPositions,
	isLoading = false,
	onPlaceBet,
	onBack,
	walletBalance = 1000,
	isConnected = true,
	userAddress
}: MarketDetailPageProps) {
	const [activeTab, setActiveTab] = useState<"overview" | "activity" | "positions">("overview");

	const recentBets = useMemo(() => {
		return [...bets].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 20);
	}, [bets]);

	const userMarketPositions = useMemo(() => {
		return userPositions.filter(p => p.marketId === market?.id);
	}, [userPositions, market?.id]);

	const outcomeLabel = (outcome: Outcome) => {
		switch (outcome) {
			case "white": return "White wins";
			case "black": return "Black wins";
			case "draw": return "Draw";
		}
	};

	if (isLoading) {
		return (
			<PageContainer>
				<div className="animate-pulse">
					<div className="h-8 w-32 bg-dark-200 rounded mb-6" />
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
						<div className="lg:col-span-2">
							<div className="h-64 bg-dark-200 rounded-xl mb-6" />
							<div className="h-96 bg-dark-200 rounded-xl" />
						</div>
						<div className="h-96 bg-dark-200 rounded-xl" />
					</div>
				</div>
			</PageContainer>
		);
	}

	if (!market) {
		return (
			<PageContainer>
				<div className="text-center py-16">
					<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-200 flex items-center justify-center">
						<svg className="w-8 h-8 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<h3 className="text-lg font-semibold text-text-primary mb-2">Market not found</h3>
					<p className="text-text-tertiary mb-4">The market you're looking for doesn't exist</p>
					<button onClick={onBack} className="btn btn-secondary">
						Back to Browse
					</button>
				</div>
			</PageContainer>
		);
	}

	return (
		<PageContainer>
			{/* Back Button */}
			<button
				onClick={onBack}
				className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-6 transition-colors"
			>
				<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
				</svg>
				Back to Markets
			</button>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				{/* Main Content */}
				<div className="lg:col-span-2 space-y-6">
					{/* Market Header */}
					<div className="bg-dark-200 rounded-xl border border-border p-6">
						<div className="flex items-start justify-between mb-4">
							<div className="flex-1">
								<div className="flex items-center gap-3 mb-2">
									<h1 className="text-2xl font-bold text-text-primary">{market.title}</h1>
									{market.status === "active" && market.room.status === "active" && (
										<span className="badge badge-live flex items-center gap-1">
											<span className="w-1.5 h-1.5 bg-status-live rounded-full animate-pulse" />
											Live
										</span>
									)}
									{market.status === "active" && market.room.status !== "active" && (
										<span className="badge badge-active">Active</span>
									)}
									{market.status === "resolved" && (
										<span className="badge badge-resolved">Resolved</span>
									)}
								</div>
								<p className="text-text-tertiary">{market.description}</p>
							</div>
						</div>

						{/* Players Info */}
						<div className="flex items-center gap-4 p-4 bg-dark-300 rounded-lg mb-4">
							<div className="flex-1 flex items-center gap-3">
								<div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border-2 border-border">
									<span className="text-dark-500 font-bold">W</span>
								</div>
								<div>
									<div className="font-semibold text-text-primary">
										{market.playerWhite?.displayName || formatAddress(market.playerWhite?.address || "")}
									</div>
									<div className="text-sm text-text-tertiary">White</div>
								</div>
							</div>
							<div className="text-2xl font-bold text-text-muted">VS</div>
							<div className="flex-1 flex items-center gap-3 justify-end">
								<div className="text-right">
									<div className="font-semibold text-text-primary">
										{market.playerBlack?.displayName || formatAddress(market.playerBlack?.address || "")}
									</div>
									<div className="text-sm text-text-tertiary">Black</div>
								</div>
								<div className="w-10 h-10 rounded-full bg-dark-500 flex items-center justify-center border-2 border-border">
									<span className="text-white font-bold">B</span>
								</div>
							</div>
						</div>

						{/* Market Stats */}
						<div className="grid grid-cols-3 gap-4">
							<div className="text-center">
								<div className="text-sm text-text-tertiary mb-1">Total Volume</div>
								<div className="text-lg font-bold text-text-primary">{formatCurrency(market.totalVolume)}</div>
							</div>
							<div className="text-center">
								<div className="text-sm text-text-tertiary mb-1">Entry Fee</div>
								<div className="text-lg font-bold text-text-primary">${market.room.entryFee}</div>
							</div>
							<div className="text-center">
								<div className="text-sm text-text-tertiary mb-1">
									{market.status === "resolved" ? "Resolved" : "Ends"}
								</div>
								<div className="text-lg font-bold text-text-primary">
									{market.status === "resolved" 
										? new Date(market.resolvedAt!).toLocaleDateString()
										: market.endTime 
											? formatTimeRemaining(market.endTime)
											: "TBD"
									}
								</div>
							</div>
						</div>
					</div>

					{/* Live Chess Board */}
					{market.room.status === "active" && (
						<div className="bg-dark-200 rounded-xl border border-border p-6">
							<h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
								<span className="w-2 h-2 bg-status-live rounded-full animate-pulse" />
								Live Game
							</h2>
							<div className="max-w-md mx-auto">
								<Chessboard
									position={market.room.gameState}
									boardWidth={400}
									arePiecesDraggable={false}
									customDarkSquareStyle={{ backgroundColor: "#1a1a1a" }}
									customLightSquareStyle={{ backgroundColor: "#2a2a2a" }}
								/>
							</div>
							<div className="text-center mt-4 text-text-secondary">
								{market.room.currentTurn === "white" ? "White" : "Black"}'s turn to move
							</div>
						</div>
					)}

					{/* Outcomes */}
					<div className="bg-dark-200 rounded-xl border border-border p-6">
						<h2 className="text-lg font-semibold text-text-primary mb-4">Market Outcomes</h2>
						<div className="space-y-4">
							{market.outcomes.map((outcome) => (
								<div key={outcome.outcome} className="p-4 bg-dark-300 rounded-lg">
									<div className="flex items-center justify-between mb-3">
										<div className="flex items-center gap-3">
											<div className={`w-3 h-3 rounded-full ${
												outcome.outcome === "white" ? "bg-white border border-border" :
												outcome.outcome === "black" ? "bg-dark-500 border border-border" : "bg-blue-400"
											}`} />
											<span className="font-medium text-text-primary">{outcomeLabel(outcome.outcome)}</span>
											{market.status === "resolved" && market.resolvedOutcome === outcome.outcome && (
												<span className="badge badge-active">Winner</span>
											)}
										</div>
										<span className={`text-xl font-bold ${
											outcome.outcome === "white" ? "text-yes" :
											outcome.outcome === "black" ? "text-no" : "text-blue-400"
										}`}>
											{Math.round(outcome.probability)}%
										</span>
									</div>
									
									{/* Probability Bar */}
									<div className="h-3 bg-dark-200 rounded-full overflow-hidden mb-3">
										<div 
											className={`h-full rounded-full transition-all duration-500 ${
												outcome.outcome === "white" ? "bg-yes" :
												outcome.outcome === "black" ? "bg-no" : "bg-blue-400"
											}`}
											style={{ width: `${outcome.probability}%` }}
										/>
									</div>

									{/* Prices */}
									<div className="flex items-center justify-between text-sm">
										<div className="flex items-center gap-4">
											<div>
												<span className="text-text-tertiary">Yes: </span>
												<span className="text-yes font-medium">{(outcome.yesPrice * 100).toFixed(0)}¢</span>
											</div>
											<div>
												<span className="text-text-tertiary">No: </span>
												<span className="text-no font-medium">{(outcome.noPrice * 100).toFixed(0)}¢</span>
											</div>
										</div>
										<div className="text-text-tertiary">
											Vol: {formatCurrency(outcome.volume)}
										</div>
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Tabs */}
					<div className="bg-dark-200 rounded-xl border border-border overflow-hidden">
						<div className="flex border-b border-border">
							{(["overview", "activity", "positions"] as const).map((tab) => (
								<button
									key={tab}
									onClick={() => setActiveTab(tab)}
									className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
										activeTab === tab
											? "text-accent border-b-2 border-accent bg-dark-300"
											: "text-text-secondary hover:text-text-primary"
									}`}
								>
									{tab === "overview" && "Overview"}
									{tab === "activity" && `Activity (${recentBets.length})`}
									{tab === "positions" && `Your Positions (${userMarketPositions.length})`}
								</button>
							))}
						</div>

						<div className="p-6">
							{activeTab === "overview" && (
								<div className="space-y-4">
									<div>
										<h3 className="text-sm font-medium text-text-tertiary mb-2">Market ID</h3>
										<p className="text-text-primary font-mono text-sm">{market.id}</p>
									</div>
									<div>
										<h3 className="text-sm font-medium text-text-tertiary mb-2">Category</h3>
										<p className="text-text-primary capitalize">{market.category}</p>
									</div>
									<div>
										<h3 className="text-sm font-medium text-text-tertiary mb-2">Created</h3>
										<p className="text-text-primary">
											{new Date(market.createdAt).toLocaleString()}
										</p>
									</div>
									<div>
										<h3 className="text-sm font-medium text-text-tertiary mb-2">Resolution</h3>
										<p className="text-text-primary">
											{market.status === "resolved"
												? `Resolved: ${outcomeLabel(market.resolvedOutcome!)}`
												: "Market resolves when the game ends"
											}
										</p>
									</div>
								</div>
							)}

							{activeTab === "activity" && (
								<div className="space-y-3">
									{recentBets.length === 0 ? (
										<div className="text-center py-8 text-text-tertiary">
											No bets placed yet
										</div>
									) : (
										recentBets.map((bet) => (
											<div key={bet.id} className="flex items-center justify-between p-3 bg-dark-300 rounded-lg">
												<div className="flex items-center gap-3">
													<div className={`w-8 h-8 rounded-full flex items-center justify-center ${
														bet.side === "yes" ? "bg-yes-bg text-yes" : "bg-no-bg text-no"
													}`}>
														{bet.side === "yes" ? "✓" : "✗"}
													</div>
													<div>
														<div className="text-sm text-text-primary">
															<span className="font-medium">{formatAddress(bet.userAddress)}</span>
															<span className="text-text-tertiary"> bet </span>
															<span className={bet.side === "yes" ? "text-yes" : "text-no"}>
																{bet.side.toUpperCase()}
															</span>
															<span className="text-text-tertiary"> on </span>
															<span className="font-medium">{outcomeLabel(bet.outcome)}</span>
														</div>
														<div className="text-xs text-text-tertiary">
															{new Date(bet.createdAt).toLocaleString()}
														</div>
													</div>
												</div>
												<div className="text-right">
													<div className="font-medium text-text-primary">{formatCurrency(bet.amount)}</div>
													<div className="text-xs text-text-tertiary">
														@ {(bet.price * 100).toFixed(0)}¢
													</div>
												</div>
											</div>
										))
									)}
								</div>
							)}

							{activeTab === "positions" && (
								<div className="space-y-3">
									{userMarketPositions.length === 0 ? (
										<div className="text-center py-8 text-text-tertiary">
											You have no positions in this market
										</div>
									) : (
										userMarketPositions.map((pos) => (
											<div key={pos.id} className="p-4 bg-dark-300 rounded-lg">
												<div className="flex items-center justify-between mb-2">
													<div className="flex items-center gap-2">
														<span className={`px-2 py-0.5 rounded text-xs font-medium ${
															pos.side === "yes" ? "bg-yes-bg text-yes" : "bg-no-bg text-no"
														}`}>
															{pos.side.toUpperCase()}
														</span>
														<span className="font-medium text-text-primary">
															{outcomeLabel(pos.outcome)}
														</span>
													</div>
													<div className={`font-semibold ${pos.pnl >= 0 ? "text-yes" : "text-no"}`}>
														{pos.pnl >= 0 ? "+" : ""}{formatCurrency(pos.pnl)}
													</div>
												</div>
												<div className="flex items-center justify-between text-sm text-text-tertiary">
													<span>{pos.shares.toFixed(2)} shares @ {(pos.avgPrice * 100).toFixed(0)}¢ avg</span>
													<span>Value: {formatCurrency(pos.currentValue)}</span>
												</div>
											</div>
										))
									)}
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Sidebar - Betting Interface */}
				<div className="lg:col-span-1">
					<div className="sticky top-20">
						<BettingInterface
							market={market}
							userPositions={userMarketPositions}
							onPlaceBet={onPlaceBet}
							walletBalance={walletBalance}
							isConnected={isConnected}
						/>
					</div>
				</div>
			</div>
		</PageContainer>
	);
}

