// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {RentalAgreement} from "../src/RentalAgreement.sol";
import {TenantPassport} from "../src/tokens/TenantPassport.sol";
import {PropertyInterestPool} from "../src/PropertyInterestPool.sol";
import {MXNBInterestGenerator} from "../src/MXNBInterestGenerator.sol";

contract DeployContracts is Script {
    function run() external returns (address, address, address, address, address) {
        address MXNBToken = 0x88d1900e8298e76c5Cd69527B85290D8037acbA3; // Address actualizada
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // --- Deployments ---
        TenantPassport tenantPassport = new TenantPassport();
        
        PropertyInterestPool propertyInterestPool = new PropertyInterestPool(
            MXNBToken,
            address(tenantPassport)
        );

        MXNBInterestGenerator interestGenerator = new MXNBInterestGenerator(MXNBToken);

        // --- Configuration ---
        tenantPassport.setPropertyInterestPoolAddress(address(propertyInterestPool));
        
        address landlord = vm.addr(deployerPrivateKey);
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
            1, // paymentDayStart
            15, // paymentDayEnd
            address(tenantPassport),
            MXNBToken,
            address(interestGenerator) // Nueva direccion
        );

        tenantPassport.mint(tenants[0], passportIds[0]);
        tenantPassport.mint(tenants[1], passportIds[1]);

        vm.stopBroadcast();
        
        console.log("MXNBT Address:", MXNBToken);
        console.log("TenantPassport deployed at:", address(tenantPassport));
        console.log("PropertyInterestPool deployed at:", address(propertyInterestPool));
        console.log("MXNBInterestGenerator deployed at:", address(interestGenerator));
        console.log("RentalAgreement deployed at:", address(rentalAgreement));

        return (MXNBToken, address(tenantPassport), address(rentalAgreement), address(propertyInterestPool), address(interestGenerator));
    }
}