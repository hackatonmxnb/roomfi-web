import PROPERTY_REGISTRY_ABI from './abis/PROPERTY_REGISTRY_ABI.json';
import TENANT_PASSPORT_ABI from './abis/TENANT_PASSPORT_ABI.json';
import ROOM_FI_VAULT_ABI from './abis/ROOM_FI_VAULT_ABI.json';
import RENTAL_AGREEMENT_NFT_ABI from './abis/RENTAL_AGREEMENT_NFT_ABI.json';
import MOCK_CIVIL_REGISTRY_ABI from './abis/MOCK_CIVIL_REGISTRY_ABI.json';

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
export const PROPERTY_REGISTRY_ADDRESS = "0x4D796A99e55c72373f14324e938EFD53B98C456F";
export const TENANT_PASSPORT_ADDRESS = "0x5DB2fa1e9eB8DB2A9F12ea39f4A95BcaEC671bd5";
export const ROOM_FI_VAULT_ADDRESS = "0x7b4289aB2eBeC7c1A1776aAD758E00Be4A942e5A";
export const MOCK_CIVIL_REGISTRY_ADDRESS = "0xe5A870dF209072885f60F5C5C3FCde409e78c871";
export const RENTAL_AGREEMENT_NFT_ADDRESS = "0x152f3f422f9148f51a840A765E3DfC3fb5097335";
export const FACTORY_ADDRESS = "0xf944dfB7895D05AB71f8D512E93C34E19F58b3b2";

// Mocks
export const USDT_ADDRESS = "0x5602fec1b2B14D7f7099cE6d8acAa96233F7d837";
export const USDY_ADDRESS = "0x219284CFEE97741AEd3E3A7d193c1c1F360a780D";

// --- Contract ABIs ---
export {
  PROPERTY_REGISTRY_ABI,
  TENANT_PASSPORT_ABI,
  ROOM_FI_VAULT_ABI,
  RENTAL_AGREEMENT_NFT_ABI,
  MOCK_CIVIL_REGISTRY_ABI
};