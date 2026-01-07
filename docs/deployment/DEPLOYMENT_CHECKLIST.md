# RoomFi V2 - Deployment Checklist para Mantle Sepolia
## Mantle Global Hackathon 2025

**Fecha**: 6 de Enero de 2026
**Red**: Mantle Sepolia Testnet
**Chain ID**: 5003
**Status**: ✅ READY TO DEPLOY

---

## PRE-DEPLOYMENT CHECKLIST

### 1. Configuración de Wallet ✅

- [ ] **Obtener MNT tokens para gas**
  - URL Faucet: https://faucet.sepolia.mantle.xyz
  - Cantidad mínima: 0.5 MNT (recomendado: 1 MNT)
  - Verificar balance: `cast balance <TU_ADDRESS> --rpc-url https://rpc.sepolia.mantle.xyz`

- [ ] **Verificar private key**
  - Tu private key debe estar sin prefijo `0x`
  - NUNCA compartir o commitear en Git
  - Guardar en `.env` seguro

### 2. Configuración de Environment (.env) ✅

Crear archivo `.env` en `/Foundry/` con:

```bash
# Private key SIN 0x prefix
PRIVATE_KEY=tu_private_key_aqui

# Mantle Sepolia RPC (público)
MANTLE_SEPOLIA_RPC=https://rpc.sepolia.mantle.xyz

# API Key de Mantle Explorer (para verificación)
# Obtener en: https://explorer.sepolia.mantle.xyz/myapikey
MANTLE_API_KEY=tu_api_key_aqui
```

**Verificación**:
```bash
cd Foundry
source .env
echo "Private key length: ${#PRIVATE_KEY}"  # Debe ser 64 caracteres
echo "RPC: $MANTLE_SEPOLIA_RPC"
echo "API Key length: ${#MANTLE_API_KEY}"
```

### 3. Verificación de Compilación ✅

- [x] ~~Compilar todos los contratos~~
  ```bash
  forge build --force
  ```
  **Status**: ✅ Compilación exitosa con warnings menores (no críticos)

- [x] ~~Verificar que no hay errores críticos~~
  **Status**: ✅ Solo warnings de variables unused (no afecta deployment)

### 4. Verificación de Red ✅

- [ ] **Conectividad a Mantle Sepolia RPC**
  ```bash
  cast chain-id --rpc-url https://rpc.sepolia.mantle.xyz
  ```
  **Resultado esperado**: `5003`

- [ ] **Verificar block number actual**
  ```bash
  cast block-number --rpc-url https://rpc.sepolia.mantle.xyz
  ```
  **Debe retornar un número > 0**

### 5. Revisión de Contratos V2 ✅

Contratos listos para deployment:

**Core**:
- [x] TenantPassportV2.sol
- [x] PropertyRegistry.sol
- [x] DisputeResolver.sol
- [x] RoomFiVault.sol
- [x] RentalAgreementNFT.sol
- [x] RentalAgreementFactoryNFT.sol

**Strategies**:
- [x] USDYStrategy.sol
- [x] LendleYieldStrategy.sol

**Mocks (Testnet)**:
- [x] MockUSDT.sol
- [x] MockUSDY.sol
- [x] MockDEXRouter.sol
- [x] MockAToken.sol
- [x] MockLendlePool.sol

---

## DEPLOYMENT PROCESS

### PASO 1: Dry Run (Simulación)

**Objetivo**: Verificar que el script funciona SIN gastar gas

```bash
cd Foundry

forge script script/DeployMantleSepolia.s.sol:DeployMantleSepolia \
  --rpc-url $MANTLE_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY \
  -vvvv
```

**Validaciones**:
- [ ] Script completa sin errores
- [ ] Se muestran 5 steps (Mocks → Core → Strategies → Config → Setup)
- [ ] Todas las addresses se generan correctamente
- [ ] No hay errores de "insufficient funds"

**Si hay errores**: DETENER y revisar antes de --broadcast

---

### PASO 2: Deployment Real

**IMPORTANTE**: Este comando **GASTARÁ GAS REAL** y deployará a blockchain.

```bash
cd Foundry

forge script script/DeployMantleSepolia.s.sol:DeployMantleSepolia \
  --rpc-url $MANTLE_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY \
  --broadcast \
  -vvvv
```

**Durante deployment**:
- [ ] Observar que cada contrato se deploya exitosamente
- [ ] Anotar las addresses que se imprimen
- [ ] Verificar que no hay errores de gas

**Tiempo estimado**: 3-5 minutos

---

### PASO 3: Verificación en Explorer

**Después del deployment**, verificar contratos en Mantle Explorer:

```bash
forge script script/DeployMantleSepolia.s.sol:DeployMantleSepolia \
  --rpc-url $MANTLE_SEPOLIA_RPC \
  --verify \
  --etherscan-api-key $MANTLE_API_KEY \
  --resume
```

**Alternativa manual** (si --verify falla):

Para cada contrato, ejecutar:
```bash
forge verify-contract \
  <CONTRACT_ADDRESS> \
  src/V2/<CONTRACT_NAME>.sol:<CONTRACT_NAME> \
  --chain-id 5003 \
  --etherscan-api-key $MANTLE_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address)" "<PARAM>")
```

**Contratos prioritarios para verificar**:
1. TenantPassportV2
2. PropertyRegistry
3. RentalAgreementFactoryNFT
4. RoomFiVault
5. USDYStrategy

---

### PASO 4: Guardar Addresses

El script genera automáticamente: `deployment-addresses.json`

**Verificar que contiene**:
```json
{
  "network": "mantle-sepolia",
  "chainId": 5003,
  "deployer": "0x...",
  "timestamp": 1234567890,
  "mocks": {
    "usdt": "0x...",
    "usdy": "0x...",
    "dexRouter": "0x...",
    "lendlePool": "0x...",
    "aToken": "0x..."
  },
  "core": {
    "tenantPassport": "0x...",
    "propertyRegistry": "0x...",
    "disputeResolver": "0x...",
    "vault": "0x...",
    "rentalAgreementNFT": "0x...",
    "factory": "0x..."
  },
  "strategies": {
    "usdy": "0x...",
    "lendle": "0x...",
    "active": "usdy"
  }
}
```

**Acciones**:
- [ ] Copiar `deployment-addresses.json` a carpeta raíz del proyecto
- [ ] Commitear a Git (SOLO este archivo, NO .env)
- [ ] Compartir con equipo de frontend

---

## POST-DEPLOYMENT VERIFICATION

### 1. Verificar Ownership y Autorizaciones

```bash
# Verificar TenantPassport owner
cast call <TENANT_PASSPORT_ADDRESS> "owner()(address)" --rpc-url $MANTLE_SEPOLIA_RPC

# Verificar que RentalAgreementNFT está autorizado en TenantPassport
cast call <TENANT_PASSPORT_ADDRESS> "authorizedUpdaters(address)(bool)" <RENTAL_AGREEMENT_NFT_ADDRESS> --rpc-url $MANTLE_SEPOLIA_RPC

# Verificar strategy activa en Vault
cast call <VAULT_ADDRESS> "strategy()(address)" --rpc-url $MANTLE_SEPOLIA_RPC
```

**Resultado esperado**: Todas las autorizaciones deben retornar `true` o la address correcta

---

### 2. Verificar Balances de Mocks

```bash
# Balance USDT del deployer (debe tener 10,000 USDT)
cast call <USDT_ADDRESS> "balanceOf(address)(uint256)" <TU_ADDRESS> --rpc-url $MANTLE_SEPOLIA_RPC

# Balance USDT de DEXRouter (debe tener 100,000 USDT)
cast call <USDT_ADDRESS> "balanceOf(address)(uint256)" <DEX_ROUTER_ADDRESS> --rpc-url $MANTLE_SEPOLIA_RPC

# Balance USDT de LendlePool (debe tener 50,000 USDT)
cast call <USDT_ADDRESS> "balanceOf(address)(uint256)" <LENDLE_POOL_ADDRESS> --rpc-url $MANTLE_SEPOLIA_RPC
```

---

### 3. Test de Funcionalidad Básica

#### Test 1: Mint Tenant Passport

```bash
cast send <TENANT_PASSPORT_ADDRESS> "mintForSelf()" \
  --private-key $PRIVATE_KEY \
  --rpc-url $MANTLE_SEPOLIA_RPC
```

**Verificar**:
```bash
cast call <TENANT_PASSPORT_ADDRESS> "balanceOf(address)(uint256)" <TU_ADDRESS> --rpc-url $MANTLE_SEPOLIA_RPC
```
**Resultado esperado**: `1`

#### Test 2: Depositar en Vault (como owner)

```bash
# 1. Aprobar USDT
cast send <USDT_ADDRESS> "approve(address,uint256)" <VAULT_ADDRESS> 100000000 \
  --private-key $PRIVATE_KEY \
  --rpc-url $MANTLE_SEPOLIA_RPC

# 2. Depositar 100 USDT (100 * 1e6)
cast send <VAULT_ADDRESS> "deposit(address,uint256)" <TU_ADDRESS> 100000000 \
  --private-key $PRIVATE_KEY \
  --rpc-url $MANTLE_SEPOLIA_RPC

# 3. Verificar balance en vault
cast call <VAULT_ADDRESS> "deposits(address)(uint256)" <TU_ADDRESS> --rpc-url $MANTLE_SEPOLIA_RPC
```

**Resultado esperado**: Balance debe ser 100000000 (100 USDT con 6 decimals)

#### Test 3: Verificar USDY Strategy funciona

```bash
# Ver APY de USDY Strategy
cast call <USDY_STRATEGY_ADDRESS> "getAPY()(uint256)" --rpc-url $MANTLE_SEPOLIA_RPC

# Ver balance de strategy
cast call <USDY_STRATEGY_ADDRESS> "balanceOf(address)(uint256)" <VAULT_ADDRESS> --rpc-url $MANTLE_SEPOLIA_RPC
```

**Resultado esperado**:
- APY = 429 (4.29%)
- Balance > 0 si ya se deployó

---

## TROUBLESHOOTING COMÚN

### Error: "insufficient funds for gas"

**Solución**:
```bash
# Verificar balance MNT
cast balance <TU_ADDRESS> --rpc-url https://rpc.sepolia.mantle.xyz

# Si balance < 0.1 MNT, obtener más del faucet
```

### Error: "nonce too low"

**Solución**:
```bash
# Limpiar nonce cache
rm -rf ~/.foundry/cache

# Reintentar deployment con --slow flag
forge script ... --broadcast --slow
```

### Error: "DEPLOYMENT_FAILED_MISSING_LIBRARY"

**Solución**:
```bash
# Compilar con --force
forge build --force

# Reintentar deployment
```

### Verification failed

**Solución**:
```bash
# Esperar 1-2 minutos después del deployment

# Reintentar con --resume
forge script script/DeployMantleSepolia.s.sol:DeployMantleSepolia \
  --rpc-url $MANTLE_SEPOLIA_RPC \
  --verify \
  --etherscan-api-key $MANTLE_API_KEY \
  --resume
```

---

## CHECKLIST FINAL

Después del deployment exitoso, verificar:

- [ ] ✅ Todos los contratos deployados (14 total)
- [ ] ✅ `deployment-addresses.json` generado
- [ ] ✅ Contratos verificados en Mantle Explorer
- [ ] ✅ Ownership correcto (deployer es owner)
- [ ] ✅ Autorizaciones configuradas (RentalAgreement autorizado)
- [ ] ✅ Strategy activa (USDY por defecto)
- [ ] ✅ Mocks fondeados (USDT, USDY en pools)
- [ ] ✅ Test básicos pasados (mint passport, deposit vault)
- [ ] ✅ Addresses compartidas con frontend team
- [ ] ✅ Documentación actualizada

---

## NEXT STEPS (POST-DEPLOYMENT)

1. **Actualizar Frontend**:
   - Copiar `deployment-addresses.json` a `src/web3/`
   - Generar ABIs con `forge inspect ... abi`
   - Actualizar `config.ts` con nuevas addresses

2. **Testing E2E**:
   - Crear propiedad en PropertyRegistry
   - Crear RentalAgreement via Factory
   - Pagar depósito (debe ir al Vault)
   - Pagar renta
   - Completar agreement (verificar yield)

3. **Monitoring**:
   - Ver transacciones en: https://explorer.sepolia.mantle.xyz
   - Monitorear balance del Vault
   - Trackear yield generado

4. **Documentation**:
   - Actualizar README.md con deployment info
   - Crear user guide con addresses
   - Documentar flujos principales

---

## COMANDOS RÁPIDOS DE REFERENCIA

```bash
# Ver gas price actual
cast gas-price --rpc-url https://rpc.sepolia.mantle.xyz

# Ver último block
cast block latest --rpc-url https://rpc.sepolia.mantle.xyz

# Ver info de transacción
cast tx <TX_HASH> --rpc-url https://rpc.sepolia.mantle.xyz

# Ver logs de contrato
cast logs --address <CONTRACT_ADDRESS> --rpc-url https://rpc.sepolia.mantle.xyz

# Llamar función view
cast call <CONTRACT> "functionName()(returnType)" --rpc-url https://rpc.sepolia.mantle.xyz

# Enviar transacción
cast send <CONTRACT> "functionName(paramType)" <PARAM_VALUE> \
  --private-key $PRIVATE_KEY \
  --rpc-url https://rpc.sepolia.mantle.xyz
```

---

**¡TODO LISTO PARA DEPLOYMENT!** 🚀

Cuando estés listo, ejecuta:
```bash
cd Foundry
source .env
forge script script/DeployMantleSepolia.s.sol:DeployMantleSepolia \
  --rpc-url $MANTLE_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY \
  --broadcast \
  -vvvv
```

**Buena suerte con el hackathon! 🏆**
