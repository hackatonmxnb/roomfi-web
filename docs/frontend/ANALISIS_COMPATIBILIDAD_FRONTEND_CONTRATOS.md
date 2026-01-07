# Análisis de Compatibilidad: Frontend V1 vs Smart Contracts V2
## RoomFi - Mantle Hackathon 2025

**Fecha**: 6 de Enero de 2026
**Analista**: Auditoría Técnica Web3
**Severidad**: CRÍTICA - Incompatibilidad Total

---

## RESUMEN EJECUTIVO

**Estado de Compatibilidad**: ❌ **INCOMPATIBLE AL 100%**

El frontend actual está construido para la arquitectura V1 en Arbitrum Sepolia. Los smart contracts V2 representan una reescritura completa en Mantle Sepolia con arquitectura diferente, nuevos patrones de diseño y diferentes modelos de negocio. **Se requiere reescritura sustancial del frontend.**

**Nivel de Esfuerzo Estimado**: 40-60 horas de desarrollo frontend
**Riesgo**: ALTO - Sin migración, el frontend no funcionará con V2

---

## 1. INCOMPATIBILIDADES FUNDAMENTALES

### 1.1 Red Blockchain Completamente Diferente

| Aspecto | Frontend V1 Actual | Contratos V2 Nuevos | Impacto |
|---------|-------------------|-------------------|---------|
| **Blockchain** | Arbitrum Sepolia | Mantle Sepolia | CRÍTICO |
| **Chain ID** | 421614 | 5003 | CRÍTICO |
| **RPC URL** | `https://sepolia-rollup.arbitrum.io/rpc` | `https://rpc.sepolia.mantle.xyz` | CRÍTICO |
| **Explorer** | Arbitrum Explorer | Mantle Explorer | MEDIO |
| **Faucet** | Arbitrum Faucet | Mantle Faucet | BAJO |

**Impacto**: El usuario necesitará cambiar de red completamente en su wallet. El frontend debe detectar y forzar la red correcta.

**Código Actual (src/web3/config.ts:6-10)**:
```typescript
export const NETWORK_CONFIG = {
  rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
  chainId: 421614,
  chainName: "Arbitrum Sepolia",
};
```

**Cambio Requerido**:
```typescript
export const NETWORK_CONFIG = {
  rpcUrl: "https://rpc.sepolia.mantle.xyz",
  chainId: 5003,
  chainName: "Mantle Sepolia",
  nativeCurrency: {
    name: "MNT",
    symbol: "MNT",
    decimals: 18
  },
  blockExplorerUrls: ["https://explorer.sepolia.mantle.xyz"]
};
```

---

### 1.2 Token Económico Diferente

| Aspecto | V1 | V2 | Impacto |
|---------|----|----|---------|
| **Token Principal** | MXNB (custom ERC20) | USDT (stablecoin) | CRÍTICO |
| **Decimales** | 18 (dinámico) | 6 (USDT estándar) | CRÍTICO |
| **Propósito** | Token propietario | Stablecoin universal | ALTO |
| **Dirección** | `0x82B9...4247D` (V1) | Mock en testnet / Real en mainnet | CRÍTICO |

**Impacto**: Todas las operaciones con tokens deben cambiar de MXNB a USDT. Los decimales cambian de 18 a 6, afectando cálculos en todo el frontend.

**Código Actual (src/web3/config.ts:13)**:
```typescript
export const MXNBT_ADDRESS = "0x82B9e52b26A2954E113F94Ff26647754d5a4247D";
```

**Cambio Requerido**:
```typescript
// Para testnet (mocks)
export const USDT_ADDRESS = "0x..." // Address del MockUSDT deployado
// Para mainnet
export const USDT_ADDRESS = "0x..." // Address real de USDT en Mantle

export const TOKEN_DECIMALS = 6; // Fijo para USDT
```

**Impacto en Formateo**:
```typescript
// ANTES (V1 con 18 decimales):
ethers.formatUnits(balance, 18) // "1000.123456789012345678"

// AHORA (V2 con 6 decimales):
ethers.formatUnits(balance, 6)  // "1000.123456"
```

---

### 1.3 Arquitectura de Contratos Completamente Rediseñada

#### Contratos V1 (Arbitrum Sepolia) - OBSOLETOS

```
TenantPassport (NFT)
     |
     v
PropertyInterestPool (Core Logic)
     |
     +---> InterestGenerator (Vault/Yield)
     |
     +---> MXNBT (Token)
```

#### Contratos V2 (Mantle Sepolia) - NUEVOS

```
                    TenantPassportV2 (NFT mejorado)
                            |
         +------------------+------------------+
         |                                     |
    PropertyRegistry                   DisputeResolver
    (Validación)                      (Resolución)
         |                                     |
         +------------------+------------------+
                            |
                  RentalAgreementFactoryNFT
                     (Factory Pattern)
                            |
                            v
                  RentalAgreementNFT (ERC721)
                   (Acuerdos tokenizados)
                            |
                            v
                      RoomFiVault
                    (Vault Principal)
                            |
         +------------------+------------------+
         |                                     |
    USDYStrategy                        LendleYieldStrategy
    (4.29% APY)                         (~6% APY)
         |                                     |
         v                                     v
    USDY Token                            Lendle Pool
    (Ondo Finance)                        (Aave Fork)
```

**Diferencias Clave**:

1. **Patrón Factory**: Ahora los rental agreements se crean via Factory, no directamente
2. **NFT Tokenization**: Los acuerdos de renta son NFTs ERC721 tradeables
3. **Vault + Strategies**: Arquitectura modular con estrategias intercambiables
4. **PropertyRegistry**: Validación centralizada de propiedades
5. **DisputeResolver**: Sistema de disputas descentralizado
6. **No hay "PropertyInterestPool"**: El concepto de "pool" cambió completamente

---

## 2. ANÁLISIS DETALLADO POR ARCHIVO FRONTEND

### 2.1 `src/web3/config.ts`

**Estado**: ❌ INCOMPATIBLE TOTAL

**Problemas**:
1. ABIs antiguos no existen en V2
2. Direcciones de contratos apuntan a Arbitrum Sepolia V1
3. Network config incorrecta

**Líneas Problemáticas**:
```typescript
// LÍNEA 1-4: ABIs OBSOLETOS
import MXNB_ABI from './abis/MXNB_ABI.json';
import TENANT_PASSPORT_ABI from './abis/TENANT_PASSPORT_ABI.json';
import PROPERTY_INTEREST_POOL_ABI from './abis/PROPERTY_INTEREST_POOL_ABI.json';
import INTEREST_GENERATOR_ABI from './abis/INTEREST_GENERATOR_ABI.json';

// LÍNEA 6-10: RED INCORRECTA
export const NETWORK_CONFIG = {
  rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
  chainId: 421614, // Debería ser 5003
  chainName: "Arbitrum Sepolia", // Debería ser "Mantle Sepolia"
};

// LÍNEA 13-16: CONTRATOS QUE NO EXISTEN EN V2
export const MXNBT_ADDRESS = "0x82B9..."; // No existe MXNB en V2
export const TENANT_PASSPORT_ADDRESS = "0x674687e0..."; // V1 address
export const PROPERTY_INTEREST_POOL_ADDRESS = "0xeD9018..."; // No existe en V2
export const INTEREST_GENERATOR_ADDRESS = "0xF8F626a..."; // Reemplazado por RoomFiVault
```

**Cambios Requeridos**:
```typescript
// NUEVO: src/web3/config.ts
import USDT_ABI from './abis/USDT_ABI.json';
import TENANT_PASSPORT_V2_ABI from './abis/TenantPassportV2_ABI.json';
import PROPERTY_REGISTRY_ABI from './abis/PropertyRegistry_ABI.json';
import DISPUTE_RESOLVER_ABI from './abis/DisputeResolver_ABI.json';
import RENTAL_AGREEMENT_NFT_ABI from './abis/RentalAgreementNFT_ABI.json';
import RENTAL_AGREEMENT_FACTORY_ABI from './abis/RentalAgreementFactoryNFT_ABI.json';
import ROOMFI_VAULT_ABI from './abis/RoomFiVault_ABI.json';
import USDY_STRATEGY_ABI from './abis/USDYStrategy_ABI.json';
import LENDLE_STRATEGY_ABI from './abis/LendleYieldStrategy_ABI.json';

export const NETWORK_CONFIG = {
  rpcUrl: "https://rpc.sepolia.mantle.xyz",
  chainId: 5003,
  chainName: "Mantle Sepolia",
  nativeCurrency: {
    name: "MNT",
    symbol: "MNT",
    decimals: 18
  },
  blockExplorerUrls: ["https://explorer.sepolia.mantle.xyz"]
};

// Addresses desde deployment-addresses.json (después del deployment)
export const USDT_ADDRESS = "0x..."; // MockUSDT
export const TENANT_PASSPORT_ADDRESS = "0x..."; // TenantPassportV2
export const PROPERTY_REGISTRY_ADDRESS = "0x...";
export const DISPUTE_RESOLVER_ADDRESS = "0x...";
export const RENTAL_AGREEMENT_NFT_ADDRESS = "0x...";
export const RENTAL_AGREEMENT_FACTORY_ADDRESS = "0x...";
export const ROOMFI_VAULT_ADDRESS = "0x...";
export const USDY_STRATEGY_ADDRESS = "0x...";
export const LENDLE_STRATEGY_ADDRESS = "0x...";

export const TOKEN_DECIMALS = 6; // USDT decimals
```

**Esfuerzo**: 2 horas (actualizar config + generar ABIs)

---

### 2.2 `src/App.tsx`

**Estado**: ❌ INCOMPATIBLE - Requiere Refactorización Severa

**Funciones Afectadas**: 18 de 20 funciones (90%)

#### PROBLEMA 1: Lógica de Vault Obsoleta

**Código Actual (líneas 259-360)**:
```typescript
// V1: Usa InterestGenerator directamente
const handleDeposit = async () => {
  const interestContract = new ethers.Contract(
    INTEREST_GENERATOR_ADDRESS,  // ❌ No existe en V2
    INTEREST_GENERATOR_ABI,       // ❌ ABI diferente
    signer
  );
  const tx = await interestContract.deposit(amountToDeposit); // ✅ Método existe pero firma diferente
};
```

**V2 Requerido**:
```typescript
// V2: Usa RoomFiVault
const handleDeposit = async () => {
  // 1. Primero aprobar USDT (no MXNB)
  const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
  const approveTx = await usdtContract.approve(
    ROOMFI_VAULT_ADDRESS,
    amountToDeposit
  );
  await approveTx.wait();

  // 2. Depositar en vault
  const vaultContract = new ethers.Contract(
    ROOMFI_VAULT_ADDRESS,
    ROOMFI_VAULT_ABI,
    signer
  );
  const tx = await vaultContract.deposit(account, amountToDeposit);
  await tx.wait();
};
```

**Cambios Necesarios**:
- Reemplazar `INTEREST_GENERATOR` → `ROOMFI_VAULT`
- Añadir aprobación de USDT antes de depositar
- Actualizar eventos y estados

---

#### PROBLEMA 2: PropertyInterestPool No Existe

**Código Actual (líneas 363-466)**:
```typescript
// V1: PropertyInterestPool maneja todo
const handleAddLandlordFunds = async (propertyId: number) => {
  const poolContract = new ethers.Contract(
    PROPERTY_INTEREST_POOL_ADDRESS, // ❌ Este contrato no existe en V2
    PROPERTY_INTEREST_POOL_ABI,
    signer
  );
  const tx = await poolContract.addLandlordFunds(propertyId, amountToAdd);
};

const handleDepositPoolToVault = async (propertyId: number) => {
  const poolContract = new ethers.Contract(
    PROPERTY_INTEREST_POOL_ADDRESS, // ❌ No existe
    PROPERTY_INTEREST_POOL_ABI,
    signer
  );
  const tx = await poolContract.depositToVault(propertyId); // ❌ Método no existe en V2
};
```

**V2 Requerido**:
```typescript
// V2: No hay concepto de "pool funds"
// Los agreements individuales son NFTs y manejan depósitos directamente

const handlePayDeposit = async (agreementId: number) => {
  // 1. Aprobar USDT
  const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
  const depositAmount = ... // Obtener del agreement
  await usdtContract.approve(RENTAL_AGREEMENT_NFT_ADDRESS, depositAmount);

  // 2. Pagar depósito
  const agreementContract = new ethers.Contract(
    RENTAL_AGREEMENT_NFT_ADDRESS,
    RENTAL_AGREEMENT_NFT_ABI,
    signer
  );
  const tx = await agreementContract.payDeposit(agreementId);
  await tx.wait();
};

// Los fondos van AUTOMÁTICAMENTE a RoomFiVault
// NO hay método manual "depositToVault"
```

**Cambios Conceptuales**:
- **V1**: PropertyInterestPool era el hub central donde los inquilinos "expresaban interés" y "fondeaban renta"
- **V2**: RentalAgreementNFT son contratos individuales creados por Factory. Cada agreement maneja su propio ciclo de vida
- **V1**: Pool → Vault era manual
- **V2**: Vault es automático, integrado en el flujo de pagos

---

#### PROBLEMA 3: TenantPassport - API Diferente

**Código Actual (líneas 592-664)**:
```typescript
// V1: getTenantInfo retorna struct
const getOrCreateTenantPassport = async (userAddress: string) => {
  const contract = new ethers.Contract(
    TENANT_PASSPORT_ADDRESS,
    TENANT_PASSPORT_ABI,
    provider
  );

  const balance = await contract.balanceOf(userAddress); // ✅ Igual

  if (balance.toString() === '0') {
    const tx = await contract.mintForSelf(); // ❌ Método diferente en V2
    await tx.wait();
  }

  const tokenId = await contract.tokenOfOwnerByIndex(userAddress, 0); // ✅ Igual
  const info = await contract.getTenantInfo(tokenId); // ⚠️ Retorno diferente

  // V1: Retorna struct con 5 campos
  return {
    reputation: Number(info.reputation),
    paymentsMade: Number(info.paymentsMade),
    paymentsMissed: Number(info.paymentsMissed),
    outstandingBalance: Number(info.outstandingBalance),
    propertiesOwned: Number(info.propertiesOwned)
  };
};
```

**V2 Requerido**:
```typescript
// V2: mintPassport() en lugar de mintForSelf()
const getOrCreateTenantPassport = async (userAddress: string) => {
  const contract = new ethers.Contract(
    TENANT_PASSPORT_ADDRESS,
    TENANT_PASSPORT_V2_ABI,
    provider
  );

  const balance = await contract.balanceOf(userAddress);

  if (balance.toString() === '0') {
    const tx = await contract.mintPassport(); // ✅ V2 usa mintPassport()
    await tx.wait();
  }

  const tokenId = await contract.tokenOfOwnerByIndex(userAddress, 0);

  // V2: getPassportData retorna tuple, no struct
  const data = await contract.getPassportData(tokenId);

  return {
    owner: data[0],              // address
    score: Number(data[1]),      // uint256 (0-1000)
    paymentsOnTime: Number(data[2]),
    latePayments: Number(data[3]),
    missedPayments: Number(data[4]),
    totalAgreements: Number(data[5]),
    activeAgreements: Number(data[6]),
    isActive: data[7],           // bool
    lastUpdate: Number(data[8])  // uint256
  };
};
```

**Diferencias**:
1. **Método mint**: `mintForSelf()` → `mintPassport()`
2. **Getter**: `getTenantInfo()` → `getPassportData()`
3. **Estructura de datos**: V1 tenía 5 campos, V2 tiene 9 campos con información más detallada
4. **Reputación**: V1 usaba porcentaje (0-100), V2 usa score (0-1000)

---

#### PROBLEMA 4: Crear "Pool" vs Crear "Rental Agreement"

**Código Actual** referencia `CreatePoolPage.tsx` (líneas 666-685):
```typescript
// V1: Usuario crea un "PropertyInterestPool"
const handleCreatePoolClick = async () => {
  // Verifica Tenant Passport
  const passportContract = new ethers.Contract(
    TENANT_PASSPORT_ADDRESS,
    TENANT_PASSPORT_ABI,
    provider
  );
  const balance = await passportContract.balanceOf(account);

  if (balance.toString() === '0') {
    setNotification({
      message: 'Necesitas un Tenant Passport para crear un pool.',
      severity: 'info'
    });
  } else {
    navigate('/create-pool'); // ❌ Página obsoleta
  }
};
```

**V2 Requerido**:
```typescript
// V2: Landlord registra propiedad + inquilinos crean agreements
const handleCreateProperty = async () => {
  // 1. Verificar que landlord tenga Tenant Passport
  const passportContract = new ethers.Contract(
    TENANT_PASSPORT_ADDRESS,
    TENANT_PASSPORT_V2_ABI,
    provider
  );
  const balance = await passportContract.balanceOf(account);

  if (balance.toString() === '0') {
    // Crear passport
    const tx = await passportContract.mintPassport();
    await tx.wait();
  }

  // 2. Registrar propiedad en PropertyRegistry
  navigate('/register-property'); // ✅ Nueva página
};

// Nuevo flujo para inquilinos
const handleCreateRentalAgreement = async (propertyId: number) => {
  // 1. Verificar propiedad existe
  const registryContract = new ethers.Contract(
    PROPERTY_REGISTRY_ADDRESS,
    PROPERTY_REGISTRY_ABI,
    provider
  );
  const property = await registryContract.getProperty(propertyId);

  // 2. Crear agreement via Factory
  const factoryContract = new ethers.Contract(
    RENTAL_AGREEMENT_FACTORY_ADDRESS,
    RENTAL_AGREEMENT_FACTORY_ABI,
    signer
  );

  const tx = await factoryContract.createAgreement(
    property.landlord,
    account,            // tenant
    propertyId,
    monthlyRent,
    depositAmount,
    startDate,
    duration,
    property.terms      // Términos de la propiedad
  );
  const receipt = await tx.wait();

  // Obtener agreementId del evento
  const event = receipt.logs.find(log =>
    log.topics[0] === factoryContract.interface.getEvent("AgreementCreated").topicHash
  );
  const agreementId = event.args.agreementId;
};
```

**Cambios Conceptuales**:
- **V1**: Landlord crea "PropertyInterestPool" donde inquilinos "expresan interés"
- **V2**:
  1. Landlord registra propiedad en `PropertyRegistry`
  2. Inquilino crea `RentalAgreement` via `Factory` para esa propiedad
  3. Agreement es un NFT ERC721 que representa el contrato de renta

---

#### PROBLEMA 5: Ver "Mis Propiedades" - Estructura Diferente

**Código Actual (líneas 536-590)**:
```typescript
// V1: Obtiene properties del PropertyInterestPool
const handleViewMyProperties = async () => {
  const contract = new ethers.Contract(
    PROPERTY_INTEREST_POOL_ADDRESS, // ❌ No existe
    PROPERTY_INTEREST_POOL_ABI,
    provider
  );

  const propertyIds = await contract.getPropertiesByLandlord(account);

  const properties = [];
  for (const id of propertyIds) {
    const p = await contract.getPropertyInfo(id); // ❌ Método no existe en V2
    properties.push({
      id: id,
      name: p[0],
      description: p[1],
      landlord: p[2],
      totalRentAmount: p[3],
      seriousnessDeposit: p[4],
      requiredTenantCount: p[5],
      amountPooledForRent: p[6],
      amountInVault: p[7],
      interestedTenants: p[8],
      state: Number(p[9]),
      paymentDayStart: p[10],
      paymentDayEnd: p[11],
    });
  }

  setMyProperties(properties);
};
```

**V2 Requerido**:
```typescript
// V2: Obtiene properties del PropertyRegistry + agreements del Factory
const handleViewMyProperties = async () => {
  // 1. Obtener propiedades registradas
  const registryContract = new ethers.Contract(
    PROPERTY_REGISTRY_ADDRESS,
    PROPERTY_REGISTRY_ABI,
    provider
  );

  const propertyIds = await registryContract.getLandlordProperties(account);

  const properties = [];
  for (const id of propertyIds) {
    const property = await registryContract.getProperty(id);

    // 2. Obtener agreements para esta propiedad
    const factoryContract = new ethers.Contract(
      RENTAL_AGREEMENT_FACTORY_ADDRESS,
      RENTAL_AGREEMENT_FACTORY_ABI,
      provider
    );

    const agreementIds = await factoryContract.getPropertyAgreements(id);
    const activeCount = await factoryContract.getActiveAgreementsCount();

    properties.push({
      id: id,
      name: property.name,
      propertyType: property.propertyType,
      location: property.location,
      landlord: property.landlord,
      bedroomCount: Number(property.bedroomCount),
      bathroomCount: Number(property.bathroomCount),
      squareMeters: Number(property.squareMeters),
      amenities: property.amenities,
      isVerified: property.isVerified,
      isActive: property.isActive,
      agreementCount: agreementIds.length,
      activeAgreements: Number(activeCount)
    });
  }

  setMyProperties(properties);
};

// Nuevo: Ver agreements específicos
const handleViewMyAgreements = async () => {
  const factoryContract = new ethers.Contract(
    RENTAL_AGREEMENT_FACTORY_ADDRESS,
    RENTAL_AGREEMENT_FACTORY_ABI,
    provider
  );

  // Para landlord
  const landlordAgreements = await factoryContract.getLandlordAgreements(account);

  // Para tenant
  const tenantAgreements = await factoryContract.getTenantAgreements(account);

  const agreements = [];
  for (const id of [...landlordAgreements, ...tenantAgreements]) {
    const agreementContract = new ethers.Contract(
      RENTAL_AGREEMENT_NFT_ADDRESS,
      RENTAL_AGREEMENT_NFT_ABI,
      provider
    );

    const agreement = await agreementContract.getAgreement(id);

    agreements.push({
      id: id,
      landlord: agreement[0],
      tenant: agreement[1],
      propertyId: Number(agreement[2]),
      monthlyRent: agreement[3],
      depositAmount: agreement[4],
      startDate: Number(agreement[5]),
      endDate: Number(agreement[6]),
      paymentDay: Number(agreement[7]),
      status: Number(agreement[8]),
      paidMonths: Number(agreement[9]),
      missedPayments: Number(agreement[10]),
      totalPaid: agreement[11],
      depositPaid: agreement[12],
      isActive: agreement[13],
      createdAt: Number(agreement[14])
    });
  }

  setMyAgreements(agreements);
};
```

**Cambios**:
- V1 tenía un modelo de "pool" centralizado
- V2 separa:
  - `PropertyRegistry`: Propiedades físicas
  - `RentalAgreementNFT`: Contratos individuales (NFTs)
  - `RentalAgreementFactory`: Gestión de agreements

---

### 2.3 `src/CreatePoolPage.tsx`

**Estado**: ❌ OBSOLETO COMPLETO - Requiere Reemplazo Total

**Código Actual**:
```typescript
// V1: Crea PropertyInterestPool
const handleCreatePool = async () => {
  const poolContract = new ethers.Contract(
    PROPERTY_INTEREST_POOL_ADDRESS, // ❌ No existe
    PROPERTY_INTEREST_POOL_ABI,
    signer
  );

  const tx = await poolContract.createPropertyPool(
    propertyName,
    description,
    totalRentWei,
    seriousnessDepositWei,
    tenantCount,
    paymentDayStart,
    paymentDayEnd
  );
};
```

**V2 Requerido - Nueva Página: `RegisterPropertyPage.tsx`**:
```typescript
// V2: Registrar propiedad en PropertyRegistry
const handleRegisterProperty = async () => {
  const registryContract = new ethers.Contract(
    PROPERTY_REGISTRY_ADDRESS,
    PROPERTY_REGISTRY_ABI,
    signer
  );

  const tx = await registryContract.registerProperty(
    propertyName,
    propertyType,      // 0=APARTMENT, 1=HOUSE, 2=ROOM, 3=STUDIO
    location,          // String con dirección
    bedroomCount,
    bathroomCount,
    squareMeters,
    amenities,         // Array de strings
    terms              // Términos y condiciones
  );

  const receipt = await tx.wait();

  // Obtener propertyId del evento
  const event = receipt.logs.find(log =>
    log.topics[0] === registryContract.interface.getEvent("PropertyRegistered").topicHash
  );
  const propertyId = event.args.propertyId;

  // Ahora el landlord puede publicar en el marketplace con este propertyId
};
```

**Nueva Página: `CreateAgreementPage.tsx`**:
```typescript
// Inquilino crea agreement para una propiedad
const handleCreateAgreement = async () => {
  // 1. Verificar tenant tiene passport
  const passportContract = new ethers.Contract(
    TENANT_PASSPORT_ADDRESS,
    TENANT_PASSPORT_V2_ABI,
    provider
  );
  const balance = await passportContract.balanceOf(account);

  if (balance.toString() === '0') {
    // Crear passport primero
    const mintTx = await passportContract.connect(signer).mintPassport();
    await mintTx.wait();
  }

  // 2. Crear agreement via Factory
  const factoryContract = new ethers.Contract(
    RENTAL_AGREEMENT_FACTORY_ADDRESS,
    RENTAL_AGREEMENT_FACTORY_ABI,
    signer
  );

  const tx = await factoryContract.createAgreement(
    landlordAddress,   // Del PropertyRegistry
    account,           // Tenant (msg.sender)
    propertyId,        // ID de PropertyRegistry
    monthlyRent,       // En USDT (6 decimals)
    depositAmount,     // En USDT (6 decimals)
    startDate,         // Unix timestamp
    durationMonths,    // Número de meses
    termsHash          // Hash IPFS de términos
  );

  const receipt = await tx.wait();
  const agreementId = receipt.logs[0].args.agreementId;

  // 3. Navegar a pagar depósito
  navigate(`/agreement/${agreementId}/pay-deposit`);
};
```

**Esfuerzo**: 8-12 horas (crear 2 páginas nuevas + lógica)

---

### 2.4 `src/DashboardPage.tsx`

**Estado**: ⚠️ PARCIALMENTE COMPATIBLE - Requiere Actualización

**Problemas**:
1. Los datos de "rendimiento" vienen del `InterestGenerator` (V1), que no existe en V2
2. Necesita integrar `RoomFiVault` y mostrar yields de USDY/Lendle strategies
3. La gestión de propiedades necesita conectarse a `PropertyRegistry` + `Factory`

**Código Actual (líneas 61-86)**:
```typescript
// V1: Muestra datos mock
<Typography variant="h4" color="primary">19%</Typography> // Rendimiento
<Typography variant="h4" color="primary">$17,119.02 MXNB</Typography> // Intereses
<Typography variant="h4" color="primary">$465.69 MXNB</Typography> // Efectivo
<Typography variant="h4" color="primary">$14,847.29 MXNB</Typography> // Valor cuenta
```

**V2 Requerido**:
```typescript
// Fetch real data de RoomFiVault
const fetchDashboardData = async () => {
  const vaultContract = new ethers.Contract(
    ROOMFI_VAULT_ADDRESS,
    ROOMFI_VAULT_ABI,
    provider
  );

  // 1. Balance del usuario en vault
  const userBalance = await vaultContract.balanceOf(account);
  const balance = Number(ethers.formatUnits(userBalance, 6)); // USDT 6 decimals

  // 2. Yield acumulado
  const userYield = await vaultContract.calculateUserYield(account);
  const yieldEarned = Number(ethers.formatUnits(userYield, 6));

  // 3. APY de la estrategia activa
  const strategy = await vaultContract.strategy();
  const strategyContract = new ethers.Contract(
    strategy,
    USDY_STRATEGY_ABI, // o LENDLE_STRATEGY_ABI
    provider
  );
  const apy = await strategyContract.getAPY();
  const apyPercent = Number(apy) / 100; // APY en %

  // 4. Total en cuenta (balance + yield)
  const totalValue = balance + yieldEarned;

  setDashboardData({
    apy: apyPercent,
    yieldEarned: yieldEarned,
    availableBalance: balance,
    totalValue: totalValue
  });
};

// Mostrar
<Typography variant="h4" color="primary">{dashboardData.apy}%</Typography>
<Typography variant="h4" color="primary">${dashboardData.yieldEarned.toFixed(2)} USDT</Typography>
<Typography variant="h4" color="primary">${dashboardData.availableBalance.toFixed(2)} USDT</Typography>
<Typography variant="h4" color="primary">${dashboardData.totalValue.toFixed(2)} USDT</Typography>
```

**Esfuerzo**: 4-6 horas

---

### 2.5 ABIs Faltantes

**Estado**: ❌ TODOS LOS ABIs SON INCOMPATIBLES

Los ABIs actuales en `src/web3/abis/` son de V1:
- `MXNB_ABI.json` → No existe MXNB en V2
- `TENANT_PASSPORT_ABI.json` → Reemplazar con TenantPassportV2
- `PROPERTY_INTEREST_POOL_ABI.json` → No existe en V2
- `INTEREST_GENERATOR_ABI.json` → Reemplazar con RoomFiVault
- `RENTAL_AGREEMENT_ABI.json` → Reemplazar con RentalAgreementNFT

**ABIs Necesarios para V2**:

Después del deployment, ejecutar:
```bash
cd Foundry

# Generar ABIs de V2
forge inspect src/V2/TenantPassportV2.sol:TenantPassportV2 abi > ../src/web3/abis/TenantPassportV2_ABI.json
forge inspect src/V2/PropertyRegistry.sol:PropertyRegistry abi > ../src/web3/abis/PropertyRegistry_ABI.json
forge inspect src/V2/DisputeResolver.sol:DisputeResolver abi > ../src/web3/abis/DisputeResolver_ABI.json
forge inspect src/V2/RentalAgreementNFT.sol:RentalAgreementNFT abi > ../src/web3/abis/RentalAgreementNFT_ABI.json
forge inspect src/V2/RentalAgreementFactoryNFT.sol:RentalAgreementFactoryNFT abi > ../src/web3/abis/RentalAgreementFactoryNFT_ABI.json
forge inspect src/V2/RoomFiVault.sol:RoomFiVault abi > ../src/web3/abis/RoomFiVault_ABI.json
forge inspect src/V2/strategies/USDYStrategy.sol:USDYStrategy abi > ../src/web3/abis/USDYStrategy_ABI.json
forge inspect src/V2/strategies/LendleYieldStrategy.sol:LendleYieldStrategy abi > ../src/web3/abis/LendleYieldStrategy_ABI.json

# USDT ABI estándar (puede ser minimal)
cat > ../src/web3/abis/USDT_ABI.json << 'EOF'
[
  {
    "constant": true,
    "inputs": [{"name": "who", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {"name": "spender", "type": "address"},
      {"name": "value", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"name": "", "type": "bool"}],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {"name": "to", "type": "address"},
      {"name": "value", "type": "uint256"}
    ],
    "name": "transfer",
    "outputs": [{"name": "", "type": "bool"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{"name": "", "type": "uint8"}],
    "type": "function"
  }
]
EOF
```

**Esfuerzo**: 1 hora (automatizado)

---

## 3. NUEVAS FUNCIONALIDADES REQUERIDAS

### 3.1 Gestión de Rental Agreements (NFTs)

**No existe en V1** - Completamente nuevo

Los rental agreements ahora son NFTs ERC721. El frontend debe:

1. **Mostrar agreements como NFTs**:
```typescript
const fetchMyAgreements = async () => {
  const agreementContract = new ethers.Contract(
    RENTAL_AGREEMENT_NFT_ADDRESS,
    RENTAL_AGREEMENT_NFT_ABI,
    provider
  );

  // Obtener balance de NFTs
  const balance = await agreementContract.balanceOf(account);

  const agreements = [];
  for (let i = 0; i < balance; i++) {
    const tokenId = await agreementContract.tokenOfOwnerByIndex(account, i);
    const agreement = await agreementContract.getAgreement(tokenId);

    // Obtener metadata del NFT
    const tokenURI = await agreementContract.tokenURI(tokenId);
    // Fetch metadata from IPFS/server

    agreements.push({
      nftId: tokenId,
      ...agreement
    });
  }

  return agreements;
};
```

2. **Transferir agreements (opcional)**:
```typescript
// Los agreements son transferibles (NFTs ERC721)
const transferAgreement = async (agreementId: number, newOwner: string) => {
  const agreementContract = new ethers.Contract(
    RENTAL_AGREEMENT_NFT_ADDRESS,
    RENTAL_AGREEMENT_NFT_ABI,
    signer
  );

  const tx = await agreementContract.transferFrom(account, newOwner, agreementId);
  await tx.wait();
};
```

**Componentes Nuevos**:
- `AgreementNFTCard.tsx`: Mostrar agreement como NFT card
- `AgreementMarketplace.tsx`: Marketplace de agreements (secundario)
- `AgreementDetails.tsx`: Detalles de un agreement específico

**Esfuerzo**: 8-10 horas

---

### 3.2 Sistema de Disputas

**No existe en V1** - Completamente nuevo

El frontend debe integrar `DisputeResolver`:

```typescript
// Levantar disputa
const raiseDispute = async (agreementId: number, reason: string) => {
  const disputeContract = new ethers.Contract(
    DISPUTE_RESOLVER_ADDRESS,
    DISPUTE_RESOLVER_ABI,
    signer
  );

  // Obtener fee de disputa
  const disputeFee = await disputeContract.disputeFee(); // 10 USDT

  // Aprobar USDT para pagar fee
  const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
  await usdtContract.approve(DISPUTE_RESOLVER_ADDRESS, disputeFee);

  // Levantar disputa desde RentalAgreementNFT
  const agreementContract = new ethers.Contract(
    RENTAL_AGREEMENT_NFT_ADDRESS,
    RENTAL_AGREEMENT_NFT_ABI,
    signer
  );

  const tx = await agreementContract.raiseDispute(agreementId, reason, {
    value: disputeFee // Pagar fee
  });
  await tx.wait();
};

// Ver disputa
const viewDispute = async (disputeId: number) => {
  const disputeContract = new ethers.Contract(
    DISPUTE_RESOLVER_ADDRESS,
    DISPUTE_RESOLVER_ABI,
    provider
  );

  const dispute = await disputeContract.disputes(disputeId);

  return {
    agreementId: Number(dispute.agreementId),
    plaintiff: dispute.plaintiff,
    defendant: dispute.defendant,
    reason: dispute.reason,
    status: Number(dispute.status), // 0=PENDING, 1=RESOLVED, 2=CANCELLED
    arbitrator: dispute.arbitrator,
    ruling: Number(dispute.ruling),
    createdAt: Number(dispute.createdAt),
    resolvedAt: Number(dispute.resolvedAt)
  };
};

// Ser árbitro
const becomeArbitrator = async () => {
  const disputeContract = new ethers.Contract(
    DISPUTE_RESOLVER_ADDRESS,
    DISPUTE_RESOLVER_ABI,
    signer
  );

  const stake = await disputeContract.arbitratorStake(); // 50 USDT

  // Aprobar USDT
  const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
  await usdtContract.approve(DISPUTE_RESOLVER_ADDRESS, stake);

  const tx = await disputeContract.registerArbitrator();
  await tx.wait();
};

// Resolver disputa (como árbitro)
const resolveDispute = async (disputeId: number, ruling: number) => {
  // ruling: 0=PLAINTIFF_WINS, 1=DEFENDANT_WINS, 2=SPLIT
  const disputeContract = new ethers.Contract(
    DISPUTE_RESOLVER_ADDRESS,
    DISPUTE_RESOLVER_ABI,
    signer
  );

  const tx = await disputeContract.resolveDispute(disputeId, ruling);
  await tx.wait();
};
```

**Componentes Nuevos**:
- `DisputePanel.tsx`: Panel de disputas activas
- `RaiseDisputeModal.tsx`: Modal para levantar disputa
- `ArbitratorDashboard.tsx`: Dashboard para árbitros
- `DisputeDetails.tsx`: Detalles de disputa individual

**Esfuerzo**: 10-12 horas

---

### 3.3 Selector de Yield Strategy

**No existe en V1** - Completamente nuevo

El frontend debe permitir ver y cambiar estrategias:

```typescript
// Ver estrategia activa
const getActiveStrategy = async () => {
  const vaultContract = new ethers.Contract(
    ROOMFI_VAULT_ADDRESS,
    ROOMFI_VAULT_ABI,
    provider
  );

  const strategyAddress = await vaultContract.strategy();

  // Determinar qué estrategia es
  let strategyName = '';
  let strategyAPY = 0;

  if (strategyAddress === USDY_STRATEGY_ADDRESS) {
    strategyName = 'USDY Strategy';
    const strategyContract = new ethers.Contract(
      USDY_STRATEGY_ADDRESS,
      USDY_STRATEGY_ABI,
      provider
    );
    strategyAPY = Number(await strategyContract.getAPY()) / 100; // 4.29%
  } else if (strategyAddress === LENDLE_STRATEGY_ADDRESS) {
    strategyName = 'Lendle Strategy';
    const strategyContract = new ethers.Contract(
      LENDLE_STRATEGY_ADDRESS,
      LENDLE_STRATEGY_ABI,
      provider
    );
    strategyAPY = Number(await strategyContract.getAPY()) / 100; // ~6%
  }

  return { strategyName, strategyAPY, strategyAddress };
};

// Cambiar estrategia (solo owner del vault puede hacerlo)
const changeStrategy = async (newStrategyAddress: string) => {
  const vaultContract = new ethers.Contract(
    ROOMFI_VAULT_ADDRESS,
    ROOMFI_VAULT_ABI,
    signer
  );

  const tx = await vaultContract.updateStrategy(newStrategyAddress);
  await tx.wait();
};

// Ver deployment info de strategy
const getStrategyDeployment = async () => {
  const strategy = await getActiveStrategy();

  const strategyContract = new ethers.Contract(
    strategy.strategyAddress,
    strategy.strategyName === 'USDY Strategy' ? USDY_STRATEGY_ABI : LENDLE_STRATEGY_ABI,
    provider
  );

  const deploymentInfo = await strategyContract.getDeploymentInfo();

  return {
    total: Number(ethers.formatUnits(deploymentInfo.total, 6)),
    lending: Number(ethers.formatUnits(deploymentInfo.lending, 6)),
    dex: Number(ethers.formatUnits(deploymentInfo.dex, 6)),
    lendingPercent: Number(deploymentInfo.lendingPercent),
    dexPercent: Number(deploymentInfo.dexPercent)
  };
};
```

**Componentes Nuevos**:
- `StrategySelector.tsx`: Selector visual de estrategias
- `StrategyStats.tsx`: Estadísticas de estrategia activa
- `YieldComparison.tsx`: Comparación entre USDY y Lendle

**Esfuerzo**: 6-8 horas

---

### 3.4 Property Verification

**No existe en V1** - Completamente nuevo

PropertyRegistry tiene sistema de verificación:

```typescript
// Verificar propiedad (solo owner del registry)
const verifyProperty = async (propertyId: number) => {
  const registryContract = new ethers.Contract(
    PROPERTY_REGISTRY_ADDRESS,
    PROPERTY_REGISTRY_ABI,
    signer
  );

  const tx = await registryContract.verifyProperty(propertyId);
  await tx.wait();
};

// Solicitar verificación
const requestVerification = async (propertyId: number, documentsHash: string) => {
  // documentsHash: IPFS hash con documentos de propiedad
  // Esta función podría ser off-chain (backend) o on-chain
  // Por ahora, off-chain es más económico

  await fetch('/api/verification/request', {
    method: 'POST',
    body: JSON.stringify({
      propertyId,
      documentsHash,
      owner: account
    })
  });
};

// Ver propiedades verificadas
const getVerifiedProperties = async () => {
  const registryContract = new ethers.Contract(
    PROPERTY_REGISTRY_ADDRESS,
    PROPERTY_REGISTRY_ABI,
    provider
  );

  const count = await registryContract.propertyCount();
  const verified = [];

  for (let i = 1; i <= count; i++) {
    const property = await registryContract.getProperty(i);
    if (property.isVerified) {
      verified.push({
        id: i,
        ...property
      });
    }
  }

  return verified;
};
```

**Componentes Nuevos**:
- `VerificationBadge.tsx`: Badge de verificación
- `VerificationRequestModal.tsx`: Modal para solicitar verificación
- `VerificationDashboard.tsx`: Dashboard para admin

**Esfuerzo**: 4-6 horas

---

## 4. RESUMEN DE CAMBIOS REQUERIDOS

### 4.1 Archivos a Modificar

| Archivo | Estado | Esfuerzo | Prioridad |
|---------|--------|----------|-----------|
| `src/web3/config.ts` | ❌ Reescribir | 2h | CRÍTICA |
| `src/App.tsx` | ❌ Refactorizar 90% | 12h | CRÍTICA |
| `src/CreatePoolPage.tsx` | ❌ Eliminar/Reemplazar | 8h | CRÍTICA |
| `src/DashboardPage.tsx` | ⚠️ Actualizar | 6h | ALTA |
| `src/UserContext.tsx` | ✅ OK | 0h | - |
| `src/web3/abis/*` | ❌ Reemplazar todos | 1h | CRÍTICA |

**Total en modificaciones**: ~29 horas

---

### 4.2 Archivos Nuevos a Crear

| Archivo | Propósito | Esfuerzo | Prioridad |
|---------|-----------|----------|-----------|
| `RegisterPropertyPage.tsx` | Registrar propiedades en PropertyRegistry | 6h | CRÍTICA |
| `CreateAgreementPage.tsx` | Crear rental agreements via Factory | 8h | CRÍTICA |
| `AgreementNFTCard.tsx` | Card para mostrar agreement como NFT | 4h | ALTA |
| `AgreementDetails.tsx` | Detalles de agreement individual | 4h | ALTA |
| `PayDepositPage.tsx` | Pagar depósito de agreement | 3h | CRÍTICA |
| `PayRentPage.tsx` | Pagar renta mensual | 3h | CRÍTICA |
| `DisputePanel.tsx` | Panel de disputas | 5h | MEDIA |
| `RaiseDisputeModal.tsx` | Modal para levantar disputa | 3h | MEDIA |
| `ArbitratorDashboard.tsx` | Dashboard para árbitros | 6h | BAJA |
| `StrategySelector.tsx` | Selector de yield strategies | 4h | MEDIA |
| `StrategyStats.tsx` | Estadísticas de strategy | 3h | MEDIA |
| `VerificationBadge.tsx` | Badge de verificación de propiedad | 2h | BAJA |

**Total en nuevos componentes**: ~51 horas

---

### 4.3 Funciones JavaScript/TypeScript Nuevas

| Función | Descripción | Archivo | Esfuerzo |
|---------|-------------|---------|----------|
| `registerProperty()` | Registrar propiedad en PropertyRegistry | `RegisterPropertyPage.tsx` | 2h |
| `createAgreement()` | Crear agreement via Factory | `CreateAgreementPage.tsx` | 3h |
| `payDeposit()` | Pagar depósito de agreement | `PayDepositPage.tsx` | 2h |
| `payRent()` | Pagar renta mensual | `PayRentPage.tsx` | 2h |
| `completeAgreement()` | Completar agreement | `AgreementDetails.tsx` | 1h |
| `terminateAgreement()` | Terminar agreement anticipadamente | `AgreementDetails.tsx` | 1h |
| `raiseDispute()` | Levantar disputa | `RaiseDisputeModal.tsx` | 2h |
| `resolveDispute()` | Resolver disputa (árbitro) | `ArbitratorDashboard.tsx` | 2h |
| `getActiveStrategy()` | Obtener estrategia activa | `StrategySelector.tsx` | 1h |
| `harvestYield()` | Cosechar yield de vault | `DashboardPage.tsx` | 1h |
| `verifyProperty()` | Verificar propiedad | Admin component | 1h |

**Total**: ~18 horas

---

## 5. PLAN DE MIGRACIÓN RECOMENDADO

### Fase 1: Configuración Base (Día 1 - 4 horas)

**Prioridad**: CRÍTICA

1. ✅ Actualizar `src/web3/config.ts`:
   - Cambiar network a Mantle Sepolia
   - Agregar addresses de V2 (desde `deployment-addresses.json`)
   - Eliminar referencias a V1

2. ✅ Generar ABIs de V2:
   - Ejecutar comandos `forge inspect` para todos los contratos
   - Colocar en `src/web3/abis/`
   - Eliminar ABIs V1

3. ✅ Actualizar dependencias:
   - Verificar ethers.js v6 compatible
   - Actualizar `@types` si necesario

**Resultado**: Frontend puede conectarse a Mantle Sepolia y reconoce contratos V2

---

### Fase 2: Core Functionality (Día 2-3 - 16 horas)

**Prioridad**: CRÍTICA

1. ✅ Refactorizar `App.tsx`:
   - Reemplazar `InterestGenerator` → `RoomFiVault`
   - Actualizar `TenantPassport` → `TenantPassportV2`
   - Eliminar lógica de `PropertyInterestPool`

2. ✅ Crear `RegisterPropertyPage.tsx`:
   - Form para registrar propiedad
   - Integración con `PropertyRegistry`
   - Upload a IPFS para documentos

3. ✅ Crear `CreateAgreementPage.tsx`:
   - Form para crear rental agreement
   - Integración con `RentalAgreementFactory`
   - Flujo completo tenant

4. ✅ Crear componentes de pago:
   - `PayDepositPage.tsx`
   - `PayRentPage.tsx`
   - Lógica de aprobación USDT + pago

**Resultado**: Flujo completo de landlord registrar propiedad → tenant crear agreement → pagar

---

### Fase 3: Agreement Management (Día 4-5 - 12 horas)

**Prioridad**: ALTA

1. ✅ `AgreementNFTCard.tsx`:
   - Mostrar agreements como NFT cards
   - Metadata, status, botones de acción

2. ✅ `AgreementDetails.tsx`:
   - Página de detalles de agreement
   - Historial de pagos
   - Acciones (pagar, terminar, levantar disputa)

3. ✅ Actualizar `DashboardPage.tsx`:
   - Mostrar agreements activos
   - Estadísticas de vault
   - Yield earnings

**Resultado**: Usuarios pueden ver y gestionar sus agreements como NFTs

---

### Fase 4: Yield Strategies (Día 6 - 8 horas)

**Prioridad**: MEDIA

1. ✅ `StrategySelector.tsx`:
   - Mostrar estrategia activa (USDY o Lendle)
   - APY actual
   - Deployment breakdown

2. ✅ `StrategyStats.tsx`:
   - Gráficos de performance
   - Historical APY
   - Total deployed

3. ✅ Integración con vault:
   - Harvest yield button
   - Auto-compound toggle (si implementado)

**Resultado**: Usuarios ven yield strategies y estadísticas en tiempo real

---

### Fase 5: Dispute System (Día 7 - 10 horas)

**Prioridad**: MEDIA

1. ✅ `DisputePanel.tsx`:
   - Lista de disputas activas
   - Filter por status

2. ✅ `RaiseDisputeModal.tsx`:
   - Form para levantar disputa
   - Pagar fee de 10 USDT

3. ✅ `ArbitratorDashboard.tsx`:
   - Panel para árbitros
   - Resolver disputas
   - Stake management

**Resultado**: Sistema de disputas funcional end-to-end

---

### Fase 6: Property Verification (Día 8 - 6 horas)

**Prioridad**: BAJA

1. ✅ `VerificationBadge.tsx`:
   - Badge visual para propiedades verificadas

2. ✅ Verification flow:
   - Upload documentos
   - Request verification
   - Admin dashboard

**Resultado**: Propiedades pueden ser verificadas y mostrar badge

---

### Fase 7: Testing & Polish (Día 9-10 - 16 horas)

**Prioridad**: CRÍTICA

1. ✅ Testing end-to-end:
   - Flujo landlord completo
   - Flujo tenant completo
   - Edge cases

2. ✅ UI/UX polish:
   - Loading states
   - Error handling
   - Notifications
   - Mobile responsiveness

3. ✅ Documentation:
   - User guide
   - Developer docs
   - Deployment notes

**Resultado**: Frontend production-ready

---

## 6. TABLA DE ESTIMACIÓN FINAL

| Fase | Horas | Días | Prioridad |
|------|-------|------|-----------|
| Fase 1: Config Base | 4 | 0.5 | CRÍTICA |
| Fase 2: Core Functionality | 16 | 2 | CRÍTICA |
| Fase 3: Agreement Management | 12 | 1.5 | ALTA |
| Fase 4: Yield Strategies | 8 | 1 | MEDIA |
| Fase 5: Dispute System | 10 | 1.25 | MEDIA |
| Fase 6: Property Verification | 6 | 0.75 | BAJA |
| Fase 7: Testing & Polish | 16 | 2 | CRÍTICA |
| **TOTAL** | **72 horas** | **9 días** | - |

**Con 1 desarrollador frontend a tiempo completo**: 9-10 días laborales
**Con 2 desarrolladores frontend**: 5-6 días laborales

---

## 7. RIESGOS Y MITIGACIONES

### Riesgo 1: Cambio de Red (Mantle Sepolia)
**Severidad**: ALTA
**Impacto**: Usuarios necesitan cambiar de red manualmente

**Mitigación**:
```typescript
// Auto-switch network si el usuario está en red incorrecta
const checkAndSwitchNetwork = async () => {
  const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });

  if (parseInt(currentChainId, 16) !== NETWORK_CONFIG.chainId) {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${NETWORK_CONFIG.chainId.toString(16)}` }],
      });
    } catch (switchError: any) {
      // Network no existe, agregarla
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${NETWORK_CONFIG.chainId.toString(16)}`,
            chainName: NETWORK_CONFIG.chainName,
            nativeCurrency: NETWORK_CONFIG.nativeCurrency,
            rpcUrls: [NETWORK_CONFIG.rpcUrl],
            blockExplorerUrls: NETWORK_CONFIG.blockExplorerUrls
          }],
        });
      }
    }
  }
};
```

---

### Riesgo 2: Decimales USDT (6) vs MXNB (18)
**Severidad**: ALTA
**Impacto**: Errores de cálculo pueden resultar en pérdidas

**Mitigación**:
```typescript
// Helper functions con validación
const parseUSDTAmount = (amount: string): bigint => {
  if (!amount || isNaN(parseFloat(amount))) {
    throw new Error("Invalid amount");
  }
  return ethers.parseUnits(amount, 6); // Siempre 6 para USDT
};

const formatUSDTAmount = (amount: bigint): string => {
  return ethers.formatUnits(amount, 6);
};

// Usar SIEMPRE estas funciones, nunca parseUnits directamente
```

---

### Riesgo 3: ABIs Desactualizados
**Severidad**: MEDIA
**Impacto**: Funciones no existen o firma incorrecta

**Mitigación**:
1. Automatizar generación de ABIs en CI/CD
2. Script de verificación:
```bash
#!/bin/bash
# verify-abis.sh

cd Foundry
CONTRACTS=(
  "TenantPassportV2"
  "PropertyRegistry"
  "DisputeResolver"
  "RentalAgreementNFT"
  "RentalAgreementFactoryNFT"
  "RoomFiVault"
  "USDYStrategy"
  "LendleYieldStrategy"
)

for contract in "${CONTRACTS[@]}"; do
  echo "Verificando $contract..."
  forge inspect src/V2/$contract.sol:$contract abi > /tmp/${contract}_ABI.json

  if ! diff /tmp/${contract}_ABI.json ../src/web3/abis/${contract}_ABI.json > /dev/null; then
    echo "❌ ABI de $contract está desactualizado!"
    exit 1
  fi
done

echo "✅ Todos los ABIs están actualizados"
```

---

### Riesgo 4: Gas Costs en Mantle
**Severidad**: BAJA
**Impacto**: Usuarios pueden sorprenderse por costos de gas

**Mitigación**:
```typescript
// Estimador de gas antes de transacción
const estimateTransactionCost = async (tx: any) => {
  const gasEstimate = await tx.estimateGas();
  const gasPrice = await provider.getFeeData();

  const costInWei = gasEstimate * gasPrice.gasPrice;
  const costInMNT = ethers.formatEther(costInWei);

  // Mostrar al usuario
  setNotification({
    message: `Costo estimado: ${costInMNT} MNT`,
    severity: 'info'
  });

  return { gasEstimate, gasPrice, costInMNT };
};
```

---

## 8. CHECKLIST DE MIGRACIÓN

### Pre-Deployment (Backend/Contracts)
- [ ] Deploy todos los contratos V2 a Mantle Sepolia
- [ ] Verificar contratos en Mantle Explorer
- [ ] Guardar addresses en `deployment-addresses.json`
- [ ] Verificar que MockUSDT, MockUSDY, MockDEX, MockLendle estén fondeados
- [ ] Probar flujo completo en Foundry tests

### Frontend - Configuración Base
- [ ] Actualizar `NETWORK_CONFIG` a Mantle Sepolia (chainId: 5003)
- [ ] Agregar addresses de V2 desde `deployment-addresses.json`
- [ ] Generar todos los ABIs de V2
- [ ] Eliminar ABIs V1
- [ ] Actualizar `TOKEN_DECIMALS` a 6
- [ ] Verificar conexión a RPC de Mantle

### Frontend - Refactorización Core
- [ ] Reemplazar `InterestGenerator` → `RoomFiVault` en `App.tsx`
- [ ] Actualizar `TenantPassport` → `TenantPassportV2`
- [ ] Eliminar lógica de `PropertyInterestPool`
- [ ] Actualizar todos los `formatUnits` a 6 decimals
- [ ] Actualizar todos los `parseUnits` a 6 decimals
- [ ] Implementar auto-switch network

### Frontend - Nuevas Páginas
- [ ] Crear `RegisterPropertyPage.tsx`
- [ ] Crear `CreateAgreementPage.tsx`
- [ ] Crear `PayDepositPage.tsx`
- [ ] Crear `PayRentPage.tsx`
- [ ] Actualizar `DashboardPage.tsx`
- [ ] Eliminar/deprecar `CreatePoolPage.tsx`

### Frontend - Componentes NFT
- [ ] Crear `AgreementNFTCard.tsx`
- [ ] Crear `AgreementDetails.tsx`
- [ ] Implementar `fetchMyAgreements()`
- [ ] Mostrar agreements como NFT grid

### Frontend - Yield Strategies
- [ ] Crear `StrategySelector.tsx`
- [ ] Crear `StrategyStats.tsx`
- [ ] Implementar `getActiveStrategy()`
- [ ] Implementar `harvestYield()`

### Frontend - Dispute System
- [ ] Crear `DisputePanel.tsx`
- [ ] Crear `RaiseDisputeModal.tsx`
- [ ] Crear `ArbitratorDashboard.tsx` (opcional)
- [ ] Implementar `raiseDispute()`
- [ ] Implementar `resolveDispute()`

### Frontend - Property Verification
- [ ] Crear `VerificationBadge.tsx`
- [ ] Implementar verification request flow
- [ ] Admin dashboard (off-chain)

### Testing
- [ ] Test landlord flow: register property → view dashboard
- [ ] Test tenant flow: create agreement → pay deposit → pay rent
- [ ] Test dispute flow: raise → resolve
- [ ] Test vault flow: deposit → harvest → withdraw
- [ ] Test network switching
- [ ] Test error handling
- [ ] Test mobile responsiveness

### Deployment
- [ ] Build frontend: `npm run build`
- [ ] Deploy a hosting (Vercel/Netlify)
- [ ] Update environment variables
- [ ] Test en producción
- [ ] Documentar URLs públicas

---

## 9. COMANDOS ÚTILES

### Generar ABIs
```bash
cd Foundry

# Script automatizado
for contract in TenantPassportV2 PropertyRegistry DisputeResolver RentalAgreementNFT RentalAgreementFactoryNFT RoomFiVault USDYStrategy LendleYieldStrategy; do
  forge inspect src/V2/${contract}.sol:${contract} abi > ../src/web3/abis/${contract}_ABI.json
  echo "✅ Generado ${contract}_ABI.json"
done
```

### Actualizar Config Automático
```bash
# Leer deployment-addresses.json y generar config.ts
cd roomfi-web
node scripts/generate-config.js
```

```javascript
// scripts/generate-config.js
const fs = require('fs');
const path = require('path');

const deploymentPath = path.join(__dirname, '../Foundry/deployment-addresses.json');
const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

const config = `
// Auto-generated from deployment-addresses.json
export const NETWORK_CONFIG = {
  rpcUrl: "https://rpc.sepolia.mantle.xyz",
  chainId: ${deployment.chainId},
  chainName: "Mantle Sepolia",
  nativeCurrency: {
    name: "MNT",
    symbol: "MNT",
    decimals: 18
  },
  blockExplorerUrls: ["https://explorer.sepolia.mantle.xyz"]
};

export const USDT_ADDRESS = "${deployment.mocks.usdt}";
export const TENANT_PASSPORT_ADDRESS = "${deployment.core.tenantPassport}";
export const PROPERTY_REGISTRY_ADDRESS = "${deployment.core.propertyRegistry}";
export const DISPUTE_RESOLVER_ADDRESS = "${deployment.core.disputeResolver}";
export const RENTAL_AGREEMENT_NFT_ADDRESS = "${deployment.core.rentalAgreementNFT}";
export const RENTAL_AGREEMENT_FACTORY_ADDRESS = "${deployment.core.factory}";
export const ROOMFI_VAULT_ADDRESS = "${deployment.core.vault}";
export const USDY_STRATEGY_ADDRESS = "${deployment.strategies.usdy}";
export const LENDLE_STRATEGY_ADDRESS = "${deployment.strategies.lendle}";

export const TOKEN_DECIMALS = 6;
`;

fs.writeFileSync(
  path.join(__dirname, '../src/web3/config.ts'),
  config
);

console.log('✅ config.ts generado exitosamente');
```

---

## 10. CONCLUSIÓN

**INCOMPATIBILIDAD TOTAL CONFIRMADA**

El frontend actual (V1 en Arbitrum Sepolia) es **100% incompatible** con los contratos V2 (Mantle Sepolia). Se requiere:

**Migración Crítica**:
- Cambio de blockchain completo
- Reescritura de 90% de lógica de integración
- Nuevos componentes y páginas
- Nueva arquitectura frontend

**Esfuerzo Total Estimado**: 72 horas (9-10 días con 1 developer)

**Recomendación**:
1. **Opción A (RECOMENDADA)**: Migración completa siguiendo el plan de 7 fases
2. **Opción B**: Mantener V1 operando mientras se desarrolla V2 en paralelo (dual deployment)
3. **Opción C**: Simplificar V2 para hacerlo compatible con frontend V1 (NO RECOMENDADO - perdería features clave de Mantle)

**Prioridad**: CRÍTICA - Sin migración, el frontend no funcionará con los contratos V2.

---

## ANEXO A: Mapping V1 → V2

| Funcionalidad V1 | Equivalente V2 | Cambio Requerido |
|------------------|----------------|------------------|
| `PropertyInterestPool.createPropertyPool()` | `PropertyRegistry.registerProperty()` + marketplace off-chain | Completo |
| `PropertyInterestPool.expressInterest()` | `RentalAgreementFactory.createAgreement()` | Completo |
| `PropertyInterestPool.fundRent()` | `RentalAgreementNFT.payDeposit()` + `payRent()` | Parcial |
| `InterestGenerator.deposit()` | `RoomFiVault.deposit()` | Firma similar, aprobación diferente |
| `InterestGenerator.withdraw()` | `RoomFiVault.withdraw()` | Similar |
| `InterestGenerator.calculateInterest()` | `RoomFiVault.calculateUserYield()` | Nombre diferente |
| `TenantPassport.mintForSelf()` | `TenantPassportV2.mintPassport()` | Nombre diferente |
| `TenantPassport.getTenantInfo()` | `TenantPassportV2.getPassportData()` | Estructura diferente |
| N/A | `DisputeResolver.raiseDispute()` | NUEVO |
| N/A | `DisputeResolver.resolveDispute()` | NUEVO |
| N/A | `PropertyRegistry.verifyProperty()` | NUEVO |
| N/A | `RentalAgreementNFT.*` (NFT methods) | NUEVO |
| N/A | `USDYStrategy.getAPY()` | NUEVO |
| N/A | `LendleYieldStrategy.getAPY()` | NUEVO |

---

## ANEXO B: Contract Addresses Template

Después del deployment, el archivo `deployment-addresses.json` debe verse así:

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

**Este archivo debe ser generado automáticamente por el deployment script y versionado en Git.**

---

**FIN DEL ANÁLISIS**

**Preparado por**: Equipo Técnico RoomFi
**Fecha**: 6 de Enero de 2026
**Versión**: 1.0
