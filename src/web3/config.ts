import PROPERTY_REGISTRY_ABI from './abis/PROPERTY_REGISTRY_ABI.json';
import TENANT_PASSPORT_ABI from './abis/TENANT_PASSPORT_ABI.json';
import ROOM_FI_VAULT_ABI from './abis/ROOM_FI_VAULT_ABI.json';
import RENTAL_AGREEMENT_NFT_ABI from './abis/RENTAL_AGREEMENT_NFT_ABI.json';
import RENTAL_AGREEMENT_FACTORY_ABI from './abis/RENTAL_AGREEMENT_FACTORY_ABI.json';
import MOCK_CIVIL_REGISTRY_ABI from './abis/MOCK_CIVIL_REGISTRY_ABI.json';
import USDT_ABI from './abis/USDT_ABI.json';

export const NETWORK_CONFIG = {
  rpcUrl: "https://rpc.sepolia.mantle.xyz",
  chainId: 5003,
  chainName: "Mantle Sepolia Testnet",
  nativeCurrency: {
    name: "Mantle",
    symbol: "MNT",
    decimals: 18
  },
  blockExplorerUrl: "https://explorer.sepolia.mantle.xyz"
};

// --- Deployed Contract Addresses (Mantle Sepolia) ---
// --- Deployed Contract Addresses (Mantle Sepolia) ---
export const PROPERTY_REGISTRY_ADDRESS = "0xC616a4a72E9b8a54551acfA1fAAA6dA86b3B9D5e";
export const TENANT_PASSPORT_ADDRESS = "0x4278F06DFbe9E2049214DDbd0903Df46062Cf622";
export const ROOM_FI_VAULT_ADDRESS = "0x7485dd59a1B0d4f8bc13fc96D4cC82082CFF5A05";
export const MOCK_CIVIL_REGISTRY_ADDRESS = "0x82fdAa5Ad9209DEC0cfC0319395F34918eBC56F8";
export const RENTAL_AGREEMENT_NFT_ADDRESS = "0x60c48ce2ABC5E00cE6B1fcF913fc916370855750";
export const FACTORY_ADDRESS = "0x09e32da871a09Eeaf8352B628A3DF49a0E20103a";

// Mocks
export const USDT_ADDRESS = "0xEeF99BEB13a65dF58968C0C281596FE8439634e1";
export const USDY_ADDRESS = "0xA119110f32A478E2091e559Be5a62Ea0C6DeDCCc";

// --- Contract ABIs ---
export {
  PROPERTY_REGISTRY_ABI,
  TENANT_PASSPORT_ABI,
  ROOM_FI_VAULT_ABI,
  RENTAL_AGREEMENT_NFT_ABI,
  RENTAL_AGREEMENT_FACTORY_ABI,
  MOCK_CIVIL_REGISTRY_ABI,
  USDT_ABI
};