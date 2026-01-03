import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listMatches, type Match } from '../services/matchService';

interface RoomListProps {
    playerAddress: string;
    onJoinMatch: (matchId: string, stakeAmount: number) => void;
}

export default function RoomList({ playerAddress, onJoinMatch }: RoomListProps) {
    const navigate = useNavigate();
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const fetchMatches = async () => {
            try {
                setLoading(true);
                const response = await listMatches("SCHEDULED", 1, 20);
                setMatches(response.data);
                setError('');
            } catch (err: any) {
                setError(err.message || 'Failed to load matches');
                setMatches([]);
            } finally {
                setLoading(false);
            }
        };

        fetchMatches();
        // Refresh every 30 seconds (reduced from 10 seconds to reduce API calls)
        const interval = setInterval(fetchMatches, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-text-secondary">Loading matches...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-500/20 border border-red-500/30 text-red-400 p-4 rounded-lg">
                <p className="font-semibold">Error loading matches</p>
                <p className="text-sm">{error}</p>
            </div>
        );
    }

    return (
        <div className="card max-w-2xl mx-auto">
            <h2 className="mb-5 text-text-primary text-xl font-semibold">Available Matches</h2>
            {matches.length === 0 ? (
                <p className="text-text-secondary text-center py-8">No scheduled matches. Create one to start!</p>
            ) : (
                    <div className="flex flex-col gap-3">
                        {matches.map((match) => {
                            const isPlayer1 = match.player1.wallet.toLowerCase() === playerAddress.toLowerCase();
                            const isPlayer2 = match.player2.wallet.toLowerCase() === playerAddress.toLowerCase();
                            const canJoin = isPlayer1 || isPlayer2;
                            const isFull = match.status === "LIVE";

                            return (
                                <div
                                key={match.id}
                                className="p-4 bg-dark-200 border border-border rounded-lg hover:bg-dark-100 hover:border-border-secondary transition-all"
                            >
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-text-primary mb-2 text-lg">
                                            {match.player1.name} vs {match.player2.name}
                                        </p>
                                        <div className="space-y-1">
                                            <p className="text-text-secondary text-sm">
                                                <span className="font-medium">Stake:</span> ${match.stakeAmount.toFixed(2)}
                                            </p>
                                            <p className="text-text-tertiary text-xs">
                                                <span className="font-medium">Scheduled:</span> {new Date(match.scheduledAt).toLocaleString()}
                                            </p>
                                            <p className="text-text-tertiary text-xs">
                                                <span className="font-medium">Status:</span> <span className="uppercase">{match.status}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        {canJoin && !isFull && (
                                            <button
                                                onClick={() => onJoinMatch(match.id, match.stakeAmount)}
                                                className="btn btn-primary px-4 py-2 text-sm whitespace-nowrap"
                                            >
                                                Join Match
                                            </button>
                                        )}
                                        {isFull && (
                                            <button
                                                onClick={() => navigate(`/match/${match.id}`)}
                                                className="btn px-4 py-2 text-sm whitespace-nowrap bg-purple-500 hover:bg-purple-600 text-white border-none"
                                            >
                                                View / Spectate
                                            </button>
                                        )}
                                        {!canJoin && !isFull && (
                                            <span className="px-4 py-2 text-text-tertiary border border-border rounded-lg text-sm bg-dark-300 whitespace-nowrap">
                                                Not Assigned
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

