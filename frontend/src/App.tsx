import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import { Layout } from './components/Layout';
import { BrowsePage } from './pages/Browse';
import { MarketDetailPage } from './pages/MarketDetail';
import { PortfolioPage } from './pages/Portfolio';
import ChessBoard from './components/ChessBoard';
import RoomList from './components/RoomList';
import CreateRoom from './components/CreateRoom';
import { socketService } from './services/socketService';
import { useMovementWallet } from './hooks/useMovementWallet';
import * as bettingService from './services/bettingService';
import type { Room, Market, Bet, Position, UserPortfolio, MarketStats, Outcome } from './types/game';

function AppContent() {
    const navigate = useNavigate();
    const location = useLocation();
    const { ready, authenticated, user, login, logout } = usePrivy();
    const { movementWallet, isMovementWallet, getAddress: getMovementAddress } = useMovementWallet();
    
    // Player state
    const [playerAddress, setPlayerAddress] = useState<string>('');
    const [walletBalance] = useState<number>(1000); // Mock balance
    
    // Chess game state
    const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
    const [error, setError] = useState<string>('');
    const [showCreateRoom, setShowCreateRoom] = useState(false);
    
    // Market state
    const [markets, setMarkets] = useState<Market[]>([]);
    const [currentMarket, setCurrentMarket] = useState<Market | null>(null);
    const [marketBets, setMarketBets] = useState<Bet[]>([]);
    const [userPositions, setUserPositions] = useState<Position[]>([]);
    const [userPortfolio, setUserPortfolio] = useState<UserPortfolio | null>(null);
    const [marketStats, setMarketStats] = useState<MarketStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchValue, setSearchValue] = useState('');

    // Get wallet address from Privy
    useEffect(() => {
        if (ready && authenticated && user) {
            if (isMovementWallet && movementWallet) {
                const address = getMovementAddress();
                if (address) {
                    setPlayerAddress(address);
                    return;
                }
            }
            
            const wallet = user.wallet;
            if (wallet?.address) {
                setPlayerAddress(wallet.address);
            } else {
                setPlayerAddress(user.id || '');
            }
        } else if (ready && !authenticated) {
            setPlayerAddress('');
        }
    }, [ready, authenticated, user, isMovementWallet, movementWallet, getMovementAddress]);

    // Fetch markets data
    const fetchMarkets = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await bettingService.getMarkets();
            setMarkets(result.markets);
            const stats = await bettingService.getMarketStats();
            setMarketStats(stats);
        } catch (err) {
            // Fallback to mock data if API is not available
            console.log('Using mock data (API not available)');
            setMarkets(bettingService.generateMockMarkets());
            setMarketStats(bettingService.generateMockStats());
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch user portfolio
    const fetchPortfolio = useCallback(async () => {
        if (!playerAddress) return;
        try {
            const portfolio = await bettingService.getUserPortfolio(playerAddress);
            setUserPortfolio(portfolio);
            setUserPositions(portfolio.positions);
        } catch (err) {
            // Fallback to mock data
            const mockPortfolio = bettingService.generateMockPortfolio(playerAddress);
            setUserPortfolio(mockPortfolio);
            setUserPositions(mockPortfolio.positions);
        }
    }, [playerAddress]);

    // Initialize socket connection
    useEffect(() => {
        if (ready && authenticated && playerAddress) {
            socketService.connect();
            fetchMarkets();
            fetchPortfolio();
        }

        const handleRoomJoined = (room: Room) => {
            setCurrentRoom(room);
            navigate(`/game/${room.id}`);
            setError('');
        };

        const handleRoomUpdated = (room: Room) => {
            setCurrentRoom(room);
        };

        const handleMoveMade = (data: {
            move: any;
            gameState: string;
            room: Room;
            isGameOver?: boolean;
            winner?: 'white' | 'black' | 'draw';
        }) => {
            setCurrentRoom(prevRoom => {
                if (prevRoom && data.room.id === prevRoom.id) {
                    return data.room;
                }
                return prevRoom;
            });
        };

        const handleError = (err: { message: string }) => {
            setError(err.message);
        };

        const handlePlayerLeft = () => {
            setError('Other player left the game');
            setTimeout(() => {
                navigate('/play');
                setCurrentRoom(null);
            }, 3000);
        };

        socketService.onRoomJoined(handleRoomJoined);
        socketService.onRoomUpdated(handleRoomUpdated);
        socketService.onMoveMade(handleMoveMade);
        socketService.onError(handleError);
        socketService.onJoinRoomError(handleError);
        socketService.onPlayerLeft(handlePlayerLeft);

        return () => {
            socketService.off('room_joined', handleRoomJoined);
            socketService.off('room_updated', handleRoomUpdated);
            socketService.off('move_made', handleMoveMade);
            socketService.off('error', handleError);
            socketService.off('join_room_error', handleError);
            socketService.off('player_left', handlePlayerLeft);
        };
    }, [ready, authenticated, playerAddress, navigate, fetchMarkets, fetchPortfolio]);

    // Navigation handlers
    const handleNavigate = (path: string) => {
        navigate(path);
    };

    const handleMarketClick = (marketId: string) => {
        navigate(`/market/${marketId}`);
    };

    const handlePlaceBet = async (outcome: Outcome, side: "yes" | "no", amount: number) => {
        if (!currentMarket || !playerAddress) return;
        
        try {
            const result = await bettingService.placeBet(
                currentMarket.id,
                playerAddress,
                outcome,
                side,
                amount
            );
            
            if (result.success) {
                // Refresh market and portfolio
                const updatedMarket = await bettingService.getMarket(currentMarket.id);
                setCurrentMarket(updatedMarket);
                fetchPortfolio();
            }
        } catch (err) {
            console.error('Failed to place bet:', err);
            // Mock success for demo
            fetchPortfolio();
        }
    };

    // Chess game handlers
    const handleCreateRoom = (room: Room) => {
        setCurrentRoom(room);
        navigate(`/game/${room.id}`);
        setShowCreateRoom(false);
        setError('');
    };

    const handleJoinRoom = (roomId: string) => {
        socketService.joinRoom(roomId, playerAddress);
    };

    const handleBackToLobby = () => {
        navigate('/play');
        setCurrentRoom(null);
        setError('');
    };

    const handleGameOver = (winner?: 'white' | 'black' | 'draw') => {
        console.log('Game over! Winner:', winner);
    };

    // Loading state
    if (!ready) {
        return (
            <div className="min-h-screen bg-dark-500 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-text-secondary">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <Layout
            walletAddress={playerAddress}
            walletBalance={walletBalance}
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
                    path="/" 
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
                    path="/market/:marketId" 
                    element={
                        <MarketDetailWrapper
                            markets={markets}
                            marketBets={marketBets}
                            setMarketBets={setMarketBets}
                            currentMarket={currentMarket}
                            setCurrentMarket={setCurrentMarket}
                            userPositions={userPositions}
                            onPlaceBet={handlePlaceBet}
                            onBack={() => navigate('/')}
                            walletBalance={walletBalance}
                            isConnected={authenticated}
                            userAddress={playerAddress}
                        />
                    } 
                />

                {/* Portfolio */}
                <Route 
                    path="/portfolio" 
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
                    path="/create" 
                    element={
                        <div className="max-w-4xl mx-auto px-4 py-8">
                            <h1 className="text-2xl font-bold text-text-primary mb-6">Create a Chess Game</h1>
                            
                            {error && (
                                <div className="bg-no/20 border border-no text-no p-4 rounded-lg mb-5 text-center">
                                    {error}
                                </div>
                            )}

                            {authenticated && playerAddress ? (
                                <div className="space-y-6">
                                    <div className="flex gap-4 mb-6">
                                        <button
                                            onClick={() => setShowCreateRoom(!showCreateRoom)}
                                            className={`btn ${showCreateRoom ? 'btn-secondary' : 'btn-primary'}`}
                                        >
                                            {showCreateRoom ? 'Show Available Games' : 'Create New Game'}
                                        </button>
                                    </div>

                                    {showCreateRoom ? (
                                        <CreateRoom
                                            playerAddress={playerAddress}
                                            onRoomCreated={handleCreateRoom}
                                        />
                                    ) : (
                                        <RoomList
                                            playerAddress={playerAddress}
                                            onJoinRoom={handleJoinRoom}
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-16">
                                    <p className="text-text-secondary mb-4">Connect your wallet to create or join games</p>
                                    <button onClick={login} className="btn btn-primary">
                                        Connect Wallet
                                    </button>
                                </div>
                            )}
                        </div>
                    } 
                />

                {/* Active Game */}
                <Route 
                    path="/game/:roomId" 
                    element={
                        <div className="max-w-4xl mx-auto px-4 py-8">
                            {error && (
                                <div className="bg-no/20 border border-no text-no p-4 rounded-lg mb-5 text-center">
                                    {error}
                                </div>
                            )}

                            {currentRoom ? (
                                <div className="flex flex-col items-center">
                                    <div className="mb-5 text-center">
                                        <button
                                            onClick={handleBackToLobby}
                                            className="btn btn-secondary"
                                        >
                                            ← Back to Lobby
                                        </button>
                                    </div>
                                    <div className="card p-6 mb-5 text-center w-full max-w-md">
                                        <h2 className="text-xl font-bold text-text-primary mb-2">
                                            Room: {currentRoom.id.slice(0, 8)}...
                                        </h2>
                                        <p className="text-text-secondary">Entry Fee: {currentRoom.entryFee.toFixed(2)} {currentRoom.currency}</p>
                                        <p className="text-text-secondary">Status: {currentRoom.status}</p>
                                        <p className="text-text-secondary">Players: {currentRoom.players.length}/2</p>
                                    </div>
                                    {currentRoom.players.length === 2 && currentRoom.status === 'active' ? (
                                        <ChessBoard
                                            room={currentRoom}
                                            playerAddress={playerAddress}
                                            onGameOver={handleGameOver}
                                        />
                                    ) : (
                                        <div className="card p-10 text-center">
                                            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                            <p className="text-lg text-text-secondary">
                                                Waiting for opponent to join...
                                            </p>
                                            <p className="mt-2 text-text-tertiary">
                                                {currentRoom.players.length}/2 players
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-16">
                                    <p className="text-text-secondary">Room not found or loading...</p>
                                    <button onClick={handleBackToLobby} className="btn btn-secondary mt-4">
                                        Back to Lobby
                                    </button>
                                </div>
                            )}
                        </div>
                    } 
                />
            </Routes>
        </Layout>
    );
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
    userAddress
}: {
    markets: Market[];
    marketBets: Bet[];
    setMarketBets: (bets: Bet[]) => void;
    currentMarket: Market | null;
    setCurrentMarket: (market: Market | null) => void;
    userPositions: Position[];
    onPlaceBet: (outcome: Outcome, side: "yes" | "no", amount: number) => Promise<void>;
    onBack: () => void;
    walletBalance: number;
    isConnected: boolean;
    userAddress: string;
}) {
    const { marketId } = useParams();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!marketId) return;
        
        setIsLoading(true);
        
        // Try to find in existing markets first
        const existingMarket = markets.find(m => m.id === marketId);
        if (existingMarket) {
            setCurrentMarket(existingMarket);
            setIsLoading(false);
        }
        
        // Fetch from API
        const fetchMarket = async () => {
            try {
                const market = await bettingService.getMarket(marketId);
                setCurrentMarket(market);
                const bets = await bettingService.getMarketBets(marketId);
                setMarketBets(bets);
            } catch (err) {
                // Use existing market from state if API fails
                if (!existingMarket) {
                    setCurrentMarket(null);
                }
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchMarket();
    }, [marketId, markets, setCurrentMarket, setMarketBets]);

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
    );
}

function App() {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
}

export default App;
