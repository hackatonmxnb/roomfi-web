// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PropertyRegistry
 * @author RoomFi Team - Firrton
 * @notice Registry descentralizado de propiedades inmobiliarias tokenizadas como NFTs
 * @dev Implementa un sistema de verificación KYC para propiedades del mundo real (en proceso)
 *
 * Características principales:
 * -PropertyNFT (ERC721) con ID único basado en GPS
 * -Sistema de verificación legal obligatoria
 * -Prevención de duplicados con GPS hashing
 * -Badges de verificación y desempeño
 * -Property reputation score
 * -Integración con TenantPassport
 * -Optimizado para Polkadot/Moonbeam
 *
 * Arquitectura cross-chain:
 * Diseñado para integrarse con XCM (Cross-Consensus Messaging):
 * -Moonbeam ←→ Acala (DeFi - hipotecas, colateral)
 * -Moonbeam ←→ KILT (Identity verification)
 * -Moonbeam ←→ Oráculos de precios de mercado
 */

// Imports locales de OpenZeppelin (optimizado para Foundry/Paseo)
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @notice Interfaz simplificada de TenantPassport para validaciones
 */
interface ITenantPassport {
    function hasPassport(address user) external view returns (bool);
    function getTokenIdByAddress(address user) external pure returns (uint256);
    function getReputationWithDecay(uint256 tokenId) external view returns (uint32);
    function incrementPropertiesOwned(uint256 tokenId) external;
}

contract PropertyRegistry is ERC721, Ownable {
    using Strings for uint256;

    // Tracking manual de tokens (reemplaza ERC721Enumerable)
    uint256[] private _allTokens;
    mapping(uint256 => uint256) private _allTokensIndex;

    // Enums y estructuras

    /**
     * @notice Estados de verificación de la propiedad
     */
    enum PropertyVerificationStatus {
        DRAFT,              // Registrada, sin documentos
        PENDING,            // Documentos enviados, esperando revisión
        VERIFIED,           // Verificada por notario/autoridad
        REJECTED,           // Rechazada, necesita correcciones
        EXPIRED,            // Verificación expiró (>2 años)
        SUSPENDED           // Suspendida por fraude/issues
    }

    /**
     * @notice Tipos de propiedad
     */
    enum PropertyType {
        HOUSE,              // Casa
        APARTMENT,          // Departamento
        ROOM,               // Habitación
        STUDIO,             // Estudio
        LOFT,               // Loft
        SHARED_ROOM         // Cuarto compartido
    }

    /**
     * @notice Badges de verificación y desempeño para propiedades
     */
    enum PropertyBadgeType {
        // BADGES DE VERIFICACIÓN (Manual - Requieren autorización)
        VERIFIED_OWNERSHIP,     // 0: Escrituras verificadas por notario
        VERIFIED_LOCATION,      // 1: Ubicación física verificada in-situ
        VERIFIED_CONDITION,     // 2: Estado/condición verificada
        LEGAL_COMPLIANCE,       // 3: Cumple regulaciones locales

        // BADGES DE DESEMPEÑO (Automático - Por métricas)
        RELIABLE_LANDLORD,      // 4: 10+ rentas completadas sin issues
        PERFECT_SCORE,          // 5: Rating 95+ por 6+ meses
        FAST_MAINTENANCE,       // 6: Issues resueltos en <48h
        LONG_TERM_PROPERTY,     // 7: Rentada continuamente 2+ años

        // BADGES PREMIUM (Especiales)
        FEATURED_PROPERTY,      // 8: Destacada por el protocolo
        ECO_FRIENDLY            // 9: Certificación sustentabilidad
    }

    /**
     * @notice Información básica de la propiedad
     */
    struct BasicPropertyInfo {
        string name;                    // "Casa en Condesa"
        PropertyType propertyType;      // HOUSE, APARTMENT, etc.
        string fullAddress;             // "Calle Amsterdam 123, Col. Condesa"
        string city;                    // "Ciudad de México"
        string state;                   // "CDMX"
        string postalCode;              // "06100"
        string neighborhood;            // "Condesa" (para filtros y precios)

        // Coordenadas GPS (x1e6 para precisión)
        int256 latitude;                // 19412345 = 19.412345°
        int256 longitude;               // -99123456 = -99.123456°
    }

    /**
     * @notice Características físicas de la propiedad
     */
    struct PropertyFeatures {
        uint8 bedrooms;                 // Habitaciones
        uint8 bathrooms;                // Baños
        uint8 maxOccupants;             // Ocupantes máximos
        uint16 squareMeters;            // m² totales
        uint16 floorNumber;             // Piso (0 = planta baja)

        // Amenities como bitmask (gas efficient)
        // Bit 0: WiFi, Bit 1: Parking, Bit 2: Gym, etc.
        uint256 amenities;
    }

    /**
     * @notice Información financiera
     */
    struct FinancialInfo {
        uint256 monthlyRent;            // Renta mensual (en wei de MXNB)
        uint256 securityDeposit;        // Depósito de garantía
        uint256 cleaningFee;            // Fee de limpieza única
        uint256 utilitiesCost;          // Costo estimado servicios

        bool utilitiesIncluded;         // Servicios incluidos?
        bool furnishedIncluded;         // Amueblado?

        uint256 earlyBirdDiscount;      // Descuento por anticipación (%)
        uint256 longTermDiscount;       // Descuento contratos largos (%)
    }

    /**
     * @notice Reputación de la propiedad
     */
    struct PropertyReputation {
        uint32 rating;                  // Score 0-100
        uint32 totalRentals;            // Total de rentas
        uint32 completedRentals;        // Completadas sin issues
        uint32 disputes;                // Disputas totales
        uint32 maintenanceIssues;       // Issues reportados

        // Scores específicos
        uint32 cleanlinessScore;        // 0-100
        uint32 locationScore;           // 0-100
        uint32 valueScore;              // 0-100 (relación precio-calidad)
    }

    /**
     * @notice Solicitud de verificación de propiedad
     */
    struct VerificationRequest {
        PropertyVerificationStatus status;
        string legalDocumentsURI;       // IPFS hash (encriptado) con:
                                        // - Escrituras
                                        // - INE propietario
                                        // - Predial
                                        // - Libertad de gravamen
                                        // - Fotos inspección
        uint256 requestedAt;
        uint256 reviewedAt;
        address reviewedBy;
        string rejectionReason;
    }

    /**
     * @notice Estructura completa de la propiedad
     */
    struct Property {
        uint256 propertyId;             // Token ID (derivado de GPS)
        address landlord;               // Propietario

        BasicPropertyInfo basicInfo;
        PropertyFeatures features;
        FinancialInfo financialInfo;
        PropertyReputation reputation;

        PropertyVerificationStatus verificationStatus;

        string metadataURI;             // IPFS con fotos/video (público)

        bool isActive;                  // Disponible para renta?
        bool isDelisted;                // Eliminada del listing?

        uint256 createdAt;
        uint256 lastUpdatedAt;
    }

    // Storage

    /// @notice Información de cada propiedad por tokenId
    mapping(uint256 => Property) public properties;

    /// @notice Badges ganados por cada propiedad
    mapping(uint256 => mapping(PropertyBadgeType => bool)) public propertyBadges;

    /// @notice Timestamp de cuando se otorgó cada badge
    mapping(uint256 => mapping(PropertyBadgeType => uint256)) public badgeAwardedAt;

    /// @notice Solicitudes de verificación por propertyId
    mapping(uint256 => VerificationRequest) public verificationRequests;

    /// @notice Lista de propiedades con verificación pendiente
    uint256[] public pendingVerifications;
    mapping(uint256 => bool) public hasPendingVerification;

    /// @notice Verificadores autorizados (notarios, inspectores)
    mapping(address => bool) public authorizedVerifiers;

    /// @notice Propiedades por landlord
    mapping(address => uint256[]) public landlordProperties;

    /// @notice TenantPassport contract reference
    ITenantPassport public immutable tenantPassport;

    /// @notice Contador de issues de mantenimiento por propiedad
    mapping(uint256 => uint32) public maintenanceResponseCount;

    // Constantes

    uint32 private constant INITIAL_RATING = 80;                    // Start at 80/100
    uint32 private constant MIN_LANDLORD_REPUTATION = 50;           // Mínimo para registrar

    uint256 private constant VERIFICATION_EXPIRY = 730 days;        // 2 años
    uint256 private constant GPS_PRECISION = 1e6;                   // 6 decimales
    uint256 private constant GPS_TOLERANCE = 100;                   // ~100m duplicado

    uint32 private constant RELIABLE_LANDLORD_THRESHOLD = 10;       // 10 rentas
    uint32 private constant PERFECT_SCORE_THRESHOLD = 95;           // Rating 95+
    uint256 private constant PERFECT_SCORE_DURATION = 180 days;     // 6 meses
    uint32 private constant FAST_MAINTENANCE_THRESHOLD = 5;         // 5 respuestas rápidas
    uint256 private constant LONG_TERM_THRESHOLD = 730 days;        // 2 años

    // Badges KYC que requieren verificación manual
    uint8 private constant FIRST_VERIFICATION_BADGE = 0;            // VERIFIED_OWNERSHIP
    uint8 private constant LAST_VERIFICATION_BADGE = 3;             // LEGAL_COMPLIANCE

    // Eventos

    event PropertyRegistered(
        uint256 indexed propertyId,
        address indexed landlord,
        string city,
        uint256 monthlyRent,
        uint256 timestamp
    );

    event PropertyUpdated(
        uint256 indexed propertyId,
        address indexed landlord,
        uint256 timestamp
    );

    event VerificationRequested(
        uint256 indexed propertyId,
        address indexed landlord,
        string documentsURI,
        uint256 timestamp
    );

    event VerificationApproved(
        uint256 indexed propertyId,
        address indexed verifier,
        uint256 timestamp
    );

    event VerificationRejected(
        uint256 indexed propertyId,
        address indexed verifier,
        string reason,
        uint256 timestamp
    );

    event PropertyBadgeAwarded(
        uint256 indexed propertyId,
        PropertyBadgeType indexed badgeType,
        address indexed awardedBy,
        uint256 timestamp
    );

    event PropertyBadgeRevoked(
        uint256 indexed propertyId,
        PropertyBadgeType indexed badgeType,
        uint256 timestamp
    );

    event PropertyListed(
        uint256 indexed propertyId,
        uint256 timestamp
    );

    event PropertyDelisted(
        uint256 indexed propertyId,
        uint256 timestamp
    );

    event PropertyReputationUpdated(
        uint256 indexed propertyId,
        uint32 oldRating,
        uint32 newRating,
        string reason
    );

    // Modifiers

    modifier onlyLandlord(uint256 propertyId) {
        require(
            properties[propertyId].landlord == msg.sender,
            "PropertyRegistry: Solo el propietario"
        );
        _;
    }

    modifier onlyAuthorizedVerifier() {
        require(
            authorizedVerifiers[msg.sender],
            "PropertyRegistry: No autorizado para verificar"
        );
        _;
    }

    modifier propertyExists(uint256 propertyId) {
        require(
            _ownerOf(propertyId) != address(0),
            "PropertyRegistry: Propiedad no existe"
        );
        _;
    }

    modifier onlyVerified(uint256 propertyId) {
        require(
            properties[propertyId].verificationStatus == PropertyVerificationStatus.VERIFIED,
            "PropertyRegistry: Propiedad no verificada"
        );
        _;
    }

    // Constructor

    /**
     * @notice Inicializa el PropertyRegistry
     * @param _tenantPassportAddress Dirección del contrato TenantPassport
     * @param initialOwner Owner inicial (multisig recomendado)
     */
    constructor(
        address _tenantPassportAddress,
        address initialOwner
    )
        ERC721("RoomFi Property NFT", "ROOMFI-PROPERTY")
        Ownable(initialOwner)
    {
        require(_tenantPassportAddress != address(0), "Invalid TenantPassport address");
        tenantPassport = ITenantPassport(_tenantPassportAddress);
    }

    // Funciones principales - Registro

    /**
     * @notice Registra una nueva propiedad en el protocolo
     * @dev Crea PropertyNFT con ID único basado en GPS
     *
     * FLUJO:
     * 1. Valida que landlord tenga TenantPassport con reputación mínima
     * 2. Genera propertyId único con GPS hash
     * 3. Valida que no esté duplicado
     * 4. Acuña PropertyNFT
     * 5. Guarda información
     * 6. Estado inicial: DRAFT
     *
     * COSTO ESTIMADO (Moonbeam): ~$0.10 USD
     */
    function registerProperty(
        // Basic Info
        string calldata name,
        PropertyType propertyType,
        string calldata fullAddress,
        string calldata city,
        string calldata state,
        string calldata postalCode,
        string calldata neighborhood,
        int256 latitude,
        int256 longitude,

        // Features
        uint8 bedrooms,
        uint8 bathrooms,
        uint8 maxOccupants,
        uint16 squareMeters,
        uint16 floorNumber,
        uint256 amenities,

        // Financial
        uint256 monthlyRent,
        uint256 securityDeposit,
        bool utilitiesIncluded,
        bool furnishedIncluded,

        // Metadata
        string calldata metadataURI
    )
        external
        returns (uint256 propertyId)
    {
        // VALIDACIONES

        // 1. Validar TenantPassport
        require(
            tenantPassport.hasPassport(msg.sender),
            "Necesitas TenantPassport primero"
        );

        // 2. Validar reputación mínima para ser landlord
        uint256 landlordTokenId = tenantPassport.getTokenIdByAddress(msg.sender);
        uint32 reputation = tenantPassport.getReputationWithDecay(landlordTokenId);
        require(
            reputation >= MIN_LANDLORD_REPUTATION,
            "Reputacion insuficiente para ser landlord"
        );

        // 3. Validar datos básicos
        require(bytes(name).length > 0, "Nombre requerido");
        require(bytes(fullAddress).length > 0, "Direccion requerida");
        require(bedrooms > 0, "Debe tener al menos 1 habitacion");
        require(maxOccupants > 0, "Debe permitir al menos 1 ocupante");
        require(monthlyRent > 0, "Renta debe ser mayor a 0");

        // 4. Validar GPS (rango válido)
        require(
            latitude >= -90000000 && latitude <= 90000000,
            "Latitud invalida"
        );
        require(
            longitude >= -180000000 && longitude <= 180000000,
            "Longitud invalida"
        );

        // GENERAR PROPERTY ID ÚNICO
        propertyId = _generatePropertyId(latitude, longitude, fullAddress);

        // Validar que no exista (prevención de duplicados)
        require(
            _ownerOf(propertyId) == address(0),
            "Propiedad ya registrada (mismas coordenadas GPS)"
        );

        // ACUÑAR PROPERTY NFT
        _mint(msg.sender, propertyId);

        // Agregar a tracking manual
        _addTokenToAllTokensEnumeration(propertyId);

        // GUARDAR INFORMACIÓN
        Property storage prop = properties[propertyId];

        prop.propertyId = propertyId;
        prop.landlord = msg.sender;

        // Basic Info
        prop.basicInfo = BasicPropertyInfo({
            name: name,
            propertyType: propertyType,
            fullAddress: fullAddress,
            city: city,
            state: state,
            postalCode: postalCode,
            neighborhood: neighborhood,
            latitude: latitude,
            longitude: longitude
        });

        // Features
        prop.features = PropertyFeatures({
            bedrooms: bedrooms,
            bathrooms: bathrooms,
            maxOccupants: maxOccupants,
            squareMeters: squareMeters,
            floorNumber: floorNumber,
            amenities: amenities
        });

        // Financial
        prop.financialInfo = FinancialInfo({
            monthlyRent: monthlyRent,
            securityDeposit: securityDeposit,
            cleaningFee: 0,
            utilitiesCost: 0,
            utilitiesIncluded: utilitiesIncluded,
            furnishedIncluded: furnishedIncluded,
            earlyBirdDiscount: 0,
            longTermDiscount: 0
        });

        // Reputation inicial
        prop.reputation = PropertyReputation({
            rating: INITIAL_RATING,
            totalRentals: 0,
            completedRentals: 0,
            disputes: 0,
            maintenanceIssues: 0,
            cleanlinessScore: INITIAL_RATING,
            locationScore: INITIAL_RATING,
            valueScore: INITIAL_RATING
        });

        prop.verificationStatus = PropertyVerificationStatus.DRAFT;
        prop.metadataURI = metadataURI;
        prop.isActive = false; // No se puede rentar hasta verificar
        prop.isDelisted = false;
        prop.createdAt = block.timestamp;
        prop.lastUpdatedAt = block.timestamp;

        // Agregar a lista de propiedades del landlord
        landlordProperties[msg.sender].push(propertyId);

        // Incrementar contador en TenantPassport
        tenantPassport.incrementPropertiesOwned(landlordTokenId);

        emit PropertyRegistered(propertyId, msg.sender, city, monthlyRent, block.timestamp);

        return propertyId;
    }

    /**
     * @notice Actualiza información de la propiedad
     * @dev Solo landlord puede actualizar, solo si no está en renta activa
     */
    function updateProperty(
        uint256 propertyId,
        uint256 newMonthlyRent,
        uint256 newSecurityDeposit,
        bool newUtilitiesIncluded,
        string calldata newMetadataURI
    )
        external
        onlyLandlord(propertyId)
        propertyExists(propertyId)
    {
        Property storage prop = properties[propertyId];

        // Actualizar financial info
        if (newMonthlyRent > 0) {
            prop.financialInfo.monthlyRent = newMonthlyRent;
        }
        if (newSecurityDeposit > 0) {
            prop.financialInfo.securityDeposit = newSecurityDeposit;
        }
        prop.financialInfo.utilitiesIncluded = newUtilitiesIncluded;

        // Actualizar metadata si cambió
        if (bytes(newMetadataURI).length > 0) {
            prop.metadataURI = newMetadataURI;
        }

        prop.lastUpdatedAt = block.timestamp;

        emit PropertyUpdated(propertyId, msg.sender, block.timestamp);
    }

    // Sistema de verificación (Como KYC para Propiedades)

    /**
     * @notice Solicita verificación legal de la propiedad
     * @dev Landlord sube documentos a IPFS y proporciona hash
     * @param propertyId ID de la propiedad
     * @param legalDocumentsURI IPFS hash con documentos encriptados
     *
     * DOCUMENTOS REQUERIDOS (off-chain):
     * 1. Escrituras de la propiedad
     * 2. INE del propietario
     * 3. Predial pagado (último año)
     * 4. Certificado de libertad de gravamen
     * 5. Fotos de inspección (alta resolución)
     * 6. Contrato de arrendamiento template
     *
     * FLUJO:
     * 1. Landlord sube docs a IPFS (encriptados)
     * 2. Llama requestPropertyVerification()
     * 3. Entra en cola de verificaciones pendientes
     * 4. Verificador revisa off-chain
     * 5. Verificador aprueba/rechaza on-chain
     */
    function requestPropertyVerification(
        uint256 propertyId,
        string calldata legalDocumentsURI
    )
        external
        onlyLandlord(propertyId)
        propertyExists(propertyId)
    {
        Property storage prop = properties[propertyId];

        // Validar estado actual
        require(
            prop.verificationStatus == PropertyVerificationStatus.DRAFT ||
            prop.verificationStatus == PropertyVerificationStatus.REJECTED,
            "Propiedad no puede solicitar verificacion"
        );

        // Validar que documentos fueron subidos
        require(bytes(legalDocumentsURI).length > 0, "Documentos requeridos");

        // Crear solicitud
        verificationRequests[propertyId] = VerificationRequest({
            status: PropertyVerificationStatus.PENDING,
            legalDocumentsURI: legalDocumentsURI,
            requestedAt: block.timestamp,
            reviewedAt: 0,
            reviewedBy: address(0),
            rejectionReason: ""
        });

        // Actualizar estado de la propiedad
        prop.verificationStatus = PropertyVerificationStatus.PENDING;
        prop.lastUpdatedAt = block.timestamp;

        // Agregar a lista de pendientes
        if (!hasPendingVerification[propertyId]) {
            pendingVerifications.push(propertyId);
            hasPendingVerification[propertyId] = true;
        }

        emit VerificationRequested(propertyId, msg.sender, legalDocumentsURI, block.timestamp);
    }

    /**
     * @notice Aprueba verificación de propiedad
     * @dev Solo verificadores autorizados pueden aprobar
     */
    function approvePropertyVerification(uint256 propertyId)
        external
        onlyAuthorizedVerifier
        propertyExists(propertyId)
    {
        Property storage prop = properties[propertyId];
        VerificationRequest storage request = verificationRequests[propertyId];

        // Validar estado
        require(
            request.status == PropertyVerificationStatus.PENDING,
            "No hay solicitud pendiente"
        );

        // Actualizar solicitud
        request.status = PropertyVerificationStatus.VERIFIED;
        request.reviewedAt = block.timestamp;
        request.reviewedBy = msg.sender;

        // Actualizar propiedad
        prop.verificationStatus = PropertyVerificationStatus.VERIFIED;
        prop.isActive = true; // Ahora puede listarse
        prop.lastUpdatedAt = block.timestamp;

        // Otorgar badge VERIFIED_OWNERSHIP automáticamente
        _awardPropertyBadgeInternal(propertyId, PropertyBadgeType.VERIFIED_OWNERSHIP);

        // Remover de pendientes
        _removeFromPendingVerifications(propertyId);

        emit VerificationApproved(propertyId, msg.sender, block.timestamp);
    }

    /**
     * @notice Rechaza verificación de propiedad
     * @dev Solo verificadores autorizados pueden rechazar
     */
    function rejectPropertyVerification(
        uint256 propertyId,
        string calldata reason
    )
        external
        onlyAuthorizedVerifier
        propertyExists(propertyId)
    {
        Property storage prop = properties[propertyId];
        VerificationRequest storage request = verificationRequests[propertyId];

        // Validar estado
        require(
            request.status == PropertyVerificationStatus.PENDING,
            "No hay solicitud pendiente"
        );

        // Actualizar solicitud
        request.status = PropertyVerificationStatus.REJECTED;
        request.reviewedAt = block.timestamp;
        request.reviewedBy = msg.sender;
        request.rejectionReason = reason;

        // Actualizar propiedad
        prop.verificationStatus = PropertyVerificationStatus.REJECTED;
        prop.lastUpdatedAt = block.timestamp;

        // Remover de pendientes
        _removeFromPendingVerifications(propertyId);

        emit VerificationRejected(propertyId, msg.sender, reason, block.timestamp);
    }

    /**
     * @notice Marca verificación como expirada (>2 años)
     */
    function markVerificationExpired(uint256 propertyId)
        external
        propertyExists(propertyId)
    {
        Property storage prop = properties[propertyId];

        require(
            prop.verificationStatus == PropertyVerificationStatus.VERIFIED,
            "Propiedad no verificada"
        );

        uint256 verifiedAt = verificationRequests[propertyId].reviewedAt;
        require(
            block.timestamp > verifiedAt + VERIFICATION_EXPIRY,
            "Verificacion aun valida"
        );

        // Marcar como expirada
        prop.verificationStatus = PropertyVerificationStatus.EXPIRED;
        prop.isActive = false; // No puede rentarse hasta re-verificar

        // Revocar badge de verificación
        propertyBadges[propertyId][PropertyBadgeType.VERIFIED_OWNERSHIP] = false;

        emit PropertyBadgeRevoked(propertyId, PropertyBadgeType.VERIFIED_OWNERSHIP, block.timestamp);
    }

    // Sistema de badges

    /**
     * @notice Otorga badge de verificación manual
     * @dev Solo verificadores autorizados
     */
    function awardVerificationBadge(
        uint256 propertyId,
        PropertyBadgeType badgeType
    )
        external
        onlyAuthorizedVerifier
        propertyExists(propertyId)
    {
        // Validar que es badge de verificación (0-3)
        require(
            uint8(badgeType) <= LAST_VERIFICATION_BADGE,
            "Solo badges de verificacion"
        );

        _awardPropertyBadgeInternal(propertyId, badgeType);
    }

    /**
     * @notice Actualiza reputación y verifica badges automáticos
     * @dev Llamado por RentalAgreement después de cada renta
     */
    function updatePropertyReputation(
        uint256 propertyId,
        bool rentalCompleted,
        bool hadDispute,
        uint32 cleanlinessRating,
        uint32 locationRating,
        uint32 valueRating
    )
        external
        propertyExists(propertyId)
    {
        // TODO: Agregar modifier para solo contratos autorizados
        Property storage prop = properties[propertyId];
        PropertyReputation storage rep = prop.reputation;

        uint32 oldRating = rep.rating;

        // Actualizar contadores
        rep.totalRentals++;

        if (rentalCompleted) {
            rep.completedRentals++;
        }

        if (hadDispute) {
            rep.disputes++;
            // Penalizar rating
            if (rep.rating > 5) {
                rep.rating -= 5;
            }
        } else {
            // Incrementar rating si fue bien
            if (rep.rating < 100) {
                rep.rating = rep.rating + 1 > 100 ? 100 : rep.rating + 1;
            }
        }

        // Actualizar scores específicos (promedio)
        rep.cleanlinessScore = uint32((uint256(rep.cleanlinessScore) + cleanlinessRating) / 2);
        rep.locationScore = uint32((uint256(rep.locationScore) + locationRating) / 2);
        rep.valueScore = uint32((uint256(rep.valueScore) + valueRating) / 2);

        // Verificar badges automáticos
        _checkAndAwardAutomaticBadges(propertyId);

        emit PropertyReputationUpdated(propertyId, oldRating, rep.rating, "Rental completed");
    }

    /**
     * @notice Registra respuesta rápida a mantenimiento
     */
    function recordFastMaintenance(uint256 propertyId)
        external
        propertyExists(propertyId)
    {
        // TODO: Agregar modifier para solo contratos autorizados
        maintenanceResponseCount[propertyId]++;

        // Verificar badge FAST_MAINTENANCE
        if (maintenanceResponseCount[propertyId] >= FAST_MAINTENANCE_THRESHOLD &&
            !propertyBadges[propertyId][PropertyBadgeType.FAST_MAINTENANCE]) {
            _awardPropertyBadgeInternal(propertyId, PropertyBadgeType.FAST_MAINTENANCE);
        }
    }

    /**
     * @notice Verifica y otorga badges automáticos
     */
    function _checkAndAwardAutomaticBadges(uint256 propertyId) internal {
        PropertyReputation storage rep = properties[propertyId].reputation;

        // Badge: RELIABLE_LANDLORD (10+ rentas completadas)
        if (rep.completedRentals >= RELIABLE_LANDLORD_THRESHOLD &&
            !propertyBadges[propertyId][PropertyBadgeType.RELIABLE_LANDLORD]) {
            _awardPropertyBadgeInternal(propertyId, PropertyBadgeType.RELIABLE_LANDLORD);
        }

        // Badge: PERFECT_SCORE (95+ por 6+ meses)
        if (rep.rating >= PERFECT_SCORE_THRESHOLD) {
            uint256 firstHighScore = badgeAwardedAt[propertyId][PropertyBadgeType.PERFECT_SCORE];
            if (firstHighScore == 0) {
                // Primera vez con score alto, guardar timestamp
                badgeAwardedAt[propertyId][PropertyBadgeType.PERFECT_SCORE] = block.timestamp;
            } else if (block.timestamp >= firstHighScore + PERFECT_SCORE_DURATION &&
                       !propertyBadges[propertyId][PropertyBadgeType.PERFECT_SCORE]) {
                _awardPropertyBadgeInternal(propertyId, PropertyBadgeType.PERFECT_SCORE);
            }
        }

        // Badge: LONG_TERM_PROPERTY (2+ años rentada)
        if (block.timestamp >= properties[propertyId].createdAt + LONG_TERM_THRESHOLD &&
            rep.totalRentals > 0 &&
            !propertyBadges[propertyId][PropertyBadgeType.LONG_TERM_PROPERTY]) {
            _awardPropertyBadgeInternal(propertyId, PropertyBadgeType.LONG_TERM_PROPERTY);
        }
    }

    /**
     * @notice Función interna para otorgar badge
     */
    function _awardPropertyBadgeInternal(
        uint256 propertyId,
        PropertyBadgeType badgeType
    ) internal {
        if (!propertyBadges[propertyId][badgeType]) {
            propertyBadges[propertyId][badgeType] = true;
            badgeAwardedAt[propertyId][badgeType] = block.timestamp;
            emit PropertyBadgeAwarded(propertyId, badgeType, msg.sender, block.timestamp);
        }
    }

    // Listing & Delisting

    /**
     * @notice Lista propiedad para renta (la hace visible)
     * @dev Solo si está verificada
     */
    function listProperty(uint256 propertyId)
        external
        onlyLandlord(propertyId)
        onlyVerified(propertyId)
        propertyExists(propertyId)
    {
        Property storage prop = properties[propertyId];
        require(!prop.isDelisted, "Propiedad eliminada permanentemente");

        prop.isActive = true;
        prop.lastUpdatedAt = block.timestamp;

        emit PropertyListed(propertyId, block.timestamp);
    }

    /**
     * @notice Quita propiedad del listing (deja de ser visible)
     */
    function delistProperty(uint256 propertyId)
        external
        onlyLandlord(propertyId)
        propertyExists(propertyId)
    {
        Property storage prop = properties[propertyId];

        prop.isActive = false;
        prop.lastUpdatedAt = block.timestamp;

        emit PropertyDelisted(propertyId, block.timestamp);
    }

    // View functions - Búsqueda y consulta

    /**
     * @notice Obtiene información completa de una propiedad
     */
    function getProperty(uint256 propertyId)
        external
        view
        propertyExists(propertyId)
        returns (Property memory)
    {
        return properties[propertyId];
    }

    /**
     * @notice Obtiene propiedades de un landlord
     */
    function getPropertiesByLandlord(address landlord)
        external
        view
        returns (uint256[] memory)
    {
        return landlordProperties[landlord];
    }

    /**
     * @notice Obtiene propiedades pendientes de verificación
     */
    function getPendingVerifications()
        external
        view
        returns (uint256[] memory)
    {
        return pendingVerifications;
    }

    /**
     * @notice Verifica si propiedad tiene un badge específico
     */
    function hasPropertyBadge(uint256 propertyId, PropertyBadgeType badgeType)
        external
        view
        propertyExists(propertyId)
        returns (bool)
    {
        return propertyBadges[propertyId][badgeType];
    }

    /**
     * @notice Cuenta cuántos badges tiene una propiedad
     */
    function getPropertyBadgeCount(uint256 propertyId)
        external
        view
        propertyExists(propertyId)
        returns (uint256 count)
    {
        count = 0;
        for (uint i = 0; i < 10; i++) {
            if (propertyBadges[propertyId][PropertyBadgeType(i)]) {
                count++;
            }
        }
        return count;
    }

    /**
     * @notice Obtiene propiedades activas (paginado)
     * @dev Para no gastar mucho gas, usa paginación
     */
    function getActiveProperties(uint256 offset, uint256 limit)
        external
        view
        returns (uint256[] memory propertyIds)
    {
        uint256 total = totalSupply();
        if (offset >= total) {
            return new uint256[](0);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        // Contar activas primero
        uint256 activeCount = 0;
        for (uint256 i = offset; i < end; i++) {
            uint256 tokenId = tokenByIndex(i);
            if (properties[tokenId].isActive &&
                !properties[tokenId].isDelisted &&
                properties[tokenId].verificationStatus == PropertyVerificationStatus.VERIFIED) {
                activeCount++;
            }
        }

        // Llenar array
        propertyIds = new uint256[](activeCount);
        uint256 currentIndex = 0;
        for (uint256 i = offset; i < end && currentIndex < activeCount; i++) {
            uint256 tokenId = tokenByIndex(i);
            if (properties[tokenId].isActive &&
                !properties[tokenId].isDelisted &&
                properties[tokenId].verificationStatus == PropertyVerificationStatus.VERIFIED) {
                propertyIds[currentIndex] = tokenId;
                currentIndex++;
            }
        }

        return propertyIds;
    }

    /**
     * @notice Busca propiedades por ciudad
     * @dev Gas intensivo, usar con límite
     */
    function getPropertiesByCity(string calldata city, uint256 limit)
        external
        view
        returns (uint256[] memory)
    {
        uint256[] memory results = new uint256[](limit);
        uint256 count = 0;
        uint256 total = totalSupply();

        for (uint256 i = 0; i < total && count < limit; i++) {
            uint256 tokenId = tokenByIndex(i);
            Property storage prop = properties[tokenId];

            if (prop.isActive &&
                !prop.isDelisted &&
                prop.verificationStatus == PropertyVerificationStatus.VERIFIED &&
                keccak256(bytes(prop.basicInfo.city)) == keccak256(bytes(city))) {
                results[count] = tokenId;
                count++;
            }
        }

        // Resize array to actual count
        uint256[] memory finalResults = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            finalResults[i] = results[i];
        }

        return finalResults;
    }

    // Funciones internas

    /**
     * @notice Genera ID único de propiedad basado en GPS + dirección
     * @dev Previene duplicados de la misma propiedad física
     */
    function _generatePropertyId(
        int256 latitude,
        int256 longitude,
        string memory fullAddress
    ) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(
            latitude,
            longitude,
            fullAddress
        )));
    }

    /**
     * @notice Remueve propiedad de lista de verificaciones pendientes
     */
    function _removeFromPendingVerifications(uint256 propertyId) internal {
        if (hasPendingVerification[propertyId]) {
            hasPendingVerification[propertyId] = false;

            // Swap & pop pattern para gas efficiency
            for (uint i = 0; i < pendingVerifications.length; i++) {
                if (pendingVerifications[i] == propertyId) {
                    pendingVerifications[i] = pendingVerifications[pendingVerifications.length - 1];
                    pendingVerifications.pop();
                    break;
                }
            }
        }
    }

    // Funciones de tracking manual (reemplaza ERC721Enumerable)

    function _addTokenToAllTokensEnumeration(uint256 tokenId) private {
        _allTokensIndex[tokenId] = _allTokens.length;
        _allTokens.push(tokenId);
    }

    function _removeTokenFromAllTokensEnumeration(uint256 tokenId) private {
        uint256 lastTokenIndex = _allTokens.length - 1;
        uint256 tokenIndex = _allTokensIndex[tokenId];
        uint256 lastTokenId = _allTokens[lastTokenIndex];

        _allTokens[tokenIndex] = lastTokenId;
        _allTokensIndex[lastTokenId] = tokenIndex;

        delete _allTokensIndex[tokenId];
        _allTokens.pop();
    }

    /**
     * @notice Total supply de propiedades (reemplaza ERC721Enumerable.totalSupply)
     */
    function totalSupply() public view returns (uint256) {
        return _allTokens.length;
    }

    /**
     * @notice Get token by index (reemplaza ERC721Enumerable.tokenByIndex)
     */
    function tokenByIndex(uint256 index) public view returns (uint256) {
        require(index < _allTokens.length, "Index out of bounds");
        return _allTokens[index];
    }

    /**
     * @notice Override de tokenURI para metadata dinámica
     * @dev Genera JSON on-chain con estado actual de la propiedad
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");

        Property storage prop = properties[tokenId];

        string memory verifiedStatus = prop.verificationStatus == PropertyVerificationStatus.VERIFIED
            ? "Verified"
            : "Not Verified";

        string memory json = string(abi.encodePacked(
            '{"name":"', prop.basicInfo.name, '",',
            '"description":"Property NFT for ', prop.basicInfo.fullAddress, '",',
            '"image":"', prop.metadataURI, '",',
            '"attributes":[',
                '{"trait_type":"Status","value":"', verifiedStatus, '"},',
                '{"trait_type":"City","value":"', prop.basicInfo.city, '"},',
                '{"trait_type":"Rating","value":"', Strings.toString(prop.reputation.rating), '"},',
                '{"trait_type":"Bedrooms","value":"', Strings.toString(prop.features.bedrooms), '"}',
            ']}'
        ));

        return string(abi.encodePacked(
            'data:application/json;base64,',
            Base64.encode(bytes(json))
        ));
    }

    // Funciones de administración

    /**
     * @notice Autoriza un verificador (notario, inspector)
     */
    function authorizeVerifier(address verifier) external onlyOwner {
        require(verifier != address(0), "Invalid address");
        authorizedVerifiers[verifier] = true;
    }

    /**
     * @notice Revoca autorización de verificador
     */
    function revokeVerifier(address verifier) external onlyOwner {
        authorizedVerifiers[verifier] = false;
    }

    /**
     * @notice Verifica si una dirección es verificador autorizado
     */
    function isAuthorizedVerifier(address verifier) external view returns (bool) {
        return authorizedVerifiers[verifier];
    }

    // Overrides requeridos

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
