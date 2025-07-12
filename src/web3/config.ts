import MXNB_ABI from './abis/MXNB_ABI.json';
import TENANT_PASSPORT_ABI from './abis/TENANT_PASSPORT_ABI.json';
import PROPERTY_INTEREST_POOL_ABI from './abis/PROPERTY_INTEREST_POOL_ABI.json';
import INTEREST_GENERATOR_ABI from './abis/INTEREST_GENERATOR_ABI.json';

export const NETWORK_CONFIG = {
  rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
  chainId: 421614,
  chainName: "Arbitrum Sepolia",
};

// --- Deployed Contract Addresses (Arbitrum Sepolia) ---
export const MXNBT_ADDRESS = "0x82B9e52b26A2954E113F94Ff26647754d5a4247D";
export const TENANT_PASSPORT_ADDRESS = "0x6c9CCd984183f02613D811d3264d042D44A27C4d";
export const PROPERTY_INTEREST_POOL_ADDRESS = "0x570E79D13AcEe4eeE7d445bF4fe0017CC721fE31";
export const INTEREST_GENERATOR_ADDRESS = "0xbbD634726d2DC6A9B5353d94653aCab97908EDb1";
// RENTAL_AGREEMENT_ADDRESS is intentionally removed.
// RentalAgreement contracts are created dynamically by the PropertyInterestPool.

// --- Contract ABIs (Imported from JSON files) ---
export {
    MXNB_ABI,
    TENANT_PASSPORT_ABI,
    PROPERTY_INTEREST_POOL_ABI,
    INTEREST_GENERATOR_ABI
};