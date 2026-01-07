# RoomFi V2 - Flujos Completos de la Plataforma
## Mantle Global Hackathon 2025

**ESTE DOCUMENTO EXPLICA TODO EL FLUJO DE ROOMFI V2**
Aquí encontrarás EXACTAMENTE cómo funciona la plataforma, qué hace cada smart contract, y por qué existe cada uno.

---

## 🎯 VISIÓN GENERAL: ¿Qué es RoomFi?

**RoomFi** es una plataforma descentralizada de rentas inmobiliarias donde:
- **Landlords** pueden publicar propiedades y recibir pagos on-chain
- **Tenants** pueden rentar con reputación blockchain y ganar yield en sus depósitos
- **El protocolo** genera ingresos tomando fee del yield farming

**Problema que resuelve**:
1. ❌ Landlords no confían en tenants sin historial
2. ❌ Tenants pierden dinero con depósitos sin rendimiento
3. ❌ Disputas de renta se resuelven en cortes lentas y costosas
4. ❌ No hay portabilidad de reputación entre rentas

**Solución RoomFi**:
1. ✅ **TenantPassport** = Reputación on-chain portable (0-1000 score)
2. ✅ **RoomFiVault** = Depósitos generan 6-12% APY en DeFi
3. ✅ **DisputeResolver** = Arbitraje descentralizado en 14 días
4. ✅ **RentalAgreementNFT** = Contratos de renta como NFTs tradeables

---

## 🏛️ ARQUITECTURA: Los 8 Smart Contracts y su Rol

### Diagrama de Interacción

```
                    ┌─────────────────────┐
                    │   TenantPassportV2  │
                    │  (Soul-bound NFT)   │
                    │   Reputation: 0-1000│
                    └──────────┬──────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                  │
    ┌─────────▼──────────┐          ┌──────────▼─────────┐
    │ PropertyRegistry   │          │  DisputeResolver   │
    │  (Property NFTs)   │          │   (3 Arbitrators)  │
    │  GPS + Verification│          │   Voting System    │
    └─────────┬──────────┘          └──────────┬─────────┘
              │                                  │
              └────────────────┬────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │RentalAgreementFactory│
                    │   (Factory Pattern)  │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ RentalAgreementNFT  │
                    │  (ERC721 Contract)  │
                    │  Tokenized Rental   │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │    RoomFiVault      │
                    │  (Yield Farming)    │
                    └──────────┬──────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                  │
    ┌─────────▼──────────┐          ┌──────────▼─────────┐
    │   USDYStrategy     │          │ LendleYieldStrategy│
    │   4.29% APY        │          │    ~6% APY         │
    │ (US Treasuries)    │          │ (Aave Fork)        │
    └────────────────────┘          └────────────────────┘
```

---

## 📝 CONTRATO POR CONTRATO: Función y Propósito

### 1. TenantPassportV2.sol
**Tipo**: Soul-Bound NFT (ERC721, no transferible)
**Propósito**: Identidad y reputación on-chain del tenant

**¿Por qué existe?**
Sin historial de renta verificable, los landlords no confían en tenants nuevos. Este NFT crea un "credit score" descentralizado y portable.

**Funcionalidad clave**:
- Cada wallet puede mint UN SOLO passport (derivado de su address)
- Score de reputación: 0-1000 puntos
- Tracking de métricas:
  - Pagos a tiempo vs retrasados
  - Disputas ganadas vs perdidas
  - Total de rentas completadas
  - Meses totales rentando
- Sistema de badges (14 tipos):
  - 6 badges KYC (verificación manual): ID, Income, Employment, etc.
  - 8 badges automáticos (métricas on-chain): Reliable Tenant, Zero Disputes, etc.

**Ejemplo de uso**:
```solidity
// Tenant minta su passport (solo una vez)
tenantPassport.mintForSelf(); // tokenId = hash(msg.sender)

// Ver reputación
(address owner, uint256 score, uint32 paymentsOnTime, ...)
  = tenantPassport.getPassportData(tokenId);

// score = 850/1000 = "Excellent tenant"
```

**¿Quién actualiza la reputación?**
- `RentalAgreementNFT` (autorizado): Actualiza cuando tenant paga o no paga
- `DisputeResolver` (autorizado): Penaliza en disputas perdidas
- `Owner` (admin): Otorga badges KYC manualmente

**Beneficio para tenant**:
- Reputación portable entre diferentes propiedades
- Incentivo para pagar a tiempo (score sube)
- Acceso a mejores propiedades con buen score

---

### 2. PropertyRegistry.sol
**Tipo**: Registry de propiedades + NFT metadata
**Propósito**: Validar y trackear propiedades reales

**¿Por qué existe?**
Para evitar fraudes, necesitamos verificar que las propiedades son reales y que el landlord es el owner legítimo.

**Funcionalidad clave**:
- Landlord registra propiedad con:
  - Metadata: nombre, tipo, ubicación, cuartos, baños, m²
  - Amenities: pet-friendly, parking, gym, etc.
  - Terms & Conditions (IPFS hash)
  - GPS coordinates (para anti-duplicación)
- Sistema de verificación:
  - Propiedades inician como `isVerified = false`
  - Admin/Notario verifica y marca `isVerified = true`
  - Solo propiedades verificadas pueden tener agreements activos

**Ejemplo de uso**:
```solidity
// Landlord registra propiedad
uint256 propertyId = propertyRegistry.registerProperty(
  "Depa moderno en Del Valle",
  PropertyType.APARTMENT,  // 0=APARTMENT, 1=HOUSE, 2=ROOM, 3=STUDIO
  "Calle Insurgentes 123, CDMX",
  2, // 2 bedrooms
  1, // 1 bathroom
  65, // 65 m²
  ["pet-friendly", "parking", "gym"],
  termsIPFSHash
);

// Admin verifica después de revisar documentos
propertyRegistry.verifyProperty(propertyId, "Escrituras verificadas");

// Ahora isVerified = true
```

**Sistema de reputación de propiedad**:
- Score basado en:
  - Mantenimiento correcto
  - Resolución de problemas
  - Ratings de tenants anteriores
- Penalties por:
  - Disputas perdidas
  - Problemas reportados

**Beneficio para landlord**:
- Propiedad verificada = más confianza de tenants
- Score alto = más visibilidad en marketplace
- Histórico inmutable de la propiedad

---

### 3. DisputeResolver.sol
**Tipo**: Sistema de arbitraje descentralizado
**Propósito**: Resolver conflictos sin cortes tradicionales

**¿Por qué existe?**
Las disputas de renta en cortes son lentas (meses), costosas ($$$), y favorecen a quien tiene mejor abogado. RoomFi resuelve on-chain en ~14 días con árbitros neutros.

**Funcionalidad clave**:
- **Iniciar disputa** (cualquier parte):
  - Pagar fee: 10 USDT (evita spam)
  - Subir evidencia: IPFS hash (fotos, docs, mensajes)
  - Razón: Property Condition, Payment Issue, Early Termination, etc.

- **Responder** (contraparte):
  - 7 días para responder con su evidencia
  - Si no responde = pierde automáticamente

- **Votación de árbitros** (panel de 3):
  - 14 días para votar
  - Votan: PLAINTIFF_WINS, DEFENDANT_WINS, o SPLIT (50/50)
  - Mayoría simple gana

- **Resolución automática**:
  - Si plaintiff gana: recupera depósito + fees + penaliza al landlord
  - Si defendant gana: landlord retiene depósito + penaliza al tenant
  - Split: mitad para cada uno

**Ejemplo de uso**:
```solidity
// Tenant levanta disputa
rentalAgreementNFT.raiseDispute{value: 10 USDT}(
  agreementId,
  DisputeReason.PROPERTY_CONDITION,
  "ipfs://QmEvidencia123..."
);

// Landlord responde (7 días)
disputeResolver.respondToDispute(
  disputeId,
  "ipfs://QmContraEvidencia456..."
);

// 3 árbitros autorizados votan
disputeResolver.voteOnDispute(disputeId, PLAINTIFF_WINS);
disputeResolver.voteOnDispute(disputeId, PLAINTIFF_WINS);
disputeResolver.voteOnDispute(disputeId, DEFENDANT_WINS);
// 2 votos a favor de plaintiff = plaintiff gana

// Resolución automática ejecuta
disputeResolver.executeResolution(disputeId);
// - Depósito retornado al tenant
// - Score de landlord baja
// - Histórico registrado on-chain
```

**Sistema de árbitros**:
- Cualquiera puede convertirse en árbitro
- Requisitos:
  - Stakear 50 USDT (evita comportamiento malicioso)
  - Pasar verificación KYC/KYB (notarios, abogados, etc.)
- Incentivos:
  - Ganan fee por cada disputa resuelta (30% de los 10 USDT)
  - Si votan con mayoría = mantienen reputación
  - Si votan mal frecuentemente = pierden stake

**Beneficio para ambas partes**:
- Resolución rápida (14 días vs 6+ meses en corte)
- Económica (10 USDT vs $$$$ en abogados)
- Transparente (todo on-chain)
- Justo (panel de 3 árbitros)

---

### 4. RentalAgreementFactoryNFT.sol
**Tipo**: Factory pattern (EIP-1167 minimal proxy)
**Propósito**: Crear rental agreements de manera eficiente

**¿Por qué existe?**
Deploar un contrato completo por cada rental agreement costaría mucho gas. El factory usa clones (proxies) que apuntan a un implementation contract, ahorrando 90% del gas.

**Funcionalidad clave**:
- **Create agreement**:
  - Validaciones:
    - Propiedad existe y está verificada
    - Tenant tiene TenantPassport
    - Términos válidos (fecha inicio < fecha fin)
  - Mint NFT con agreementId único
  - Emite evento `AgreementCreated`

- **Tracking**:
  - `landlordAgreements[address]` = todos los agreements del landlord
  - `tenantAgreements[address]` = todos los agreements del tenant
  - `propertyAgreements[propertyId]` = agreements de una propiedad
  - `activeAgreementsCount` = agreements activos globalmente

- **Callbacks** (recibe notificaciones de RentalAgreementNFT):
  - `notifyAgreementActivated()`: cuando tenant paga depósito
  - `notifyAgreementCompleted()`: cuando termina el plazo
  - `notifyAgreementTerminated()`: cuando se cancela anticipadamente

**Ejemplo de uso**:
```solidity
// Tenant crea agreement para propiedad verificada
uint256 agreementId = factory.createAgreement(
  landlordAddress,
  msg.sender, // tenant
  propertyId,
  1500 * 1e6, // 1500 USDT monthly rent (6 decimals)
  3000 * 1e6, // 3000 USDT deposit (2 meses)
  block.timestamp + 30 days, // start date
  12, // duration in months
  termsIPFSHash
);

// Ahora el tenant puede ir a pagar el depósito
// Ver sección de RentalAgreementNFT
```

**Beneficio**:
- Gas efficiency (usa clones en lugar de deploy completo)
- Tracking centralizado de todos los agreements
- Validaciones en un solo lugar

---

### 5. RentalAgreementNFT.sol
**Tipo**: ERC721 NFT (transferible)
**Propósito**: Contrato de renta individual tokenizado

**¿Por qué existe?**
Tokenizar el rental agreement como NFT permite:
- Transferir/vender el contrato (liquidez)
- Colateralizar (usar como garantía en préstamos)
- Trackear ownership claramente
- Integrar con marketplaces

**Estados del agreement** (lifecycle):
```
PENDING → ACTIVE → COMPLETED
   ↓         ↓
TERMINATED ← ─────
```

**Flujo completo del agreement**:

#### **FASE 1: CREACIÓN** (status = PENDING)
```solidity
// Tenant crea via Factory (visto arriba)
uint256 agreementId = factory.createAgreement(...);

// Agreement existe pero NO está activo
// Tenant debe pagar depósito primero
```

#### **FASE 2: ACTIVACIÓN** (status = ACTIVE)
```solidity
// 1. Tenant aprueba USDT al agreement
usdt.approve(agreementNFT, depositAmount);

// 2. Tenant paga depósito
agreementNFT.payDeposit(agreementId);

// Internamente:
// - USDT transferido de tenant → RoomFiVault
// - Vault despliega 85% a yield strategy (USDY o Lendle)
// - Agreement marcado como depositPaid = true
// - Si depositPaid && block.timestamp >= startDate:
//     status cambia a ACTIVE
// - Factory recibe callback: notifyAgreementActivated()
// - Tenant puede mudarse a la propiedad
```

#### **FASE 3: PAGOS MENSUALES** (status = ACTIVE)
```solidity
// Cada mes (según paymentDay):
// Tenant aprueba renta + fees
usdt.approve(agreementNFT, monthlyRent);

// Paga renta
agreementNFT.payRent(agreementId);

// Internamente:
// - Calcula fees:
//     protocolFee = rent * 3% = 45 USDT
//     landlordNet = rent * 97% = 1455 USDT
// - USDT transferido:
//     tenant → protocol: 45 USDT
//     tenant → landlord: 1455 USDT
// - Actualiza métricas:
//     paidMonths++
//     totalPaid += rent
//     lastPaymentTime = block.timestamp
// - TenantPassport actualizado:
//     paymentsOnTime++ (si a tiempo)
//     latePayments++ (si tarde pero dentro de grace period)
//     missedPayments++ (si pasa grace period)
//     reputation ajustado (+10 si a tiempo, -20 si late, -50 si missed)

// Grace period: 5 días después de paymentDay
// Ejemplo: paymentDay = 1, entonces hasta día 6 se considera "late" pero no "missed"
```

#### **FASE 4A: TERMINACIÓN NORMAL** (status = COMPLETED)
```solidity
// Cuando llega endDate:
agreementNFT.completeAgreement(agreementId);

// Internamente:
// - Valida que endDate llegó
// - Valida que todos los pagos se hicieron
// - Withdraw depósito + yield del vault:
//     1. Vault.calculateUserYield(agreementId)
//        = yieldEarned (ejemplo: 180 USDT en 12 meses con 6% APY)
//     2. Split yield:
//        protocolYield = 180 * 30% = 54 USDT → protocol
//        tenantYield = 180 * 70% = 126 USDT → tenant
//     3. Transfer:
//        deposit (3000) + tenantYield (126) = 3126 USDT → tenant
// - Status = COMPLETED
// - Factory notificado: notifyAgreementCompleted()
// - TenantPassport actualizado:
//     totalAgreements++
//     totalMonthsRented += 12
//     reputation += 50 (bonus por completar contrato)
```

#### **FASE 4B: TERMINACIÓN ANTICIPADA** (status = TERMINATED)
```solidity
// Tenant o landlord puede terminar antes de endDate
agreementNFT.terminateAgreement(agreementId);

// Cálculo de penalización (depende de quién termina):
// Si TENANT termina:
//   - Pierde 1 mes de depósito (penalty)
//   - Recibe: (deposit - penalty) + yield proporcional
//   - Ejemplo: (3000 - 1500) + 90 = 1590 USDT
//   - Landlord recibe penalty: 1500 USDT
//
// Si LANDLORD termina:
//   - Debe pagar 1 mes de renta como penalty al tenant
//   - Tenant recibe: deposit + penalty + yield
//   - Ejemplo: 3000 + 1500 + 90 = 4590 USDT

// Reputación:
// - Terminaciones anticipadas bajan score
// - TenantPassport: reputation -= 30
// - PropertyRegistry: property score -= 20
```

#### **FASE 5: DISPUTA** (cualquier momento durante ACTIVE)
```solidity
// Cualquier parte puede levantar disputa
agreementNFT.raiseDispute{value: 10 USDT}(
  agreementId,
  reason,
  evidenceURI
);

// Internamente:
// - Status cambia temporalmente a DISPUTED
// - DisputeResolver toma control
// - Agreement pausado (no se pueden hacer pagos)
// - Después de resolución:
//     Si tenant gana → recibe depósito + yield + fees
//     Si landlord gana → retiene depósito
//     Status cambia a TERMINATED
```

**¿Qué hace especial al NFT?**
1. **Transferible**: Tenant puede vender el agreement a otro tenant
   ```solidity
   // Tenant original vende NFT a nuevo tenant
   agreementNFT.transferFrom(oldTenant, newTenant, agreementId);
   // Ahora newTenant debe pagar las rentas
   ```

2. **Colateralizable**: Puede usarse en protocolos de lending
   ```solidity
   // Tenant usa agreement NFT como colateral para préstamo
   lendingProtocol.borrowAgainstNFT(agreementNFT, agreementId);
   ```

3. **Metadata on-chain**: Información del agreement está en el NFT
   ```solidity
   string memory tokenURI = agreementNFT.tokenURI(agreementId);
   // Retorna JSON con toda la info del agreement
   ```

**Beneficio**:
- Tenant: Puede salir del contrato vendiéndolo (liquidez)
- Landlord: Certeza de pago (el nuevo tenant debe honrar términos)
- Protocol: Más liquidez = más uso de la plataforma

---

### 6. RoomFiVault.sol
**Tipo**: Yield-bearing vault
**Propósito**: Generar rendimientos en depósitos de seguridad

**¿Por qué existe?**
En rentas tradicionales, el depósito de seguridad queda inmovilizado sin generar nada. RoomFi lo invierte en DeFi protocols (Lendle, USDY) para generar 6-12% APY que beneficia al tenant y al protocol.

**Funcionalidad clave**:

#### **Deposit Flow**:
```solidity
// RentalAgreementNFT llama cuando tenant paga depósito
vault.deposit(agreementAddress, 3000 * 1e6); // 3000 USDT

// Internamente:
// 1. Recibe 3000 USDT del agreement
// 2. Calcula split:
//      toStrategy = 3000 * 85% = 2550 USDT (deploy a DeFi)
//      buffer = 3000 * 15% = 450 USDT (mantener en vault para liquidez)
// 3. Deploy a strategy activa:
//      strategy.deposit(2550 USDT)
//      - Si strategy = USDY: swap USDT → USDY via DEX
//      - Si strategy = Lendle: supply USDT → aUSDT (interest-bearing)
// 4. Tracking:
//      deposits[agreementAddress] += 3000
//      depositTime[agreementAddress] = block.timestamp
```

#### **Yield Accumulation** (automático):
```solidity
// El yield se genera automáticamente en DeFi:
// USDY Strategy: Balance de USDY crece con el tiempo (4.29% APY)
// Lendle Strategy: aUSDT balance crece con el tiempo (~6% APY)

// Cálculo de yield:
function calculateUserYield(address user) public view returns (uint256) {
  uint256 userDeposit = deposits[user];
  uint256 timeElapsed = block.timestamp - depositTime[user];

  // Obtener balance actual en strategy
  uint256 currentValue = strategy.balanceOf(user);

  // Yield = currentValue - userDeposit
  uint256 totalYield = currentValue > userDeposit
    ? currentValue - userDeposit
    : 0;

  // Split: 70% user, 30% protocol
  uint256 protocolFee = totalYield * 30 / 100;
  uint256 userYield = totalYield - protocolFee;

  return userYield;
}

// Ejemplo real:
// - Depósito: 3000 USDT
// - Tiempo: 365 días
// - APY: 6%
// - Yield total: 3000 * 6% = 180 USDT
// - Protocol (30%): 54 USDT
// - User (70%): 126 USDT
```

#### **Withdraw Flow**:
```solidity
// RentalAgreementNFT llama cuando agreement completa
vault.withdraw(agreementAddress, 3000 * 1e6);

// Internamente:
// 1. Calcula yield del usuario
uint256 userYield = calculateUserYield(agreementAddress);

// 2. Withdraw de strategy:
//      strategy.withdraw(depositAmount + totalYield)
//      - USDY Strategy: swap USDY → USDT via DEX
//      - Lendle Strategy: redeem aUSDT → USDT
// 3. Split yield:
uint256 protocolFee = totalYield * 30 / 100;
uint256 userAmount = depositAmount + userYield;

// 4. Transfers:
usdt.transfer(agreementAddress, userAmount); // deposit + 70% yield
accumulatedProtocolFees += protocolFee; // 30% yield

// 5. Update tracking:
deposits[agreementAddress] = 0;
yieldWithdrawn[agreementAddress] += userYield;
```

#### **Strategy Management**:
```solidity
// Owner puede cambiar strategy activa
vault.updateStrategy(lendleStrategyAddress);

// Proceso:
// 1. Withdraw TODOS los fondos de strategy actual
// 2. Set nueva strategy
// 3. Re-deploy fondos a nueva strategy
// 4. Emit StrategyUpdated event

// Usuarios no pierden fondos durante el cambio
```

**Emergency Functions**:
```solidity
// Si hay bug en strategy, owner puede pausar y hacer emergency withdraw
vault.emergencyPause(); // Pausa deposits/withdraws
vault.emergencyWithdrawFromStrategy(); // Saca todo de DeFi a vault
// Fondos seguros en el vault hasta resolver el issue
```

**Beneficio**:
- **Tenant**: Gana 70% del yield (126 USDT en el ejemplo)
- **Protocol**: Gana 30% del yield (54 USDT en el ejemplo)
- **Landlord**: Seguridad de que el depósito está respaldado

---

### 7. USDYStrategy.sol
**Tipo**: Yield strategy (implementa IYieldStrategy)
**Propósito**: Generar yield invirtiendo en USDY (Ondo Finance)

**¿Por qué existe?**
USDY es un token respaldado por US Treasury bonds (bonos del gobierno de EEUU), que genera ~4.29% APY. Es uno de los yields más seguros en crypto porque está respaldado por el gobierno de EEUU.

**¿Cómo funciona USDY?**
USDY es un "accumulating token" - su balance crece automáticamente:
```solidity
// Día 1: Tienes 1000 USDY
usdy.balanceOf(address(this)) = 1000 * 1e18

// Día 365: Balance creció automáticamente
usdy.balanceOf(address(this)) = 1042.9 * 1e18 // +4.29%
// No necesitas hacer nada, el balance crece solo
```

**Funcionamiento de la strategy**:

#### **Deposit**:
```solidity
function deposit(uint256 usdtAmount) external {
  // 1. Recibe 2550 USDT del vault
  usdt.transferFrom(vault, address(this), 2550 * 1e6);

  // 2. Swap USDT → USDY via DEX (Merchant Moe / Aurelius)
  usdt.approve(dexRouter, 2550 * 1e6);

  uint256 usdyReceived = dexRouter.swapExactTokensForTokens(
    2550 * 1e6, // USDT amount
    minUSDY, // Min output (con slippage tolerance 2%)
    [usdt, usdy], // Path
    address(this),
    deadline
  );

  // 3. Ahora tenemos ~2550 USDY (ajustado por decimals)
  // 4. USDY balance crece automáticamente
  totalDeployed += 2550 * 1e6;
}
```

#### **Harvest Yield**:
```solidity
function harvestYield() external returns (uint256) {
  // 1. Check current USDY balance
  uint256 currentUSDY = usdy.balanceOf(address(this));

  // 2. Convert to USDT value
  uint256 currentValueUSDT = _getUSDYValueInUSDT(currentUSDY);
  // Ejemplo: 2659 USDT (creció de 2550)

  // 3. Calculate yield
  uint256 netDeposits = totalDeployed - totalWithdrawn;
  uint256 yieldEarned = currentValueUSDT - netDeposits;
  // Ejemplo: 2659 - 2550 = 109 USDT de yield

  return yieldEarned;
}
```

#### **Withdraw**:
```solidity
function withdraw(uint256 usdtAmount) external returns (bytes32) {
  // 1. Calculate how much USDY to sell
  uint256 usdyToSwap = _calculateUSDYNeeded(usdtAmount);

  // 2. Swap USDY → USDT via DEX
  usdy.approve(dexRouter, usdyToSwap);

  uint256 usdtReceived = dexRouter.swapExactTokensForTokens(
    usdyToSwap,
    minUSDT,
    [usdy, usdt],
    address(this),
    deadline
  );

  // 3. Transfer USDT back to vault
  usdt.transfer(vault, usdtAmount);

  totalWithdrawn += usdtAmount;
  return withdrawId;
}
```

**Ventajas de USDY**:
- ✅ Yield estable y predecible (4.29%)
- ✅ Respaldado por gobierno de EEUU (muy bajo riesgo)
- ✅ Accumulating token (no necesitas hacer claim)
- ✅ Disponible nativamente en Mantle Network

**Riesgos**:
- ⚠️ Depende de liquidez en DEX (slippage en swaps)
- ⚠️ APY menor que Lendle (~4.29% vs ~6%)
- ⚠️ Depende de Ondo Finance (riesgo de contrato)

---

### 8. LendleYieldStrategy.sol
**Tipo**: Yield strategy (implementa IYieldStrategy)
**Propósito**: Generar yield invirtiendo en Lendle Protocol

**¿Por qué existe?**
Lendle es un fork de Aave V3 en Mantle Network. Permite "supply" USDT y recibir aUSDT (interest-bearing token) que genera ~6% APY. Es más alto que USDY pero con más riesgo smart contract.

**¿Cómo funciona Lendle?**
```solidity
// 1. Depositas USDT en Lendle Pool
lendlePool.supply(usdt, 1000 USDT, address(this), 0);

// 2. Recibes aUSDT (1:1 ratio)
aUSDT.balanceOf(address(this)) = 1000 aUSDT

// 3. aUSDT balance crece con el tiempo (liquidity index)
// Día 1: 1000 aUSDT = 1000 USDT
// Día 365: 1000 aUSDT = 1060 USDT (+6%)

// 4. Withdraw convirtiendo aUSDT → USDT
lendlePool.withdraw(usdt, type(uint256).max, address(this));
// Recibes 1060 USDT
```

**Funcionamiento de la strategy**:

#### **Deposit**:
```solidity
function deposit(uint256 usdtAmount) external {
  // 1. Recibe 2550 USDT del vault
  usdt.transferFrom(vault, address(this), 2550 * 1e6);

  // 2. Approve Lendle Pool
  usdt.approve(lendlePool, 2550 * 1e6);

  // 3. Supply to Lendle
  lendlePool.supply(
    usdt,
    2550 * 1e6,
    address(this),
    0 // referral code
  );

  // 4. Ahora tenemos 2550 aUSDT
  // 5. aUSDT balance crece automáticamente
  totalDeployed += 2550 * 1e6;
}
```

#### **Balance tracking**:
```solidity
function balanceOf(address) external view returns (uint256) {
  // Get aUSDT balance (already includes accrued interest)
  uint256 aTokenBalance = aToken.balanceOf(address(this));
  return aTokenBalance; // En términos de USDT
}
```

#### **Withdraw**:
```solidity
function withdraw(uint256 usdtAmount) external returns (bytes32) {
  // 1. Withdraw de Lendle (convierte aUSDT → USDT)
  uint256 withdrawn = lendlePool.withdraw(
    usdt,
    usdtAmount,
    vault // recipient
  );

  // 2. aUSDT quemados automáticamente
  // 3. USDT enviado directamente al vault

  totalWithdrawn += usdtAmount;
  return withdrawId;
}
```

**Harvest**:
```solidity
function harvestYield() external returns (uint256) {
  // 1. Current aUSDT balance (includes interest)
  uint256 currentBalance = aToken.balanceOf(address(this));

  // 2. Calculate yield
  uint256 netDeposits = totalDeployed - totalWithdrawn;
  uint256 yieldEarned = currentBalance > netDeposits
    ? currentBalance - netDeposits
    : 0;

  return yieldEarned;
}
```

**Ventajas de Lendle**:
- ✅ APY más alto (~6% vs 4.29% de USDY)
- ✅ No requiere swaps (directo USDT ↔ aUSDT)
- ✅ Protocolo battle-tested (fork de Aave)
- ✅ Mayor eficiencia de gas

**Riesgos**:
- ⚠️ Riesgo de smart contract de Lendle
- ⚠️ Riesgo de exploit (histórico de hacks en forks de Aave)
- ⚠️ APY variable (puede bajar si hay menos demanda)
- ⚠️ Risk de liquidación si el pool pierde fondos

**¿Cuál strategy elegir?**
- **USDY**: Si prefieres seguridad y estabilidad (menor APY pero respaldado por EEUU)
- **Lendle**: Si prefieres mayor rendimiento (mayor APY pero más riesgo)

El vault owner puede cambiar entre strategies en cualquier momento sin afectar a los usuarios.

---

## 🌊 FLUJOS COMPLETOS DE USUARIO

### FLUJO 1: LANDLORD PUBLICA PROPIEDAD

**Objetivo**: Landlord quiere rentar su departamento

**Pasos**:

1. **Conectar wallet** (MetaMask en Mantle Sepolia)

2. **Mint TenantPassport** (si no tiene)
   ```solidity
   tenantPassport.mintForSelf();
   // Gas: ~50,000 gas (~0.001 MNT)
   ```

3. **Registrar propiedad en PropertyRegistry**
   ```solidity
   propertyRegistry.registerProperty(
     "Depa 2 cuartos en Roma Norte",
     PropertyType.APARTMENT,
     "Calle Álvaro Obregón 123, CDMX",
     2, // bedrooms
     1, // bathrooms
     55, // m²
     ["pet-friendly", "rooftop"],
     "ipfs://QmTerms123..."
   );
   // Gas: ~200,000 gas (~0.004 MNT)
   // propertyId = 1 retornado
   ```

4. **Solicitar verificación** (opcional pero recomendado)
   - Upload documentos (escrituras, RFC, etc.) a IPFS
   - Submit verificación request (puede ser off-chain)
   - Admin/Notario revisa y aprueba
   ```solidity
   propertyRegistry.verifyProperty(1, "Escrituras válidas");
   // Solo admin puede hacer esto
   ```

5. **Publicar en marketplace** (frontend)
   - Propiedad ahora visible para tenants
   - Tenants pueden ver:
     - Fotos, descripción, amenities
     - Score de reputación del landlord
     - Si está verificada o no

**Costo total para landlord**: ~0.005 MNT (~$0.01 USD)

---

### FLUJO 2: TENANT RENTA PROPIEDAD

**Objetivo**: Tenant encuentra propiedad y quiere rentarla por 12 meses

**Pre-requisitos**:
- Tenant tiene USDT suficiente (depósito + 1 mes de renta)
- Tenant tiene MNT para gas

**Pasos**:

#### **PASO 1: Setup inicial**

```solidity
// 1.1 Mint TenantPassport
tenantPassport.mintForSelf();
// Gas: ~50,000 gas

// 1.2 (Opcional) Solicitar badges KYC para mejor reputación
// Frontend: Upload INE, comprobante de ingresos a servidor
// Admin: Otorga badges manualmente
tenantPassport.grantBadge(tenantAddress, BadgeType.VERIFIED_ID);
tenantPassport.grantBadge(tenantAddress, BadgeType.VERIFIED_INCOME);
```

#### **PASO 2: Crear Rental Agreement**

```solidity
// 2.1 Tenant ve propiedad en marketplace y da click en "Rentar"
// Frontend construye parámetros:
uint256 propertyId = 1;
address landlord = 0xLandlordAddress;
address tenant = msg.sender;
uint256 monthlyRent = 1500 * 1e6; // 1500 USDT
uint256 depositAmount = 3000 * 1e6; // 2 meses de depósito
uint256 startDate = block.timestamp + 7 days; // Inicia en 7 días
uint256 durationMonths = 12;
string memory termsHash = "ipfs://QmTerms...";

// 2.2 Create agreement via Factory
uint256 agreementId = factory.createAgreement(
  landlord,
  tenant,
  propertyId,
  monthlyRent,
  depositAmount,
  startDate,
  durationMonths,
  termsHash
);
// Gas: ~300,000 gas (~0.006 MNT)
// Retorna agreementId = 1

// 2.3 Agreement creado pero status = PENDING
// Tenant recibe NFT con agreementId
```

#### **PASO 3: Pagar depósito (Activar agreement)**

```solidity
// 3.1 Approve USDT al RentalAgreementNFT
usdt.approve(rentalAgreementNFT, 3000 * 1e6);
// Gas: ~45,000 gas

// 3.2 Pay deposit
rentalAgreementNFT.payDeposit(agreementId);

// Internamente sucede:
// - USDT (3000) transferido: tenant → RoomFiVault
// - Vault split:
//     85% (2550 USDT) → USDYStrategy.deposit()
//     15% (450 USDT) → buffer en vault
// - USDYStrategy:
//     Swap 2550 USDT → 2550 USDY via DEX
//     USDY comienza a acumular yield (4.29% APY)
// - Agreement status: PENDING → ACTIVE
// - TenantPassport: activeAgreements++
// - Factory: activeAgreementsCount++

// Gas: ~500,000 gas (~0.01 MNT)
```

#### **PASO 4: Tenant se muda (off-chain)**

- Tenant visita propiedad con landlord
- Hace inspección de entrada
- Recibe llaves
- Se muda

#### **PASO 5: Pagar rentas mensuales (12 meses)**

**Cada mes en el paymentDay**:

```solidity
// Mes 1 (ejemplo: día 1 de cada mes)
usdt.approve(rentalAgreementNFT, 1500 * 1e6);
rentalAgreementNFT.payRent(agreementId);

// Internamente:
// - Calcula fees:
//     protocolFee = 1500 * 3% = 45 USDT
//     landlordNet = 1500 - 45 = 1455 USDT
// - Transfers:
//     tenant → protocol: 45 USDT
//     tenant → landlord: 1455 USDT
// - Updates:
//     paidMonths++ (ahora = 1)
//     totalPaid += 1500
//     lastPaymentTime = block.timestamp
// - TenantPassport update:
//     paymentsOnTime++ (si pagó antes del día 6)
//     reputation += 10 puntos
//     consecutiveOnTimePayments++

// Gas: ~150,000 gas (~0.003 MNT)

// Repetir cada mes por 12 meses
// Costo total en fees: 45 USDT * 12 = 540 USDT
```

**Si paga tarde pero antes de grace period (día 6)**:
- Se marca como "late payment"
- Reputation -= 5 (penalty menor)
- consecutiveOnTimePayments = 0 (reinicia)

**Si no paga después de grace period (día 7+)**:
- Se marca como "missed payment"
- Reputation -= 50 (penalty severa)
- Landlord puede iniciar terminación o disputa

#### **PASO 6: Completar agreement (después de 12 meses)**

```solidity
// Cuando block.timestamp >= endDate:
rentalAgreementNFT.completeAgreement(agreementId);

// Internamente:
// 1. Valida:
//     - Todos los 12 pagos hechos (paidMonths == 12)
//     - endDate alcanzado
// 2. Calcula yield:
//     depositAmount = 3000 USDT
//     timeElapsed = 365 days
//     APY = 4.29% (USDY strategy)
//     totalYield = 3000 * 0.0429 = 128.7 USDT
//     protocolYield = 128.7 * 30% = 38.61 USDT
//     tenantYield = 128.7 * 70% = 90.09 USDT
// 3. Withdraw del vault:
//     vault.withdraw(agreementAddress, 3000)
//     - Strategy convierte USDY → USDT
//     - Returns: deposit (3000) + tenantYield (90.09) = 3090.09 USDT
// 4. Transfers:
//     vault → tenant: 3090.09 USDT
//     vault → protocol: 38.61 USDT (queda acumulado)
// 5. Status change:
//     status = COMPLETED
// 6. Updates:
//     TenantPassport:
//       - totalAgreements++
//       - totalMonthsRented += 12
//       - totalRentPaid += 18000 (12 * 1500)
//       - reputation += 50 (bonus por completar)
//     PropertyRegistry:
//       - landlordReputation += 30
//     Factory:
//       - activeAgreementsCount--

// Gas: ~400,000 gas (~0.008 MNT)
```

**Resultado final para tenant**:
- ✅ Vivió 12 meses
- ✅ Recuperó depósito: 3000 USDT
- ✅ Ganó yield: 90.09 USDT (3% rendimiento)
- ✅ Reputación aumentó: score += 170 puntos
- ✅ Badges ganados: "Reliable Tenant", "Long-term Tenant"

**Costo total para tenant**:
- Rentas: 18,000 USDT (12 * 1500)
- Fees protocol: 540 USDT (3% de rentas)
- Gas: ~0.03 MNT (~$0.60 USD total)
- **PERO recuperó**: 90.09 USDT de yield
- **Costo neto de fees**: 540 - 90.09 = 449.91 USDT (~2.5% en lugar de 3%)

---

### FLUJO 3: RESOLUCIÓN DE DISPUTA

**Escenario**: Tenant reporta que el aire acondicionado no funciona y landlord no lo arregla

**Pasos**:

#### **DÍA 0: Tenant levanta disputa**

```solidity
// 1. Tenant sube evidencia a IPFS
string memory evidenceURI = "ipfs://QmDisputa123/";
// Contiene: fotos del AC roto, mensajes con landlord, video

// 2. Tenant paga fee y levanta disputa
rentalAgreementNFT.raiseDispute{value: 10 * 1e6}(
  agreementId,
  DisputeReason.PROPERTY_CONDITION,
  evidenceURI
);

// Internamente:
// - 10 USDT transferidos: tenant → DisputeResolver
// - Disputa creada:
//     disputeId = 1
//     status = PENDING_RESPONSE
//     initiator = tenant
//     respondent = landlord
//     responseDeadline = block.timestamp + 7 days
// - Agreement status: ACTIVE → DISPUTED (pausado)
// - 3 árbitros asignados aleatoriamente del pool

// Gas: ~200,000 gas
```

#### **DÍA 3: Landlord responde**

```solidity
// Landlord sube su evidencia
string memory responseURI = "ipfs://QmRespuesta456/";
// Contiene: fotos del AC funcionando (antes de que tenant lo rompiera),
//           mensajes donde tenant admitió que lo dañó, etc.

disputeResolver.respondToDispute(disputeId, responseURI);

// Internamente:
// - Respuesta registrada
// - Status: PENDING_RESPONSE → IN_ARBITRATION
// - votingDeadline = block.timestamp + 14 days
// - Notifica a los 3 árbitros

// Gas: ~100,000 gas
```

#### **DÍA 5-10: Árbitros votan**

```solidity
// Árbitro 1 revisa evidencia y vota
disputeResolver.voteOnDispute(disputeId, true); // true = a favor de tenant
// Gas: ~80,000 gas

// Árbitro 2 vota
disputeResolver.voteOnDispute(disputeId, false); // false = a favor de landlord

// Árbitro 3 vota
disputeResolver.voteOnDispute(disputeId, true); // a favor de tenant

// Votos: 2 a favor de tenant, 1 a favor de landlord
// Tenant gana por mayoría
```

#### **DÍA 11: Resolución ejecutada**

```solidity
// Cualquiera puede ejecutar la resolución (después de que 2+ árbitros votaron)
disputeResolver.executeResolution(disputeId);

// Internamente:
// 1. Determina ganador: RESOLVED_TENANT (2 votos vs 1)
// 2. Ejecuta penalty:
//     - Tenant recupera:
//         deposit: 3000 USDT
//         yield: 45 USDT (proporcional a 5 meses)
//         dispute fee: 10 USDT
//         penalty del landlord: 1500 USDT (1 mes de renta)
//         TOTAL: 4555 USDT
//     - Landlord pierde: 1500 USDT
// 3. Reputation updates:
//     TenantPassport:
//       - reputation += 20 (ganó disputa)
//       - disputesWon++
//     PropertyRegistry:
//       - landlordReputation -= 50
//       - propertyScore -= 30
//       - disputesLost++
// 4. Agreement termination:
//     status = TERMINATED
// 5. Árbitros reciben rewards:
//     - Cada árbitro que votó con mayoría: 10 USDT / 3 = 3.33 USDT
//     - Árbitro que votó mal: 0 USDT

// Gas: ~300,000 gas
```

**Resultado**:
- ✅ Tenant recuperó todo + penalty + fee: 4555 USDT
- ✅ Resolución en 11 días (vs 6+ meses en corte)
- ✅ Costo: 10 USDT (vs $$$$ en abogados)
- ✅ Transparente: Todo on-chain
- ❌ Landlord penalizado justamente
- ⚠️ Ambos pueden ver el histórico forever on-chain

---

## 💰 ECONOMÍA DEL PROTOCOLO

### Ingresos del Protocol

**Fuente 1: Fees en pagos de renta (3%)**
```
Rent payment = 1500 USDT
Protocol fee = 1500 * 3% = 45 USDT
Landlord net = 1455 USDT

Por agreement de 12 meses:
  Ingresos protocol = 45 * 12 = 540 USDT
```

**Fuente 2: Yield split (30%)**
```
Deposit = 3000 USDT
Tiempo = 12 meses
APY = 6% (Lendle)
Total yield = 3000 * 6% = 180 USDT

Split:
  Protocol (30%) = 54 USDT
  Tenant (70%) = 126 USDT
```

**Fuente 3: Dispute fees**
```
Por cada disputa iniciada:
  Fee = 10 USDT

Split:
  Protocol (70%) = 7 USDT
  Árbitros (30%) = 3 USDT (dividido entre 3 = 1 USDT c/u)
```

**Ingresos totales por agreement de 12 meses**:
```
Rent fees:     540 USDT
Yield split:    54 USDT
TOTAL:         594 USDT

Con 100 agreements activos:
  Ingresos anuales = 594 * 100 = 59,400 USDT

Con 1,000 agreements activos:
  Ingresos anuales = 594 * 1,000 = 594,000 USDT
```

---

## 🎯 VENTAJAS COMPETITIVAS vs Rentas Tradicionales

| Aspecto | Tradicional | RoomFi V2 |
|---------|-------------|-----------|
| **Depósito** | 0% rendimiento | 6-12% APY en DeFi |
| **Reputación** | No portable | NFT on-chain portable |
| **Disputas** | 6+ meses, $$$$ | 14 días, 10 USDT |
| **Verificación** | Manual, lento | On-chain + badges |
| **Transparencia** | Opaco | 100% on-chain |
| **Liquidez** | Depósito bloqueado | NFT tradeable |
| **Fees** | Comisiones altas | 3% rentas + 30% yield |

---

## 🚀 ROADMAP FUTURO

### Fase 1: MVP (Current)
- ✅ Contratos core en Mantle Sepolia
- ✅ USDY + Lendle strategies
- ✅ Sistema de disputas
- ✅ TenantPassport con badges

### Fase 2: Mainnet Launch
- [ ] Deploy a Mantle Mainnet
- [ ] Integrar USDT/USDC real
- [ ] Verificación KYC real (Civic, Onfido)
- [ ] Marketplace frontend completo

### Fase 3: Liquidez
- [ ] RentalAgreementNFT marketplace (secundario)
- [ ] Integración con OpenSea
- [ ] Fractional ownership de agreements
- [ ] Lending contra NFTs (Arcade, NFTfi)

### Fase 4: Cross-chain
- [ ] Hyperbridge integration (Polkadot ↔ Mantle)
- [ ] Agreements cross-chain
- [ ] Multi-currency support

### Fase 5: RWA Expansion
- [ ] Tokenizar propiedades completas (no solo agreements)
- [ ] Fractional property ownership
- [ ] Property DAOs

---

## ✅ CHECKLIST PARA EL PITCH

Cuando presentes RoomFi, asegúrate de mencionar:

✅ **Problema claro**: Depósitos sin yield + falta de reputación + disputas lentas
✅ **Solución concreta**: Vault con 6-12% APY + TenantPassport + arbitraje 14 días
✅ **Mantle advantage**: USDY nativo + Lendle + bajas fees
✅ **Tokenomics**: 3% rent fees + 30% yield = sustainable revenue
✅ **Traction potential**: 594 USDT/agreement/año * 1000 agreements = 594k USD/año
✅ **Technical innovation**: NFT agreements + dual strategies + cross-chain ready
✅ **Market size**: $2.5T mercado de rentas en Latam, empezando con México

---

**FIN DEL DOCUMENTO**

Este documento explica TODO el flujo de RoomFi V2. Úsalo para:
- Entender cómo funciona cada contrato
- Explicar el producto en el hackathon
- Onboarding de nuevos developers
- Documentación para inversores

**Última actualización**: 7 de Enero de 2026
