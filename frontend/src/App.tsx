import { useState, useEffect, useCallback, useRef } from "react"
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom"
import { usePrivy } from "@privy-io/react-auth"
import { Layout } from "./components/Layout"
import { BrowsePage } from "./pages/Browse"
import { MarketDetailPage } from "./pages/MarketDetail"
import { PortfolioPage } from "./pages/Portfolio"
import { MatchHistoryPage } from "./pages/MatchHistory"
import { MatchDetailPage } from "./pages/MatchDetail"
import ChessBoard from "./components/ChessBoard"
import RoomList from "./components/RoomList"
import CreateRoom from "./components/CreateRoom"
import UserRegistration from "./components/UserRegistration"
import { SpectatorView } from "./components/SpectatorView"
import { getMatchById } from "./services/matchService"
import { socketService } from "./services/socketService"
import * as bettingService from "./services/bettingService"
import type { Match } from "./services/matchService"
import type { User } from "./services/userService"
import type {
  Room,
  Market,
  Bet,
  Position,
  UserPortfolio,
  MarketStats,
  Outcome,
} from "./types/game"
import { useWalletBalance } from "./hooks/blockchain/useWalletBalance"
import { Address } from "./hooks/blockchain/types"

const TOKEN_ADDRESS = import.meta.env.VITE_TOKEN_ADDRESS as Address
function AppContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const { ready, authenticated, user, login, logout } = usePrivy()

  // Player state
  const [playerAddress, setPlayerAddress] = useState<string>("")
  const [playerName, setPlayerName] = useState<string>("")
  const [walletBalance] = useState<number>(1000) // Mock balance
  const [registeredUser, setRegisteredUser] = useState<User | null>(null)
  const [showUserRegistration, setShowUserRegistration] = useState(false)

  // Chess game state
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null)
  const [error, setError] = useState<string>("")
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [joiningMatchId, setJoiningMatchId] = useState<string | null>(null)

  // Market state
  const [markets, setMarkets] = useState<Market[]>([])
  const [currentMarket, setCurrentMarket] = useState<Market | null>(null)
  const [marketBets, setMarketBets] = useState<Bet[]>([])
  const [userPositions, setUserPositions] = useState<Position[]>([])
  const [userPortfolio, setUserPortfolio] = useState<UserPortfolio | null>(null)
  const [marketStats, setMarketStats] = useState<MarketStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchValue, setSearchValue] = useState("")

  // Track last fetch times to prevent excessive API calls
  const lastMarketsFetch = useRef<number>(0)
  const lastPortfolioFetch = useRef<number>(0)
  const MARKETS_FETCH_INTERVAL = 60000 // 60 seconds
  const PORTFOLIO_FETCH_INTERVAL = 30000 // 30 seconds

  const {
    balance,
    symbol,
    isLoading: isLoadingBalance,
  } = useWalletBalance(TOKEN_ADDRESS)

  console.log({ balance, symbol, isLoadingBalance })
  // Get wallet address from Privy and check user registration
  useEffect(() => {
    if (ready && authenticated && user) {
      let address = ""
      const wallet = user.wallet
      if (wallet?.address) {
        address = wallet.address
      } else {
        address = user.id || ""
      }

      setPlayerAddress(address)

      // Check if user is registered
      if (address) {
        const checkUserRegistration = async () => {
          try {
            const { getUserByWallet } = await import("./services/userService")
            const userData = await getUserByWallet(address)
            if (userData) {
              setRegisteredUser(userData)
              setPlayerName(userData.userName)
              setShowUserRegistration(false)
            } else {
              setRegisteredUser(null)
              setShowUserRegistration(true)
            }
          } catch (err) {
            console.error("Failed to check user registration:", err)
            setRegisteredUser(null)
            setShowUserRegistration(true)
          }
        }

        checkUserRegistration()
      }
    } else if (ready && !authenticated) {
      setPlayerAddress("")
      setRegisteredUser(null)
      setShowUserRegistration(false)
    }
  }, [ready, authenticated, user])

  // Fetch markets data
  const fetchMarkets = useCallback(async (force = false) => {
    const now = Date.now()
    if (!force && now - lastMarketsFetch.current < MARKETS_FETCH_INTERVAL) {
      return // Skip if called too soon
    }
    lastMarketsFetch.current = now

    setIsLoading(true)
    try {
      const result = await bettingService.getMarkets()
      setMarkets(result.markets)
      const stats = await bettingService.getMarketStats()
      setMarketStats(stats)
    } catch (err) {
      console.error("Failed to fetch markets:", err)
      setMarkets([])
      setMarketStats(null)
      setError("Failed to load markets. Please try again later.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch user portfolio
  const fetchPortfolio = useCallback(
    async (force = false) => {
      if (!playerAddress) return

      const now = Date.now()
      if (
        !force &&
        now - lastPortfolioFetch.current < PORTFOLIO_FETCH_INTERVAL
      ) {
        return // Skip if called too soon
      }
      lastPortfolioFetch.current = now

      try {
        const portfolio = await bettingService.getUserPortfolio(playerAddress)
        setUserPortfolio(portfolio)
        setUserPositions(portfolio.positions)
      } catch (err) {
        console.error("Failed to fetch portfolio:", err)
        setUserPortfolio(null)
        setUserPositions([])
      }
    },
    [playerAddress]
  )

  // Fetch markets and portfolio on mount and when player address changes
  useEffect(() => {
    if (ready && authenticated && playerAddress) {
      fetchMarkets()
      fetchPortfolio()
    }
  }, [ready, authenticated, playerAddress, fetchMarkets, fetchPortfolio])

  // Initialize socket connection
  useEffect(() => {
    if (ready && authenticated && playerAddress) {
      socketService.connect()
    }

    const handleMatchJoined = (room: Room) => {
      console.log("Match joined, setting current room:", room.id)
      setCurrentRoom(room)
      setJoiningMatchId(null)
      // Navigate to game page
      navigate(`/game/${room.id}`)
      setError("")
    }

    const handleMatchUpdated = (room: Room) => {
      setCurrentRoom(room)
      // If we were joining this room, clear the joining state
      if (joiningMatchId === room.id) {
        setJoiningMatchId(null)
      }
    }

    const handleMoveMade = (data: {
      move: any
      gameState: string
      room: Room
      isGameOver?: boolean
      winner?: "white" | "black" | "draw"
    }) => {
      setCurrentRoom((prevRoom) => {
        if (!data.room) {
          console.warn("move_made event received without room data")
          return prevRoom
        }
        if (prevRoom && data.room.id === prevRoom.id) {
          return {
            ...data.room,
            gameState: data.gameState,
            currentTurn: data.room.currentTurn || prevRoom.currentTurn,
            status: data.isGameOver ? "finished" : data.room.status,
            winner: data.winner,
          }
        }
        return prevRoom
      })
    }

    const handleMatchFinished = (data: {
      matchId: string
      winner: "white" | "black" | "draw"
      finalFen: string
    }) => {
      setCurrentRoom((prevRoom) => {
        if (prevRoom && prevRoom.id === data.matchId) {
          return {
            ...prevRoom,
            status: "finished",
            winner: data.winner,
            gameState: data.finalFen,
          }
        }
        return prevRoom
      })
    }

    const handleError = (err: { message: string }) => {
      console.error("Socket error:", err)
      // If "Player already joined", it means we're already in the room
      // This is not really an error - we should just wait for the room state
      if (
        err.message.includes("already joined") ||
        err.message.includes("Player already joined")
      ) {
        console.log("Player already in room, waiting for room state...")
        setJoiningMatchId(null)
        // If we're on the game page, try to get the room state
        // The backend should emit match_updated or we can wait for it
        // Don't set this as an error, just wait for match_joined or match_updated
        return
      }
      setError(err.message)
      setJoiningMatchId(null)
    }

    const handlePlayerLeft = () => {
      setError("Other player left the game")
      setTimeout(() => {
        navigate("/play")
        setCurrentRoom(null)
      }, 3000)
    }

    socketService.onMatchJoined(handleMatchJoined)
    socketService.onMatchUpdated(handleMatchUpdated)
    socketService.onMoveMade(handleMoveMade)
    socketService.onMatchFinished(handleMatchFinished)
    socketService.onError(handleError)
    socketService.onJoinError(handleError)
    socketService.onPlayerLeft(handlePlayerLeft)

    return () => {
      socketService.off("match_joined", handleMatchJoined)
      socketService.off("match_updated", handleMatchUpdated)
      socketService.off("move_made", handleMoveMade)
      socketService.off("match_finished", handleMatchFinished)
      socketService.off("error", handleError)
      socketService.off("join_error", handleError)
      socketService.off("player_left", handlePlayerLeft)
    }
  }, [ready, authenticated, playerAddress, navigate, joiningMatchId])

  // Navigation handlers
  const handleNavigate = (path: string) => {
    navigate(path)
  }

  const handleMarketClick = (marketId: string) => {
    navigate(`/market/${marketId}`)
  }

  const handlePlaceBet = async (
    outcome: Outcome,
    side: "yes" | "no",
    amount: number
  ) => {
    if (!currentMarket || !playerAddress) return

    try {
      const result = await bettingService.placeBet(
        currentMarket.id,
        playerAddress,
        outcome,
        side,
        amount
      )

      if (result.success) {
        // Refresh market and portfolio
        const updatedMarket = await bettingService.getMarket(currentMarket.id)
        setCurrentMarket(updatedMarket)
        fetchPortfolio(true) // Force refresh after bet placement
      }
    } catch (err) {
      console.error("Failed to place bet:", err)
      // Mock success for demo
      fetchPortfolio(true) // Force refresh after bet placement
    }
  }

  // Chess game handlers
  const handleCreateMatch = async (match: Match) => {
    try {
      setError("")
      // Prevent duplicate joins
      if (joiningMatchId === match.id) {
        console.log("Already joining this match, skipping...")
        return
      }
      // After creating match, join it via socket
      // Navigation will happen in handleMatchJoined callback
      console.log("Creating match, joining via socket:", match.id)
      setJoiningMatchId(match.id)
      socketService.joinMatch(match.id, playerAddress, match.stakeAmount)
      setShowCreateRoom(false)
    } catch (err: any) {
      console.error("Error joining match:", err)
      setError(err.message || "Failed to join match")
      setJoiningMatchId(null)
    }
  }

  const handleJoinMatch = (matchId: string, stakeAmount: number) => {
    try {
      setError("")
      // Prevent duplicate joins
      if (joiningMatchId === matchId) {
        console.log("Already joining this match, skipping...")
        return
      }
      console.log("Joining match via socket:", matchId)
      setJoiningMatchId(matchId)
      // Join match via socket - navigation will happen in handleMatchJoined callback
      socketService.joinMatch(matchId, playerAddress, stakeAmount)
    } catch (err: any) {
      console.error("Error joining match:", err)
      setError(err.message || "Failed to join match")
      setJoiningMatchId(null)
    }
  }

  // User registration handlers
  const handleUserCreated = (newUser: User) => {
    setRegisteredUser(newUser)
    setPlayerName(newUser.userName)
    setShowUserRegistration(false)
  }

  const handleBackToLobby = () => {
    navigate("/play")
    setCurrentRoom(null)
    setError("")
  }

  const handleGameOver = (winner?: "white" | "black" | "draw") => {
    console.log("Game over! Winner:", winner)
  }

  // Loading state
  if (!ready) {
    return (
      <div className='min-h-screen bg-dark-500 flex items-center justify-center'>
        <div className='text-center'>
          <div className='w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4' />
          <p className='text-text-secondary'>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Layout
      walletAddress={playerAddress}
      balance={balance}
      symbol={symbol}
      isBalanceLoading={isLoadingBalance}
      isConnected={authenticated}
      onConnect={login}
      onDisconnect={logout}
      currentPath={location.pathname}
      onNavigate={handleNavigate}
      searchValue={searchValue}
      onSearch={setSearchValue}
    >
      <Routes>
        {/* Browse Markets (Home) */}
        <Route
          path='/'
          element={
            <BrowsePage
              markets={markets}
              stats={marketStats || undefined}
              isLoading={isLoading}
              onMarketClick={handleMarketClick}
              searchValue={searchValue}
              onSearchChange={setSearchValue}
            />
          }
        />

        {/* Market Detail */}
        <Route
          path='/market/:marketId'
          element={
            <MarketDetailWrapper
              markets={markets}
              marketBets={marketBets}
              setMarketBets={setMarketBets}
              currentMarket={currentMarket}
              setCurrentMarket={setCurrentMarket}
              userPositions={userPositions}
              onPlaceBet={handlePlaceBet}
              onBack={() => navigate("/")}
              walletBalance={walletBalance}
              isConnected={authenticated}
              userAddress={playerAddress}
            />
          }
        />

        {/* Portfolio */}
        <Route
          path='/portfolio'
          element={
            <PortfolioPage
              portfolio={userPortfolio}
              markets={markets}
              isLoading={isLoading}
              isConnected={authenticated}
              onConnect={login}
              onMarketClick={handleMarketClick}
            />
          }
        />

        {/* Play Chess (Create/Join Games) */}
        <Route
          path='/create'
          element={
            <div className='max-w-4xl mx-auto px-4 py-8'>
              <h1 className='text-2xl font-bold text-text-primary mb-6'>
                Create a Chess Match
              </h1>

              {error && (
                <div className='bg-red-500/20 border border-red-500/30 text-red-400 p-4 rounded-lg mb-5 text-center'>
                  {error}
                </div>
              )}

              {authenticated && playerAddress ? (
                showUserRegistration || !registeredUser ? (
                  <UserRegistration
                    walletAddress={playerAddress}
                    onUserCreated={handleUserCreated}
                    onError={setError}
                  />
                ) : (
                  <div className='space-y-6'>
                    <div className='flex gap-4 mb-6'>
                      <button
                        onClick={() => setShowCreateRoom(!showCreateRoom)}
                        className={`btn ${
                          showCreateRoom ? "btn-secondary" : "btn-primary"
                        }`}
                      >
                        {showCreateRoom
                          ? "Show Available Matches"
                          : "Create New Match"}
                      </button>
                    </div>

                    {showCreateRoom ? (
                      <CreateRoom
                        playerAddress={playerAddress}
                        playerName={playerName || "Player"}
                        onRoomCreated={handleCreateMatch}
                        onError={setError}
                      />
                    ) : (
                      <RoomList
                        playerAddress={playerAddress}
                        onJoinMatch={handleJoinMatch}
                      />
                    )}
                  </div>
                )
              ) : (
                <div className='text-center py-16'>
                  <p className='text-text-secondary mb-4'>
                    Connect your wallet to create or join matches
                  </p>
                  <button onClick={login} className='btn btn-primary'>
                    Connect Wallet
                  </button>
                </div>
              )}
            </div>
          }
        />

        {/* Match History */}
        <Route
          path='/history'
          element={
            authenticated && playerAddress ? (
              <MatchHistoryPage
                walletAddress={playerAddress}
                onMatchClick={(matchId) => navigate(`/match/${matchId}`)}
              />
            ) : (
              <div className='text-center py-16'>
                <p className='text-text-secondary mb-4'>
                  Connect your wallet to view match history
                </p>
                <button onClick={login} className='btn btn-primary'>
                  Connect Wallet
                </button>
              </div>
            )
          }
        />

        {/* Match Detail */}
        <Route
          path='/match/:matchId'
          element={
            <MatchDetailRouteWrapper
              playerAddress={playerAddress}
              onBack={() => navigate("/history")}
              onJoinMatch={handleJoinMatch}
              onSpectate={(matchId) => navigate(`/game/${matchId}`)}
            />
          }
        />

        {/* Active Game */}
        <Route
          path='/game/:roomId'
          element={
            <GameRouteParamsWrapper
              playerAddress={playerAddress}
              currentRoom={currentRoom}
              error={error}
              onBack={handleBackToLobby}
              onGameOver={handleGameOver}
            />
          }
        />
      </Routes>
    </Layout>
  )
}

// Wrapper component to extract route params and pass to GameRouteWrapper
function GameRouteParamsWrapper({
  playerAddress,
  currentRoom,
  error,
  onBack,
  onGameOver,
}: {
  playerAddress: string
  currentRoom: Room | null
  error: string
  onBack: () => void
  onGameOver: (winner?: "white" | "black" | "draw") => void
}) {
  const { roomId } = useParams<{ roomId: string }>()

  return (
    <GameRouteWrapper
      roomId={roomId || ""}
      playerAddress={playerAddress}
      currentRoom={currentRoom}
      error={error}
      onBack={onBack}
      onGameOver={onGameOver}
    />
  )
}

// Wrapper component to handle game route (player or spectator)
function GameRouteWrapper({
  roomId,
  playerAddress,
  currentRoom,
  error,
  onBack,
  onGameOver,
}: {
  roomId: string
  playerAddress: string
  currentRoom: Room | null
  error: string
  onBack: () => void
  onGameOver: (winner?: "white" | "black" | "draw") => void
}) {
  const [isSpectator, setIsSpectator] = useState(false)
  const [loading, setLoading] = useState(true)
  const [attemptedJoin, setAttemptedJoin] = useState(false)

  useEffect(() => {
    const checkMatch = async () => {
      if (!roomId || !playerAddress) {
        setLoading(false)
        return
      }

      try {
        const match = await getMatchById(roomId)

        // Check if user is a player
        const isPlayer1 =
          match.player1.wallet.toLowerCase() === playerAddress.toLowerCase()
        const isPlayer2 =
          match.player2.wallet.toLowerCase() === playerAddress.toLowerCase()

        if (!isPlayer1 && !isPlayer2) {
          setIsSpectator(true)
          setLoading(false)
        } else {
          // User is a player - wait for currentRoom to be set by socket event
          // If currentRoom is already set, stop loading
          if (currentRoom && currentRoom.id === roomId) {
            setLoading(false)
          } else if (!attemptedJoin) {
            // Wait a bit for socket event to fire (in case we just joined)
            const timeout = setTimeout(() => {
              if (!currentRoom || currentRoom.id !== roomId) {
                setAttemptedJoin(true)
                // Only try to join if we haven't already attempted to join this match
                // Check if parent component is already joining this match
                console.log(
                  "GameRouteWrapper: Attempting to join match:",
                  roomId
                )
                socketService.joinMatch(
                  roomId,
                  playerAddress,
                  match.stakeAmount
                )
              }
            }, 1000) // Increased timeout to give more time for socket event

            return () => clearTimeout(timeout)
          }
        }
      } catch (err) {
        console.error("Failed to load match:", err)
        setLoading(false)
      }
    }

    checkMatch()
  }, [roomId, playerAddress])

  // Stop loading once currentRoom is set for this match
  useEffect(() => {
    if (currentRoom && currentRoom.id === roomId) {
      setLoading(false)
    }
  }, [currentRoom, roomId])

  // Timeout fallback - stop loading after 5 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn("Loading timeout - stopping loading state")
        setLoading(false)
      }
    }, 5000)

    return () => clearTimeout(timeout)
  }, [loading])

  if (loading) {
    return (
      <div className='max-w-4xl mx-auto px-4 py-8'>
        <div className='text-center py-16'>
          <div className='w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4' />
          <p className='text-text-secondary'>Loading game...</p>
        </div>
      </div>
    )
  }

  if (isSpectator) {
    return <SpectatorView matchId={roomId} onBack={onBack} />
  }

  return (
    <div className='w-full mx-auto px-2 sm:px-4 py-4 sm:py-6 overflow-x-hidden'>
      {error && (
        <div className='bg-red-500/20 border border-red-500/30 text-red-400 p-4 rounded-lg mb-5 text-center max-w-4xl mx-auto'>
          {error}
        </div>
      )}

      {currentRoom ? (
        <div className='flex flex-col items-center w-full'>
          <div className='mb-4 text-center w-full'>
            <button onClick={onBack} className='btn btn-secondary'>
              ← Back to Lobby
            </button>
          </div>
          {currentRoom.players?.length === 2 &&
          currentRoom.status === "active" ? (
            <ChessBoard
              room={currentRoom}
              playerAddress={playerAddress}
              onGameOver={onGameOver}
            />
          ) : (
            <div className='card p-10 text-center'>
              <div className='w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4' />
              <p className='text-lg text-text-secondary'>
                Waiting for opponent to join...
              </p>
              <p className='mt-2 text-text-tertiary'>
                {currentRoom.players?.length || 0}/2 players
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className='text-center py-16'>
          <p className='text-text-secondary'>Match not found or loading...</p>
          <button onClick={onBack} className='btn btn-secondary mt-4'>
            Back to Lobby
          </button>
        </div>
      )}
    </div>
  )
}

// Wrapper component to handle match detail route
function MatchDetailRouteWrapper({
  playerAddress,
  onBack,
  onJoinMatch,
  onSpectate,
}: {
  playerAddress: string
  onBack: () => void
  onJoinMatch: (matchId: string, stakeAmount: number) => void
  onSpectate: (matchId: string) => void
}) {
  const { matchId } = useParams<{ matchId: string }>()

  if (!matchId) {
    return (
      <div className='text-center py-16'>
        <p className='text-text-secondary'>Match ID not found</p>
        <button onClick={onBack} className='btn btn-secondary mt-4'>
          Back
        </button>
      </div>
    )
  }

  return (
    <MatchDetailPage
      matchId={matchId}
      playerAddress={playerAddress}
      onBack={onBack}
      onJoinMatch={onJoinMatch}
      onSpectate={(matchId: string) => onSpectate(matchId)}
    />
  )
}

// Wrapper component to handle market detail page with URL params
function MarketDetailWrapper({
  markets,
  marketBets,
  setMarketBets,
  currentMarket,
  setCurrentMarket,
  userPositions,
  onPlaceBet,
  onBack,
  walletBalance,
  isConnected,
  userAddress,
}: {
  markets: Market[]
  marketBets: Bet[]
  setMarketBets: (bets: Bet[]) => void
  currentMarket: Market | null
  setCurrentMarket: (market: Market | null) => void
  userPositions: Position[]
  onPlaceBet: (
    outcome: Outcome,
    side: "yes" | "no",
    amount: number
  ) => Promise<void>
  onBack: () => void
  walletBalance: number
  isConnected: boolean
  userAddress: string
}) {
  const { marketId } = useParams()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!marketId) return

    setIsLoading(true)

    // Try to find in existing markets first
    const existingMarket = markets.find((m) => m.id === marketId)
    if (existingMarket) {
      setCurrentMarket(existingMarket)
      setIsLoading(false)
    }

    // Fetch from API
    const fetchMarket = async () => {
      try {
        const market = await bettingService.getMarket(marketId)
        setCurrentMarket(market)
        const bets = await bettingService.getMarketBets(marketId)
        setMarketBets(bets)
      } catch (err) {
        // Use existing market from state if API fails
        if (!existingMarket) {
          setCurrentMarket(null)
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchMarket()
  }, [marketId, markets, setCurrentMarket, setMarketBets])

  return (
    <MarketDetailPage
      market={currentMarket}
      bets={marketBets}
      userPositions={userPositions}
      isLoading={isLoading}
      onPlaceBet={onPlaceBet}
      onBack={onBack}
      walletBalance={walletBalance}
      isConnected={isConnected}
      userAddress={userAddress}
    />
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
