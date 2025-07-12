export const NETWORK_CONFIG = {
  rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
  chainId: 421614,
  chainName: "Arbitrum Sepolia",
};

// --- Deployed Contract Addresses (Arbitrum Sepolia) ---
export const MXNBT_ADDRESS = "0x88d1900e8298e76c5Cd69527B85290D8037acbA3";
export const TENANT_PASSPORT_ADDRESS = "0xd5989E2221eceCaf5B698589b1cF61263504ca2C";
export const PROPERTY_INTEREST_POOL_ADDRESS = "0x92967FB9dE97F7dCC13d6C03a756227900964E21";
export const RENTAL_AGREEMENT_ADDRESS = "0x3745f3e18dD0E16c66Bca01B6AB29e250DBE37c5";
export const INTEREST_GENERATOR_ADDRESS = "0xb23F4C18de4b6f526363dEeFb5351B2b9a3a695e";

// --- Contract ABIs (Concise) ---
// Only include functions actually used in the frontend

export const MXNB_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transferFrom(address from, address to, uint256 amount) returns (bool)",
    "function decimals() view returns (uint8)"
];

export const TENANT_PASSPORT_ABI = [
    "function mintForSelf()",
    "function getTenantInfo(uint256 tokenId) view returns (tuple(uint256 reputation, uint256 paymentsMade, uint256 paymentsMissed, uint256 outstandingBalance, uint256 propertiesOwned))",
    "function balanceOf(address owner) view returns (uint256)",
    "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)"
];

export const PROPERTY_INTEREST_POOL_ABI = [
    "function propertyCounter() view returns (uint256)",
    "function getPropertyInfo(uint256 _propertyId) view returns (address landlord, uint256 totalRentAmount, uint256 seriousnessDeposit, uint256 requiredTenantCount, uint256 amountPooledForRent, address[] interestedTenants, uint8 state, uint256 paymentDayStart, uint256 paymentDayEnd)",
    "function createPropertyPool(uint256 _totalRent, uint256 _seriousnessDeposit, uint256 _tenantCount, uint256 _paymentDayStart, uint256 _paymentDayEnd)",
    "function expressInterest(uint256 _propertyId)",
    "function fundRent(uint256 _propertyId)",
    "function claimLease(uint256 _propertyId)",
    "function cancelPool(uint256 _propertyId)",
    "function withdrawInterest(uint256 _propertyId)"
];

export const RENTAL_AGREEMENT_ABI = [
    "function deposit(uint256 amount)",
    "function payRent()",
    "function depositToVault(uint256 _amount)",
    "function withdrawFromVault(uint256 _amount)",
    "function landlordWithdraw(uint256 _amount)",
    "function getVaultBalance() view returns (uint256)"
];

export const INTEREST_GENERATOR_ABI = [
    "function deposit(uint256 amount)",
    "function withdraw(uint256 amount)",
    "function balanceOf(address user) view returns (uint256)",
    "function calculateInterest(address user) view returns (uint256)"
];