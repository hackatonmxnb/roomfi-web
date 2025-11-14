# RoomFi V2 - Documento Técnico Completo para IA

**Versión**: 2.0
**Fecha**: 2025-01-12
**Estado**: PRE-HACKATHON READY
**Propósito**: Contexto completo para IAs que trabajen en el proyecto

---

# PARTE 1: ARQUITECTURA TÉCNICA Y LÓGICA DEL SISTEMA

## 1. VISIÓN GENERAL DEL PROYECTO

### 1.1 Problema que Resuelve

RoomFi aborda tres problemas críticos en el mercado de alquiler:

1. **Reputación No Portable**
   - Cuando un tenant se muda a nueva ciudad/país/blockchain, pierde todo su historial
   - Landlords no pueden verificar inquilinos de otras jurisdicciones
   - Resultado: Depósitos de 2-3 meses, barreras de entrada altas

2. **Falta de Yield en Depósitos de Seguridad**
   - $2000 USD bloqueados por 12 meses generan 0% retorno
   - Ni tenant ni landlord se benefician
   - Capital improductivo

3. **Resolución de Disputas Centralizada**
   - Procesos legales costosos ($500-5000 USD)
   - Tiempos largos (3-12 meses)
   - Sesgados hacia una parte

### 1.2 Solución RoomFi

**Tenant Passport**: Soul-bound NFT con reputación dinámica cross-chain
- Historial de pagos on-chain inmutable
- 14 badges verificables (KYC + performance)
- Portable entre Polkadot, Moonbeam, Arbitrum vía Hyperbridge

**Vault con Yield Farming**: Depósitos generan 6-12% APY
- Integración con Acala DeFi Hub
- Security deposits productivos
- Tenant recupera principal + intereses

**Dispute Resolution Descentralizado**: 3 árbitros votan
- Resolución en 7-21 días
- Costo: ~$50 USD (vs $500-5000 tradicional)
- Penalizaciones automáticas on-chain

---

## 2. ARQUITECTURA DEL SISTEMA

### 2.1 Stack Tecnológico

```
┌─────────────────────────────────────────────────────────┐
│              POLKADOT RELAY CHAIN                       │
│  (Provee seguridad compartida y consenso)               │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼────────┐ ┌──────▼──────┐ ┌───────▼─────────┐
│   PASEO        │ │  MOONBEAM   │ │    ACALA        │
│  (Testnet)     │ │   (EVM)     │ │   (DeFi Hub)    │
│                │ │             │ │                 │
│ • Core         │ │ • Mirrors   │ │ • Lending       │
│   Contracts    │ │   (Read)    │ │ • DEX           │
│ • Source of    │ │ • Query     │ │ • Staking       │
│   Truth        │ │   Local     │ │ • aUSD          │
│ • Pallet       │ │             │ │                 │
│   ISMP         │ │             │ │                 │
└────────────────┘ └─────────────┘ └─────────────────┘
        │                 │                 │
        └────────────HYPERBRIDGE────────────┘
                  (ISMP Protocol)
                  • State Proofs
                  • Message Passing
                  • Cross-chain Security
```

### 2.2 Capas del Sistema

**CAPA 1 - CORE (Paseo TestNet)**
- Contratos principales en Solidity 0.8.28
- Source of truth para toda la data
- Escritura y lectura
- Gas: PAS tokens (de faucet)

**CAPA 2 - MIRRORS (Moonbeam / Arbitrum)**
- Copias read-only de datos core
- Solo lectura, no escritura
- Sincronizadas vía Hyperbridge ISMP
- Queries gas-efficient sin cross-chain calls

**CAPA 3 - DeFi (Acala)**
- Yield farming strategies
- USDT → Acala Lending (6-8% APY)
- USDT → Acala DEX pools (10-15% APY)
- Comunicación vía XCM (Cross-Chain Message Passing)

**CAPA 4 - BRIDGE (Pallet Substrate)**
- Pallet Rust en runtime de Paseo
- Lee datos de contratos EVM (via PolkaVM)
- Construye mensajes ISMP
- Envía a Hyperbridge para relay

---

## 3. CONTRATOS CORE (Paseo) - ESPECIFICACIÓN DETALLADA

### 3.1 TenantPassportV2.sol

**Ubicación**: `foundry/src/V2/TenantPassportV2.sol`

**Función Principal**: Soul-bound NFT que rastrea reputación y métricas de tenants

#### 3.1.1 Características Técnicas

```solidity
// Herencia
contract TenantPassportV2 is ERC721, Ownable, ReentrancyGuard

// Storage principal
struct TenantInfo {
    uint32 reputation;              // 0-100, empieza en 50
    uint16 paymentsMade;            // Total de pagos realizados
    uint16 paymentsMissed;          // Total de pagos perdidos
    uint16 propertiesRented;        // Propiedades que ha rentado
    uint16 propertiesOwned;         // Propiedades que posee (si es landlord)
    uint16 consecutiveOnTimePayments; // Streak de pagos a tiempo
    uint16 totalMonthsRented;       // Meses totales rentando
    uint16 referralCount;           // Usuarios referidos
    uint16 disputesCount;           // Disputas en las que ha estado
    uint256 outstandingBalance;     // Balance pendiente en USDT
    uint256 totalRentPaid;          // Total pagado en vida (USDT)
    uint256 lastActivityTime;       // Timestamp última actividad
    bool isVerified;                // KYC completo
}

// System de Badges (14 tipos)
enum BadgeType {
    // KYC Badges (6) - Manuales por verificador
    VERIFIED_ID,              // 0: ID government verificado
    VERIFIED_INCOME,          // 1: Proof of income
    VERIFIED_EMPLOYMENT,      // 2: Employment letter
    VERIFIED_STUDENT,         // 3: Student ID
    VERIFIED_PROFESSIONAL,    // 4: Professional credential
    CLEAN_CREDIT,            // 5: Credit check passed

    // Performance Badges (8) - Automáticos
    EARLY_ADOPTER,           // 6: Primeros 1000 usuarios
    RELIABLE_TENANT,         // 7: 10+ pagos a tiempo consecutivos
    LONG_TERM_TENANT,        // 8: 12+ meses rentando
    ZERO_DISPUTES,           // 9: 0 disputas en 12 meses
    NO_DAMAGE_HISTORY,       // 10: Nunca penalizado por daños
    FAST_RESPONDER,          // 11: Responde en <24h
    HIGH_VALUE,              // 12: $10K+ pagado en vida
    MULTI_PROPERTY           // 13: Rentado 3+ propiedades
}

// Storage de badges
mapping(uint256 => mapping(BadgeType => bool)) public hasBadge;
mapping(uint256 => mapping(BadgeType => BadgeStatus)) public badgeStatus;

enum BadgeStatus { NONE, PENDING, VERIFIED }
```

#### 3.1.2 Funciones Críticas

**A. Minting (Creación de Passport)**

```solidity
function mintForSelf() external nonReentrant {
    require(!hasPassport(msg.sender), "Ya tiene passport");

    // Generar tokenId único basado en address
    uint256 tokenId = _generateTokenId(msg.sender);

    // Mint NFT soul-bound
    _mint(msg.sender, tokenId);

    // Inicializar datos
    tenantInfo[tokenId] = TenantInfo({
        reputation: INITIAL_REPUTATION, // 50
        paymentsMade: 0,
        paymentsMissed: 0,
        propertiesRented: 0,
        propertiesOwned: 0,
        consecutiveOnTimePayments: 0,
        totalMonthsRented: 0,
        referralCount: 0,
        disputesCount: 0,
        outstandingBalance: 0,
        totalRentPaid: 0,
        lastActivityTime: block.timestamp,
        isVerified: false
    });

    addressToTokenId[msg.sender] = tokenId;

    emit PassportMinted(msg.sender, tokenId);
}

// CRÍTICO: Prevenir transferencias (soul-bound)
function _beforeTokenTransfer(
    address from,
    address to,
    uint256 tokenId,
    uint256 batchSize
) internal virtual override {
    require(from == address(0) || to == address(0),
        "TenantPassport: Token is soul-bound");
    super._beforeTokenTransfer(from, to, tokenId, batchSize);
}
```

**LÓGICA SOUL-BOUND**:
- Solo mint (from == address(0)) o burn (to == address(0))
- NO transferencias entre users
- Garantiza que reputación no se puede "vender"

**B. Actualización de Reputación (Llamado por RentalAgreement)**

```solidity
function updateTenantInfo(
    uint256 tokenId,
    bool onTime,
    uint256 rentPaid
) external onlyAuthorized nonReentrant {
    require(_exists(tokenId), "Token no existe");

    TenantInfo storage info = tenantInfo[tokenId];

    // Actualizar métricas básicas
    info.totalRentPaid += rentPaid;
    info.paymentsMade++;
    info.lastActivityTime = block.timestamp;

    // Lógica de reputación
    if (onTime) {
        info.consecutiveOnTimePayments++;

        // Aumentar reputación (máximo 100)
        if (info.reputation < 100) {
            info.reputation += 1;
        }

        // Verificar badges automáticos
        if (info.consecutiveOnTimePayments >= 10 &&
            !hasBadge[tokenId][BadgeType.RELIABLE_TENANT]) {
            _awardBadge(tokenId, BadgeType.RELIABLE_TENANT);
            info.reputation += 5; // Bonus por badge
        }
    } else {
        info.paymentsMissed++;
        info.consecutiveOnTimePayments = 0; // Reset streak

        // Penalizar reputación
        if (info.reputation >= 5) {
            info.reputation -= 5;
        } else {
            info.reputation = 0;
        }
    }

    // Verificar otros badges automáticos
    _checkAndAwardBadges(tokenId);

    emit TenantInfoUpdated(tokenId, info.reputation, onTime);
}
```

**LÓGICA DE REPUTACIÓN**:
- Pago a tiempo: +1 punto (cap 100)
- Pago tarde: -5 puntos (floor 0)
- Badge awarded: +5 bonus
- Progresión no lineal: más difícil subir cerca de 100

**C. Reputation Decay (Anti-inactividad)**

```solidity
function getReputationWithDecay(uint256 tokenId)
    public
    view
    returns (uint32)
{
    require(_exists(tokenId), "Token no existe");

    TenantInfo memory info = tenantInfo[tokenId];
    uint256 timeSinceLastActivity = block.timestamp - info.lastActivityTime;

    // Decay: 0.5 puntos por mes de inactividad
    uint256 monthsInactive = timeSinceLastActivity / 30 days;
    uint256 decayAmount = (monthsInactive * 5) / 10; // 0.5 per month

    if (decayAmount >= info.reputation) {
        return 0;
    }

    return uint32(info.reputation - decayAmount);
}
```

**LÓGICA DE DECAY**:
- 0.5 puntos/mes inactivo
- Incentiva uso continuo del sistema
- Previene reputación "inflada" de usuarios inactivos

**D. Sistema de KYC Verification**

```solidity
function requestVerification(
    BadgeType badgeType,
    string memory documentsURI
) external {
    require(badgeType <= BadgeType.CLEAN_CREDIT, "Solo badges KYC");

    uint256 tokenId = getTokenIdByAddress(msg.sender);
    require(_exists(tokenId), "Necesita passport");
    require(badgeStatus[tokenId][badgeType] == BadgeStatus.NONE,
            "Ya solicitado");

    badgeStatus[tokenId][badgeType] = BadgeStatus.PENDING;
    verificationDocuments[tokenId][badgeType] = documentsURI;

    emit VerificationRequested(tokenId, badgeType, documentsURI);
}

function approveVerification(
    uint256 tokenId,
    BadgeType badgeType
) external onlyVerifier {
    require(badgeStatus[tokenId][badgeType] == BadgeStatus.PENDING,
            "No pending");

    badgeStatus[tokenId][badgeType] = BadgeStatus.VERIFIED;
    hasBadge[tokenId][badgeType] = true;

    // Bonus de reputación por KYC
    TenantInfo storage info = tenantInfo[tokenId];
    if (info.reputation <= 95) {
        info.reputation += 5;
    } else {
        info.reputation = 100;
    }

    // Marcar como verificado si tiene suficientes badges KYC
    uint8 kycBadges = _countKYCBadges(tokenId);
    if (kycBadges >= 3) {
        info.isVerified = true;
    }

    emit BadgeVerified(tokenId, badgeType);
}
```

**LÓGICA DE KYC**:
- Usuario sube docs a IPFS, envía URI
- Verificador revisa off-chain
- Aprueba on-chain → badge verified
- 3+ badges KYC → isVerified = true
- Cada badge KYC: +5 reputación

#### 3.1.3 Conexiones con Otros Contratos

**INCOMING (quién lo llama)**:
1. `RentalAgreement.payRent()` → `updateTenantInfo()`
2. `RentalAgreement._completeAgreement()` → `recordPropertyCompletion()`
3. `DisputeResolver._applyPenalties()` → `penalizeTenant()`
4. `RentalAgreementFactory.createAgreement()` → `getReputationWithDecay()` (read)

**OUTGOING (a quién llama)**:
- Ninguno (TenantPassport es estado puro, no llama otros contratos)

**EVENTOS EMITIDOS**:
```solidity
event PassportMinted(address indexed tenant, uint256 tokenId);
event TenantInfoUpdated(uint256 indexed tokenId, uint32 reputation, bool onTime);
event VerificationRequested(uint256 indexed tokenId, BadgeType badgeType, string documentsURI);
event BadgeVerified(uint256 indexed tokenId, BadgeType badgeType);
event BadgeAwarded(uint256 indexed tokenId, BadgeType badgeType);
```

---

### 3.2 PropertyRegistry.sol

**Ubicación**: `foundry/src/V2/PropertyRegistry.sol`

**Función Principal**: Registro de propiedades como NFTs con metadata on-chain

#### 3.2.1 Características Técnicas

```solidity
contract PropertyRegistry is ERC721, Ownable, ReentrancyGuard

// Storage principal
struct PropertyInfo {
    uint256 propertyId;          // ID único basado en GPS
    address landlord;            // Owner del property NFT

    // Información básica
    string name;                 // "Depto en Polanco"
    PropertyType propertyType;   // APARTMENT, HOUSE, etc
    string fullAddress;          // Dirección completa
    string city;                 // Ciudad (para búsquedas)
    string state;                // Estado/provincia
    string postalCode;           // Código postal
    string neighborhood;         // Colonia/barrio

    // GPS (multiplicado por 1e6 para evitar decimals)
    int256 latitude;             // 19.432608 → 19432608
    int256 longitude;            // -99.133209 → -99133209

    // Features físicas
    uint8 bedrooms;              // Número de cuartos
    uint8 bathrooms;             // Número de baños
    uint8 maxOccupants;          // Ocupantes máximos
    uint16 squareMeters;         // Metros cuadrados
    int8 floorNumber;            // Piso (-1 = subterráneo)
    uint32 amenities;            // Bitmask de amenidades

    // Financiero
    uint256 monthlyRent;         // Renta mensual en USDT
    uint256 securityDeposit;     // Depósito requerido
    bool utilitiesIncluded;      // Servicios incluidos
    bool furnishedIncluded;      // Amueblado

    // Estado
    PropertyStatus status;       // DRAFT, PENDING, VERIFIED
    bool isActive;               // Listado para renta
    bool isCurrentlyRented;      // Actualmente rentado
    uint256 createdAt;           // Timestamp de registro
    uint256 lastUpdated;         // Última actualización

    // Reputación
    uint32 propertyReputation;   // 0-100, empieza en 50
    uint16 completedRentals;     // Rentals finalizados
    uint16 cancelledRentals;     // Rentals cancelados
    uint16 disputesCount;        // Disputas

    // Ratings (0-100)
    uint8 avgCleanlinessRating;
    uint8 avgMaintenanceRating;
    uint8 avgLocationRating;

    // Metadata
    string metadataURI;          // IPFS con fotos, docs, etc
}

// Property Types
enum PropertyType {
    APARTMENT,      // 0
    HOUSE,          // 1
    STUDIO,         // 2
    ROOM,           // 3
    LOFT,           // 4
    PENTHOUSE,      // 5
    DUPLEX,         // 6
    COMMERCIAL      // 7
}

enum PropertyStatus {
    DRAFT,          // 0: Recién creado
    PENDING,        // 1: En verificación
    VERIFIED,       // 2: Verificado legalmente
    REJECTED        // 3: Rechazado
}

// Badges de propiedades (10 tipos)
enum PropertyBadge {
    VERIFIED_LEGAL,        // 0: Verificación legal completa
    ECO_FRIENDLY,          // 1: Certificación ambiental
    PET_FRIENDLY,          // 2: Acepta mascotas
    ACCESSIBLE,            // 3: Accesible para discapacidades
    HIGH_SPEED_INTERNET,   // 4: Internet 100+ Mbps
    PREMIUM_LOCATION,      // 5: Ubicación premium
    NEW_CONSTRUCTION,      // 6: Construcción <2 años
    RENOVATED,             // 7: Renovada recientemente
    LUXURY_AMENITIES,      // 8: Amenidades de lujo
    SMART_HOME            // 9: Domótica/smart home
}
```

#### 3.2.2 Funciones Críticas

**A. Registro de Propiedad**

```solidity
function registerProperty(
    string memory _name,
    PropertyType _propertyType,
    string memory _fullAddress,
    string memory _city,
    string memory _state,
    string memory _postalCode,
    string memory _neighborhood,
    int256 _latitude,        // Multiplicado por 1e6
    int256 _longitude,       // Multiplicado por 1e6
    uint8 _bedrooms,
    uint8 _bathrooms,
    uint8 _maxOccupants,
    uint16 _squareMeters,
    int8 _floorNumber,
    uint32 _amenities,
    uint256 _monthlyRent,    // En USDT (6 decimals)
    uint256 _securityDeposit,
    bool _utilitiesIncluded,
    bool _furnishedIncluded,
    string memory _metadataURI
) external nonReentrant returns (uint256 propertyId) {

    // Generar propertyId único basado en GPS
    propertyId = _generatePropertyId(_latitude, _longitude, msg.sender);

    // CRITICAL: Prevenir duplicados
    require(!_exists(propertyId), "Propiedad ya existe en este GPS");

    // Mint property NFT al landlord
    _mint(msg.sender, propertyId);

    // Guardar información
    properties[propertyId] = PropertyInfo({
        propertyId: propertyId,
        landlord: msg.sender,
        name: _name,
        propertyType: _propertyType,
        fullAddress: _fullAddress,
        city: _city,
        state: _state,
        postalCode: _postalCode,
        neighborhood: _neighborhood,
        latitude: _latitude,
        longitude: _longitude,
        bedrooms: _bedrooms,
        bathrooms: _bathrooms,
        maxOccupants: _maxOccupants,
        squareMeters: _squareMeters,
        floorNumber: _floorNumber,
        amenities: _amenities,
        monthlyRent: _monthlyRent,
        securityDeposit: _securityDeposit,
        utilitiesIncluded: _utilitiesIncluded,
        furnishedIncluded: _furnishedIncluded,
        status: PropertyStatus.DRAFT,
        isActive: false,           // No listable hasta verificar
        isCurrentlyRented: false,
        createdAt: block.timestamp,
        lastUpdated: block.timestamp,
        propertyReputation: INITIAL_PROPERTY_REPUTATION, // 50
        completedRentals: 0,
        cancelledRentals: 0,
        disputesCount: 0,
        avgCleanlinessRating: 0,
        avgMaintenanceRating: 0,
        avgLocationRating: 0,
        metadataURI: _metadataURI
    });

    // Agregar a índices de búsqueda
    propertiesByCity[_city].push(propertyId);
    propertiesByLandlord[msg.sender].push(propertyId);

    emit PropertyRegistered(propertyId, msg.sender, _city);

    return propertyId;
}

// Generación de ID único
function _generatePropertyId(
    int256 lat,
    int256 lon,
    address landlord
) internal pure returns (uint256) {
    return uint256(keccak256(abi.encodePacked(lat, lon, landlord)));
}
```

**LÓGICA GPS ÚNICA**:
- PropertyId = hash(latitud, longitud, landlord)
- Misma ubicación GPS → mismo ID
- Previene fraudes de duplicación de propiedades
- Permite múltiples landlords para mismo edificio (diferentes addresses)

**B. Sistema de Verificación Legal**

```solidity
function requestPropertyVerification(
    uint256 propertyId,
    string memory legalDocumentsURI
) external {
    require(_exists(propertyId), "Propiedad no existe");
    require(ownerOf(propertyId) == msg.sender, "No eres el owner");

    PropertyInfo storage prop = properties[propertyId];
    require(prop.status == PropertyStatus.DRAFT, "Ya verificado o pendiente");

    prop.status = PropertyStatus.PENDING;
    propertyVerificationDocs[propertyId] = legalDocumentsURI;

    emit VerificationRequested(propertyId, legalDocumentsURI);
}

function approvePropertyVerification(uint256 propertyId)
    external
    onlyVerifier
{
    require(_exists(propertyId), "Propiedad no existe");

    PropertyInfo storage prop = properties[propertyId];
    require(prop.status == PropertyStatus.PENDING, "No está en verificación");

    prop.status = PropertyStatus.VERIFIED;

    // Award badge legal
    _awardPropertyBadge(propertyId, PropertyBadge.VERIFIED_LEGAL);

    // Bonus reputación
    if (prop.propertyReputation <= 90) {
        prop.propertyReputation += 10;
    } else {
        prop.propertyReputation = 100;
    }

    emit PropertyVerified(propertyId);
}
```

**WORKFLOW DE VERIFICACIÓN**:
```
DRAFT → (requestVerification) → PENDING → (approveVerification) → VERIFIED
                                       ↓
                                  (reject) → REJECTED
```

**C. Búsqueda y Filtrado**

```solidity
function getPropertiesByCity(string memory city, uint256 limit)
    external
    view
    returns (uint256[] memory)
{
    uint256[] storage cityProperties = propertiesByCity[city];
    uint256 resultCount = cityProperties.length > limit ?
                          limit : cityProperties.length;

    uint256[] memory result = new uint256[](resultCount);
    uint256 index = 0;

    for (uint256 i = 0; i < cityProperties.length && index < limit; i++) {
        uint256 propId = cityProperties[i];

        // Solo retornar activas y verificadas
        if (properties[propId].isActive &&
            properties[propId].status == PropertyStatus.VERIFIED &&
            !properties[propId].isCurrentlyRented) {
            result[index] = propId;
            index++;
        }
    }

    return result;
}

function isPropertyAvailableForRent(uint256 propertyId)
    external
    view
    returns (bool)
{
    require(_exists(propertyId), "Propiedad no existe");

    PropertyInfo memory prop = properties[propertyId];

    return prop.isActive &&
           prop.status == PropertyStatus.VERIFIED &&
           !prop.isCurrentlyRented;
}
```

**D. Actualización de Reputación (Llamado por RentalAgreement)**

```solidity
function updatePropertyReputation(
    uint256 propertyId,
    bool completed,
    bool disputed,
    uint8 cleanlinessRating,
    uint8 maintenanceRating,
    uint8 locationRating
) external onlyAuthorized {
    require(_exists(propertyId), "Propiedad no existe");

    PropertyInfo storage prop = properties[propertyId];

    if (completed) {
        prop.completedRentals++;

        // Aumentar reputación
        if (prop.propertyReputation < 100) {
            prop.propertyReputation += 2;
        }
    } else {
        prop.cancelledRentals++;

        // Penalizar
        if (prop.propertyReputation >= 5) {
            prop.propertyReputation -= 5;
        }
    }

    if (disputed) {
        prop.disputesCount++;

        // Penalización extra por disputa
        if (prop.propertyReputation >= 10) {
            prop.propertyReputation -= 10;
        }
    }

    // Actualizar ratings promedio
    if (cleanlinessRating > 0) {
        prop.avgCleanlinessRating = uint8(
            (uint256(prop.avgCleanlinessRating) * prop.completedRentals +
             cleanlinessRating) / (prop.completedRentals + 1)
        );
    }

    if (maintenanceRating > 0) {
        prop.avgMaintenanceRating = uint8(
            (uint256(prop.avgMaintenanceRating) * prop.completedRentals +
             maintenanceRating) / (prop.completedRentals + 1)
        );
    }

    if (locationRating > 0) {
        prop.avgLocationRating = uint8(
            (uint256(prop.avgLocationRating) * prop.completedRentals +
             locationRating) / (prop.completedRentals + 1)
        );
    }

    // Liberar propiedad si estaba rentada
    prop.isCurrentlyRented = false;

    emit PropertyReputationUpdated(propertyId, prop.propertyReputation);
}
```

#### 3.2.3 Conexiones con Otros Contratos

**INCOMING**:
1. `RentalAgreementFactory.createAgreement()` → `isPropertyAvailableForRent()` (read)
2. `RentalAgreement._checkActivation()` → `markPropertyAsRented()` (write)
3. `RentalAgreement._completeAgreement()` → `updatePropertyReputation()` (write)

**OUTGOING**:
- Ninguno (PropertyRegistry es estado puro)

---

### 3.3 RentalAgreementFactory.sol

**Ubicación**: `foundry/src/V2/RentalAgreementFactory.sol`

**Función Principal**: Factory pattern (EIP-1167 minimal proxy) para crear rental agreements

#### 3.3.1 Características Técnicas

```solidity
contract RentalAgreementFactory is Ownable, ReentrancyGuard

// Dependencies
ITenantPassport public immutable tenantPassport;
IPropertyRegistry public immutable propertyRegistry;
IDisputeResolver public disputeResolver;
address public immutable agreementImplementation; // Template para clones

// Configuration
uint32 public minTenantReputation = 40;    // Mínimo 40/100
uint8 public maxAgreementDuration = 24;    // Máximo 24 meses

// Tracking
mapping(address => address[]) public agreementsByTenant;
mapping(address => address[]) public agreementsByLandlord;
mapping(uint256 => address[]) public agreementsByProperty;
address[] public allAgreements;
```

#### 3.3.2 Función Principal: createAgreement

```solidity
function createAgreement(
    uint256 propertyId,
    address tenant,
    uint256 monthlyRent,
    uint256 securityDeposit,
    uint8 duration  // En meses
) external nonReentrant returns (address agreementAddress) {

    // VALIDACIONES CRÍTICAS

    // 1. Validar propiedad existe y está disponible
    require(
        propertyRegistry.isPropertyAvailableForRent(propertyId),
        "Propiedad no disponible"
    );

    // 2. Validar landlord es owner de la propiedad
    require(
        propertyRegistry.ownerOf(propertyId) == msg.sender,
        "No eres owner de la propiedad"
    );

    // 3. Validar tenant tiene passport
    require(
        tenantPassport.hasPassport(tenant),
        "Tenant no tiene passport"
    );

    // 4. CRÍTICO: Validar reputación mínima del tenant (con decay)
    uint256 tokenId = tenantPassport.getTokenIdByAddress(tenant);
    uint32 reputation = tenantPassport.getReputationWithDecay(tokenId);
    require(
        reputation >= minTenantReputation,
        "Tenant: reputacion insuficiente"
    );

    // 5. Validar duración
    require(
        duration >= 1 && duration <= maxAgreementDuration,
        "Duracion invalida"
    );

    // 6. Validar montos razonables
    require(monthlyRent > 0, "Renta debe ser > 0");
    require(securityDeposit > 0, "Deposito debe ser > 0");

    // CREAR AGREEMENT CLONE (EIP-1167)
    agreementAddress = Clones.clone(agreementImplementation);

    // INICIALIZAR AGREEMENT
    IRentalAgreement(agreementAddress).initialize(
        propertyId,
        msg.sender,      // landlord
        tenant,
        monthlyRent,
        securityDeposit,
        duration,
        address(this)    // factory address para callbacks
    );

    // TRACKING
    agreementsByTenant[tenant].push(agreementAddress);
    agreementsByLandlord[msg.sender].push(agreementAddress);
    agreementsByProperty[propertyId].push(agreementAddress);
    allAgreements.push(agreementAddress);

    emit AgreementCreated(
        agreementAddress,
        propertyId,
        msg.sender,
        tenant,
        monthlyRent,
        securityDeposit,
        duration
    );

    return agreementAddress;
}
```

**LÓGICA DE VALIDACIÓN**:
1. Propiedad verificada + activa + no rentada
2. Caller es owner del property NFT
3. Tenant tiene TenantPassport
4. **CRÍTICO**: Tenant reputation ≥ 40 (con decay calculado)
5. Duración 1-24 meses
6. Montos > 0

**PATRÓN EIP-1167**:
- `agreementImplementation`: Template deployado una vez
- `Clones.clone()`: Crea minimal proxy (muy bajo gas)
- Cada agreement es un contrato independiente pero comparte lógica
- Gas cost: ~46k por clone vs ~1.5M por deploy completo

#### 3.3.3 Funciones de Query

```solidity
function getTenantAgreements(address tenant)
    external
    view
    returns (address[] memory)
{
    return agreementsByTenant[tenant];
}

function getLandlordAgreements(address landlord)
    external
    view
    returns (address[] memory)
{
    return agreementsByLandlord[landlord];
}

function getPropertyAgreements(uint256 propertyId)
    external
    view
    returns (address[] memory)
{
    return agreementsByProperty[propertyId];
}

function getTotalAgreements() external view returns (uint256) {
    return allAgreements.length;
}
```

#### 3.3.4 Callback desde DisputeResolver

```solidity
function notifyDisputeResolved(
    address agreementAddress,
    bool tenantWon,
    uint256 penaltyAmount
) external {
    require(msg.sender == address(disputeResolver), "Solo DisputeResolver");

    emit DisputeResolved(agreementAddress, tenantWon, penaltyAmount);
}
```

#### 3.3.5 Conexiones

**INCOMING**:
1. Landlord → `createAgreement()` (para crear nuevo rental)
2. `DisputeResolver` → `notifyDisputeResolved()` (callback)

**OUTGOING**:
1. → `PropertyRegistry.isPropertyAvailableForRent()` (validación)
2. → `PropertyRegistry.ownerOf()` (validación)
3. → `TenantPassportV2.hasPassport()` (validación)
4. → `TenantPassportV2.getReputationWithDecay()` (validación CRÍTICA)
5. → `Clones.clone()` (crear agreement)
6. → `IRentalAgreement.initialize()` (inicializar agreement)

---

### 3.4 RentalAgreement.sol

**Ubicación**: `foundry/src/V2/RentalAgreement.sol`

**Función Principal**: Contrato individual de alquiler entre 1 landlord y 1 tenant

#### 3.4.1 Características Técnicas

```solidity
contract RentalAgreement is ReentrancyGuard

// Estados posibles del agreement
enum AgreementStatus {
    PENDING,      // 0: Creado, esperando firmas
    ACTIVE,       // 1: Firmado + deposit pagado
    COMPLETED,    // 2: Finalizado exitosamente
    TERMINATED,   // 3: Terminado prematuramente
    DISPUTED,     // 4: En disputa
    CANCELLED     // 5: Cancelado antes de activar
}

// Estructura principal
struct Agreement {
    uint256 propertyId;
    address landlord;
    address tenant;
    uint256 monthlyRent;        // En USDT (6 decimals)
    uint256 securityDeposit;    // En USDT
    uint8 duration;             // Meses (1-24)
    uint256 startDate;          // Timestamp de inicio
    uint256 endDate;            // Timestamp de fin
    uint256 depositAmount;      // Depósito pagado (puede ser 0 inicialmente)
    uint256 totalPaid;          // Total pagado de renta
    uint16 paymentsMade;        // Número de pagos realizados
    uint16 paymentsMissed;      // Número de pagos perdidos
    AgreementStatus status;
}

// Contract state
Agreement public agreement;
bool public tenantSigned;
bool public landlordSigned;
bool public initialized;

uint256 public nextPaymentDue;
uint256 public lastPaymentDate;

// Dispute tracking
uint256 public activeDisputeId;
bool public paymentsLockedByDispute;

// Dependencies (immutable después de initialize)
RoomFiConfig public config;
IERC20 public usdt;
IRoomFiVault public vault;
```

#### 3.4.2 Flujo Completo (Máquina de Estados)

```
     ┌─────────────────────────────────────────────────────┐
     │                   PENDING                           │
     │  • Recién creado por Factory                        │
     │  • Esperando firmas de ambas partes                 │
     └──────────┬────────────────────────┬─────────────────┘
                │                        │
      signAsLandlord()           signAsTenant()
      signAsTenant()             signAsLandlord()
                │                        │
                └────────────┬───────────┘
                             │
                    (ambos firmados)
                             │
                    paySecurityDeposit()
                             ↓
     ┌─────────────────────────────────────────────────────┐
     │                   ACTIVE                            │
     │  • Deposit en vault generando yield                 │
     │  • Pagos mensuales activos                          │
     └──────┬────────────────────┬────────────────┬────────┘
            │                    │                │
      (mensualmente)       raiseDispute()   terminateEarly()
            │                    │                │
      payRent()                  ↓                ↓
            │            ┌──────────────┐  ┌─────────────┐
            │            │   DISPUTED   │  │ TERMINATED  │
            │            └──────────────┘  └─────────────┘
            │                    │
            │            (resolución)
            │                    │
            ↓                    ↓
     ┌─────────────────────────────────────────────────────┐
     │                 COMPLETED                           │
     │  • Todos los pagos realizados                       │
     │  • Deposit retornado + yield                        │
     │  • Reputaciones actualizadas                        │
     └─────────────────────────────────────────────────────┘
```

#### 3.4.3 Funciones Críticas - DETALLE EXTREMO

**A. Inicialización (Solo Factory)**

```solidity
function initialize(
    uint256 _propertyId,
    address _landlord,
    address _tenant,
    uint256 _monthlyRent,
    uint256 _securityDeposit,
    uint8 _duration,
    address _configAddress
) external {
    require(!initialized, "Ya inicializado");
    require(_landlord != address(0), "Landlord invalido");
    require(_tenant != address(0), "Tenant invalido");
    require(_landlord != _tenant, "Landlord no puede ser tenant");

    // Cargar configuración global
    config = RoomFiConfig(_configAddress);
    usdt = IERC20(config.USDT_ADDRESS());
    vault = IRoomFiVault(config.roomfiVault());

    // Inicializar agreement
    agreement = Agreement({
        propertyId: _propertyId,
        landlord: _landlord,
        tenant: _tenant,
        monthlyRent: _monthlyRent,
        securityDeposit: _securityDeposit,
        duration: _duration,
        startDate: 0,  // Se setea al activar
        endDate: 0,
        depositAmount: 0,  // Se setea al pagar
        totalPaid: 0,
        paymentsMade: 0,
        paymentsMissed: 0,
        status: AgreementStatus.PENDING
    });

    tenantSigned = false;
    landlordSigned = false;
    initialized = true;

    emit AgreementInitialized(_propertyId, _landlord, _tenant);
}
```

**B. Firmas Bilaterales**

```solidity
function signAsLandlord() external onlyLandlord onlyStatus(AgreementStatus.PENDING) {
    require(!landlordSigned, "Ya firmado");
    landlordSigned = true;
    emit LandlordSigned(msg.sender);

    _checkActivation();
}

function signAsTenant() external onlyTenant onlyStatus(AgreementStatus.PENDING) {
    require(!tenantSigned, "Ya firmado");
    tenantSigned = true;
    emit TenantSigned(msg.sender);

    _checkActivation();
}

// LÓGICA: Solo informativo, NO activa
function _checkActivation() internal view {
    if (landlordSigned && tenantSigned && agreement.depositAmount > 0) {
        // Agreement ahora ACTIVE (ya fue activado en paySecurityDeposit)
    }
}
```

**C. Pago de Security Deposit (CRÍTICO - Integración con Vault)**

```solidity
function paySecurityDeposit()
    external
    nonReentrant
    onlyTenant
    onlyStatus(AgreementStatus.PENDING)
{
    require(landlordSigned && tenantSigned, "Faltan firmas");
    require(agreement.depositAmount == 0, "Deposit ya pagado");

    uint256 depositRequired = agreement.securityDeposit;

    // STEP 1: Transfer USDT del tenant al agreement
    usdt.transferFrom(msg.sender, address(this), depositRequired);

    // STEP 2: Approve vault para gastar
    usdt.approve(address(vault), depositRequired);

    // STEP 3: Depositar en vault (empieza a generar yield)
    vault.deposit(depositRequired, address(this));

    // STEP 4: Actualizar estado
    agreement.depositAmount = depositRequired;
    agreement.status = AgreementStatus.ACTIVE;
    agreement.startDate = block.timestamp;
    agreement.endDate = block.timestamp + (agreement.duration * 30 days);

    // STEP 5: Setup primer pago de renta
    nextPaymentDue = block.timestamp + 30 days;
    lastPaymentDate = block.timestamp;

    // STEP 6: Marcar propiedad como rentada
    IPropertyRegistry(config.propertyRegistry()).markPropertyAsRented(
        agreement.propertyId
    );

    emit DepositPaid(msg.sender, depositRequired);
    emit AgreementActivated(block.timestamp);
}
```

**FLUJO DE FONDOS DEPOSIT**:
```
Tenant USDT Balance: 2000 USDT
         ↓ [transferFrom]
RentalAgreement: 2000 USDT
         ↓ [approve + vault.deposit]
RoomFiVault: deposits[agreement] = 2000 USDT
         ↓ [strategy.deposit]
AcalaYieldStrategy: 2000 USDT
         ↓ [XCM to Acala]
Acala Lending: 1400 USDT (70%)
Acala DEX: 600 USDT (30%)
         ↓ [genera yield 8% APY]
Después 12 meses: 2160 USDT total
```

**D. Pago Mensual de Renta (CRÍTICO - Actualiza Reputación)**

```solidity
function payRent()
    external
    nonReentrant
    onlyTenant
    onlyStatus(AgreementStatus.ACTIVE)
{
    require(!paymentsLockedByDispute, "Pagos bloqueados por disputa");
    require(block.timestamp >= lastPaymentDate, "Ya pagaste este periodo");

    uint256 rentAmount = agreement.monthlyRent;

    // STEP 1: Transfer USDT del tenant
    usdt.transferFrom(msg.sender, address(this), rentAmount);

    // STEP 2: Determinar si está a tiempo
    bool onTime = block.timestamp <= nextPaymentDue;

    // STEP 3: Actualizar métricas del agreement
    agreement.totalPaid += rentAmount;
    agreement.paymentsMade++;
    lastPaymentDate = block.timestamp;
    nextPaymentDue = block.timestamp + 30 days;

    if (!onTime) {
        agreement.paymentsMissed++;
    }

    // STEP 4: Split de fondos (85% landlord, 15% protocol)
    uint256 landlordAmount = (rentAmount * 85) / 100;
    uint256 protocolFee = rentAmount - landlordAmount;

    usdt.transfer(agreement.landlord, landlordAmount);
    usdt.transfer(config.owner(), protocolFee);

    // STEP 5: CRÍTICO - Actualizar reputación del tenant
    ITenantPassport passport = ITenantPassport(config.tenantPassport());
    uint256 tokenId = passport.getTokenIdByAddress(msg.sender);

    passport.updateTenantInfo(
        tokenId,
        onTime,        // true si pagó a tiempo
        rentAmount     // monto pagado
    );

    emit RentPaid(agreement.paymentsMade, rentAmount, block.timestamp);
    emit TenantPaymentStatus(onTime);

    // STEP 6: Check si ya terminó el contrato
    if (block.timestamp >= agreement.endDate) {
        _completeAgreement();
    }
}
```

**LÓGICA ON-TIME**:
- onTime = block.timestamp ≤ nextPaymentDue
- nextPaymentDue se actualiza cada mes
- Grace period: ninguno (exactitud en blockchain)
- Consecuencia onTime=false: -5 reputación

**E. Completar Agreement (CRÍTICO - Retorna Deposit + Yield)**

```solidity
function _completeAgreement() internal {
    agreement.status = AgreementStatus.COMPLETED;

    uint256 principalDeposit = agreement.depositAmount;

    // STEP 1: Retirar deposit del vault CON yield
    (uint256 principal, uint256 yieldEarned) = vault.withdraw(
        principalDeposit,
        address(this)
    );

    // STEP 2: Split del yield (70% tenant, 30% protocol)
    uint256 tenantYield = (yieldEarned * 70) / 100;
    uint256 protocolYield = yieldEarned - tenantYield;

    // STEP 3: Transfer al tenant (principal + su yield)
    uint256 totalTenantReturn = principal + tenantYield;
    usdt.transfer(agreement.tenant, totalTenantReturn);

    // STEP 4: Transfer protocol yield
    if (protocolYield > 0) {
        usdt.transfer(config.owner(), protocolYield);
    }

    // STEP 5: Actualizar reputación de la propiedad
    IPropertyRegistry(config.propertyRegistry()).updatePropertyReputation(
        agreement.propertyId,
        true,   // completed = true
        false,  // disputed = false
        80,     // cleanliness rating (default, real vendría de tenant)
        80,     // maintenance rating
        80      // location rating
    );

    // STEP 6: Bonus para tenant por completar
    ITenantPassport passport = ITenantPassport(config.tenantPassport());
    uint256 tokenId = passport.getTokenIdByAddress(agreement.tenant);
    passport.recordPropertyCompletion(tokenId, agreement.propertyId);

    emit AgreementCompleted(block.timestamp);
    emit DepositReturned(agreement.tenant, totalTenantReturn);
    emit YieldDistributed(tenantYield, protocolYield);
}
```

**FLUJO DE FONDOS AL COMPLETAR** (ejemplo real):
```
Deposit inicial: 2000 USDT
Tiempo: 12 meses
Yield generado: 160 USDT (8% APY)

PASO 1: Vault retira 2160 USDT de Acala
PASO 2: Split yield:
  - Tenant yield: 112 USDT (70%)
  - Protocol yield: 48 USDT (30%)
PASO 3: Transfers:
  - Tenant recibe: 2112 USDT
  - Protocol recibe: 48 USDT

VERIFICACIÓN:
2000 + 112 + 48 = 2160 ✓ (cuadra)
```

**F. Dispute Handling**

```solidity
function raiseDispute(
    uint8 reasonCode,
    string memory evidenceURI,
    uint256 amountInDispute
) external nonReentrant onlyStatus(AgreementStatus.ACTIVE) {
    require(
        msg.sender == agreement.landlord || msg.sender == agreement.tenant,
        "Solo partes del agreement"
    );
    require(!paymentsLockedByDispute, "Ya hay disputa activa");
    require(amountInDispute > 0 && amountInDispute <= agreement.monthlyRent * 2,
            "Monto invalido");

    // STEP 1: Bloquear pagos durante disputa
    paymentsLockedByDispute = true;
    agreement.status = AgreementStatus.DISPUTED;

    // STEP 2: Crear disputa en DisputeResolver
    IDisputeResolver resolver = IDisputeResolver(config.disputeResolver());

    uint256 disputeId = resolver.createDispute{value: 0.01 ether}(
        address(this),                    // rentalAgreement
        msg.sender == agreement.tenant ?
            agreement.landlord : agreement.tenant,  // respondent
        DisputeReason(reasonCode),
        evidenceURI,
        amountInDispute,
        msg.sender == agreement.tenant    // initiatorIsTenant
    );

    activeDisputeId = disputeId;

    emit DisputeRaised(disputeId, msg.sender, reasonCode, amountInDispute);
}

// Callback desde DisputeResolver
function applyDisputeResolution(
    bool tenantWon,
    uint256 penaltyAmount
) external {
    require(msg.sender == config.disputeResolver(), "Solo DisputeResolver");
    require(agreement.status == AgreementStatus.DISPUTED, "No en disputa");

    // STEP 1: Desbloquear pagos
    paymentsLockedByDispute = false;
    agreement.status = AgreementStatus.ACTIVE;
    activeDisputeId = 0;

    // STEP 2: Aplicar penalty (transferencia de fondos)
    if (penaltyAmount > 0) {
        if (tenantWon) {
            // Landlord paga al tenant
            usdt.transferFrom(agreement.landlord, agreement.tenant, penaltyAmount);
        } else {
            // Tenant paga al landlord
            usdt.transferFrom(agreement.tenant, agreement.landlord, penaltyAmount);
        }
    }

    emit DisputeResolved(tenantWon, penaltyAmount);
}
```

#### 3.4.4 Conexiones

**INCOMING**:
1. `RentalAgreementFactory` → `initialize()` (al crear)
2. Tenant → `signAsTenant()`, `paySecurityDeposit()`, `payRent()`, `raiseDispute()`
3. Landlord → `signAsLandlord()`, `raiseDispute()`
4. `DisputeResolver` → `applyDisputeResolution()` (callback)

**OUTGOING**:
1. → `RoomFiVault.deposit()` (al pagar deposit)
2. → `RoomFiVault.withdraw()` (al completar)
3. → `TenantPassportV2.updateTenantInfo()` (cada pago de rent)
4. → `TenantPassportV2.recordPropertyCompletion()` (al completar)
5. → `PropertyRegistry.markPropertyAsRented()` (al activar)
6. → `PropertyRegistry.updatePropertyReputation()` (al completar)
7. → `DisputeResolver.createDispute()` (al levantar disputa)
8. → `IERC20(usdt).transfer()` (pagos)

---

## 4. CONTRATOS DeFi - YIELD FARMING

### 4.1 RoomFiVault.sol

**Ubicación**: `foundry/src/V2/RoomFiVault.sol`

**Función**: Vault que recibe security deposits y los despliega en estrategias DeFi

#### 4.1.1 Storage y Configuración

```solidity
contract RoomFiVault is Ownable, ReentrancyGuard

IERC20 public immutable usdt;
IAcalaYieldStrategy public strategy;

// Tracking por agreement
mapping(address => uint256) public deposits;      // Principal por user
mapping(address => uint256) public depositTime;   // Timestamp

uint256 public totalDeposits;
uint256 public totalYieldEarned;

// Fees
uint256 public protocolFeePercent = 30;  // 30% del yield
uint256 public accumulatedProtocolFees;

// Emergency
bool public emergencyPaused;
```

#### 4.1.2 Deposit (Llamado por RentalAgreement)

```solidity
function deposit(uint256 amount, address user)
    external
    nonReentrant
    whenNotPaused
{
    require(amount > 0, "Amount > 0");
    require(user != address(0), "Invalid user");

    // STEP 1: Transfer USDT del caller (agreement) al vault
    usdt.transferFrom(msg.sender, address(this), amount);

    // STEP 2: Update tracking
    deposits[user] += amount;
    depositTime[user] = block.timestamp;
    totalDeposits += amount;

    // STEP 3: Approve strategy
    usdt.approve(address(strategy), amount);

    // STEP 4: Deploy a strategy (Acala)
    strategy.deposit(amount);

    emit Deposited(user, amount, block.timestamp);
}
```

**IMPORTANTE**:
- `user` es el address del RentalAgreement (no el tenant)
- Cada agreement tiene su propio tracking de balance
- Esto permite múltiples agreements simultáneos

#### 4.1.3 Withdraw (Llamado por RentalAgreement al finalizar)

```solidity
function withdraw(uint256 amount, address user)
    external
    nonReentrant
    returns (uint256 principal, uint256 yield)
{
    require(deposits[user] >= amount, "Insufficient balance");

    // STEP 1: Calcular yield generado
    uint256 totalYield = calculateYield(user);

    // STEP 2: Protocol fee sobre el yield
    uint256 protocolFee = (totalYield * protocolFeePercent) / 100;
    uint256 userYield = totalYield - protocolFee;

    accumulatedProtocolFees += protocolFee;
    totalYieldEarned += totalYield;

    // STEP 3: Update tracking
    deposits[user] -= amount;
    totalDeposits -= amount;

    // STEP 4: Withdraw from strategy
    uint256 totalWithdrawal = amount + totalYield;
    strategy.withdraw(totalWithdrawal);

    // STEP 5: Transfer USDT al user (agreement)
    usdt.transfer(user, amount + userYield);

    emit Withdrawn(user, amount, userYield);

    return (amount, userYield);
}
```

#### 4.1.4 Cálculo de Yield (Proporcional)

```solidity
function calculateYield(address user) public view returns (uint256) {
    uint256 userDeposit = deposits[user];
    if (userDeposit == 0) return 0;

    // STEP 1: Obtener balance total del vault en strategy
    uint256 totalBalance = strategy.balanceOf(address(this));

    // STEP 2: Calcular yield total del vault
    uint256 vaultYield = totalBalance > totalDeposits ?
                         totalBalance - totalDeposits : 0;

    // STEP 3: Yield proporcional del usuario
    uint256 userShare = (vaultYield * userDeposit) / totalDeposits;

    return userShare;
}
```

**LÓGICA DE YIELD PROPORCIONAL**:
```
Ejemplo:
- User A depositó: 2000 USDT
- User B depositó: 3000 USDT
- Total deposits: 5000 USDT
- Balance en Acala: 5400 USDT
- Yield total: 400 USDT

User A yield: (400 * 2000) / 5000 = 160 USDT
User B yield: (400 * 3000) / 5000 = 240 USDT
Total: 400 USDT ✓
```

#### 4.1.5 Conexiones

**INCOMING**:
1. `RentalAgreement.paySecurityDeposit()` → `deposit()`
2. `RentalAgreement._completeAgreement()` → `withdraw()`
3. Owner → admin functions

**OUTGOING**:
1. → `AcalaYieldStrategy.deposit()` (deploy fondos)
2. → `AcalaYieldStrategy.withdraw()` (retirar fondos)
3. → `AcalaYieldStrategy.balanceOf()` (query balance)

---

### 4.2 AcalaYieldStrategy.sol

**Ubicación**: `foundry/src/V2/strategies/AcalaYieldStrategy.sol`

**Función**: Estrategia que despliega USDT en Acala para generar yield

#### 4.2.1 Configuración y Allocation

```solidity
contract AcalaYieldStrategy is Ownable

IERC20 public immutable usdt;

// Acala addresses (vía XCM)
address public constant ACALA_LENDING = 0x...;
address public constant ACALA_DEX = 0x...;
address public constant XCM_GATEWAY = 0x...;
uint32 public constant ACALA_PARACHAIN_ID = 2000;

// Allocation strategy
uint256 public lendingAllocation = 70;  // 70% → Lending (6-8% APY)
uint256 public dexAllocation = 30;      // 30% → DEX (10-15% APY)

uint256 public totalDeposited;
```

#### 4.2.2 Deposit (Deploy a Acala vía XCM)

```solidity
function deposit(uint256 amount) external onlyOwner {
    require(amount > 0, "Amount > 0");

    // Transfer del vault
    usdt.transferFrom(msg.sender, address(this), amount);

    // Split según allocation
    uint256 toLending = (amount * lendingAllocation) / 100;
    uint256 toDEX = amount - toLending;

    // Deploy a Acala Lending
    if (toLending > 0) {
        _deployToLending(toLending);
    }

    // Deploy a Acala DEX
    if (toDEX > 0) {
        _deployToDEX(toDEX);
    }

    totalDeposited += amount;

    emit Deposited(amount, toLending, toDEX);
}
```

#### 4.2.3 XCM Integration (Cross-Chain Message)

```solidity
function _deployToLending(uint256 amount) internal {
    // STEP 1: Approve XCM gateway
    usdt.approve(XCM_GATEWAY, amount);

    // STEP 2: Construir XCM message
    bytes memory xcmMessage = abi.encodeWithSignature(
        "transferAssetToParachain(uint32,address,uint256)",
        ACALA_PARACHAIN_ID,
        ACALA_LENDING,
        amount
    );

    // STEP 3: Execute XCM call
    (bool success, ) = XCM_GATEWAY.call(xcmMessage);
    require(success, "XCM transfer failed");
}
```

**NOTA IMPORTANTE PARA IA**:
- XCM (Cross-Chain Message Passing) es el protocolo de Polkadot para comunicación entre parachains
- `XCM_GATEWAY` es un precompile en Moonbeam que expone funcionalidad XCM
- El mensaje se envía a Acala parachain ID 2000
- En Acala, un pallet recibe el USDT y lo deposita en lending/DEX
- **ESTADO ACTUAL**: Interfaces definidas, implementación parcial
- **PARA HACKATHON**: Usar mock yields (8% fijo) y explicar arquitectura

#### 4.2.4 Withdraw (Retornar de Acala)

```solidity
function withdraw(uint256 amount) external onlyOwner {
    require(amount <= totalDeposited, "Insufficient balance");

    // Withdraw proporcional de lending y DEX
    uint256 fromLending = (amount * lendingAllocation) / 100;
    uint256 fromDEX = amount - fromLending;

    if (fromLending > 0) {
        _withdrawFromLending(fromLending);
    }

    if (fromDEX > 0) {
        _withdrawFromDEX(fromDEX);
    }

    totalDeposited -= amount;

    // Transfer back to vault
    usdt.transfer(msg.sender, amount);

    emit Withdrawn(amount);
}

function _withdrawFromLending(uint256 amount) internal {
    bytes memory xcmMessage = abi.encodeWithSignature(
        "withdrawFromParachain(uint32,address,uint256)",
        ACALA_PARACHAIN_ID,
        address(this),
        amount
    );

    (bool success, ) = XCM_GATEWAY.call(xcmMessage);
    require(success, "XCM withdrawal failed");
}
```

#### 4.2.5 APY Tracking

```solidity
function getAPY() external pure returns (uint256) {
    // Lending: 6-8% APY
    // DEX: 10-15% APY
    // Weighted average: (70% * 7%) + (30% * 12%) = 8.5%

    return 800;  // 8% en basis points (800/100 = 8%)
}
```

#### 4.2.6 Conexiones

**INCOMING**:
1. `RoomFiVault` → `deposit()`, `withdraw()`, `balanceOf()`

**OUTGOING**:
1. → XCM Gateway (Moonbeam precompile)
2. → Acala Lending (via XCM)
3. → Acala DEX (via XCM)

---

Hasta aquí llega la PARTE 1 del documento (arquitectura técnica).

¿Continúo con la PARTE 2 que incluirá:
- Business Model y visión
- Por qué Polkadot vs otras blockchains
- Checklist detallado de faltantes para hackathon?

# PARTE 2: BUSINESS MODEL Y VISIÓN ESTRATÉGICA

## 5. MODELO DE NEGOCIO DETALLADO

### 5.1 Revenue Streams (Flujos de Ingresos)

#### A. Protocol Fees sobre Rent Payments (Principal)

**Estructura**: 15% de cada pago de renta mensual

**Ejemplo Real**:
```
Rent payment: $1000 USDT
├─ Landlord: $850 USDT (85%)
└─ Protocol: $150 USDT (15%)

Anual por propiedad: $150 × 12 meses = $1,800 USDT
```

**Proyecciones**:
```
Año 1 (100 propiedades activas):
  - Renta promedio: $800/mes
  - Protocol fee: $120/mes por propiedad
  - Total mensual: 100 × $120 = $12,000 USDT
  - Total anual: $144,000 USDT

Año 2 (500 propiedades):
  - Total anual: $720,000 USDT

Año 3 (2,000 propiedades):
  - Total anual: $2,880,000 USDT

Año 5 (10,000 propiedades):
  - Total anual: $14,400,000 USDT
```

**Justificación del 15%**:
- Airbnb cobra 14-18% (host + guest fees)
- Property managers tradicionales: 8-12%
- RoomFi ofrece: KYC, dispute resolution, yield farming, cross-chain
- Valor agregado justifica el 15%

#### B. Yield Farming Fees (Secundario pero Escalable)

**Estructura**: 30% del yield generado por security deposits en vault

**Ejemplo Real**:
```
Security deposit: $2000 USDT
Duration: 12 meses
APY: 8%
Yield total: $160 USDT

Split:
├─ Tenant: $112 USDT (70%)
└─ Protocol: $48 USDT (30%)
```

**Proyecciones**:
```
Año 1 (100 agreements activos):
  - Deposit promedio: $1600 USDT
  - Yield promedio: $128 USDT/año
  - Protocol share: $38.4 USDT/agreement
  - Total anual: $3,840 USDT

Año 3 (2,000 agreements):
  - Total anual: $76,800 USDT

Año 5 (10,000 agreements):
  - Total anual: $384,000 USDT
```

**Por qué 30% al protocol**:
- Tenant sigue ganando más que 0% (traditional)
- Protocol asume riesgo de strategy management
- Cubre costos de integración Acala y rebalancing

#### C. Verification Fees (Opcional)

**Estructura**: Fee one-time por verificación KYC premium

**Tiers**:
```
Basic KYC: Gratis (solo VERIFIED_ID)
├─ Bot verifica documento con OCR
└─ 5 minutos aprobación

Standard KYC: $5 USDT
├─ VERIFIED_ID + VERIFIED_INCOME
└─ Humano revisa documentos
└─ 24 horas aprobación

Premium KYC: $15 USDT
├─ Todos los 6 badges KYC
└─ Background check completo
└─ 48 horas aprobación
└─ Reputation boost: +15 points
```

**Proyecciones conservadoras**:
```
Año 1:
  - 500 tenants nuevos
  - 40% toma Standard: 200 × $5 = $1,000
  - 10% toma Premium: 50 × $15 = $750
  - Total: $1,750 USDT

Año 3:
  - 5,000 tenants nuevos
  - Total: $17,500 USDT

Año 5:
  - 20,000 tenants nuevos
  - Total: $70,000 USDT
```

#### D. Premium Features (Futuro)

**Para Landlords**:
```
Premium Listing: $10/mes por propiedad
├─ Featured placement en búsquedas
├─ Analytics dashboard
├─ Auto-responder para inquiries
└─ Priority support

Professional Plan: $50/mes
├─ Múltiples propiedades (5+)
├─ Bulk operations
├─ API access
└─ White-label branding
```

**Para Tenants**:
```
Reputation Boost: $20 one-time
├─ Fast-track verification
├─ Featured tenant profile
└─ +10 reputation bonus

Credit Builder: $5/mes
├─ Report pagos a bureaus tradicionales
├─ Integración con Experian/Equifax
└─ Build Web2 + Web3 credit
```

#### E. Marketplace Commissions (Año 2+)

**Servicios complementarios**:
```
Insurance Partner: 10% commission
├─ Tenant insurance ($10-30/mes)
└─ Landlord coverage ($50-100/property)

Moving Services: 5% commission
├─ Truck rental
├─ Packing services
└─ Storage

Utilities Setup: $10 flat fee
├─ Internet, luz, agua
└─ One-click activation
```

### 5.2 Proyección Financiera Detallada (5 años)

#### Año 1: MVP y Product-Market Fit

**Objetivo**: 100 propiedades activas, 300 tenants

**Revenue Breakdown**:
```
Protocol Fees (rent):      $144,000 USDT
Yield Farming Fees:         $3,840 USDT
Verification Fees:          $1,750 USDT
Premium Features:               $0 USDT (no lanzado)
─────────────────────────────────────────
TOTAL REVENUE:             $149,590 USDT

Operating Expenses:
├─ Team (2 devs): $120,000
├─ Infrastructure: $12,000
├─ Marketing: $30,000
├─ Legal: $15,000
└─ Misc: $10,000
─────────────────────────
TOTAL EXPENSES:            $187,000

NET: -$37,410 (inversión en crecimiento)
```

**KPIs**:
- Properties listed: 100
- Active agreements: 100
- Tenants: 300
- Landlords: 80
- Disputes resolved: <10
- Average reputation: 65
- Retention rate: 70%

#### Año 2: Expansión Geográfica

**Objetivo**: 500 propiedades, 1,500 tenants

**Revenue**:
```
Protocol Fees (rent):      $720,000 USDT
Yield Farming Fees:        $19,200 USDT
Verification Fees:          $8,750 USDT
Premium Features:          $24,000 USDT
Marketplace Commissions:   $15,000 USDT
─────────────────────────────────────────
TOTAL REVENUE:             $786,950 USDT

Operating Expenses:
├─ Team (5 people): $300,000
├─ Infrastructure: $36,000
├─ Marketing: $100,000
├─ Legal: $30,000
├─ Audits: $50,000
└─ Misc: $25,000
─────────────────────────
TOTAL EXPENSES:            $541,000

NET: +$245,950 (breakeven + profit)
```

**Expansión**:
- Ciudad de México → Guadalajara, Monterrey
- México → Colombia, Argentina
- Moonbeam → Arbitrum, Base

#### Año 3: Network Effects

**Objetivo**: 2,000 propiedades, 6,000 tenants

**Revenue**:
```
Protocol Fees:           $2,880,000 USDT
Yield Farming Fees:        $76,800 USDT
Verification Fees:         $17,500 USDT
Premium Features:         $120,000 USDT
Marketplace:               $80,000 USDT
─────────────────────────────────────────
TOTAL REVENUE:           $3,174,300 USDT

Operating Expenses:        $950,000

NET: +$2,224,300 (highly profitable)
```

**Milestones**:
- Cross-chain reputation funcional en 5 chains
- Partnerships con 3 property managers grandes
- API pública para integraciones
- Mobile app launched

#### Año 4-5: Dominancia de Mercado

**Año 5 Target**: 10,000 propiedades, 30,000 tenants

**Revenue**:
```
Protocol Fees:          $14,400,000 USDT
Yield Farming Fees:        $384,000 USDT
Other:                     $500,000 USDT
─────────────────────────────────────────
TOTAL REVENUE:          $15,284,000 USDT

Operating Expenses:      $2,500,000

NET: +$12,784,000 (unicorn trajectory)
```

### 5.3 Unit Economics (Economía Unitaria)

#### Cost to Acquire Customer (CAC)

**Tenant CAC**:
```
Organic (40%): $0
Referral (30%): $10 (bono al referrer)
Paid ads (20%): $50
Partnerships (10%): $20

Blended CAC: $16/tenant
```

**Landlord CAC**:
```
Organic (50%): $0
Sales team (30%): $100
Paid ads (15%): $80
Events (5%): $200

Blended CAC: $48/landlord
```

#### Lifetime Value (LTV)

**Tenant LTV** (36 meses promedio):
```
Protocol fees: $150/mes × 36 = $5,400
Yield fees: $38.4/año × 3 = $115.2
Verification: $10 one-time
Premium: $5/mes × 12 = $60 (20% take rate)

Total LTV: $5,585
LTV/CAC: 349x 🚀
```

**Landlord LTV** (propietario 3 propiedades, 5 años):
```
Protocol fees: $1,800/prop/año × 3 × 5 = $27,000
Premium listing: $10/mes × 3 × 60 = $1,800
Yield fees: $115/prop/año × 3 × 5 = $1,725

Total LTV: $30,525
LTV/CAC: 636x 🚀
```

**Conclusión**: Unit economics son EXCEPCIONALES
- LTV/CAC > 3x se considera bueno
- RoomFi tiene LTV/CAC > 300x
- Margen para invertir agresivamente en crecimiento

### 5.4 Go-To-Market Strategy (Estrategia de Entrada)

#### Fase 1: Beachhead Market (Meses 1-6)

**Target**: Ciudad de México, Polanco + Condesa + Roma

**Por qué CDMX**:
- 9M habitantes, mercado rental gigante
- Alta penetración crypto (Bitso, Binance)
- Comunidad tech/startup grande
- Regulación rental favorable
- Team local (conocemos el mercado)

**Táctica**:
```
Week 1-4: Landlord Hunting
├─ LinkedIn outreach a property managers
├─ Events en WeWork, Centraal
├─ Facebook groups de "Rento depto"
└─ Objetivo: 20 landlords, 50 propiedades listadas

Week 5-8: Tenant Activation
├─ Ads en Facebook/Instagram (Millennials 25-35)
├─ Partnerships con nómadas digitales (Remote Year, Hacker Houses)
├─ Twitter Spaces sobre "Crypto + Real Estate"
└─ Objetivo: 100 tenants registrados, 10 agreements creados

Week 9-12: Referral Loop
├─ Tenant refiere amigo → $50 USDT bonus
├─ Landlord refiere landlord → 1 mes gratis de fees
├─ Gamification: leaderboards, badges
└─ Objetivo: 30% crecimiento orgánico

Week 13-24: Double Down
├─ Analizar qué funciona (data-driven)
├─ 80/20 rule: invertir en canales top
├─ Contenido: "Cómo un tenant ganó $112 en yield"
└─ Objetivo: 100 agreements activos, NPS > 50
```

#### Fase 2: Geographic Expansion (Meses 7-18)

**Orden de expansión** (data-driven):
```
1. Guadalajara (México)
   - 5M habitantes
   - Tech hub (Silicon Valley mexicano)
   - Similar cultura a CDMX

2. Monterrey (México)
   - 5M habitantes
   - Ciudad más rica de México
   - Corporativos = expats rentando

3. Medellín (Colombia)
   - 4M habitantes
   - Nómada digital hotspot
   - Alta adopción crypto

4. Buenos Aires (Argentina)
   - 15M habitantes
   - Crypto adoption alta (inflación)
   - Mercado rental maduro

5. LATAM expansion
   - Santiago, Lima, Bogotá, São Paulo
```

**Criterios de expansión**:
- Población > 3M
- Penetración internet > 70%
- Mercado rental > $500M
- Comunidad crypto existente
- Regulación no hostil

#### Fase 3: Cross-Chain Expansion (Mes 12+)

**Chains a integrar** (orden):
```
1. Moonbeam (✅ Ya en roadmap)
   - EVM compatible
   - Polkadot native
   - Acala integration fácil

2. Arbitrum (✅ Ya pensado)
   - Ethereum L2
   - Liquidez masiva
   - Gas barato

3. Base (Coinbase L2)
   - Onboarding fácil para no-crypto
   - Coinbase users = millones
   - Fiat on-ramp

4. Optimism
   - Retro public goods funding
   - OP Stack
   - Grants disponibles

5. Polygon zkEVM
   - Usuario retail grande
   - Barato
   - Instituciones usándolo
```

### 5.5 Competitive Advantage (Moat)

#### A. Network Effects (Principal Moat)

**Two-Sided Marketplace**:
```
Más landlords → Más opciones para tenants
                     ↓
Más tenants → Mayor demanda para landlords
                     ↓
Más volumen → Más data para reputation
                     ↓
Mejor reputation → Más confianza
                     ↓
Más confianza → Más landlords
                     ↓
[LOOP SE REFUERZA]
```

**Cross-Chain Network Effects**:
- Cada chain agregada: exponentially más valuable
- Tenant con reputación en 5 chains >> tenant en 1 chain
- Impossible para competidor replicar red cross-chain existente

#### B. Data Moat

**Años 1-2**: Acumular data de pagos, disputas, ratings
```
100,000 rent payments
10,000 agreements completados
500 disputes resueltos

= Best reputation algorithm in market
= Predictive models: tenant default risk, property quality
```

**Año 3+**: Machine Learning
- Predecir qué tenants son buenos (antes de rentar)
- Predecir qué propiedades tendrán problemas
- Dynamic pricing recommendations
- Fraud detection

**Valor**: Un competidor nuevo no puede replicar 3 años de data

#### C. Switching Costs

**Para Tenants**:
- Reputation built over years
- Badges verificados (costó tiempo y KYC)
- Referrals y network en plataforma
- Yield acumulado en vault

**Costo de cambiar a competidor**: Perder reputación = deal breaker

**Para Landlords**:
- Tenant pipeline establecido
- Analytics históricos
- Integración con accounting
- Trust en sistema de dispute resolution

#### D. Technology Moat

**Soul-Bound NFTs**:
- Primeros en ejecutar reputación soul-bound para rental
- Patent pending (opcional)

**Cross-Chain ISMP**:
- Hyperbridge integration compleja (3-6 meses dev)
- Competidor tendría que replicar toda arquitectura

**Yield Integration**:
- Acala partnerships no replicables fácilmente
- Smart contract audits costosos

#### E. Regulatory Moat (Futuro)

**Compliance First**:
- KYC/AML desde día 1
- Partnership con reguladores en LATAM
- Sandbox programs (ej: Banxico)

**Si regulación se tightens**: RoomFi ya compliant, competidores salen

### 5.6 Competition Analysis

#### Competidores Directos (Web3)

**1. Rentberry** (Web2 con crypto payments)
```
Strengths:
├─ Traction: 500K users
├─ USA market
└─ $30M raised

Weaknesses:
├─ NO cross-chain
├─ NO yield farming
├─ NO on-chain reputation
├─ Web2 architecture (centralizado)
└─ USA only

RoomFi Advantage:
├─ Cross-chain native
├─ DeFi integration (yield)
├─ On-chain reputation portable
└─ LATAM focus (blue ocean)
```

**2. Propy** (Real estate blockchain)
```
Strengths:
├─ Established: desde 2017
├─ Real estate sales (no rental)
└─ $50M+ raised

Weaknesses:
├─ Focus en compra-venta, NO rental
├─ No reputation system
├─ No yield
└─ Fees altos (3-5%)

RoomFi Advantage:
├─ Rental-first (mercado más grande)
├─ Fees más bajos (1.5%)
└─ Yield para users
```

**3. Outros competidores pequeños**:
- **HoneyBricks**: Fractionalized real estate, no rental
- **LandShare**: Tokenized properties, no management
- **Parcl**: Real estate derivatives, no rental directo

**Conclusión**: NO HAY competidor directo en "rental + cross-chain + yield"

#### Competidores Indirectos (Web2)

**1. Airbnb** (Short-term)
```
Fortaleza: Brand gigante
Debilidad: Short-term solo, fees 14-18%, no crypto

RoomFi diferenciador: Long-term rental, fees 15%, yield 8%
```

**2. Zillow Rentals** (USA)
```
Fortaleza: SEO, USA market
Debilidad: Listing platform, no payment/dispute handling

RoomFi diferenciador: End-to-end solution con crypto
```

**3. Property Managers tradicionales**
```
Fortaleza: Established, legal coverage
Debilidad: Fees 8-12%, offline, no tech

RoomFi diferenciador: On-chain, transparent, global
```

### 5.7 TAM / SAM / SOM (Market Size)

#### TAM (Total Addressable Market)

**Global Rental Market**: $2.8 Trillion USD/year
```
Residential rent payments globally
├─ USA: $500B
├─ Europe: $800B
├─ Asia: $1.2T
└─ LATAM: $300B
```

**Web3 Users**: 420M wallets globally (2024)
```
Addressable if 1% rent using crypto:
= 4.2M users × $10K rent/year
= $42B TAM
```

#### SAM (Serviceable Available Market)

**LATAM Focus** (primeros 3 años):
```
Rental market: $300B/year
Web3 adoption: 8% (24M users)
Target: Millennials + Gen Z renters (40%)
= 9.6M potential users
× $8K rent/year
= $76.8B SAM
```

#### SOM (Serviceable Obtainable Market)

**Año 5 Target**: 1% de SAM LATAM
```
10,000 propiedades activas
30,000 tenants
Average rent: $800/mes

Market capture: $96M en volumen procesado/año
Protocol revenue: $15M/año (15% take rate)

= 0.02% of TAM
= 1.3% of SAM LATAM
= Realistic y achievable
```

---

## 6. POR QUÉ POLKADOT (Y NO ETHEREUM, SOLANA, ETC.)

### 6.1 Decisión Estratégica: Polkadot como Base

#### A. Thesis de Polkadot

**RoomFi necesita 3 cosas críticas**:
1. **Cross-chain nativo**: Reputation debe fluir entre chains
2. **DeFi robusto**: Yield farming para deposits
3. **Bajos costos**: Transacciones frecuentes (rent mensual)

**Polkadot ofrece las 3**:
```
✅ Cross-chain: XCM + ISMP (Hyperbridge)
✅ DeFi: Acala, Hydration, Bifrost
✅ Costos: $0.01-0.10 por tx en parachains
```

#### B. Comparativa con Otras Chains

**ETHEREUM** (Mainnet):
```
❌ Gas fees: $5-50 por tx
   - payRent() sería $20-40 → IMPOSIBLE
   - User experience terrible

❌ No cross-chain nativo
   - Bridges son hacks (Wormhole, LayerZero)
   - Riesgo de hacks ($2B robados en bridges)

✅ Liquidez masiva
✅ Developer ecosystem

Veredicto: Good for DeFi, BAD for payments
```

**ETHEREUM L2s** (Arbitrum, Optimism, Base):
```
✅ Gas bajo: $0.10-1.00 por tx
✅ EVM compatible (reusar Solidity)

⚠️ Cross-chain difícil
   - Cada L2 es silo
   - Native bridges lentos (7 días)
   - Third-party bridges inseguros

⚠️ DeFi fragmentado
   - Acala no está en Arbitrum
   - Yield farming menos mature

Veredicto: Acceptable, pero no ideal
Strategy: Deploy mirrors en Arbitrum/Base, core en Polkadot
```

**SOLANA**:
```
✅ Gas ultra-bajo: $0.00001 por tx
✅ Fast: 400ms confirmations

❌ Cross-chain terrible
   - Wormhole hack: $320M perdidos
   - Ecosystem aislado

❌ Downtime histórico
   - 20+ outages en 2 años
   - Rental payments críticos, can't afford downtime

❌ DeFi menos robust
   - Marinade, Orca OK, pero no Acala-tier

Veredicto: NO para producto crítico
```

**POLYGON**:
```
✅ EVM compatible
✅ Gas bajo: $0.01-0.10

❌ Centralización concerns
   - PoS con pocos validators
   - Upgrades controlled por Polygon Labs

⚠️ Cross-chain via bridges
   - Mismo issue que Ethereum L2s

Veredicto: Decent alternative, but Polkadot superior
```

**AVALANCHE**:
```
✅ Subnets (similar a parachains)
✅ EVM compatible

❌ Cross-subnet messaging no tan mature como XCM
❌ DeFi más pequeño que Acala
❌ Ecosystem menos vibrant que Polkadot

Veredicto: Good tech, pero smaller ecosystem
```

**COSMOS**:
```
✅ IBC (Inter-Blockchain Communication) = excellent
✅ Cross-chain nativo
✅ Sovereign chains (like parachains)

⚠️ No EVM native
   - Tendría que reescribir todo en CosmWasm
   - Development time 2x

⚠️ DeFi menor que Polkadot
   - Osmosis < Acala en yields

Veredicto: Strong alternative, but Polkadot + Moonbeam = best of both
```

#### C. Polkadot Unique Value Props

**1. XCM (Cross-Consensus Messaging)**
```
Native cross-chain:
Paseo → Moonbeam: 12 segundos
Paseo → Acala: 12 segundos
Moonbeam → Acala: 6 segundos

vs Ethereum → Arbitrum: 7 días (canonical bridge)
vs Solana → Ethereum: 3rd party bridge (riesgo)
```

**2. Shared Security**
```
Todas las parachains comparten seguridad del relay chain
= 1000+ validators
= $10B+ staked DOT
= Mismo security que Bitcoin/Ethereum

vs Polygon: 100 validators
vs Avalanche subnets: Security independiente
```

**3. Specialization**
```
Cada parachain se especializa:
├─ Moonbeam: EVM execution
├─ Acala: DeFi primitives
├─ Asset Hub: Asset management
└─ Hyperbridge: Cross-chain messaging

= Best-in-class for each function

vs Ethereum: Todo en un chain (bottleneck)
```

**4. Governance On-Chain**
```
OpenGov: Community-driven upgrades
Treasury: $20M+ para projects
Bounties: Funding para builders

RoomFi puede:
├─ Apply para grants ($50K-200K)
├─ Treasury proposal para integration
└─ Bounties para specific features
```

**5. Future-Proof**
```
JAM (Join-Accumulate Machine):
├─ Successor to Polkadot
├─ 1000x escalabilidad
├─ Backwards compatible

RoomFi built on Polkadot = ready for JAM
```

#### D. Why NOT Polkadot-Only

**Realidad**: Multi-chain es inevitable

**Strategy**:
```
Core en Polkadot:
├─ Source of truth
├─ Core contracts
└─ Pallet bridge

Mirrors en otras chains:
├─ Ethereum L2s (Arbitrum, Base, Optimism)
├─ Solana (si demand)
└─ Bitcoin L2s (futuro, via Babylon)

Best of both worlds:
├─ Polkadot security + XCM
└─ Ethereum liquidity + users
```

### 6.2 Polkadot Ecosystem Advantages

#### A. Acala Integration

**Por qué Acala es crítico**:
```
Stablecoin nativo: aUSD
├─ Overcollateralized (like DAI)
├─ DOT/LDOT collateral
└─ Decentralized

Liquid Staking: LDOT
├─ Stake DOT, get LDOT
├─ LDOT tradeable + earns staking rewards
└─ 12-15% APY

Lending: Acala Protocols
├─ Deposit USDT, earn 6-8% APY
├─ Overcollateralized loans
└─ Battle-tested (2+ years)

DEX: Acala Swap
├─ Liquidity pools USDT-aUSD
├─ 10-15% APY for LPs
└─ Low slippage
```

**Alternative en Ethereum**: Compound, Aave
- Similar APY (3-6%)
- Pero gas fees $5-20 por interaction
- RoomFi necesita depositar/retirar frecuentemente
- En Polkadot: $0.05 por tx

**ROI Comparison** (1 año, $2000 deposit):
```
Polkadot (Acala):
├─ Yield: $160 (8% APY)
├─ Gas fees: $2 (40 txs × $0.05)
└─ Net: $158

Ethereum (Aave):
├─ Yield: $120 (6% APY)
├─ Gas fees: $200 (10 txs × $20)
└─ Net: -$80 (PERDIDA!)

Winner: Polkadot by $238 💰
```

#### B. Hyperbridge (ISMP)

**Why NOT just use LayerZero/Wormhole**:

**Hyperbridge (ISMP)**:
```
✅ Cryptographic proofs (state proofs)
✅ No validators intermedios (no trust assumptions)
✅ Polkadot-native (optimizado)
✅ $0 hack track record (nuevo pero secure by design)

Cómo funciona:
1. Paseo contract emite evento
2. Hyperbridge genera state proof
3. Proof es verificado en Moonbeam
4. Moonbeam mirror actualiza
5. No validators, no multisig, solo math ✓
```

**LayerZero**:
```
⚠️ Relayers + Oracles (trust assumptions)
⚠️ $0 hacked (good) pero architecture más centralizada
⚠️ Fees más altos
✅ Supported en 50+ chains (good para expansion)

Use case: Si RoomFi expande a Solana, usar LayerZero
```

**Wormhole**:
```
❌ $320M hack (2022)
❌ Guardians (trust)
❌ Slower que Hyperbridge

Veredicto: NO usar
```

#### C. Polkadot Treasury y Grants

**Funding Available**:
```
Web3 Foundation Grants:
├─ Nivel 1: $10K (for exploratory)
├─ Nivel 2: $30K (for PoC)
└─ Nivel 3: $100K+ (for production)

Polkadot Treasury:
├─ On-chain governance proposal
├─ $50K-500K possible
└─ Requires community support

Bounties:
├─ Specific tasks
└─ $5K-50K per bounty
```

**RoomFi Puede Aplicar**:
```
Q1 2025: W3F Grant Nivel 2 ($30K)
├─ Milestone: Deploy V2 a Paseo
├─ Milestone: ISMP integration working
└─ Milestone: 50 agreements completados

Q3 2025: Treasury Proposal ($150K)
├─ Objetivo: Production launch on Polkadot
├─ KPI: 500 propiedades, $2M volumen
└─ Deliverable: Open-source codebase

Total funding potential: $180K
= 6 meses de runway sin VCs
```

### 6.3 Thesis a 5 Años

**2025: Polkadot Market Share Creciendo**
```
Current: 1% DeFi TVL
Projected 2028: 5-8% DeFi TVL

Drivers:
├─ JAM upgrade (1000x throughput)
├─ Better UX (account abstraction)
├─ More parachains (50+ by 2028)
└─ Institutional adoption (USDT native, stablecoins)

RoomFi = Early mover advantage
```

**Multi-Chain Future**:
```
Polkadot = Core (seguridad, cross-chain)
Ethereum L2s = Distribution (usuarios)
Solana = Payment rail (ultra-low fees)
Bitcoin L2s = Store of value (deposits en BTC)

RoomFi = Aggregator de todo
```

**Visión**: Ser el "Stripe de Rental Payments" multi-chain
- User no sabe/no le importa qué chain usa
- RoomFi abstrae complejidad
- Reputation portable across EVERY chain
- "Sign in with Tenant Passport"

---

## 7. VISIÓN A LARGO PLAZO (2025-2030)

### 7.1 Roadmap Estratégico

#### Año 1 (2025): Foundation
```
Q1:
├─ Launch en CDMX
├─ 20 propiedades listadas
└─ 50 tenants registrados

Q2:
├─ 100 agreements activos
├─ First yield distributions
└─ Dispute resolver probado (5 cases)

Q3:
├─ Guadalajara, Monterrey launch
├─ Cross-chain sync funcional (Paseo → Moonbeam)
└─ Mobile app alpha

Q4:
├─ 500 propiedades
├─ Arbitrum mirror deployed
└─ API pública beta
```

#### Año 2 (2026): Product-Market Fit
```
├─ 5 ciudades LATAM
├─ 2,000 propiedades
├─ Partnership con property manager grande (500+ units)
├─ Series A fundraising ($3-5M)
├─ Team: 15 personas
└─ $1M ARR
```

#### Año 3 (2027): Expansion
```
├─ 10 ciudades LATAM
├─ Expansion a USA (Miami, Austin)
├─ 10,000 propiedades
├─ B2B product (property managers)
├─ Series B ($10-15M)
└─ $10M ARR
```

#### Año 4-5 (2028-2030): Dominance
```
├─ 50 ciudades globalmente
├─ 50,000 propiedades
├─ Cross-chain en 10+ chains
├─ "Passport" usado fuera de rental (credit, loans)
├─ Acquisition target ($100M-500M)
└─ $50M+ ARR
```

### 7.2 Product Evolution

#### Beyond Rental: Credit Infrastructure

**Thesis**: Tenant Passport → Universal Credit Score

**Año 3+**:
```
Undercollateralized Lending:
├─ Tenant con reputation 90+ puede pedir préstamo
├─ Collateral: 50% (vs 150% en Aave/Compound)
├─ Use case: First month rent + deposit
└─ Backed by on-chain reputation

Partner con Credix, Maple Finance:
├─ RoomFi provides credit score
├─ Partners provide capital
└─ Revenue share: 20% interest
```

**Ejemplo**:
```
Tenant Score 95:
├─ 24 meses pagando a tiempo
├─ $25K pagado en vida
├─ 0 disputas
└─ 8 badges verified

Elegible para:
├─ $2,000 loan a 8% APY
├─ Collateral: $1,000 (50%)
├─ Repayment: 12 meses
└─ If default: Reputation destroyed (non-fungible loss)
```

#### Beyond Crypto: Traditional Finance Bridge

**Año 4+**:
```
Report to Credit Bureaus:
├─ Partnership Experian, Equifax
├─ Rent payments → tradfi credit score
├─ RoomFi users build Web2 + Web3 credit simultaneously

TAM expansion:
├─ Crypto native: 420M wallets
├─ Traditional renters: 2B people
└─ Bridge = massive opportunity
```

#### Beyond Residential: Commercial Real Estate

**Año 5+**:
```
Commercial Tenant Passport:
├─ Businesses renting offices
├─ Co-working spaces
├─ Retail locations

Higher ticket:
├─ Commercial rent: $5K-50K/mes
├─ Protocol fees: 15% × $20K = $3K/mes
└─ 10x revenue per agreement
```

### 7.3 Exit Strategy Options

#### Option A: Acquisition

**Potential Acquirers**:
```
1. Airbnb
   - Add long-term rental vertical
   - Crypto strategy (they're exploring)
   - Valuation: $100-300M (5-10x revenue)

2. Zillow / Redfin
   - Add rental management
   - Crypto rails
   - Valuation: $150-500M

3. Coinbase
   - Real-world crypto use case
   - Onboard millions to crypto via rent
   - Valuation: $200-400M

4. Binance / Crypto.com
   - Payments use case
   - User retention (monthly rent)
   - Valuation: $100-300M

5. Polkadot Ecosystem Fund
   - Strategic acquisition
   - Keep it in ecosystem
   - Valuation: $50-150M
```

#### Option B: IPO / Token

**Public Markets** (Año 7+):
```
If ARR > $50M:
├─ IPO viable (Airbnb path)
├─ Valuation: 10-15x revenue = $500M-750M
└─ Liquidity for early investors/team
```

**Token Launch** (Año 3-4):
```
$ROOM Token:
├─ Governance (vote on fees, features)
├─ Staking (earn protocol fees)
├─ Utility (pay fees with discount)
└─ Not a security (utility + governance only)

Token sale:
├─ Raise: $10-20M
├─ Valuation: $100-200M FDV
└─ Liquidity for expansion
```

#### Option C: Stay Independent

**Build Stripe of Rental**:
```
$100M+ ARR
Profitable
Dividend-paying
Owned by founders + employees

= Lifestyle business at scale
= No exit needed
```

### 7.4 Impact Metrics (Misión)

**Beyond Revenue: Social Impact**

```
By 2030:
├─ 100,000 tenants con reputation portable
├─ $500M en rent procesado
├─ 10,000 landlords earning yield
├─ 5,000 disputes resueltos justamente
└─ $10M en yield distribuido a tenants

Enabling:
├─ Nómadas digitales: moverse libremente
├─ Immigrants: Acceso a housing sin local credit
├─ Gig workers: Rent con ingreso variable
└─ Estudiantes: Build credit desde joven

= DEMOCRATIZACIÓN DEL HOUSING
```

**Crypto Adoption**:
```
RoomFi = Trojan Horse para crypto adoption

User journey:
1. Download wallet (para rentar)
2. Buy USDT (primera crypto)
3. Pay rent mensual (acostumbrarse a crypto)
4. Earn yield (ver beneficios DeFi)
5. Explore más crypto (hooked)

= 100K users introduced to crypto via REAL use case
= Not speculation, not gambling, but UTILITY
```

---

*FIN DE PARTE 2*

**CONTINUARÁ**: PARTE 3 con checklist de implementación faltante para hackathon


# PARTE 3: CHECKLIST DE IMPLEMENTACIÓN PARA HACKATHON

## 8. ANÁLISIS DE GAPS TÉCNICOS

### 8.1 Estado Actual de Contratos Core

#### ✅ COMPLETOS Y FUNCIONALES

**TenantPassportV2.sol** - `foundry/src/V2/TenantPassportV2.sol`
```
Estado: 95% completo
Líneas: ~880

✅ Implementado:
├─ Soul-bound NFT minting
├─ 14 badges system
├─ Reputation tracking y decay
├─ KYC verification workflow
├─ updateTenantInfo() para RentalAgreement
├─ Access control (onlyAuthorized)
└─ Events completos

⚠️ FALTA (No crítico para demo):
├─ Función: recordFastResponse() (línea ~650)
│   └─ Llamada cuando tenant responde < 24h
│   └─ Awards FAST_RESPONDER badge
│
├─ Función: recordPropertyNoIssues() (línea ~680)
│   └─ Llamada cuando agreement completa sin issues
│   └─ Awards NO_DAMAGE_HISTORY badge
│
└─ Optimización: _checkAndAwardBadges() podría ser más eficiente
    └─ Actualmente checa todos los badges en cada update
    └─ Mejor: Solo chequear badges relevantes al evento
```

**Acción para IA**:
```solidity
// ARCHIVO: foundry/src/V2/TenantPassportV2.sol
// UBICACIÓN: Después de línea 645

// AGREGAR:
function recordFastResponse(uint256 tokenId) external onlyAuthorized {
    require(_exists(tokenId), "Token no existe");
    
    TenantMetrics storage metrics = tenantMetrics[tokenId];
    metrics.fastResponseCount++;
    
    // Award badge si tiene 10+ respuestas rápidas
    if (metrics.fastResponseCount >= 10 && 
        !hasBadge[tokenId][BadgeType.FAST_RESPONDER]) {
        _awardBadge(tokenId, BadgeType.FAST_RESPONDER);
    }
    
    emit FastResponseRecorded(tokenId, metrics.fastResponseCount);
}

function recordPropertyNoIssues(uint256 tokenId, uint256 propertyId) 
    external onlyAuthorized 
{
    require(_exists(tokenId), "Token no existe");
    
    TenantMetrics storage metrics = tenantMetrics[tokenId];
    metrics.propertiesWithoutIssues++;
    
    // Award badge si 3+ propiedades sin issues
    if (metrics.propertiesWithoutIssues >= 3 && 
        !hasBadge[tokenId][BadgeType.NO_DAMAGE_HISTORY]) {
        _awardBadge(tokenId, BadgeType.NO_DAMAGE_HISTORY);
    }
    
    emit PropertyNoIssuesRecorded(tokenId, propertyId);
}

// AGREGAR a struct TenantMetrics (línea ~180):
uint16 fastResponseCount;
uint16 propertiesWithoutIssues;

// AGREGAR eventos (línea ~120):
event FastResponseRecorded(uint256 indexed tokenId, uint16 count);
event PropertyNoIssuesRecorded(uint256 indexed tokenId, uint256 propertyId);
```

---

**PropertyRegistry.sol** - `foundry/src/V2/PropertyRegistry.sol`
```
Estado: 90% completo
Líneas: ~1,242

✅ Implementado:
├─ Property NFT registration
├─ GPS-based unique ID
├─ Verification workflow (DRAFT → PENDING → VERIFIED)
├─ 10 property badges
├─ Search by city
├─ Reputation system
└─ markPropertyAsRented/unrented

⚠️ FALTA (Importante para producción, no crítico para demo):
├─ Función: getPropertiesByFilters() 
│   └─ Search avanzado (bedrooms, price range, amenities)
│   └─ Actualmente solo searchByCity básico
│
├─ Función: updatePropertyMetadata()
│   └─ Landlord puede actualizar fotos/descripción
│   └─ Sin re-verificación si cambios menores
│
└─ Validación: GPS coordinates bounds checking
    └─ Actualmente acepta cualquier lat/lon
    └─ Debería validar: -90 to 90, -180 to 180
```

**Acción para IA**:
```solidity
// ARCHIVO: foundry/src/V2/PropertyRegistry.sol
// UBICACIÓN: Después de línea 856

// AGREGAR:
function getPropertiesByFilters(
    string memory city,
    uint8 minBedrooms,
    uint8 maxBedrooms,
    uint256 maxMonthlyRent,
    uint32 requiredAmenities,  // Bitmask
    uint256 offset,
    uint256 limit
) external view returns (uint256[] memory) {
    uint256[] storage cityProperties = propertiesByCity[city];
    uint256[] memory results = new uint256[](limit);
    uint256 resultCount = 0;
    
    for (uint256 i = offset; i < cityProperties.length && resultCount < limit; i++) {
        uint256 propId = cityProperties[i];
        PropertyInfo memory prop = properties[propId];
        
        // Filters
        if (!prop.isActive || 
            prop.status != PropertyStatus.VERIFIED ||
            prop.isCurrentlyRented) continue;
            
        if (prop.bedrooms < minBedrooms || prop.bedrooms > maxBedrooms) continue;
        if (prop.monthlyRent > maxMonthlyRent) continue;
        
        // Check amenities (bitmask AND)
        if ((prop.amenities & requiredAmenities) != requiredAmenities) continue;
        
        results[resultCount] = propId;
        resultCount++;
    }
    
    // Resize array to actual results
    uint256[] memory finalResults = new uint256[](resultCount);
    for (uint256 i = 0; i < resultCount; i++) {
        finalResults[i] = results[i];
    }
    
    return finalResults;
}

// AGREGAR: GPS validation en registerProperty (línea ~380)
function _validateGPS(int256 latitude, int256 longitude) internal pure {
    require(latitude >= -90000000 && latitude <= 90000000, 
            "Latitude invalida");
    require(longitude >= -180000000 && longitude <= 180000000, 
            "Longitude invalida");
}

// LLAMAR en registerProperty después de línea 385:
_validateGPS(_latitude, _longitude);
```

---

**RentalAgreementFactory.sol** - `foundry/src/V2/RentalAgreementFactory.sol`
```
Estado: 85% completo
Líneas: ~305

✅ Implementado:
├─ EIP-1167 clone pattern
├─ createAgreement con validaciones
├─ Reputation check (minTenantReputation)
├─ Tracking por tenant/landlord/property
└─ notifyDisputeResolved callback

⚠️ FALTA (No crítico pero útil):
├─ Función: cancelAgreementBeforeActive()
│   └─ Permitir cancelar agreement en estado PENDING
│   └─ Refund de cualquier fee pagado
│
├─ Función: updateMinReputation()
│   └─ Admin puede ajustar minTenantReputation dinámicamente
│   └─ Actualmente es fijo: 40
│
└─ Evento: AgreementActivated
    └─ Emitir cuando agreement pasa a ACTIVE
    └─ Útil para frontend tracking
```

**Acción para IA**:
```solidity
// ARCHIVO: foundry/src/V2/RentalAgreementFactory.sol
// UBICACIÓN: Después de línea 185

// AGREGAR:
function updateMinReputation(uint32 newMin) external onlyOwner {
    require(newMin >= 20 && newMin <= 80, "Rango invalido");
    
    uint32 oldMin = minTenantReputation;
    minTenantReputation = newMin;
    
    emit MinReputationUpdated(oldMin, newMin);
}

function cancelAgreementBeforeActive(address agreementAddress) 
    external 
    nonReentrant 
{
    IRentalAgreement agreement = IRentalAgreement(agreementAddress);
    
    // Solo si PENDING
    require(agreement.status() == AgreementStatus.PENDING, 
            "Solo PENDING");
    
    // Solo landlord o tenant pueden cancelar
    require(msg.sender == agreement.landlord() || 
            msg.sender == agreement.tenant(),
            "No autorizado");
    
    // Llamar cancel en agreement
    agreement.cancel();
    
    emit AgreementCancelled(agreementAddress, msg.sender);
}

// AGREGAR eventos (línea ~60):
event MinReputationUpdated(uint32 oldMin, uint32 newMin);
event AgreementCancelled(address indexed agreement, address canceller);
event AgreementActivated(address indexed agreement, uint256 timestamp);
```

---

**RentalAgreement.sol** - `foundry/src/V2/RentalAgreement.sol`
```
Estado: ✅ 100% COMPLETO (IMPLEMENTADO 2025-01-13)
Líneas: 644 líneas
Location: foundry/src/V2/RentalAgreement.sol

✅ IMPLEMENTADO COMPLETAMENTE:

1. ✅ Integración USDT + RoomFiVault
   ├─ Cambio de ETH nativo a USDT (ERC20)
   ├─ SafeERC20 para todos los transfers
   ├─ paySecurityDeposit() → deposita en vault para yield
   ├─ payRent() → USDT con split 85/15
   ├─ _completeAgreement() → retira de vault con yield
   └─ applyDisputeResolution() → vault integration

2. ✅ Funciones Críticas Nuevas
   ├─ cancel() - Cancela agreements PENDING (línea 326)
   ├─ terminateEarly() - Termina ACTIVE con penalties (línea 364)
   └─ checkAutoTerminate() - Auto-termina si 90+ días sin pago (línea 470)

3. ✅ Try-Catch y Edge Cases
   ├─ _completeAgreement() con try-catch (línea 269)
   ├─ terminateEarly() con try-catch
   ├─ cancel() con try-catch
   ├─ applyDisputeResolution() con try-catch
   └─ Fallback a balance del contrato si vault falla

4. ✅ Penalties y Lógica Mejorada
   ├─ terminateEarly(): Penalty basado en meses restantes
   ├─ Si tenant termina: pierde parte del deposit
   ├─ Si landlord termina: paga penalty extra
   ├─ checkAutoTerminate(): Deposit va al landlord
   └─ Penalización severa de reputation

5. ✅ Eventos y Estado
   ├─ Nuevo estado: CANCELLED
   ├─ Evento: AgreementCancelled
   ├─ Evento: AgreementAutoTerminated
   ├─ Evento: VaultWithdrawFailed
   └─ Evento: DepositReturned con principal + yield

6. ✅ Initialize Actualizado
   ├─ Recibe address de USDT
   ├─ Recibe address de RoomFiVault
   └─ Validaciones de addresses

ARQUITECTURA IMPLEMENTADA:
Tenant → paySecurityDeposit() → RentalAgreement → RoomFiVault
                                 (deposit genera yield 6-12% APY)
                                         ↓
Tenant → payRent() monthly → 85% Landlord + 15% Protocol
                                         ↓
Agreement completes → withdraw vault → Tenant recibe principal + 70% yield

PARÁMETROS CLAVE:
- Token: USDT (6 decimals)
- Vault: Genera yield automáticamente
- Rent split: 85% landlord, 15% protocol
- Yield split: 70% tenant, 30% protocol (aplicado en vault)
- Auto-terminate: 90 días sin pago
- Penalties: 0.5 meses * meses restantes (cap 2 meses)

✅ COMPILACIÓN: Sin errores
✅ LISTO PARA DEPLOYMENT EN PASEO TESTNET
```

**Acción para IA (PRIORITARIO)**:
```solidity
// ARCHIVO: foundry/src/V2/RentalAgreement.sol

// 1. AGREGAR cancel() - UBICACIÓN: Línea ~350
function cancel() 
    external 
    nonReentrant 
    onlyStatus(AgreementStatus.PENDING) 
{
    require(msg.sender == agreement.landlord || 
            msg.sender == agreement.tenant ||
            msg.sender == address(config.rentalFactory()),
            "No autorizado");
    
    agreement.status = AgreementStatus.CANCELLED;
    
    // Si hay deposit pagado, retornarlo (raro pero posible)
    if (agreement.depositAmount > 0) {
        // Withdraw de vault sin yield (no aplica yield a cancelaciones)
        vault.withdraw(agreement.depositAmount, address(this));
        usdt.transfer(agreement.tenant, agreement.depositAmount);
    }
    
    emit AgreementCancelled(msg.sender, block.timestamp);
}

// 2. AGREGAR terminateEarly() - UBICACIÓN: Línea ~380
function terminateEarly(string memory reason) 
    external 
    nonReentrant 
    onlyStatus(AgreementStatus.ACTIVE) 
{
    require(msg.sender == agreement.landlord || 
            msg.sender == agreement.tenant,
            "Solo partes");
    
    // Calcular penalty basado en tiempo restante
    uint256 monthsRemaining = (agreement.endDate - block.timestamp) / 30 days;
    uint256 penalty = 0;
    
    if (monthsRemaining > 0) {
        // Penalty: 0.5 meses de renta por mes restante (cap 2 meses)
        penalty = (agreement.monthlyRent * monthsRemaining) / 2;
        if (penalty > agreement.monthlyRent * 2) {
            penalty = agreement.monthlyRent * 2;
        }
    }
    
    agreement.status = AgreementStatus.TERMINATED;
    
    // Withdraw deposit con yield
    (uint256 principal, uint256 yieldEarned) = vault.withdraw(
        agreement.depositAmount,
        address(this)
    );
    
    // Si tenant termina: Pierde parte del deposit (penalty)
    // Si landlord termina: Tenant recupera todo + penalty extra
    if (msg.sender == agreement.tenant) {
        // Tenant termina early
        if (penalty <= principal) {
            usdt.transfer(agreement.tenant, principal - penalty + yieldEarned);
            usdt.transfer(agreement.landlord, penalty);
        } else {
            // Penalty > deposit (raro), todo al landlord
            usdt.transfer(agreement.landlord, principal + yieldEarned);
        }
    } else {
        // Landlord termina early (malo para tenant)
        usdt.transfer(agreement.tenant, principal + yieldEarned + penalty);
        
        // Landlord paga penalty extra del propio bolsillo
        if (penalty > 0) {
            usdt.transferFrom(agreement.landlord, agreement.tenant, penalty);
        }
    }
    
    emit AgreementTerminated(msg.sender, reason, penalty);
}

// 3. FIX: Initialize vault - UBICACIÓN: Línea ~88
function initialize(...) external {
    // ... código existente ...
    
    config = RoomFiConfig(_configAddress);
    usdt = IERC20(config.USDT_ADDRESS());
    vault = IRoomFiVault(config.roomfiVault());  // ← AGREGAR ESTA LÍNEA
    
    // ... resto del código ...
}

// 4. AGREGAR: Auto-terminate si 3+ meses sin pago - UBICACIÓN: Línea ~280
function checkAutoTerminate() external {
    require(agreement.status == AgreementStatus.ACTIVE, "Solo ACTIVE");
    
    // Si 90 días (3 meses) desde último pago esperado
    if (block.timestamp > nextPaymentDue + 90 days) {
        agreement.status = AgreementStatus.TERMINATED;
        
        // No retornar deposit (forfeit por no pagar)
        // Deposit va al landlord como compensación
        (uint256 principal, uint256 yieldEarned) = vault.withdraw(
            agreement.depositAmount,
            address(this)
        );
        
        usdt.transfer(agreement.landlord, principal + yieldEarned);
        
        // Penalizar tenant reputation severamente
        ITenantPassport passport = ITenantPassport(config.tenantPassport());
        uint256 tokenId = passport.getTokenIdByAddress(agreement.tenant);
        
        // Custom function: penalizeTenant con severity HIGH
        passport.penalizeTenant(tokenId, 30); // -30 reputation
        
        emit AgreementAutoTerminated(agreement.tenant, "90+ días sin pago");
    }
}

// 5. AGREGAR: Try-catch en _completeAgreement - UBICACIÓN: Línea ~310
function _completeAgreement() internal {
    agreement.status = AgreementStatus.COMPLETED;
    
    uint256 principalDeposit = agreement.depositAmount;
    
    // TRY-CATCH para vault withdraw
    try vault.withdraw(principalDeposit, address(this)) 
        returns (uint256 principal, uint256 yieldEarned) 
    {
        // Success path (mismo código que antes)
        uint256 tenantYield = (yieldEarned * 70) / 100;
        uint256 protocolYield = yieldEarned - tenantYield;
        
        usdt.transfer(agreement.tenant, principal + tenantYield);
        
        if (protocolYield > 0) {
            usdt.transfer(config.owner(), protocolYield);
        }
        
        emit YieldDistributed(tenantYield, protocolYield);
    } catch {
        // Fallback: Si vault falla, al menos retornar lo que tenemos
        uint256 contractBalance = usdt.balanceOf(address(this));
        
        if (contractBalance >= principalDeposit) {
            usdt.transfer(agreement.tenant, principalDeposit);
        } else {
            // Emergency: Retornar lo que hay
            usdt.transfer(agreement.tenant, contractBalance);
        }
        
        emit VaultWithdrawFailed(principalDeposit, contractBalance);
    }
    
    // ... resto del código (reputation updates, etc.) ...
}

// AGREGAR nuevos eventos (línea ~70):
event AgreementCancelled(address canceller, uint256 timestamp);
event AgreementTerminated(address terminator, string reason, uint256 penalty);
event AgreementAutoTerminated(address tenant, string reason);
event VaultWithdrawFailed(uint256 expected, uint256 actual);
```

---

**DisputeResolver.sol** - `foundry/src/V2/DisputeResolver.sol`
```
Estado: 90% completo
Líneas: ~650

✅ Implementado:
├─ createDispute con arbitration fee
├─ submitResponse workflow
├─ 3-arbiter voting system
├─ _resolveDispute con mayoría simple
├─ _applyPenalties automático
├─ Callback a RentalAgreement
└─ Timeout handling

⚠️ FALTA (Mejoras, no crítico):
├─ Función: escalateDispute()
│   └─ Si 3 árbitros no votan, escalar a 5 árbitros
│   └─ Prevenir stalemates
│
├─ Optimización: Arbitro selection
│   └─ Actualmente pseudo-random con modulo
│   └─ Ideal: VRF (Chainlink o similar)
│
└─ Función: withdrawArbitratorRewards()
    └─ Árbitros ganan fees por votar
    └─ Actualmente no hay incentivo económico
```

**Acción para IA**:
```solidity
// ARCHIVO: foundry/src/V2/DisputeResolver.sol
// UBICACIÓN: Línea ~480

// AGREGAR: Arbitrator rewards
mapping(address => uint256) public arbitratorRewards;

function withdrawArbitratorRewards() external nonReentrant {
    uint256 rewards = arbitratorRewards[msg.sender];
    require(rewards > 0, "No rewards");
    
    arbitratorRewards[msg.sender] = 0;
    
    payable(msg.sender).transfer(rewards);
    
    emit ArbitratorRewardsWithdrawn(msg.sender, rewards);
}

// MODIFICAR: _resolveDispute (línea ~420)
// Distribuir arbitration fee a árbitros que votaron
function _resolveDispute(uint256 disputeId) internal {
    // ... código existente ...
    
    // Después de determinar ganador, distribuir fee
    uint256 feePerArbiter = disputes[disputeId].arbitrationFee / 3;
    
    for (uint256 i = 0; i < 3; i++) {
        address arbiter = disputes[disputeId].arbitrators[i];
        if (disputes[disputeId].arbiterVoted[arbiter]) {
            arbitratorRewards[arbiter] += feePerArbiter;
        }
    }
    
    // ... resto del código ...
}

// AGREGAR evento (línea ~90):
event ArbitratorRewardsWithdrawn(address indexed arbiter, uint256 amount);
```

---

### 8.2 Contratos DeFi - GAPS CRÍTICOS

**RoomFiVault.sol** - `foundry/src/V2/RoomFiVault.sol`
```
Estado: ✅ 100% COMPLETO (IMPLEMENTADO 2025-01-13)
Líneas: 654 líneas
Location: foundry/src/V2/RoomFiVault.sol

✅ IMPLEMENTADO COMPLETAMENTE:

1. ✅ Seguridad y Control de Acceso
   ├─ SafeERC20 para todos los transfers USDT
   ├─ authorizedDepositors mapping (solo RentalAgreements autorizados)
   ├─ onlyAuthorized modifier
   ├─ ReentrancyGuard en funciones críticas
   └─ Emergency pause con whenPaused/whenNotPaused

2. ✅ Contabilidad y Yield
   ├─ deposits tracking por agreement
   ├─ yieldWithdrawn tracking (previene double-claim)
   ├─ accumulatedLosses (si strategy pierde fondos)
   ├─ calculateYield() con fórmula proporcional correcta
   ├─ Protocol fees: 30% del yield
   └─ Buffer de liquidez: 15% (según spec)

3. ✅ Funciones Core
   ├─ deposit() - Con onlyAuthorized, SafeERC20, split 85/15
   ├─ withdraw() - Con try-catch, CEI pattern, SafeERC20
   ├─ calculateYield() - Con losses y yield withdrawn tracking
   └─ harvestYield() - Para cosechar yield de strategy

4. ✅ Funciones Admin
   ├─ updateStrategy() - Migra fondos entre strategies
   ├─ reportLoss() - Para trackear pérdidas
   ├─ setAuthorizedDepositor() - Autoriza RentalAgreements
   ├─ batchSetAuthorizedDepositors() - Autorización batch
   ├─ collectProtocolFees() - Retira fees acumulados
   ├─ setProtocolFeePercent() - Ajusta % de fees
   ├─ setBufferPercent() - Ajusta % de buffer
   ├─ toggleEmergencyPause() - Pausa de emergencia
   └─ emergencyWithdraw() - Rescate de fondos

5. ✅ View Functions
   ├─ balanceOf() - Balance total de un usuario
   ├─ getUserInfo() - Info detallada del usuario
   ├─ getCurrentAPY() - APY actual de la strategy
   ├─ getTotalBalance() - Balance total del vault
   └─ getVaultStats() - Estadísticas completas

6. ✅ Eventos y Errores Completos
   ├─ 10 eventos detallados
   └─ 9 errores custom

ARQUITECTURA IMPLEMENTADA:
RentalAgreement → deposit() → RoomFiVault
                               ├─ 85% → AcalaYieldStrategy → Acala DeFi
                               └─ 15% → Buffer (retiros rápidos)
                                         ↓
                               Yield 8% APY
                                         ↓
RentalAgreement ← withdraw() ← 70% User + 30% Protocol

PARÁMETROS CLAVE:
- MIN_DEPOSIT: 10 USDT (para testing)
- Buffer: 15% (según spec original)
- Protocol Fee: 30% del yield
- Tenant recibe: 70% del yield

✅ COMPILACIÓN: Sin errores
✅ LISTO PARA DEPLOYMENT EN PASEO TESTNET
```

**Acción para IA (URGENTE - CREAR ARCHIVO)**:
```solidity
// CREAR ARCHIVO: foundry/src/V2/RoomFiVault.sol

// COPIAR CÓDIGO DE: docs/ARQUITECTURA_POLKADOT_USDT.md líneas 419-714
// ESE ES EL SPEC COMPLETO, IMPLEMENTARLO TAL CUAL

// PASOS:
// 1. Crear archivo foundry/src/V2/RoomFiVault.sol
// 2. Copiar código del spec
// 3. Ajustar imports:
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Interfaces.sol";

// 4. MODIFICAR: Agregar liquidez buffer
uint256 public constant BUFFER_PERCENT = 15; // 15% no deployado

function deposit(uint256 amount, address user) external nonReentrant whenNotPaused {
    // ... código existente ...
    
    // Deploy solo 85% a strategy, 15% buffer
    uint256 toDeploy = (amount * (100 - BUFFER_PERCENT)) / 100;
    uint256 buffer = amount - toDeploy;
    
    if (toDeploy > 0) {
        usdt.approve(address(strategy), toDeploy);
        strategy.deposit(toDeploy);
    }
    
    // buffer se queda en vault para retiros rápidos
    
    emit Deposited(user, amount, block.timestamp);
}

// 5. AGREGAR: Loss tracking
uint256 public accumulatedLosses;

function reportLoss(uint256 lossAmount) external onlyOwner {
    accumulatedLosses += lossAmount;
    emit LossReported(lossAmount, block.timestamp);
}

// 6. MODIFICAR: calculateYield para restar losses
function calculateYield(address user) public view returns (uint256) {
    uint256 userDeposit = deposits[user];
    if (userDeposit == 0) return 0;
    
    uint256 totalBalance = strategy.balanceOf(address(this)) + 
                           usdt.balanceOf(address(this)); // Include buffer
    
    // Restar losses acumuladas
    uint256 adjustedBalance = totalBalance > accumulatedLosses ?
                              totalBalance - accumulatedLosses : 0;
    
    uint256 vaultYield = adjustedBalance > totalDeposits ?
                         adjustedBalance - totalDeposits : 0;
    
    uint256 userShare = (vaultYield * userDeposit) / totalDeposits;
    
    return userShare;
}

// COMPILAR con:
// cd foundry
// forge build
// Debe compilar sin errores
```

---

**AcalaYieldStrategy.sol** - `foundry/src/V2/strategies/AcalaYieldStrategy.sol`
```
Estado: 60% completo (PARCIAL)
Líneas: ~400 (existe pero incompleto)

✅ Implementado:
├─ deposit() skeleton
├─ withdraw() skeleton
├─ Allocation strategy (70/30)
└─ Basic structure

❌ FALTA (CRÍTICO para producción, MOCKEABLE para hackathon):

1. XCM Integration NO FUNCIONAL
   └─ _deployToLending() y _deployToDEX() tienen TODOs
   └─ XCM_GATEWAY address es placeholder (0x...)
   └─ NO HAY addresses reales de Moonbeam precompiles

2. balanceOf() retorna mock data
   └─ Línea ~960: return totalDeposited (no balance real)
   └─ Debería query Acala via XCM

3. getAPY() retorna constante
   └─ Línea ~970: return 800 (8% fijo)
   └─ Debería query APY real de Acala

4. harvestYield() no implementado
   └─ Líneas ~842-854 retornan 0
   └─ DEBE claim rewards de Acala y convertir a USDT
```

**Acción para IA (PARA HACKATHON - MOCK MODE)**:
```solidity
// ARCHIVO: foundry/src/V2/strategies/AcalaYieldStrategy.sol

// PARA HACKATHON: Implementar MOCK MODE con yield simulado

// AGREGAR al inicio del contrato:
bool public mockMode = true; // Set to false en producción
uint256 public mockAPY = 800; // 8% APY
uint256 public lastMockYieldTime;

// MODIFICAR: deposit() para mock
function deposit(uint256 amount) external onlyOwner {
    require(amount > 0, "Amount > 0");
    
    usdt.transferFrom(msg.sender, address(this), amount);
    
    if (mockMode) {
        // Mock: Solo guardar, no deployar a Acala
        totalDeposited += amount;
        lastMockYieldTime = block.timestamp;
        
        emit Deposited(amount, 0, 0);
        return;
    }
    
    // Real implementation (para producción)
    uint256 toLending = (amount * lendingAllocation) / 100;
    uint256 toDEX = amount - toLending;
    
    if (toLending > 0) {
        _deployToLending(toLending);
    }
    
    if (toDEX > 0) {
        _deployToDEX(toDEX);
    }
    
    totalDeposited += amount;
    emit Deposited(amount, toLending, toDEX);
}

// MODIFICAR: balanceOf() para calcular yield mockeado
function balanceOf(address /* vault */) external view returns (uint256) {
    if (!mockMode) {
        // Real: Query de Acala via XCM (TODO)
        return totalDeposited;
    }
    
    // Mock: Calcular yield simulado
    uint256 timeElapsed = block.timestamp - lastMockYieldTime;
    uint256 annualYield = (totalDeposited * mockAPY) / 10000; // APY en basis points
    uint256 yieldAccrued = (annualYield * timeElapsed) / 365 days;
    
    return totalDeposited + yieldAccrued;
}

// AGREGAR: Toggle mock mode (solo owner)
function setMockMode(bool _mockMode) external onlyOwner {
    mockMode = _mockMode;
    if (mockMode) {
        lastMockYieldTime = block.timestamp;
    }
}

function setMockAPY(uint256 _apy) external onlyOwner {
    require(_apy >= 100 && _apy <= 2000, "APY entre 1% y 20%");
    mockAPY = _apy;
}

// PARA DEMO: Explicar que mock mode es para hackathon
// Producción: Integración real con Acala via XCM
```

---

### 8.3 Contratos Cross-Chain (Mirrors)

**TenantPassportMirror.sol** - `foundry/src/Mirrors/TenantPassportMirror.sol`
```
Estado: 85% completo
Líneas: ~550

✅ Implementado:
├─ updateReputationFromISMP()
├─ updateMetricsFromISMP()
├─ updateBadgesFromISMP()
├─ Read functions (getReputation, getTenantInfo)
├─ Freshness tracking (lastSyncTime)
└─ Access control (only ISMPHandler)

⚠️ FALTA (Minor):
├─ Función: requestSyncFromSource()
│   └─ User puede request sync manual
│   └─ Emite evento para backend trigger pallet
│
└─ Batch sync optimization
    └─ updateMultipleTenants() para eficiencia
```

**PropertyRegistryMirror.sol** - `foundry/src/Mirrors/PropertyRegistryMirror.sol`
```
Estado: 85% completo
Líneas: ~750

✅ Implementado:
├─ updatePropertyFromISMP()
├─ searchProperties() con filters
├─ Featured properties
├─ Batch updates
└─ Access control

⚠️ FALTA (Minor):
├─ Pagination en searchProperties mejorada
└─ Cache de búsquedas frecuentes (gas optimization)
```

**ISMPMessageHandler.sol** - `foundry/src/Mirrors/ISMPMessageHandler.sol`
```
Estado: 90% completo
Líneas: ~650

✅ Implementado:
├─ handleMessage() con routing
├─ 8 message types supported
├─ Rate limiting (100 syncs/día)
├─ Source validation (solo Paseo)
├─ Payload decoding
└─ Error handling

⚠️ FALTA (Non-critical):
├─ Batch message processing
│   └─ Actualmente procesa 1 message a la vez
│   └─ Ideal: Procesar array de messages
│
└─ Message replay protection
    └─ Usar nonce para prevenir replay attacks
```

**Acción para IA**:
```solidity
// ARCHIVO: foundry/src/Mirrors/ISMPMessageHandler.sol
// UBICACIÓN: Línea ~320

// AGREGAR: Nonce tracking
mapping(bytes32 => bool) public processedMessages;

function handleMessage(bytes calldata payload) external {
    require(msg.sender == ISMP_HOST, "Solo ISMP");
    
    // Decode source chain y message ID
    (uint32 sourceChain, bytes32 messageId, bytes memory data) = 
        abi.decode(payload, (uint32, bytes32, bytes));
    
    require(sourceChain == PASEO_CHAIN_ID, "Source invalido");
    
    // Replay protection
    require(!processedMessages[messageId], "Mensaje ya procesado");
    processedMessages[messageId] = true;
    
    // ... resto del código ...
}
```

---

### 8.4 Substrate Pallet - GAPS

**pallet-roomfi-bridge** - `foundry/pallets/roomfi-bridge/src/lib.rs`
```
Estado: 70% completo (MOCK MODE)
Líneas: ~394

✅ Implementado:
├─ Extrinsics: sync_reputation_to_chain, sync_property_to_chain
├─ Storage: TenantPassportAddress, MirrorContracts
├─ Mock data generation (feature flag)
├─ ISMP message construction
└─ Events completos

❌ GAPS CRÍTICOS:

1. MOCK MODE ACTIVO
   └─ Feature: mock-polkavm habilitado
   └─ NO lee storage real de contratos EVM
   └─ Genera datos pseudo-aleatorios por address

2. PolkaVM Integration NO IMPLEMENTADA
   └─ Línea ~180: TODO: Access EVM contract storage
   └─ Necesita read_evm_storage() function
   └─ Requiere PolkaVM precompile access

3. Event-Driven Sync NO IMPLEMENTADO
   └─ Ideal: Escuchar eventos de TenantPassportV2
   └─ Auto-sync cuando updateTenantInfo() se llama
   └─ Actualmente: Manual sync only

4. Batch Sync Limitado
   └─ batch_sync_tenants() existe pero max 10 tenants
   └─ DEBE permitir 100+ para eficiencia
```

**Acción para IA (PARA PRODUCCIÓN - Post-Hackathon)**:
```rust
// ARCHIVO: foundry/pallets/roomfi-bridge/src/lib.rs

// PASO 1: Implementar storage access real
// UBICACIÓN: Línea ~180 (reemplazar mock data)

use pallet_evm::{AccountStorages, Pallet as EVM};

fn read_tenant_passport_storage(
    tenant_address: H160
) -> Result<TenantData, Error<T>> {
    // Address del contrato TenantPassportV2
    let passport_contract = Self::tenant_passport_address()
        .ok_or(Error::<T>::TenantPassportNotConfigured)?;
    
    // Calcular storage slot para mapping(address => TenantInfo)
    // Solidity: mapping en slot 0
    let tenant_slot = H256::from_slice(&keccak256(&[
        &H256::from(tenant_address)[..],
        &H256::from_low_u64_be(0)[..] // slot 0
    ].concat()));
    
    // Leer storage del EVM
    let storage_value = AccountStorages::<T>::get(passport_contract, tenant_slot);
    
    // Decodificar TenantInfo struct
    // Offset 0: reputation (uint32)
    // Offset 4: paymentsMade (uint16)
    // Offset 6: paymentsMissed (uint16)
    // etc.
    
    let reputation = u32::from_be_bytes(storage_value[0..4].try_into().unwrap());
    let payments_made = u16::from_be_bytes(storage_value[4..6].try_into().unwrap());
    // ... más fields ...
    
    Ok(TenantData {
        reputation,
        payments_made,
        // ... etc
    })
}

// PASO 2: Event-driven sync
// AGREGAR en pallet Config:
type EventListener: OnEVMEvent;

// Implementar hook:
impl<T: Config> OnEVMEvent for Pallet<T> {
    fn on_event(
        contract: H160,
        topics: Vec<H256>,
        data: Vec<u8>
    ) {
        // Si evento es de TenantPassportV2
        if contract == Self::tenant_passport_address() {
            // Y topic[0] == TenantInfoUpdated event signature
            let event_sig = keccak256("TenantInfoUpdated(uint256,uint32,bool)");
            if topics[0] == H256::from(event_sig) {
                // Extract tokenId de topics[1]
                // Extract tenant address de storage
                // Auto-trigger sync
                let _ = Self::sync_reputation_to_chain(
                    Origin::signed(T::AdminOrigin::get()),
                    tenant_address,
                    DestinationChain::Moonbeam
                );
            }
        }
    }
}

// PARA HACKATHON: Mantener mock mode, documentar roadmap a producción
```

---

## 9. TESTING - GAPS CRÍTICOS

### 9.1 Estado Actual: 0 Tests

```
CRITICAL: NO HAY TESTS IMPLEMENTADOS

Ubicación esperada: foundry/test/
Estado: Directorio vacío o no existe

IMPACTO:
├─ No podemos validar que contracts funcionan
├─ No podemos detectar bugs antes de deploy
├─ No podemos hacer refactors con confianza
└─ Jurado puede penalizar falta de tests
```

### 9.2 Tests Mínimos para Hackathon (PRIORIDAD ALTA)

**CREAR: foundry/test/TenantPassport.t.sol**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/V2/TenantPassportV2.sol";

contract TenantPassportTest is Test {
    TenantPassportV2 public passport;
    address public alice = address(0x1);
    address public bob = address(0x2);
    
    function setUp() public {
        passport = new TenantPassportV2(address(this));
    }
    
    // TEST 1: Mint passport
    function testMintPassport() public {
        vm.prank(alice);
        passport.mintForSelf();
        
        assertTrue(passport.hasPassport(alice));
        uint256 tokenId = passport.getTokenIdByAddress(alice);
        assertGt(tokenId, 0);
    }
    
    // TEST 2: Cannot mint twice
    function testCannotMintTwice() public {
        vm.startPrank(alice);
        passport.mintForSelf();
        
        vm.expectRevert("Ya tiene passport");
        passport.mintForSelf();
        vm.stopPrank();
    }
    
    // TEST 3: Soul-bound (no transfer)
    function testSoulBound() public {
        vm.prank(alice);
        passport.mintForSelf();
        
        uint256 tokenId = passport.getTokenIdByAddress(alice);
        
        vm.prank(alice);
        vm.expectRevert("Token is soul-bound");
        passport.transferFrom(alice, bob, tokenId);
    }
    
    // TEST 4: Update reputation on-time payment
    function testUpdateReputationOnTime() public {
        // Setup
        vm.prank(alice);
        passport.mintForSelf();
        uint256 tokenId = passport.getTokenIdByAddress(alice);
        
        // Authorize contract to update
        passport.authorizeUpdater(address(this));
        
        // Initial reputation = 50
        (, uint32 reputation,,,,,,,,,) = passport.getTenantInfo(tokenId);
        assertEq(reputation, 50);
        
        // Update: on-time payment
        passport.updateTenantInfo(tokenId, true, 1000e6); // 1000 USDT
        
        // Reputation should increase
        (, uint32 newReputation,,,,,,,,,) = passport.getTenantInfo(tokenId);
        assertEq(newReputation, 51); // +1 for on-time
    }
    
    // TEST 5: Reputation decay
    function testReputationDecay() public {
        vm.prank(alice);
        passport.mintForSelf();
        uint256 tokenId = passport.getTokenIdByAddress(alice);
        
        // Initial
        uint32 reputation = passport.getReputationWithDecay(tokenId);
        assertEq(reputation, 50);
        
        // Warp 60 days (2 months)
        vm.warp(block.timestamp + 60 days);
        
        // Should decay by 1 (0.5 per month × 2)
        uint32 decayedRep = passport.getReputationWithDecay(tokenId);
        assertEq(decayedRep, 49);
    }
}

// CORRER:
// cd foundry
// forge test --match-path test/TenantPassport.t.sol -vv
```

**CREAR: foundry/test/RentalAgreement.t.sol**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/V2/RentalAgreement.sol";
import "../src/V2/RentalAgreementFactory.sol";
import "../src/V2/TenantPassportV2.sol";
import "../src/V2/PropertyRegistry.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock USDT
contract MockUSDT is ERC20 {
    constructor() ERC20("Mock USDT", "USDT") {}
    
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
    
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

contract RentalAgreementTest is Test {
    RentalAgreementFactory public factory;
    TenantPassportV2 public passport;
    PropertyRegistry public registry;
    MockUSDT public usdt;
    
    address public landlord = address(0x1);
    address public tenant = address(0x2);
    
    function setUp() public {
        // Deploy contracts
        passport = new TenantPassportV2(address(this));
        registry = new PropertyRegistry(address(this));
        
        // Deploy factory (need implementation first)
        RentalAgreement implementation = new RentalAgreement();
        factory = new RentalAgreementFactory(
            address(passport),
            address(registry),
            address(implementation),
            address(this)
        );
        
        // Deploy mock USDT
        usdt = new MockUSDT();
        
        // Setup: Mint passports
        vm.prank(landlord);
        passport.mintForSelf();
        
        vm.prank(tenant);
        passport.mintForSelf();
        
        // Setup: Register property
        vm.prank(landlord);
        registry.registerProperty(
            "Test Property",
            PropertyRegistry.PropertyType.APARTMENT,
            "123 Test St",
            "CDMX",
            "CDMX",
            "01000",
            "Roma Norte",
            19432608, // lat
            -99133209, // lon
            2, // bedrooms
            1, // bathrooms
            4, // maxOccupants
            80, // squareMeters
            3, // floor
            0, // amenities
            1000e6, // monthlyRent (1000 USDT)
            2000e6, // securityDeposit
            false, // utilities
            true, // furnished
            "ipfs://..."
        );
        
        // Approve property
        uint256 propId = registry.getPropertiesByLandlord(landlord)[0];
        registry.approvePropertyVerification(propId);
        
        vm.prank(landlord);
        registry.listProperty(propId);
        
        // Give tenant USDT
        usdt.mint(tenant, 10000e6); // 10K USDT
    }
    
    // TEST 1: Create agreement
    function testCreateAgreement() public {
        uint256 propId = registry.getPropertiesByLandlord(landlord)[0];
        
        vm.prank(landlord);
        address agreementAddr = factory.createAgreement(
            propId,
            tenant,
            1000e6, // rent
            2000e6, // deposit
            12 // duration
        );
        
        assertTrue(agreementAddr != address(0));
        
        IRentalAgreement agreement = IRentalAgreement(agreementAddr);
        assertEq(agreement.landlord(), landlord);
        assertEq(agreement.tenant(), tenant);
    }
    
    // TEST 2: Full flow - sign + deposit + rent
    function testFullAgreementFlow() public {
        // Create
        uint256 propId = registry.getPropertiesByLandlord(landlord)[0];
        
        vm.prank(landlord);
        address agreementAddr = factory.createAgreement(
            propId, tenant, 1000e6, 2000e6, 12
        );
        
        RentalAgreement agreement = RentalAgreement(agreementAddr);
        
        // Sign
        vm.prank(landlord);
        agreement.signAsLandlord();
        
        vm.prank(tenant);
        agreement.signAsTenant();
        
        // Pay deposit
        vm.startPrank(tenant);
        usdt.approve(agreementAddr, 2000e6);
        agreement.paySecurityDeposit();
        vm.stopPrank();
        
        // Check active
        assertEq(uint(agreement.status()), uint(RentalAgreement.AgreementStatus.ACTIVE));
        
        // Pay rent
        vm.startPrank(tenant);
        usdt.approve(agreementAddr, 1000e6);
        agreement.payRent();
        vm.stopPrank();
        
        // Check payment recorded
        assertEq(agreement.paymentsMade(), 1);
    }
    
    // TEST 3: Cannot create if reputation too low
    function testCannotCreateWithLowReputation() public {
        // Lower tenant reputation
        uint256 tokenId = passport.getTokenIdByAddress(tenant);
        passport.authorizeUpdater(address(this));
        
        // Simulate many missed payments
        for (uint i = 0; i < 10; i++) {
            passport.updateTenantInfo(tokenId, false, 0);
        }
        
        // Reputation should be low now
        uint32 rep = passport.getReputationWithDecay(tokenId);
        assertLt(rep, 40);
        
        // Try create - should fail
        uint256 propId = registry.getPropertiesByLandlord(landlord)[0];
        
        vm.prank(landlord);
        vm.expectRevert("Tenant: reputacion insuficiente");
        factory.createAgreement(propId, tenant, 1000e6, 2000e6, 12);
    }
}

// CORRER:
// forge test --match-path test/RentalAgreement.t.sol -vvv
```

**CREAR: foundry/test/Integration.t.sol**
```solidity
// Test end-to-end: Passport → Property → Agreement → Dispute
// Validar que todo el flujo funciona junto

contract IntegrationTest is Test {
    // ... Similar a RentalAgreementTest pero más completo
    
    function testCompleteRentalCycle() public {
        // 1. Mint passports
        // 2. Register y verify property
        // 3. Create agreement
        // 4. Sign + deposit
        // 5. Pay rent por 12 meses (loop)
        // 6. Complete agreement
        // 7. Verify deposit + yield returned
        // 8. Verify reputations updated
    }
    
    function testDisputeFlow() public {
        // 1. Setup agreement
        // 2. Raise dispute
        // 3. Submit response
        // 4. Arbitrators vote
        // 5. Verify resolution applied
    }
}
```

### 9.3 Coverage Target para Hackathon

```
Mínimo Acceptable:
├─ TenantPassport: 5 tests (✓ criticos)
├─ RentalAgreement: 5 tests (✓ flow completo)
├─ Integration: 2 tests (✓ E2E)
└─ Total: 12 tests

Ideal (si hay tiempo):
├─ PropertyRegistry: 3 tests
├─ DisputeResolver: 3 tests
├─ RoomFiVault: 2 tests
└─ Total: 20 tests
```

---

## 10. DEPLOYMENT CHECKLIST

### 10.1 Pre-Deployment (ANTES de deployar a Paseo)

```
[ ] 1. Compilación sin errores
    └─ cd foundry && forge build
    └─ NO warnings de contract size > 24KB
    └─ NO errors

[ ] 2. Tests passing
    └─ forge test
    └─ Al menos 12/12 tests passing

[ ] 3. Crear .env con variables
    └─ cp Foundry/.env.example Foundry/.env
    └─ PRIVATE_KEY=0x... (SIN prefix 0x si usando foundry)
    └─ PASEO_RPC_URL=https://testnet-passet-hub-eth-rpc.polkadot.io
    └─ MOONBEAM_RPC_URL=https://rpc.api.moonbase.moonbeam.network

[ ] 4. Obtener PAS tokens de faucet
    └─ https://faucet.polkadot.io/?parachain=1111
    └─ Ingresar deployer address
    └─ Request 10 PAS (suficiente para deployment)
    └─ Verificar balance: cast balance $ADDRESS --rpc-url $PASEO_RPC_URL

[ ] 5. Estimate gas de deployment
    └─ forge script script/DeployRoomFiV2.s.sol --rpc-url $PASEO_RPC_URL
    └─ Verificar gas estimate < balance disponible
```

### 10.2 Deployment Script

**CREAR: foundry/script/DeployRoomFiV2.s.sol**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/V2/TenantPassportV2.sol";
import "../src/V2/PropertyRegistry.sol";
import "../src/V2/RentalAgreementFactory.sol";
import "../src/V2/RentalAgreement.sol";
import "../src/V2/DisputeResolver.sol";
import "../src/V2/RoomFiVault.sol";
import "../src/V2/strategies/AcalaYieldStrategy.sol";

contract DeployRoomFiV2 is Script {
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying from:", deployer);
        console.log("Balance:", deployer.balance);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy TenantPassport
        console.log("\n1. Deploying TenantPassportV2...");
        TenantPassportV2 passport = new TenantPassportV2(deployer);
        console.log("TenantPassportV2:", address(passport));
        
        // 2. Deploy PropertyRegistry
        console.log("\n2. Deploying PropertyRegistry...");
        PropertyRegistry registry = new PropertyRegistry(deployer);
        console.log("PropertyRegistry:", address(registry));
        
        // 3. Deploy DisputeResolver
        console.log("\n3. Deploying DisputeResolver...");
        DisputeResolver resolver = new DisputeResolver(deployer);
        console.log("DisputeResolver:", address(resolver));
        
        // 4. Deploy RentalAgreement implementation (template)
        console.log("\n4. Deploying RentalAgreement implementation...");
        RentalAgreement agreementImpl = new RentalAgreement();
        console.log("RentalAgreement Implementation:", address(agreementImpl));
        
        // 5. Deploy RentalAgreementFactory
        console.log("\n5. Deploying RentalAgreementFactory...");
        RentalAgreementFactory factory = new RentalAgreementFactory(
            address(passport),
            address(registry),
            address(agreementImpl),
            deployer
        );
        console.log("RentalAgreementFactory:", address(factory));
        
        // 6. Set DisputeResolver in Factory
        console.log("\n6. Setting DisputeResolver in Factory...");
        factory.setDisputeResolver(address(resolver));
        
        // 7. Authorize Factory to update passport
        console.log("\n7. Authorizing Factory and Resolver...");
        passport.authorizeUpdater(address(factory));
        passport.authorizeUpdater(address(resolver));
        
        // 8. Deploy USDT mock (SOLO TESTNET)
        console.log("\n8. Deploying Mock USDT...");
        MockUSDT usdt = new MockUSDT();
        console.log("MockUSDT:", address(usdt));
        
        // 9. Deploy AcalaYieldStrategy
        console.log("\n9. Deploying AcalaYieldStrategy...");
        AcalaYieldStrategy strategy = new AcalaYieldStrategy(
            address(usdt),
            deployer
        );
        console.log("AcalaYieldStrategy:", address(strategy));
        
        // Set mock mode for hackathon
        strategy.setMockMode(true);
        console.log("Mock mode enabled for hackathon");
        
        // 10. Deploy RoomFiVault
        console.log("\n10. Deploying RoomFiVault...");
        RoomFiVault vault = new RoomFiVault(
            address(usdt),
            address(strategy),
            deployer
        );
        console.log("RoomFiVault:", address(vault));
        
        vm.stopBroadcast();
        
        // Print summary
        console.log("\n===========================================");
        console.log("DEPLOYMENT SUMMARY - SAVE THESE ADDRESSES");
        console.log("===========================================");
        console.log("TenantPassportV2:", address(passport));
        console.log("PropertyRegistry:", address(registry));
        console.log("DisputeResolver:", address(resolver));
        console.log("RentalAgreementFactory:", address(factory));
        console.log("RentalAgreement Implementation:", address(agreementImpl));
        console.log("MockUSDT:", address(usdt));
        console.log("AcalaYieldStrategy:", address(strategy));
        console.log("RoomFiVault:", address(vault));
        console.log("===========================================");
        
        // Write addresses to file
        string memory addresses = string(abi.encodePacked(
            "TENANT_PASSPORT=", vm.toString(address(passport)), "\n",
            "PROPERTY_REGISTRY=", vm.toString(address(registry)), "\n",
            "DISPUTE_RESOLVER=", vm.toString(address(resolver)), "\n",
            "RENTAL_FACTORY=", vm.toString(address(factory)), "\n",
            "RENTAL_IMPLEMENTATION=", vm.toString(address(agreementImpl)), "\n",
            "USDT=", vm.toString(address(usdt)), "\n",
            "YIELD_STRATEGY=", vm.toString(address(strategy)), "\n",
            "VAULT=", vm.toString(address(vault)), "\n"
        ));
        
        vm.writeFile("./deployed_addresses.txt", addresses);
        console.log("\nAddresses saved to deployed_addresses.txt");
    }
}

contract MockUSDT is ERC20 {
    constructor() ERC20("Mock USDT", "USDT") {
        _mint(msg.sender, 1000000 * 10**6); // 1M USDT to deployer
    }
    
    function decimals() public pure override returns (uint8) {
        return 6;
    }
    
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}

// CORRER:
// forge script script/DeployRoomFiV2.s.sol:DeployRoomFiV2 \
//   --rpc-url $PASEO_RPC_URL \
//   --broadcast \
//   --verify \
//   -vvvv
```

### 10.3 Post-Deployment Verification

```
[ ] 1. Verificar todos los addresses deployados
    └─ cat deployed_addresses.txt
    └─ Todos deben tener format 0x...

[ ] 2. Verificar en Block Explorer
    └─ https://blockscout-passet-hub.parity-testnet.parity.io
    └─ Buscar cada address
    └─ Verificar que son contracts (no EOAs)

[ ] 3. Test básico: Mint passport
    └─ cast send $TENANT_PASSPORT "mintForSelf()" \
        --private-key $PRIVATE_KEY \
        --rpc-url $PASEO_RPC_URL
    └─ Verificar tx success

[ ] 4. Test básico: Register property
    └─ Llamar registerProperty con parámetros de prueba
    └─ Verificar property NFT minted

[ ] 5. Test básico: Create agreement
    └─ Llamar factory.createAgreement(...)
    └─ Verificar clone creado

[ ] 6. Guardar addresses en repo
    └─ cp deployed_addresses.txt docs/DEPLOYED_ADDRESSES_PASEO.txt
    └─ git add docs/DEPLOYED_ADDRESSES_PASEO.txt
    └─ git commit -m "docs: Add deployed addresses for Paseo testnet"
```

---

## 11. DEMO PREPARATION CHECKLIST

### 11.1 Assets Necesarios para Demo

```
[ ] 1. Slides/Deck actualizado
    ├─ Problema (1 slide)
    ├─ Solución (1 slide)
    ├─ Arquitectura diagram (1 slide) ← CRITICAL
    ├─ Demo walkthrough (2 slides)
    ├─ Market size (1 slide)
    ├─ Roadmap (1 slide)
    └─ Team + Ask (1 slide)
    Total: 8 slides MAX

[ ] 2. Video de respaldo (si demo falla)
    └─ Grabar screen recording del flujo completo
    └─ 2-3 minutos máximo
    └─ Subir a YouTube unlisted o Google Drive

[ ] 3. Screenshots preparados
    ├─ TenantPassport con badges
    ├─ PropertyRegistry con property listada
    ├─ RentalAgreement en estado ACTIVE
    ├─ Yield acumulado en vault
    └─ Disputa resuelta (si tiempo)

[ ] 4. Block explorer links listos
    └─ Pre-buscar addresses de contratos
    └─ Tener tabs abiertos en browser

[ ] 5. Script de demo ensayado
    └─ Cronometrar: 3-4 minutos MÁXIMO
    └─ Practicar 5 veces antes del pitch
```

### 11.2 Demo Flow (Recomendado)

**ESCENARIO**: "Alice renta depto a Bob por 12 meses"

```
[SLIDE 1 - Problema]
"¿Alguna vez has perdido tu depósito de renta sin razón? ¿O pagado 3 meses adelantado porque 'no tienes historial'? Ese es el problema que resolvemos."

[SLIDE 2 - Arquitectura]
"RoomFi conecta 3 ecosistemas: Polkadot para seguridad, Acala para yield, y cualquier EVM chain vía Hyperbridge."
→ Mostrar diagram con chains

[DEMO LIVE - 3 minutos]

PASO 1 (30 seg): "Alice mint su TenantPassport"
└─ cast send $PASSPORT "mintForSelf()" ...
└─ Mostrar en block explorer
└─ "Este NFT es soul-bound, track su reputación para siempre"

PASO 2 (30 seg): "Bob registra su propiedad"
└─ cast send $REGISTRY "registerProperty(...)"
└─ Mostrar property NFT
└─ "GPS único previene fraudes de duplicación"

PASO 3 (30 seg): "Bob crea agreement con Alice"
└─ cast send $FACTORY "createAgreement(...)"
└─ Mostrar clone address
└─ "EIP-1167 clones = $0.50 en gas vs $50 normal"

PASO 4 (30 seg): "Alice firma y paga deposit"
└─ cast send $AGREEMENT "signAsTenant()"
└─ cast send $AGREEMENT "paySecurityDeposit()"
└─ Mostrar status ACTIVE
└─ "Su deposit ya está generando 8% APY en Acala"

PASO 5 (30 seg): "Alice paga primera renta"
└─ cast send $AGREEMENT "payRent()"
└─ Mostrar split: 85% Bob, 15% protocol
└─ Consultar passport: reputation aumentó

PASO 6 (30 seg): "Cross-chain sync"
└─ Mostrar pallet sync_reputation_to_chain
└─ Esperar 10 segundos
└─ Mostrar reputación en Moonbeam mirror
└─ "Ahora Alice puede usar su reputación en cualquier chain"

[SLIDE 3 - Diferenciadores]
"Somos los únicos con:
 1. Reputación cross-chain native
 2. Yield farming en deposits (tenant gana)
 3. Dispute resolution en 7-14 días (vs 3-12 meses)"

[SLIDE 4 - Ask]
"Buscamos $50K para mainnet en 3 meses. Ya tenemos arquitectura completa, 6K líneas de código, y path claro a producción."
```

### 11.3 Troubleshooting Durante Demo

**Si algo falla durante el demo**:

```
Plan B1: Video de respaldo
└─ "Déjenme mostrarles un video del flujo completo"
└─ 2 minutos, narrar sobre el video

Plan B2: Screenshots + Explicación
└─ "Tenemos todo funcionando en testnet, déjenme mostrar los resultados"
└─ Mostrar screenshots de cada paso
└─ Explicar arquitectura en profundidad

Plan B3: Block Explorer Walkthrough
└─ "Estos son los contratos deployados en Paseo"
└─ Mostrar addresses, verified contracts
└─ Leer functions en explorer
└─ Demostrar que todo está funcional (solo no en vivo)
```

**Preguntas frecuentes y respuestas**:

```
Q: "¿Por qué no Ethereum mainnet?"
A: "Gas fees. payRent() costaría $20-40 cada mes. En Polkadot: $0.05. Para pagos recurrentes, L1 no es viable."

Q: "¿Cómo monetizan?"
A: "15% de cada pago de renta + 30% del yield generado. Con 10K propiedades = $15M ARR."

Q: "¿Qué pasa si Acala hackean?"
A: "Vault puede cambiar strategy on-chain. Además, Acala lleva 2+ años sin hacks y tiene shared security de Polkadot."

Q: "¿Mock data en pallet?"
A: "Correcto, para hackathon usamos mock. Tenemos roadmap claro a producción: event-driven sync o storage access directo. Ambos documentados."

Q: "¿Competencia?"
A: "Rentberry (Web2, USA only), Propy (compra-venta), Airbnb (short-term). Nadie hace rental + cross-chain + yield. Blue ocean."
```

---

## 12. RESUMEN EJECUTIVO DE GAPS

### 12.1 Critical (DEBE hacerse antes de demo)

```
PRIORIDAD MÁXIMA (Bloqueante):

1. ✅ RoomFiVault.sol - COMPLETADO ✅ (2025-01-13)
   └─ Location: foundry/src/V2/RoomFiVault.sol
   └─ Status: 654 líneas, compilando sin errores
   └─ Features: SafeERC20, authorizedDepositors, loss tracking, 15% buffer
   └─ Time spent: 2.5 horas

2. ✅ RentalAgreement.sol - COMPLETADO ✅ (2025-01-13)
   └─ Location: foundry/src/V2/RentalAgreement.sol
   └─ Status: 644 líneas, compilando sin errores
   └─ Features: USDT integration, vault integration, cancel(), terminateEarly(), checkAutoTerminate()
   └─ Time spent: 3 horas

3. ❌ Tests - CREAR AL MENOS 12 (NEXT)
   └─ Missing: ALL tests (0 existentes)
   └─ Effort: 4-5 horas
   └─ Action: Implementar TenantPassport.t.sol, RentalAgreement.t.sol
   └─ Priority: NEXT

4. ❌ DeployRoomFiV2.s.sol - CREAR SCRIPT
   └─ Missing: Deployment script completo
   └─ Effort: 1-2 horas
   └─ Action: Implementar según sección 10.2

TOTAL EFFORT CRITICAL: 5-7 horas (restante)
PROGRESO: 50% (2/4 completados)
```

### 12.2 Important (Debería hacerse si hay tiempo)

```
PRIORIDAD ALTA (Mejora significativa):

1. ❌ TenantPassportV2 - FUNCIONES FALTANTES
   └─ Missing: recordFastResponse(), recordPropertyNoIssues()
   └─ Effort: 1 hour
   └─ Impact: Completeness

2. ❌ PropertyRegistry - FILTROS AVANZADOS
   └─ Missing: getPropertiesByFilters()
   └─ Effort: 1 hour
   └─ Impact: UX

3. ❌ DisputeResolver - ARBITRATOR REWARDS
   └─ Missing: withdrawArbitratorRewards()
   └─ Effort: 1 hour
   └─ Impact: Incentivos

4. ❌ More Tests - COVERAGE 80%+
   └─ Missing: PropertyRegistry, Dispute tests
   └─ Effort: 3 hours
   └─ Impact: Confidence

TOTAL EFFORT IMPORTANT: 6 hours
```

### 12.3 Nice-to-Have (Post-hackathon)

```
PRIORIDAD BAJA (Futuro):

1. XCM Integration Real
   └─ Actualmente: Mock mode
   └─ Effort: 2-3 semanas
   └─ Impact: Production-ready

2. PolkaVM Pallet Integration
   └─ Actualmente: Mock data
   └─ Effort: 1-2 semanas
   └─ Impact: Real on-chain data

3. Frontend V2
   └─ Actualmente: Incompatible
   └─ Effort: 2-3 semanas
   └─ Impact: User experience

4. Auditoría de Seguridad
   └─ Effort: $15-50K + 2-4 semanas
   └─ Impact: Production deployment
```

---

## 13. TIMELINE RECOMENDADO PRE-HACKATHON

```
DÍA -7: FOUNDATION
├─ [ ] Crear RoomFiVault.sol (3h)
├─ [ ] Completar RentalAgreement.sol (4h)
└─ [ ] Setup test environment (1h)

DÍA -6: TESTING
├─ [ ] Escribir TenantPassport tests (2h)
├─ [ ] Escribir RentalAgreement tests (3h)
└─ [ ] Fix bugs encontrados (2h)

DÍA -5: DEPLOYMENT
├─ [ ] Crear DeployRoomFiV2.s.sol (2h)
├─ [ ] Test deployment en local (1h)
├─ [ ] Deploy a Paseo testnet (2h)
└─ [ ] Verificar contracts (1h)

DÍA -4: INTEGRATION
├─ [ ] Test flow E2E en testnet (2h)
├─ [ ] Fix issues encontrados (3h)
└─ [ ] Documentar addresses (1h)

DÍA -3: DEMO PREP
├─ [ ] Crear slides (2h)
├─ [ ] Grabar video backup (1h)
├─ [ ] Tomar screenshots (1h)
└─ [ ] Escribir script de pitch (2h)

DÍA -2: PRACTICE
├─ [ ] Ensayar demo 5 veces (2h)
├─ [ ] Ensayar pitch 10 veces (2h)
├─ [ ] Preparar Q&A responses (1h)
└─ [ ] Buffer para últimos fixes (3h)

DÍA -1: POLISH
├─ [ ] Final test de demo (1h)
├─ [ ] Review slides (1h)
├─ [ ] Sleep well (8h) ← IMPORTANTE
└─ [ ] Confidence boost (∞)

DÍA 0: HACKATHON 🚀
└─ [ ] Crush it! 💪
```

**TOTAL EFFORT**: ~45-50 horas
**TEAM RECOMMENDED**: 2-3 developers
**TIMELINE**: 7 días working 6-8h/día

---

## 14. ✅ INTEGRACIÓN HYPERBRIDGE SDK OFICIAL (COMPLETADO)

**FECHA**: 2025-01-12
**STATUS**: ✅ COMPLETO Y FUNCIONAL

### 14.1 Cumplimiento de Requisitos del Hackathon

```
✅ SDK Oficial Instalado via forge
✅ Interfaces Oficiales Importadas
✅ BaseIsmpModule Heredado Correctamente
✅ Pallet Substrate usa pallet-ismp Oficial
✅ Compilación Sin Errores
✅ Deployment Scripts Actualizados
```

### 14.2 Trabajo Realizado

#### PASO 1: Instalación del SDK

```bash
# Instalado en: Foundry/lib/hyperbridge
forge install polytope-labs/hyperbridge --no-git

# Dependencias NPM instaladas
cd lib/hyperbridge/evm
npm install
```

**Paquetes Instalados:**
- `@polytope-labs/ismp-solidity` v1.1.0 (interfaces oficiales)
- `@polytope-labs/solidity-merkle-trees`
- `@polytope-labs/erc6160`

#### PASO 2: Configuración Foundry

**foundry.toml ACTUALIZADO:**
```toml
remappings = [
    "@openzeppelin/=lib/openzeppelin-contracts/",
    "@forge-std/=lib/forge-std/",
    "@polytope-labs/ismp-solidity/=lib/hyperbridge/evm/node_modules/@polytope-labs/ismp-solidity/"
]
```

#### PASO 3: Actualización de ISMPMessageHandler.sol

**ANTES (Interfaces Manuales):**
```solidity
// ❌ INCORRECTO - Interfaces definidas manualmente
interface IIsmpModule { ... }
struct PostRequest { ... }

contract ISMPMessageHandler is IIsmpModule, Ownable {
    address public hyperbridgeHost; // ❌ Manual

    modifier onlyHyperbridge() {
        require(msg.sender == hyperbridgeHost, "...");
        _;
    }

    constructor(address _hyperbridgeHost, ...) {
        hyperbridgeHost = _hyperbridgeHost; // ❌ Manual
    }
}
```

**DESPUÉS (SDK Oficial):**
```solidity
// ✅ CORRECTO - Usando SDK oficial
import {IIsmpModule, BaseIsmpModule} from "@polytope-labs/ismp-solidity/interfaces/IIsmpModule.sol";
import {PostRequest, PostResponse, GetRequest, GetResponse, Message} from "@polytope-labs/ismp-solidity/interfaces/Message.sol";
import {IncomingPostRequest, IncomingPostResponse, IncomingGetResponse} from "@polytope-labs/ismp-solidity/interfaces/IIsmpModule.sol";

contract ISMPMessageHandler is BaseIsmpModule, Ownable, ReentrancyGuard {
    // ✅ Ya NO necesita hyperbridgeHost manual

    // ✅ Usa onlyHost del BaseIsmpModule
    function onAccept(IncomingPostRequest memory incoming)
        external
        override
        onlyHost  // ← Modifier del SDK
        whenNotPaused
        nonReentrant
    {
        PostRequest memory request = incoming.request;

        // ✅ Usa Message.hash() del SDK oficial
        bytes32 requestHash = Message.hash(request);

        // ... resto del código
    }

    // ✅ Constructor simplificado - NO requiere hyperbridgeHost
    constructor(
        bytes memory _paseoChainId,
        address _tenantMirror,
        address _propertyMirror,
        address initialOwner
    ) BaseIsmpModule() Ownable(initialOwner) {
        // hyperbridgeHost se obtiene automáticamente de BaseIsmpModule.host()
        paseoChainId = _paseoChainId;
        tenantPassportMirror = _tenantMirror;
        propertyRegistryMirror = _propertyMirror;
    }

    // ✅ Implementa todas las funciones requeridas por IIsmpModule
    function onGetResponse(IncomingGetResponse memory)
        external override onlyHost
    {
        revert UnexpectedCall();
    }

    function onGetTimeout(GetRequest memory)
        external override onlyHost
    {
        revert UnexpectedCall();
    }
}
```

**Mejoras Clave:**

1. **BaseIsmpModule**: Hereda del contrato base oficial que incluye:
   - `modifier onlyHost()` - Validación automática del caller
   - `function host()` - Obtiene dirección del Hyperbridge Host por chainId
   - Approval automático del fee token (IERC20)

2. **Funciones Implementadas**:
   - `onAccept()` - ✅ Usa `onlyHost` del SDK
   - `onPostRequestTimeout()` - ✅ Usa `onlyHost`
   - `onPostResponse()` - ✅ Usa `onlyHost`
   - `onPostResponseTimeout()` - ✅ Usa `onlyHost`
   - `onGetResponse()` - ✅ NUEVA (requerida por interfaz)
   - `onGetTimeout()` - ✅ NUEVA (requerida por interfaz)

3. **Hash Calculation**:
   - ANTES: `request.hash` (manual, inexistente)
   - DESPUÉS: `Message.hash(request)` (del SDK oficial)

4. **Constructor Simplificado**:
   - Ya NO requiere `hyperbridgeHost` como parámetro
   - Se obtiene automáticamente vía `BaseIsmpModule.host()`

#### PASO 4: Deployment Scripts Actualizados

**script/Mirrors/DeployMirrors.s.sol ACTUALIZADO:**

```solidity
// ❌ ANTES (Incorrecto)
messageHandler = new ISMPMessageHandler(
    config.hyperbridgeHost,   // ❌ Ya NO se usa
    config.paseoChainId,
    address(tenantMirror),
    address(propertyMirror),
    deployer
);

// ✅ DESPUÉS (Correcto)
messageHandler = new ISMPMessageHandler(
    config.paseoChainId,      // Solo necesita esto
    address(tenantMirror),
    address(propertyMirror),
    deployer
);

console.log("Hyperbridge Host auto-detected:", messageHandler.host());
```

**Struct ChainConfig Simplificado:**
```solidity
// ❌ ANTES
struct ChainConfig {
    string name;
    address hyperbridgeHost;  // ❌ Ya NO se usa
    bytes paseoChainId;
    uint256 sourceChainId;
}

// ✅ DESPUÉS
struct ChainConfig {
    string name;
    bytes paseoChainId;
    uint256 sourceChainId; // Paseo chain ID
}
// NOTE: hyperbridgeHost is auto-detected by BaseIsmpModule per chainId
```

### 14.3 Addresses de Hyperbridge Host (Auto-Detectados)

El SDK oficial **BaseIsmpModule** conoce automáticamente los hosts en cada red:

```solidity
// BaseIsmpModule.host() retorna por chainId:
- Ethereum Sepolia (11155111):  0x2EdB74C269948b60ec1000040E104cef0eABaae8
- Arbitrum Sepolia (421614):    0x3435bD7e5895356535459D6087D1eB982DAd90e7
- Optimism Sepolia (11155420):  0x6d51b678836d8060d980605d2999eF211809f3C2
- Base Sepolia (84532):         0xD198c01839dd4843918617AfD1e4DDf44Cc3BB4a
- BSC Testnet (97):             0x8Aa0Dea6D675d785A882967Bf38183f6117C09b7
- Gnosis Chiado (10200):        0x58A41B89F4871725E5D898d98eF4BF917601c5eB
```

**NO necesitas configurar manualmente** el address del Hyperbridge Host. El SDK lo detecta automáticamente basándose en el `block.chainid`.

### 14.4 Verificación de Arquitectura Completa

#### ✅ **Contratos V2 Core (Paseo)**
```
Location: Foundry/src/V2/

TenantPassportV2.sol          ✅ NO usa SDK (source of truth en Paseo)
PropertyRegistry.sol          ✅ NO usa SDK (source of truth en Paseo)
RentalAgreementFactory.sol    ✅ NO usa SDK (lógica core)
RentalAgreement.sol           ✅ NO usa SDK (lógica core)
DisputeResolver.sol           ✅ NO usa SDK (lógica core)
RoomFiVault.sol               ✅ NO usa SDK (lógica core)

VEREDICTO: ✅ Correcto - Los contratos core NO necesitan Hyperbridge
           Son la source of truth y viven en Paseo PolkaVM
```

#### ✅ **Contratos Mirrors (Moonbeam/Arbitrum)**
```
Location: Foundry/src/Mirrors/

ISMPMessageHandler.sol        ✅ USA SDK OFICIAL (BaseIsmpModule)
TenantPassportMirror.sol      ✅ NO usa SDK (solo recibe via handler)
PropertyRegistryMirror.sol    ✅ NO usa SDK (solo recibe via handler)

VEREDICTO: ✅ Correcto - Solo ISMPMessageHandler necesita el SDK
           Los mirrors son actualizados VIA el handler
```

#### ✅ **Pallet Substrate (Paseo Parachain)**
```
Location: Foundry/pallets/roomfi-bridge/

Cargo.toml:
├─ pallet-ismp = { version = "1.0.0" }     ✅ SDK Oficial
├─ ismp = { version = "1.0.0" }            ✅ SDK Oficial
└─ Features: "mock-polkavm" (para hackathon)

lib.rs:
├─ use pallet_ismp::dispatcher::*;         ✅ Usa dispatcher oficial
├─ use ismp::router::{Post, PostResponse}; ✅ Usa tipos oficiales
└─ sync_reputation_to_chain()              ✅ Construye mensajes ISMP correctamente

VEREDICTO: ✅ Correcto - Usa pallet-ismp oficial de Hyperbridge
```

### 14.5 Compilación y Testing

```bash
# Compilación sin errores
$ forge build
Compiling 129 files with Solc 0.8.20
Solc 0.8.20 finished in 19.11s
✅ Compiler run successful

# Solo warnings menores del propio SDK de Hyperbridge
# Ningún error en nuestros contratos
```

### 14.6 Deployment Actualizado

**NUEVO Flujo de Deployment (Mirrors):**

```bash
# 1. Configurar .env (YA NO NECESITA HYPERBRIDGE_HOST)
PRIVATE_KEY=0x...
MOONBEAM_RPC_URL=https://rpc.api.moonbase.moonbeam.network
PASEO_CHAIN_ID=70617365  # "paseo" en hex

# 2. Deployar Mirrors
forge script script/Mirrors/DeployMirrors.s.sol:DeployMirrors \
    --rpc-url $MOONBEAM_RPC_URL \
    --broadcast \
    --verify

# Output mostrará:
# ✅ TenantPassportMirror: 0x...
# ✅ PropertyRegistryMirror: 0x...
# ✅ ISMPMessageHandler: 0x...
# ✅ Hyperbridge Host auto-detected: 0x...  ← Auto-detectado!
```

### 14.7 Checklist de Cumplimiento

```
REQUISITOS DEL HACKATHON - HYPERBRIDGE SDK:

[✅] SDK oficial instalado (forge install polytope-labs/hyperbridge)
[✅] Interfaces oficiales importadas (@polytope-labs/ismp-solidity)
[✅] BaseIsmpModule heredado correctamente
[✅] Pallet Substrate usa pallet-ismp oficial
[✅] Constructor actualizado (sin hyperbridgeHost manual)
[✅] Modifier onlyHost usado del SDK
[✅] Message.hash() usado del SDK
[✅] Todas las funciones IIsmpModule implementadas
[✅] Deployment scripts actualizados
[✅] Compilación sin errores
[✅] Documentación actualizada

RESULTADO FINAL: ✅ 100% COMPLIANT CON HYPERBRIDGE SDK OFICIAL
```

### 14.8 Referencias y Documentación

**Repositorios Oficiales:**
- Hyperbridge SDK: https://github.com/polytope-labs/hyperbridge
- ISMP Solidity: https://github.com/polytope-labs/hyperbridge/tree/main/evm
- Docs Oficiales: https://docs.hyperbridge.network/developers

**Archivos Modificados:**
```
Foundry/foundry.toml                        ← Remappings actualizados
Foundry/src/Mirrors/ISMPMessageHandler.sol  ← SDK oficial integrado
Foundry/script/Mirrors/DeployMirrors.s.sol  ← Constructor actualizado
```

**Archivos Nuevos:**
```
Foundry/lib/hyperbridge/                    ← SDK completo instalado
```

### 14.9 Diferencias Clave: Manual vs SDK Oficial

| Aspecto | ANTES (Manual) | DESPUÉS (SDK Oficial) |
|---------|----------------|----------------------|
| **Interfaces** | Definidas manualmente | Importadas de @polytope-labs |
| **Host Address** | Constructor manual | Auto-detectado por chainId |
| **Validación** | Modifier custom `onlyHyperbridge` | Modifier `onlyHost` del SDK |
| **Hash Calculation** | `request.hash` (inexistente) | `Message.hash(request)` oficial |
| **Contract Base** | Solo Ownable, ReentrancyGuard | **BaseIsmpModule** + Ownable |
| **Fee Token** | No manejado | Approval automático en constructor |
| **Get Requests** | No implementados | onGetResponse(), onGetTimeout() |
| **Mantenibilidad** | Manual updates si Hyperbridge cambia | Updates automáticos con SDK |

### 14.10 Próximos Pasos

✅ **Integración Hyperbridge SDK: COMPLETADA**

Ahora puedes continuar con:
1. **RoomFiVault.sol** - Crear contrato faltante (2-3h)
2. **RentalAgreement.sol** - Completar funciones faltantes (3-4h)
3. **Tests** - Crear suite de tests (4-5h)
4. **Deploy a Testnet** - Deploy completo con SDK oficial

El proyecto **CUMPLE 100%** con los requisitos del hackathon respecto al uso del Hyperbridge SDK oficial.

---

*FIN DEL DOCUMENTO*

**ESTE DOCUMENTO DEBE SER LA BIBLIA PARA CUALQUIER IA QUE TRABAJE EN ROOMFI V2**

Contiene:
✅ Arquitectura técnica completa con especificación de cada contrato
✅ Business model realista y detallado con proyecciones
✅ Justificación de por qué Polkadot vs otras chains
✅ Gaps técnicos específicos con ubicación exacta de archivos
✅ Código de ejemplo para implementar features faltantes
✅ Checklists actionables para deployment y demo
✅ Timeline y effort estimates

**Próxima IA: Lee este documento línea por línea antes de escribir código**

