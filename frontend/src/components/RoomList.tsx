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
        // Refresh every 10 seconds
        const interval = setInterval(fetchMatches, 10000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading matches...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                <p className="font-semibold">Error loading matches</p>
                <p className="text-sm">{error}</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-5 rounded-xl max-w-2xl mx-auto">
            <h2 className="mb-5 text-gray-800 text-xl font-semibold">Available Matches</h2>
            {matches.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No scheduled matches. Create one to start!</p>
            ) : (
                <div className="flex flex-col gap-2.5">
                        {matches.map((match) => {
                            const isPlayer1 = match.player1.wallet.toLowerCase() === playerAddress.toLowerCase();
                            const isPlayer2 = match.player2.wallet.toLowerCase() === playerAddress.toLowerCase();
                            const canJoin = isPlayer1 || isPlayer2;
                            const isFull = match.status === "LIVE";

                            return (
                                <div
                                key={match.id}
                                className="p-4 border border-gray-300 rounded-lg hover:shadow-md transition-shadow"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-800 mb-1">
                                            {match.player1.name} vs {match.player2.name}
                                        </p>
                                        <p className="text-gray-600 text-sm mb-1">
                                            Stake: ${match.stakeAmount.toFixed(2)}
                                        </p>
                                        <p className="text-gray-500 text-xs">
                                            Scheduled: {new Date(match.scheduledAt).toLocaleString()}
                                        </p>
                                        <p className="text-gray-500 text-xs">
                                            Status: {match.status}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        {canJoin && !isFull && (
                                            <button
                                                onClick={() => onJoinMatch(match.id, match.stakeAmount)}
                                                className="px-5 py-2.5 text-white border-none rounded-md font-bold transition-colors text-sm bg-indigo-500 cursor-pointer hover:bg-indigo-600"
                                            >
                                                Join Match
                                            </button>
                                        )}
                                        {isFull && (
                                            <button
                                                onClick={() => navigate(`/match/${match.id}`)}
                                                className="px-5 py-2.5 text-white border-none rounded-md font-bold transition-colors text-sm bg-purple-500 cursor-pointer hover:bg-purple-600"
                                            >
                                                View / Spectate
                                            </button>
                                        )}
                                        {!canJoin && !isFull && (
                                            <span className="px-5 py-2.5 text-gray-600 border border-gray-300 rounded-md text-sm bg-gray-100">
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

