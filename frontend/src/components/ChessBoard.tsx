import { useEffect, useState, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess, Move } from 'chess.js';
import type { Room, GameMove } from '../types/game';
import { socketService } from '../services/socketService';

interface MoveHistoryItem {
    move: Move;
    timestamp: Date;
    playerColor: 'white' | 'black';
    playerAddress: string;
}

interface ChessBoardProps {
    room: Room | null;
    playerAddress: string;
    onGameOver?: (winner?: 'white' | 'black' | 'draw') => void;
}

export default function ChessBoard({ room, playerAddress, onGameOver }: ChessBoardProps) {
    // Guard clause: if room is not available, show loading
    if (!room) {
        return <div className="flex justify-center items-center h-96 text-lg text-gray-600">Loading room...</div>;
    }

    const [game, setGame] = useState(new Chess(room.gameState || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'));
    const [playerColor, setPlayerColor] = useState<'white' | 'black' | null>(null);
    const [moveHistory, setMoveHistory] = useState<MoveHistoryItem[]>([]);
    const [lastMove, setLastMove] = useState<{ from: string; to: string; } | null>(null);
    const [capturedPieces, setCapturedPieces] = useState<{ white: string[]; black: string[]; }>({ white: [], black: [] });
    const [moveError, setMoveError] = useState<string>('');
    const moveHistoryRef = useRef<HTMLDivElement>(null);
    const previousFenRef = useRef<string>(room.gameState || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    const isInitializedRef = useRef<boolean>(false);
    // Maintain a local game instance that tracks moves for history
    const historyGameRef = useRef<Chess>(new Chess());

    // Initialize player color and sync game state
    useEffect(() => {
        const player = room.players?.find(p => p.address === playerAddress);
        if (player) {
            setPlayerColor(player.color);
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
            if (!data.gameState) {
                console.warn('move_made event received without gameState');
                return;
            }

            const newGame = new Chess(data.gameState);
            setGame(newGame);
            previousFenRef.current = data.gameState;

            console.log('Move made event received:', {
                move: data.move,
                newTurn: data.room?.currentTurn,
                gameState: data.gameState.substring(0, 80)
            });

            // Apply the move to our history-tracking game instance
            // This allows us to get the full move object with SAN notation
            if (!data.room) {
                console.warn('move_made event received without room data');
                return;
            }

            if (!data.move) {
                console.warn('move_made event received without move data');
                return;
            }

            try {
                const moveObj = historyGameRef.current.move({
                    from: data.move.from,
                    to: data.move.to,
                    promotion: data.move.promotion as any
                });

                if (moveObj) {
                    const moveColor: 'white' | 'black' = moveObj.color === 'w' ? 'white' : 'black';
                    const player = data.room.players?.find(p => p.color === moveColor);

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
        if (!room) {
            return false;
        }
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

            if (!room) {
                setMoveError('Room not available');
                return false;
            }
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
    const whitePlayer = room.players?.find(p => p.color === 'white');
    const blackPlayer = room.players?.find(p => p.color === 'black');

    if (!playerColor) {
        return <div className="flex justify-center items-center h-96 text-lg text-gray-600">Loading...</div>;
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
        <div className="w-full max-w-[100vw] mx-auto p-2 sm:p-3 md:p-4 lg:p-5 xl:p-6 overflow-x-hidden">
            <div className="grid grid-cols-[minmax(200px,280px)_1fr_minmax(200px,280px)] gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6 bg-gray-100 rounded-xl p-2 sm:p-3 md:p-4 lg:p-5 xl:p-6 shadow-lg max-xl:grid-cols-[minmax(180px,260px)_1fr_minmax(180px,260px)] max-lg:grid-cols-[minmax(160px,220px)_1fr_minmax(160px,220px)] max-md:grid-cols-1 max-md:grid-rows-[auto_1fr_auto]">
                {/* Left Sidebar - Player Info & Captured Pieces */}
                <div className="flex flex-col gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6 min-w-0 max-md:order-2 max-md:grid max-md:grid-cols-2 max-md:gap-3 max-sm:grid-cols-1">
                    <div className="bg-white rounded-lg p-3 sm:p-4 md:p-5 shadow-md">
                        <h3 className="m-0 mb-3 sm:mb-4 text-base sm:text-lg font-semibold text-gray-800 border-b-2 border-indigo-500 pb-2">Players</h3>
                        <div className="flex flex-col gap-2.5 sm:gap-3 md:gap-3.5">
                            <div className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 md:p-3 rounded-md transition-all ${
                                whitePlayer?.address === playerAddress 
                                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md' 
                                    : 'bg-gray-50'
                            }`}>
                                <span className="text-2xl sm:text-3xl w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-white/20 flex-shrink-0">⚪</span>
                                <div className="min-w-0 flex-1">
                                    <div className={`font-semibold text-sm sm:text-base truncate ${whitePlayer?.address === playerAddress ? 'text-white' : 'text-gray-800'}`}>
                                        {whitePlayer?.address === playerAddress ? 'You (White)' : 'White'}
                                    </div>
                                    <div className={`text-xs sm:text-sm font-mono truncate ${whitePlayer?.address === playerAddress ? 'text-white/90' : 'text-gray-600'}`}>
                                        {whitePlayer?.address.slice(0, 8)}...
                                    </div>
                                </div>
                            </div>
                            <div className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 md:p-3 rounded-md transition-all ${
                                blackPlayer?.address === playerAddress 
                                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md' 
                                    : 'bg-gray-50'
                            }`}>
                                <span className="text-2xl sm:text-3xl w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-white/20 flex-shrink-0">⚫</span>
                                <div className="min-w-0 flex-1">
                                    <div className={`font-semibold text-sm sm:text-base truncate ${blackPlayer?.address === playerAddress ? 'text-white' : 'text-gray-800'}`}>
                                        {blackPlayer?.address === playerAddress ? 'You (Black)' : 'Black'}
                                    </div>
                                    <div className={`text-xs sm:text-sm font-mono truncate ${blackPlayer?.address === playerAddress ? 'text-white/90' : 'text-gray-600'}`}>
                                        {blackPlayer?.address.slice(0, 8)}...
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg p-3 sm:p-4 md:p-5 shadow-md">
                        <h3 className="m-0 mb-3 sm:mb-4 text-base sm:text-lg font-semibold text-gray-800 border-b-2 border-indigo-500 pb-2">Captured Pieces</h3>
                        <div className="flex flex-col gap-2 sm:gap-3">
                            <div className="flex flex-col gap-2 sm:gap-2.5">
                                <strong className="text-sm sm:text-base text-gray-700 flex items-center gap-2">
                                    <span className="text-lg">⚪</span> White:
                                </strong>
                                <div className="flex flex-wrap gap-1.5 sm:gap-2 min-h-6 sm:min-h-8 p-2 bg-gray-50 rounded-md border border-gray-200">
                                    {capturedPieces.white.map((piece, idx) => (
                                        <span key={idx} className="text-xl sm:text-2xl p-1.5 sm:p-2 bg-black border border-gray-300 rounded shadow-sm hover:shadow-md transition-shadow">
                                            {getPieceSymbol(piece)}
                                        </span>
                                    ))}
                                    {capturedPieces.white.length === 0 && <span className="text-gray-400 text-xs sm:text-sm italic">None captured</span>}
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 sm:gap-2.5">
                                <strong className="text-sm sm:text-base text-gray-700 flex items-center gap-2">
                                    <span className="text-lg">⚫</span> Black:
                                </strong>
                                <div className="flex flex-wrap gap-1.5 sm:gap-2 min-h-6 sm:min-h-8 p-2 bg-gray-50 rounded-md border border-gray-700">
                                    {capturedPieces.black.map((piece, idx) => (
                                        <span key={idx} className="text-xl sm:text-2xl p-1.5 sm:p-2 bg-gray-700 border border-gray-600 rounded shadow-sm hover:shadow-md transition-shadow">
                                            {getPieceSymbol(piece)}
                                        </span>
                                    ))}
                                    {capturedPieces.black.length === 0 && <span className="text-gray-500 text-xs sm:text-sm italic">None captured</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg p-3 sm:p-4 md:p-5 shadow-md">
                        <h3 className="m-0 mb-3 sm:mb-4 text-base sm:text-lg font-semibold text-gray-800 border-b-2 border-indigo-500 pb-2">Game Status</h3>
                        <div className="flex flex-col gap-2 sm:gap-2.5">
                            <div className={`p-2.5 sm:p-3 rounded-md text-center font-semibold text-sm sm:text-base ${
                                room.currentTurn === playerColor 
                                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white animate-pulse' 
                                    : 'bg-gray-100 text-gray-600'
                            }`}>
                                {room.currentTurn === playerColor ? '✅ Your Turn' : '⏳ Waiting...'}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600 p-2 sm:p-2.5 bg-gray-50 rounded">
                                Current: {room.currentTurn === 'white' ? '⚪ White' : '⚫ Black'}
                            </div>
                            {playerColor && (
                                <div className="text-xs text-gray-400 mt-1">
                                    You are: {playerColor === 'white' ? '⚪ White' : '⚫ Black'}
                                </div>
                            )}
                            <div className="text-xs sm:text-sm text-gray-600">
                                Status: <span className={`font-semibold ${
                                    room.status === 'waiting' ? 'text-orange-500' :
                                    room.status === 'active' ? 'text-green-500' :
                                    'text-red-500'
                                }`}>{room.status}</span>
                            </div>
                            {room.status === 'finished' && room.winner && (
                                <div className="mt-2 p-3 rounded-md text-center font-semibold">
                                    {room.winner === 'draw' ? (
                                        <span className="text-orange-500 text-base">🤝 Draw!</span>
                                    ) : (
                                        <span className="text-green-500 text-base">
                                            🏆 Winner: {room.winner === 'white' ? '⚪ White' : '⚫ Black'}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Center - Chess Board */}
                <div className="flex flex-col items-center gap-3 sm:gap-4 max-md:order-1 min-w-0 w-full">
                    {moveError && (
                        <div className="bg-red-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-md font-semibold text-sm sm:text-base shadow-lg animate-[slideDown_0.3s_ease-out] w-full max-w-md">
                            ⚠️ {moveError}
                        </div>
                    )}
                    <div className="w-full max-w-[min(700px,calc(100vw-600px))] aspect-square flex justify-center items-center max-xl:max-w-[min(600px,calc(100vw-540px))] max-lg:max-w-[min(500px,calc(100vw-460px))] max-md:max-w-[min(90vw,500px)] max-sm:max-w-[95vw]">
                        <Chessboard
                            position={game.fen()}
                            onPieceDrop={onDrop}
                            boardOrientation={boardOrientation}
                            customSquareStyles={customSquareStyles}
                            customBoardStyle={{
                                borderRadius: '8px',
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                                width: '100%',
                                height: '100%',
                            }}
                            customDarkSquareStyle={{ backgroundColor: '#b58863' }}
                            customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
                        />
                    </div>
                    <div className="flex gap-3 sm:gap-4 md:gap-6 text-xs sm:text-sm text-gray-600 bg-white px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 rounded-md shadow-md max-sm:flex-col max-sm:gap-2 max-sm:text-center w-full">
                        <div>
                            <span className="text-gray-500">Room:</span> <code className="font-mono text-indigo-500 font-semibold">{room.id ? room.id.slice(0, 8) : 'N/A'}...</code>
                        </div>
                        <div>
                            <span className="text-gray-500">Entry Fee:</span> <span className="font-mono text-indigo-500 font-semibold">{room.entryFee ? room.entryFee.toFixed(2) : '0.00'} {room.currency || 'USDC'}</span>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar - Move History */}
                <div className="flex flex-col gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6 min-w-0 max-md:order-3">
                    <div className="bg-white rounded-lg p-3 sm:p-4 md:p-5 shadow-md">
                        <div className="flex justify-between items-center mb-3 sm:mb-4 pb-2 border-b-2 border-indigo-500">
                            <h3 className="m-0 text-base sm:text-lg font-semibold text-gray-800">Move History</h3>
                            {moveHistory.length > 0 && (
                                <span className="text-xs text-indigo-500 bg-indigo-50 px-2 py-1 rounded-xl font-medium">
                                    {moveHistory.length} {moveHistory.length === 1 ? 'move' : 'moves'}
                                </span>
                            )}
                        </div>
                        <div className="max-h-[min(600px,calc(100vh-400px))] overflow-y-auto flex flex-col gap-1.5 sm:gap-2 pr-1 sm:pr-2 max-md:max-h-[min(300px,40vh)] [&::-webkit-scrollbar]:w-1.5 sm:[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb:hover]:bg-gray-500" ref={moveHistoryRef}>
                            {moveHistory.length === 0 ? (
                                <div className="text-center text-gray-400 py-10 px-5 flex flex-col items-center gap-3">
                                    <div className="text-5xl opacity-50">♟️</div>
                                    <div>No moves yet</div>
                                    <div className="text-xs text-gray-300 italic">Moves will appear here as the game progresses</div>
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
                                            <div key={groupIdx} className="flex gap-1.5 sm:gap-2 items-start p-1.5 sm:p-2 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                                                <div className="font-bold text-indigo-500 text-xs min-w-[24px] sm:min-w-[28px] pt-1.5 flex-shrink-0">{group.moveNumber}.</div>
                                                <div className="flex-1 flex flex-col gap-1 min-w-0">
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
                                                                className={`flex justify-between items-center px-2 sm:px-3 py-1.5 sm:py-2 rounded bg-white transition-all text-xs border-l-[3px] ${
                                                                    isLastMove 
                                                                        ? 'bg-gradient-to-r from-yellow-100 to-orange-100 border-l-yellow-400 shadow-md animate-[highlightMove_0.5s_ease-out]' 
                                                                        : isPlayerMove
                                                                        ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-l-indigo-500 shadow-sm'
                                                                        : 'border-l-gray-300'
                                                                } hover:bg-gray-50 hover:translate-x-0.5`}
                                                            >
                                                                <div className="flex items-center gap-1 sm:gap-1.5 flex-1 min-w-0">
                                                                    <span className="font-mono font-semibold text-gray-800 tracking-wide truncate">{group.white.move.san}</span>
                                                                    {group.white.move.captured && (
                                                                        <span className="font-bold text-sm sm:text-base text-red-500 leading-none flex-shrink-0" title="Capture">×</span>
                                                                    )}
                                                                    {isCheckmate && (
                                                                        <span className="font-bold text-xs sm:text-sm text-green-500 leading-none flex-shrink-0" title="Checkmate">#</span>
                                                                    )}
                                                                    {isCheck && !isCheckmate && (
                                                                        <span className="font-bold text-[10px] sm:text-xs text-orange-500 leading-none flex-shrink-0" title="Check">+</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                                                                    <span className="text-[9px] sm:text-[11px] text-gray-400 whitespace-nowrap hidden sm:inline">{group.white.timestamp.toLocaleTimeString()}</span>
                                                                    {isPlayerMove && <span className="text-[8px] sm:text-[10px] text-indigo-500 bg-indigo-50 px-1 sm:px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide">You</span>}
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
                                                                className={`flex justify-between items-center px-2 sm:px-3 py-1.5 sm:py-2 rounded transition-all text-xs border-l-[3px] ${
                                                                    isLastMove 
                                                                        ? 'bg-gradient-to-r from-yellow-100 to-orange-100 border-l-yellow-400 shadow-md animate-[highlightMove_0.5s_ease-out]' 
                                                                        : isPlayerMove
                                                                        ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-l-indigo-500 shadow-sm'
                                                                        : 'bg-gray-50 border-l-gray-700'
                                                                } hover:bg-gray-100 hover:translate-x-0.5`}
                                                            >
                                                                <div className="flex items-center gap-1 sm:gap-1.5 flex-1 min-w-0">
                                                                    <span className="font-mono font-bold text-gray-900 tracking-wide truncate">{group.black.move.san}</span>
                                                                    {group.black.move.captured && (
                                                                        <span className="font-bold text-sm sm:text-base text-red-500 leading-none flex-shrink-0" title="Capture">×</span>
                                                                    )}
                                                                    {isCheckmate && (
                                                                        <span className="font-bold text-xs sm:text-sm text-green-500 leading-none flex-shrink-0" title="Checkmate">#</span>
                                                                    )}
                                                                    {isCheck && !isCheckmate && (
                                                                        <span className="font-bold text-[10px] sm:text-xs text-orange-500 leading-none flex-shrink-0" title="Check">+</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                                                                    <span className="text-[9px] sm:text-[11px] text-gray-400 whitespace-nowrap hidden sm:inline">{group.black.timestamp.toLocaleTimeString()}</span>
                                                                    {isPlayerMove && <span className="text-[8px] sm:text-[10px] text-indigo-500 bg-indigo-50 px-1 sm:px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide">You</span>}
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

