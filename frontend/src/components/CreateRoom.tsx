import { useState, useEffect } from 'react';
import { socketService } from '../services/socketService';
import type { Room } from '../types/game';

interface CreateRoomProps {
    playerAddress: string;
    onRoomCreated: (room: Room) => void;
}

export default function CreateRoom({ playerAddress, onRoomCreated }: CreateRoomProps) {
    const [entryFee, setEntryFee] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const handleRoomCreated = (room: Room) => {
            onRoomCreated(room);
            setLoading(false);
        };

        socketService.onRoomCreated(handleRoomCreated);

        return () => {
            socketService.off('room_created', handleRoomCreated);
        };
    }, [onRoomCreated]);

    const handleCreateRoom = (e: React.FormEvent) => {
        e.preventDefault();
        if (!entryFee || loading) return;

        const fee = parseFloat(entryFee);
        if (isNaN(fee) || fee <= 0) {
            alert('Please enter a valid entry fee');
            return;
        }

        setLoading(true);
        socketService.createRoom(fee, playerAddress, currency);
    };

    return (
        <div className="bg-white p-5 rounded-xl max-w-md mx-auto">
            <h2 className="mb-5 text-gray-800 text-xl font-semibold">Create New Room</h2>
            <form onSubmit={handleCreateRoom}>
                <div className="mb-4">
                    <label className="block mb-1 text-gray-600">
                        Entry Fee (USD):
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={entryFee}
                        onChange={(e) => setEntryFee(e.target.value)}
                        placeholder="e.g., 10.00"
                        required
                        className="w-full p-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div className="mb-4">
                    <label className="block mb-1 text-gray-600">
                        Currency:
                    </label>
                    <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full p-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="USD">USD</option>
                        <option value="USDC">USDC</option>
                        <option value="USDT">USDT</option>
                        <option value="DAI">DAI</option>
                    </select>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 text-white border-none rounded-md font-bold text-base transition-colors ${
                        loading 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-indigo-500 cursor-pointer hover:bg-indigo-600'
                    }`}
                >
                    {loading ? 'Creating...' : 'Create Room'}
                </button>
            </form>
        </div>
    );
}

