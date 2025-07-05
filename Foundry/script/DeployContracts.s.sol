// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {RentalAgreement} from "../src/RentalAgreement.sol";
import {TenantPassport} from "../src/tokens/TenantPassport.sol";
import {MXNBT} from "../src/tokens/MXNBT.sol";
import {PropertyInterestPool} from "../src/PropertyInterestPool.sol";

contract DeployContracts is Script {
    function run() external returns (address, address, address, address) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // --- Deployments ---
        MXNBT mxbntToken = new MXNBT();
        TenantPassport tenantPassport = new TenantPassport();
        PropertyInterestPool propertyInterestPool = new PropertyInterestPool(address(mxbntToken));

        // --- Configuration ---
        address landlord = 0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf;
        address[] memory tenants = new address[](2);
        tenants[0] = 0x2B5AD5c4795c026514f8317c7a215E218DcCD6cF;
        tenants[1] = 0x6813Eb9362372EEF6200f3b1dbC3f819671cBA69;

        uint256[] memory passportIds = new uint256[](2);
        passportIds[0] = 1;
        passportIds[1] = 2;
        
        uint256 rentAmount = 1000 * 1e18;
        uint256 depositAmount = 2000 * 1e18;

        RentalAgreement rentalAgreement = new RentalAgreement(
            landlord,
            tenants,
            passportIds,
            rentAmount,
            depositAmount,
            address(tenantPassport),
            address(mxbntToken)
        );

        
        tenantPassport.mint(tenants[0], passportIds[0]);
        tenantPassport.mint(tenants[1], passportIds[1]);

        vm.stopBroadcast();
        
        console.log("MXNBT deployed at:", address(mxbntToken));
        console.log("TenantPassport deployed at:", address(tenantPassport));
        console.log("RentalAgreement deployed at:", address(rentalAgreement));
        console.log("PropertyInterestPool deployed at:", address(propertyInterestPool));

        return (address(mxbntToken), address(tenantPassport), address(rentalAgreement), address(propertyInterestPool));
    }
}
