import { useEffect, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import type { Room, GameMove } from '../types/game';
import { socketService } from '../services/socketService';

interface ChessBoardProps {
    room: Room;
    playerAddress: string;
    onGameOver?: (winner?: 'white' | 'black' | 'draw') => void;
}

export default function ChessBoard({ room, playerAddress, onGameOver }: ChessBoardProps) {
    const [game, setGame] = useState(new Chess(room.gameState));
    const [playerColor, setPlayerColor] = useState<'white' | 'black' | null>(null);

    useEffect(() => {
        const player = room.players.find(p => p.address === playerAddress);
        if (player) {
            setPlayerColor(player.color);
        }
    }, [room, playerAddress]);

    useEffect(() => {
        // Update game state when room updates
        const newGame = new Chess(room.gameState);
        setGame(newGame);
    }, [room.gameState]);

    useEffect(() => {
        const handleMoveMade = (data: {
            move: GameMove;
            gameState: string;
            room: Room;
            isGameOver?: boolean;
            winner?: 'white' | 'black' | 'draw';
        }) => {
            const newGame = new Chess(data.gameState);
            setGame(newGame);

            if (data.isGameOver && onGameOver) {
                onGameOver(data.winner);
            }
        };

        socketService.onMoveMade(handleMoveMade);

        return () => {
            socketService.off('move_made', handleMoveMade);
        };
    }, [onGameOver]);

    function onDrop(sourceSquare: string, targetSquare: string) {
        if (!playerColor) return false;

        const currentTurn = game.turn() === 'w' ? 'white' : 'black';
        if (currentTurn !== playerColor) {
            return false;
        }

        try {
            const move = game.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: 'q', // Always promote to queen for simplicity
            });

            if (move === null) return false;

            const gameMove: GameMove = {
                from: sourceSquare,
                to: targetSquare,
            };

            socketService.makeMove(room.id, gameMove, playerAddress);
            return true;
        } catch (error) {
            return false;
        }
    }

    if (!playerColor) {
        return <div>Loading...</div>;
    }

    const boardOrientation = playerColor === 'white' ? 'white' : 'black';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '10px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}>
                <Chessboard
                    position={game.fen()}
                    onPieceDrop={onDrop}
                    boardOrientation={boardOrientation}
                    customBoardStyle={{
                        borderRadius: '4px',
                        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
                    }}
                />
            </div>
            <div style={{
                background: 'white',
                padding: '15px',
                borderRadius: '8px',
                minWidth: '300px',
                textAlign: 'center'
            }}>
                <p><strong>Your Color:</strong> {playerColor === 'white' ? '⚪ White' : '⚫ Black'}</p>
                <p><strong>Current Turn:</strong> {room.currentTurn === 'white' ? '⚪ White' : '⚫ Black'}</p>
                {room.status === 'finished' && room.winner && (
                    <p style={{ color: room.winner === 'draw' ? 'orange' : 'green', fontWeight: 'bold' }}>
                        {room.winner === 'draw' ? 'Game ended in a draw!' : `Winner: ${room.winner}`}
                    </p>
                )}
            </div>
        </div>
    );
}

