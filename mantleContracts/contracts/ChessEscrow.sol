// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title ChessEscrow
 * @dev Escrow contract for managing player deposits in chess matches
 */
contract ChessEscrow {
    using SafeERC20 for IERC20;

    // Error codes
    error NotAdmin();
    error AlreadyDeposited();
    error EscrowNotReady();
    error EscrowNotFound();
    error EscrowAlreadyExists();

    // Escrow structure
    struct Escrow {
        address admin;
        address player1;
        address player2;
        uint256 amount;
        uint256 total;
        bool deposited1;
        bool deposited2;
    }

    // Token used for deposits
    IERC20 public immutable token;

    // Fee percentage (5%)
    uint256 public constant FEE_PERCENTAGE = 5;

    // Escrow storage: matchId => Escrow
    mapping(uint64 => Escrow) public escrows;

    // Events
    event EscrowCreated(uint64 indexed matchId, address indexed admin, address player1, address player2, uint256 amount);
    event DepositMade(uint64 indexed matchId, address indexed player, uint256 amount);
    event EscrowResolvedWin(uint64 indexed matchId, address indexed winner, uint256 payout, uint256 fee);
    event EscrowResolvedDraw(uint64 indexed matchId, address player1, address player2, uint256 split, uint256 fee);

    constructor(address _token) {
        require(_token != address(0), "Invalid token address");
        token = IERC20(_token);
    }

    /**
     * @dev Create escrow (admin only)
     */
    function createEscrow(
        uint64 matchId,
        address player1,
        address player2,
        uint256 amount
    ) external {
        if (escrows[matchId].admin != address(0)) {
            revert EscrowAlreadyExists();
        }
        require(player1 != address(0) && player2 != address(0), "Invalid players");
        require(amount > 0, "Invalid amount");

        escrows[matchId] = Escrow({
            admin: msg.sender,
            player1: player1,
            player2: player2,
            amount: amount,
            total: 0,
            deposited1: false,
            deposited2: false
        });

        emit EscrowCreated(matchId, msg.sender, player1, player2, amount);
    }

    /**
     * @dev Player deposit
     */
    function deposit(uint64 matchId) external {
        Escrow storage escrow = escrows[matchId];
        if (escrow.admin == address(0)) {
            revert EscrowNotFound();
        }

        address sender = msg.sender;

        if (sender == escrow.player1) {
            if (escrow.deposited1) {
                revert AlreadyDeposited();
            }
            token.safeTransferFrom(sender, address(this), escrow.amount);
            escrow.deposited1 = true;
            escrow.total += escrow.amount;
            emit DepositMade(matchId, sender, escrow.amount);
        } else if (sender == escrow.player2) {
            if (escrow.deposited2) {
                revert AlreadyDeposited();
            }
            token.safeTransferFrom(sender, address(this), escrow.amount);
            escrow.deposited2 = true;
            escrow.total += escrow.amount;
            emit DepositMade(matchId, sender, escrow.amount);
        } else {
            revert EscrowNotFound();
        }
    }

    /**
     * @dev Resolve WINNER TAKES ALL (minus fee)
     */
    function resolveWin(uint64 matchId, address winner) external {
        Escrow storage escrow = escrows[matchId];
        if (escrow.admin == address(0)) {
            revert EscrowNotFound();
        }
        if (msg.sender != escrow.admin) {
            revert NotAdmin();
        }
        if (!escrow.deposited1 || !escrow.deposited2) {
            revert EscrowNotReady();
        }

        uint256 total = escrow.total;
        uint256 fee = (total * FEE_PERCENTAGE) / 100;
        uint256 payout = total - fee;

        // Transfer to winner
        token.safeTransfer(winner, payout);

        // Transfer fee to admin
        if (fee > 0) {
            token.safeTransfer(escrow.admin, fee);
        }

        emit EscrowResolvedWin(matchId, winner, payout, fee);

        // Remove escrow
        delete escrows[matchId];
    }

    /**
     * @dev Resolve DRAW (split after fee)
     */
    function resolveDraw(uint64 matchId) external {
        Escrow storage escrow = escrows[matchId];
        if (escrow.admin == address(0)) {
            revert EscrowNotFound();
        }
        if (msg.sender != escrow.admin) {
            revert NotAdmin();
        }
        if (!escrow.deposited1 || !escrow.deposited2) {
            revert EscrowNotReady();
        }

        uint256 total = escrow.total;
        uint256 fee = (total * FEE_PERCENTAGE) / 100;
        uint256 remaining = total - fee;
        uint256 split = remaining / 2;

        // Refund players
        token.safeTransfer(escrow.player1, split);
        token.safeTransfer(escrow.player2, split);

        // Transfer fee to admin
        if (fee > 0) {
            token.safeTransfer(escrow.admin, fee);
        }

        emit EscrowResolvedDraw(matchId, escrow.player1, escrow.player2, split, fee);

        // Remove escrow
        delete escrows[matchId];
    }

    /**
     * @dev Check if escrow exists
     */
    function escrowExists(uint64 matchId) external view returns (bool) {
        return escrows[matchId].admin != address(0);
    }

    /**
     * @dev Get escrow details
     */
    function getEscrow(uint64 matchId)
        external
        view
        returns (
            address admin,
            address player1,
            address player2,
            uint256 amount,
            uint256 total,
            bool deposited1,
            bool deposited2
        )
    {
        Escrow storage escrow = escrows[matchId];
        if (escrow.admin == address(0)) {
            revert EscrowNotFound();
        }

        return (
            escrow.admin,
            escrow.player1,
            escrow.player2,
            escrow.amount,
            escrow.total,
            escrow.deposited1,
            escrow.deposited2
        );
    }
}

