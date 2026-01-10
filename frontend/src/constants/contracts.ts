import type { Address } from 'viem';
// Import ABIs from the contracts directory
// Note: These paths are relative to the frontend/src directory
import ChessEscrowABI from '../../../mantleContracts/artifacts/contracts/ChessEscrow.sol/ChessEscrow.json';
import PredictionMarketABI from '../../../mantleContracts/artifacts/contracts/PredictionMarket.sol/PredictionMarket.json';

// Contract addresses from environment variables
export const CHESS_ESCROW_ADDRESS = (import.meta.env.VITE_CHESS_ESCROW_ADDRESS || '') as Address;
export const PREDICTION_MARKET_ADDRESS = (import.meta.env.VITE_PREDICTION_MARKET_ADDRESS || '') as Address;
export const TOKEN_ADDRESS = (import.meta.env.VITE_TOKEN_ADDRESS || '') as Address;

// Contract ABIs
export const CHESS_ESCROW_ABI = ChessEscrowABI.abi;
export const PREDICTION_MARKET_ABI = PredictionMarketABI.abi;

// Outcome constants
export const OUTCOME_PLAYER1 = 1;
export const OUTCOME_PLAYER2 = 2;
export const OUTCOME_DRAW = 3;

// Status constants
export const STATUS_ACTIVE = 1;
export const STATUS_RESOLVED = 2;

