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
export const TENANT_PASSPORT_ADDRESS = "0xEFF80a6cBfE6a0416157d6eF534a658FEb594879";
export const PROPERTY_INTEREST_POOL_ADDRESS = "0x2946e660217BF676936B03CD4D90058Bf37bf02c";
export const INTEREST_GENERATOR_ADDRESS = "0xD697c8aa945729025Fdd5b6a54D0a5D01902c1D6";
// RENTAL_AGREEMENT_ADDRESS is intentionally removed.
// RentalAgreement contracts are created dynamically by the PropertyInterestPool.

// --- Contract ABIs (Imported from JSON files) ---
export {
    MXNB_ABI,
    TENANT_PASSPORT_ABI,
    PROPERTY_INTEREST_POOL_ABI,
    INTEREST_GENERATOR_ABI
};