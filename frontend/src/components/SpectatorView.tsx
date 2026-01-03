import { useEffect, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { socketService } from '../services/socketService';

interface SpectatorViewProps {
	matchId: string;
	onBack: () => void;
}

export function SpectatorView({ matchId, onBack }: SpectatorViewProps) {
	const [game, setGame] = useState(new Chess());
	const [gameState, setGameState] = useState<string>('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
	const [status, setStatus] = useState<string>('waiting');
	const [currentTurn, setCurrentTurn] = useState<'white' | 'black'>('white');
	const [players, setPlayers] = useState<Array<{ address: string; color: 'white' | 'black' }>>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		socketService.connect();
		socketService.joinSpectator(matchId);

		const handleSpectatorJoined = (data: {
			matchId: string;
			gameState: string;
			status: string;
			currentTurn: 'white' | 'black';
			players: Array<{ address: string; color: 'white' | 'black' }>;
		}) => {
			setGameState(data.gameState);
			setStatus(data.status);
			setCurrentTurn(data.currentTurn);
			setPlayers(data.players);
			setGame(new Chess(data.gameState));
			setLoading(false);
		};

		const handleMoveMade = (data: {
			gameState: string;
			room: any;
			isGameOver?: boolean;
			winner?: 'white' | 'black' | 'draw';
			currentTurn?: 'white' | 'black';
		}) => {
			if (data.gameState) {
				setGameState(data.gameState);
				setGame(new Chess(data.gameState));
			}
			if (data.currentTurn) setCurrentTurn(data.currentTurn);
			if (data.room?.currentTurn) setCurrentTurn(data.room.currentTurn);
			if (data.isGameOver || data.room?.status === 'finished') setStatus('finished');
		};

		const handleMatchFinished = (data: {
			matchId: string;
			winner: 'white' | 'black' | 'draw';
			finalFen: string;
		}) => {
			if (data.matchId === matchId) {
				setStatus('finished');
				setGameState(data.finalFen);
				setGame(new Chess(data.finalFen));
			}
		};

		socketService.onSpectatorJoined(handleSpectatorJoined);
		socketService.onMoveMade(handleMoveMade);
		socketService.onMatchFinished(handleMatchFinished);

		return () => {
			socketService.off('spectator_joined', handleSpectatorJoined);
			socketService.off('move_made', handleMoveMade);
			socketService.off('match_finished', handleMatchFinished);
		};
	}, [matchId]);

	if (loading) {
		return (
			<div className="max-w-4xl mx-auto px-4 py-8">
				<div className="text-center py-16">
					<div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
					<p className="text-text-secondary">Loading game...</p>
				</div>
			</div>
		);
	}

	const whitePlayer = players.find(p => p.color === 'white');
	const blackPlayer = players.find(p => p.color === 'black');

	return (
		<div className="max-w-4xl mx-auto px-4 py-8">
			<div className="mb-6 flex items-center justify-between">
				<button
					onClick={onBack}
					className="btn btn-secondary"
				>
					← Back
				</button>
				<div className="text-center">
					<h2 className="text-xl font-bold text-text-primary mb-2">Spectating Match</h2>
					<p className="text-text-secondary text-sm">Match ID: {matchId.slice(0, 8)}...</p>
				</div>
				<div className="w-20" /> {/* Spacer for centering */}
			</div>

			<div className="card p-6 mb-6">
				<div className="flex items-center justify-between mb-4">
					<div className="flex-1">
						<div className="flex items-center gap-2 mb-2">
							<span className="text-sm font-medium text-text-secondary">White:</span>
							<span className="text-text-primary">{whitePlayer?.address.slice(0, 10)}...</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-sm font-medium text-text-secondary">Black:</span>
							<span className="text-text-primary">{blackPlayer?.address.slice(0, 10)}...</span>
						</div>
					</div>
					<div className="text-right">
						<div className="text-sm text-text-secondary mb-1">Status</div>
						<div className="text-lg font-semibold text-text-primary capitalize">{status}</div>
						{status === 'active' && (
							<div className="text-sm text-text-tertiary mt-1">
								Current Turn: <span className="capitalize">{currentTurn}</span>
							</div>
						)}
					</div>
				</div>
			</div>

			<div className="flex justify-center mb-6">
				<div className="w-full max-w-2xl">
					<Chessboard
						position={gameState}
						arePiecesDraggable={false}
						boardWidth={600}
					/>
				</div>
			</div>

			{status === 'finished' && (
				<div className="card p-6 text-center">
					<p className="text-lg font-semibold text-text-primary">Game Finished</p>
				</div>
			)}
		</div>
	);
}

