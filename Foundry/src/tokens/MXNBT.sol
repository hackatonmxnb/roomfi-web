// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MXNBT Token
 * @dev A simple ERC20 token representing the MXN-backed token for RoomiFi.
 * The owner (deployer) has the ability to mint new tokens.
 */
contract MXNBT is ERC20, Ownable {
    constructor() ERC20("MXNBT Token", "MXNBT") Ownable(msg.sender) {
        // The deployer is the initial owner.
    }

    /**
     * @dev Creates `amount` new tokens and assigns them to `to`.
     * Can only be called by the owner of the contract.
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
