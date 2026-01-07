// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/V2/strategies/LendleYieldStrategy.sol";
import "../src/V2/RoomFiVault.sol";

/**
 * @title DeployLendleStrategy
 * @notice Deploy script for LendleYieldStrategy on Mantle
 *
 * Usage:
 * forge script script/DeployLendleStrategy.s.sol:DeployLendleStrategy \
 *   --rpc-url $MANTLE_RPC_URL \
 *   --broadcast \
 *   --verify
 */
contract DeployLendleStrategy is Script {
    // Mantle Mainnet addresses
    address constant LENDLE_POOL = 0xCFa5aE7c2CE8Fadc6426C1ff872cA45378Fb7cF3;
    address constant USDT = 0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE;

    // You need to set these
    address VAULT_ADDRESS; // RoomFiVault address
    address DEPLOYER; // Your deployer address

    function setUp() public {
        // Get from environment or hardcode for testing
        VAULT_ADDRESS = vm.envOr("VAULT_ADDRESS", address(0));
        DEPLOYER = vm.envOr("DEPLOYER_ADDRESS", msg.sender);
    }

    function run() public {
        require(VAULT_ADDRESS != address(0), "Set VAULT_ADDRESS env variable");

        vm.startBroadcast();

        console.log("Deploying LendleYieldStrategy...");
        console.log("Lendle Pool:", LENDLE_POOL);
        console.log("USDT:", USDT);
        console.log("Vault:", VAULT_ADDRESS);
        console.log("Owner:", DEPLOYER);

        LendleYieldStrategy strategy = new LendleYieldStrategy(
            LENDLE_POOL,
            USDT,
            VAULT_ADDRESS,
            DEPLOYER
        );

        console.log("LendleYieldStrategy deployed at:", address(strategy));

        // Update RoomFiVault to use new strategy
        console.log("Updating vault strategy...");
        RoomFiVault vault = RoomFiVault(VAULT_ADDRESS);
        vault.setStrategy(address(strategy));

        console.log("Strategy updated successfully!");

        // Print summary
        console.log("\n=== Deployment Summary ===");
        console.log("Strategy:", address(strategy));
        console.log("Current APY:", strategy.getAPY(), "basis points");

        vm.stopBroadcast();
    }
}
