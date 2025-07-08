// --- CONFIGURACIÓN PARA ARBITRUM SEPOLIA ---

export const NETWORK_CONFIG = {
    chainId: 421614, // Chain ID de Arbitrum Sepolia
    rpcUrl: 'https://arb-sepolia.g.alchemy.com/v2/7WyBYWr5WFbnjTv1ieQ3YecNH_MOgm7N',
    chainName: 'Arbitrum Sepolia',
    nativeCurrency: {
        name: 'Sepolia Ether',
        symbol: 'ETH',
        decimals: 18,
    },
};

// Direcciones de los contratos desplegados en Arbitrum Sepolia
export const TENANT_PASSPORT_ADDRESS = "0x8419d8469Be4cc44044812eF6d83687a1176a130";
export const PROPERTY_INTEREST_POOL_ADDRESS = "0xFadC0f8d44e599D3f6959742e1e007D28D4Bcd58";
export const MXNBT_ADDRESS = "0x88d1900e8298e76c5Cd69527B85290D8037acbA3";

export const TENANT_PASSPORT_ABI = [
    "function mintForSelf() returns (uint256)",
    "function getTenantInfo(uint256 tokenId) view returns (tuple(uint256 reputation, uint256 paymentsMade, uint256 paymentsMissed, uint256 outstandingBalance, uint256 propertiesOwned))",
    "function balanceOf(address owner) view returns (uint256)",
    "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)"
];

export const PROPERTY_INTEREST_POOL_ABI = [
    "function createPropertyPool(uint256 totalRentAmount, uint256 seriousnessDeposit, uint256 requiredTenantCount) returns (uint256)",
    "function expressInterest(uint256 propertyId) payable",
    "function fundPool(uint256 propertyId)",
    "function getPropertyInfo(uint256 _propertyId) view returns (address landlord, uint256 totalRentAmount, uint256 seriousnessDeposit, uint256 requiredTenantCount, uint256 amountPooledForRent, address[] interestedTenants, uint8 state)", // Nueva función
    "function properties(uint256) view returns (address landlord, uint256 totalRentAmount, uint256 seriousnessDeposit, uint256 requiredTenantCount, uint256 amountPooledForRent, uint256 amountPooledForDeposit, uint8 state)",
    "function propertyCounter() view returns (uint256)"
];

export const MXNBT_ABI = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function mint(address to, uint256 amount)"
];