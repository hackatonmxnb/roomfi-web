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
import "../src/V2/strategies/LendleYieldStrategy.sol";
import "../test/mocks/MockUSDT.sol";
import "../test/mocks/MockUSDY.sol";
import "../test/mocks/MockDEXRouter.sol";
import "../test/mocks/MockAToken.sol";
import "../test/mocks/MockLendlePool.sol";

/**
 * @title DeployMantleSepolia
 * @notice Deployment script para Mantle Sepolia Testnet
 * @dev Deploya RoomFi V2 completo con ambas yield strategies
 *
 * IMPORTANTE: Este script deploya MOCKS porque estamos en testnet
 * Para mainnet, usar addresses reales de USDT, USDY, Lendle, etc.
 *
 * Uso:
 * source .env
 * forge script script/DeployMantleSepolia.s.sol:DeployMantleSepolia \
 *   --rpc-url $MANTLE_SEPOLIA_RPC \
 *   --private-key $PRIVATE_KEY \
 *   --broadcast \
 *   --verify \
 *   --etherscan-api-key $MANTLE_API_KEY \
 *   -vvvv
 */
contract DeployMantleSepolia is Script {

    // Protocol configuration
    uint256 constant PROTOCOL_FEE_BP = 300; // 3%
    uint256 constant LANDLORD_FEE_BP = 200; // 2%
    uint256 constant VAULT_PROTOCOL_FEE = 30; // 30%
    uint256 constant DISPUTE_FEE = 10 * 1e6; // 10 USDT
    uint256 constant ARBITRATOR_STAKE = 50 * 1e6; // 50 USDT

    // Deployed contracts
    MockUSDT public usdt;
    MockUSDY public usdy;
    MockDEXRouter public dexRouter;
    MockAToken public aToken;
    MockLendlePool public lendlePool;

    TenantPassportV2 public tenantPassport;
    PropertyRegistry public propertyRegistry;
    DisputeResolver public disputeResolver;
    RoomFiVault public vault;
    RentalAgreementNFT public rentalAgreementNFT;
    RentalAgreementFactoryNFT public factory;

    USDYStrategy public usdyStrategy;
    LendleYieldStrategy public lendleStrategy;

    address public deployer;

    function run() public {
        deployer = msg.sender;

        console.log("==========================================");
        console.log("ROOMFI V2 - MANTLE SEPOLIA DEPLOYMENT");
        console.log("==========================================");
        console.log("");
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance / 1e18, "MNT");
        console.log("Chain ID:", block.chainid);
        console.log("Block:", block.number);
        console.log("");

        require(deployer.balance > 0.1 ether, "Insufficient MNT balance");

        vm.startBroadcast();

        // Step 1: Deploy Mocks
        console.log("STEP 1/5: Deploying Mock Infrastructure...");
        deployMocks();
        console.log("");

        // Step 2: Deploy Core Contracts
        console.log("STEP 2/5: Deploying Core RoomFi Contracts...");
        deployCoreContracts();
        console.log("");

        // Step 3: Deploy Yield Strategies
        console.log("STEP 3/5: Deploying Yield Strategies...");
        deployStrategies();
        console.log("");

        // Step 4: Configure Integrations
        console.log("STEP 4/5: Configuring Integrations...");
        configureIntegrations();
        console.log("");

        // Step 5: Initial Setup & Funding
        console.log("STEP 5/5: Initial Setup & Funding...");
        initialSetup();
        console.log("");

        vm.stopBroadcast();

        // Print deployment summary
        printSummary();

        // Save addresses
        saveAddresses();
    }

    function deployMocks() internal {
        console.log("  Deploying MockUSDT...");
        usdt = new MockUSDT();
        console.log("    Address:", address(usdt));

        console.log("  Deploying MockUSDY...");
        usdy = new MockUSDY();
        console.log("    Address:", address(usdy));

        console.log("  Deploying MockDEXRouter...");
        dexRouter = new MockDEXRouter(address(usdt), address(usdy));
        console.log("    Address:", address(dexRouter));

        console.log("  Deploying MockLendlePool...");
        lendlePool = new MockLendlePool();
        console.log("    Address:", address(lendlePool));

        console.log("  Deploying MockAToken...");
        aToken = new MockAToken(
            address(usdt),
            address(lendlePool),
            "Lendle USDT",
            "aUSDT"
        );
        console.log("    Address:", address(aToken));

        console.log("  Initializing Lendle Reserve...");
        lendlePool.initializeReserve(address(usdt), address(aToken));

        console.log("  Funding DEX with liquidity...");
        usdt.mint(address(dexRouter), 100_000 * 1e6);
        usdy.mint(address(dexRouter), 98_000 * 1e18);

        console.log("  Funding Lendle Pool...");
        usdt.mint(address(lendlePool), 50_000 * 1e6);

        console.log("  Minting USDT to deployer...");
        usdt.mint(deployer, 10_000 * 1e6);
    }

    function deployCoreContracts() internal {
        console.log("  Deploying TenantPassportV2...");
        tenantPassport = new TenantPassportV2(deployer);
        console.log("    Address:", address(tenantPassport));

        console.log("  Deploying PropertyRegistry...");
        propertyRegistry = new PropertyRegistry(
            address(tenantPassport),
            deployer
        );
        console.log("    Address:", address(propertyRegistry));

        console.log("  Deploying DisputeResolver...");
        disputeResolver = new DisputeResolver(
            address(tenantPassport),
            address(propertyRegistry),
            deployer
        );
        console.log("    Address:", address(disputeResolver));

        console.log("  Deploying RoomFiVault...");
        vault = new RoomFiVault(
            address(usdt),
            deployer
        );
        console.log("    Address:", address(vault));

        console.log("  Deploying RentalAgreementNFT...");
        rentalAgreementNFT = new RentalAgreementNFT(
            address(usdt),
            address(vault)
        );
        console.log("    Address:", address(rentalAgreementNFT));

        console.log("  Deploying RentalAgreementFactoryNFT...");
        factory = new RentalAgreementFactoryNFT(
            address(rentalAgreementNFT),
            address(propertyRegistry),
            address(tenantPassport),
            deployer
        );
        console.log("    Address:", address(factory));

        console.log("  Initializing RentalAgreementNFT references...");
        rentalAgreementNFT.initializeReferences(
            address(propertyRegistry),
            address(tenantPassport),
            address(factory),
            address(disputeResolver)
        );
    }

    function deployStrategies() internal {
        console.log("  Deploying USDYStrategy...");
        usdyStrategy = new USDYStrategy(
            address(usdt),
            address(usdy),
            address(dexRouter),
            address(vault),
            deployer
        );
        console.log("    Address:", address(usdyStrategy));
        console.log("    APY: 4.29%");

        console.log("  Deploying LendleYieldStrategy...");
        lendleStrategy = new LendleYieldStrategy(
            address(lendlePool),
            address(usdt),
            address(vault),
            deployer
        );
        console.log("    Address:", address(lendleStrategy));
        console.log("    APY: ~6%");
    }

    function configureIntegrations() internal {
        console.log("  Authorizing RentalAgreementNFT in TenantPassport...");
        tenantPassport.authorizeUpdater(address(rentalAgreementNFT));

        console.log("  Authorizing RentalAgreementNFT in PropertyRegistry...");
        propertyRegistry.authorizeUpdater(address(rentalAgreementNFT));

        console.log("  Authorizing RentalAgreementNFT in Vault...");
        vault.setAuthorizedDepositor(address(rentalAgreementNFT), true);

        console.log("  Setting USDY as default strategy in Vault...");
        vault.setStrategy(address(usdyStrategy));
    }

    function initialSetup() internal {
        console.log("  Creating test tenant passport for deployer...");
        try tenantPassport.mintForSelf() {
            console.log("    Passport minted successfully");
        } catch {
            console.log("    Passport already exists or error");
        }

        console.log("  Deployment completed successfully!");
    }

    function printSummary() internal view {
        console.log("");
        console.log("==========================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("==========================================");
        console.log("");
        console.log("MOCK INFRASTRUCTURE:");
        console.log("  USDT:          ", address(usdt));
        console.log("  USDY:          ", address(usdy));
        console.log("  DEX Router:    ", address(dexRouter));
        console.log("  Lendle Pool:   ", address(lendlePool));
        console.log("  aUSDT:         ", address(aToken));
        console.log("");
        console.log("CORE CONTRACTS:");
        console.log("  TenantPassport:", address(tenantPassport));
        console.log("  PropertyReg:   ", address(propertyRegistry));
        console.log("  Disputes:      ", address(disputeResolver));
        console.log("  Vault:         ", address(vault));
        console.log("  AgreementNFT:  ", address(rentalAgreementNFT));
        console.log("  Factory:       ", address(factory));
        console.log("");
        console.log("YIELD STRATEGIES:");
        console.log("  USDY Strategy: ", address(usdyStrategy), " (DEFAULT)");
        console.log("  Lendle Strategy:", address(lendleStrategy));
        console.log("");
        console.log("CONFIGURATION:");
        console.log("  Active Strategy: USDY (4.29% APY)");
        console.log("  Vault Fee: 30% of yield");
        console.log("  Tenant Receives: 70% of yield");
        console.log("  Rent Protocol Fee: 3%");
        console.log("");
        console.log("DEPLOYER BALANCES:");
        console.log("  USDT:", usdt.balanceOf(deployer) / 1e6);
        console.log("  MNT:", deployer.balance / 1e18);
        console.log("");
        console.log("==========================================");
        console.log("NEXT STEPS:");
        console.log("==========================================");
        console.log("1. Verify contracts on Mantle Explorer");
        console.log("2. Update frontend with addresses from deployment-addresses.json");
        console.log("3. Test flow:");
        console.log("   - Create property");
        console.log("   - Create rental agreement");
        console.log("   - Pay deposit (will go to USDY)");
        console.log("   - Pay rent");
        console.log("   - Complete agreement (get yield)");
        console.log("");
        console.log("To switch to Lendle strategy:");
        console.log("  vault.updateStrategy(", address(lendleStrategy), ")");
        console.log("");
        console.log("==========================================");
    }

    function saveAddresses() internal {
        string memory json = string(abi.encodePacked(
            '{\n',
            '  "network": "mantle-sepolia",\n',
            '  "chainId": ', vm.toString(block.chainid), ',\n',
            '  "deployer": "', vm.toString(deployer), '",\n',
            '  "timestamp": ', vm.toString(block.timestamp), ',\n',
            '  "mocks": {\n',
            '    "usdt": "', vm.toString(address(usdt)), '",\n',
            '    "usdy": "', vm.toString(address(usdy)), '",\n',
            '    "dexRouter": "', vm.toString(address(dexRouter)), '",\n',
            '    "lendlePool": "', vm.toString(address(lendlePool)), '",\n',
            '    "aToken": "', vm.toString(address(aToken)), '"\n',
            '  },\n',
            '  "core": {\n',
            '    "tenantPassport": "', vm.toString(address(tenantPassport)), '",\n',
            '    "propertyRegistry": "', vm.toString(address(propertyRegistry)), '",\n',
            '    "disputeResolver": "', vm.toString(address(disputeResolver)), '",\n',
            '    "vault": "', vm.toString(address(vault)), '",\n',
            '    "rentalAgreementNFT": "', vm.toString(address(rentalAgreementNFT)), '",\n',
            '    "factory": "', vm.toString(address(factory)), '"\n',
            '  },\n',
            '  "strategies": {\n',
            '    "usdy": "', vm.toString(address(usdyStrategy)), '",\n',
            '    "lendle": "', vm.toString(address(lendleStrategy)), '",\n',
            '    "active": "usdy"\n',
            '  }\n',
            '}'
        ));

        vm.writeFile("./deployment-addresses.json", json);
        console.log("Addresses saved to: deployment-addresses.json");
    }
}
