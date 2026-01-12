import { useState } from "react"
import { createMatch, type Match } from "../services/matchService"
import { useMatchActions } from "../hooks/blockchain/useMatchActions"
import { useAccount, useSwitchChain } from "wagmi"
import { mantleSepolia } from "../config/chains"

interface CreateRoomProps {
  playerAddress: string
  playerName: string
  onRoomCreated: (match: Match) => void
  onError?: (error: string) => void
}

export default function CreateRoom({
  playerAddress,
  playerName,
  onRoomCreated,
  onError,
}: CreateRoomProps) {
  const [entryFee, setEntryFee] = useState("")
  const [opponentWallet, setOpponentWallet] = useState("")
  const [opponentName, setOpponentName] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")
  const [loading, setLoading] = useState(false)
  const { isConnected, chainId } = useAccount()
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain()

  const { createMatch: createOnchainMatch, isConnected: isWalletConnected } =
    useMatchActions()

  const isCorrectChain = chainId === mantleSepolia.id

  const handleSwitchChain = async () => {
    try {
      await switchChain({ chainId: mantleSepolia.id })
    } catch (error: any) {
      onError?.(error.message || "Failed to switch chain")
    }
  }

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!entryFee || loading) return

    if (!isConnected || !isWalletConnected) {
      onError?.("Please connect your wallet to create a match")
      return
    }

    if (!isCorrectChain) {
      onError?.("Please switch to Mantle Sepolia Testnet")
      await handleSwitchChain()
      return
    }

    const fee = parseFloat(entryFee)
    if (isNaN(fee) || fee <= 0) {
      onError?.("Please enter a valid entry fee")
      return
    }

    if (!opponentWallet || !opponentName) {
      onError?.("Please enter opponent wallet address and name")
      return
    }

    if (!scheduledAt) {
      onError?.("Please select a scheduled time")
      return
    }

    try {
      setLoading(true)

      // Transaction-like flow: Create match → Blockchain → Update hashes
      // If any step fails, rollback previous steps

      // 1️⃣ Create match in database
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
      })

      const numericMatchId = matchResponse.matchId
      const matchDbId = matchResponse.id

      if (!numericMatchId) {
        throw new Error("Match ID not generated. Please try again.")
      }

      let escrowHash: string | undefined
      let marketHash: string | undefined

      try {
        // 2️⃣ Create escrow + market onchain
        const result = await createOnchainMatch(
          numericMatchId,
          playerAddress as `0x${string}`,
          opponentWallet as `0x${string}`,
          fee.toString()
        )

        escrowHash = result.escrowHash
        marketHash = result.marketHash
      } catch (blockchainError: any) {
        // Rollback: Delete match if blockchain operations fail
        console.error(
          "Blockchain operation failed, rolling back match:",
          blockchainError
        )
        const { deleteMatch } = await import("../services/matchService")
        try {
          await deleteMatch(matchDbId)
        } catch (deleteError) {
          console.error("Failed to delete match during rollback:", deleteError)
        }
        throw new Error(
          `Failed to create match on blockchain: ${
            blockchainError.message || "Unknown error"
          }`
        )
      }

      // 3️⃣ Update match with blockchain hashes
      const { updateMatchHashes, getMatchById } = await import(
        "../services/matchService"
      )
      console.log({ matchDbId, escrowHash, marketHash })
      try {
        await updateMatchHashes(matchDbId, escrowHash, marketHash)
      } catch (updateError: any) {
        // Blockchain succeeded but update failed - log error but don't rollback
        // since blockchain state is already committed
        console.warn(
          "Match created on blockchain but failed to save hashes:",
          updateError
        )
        // Continue anyway - the match exists and blockchain operations succeeded
      }

      // Get the full match (with or without hashes) and return it
      const fullMatch = await getMatchById(matchDbId)
      onRoomCreated(fullMatch)
    } catch (error: any) {
      onError?.("Failed to create match")
    } finally {
      setLoading(false)
    }
  }

  // Set default scheduled time to 1 hour from now
  const defaultScheduledTime = new Date(Date.now() + 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16)

  return (
    <div className='bg-dark-300 border border-border rounded-xl p-6 max-w-md mx-auto'>
      <h2 className='text-xl font-bold text-text-primary mb-4'>
        Create New Match
      </h2>
      <p className='text-text-secondary text-sm mb-6'>
        Create a chess match with an opponent. Set the stake amount and
        scheduled time.
      </p>
      <form onSubmit={handleCreateRoom} className='space-y-4'>
        <div>
          <label className='block mb-2 text-sm font-medium text-text-secondary'>
            Stake Amount *
          </label>
          <input
            type='number'
            step='0.01'
            min='0.01'
            value={entryFee}
            onChange={(e) => setEntryFee(e.target.value)}
            placeholder='e.g., 10.00'
            required
            className='w-full px-4 py-3 bg-dark-200 border border-border rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent focus:shadow-input'
          />
        </div>
        <div>
          <label className='block mb-2 text-sm font-medium text-text-secondary'>
            Opponent Wallet Address *
          </label>
          <input
            type='text'
            value={opponentWallet}
            onChange={(e) => setOpponentWallet(e.target.value)}
            placeholder='0x...'
            required
            className='w-full px-4 py-3 bg-dark-200 border border-border rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent focus:shadow-input font-mono text-sm'
          />
        </div>
        <div>
          <label className='block mb-2 text-sm font-medium text-text-secondary'>
            Opponent Name *
          </label>
          <input
            type='text'
            value={opponentName}
            onChange={(e) => setOpponentName(e.target.value)}
            placeholder="Opponent's display name"
            required
            maxLength={50}
            className='w-full px-4 py-3 bg-dark-200 border border-border rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent focus:shadow-input'
          />
        </div>
        <div>
          <label className='block mb-2 text-sm font-medium text-text-secondary'>
            Scheduled Time *
          </label>
          <input
            type='datetime-local'
            value={scheduledAt || defaultScheduledTime}
            onChange={(e) => setScheduledAt(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            required
            className='w-full px-4 py-3 bg-dark-200 border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent focus:shadow-input'
          />
        </div>
        {!isConnected && (
          <div className='bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4'>
            <p className='text-yellow-500 text-sm'>
              Please connect your wallet to create a match
            </p>
          </div>
        )}
        {isConnected && !isCorrectChain && (
          <div className='bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mb-4'>
            <p className='text-orange-500 text-sm mb-2'>
              Please switch to Mantle Sepolia Testnet (Chain ID:{" "}
              {mantleSepolia.id})
            </p>
            <button
              type='button'
              onClick={handleSwitchChain}
              disabled={isSwitchingChain}
              className='w-full py-2 px-4 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors'
            >
              {isSwitchingChain ? "Switching..." : "Switch to Mantle Sepolia"}
            </button>
          </div>
        )}
        <button
          type='submit'
          disabled={
            loading ||
            !entryFee ||
            !opponentWallet ||
            !opponentName ||
            !isConnected ||
            !isWalletConnected ||
            !isCorrectChain ||
            isSwitchingChain
          }
          className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
            loading ||
            !entryFee ||
            !opponentWallet ||
            !opponentName ||
            !isConnected ||
            !isWalletConnected ||
            !isCorrectChain ||
            isSwitchingChain
              ? "bg-gray-600 cursor-not-allowed text-gray-400"
              : "bg-accent hover:bg-accent-hover text-white cursor-pointer"
          }`}
        >
          {loading ? "Creating Match..." : "Create Match"}
        </button>
      </form>
    </div>
  )
}
