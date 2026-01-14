// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/V2/TenantPassportV2.sol";
import "../src/V2/PropertyRegistry.sol";
import "../src/V2/DisputeResolver.sol";
import "../src/V2/RoomFiVault.sol";
import "../src/V2/RentalAgreementNFT.sol";
import "../src/V2/RentalAgreementFactoryNFT.sol";
import "../src/V2/strategies/USDYStrategy.sol";

/**
 * @title ConfigureExisting
 * @notice Script de recuperación para configurar contratos ya desplegados
 * @dev Ejecutar esto si el deploy principal falló por timeout en la configuración
 */
contract ConfigureExisting is Script {

    // --- ADDRESSES RECUPERADOS DEL LOG ---
    address constant TENANT_PASSPORT_ADDR = 0x4278F06DFbe9E2049214DDbd0903Df46062Cf622;
    address constant PROPERTY_REGISTRY_ADDR = 0xC616a4a72E9b8a54551acfA1fAAA6dA86b3B9D5e;
    address constant DISPUTE_RESOLVER_ADDR = 0xDF8e2A9504768742Fd3A37f7E7a7e650356dF781;
    address constant VAULT_ADDR = 0x7485dd59a1B0d4f8bc13fc96D4cC82082CFF5A05;
    address constant RENTAL_NFT_ADDR = 0x60c48ce2ABC5E00cE6B1fcF913fc916370855750;
    address constant FACTORY_ADDR = 0x09e32da871a09Eeaf8352B628A3DF49a0E20103a;
    address constant USDY_STRATEGY_ADDR = 0x99270038f4ab569a115c739D23b0CeeC2f15d553;

    function run() public {
        address deployer = msg.sender;
        
        console.log("==========================================");
        console.log("ROOMFI V2 - RECOVERY CONFIGURATION");
        console.log("==========================================");

        vm.startBroadcast();

        TenantPassportV2 tenantPassport = TenantPassportV2(TENANT_PASSPORT_ADDR);
        PropertyRegistry propertyRegistry = PropertyRegistry(PROPERTY_REGISTRY_ADDR);
        RoomFiVault vault = RoomFiVault(VAULT_ADDR);
        RentalAgreementNFT rentalAgreementNFT = RentalAgreementNFT(payable(RENTAL_NFT_ADDR));

        // 1. Inicializar referencias (si no se hizo)
        console.log("Configuring RentalAgreementNFT references...");
        try rentalAgreementNFT.initializeReferences(
            PROPERTY_REGISTRY_ADDR,
            TENANT_PASSPORT_ADDR,
            FACTORY_ADDR,
            DISPUTE_RESOLVER_ADDR
        ) {
            console.log("  Successfully initialized");
        } catch {
            console.log("  Already initialized or failed");
        }

        // 2. Autorizaciones
        console.log("Authorizing RentalAgreementNFT in PropertyRegistry...");
        propertyRegistry.authorizeUpdater(RENTAL_NFT_ADDR);

        console.log("Authorizing PropertyRegistry in TenantPassport...");
        tenantPassport.authorizeUpdater(PROPERTY_REGISTRY_ADDR);

        console.log("Authorizing DisputeResolver in TenantPassport and PropertyRegistry...");
        tenantPassport.authorizeUpdater(DISPUTE_RESOLVER_ADDR);
        propertyRegistry.authorizeUpdater(DISPUTE_RESOLVER_ADDR);

        console.log("Authorizing RentalAgreementNFT in Vault...");
        vault.setAuthorizedDepositor(RENTAL_NFT_ADDR, true);

        console.log("Setting USDY as default strategy in Vault...");
        try vault.setStrategy(USDY_STRATEGY_ADDR) {
            console.log("  Strategy set");
        } catch {
            console.log("  Strategy update failed or already set");
        }

        // 3. Test Passport
        console.log("Creating test tenant passport...");
        try tenantPassport.mintForSelf() {
            console.log("  Passport minted successfully");
        } catch {
            console.log("  Passport already exists");
        }

        vm.stopBroadcast();
        
        console.log("==========================================");
        console.log("CONFIGURATION COMPLETED");
    }
}
