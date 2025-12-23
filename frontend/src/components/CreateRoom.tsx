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
        <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '10px',
            maxWidth: '400px',
            margin: '0 auto'
        }}>
            <h2 style={{ marginBottom: '20px', color: '#333' }}>Create New Room</h2>
            <form onSubmit={handleCreateRoom}>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', color: '#666' }}>
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
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '5px',
                            fontSize: '14px',
                        }}
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', color: '#666' }}>
                        Currency:
                    </label>
                    <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '5px',
                            fontSize: '14px',
                        }}
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
                    style={{
                        width: '100%',
                        padding: '12px',
                        background: loading ? '#ccc' : '#667eea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        fontSize: '16px',
                    }}
                >
                    {loading ? 'Creating...' : 'Create Room'}
                </button>
            </form>
        </div>
    );
}

