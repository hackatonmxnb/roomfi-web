// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {RentalAgreement} from "../src/RentalAgreement.sol";
import {TenantPassport} from "../src/tokens/TenantPassport.sol";
import {MXNBT} from "../src/tokens/MXNBT.sol";

contract RentalAgreementTest is Test {
    // --- State ---
    RentalAgreement public rentalAgreement;
    TenantPassport public tenantPassport;
    MXNBT public mxbntToken;

    address public owner = makeAddr("owner");
    address public landlord = makeAddr("landlord");
    address public tenant1 = makeAddr("tenant1");
    address public tenant2 = makeAddr("tenant2");
    address public nonTenant = makeAddr("nonTenant");

    uint256 public constant RENT_AMOUNT = 1000 * 1e18;
    uint256 public constant DEPOSIT_AMOUNT = 2000 * 1e18;
    uint256 public constant TOTAL_GOAL = RENT_AMOUNT + DEPOSIT_AMOUNT;

    // --- Setup ---
    function setUp() public {
        // Deploy mock contracts
        vm.startPrank(owner);
        tenantPassport = new TenantPassport();
        mxbntToken = new MXNBT();
        vm.stopPrank();

        // Prepare tenants and passport IDs
        address[] memory tenants = new address[](2);
        tenants[0] = tenant1;
        tenants[1] = tenant2;

        uint256[] memory passportIds = new uint256[](2);
        passportIds[0] = 1;
        passportIds[1] = 2;

        // Deploy the main contract
        rentalAgreement = new RentalAgreement(
            landlord,
            tenants,
            passportIds,
            RENT_AMOUNT,
            DEPOSIT_AMOUNT,
            address(tenantPassport),
            address(mxbntToken)
        );
        
        vm.prank(owner);
        tenantPassport.setRentalAgreementAddress(address(rentalAgreement));
        
        // Authorize the rental contract to update passports
        vm.prank(owner);
        
    }

    // --- Tests ---

    function test_Initialization() public {
        assertEq(rentalAgreement.landlord(), landlord);
        assertEq(rentalAgreement.rentAmount(), RENT_AMOUNT);
        assertEq(address(rentalAgreement.tenantPassport()), address(tenantPassport));
        assertTrue(rentalAgreement.isTenant(tenant1));
    }

    function test_Deposit_Success() public {
        uint256 depositValue = 1500 * 1e18;

        // Mint some tokens for the tenant
        vm.prank(owner);
        mxbntToken.mint(tenant1, depositValue);

        // Tenant approves the contract to spend tokens
        vm.startPrank(tenant1);
        mxbntToken.approve(address(rentalAgreement), depositValue);
        
        // Tenant deposits tokens
        rentalAgreement.deposit(depositValue);
        vm.stopPrank();

        assertEq(mxbntToken.balanceOf(address(rentalAgreement)), depositValue);
        assertEq(rentalAgreement.fundsPooled(), depositValue);
    }

    function test_Fail_Deposit_From_NonTenant() public {
        uint256 depositValue = 500 * 1e18;
        vm.prank(nonTenant);
        vm.expectRevert("Only a tenant can call this");
        rentalAgreement.deposit(depositValue);
    }

    function test_PayRent_Updates_Passport() public {
        // --- Setup for Active State ---
        uint256 tenant1Share = 1500 * 1e18;
        uint256 tenant2Share = 1500 * 1e18;
        
        // Mint and approve for tenant 1
        vm.prank(owner);
        mxbntToken.mint(tenant1, tenant1Share);
        vm.startPrank(tenant1);
        mxbntToken.approve(address(rentalAgreement), tenant1Share);
        rentalAgreement.deposit(tenant1Share);
        vm.stopPrank();

        // Mint and approve for tenant 2
        vm.prank(owner);
        mxbntToken.mint(tenant2, tenant2Share);
        vm.startPrank(tenant2);
        mxbntToken.approve(address(rentalAgreement), tenant2Share);
        rentalAgreement.deposit(tenant2Share);
        vm.stopPrank();
        
        // Agreement should now be active
        assertEq(uint(rentalAgreement.currentState()), uint(RentalAgreement.AgreementState.Active));

        // --- Rent Payment ---
        uint256 rentPortion = RENT_AMOUNT / 2;
        vm.prank(owner);
        mxbntToken.mint(tenant1, rentPortion); // Mint rent amount for tenant1

        vm.startPrank(tenant1);
        mxbntToken.approve(address(rentalAgreement), rentPortion);
        rentalAgreement.payRent();
        vm.stopPrank();

        // --- Verification ---
        uint256 passportId = rentalAgreement.tenantPassportId(tenant1);
        TenantPassport.TenantInfo memory info = tenantPassport.getTenantInfo(passportId);
        
        assertEq(info.paymentsMade, 1);
        assertEq(info.reputation, 100);
    }
}