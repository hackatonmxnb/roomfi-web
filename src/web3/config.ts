import MXNB_ABI from './abis/MXNB_ABI.json';
import TENANT_PASSPORT_ABI from './abis/TENANT_PASSPORT_ABI.json';
import PROPERTY_INTEREST_POOL_ABI from './abis/PROPERTY_INTEREST_POOL_ABI.json';
import INTEREST_GENERATOR_ABI from './abis/INTEREST_GENERATOR_ABI.json';

export const NETWORK_CONFIG = {
  rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
  chainId: 421614,
  chainName: "Arbitrum Sepolia",
};

// --- Deployed Contract Addresses (Monad testnet) ---
export const MXNBT_ADDRESS = "0x82B9e52b26A2954E113F94Ff26647754d5a4247D";
export const TENANT_PASSPORT_ADDRESS = "0x674687e09042452C0ad3D5EC06912bf4979bFC33";
export const PROPERTY_INTEREST_POOL_ADDRESS = "0xeD9018D47ee787C5d84A75A42Df786b8540cC75b";
export const INTEREST_GENERATOR_ADDRESS = "0xF8F626afB4AadB41Be7D746e53Ff417735b1C289";
// RENTAL_AGREEMENT_ADDRESS is intentionally removed.
// RentalAgreement contracts are created dynamically by the PropertyInterestPool.

// --- Contract ABIs (Imported from JSON files) ---
export {
    MXNB_ABI,
    TENANT_PASSPORT_ABI,
    PROPERTY_INTEREST_POOL_ABI,
    INTEREST_GENERATOR_ABI
};