# Análisis de Compatibilidad: Frontend vs Smart Contracts V2/Mirrors

**Fecha**: 2025-11-11
**Proyecto**: RoomFi - Sistema de alquiler descentralizado

---

## Resumen Ejecutivo

El frontend actual de RoomFi está diseñado para interactuar con contratos de la **versión 1 (V1)**, mientras que los smart contracts en `foundry/src/V2` y `foundry/src/Mirrors` representan una **arquitectura completamente nueva (V2)** con cambios estructurales significativos.

**Estado**: ❌ **NO COMPATIBLE** - Se requieren cambios sustanciales en el frontend

---

## 1. Arquitectura Actual del Frontend

### 1.1 Contratos que usa el frontend (src/web3/config.ts)

```typescript
// Contratos V1 actualmente en uso
MXNBT_ADDRESS = "0x82B9e52b26A2954E113F94Ff26647754d5a4247D"
TENANT_PASSPORT_ADDRESS = "0x674687e09042452C0ad3D5EC06912bf4979bFC33"
PROPERTY_INTEREST_POOL_ADDRESS = "0xeD9018D47ee787C5d84A75A42Df786b8540cC75b"
INTEREST_GENERATOR_ADDRESS = "0xF8F626afB4AadB41Be7D746e53Ff417735b1C289"
```

**Red**: Arbitrum Sepolia (chainId: 421614)

### 1.2 Funcionalidades implementadas

El frontend actual implementa:

1. **Gestión de Tenant Passport (V1)**
   - Minteo de pasaportes NFT
   - Visualización de reputación básica
   - Tracking de pagos (paymentsMade, paymentsMissed)

2. **Sistema de Pools de Interés (V1)**
   - Creación de "Property Interest Pools"
   - Fondeo de pools por tenants interesados
   - Depósito de fondos del landlord
   - Movimiento de fondos entre pool y vault
   - Cancelación de pools

3. **Vault de Ahorros**
   - Depósito de MXNBT tokens
   - Generación de intereses
   - Retiro de fondos

4. **Gestión de Propiedades**
   - Visualización de propiedades del landlord
   - Dashboard con métricas

---

## 2. Arquitectura de Contratos V2

### 2.1 Nuevos contratos en foundry/src/V2

Los contratos V2 introducen una arquitectura completamente diferente:

#### **TenantPassportV2.sol**
- ✅ **Compatible conceptualmente** con el frontend
- 🔄 **Cambios importantes**:
  - Nuevo sistema de **14 badges** (6 KYC + 8 automáticos)
  - Sistema de **verificación KYC** con workflow completo
  - **Reputation decay** por inactividad
  - Tracking expandido: `consecutiveOnTimePayments`, `totalMonthsRented`, `referralCount`, `disputesCount`
  - Funciones adicionales: `recordFastResponse()`, `recordPropertyNoIssues()`, etc.

**Funciones que el frontend debe implementar**:
```solidity
// KYC Verification
requestVerification(BadgeType, documentsURI)
approveVerification(tokenId, BadgeType)

// Nuevas métricas
getTenantMetrics(tokenId) // Reemplaza getTenantInfo()
getReputationWithDecay(tokenId) // Incluye decay automático
getAllBadges(tokenId) // Array de 14 badges
```

#### **PropertyRegistry.sol**
- ❌ **NO existe en frontend actual**
- 🆕 **Sistema completamente nuevo**:
  - Propiedades como **PropertyNFTs** (ERC721)
  - **Property ID basado en GPS** para prevenir duplicados
  - Sistema de **verificación legal** (KYC para propiedades)
  - Badges de propiedades (10 tipos)
  - Reputación de propiedades
  - Metadata on-chain

**Funciones necesarias para el frontend**:
```solidity
// Registro de propiedades
registerProperty(...) // 16 parámetros
updateProperty(propertyId, ...)

// Verificación
requestPropertyVerification(propertyId, documentsURI)
approvePropertyVerification(propertyId)

// Búsqueda
getPropertiesByCity(city, limit)
getActiveProperties(offset, limit)
isPropertyAvailableForRent(propertyId)
```

#### **RentalAgreement.sol + RentalAgreementFactory.sol**
- ❌ **NO existe en frontend actual**
- 🆕 **Reemplaza el sistema de "Interest Pools"**:
  - Contratos individuales de alquiler (EIP-1167 clones)
  - Estados: PENDING → ACTIVE → COMPLETED/TERMINATED/DISPUTED
  - Firma bilateral (landlord + tenant)
  - Pago de security deposit
  - Pagos mensuales automáticos
  - Sistema de penalizaciones

**Funciones necesarias para el frontend**:
```solidity
// Factory
createAgreement(propertyId, tenant, monthlyRent, securityDeposit, duration)

// Agreement
signAsLandlord()
signAsTenant()
paySecurityDeposit() // payable
payRent() // payable mensual
terminateAgreement(reason)
raiseDispute(reasonCode, evidenceURI, amountInDispute)
```

#### **DisputeResolver.sol**
- ❌ **NO existe en frontend actual**
- 🆕 **Sistema de arbitraje descentralizado**:
  - Votación por panel de árbitros
  - Estados: PENDING_RESPONSE → IN_ARBITRATION → RESOLVED
  - Penalties automáticas
  - Actualización de reputaciones

**Funciones necesarias para el frontend**:
```solidity
createDispute(rentalAgreement, respondent, reason, evidenceURI, amountInDispute)
submitResponse(disputeId, responseURI)
vote(disputeId, forInitiator, notes) // Solo árbitros
getDispute(disputeId)
```

### 2.2 Contratos Mirrors (foundry/src/Mirrors)

#### **TenantPassportMirror.sol + PropertyRegistryMirror.sol**
- 🔄 **Contratos read-only** para cross-chain
- Sincronizados vía **Hyperbridge ISMP**
- **NO permiten escritura directa**
- Solo queries de datos sincronizados desde Paseo

**Propósito**: Permitir consultas locales en Moonbeam/Arbitrum sin cross-chain calls costosas.

**Funciones para el frontend**:
```solidity
// TenantPassportMirror
getTenantInfo(address)
getTenantMetrics(address)
hasMinimumReputation(address, minReputation)

// PropertyRegistryMirror
getProperty(propertyId)
searchProperties(city, minBedrooms, maxRent, offset, limit)
getFeaturedProperties(limit)
```

---

## 3. Análisis de Incompatibilidades Críticas

### 3.1 Sistema de "Property Interest Pools" (V1) vs RentalAgreements (V2)

| Aspecto | V1 (Frontend actual) | V2 (Contratos nuevos) | Compatibilidad |
|---------|---------------------|----------------------|----------------|
| **Concepto core** | Pool colectivo de fondos por propiedad | Contratos individuales de alquiler | ❌ Incompatible |
| **Creación** | `createPropertyPool()` | `createAgreement()` via Factory | ❌ Diferentes firmas |
| **Participantes** | Múltiples tenants en un pool | 1 landlord + 1 tenant por agreement | ❌ Modelo diferente |
| **Fondeo** | Tenants depositan al pool | Tenant paga security deposit | ❌ Flujo diferente |
| **Pagos** | No implementados en V1 | `payRent()` mensual en V2 | ❌ No existe en V1 |
| **Estados** | Open, Funding, Rented, Cancelled | PENDING, ACTIVE, COMPLETED, etc | ❌ Incompatible |
| **Vault integration** | `depositToVault()`, `withdrawFromVault()` | No integrado directamente | ⚠️ Separado |

**Conclusión**: El sistema de pools de V1 es **completamente diferente** a los rental agreements de V2.

### 3.2 Funciones del frontend que NO existen en V2

```typescript
// App.tsx - Funciones que NO tienen equivalente en V2
handleViewMyProperties() // Usa PropertyInterestPool.getPropertiesByLandlord()
  → V2: PropertyRegistry.getPropertiesByLandlord()

handleDepositPoolToVault(propertyId) // No existe en V2
handleWithdrawPoolFromVault(propertyId, amount) // No existe en V2
handleAddLandlordFunds(propertyId, amount) // No existe en V2
handleCancelPool(propertyId) // No existe en V2

// CreatePoolPage.tsx
poolContract.createPropertyPool(...) // No existe en V2
  → V2: factoryContract.createAgreement(...)
```

### 3.3 Nuevas funciones de V2 que NO están en el frontend

```solidity
// PropertyRegistry - Falta implementación completa
registerProperty(...16 params) // ❌
requestPropertyVerification(propertyId, documentsURI) // ❌
updateProperty(propertyId, ...) // ❌
listProperty(propertyId) / delistProperty(propertyId) // ❌

// RentalAgreement - Falta implementación completa
signAsLandlord() / signAsTenant() // ❌
paySecurityDeposit() // ❌
payRent() // ❌
terminateAgreement(reason) // ❌
raiseDispute(...) // ❌

// DisputeResolver - No implementado
createDispute(...) // ❌
submitResponse(disputeId, responseURI) // ❌
vote(disputeId, forInitiator, notes) // ❌
```

---

## 4. Cambios Necesarios en el Frontend

### 4.1 Archivos de configuración

#### **src/web3/config.ts**

```typescript
// ANTES (V1)
export const PROPERTY_INTEREST_POOL_ADDRESS = "0x...";
export const INTEREST_GENERATOR_ADDRESS = "0x...";

// DESPUÉS (V2)
export const PROPERTY_REGISTRY_ADDRESS = "0x..."; // NUEVO
export const RENTAL_AGREEMENT_FACTORY_ADDRESS = "0x..."; // NUEVO
export const DISPUTE_RESOLVER_ADDRESS = "0x..."; // NUEVO
export const INTEREST_GENERATOR_ADDRESS = "0x..."; // Mantener para vault

// Opcional: Si usas cross-chain con Paseo
export const TENANT_PASSPORT_MIRROR_ADDRESS = "0x...";
export const PROPERTY_REGISTRY_MIRROR_ADDRESS = "0x...";
export const ISMP_MESSAGE_HANDLER_ADDRESS = "0x...";
```

#### **Nuevos ABIs necesarios**

Crear archivos en `src/web3/abis/`:
- `PROPERTY_REGISTRY_ABI.json`
- `RENTAL_AGREEMENT_ABI.json`
- `RENTAL_AGREEMENT_FACTORY_ABI.json`
- `DISPUTE_RESOLVER_ABI.json`
- (Opcional) `TENANT_PASSPORT_MIRROR_ABI.json`
- (Opcional) `PROPERTY_REGISTRY_MIRROR_ABI.json`

### 4.2 Componentes a crear/modificar

#### **PropertyRegistration.tsx** (NUEVO)
Componente para registrar propiedades en PropertyRegistry.

```typescript
interface PropertyRegistrationForm {
  // Basic Info
  name: string;
  propertyType: PropertyType; // enum
  fullAddress: string;
  city: string;
  state: string;
  postalCode: string;
  neighborhood: string;
  latitude: number; // x1e6
  longitude: number; // x1e6

  // Features
  bedrooms: number;
  bathrooms: number;
  maxOccupants: number;
  squareMeters: number;
  floorNumber: number;
  amenities: number; // bitmask

  // Financial
  monthlyRent: string; // en MXNBT
  securityDeposit: string;
  utilitiesIncluded: boolean;
  furnishedIncluded: boolean;

  // Metadata
  metadataURI: string; // IPFS con fotos
}

// Funciones principales
const registerProperty = async (formData: PropertyRegistrationForm) => {
  const registryContract = new ethers.Contract(
    PROPERTY_REGISTRY_ADDRESS,
    PROPERTY_REGISTRY_ABI,
    signer
  );

  const tx = await registryContract.registerProperty(
    formData.name,
    formData.propertyType,
    formData.fullAddress,
    // ... resto de parámetros
  );

  await tx.wait();
  const propertyId = ...; // Obtener de eventos
  return propertyId;
};

const requestVerification = async (propertyId: string, documentsURI: string) => {
  // Subir documentos a IPFS primero
  // Luego llamar requestPropertyVerification()
};
```

#### **CreateRentalAgreement.tsx** (NUEVO)
Reemplaza CreatePoolPage.tsx con el nuevo flujo de agreements.

```typescript
interface AgreementForm {
  propertyId: string;
  tenant: string; // address
  monthlyRent: string; // en MXNBT
  securityDeposit: string;
  duration: number; // meses (1-24)
}

const createAgreement = async (formData: AgreementForm) => {
  const factoryContract = new ethers.Contract(
    RENTAL_AGREEMENT_FACTORY_ADDRESS,
    RENTAL_AGREEMENT_FACTORY_ABI,
    signer
  );

  const tx = await factoryContract.createAgreement(
    formData.propertyId,
    formData.tenant,
    ethers.parseUnits(formData.monthlyRent, tokenDecimals),
    ethers.parseUnits(formData.securityDeposit, tokenDecimals),
    formData.duration
  );

  await tx.wait();

  // Obtener address del agreement creado desde eventos
  const agreementAddress = ...;
  return agreementAddress;
};
```

#### **RentalAgreementView.tsx** (NUEVO)
Vista para interactuar con un rental agreement específico.

```typescript
interface RentalAgreementProps {
  agreementAddress: string;
}

// Funciones principales
const signAgreement = async (isLandlord: boolean) => {
  const agreementContract = new ethers.Contract(
    agreementAddress,
    RENTAL_AGREEMENT_ABI,
    signer
  );

  if (isLandlord) {
    await agreementContract.signAsLandlord();
  } else {
    await agreementContract.signAsTenant();
  }
};

const payDeposit = async (amount: string) => {
  await agreementContract.paySecurityDeposit({
    value: ethers.parseUnits(amount, tokenDecimals)
  });
};

const payMonthlyRent = async (amount: string) => {
  await agreementContract.payRent({
    value: ethers.parseUnits(amount, tokenDecimals)
  });
};

const raiseDispute = async (reasonCode: number, evidenceURI: string, amount: string) => {
  await agreementContract.raiseDispute(
    reasonCode,
    evidenceURI,
    ethers.parseUnits(amount, tokenDecimals),
    { value: ethers.parseEther("0.01") } // arbitration fee
  );
};
```

#### **DisputeManager.tsx** (NUEVO)
Interfaz para gestionar disputas.

```typescript
const createDispute = async (
  agreementAddress: string,
  respondent: string,
  reason: DisputeReason,
  evidenceURI: string,
  amountInDispute: string
) => {
  const disputeContract = new ethers.Contract(
    DISPUTE_RESOLVER_ADDRESS,
    DISPUTE_RESOLVER_ABI,
    signer
  );

  const tx = await disputeContract.createDispute(
    agreementAddress,
    respondent,
    reason,
    evidenceURI,
    ethers.parseUnits(amountInDispute, tokenDecimals),
    initiatorIsTenant,
    { value: ethers.parseEther("0.01") } // fee
  );

  await tx.wait();
  // Obtener disputeId desde eventos
};

const submitResponse = async (disputeId: number, responseURI: string) => {
  await disputeContract.submitResponse(disputeId, responseURI);
};

const voteOnDispute = async (disputeId: number, forInitiator: boolean, notes: string) => {
  // Solo para árbitros autorizados
  await disputeContract.vote(disputeId, forInitiator, notes);
};
```

#### **PropertySearch.tsx** (MODIFICAR)
Actualizar para usar PropertyRegistry en lugar de pools.

```typescript
// ANTES (V1)
const searchProperties = async () => {
  // Usaba PropertyInterestPool
};

// DESPUÉS (V2)
const searchProperties = async (city: string, minBedrooms: number, maxRent: string) => {
  const registryContract = new ethers.Contract(
    PROPERTY_REGISTRY_ADDRESS,
    PROPERTY_REGISTRY_ABI,
    provider
  );

  const propertyIds = await registryContract.getPropertiesByCity(city, 50);

  // Filtrar por criterios adicionales
  const properties = await Promise.all(
    propertyIds.map(async (id) => {
      const prop = await registryContract.getProperty(id);
      return prop;
    })
  );

  return properties.filter(p =>
    p.isActive &&
    p.features.bedrooms >= minBedrooms &&
    p.financialInfo.monthlyRent <= ethers.parseUnits(maxRent, tokenDecimals)
  );
};

// O usar Mirror para queries más eficientes
const searchPropertiesMirror = async (city: string, minBedrooms: number, maxRent: string) => {
  const mirrorContract = new ethers.Contract(
    PROPERTY_REGISTRY_MIRROR_ADDRESS,
    PROPERTY_REGISTRY_MIRROR_ABI,
    provider
  );

  const propertyIds = await mirrorContract.searchProperties(
    city,
    minBedrooms,
    ethers.parseUnits(maxRent, tokenDecimals),
    0, // offset
    20 // limit
  );

  return propertyIds;
};
```

#### **TenantPassportView.tsx** (MODIFICAR)
Actualizar para mostrar nuevos badges y métricas.

```typescript
// ANTES (V1)
interface TenantPassportData {
  reputation: number;
  paymentsMade: number;
  paymentsMissed: number;
  outstandingBalance: number;
  propertiesOwned: number;
  tokenId: BigInt;
}

// DESPUÉS (V2)
interface TenantPassportDataV2 {
  reputation: number;
  paymentsMade: number;
  paymentsMissed: number;
  propertiesRented: number; // NUEVO
  propertiesOwned: number;
  consecutiveOnTimePayments: number; // NUEVO
  totalMonthsRented: number; // NUEVO
  referralCount: number; // NUEVO
  disputesCount: number; // NUEVO
  outstandingBalance: number;
  totalRentPaid: number; // NUEVO
  lastActivityTime: number; // NUEVO
  isVerified: boolean; // NUEVO

  badges: {
    // KYC Badges
    VERIFIED_ID: boolean;
    VERIFIED_INCOME: boolean;
    VERIFIED_EMPLOYMENT: boolean;
    VERIFIED_STUDENT: boolean;
    VERIFIED_PROFESSIONAL: boolean;
    CLEAN_CREDIT: boolean;

    // Performance Badges
    EARLY_ADOPTER: boolean;
    RELIABLE_TENANT: boolean;
    LONG_TERM_TENANT: boolean;
    ZERO_DISPUTES: boolean;
    NO_DAMAGE_HISTORY: boolean;
    FAST_RESPONDER: boolean;
    HIGH_VALUE: boolean;
    MULTI_PROPERTY: boolean;
  };
}

const getTenantPassportData = async (account: string) => {
  const passportContract = new ethers.Contract(
    TENANT_PASSPORT_ADDRESS,
    TENANT_PASSPORT_ABI,
    provider
  );

  const tokenId = await passportContract.getTokenIdByAddress(account);
  const info = await passportContract.getTenantInfo(tokenId);
  const metrics = await passportContract.getTenantMetrics(tokenId);
  const allBadges = await passportContract.getAllBadges(tokenId);

  return {
    ...info,
    ...metrics,
    badges: parseBadgesArray(allBadges) // Convertir array de 14 bools a objeto
  };
};

// Nueva función: Solicitar verificación KYC
const requestKYCVerification = async (badgeType: BadgeType, documentsURI: string) => {
  await passportContract.requestVerification(badgeType, documentsURI);
};
```

#### **DashboardPage.tsx** (MODIFICAR SUSTANCIALMENTE)

```typescript
// Cambios principales:

// 1. Reemplazar "View My Properties" con PropertyRegistry
const handleViewMyProperties = async () => {
  const registryContract = new ethers.Contract(
    PROPERTY_REGISTRY_ADDRESS,
    PROPERTY_REGISTRY_ABI,
    provider
  );

  const propertyIds = await registryContract.getPropertiesByLandlord(account);

  const properties = await Promise.all(
    propertyIds.map(id => registryContract.getProperty(id))
  );

  setMyProperties(properties);
};

// 2. Eliminar funciones de pools (ya no existen)
// ❌ handleDepositPoolToVault()
// ❌ handleWithdrawPoolFromVault()
// ❌ handleAddLandlordFunds()
// ❌ handleCancelPool()

// 3. Agregar funciones de agreements
const getMyAgreements = async () => {
  const factoryContract = new ethers.Contract(
    RENTAL_AGREEMENT_FACTORY_ADDRESS,
    RENTAL_AGREEMENT_FACTORY_ABI,
    provider
  );

  const agreementAddresses = await factoryContract.getLandlordAgreements(account);

  const agreements = await Promise.all(
    agreementAddresses.map(async (addr) => {
      const agreementContract = new ethers.Contract(
        addr,
        RENTAL_AGREEMENT_ABI,
        provider
      );
      return await agreementContract.getAgreementDetails();
    })
  );

  setMyAgreements(agreements);
};

// 4. Agregar vista de propiedades vs agreements
<Tabs>
  <Tab label="Mis Propiedades">
    {/* Lista de propiedades registradas */}
  </Tab>
  <Tab label="Rental Agreements">
    {/* Lista de agreements activos/completados */}
  </Tab>
  <Tab label="Disputas">
    {/* Disputas activas */}
  </Tab>
</Tabs>
```

---

## 5. Flujos de Usuario Actualizados

### 5.1 Flujo del Landlord (Nuevo)

```
1. Mintear TenantPassport (si no tiene)
   └─ mintForSelf()

2. Registrar Propiedad
   └─ PropertyRegistry.registerProperty(...)
   └─ Estado: DRAFT

3. Subir documentos legales a IPFS
   └─ Escrituras, INE, predial, fotos

4. Solicitar Verificación
   └─ requestPropertyVerification(propertyId, documentsURI)
   └─ Estado: PENDING

5. [ESPERAR] Verificador aprueba
   └─ Estado: VERIFIED

6. Listar Propiedad
   └─ listProperty(propertyId)
   └─ isActive = true

7. Crear Rental Agreement con tenant
   └─ RentalAgreementFactory.createAgreement(...)
   └─ Agreement estado: PENDING

8. Firmar Agreement
   └─ agreement.signAsLandlord()

9. [ESPERAR] Tenant firma y paga deposit
   └─ Agreement estado: ACTIVE

10. Recibir pagos mensuales
    └─ Automático cuando tenant paga
    └─ 85% al landlord, 15% a fees
```

### 5.2 Flujo del Tenant (Nuevo)

```
1. Mintear TenantPassport (si no tiene)
   └─ mintForSelf()

2. Buscar Propiedades
   └─ PropertyRegistry.getPropertiesByCity()
   └─ O PropertyRegistryMirror.searchProperties()

3. Landlord crea Agreement para ti
   └─ Recibes notificación off-chain

4. Revisar y Firmar Agreement
   └─ agreement.signAsTenant()

5. Pagar Security Deposit
   └─ agreement.paySecurityDeposit() payable
   └─ Agreement estado: ACTIVE

6. Pagos Mensuales
   └─ agreement.payRent() payable
   └─ Deadline: nextPaymentDue
   └─ Si tarde: paymentsMissed++

7. Al finalizar contrato
   └─ Agreement estado: COMPLETED
   └─ Security deposit retornado automáticamente

8. Si hay problemas
   └─ agreement.raiseDispute(...)
   └─ Entra en DisputeResolver
```

### 5.3 Flujo de Dispute Resolution (Nuevo)

```
1. Party A levanta disputa
   └─ RentalAgreement.raiseDispute(...)
   └─ Crea disputa en DisputeResolver
   └─ Agreement estado: DISPUTED
   └─ Pagos bloqueados

2. Party B responde
   └─ DisputeResolver.submitResponse(disputeId, responseURI)
   └─ Sube evidencia a IPFS

3. Sistema asigna 3 árbitros
   └─ _assignArbitrators() automático
   └─ Dispute estado: IN_ARBITRATION

4. Árbitros votan
   └─ DisputeResolver.vote(disputeId, forInitiator, notes)
   └─ Mayoría simple (2/3)

5. Dispute resuelta
   └─ Estado: RESOLVED_TENANT o RESOLVED_LANDLORD
   └─ Penalties aplicadas automáticamente
   └─ Reputaciones actualizadas

6. Agreement termina
   └─ Agreement estado: TERMINATED
   └─ Fondos distribuidos según resultado
```

---

## 6. Consideraciones de Cross-Chain (Mirrors)

### 6.1 ¿Cuándo usar Mirrors?

Los contratos Mirror son útiles si:
- Planeas desplegar en **múltiples chains** (ej: Moonbeam + Arbitrum)
- Quieres **sincronizar datos** desde Paseo (Polkadot)
- Necesitas **queries gas-efficient** sin cross-chain calls

**Si NO usas cross-chain**: Puedes ignorar los contracts Mirrors y usar solo V2.

### 6.2 Implementación de Mirrors (Opcional)

Si decides usar Mirrors:

```typescript
// Usar Mirror para queries read-only
const getTenantReputationMirror = async (tenantAddress: string) => {
  const mirrorContract = new ethers.Contract(
    TENANT_PASSPORT_MIRROR_ADDRESS,
    TENANT_PASSPORT_MIRROR_ABI,
    provider
  );

  const reputation = await mirrorContract.getReputation(tenantAddress);
  return reputation;
};

// Verificar frescura de datos
const isSyncFresh = await mirrorContract.isSyncFresh(
  tenantAddress,
  24 * 60 * 60 // max 24 horas
);

if (!isSyncFresh) {
  // Datos desactualizados, mostrar warning
  console.warn("Mirror data may be stale");
}
```

**Nota**: Mirrors NO permiten escritura. Para modificar datos, debes interactuar con los contratos originales en Paseo.

---

## 7. Checklist de Migración Frontend

### 7.1 Fase 1: Configuración Base

- [ ] Desplegar contratos V2 en la red objetivo
- [ ] Actualizar `src/web3/config.ts` con nuevas addresses
- [ ] Crear/importar nuevos ABIs:
  - [ ] `PROPERTY_REGISTRY_ABI.json`
  - [ ] `RENTAL_AGREEMENT_ABI.json`
  - [ ] `RENTAL_AGREEMENT_FACTORY_ABI.json`
  - [ ] `DISPUTE_RESOLVER_ABI.json`
  - [ ] `TENANT_PASSPORT_V2_ABI.json` (actualizado)
- [ ] Actualizar imports en componentes

### 7.2 Fase 2: Componentes Core

- [ ] **TenantPassport**: Actualizar para mostrar 14 badges
- [ ] **TenantPassport**: Implementar KYC verification request
- [ ] **PropertyRegistration**: Crear componente nuevo
- [ ] **PropertyVerification**: Implementar workflow de verificación
- [ ] **PropertyList**: Actualizar para usar PropertyRegistry

### 7.3 Fase 3: Rental Agreements

- [ ] **CreateRentalAgreement**: Reemplazar CreatePoolPage.tsx
- [ ] **RentalAgreementView**: Vista de agreement individual
- [ ] **AgreementSigning**: Implementar firma bilateral
- [ ] **PaymentSchedule**: Vista de pagos mensuales
- [ ] **DepositPayment**: Componente para pagar security deposit

### 7.4 Fase 4: Dispute Resolution

- [ ] **DisputeCreation**: Formulario para crear disputas
- [ ] **DisputeList**: Lista de disputas activas
- [ ] **DisputeView**: Vista detallada de una disputa
- [ ] **ArbitratorPanel**: Panel de votación (solo para árbitros)

### 7.5 Fase 5: Dashboard

- [ ] **DashboardPage**: Actualizar para eliminar pools
- [ ] **MyProperties**: Migrar de pools a PropertyRegistry
- [ ] **MyAgreements**: Nueva sección para agreements
- [ ] **MyDisputes**: Nueva sección para disputas
- [ ] **Metrics**: Actualizar métricas (eliminar pool stats)

### 7.6 Fase 6: Testing

- [ ] Test unitarios de nuevos componentes
- [ ] Test de integración con contratos V2
- [ ] Test de flujos completos:
  - [ ] Registro de propiedad
  - [ ] Creación de agreement
  - [ ] Pagos mensuales
  - [ ] Disputa + resolución
- [ ] Test de edge cases

### 7.7 Fase 7: Deprecación de V1

- [ ] Eliminar código de PropertyInterestPool
- [ ] Eliminar referencias a pools en UI
- [ ] Actualizar documentación
- [ ] Migrar datos existentes (si hay)

---

## 8. Estimación de Esfuerzo

### 8.1 Por complejidad

| Tarea | Complejidad | Tiempo estimado |
|-------|-------------|----------------|
| Configuración (addresses, ABIs) | Baja | 2-4 horas |
| PropertyRegistry integration | Media | 8-12 horas |
| RentalAgreement creation flow | Alta | 16-24 horas |
| Agreement signing & payments | Alta | 12-16 horas |
| Dispute resolution UI | Alta | 16-20 horas |
| TenantPassport V2 updates | Media | 8-10 horas |
| Dashboard refactor | Media | 8-12 horas |
| Testing completo | Alta | 16-24 horas |

**Total estimado**: **86-122 horas** (2-3 semanas de desarrollo)

### 8.2 Por rol

- **Frontend Developer**: 50-60% del trabajo
- **Smart Contract Developer**: 20-30% (para deployment y debugging)
- **UI/UX Designer**: 10-15% (nuevos flows)
- **QA Tester**: 10-15%

---

## 9. Recomendaciones

### 9.1 Prioridades

1. **CRÍTICO**: PropertyRegistry + RentalAgreementFactory
   - Sin esto, no hay funcionalidad core

2. **ALTO**: RentalAgreement lifecycle
   - Firmas, pagos, estados

3. **MEDIO**: DisputeResolver
   - Puede implementarse después si es necesario

4. **BAJO**: Mirrors
   - Solo si planeas cross-chain

### 9.2 Estrategia de migración

**Opción A: Big Bang** (No recomendado)
- Implementar todo V2 de una vez
- Frontend V1 → Frontend V2 completo
- Riesgo alto, testing complejo

**Opción B: Incremental** (Recomendado)
1. Desplegar contratos V2 en paralelo a V1
2. Implementar PropertyRegistry primero
3. Agregar RentalAgreement como feature flag
4. Migrar usuarios gradualmente
5. Deprecar V1 cuando V2 esté estable

**Opción C: Dual Support** (Para transición)
- Mantener soporte de V1 y V2 simultáneamente
- Switch en config para elegir versión
- Útil para migración gradual

### 9.3 Puntos de atención

⚠️ **IMPORTANTE**:
- Los contratos V2 NO son backwards-compatible con V1
- NO puedes reutilizar datos de pools V1 directamente
- Necesitas estrategia de migración de datos existentes
- Considera mantener V1 read-only para historial

⚠️ **Security**:
- Audita contratos V2 antes de producción
- Test exhaustivo de flujos de fondos (pagos, deposits, disputes)
- Valida permisos de árbitros en DisputeResolver

⚠️ **UX**:
- Los nuevos flujos son más complejos (firmas, verificaciones)
- Necesitas mejor onboarding para usuarios
- Considera guías interactivas para landlords/tenants

---

## 10. Conclusión

### Estado actual
- ❌ **Frontend actual NO es compatible con contratos V2**
- 🔄 **Se requiere refactor sustancial**
- 🆕 **Arquitectura V2 es superior pero más compleja**

### Esfuerzo requerido
- **~86-122 horas de desarrollo**
- **2-3 semanas full-time**
- Equipo recomendado: 2-3 developers

### Próximos pasos inmediatos

1. **Decisión arquitectónica**:
   - ¿Migrar completamente a V2?
   - ¿Mantener V1 en paralelo?
   - ¿Cross-chain con Mirrors?

2. **Planning**:
   - Crear backlog detallado con tasks
   - Asignar responsables
   - Establecer sprints

3. **Setup**:
   - Desplegar contratos V2 en testnet
   - Setup ambiente de desarrollo
   - Crear branch de V2

4. **Implementación**:
   - Empezar con Phase 1 (Config)
   - Luego Phase 2 (PropertyRegistry)
   - Iterar según prioridades

---

**Fecha**: 2025-11-11
**Versión**: 1.0
