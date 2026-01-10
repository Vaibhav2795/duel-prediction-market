// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PredictionMarket
 * @dev Prediction market contract for betting on match outcomes
 */
contract PredictionMarket {
    using SafeERC20 for IERC20;

    // Error codes
    error NotAdmin();
    error MarketNotFound();
    error MarketAlreadyExists();
    error MarketAlreadyResolved();
    error InvalidOutcome();
    error ZeroBet();
    error NotResolved();
    error NoShares();
    error AlreadyClaimed();

    // Market outcome options
    uint8 public constant OUTCOME_PLAYER1 = 1;
    uint8 public constant OUTCOME_PLAYER2 = 2;
    uint8 public constant OUTCOME_DRAW = 3;

    // Market status
    uint8 public constant STATUS_ACTIVE = 1;
    uint8 public constant STATUS_RESOLVED = 2;

    // Market structure
    struct Market {
        address admin;
        uint64 matchId;
        address player1;
        address player2;
        uint8 status;
        uint8 winningOutcome;
        uint256 pool; // Total pool size
        uint256 originalPoolSize; // Store original pool size at resolution
        uint256 player1Shares;
        uint256 player2Shares;
        uint256 drawShares;
    }

    // Token used for betting
    IERC20 public immutable token;

    // Market storage
    mapping(uint64 => Market) public markets;
    
    // User shares: marketId => outcome => user => shares
    mapping(uint64 => mapping(uint8 => mapping(address => uint256))) public userShares;
    
    // Claim tracking: marketId => user => claimed
    mapping(uint64 => mapping(address => bool)) public hasClaimed;

    // Events
    event MarketCreated(uint64 indexed matchId, address indexed admin, address player1, address player2);
    event BetPlaced(uint64 indexed matchId, address indexed user, uint8 outcome, uint256 amount);
    event MarketResolved(uint64 indexed matchId, uint8 winningOutcome);
    event RewardsClaimed(uint64 indexed matchId, address indexed user, uint256 amount);

    constructor(address _token) {
        require(_token != address(0), "Invalid token address");
        token = IERC20(_token);
    }

    /**
     * @dev Create a new prediction market
     */
    function createMarket(
        uint64 matchId,
        address player1,
        address player2
    ) external {
        require(markets[matchId].admin == address(0), "MarketAlreadyExists");
        require(player1 != address(0) && player2 != address(0), "Invalid players");

        markets[matchId] = Market({
            admin: msg.sender,
            matchId: matchId,
            player1: player1,
            player2: player2,
            status: STATUS_ACTIVE,
            winningOutcome: 0,
            pool: 0,
            originalPoolSize: 0,
            player1Shares: 0,
            player2Shares: 0,
            drawShares: 0
        });

        emit MarketCreated(matchId, msg.sender, player1, player2);
    }

    /**
     * @dev Place a bet on a market outcome
     */
    function bet(
        uint64 matchId,
        uint8 outcome,
        uint256 amount
    ) external {
        if (outcome != OUTCOME_PLAYER1 && outcome != OUTCOME_PLAYER2 && outcome != OUTCOME_DRAW) {
            revert InvalidOutcome();
        }
        if (amount == 0) {
            revert ZeroBet();
        }

        Market storage market = markets[matchId];
        if (market.admin == address(0)) {
            revert MarketNotFound();
        }
        if (market.status != STATUS_ACTIVE) {
            revert MarketAlreadyResolved();
        }

        // Transfer tokens from user to contract
        token.safeTransferFrom(msg.sender, address(this), amount);

        // Update market totals
        if (outcome == OUTCOME_PLAYER1) {
            market.player1Shares += amount;
        } else if (outcome == OUTCOME_PLAYER2) {
            market.player2Shares += amount;
        } else {
            market.drawShares += amount;
        }

        // Update pool
        market.pool += amount;

        // Update user shares
        userShares[matchId][outcome][msg.sender] += amount;

        emit BetPlaced(matchId, msg.sender, outcome, amount);
    }

    /**
     * @dev Resolve market with winning outcome
     */
    function resolveMarket(
        uint64 matchId,
        uint8 winningOutcome
    ) external {
        if (winningOutcome != OUTCOME_PLAYER1 && winningOutcome != OUTCOME_PLAYER2 && winningOutcome != OUTCOME_DRAW) {
            revert InvalidOutcome();
        }

        Market storage market = markets[matchId];
        if (market.admin == address(0)) {
            revert MarketNotFound();
        }
        if (msg.sender != market.admin) {
            revert NotAdmin();
        }
        if (market.status != STATUS_ACTIVE) {
            revert MarketAlreadyResolved();
        }

        market.status = STATUS_RESOLVED;
        market.winningOutcome = winningOutcome;
        market.originalPoolSize = market.pool;

        emit MarketResolved(matchId, winningOutcome);
    }

    /**
     * @dev Claim rewards for winning outcome
     */
    function claimRewards(uint64 matchId) external {
        Market storage market = markets[matchId];
        if (market.admin == address(0)) {
            revert MarketNotFound();
        }
        if (market.status != STATUS_RESOLVED || market.winningOutcome == 0) {
            revert NotResolved();
        }
        if (hasClaimed[matchId][msg.sender]) {
            revert AlreadyClaimed();
        }

        uint8 winningOutcome = market.winningOutcome;
        uint256 userShareAmount = userShares[matchId][winningOutcome][msg.sender];
        
        if (userShareAmount == 0) {
            revert NoShares();
        }

        uint256 winningOutcomeShares;
        if (winningOutcome == OUTCOME_PLAYER1) {
            winningOutcomeShares = market.player1Shares;
        } else if (winningOutcome == OUTCOME_PLAYER2) {
            winningOutcomeShares = market.player2Shares;
        } else {
            winningOutcomeShares = market.drawShares;
        }

        if (winningOutcomeShares == 0) {
            revert NoShares();
        }

        // Calculate reward using original pool size
        uint256 reward = (userShareAmount * market.originalPoolSize) / winningOutcomeShares;

        // Mark as claimed
        hasClaimed[matchId][msg.sender] = true;

        // Remove user shares
        userShares[matchId][winningOutcome][msg.sender] = 0;

        // Transfer reward
        token.safeTransfer(msg.sender, reward);

        emit RewardsClaimed(matchId, msg.sender, reward);
    }

    // ========== Read/Getter Functions ==========

    /**
     * @dev Get market statistics
     */
    function getMarketStats(uint64 matchId)
        external
        view
        returns (
            uint8 status,
            uint8 winningOutcome,
            uint256 totalPool,
            uint256 p1Shares,
            uint256 p2Shares,
            uint256 drawShares
        )
    {
        Market storage market = markets[matchId];
        if (market.admin == address(0)) {
            revert MarketNotFound();
        }

        return (
            market.status,
            market.winningOutcome,
            market.pool,
            market.player1Shares,
            market.player2Shares,
            market.drawShares
        );
    }

    /**
     * @dev Get user's shares in a specific outcome
     */
    function getUserShares(
        uint64 matchId,
        uint8 outcome,
        address user
    ) external view returns (uint256) {
        return userShares[matchId][outcome][user];
    }

    /**
     * @dev Check if user has claimed rewards
     */
    function hasUserClaimed(uint64 matchId, address user) external view returns (bool) {
        return hasClaimed[matchId][user];
    }

    /**
     * @dev Get potential reward for a user's outcome
     */
    function getPotentialReward(
        uint64 matchId,
        uint8 outcome,
        address user
    ) external view returns (uint256) {
        Market storage market = markets[matchId];
        if (market.admin == address(0)) {
            return 0;
        }

        uint256 userShareAmount = userShares[matchId][outcome][user];
        if (userShareAmount == 0) {
            return 0;
        }

        if (market.status == STATUS_RESOLVED && market.winningOutcome != outcome) {
            return 0;
        }

        uint256 outcomeShares;
        if (outcome == OUTCOME_PLAYER1) {
            outcomeShares = market.player1Shares;
        } else if (outcome == OUTCOME_PLAYER2) {
            outcomeShares = market.player2Shares;
        } else {
            outcomeShares = market.drawShares;
        }

        if (outcomeShares == 0) {
            return 0;
        }

        uint256 totalPool = market.pool;
        return (userShareAmount * totalPool) / outcomeShares;
    }

    /**
     * @dev Get all user shares across all outcomes
     */
    function getUserAllShares(uint64 matchId, address user)
        external
        view
        returns (
            uint256 p1Shares,
            uint256 p2Shares,
            uint256 drawShares
        )
    {
        return (
            userShares[matchId][OUTCOME_PLAYER1][user],
            userShares[matchId][OUTCOME_PLAYER2][user],
            userShares[matchId][OUTCOME_DRAW][user]
        );
    }

    /**
     * @dev Check if market exists
     */
    function marketExists(uint64 matchId) external view returns (bool) {
        return markets[matchId].admin != address(0);
    }

    /**
     * @dev Get market admin
     */
    function getMarketAdmin(uint64 matchId) external view returns (address) {
        Market storage market = markets[matchId];
        if (market.admin == address(0)) {
            revert MarketNotFound();
        }
        return market.admin;
    }
}

