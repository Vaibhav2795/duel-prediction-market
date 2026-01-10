# Contract Interaction Scripts

This folder contains TypeScript scripts to interact with the Chess Escrow and Prediction Market contracts.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set your private key as an environment variable:
```bash
export PRIVATE_KEY="your_private_key_here"
```

**⚠️ WARNING: Never commit your private key to version control!**

## Contract Information

- **Module Address**: `0xed101e6c098f47d3a9ff8cf2dae4331fc2a55848502942246878b2ab63b90b4d`
- **Deployment Transaction**: `0x76223771c7f1720f65b1d1300659d101867676a996e225406b6aa10292eb258d`

## Chess Escrow Contract

The escrow contract manages deposits and payouts for chess matches.

### Available Functions

#### `initializeEscrow(account: Account)`
Initialize the escrow store. Must be called once by the admin before creating escrows.

#### `createEscrow(admin: Account, matchId: number, player1: string, player2: string, amount: number)`
Create a new escrow for a match.

- `matchId`: Unique identifier for the match
- `player1`: Address of player 1
- `player2`: Address of player 2
- `amount`: Deposit amount in octas (1 APT = 100,000,000 octas)

#### `deposit(player: Account, adminAddress: string, matchId: number)`
Player deposits their stake into the escrow.

#### `resolveWin(admin: Account, matchId: number, winner: string)`
Resolve escrow when there's a winner. Winner takes all (minus 5% fee).

#### `resolveDraw(admin: Account, matchId: number)`
Resolve escrow when match is a draw. Players split the pool (minus 5% fee).

### Example Usage

```typescript
import { createAccountFromPrivateKey } from "./config.js";
import { initializeEscrow, createEscrow, deposit, resolveWin } from "./escrow.js";

const account = createAccountFromPrivateKey(process.env.PRIVATE_KEY!);

// Initialize (once)
await initializeEscrow(account);

// Create escrow
await createEscrow(
    account,
    1, // match_id
    "0x123...", // player1
    "0x456...", // player2
    100000000 // 0.1 APT
);

// Player 1 deposits
await deposit(player1Account, MODULE_ADDRESS, 1);

// Player 2 deposits
await deposit(player2Account, MODULE_ADDRESS, 1);

// Resolve with winner
await resolveWin(account, 1, "0x123...");
```

## Prediction Market Contract

The prediction market allows users to bet on match outcomes.

### Available Functions

#### Entry Functions

- `initializePredictionMarket(account: Account)` - Initialize the market store
- `createMarket(admin: Account, matchId: number, player1: string, player2: string)` - Create a new market
- `bet(user: Account, adminAddress: string, matchId: number, outcome: number, amount: number)` - Place a bet
- `resolveMarket(admin: Account, matchId: number, winningOutcome: number)` - Resolve the market
- `claimRewards(user: Account, adminAddress: string, matchId: number)` - Claim winnings

#### View Functions

- `getMarketStats(adminAddress: string, matchId: number)` - Get market statistics
- `getUserShares(adminAddress: string, matchId: number, outcome: number, userAddress: string)` - Get user's shares in an outcome
- `getUserAllShares(adminAddress: string, matchId: number, userAddress: string)` - Get all user shares
- `getPotentialReward(adminAddress: string, matchId: number, outcome: number, userAddress: string)` - Calculate potential reward
- `hasClaimed(adminAddress: string, matchId: number, userAddress: string)` - Check if user has claimed
- `marketExists(adminAddress: string, matchId: number)` - Check if market exists

### Outcome Constants

```typescript
OUTCOME_PLAYER1 = 1
OUTCOME_PLAYER2 = 2
OUTCOME_DRAW = 3
```

### Example Usage

```typescript
import { createAccountFromPrivateKey, MODULE_ADDRESS } from "./config.js";
import { 
    initializePredictionMarket, 
    createMarket, 
    bet, 
    resolveMarket, 
    claimRewards,
    getMarketStats,
    OUTCOME_PLAYER1 
} from "./prediction-market.js";

const account = createAccountFromPrivateKey(process.env.PRIVATE_KEY!);

// Initialize (once)
await initializePredictionMarket(account);

// Create market
await createMarket(
    account,
    1, // match_id
    "0x123...", // player1
    "0x456..." // player2
);

// Place bet on player 1
await bet(
    account,
    MODULE_ADDRESS,
    1, // match_id
    OUTCOME_PLAYER1, // outcome
    100000000 // 0.1 APT
);

// Check market stats
await getMarketStats(MODULE_ADDRESS, 1);

// Resolve market
await resolveMarket(account, 1, OUTCOME_PLAYER1);

// Claim rewards
await claimRewards(account, MODULE_ADDRESS, 1);
```

## Running Scripts

### Comprehensive Test Scripts

We provide comprehensive test scripts that test ALL functions in logical order:

```bash
# Test escrow contract (all functions)
PRIVATE_KEY=admin_key PRIVATE_KEY2=user2_key npm run test:escrow

# Test prediction market contract (all functions)
PRIVATE_KEY=admin_key PRIVATE_KEY2=user2_key npm run test:prediction-market

# Test both contracts
PRIVATE_KEY=admin_key PRIVATE_KEY2=user2_key npm run test:all
```

**Test Addresses:**
- Admin: `0xed101e6c098f47d3a9ff8cf2dae4331fc2a55848502942246878b2ab63b90b4d` (uses `PRIVATE_KEY`)
- User 2: `0x2cd9c41f929c001a11e57de6b8a7d607cb1f1aca7b8d0435a393f10ee39dbcfa` (uses `PRIVATE_KEY2`)

### Example Scripts

We also provide example scripts that demonstrate how to use the contracts:

```bash
# Run escrow example
PRIVATE_KEY=your_private_key npm run example:escrow

# Run prediction market example
PRIVATE_KEY=your_private_key npm run example:prediction-market
```

### Using as Modules

You can also import the functions as modules in your own scripts:

```typescript
import { createEscrow } from "./escrow.js";
import { createMarket, bet } from "./prediction-market.js";
```

## Network Configuration

To change the network configuration, modify `config.ts`.

## Notes

- All amounts are in octas (1 APT = 100,000,000 octas)
- The admin address is the same as the module address
- Transactions include explorer links for easy tracking
- View functions don't require transactions and are free to call

