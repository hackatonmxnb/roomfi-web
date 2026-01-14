// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TenantPassportV2
 * @author RoomFi Team - Firrton
 * @notice NFT Soul-Bound que representa la identidad y reputación on-chain de tenants
 * @dev Optimizado para EVM chains (Mantle, Ethereum L2s)
 *
 * Características:
 * - Soul-Bound Token (NO transferible)
 * - Sistema de reputación dinámico (0-100) con decay por inactividad
 * - 14 tipos de badges verificables (6 KYC + 8 automáticos)
 * - Multi-contract authorization
 * - Gas optimizado (sin ERC721Enumerable)
 */

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TenantPassportV2 is ERC721, Ownable {

    // 
    // Enums y estructuras
    // 

    /**
     * @notice Tipos de badges verificables en la plataforma
     * @dev SEPARACIÓN CRÍTICA:
     *
     * BADGES KYC (0-5): REQUIEREN VERIFICACIÓN MANUAL OBLIGATORIA
     * BADGES AUTOMÁTICOS (6-13): SE GANAN POR MÉTRICAS ON-CHAIN
     */
    enum BadgeType {
        // BADGES KYC - VERIFICACIÓN MANUAL OBLIGATORIA
        VERIFIED_ID,              // 0: INE/Pasaporte verificado manualmente
        VERIFIED_INCOME,          // 1: Comprobantes de ingreso revisados
        VERIFIED_EMPLOYMENT,      // 2: Carta laboral verificada
        VERIFIED_STUDENT,         // 3: Credencial universitaria verificada
        VERIFIED_PROFESSIONAL,    // 4: LinkedIn/empresa verificados
        CLEAN_CREDIT,             // 5: Buró de crédito verificado

        // BADGES AUTOMÁTICOS - SE GANAN POR MÉTRICAS
        EARLY_ADOPTER,            // 6: Primeros 1000 usuarios
        RELIABLE_TENANT,          // 7: 12 pagos consecutivos a tiempo
        LONG_TERM_TENANT,         // 8: 12+ meses en una propiedad
        ZERO_DISPUTES,            // 9: Nunca ha tenido disputas
        NO_DAMAGE_HISTORY,        // 10: Sin daños en propiedades
        FAST_RESPONDER,           // 11: Responde en <24h consistentemente
        HIGH_VALUE,               // 12: >$50k MXN pagados lifetime
        MULTI_PROPERTY            // 13: 3+ propiedades rentadas exitosamente
    }

    enum VerificationStatus {
        NONE,
        PENDING,
        APPROVED,
        REJECTED,
        EXPIRED
    }

    struct VerificationRequest {
        BadgeType badgeType;
        VerificationStatus status;
        string documentsURI;
        uint256 requestedAt;
        uint256 reviewedAt;
        address reviewedBy;
        string rejectionReason;
    }

    struct TenantInfo {
        uint32 reputation;
        uint32 paymentsMade;
        uint32 paymentsMissed;
        uint32 propertiesRented;
        uint32 propertiesOwned;
        uint32 consecutiveOnTimePayments;
        uint32 totalMonthsRented;
        uint32 referralCount;
        uint32 disputesCount;
        uint256 outstandingBalance;
        uint256 totalRentPaid;
        uint256 lastActivityTime;
        uint256 lastPaymentTime;
        bool isVerified;
    }

    // 
    // STORAGE
    // 

    /// @notice Tracking manual de todos los tokenIds (reemplaza Enumerable)
    uint256[] private _allTokens;
    mapping(uint256 => uint256) private _allTokensIndex;

    /// @notice Total de passports mint eados (inmutable, nunca baja aunque haya burns)
    uint256 private _totalMinted;

    /// @notice Información de cada tenant por tokenId
    mapping(uint256 => TenantInfo) public tenantInfo;

    /// @notice Badges ganados por cada tenant
    mapping(uint256 => mapping(BadgeType => bool)) public badges;

    /// @notice Contratos autorizados para actualizar información
    mapping(address => bool) public authorizedUpdaters;

    /// @notice Timestamp de verificación de cada badge
    mapping(uint256 => mapping(BadgeType => uint256)) public badgeVerifiedAt;

    /// @notice Contador de respuestas rápidas
    mapping(uint256 => uint32) public fastResponseCount;

    /// @notice Contador de propiedades sin daños
    mapping(uint256 => uint32) public propertyNoIssuesCount;

    /// @notice Solicitudes de verificación KYC
    mapping(uint256 => mapping(BadgeType => VerificationRequest)) public verificationRequests;

    /// @notice Lista de solicitudes pendientes
    uint256[] public pendingVerifications;
    mapping(uint256 => bool) public hasPendingVerification;

    // 
    // CONSTANTES
    // 

    uint32 private constant MAX_REPUTATION = 100;
    uint32 private constant INITIAL_REPUTATION = 70;
    uint32 private constant MIN_REPUTATION = 0;

    uint32 private constant REPUTATION_ON_TIME_PAYMENT = 1;
    uint32 private constant REPUTATION_MISSED_PAYMENT = 3;
    uint32 private constant REPUTATION_DECAY_AMOUNT = 5;

    uint256 private constant REPUTATION_DECAY_THRESHOLD = 180 days;
    uint256 private constant FAST_RESPONSE_THRESHOLD = 24 hours;

    uint256 private constant EARLY_ADOPTER_LIMIT = 1000;
    uint32 private constant RELIABLE_TENANT_THRESHOLD = 12;
    uint32 private constant LONG_TERM_TENANT_THRESHOLD = 12;
    uint256 private constant HIGH_VALUE_THRESHOLD = 50_000 ether;
    uint32 private constant MULTI_PROPERTY_THRESHOLD = 3;
    uint32 private constant FAST_RESPONDER_THRESHOLD = 10;
    uint32 private constant NO_DAMAGE_THRESHOLD = 3;

    uint256 private constant VERIFICATION_EXPIRY = 365 days;
    uint8 private constant FIRST_KYC_BADGE = 0;
    uint8 private constant LAST_KYC_BADGE = 5;

    // 
    // EVENTOS
    // 

    event PassportMinted(address indexed user, uint256 indexed tokenId, uint256 timestamp);
    event ReputationUpdated(uint256 indexed tokenId, uint32 oldReputation, uint32 newReputation, string reason);
    event BadgeAwarded(uint256 indexed tokenId, BadgeType indexed badgeType, address indexed awardedBy, uint256 timestamp);
    event BadgeRevoked(uint256 indexed tokenId, BadgeType indexed badgeType, address indexed revokedBy, uint256 timestamp);
    event VerificationStatusChanged(uint256 indexed tokenId, bool isVerified, address indexed changedBy);
    event ActivityRecorded(uint256 indexed tokenId, string activityType, uint256 timestamp);
    event ReferralRecorded(uint256 indexed referrerTokenId, uint256 indexed referredTokenId, address referrer, address referred);
    event VerificationRequested(uint256 indexed tokenId, BadgeType indexed badgeType, string documentsURI, uint256 timestamp);
    event VerificationApproved(uint256 indexed tokenId, BadgeType indexed badgeType, address indexed approvedBy, uint256 timestamp);
    event VerificationRejected(uint256 indexed tokenId, BadgeType indexed badgeType, address indexed rejectedBy, string reason, uint256 timestamp);
    event VerificationExpired(uint256 indexed tokenId, BadgeType indexed badgeType, uint256 timestamp);

    // 
    // MODIFIERS
    // 

    modifier onlyAuthorizedUpdater() {
        require(authorizedUpdaters[msg.sender], "TenantPassport: No autorizado");
        _;
    }

    modifier tokenExists(uint256 tokenId) {
        require(_ownerOf(tokenId) != address(0), "TenantPassport: Token no existente");
        _;
    }

    // 
    // CONSTRUCTOR
    // 

    constructor(address initialOwner)
        ERC721("RoomFi Tenant Passport", "ROOMFI-PASS")
        Ownable(initialOwner)
    {}

    // 
    // FUNCIONES PRINCIPALES
    // 

    /**
     * @notice Permite a cualquier usuario acuñar su propio y único pasaporte
     * @dev Token ID derivado de la dirección del usuario para garantizar unicidad
     */
    function mintForSelf() external returns (uint256 tokenId) {
        tokenId = uint256(uint160(msg.sender));

        require(_ownerOf(tokenId) == address(0), "TenantPassport: Pasaporte ya existente");

        _mint(msg.sender, tokenId);

        // Agregar a tracking manual
        _addTokenToAllTokensEnumeration(tokenId);

        // Incrementar contador inmutable de total minted
        _totalMinted++;

        // Inicializar información del tenant
        tenantInfo[tokenId] = TenantInfo({
            reputation: INITIAL_REPUTATION,
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
            lastPaymentTime: 0,
            isVerified: false
        });

        // Badge de Early Adopter (usa _totalMinted que nunca baja)
        if (_totalMinted <= EARLY_ADOPTER_LIMIT) {
            _awardBadgeInternal(tokenId, BadgeType.EARLY_ADOPTER);
        }

        emit PassportMinted(msg.sender, tokenId, block.timestamp);

        return tokenId;
    }

    /**
     * @notice Actualiza la información del tenant después de un pago
     */
    function updateTenantInfo(
        uint256 tokenId,
        bool paymentOnTime,
        uint256 rentAmountPaid
    ) external onlyAuthorizedUpdater tokenExists(tokenId) {
        TenantInfo storage info = tenantInfo[tokenId];
        uint32 oldReputation = info.reputation;

        _applyReputationDecay(tokenId);

        if (paymentOnTime) {
            info.paymentsMade++;
            info.consecutiveOnTimePayments++;

            if (info.reputation < MAX_REPUTATION) {
                uint32 newRep = info.reputation + REPUTATION_ON_TIME_PAYMENT;
                info.reputation = newRep > MAX_REPUTATION ? MAX_REPUTATION : newRep;
            }

            emit ReputationUpdated(tokenId, oldReputation, info.reputation, "Pago a tiempo");
        } else {
            info.paymentsMissed++;
            info.consecutiveOnTimePayments = 0;

            if (info.reputation > REPUTATION_MISSED_PAYMENT) {
                info.reputation -= REPUTATION_MISSED_PAYMENT;
            } else {
                info.reputation = MIN_REPUTATION;
            }

            emit ReputationUpdated(tokenId, oldReputation, info.reputation, "Pago atrasado");
        }

        info.totalRentPaid += rentAmountPaid;
        info.lastPaymentTime = block.timestamp;
        info.lastActivityTime = block.timestamp;

        _checkAndAwardAutomaticBadges(tokenId);

        emit ActivityRecorded(tokenId, "pago", block.timestamp);
    }

    function incrementPropertiesRented(uint256 tokenId)
        external
        onlyAuthorizedUpdater
        tokenExists(tokenId)
    {
        tenantInfo[tokenId].propertiesRented++;
        tenantInfo[tokenId].lastActivityTime = block.timestamp;
        _checkAndAwardAutomaticBadges(tokenId);
        emit ActivityRecorded(tokenId, "property_rented", block.timestamp);
    }

    function incrementPropertiesOwned(uint256 tokenId)
        external
        onlyAuthorizedUpdater
        tokenExists(tokenId)
    {
        tenantInfo[tokenId].propertiesOwned++;
        tenantInfo[tokenId].lastActivityTime = block.timestamp;
        emit ActivityRecorded(tokenId, "property_owned", block.timestamp);
    }

    function incrementMonthsRented(uint256 tokenId)
        external
        onlyAuthorizedUpdater
        tokenExists(tokenId)
    {
        tenantInfo[tokenId].totalMonthsRented++;
        tenantInfo[tokenId].lastActivityTime = block.timestamp;
        _checkAndAwardAutomaticBadges(tokenId);
        emit ActivityRecorded(tokenId, "month_completed", block.timestamp);
    }

    function recordFastResponse(uint256 tokenId)
        external
        onlyAuthorizedUpdater
        tokenExists(tokenId)
    {
        fastResponseCount[tokenId]++;
        tenantInfo[tokenId].lastActivityTime = block.timestamp;

        if (fastResponseCount[tokenId] >= FAST_RESPONDER_THRESHOLD &&
            !badges[tokenId][BadgeType.FAST_RESPONDER]) {
            _awardBadgeInternal(tokenId, BadgeType.FAST_RESPONDER);
        }

        emit ActivityRecorded(tokenId, "fast_response", block.timestamp);
    }

    function recordPropertyNoIssues(uint256 tokenId)
        external
        onlyAuthorizedUpdater
        tokenExists(tokenId)
    {
        propertyNoIssuesCount[tokenId]++;
        tenantInfo[tokenId].lastActivityTime = block.timestamp;

        if (propertyNoIssuesCount[tokenId] >= NO_DAMAGE_THRESHOLD &&
            !badges[tokenId][BadgeType.NO_DAMAGE_HISTORY]) {
            _awardBadgeInternal(tokenId, BadgeType.NO_DAMAGE_HISTORY);
        }

        emit ActivityRecorded(tokenId, "property_no_issues", block.timestamp);
    }

    function recordReferral(uint256 referrerTokenId, address referredAddress)
        external
        onlyAuthorizedUpdater
        tokenExists(referrerTokenId)
    {
        tenantInfo[referrerTokenId].referralCount++;
        tenantInfo[referrerTokenId].lastActivityTime = block.timestamp;

        uint256 referredTokenId = uint256(uint160(referredAddress));

        emit ReferralRecorded(referrerTokenId, referredTokenId,
                             _ownerOf(referrerTokenId), referredAddress);
    }

    function incrementDisputes(uint256 tokenId)
        external
        onlyAuthorizedUpdater
        tokenExists(tokenId)
    {
        tenantInfo[tokenId].disputesCount++;
        tenantInfo[tokenId].lastActivityTime = block.timestamp;

        // Penalizar reputación por dispute
        if (tenantInfo[tokenId].reputation > 10) {
            tenantInfo[tokenId].reputation -= 10;
        } else {
            tenantInfo[tokenId].reputation = MIN_REPUTATION;
        }

        // Revocar badge ZERO_DISPUTES si lo tenía
        if (badges[tokenId][BadgeType.ZERO_DISPUTES]) {
            badges[tokenId][BadgeType.ZERO_DISPUTES] = false;
            emit BadgeRevoked(tokenId, BadgeType.ZERO_DISPUTES, msg.sender, block.timestamp);
        }

        emit ActivityRecorded(tokenId, "dispute", block.timestamp);
    }

    // 
    // SISTEMA DE VERIFICACIÓN KYC
    // 

    function requestVerification(BadgeType badgeType, string calldata documentsURI)
        external
        tokenExists(uint256(uint160(msg.sender)))
    {
        uint256 tokenId = uint256(uint160(msg.sender));

        require(uint8(badgeType) <= LAST_KYC_BADGE, "Solo badges KYC requieren verificacion");
        require(!badges[tokenId][badgeType], "Ya tienes este badge");

        VerificationRequest storage request = verificationRequests[tokenId][badgeType];
        require(
            request.status != VerificationStatus.PENDING,
            "Ya tienes una solicitud pendiente"
        );

        verificationRequests[tokenId][badgeType] = VerificationRequest({
            badgeType: badgeType,
            status: VerificationStatus.PENDING,
            documentsURI: documentsURI,
            requestedAt: block.timestamp,
            reviewedAt: 0,
            reviewedBy: address(0),
            rejectionReason: ""
        });

        if (!hasPendingVerification[tokenId]) {
            pendingVerifications.push(tokenId);
            hasPendingVerification[tokenId] = true;
        }

        emit VerificationRequested(tokenId, badgeType, documentsURI, block.timestamp);
    }

    function approveVerification(uint256 tokenId, BadgeType badgeType)
        external
        onlyAuthorizedUpdater
        tokenExists(tokenId)
    {
        VerificationRequest storage request = verificationRequests[tokenId][badgeType];

        require(
            request.status == VerificationStatus.PENDING,
            "No hay solicitud pendiente"
        );

        request.status = VerificationStatus.APPROVED;
        request.reviewedAt = block.timestamp;
        request.reviewedBy = msg.sender;

        badges[tokenId][badgeType] = true;
        badgeVerifiedAt[tokenId][badgeType] = block.timestamp;

        tenantInfo[tokenId].lastActivityTime = block.timestamp;

        _checkAndRemoveFromPending(tokenId);

        emit VerificationApproved(tokenId, badgeType, msg.sender, block.timestamp);
        emit BadgeAwarded(tokenId, badgeType, msg.sender, block.timestamp);
    }

    function rejectVerification(
        uint256 tokenId,
        BadgeType badgeType,
        string calldata reason
    )
        external
        onlyAuthorizedUpdater
        tokenExists(tokenId)
    {
        VerificationRequest storage request = verificationRequests[tokenId][badgeType];

        require(
            request.status == VerificationStatus.PENDING,
            "No hay solicitud pendiente"
        );

        request.status = VerificationStatus.REJECTED;
        request.reviewedAt = block.timestamp;
        request.reviewedBy = msg.sender;
        request.rejectionReason = reason;

        _checkAndRemoveFromPending(tokenId);

        emit VerificationRejected(tokenId, badgeType, msg.sender, reason, block.timestamp);
    }

    function markVerificationExpired(uint256 tokenId, BadgeType badgeType)
        external
        tokenExists(tokenId)
    {
        require(uint8(badgeType) <= LAST_KYC_BADGE, "Solo badges KYC expiran");
        require(badges[tokenId][badgeType], "No tiene este badge");

        uint256 verifiedAt = badgeVerifiedAt[tokenId][badgeType];
        require(
            block.timestamp > verifiedAt + VERIFICATION_EXPIRY,
            "Verificacion aun valida"
        );

        badges[tokenId][badgeType] = false;

        VerificationRequest storage request = verificationRequests[tokenId][badgeType];
        request.status = VerificationStatus.EXPIRED;

        emit VerificationExpired(tokenId, badgeType, block.timestamp);
        emit BadgeRevoked(tokenId, badgeType, address(this), block.timestamp);
    }

    /**
     * @notice Autoverificación para DEMO (Hackathon Only)
     * @dev Permite al tenant verificar su identidad sin proceso manual
     */
    function verifyTenantDemo(BadgeType badgeType)
        external
        tokenExists(uint256(uint160(msg.sender)))
    {
        uint256 tokenId = uint256(uint160(msg.sender));
        require(uint8(badgeType) <= LAST_KYC_BADGE, "Solo badges KYC");
        
        // Otorgar badge directamente
        badges[tokenId][badgeType] = true;
        badgeVerifiedAt[tokenId][badgeType] = block.timestamp;
        
        // Actualizar request si existía
        VerificationRequest storage request = verificationRequests[tokenId][badgeType];
        if (request.status == VerificationStatus.PENDING) {
            request.status = VerificationStatus.APPROVED;
            request.reviewedAt = block.timestamp;
            request.reviewedBy = msg.sender;
            _checkAndRemoveFromPending(tokenId);
        }

        tenantInfo[tokenId].isVerified = true;
        tenantInfo[tokenId].lastActivityTime = block.timestamp;

        emit VerificationApproved(tokenId, badgeType, msg.sender, block.timestamp);
        emit BadgeAwarded(tokenId, badgeType, msg.sender, block.timestamp);
    }

    function _checkAndRemoveFromPending(uint256 tokenId) internal {
        bool hasAnyPending = false;

        for (uint8 i = FIRST_KYC_BADGE; i <= LAST_KYC_BADGE; i++) {
            if (verificationRequests[tokenId][BadgeType(i)].status == VerificationStatus.PENDING) {
                hasAnyPending = true;
                break;
            }
        }

        if (!hasAnyPending && hasPendingVerification[tokenId]) {
            hasPendingVerification[tokenId] = false;

            for (uint i = 0; i < pendingVerifications.length; i++) {
                if (pendingVerifications[i] == tokenId) {
                    pendingVerifications[i] = pendingVerifications[pendingVerifications.length - 1];
                    pendingVerifications.pop();
                    break;
                }
            }
        }
    }

    // 
    // FUNCIONES DE BADGES
    // 

    function awardBadge(uint256 tokenId, BadgeType badgeType)
        external
        onlyAuthorizedUpdater
        tokenExists(tokenId)
    {
        require(!badges[tokenId][badgeType], "TenantPassport: Badge already awarded");

        badges[tokenId][badgeType] = true;
        badgeVerifiedAt[tokenId][badgeType] = block.timestamp;
        tenantInfo[tokenId].lastActivityTime = block.timestamp;

        emit BadgeAwarded(tokenId, badgeType, msg.sender, block.timestamp);
    }

    function revokeBadge(uint256 tokenId, BadgeType badgeType)
        external
        onlyOwner
        tokenExists(tokenId)
    {
        require(badges[tokenId][badgeType], "TenantPassport: Badge not awarded");

        badges[tokenId][badgeType] = false;
        badgeVerifiedAt[tokenId][badgeType] = 0;

        emit BadgeRevoked(tokenId, badgeType, msg.sender, block.timestamp);
    }

    function setVerificationStatus(uint256 tokenId, bool verified)
        external
        onlyOwner
        tokenExists(tokenId)
    {
        tenantInfo[tokenId].isVerified = verified;
        emit VerificationStatusChanged(tokenId, verified, msg.sender);
    }

    // 
    // FUNCIONES INTERNAS
    // 

    function _checkAndAwardAutomaticBadges(uint256 tokenId) internal {
        TenantInfo storage info = tenantInfo[tokenId];

        if (info.consecutiveOnTimePayments >= RELIABLE_TENANT_THRESHOLD &&
            !badges[tokenId][BadgeType.RELIABLE_TENANT]) {
            _awardBadgeInternal(tokenId, BadgeType.RELIABLE_TENANT);
        }

        if (info.totalMonthsRented >= LONG_TERM_TENANT_THRESHOLD &&
            !badges[tokenId][BadgeType.LONG_TERM_TENANT]) {
            _awardBadgeInternal(tokenId, BadgeType.LONG_TERM_TENANT);
        }

        if (info.totalRentPaid >= HIGH_VALUE_THRESHOLD &&
            !badges[tokenId][BadgeType.HIGH_VALUE]) {
            _awardBadgeInternal(tokenId, BadgeType.HIGH_VALUE);
        }

        if (info.propertiesRented >= MULTI_PROPERTY_THRESHOLD &&
            !badges[tokenId][BadgeType.MULTI_PROPERTY]) {
            _awardBadgeInternal(tokenId, BadgeType.MULTI_PROPERTY);
        }

        if (info.disputesCount == 0 &&
            info.propertiesRented > 0 &&
            !badges[tokenId][BadgeType.ZERO_DISPUTES]) {
            _awardBadgeInternal(tokenId, BadgeType.ZERO_DISPUTES);
        }
    }

    function _awardBadgeInternal(uint256 tokenId, BadgeType badgeType) internal {
        if (!badges[tokenId][badgeType]) {
            badges[tokenId][badgeType] = true;
            badgeVerifiedAt[tokenId][badgeType] = block.timestamp;
            emit BadgeAwarded(tokenId, badgeType, address(this), block.timestamp);
        }
    }

    function _applyReputationDecay(uint256 tokenId) internal {
        TenantInfo storage info = tenantInfo[tokenId];

        if (block.timestamp > info.lastActivityTime + REPUTATION_DECAY_THRESHOLD) {
            uint32 oldReputation = info.reputation;

            if (info.reputation > REPUTATION_DECAY_AMOUNT) {
                info.reputation -= REPUTATION_DECAY_AMOUNT;
            } else {
                info.reputation = MIN_REPUTATION;
            }

            if (oldReputation != info.reputation) {
                emit ReputationUpdated(tokenId, oldReputation, info.reputation, "Inactivity decay");
            }
        }
    }

    /**
     * @notice SOUL-BOUND: Bloquea todas las transferencias
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);

        if (from != address(0) && to != address(0)) {
            revert("TenantPassport: Soul-Bound Token - No transferible");
        }

        // Si es burn, remover del tracking
        if (to == address(0)) {
            _removeTokenFromAllTokensEnumeration(tokenId);
        }

        return super._update(to, tokenId, auth);
    }

    // 
    // TRACKING MANUAL (Reemplaza ERC721Enumerable)
    // 

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
     * @notice Total supply (reemplaza ERC721Enumerable.totalSupply)
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

    // 
    // VIEW FUNCTIONS
    // 

    function getTenantInfo(uint256 tokenId)
        external
        view
        tokenExists(tokenId)
        returns (TenantInfo memory)
    {
        return tenantInfo[tokenId];
    }

    function getReputationWithDecay(uint256 tokenId)
        public
        view
        tokenExists(tokenId)
        returns (uint32)
    {
        TenantInfo memory info = tenantInfo[tokenId];

        if (block.timestamp > info.lastActivityTime + REPUTATION_DECAY_THRESHOLD) {
            if (info.reputation > REPUTATION_DECAY_AMOUNT) {
                return info.reputation - REPUTATION_DECAY_AMOUNT;
            } else {
                return MIN_REPUTATION;
            }
        }

        return info.reputation;
    }

    function hasBadge(uint256 tokenId, BadgeType badgeType)
        external
        view
        tokenExists(tokenId)
        returns (bool)
    {
        return badges[tokenId][badgeType];
    }

    function getAllBadges(uint256 tokenId)
        external
        view
        tokenExists(tokenId)
        returns (bool[14] memory badgeList)
    {
        for (uint i = 0; i < 14; i++) {
            badgeList[i] = badges[tokenId][BadgeType(i)];
        }
        return badgeList;
    }

    function getBadgeCount(uint256 tokenId)
        external
        view
        tokenExists(tokenId)
        returns (uint256 count)
    {
        count = 0;
        for (uint i = 0; i < 14; i++) {
            if (badges[tokenId][BadgeType(i)]) {
                count++;
            }
        }
        return count;
    }

    function getTokenIdByAddress(address user)
        external
        pure
        returns (uint256)
    {
        return uint256(uint160(user));
    }

    function hasPassport(address user)
        external
        view
        returns (bool)
    {
        uint256 tokenId = uint256(uint160(user));
        return _ownerOf(tokenId) != address(0);
    }

    function getTenantMetrics(uint256 tokenId)
        external
        view
        tokenExists(tokenId)
        returns (
            uint32 score,
            uint32 totalPayments,
            uint32 paymentSuccessRate,
            uint256 badgeCount,
            bool isActive
        )
    {
        TenantInfo memory info = tenantInfo[tokenId];

        score = getReputationWithDecay(tokenId);
        totalPayments = info.paymentsMade + info.paymentsMissed;

        if (totalPayments > 0) {
            paymentSuccessRate = uint32((uint256(info.paymentsMade) * 10000) / totalPayments);
        } else {
            paymentSuccessRate = 0;
        }

        badgeCount = 0;
        for (uint i = 0; i < 14; i++) {
            if (badges[tokenId][BadgeType(i)]) {
                badgeCount++;
            }
        }

        isActive = block.timestamp <= info.lastActivityTime + REPUTATION_DECAY_THRESHOLD;

        return (score, totalPayments, paymentSuccessRate, badgeCount, isActive);
    }

    function getVerificationRequest(uint256 tokenId, BadgeType badgeType)
        external
        view
        tokenExists(tokenId)
        returns (VerificationRequest memory)
    {
        return verificationRequests[tokenId][badgeType];
    }

    function getAllVerificationRequests(uint256 tokenId)
        external
        view
        tokenExists(tokenId)
        returns (VerificationRequest[6] memory requests)
    {
        for (uint8 i = FIRST_KYC_BADGE; i <= LAST_KYC_BADGE; i++) {
            requests[i] = verificationRequests[tokenId][BadgeType(i)];
        }
        return requests;
    }

    function getPendingVerifications() external view returns (uint256[] memory) {
        return pendingVerifications;
    }

    function getPendingVerificationCount(uint256 tokenId)
        external
        view
        tokenExists(tokenId)
        returns (uint8 count)
    {
        count = 0;
        for (uint8 i = FIRST_KYC_BADGE; i <= LAST_KYC_BADGE; i++) {
            if (verificationRequests[tokenId][BadgeType(i)].status == VerificationStatus.PENDING) {
                count++;
            }
        }
        return count;
    }

    function isVerificationExpired(uint256 tokenId, BadgeType badgeType)
        external
        view
        tokenExists(tokenId)
        returns (bool)
    {
        if (uint8(badgeType) > LAST_KYC_BADGE) return false;
        if (!badges[tokenId][badgeType]) return false;

        uint256 verifiedAt = badgeVerifiedAt[tokenId][badgeType];
        return block.timestamp > verifiedAt + VERIFICATION_EXPIRY;
    }

    // 
    // FUNCIONES DE ADMINISTRACIÓN
    // 

    function authorizeUpdater(address updater) external onlyOwner {
        require(updater != address(0), "TenantPassport: Invalid address");
        authorizedUpdaters[updater] = true;
    }

    function revokeUpdater(address updater) external onlyOwner {
        authorizedUpdaters[updater] = false;
    }

    function isAuthorizedUpdater(address updater) external view returns (bool) {
        return authorizedUpdaters[updater];
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
