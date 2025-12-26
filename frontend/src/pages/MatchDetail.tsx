import { useState, useEffect } from 'react';
import { getMatchById, type Match } from '../services/matchService';
import { MatchMoveHistory } from '../components/MatchMoveHistory';
import { SpectatorView } from '../components/SpectatorView';
import { PageContainer } from '../components/Layout';
import { formatCurrency, formatAddress } from '../styles/designTokens';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

interface MatchDetailPageProps {
	matchId: string;
	playerAddress?: string;
	onBack: () => void;
	onJoinMatch?: (matchId: string, stakeAmount: number) => void;
	onSpectate?: (matchId: string) => void;
}

export function MatchDetailPage({
	matchId,
	playerAddress,
	onBack,
	onJoinMatch,
	onSpectate
}: MatchDetailPageProps) {
	const [match, setMatch] = useState<Match | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string>('');
	const [viewMode, setViewMode] = useState<'details' | 'spectate'>('details');
	const [selectedFen, setSelectedFen] = useState<string | null>(null);
	const [selectedMoveNumber, setSelectedMoveNumber] = useState<number | null>(null);

	useEffect(() => {
		const fetchMatch = async () => {
			setLoading(true);
			setError('');
			try {
				const data = await getMatchById(matchId);
				setMatch(data);
			} catch (err: any) {
				setError(err.message || 'Failed to load match');
			} finally {
				setLoading(false);
			}
		};

		if (matchId) {
			fetchMatch();
		}
	}, [matchId]);

	const handleMoveSelect = (fen: string, moveNumber: number) => {
		setSelectedFen(fen);
		setSelectedMoveNumber(moveNumber);
	};

	const handleSpectate = () => {
		if (onSpectate) {
			onSpectate(matchId);
		} else {
			setViewMode('spectate');
		}
	};

	const isPlayer = match && playerAddress && (
		match.player1.wallet.toLowerCase() === playerAddress.toLowerCase() ||
		match.player2.wallet.toLowerCase() === playerAddress.toLowerCase()
	);

	const canJoin = match && match.status === 'SCHEDULED' && isPlayer;
	const canSpectate = match && (match.status === 'LIVE' || match.status === 'FINISHED');

	if (loading) {
		return (
			<PageContainer>
				<div className="animate-pulse space-y-4">
					<div className="h-8 w-48 bg-dark-200 rounded mb-6" />
					<div className="h-64 bg-dark-200 rounded-xl" />
					<div className="h-96 bg-dark-200 rounded-xl" />
				</div>
			</PageContainer>
		);
	}

	if (error) {
		return (
			<PageContainer>
				<div className="bg-red-500/20 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6">
					<p>{error}</p>
				</div>
				<button onClick={onBack} className="btn btn-secondary">
					Back
				</button>
			</PageContainer>
		);
	}

	if (!match) {
		return (
			<PageContainer>
				<div className="text-center py-16">
					<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-200 flex items-center justify-center">
						<svg className="w-8 h-8 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<h3 className="text-lg font-semibold text-text-primary mb-2">Match not found</h3>
					<p className="text-text-tertiary mb-4">The match you're looking for doesn't exist</p>
					<button onClick={onBack} className="btn btn-secondary">
						Back
					</button>
				</div>
			</PageContainer>
		);
	}

	// If in spectate mode, show spectator view
	if (viewMode === 'spectate') {
		return <SpectatorView matchId={matchId} onBack={() => setViewMode('details')} />;
	}

	// Determine current board position
	const currentFen = selectedFen || (match.result?.finalFen) || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
	const game = new Chess(currentFen);

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
				Back
			</button>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				{/* Main Content */}
				<div className="lg:col-span-2 space-y-6">
					{/* Match Header */}
					<div className="bg-dark-200 rounded-xl border border-border p-6">
						<div className="flex items-start justify-between mb-4">
							<div className="flex-1">
								<div className="flex items-center gap-3 mb-2">
									<h1 className="text-2xl font-bold text-text-primary">Chess Match</h1>
									{match.status === 'LIVE' && (
										<span className="badge badge-live flex items-center gap-1">
											<span className="w-1.5 h-1.5 bg-status-live rounded-full animate-pulse" />
											Live
										</span>
									)}
									{match.status === 'SCHEDULED' && (
										<span className="badge badge-active">Scheduled</span>
									)}
									{match.status === 'FINISHED' && (
										<span className="badge badge-resolved">Finished</span>
									)}
									{match.status === 'CANCELLED' && (
										<span className="badge bg-gray-500/20 text-gray-400 border-gray-500/30">Cancelled</span>
									)}
								</div>
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
										{match.player1.name || formatAddress(match.player1.wallet)}
									</div>
									<div className="text-sm text-text-tertiary">White</div>
								</div>
							</div>
							<div className="text-2xl font-bold text-text-muted">VS</div>
							<div className="flex-1 flex items-center gap-3 justify-end">
								<div className="text-right">
									<div className="font-semibold text-text-primary">
										{match.player2.name || formatAddress(match.player2.wallet)}
									</div>
									<div className="text-sm text-text-tertiary">Black</div>
								</div>
								<div className="w-10 h-10 rounded-full bg-dark-500 flex items-center justify-center border-2 border-border">
									<span className="text-white font-bold">B</span>
								</div>
							</div>
						</div>

						{/* Match Stats */}
						<div className="grid grid-cols-3 gap-4">
							<div className="text-center">
								<div className="text-sm text-text-tertiary mb-1">Stake Amount</div>
								<div className="text-lg font-bold text-text-primary">{formatCurrency(match.stakeAmount)}</div>
							</div>
							<div className="text-center">
								<div className="text-sm text-text-tertiary mb-1">Scheduled</div>
								<div className="text-lg font-bold text-text-primary">
									{new Date(match.scheduledAt).toLocaleDateString()}
								</div>
							</div>
							<div className="text-center">
								<div className="text-sm text-text-tertiary mb-1">Status</div>
								<div className="text-lg font-bold text-text-primary capitalize">{match.status.toLowerCase()}</div>
							</div>
						</div>

						{/* Match Result */}
						{match.result && (
							<div className="mt-4 pt-4 border-t border-border">
								<div className="flex items-center justify-between">
									<div>
										<div className="text-sm text-text-tertiary mb-1">Winner</div>
										<div className="text-lg font-bold text-text-primary capitalize">
											{match.result.winner === 'draw' ? 'Draw' : `${match.result.winner} wins`}
										</div>
									</div>
									<div className="text-right">
										<div className="text-sm text-text-tertiary mb-1">Finished</div>
										<div className="text-lg font-bold text-text-primary">
											{new Date(match.result.finishedAt).toLocaleString()}
										</div>
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Action Buttons */}
					<div className="flex gap-4">
						{canJoin && onJoinMatch && (
							<button
								onClick={() => onJoinMatch(match.id, match.stakeAmount)}
								className="btn btn-primary flex-1"
							>
								Join Match
							</button>
						)}
						{canSpectate && (
							<button
								onClick={handleSpectate}
								className="btn btn-secondary flex-1"
							>
								{viewMode === 'details' ? 'View Details' : 'Spectate Match'}
							</button>
						)}
					</div>

					{/* Chess Board */}
					<div className="bg-dark-200 rounded-xl border border-border p-6">
						<h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
							{selectedMoveNumber !== null ? (
								<>
									<span>Position after move {selectedMoveNumber}</span>
									<button
										onClick={() => {
											setSelectedFen(null);
											setSelectedMoveNumber(null);
										}}
										className="text-sm text-accent hover:text-accent-hover ml-auto"
									>
										Reset to current position
									</button>
								</>
							) : (
								<>
									{match.status === 'LIVE' && (
										<span className="w-2 h-2 bg-status-live rounded-full animate-pulse" />
									)}
									{match.status === 'FINISHED' ? 'Final Position' : 'Current Position'}
								</>
							)}
						</h2>
						<div className="max-w-md mx-auto">
							<Chessboard
								position={currentFen}
								boardWidth={400}
								arePiecesDraggable={false}
								customDarkSquareStyle={{ backgroundColor: "#1a1a1a" }}
								customLightSquareStyle={{ backgroundColor: "#2a2a2a" }}
							/>
						</div>
						{selectedMoveNumber === null && match.status === 'LIVE' && (
							<div className="text-center mt-4 text-text-secondary">
								Game in progress...
							</div>
						)}
					</div>

					{/* Move History */}
					<MatchMoveHistory
						matchId={matchId}
						onMoveSelect={handleMoveSelect}
					/>
				</div>

				{/* Sidebar */}
				<div className="lg:col-span-1">
					<div className="bg-dark-200 rounded-xl border border-border p-6 sticky top-20">
						<h3 className="text-lg font-semibold text-text-primary mb-4">Match Information</h3>
						<div className="space-y-4">
							<div>
								<div className="text-sm text-text-tertiary mb-1">Match ID</div>
								<div className="text-text-primary font-mono text-sm break-all">{match.id}</div>
							</div>
							<div>
								<div className="text-sm text-text-tertiary mb-1">Created</div>
								<div className="text-text-primary">
									{new Date(match.createdAt || match.scheduledAt).toLocaleString()}
								</div>
							</div>
							{match.updatedAt && (
								<div>
									<div className="text-sm text-text-tertiary mb-1">Last Updated</div>
									<div className="text-text-primary">
										{new Date(match.updatedAt).toLocaleString()}
									</div>
								</div>
							)}
							{match.result && (
								<div>
									<div className="text-sm text-text-tertiary mb-1">Final FEN</div>
									<div className="text-text-primary font-mono text-xs break-all">
										{match.result.finalFen}
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</PageContainer>
	);
}

