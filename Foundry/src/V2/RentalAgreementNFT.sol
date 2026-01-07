// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./Interfaces.sol";

/**
 * @title RentalAgreementNFT
 * @author RoomFi Team - Mantle Hackathon 2025
 * @notice Tokenized rental agreement as an ERC721 NFT for future payment liquidity
 * @dev Combines functional rental agreement logic with NFT transferability
 *
 * Key Features:
 * - Each rental agreement is minted as a unique NFT
 * - Landlord receives NFT representing rights to future rent payments
 * - NFT can be sold to investors for immediate liquidity
 * - Security deposits are held in yield-generating vault
 * - Tenant rental experience remains unchanged regardless of NFT ownership transfers
 *
 * Security Deposit Flow:
 * - Deposit goes to RoomFiVault and generates yield (4-8% APY)
 * - Upon completion: tenant receives deposit + 70% of yield
 * - Protocol receives 30% of yield as revenue
 *
 * NFT Liquidity Use Case:
 * - Landlord lists NFT on marketplace for discounted future cash flows
 * - Investor purchases NFT and receives all remaining monthly rent payments
 * - Tenant continues normal rental relationship, unaffected by ownership change
 */
contract RentalAgreementNFT is ERC721, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /* Enums */

    enum AgreementStatus {
        PENDING,
        ACTIVE,
        COMPLETED,
        TERMINATED,
        DISPUTED
    }

    /* Structs */

    struct Agreement {
        uint256 agreementId;
        uint256 propertyId;
        address landlord;
        address tenant;
        uint256 monthlyRent;
        uint256 securityDeposit;
        uint256 startDate;
        uint256 endDate;
        uint256 duration;
        AgreementStatus status;
        uint256 depositAmount;
        uint256 totalPaid;
        uint256 paymentsMade;
        uint256 paymentsMissed;
        bool landlordSigned;
        bool tenantSigned;
    }

    /* State Variables */

    uint256 private _agreementIdCounter;
    mapping(uint256 => Agreement) public agreements;

    IERC20 public immutable usdt;
    IRoomFiVault public immutable vault;
    IPropertyRegistry public propertyRegistry;
    ITenantPassport public tenantPassport;
    IRentalAgreementFactoryNFT public factory;
    address public disputeResolver;

    mapping(uint256 => uint256) public lastPaymentDate;
    mapping(uint256 => uint256) public nextPaymentDue;
    mapping(uint256 => uint256) public activeDisputeId;
    mapping(uint256 => bool) public paymentsLockedByDispute;

    uint256 public constant PROTOCOL_FEE_PERCENT = 15;
    uint256 public constant VAULT_YIELD_SPLIT = 70;

    bool private initialized;

    /* Events */

    event AgreementCreated(
        uint256 indexed agreementId,
        uint256 indexed propertyId,
        address indexed landlord,
        address tenant,
        uint256 monthlyRent,
        uint256 timestamp
    );

    event AgreementSigned(
        uint256 indexed agreementId,
        address indexed signer,
        bool isLandlord,
        uint256 timestamp
    );

    event DepositPaid(
        uint256 indexed agreementId,
        address indexed tenant,
        uint256 amount,
        uint256 timestamp
    );

    event AgreementActivated(
        uint256 indexed agreementId,
        uint256 startDate,
        uint256 endDate
    );

    event RentPaid(
        uint256 indexed agreementId,
        uint256 indexed month,
        uint256 amount,
        address indexed paidTo,
        uint256 timestamp
    );

    event AgreementCompleted(
        uint256 indexed agreementId,
        uint256 timestamp
    );

    event DepositReturned(
        uint256 indexed agreementId,
        address indexed tenant,
        uint256 principal,
        uint256 yieldEarned,
        uint256 timestamp
    );

    event YieldDistributed(
        uint256 indexed agreementId,
        uint256 tenantYield,
        uint256 protocolYield,
        uint256 timestamp
    );

    event AgreementTerminated(
        uint256 indexed agreementId,
        address indexed initiator,
        string reason,
        uint256 timestamp
    );

    event DisputeRaised(
        uint256 indexed agreementId,
        address indexed initiator,
        string reason,
        uint256 timestamp
    );

    event NFTTransferred(
        uint256 indexed agreementId,
        address indexed from,
        address indexed to,
        uint256 timestamp
    );

    /* Errors */

    error NotInitialized();
    error AlreadyInitialized();
    error NotLandlord();
    error NotTenant();
    error NotParty();
    error InvalidStatus();
    error AlreadySigned();
    error DepositAlreadyPaid();
    error PaymentsLocked();
    error DisputeAlreadyActive();
    error TransferFailed();
    error InvalidAgreement();

    /* Modifiers */

    modifier onlyInitialized() {
        if (!initialized) revert NotInitialized();
        _;
    }

    modifier agreementExists(uint256 agreementId) {
        if (agreementId == 0 || agreementId > _agreementIdCounter) revert InvalidAgreement();
        _;
    }

    modifier onlyLandlord(uint256 agreementId) {
        if (msg.sender != agreements[agreementId].landlord) revert NotLandlord();
        _;
    }

    modifier onlyTenant(uint256 agreementId) {
        if (msg.sender != agreements[agreementId].tenant) revert NotTenant();
        _;
    }

    modifier onlyParty(uint256 agreementId) {
        Agreement storage agreement = agreements[agreementId];
        if (msg.sender != agreement.tenant && msg.sender != agreement.landlord) {
            revert NotParty();
        }
        _;
    }

    modifier onlyStatus(uint256 agreementId, AgreementStatus status) {
        if (agreements[agreementId].status != status) revert InvalidStatus();
        _;
    }

    /* Constructor */

    constructor(address _usdt, address _vault) ERC721("RoomFi Rental Agreement", "ROOMFI") {
        require(_usdt != address(0), "Invalid USDT");
        require(_vault != address(0), "Invalid vault");

        usdt = IERC20(_usdt);
        vault = IRoomFiVault(_vault);
    }

    /**
     * @notice Initialize contract references after deployment
     * @dev Called once by deployer to set up protocol integrations
     */
    function initializeReferences(
        address _propertyRegistry,
        address _tenantPassport,
        address _factory,
        address _disputeResolver
    ) external {
        if (initialized) revert AlreadyInitialized();
        require(_propertyRegistry != address(0), "Invalid propertyRegistry");
        require(_tenantPassport != address(0), "Invalid tenantPassport");
        require(_factory != address(0), "Invalid factory");
        require(_disputeResolver != address(0), "Invalid disputeResolver");

        propertyRegistry = IPropertyRegistry(_propertyRegistry);
        tenantPassport = ITenantPassport(_tenantPassport);
        factory = IRentalAgreementFactoryNFT(_factory);
        disputeResolver = _disputeResolver;

        initialized = true;
    }

    /* Agreement Creation */

    /**
     * @notice Create a new rental agreement and mint NFT to landlord
     * @dev Only callable by factory contract
     * @return agreementId Unique identifier that also serves as NFT tokenId
     */
    function createAgreement(
        uint256 _propertyId,
        address _landlord,
        address _tenant,
        uint256 _monthlyRent,
        uint256 _securityDeposit,
        uint256 _duration
    ) external onlyInitialized returns (uint256 agreementId) {
        require(msg.sender == address(factory), "Only factory");
        require(_landlord != address(0), "Invalid landlord");
        require(_tenant != address(0), "Invalid tenant");
        require(_landlord != _tenant, "Landlord cannot be tenant");

        _agreementIdCounter++;
        agreementId = _agreementIdCounter;

        Agreement storage agreement = agreements[agreementId];
        agreement.agreementId = agreementId;
        agreement.propertyId = _propertyId;
        agreement.landlord = _landlord;
        agreement.tenant = _tenant;
        agreement.monthlyRent = _monthlyRent;
        agreement.securityDeposit = _securityDeposit;
        agreement.duration = _duration;
        agreement.status = AgreementStatus.PENDING;

        _mint(_landlord, agreementId);

        emit AgreementCreated(
            agreementId,
            _propertyId,
            _landlord,
            _tenant,
            _monthlyRent,
            block.timestamp
        );

        return agreementId;
    }

    /* Signing Functions */

    function signAsTenant(uint256 agreementId)
        external
        onlyInitialized
        agreementExists(agreementId)
        onlyTenant(agreementId)
        onlyStatus(agreementId, AgreementStatus.PENDING)
    {
        Agreement storage agreement = agreements[agreementId];
        if (agreement.tenantSigned) revert AlreadySigned();

        agreement.tenantSigned = true;
        emit AgreementSigned(agreementId, msg.sender, false, block.timestamp);

        _checkActivation(agreementId);
    }

    function signAsLandlord(uint256 agreementId)
        external
        onlyInitialized
        agreementExists(agreementId)
        onlyLandlord(agreementId)
        onlyStatus(agreementId, AgreementStatus.PENDING)
    {
        Agreement storage agreement = agreements[agreementId];
        if (agreement.landlordSigned) revert AlreadySigned();

        agreement.landlordSigned = true;
        emit AgreementSigned(agreementId, msg.sender, true, block.timestamp);

        _checkActivation(agreementId);
    }

    /* Deposit and Payment Functions */

    /**
     * @notice Tenant deposits security in USDT which goes to vault for yield generation
     * @dev Deposit is sent to vault and begins earning yield immediately
     */
    function paySecurityDeposit(uint256 agreementId)
        external
        nonReentrant
        onlyInitialized
        agreementExists(agreementId)
        onlyTenant(agreementId)
        onlyStatus(agreementId, AgreementStatus.PENDING)
    {
        Agreement storage agreement = agreements[agreementId];
        if (agreement.depositAmount != 0) revert DepositAlreadyPaid();

        uint256 depositAmount = agreement.securityDeposit;

        usdt.safeTransferFrom(msg.sender, address(this), depositAmount);

        usdt.forceApprove(address(vault), depositAmount);
        vault.deposit(depositAmount, address(uint160(agreementId)));

        agreement.depositAmount = depositAmount;

        emit DepositPaid(agreementId, msg.sender, depositAmount, block.timestamp);

        _checkActivation(agreementId);
    }

    /**
     * @notice Check if agreement can be activated (both parties signed + deposit paid)
     * @dev Internal function called after each prerequisite completion
     */
    function _checkActivation(uint256 agreementId) internal {
        Agreement storage agreement = agreements[agreementId];

        if (
            agreement.landlordSigned &&
            agreement.tenantSigned &&
            agreement.depositAmount == agreement.securityDeposit
        ) {
            agreement.status = AgreementStatus.ACTIVE;
            agreement.startDate = block.timestamp;
            agreement.endDate = block.timestamp + (agreement.duration * 30 days);
            nextPaymentDue[agreementId] = block.timestamp + 30 days;

            uint256 tenantTokenId = tenantPassport.getTokenIdByAddress(agreement.tenant);
            tenantPassport.incrementPropertiesRented(tenantTokenId);

            // Notify factory to increment activeAgreements counter
            factory.notifyAgreementActivated(agreementId);

            emit AgreementActivated(agreementId, agreement.startDate, agreement.endDate);
        }
    }

    /**
     * @notice Tenant pays monthly rent in USDT
     * @dev Payment is routed to current NFT owner, enabling secondary market liquidity
     *      If landlord sold the NFT, new owner receives the rent payment
     */
    function payRent(uint256 agreementId)
        external
        nonReentrant
        onlyInitialized
        agreementExists(agreementId)
        onlyTenant(agreementId)
        onlyStatus(agreementId, AgreementStatus.ACTIVE)
    {
        if (paymentsLockedByDispute[agreementId]) revert PaymentsLocked();

        Agreement storage agreement = agreements[agreementId];
        uint256 rentAmount = agreement.monthlyRent;

        usdt.safeTransferFrom(msg.sender, address(this), rentAmount);

        bool onTime = block.timestamp <= nextPaymentDue[agreementId];

        agreement.totalPaid += rentAmount;
        agreement.paymentsMade++;
        lastPaymentDate[agreementId] = block.timestamp;
        nextPaymentDue[agreementId] = block.timestamp + 30 days;

        if (!onTime) {
            agreement.paymentsMissed++;
        }

        uint256 ownerAmount = (rentAmount * (100 - PROTOCOL_FEE_PERCENT)) / 100;
        uint256 protocolFee = rentAmount - ownerAmount;

        address currentOwner = ownerOf(agreementId);
        usdt.safeTransfer(currentOwner, ownerAmount);
        usdt.safeTransfer(address(factory), protocolFee);

        uint256 tenantTokenId = tenantPassport.getTokenIdByAddress(msg.sender);
        tenantPassport.updateTenantInfo(tenantTokenId, onTime, rentAmount);

        emit RentPaid(agreementId, agreement.paymentsMade, rentAmount, currentOwner, block.timestamp);

        if (block.timestamp >= agreement.endDate) {
            _completeAgreement(agreementId);
        }
    }

    /**
     * @notice Complete agreement and return deposit with accumulated yield to tenant
     * @dev Withdraws from vault, splits yield 70/30, burns NFT as it has no further value
     */
    function _completeAgreement(uint256 agreementId) internal {
        Agreement storage agreement = agreements[agreementId];
        agreement.status = AgreementStatus.COMPLETED;

        uint256 depositAmount = agreement.depositAmount;

        (uint256 principal, uint256 yieldEarned) = vault.withdraw(
            depositAmount,
            address(uint160(agreementId))
        );

        uint256 tenantYield = (yieldEarned * VAULT_YIELD_SPLIT) / 100;
        uint256 protocolYield = yieldEarned - tenantYield;

        uint256 totalReturn = principal + tenantYield;
        usdt.safeTransfer(agreement.tenant, totalReturn);

        if (protocolYield > 0) {
            usdt.safeTransfer(address(factory), protocolYield);
        }

        // Notify factory to decrement activeAgreements counter
        factory.notifyAgreementCompleted(agreementId);

        emit AgreementCompleted(agreementId, block.timestamp);
        emit DepositReturned(agreementId, agreement.tenant, principal, tenantYield, block.timestamp);
        emit YieldDistributed(agreementId, tenantYield, protocolYield, block.timestamp);

        propertyRegistry.updatePropertyReputation(
            agreement.propertyId,
            true,
            false,
            80, 80, 80
        );

        _burn(agreementId);
    }

    /* Termination and Dispute Functions */

    /**
     * @notice Terminate agreement early with penalty calculations
     * @dev Tenant terminating with missed payments incurs 20% deposit penalty
     */
    function terminateAgreement(uint256 agreementId, string calldata reason)
        external
        nonReentrant
        onlyInitialized
        agreementExists(agreementId)
        onlyParty(agreementId)
        onlyStatus(agreementId, AgreementStatus.ACTIVE)
    {
        Agreement storage agreement = agreements[agreementId];
        agreement.status = AgreementStatus.TERMINATED;

        uint256 depositReturn = agreement.depositAmount;
        uint256 penalty = 0;

        if (msg.sender == agreement.tenant && agreement.paymentsMissed > 0) {
            penalty = (depositReturn * 20) / 100;
            depositReturn = depositReturn - penalty;
        }

        (uint256 principal, uint256 yieldEarned) = vault.withdraw(
            agreement.depositAmount,
            address(uint160(agreementId))
        );

        if (penalty > 0) {
            address currentOwner = ownerOf(agreementId);
            usdt.safeTransfer(currentOwner, penalty);
        }

        uint256 tenantYield = (yieldEarned * VAULT_YIELD_SPLIT) / 100;
        uint256 protocolYield = yieldEarned - tenantYield;

        uint256 tenantTotal = (principal - penalty) + tenantYield;
        usdt.safeTransfer(agreement.tenant, tenantTotal);

        if (protocolYield > 0) {
            usdt.safeTransfer(address(factory), protocolYield);
        }

        // Notify factory to decrement activeAgreements counter
        factory.notifyAgreementTerminated(agreementId, msg.sender);

        emit AgreementTerminated(agreementId, msg.sender, reason, block.timestamp);

        _burn(agreementId);
    }

    function raiseDispute(
        uint256 agreementId,
        uint8 reasonCode,
        string calldata evidenceURI,
        uint256 amountInDispute
    )
        external
        payable
        nonReentrant
        onlyInitialized
        agreementExists(agreementId)
        onlyParty(agreementId)
        onlyStatus(agreementId, AgreementStatus.ACTIVE)
    {
        if (activeDisputeId[agreementId] != 0) revert DisputeAlreadyActive();
        require(disputeResolver != address(0), "DisputeResolver not set");

        Agreement storage agreement = agreements[agreementId];

        bool initiatorIsTenant = (msg.sender == agreement.tenant);
        address respondent = initiatorIsTenant ? agreement.landlord : agreement.tenant;

        // External call BEFORE state changes (CEI pattern compliance)
        (bool success, bytes memory data) = disputeResolver.call{value: msg.value}(
            abi.encodeWithSignature(
                "createDispute(address,address,uint8,string,uint256,bool)",
                address(this),
                respondent,
                reasonCode,
                evidenceURI,
                amountInDispute,
                initiatorIsTenant
            )
        );

        require(success, "Failed to create dispute");

        uint256 disputeId = abi.decode(data, (uint256));

        // State changes AFTER external call (CEI pattern - prevents reentrancy)
        agreement.status = AgreementStatus.DISPUTED;
        paymentsLockedByDispute[agreementId] = true;
        activeDisputeId[agreementId] = disputeId;

        emit DisputeRaised(agreementId, msg.sender, evidenceURI, block.timestamp);
    }

    /**
     * @notice Apply dispute resolution from arbitrator voting
     * @dev Only callable by DisputeResolver contract after arbitration completes
     */
    function applyDisputeResolution(
        uint256 agreementId,
        uint256 disputeId,
        bool favorTenant
    ) external nonReentrant agreementExists(agreementId) {
        require(msg.sender == disputeResolver, "Only DisputeResolver");
        require(activeDisputeId[agreementId] == disputeId, "Invalid dispute ID");

        Agreement storage agreement = agreements[agreementId];
        require(agreement.status == AgreementStatus.DISPUTED, "Not disputed");

        paymentsLockedByDispute[agreementId] = false;
        activeDisputeId[agreementId] = 0;
        agreement.status = AgreementStatus.TERMINATED;

        (uint256 principal, uint256 yieldEarned) = vault.withdraw(
            agreement.depositAmount,
            address(uint160(agreementId))
        );

        if (favorTenant) {
            uint256 tenantYield = (yieldEarned * VAULT_YIELD_SPLIT) / 100;
            uint256 totalReturn = principal + tenantYield;

            usdt.safeTransfer(agreement.tenant, totalReturn);

            uint256 protocolYield = yieldEarned - tenantYield;
            if (protocolYield > 0) {
                usdt.safeTransfer(address(factory), protocolYield);
            }
        } else {
            uint256 penalty = (principal * 30) / 100;

            address currentOwner = ownerOf(agreementId);
            usdt.safeTransfer(currentOwner, penalty);
            usdt.safeTransfer(agreement.tenant, principal - penalty);

            if (yieldEarned > 0) {
                usdt.safeTransfer(address(factory), yieldEarned);
            }
        }

        _burn(agreementId);
    }

    /* NFT Transfer Override */

    /**
     * @notice Override ERC721 _update hook to enforce agreement-specific rules
     * @dev Only active agreements can be transferred, tenant cannot purchase own agreement
     *      This hook is called by transferFrom, safeTransferFrom, and _mint/_burn
     */
    function _update(address to, uint256 agreementId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(agreementId);

        // Allow minting (from == address(0)) and burning (to == address(0))
        if (from != address(0) && to != address(0)) {
            Agreement storage agreement = agreements[agreementId];

            require(
                agreement.status == AgreementStatus.ACTIVE,
                "Agreement must be active to transfer"
            );

            require(to != agreement.tenant, "Tenant cannot own agreement NFT");

            emit NFTTransferred(agreementId, from, to, block.timestamp);
        }

        return super._update(to, agreementId, auth);
    }

    /* View Functions */

    function getAgreement(uint256 agreementId)
        external
        view
        agreementExists(agreementId)
        returns (
            uint256 propertyId,
            address landlord,
            address tenant,
            uint256 monthlyRent,
            uint256 securityDeposit,
            uint256 startDate,
            uint256 endDate,
            uint256 duration,
            uint8 status,
            uint256 depositAmount,
            uint256 totalPaid,
            uint256 paymentsMade,
            uint256 paymentsMissed,
            bool landlordSigned,
            bool tenantSigned
        )
    {
        Agreement memory agreement = agreements[agreementId];
        return (
            agreement.propertyId,
            agreement.landlord,
            agreement.tenant,
            agreement.monthlyRent,
            agreement.securityDeposit,
            agreement.startDate,
            agreement.endDate,
            agreement.duration,
            uint8(agreement.status),
            agreement.depositAmount,
            agreement.totalPaid,
            agreement.paymentsMade,
            agreement.paymentsMissed,
            agreement.landlordSigned,
            agreement.tenantSigned
        );
    }

    function getCurrentPaymentReceiver(uint256 agreementId)
        external
        view
        agreementExists(agreementId)
        returns (address)
    {
        return ownerOf(agreementId);
    }

    function isPaymentOverdue(uint256 agreementId)
        external
        view
        agreementExists(agreementId)
        returns (bool)
    {
        return block.timestamp > nextPaymentDue[agreementId] &&
               agreements[agreementId].status == AgreementStatus.ACTIVE;
    }

    function getDaysOverdue(uint256 agreementId)
        external
        view
        agreementExists(agreementId)
        returns (uint256)
    {
        if (block.timestamp <= nextPaymentDue[agreementId]) return 0;
        return (block.timestamp - nextPaymentDue[agreementId]) / 1 days;
    }

    function getDepositYield(uint256 agreementId)
        external
        view
        agreementExists(agreementId)
        returns (uint256)
    {
        Agreement storage agreement = agreements[agreementId];
        if (agreement.depositAmount == 0) return 0;
        return vault.calculateYield(address(uint160(agreementId)));
    }

    function getTotalDepositValue(uint256 agreementId)
        external
        view
        agreementExists(agreementId)
        returns (uint256)
    {
        Agreement storage agreement = agreements[agreementId];
        if (agreement.depositAmount == 0) return 0;
        return vault.balanceOf(address(uint160(agreementId)));
    }

    function getAgreementProgress(uint256 agreementId)
        external
        view
        agreementExists(agreementId)
        returns (uint256)
    {
        Agreement storage agreement = agreements[agreementId];

        if (agreement.status != AgreementStatus.ACTIVE) return 0;
        if (block.timestamp < agreement.startDate) return 0;
        if (block.timestamp >= agreement.endDate) return 10000;

        uint256 elapsed = block.timestamp - agreement.startDate;
        uint256 totalDuration = agreement.endDate - agreement.startDate;
        return (elapsed * 10000) / totalDuration;
    }

    /**
     * @notice Estimate NFT market value based on remaining rental payments
     * @dev Useful for marketplace listings - simplified without discount rate for MVP
     */
    function estimateNFTValue(uint256 agreementId)
        external
        view
        agreementExists(agreementId)
        returns (uint256 estimatedValue)
    {
        Agreement storage agreement = agreements[agreementId];

        if (agreement.status != AgreementStatus.ACTIVE) return 0;
        if (block.timestamp >= agreement.endDate) return 0;

        uint256 timeRemaining = agreement.endDate - block.timestamp;
        uint256 monthsRemaining = (timeRemaining / 30 days) + 1;

        estimatedValue = agreement.monthlyRent * monthsRemaining;

        return estimatedValue;
    }

    function totalAgreements() external view returns (uint256) {
        return _agreementIdCounter;
    }

    receive() external payable {}
}
