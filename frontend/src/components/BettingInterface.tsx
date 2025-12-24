import { useState, useMemo } from "react";
import type { Market, Outcome, OutcomeData, Position } from "../types/game";
import { formatCurrency } from "../styles/designTokens";

interface BettingInterfaceProps {
	market: Market;
	selectedOutcome?: Outcome;
	userPositions?: Position[];
	onPlaceBet: (outcome: Outcome, side: "yes" | "no", amount: number) => Promise<void>;
	isLoading?: boolean;
	walletBalance?: number;
	isConnected?: boolean;
}

export function BettingInterface({
	market,
	selectedOutcome,
	userPositions = [],
	onPlaceBet,
	isLoading = false,
	walletBalance = 1000,
	isConnected = true
}: BettingInterfaceProps) {
	const [activeOutcome, setActiveOutcome] = useState<Outcome | null>(selectedOutcome || null);
	const [activeSide, setActiveSide] = useState<"yes" | "no">("yes");
	const [amount, setAmount] = useState<string>("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const outcomeData = useMemo(() => {
		if (!activeOutcome) return null;
		return market.outcomes.find(o => o.outcome === activeOutcome);
	}, [market.outcomes, activeOutcome]);

	const currentPrice = useMemo(() => {
		if (!outcomeData) return 0;
		return activeSide === "yes" ? outcomeData.yesPrice : outcomeData.noPrice;
	}, [outcomeData, activeSide]);

	const potentialPayout = useMemo(() => {
		const numAmount = parseFloat(amount) || 0;
		if (numAmount <= 0 || currentPrice <= 0) return 0;
		return numAmount / currentPrice;
	}, [amount, currentPrice]);

	const profit = useMemo(() => {
		const numAmount = parseFloat(amount) || 0;
		return potentialPayout - numAmount;
	}, [potentialPayout, amount]);

	const userPosition = useMemo(() => {
		if (!activeOutcome) return null;
		return userPositions.find(p => p.outcome === activeOutcome);
	}, [userPositions, activeOutcome]);

	const outcomeLabel = (outcome: Outcome) => {
		switch (outcome) {
			case "white": return "White wins";
			case "black": return "Black wins";
			case "draw": return "Draw";
		}
	};

	const handleSubmit = async () => {
		if (!activeOutcome || !amount || parseFloat(amount) <= 0) return;
		
		setIsSubmitting(true);
		try {
			await onPlaceBet(activeOutcome, activeSide, parseFloat(amount));
			setAmount("");
		} finally {
			setIsSubmitting(false);
		}
	};

	const quickAmounts = [10, 25, 50, 100];

	if (market.status !== "active") {
		return (
			<div className="bg-dark-200 rounded-xl border border-border p-6">
				<div className="text-center">
					<div className="w-12 h-12 mx-auto mb-3 rounded-full bg-dark-300 flex items-center justify-center">
						<svg className="w-6 h-6 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
						</svg>
					</div>
					<h3 className="font-semibold text-text-primary mb-1">Betting Closed</h3>
					<p className="text-sm text-text-tertiary">
						{market.status === "resolved" 
							? `This market has been resolved. ${market.resolvedOutcome === "white" ? "White" : market.resolvedOutcome === "black" ? "Black" : "Draw"} won.`
							: "Betting is no longer available for this market."
						}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-dark-200 rounded-xl border border-border overflow-hidden">
			{/* Outcome Selector */}
			<div className="p-4 border-b border-border">
				<label className="text-sm font-medium text-text-secondary mb-3 block">Select Outcome</label>
				<div className="grid grid-cols-3 gap-2">
					{market.outcomes.map((outcome) => (
						<button
							key={outcome.outcome}
							onClick={() => setActiveOutcome(outcome.outcome)}
							className={`p-3 rounded-lg border transition-all ${
								activeOutcome === outcome.outcome
									? outcome.outcome === "white" 
										? "bg-yes-bg border-yes text-yes"
										: outcome.outcome === "black"
											? "bg-no-bg border-no text-no"
											: "bg-blue-500/10 border-blue-400 text-blue-400"
									: "bg-dark-300 border-border text-text-secondary hover:border-border-secondary"
							}`}
						>
							<div className="text-sm font-medium">{outcomeLabel(outcome.outcome)}</div>
							<div className="text-lg font-bold mt-1">{Math.round(outcome.probability)}%</div>
						</button>
					))}
				</div>
			</div>

			{/* Betting Panel */}
			{activeOutcome && outcomeData && (
				<div className="p-4">
					{/* Yes/No Toggle */}
					<div className="flex gap-2 mb-4">
						<button
							onClick={() => setActiveSide("yes")}
							className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
								activeSide === "yes"
									? "bg-yes text-dark-500"
									: "bg-dark-300 text-text-secondary hover:bg-dark-100"
							}`}
						>
							Yes {(outcomeData.yesPrice * 100).toFixed(0)}¢
						</button>
						<button
							onClick={() => setActiveSide("no")}
							className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
								activeSide === "no"
									? "bg-no text-white"
									: "bg-dark-300 text-text-secondary hover:bg-dark-100"
							}`}
						>
							No {(outcomeData.noPrice * 100).toFixed(0)}¢
						</button>
					</div>

					{/* Amount Input */}
					<div className="mb-4">
						<label className="text-sm font-medium text-text-secondary mb-2 block">Amount</label>
						<div className="relative">
							<span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary">$</span>
							<input
								type="number"
								value={amount}
								onChange={(e) => setAmount(e.target.value)}
								placeholder="0.00"
								className="input pl-8 pr-4 text-lg font-medium"
								min="0"
								step="0.01"
							/>
						</div>
						
						{/* Quick Amount Buttons */}
						<div className="flex gap-2 mt-2">
							{quickAmounts.map((quickAmount) => (
								<button
									key={quickAmount}
									onClick={() => setAmount(quickAmount.toString())}
									className="flex-1 py-1.5 text-sm bg-dark-300 hover:bg-dark-100 text-text-secondary rounded-md transition-colors"
								>
									${quickAmount}
								</button>
							))}
							<button
								onClick={() => setAmount(walletBalance.toString())}
								className="flex-1 py-1.5 text-sm bg-dark-300 hover:bg-dark-100 text-text-secondary rounded-md transition-colors"
							>
								Max
							</button>
						</div>
					</div>

					{/* Price Info */}
					<div className="bg-dark-300 rounded-lg p-4 mb-4 space-y-2">
						<div className="flex justify-between text-sm">
							<span className="text-text-tertiary">Price per share</span>
							<span className="text-text-primary font-medium">{(currentPrice * 100).toFixed(0)}¢</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-text-tertiary">Shares</span>
							<span className="text-text-primary font-medium">{potentialPayout.toFixed(2)}</span>
						</div>
						<div className="flex justify-between text-sm pt-2 border-t border-border">
							<span className="text-text-tertiary">Potential return</span>
							<span className={`font-semibold ${profit > 0 ? "text-yes" : "text-text-primary"}`}>
								{formatCurrency(potentialPayout)} ({profit > 0 ? "+" : ""}{formatCurrency(profit)})
							</span>
						</div>
					</div>

					{/* Submit Button */}
					{isConnected ? (
						<button
							onClick={handleSubmit}
							disabled={!amount || parseFloat(amount) <= 0 || isSubmitting || isLoading}
							className={`w-full py-4 rounded-lg font-semibold text-lg transition-all ${
								activeSide === "yes"
									? "bg-yes hover:bg-yes-hover text-dark-500 disabled:opacity-50"
									: "bg-no hover:bg-no-hover text-white disabled:opacity-50"
							}`}
						>
							{isSubmitting ? (
								<span className="flex items-center justify-center gap-2">
									<svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
										<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
										<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
									</svg>
									Placing Bet...
								</span>
							) : (
								`Buy ${activeSide === "yes" ? "Yes" : "No"} for ${formatCurrency(parseFloat(amount) || 0)}`
							)}
						</button>
					) : (
						<button className="w-full py-4 rounded-lg font-semibold text-lg bg-accent hover:bg-accent-hover text-dark-500">
							Connect Wallet to Bet
						</button>
					)}

					{/* Wallet Balance */}
					<div className="mt-3 text-center text-sm text-text-tertiary">
						Balance: {formatCurrency(walletBalance)}
					</div>
				</div>
			)}

			{/* User Position */}
			{userPosition && (
				<div className="p-4 border-t border-border bg-dark-300">
					<h4 className="text-sm font-medium text-text-secondary mb-3">Your Position</h4>
					<div className="flex items-center justify-between">
						<div>
							<div className="text-xs text-text-tertiary mb-1">
								{outcomeLabel(userPosition.outcome)} - {userPosition.side.toUpperCase()}
							</div>
							<div className="font-semibold text-text-primary">{userPosition.shares.toFixed(2)} shares</div>
						</div>
						<div className="text-right">
							<div className="text-xs text-text-tertiary mb-1">P&L</div>
							<div className={`font-semibold ${userPosition.pnl >= 0 ? "text-yes" : "text-no"}`}>
								{userPosition.pnl >= 0 ? "+" : ""}{formatCurrency(userPosition.pnl)}
								<span className="text-xs ml-1">
									({userPosition.pnlPercent >= 0 ? "+" : ""}{userPosition.pnlPercent.toFixed(1)}%)
								</span>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

// Compact betting buttons for quick bets from market cards
interface QuickBetButtonsProps {
	outcome: OutcomeData;
	onBet: (side: "yes" | "no") => void;
}

export function QuickBetButtons({ outcome, onBet }: QuickBetButtonsProps) {
	return (
		<div className="flex gap-1">
			<button
				onClick={() => onBet("yes")}
				className="px-3 py-1.5 text-xs font-medium rounded bg-yes-bg text-yes hover:bg-yes hover:text-dark-500 transition-all"
			>
				Yes {(outcome.yesPrice * 100).toFixed(0)}¢
			</button>
			<button
				onClick={() => onBet("no")}
				className="px-3 py-1.5 text-xs font-medium rounded bg-no-bg text-no hover:bg-no hover:text-white transition-all"
			>
				No {(outcome.noPrice * 100).toFixed(0)}¢
			</button>
		</div>
	);
}

