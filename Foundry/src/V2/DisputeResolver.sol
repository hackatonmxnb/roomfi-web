// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DisputeResolver
 * @author RoomFi Team - Firrton
 * @notice Sistema de arbitraje descentralizado para resolver disputas entre tenants y landlords
 * @dev Implementa votación simple con árbitros autorizados
 *
 * ARQUITECTURA:
 * - Disputas pueden ser iniciadas por tenant o landlord
 * - Panel de 3 árbitros vota (mayoría simple)
 * - Penalizaciones automáticas según resultado
 * - Actualización de reputación en TenantPassport/PropertyRegistry
 *
 * FLUJO:
 * 1. Parte inicia disputa con evidencia (IPFS)
 * 2. Contraparte responde (7 días)
 * 3. Árbitros votan (14 días)
 * 4. Mayoría decide resultado
 * 5. Penalizaciones aplicadas automáticamente
 * 6. Reputaciones actualizadas
 */

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./Interfaces.sol";

contract DisputeResolver is Ownable, ReentrancyGuard {

    // Enums

    enum DisputeStatus {
        PENDING_RESPONSE,       // Esperando respuesta de la contraparte
        PENDING_ARBITRATION,    // Esperando votación de árbitros
        IN_ARBITRATION,         // Árbitros votando
        RESOLVED_TENANT,        // Resuelto a favor del tenant
        RESOLVED_LANDLORD,      // Resuelto a favor del landlord
        RESOLVED_SPLIT,         // Acuerdo parcial (50/50)
        CANCELLED,              // Cancelado por ambas partes
        EXPIRED                 // Expiró sin resolución
    }

    enum DisputeReason {
        PROPERTY_CONDITION,     // Problemas con condición de la propiedad
        PAYMENT_ISSUE,          // Disputas de pagos
        EARLY_TERMINATION,      // Terminación anticipada
        SECURITY_DEPOSIT,       // Disputa del depósito
        MAINTENANCE,            // Problemas de mantenimiento
        NOISE_COMPLAINTS,       // Quejas de ruido
        UTILITIES,              // Problemas con servicios
        OTHER                   // Otro motivo
    }

    // Structs

    struct Dispute {
        uint256 disputeId;
        address rentalAgreement;
        address initiator;
        address respondent;
        bool initiatorIsTenant;

        DisputeReason reason;
        DisputeStatus status;

        string evidenceURI;         // IPFS con evidencia del initiator
        string responseURI;         // IPFS con respuesta del respondent

        uint256 amountInDispute;    // Wei en disputa
        uint256 createdAt;
        uint256 responseDeadline;
        uint256 votingDeadline;

        address[] arbitrators;      // 3 árbitros asignados
        mapping(address => bool) hasVoted;
        mapping(address => bool) voteForInitiator; // true = a favor del initiator

        uint256 votesForInitiator;
        uint256 votesForRespondent;

        uint256 resolvedAt;
        address resolvedBy;
        string resolutionNotes;
    }

    // Storage

    /// @notice Counter de disputas
    uint256 public totalDisputes;

    /// @notice Disputas por ID
    mapping(uint256 => Dispute) public disputes;

    /// @notice Disputas por RentalAgreement
    mapping(address => uint256[]) public agreementDisputes;

    /// @notice Árbitros autorizados
    mapping(address => bool) public authorizedArbitrators;
    address[] public arbitratorsList;

    /// @notice Referencias a contratos
    ITenantPassport public immutable tenantPassport;
    IPropertyRegistry public immutable propertyRegistry;

    /// @notice Configuración
    uint256 public responseWindow = 7 days;
    uint256 public votingWindow = 14 days;
    uint256 public arbitrationFee = 0.01 ether; // Fee por iniciar disputa
    uint256 public minArbitrators = 3;

    /// @notice Pool de fees acumulados
    uint256 public feesCollected;

    // Eventos

    event DisputeCreated(
        uint256 indexed disputeId,
        address indexed rentalAgreement,
        address indexed initiator,
        DisputeReason reason,
        uint256 amountInDispute,
        uint256 timestamp
    );

    event DisputeResponseSubmitted(
        uint256 indexed disputeId,
        address indexed respondent,
        string responseURI,
        uint256 timestamp
    );

    event ArbitratorsAssigned(
        uint256 indexed disputeId,
        address[] arbitrators,
        uint256 timestamp
    );

    event VoteCast(
        uint256 indexed disputeId,
        address indexed arbitrator,
        bool forInitiator,
        uint256 timestamp
    );

    event DisputeResolved(
        uint256 indexed disputeId,
        DisputeStatus resolution,
        uint256 initiatorAmount,
        uint256 respondentAmount,
        uint256 timestamp
    );

    event DisputeCancelled(
        uint256 indexed disputeId,
        address indexed cancelledBy,
        uint256 timestamp
    );

    event ArbitratorAuthorized(address indexed arbitrator, uint256 timestamp);
    event ArbitratorRevoked(address indexed arbitrator, uint256 timestamp);

    // Modifiers

    modifier onlyAuthorizedArbitrator() {
        require(authorizedArbitrators[msg.sender], "DisputeResolver: Not authorized arbitrator");
        _;
    }

    modifier disputeExists(uint256 disputeId) {
        require(disputeId > 0 && disputeId <= totalDisputes, "DisputeResolver: Dispute does not exist");
        _;
    }

    modifier onlyDisputeParty(uint256 disputeId) {
        Dispute storage dispute = disputes[disputeId];
        require(
            msg.sender == dispute.initiator || msg.sender == dispute.respondent,
            "DisputeResolver: Not a party"
        );
        _;
    }

    // Constructor

    constructor(
        address _tenantPassport,
        address _propertyRegistry,
        address initialOwner
    ) Ownable(initialOwner) {
        require(_tenantPassport != address(0), "Invalid TenantPassport");
        require(_propertyRegistry != address(0), "Invalid PropertyRegistry");

        tenantPassport = ITenantPassport(_tenantPassport);
        propertyRegistry = IPropertyRegistry(_propertyRegistry);
    }

    // Funciones principales

    /**
     * @notice Crea una nueva disputa
     * @param rentalAgreement Address del RentalAgreement en disputa
     * @param reason Razón de la disputa
     * @param evidenceURI IPFS con evidencia (fotos, docs, etc)
     * @param amountInDispute Wei en disputa (ej: depósito, rent)
     */
    function createDispute(
        address rentalAgreement,
        address respondent,
        DisputeReason reason,
        string calldata evidenceURI,
        uint256 amountInDispute,
        bool initiatorIsTenant
    ) external payable nonReentrant returns (uint256 disputeId) {
        require(msg.value >= arbitrationFee, "Insufficient arbitration fee");
        require(rentalAgreement != address(0), "Invalid rental agreement");
        require(respondent != address(0), "Invalid respondent");
        require(respondent != msg.sender, "Cannot dispute yourself");
        require(bytes(evidenceURI).length > 0, "Evidence required");

        // Incrementar contador
        totalDisputes++;
        disputeId = totalDisputes;

        // Crear disputa
        Dispute storage dispute = disputes[disputeId];
        dispute.disputeId = disputeId;
        dispute.rentalAgreement = rentalAgreement;
        dispute.initiator = msg.sender;
        dispute.respondent = respondent;
        dispute.initiatorIsTenant = initiatorIsTenant;
        dispute.reason = reason;
        dispute.status = DisputeStatus.PENDING_RESPONSE;
        dispute.evidenceURI = evidenceURI;
        dispute.amountInDispute = amountInDispute;
        dispute.createdAt = block.timestamp;
        dispute.responseDeadline = block.timestamp + responseWindow;
        dispute.votingDeadline = 0; // Se establece después de respuesta

        // Agregar a tracking
        agreementDisputes[rentalAgreement].push(disputeId);

        // Agregar fee al pool
        feesCollected += msg.value;

        emit DisputeCreated(
            disputeId,
            rentalAgreement,
            msg.sender,
            reason,
            amountInDispute,
            block.timestamp
        );

        return disputeId;
    }

    /**
     * @notice Respondent envía su versión de los hechos
     */
    function submitResponse(
        uint256 disputeId,
        string calldata responseURI
    ) external disputeExists(disputeId) {
        Dispute storage dispute = disputes[disputeId];

        require(msg.sender == dispute.respondent, "Not respondent");
        require(dispute.status == DisputeStatus.PENDING_RESPONSE, "Invalid status");
        require(block.timestamp <= dispute.responseDeadline, "Response deadline passed");
        require(bytes(responseURI).length > 0, "Response required");

        dispute.responseURI = responseURI;
        dispute.status = DisputeStatus.PENDING_ARBITRATION;

        emit DisputeResponseSubmitted(disputeId, msg.sender, responseURI, block.timestamp);

        // Asignar árbitros automáticamente
        _assignArbitrators(disputeId);
    }

    /**
     * @notice Asigna 3 árbitros aleatorios a la disputa
     * @dev En producción, usar VRF para selección aleatoria real
     */
    function _assignArbitrators(uint256 disputeId) internal {
        Dispute storage dispute = disputes[disputeId];

        require(arbitratorsList.length >= minArbitrators, "Not enough arbitrators");

        // Seleccionar 3 árbitros pseudo-aleatorios
        // TODO: Usar Chainlink VRF en producción
        uint256 seed = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            disputeId
        )));

        address[] memory selected = new address[](minArbitrators);
        uint256 selectedCount = 0;

        for (uint256 i = 0; i < arbitratorsList.length && selectedCount < minArbitrators; i++) {
            uint256 index = (seed + i) % arbitratorsList.length;
            address arbitrator = arbitratorsList[index];

            // Verificar que no esté ya seleccionado
            bool alreadySelected = false;
            for (uint256 j = 0; j < selectedCount; j++) {
                if (selected[j] == arbitrator) {
                    alreadySelected = true;
                    break;
                }
            }

            if (!alreadySelected) {
                selected[selectedCount] = arbitrator;
                dispute.arbitrators.push(arbitrator);
                selectedCount++;
            }
        }

        dispute.status = DisputeStatus.IN_ARBITRATION;
        dispute.votingDeadline = block.timestamp + votingWindow;

        emit ArbitratorsAssigned(disputeId, selected, block.timestamp);
    }

    /**
     * @notice Árbitro vota en una disputa
     * @param disputeId ID de la disputa
     * @param forInitiator true = a favor del initiator, false = a favor del respondent
     * @param notes Notas del árbitro (opcional)
     */
    function vote(
        uint256 disputeId,
        bool forInitiator,
        string calldata notes
    ) external onlyAuthorizedArbitrator disputeExists(disputeId) {
        Dispute storage dispute = disputes[disputeId];

        require(dispute.status == DisputeStatus.IN_ARBITRATION, "Not in arbitration");
        require(block.timestamp <= dispute.votingDeadline, "Voting deadline passed");
        require(_isAssignedArbitrator(disputeId, msg.sender), "Not assigned to this dispute");
        require(!dispute.hasVoted[msg.sender], "Already voted");

        // Registrar voto
        dispute.hasVoted[msg.sender] = true;
        dispute.voteForInitiator[msg.sender] = forInitiator;

        if (forInitiator) {
            dispute.votesForInitiator++;
        } else {
            dispute.votesForRespondent++;
        }

        emit VoteCast(disputeId, msg.sender, forInitiator, block.timestamp);

        // Si mayoría alcanzada, resolver automáticamente
        if (dispute.votesForInitiator > minArbitrators / 2) {
            _resolveDispute(disputeId, true, notes);
        } else if (dispute.votesForRespondent > minArbitrators / 2) {
            _resolveDispute(disputeId, false, notes);
        }
    }

    /**
     * @notice Resuelve la disputa y ejecuta penalizaciones
     */
    function _resolveDispute(
        uint256 disputeId,
        bool favorInitiator,
        string memory notes
    ) internal {
        Dispute storage dispute = disputes[disputeId];

        // Determinar resultado
        DisputeStatus resolution;
        uint256 initiatorAmount;
        uint256 respondentAmount;

        if (favorInitiator) {
            resolution = DisputeStatus.RESOLVED_TENANT;
            initiatorAmount = dispute.amountInDispute;
            respondentAmount = 0;
        } else {
            resolution = DisputeStatus.RESOLVED_LANDLORD;
            initiatorAmount = 0;
            respondentAmount = dispute.amountInDispute;
        }

        dispute.status = resolution;
        dispute.resolvedAt = block.timestamp;
        dispute.resolvedBy = msg.sender;
        dispute.resolutionNotes = notes;

        // Actualizar reputaciones
        _updateReputations(disputeId, favorInitiator);

        emit DisputeResolved(
            disputeId,
            resolution,
            initiatorAmount,
            respondentAmount,
            block.timestamp
        );

        // TODO: En producción, transferir fondos desde escrow del RentalAgreement
    }

    /**
     * @notice Actualiza reputaciones según resultado de la disputa
     */
    function _updateReputations(uint256 disputeId, bool initiatorWon) internal {
        Dispute storage dispute = disputes[disputeId];

        if (dispute.initiatorIsTenant) {
            // Disputa iniciada por tenant
            uint256 tenantTokenId = tenantPassport.getTokenIdByAddress(dispute.initiator);

            if (!initiatorWon) {
                // Tenant perdió → penalizar reputación
                // TenantPassport se encarga de decrementar
                // Ya se llamó incrementDisputes en RentalAgreement.raiseDispute()
            }

            // PropertyRegistry se actualiza en el RentalAgreement
        } else {
            // Disputa iniciada por landlord
            // Similar lógica pero al revés
        }
    }

    /**
     * @notice Cancela una disputa (ambas partes deben acordar)
     */
    function cancelDispute(uint256 disputeId)
        external
        disputeExists(disputeId)
        onlyDisputeParty(disputeId)
    {
        Dispute storage dispute = disputes[disputeId];

        require(
            dispute.status == DisputeStatus.PENDING_RESPONSE ||
            dispute.status == DisputeStatus.PENDING_ARBITRATION,
            "Cannot cancel after arbitration started"
        );

        dispute.status = DisputeStatus.CANCELLED;

        // Refund del fee
        payable(dispute.initiator).transfer(arbitrationFee);

        emit DisputeCancelled(disputeId, msg.sender, block.timestamp);
    }

    /**
     * @notice Marca disputa como expirada si no hubo respuesta
     */
    function markExpired(uint256 disputeId) external disputeExists(disputeId) {
        Dispute storage dispute = disputes[disputeId];

        require(
            dispute.status == DisputeStatus.PENDING_RESPONSE &&
            block.timestamp > dispute.responseDeadline,
            "Not expired"
        );

        dispute.status = DisputeStatus.EXPIRED;

        // Initiator gana por default
        _resolveDispute(disputeId, true, "Expired - no response");
    }

    // View functions

    /**
     * @notice Obtiene información de una disputa
     */
    function getDispute(uint256 disputeId)
        external
        view
        disputeExists(disputeId)
        returns (
            address rentalAgreement,
            address initiator,
            address respondent,
            DisputeReason reason,
            DisputeStatus status,
            uint256 amountInDispute,
            uint256 votesForInitiator,
            uint256 votesForRespondent
        )
    {
        Dispute storage dispute = disputes[disputeId];
        return (
            dispute.rentalAgreement,
            dispute.initiator,
            dispute.respondent,
            dispute.reason,
            dispute.status,
            dispute.amountInDispute,
            dispute.votesForInitiator,
            dispute.votesForRespondent
        );
    }

    /**
     * @notice Obtiene árbitros asignados a una disputa
     */
    function getDisputeArbitrators(uint256 disputeId)
        external
        view
        disputeExists(disputeId)
        returns (address[] memory)
    {
        return disputes[disputeId].arbitrators;
    }

    /**
     * @notice Obtiene disputas de un RentalAgreement
     */
    function getAgreementDisputes(address rentalAgreement)
        external
        view
        returns (uint256[] memory)
    {
        return agreementDisputes[rentalAgreement];
    }

    /**
     * @notice Verifica si un address es árbitro asignado a una disputa
     */
    function _isAssignedArbitrator(uint256 disputeId, address arbitrator)
        internal
        view
        returns (bool)
    {
        address[] storage assignedArbitrators = disputes[disputeId].arbitrators;
        for (uint256 i = 0; i < assignedArbitrators.length; i++) {
            if (assignedArbitrators[i] == arbitrator) {
                return true;
            }
        }
        return false;
    }

    // Admin functions

    /**
     * @notice Autoriza un árbitro
     */
    function authorizeArbitrator(address arbitrator) external onlyOwner {
        require(arbitrator != address(0), "Invalid arbitrator");
        require(!authorizedArbitrators[arbitrator], "Already authorized");

        authorizedArbitrators[arbitrator] = true;
        arbitratorsList.push(arbitrator);

        emit ArbitratorAuthorized(arbitrator, block.timestamp);
    }

    /**
     * @notice Revoca un árbitro
     */
    function revokeArbitrator(address arbitrator) external onlyOwner {
        require(authorizedArbitrators[arbitrator], "Not authorized");

        authorizedArbitrators[arbitrator] = false;

        // Remover de lista
        for (uint256 i = 0; i < arbitratorsList.length; i++) {
            if (arbitratorsList[i] == arbitrator) {
                arbitratorsList[i] = arbitratorsList[arbitratorsList.length - 1];
                arbitratorsList.pop();
                break;
            }
        }

        emit ArbitratorRevoked(arbitrator, block.timestamp);
    }

    /**
     * @notice Actualiza parámetros de configuración
     */
    function setResponseWindow(uint256 newWindow) external onlyOwner {
        require(newWindow >= 1 days && newWindow <= 30 days, "Invalid window");
        responseWindow = newWindow;
    }

    function setVotingWindow(uint256 newWindow) external onlyOwner {
        require(newWindow >= 1 days && newWindow <= 30 days, "Invalid window");
        votingWindow = newWindow;
    }

    function setArbitrationFee(uint256 newFee) external onlyOwner {
        arbitrationFee = newFee;
    }

    /**
     * @notice Retira fees acumulados
     */
    function withdrawFees(address to) external onlyOwner {
        require(to != address(0), "Invalid address");
        uint256 amount = feesCollected;
        feesCollected = 0;
        payable(to).transfer(amount);
    }
}
