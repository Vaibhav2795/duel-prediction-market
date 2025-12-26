import { useState, useEffect } from 'react';
import { getMatchMoves, type MatchMovesResponse } from '../services/matchService';
import { Chess } from 'chess.js';

interface MatchMoveHistoryProps {
	matchId: string;
	onMoveSelect?: (fen: string, moveNumber: number) => void;
}

export function MatchMoveHistory({ matchId, onMoveSelect }: MatchMoveHistoryProps) {
	const [moves, setMoves] = useState<MatchMovesResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string>('');
	const [selectedMove, setSelectedMove] = useState<number | null>(null);
	const [game, setGame] = useState<Chess | null>(null);

	useEffect(() => {
		const fetchMoves = async () => {
			setLoading(true);
			setError('');
			try {
				const data = await getMatchMoves(matchId);
				setMoves(data);
				// Initialize chess game for replay
				const chess = new Chess();
				setGame(chess);
			} catch (err: any) {
				setError(err.message || 'Failed to load move history');
			} finally {
				setLoading(false);
			}
		};

		if (matchId) {
			fetchMoves();
		}
	}, [matchId]);

	const handleMoveClick = (moveNumber: number) => {
		if (!moves || !game) return;

		// Replay moves up to selected move
		const chess = new Chess();
		for (let i = 0; i < moveNumber && i < moves.moves.length; i++) {
			const move = moves.moves[i];
			// Parse SAN move
			try {
				chess.move(move.san);
			} catch (e) {
				console.error('Failed to replay move:', move.san);
			}
		}

		setSelectedMove(moveNumber);
		onMoveSelect?.(chess.fen(), moveNumber);
	};

	if (loading) {
		return (
			<div className="bg-dark-300 border border-border rounded-lg p-6">
				<div className="animate-pulse space-y-2">
					<div className="h-4 bg-dark-200 rounded w-1/4" />
					{[...Array(5)].map((_, i) => (
						<div key={i} className="h-8 bg-dark-200 rounded" />
					))}
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-red-500/20 border border-red-500/30 text-red-400 p-4 rounded-lg">
				<p>{error}</p>
			</div>
		);
	}

	if (!moves || moves.moves.length === 0) {
		return (
			<div className="bg-dark-300 border border-border rounded-lg p-6 text-center">
				<p className="text-text-tertiary">No moves recorded yet</p>
			</div>
		);
	}

	return (
		<div className="bg-dark-300 border border-border rounded-lg p-6">
			<h3 className="text-lg font-semibold text-text-primary mb-4">
				Move History ({moves.totalMoves} moves)
			</h3>
			<div className="max-h-96 overflow-y-auto">
				<div className="grid grid-cols-2 gap-2">
					{moves.moves.map((move, index) => {
						const moveNumber = Math.floor(index / 2) + 1;
						const isWhite = index % 2 === 0;
						const isSelected = selectedMove === moveNumber;

						return (
							<button
								key={index}
								onClick={() => handleMoveClick(moveNumber)}
								className={`text-left p-3 rounded-lg border transition-colors ${
									isSelected
										? 'bg-accent/20 border-accent text-accent'
										: 'bg-dark-200 border-border hover:border-accent/50 text-text-primary'
								}`}
							>
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">
										{isWhite ? `${moveNumber}.` : ''} {move.san}
									</span>
									<span className="text-xs text-text-tertiary">
										{new Date(move.playedAt).toLocaleTimeString()}
									</span>
								</div>
								<div className="text-xs text-text-tertiary mt-1">
									{move.playedBy === 'white' ? '⚪' : '⚫'} {move.playedBy}
								</div>
							</button>
						);
					})}
				</div>
			</div>
			{selectedMove && (
				<div className="mt-4 pt-4 border-t border-border">
					<button
						onClick={() => {
							setSelectedMove(null);
							onMoveSelect?.('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 0);
						}}
						className="text-sm text-accent hover:text-accent-hover"
					>
						Reset to start position
					</button>
				</div>
			)}
		</div>
	);
}

