// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Interfaces.sol";

/**
 * @title RentalAgreementFactoryNFT
 * @author RoomFi Team - Mantle Hackathon 2025
 * @notice Factory for creating tokenized rental agreements as NFTs
 * @dev Creates agreements through RentalAgreementNFT contract with comprehensive validation
 *
 * Validation checks performed before agreement creation:
 * - Caller must be property owner
 * - Property must be available for rent
 * - Tenant must have valid passport
 * - Tenant reputation must meet minimum threshold
 * - Landlord and tenant cannot be same address
 *
 * All created agreements are tracked for queryability by property, tenant, and landlord
 */
contract RentalAgreementFactoryNFT is Ownable {

    /* Interfaces */

    IRentalAgreementNFT public immutable rentalAgreementNFT;
    IPropertyRegistry public immutable propertyRegistry;
    ITenantPassport public immutable tenantPassport;

    /* State Variables */

    mapping(uint256 => uint256[]) public propertyAgreements;
    mapping(address => uint256[]) public tenantAgreements;
    mapping(address => uint256[]) public landlordAgreements;

    uint256[] public allAgreementIds;

    uint256 public totalAgreementsCreated;
    uint256 public activeAgreements;

    uint32 public constant MIN_TENANT_REPUTATION = 40;
    uint256 public constant MIN_DURATION = 1;
    uint256 public constant MAX_DURATION = 24;

    /* Events */

    event AgreementCreatedViaFactory(
        uint256 indexed agreementId,
        uint256 indexed propertyId,
        address indexed tenant,
        address landlord,
        uint256 monthlyRent,
        uint256 duration,
        uint256 timestamp
    );

    event AgreementActivated(
        uint256 indexed agreementId,
        uint256 timestamp
    );

    event AgreementCompleted(
        uint256 indexed agreementId,
        uint256 timestamp
    );

    event AgreementTerminated(
        uint256 indexed agreementId,
        address indexed initiator,
        uint256 timestamp
    );

    /* Constructor */

    constructor(
        address _rentalAgreementNFT,
        address _propertyRegistry,
        address _tenantPassport,
        address initialOwner
    ) Ownable(initialOwner) {
        require(_rentalAgreementNFT != address(0), "Invalid RentalAgreementNFT");
        require(_propertyRegistry != address(0), "Invalid PropertyRegistry");
        require(_tenantPassport != address(0), "Invalid TenantPassport");

        rentalAgreementNFT = IRentalAgreementNFT(_rentalAgreementNFT);
        propertyRegistry = IPropertyRegistry(_propertyRegistry);
        tenantPassport = ITenantPassport(_tenantPassport);
    }

    /* Main Functions */

    /**
     * @notice Create a new rental agreement with full validation
     * @dev Validates property ownership, availability, and tenant eligibility
     * @param propertyId ID of the property to rent
     * @param tenant Address of the prospective tenant
     * @param monthlyRent Monthly rent amount in USDT (6 decimals)
     * @param securityDeposit Security deposit amount in USDT (6 decimals)
     * @param duration Rental duration in months (1-24)
     * @return agreementId Unique identifier of created agreement
     */
    function createAgreement(
        uint256 propertyId,
        address tenant,
        uint256 monthlyRent,
        uint256 securityDeposit,
        uint256 duration
    ) external returns (uint256 agreementId) {
        require(tenant != address(0), "Invalid tenant address");
        require(tenant != msg.sender, "Landlord cannot be tenant");
        require(monthlyRent > 0, "Rent must be greater than 0");
        require(securityDeposit > 0, "Deposit must be greater than 0");
        require(duration >= MIN_DURATION && duration <= MAX_DURATION, "Invalid duration");

        address landlord = propertyRegistry.ownerOf(propertyId);
        require(landlord == msg.sender, "Not property owner");

        require(
            propertyRegistry.isPropertyAvailableForRent(propertyId),
            "Property not available for rent"
        );

        require(
            tenantPassport.hasPassport(tenant),
            "Tenant needs passport"
        );

        uint256 tenantTokenId = tenantPassport.getTokenIdByAddress(tenant);
        uint32 tenantReputation = tenantPassport.getReputationWithDecay(tenantTokenId);
        require(
            tenantReputation >= MIN_TENANT_REPUTATION,
            "Tenant reputation too low"
        );

        agreementId = rentalAgreementNFT.createAgreement(
            propertyId,
            landlord,
            tenant,
            monthlyRent,
            securityDeposit,
            duration
        );

        propertyAgreements[propertyId].push(agreementId);
        tenantAgreements[tenant].push(agreementId);
        landlordAgreements[landlord].push(agreementId);
        allAgreementIds.push(agreementId);

        totalAgreementsCreated++;

        emit AgreementCreatedViaFactory(
            agreementId,
            propertyId,
            tenant,
            landlord,
            monthlyRent,
            duration,
            block.timestamp
        );

        return agreementId;
    }

    /* Callback Functions (called by RentalAgreementNFT) */

    function notifyAgreementActivated(uint256 agreementId) external {
        require(msg.sender == address(rentalAgreementNFT), "Only agreement contract");
        activeAgreements++;
        emit AgreementActivated(agreementId, block.timestamp);
    }

    function notifyAgreementCompleted(uint256 agreementId) external {
        require(msg.sender == address(rentalAgreementNFT), "Only agreement contract");
        require(activeAgreements > 0, "No active agreements to complete");
        activeAgreements--;
        emit AgreementCompleted(agreementId, block.timestamp);
    }

    function notifyAgreementTerminated(uint256 agreementId, address initiator) external {
        require(msg.sender == address(rentalAgreementNFT), "Only agreement contract");
        require(activeAgreements > 0, "No active agreements to terminate");
        activeAgreements--;
        emit AgreementTerminated(agreementId, initiator, block.timestamp);
    }

    /* View Functions */

    function getPropertyAgreements(uint256 propertyId)
        external
        view
        returns (uint256[] memory)
    {
        return propertyAgreements[propertyId];
    }

    function getTenantAgreements(address tenant)
        external
        view
        returns (uint256[] memory)
    {
        return tenantAgreements[tenant];
    }

    function getLandlordAgreements(address landlord)
        external
        view
        returns (uint256[] memory)
    {
        return landlordAgreements[landlord];
    }

    function getTotalAgreements() external view returns (uint256) {
        return allAgreementIds.length;
    }

    function getAgreements(uint256 offset, uint256 limit)
        external
        view
        returns (uint256[] memory)
    {
        uint256 total = allAgreementIds.length;
        if (offset >= total) {
            return new uint256[](0);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        uint256[] memory result = new uint256[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = allAgreementIds[i];
        }

        return result;
    }

    function getFactoryStats()
        external
        view
        returns (
            uint256 total,
            uint256 active,
            uint256 completed
        )
    {
        total = totalAgreementsCreated;
        active = activeAgreements;
        completed = total > active ? total - active : 0;

        return (total, active, completed);
    }

    /* Admin Functions */

    function withdrawProtocolFees() external onlyOwner {
        IERC20 usdt = IERC20(rentalAgreementNFT.usdt());
        uint256 balance = usdt.balanceOf(address(this));
        require(balance > 0, "No fees to withdraw");
        usdt.transfer(owner(), balance);
    }

    receive() external payable {}
}
