// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {PredictionMarket} from "../contracts/PredictionMarket.sol";
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

contract PredictionMarketTest is Test {
    PredictionMarket public market;
    MockERC20 public token;
    
    address public admin;
    address public player1;
    address public player2;
    address public bettor1;
    address public bettor2;
    address public bettor3;
    address public nonAdmin;
    
    uint64 public constant MATCH_ID = 1;
    uint256 public constant BET_AMOUNT_1 = 1000 * 10**18;
    uint256 public constant BET_AMOUNT_2 = 2000 * 10**18;
    uint256 public constant BET_AMOUNT_3 = 1500 * 10**18;

    uint8 public constant OUTCOME_PLAYER1 = 1;
    uint8 public constant OUTCOME_PLAYER2 = 2;
    uint8 public constant OUTCOME_DRAW = 3;
    uint8 public constant STATUS_ACTIVE = 1;
    uint8 public constant STATUS_RESOLVED = 2;

    event MarketCreated(uint64 indexed matchId, address indexed admin, address player1, address player2);
    event BetPlaced(uint64 indexed matchId, address indexed user, uint8 outcome, uint256 amount);
    event MarketResolved(uint64 indexed matchId, uint8 winningOutcome);
    event RewardsClaimed(uint64 indexed matchId, address indexed user, uint256 amount);

    function setUp() public {
        admin = address(1);
        player1 = address(2);
        player2 = address(3);
        bettor1 = address(4);
        bettor2 = address(5);
        bettor3 = address(6);
        nonAdmin = address(7);

        // Deploy token
        token = new MockERC20("Test Token", "TEST");
        
        // Mint tokens to bettors
        token.mint(bettor1, 100000 * 10**18);
        token.mint(bettor2, 100000 * 10**18);
        token.mint(bettor3, 100000 * 10**18);
        token.mint(admin, 100000 * 10**18);

        // Deploy market
        vm.prank(admin);
        market = new PredictionMarket(address(token));
    }

    // ========== Constructor Tests ==========

    function test_Constructor_SetsToken() public {
        assertEq(address(market.token()), address(token));
    }

    function test_Constructor_RevertsIfZeroAddress() public {
        vm.expectRevert("Invalid token address");
        new PredictionMarket(address(0));
    }

    function test_Constructor_SetsConstants() public {
        assertEq(market.OUTCOME_PLAYER1(), OUTCOME_PLAYER1);
        assertEq(market.OUTCOME_PLAYER2(), OUTCOME_PLAYER2);
        assertEq(market.OUTCOME_DRAW(), OUTCOME_DRAW);
        assertEq(market.STATUS_ACTIVE(), STATUS_ACTIVE);
        assertEq(market.STATUS_RESOLVED(), STATUS_RESOLVED);
    }

    // ========== createMarket Tests ==========

    function test_CreateMarket_Success() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        (uint8 status, uint8 winningOutcome, uint256 totalPool, uint256 p1Shares, uint256 p2Shares, uint256 drawShares) = 
            market.getMarketStats(MATCH_ID);

        assertEq(status, STATUS_ACTIVE);
        assertEq(winningOutcome, 0);
        assertEq(totalPool, 0);
        assertEq(p1Shares, 0);
        assertEq(p2Shares, 0);
        assertEq(drawShares, 0);
    }

    function test_CreateMarket_EmitsEvent() public {
        vm.expectEmit(true, true, true, true);
        emit MarketCreated(MATCH_ID, admin, player1, player2);

        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);
    }

    function test_CreateMarket_RevertsIfMarketExists() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        vm.expectRevert("MarketAlreadyExists");
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);
    }

    function test_CreateMarket_RevertsIfPlayer1Zero() public {
        vm.expectRevert("Invalid players");
        vm.prank(admin);
        market.createMarket(MATCH_ID, address(0), player2);
    }

    function test_CreateMarket_RevertsIfPlayer2Zero() public {
        vm.expectRevert("Invalid players");
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, address(0));
    }

    function test_CreateMarket_CanBeCalledByAnyone() public {
        vm.prank(nonAdmin);
        market.createMarket(MATCH_ID, player1, player2);

        address marketAdmin = market.getMarketAdmin(MATCH_ID);
        assertEq(marketAdmin, nonAdmin);
    }

    function test_CreateMarket_MultipleMarkets() public {
        uint64 matchId1 = 1;
        uint64 matchId2 = 2;

        vm.prank(admin);
        market.createMarket(matchId1, player1, player2);

        vm.prank(admin);
        market.createMarket(matchId2, player1, player2);

        assertTrue(market.marketExists(matchId1));
        assertTrue(market.marketExists(matchId2));
    }

    // ========== bet Tests ==========

    function test_Bet_Player1Outcome() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        vm.startPrank(bettor1);
        token.approve(address(market), BET_AMOUNT_1);
        
        vm.expectEmit(true, true, true, true);
        emit BetPlaced(MATCH_ID, bettor1, OUTCOME_PLAYER1, BET_AMOUNT_1);
        
        market.bet(MATCH_ID, OUTCOME_PLAYER1, BET_AMOUNT_1);
        vm.stopPrank();

        assertEq(market.getUserShares(MATCH_ID, OUTCOME_PLAYER1, bettor1), BET_AMOUNT_1);
        
        (,, uint256 totalPool, uint256 p1Shares,,) = market.getMarketStats(MATCH_ID);
        assertEq(totalPool, BET_AMOUNT_1);
        assertEq(p1Shares, BET_AMOUNT_1);
    }

    function test_Bet_Player2Outcome() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        vm.startPrank(bettor1);
        token.approve(address(market), BET_AMOUNT_1);
        market.bet(MATCH_ID, OUTCOME_PLAYER2, BET_AMOUNT_1);
        vm.stopPrank();

        assertEq(market.getUserShares(MATCH_ID, OUTCOME_PLAYER2, bettor1), BET_AMOUNT_1);
        
        (,, uint256 totalPool,, uint256 p2Shares,) = market.getMarketStats(MATCH_ID);
        assertEq(totalPool, BET_AMOUNT_1);
        assertEq(p2Shares, BET_AMOUNT_1);
    }

    function test_Bet_DrawOutcome() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        vm.startPrank(bettor1);
        token.approve(address(market), BET_AMOUNT_1);
        market.bet(MATCH_ID, OUTCOME_DRAW, BET_AMOUNT_1);
        vm.stopPrank();

        assertEq(market.getUserShares(MATCH_ID, OUTCOME_DRAW, bettor1), BET_AMOUNT_1);
        
        (,, uint256 totalPool,,, uint256 drawShares) = market.getMarketStats(MATCH_ID);
        assertEq(totalPool, BET_AMOUNT_1);
        assertEq(drawShares, BET_AMOUNT_1);
    }

    function test_Bet_MultipleBetsSameOutcome() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        vm.startPrank(bettor1);
        token.approve(address(market), BET_AMOUNT_1 * 2);
        market.bet(MATCH_ID, OUTCOME_PLAYER1, BET_AMOUNT_1);
        market.bet(MATCH_ID, OUTCOME_PLAYER1, BET_AMOUNT_1);
        vm.stopPrank();

        assertEq(market.getUserShares(MATCH_ID, OUTCOME_PLAYER1, bettor1), BET_AMOUNT_1 * 2);
        
        (,, uint256 totalPool, uint256 p1Shares,,) = market.getMarketStats(MATCH_ID);
        assertEq(totalPool, BET_AMOUNT_1 * 2);
        assertEq(p1Shares, BET_AMOUNT_1 * 2);
    }

    function test_Bet_MultipleBettors() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        vm.startPrank(bettor1);
        token.approve(address(market), BET_AMOUNT_1);
        market.bet(MATCH_ID, OUTCOME_PLAYER1, BET_AMOUNT_1);
        vm.stopPrank();

        vm.startPrank(bettor2);
        token.approve(address(market), BET_AMOUNT_2);
        market.bet(MATCH_ID, OUTCOME_PLAYER2, BET_AMOUNT_2);
        vm.stopPrank();

        vm.startPrank(bettor3);
        token.approve(address(market), BET_AMOUNT_3);
        market.bet(MATCH_ID, OUTCOME_DRAW, BET_AMOUNT_3);
        vm.stopPrank();

        assertEq(market.getUserShares(MATCH_ID, OUTCOME_PLAYER1, bettor1), BET_AMOUNT_1);
        assertEq(market.getUserShares(MATCH_ID, OUTCOME_PLAYER2, bettor2), BET_AMOUNT_2);
        assertEq(market.getUserShares(MATCH_ID, OUTCOME_DRAW, bettor3), BET_AMOUNT_3);

        (,, uint256 totalPool, uint256 p1Shares, uint256 p2Shares, uint256 drawShares) = 
            market.getMarketStats(MATCH_ID);
        assertEq(totalPool, BET_AMOUNT_1 + BET_AMOUNT_2 + BET_AMOUNT_3);
        assertEq(p1Shares, BET_AMOUNT_1);
        assertEq(p2Shares, BET_AMOUNT_2);
        assertEq(drawShares, BET_AMOUNT_3);
    }

    function test_Bet_TransfersTokens() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        uint256 balanceBefore = token.balanceOf(bettor1);
        uint256 marketBalanceBefore = token.balanceOf(address(market));

        vm.startPrank(bettor1);
        token.approve(address(market), BET_AMOUNT_1);
        market.bet(MATCH_ID, OUTCOME_PLAYER1, BET_AMOUNT_1);
        vm.stopPrank();

        assertEq(token.balanceOf(bettor1), balanceBefore - BET_AMOUNT_1);
        assertEq(token.balanceOf(address(market)), marketBalanceBefore + BET_AMOUNT_1);
    }

    function test_Bet_RevertsIfInvalidOutcome() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        vm.startPrank(bettor1);
        token.approve(address(market), BET_AMOUNT_1);
        
        vm.expectRevert(PredictionMarket.InvalidOutcome.selector);
        market.bet(MATCH_ID, 0, BET_AMOUNT_1);
        
        vm.expectRevert(PredictionMarket.InvalidOutcome.selector);
        market.bet(MATCH_ID, 4, BET_AMOUNT_1);
        vm.stopPrank();
    }

    function test_Bet_RevertsIfZeroAmount() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        vm.expectRevert(PredictionMarket.ZeroBet.selector);
        vm.prank(bettor1);
        market.bet(MATCH_ID, OUTCOME_PLAYER1, 0);
    }

    function test_Bet_RevertsIfMarketNotFound() public {
        vm.expectRevert(PredictionMarket.MarketNotFound.selector);
        vm.prank(bettor1);
        market.bet(MATCH_ID, OUTCOME_PLAYER1, BET_AMOUNT_1);
    }

    function test_Bet_RevertsIfMarketResolved() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        vm.prank(admin);
        market.resolveMarket(MATCH_ID, OUTCOME_PLAYER1);

        vm.expectRevert(PredictionMarket.MarketAlreadyResolved.selector);
        vm.prank(bettor1);
        market.bet(MATCH_ID, OUTCOME_PLAYER1, BET_AMOUNT_1);
    }

    // ========== resolveMarket Tests ==========

    function test_ResolveMarket_Player1Wins() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        vm.startPrank(bettor1);
        token.approve(address(market), BET_AMOUNT_1);
        market.bet(MATCH_ID, OUTCOME_PLAYER1, BET_AMOUNT_1);
        vm.stopPrank();

        vm.expectEmit(true, true, true, true);
        emit MarketResolved(MATCH_ID, OUTCOME_PLAYER1);

        vm.prank(admin);
        market.resolveMarket(MATCH_ID, OUTCOME_PLAYER1);

        (uint8 status, uint8 winningOutcome,,,,) = market.getMarketStats(MATCH_ID);
        assertEq(status, STATUS_RESOLVED);
        assertEq(winningOutcome, OUTCOME_PLAYER1);
    }

    function test_ResolveMarket_Player2Wins() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        vm.prank(admin);
        market.resolveMarket(MATCH_ID, OUTCOME_PLAYER2);

        (uint8 status, uint8 winningOutcome,,,,) = market.getMarketStats(MATCH_ID);
        assertEq(status, STATUS_RESOLVED);
        assertEq(winningOutcome, OUTCOME_PLAYER2);
    }

    function test_ResolveMarket_Draw() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        vm.prank(admin);
        market.resolveMarket(MATCH_ID, OUTCOME_DRAW);

        (uint8 status, uint8 winningOutcome,,,,) = market.getMarketStats(MATCH_ID);
        assertEq(status, STATUS_RESOLVED);
        assertEq(winningOutcome, OUTCOME_DRAW);
    }

    function test_ResolveMarket_StoresOriginalPoolSize() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        vm.startPrank(bettor1);
        token.approve(address(market), BET_AMOUNT_1);
        market.bet(MATCH_ID, OUTCOME_PLAYER1, BET_AMOUNT_1);
        vm.stopPrank();

        vm.startPrank(bettor2);
        token.approve(address(market), BET_AMOUNT_2);
        market.bet(MATCH_ID, OUTCOME_PLAYER2, BET_AMOUNT_2);
        vm.stopPrank();

        uint256 poolBefore = BET_AMOUNT_1 + BET_AMOUNT_2;

        vm.prank(admin);
        market.resolveMarket(MATCH_ID, OUTCOME_PLAYER1);

        // Original pool size should be stored
        (,, uint256 totalPool,,,) = market.getMarketStats(MATCH_ID);
        assertEq(totalPool, poolBefore);
    }

    function test_ResolveMarket_RevertsIfInvalidOutcome() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        vm.expectRevert(PredictionMarket.InvalidOutcome.selector);
        vm.prank(admin);
        market.resolveMarket(MATCH_ID, 0);

        vm.expectRevert(PredictionMarket.InvalidOutcome.selector);
        vm.prank(admin);
        market.resolveMarket(MATCH_ID, 4);
    }

    function test_ResolveMarket_RevertsIfNotAdmin() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        vm.expectRevert(PredictionMarket.NotAdmin.selector);
        vm.prank(bettor1);
        market.resolveMarket(MATCH_ID, OUTCOME_PLAYER1);
    }

    function test_ResolveMarket_RevertsIfMarketNotFound() public {
        vm.expectRevert(PredictionMarket.MarketNotFound.selector);
        vm.prank(admin);
        market.resolveMarket(MATCH_ID, OUTCOME_PLAYER1);
    }

    function test_ResolveMarket_RevertsIfAlreadyResolved() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        vm.prank(admin);
        market.resolveMarket(MATCH_ID, OUTCOME_PLAYER1);

        vm.expectRevert(PredictionMarket.MarketAlreadyResolved.selector);
        vm.prank(admin);
        market.resolveMarket(MATCH_ID, OUTCOME_PLAYER2);
    }

    // ========== claimRewards Tests ==========

    function test_ClaimRewards_SingleWinner() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        vm.startPrank(bettor1);
        token.approve(address(market), BET_AMOUNT_1);
        market.bet(MATCH_ID, OUTCOME_PLAYER1, BET_AMOUNT_1);
        vm.stopPrank();

        vm.prank(admin);
        market.resolveMarket(MATCH_ID, OUTCOME_PLAYER1);

        uint256 balanceBefore = token.balanceOf(bettor1);

        vm.expectEmit(true, true, true, true);
        emit RewardsClaimed(MATCH_ID, bettor1, BET_AMOUNT_1);

        vm.prank(bettor1);
        market.claimRewards(MATCH_ID);

        // Winner gets entire pool
        assertEq(token.balanceOf(bettor1), balanceBefore + BET_AMOUNT_1);
        assertEq(market.getUserShares(MATCH_ID, OUTCOME_PLAYER1, bettor1), 0);
        assertTrue(market.hasUserClaimed(MATCH_ID, bettor1));
    }

    function test_ClaimRewards_MultipleWinners() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        vm.startPrank(bettor1);
        token.approve(address(market), BET_AMOUNT_1);
        market.bet(MATCH_ID, OUTCOME_PLAYER1, BET_AMOUNT_1);
        vm.stopPrank();

        vm.startPrank(bettor2);
        token.approve(address(market), BET_AMOUNT_2);
        market.bet(MATCH_ID, OUTCOME_PLAYER1, BET_AMOUNT_2);
        vm.stopPrank();

        vm.startPrank(bettor3);
        token.approve(address(market), BET_AMOUNT_3);
        market.bet(MATCH_ID, OUTCOME_PLAYER2, BET_AMOUNT_3);
        vm.stopPrank();

        uint256 totalPool = BET_AMOUNT_1 + BET_AMOUNT_2 + BET_AMOUNT_3;
        uint256 player1Shares = BET_AMOUNT_1 + BET_AMOUNT_2;

        vm.prank(admin);
        market.resolveMarket(MATCH_ID, OUTCOME_PLAYER1);

        // Bettor1 should get: (BET_AMOUNT_1 * totalPool) / player1Shares
        uint256 expectedReward1 = (BET_AMOUNT_1 * totalPool) / player1Shares;
        uint256 balanceBefore1 = token.balanceOf(bettor1);

        vm.prank(bettor1);
        market.claimRewards(MATCH_ID);

        assertEq(token.balanceOf(bettor1), balanceBefore1 + expectedReward1);

        // Bettor2 should get: (BET_AMOUNT_2 * totalPool) / player1Shares
        uint256 expectedReward2 = (BET_AMOUNT_2 * totalPool) / player1Shares;
        uint256 balanceBefore2 = token.balanceOf(bettor2);

        vm.prank(bettor2);
        market.claimRewards(MATCH_ID);

        assertEq(token.balanceOf(bettor2), balanceBefore2 + expectedReward2);
    }

    function test_ClaimRewards_LoserGetsNothing() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        vm.startPrank(bettor1);
        token.approve(address(market), BET_AMOUNT_1);
        market.bet(MATCH_ID, OUTCOME_PLAYER1, BET_AMOUNT_1);
        vm.stopPrank();

        vm.startPrank(bettor2);
        token.approve(address(market), BET_AMOUNT_2);
        market.bet(MATCH_ID, OUTCOME_PLAYER2, BET_AMOUNT_2);
        vm.stopPrank();

        vm.prank(admin);
        market.resolveMarket(MATCH_ID, OUTCOME_PLAYER1);

        // Bettor2 bet on losing outcome, should get nothing
        vm.expectRevert(PredictionMarket.NoShares.selector);
        vm.prank(bettor2);
        market.claimRewards(MATCH_ID);
    }

    function test_ClaimRewards_RevertsIfMarketNotFound() public {
        vm.expectRevert(PredictionMarket.MarketNotFound.selector);
        vm.prank(bettor1);
        market.claimRewards(MATCH_ID);
    }

    function test_ClaimRewards_RevertsIfNotResolved() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        vm.startPrank(bettor1);
        token.approve(address(market), BET_AMOUNT_1);
        market.bet(MATCH_ID, OUTCOME_PLAYER1, BET_AMOUNT_1);
        vm.stopPrank();

        vm.expectRevert(PredictionMarket.NotResolved.selector);
        vm.prank(bettor1);
        market.claimRewards(MATCH_ID);
    }

    function test_ClaimRewards_RevertsIfAlreadyClaimed() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        vm.startPrank(bettor1);
        token.approve(address(market), BET_AMOUNT_1);
        market.bet(MATCH_ID, OUTCOME_PLAYER1, BET_AMOUNT_1);
        vm.stopPrank();

        vm.prank(admin);
        market.resolveMarket(MATCH_ID, OUTCOME_PLAYER1);

        vm.prank(bettor1);
        market.claimRewards(MATCH_ID);

        vm.expectRevert(PredictionMarket.AlreadyClaimed.selector);
        vm.prank(bettor1);
        market.claimRewards(MATCH_ID);
    }

    function test_ClaimRewards_RevertsIfNoShares() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        vm.prank(admin);
        market.resolveMarket(MATCH_ID, OUTCOME_PLAYER1);

        vm.expectRevert(PredictionMarket.NoShares.selector);
        vm.prank(bettor1);
        market.claimRewards(MATCH_ID);
    }

    // ========== Getter Functions Tests ==========

    function test_GetMarketStats() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        vm.startPrank(bettor1);
        token.approve(address(market), BET_AMOUNT_1);
        market.bet(MATCH_ID, OUTCOME_PLAYER1, BET_AMOUNT_1);
        vm.stopPrank();

        (uint8 status, uint8 winningOutcome, uint256 totalPool, uint256 p1Shares, uint256 p2Shares, uint256 drawShares) = 
            market.getMarketStats(MATCH_ID);

        assertEq(status, STATUS_ACTIVE);
        assertEq(winningOutcome, 0);
        assertEq(totalPool, BET_AMOUNT_1);
        assertEq(p1Shares, BET_AMOUNT_1);
        assertEq(p2Shares, 0);
        assertEq(drawShares, 0);
    }

    function test_GetUserShares() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        vm.startPrank(bettor1);
        token.approve(address(market), BET_AMOUNT_1);
        market.bet(MATCH_ID, OUTCOME_PLAYER1, BET_AMOUNT_1);
        vm.stopPrank();

        assertEq(market.getUserShares(MATCH_ID, OUTCOME_PLAYER1, bettor1), BET_AMOUNT_1);
        assertEq(market.getUserShares(MATCH_ID, OUTCOME_PLAYER2, bettor1), 0);
        assertEq(market.getUserShares(MATCH_ID, OUTCOME_DRAW, bettor1), 0);
    }

    function test_GetUserAllShares() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        vm.startPrank(bettor1);
        token.approve(address(market), BET_AMOUNT_1 * 3);
        market.bet(MATCH_ID, OUTCOME_PLAYER1, BET_AMOUNT_1);
        market.bet(MATCH_ID, OUTCOME_PLAYER2, BET_AMOUNT_1);
        market.bet(MATCH_ID, OUTCOME_DRAW, BET_AMOUNT_1);
        vm.stopPrank();

        (uint256 p1Shares, uint256 p2Shares, uint256 drawShares) = 
            market.getUserAllShares(MATCH_ID, bettor1);

        assertEq(p1Shares, BET_AMOUNT_1);
        assertEq(p2Shares, BET_AMOUNT_1);
        assertEq(drawShares, BET_AMOUNT_1);
    }

    function test_HasUserClaimed() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        vm.startPrank(bettor1);
        token.approve(address(market), BET_AMOUNT_1);
        market.bet(MATCH_ID, OUTCOME_PLAYER1, BET_AMOUNT_1);
        vm.stopPrank();

        assertFalse(market.hasUserClaimed(MATCH_ID, bettor1));

        vm.prank(admin);
        market.resolveMarket(MATCH_ID, OUTCOME_PLAYER1);

        vm.prank(bettor1);
        market.claimRewards(MATCH_ID);

        assertTrue(market.hasUserClaimed(MATCH_ID, bettor1));
    }

    function test_GetPotentialReward_ActiveMarket() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        vm.startPrank(bettor1);
        token.approve(address(market), BET_AMOUNT_1);
        market.bet(MATCH_ID, OUTCOME_PLAYER1, BET_AMOUNT_1);
        vm.stopPrank();

        vm.startPrank(bettor2);
        token.approve(address(market), BET_AMOUNT_2);
        market.bet(MATCH_ID, OUTCOME_PLAYER2, BET_AMOUNT_2);
        vm.stopPrank();

        uint256 totalPool = BET_AMOUNT_1 + BET_AMOUNT_2;
        uint256 expectedReward = (BET_AMOUNT_1 * totalPool) / BET_AMOUNT_1;

        uint256 potentialReward = market.getPotentialReward(MATCH_ID, OUTCOME_PLAYER1, bettor1);
        assertEq(potentialReward, expectedReward);
    }

    function test_GetPotentialReward_ResolvedMarket_Winner() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        vm.startPrank(bettor1);
        token.approve(address(market), BET_AMOUNT_1);
        market.bet(MATCH_ID, OUTCOME_PLAYER1, BET_AMOUNT_1);
        vm.stopPrank();

        vm.startPrank(bettor2);
        token.approve(address(market), BET_AMOUNT_2);
        market.bet(MATCH_ID, OUTCOME_PLAYER2, BET_AMOUNT_2);
        vm.stopPrank();

        vm.prank(admin);
        market.resolveMarket(MATCH_ID, OUTCOME_PLAYER1);

        uint256 totalPool = BET_AMOUNT_1 + BET_AMOUNT_2;
        uint256 expectedReward = (BET_AMOUNT_1 * totalPool) / BET_AMOUNT_1;

        uint256 potentialReward = market.getPotentialReward(MATCH_ID, OUTCOME_PLAYER1, bettor1);
        assertEq(potentialReward, expectedReward);
    }

    function test_GetPotentialReward_ResolvedMarket_Loser() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        vm.startPrank(bettor1);
        token.approve(address(market), BET_AMOUNT_1);
        market.bet(MATCH_ID, OUTCOME_PLAYER1, BET_AMOUNT_1);
        vm.stopPrank();

        vm.prank(admin);
        market.resolveMarket(MATCH_ID, OUTCOME_PLAYER2);

        uint256 potentialReward = market.getPotentialReward(MATCH_ID, OUTCOME_PLAYER1, bettor1);
        assertEq(potentialReward, 0);
    }

    function test_GetPotentialReward_NoShares() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        uint256 potentialReward = market.getPotentialReward(MATCH_ID, OUTCOME_PLAYER1, bettor1);
        assertEq(potentialReward, 0);
    }

    function test_GetPotentialReward_MarketNotFound() public {
        uint256 potentialReward = market.getPotentialReward(MATCH_ID, OUTCOME_PLAYER1, bettor1);
        assertEq(potentialReward, 0);
    }

    function test_MarketExists() public {
        assertFalse(market.marketExists(MATCH_ID));

        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        assertTrue(market.marketExists(MATCH_ID));
    }

    function test_GetMarketAdmin() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        assertEq(market.getMarketAdmin(MATCH_ID), admin);
    }

    function test_GetMarketAdmin_RevertsIfNotFound() public {
        vm.expectRevert(PredictionMarket.MarketNotFound.selector);
        market.getMarketAdmin(MATCH_ID);
    }

    // ========== Edge Cases ==========

    function test_ClaimRewards_AfterMultipleBets() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        // Same user bets multiple times on same outcome
        vm.startPrank(bettor1);
        token.approve(address(market), BET_AMOUNT_1 * 3);
        market.bet(MATCH_ID, OUTCOME_PLAYER1, BET_AMOUNT_1);
        market.bet(MATCH_ID, OUTCOME_PLAYER1, BET_AMOUNT_1);
        market.bet(MATCH_ID, OUTCOME_PLAYER1, BET_AMOUNT_1);
        vm.stopPrank();

        vm.prank(admin);
        market.resolveMarket(MATCH_ID, OUTCOME_PLAYER1);

        uint256 balanceBefore = token.balanceOf(bettor1);
        uint256 totalBet = BET_AMOUNT_1 * 3;

        vm.prank(bettor1);
        market.claimRewards(MATCH_ID);

        // Should get back all tokens (only one bettor)
        assertEq(token.balanceOf(bettor1), balanceBefore + totalBet);
    }

    function test_ResolveMarket_NoBets() public {
        vm.prank(admin);
        market.createMarket(MATCH_ID, player1, player2);

        // Should be able to resolve even with no bets
        vm.prank(admin);
        market.resolveMarket(MATCH_ID, OUTCOME_PLAYER1);

        (uint8 status, uint8 winningOutcome,,,,) = market.getMarketStats(MATCH_ID);
        assertEq(status, STATUS_RESOLVED);
        assertEq(winningOutcome, OUTCOME_PLAYER1);
    }
}

