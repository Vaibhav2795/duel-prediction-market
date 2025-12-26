import { useState } from 'react';
import { createMatch, type Match } from '../services/matchService';

interface CreateRoomProps {
    playerAddress: string;
    playerName: string;
    onRoomCreated: (match: Match) => void;
    onError?: (error: string) => void;
}

export default function CreateRoom({ playerAddress, playerName, onRoomCreated, onError }: CreateRoomProps) {
    const [entryFee, setEntryFee] = useState('');
    const [opponentWallet, setOpponentWallet] = useState('');
    const [opponentName, setOpponentName] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreateRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!entryFee || loading) return;

        const fee = parseFloat(entryFee);
        if (isNaN(fee) || fee <= 0) {
            onError?.('Please enter a valid entry fee');
            return;
        }

        if (!opponentWallet || !opponentName) {
            onError?.('Please enter opponent wallet address and name');
            return;
        }

        if (!scheduledAt) {
            onError?.('Please select a scheduled time');
            return;
        }

        setLoading(true);
        try {
            const matchResponse = await createMatch({
                player1: {
                    wallet: playerAddress,
                    name: playerName,
                },
                player2: {
                    wallet: opponentWallet,
                    name: opponentName,
                },
                scheduledAt: new Date(scheduledAt),
                stakeAmount: fee,
            });
            // Fetch full match details to get all required fields
            const { getMatchById } = await import('../services/matchService');
            const fullMatch = await getMatchById(matchResponse.id);
            onRoomCreated(fullMatch);
        } catch (error: any) {
            onError?.(error.message || 'Failed to create match');
        } finally {
            setLoading(false);
        }
    };

    // Set default scheduled time to 1 hour from now
    const defaultScheduledTime = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16);

    return (
        <div className="bg-dark-300 border border-border rounded-xl p-6 max-w-md mx-auto">
            <h2 className="text-xl font-bold text-text-primary mb-4">Create New Match</h2>
            <p className="text-text-secondary text-sm mb-6">
                Create a chess match with an opponent. Set the stake amount and scheduled time.
            </p>
            <form onSubmit={handleCreateRoom} className="space-y-4">
                <div>
                    <label className="block mb-2 text-sm font-medium text-text-secondary">
                        Stake Amount *
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={entryFee}
                        onChange={(e) => setEntryFee(e.target.value)}
                        placeholder="e.g., 10.00"
                        required
                        className="w-full px-4 py-3 bg-dark-200 border border-border rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent focus:shadow-input"
                    />
                </div>
                <div>
                    <label className="block mb-2 text-sm font-medium text-text-secondary">
                        Opponent Wallet Address *
                    </label>
                    <input
                        type="text"
                        value={opponentWallet}
                        onChange={(e) => setOpponentWallet(e.target.value)}
                        placeholder="0x..."
                        required
                        className="w-full px-4 py-3 bg-dark-200 border border-border rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent focus:shadow-input font-mono text-sm"
                    />
                </div>
                <div>
                    <label className="block mb-2 text-sm font-medium text-text-secondary">
                        Opponent Name *
                    </label>
                    <input
                        type="text"
                        value={opponentName}
                        onChange={(e) => setOpponentName(e.target.value)}
                        placeholder="Opponent's display name"
                        required
                        maxLength={50}
                        className="w-full px-4 py-3 bg-dark-200 border border-border rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent focus:shadow-input"
                    />
                </div>
                <div>
                    <label className="block mb-2 text-sm font-medium text-text-secondary">
                        Scheduled Time *
                    </label>
                    <input
                        type="datetime-local"
                        value={scheduledAt || defaultScheduledTime}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        required
                        className="w-full px-4 py-3 bg-dark-200 border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent focus:shadow-input"
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading || !entryFee || !opponentWallet || !opponentName}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${loading || !entryFee || !opponentWallet || !opponentName
                        ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                        : 'bg-accent hover:bg-accent-hover text-white cursor-pointer'
                    }`}
                >
                    {loading ? 'Creating Match...' : 'Create Match'}
                </button>
            </form>
        </div>
    );
}

