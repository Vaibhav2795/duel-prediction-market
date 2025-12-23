import { useState, useEffect } from 'react';
import ChessBoard from './components/ChessBoard';
import RoomList from './components/RoomList';
import CreateRoom from './components/CreateRoom';
import { socketService } from './services/socketService';
import type { Room } from './types/game';
import './App.css';

type View = 'lobby' | 'game';

function App() {
    const [view, setView] = useState<View>('lobby');
    const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
    const [playerAddress, setPlayerAddress] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [showCreateRoom, setShowCreateRoom] = useState(false);

    useEffect(() => {
        // Initialize socket connection
        socketService.connect();

        // Set a default player address (in production, this would come from wallet connection)
        const defaultAddress = localStorage.getItem('playerAddress') || `player_${Date.now()}`;
        setPlayerAddress(defaultAddress);
        localStorage.setItem('playerAddress', defaultAddress);

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
        socketService.onError(handleError);
        socketService.onJoinRoomError(handleJoinRoomError);
        socketService.onPlayerLeft(handlePlayerLeft);

        return () => {
            socketService.off('room_joined', handleRoomJoined);
            socketService.off('room_updated', handleRoomUpdated);
            socketService.off('error', handleError);
            socketService.off('join_room_error', handleJoinRoomError);
            socketService.off('player_left', handlePlayerLeft);
        };
    }, []);

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

    return (
        <div className="app">
            <div className="container">
                <header className="header">
                    <h1>♟️ Chess Duel Platform</h1>
                    <p style={{ color: 'white', marginTop: '10px' }}>
                        Player: {playerAddress.slice(0, 10)}...
                    </p>
                </header>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                {view === 'lobby' && (
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

                {view === 'game' && currentRoom && (
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

