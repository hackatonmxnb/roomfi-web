// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {TenantPassport} from "../src/tokens/TenantPassport.sol";
import {PropertyInterestPool} from "../src/PropertyInterestPool.sol";
import {MXNBInterestGenerator} from "../src/MXNBInterestGenerator.sol";

contract DeployContracts is Script {
    function run() external returns (address, address, address, address) {
        // Use the CORRECT, user-provided address for the existing MXNBT token.
        address existingMXNBToken = 0x82B9e52b26A2954E113F94Ff26647754d5a4247D;

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // --- Deployments ---
        // Get the deployer's address from the private key
        address deployerAddress = vm.addr(deployerPrivateKey);

        // 1. Deploy the TenantPassport contract
        TenantPassport tenantPassport = new TenantPassport(deployerAddress);
        
        // 2. Deploy the MXNBInterestGenerator, linking the existing token
        MXNBInterestGenerator interestGenerator = new MXNBInterestGenerator(existingMXNBToken, deployerAddress);

        // 3. Deploy the PropertyInterestPool, linking the token, passport, AND the new interest generator
        PropertyInterestPool propertyInterestPool = new PropertyInterestPool(
            existingMXNBToken,
            address(tenantPassport),
            address(interestGenerator),
            deployerAddress // --- NUEVO: Pasando el dueño inicial
        );

        // --- Post-deployment Configuration ---
        // Allow the PropertyInterestPool contract to manage passports
        tenantPassport.setPropertyInterestPoolAddress(address(propertyInterestPool));

        vm.stopBroadcast();
        
        // --- Log Deployed Addresses ---
        console.log("------------------------------------------------------------");
        console.log("DEPLOYMENT COMPLETE (v2 with Vault Logic)");
        console.log("------------------------------------------------------------");
        console.log("Using Existing MXNBT (Token) at:    ", existingMXNBToken);
        console.log("NEW TenantPassport Address:           ", address(tenantPassport));
        console.log("NEW MXNBInterestGenerator Address:    ", address(interestGenerator));
        console.log("NEW PropertyInterestPool Address:     ", address(propertyInterestPool));
        console.log("------------------------------------------------------------");
        console.log("ACTION: Update ALL FOUR of these addresses in your frontend's config.ts");
        console.log("------------------------------------------------------------");

        return (
            existingMXNBToken,
            address(tenantPassport),
            address(propertyInterestPool),
            address(interestGenerator)
        );
    }
}