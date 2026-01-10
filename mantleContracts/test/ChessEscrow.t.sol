// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {ChessEscrow} from "../contracts/ChessEscrow.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock ERC20 token for testing
contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1000000 * 10**decimals());
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract ChessEscrowTest is Test {
    ChessEscrow public escrow;
    MockERC20 public token;
    
    address public admin;
    address public player1;
    address public player2;
    address public nonPlayer;
    
    uint64 public constant MATCH_ID = 1;
    uint256 public constant DEPOSIT_AMOUNT = 1000 * 10**18;
    uint256 public constant FEE_PERCENTAGE = 5;

    event EscrowCreated(uint64 indexed matchId, address indexed admin, address player1, address player2, uint256 amount);
    event DepositMade(uint64 indexed matchId, address indexed player, uint256 amount);
    event EscrowResolvedWin(uint64 indexed matchId, address indexed winner, uint256 payout, uint256 fee);
    event EscrowResolvedDraw(uint64 indexed matchId, address player1, address player2, uint256 split, uint256 fee);

    function setUp() public {
        admin = address(1);
        player1 = address(2);
        player2 = address(3);
        nonPlayer = address(4);

        // Deploy token
        token = new MockERC20("Test Token", "TEST");
        
        // Mint tokens to players
        token.mint(player1, 10000 * 10**18);
        token.mint(player2, 10000 * 10**18);
        token.mint(admin, 10000 * 10**18);

        // Deploy escrow
        vm.prank(admin);
        escrow = new ChessEscrow(address(token));
    }

    // ========== Constructor Tests ==========

    function test_Constructor_SetsToken() public {
        assertEq(address(escrow.token()), address(token));
    }

    function test_Constructor_RevertsIfZeroAddress() public {
        vm.expectRevert("Invalid token address");
        new ChessEscrow(address(0));
    }

    function test_Constructor_SetsFeePercentage() public {
        assertEq(escrow.FEE_PERCENTAGE(), FEE_PERCENTAGE);
    }

    // ========== createEscrow Tests ==========

    function test_CreateEscrow_Success() public {
        vm.prank(admin);
        escrow.createEscrow(MATCH_ID, player1, player2, DEPOSIT_AMOUNT);

        (address escrowAdmin, address escrowPlayer1, address escrowPlayer2, uint256 amount, uint256 total, bool deposited1, bool deposited2) = 
            escrow.getEscrow(MATCH_ID);

        assertEq(escrowAdmin, admin);
        assertEq(escrowPlayer1, player1);
        assertEq(escrowPlayer2, player2);
        assertEq(amount, DEPOSIT_AMOUNT);
        assertEq(total, 0);
        assertEq(deposited1, false);
        assertEq(deposited2, false);
    }

    function test_CreateEscrow_EmitsEvent() public {
        vm.expectEmit(true, true, true, true);
        emit EscrowCreated(MATCH_ID, admin, player1, player2, DEPOSIT_AMOUNT);

        vm.prank(admin);
        escrow.createEscrow(MATCH_ID, player1, player2, DEPOSIT_AMOUNT);
    }

    function test_CreateEscrow_RevertsIfEscrowExists() public {
        vm.prank(admin);
        escrow.createEscrow(MATCH_ID, player1, player2, DEPOSIT_AMOUNT);

        vm.expectRevert(ChessEscrow.EscrowAlreadyExists.selector);
        vm.prank(admin);
        escrow.createEscrow(MATCH_ID, player1, player2, DEPOSIT_AMOUNT);
    }

    function test_CreateEscrow_RevertsIfPlayer1Zero() public {
        vm.expectRevert("Invalid players");
        vm.prank(admin);
        escrow.createEscrow(MATCH_ID, address(0), player2, DEPOSIT_AMOUNT);
    }

    function test_CreateEscrow_RevertsIfPlayer2Zero() public {
        vm.expectRevert("Invalid players");
        vm.prank(admin);
        escrow.createEscrow(MATCH_ID, player1, address(0), DEPOSIT_AMOUNT);
    }

    function test_CreateEscrow_RevertsIfAmountZero() public {
        vm.expectRevert("Invalid amount");
        vm.prank(admin);
        escrow.createEscrow(MATCH_ID, player1, player2, 0);
    }

    function test_CreateEscrow_CanBeCalledByAnyone() public {
        vm.prank(nonPlayer);
        escrow.createEscrow(MATCH_ID, player1, player2, DEPOSIT_AMOUNT);

        (address escrowAdmin, address escrowPlayer1, address escrowPlayer2, uint256 amount, uint256 total, bool deposited1, bool deposited2) = escrow.getEscrow(MATCH_ID);
        assertEq(escrowAdmin, nonPlayer);
    }

    // ========== deposit Tests ==========

    function test_Deposit_Player1Success() public {
        vm.prank(admin);
        escrow.createEscrow(MATCH_ID, player1, player2, DEPOSIT_AMOUNT);

        vm.startPrank(player1);
        token.approve(address(escrow), DEPOSIT_AMOUNT);
        
        vm.expectEmit(true, true, true, true);
        emit DepositMade(MATCH_ID, player1, DEPOSIT_AMOUNT);
        
        escrow.deposit(MATCH_ID);
        vm.stopPrank();

        (,,, uint256 amount, uint256 total, bool deposited1, bool deposited2) = escrow.getEscrow(MATCH_ID);
        assertEq(total, DEPOSIT_AMOUNT);
        assertEq(deposited1, true);
        assertEq(deposited2, false);
    }

    function test_Deposit_Player2Success() public {
        vm.prank(admin);
        escrow.createEscrow(MATCH_ID, player1, player2, DEPOSIT_AMOUNT);

        vm.startPrank(player2);
        token.approve(address(escrow), DEPOSIT_AMOUNT);
        
        vm.expectEmit(true, true, true, true);
        emit DepositMade(MATCH_ID, player2, DEPOSIT_AMOUNT);
        
        escrow.deposit(MATCH_ID);
        vm.stopPrank();

        (,,, uint256 amount, uint256 total, bool deposited1, bool deposited2) = escrow.getEscrow(MATCH_ID);
        assertEq(total, DEPOSIT_AMOUNT);
        assertEq(deposited1, false);
        assertEq(deposited2, true);
    }

    function test_Deposit_BothPlayers() public {
        vm.prank(admin);
        escrow.createEscrow(MATCH_ID, player1, player2, DEPOSIT_AMOUNT);

        // Player1 deposits
        vm.startPrank(player1);
        token.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit(MATCH_ID);
        vm.stopPrank();

        // Player2 deposits
        vm.startPrank(player2);
        token.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit(MATCH_ID);
        vm.stopPrank();

        (,,, uint256 amount, uint256 total, bool deposited1, bool deposited2) = escrow.getEscrow(MATCH_ID);
        assertEq(total, DEPOSIT_AMOUNT * 2);
        assertEq(deposited1, true);
        assertEq(deposited2, true);
    }

    function test_Deposit_RevertsIfEscrowNotFound() public {
        vm.expectRevert(ChessEscrow.EscrowNotFound.selector);
        vm.prank(player1);
        escrow.deposit(MATCH_ID);
    }

    function test_Deposit_RevertsIfNotPlayer() public {
        vm.prank(admin);
        escrow.createEscrow(MATCH_ID, player1, player2, DEPOSIT_AMOUNT);

        vm.expectRevert(ChessEscrow.EscrowNotFound.selector);
        vm.prank(nonPlayer);
        escrow.deposit(MATCH_ID);
    }

    function test_Deposit_RevertsIfAlreadyDeposited_Player1() public {
        vm.prank(admin);
        escrow.createEscrow(MATCH_ID, player1, player2, DEPOSIT_AMOUNT);

        vm.startPrank(player1);
        token.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit(MATCH_ID);
        
        vm.expectRevert(ChessEscrow.AlreadyDeposited.selector);
        escrow.deposit(MATCH_ID);
        vm.stopPrank();
    }

    function test_Deposit_RevertsIfAlreadyDeposited_Player2() public {
        vm.prank(admin);
        escrow.createEscrow(MATCH_ID, player1, player2, DEPOSIT_AMOUNT);

        vm.startPrank(player2);
        token.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit(MATCH_ID);
        
        vm.expectRevert(ChessEscrow.AlreadyDeposited.selector);
        escrow.deposit(MATCH_ID);
        vm.stopPrank();
    }

    function test_Deposit_TransfersTokens() public {
        vm.prank(admin);
        escrow.createEscrow(MATCH_ID, player1, player2, DEPOSIT_AMOUNT);

        uint256 balanceBefore = token.balanceOf(player1);
        uint256 escrowBalanceBefore = token.balanceOf(address(escrow));

        vm.startPrank(player1);
        token.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit(MATCH_ID);
        vm.stopPrank();

        assertEq(token.balanceOf(player1), balanceBefore - DEPOSIT_AMOUNT);
        assertEq(token.balanceOf(address(escrow)), escrowBalanceBefore + DEPOSIT_AMOUNT);
    }

    // ========== resolveWin Tests ==========

    function test_ResolveWin_Success() public {
        vm.prank(admin);
        escrow.createEscrow(MATCH_ID, player1, player2, DEPOSIT_AMOUNT);

        // Both players deposit
        vm.startPrank(player1);
        token.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit(MATCH_ID);
        vm.stopPrank();

        vm.startPrank(player2);
        token.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit(MATCH_ID);
        vm.stopPrank();

        uint256 total = DEPOSIT_AMOUNT * 2;
        uint256 fee = (total * FEE_PERCENTAGE) / 100;
        uint256 payout = total - fee;

        uint256 winnerBalanceBefore = token.balanceOf(player1);
        uint256 adminBalanceBefore = token.balanceOf(admin);

        vm.expectEmit(true, true, true, true);
        emit EscrowResolvedWin(MATCH_ID, player1, payout, fee);

        vm.prank(admin);
        escrow.resolveWin(MATCH_ID, player1);

        assertEq(token.balanceOf(player1), winnerBalanceBefore + payout);
        assertEq(token.balanceOf(admin), adminBalanceBefore + fee);
        assertEq(token.balanceOf(address(escrow)), 0);
    }

    function test_ResolveWin_Player2Wins() public {
        vm.prank(admin);
        escrow.createEscrow(MATCH_ID, player1, player2, DEPOSIT_AMOUNT);

        vm.startPrank(player1);
        token.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit(MATCH_ID);
        vm.stopPrank();

        vm.startPrank(player2);
        token.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit(MATCH_ID);
        vm.stopPrank();

        uint256 total = DEPOSIT_AMOUNT * 2;
        uint256 fee = (total * FEE_PERCENTAGE) / 100;
        uint256 payout = total - fee;

        uint256 winnerBalanceBefore = token.balanceOf(player2);

        vm.prank(admin);
        escrow.resolveWin(MATCH_ID, player2);

        assertEq(token.balanceOf(player2), winnerBalanceBefore + payout);
    }

    function test_ResolveWin_RevertsIfNotAdmin() public {
        vm.prank(admin);
        escrow.createEscrow(MATCH_ID, player1, player2, DEPOSIT_AMOUNT);

        vm.startPrank(player1);
        token.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit(MATCH_ID);
        vm.stopPrank();

        vm.startPrank(player2);
        token.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit(MATCH_ID);
        vm.stopPrank();

        vm.expectRevert(ChessEscrow.NotAdmin.selector);
        vm.prank(player1);
        escrow.resolveWin(MATCH_ID, player1);
    }

    function test_ResolveWin_RevertsIfEscrowNotFound() public {
        vm.expectRevert(ChessEscrow.EscrowNotFound.selector);
        vm.prank(admin);
        escrow.resolveWin(MATCH_ID, player1);
    }

    function test_ResolveWin_RevertsIfNotReady_Player1Missing() public {
        vm.prank(admin);
        escrow.createEscrow(MATCH_ID, player1, player2, DEPOSIT_AMOUNT);

        vm.startPrank(player2);
        token.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit(MATCH_ID);
        vm.stopPrank();

        vm.expectRevert(ChessEscrow.EscrowNotReady.selector);
        vm.prank(admin);
        escrow.resolveWin(MATCH_ID, player1);
    }

    function test_ResolveWin_RevertsIfNotReady_Player2Missing() public {
        vm.prank(admin);
        escrow.createEscrow(MATCH_ID, player1, player2, DEPOSIT_AMOUNT);

        vm.startPrank(player1);
        token.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit(MATCH_ID);
        vm.stopPrank();

        vm.expectRevert(ChessEscrow.EscrowNotReady.selector);
        vm.prank(admin);
        escrow.resolveWin(MATCH_ID, player1);
    }

    function test_ResolveWin_DeletesEscrow() public {
        vm.prank(admin);
        escrow.createEscrow(MATCH_ID, player1, player2, DEPOSIT_AMOUNT);

        vm.startPrank(player1);
        token.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit(MATCH_ID);
        vm.stopPrank();

        vm.startPrank(player2);
        token.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit(MATCH_ID);
        vm.stopPrank();

        vm.prank(admin);
        escrow.resolveWin(MATCH_ID, player1);

        assertEq(escrow.escrowExists(MATCH_ID), false);
    }

    function test_ResolveWin_FeeCalculation() public {
        vm.prank(admin);
        escrow.createEscrow(MATCH_ID, player1, player2, DEPOSIT_AMOUNT);

        vm.startPrank(player1);
        token.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit(MATCH_ID);
        vm.stopPrank();

        vm.startPrank(player2);
        token.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit(MATCH_ID);
        vm.stopPrank();

        uint256 total = DEPOSIT_AMOUNT * 2;
        uint256 expectedFee = (total * FEE_PERCENTAGE) / 100;
        uint256 expectedPayout = total - expectedFee;

        uint256 adminBalanceBefore = token.balanceOf(admin);

        vm.prank(admin);
        escrow.resolveWin(MATCH_ID, player1);

        assertEq(token.balanceOf(admin), adminBalanceBefore + expectedFee);
    }

    // ========== resolveDraw Tests ==========

    function test_ResolveDraw_Success() public {
        vm.prank(admin);
        escrow.createEscrow(MATCH_ID, player1, player2, DEPOSIT_AMOUNT);

        vm.startPrank(player1);
        token.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit(MATCH_ID);
        vm.stopPrank();

        vm.startPrank(player2);
        token.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit(MATCH_ID);
        vm.stopPrank();

        uint256 total = DEPOSIT_AMOUNT * 2;
        uint256 fee = (total * FEE_PERCENTAGE) / 100;
        uint256 remaining = total - fee;
        uint256 split = remaining / 2;

        uint256 player1BalanceBefore = token.balanceOf(player1);
        uint256 player2BalanceBefore = token.balanceOf(player2);
        uint256 adminBalanceBefore = token.balanceOf(admin);

        vm.expectEmit(true, true, true, true);
        emit EscrowResolvedDraw(MATCH_ID, player1, player2, split, fee);

        vm.prank(admin);
        escrow.resolveDraw(MATCH_ID);

        assertEq(token.balanceOf(player1), player1BalanceBefore + split);
        assertEq(token.balanceOf(player2), player2BalanceBefore + split);
        assertEq(token.balanceOf(admin), adminBalanceBefore + fee);
        assertEq(token.balanceOf(address(escrow)), 0);
    }

    function test_ResolveDraw_RevertsIfNotAdmin() public {
        vm.prank(admin);
        escrow.createEscrow(MATCH_ID, player1, player2, DEPOSIT_AMOUNT);

        vm.startPrank(player1);
        token.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit(MATCH_ID);
        vm.stopPrank();

        vm.startPrank(player2);
        token.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit(MATCH_ID);
        vm.stopPrank();

        vm.expectRevert(ChessEscrow.NotAdmin.selector);
        vm.prank(player1);
        escrow.resolveDraw(MATCH_ID);
    }

    function test_ResolveDraw_RevertsIfEscrowNotFound() public {
        vm.expectRevert(ChessEscrow.EscrowNotFound.selector);
        vm.prank(admin);
        escrow.resolveDraw(MATCH_ID);
    }

    function test_ResolveDraw_RevertsIfNotReady() public {
        vm.prank(admin);
        escrow.createEscrow(MATCH_ID, player1, player2, DEPOSIT_AMOUNT);

        vm.expectRevert(ChessEscrow.EscrowNotReady.selector);
        vm.prank(admin);
        escrow.resolveDraw(MATCH_ID);
    }

    function test_ResolveDraw_DeletesEscrow() public {
        vm.prank(admin);
        escrow.createEscrow(MATCH_ID, player1, player2, DEPOSIT_AMOUNT);

        vm.startPrank(player1);
        token.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit(MATCH_ID);
        vm.stopPrank();

        vm.startPrank(player2);
        token.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit(MATCH_ID);
        vm.stopPrank();

        vm.prank(admin);
        escrow.resolveDraw(MATCH_ID);

        assertEq(escrow.escrowExists(MATCH_ID), false);
    }

    function test_ResolveDraw_FeeCalculation() public {
        vm.prank(admin);
        escrow.createEscrow(MATCH_ID, player1, player2, DEPOSIT_AMOUNT);

        vm.startPrank(player1);
        token.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit(MATCH_ID);
        vm.stopPrank();

        vm.startPrank(player2);
        token.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit(MATCH_ID);
        vm.stopPrank();

        uint256 total = DEPOSIT_AMOUNT * 2;
        uint256 expectedFee = (total * FEE_PERCENTAGE) / 100;
        uint256 expectedRemaining = total - expectedFee;
        uint256 expectedSplit = expectedRemaining / 2;

        uint256 adminBalanceBefore = token.balanceOf(admin);

        vm.prank(admin);
        escrow.resolveDraw(MATCH_ID);

        assertEq(token.balanceOf(admin), adminBalanceBefore + expectedFee);
    }

    // ========== escrowExists Tests ==========

    function test_EscrowExists_ReturnsTrue() public {
        vm.prank(admin);
        escrow.createEscrow(MATCH_ID, player1, player2, DEPOSIT_AMOUNT);

        assertTrue(escrow.escrowExists(MATCH_ID));
    }

    function test_EscrowExists_ReturnsFalse() public {
        assertFalse(escrow.escrowExists(MATCH_ID));
    }

    function test_EscrowExists_ReturnsFalseAfterResolution() public {
        vm.prank(admin);
        escrow.createEscrow(MATCH_ID, player1, player2, DEPOSIT_AMOUNT);

        vm.startPrank(player1);
        token.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit(MATCH_ID);
        vm.stopPrank();

        vm.startPrank(player2);
        token.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit(MATCH_ID);
        vm.stopPrank();

        vm.prank(admin);
        escrow.resolveWin(MATCH_ID, player1);

        assertFalse(escrow.escrowExists(MATCH_ID));
    }

    // ========== getEscrow Tests ==========

    function test_GetEscrow_ReturnsCorrectData() public {
        vm.prank(admin);
        escrow.createEscrow(MATCH_ID, player1, player2, DEPOSIT_AMOUNT);

        vm.startPrank(player1);
        token.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit(MATCH_ID);
        vm.stopPrank();

        (address escrowAdmin, address escrowPlayer1, address escrowPlayer2, uint256 amount, uint256 total, bool deposited1, bool deposited2) = 
            escrow.getEscrow(MATCH_ID);

        assertEq(escrowAdmin, admin);
        assertEq(escrowPlayer1, player1);
        assertEq(escrowPlayer2, player2);
        assertEq(amount, DEPOSIT_AMOUNT);
        assertEq(total, DEPOSIT_AMOUNT);
        assertEq(deposited1, true);
        assertEq(deposited2, false);
    }

    function test_GetEscrow_RevertsIfNotFound() public {
        vm.expectRevert(ChessEscrow.EscrowNotFound.selector);
        escrow.getEscrow(MATCH_ID);
    }

    // ========== Edge Cases ==========

    function test_MultipleEscrows_DifferentMatchIds() public {
        uint64 matchId1 = 1;
        uint64 matchId2 = 2;

        vm.prank(admin);
        escrow.createEscrow(matchId1, player1, player2, DEPOSIT_AMOUNT);

        vm.prank(admin);
        escrow.createEscrow(matchId2, player1, player2, DEPOSIT_AMOUNT * 2);

        assertTrue(escrow.escrowExists(matchId1));
        assertTrue(escrow.escrowExists(matchId2));

        (,,, uint256 amount1,,,) = escrow.getEscrow(matchId1);
        (,,, uint256 amount2,,,) = escrow.getEscrow(matchId2);

        assertEq(amount1, DEPOSIT_AMOUNT);
        assertEq(amount2, DEPOSIT_AMOUNT * 2);
    }

    function test_ResolveWin_WithZeroFee() public {
        // Test with very small amounts where fee might round to zero
        uint256 smallAmount = 1;
        
        vm.prank(admin);
        escrow.createEscrow(MATCH_ID, player1, player2, smallAmount);

        token.mint(player1, smallAmount);
        token.mint(player2, smallAmount);

        // Get balance after minting (before deposit)
        uint256 player1BalanceAfterMint = token.balanceOf(player1);

        vm.startPrank(player1);
        token.approve(address(escrow), smallAmount);
        escrow.deposit(MATCH_ID);
        vm.stopPrank();

        vm.startPrank(player2);
        token.approve(address(escrow), smallAmount);
        escrow.deposit(MATCH_ID);
        vm.stopPrank();

        uint256 total = smallAmount * 2;
        uint256 fee = (total * FEE_PERCENTAGE) / 100;
        uint256 payout = total - fee;

        vm.prank(admin);
        escrow.resolveWin(MATCH_ID, player1);

        // Player1 balance after: initial + minted - deposited + payout
        // = player1BalanceAfterMint - smallAmount + payout
        uint256 expectedBalance = player1BalanceAfterMint - smallAmount + payout;
        assertEq(token.balanceOf(player1), expectedBalance);
    }
}

