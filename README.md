# RoomFi

<div align="center">

**Tokenizing Real Estate Rentals on Mantle Network**

[![Mantle Network](https://img.shields.io/badge/Network-Mantle_Sepolia-black?style=flat&logo=ethereum)](https://mantle.xyz)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?style=flat&logo=solidity)](https://soliditylang.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-19%2F20_Passing-success)](TESTING_REPORT.md)

[Documentation](docs/README.md) • [Smart Contracts](Foundry/src/V2/) • [Deployment](Foundry/deployment-addresses.json) • [Live Demo](#)

</div>

---

## Overview

RoomFi transforms the rental real estate market by tokenizing properties and rental agreements as NFTs, enabling verifiable tenant reputation and yield-generating security deposits. Built on Mantle Network to leverage low gas costs for frequent rental payments.

### The Problem

The traditional rental market suffers from three critical inefficiencies:

- **Trust Gap**: No portable tenant reputation system leads to redundant background checks and discrimination
- **Capital Inefficiency**: $280B+ locked in security deposits earning zero yield
- **High Friction**: Manual processes, expensive dispute resolution, and lack of transparency

### Our Solution

RoomFi introduces a decentralized rental ecosystem with three core innovations:

1. **Tenant Reputation NFTs**: Soul-bound tokens that build portable, verifiable rental history
2. **Yield-Generating Deposits**: Security deposits earn 4-6% APY through battle-tested DeFi protocols
3. **NFT Rental Agreements**: ERC721 tokens representing each lease, enabling programmable rental economics

### Key Features

**For Tenants**
- Build portable on-chain reputation across properties
- Earn yield on security deposits (70% share)
- Access better rental opportunities with verifiable history

**For Landlords**
- Screen tenants with transparent reputation data
- Reduce vacancy with trustworthy tenant pool
- Automate rent collection and compliance

**For the Ecosystem**
- Unlock $280B+ in idle capital
- Enable data-driven rental underwriting
- Create composable real estate primitives

---

## Architecture

### Smart Contract System

```
Core Contracts
├── TenantPassportV2.sol          Soul-bound NFT with 14 achievement badges
├── PropertyRegistry.sol           Property verification and tokenization
├── RentalAgreementNFT.sol        ERC721 rental contracts with automated payments
├── RentalAgreementFactory.sol    Gas-efficient contract creation
├── DisputeResolver.sol           Decentralized arbitration system
├── RoomFiVault.sol               Deposit management and yield distribution
└── strategies/
    ├── USDYStrategy.sol          Ondo Finance integration (4.29% APY)
    └── LendleYieldStrategy.sol   Lendle protocol integration (~6% APY)
```

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Blockchain** | Mantle Network (Sepolia Testnet) |
| **Smart Contracts** | Solidity 0.8.20, Foundry |
| **Frontend** | React 19, TypeScript, Vite |
| **Yield Sources** | Ondo USDY, Lendle Protocol |
| **Standards** | ERC721, ERC20, Ownable |

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- [Foundry](https://book.getfoundry.sh/getting-started/installation) for smart contract development
- MetaMask or compatible Web3 wallet

### Installation

```bash
# Clone the repository
git clone https://github.com/hackatonmxnb/roomfi-web.git
cd roomfi-web

# Install frontend dependencies
npm install

# Install smart contract dependencies
cd Foundry && forge install
```

### Configuration

```bash
# Copy environment template
cp .env.example .env

# Configure for Mantle Sepolia
REACT_APP_NETWORK=mantle-sepolia
REACT_APP_CHAIN_ID=5003
REACT_APP_RPC_URL=https://rpc.sepolia.mantle.xyz
```

### Build & Test

```bash
# Compile smart contracts
cd Foundry
forge build

# Run tests
forge test

# Start frontend development server
cd ..
npm run dev
```

### Using Deployed Contracts

The contracts are already deployed on Mantle Sepolia. See [deployment addresses](#deployed-contracts) below to interact with the live system.

---

## Deployed Contracts

### Mantle Sepolia Testnet

| Contract | Address | Explorer |
|----------|---------|----------|
| **USDT (Mock)** | `0xd615074c2603336fa0da8af44b5ccb9d9c0b2f9c` | [View](https://explorer.sepolia.mantle.xyz/address/0xd615074c2603336fa0da8af44b5ccb9d9c0b2f9c) |
| **TenantPassportV2** | `0xf6a6e553834ff33fc819b6639a557f1f4c647d86` | [View](https://explorer.sepolia.mantle.xyz/address/0xf6a6e553834ff33fc819b6639a557f1f4c647d86) |
| **PropertyRegistry** | `0xf8bb2ce2643f89e6b80fdac94483cda91110d95a` | [View](https://explorer.sepolia.mantle.xyz/address/0xf8bb2ce2643f89e6b80fdac94483cda91110d95a) |
| **DisputeResolver** | `0x1acb65533d0f5dbb99d6f3c30acad0a5499325c2` | [View](https://explorer.sepolia.mantle.xyz/address/0x1acb65533d0f5dbb99d6f3c30acad0a5499325c2) |
| **RoomFiVault** | `0x111592714036d6870f63807f1b659b4def2c6c43` | [View](https://explorer.sepolia.mantle.xyz/address/0x111592714036d6870f63807f1b659b4def2c6c43) |
| **RentalAgreementNFT** | `0xa70efcb817358689e46b664602b757f9fd183c6b` | [View](https://explorer.sepolia.mantle.xyz/address/0xa70efcb817358689e46b664602b757f9fd183c6b) |
| **Factory** | `0x1b8e378f489021029b4e9049f261b204def16974` | [View](https://explorer.sepolia.mantle.xyz/address/0x1b8e378f489021029b4e9049f261b204def16974) |
| **USDYStrategy** | `0x61fc4578863da32dc4e879f59e1cb673da498618` | [View](https://explorer.sepolia.mantle.xyz/address/0x61fc4578863da32dc4e879f59e1cb673da498618) |
| **LendleStrategy** | `0x098ff07f87c1aaec0dd5b16c2f0199aa2b60bb75` | [View](https://explorer.sepolia.mantle.xyz/address/0x098ff07f87c1aaec0dd5b16c2f0199aa2b60bb75) |

**Network Details**
- Chain ID: 5003
- RPC: https://rpc.sepolia.mantle.xyz
- Explorer: https://explorer.sepolia.mantle.xyz
- Deployed: January 7, 2026

View complete deployment info: [deployment-addresses.json](Foundry/deployment-addresses.json)

---

## How It Works

### For Tenants

**1. Create Identity**
- Mint a Tenant Passport NFT (soul-bound, non-transferable)
- Start with base reputation score
- Earn badges through verified actions

**2. Rent Properties**
- Browse verified properties
- Submit rental applications with on-chain history
- Pay security deposit (automatically invested for yield)

**3. Build Reputation**
- On-time payments increase reputation score
- Complete leases earn achievement badges
- Reputation is portable across all properties

**4. Earn Returns**
- Security deposits generate 4-6% APY through DeFi
- Receive 70% of yield at lease completion
- Landlord receives 30% for providing capital

### For Landlords

**1. Register Property**
- Tokenize property as NFT
- Add property details and verification documents
- Get verified through PropertyRegistry

**2. List & Screen**
- Create rental listing with terms
- Review tenant reputation scores and badges
- Select qualified tenants transparently

**3. Manage Rentals**
- Rental agreement deployed as ERC721 NFT
- Automated monthly rent collection
- Built-in dispute resolution mechanism

### Protocol Features

**Yield Strategy**
- Active strategy: Ondo USDY (4.29% APY)
- Alternative: Lendle Protocol (~6% APY)
- Automatic yield distribution at lease end

**Dispute Resolution**
- Decentralized arbitration panel
- 3-arbitrator voting system
- On-chain enforcement of decisions

**Badge System**
- 14 tenant achievement badges
- Verifiable on-chain credentials
- Improves access to better properties

---

## Documentation

Comprehensive documentation is available in the `/docs` directory:

- **[Smart Contracts Architecture](docs/backend/SMART_CONTRACTS_ARCHITECTURE.md)** - Detailed technical specifications of all contracts
- **[User Flows](docs/flows/USER_FLOWS.md)** - Complete platform mechanics and user journeys
- **[Deployment Guide](docs/deployment/DEPLOYMENT_CHECKLIST.md)** - Step-by-step deployment instructions
- **[Frontend Integration](docs/frontend/ANALISIS_COMPATIBILIDAD_FRONTEND_CONTRATOS.md)** - Frontend compatibility and migration guide
- **[Testing Report](TESTING_REPORT.md)** - Test results and validation

---

## Testing

### Running Tests

```bash
cd Foundry

# Compile contracts
forge build

# Run unit tests
forge test

# Run with gas reporting
forge test --gas-report

# Run specific test file
forge test --match-path test/TenantPassport.t.sol
```

### Integration Tests

```bash
# Run integration test suite
./test-deployment.sh

# Run functional tests
./test-functional.sh
```

**Test Coverage**: 19/20 integration tests passing (95%)
See [TESTING_REPORT.md](TESTING_REPORT.md) for detailed results.

---

## Technical Highlights

### Smart Contract Design

**Gas Optimization**
- Factory pattern for rental agreement creation
- Efficient storage patterns
- Minimal on-chain data storage

**Security**
- OpenZeppelin contracts v5.0
- ReentrancyGuard on all payable functions
- Role-based access control
- No upgradeable proxies (immutable core logic)

**Composability**
- ERC721 standard for rental agreements
- Modular yield strategy system
- Extensible badge and reputation system

### Yield Strategy Implementation

Currently integrated yield sources:

1. **Ondo USDY** (Active)
   - Tokenized US Treasury yields
   - 4.29% APY
   - Low-risk, stable returns

2. **Lendle Protocol** (Available)
   - Aave V3 fork on Mantle
   - ~6% APY on USDT
   - Lending protocol integration

Strategy selection is flexible and can be updated by vault owner.

---

## Why Mantle Network?

RoomFi leverages Mantle's infrastructure for:

- **Cost Efficiency**: Low gas fees enable frequent rent payments (~$0.01/tx)
- **Scalability**: High throughput for rental payment processing
- **EVM Compatibility**: Seamless Solidity deployment
- **DeFi Ecosystem**: Native integrations with Lendle, Ondo Finance
- **Data Availability**: Efficient on-chain property metadata storage

---

## Project Status

**Current Phase**: Testnet Deployment (Mantle Global Hackathon 2025)

- Contracts deployed on Mantle Sepolia
- Integration tests passing (19/20)
- Frontend in development
- Documentation complete

**Next Steps**:
- Complete frontend integration
- End-to-end testing
- Security review
- Mainnet deployment preparation

---

## Contributing

Contributions are welcome. To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/improvement`)
3. Commit changes (`git commit -m "Add improvement"`)
4. Push to branch (`git push origin feature/improvement`)
5. Open a Pull Request

Please ensure tests pass and documentation is updated.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

---

## Links

- **GitHub**: [github.com/hackatonmxnb/roomfi-web](https://github.com/hackatonmxnb/roomfi-web)
- **Documentation**: [docs/](docs/)
- **Mantle Network**: [mantle.xyz](https://mantle.xyz)
- **Ondo Finance**: [ondo.finance](https://ondo.finance)
- **Lendle Protocol**: [lendle.xyz](https://lendle.xyz)

---

**Built for Mantle Global Hackathon 2025**

*Transforming the $2.8 trillion rental market through tokenization and DeFi*
