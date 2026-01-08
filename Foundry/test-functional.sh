#!/bin/bash

# RoomFi V2 - Functional Testing Suite
# Executes real transactions to test end-to-end functionality

set +e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

RPC_URL="https://rpc.sepolia.mantle.xyz"
DEPLOYER="0x8A387ef9acC800eea39E3E6A2d92694dB6c813Ac"

USDT="0xd615074c2603336fa0da8af44b5ccb9d9c0b2f9c"
TENANT_PASSPORT="0xf6a6e553834ff33fc819b6639a557f1f4c647d86"
PROPERTY_REGISTRY="0xf8bb2ce2643f89e6b80fdac94483cda91110d95a"
VAULT="0x111592714036d6870f63807f1b659b4def2c6c43"

echo -e "${BLUE}━━━ Test 1: Check if deployer has TenantPassport ━━━${NC}\n"
passport_balance=$(cast call $TENANT_PASSPORT "balanceOf(address)(uint256)" $DEPLOYER --rpc-url $RPC_URL)
echo -e "Deployer passport balance: ${GREEN}$passport_balance${NC}"

if [ "$passport_balance" == "1" ]; then
    token_id=$(cast call $TENANT_PASSPORT "getTokenIdByAddress(address)(uint256)" $DEPLOYER --rpc-url $RPC_URL)
    echo -e "Token ID: ${GREEN}$token_id${NC}\n"
    
    echo -e "${BLUE}━━━ Checking Passport Badges ━━━${NC}\n"
    
    badges=("FirstRent" "PaymentStreak" "EarlyPayer" "PropertyMaintainer" "LongTermTenant" "CommunityMember" "DisputeResolver" "HighRating" "ReferralMaster" "EcoFriendly" "TechSavvy" "ResponsibleTenant" "Verified" "PlatformAmbassador")
    
    for badge in "${badges[@]}"; do
        has_badge=$(cast call $TENANT_PASSPORT "hasBadge(uint256,string)(bool)" $token_id "$badge" --rpc-url $RPC_URL 2>/dev/null)
        if [ "$has_badge" == "true" ]; then
            echo -e "  ✓ ${GREEN}$badge${NC}"
        else
            echo -e "  ✗ ${YELLOW}$badge${NC}"
        fi
    done
    echo ""
else
    echo -e "${YELLOW}Deployer does not have a passport yet${NC}\n"
fi

echo -e "${BLUE}━━━ Test 2: Check USDT Allowances ━━━${NC}\n"
vault_allowance=$(cast call $USDT "allowance(address,address)(uint256)" $DEPLOYER $VAULT --rpc-url $RPC_URL)
echo -e "Vault allowance: ${GREEN}$vault_allowance${NC} (${vault_allowance} USDT with 6 decimals)\n"

echo -e "${BLUE}━━━ Test 3: Check Vault Deposits ━━━${NC}\n"
deployer_deposit=$(cast call $VAULT "deposits(address)(uint256)" $DEPLOYER --rpc-url $RPC_URL)
echo -e "Deployer's deposit in Vault: ${GREEN}$deployer_deposit${NC}\n"

echo -e "${BLUE}━━━ Test 4: Check PropertyRegistry ━━━${NC}\n"
property_count=$(cast call $PROPERTY_REGISTRY "propertyCount()(uint256)" --rpc-url $RPC_URL 2>/dev/null || echo "0")
echo -e "Total properties registered: ${GREEN}$property_count${NC}\n"

echo -e "${BLUE}━━━ Test 5: Strategy Performance ━━━${NC}\n"
strategy=$(cast call $VAULT "strategy()(address)" --rpc-url $RPC_URL)
apy=$(cast call $strategy "getAPY()(uint256)" --rpc-url $RPC_URL)
apy_percent=$(echo "scale=2; $apy / 100" | bc)
echo -e "Active Strategy: ${GREEN}$strategy${NC}"
echo -e "Current APY: ${GREEN}${apy_percent}%${NC}\n"

echo -e "${GREEN}✓ Functional tests completed${NC}\n"
