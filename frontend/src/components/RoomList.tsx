// RoomList.tsx - Optimized
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listMatches, type Match } from '../services/matchService'

interface RoomListProps {
  playerAddress: string
  onJoinMatch: (matchId: string, stakeAmount: number) => void
}

const REFRESH_INTERVAL = 30000

// Memoized match card component
const MatchCard = ({ 
  match, 
  playerAddressLower, 
  onJoinMatch, 
  onNavigate 
}: {
  match: Match
  playerAddressLower: string
  onJoinMatch: (id: string, stake: number) => void
  onNavigate: (path: string) => void
}) => {
  const isAssigned = match.player1.wallet.toLowerCase() === playerAddressLower || 
                     match.player2.wallet.toLowerCase() === playerAddressLower
  const isLive = match.status === "LIVE"
  const isScheduled = match.status === "SCHEDULED"
  const canSpectate = isLive || match.status === "FINISHED"

  return (
    <div className="p-4 bg-dark-200 border border-border rounded-lg hover:bg-dark-100 hover:border-border-secondary transition-all">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-text-primary mb-2 text-lg">
            {match.player1.name} vs {match.player2.name}
          </p>
          <div className="space-y-1 text-sm">
            <p className="text-text-secondary">
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
          {isAssigned && isLive && (
            <button
              onClick={() => onJoinMatch(match.id, match.stakeAmount)}
              className="btn btn-primary px-4 py-2 text-sm whitespace-nowrap"
            >
              Join Match
            </button>
          )}
          {canSpectate && (
            <button
              onClick={() => onNavigate(`/match/${match.id}`)}
              className="btn px-4 py-2 text-sm whitespace-nowrap bg-purple-500 hover:bg-purple-600 text-white border-none"
            >
              View / Spectate
            </button>
          )}
          {isScheduled && (
            <button
              onClick={() => onNavigate(`/match/${match.id}`)}
              className="btn btn-secondary px-4 py-2 text-sm whitespace-nowrap"
            >
              View Details
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RoomList({ playerAddress, onJoinMatch }: RoomListProps) {
  const navigate = useNavigate()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const playerAddressLower = useMemo(() => playerAddress.toLowerCase(), [playerAddress])

  const fetchMatches = useCallback(async () => {
    try {
      const [scheduled, live] = await Promise.all([
        listMatches("SCHEDULED", 1, 20),
        listMatches("LIVE", 1, 20),
      ])
      
      // Use Map for O(1) deduplication
      const matchMap = new Map<string, Match>()
      ;[...scheduled.data, ...live.data].forEach(m => matchMap.set(m.id, m))
      
      // Filter user's matches
      const userMatches = Array.from(matchMap.values()).filter(m => 
        m.player1.wallet.toLowerCase() === playerAddressLower ||
        m.player2.wallet.toLowerCase() === playerAddressLower
      )
      
      setMatches(userMatches)
      setError('')
    } catch (err: any) {
      setError(err.message || 'Failed to load matches')
      setMatches([])
    } finally {
      setLoading(false)
    }
  }, [playerAddressLower])

  useEffect(() => {
    setLoading(true)
    fetchMatches()
    const interval = setInterval(fetchMatches, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchMatches])

  const handleNavigate = useCallback((path: string) => navigate(path), [navigate])

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-text-secondary">Loading matches...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/20 border border-red-500/30 text-red-400 p-4 rounded-lg">
        <p className="font-semibold">Error loading matches</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="card max-w-2xl mx-auto">
      <h2 className="mb-5 text-text-primary text-xl font-semibold">Your Matches</h2>
      {matches.length === 0 ? (
        <p className="text-text-secondary text-center py-8">No matches found. Create one to start!</p>
      ) : (
        <div className="flex flex-col gap-3">
          {matches.map(match => (
            <MatchCard
              key={match.id}
              match={match}
              playerAddressLower={playerAddressLower}
              onJoinMatch={onJoinMatch}
              onNavigate={handleNavigate}
            />
          ))}
        </div>
      )}
    </div>
  )
}
