import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import ChessBoard from './components/ChessBoard';
import RoomList from './components/RoomList';
import CreateRoom from './components/CreateRoom';
import { socketService } from './services/socketService';
import type { Room } from './types/game';
import './App.css';

type View = 'lobby' | 'game';

function App() {
    const { ready, authenticated, user, login, logout } = usePrivy();
    const [view, setView] = useState<View>('lobby');
    const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
    const [playerAddress, setPlayerAddress] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [showCreateRoom, setShowCreateRoom] = useState(false);

    // Get wallet address from Privy
    useEffect(() => {
        if (ready && authenticated && user) {
            // Get the wallet address from Privy user
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
    }, [ready, authenticated, user]);

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
            <div className="app">
                <div className="container">
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '50px', 
                        color: 'white',
                        fontSize: '18px'
                    }}>
                        Loading...
                    </div>
                </div>
            </div>
        );
    }

    // Show login screen if not authenticated
    if (!authenticated) {
        return (
            <div className="app">
                <div className="container">
                    <header className="header">
                        <h1>♟️ Chess Duel Platform</h1>
                        <p style={{ color: 'white', marginTop: '20px', marginBottom: '30px' }}>
                            Connect your wallet to start playing
                        </p>
                        <button
                            onClick={login}
                            style={{
                                padding: '15px 30px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '16px',
                                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                            }}
                        >
                            Connect Wallet
                        </button>
                    </header>
                </div>
            </div>
        );
    }

    return (
        <div className="app">
            <div className="container">
                <header className="header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <div>
                            <h1>♟️ Chess Duel Platform</h1>
                            <p style={{ color: 'white', marginTop: '10px' }}>
                                {user?.wallet?.address 
                                    ? `Wallet: ${user.wallet.address.slice(0, 6)}...${user.wallet.address.slice(-4)}`
                                    : `User: ${playerAddress.slice(0, 10)}...`}
                            </p>
                        </div>
                        <button
                            onClick={logout}
                            style={{
                                padding: '10px 20px',
                                background: 'rgba(255, 255, 255, 0.2)',
                                color: 'white',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '14px',
                            }}
                        >
                            Disconnect
                        </button>
                    </div>
                </header>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                {view === 'lobby' && playerAddress && (
                    <div className="lobby">
                        <div style={{ marginBottom: '30px', textAlign: 'center' }}>
                            <button
                                onClick={() => setShowCreateRoom(!showCreateRoom)}
                                style={{
                                    padding: '12px 24px',
                                    background: showCreateRoom ? '#764ba2' : '#667eea',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '16px',
                                    marginRight: '10px',
                                }}
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
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '50px', 
                        color: 'white',
                        fontSize: '18px'
                    }}>
                        Connecting wallet...
                    </div>
                )}

                {view === 'game' && currentRoom && playerAddress && (
                    <div className="game">
                        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                            <button
                                onClick={handleBackToLobby}
                                style={{
                                    padding: '10px 20px',
                                    background: '#764ba2',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                }}
                            >
                                ← Back to Lobby
                            </button>
                        </div>
                        <div style={{
                            background: 'white',
                            padding: '20px',
                            borderRadius: '10px',
                            marginBottom: '20px',
                            textAlign: 'center'
                        }}>
                            <h2>Room: {currentRoom.id.slice(0, 8)}...</h2>
                            <p>Entry Fee: {currentRoom.entryFee.toFixed(2)} {currentRoom.currency}</p>
                            <p>Status: {currentRoom.status}</p>
                            <p>Players: {currentRoom.players.length}/2</p>
                        </div>
                        {currentRoom.players.length === 2 && currentRoom.status === 'active' ? (
                            <ChessBoard
                                room={currentRoom}
                                playerAddress={playerAddress}
                                onGameOver={handleGameOver}
                            />
                        ) : (
                            <div style={{
                                background: 'white',
                                padding: '40px',
                                borderRadius: '10px',
                                textAlign: 'center'
                            }}>
                                <p style={{ fontSize: '18px', color: '#666' }}>
                                    Waiting for opponent to join...
                                </p>
                                <p style={{ marginTop: '10px', color: '#999' }}>
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

