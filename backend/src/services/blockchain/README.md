# Blockchain Services Integration

This directory contains all blockchain contract interaction functions, integrated from the scripts folder to match the exact flow and patterns.

## Initialization

### Automatic Initialization
Both `createEscrow()` and `createMarket()` automatically check and initialize their respective stores if they don't exist.

### Manual Initialization (Optional)
You can also initialize stores manually on backend startup:

```typescript
import { initializeAllStores } from "./blockchain"

// On server startup
await initializeAllStores()
```

## Escrow Functions

### Flow (matches `example-escrow.ts`)

1. **Create Escrow** - Automatically initializes store if needed
   ```typescript
   import { createEscrow } from "./blockchain"
   
   const txHash = await createEscrow({
     matchId: 12345, // number
     player1: "0x...",
     player2: "0x...",
     amount: 100000, // in octas (0.1 APT)
   })
   ```

2. **Deposit** - Players deposit their stake
   ```typescript
   import { deposit } from "./blockchain"
   
   const txHash = await deposit({
     player: "0x...", // player's private key
     adminAddress: MODULE_ADDRESS,
     matchId: 12345,
   })
   ```

3. **Resolve** - Admin resolves the escrow
   ```typescript
   import { resolveWin, resolveDraw } from "./blockchain"
   
   // Winner takes all
   const txHash = await resolveWin({
     matchId: 12345,
     winner: "0x...", // winner's address
   })
   
   // Or draw (split)
   const txHash = await resolveDraw({
     matchId: 12345,
   })
   ```

## Prediction Market Functions

### Flow (matches `example-prediction-market.ts`)

1. **Create Market** - Automatically initializes stores if needed
   ```typescript
   import { createMarket } from "./blockchain"
   
   const txHash = await createMarket({
     matchId: 12345,
     player1: "0x...",
     player2: "0x...",
   })
   ```

2. **Place Bet**
   ```typescript
   import { bet, OUTCOME_PLAYER1, OUTCOME_PLAYER2, OUTCOME_DRAW } from "./blockchain"
   
   const txHash = await bet({
     userPrivateKey: "0x...",
     adminAddress: MODULE_ADDRESS,
     matchId: 12345,
     outcome: OUTCOME_PLAYER1, // or OUTCOME_PLAYER2, OUTCOME_DRAW
     amount: 100000, // in octas
   })
   ```

3. **Resolve Market**
   ```typescript
   import { resolveMarket, OUTCOME_PLAYER1 } from "./blockchain"
   
   const txHash = await resolveMarket({
     matchId: 12345,
     winningOutcome: OUTCOME_PLAYER1,
   })
   ```

4. **Claim Rewards**
   ```typescript
   import { claimRewards } from "./blockchain"
   
   const txHash = await claimRewards({
     userPrivateKey: "0x...",
     adminAddress: MODULE_ADDRESS,
     matchId: 12345,
   })
   ```

## View Functions

### Market Stats
```typescript
import { getMarketStats } from "./blockchain"

const stats = await getMarketStats({
  adminAddress: MODULE_ADDRESS,
  matchId: 12345,
})
// Returns: { status, winningOutcome, poolSize, player1Shares, player2Shares, drawShares }
```

### User Shares
```typescript
import { getUserShares, getUserAllShares } from "./blockchain"

// Get shares for specific outcome
const shares = await getUserShares({
  adminAddress: MODULE_ADDRESS,
  matchId: 12345,
  outcome: OUTCOME_PLAYER1,
  userAddress: "0x...",
})

// Get all shares
const allShares = await getUserAllShares(
  MODULE_ADDRESS,
  12345,
  "0x..." // user address
)
```

### Potential Reward
```typescript
import { getPotentialReward } from "./blockchain"

const reward = await getPotentialReward({
  adminAddress: MODULE_ADDRESS,
  matchId: 12345,
  outcome: OUTCOME_PLAYER1,
  userAddress: "0x...",
})
```

### Check Claim Status
```typescript
import { hasClaimed } from "./blockchain"

const claimed = await hasClaimed({
  adminAddress: MODULE_ADDRESS,
  matchId: 12345,
  userAddress: "0x...",
})
```

## Error Handling

All functions include comprehensive error handling matching the script patterns:

- **EESCROW_NOT_FOUND** / **EMARKET_NOT_FOUND** - Resource doesn't exist
- **EESCROW_ALREADY_EXISTS** / **EMARKET_ALREADY_EXISTS** - Already created
- **EALREADY_DEPOSITED** - Player already deposited
- **EESCROW_NOT_READY** - Both players haven't deposited yet
- **ENOT_ADMIN** - Not authorized as admin
- **ENO_SHARES** - No shares in winning outcome
- **EALREADY_CLAIMED** - Rewards already claimed

## Environment Variables

Required:
- `PRIVATE_KEY` - Admin private key for contract operations

## Notes

- All amounts are in **octas** (1 APT = 100,000,000 octas)
- `matchId` must be a **number** (contract requirement)
- Functions automatically handle store initialization
- Balance checks are performed before deposits/bets
- All transactions wait for confirmation before returning

