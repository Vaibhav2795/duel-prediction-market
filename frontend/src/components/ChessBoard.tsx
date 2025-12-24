import { useEffect, useState, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess, Move } from 'chess.js';
import type { Room, GameMove } from '../types/game';
import { socketService } from '../services/socketService';
import './ChessBoard.css';

interface MoveHistoryItem {
    move: Move;
    timestamp: Date;
    playerColor: 'white' | 'black';
    playerAddress: string;
}

interface ChessBoardProps {
    room: Room;
    playerAddress: string;
    onGameOver?: (winner?: 'white' | 'black' | 'draw') => void;
}

export default function ChessBoard({ room, playerAddress, onGameOver }: ChessBoardProps) {
    const [game, setGame] = useState(new Chess(room.gameState));
    const [playerColor, setPlayerColor] = useState<'white' | 'black' | null>(null);
    const [moveHistory, setMoveHistory] = useState<MoveHistoryItem[]>([]);
    const [lastMove, setLastMove] = useState<{ from: string; to: string; } | null>(null);
    const [capturedPieces, setCapturedPieces] = useState<{ white: string[]; black: string[]; }>({ white: [], black: [] });
    const [moveError, setMoveError] = useState<string>('');
    const moveHistoryRef = useRef<HTMLDivElement>(null);
    const previousFenRef = useRef<string>(room.gameState);
    const isInitializedRef = useRef<boolean>(false);
    // Maintain a local game instance that tracks moves for history
    const historyGameRef = useRef<Chess>(new Chess());

    // Initialize player color and sync game state
    useEffect(() => {
        const player = room.players.find(p => p.address === playerAddress);
        if (player) {
            setPlayerColor(player.color);
        }

        // Request current game state when joining to ensure sync
        if (room.id && room.players.length === 2) {
            socketService.getGameState(room.id);
        }
    }, [room, playerAddress]);


    // Initialize when component mounts or room changes
    // Note: We can't reconstruct history from FEN, so we start fresh and let handleMoveMade build it
    useEffect(() => {
        if (!isInitializedRef.current) {
            // Reset the history game to start fresh
            historyGameRef.current = new Chess();
            setMoveHistory([]);
            setCapturedPieces({ white: [], black: [] });
            setLastMove(null);
            isInitializedRef.current = true;
            console.log('Initialized chess board for room:', room.id);
        }
    }, [room.id]); // Only reinitialize if room ID changes

    // Update game state from room.gameState changes
    // Note: We don't try to reconstruct history from FEN here - that's handled by handleMoveMade
    useEffect(() => {
        const newGame = new Chess(room.gameState);
        setGame(newGame);
        previousFenRef.current = room.gameState;

        // Debug log for turn detection
        if (playerColor && room.currentTurn) {
            const isMyTurn = room.currentTurn === playerColor;
            console.log('Turn check:', {
                playerColor,
                roomCurrentTurn: room.currentTurn,
                isMyTurn,
                gameTurn: newGame.turn() === 'w' ? 'white' : 'black'
            });
        }
    }, [room.gameState, room.players, room.currentTurn, playerColor]);

    // Handle real-time move updates from socket
    useEffect(() => {
        const handleMoveMade = (data: {
            move: GameMove;
            gameState: string;
            room: Room;
            isGameOver?: boolean;
            winner?: 'white' | 'black' | 'draw';
        }) => {
            setMoveError(''); // Clear any previous errors

            // Update the game state from FEN
            const newGame = new Chess(data.gameState);
            setGame(newGame);
            previousFenRef.current = data.gameState;

            console.log('Move made event received:', {
                move: data.move,
                newTurn: data.room.currentTurn,
                gameState: data.gameState.substring(0, 80)
            });

            // Apply the move to our history-tracking game instance
            // This allows us to get the full move object with SAN notation
            try {
                const moveObj = historyGameRef.current.move({
                    from: data.move.from,
                    to: data.move.to,
                    promotion: data.move.promotion as any
                });

                if (moveObj) {
                    const moveColor: 'white' | 'black' = moveObj.color === 'w' ? 'white' : 'black';
                    const player = data.room.players.find(p => p.color === moveColor);

                    console.log('Move applied to history game:', {
                        san: moveObj.san,
                        from: moveObj.from,
                        to: moveObj.to,
                        color: moveColor,
                        captured: moveObj.captured
                    });

                    // Add to move history
                    setMoveHistory(prev => {
                        // Check if this move already exists
                        const moveExists = prev.some(
                            item => item.move.from === moveObj.from &&
                                item.move.to === moveObj.to &&
                                item.move.san === moveObj.san
                        );
                        if (moveExists) {
                            console.log('Move already in history, skipping');
                            return prev;
                        }

                        const newHistory: MoveHistoryItem[] = [...prev, {
                            move: moveObj,
                            timestamp: new Date(),
                            playerColor: moveColor,
                            playerAddress: player?.address || 'Unknown'
                        }];
                        console.log('Added move to history, total moves:', newHistory.length, 'moves:', newHistory.map(h => h.move.san));

                        // Update captured pieces with the new history
                        const captured: { white: string[]; black: string[]; } = { white: [], black: [] };
                        newHistory.forEach(item => {
                            if (item.move.captured) {
                                const pieceSymbol = item.move.captured;
                                const color = item.playerColor === 'white' ? 'black' : 'white';
                                captured[color].push(pieceSymbol);
                            }
                        });
                        console.log('Updated captured pieces:', captured);
                        setCapturedPieces(captured);

                        return newHistory;
                    });

                    // Update last move for highlighting
                    setLastMove({
                        from: data.move.from,
                        to: data.move.to
                    });
                } else {
                    console.error('Failed to apply move to history game');
                }
            } catch (error) {
                console.error('Error applying move to history game:', error);
                // Fallback: try to get move info from the new game state
                // This is a backup in case the move application fails
            }

            // Turn state is now derived directly from room.currentTurn in the UI
            // The parent App component will update the room prop with data.room

            if (data.isGameOver && onGameOver) {
                onGameOver(data.winner);
            }
        };

        const handleMoveError = (error: { message: string; }) => {
            setMoveError(error.message);
            setTimeout(() => setMoveError(''), 3000);
        };

        // Also listen to room_updated events to catch all state changes
        const handleRoomUpdated = (updatedRoom: Room) => {
            if (updatedRoom.id === room.id) {
                // Room was updated, sync game state
                const newGame = new Chess(updatedRoom.gameState);

                // If game state changed, update the board
                if (updatedRoom.gameState !== previousFenRef.current) {
                    setGame(newGame);
                    previousFenRef.current = updatedRoom.gameState;
                    // Don't try to reconstruct history from FEN - handleMoveMade handles that
                }

                // Update turn indicator
                // Turn state is now derived directly from room.currentTurn in the UI
            }
        };

        // Handle game state response (when requesting current state)
        const handleGameState = (data: { room: Room; gameState: string; }) => {
            if (data.room.id === room.id) {
                const currentGame = new Chess(data.gameState);
                setGame(currentGame);
                previousFenRef.current = data.gameState;

                // Can't reconstruct history from FEN - history is built from move_made events
                console.log('Game state received, but cannot reconstruct history from FEN');
            }
        };

        socketService.onMoveMade(handleMoveMade);
        socketService.onMoveError(handleMoveError);
        socketService.onRoomUpdated(handleRoomUpdated);
        socketService.onGameState(handleGameState);

        return () => {
            socketService.off('move_made', handleMoveMade);
            socketService.off('move_error', handleMoveError);
            socketService.off('room_updated', handleRoomUpdated);
            socketService.off('game_state', handleGameState);
        };
    }, [onGameOver, playerColor, room.id]);

    // Scroll move history to bottom when new moves arrive
    useEffect(() => {
        if (moveHistoryRef.current) {
            moveHistoryRef.current.scrollTop = moveHistoryRef.current.scrollHeight;
        }
    }, [moveHistory]);

    // Update captured pieces whenever move history changes
    useEffect(() => {
        const captured: { white: string[]; black: string[]; } = { white: [], black: [] };

        // Get captures from our move history state
        moveHistory.forEach(item => {
            if (item.move.captured) {
                const pieceSymbol = item.move.captured;
                // The captured piece belongs to the opponent of the player who made the move
                const color = item.playerColor === 'white' ? 'black' : 'white';
                captured[color].push(pieceSymbol);
            }
        });

        console.log('Updated captured pieces from move history:', captured, 'total moves:', moveHistory.length);
        setCapturedPieces(captured);
    }, [moveHistory]);

    function onDrop(sourceSquare: string, targetSquare: string) {
        if (!playerColor) {
            setMoveError('Player color not set!');
            setTimeout(() => setMoveError(''), 2000);
            return false;
        }

        // Use room.currentTurn as the source of truth for turn validation
        const roomTurn = room.currentTurn;

        // Validate turn - room state should match player color
        if (!roomTurn || roomTurn !== playerColor) {
            const turnMessage = roomTurn ? `Not your turn! It's ${roomTurn}'s turn.` : 'Turn not determined yet.';
            setMoveError(turnMessage);
            setTimeout(() => setMoveError(''), 2000);
            return false;
        }

        // Also check game state for consistency (but don't block if room says it's your turn)
        const currentTurn = game.turn() === 'w' ? 'white' : 'black';
        if (currentTurn !== playerColor) {
            console.warn('Game state and room state mismatch:', { currentTurn, roomTurn, playerColor });
            // Still allow the move if room says it's your turn - room state is authoritative
        }

        try {
            const move = game.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: 'q', // Always promote to queen for simplicity
            });

            if (move === null) {
                setMoveError('Invalid move!');
                setTimeout(() => setMoveError(''), 2000);
                return false;
            }

            const gameMove: GameMove = {
                from: sourceSquare,
                to: targetSquare,
            };

            socketService.makeMove(room.id, gameMove, playerAddress);
            setMoveError(''); // Clear error on successful move
            return true;
        } catch (error) {
            setMoveError('Invalid move!');
            setTimeout(() => setMoveError(''), 2000);
            return false;
        }
    }

    // Get player info
    const whitePlayer = room.players.find(p => p.color === 'white');
    const blackPlayer = room.players.find(p => p.color === 'black');

    if (!playerColor) {
        return <div className="chess-board-loading">Loading...</div>;
    }

    const boardOrientation = playerColor === 'white' ? 'white' : 'black';

    // Custom square styles for highlighting last move
    const customSquareStyles: Record<string, React.CSSProperties> = {};
    if (lastMove) {
        customSquareStyles[lastMove.from] = {
            background: 'rgba(255, 255, 0, 0.4)',
        };
        customSquareStyles[lastMove.to] = {
            background: 'rgba(255, 255, 0, 0.4)',
        };
    }

    // Get piece symbol for display
    const getPieceSymbol = (piece: string): string => {
        const symbols: Record<string, string> = {
            'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚',
            'P': '♙', 'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔'
        };
        return symbols[piece] || piece;
    };

    return (
        <div className="chess-board-container">
            <div className="chess-board-main">
                {/* Left Sidebar - Player Info & Captured Pieces */}
                <div className="chess-board-sidebar left">
                    <div className="player-info-card">
                        <h3>Players</h3>
                        <div className="player-info">
                            <div className={`player-badge ${whitePlayer?.address === playerAddress ? 'you' : ''}`}>
                                <span className="player-color white">⚪</span>
                                <div>
                                    <div className="player-name">
                                        {whitePlayer?.address === playerAddress ? 'You (White)' : 'White'}
                                    </div>
                                    <div className="player-address">
                                        {whitePlayer?.address.slice(0, 8)}...
                                    </div>
                                </div>
                            </div>
                            <div className={`player-badge ${blackPlayer?.address === playerAddress ? 'you' : ''}`}>
                                <span className="player-color black">⚫</span>
                                <div>
                                    <div className="player-name">
                                        {blackPlayer?.address === playerAddress ? 'You (Black)' : 'Black'}
                                    </div>
                                    <div className="player-address">
                                        {blackPlayer?.address.slice(0, 8)}...
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="captured-pieces-card">
                        <h3>Captured Pieces</h3>
                        <div className="captured-pieces">
                            <div className="captured-white">
                                <strong>White:</strong>
                                <div className="captured-list">
                                    {capturedPieces.white.map((piece, idx) => (
                                        <span key={idx} className="captured-piece">
                                            {getPieceSymbol(piece)}
                                        </span>
                                    ))}
                                    {capturedPieces.white.length === 0 && <span className="no-captures">None</span>}
                                </div>
                            </div>
                            <div className="captured-black">
                                <strong>Black:</strong>
                                <div className="captured-list">
                                    {capturedPieces.black.map((piece, idx) => (
                                        <span key={idx} className="captured-piece">
                                            {getPieceSymbol(piece)}
                                        </span>
                                    ))}
                                    {capturedPieces.black.length === 0 && <span className="no-captures">None</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="game-status-card">
                        <h3>Game Status</h3>
                        <div className="status-info">
                            <div className={`turn-indicator ${room.currentTurn === playerColor ? 'your-turn' : ''}`}>
                                {room.currentTurn === playerColor ? '✅ Your Turn' : '⏳ Waiting...'}
                            </div>
                            <div className="current-turn">
                                Current: {room.currentTurn === 'white' ? '⚪ White' : '⚫ Black'}
                            </div>
                            {playerColor && (
                                <div className="current-turn" style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                                    You are: {playerColor === 'white' ? '⚪ White' : '⚫ Black'}
                                </div>
                            )}
                            <div className="game-status">
                                Status: <span className={`status-${room.status}`}>{room.status}</span>
                            </div>
                            {room.status === 'finished' && room.winner && (
                                <div className="winner-announcement">
                                    {room.winner === 'draw' ? (
                                        <span className="draw">🤝 Draw!</span>
                                    ) : (
                                        <span className="winner">
                                            🏆 Winner: {room.winner === 'white' ? '⚪ White' : '⚫ Black'}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Center - Chess Board */}
                <div className="chess-board-center">
                    {moveError && (
                        <div className="move-error-banner">
                            ⚠️ {moveError}
                        </div>
                    )}
                    <div className="chess-board-wrapper">
                        <Chessboard
                            position={game.fen()}
                            onPieceDrop={onDrop}
                            boardOrientation={boardOrientation}
                            customSquareStyles={customSquareStyles}
                            customBoardStyle={{
                                borderRadius: '4px',
                                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                            }}
                            customDarkSquareStyle={{ backgroundColor: '#b58863' }}
                            customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
                        />
                    </div>
                    <div className="board-info">
                        <div className="room-info">
                            Room: <code>{room.id.slice(0, 8)}...</code>
                        </div>
                        <div className="entry-fee-info">
                            Entry Fee: {room.entryFee.toFixed(2)} {room.currency}
                        </div>
                    </div>
                </div>

                {/* Right Sidebar - Move History */}
                <div className="chess-board-sidebar right">
                    <div className="move-history-card">
                        <div className="move-history-header">
                            <h3>Move History</h3>
                            {moveHistory.length > 0 && (
                                <span className="move-count">{moveHistory.length} {moveHistory.length === 1 ? 'move' : 'moves'}</span>
                            )}
                        </div>
                        <div className="move-history" ref={moveHistoryRef}>
                            {moveHistory.length === 0 ? (
                                <div className="no-moves">
                                    <div className="no-moves-icon">♟️</div>
                                    <div>No moves yet</div>
                                    <div className="no-moves-hint">Moves will appear here as the game progresses</div>
                                </div>
                            ) : (
                                (() => {
                                    // Group moves into pairs (white + black)
                                    const groupedMoves: Array<{ white?: MoveHistoryItem; black?: MoveHistoryItem; moveNumber: number; }> = [];

                                    for (let i = 0; i < moveHistory.length; i += 2) {
                                        const whiteMove = moveHistory[i];
                                        const blackMove = moveHistory[i + 1];
                                        groupedMoves.push({
                                            white: whiteMove,
                                            black: blackMove,
                                            moveNumber: Math.floor(i / 2) + 1
                                        });
                                    }

                                    return groupedMoves.map((group, groupIdx) => {
                                        const isLastGroup = groupIdx === groupedMoves.length - 1;

                                        return (
                                            <div key={groupIdx} className="move-pair">
                                                <div className="move-pair-number">{group.moveNumber}.</div>
                                                <div className="move-pair-moves">
                                                    {/* White Move */}
                                                    {group.white && (() => {
                                                        const isPlayerMove = group.white.playerAddress === playerAddress;
                                                        const isLastMove = isLastGroup && !group.black;

                                                        // Check for check/checkmate
                                                        const tempGame = new Chess();
                                                        const movesUpToThis = moveHistory.slice(0, (groupIdx * 2) + 1);
                                                        let isCheck = false;
                                                        let isCheckmate = false;

                                                        try {
                                                            movesUpToThis.forEach(h => {
                                                                tempGame.move(h.move);
                                                            });
                                                            isCheck = tempGame.isCheck();
                                                            isCheckmate = tempGame.isCheckmate();
                                                        } catch (e) {
                                                            // Ignore errors
                                                        }

                                                        return (
                                                            <div
                                                                className={`move-item white-move ${isPlayerMove ? 'your-move' : ''} ${isLastMove ? 'last-move' : ''}`}
                                                            >
                                                                <div className="move-notation">
                                                                    <span className="move-text">{group.white.move.san}</span>
                                                                    {group.white.move.captured && (
                                                                        <span className="capture-indicator" title="Capture">×</span>
                                                                    )}
                                                                    {isCheckmate && (
                                                                        <span className="checkmate-indicator" title="Checkmate">#</span>
                                                                    )}
                                                                    {isCheck && !isCheckmate && (
                                                                        <span className="check-indicator" title="Check">+</span>
                                                                    )}
                                                                </div>
                                                                <div className="move-meta">
                                                                    <span className="move-time">{group.white.timestamp.toLocaleTimeString()}</span>
                                                                    {isPlayerMove && <span className="your-move-badge">You</span>}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* Black Move */}
                                                    {group.black && (() => {
                                                        const isPlayerMove = group.black.playerAddress === playerAddress;
                                                        const isLastMove = isLastGroup;

                                                        // Check for check/checkmate
                                                        const tempGame = new Chess();
                                                        const movesUpToThis = moveHistory.slice(0, (groupIdx * 2) + 2);
                                                        let isCheck = false;
                                                        let isCheckmate = false;

                                                        try {
                                                            movesUpToThis.forEach(h => {
                                                                tempGame.move(h.move);
                                                            });
                                                            isCheck = tempGame.isCheck();
                                                            isCheckmate = tempGame.isCheckmate();
                                                        } catch (e) {
                                                            // Ignore errors
                                                        }

                                                        return (
                                                            <div
                                                                className={`move-item black-move ${isPlayerMove ? 'your-move' : ''} ${isLastMove ? 'last-move' : ''}`}
                                                            >
                                                                <div className="move-notation">
                                                                    <span className="move-text">{group.black.move.san}</span>
                                                                    {group.black.move.captured && (
                                                                        <span className="capture-indicator" title="Capture">×</span>
                                                                    )}
                                                                    {isCheckmate && (
                                                                        <span className="checkmate-indicator" title="Checkmate">#</span>
                                                                    )}
                                                                    {isCheck && !isCheckmate && (
                                                                        <span className="check-indicator" title="Check">+</span>
                                                                    )}
                                                                </div>
                                                                <div className="move-meta">
                                                                    <span className="move-time">{group.black.timestamp.toLocaleTimeString()}</span>
                                                                    {isPlayerMove && <span className="your-move-badge">You</span>}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

