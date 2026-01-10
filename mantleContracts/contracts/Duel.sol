// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title Duel
 * @dev ERC20 token with minter role and initial supply minted to deployer
 */
contract Duel is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /**
     * @dev Constructor that mints initial 100k supply to deployer
     * Token name: "Duel Token", Symbol: "DUEL"
     */
    constructor() ERC20("Duel Token", "DUEL") {
        // Grant the contract deployer the default admin role
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        
        // Grant the contract deployer the minter role
        _grantRole(MINTER_ROLE, msg.sender);
        
        // Mint initial 100k supply to deployer
        _mint(msg.sender, 100000 * 10**decimals());
    }

    /**
     * @dev Mint tokens to an address (only callable by minter role)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
}

