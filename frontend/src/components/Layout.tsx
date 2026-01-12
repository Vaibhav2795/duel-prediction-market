import { useState } from "react"
import { formatCurrency, formatAddress } from "../styles/designTokens"

interface LayoutProps {
  children: React.ReactNode
  walletAddress?: string
  balance?: string
  symbol?: string
  isBalanceLoading?: boolean
  isConnected?: boolean
  onConnect?: () => void
  onDisconnect?: () => void
  currentPath?: string
  onNavigate?: (path: string) => void
  searchValue?: string
  onSearch?: (value: string) => void
}

export function Layout({
  children,
  walletAddress,
  balance = "0",
  symbol = "DUEL",
  isBalanceLoading = false,
  isConnected = false,
  onConnect,
  onDisconnect,
  currentPath = "/",
  onNavigate,
  searchValue = "",
  onSearch,
}: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const navItems = [
    { path: "/", label: "Browse", icon: "🏠" },
    { path: "/portfolio", label: "Portfolio", icon: "💼" },
    { path: "/create", label: "Create", icon: "➕" },
    { path: "/history", label: "History", icon: "📜" },
  ]

  return (
    <div className='min-h-screen bg-dark-500 flex flex-col'>
      {/* Header */}
      <header className='sticky top-0 z-50 bg-dark-400/95 backdrop-blur-sm border-b border-border'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between h-16'>
            {/* Logo */}
            <div className='flex items-center gap-8'>
              <button
                onClick={() => onNavigate?.("/")}
                className='flex items-center gap-2 group'
              >
                <div className='w-8 h-8 rounded-lg bg-accent flex items-center justify-center'>
                  <span className='text-dark-500 font-bold'>♟</span>
                </div>
                <span className='text-xl font-bold text-text-primary hidden sm:block'>
                  ChessBet
                </span>
              </button>

              {/* Desktop Navigation */}
              <nav className='hidden md:flex items-center gap-1'>
                {navItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => onNavigate?.(item.path)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentPath === item.path
                        ? "bg-dark-200 text-text-primary"
                        : "text-text-secondary hover:text-text-primary hover:bg-dark-300"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Search Bar */}
            <div className='hidden md:flex flex-1 max-w-md mx-8'>
              <div className='relative w-full'>
                <svg
                  className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                  />
                </svg>
                <input
                  type='text'
                  placeholder='Search markets...'
                  value={searchValue}
                  onChange={(e) => onSearch?.(e.target.value)}
                  className='w-full pl-10 pr-4 py-2.5 bg-dark-300 border border-border rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent focus:shadow-input transition-all'
                />
              </div>
            </div>

            {/* Right Side */}
            <div className='flex items-center gap-3'>
              {/* Balance (when connected) */}
              {isConnected && (
                <div className='hidden sm:flex items-center gap-2 px-3 py-2 bg-dark-300 rounded-lg'>
                  <svg
                    className='w-4 h-4 text-accent'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                    />
                  </svg>
                  <span className='text-sm font-medium text-text-primary'>
                    {isBalanceLoading
                      ? "Loading..."
                      : `${formatCurrency(Number(balance))} ${symbol}`}
                  </span>
                </div>
              )}

              {/* Wallet / Profile */}
              {isConnected ? (
                <div className='relative'>
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className='flex items-center gap-2 px-3 py-2 bg-dark-200 border border-border rounded-lg hover:bg-dark-100 hover:border-border-secondary transition-all'
                  >
                    <div className='w-6 h-6 rounded-full bg-accent flex items-center justify-center'>
                      <span className='text-xs text-dark-500 font-bold'>
                        {walletAddress?.[2]?.toUpperCase() || "U"}
                      </span>
                    </div>
                    <span className='hidden sm:block text-sm font-medium text-text-primary'>
                      {formatAddress(walletAddress || "")}
                    </span>
                    <svg
                      className='w-4 h-4 text-text-tertiary'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M19 9l-7 7-7-7'
                      />
                    </svg>
                  </button>

                  {/* Dropdown */}
                  {isProfileOpen && (
                    <div className='absolute right-0 mt-2 w-56 bg-dark-200 border border-border rounded-xl shadow-lg overflow-hidden animate-slideDown'>
                      <div className='p-4 border-b border-border'>
                        <div className='text-xs text-text-tertiary mb-1'>
                          Connected as
                        </div>
                        <div className='text-sm font-medium text-text-primary truncate'>
                          {walletAddress}
                        </div>
                        <div className='mt-2 text-sm text-accent font-medium'>
                          {isBalanceLoading
                            ? "Loading..."
                            : `${formatCurrency(Number(balance))} ${symbol}`}
                        </div>
                      </div>
                      <div className='p-2'>
                        <button
                          onClick={() => {
                            onNavigate?.("/portfolio")
                            setIsProfileOpen(false)
                          }}
                          className='w-full flex items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-dark-300 rounded-lg transition-colors'
                        >
                          <span>💼</span> Portfolio
                        </button>
                        <button
                          onClick={() => {
                            onDisconnect?.()
                            setIsProfileOpen(false)
                          }}
                          className='w-full flex items-center gap-3 px-3 py-2 text-sm text-no hover:bg-no-bg rounded-lg transition-colors'
                        >
                          <span>🚪</span> Disconnect
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={onConnect}
                  className='px-4 py-2.5 bg-accent hover:bg-accent-hover text-dark-500 font-semibold rounded-lg transition-colors'
                >
                  Connect Wallet
                </button>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className='md:hidden p-2 text-text-secondary hover:text-text-primary'
              >
                <svg
                  className='w-6 h-6'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  {isMobileMenuOpen ? (
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M6 18L18 6M6 6l12 12'
                    />
                  ) : (
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M4 6h16M4 12h16M4 18h16'
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className='md:hidden border-t border-border animate-slideDown'>
            <div className='p-4 space-y-2'>
              {/* Mobile Search */}
              <div className='relative mb-4'>
                <svg
                  className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                  />
                </svg>
                <input
                  type='text'
                  placeholder='Search markets...'
                  value={searchValue}
                  onChange={(e) => onSearch?.(e.target.value)}
                  className='w-full pl-10 pr-4 py-3 bg-dark-300 border border-border rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent'
                />
              </div>

              {/* Mobile Nav */}
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    onNavigate?.(item.path)
                    setIsMobileMenuOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left ${
                    currentPath === item.path
                      ? "bg-dark-200 text-text-primary"
                      : "text-text-secondary hover:bg-dark-300"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className='font-medium'>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className='flex-1'>{children}</main>

      {/* Footer */}
      <footer className='bg-dark-400 border-t border-border py-8'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex flex-col md:flex-row items-center justify-between gap-4'>
            <div className='flex items-center gap-2'>
              <div className='w-6 h-6 rounded-lg bg-accent flex items-center justify-center'>
                <span className='text-dark-500 font-bold text-sm'>♟</span>
              </div>
              <span className='text-sm text-text-secondary'>
                ChessBet Prediction Market
              </span>
            </div>
            <div className='flex items-center gap-6 text-sm text-text-tertiary'>
              <button className='hover:text-text-secondary transition-colors'>
                Terms
              </button>
              <button className='hover:text-text-secondary transition-colors'>
                Privacy
              </button>
              <button className='hover:text-text-secondary transition-colors'>
                Discord
              </button>
              <button className='hover:text-text-secondary transition-colors'>
                Twitter
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Sidebar component for filters (optional)
interface SidebarProps {
  children: React.ReactNode
}

export function Sidebar({ children }: SidebarProps) {
  return (
    <aside className='hidden lg:block w-64 flex-shrink-0'>
      <div className='sticky top-20 space-y-6'>{children}</div>
    </aside>
  )
}

// Page container with consistent padding
interface PageContainerProps {
  children: React.ReactNode
  className?: string
}

export function PageContainer({
  children,
  className = "",
}: PageContainerProps) {
  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${className}`}>
      {children}
    </div>
  )
}
