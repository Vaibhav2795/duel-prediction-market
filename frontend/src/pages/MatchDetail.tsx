// MatchDetail.tsx - Optimized
import { useState, useEffect, useMemo, useCallback } from 'react'
import { getMatchById, type Match } from '../services/matchService'
import { MatchMoveHistory } from '../components/MatchMoveHistory'
import { SpectatorView } from '../components/SpectatorView'
import { PageContainer } from '../components/Layout'
import { formatCurrency, formatAddress } from '../styles/designTokens'
import { Chessboard } from 'react-chessboard'

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const BOARD_STYLE = {
  dark: { backgroundColor: "#1a1a1a" },
  light: { backgroundColor: "#2a2a2a" }
}

interface MatchDetailPageProps {
  matchId: string
  playerAddress?: string
  onBack: () => void
  onJoinMatch?: (matchId: string, stakeAmount: number) => void
  onSpectate?: (matchId: string) => void
}

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { class: string; label: string; pulse?: boolean }> = {
    LIVE: { class: 'badge-live', label: 'Live', pulse: true },
    SCHEDULED: { class: 'badge-active', label: 'Scheduled' },
    FINISHED: { class: 'badge-resolved', label: 'Finished' },
    CANCELLED: { class: 'bg-gray-500/20 text-gray-400 border-gray-500/30', label: 'Cancelled' },
  }
  const { class: className, label, pulse } = config[status] || config.CANCELLED
  
  return (
    <span className={`badge ${className} flex items-center gap-1`}>
      {pulse && <span className="w-1.5 h-1.5 bg-status-live rounded-full animate-pulse" />}
      {label}
    </span>
  )
}

export function MatchDetailPage({ matchId, playerAddress, onBack, onJoinMatch, onSpectate }: MatchDetailPageProps) {
  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState<'details' | 'spectate'>('details')
  const [selectedFen, setSelectedFen] = useState<string | null>(null)
  const [selectedMoveNumber, setSelectedMoveNumber] = useState<number | null>(null)

  useEffect(() => {
    if (!matchId) return
    setLoading(true)
    setError('')
    getMatchById(matchId)
      .then(setMatch)
      .catch(err => setError(err.message || 'Failed to load match'))
      .finally(() => setLoading(false))
  }, [matchId])

  const handleMoveSelect = useCallback((fen: string, moveNumber: number) => {
    setSelectedFen(fen)
    setSelectedMoveNumber(moveNumber)
  }, [])

  const resetPosition = useCallback(() => {
    setSelectedFen(null)
    setSelectedMoveNumber(null)
  }, [])

  const handleSpectate = useCallback(() => {
    onSpectate ? onSpectate(matchId) : setViewMode('spectate')
  }, [matchId, onSpectate])

  // Memoized computed values
  const { canJoin, canSpectate, currentFen } = useMemo(() => {
    if (!match) return { canJoin: false, canSpectate: false, currentFen: INITIAL_FEN }
    
    const addressLower = playerAddress?.toLowerCase()
    const isPlayer = addressLower && (
      match.player1.wallet.toLowerCase() === addressLower ||
      match.player2.wallet.toLowerCase() === addressLower
    )
    
    return {
      canJoin: match.status === 'LIVE' && !!isPlayer,
      canSpectate: match.status === 'LIVE' || match.status === 'FINISHED',
      currentFen: selectedFen || match.result?.finalFen || INITIAL_FEN
    }
  }, [match, playerAddress, selectedFen])

  // Loading state
  if (loading) {
    return (
      <PageContainer>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-dark-200 rounded mb-6" />
          <div className="h-64 bg-dark-200 rounded-xl" />
          <div className="h-96 bg-dark-200 rounded-xl" />
        </div>
      </PageContainer>
    )
  }

  // Error state
  if (error || !match) {
    return (
      <PageContainer>
        <div className="text-center py-16">
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6">
              <p>{error}</p>
            </div>
          )}
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {error ? 'Error' : 'Match not found'}
          </h3>
          <button onClick={onBack} className="btn btn-secondary mt-4">Back</button>
        </div>
      </PageContainer>
    )
  }

  if (viewMode === 'spectate') {
    return <SpectatorView matchId={matchId} onBack={() => setViewMode('details')} />
  }

  return (
    <PageContainer>
      {/* Back Button */}
      <button onClick={onBack} className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-6 transition-colors">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Match Header */}
          <div className="bg-dark-200 rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-2xl font-bold text-text-primary">Chess Match</h1>
              <StatusBadge status={match.status} />
            </div>

            {/* Players */}
            <div className="flex items-center gap-4 p-4 bg-dark-300 rounded-lg mb-4">
              <div className="flex-1 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border-2 border-border">
                  <span className="text-dark-500 font-bold">W</span>
                </div>
                <div>
                  <div className="font-semibold text-text-primary">{match.player1.name || formatAddress(match.player1.wallet)}</div>
                  <div className="text-sm text-text-tertiary">White</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-text-muted">VS</div>
              <div className="flex-1 flex items-center gap-3 justify-end">
                <div className="text-right">
                  <div className="font-semibold text-text-primary">{match.player2.name || formatAddress(match.player2.wallet)}</div>
                  <div className="text-sm text-text-tertiary">Black</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-dark-500 flex items-center justify-center border-2 border-border">
                  <span className="text-white font-bold">B</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-sm text-text-tertiary mb-1">Stake</div>
                <div className="text-lg font-bold text-text-primary">{formatCurrency(match.stakeAmount)}</div>
              </div>
              <div>
                <div className="text-sm text-text-tertiary mb-1">Scheduled</div>
                <div className="text-lg font-bold text-text-primary">{new Date(match.scheduledAt).toLocaleDateString()}</div>
              </div>
              <div>
                <div className="text-sm text-text-tertiary mb-1">Status</div>
                <div className="text-lg font-bold text-text-primary capitalize">{match.status.toLowerCase()}</div>
              </div>
            </div>

            {/* Result */}
            {match.result && (
              <div className="mt-4 pt-4 border-t border-border flex justify-between">
                <div>
                  <div className="text-sm text-text-tertiary mb-1">Winner</div>
                  <div className="text-lg font-bold text-text-primary capitalize">
                    {match.result.winner === 'draw' ? 'Draw' : `${match.result.winner} wins`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-text-tertiary mb-1">Finished</div>
                  <div className="text-lg font-bold text-text-primary">{new Date(match.result.finishedAt).toLocaleString()}</div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            {canJoin && onJoinMatch && (
              <button onClick={() => onJoinMatch(match.id, match.stakeAmount)} className="btn btn-primary flex-1">
                Join Match
              </button>
            )}
            {canSpectate && (
              <button onClick={handleSpectate} className="btn btn-secondary flex-1">
                {match.status === 'LIVE' ? 'Spectate Match' : 'View Details'}
              </button>
            )}
          </div>

          {/* Board */}
          <div className="bg-dark-200 rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              {selectedMoveNumber !== null ? (
                <>
                  <span>Position after move {selectedMoveNumber}</span>
                  <button onClick={resetPosition} className="text-sm text-accent hover:text-accent-hover ml-auto">
                    Reset
                  </button>
                </>
              ) : (
                <>
                  {match.status === 'LIVE' && <span className="w-2 h-2 bg-status-live rounded-full animate-pulse" />}
                  {match.status === 'FINISHED' ? 'Final Position' : 'Current Position'}
                </>
              )}
            </h2>
            <div className="max-w-md mx-auto">
              <Chessboard
                position={currentFen}
                boardWidth={400}
                arePiecesDraggable={false}
                customDarkSquareStyle={BOARD_STYLE.dark}
                customLightSquareStyle={BOARD_STYLE.light}
              />
            </div>
            {selectedMoveNumber === null && match.status === 'LIVE' && (
              <div className="text-center mt-4 text-text-secondary">Game in progress...</div>
            )}
          </div>

          <MatchMoveHistory matchId={matchId} onMoveSelect={handleMoveSelect} />
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-dark-200 rounded-xl border border-border p-6 sticky top-20 space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">Match Information</h3>
            <div>
              <div className="text-sm text-text-tertiary mb-1">Match ID</div>
              <div className="text-text-primary font-mono text-sm break-all">{match.id}</div>
            </div>
            <div>
              <div className="text-sm text-text-tertiary mb-1">Created</div>
              <div className="text-text-primary">{new Date(match.createdAt || match.scheduledAt).toLocaleString()}</div>
            </div>
            {match.updatedAt && (
              <div>
                <div className="text-sm text-text-tertiary mb-1">Last Updated</div>
                <div className="text-text-primary">{new Date(match.updatedAt).toLocaleString()}</div>
              </div>
            )}
            {match.result?.finalFen && (
              <div>
                <div className="text-sm text-text-tertiary mb-1">Final FEN</div>
                <div className="text-text-primary font-mono text-xs break-all">{match.result.finalFen}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
