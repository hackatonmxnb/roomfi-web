#!/bin/bash

# RoomFi V2 - Deployment Testing Suite
# Mantle Sepolia Testnet

set +e  # Continue on errors

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Network
RPC_URL="https://rpc.sepolia.mantle.xyz"
DEPLOYER="0x8A387ef9acC800eea39E3E6A2d92694dB6c813Ac"

# Addresses
USDT="0xd615074c2603336fa0da8af44b5ccb9d9c0b2f9c"
TENANT_PASSPORT="0xf6a6e553834ff33fc819b6639a557f1f4c647d86"
PROPERTY_REGISTRY="0xf8bb2ce2643f89e6b80fdac94483cda91110d95a"
VAULT="0x111592714036d6870f63807f1b659b4def2c6c43"
FACTORY="0x1b8e378f489021029b4e9049f261b204def16974"
USDY_STRATEGY="0x61fc4578863da32dc4e879f59e1cb673da498618"


TOTAL=0
PASSED=0

run_test() {
    local name=$1
    local cmd=$2
    
    TOTAL=$((TOTAL + 1))
    echo -e "${YELLOW}[TEST $TOTAL]${NC} $name"
    
    result=$(eval $cmd 2>&1)
    exit_code=$?
    
    if [ $exit_code -eq 0 ] && [ ! -z "$result" ]; then
        echo -e "${GREEN}✓ PASSED${NC} - $result\n"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAILED${NC} - $result\n"
    fi
}

echo -e "${BLUE}━━━ Network Connectivity ━━━${NC}\n"
run_test "Chain ID" "cast chain-id --rpc-url $RPC_URL"
run_test "Block number" "cast block-number --rpc-url $RPC_URL"

echo -e "${BLUE}━━━ TenantPassport ━━━${NC}\n"
run_test "Owner" "cast call $TENANT_PASSPORT 'owner()(address)' --rpc-url $RPC_URL"
run_test "Name" "cast call $TENANT_PASSPORT 'name()(string)' --rpc-url $RPC_URL"
run_test "Symbol" "cast call $TENANT_PASSPORT 'symbol()(string)' --rpc-url $RPC_URL"
run_test "Total Supply" "cast call $TENANT_PASSPORT 'totalSupply()(uint256)' --rpc-url $RPC_URL"

echo -e "${BLUE}━━━ MockUSDT ━━━${NC}\n"
run_test "Name" "cast call $USDT 'name()(string)' --rpc-url $RPC_URL"
run_test "Symbol" "cast call $USDT 'symbol()(string)' --rpc-url $RPC_URL"
run_test "Decimals" "cast call $USDT 'decimals()(uint8)' --rpc-url $RPC_URL"
run_test "Deployer balance" "cast call $USDT 'balanceOf(address)(uint256)' $DEPLOYER --rpc-url $RPC_URL"

echo -e "${BLUE}━━━ PropertyRegistry ━━━${NC}\n"
run_test "Owner" "cast call $PROPERTY_REGISTRY 'owner()(address)' --rpc-url $RPC_URL"
run_test "TenantPassport reference" "cast call $PROPERTY_REGISTRY 'tenantPassport()(address)' --rpc-url $RPC_URL"

echo -e "${BLUE}━━━ RoomFiVault ━━━${NC}\n"
run_test "USDT address" "cast call $VAULT 'usdt()(address)' --rpc-url $RPC_URL"
run_test "Active strategy" "cast call $VAULT 'strategy()(address)' --rpc-url $RPC_URL"
run_test "Owner" "cast call $VAULT 'owner()(address)' --rpc-url $RPC_URL"

echo -e "${BLUE}━━━ USDY Strategy ━━━${NC}\n"
run_test "APY (basis points)" "cast call $USDY_STRATEGY 'getAPY()(uint256)' --rpc-url $RPC_URL"
run_test "Vault reference" "cast call $USDY_STRATEGY 'vault()(address)' --rpc-url $RPC_URL"

echo -e "${BLUE}━━━ Factory ━━━${NC}\n"
run_test "TenantPassport reference" "cast call $FACTORY 'tenantPassport()(address)' --rpc-url $RPC_URL"
run_test "PropertyRegistry reference" "cast call $FACTORY 'propertyRegistry()(address)' --rpc-url $RPC_URL"
run_test "Vault reference" "cast call $FACTORY 'vault()(address)' --rpc-url $RPC_URL"

FAILED=$((TOTAL - PASSED))

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"
echo -e "Total:   $TOTAL"
echo -e "${GREEN}Passed:  $PASSED${NC}"
echo -e "${RED}Failed:  $FAILED${NC}\n"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}\n"
else
    echo -e "${YELLOW}⚠ Some tests had issues (may be timeout related)${NC}\n"
fi
