import { useEffect, useState } from 'react';
import type { Room } from '../types/game';
import { socketService } from '../services/socketService';

interface RoomListProps {
    playerAddress: string;
    onJoinRoom: (roomId: string) => void;
}

export default function RoomList({ onJoinRoom }: RoomListProps) {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        socketService.connect();
        socketService.getRooms();

        const handleRoomsList = (roomsList: Room[]) => {
            setRooms(roomsList);
            setLoading(false);
        };

        const handleRoomsUpdated = (roomsList: Room[]) => {
            setRooms(roomsList);
        };

        socketService.onRoomsList(handleRoomsList);
        socketService.onRoomsUpdated(handleRoomsUpdated);

        return () => {
            socketService.off('rooms_list', handleRoomsList);
            socketService.off('rooms_updated', handleRoomsUpdated);
        };
    }, []);

    if (loading) {
        return <div style={{ color: 'white', textAlign: 'center' }}>Loading rooms...</div>;
    }

    return (
        <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '10px',
            maxWidth: '600px',
            margin: '0 auto'
        }}>
            <h2 style={{ marginBottom: '20px', color: '#333' }}>Available Rooms</h2>
            {rooms.length === 0 ? (
                <p style={{ color: '#666', textAlign: 'center' }}>No available rooms. Create one to start!</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {rooms.map((room) => (
                        <div
                            key={room.id}
                            style={{
                                padding: '15px',
                                border: '1px solid #ddd',
                                borderRadius: '8px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <div>
                                <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                                    Room: {room.id.slice(0, 8)}...
                                </p>
                                <p style={{ color: '#666', fontSize: '14px' }}>
                                    Entry Fee: {room.entryFee.toFixed(2)} {room.currency} | Players: {room.players.length}/2
                                </p>
                            </div>
                            <button
                                onClick={() => onJoinRoom(room.id)}
                                disabled={room.players.length >= 2}
                                style={{
                                    padding: '10px 20px',
                                    background: room.players.length >= 2 ? '#ccc' : '#667eea',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: room.players.length >= 2 ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold',
                                }}
                            >
                                {room.players.length >= 2 ? 'Full' : 'Join'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

