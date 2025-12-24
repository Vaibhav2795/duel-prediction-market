import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import ChessBoard from './components/ChessBoard';
import RoomList from './components/RoomList';
import CreateRoom from './components/CreateRoom';
import { socketService } from './services/socketService';
import { useMovementWallet } from './hooks/useMovementWallet';
import type { Room } from './types/game';

type View = 'lobby' | 'game';

function App() {
    const { ready, authenticated, user, login, logout } = usePrivy();
    const { movementWallet, isMovementWallet, getAddress: getMovementAddress } = useMovementWallet();
    const [view, setView] = useState<View>('lobby');
    const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
    const [playerAddress, setPlayerAddress] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [showCreateRoom, setShowCreateRoom] = useState(false);

    // Get wallet address from Privy
    // Support both regular wallets and Movement chain wallets
    useEffect(() => {
        if (ready && authenticated && user) {
            // Check if this is a Movement wallet first
            if (isMovementWallet && movementWallet) {
                const address = getMovementAddress();
                if (address) {
                    setPlayerAddress(address);
                    return;
                }
            }
            
            // Fallback to regular wallet address
            const wallet = user.wallet;
            if (wallet?.address) {
                setPlayerAddress(wallet.address);
            } else {
                // Fallback to user ID if no wallet
                setPlayerAddress(user.id || '');
            }
        } else if (ready && !authenticated) {
            setPlayerAddress('');
        }
    }, [ready, authenticated, user, isMovementWallet, movementWallet, getMovementAddress]);

    useEffect(() => {
        // Initialize socket connection only when authenticated
        if (ready && authenticated && playerAddress) {
            socketService.connect();
        }

        // Handle room joined
        const handleRoomJoined = (room: Room) => {
            setCurrentRoom(room);
            setView('game');
            setError('');
        };

        // Handle room updated
        const handleRoomUpdated = (room: Room) => {
            setCurrentRoom(room);
        };

        // Handle move made - update room state when moves are made
        const handleMoveMade = (data: {
            move: any;
            gameState: string;
            room: Room;
            isGameOver?: boolean;
            winner?: 'white' | 'black' | 'draw';
        }) => {
            // Update the room state with the new turn and game state
            setCurrentRoom(prevRoom => {
                if (prevRoom && data.room.id === prevRoom.id) {
                    console.log('Updating room state after move:', {
                        oldTurn: prevRoom.currentTurn,
                        newTurn: data.room.currentTurn,
                        roomId: data.room.id
                    });
                    return data.room;
                }
                return prevRoom;
            });
        };

        // Handle errors
        const handleError = (err: { message: string; }) => {
            setError(err.message);
        };

        const handleJoinRoomError = (err: { message: string; }) => {
            setError(err.message);
        };

        const handlePlayerLeft = () => {
            setError('Other player left the game');
            setTimeout(() => {
                setView('lobby');
                setCurrentRoom(null);
            }, 3000);
        };

        socketService.onRoomJoined(handleRoomJoined);
        socketService.onRoomUpdated(handleRoomUpdated);
        socketService.onMoveMade(handleMoveMade);
        socketService.onError(handleError);
        socketService.onJoinRoomError(handleJoinRoomError);
        socketService.onPlayerLeft(handlePlayerLeft);

        return () => {
            socketService.off('room_joined', handleRoomJoined);
            socketService.off('room_updated', handleRoomUpdated);
            socketService.off('move_made', handleMoveMade);
            socketService.off('error', handleError);
            socketService.off('join_room_error', handleJoinRoomError);
            socketService.off('player_left', handlePlayerLeft);
        };
    }, [ready, authenticated, playerAddress]);

    const handleCreateRoom = (room: Room) => {
        setCurrentRoom(room);
        setView('game');
        setShowCreateRoom(false);
        setError('');
    };

    const handleJoinRoom = (roomId: string) => {
        socketService.joinRoom(roomId, playerAddress);
    };

    const handleBackToLobby = () => {
        setView('lobby');
        setCurrentRoom(null);
        setError('');
    };

    const handleGameOver = (winner?: 'white' | 'black' | 'draw') => {
        // Game over logic can be extended here
        console.log('Game over! Winner:', winner);
    };

    // Show loading state while Privy initializes
    if (!ready) {
        return (
            <div className="min-h-screen flex justify-center items-start p-5">
                <div className="w-full max-w-6xl">
                    <div className="text-center py-12 text-white text-lg">
                        Loading...
                    </div>
                </div>
            </div>
        );
    }

    // Show login screen if not authenticated
    if (!authenticated) {
        return (
            <div className="min-h-screen flex justify-center items-start p-5">
                <div className="w-full max-w-6xl">
                    <header className="text-center mb-8 text-white">
                        <h1 className="text-4xl mb-2 drop-shadow-lg">♟️ Chess Duel Platform</h1>
                        <p className="text-white mt-5 mb-8">
                            Connect your wallet to start playing
                        </p>
                        <button
                            onClick={login}
                            className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-none rounded-lg cursor-pointer font-bold text-base shadow-lg hover:shadow-xl transition-shadow"
                        >
                            Connect Wallet
                        </button>
                    </header>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex justify-center items-start p-5">
            <div className="w-full max-w-6xl">
                <header className="text-center mb-8 text-white">
                    <div className="flex justify-between items-center w-full">
                        <div>
                            <h1 className="text-4xl mb-2 drop-shadow-lg">♟️ Chess Duel Platform</h1>
                            <p className="text-white mt-2">
                                {user?.wallet?.address 
                                    ? `Wallet: ${user.wallet.address.slice(0, 6)}...${user.wallet.address.slice(-4)}`
                                    : `User: ${playerAddress.slice(0, 10)}...`}
                            </p>
                        </div>
                        <button
                            onClick={logout}
                            className="px-5 py-2 bg-white/20 text-white border border-white/30 rounded-lg cursor-pointer font-semibold text-sm hover:bg-white/30 transition-colors"
                        >
                            Disconnect
                        </button>
                    </div>
                </header>

                {error && (
                    <div className="bg-red-500 text-white p-4 rounded-lg mb-5 text-center font-bold">
                        {error}
                    </div>
                )}

                {view === 'lobby' && playerAddress && (
                    <div className="flex flex-col gap-5">
                        <div className="mb-8 text-center">
                            <button
                                onClick={() => setShowCreateRoom(!showCreateRoom)}
                                className={`px-6 py-3 text-white border-none rounded-lg cursor-pointer font-bold text-base mr-2 ${
                                    showCreateRoom ? 'bg-purple-600' : 'bg-indigo-500'
                                } hover:opacity-90 transition-opacity`}
                            >
                                {showCreateRoom ? 'Cancel' : 'Create Room'}
                            </button>
                        </div>

                        {showCreateRoom ? (
                            <CreateRoom
                                playerAddress={playerAddress}
                                onRoomCreated={handleCreateRoom}
                            />
                        ) : (
                            <RoomList
                                playerAddress={playerAddress}
                                onJoinRoom={handleJoinRoom}
                            />
                        )}
                    </div>
                )}

                {view === 'lobby' && !playerAddress && (
                    <div className="text-center py-12 text-white text-lg">
                        Connecting wallet...
                    </div>
                )}

                {view === 'game' && currentRoom && playerAddress && (
                    <div className="flex flex-col items-center">
                        <div className="mb-5 text-center">
                            <button
                                onClick={handleBackToLobby}
                                className="px-5 py-2 bg-purple-600 text-white border-none rounded cursor-pointer font-bold hover:bg-purple-700 transition-colors"
                            >
                                ← Back to Lobby
                            </button>
                        </div>
                        <div className="bg-white p-5 rounded-xl mb-5 text-center">
                            <h2 className="text-2xl font-bold mb-2">Room: {currentRoom.id.slice(0, 8)}...</h2>
                            <p className="text-gray-700">Entry Fee: {currentRoom.entryFee.toFixed(2)} {currentRoom.currency}</p>
                            <p className="text-gray-700">Status: {currentRoom.status}</p>
                            <p className="text-gray-700">Players: {currentRoom.players.length}/2</p>
                        </div>
                        {currentRoom.players.length === 2 && currentRoom.status === 'active' ? (
                            <ChessBoard
                                room={currentRoom}
                                playerAddress={playerAddress}
                                onGameOver={handleGameOver}
                            />
                        ) : (
                            <div className="bg-white p-10 rounded-xl text-center">
                                <p className="text-lg text-gray-600">
                                    Waiting for opponent to join...
                                </p>
                                <p className="mt-2 text-gray-400">
                                    {currentRoom.players.length}/2 players
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;

