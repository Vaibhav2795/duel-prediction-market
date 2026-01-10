// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {Duel} from "../contracts/Duel.sol";

// Define the AccessControl error interface for testing
interface IAccessControl {
    error AccessControlUnauthorizedAccount(address account, bytes32 neededRole);
}

contract DuelTest is Test {
    Duel public duel;
    
    address public deployer;
    address public minter;
    address public user1;
    address public user2;
    address public nonMinter;
    
    uint256 public constant INITIAL_SUPPLY = 100000 * 10**18;
    uint256 public constant MINT_AMOUNT = 5000 * 10**18;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

    function setUp() public {
        deployer = address(this);
        minter = address(1);
        user1 = address(2);
        user2 = address(3);
        nonMinter = address(4);

        duel = new Duel();
    }

    // ========== Constructor Tests ==========

    function test_Constructor_SetsNameAndSymbol() public {
        assertEq(duel.name(), "Duel Token");
        assertEq(duel.symbol(), "DUEL");
    }

    function test_Constructor_MintsInitialSupply() public {
        assertEq(duel.totalSupply(), INITIAL_SUPPLY);
        assertEq(duel.balanceOf(deployer), INITIAL_SUPPLY);
    }

    function test_Constructor_GrantsAdminRole() public {
        assertTrue(duel.hasRole(DEFAULT_ADMIN_ROLE, deployer));
    }

    function test_Constructor_GrantsMinterRole() public {
        assertTrue(duel.hasRole(MINTER_ROLE, deployer));
    }

    function test_Constructor_SetsDecimals() public {
        assertEq(duel.decimals(), 18);
    }

    // ========== mint Tests ==========

    function test_Mint_Success() public {
        uint256 balanceBefore = duel.balanceOf(user1);
        
        duel.mint(user1, MINT_AMOUNT);
        
        assertEq(duel.balanceOf(user1), balanceBefore + MINT_AMOUNT);
        assertEq(duel.totalSupply(), INITIAL_SUPPLY + MINT_AMOUNT);
    }

    function test_Mint_ToDeployer() public {
        uint256 balanceBefore = duel.balanceOf(deployer);
        
        duel.mint(deployer, MINT_AMOUNT);
        
        assertEq(duel.balanceOf(deployer), balanceBefore + MINT_AMOUNT);
    }

    function test_Mint_MultipleTimes() public {
        duel.mint(user1, MINT_AMOUNT);
        duel.mint(user1, MINT_AMOUNT);
        duel.mint(user1, MINT_AMOUNT);
        
        assertEq(duel.balanceOf(user1), MINT_AMOUNT * 3);
        assertEq(duel.totalSupply(), INITIAL_SUPPLY + (MINT_AMOUNT * 3));
    }

    function test_Mint_ToMultipleUsers() public {
        duel.mint(user1, MINT_AMOUNT);
        duel.mint(user2, MINT_AMOUNT);
        
        assertEq(duel.balanceOf(user1), MINT_AMOUNT);
        assertEq(duel.balanceOf(user2), MINT_AMOUNT);
        assertEq(duel.totalSupply(), INITIAL_SUPPLY + (MINT_AMOUNT * 2));
    }

    function test_Mint_ZeroAmount() public {
        uint256 balanceBefore = duel.balanceOf(user1);
        uint256 supplyBefore = duel.totalSupply();
        
        duel.mint(user1, 0);
        
        assertEq(duel.balanceOf(user1), balanceBefore);
        assertEq(duel.totalSupply(), supplyBefore);
    }

    function test_Mint_LargeAmount() public {
        uint256 largeAmount = 1000000 * 10**18;
        
        duel.mint(user1, largeAmount);
        
        assertEq(duel.balanceOf(user1), largeAmount);
        assertEq(duel.totalSupply(), INITIAL_SUPPLY + largeAmount);
    }

    function test_Mint_EmitsTransferEvent() public {
        vm.expectEmit(true, true, false, true);
        emit Transfer(address(0), user1, MINT_AMOUNT);
        
        duel.mint(user1, MINT_AMOUNT);
    }

    function test_Mint_RevertsIfNotMinter() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                nonMinter,
                MINTER_ROLE
            )
        );
        vm.prank(nonMinter);
        duel.mint(user1, MINT_AMOUNT);
    }

    function test_Mint_ByGrantedMinter() public {
        // Grant minter role to minter address
        duel.grantRole(MINTER_ROLE, minter);
        
        vm.prank(minter);
        duel.mint(user1, MINT_AMOUNT);
        
        assertEq(duel.balanceOf(user1), MINT_AMOUNT);
    }

    // ========== Role Management Tests ==========

    function test_GrantRole_Minter() public {
        duel.grantRole(MINTER_ROLE, minter);
        
        assertTrue(duel.hasRole(MINTER_ROLE, minter));
    }

    function test_GrantRole_RevertsIfNotAdmin() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                nonMinter,
                DEFAULT_ADMIN_ROLE
            )
        );
        vm.prank(nonMinter);
        duel.grantRole(MINTER_ROLE, minter);
    }

    function test_RevokeRole_Minter() public {
        duel.grantRole(MINTER_ROLE, minter);
        assertTrue(duel.hasRole(MINTER_ROLE, minter));
        
        duel.revokeRole(MINTER_ROLE, minter);
        assertFalse(duel.hasRole(MINTER_ROLE, minter));
    }

    function test_RevokeRole_ThenMintFails() public {
        duel.grantRole(MINTER_ROLE, minter);
        
        vm.prank(minter);
        duel.mint(user1, MINT_AMOUNT);
        
        duel.revokeRole(MINTER_ROLE, minter);
        
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                minter,
                MINTER_ROLE
            )
        );
        vm.prank(minter);
        duel.mint(user1, MINT_AMOUNT);
    }

    function test_RenounceRole() public {
        // Deployer renounces minter role
        duel.renounceRole(MINTER_ROLE, deployer);
        
        assertFalse(duel.hasRole(MINTER_ROLE, deployer));
        
        // Should not be able to mint anymore
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                deployer,
                MINTER_ROLE
            )
        );
        duel.mint(user1, MINT_AMOUNT);
    }

    function test_GetRoleAdmin() public {
        assertEq(duel.getRoleAdmin(MINTER_ROLE), DEFAULT_ADMIN_ROLE);
    }

    // ========== ERC20 Standard Tests ==========

    function test_Transfer_Success() public {
        uint256 transferAmount = 1000 * 10**18;
        
        duel.transfer(user1, transferAmount);
        
        assertEq(duel.balanceOf(deployer), INITIAL_SUPPLY - transferAmount);
        assertEq(duel.balanceOf(user1), transferAmount);
    }

    function test_Transfer_EmitsEvent() public {
        uint256 transferAmount = 1000 * 10**18;
        
        vm.expectEmit(true, true, false, true);
        emit Transfer(deployer, user1, transferAmount);
        
        duel.transfer(user1, transferAmount);
    }

    function test_Transfer_RevertsIfInsufficientBalance() public {
        uint256 transferAmount = INITIAL_SUPPLY + 1;
        
        vm.expectRevert();
        duel.transfer(user1, transferAmount);
    }

    function test_Approve_Success() public {
        uint256 allowanceAmount = 5000 * 10**18;
        
        bool success = duel.approve(user1, allowanceAmount);
        
        assertTrue(success);
        assertEq(duel.allowance(deployer, user1), allowanceAmount);
    }

    function test_Approve_EmitsEvent() public {
        uint256 allowanceAmount = 5000 * 10**18;
        
        vm.expectEmit(true, true, false, true);
        emit Approval(deployer, user1, allowanceAmount);
        
        duel.approve(user1, allowanceAmount);
    }

    function test_TransferFrom_Success() public {
        uint256 allowanceAmount = 5000 * 10**18;
        uint256 transferAmount = 2000 * 10**18;
        
        duel.approve(user1, allowanceAmount);
        
        vm.prank(user1);
        duel.transferFrom(deployer, user2, transferAmount);
        
        assertEq(duel.balanceOf(deployer), INITIAL_SUPPLY - transferAmount);
        assertEq(duel.balanceOf(user2), transferAmount);
        assertEq(duel.allowance(deployer, user1), allowanceAmount - transferAmount);
    }

    function test_TransferFrom_RevertsIfInsufficientAllowance() public {
        uint256 allowanceAmount = 1000 * 10**18;
        uint256 transferAmount = 2000 * 10**18;
        
        duel.approve(user1, allowanceAmount);
        
        vm.expectRevert();
        vm.prank(user1);
        duel.transferFrom(deployer, user2, transferAmount);
    }

    function test_TransferFrom_RevertsIfInsufficientBalance() public {
        uint256 allowanceAmount = INITIAL_SUPPLY + 1;
        
        duel.approve(user1, allowanceAmount);
        
        vm.expectRevert();
        vm.prank(user1);
        duel.transferFrom(deployer, user2, allowanceAmount);
    }

    // ========== Edge Cases ==========

    function test_Mint_ThenTransfer() public {
        duel.mint(user1, MINT_AMOUNT);
        
        vm.prank(user1);
        duel.transfer(user2, MINT_AMOUNT);
        
        assertEq(duel.balanceOf(user1), 0);
        assertEq(duel.balanceOf(user2), MINT_AMOUNT);
    }

    function test_Mint_ThenApproveAndTransferFrom() public {
        duel.mint(user1, MINT_AMOUNT);
        
        vm.prank(user1);
        duel.approve(user2, MINT_AMOUNT);
        
        vm.prank(user2);
        duel.transferFrom(user1, deployer, MINT_AMOUNT);
        
        assertEq(duel.balanceOf(user1), 0);
        assertEq(duel.balanceOf(deployer), INITIAL_SUPPLY + MINT_AMOUNT);
    }

    function test_MultipleMinters() public {
        duel.grantRole(MINTER_ROLE, minter);
        duel.grantRole(MINTER_ROLE, user1);
        
        vm.prank(minter);
        duel.mint(user2, MINT_AMOUNT);
        
        vm.prank(user1);
        duel.mint(user2, MINT_AMOUNT);
        
        assertEq(duel.balanceOf(user2), MINT_AMOUNT * 2);
    }

    function test_TotalSupply_AfterMultipleMints() public {
        duel.mint(user1, MINT_AMOUNT);
        duel.mint(user2, MINT_AMOUNT);
        duel.mint(user1, MINT_AMOUNT);
        
        assertEq(duel.totalSupply(), INITIAL_SUPPLY + (MINT_AMOUNT * 3));
    }

    function test_BalanceOf_AfterComplexOperations() public {
        // Mint to user1
        duel.mint(user1, MINT_AMOUNT);
        
        // User1 transfers to user2
        vm.prank(user1);
        duel.transfer(user2, MINT_AMOUNT / 2);
        
        // Mint more to user1
        duel.mint(user1, MINT_AMOUNT);
        
        assertEq(duel.balanceOf(user1), MINT_AMOUNT + (MINT_AMOUNT / 2));
        assertEq(duel.balanceOf(user2), MINT_AMOUNT / 2);
    }

    // ========== Event Declarations ==========
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

