# Onchain Hooks

This directory contains React hooks for interacting with the smart contracts onchain using Privy and viem.

## Environment Variables

Add these to your `.env` file in the frontend directory:

```env
VITE_CHESS_ESCROW_ADDRESS=0x...
VITE_PREDICTION_MARKET_ADDRESS=0x...
VITE_TOKEN_ADDRESS=0x...
VITE_RPC_URL=https://rpc.testnet.mantle.xyz  # Optional, defaults to Mantle testnet
```

## Available Hooks

### 1. `useCreateMatchOnchain`
Creates a match onchain by:
1. Creating an escrow
2. Creating a prediction market
3. Depositing for the connected user (if they are player1 or player2)

**Usage:**
```typescript
const { createMatch, isLoading, error } = useCreateMatchOnchain();

await createMatch(
  matchId,      // number
  player1,      // Address
  player2,      // Address
  amount        // string (e.g., "100.0")
);
```

### 2. `useJoinMatchOnchain`
Allows a player to deposit their stake to join an existing match.

**Usage:**
```typescript
const { joinMatch, isLoading, error } = useJoinMatchOnchain();

await joinMatch(matchId); // number
```

### 3. `useBetOnMatchOnchain`
Places a bet on a match outcome.

**Usage:**
```typescript
const { betOnMatch, isLoading, error } = useBetOnMatchOnchain();

await betOnMatch(
  matchId,  // number
  outcome,  // 1 (Player1), 2 (Player2), or 3 (Draw)
  amount    // string (e.g., "50.0")
);
```

### 4. `useClaimRewardOnchain`
Claims rewards for a resolved market.

**Usage:**
```typescript
const { claimReward, isLoading, error } = useClaimRewardOnchain();

await claimReward(matchId); // number
```

### 5. `useGetMarketDataOnchain`
Gets market statistics for a match.

**Usage:**
```typescript
const { getMarketData, isLoading, error } = useGetMarketDataOnchain();

const data = await getMarketData(matchId);
// Returns: { status, winningOutcome, totalPool, p1Shares, p2Shares, drawShares }
```

### 6. `useGetUserSharesOnchain`
Gets user shares for a specific outcome.

**Usage:**
```typescript
const { getUserShares, isLoading, error } = useGetUserSharesOnchain();

const shares = await getUserShares(matchId, outcome, userAddress?);
// Returns: string (shares amount)
```

### 7. `useCanClaimOnchain`
Checks if a user can claim rewards (hasn't claimed yet).

**Usage:**
```typescript
const { canClaim, isLoading, error } = useCanClaimOnchain();

const canClaimRewards = await canClaim(matchId, userAddress?);
// Returns: boolean
```

### 8. `useGetPotentialRewardOnchain`
Gets the potential reward for a user's bet on a specific outcome.

**Usage:**
```typescript
const { getPotentialReward, isLoading, error } = useGetPotentialRewardOnchain();

const reward = await getPotentialReward(matchId, outcome, userAddress?);
// Returns: string (reward amount)
```

### 9. `useGetAllSharesOnchain`
Gets all shares for a user across all outcomes (Player1, Player2, Draw).

**Usage:**
```typescript
const { getAllShares, isLoading, error } = useGetAllSharesOnchain();

const shares = await getAllShares(matchId, userAddress?);
// Returns: { p1Shares, p2Shares, drawShares }
```

## Features

- **No UI Popups**: All transactions use `uiOptions: { showWalletUIs: false }` to prevent wallet popups
- **Error Handling**: Each hook includes error state management
- **Loading States**: All hooks provide loading state indicators
- **Type Safety**: Full TypeScript support with proper types
- **Automatic Wallet Detection**: Uses the first available wallet from Privy

## Notes

- All amounts are expected as strings and will be parsed with 18 decimals
- Match IDs are converted to `uint64` (BigInt) internally
- Outcomes: 1 = Player1, 2 = Player2, 3 = Draw
- Status: 1 = Active, 2 = Resolved
- The hooks automatically wait for transaction confirmations before returning

