// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PropertyInterestPool
 * @dev Manejamos los pool de liquidez dentro de este contrato, para personas serias dentro de la propiedad.
 */
contract PropertyInterestPool {
    using SafeERC20 for IERC20;

    enum State {
        OPEN,
        FUNDING,
        LEASED,
        CANCELED
    }

    struct Property {
        address landlord;
        uint256 totalRentAmount;
        uint256 seriousnessDeposit;
        uint256 requiredTenantCount;
        uint256 amountPooledForRent;
        address[] interestedTenants;
        mapping(address => uint256) tenantDeposits;
        State state;
    }

    IERC20 public mxnbtToken;

    /// @dev Mapeando la infrastructura de propiedades.
    mapping(uint256 => Property) public properties;

    /// @dev LA canditdad de propiedasdes que tiene el contrato.
    uint256 public propertyCounter;

    event PropertyCreated(uint256 indexed propertyId, address indexed landlord, uint256 totalRent);
    event InterestExpressed(uint256 indexed propertyId, address indexed tenant, uint256 depositAmount);
    event GroupFinalized(uint256 indexed propertyId);
    event RentFunded(uint256 indexed propertyId, address indexed tenant, uint256 amount);
    event LeaseClaimed(uint256 indexed propertyId, address landlord, uint256 rentAmount);
    event InterestWithdrawn(uint256 indexed propertyId, address indexed tenant, uint256 depositAmount);
    event PoolCanceled(uint256 indexed propertyId);

    /**
     * @dev Modifier to ensure a function is called only when the property is in a specific state.
     * @param _propertyId The ID of the property to check.
     * @param _state The required state.
     */
    modifier onlyState(uint256 _propertyId, State _state) {
        require(properties[_propertyId].state == _state, "Property not in correct state");
        _;
    }

    /**
     * @dev Modifier to ensure a function is called only by the landlord of the property.
     * @param _propertyId The ID of the property to check.
     */
    modifier onlyLandlord(uint256 _propertyId) {
        require(properties[_propertyId].landlord == msg.sender, "Only landlord can call this");
        _;
    }

    /**
     * @dev Sets the address of the MXNBT token.
     * @param _mxnbtTokenAddress The address of the ERC20 token contract.
     */
    constructor(address _mxnbtTokenAddress) {
        mxnbtToken = IERC20(_mxnbtTokenAddress);
    }

    /**
     * @dev Creates a new property interest pool.
     * @param _totalRent The total monthly rent for the property.
     * @param _seriousnessDeposit The deposit required from each interested tenant.
     * @param _tenantCount The number of tenants required to fund the rent.
     */
    function createPropertyPool(uint256 _totalRent, uint256 _seriousnessDeposit, uint256 _tenantCount) external {
        require(_tenantCount > 0, "Tenant count must be greater than 0");
        require(_totalRent % _tenantCount == 0, "Rent must be divisible by tenant count");

        propertyCounter++;
        uint256 propertyId = propertyCounter;

        Property storage newProperty = properties[propertyId];
        newProperty.landlord = msg.sender;
        newProperty.totalRentAmount = _totalRent;
        newProperty.seriousnessDeposit = _seriousnessDeposit;
        newProperty.requiredTenantCount = _tenantCount;
        newProperty.state = State.OPEN;

        emit PropertyCreated(propertyId, msg.sender, _totalRent);
    }

    /**
     * @dev Allows a user to express interest in a property by paying a seriousness deposit.
     * @param _propertyId The ID of the property.
     */
    function expressInterest(uint256 _propertyId) external onlyState(_propertyId, State.OPEN) {
        require(propertyCounter >= _propertyId && _propertyId > 0, "Property does not exist");
        require(!_isInterested(_propertyId, msg.sender), "Already expressed interest");

        Property storage property = properties[_propertyId];
        
        // Effects
        property.tenantDeposits[msg.sender] = property.seriousnessDeposit;
        property.interestedTenants.push(msg.sender);

        // Interaction
        mxnbtToken.safeTransferFrom(msg.sender, address(this), property.seriousnessDeposit);

        emit InterestExpressed(_propertyId, msg.sender, property.seriousnessDeposit);

        if (property.interestedTenants.length == property.requiredTenantCount) {
            property.state = State.FUNDING;
            emit GroupFinalized(_propertyId);
        }
    }

    /**
     * @dev Allows a tenant to fund their share of the rent.
     * @param _propertyId The ID of the property.
     */
    function fundRent(uint256 _propertyId) external onlyState(_propertyId, State.FUNDING) {
        require(_isInterested(_propertyId, msg.sender), "Not an interested tenant");

        Property storage property = properties[_propertyId];
        uint256 rentShare = property.totalRentAmount / property.requiredTenantCount;
        uint256 amountToPay = rentShare - property.tenantDeposits[msg.sender];

        // Effects
        property.amountPooledForRent += rentShare;

        // Interaction
        mxnbtToken.safeTransferFrom(msg.sender, address(this), amountToPay);

        emit RentFunded(_propertyId, msg.sender, rentShare);
    }

    /**
     * @dev Allows the landlord to claim the full rent amount once it's funded.
     * @param _propertyId The ID of the property.
     */
    function claimLease(uint256 _propertyId) external onlyLandlord(_propertyId) {
        Property storage property = properties[_propertyId];
        require(property.amountPooledForRent == property.totalRentAmount, "Rent not fully funded");

        // Effects
        property.state = State.LEASED;

        // Interaction
        mxnbtToken.safeTransfer(property.landlord, property.totalRentAmount);

        emit LeaseClaimed(_propertyId, property.landlord, property.totalRentAmount);
    }

    /**
     * @dev Allows the landlord to cancel a property pool before it is leased.
     * @param _propertyId The ID of the property to cancel.
     */
    function cancelPool(uint256 _propertyId) external onlyLandlord(_propertyId) {
        State currentState = properties[_propertyId].state;
        require(currentState == State.OPEN || currentState == State.FUNDING, "Pool can only be canceled if OPEN or FUNDING");
        
        properties[_propertyId].state = State.CANCELED;
        emit PoolCanceled(_propertyId);
    }

    /**
     * @dev Allows a tenant to withdraw their seriousness deposit if the pool is canceled.
     * @param _propertyId The ID of the property.
     */
    function withdrawInterest(uint256 _propertyId) external onlyState(_propertyId, State.CANCELED) {
        Property storage property = properties[_propertyId];
        uint256 depositAmount = property.tenantDeposits[msg.sender];
        require(depositAmount > 0, "No deposit to withdraw");

        // Effects
        property.tenantDeposits[msg.sender] = 0;

        // Interaction
        mxnbtToken.safeTransfer(msg.sender, depositAmount);

        emit InterestWithdrawn(_propertyId, msg.sender, depositAmount);
    }

    /**
     * @dev Internal function to check if a user is in the interested tenants list.
     * @param _propertyId The ID of the property.
     * @param _tenant The address of the user to check.
     * @return bool True if the user is an interested tenant, false otherwise.
     */
    function _isInterested(uint256 _propertyId, address _tenant) internal view returns (bool) {
        address[] memory tenants = properties[_propertyId].interestedTenants;
        for (uint i = 0; i < tenants.length; i++) {
            if (tenants[i] == _tenant) {
                return true;
            }
        }
        return false;
    }
}
