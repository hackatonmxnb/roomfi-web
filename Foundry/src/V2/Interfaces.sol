// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Interfaces
 * @notice Interfaces compartidas para los contratos RoomFi V2
 * @dev Centraliza todas las interfaces para evitar duplicados
 */

interface ITenantPassport {
    function hasPassport(address user) external view returns (bool);
    function getTokenIdByAddress(address user) external pure returns (uint256);
    function getReputationWithDecay(uint256 tokenId) external view returns (uint32);
    function incrementPropertiesOwned(uint256 tokenId) external;
    function updateTenantInfo(uint256 tokenId, bool paymentOnTime, uint256 rentAmountPaid) external;
    function incrementPropertiesRented(uint256 tokenId) external;
}

interface IMockCivilRegistry {
    function checkPropertyStatus(int256 lat, int256 long) external view returns (bool isClean, string memory ownerID);
}

interface IPropertyRegistry {
    function ownerOf(uint256 tokenId) external view returns (address);
    function getProperty(uint256 propertyId) external view returns (
        address landlord,
        bool isActive
    );
    function isPropertyAvailableForRent(uint256 propertyId) external view returns (bool);
    function updatePropertyReputation(
        uint256 propertyId,
        bool rentalCompleted,
        bool hadDispute,
        uint32 cleanlinessRating,
        uint32 locationRating,
        uint32 valueRating
    ) external;
}

interface IRentalAgreement {
    function initialize(
        uint256 _propertyId,
        address _landlord,
        address _tenant,
        uint256 _monthlyRent,
        uint256 _securityDeposit,
        uint256 _duration,
        address _propertyRegistry,
        address _tenantPassport,
        address _factory,
        address _disputeResolver
    ) external;

    function applyDisputeResolution(uint256 disputeId, bool favorTenant) external;
}

interface IDisputeResolver {
    function createDispute(
        address rentalAgreement,
        address respondent,
        uint8 reason,
        string calldata evidenceURI,
        uint256 amountInDispute,
        bool initiatorIsTenant
    ) external payable returns (uint256 disputeId);

    function getDispute(uint256 disputeId) external view returns (
        address rentalAgreement,
        address initiator,
        address respondent,
        uint8 reason,
        uint8 status,
        uint256 amountInDispute,
        uint256 votesForInitiator,
        uint256 votesForRespondent
    );
}

interface IRentalAgreementNFT {
    function usdt() external view returns (address);
    function vault() external view returns (address);

    function createAgreement(
        uint256 _propertyId,
        address _landlord,
        address _tenant,
        uint256 _monthlyRent,
        uint256 _securityDeposit,
        uint256 _duration
    ) external returns (uint256 agreementId);

    function signAsTenant(uint256 agreementId) external;
    function signAsLandlord(uint256 agreementId) external;
    function paySecurityDeposit(uint256 agreementId) external;
    function payRent(uint256 agreementId) external;

    function terminateAgreement(uint256 agreementId, string calldata reason) external;

    function raiseDispute(
        uint256 agreementId,
        uint8 reasonCode,
        string calldata evidenceURI,
        uint256 amountInDispute
    ) external payable;

    function applyDisputeResolution(
        uint256 agreementId,
        uint256 disputeId,
        bool favorTenant
    ) external;

    function getAgreement(uint256 agreementId) external view returns (
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
    );

    function getCurrentPaymentReceiver(uint256 agreementId) external view returns (address);
    function isPaymentOverdue(uint256 agreementId) external view returns (bool);
    function getDaysOverdue(uint256 agreementId) external view returns (uint256);
    function getDepositYield(uint256 agreementId) external view returns (uint256);
    function getTotalDepositValue(uint256 agreementId) external view returns (uint256);
    function getAgreementProgress(uint256 agreementId) external view returns (uint256);
    function estimateNFTValue(uint256 agreementId) external view returns (uint256);
    function totalAgreements() external view returns (uint256);
}

/**
 * @notice Interface para RoomFiVault
 * @dev Vault que genera yield sobre USDT deposits
 */
interface IRoomFiVault {
    function deposit(uint256 amount, address user) external;
    function withdraw(uint256 amount, address user) external returns (uint256 principal, uint256 yieldAmount);
    function calculateYield(address user) external view returns (uint256);
    function balanceOf(address user) external view returns (uint256);
    function getCurrentAPY() external view returns (uint256);
    function getTotalBalance() external view returns (uint256);
    function getUserInfo(address user) external view returns (
        uint256 depositAmount,
        uint256 yieldEarned,
        uint256 totalBalance,
        uint256 depositTimestamp,
        uint256 daysDeposited
    );
}

/**
 * @notice Interface para estrategias de yield farming
 * @dev Puede ser implementado por diferentes estrategias DeFi (Mantle protocols, etc)
 */
interface IYieldStrategy {
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external returns (bytes32 withdrawId);
    function harvestYield() external returns (uint256 yieldEarned);
    function balanceOf(address vault) external view returns (uint256);
    function getAPY() external view returns (uint256);
    function getDeploymentInfo() external view returns (
        uint256 total,
        uint256 lending,
        uint256 dex,
        uint256 lendingPercent,
        uint256 dexPercent
    );
}

/**
 * @notice Interface para RentalAgreementFactoryNFT
 * @dev Callbacks que RentalAgreementNFT debe llamar para mantener estado sincronizado
 */
interface IRentalAgreementFactoryNFT {
    function notifyAgreementActivated(uint256 agreementId) external;
    function notifyAgreementCompleted(uint256 agreementId) external;
    function notifyAgreementTerminated(uint256 agreementId, address initiator) external;
}
