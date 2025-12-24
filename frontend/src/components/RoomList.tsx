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
        return <div className="text-white text-center">Loading rooms...</div>;
    }

    return (
        <div className="bg-white p-5 rounded-xl max-w-2xl mx-auto">
            <h2 className="mb-5 text-gray-800 text-xl font-semibold">Available Rooms</h2>
            {rooms.length === 0 ? (
                <p className="text-gray-600 text-center">No available rooms. Create one to start!</p>
            ) : (
                <div className="flex flex-col gap-2.5">
                    {rooms.map((room) => (
                        <div
                            key={room.id}
                            className="p-4 border border-gray-300 rounded-lg flex justify-between items-center hover:shadow-md transition-shadow"
                        >
                            <div>
                                <p className="font-bold mb-1 text-gray-800">
                                    Room: {room.id.slice(0, 8)}...
                                </p>
                                <p className="text-gray-600 text-sm">
                                    Entry Fee: {room.entryFee.toFixed(2)} {room.currency} | Players: {room.players.length}/2
                                </p>
                            </div>
                            <button
                                onClick={() => onJoinRoom(room.id)}
                                disabled={room.players.length >= 2}
                                className={`px-5 py-2.5 text-white border-none rounded-md font-bold transition-colors ${
                                    room.players.length >= 2 
                                        ? 'bg-gray-400 cursor-not-allowed' 
                                        : 'bg-indigo-500 cursor-pointer hover:bg-indigo-600'
                                }`}
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

