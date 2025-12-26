import { useState, useEffect } from 'react';
import { getUserMatchHistory, type MatchHistoryItem } from '../services/userService';
import { PageContainer } from '../components/Layout';
import { formatCurrency, formatAddress } from '../styles/designTokens';

interface MatchHistoryPageProps {
	walletAddress: string;
	onMatchClick?: (matchId: string) => void;
}

export function MatchHistoryPage({ walletAddress, onMatchClick }: MatchHistoryPageProps) {
	const [history, setHistory] = useState<MatchHistoryItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string>('');
	const [page, setPage] = useState(1);
	const [pagination, setPagination] = useState({
		page: 1,
		limit: 10,
		total: 0,
		totalPages: 0,
	});

	useEffect(() => {
		const fetchHistory = async () => {
			if (!walletAddress) return;

			setLoading(true);
			setError('');
			try {
				const response = await getUserMatchHistory(walletAddress, page, 10);
				setHistory(response.data);
				setPagination(response.pagination);
			} catch (err: any) {
				setError(err.message || 'Failed to load match history');
				setHistory([]);
			} finally {
				setLoading(false);
			}
		};

		fetchHistory();
	}, [walletAddress, page]);

	const getResultColor = (result?: "WIN" | "LOSS" | "DRAW") => {
		switch (result) {
			case "WIN":
				return "text-green-400";
			case "LOSS":
				return "text-red-400";
			case "DRAW":
				return "text-yellow-400";
			default:
				return "text-text-tertiary";
		}
	};

	const getResultBadge = (result?: "WIN" | "LOSS" | "DRAW") => {
		switch (result) {
			case "WIN":
				return "bg-green-500/20 text-green-400 border-green-500/30";
			case "LOSS":
				return "bg-red-500/20 text-red-400 border-red-500/30";
			case "DRAW":
				return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
			default:
				return "bg-dark-200 text-text-tertiary border-border";
		}
	};

	if (loading && history.length === 0) {
		return (
			<PageContainer>
				<div className="animate-pulse space-y-4">
					<div className="h-8 w-48 bg-dark-200 rounded mb-6" />
					{[...Array(5)].map((_, i) => (
						<div key={i} className="h-24 bg-dark-200 rounded-lg" />
					))}
				</div>
			</PageContainer>
		);
	}

	return (
		<PageContainer>
			<h1 className="text-2xl font-bold text-text-primary mb-6">Match History</h1>

			{error && (
				<div className="bg-red-500/20 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6">
					<p>{error}</p>
				</div>
			)}

			{history.length === 0 && !loading ? (
				<div className="text-center py-16">
					<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-200 flex items-center justify-center">
						<svg className="w-8 h-8 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
						</svg>
					</div>
					<h3 className="text-lg font-semibold text-text-primary mb-2">No match history</h3>
					<p className="text-text-tertiary">You haven't played any matches yet.</p>
				</div>
			) : (
				<div className="space-y-4">
					{history.map((match) => (
						<div
							key={match.id}
							onClick={() => onMatchClick?.(match.id)}
							className={`bg-dark-300 border border-border rounded-lg p-6 hover:border-accent/50 transition-colors ${
								onMatchClick ? 'cursor-pointer' : ''
							}`}
						>
							<div className="flex items-start justify-between mb-4">
								<div className="flex-1">
									<div className="flex items-center gap-3 mb-2">
										<h3 className="text-lg font-semibold text-text-primary">
											vs {match.opponent.name}
										</h3>
										<span className={`px-2 py-1 rounded text-xs font-medium border ${getResultBadge(match.result)}`}>
											{match.result || match.status}
										</span>
									</div>
									<p className="text-text-secondary text-sm mb-1">
										Opponent: {formatAddress(match.opponent.wallet)}
									</p>
									<p className="text-text-tertiary text-xs">
										Scheduled: {new Date(match.scheduledAt).toLocaleString()}
									</p>
									{match.endedAt && (
										<p className="text-text-tertiary text-xs">
											Ended: {new Date(match.endedAt).toLocaleString()}
										</p>
									)}
								</div>
								<div className="text-right">
									<p className="text-text-primary font-semibold mb-1">
										{formatCurrency(match.stakeAmount)}
									</p>
									{match.result && (
										<p className={`text-sm font-medium ${getResultColor(match.result)}`}>
											{match.result}
										</p>
									)}
								</div>
							</div>
							{match.gameResult && (
								<div className="mt-4 pt-4 border-t border-border">
									<p className="text-text-secondary text-sm">
										Winner: <span className="text-text-primary capitalize">{match.gameResult.winner}</span>
									</p>
								</div>
							)}
						</div>
					))}

					{/* Pagination */}
					{pagination.totalPages > 1 && (
						<div className="flex items-center justify-center gap-2 mt-6">
							<button
								onClick={() => setPage(p => Math.max(1, p - 1))}
								disabled={page === 1}
								className="px-4 py-2 bg-dark-300 border border-border rounded-lg text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:border-accent transition-colors"
							>
								Previous
							</button>
							<span className="text-text-secondary">
								Page {pagination.page} of {pagination.totalPages}
							</span>
							<button
								onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
								disabled={page >= pagination.totalPages}
								className="px-4 py-2 bg-dark-300 border border-border rounded-lg text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:border-accent transition-colors"
							>
								Next
							</button>
						</div>
					)}
				</div>
			)}
		</PageContainer>
	);
}

