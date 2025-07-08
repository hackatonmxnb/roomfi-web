// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Interfaz para interactuar con TenantPassport
interface ITenantPassport {
    function incrementPropertiesOwned(uint256 tokenId) external;
}


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
    ITenantPassport public tenantPassport; // NUEVO: Instancia del contrato TenantPassport

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

    modifier onlyState(uint256 _propertyId, State _state) {
        require(properties[_propertyId].state == _state, "Property not in correct state");
        _;
    }

    modifier onlyLandlord(uint256 _propertyId) {
        require(properties[_propertyId].landlord == msg.sender, "Only landlord can call this");
        _;
    }

    // ACTUALIZADO: El constructor ahora también acepta la dirección del TenantPassport
    constructor(address _mxnbtTokenAddress, address _tenantPassportAddress) {
        mxnbtToken = IERC20(_mxnbtTokenAddress);
        tenantPassport = ITenantPassport(_tenantPassportAddress);
    }

    // ACTUALIZADO: Ahora llama al contrato TenantPassport para actualizar el historial
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

        // NUEVO: Incrementar el contador de propiedades en el NFT del landlord
        uint256 landlordTokenId = uint256(uint160(msg.sender));
        tenantPassport.incrementPropertiesOwned(landlordTokenId);

        emit PropertyCreated(propertyId, msg.sender, _totalRent);
    }

    function expressInterest(uint256 _propertyId) external onlyState(_propertyId, State.OPEN) {
        require(propertyCounter >= _propertyId && _propertyId > 0, "Property does not exist");
        require(!_isInterested(_propertyId, msg.sender), "Already expressed interest");

        Property storage property = properties[_propertyId];
        
        property.tenantDeposits[msg.sender] = property.seriousnessDeposit;
        property.interestedTenants.push(msg.sender);

        mxnbtToken.safeTransferFrom(msg.sender, address(this), property.seriousnessDeposit);

        emit InterestExpressed(_propertyId, msg.sender, property.seriousnessDeposit);

        if (property.interestedTenants.length == property.requiredTenantCount) {
            property.state = State.FUNDING;
            emit GroupFinalized(_propertyId);
        }
    }

    function fundRent(uint256 _propertyId) external onlyState(_propertyId, State.FUNDING) {
        require(_isInterested(_propertyId, msg.sender), "Not an interested tenant");

        Property storage property = properties[_propertyId];
        uint256 rentShare = property.totalRentAmount / property.requiredTenantCount;
        uint256 amountToPay = rentShare - property.tenantDeposits[msg.sender];

        property.amountPooledForRent += rentShare;

        mxnbtToken.safeTransferFrom(msg.sender, address(this), amountToPay);

        emit RentFunded(_propertyId, msg.sender, rentShare);
    }

    function claimLease(uint256 _propertyId) external onlyLandlord(_propertyId) {
        Property storage property = properties[_propertyId];
        require(property.amountPooledForRent == property.totalRentAmount, "Rent not fully funded");

        property.state = State.LEASED;

        mxnbtToken.safeTransfer(property.landlord, property.totalRentAmount);

        emit LeaseClaimed(_propertyId, property.landlord, property.totalRentAmount);
    }

    function cancelPool(uint256 _propertyId) external onlyLandlord(_propertyId) {
        State currentState = properties[_propertyId].state;
        require(currentState == State.OPEN || currentState == State.FUNDING, "Pool can only be canceled if OPEN or FUNDING");
        
        properties[_propertyId].state = State.CANCELED;
        emit PoolCanceled(_propertyId);
    }

    function withdrawInterest(uint256 _propertyId) external onlyState(_propertyId, State.CANCELED) {
        Property storage property = properties[_propertyId];
        uint256 depositAmount = property.tenantDeposits[msg.sender];
        require(depositAmount > 0, "No deposit to withdraw");

        property.tenantDeposits[msg.sender] = 0;

        mxnbtToken.safeTransfer(msg.sender, depositAmount);

        emit InterestWithdrawn(_propertyId, msg.sender, depositAmount);
    }

    function _isInterested(uint256 _propertyId, address _tenant) internal view returns (bool) {
        address[] memory tenants = properties[_propertyId].interestedTenants;
        for (uint i = 0; i < tenants.length; i++) {
            if (tenants[i] == _tenant) {
                return true;
            }
        }
        return false;
    }

    // NUEVA FUNCIÓN: Devuelve los detalles de la propiedad sin el mapping, para ser compatible con el ABI.
    function getPropertyInfo(uint256 _propertyId) 
        public 
        view 
        returns (address, uint256, uint256, uint256, uint256, address[] memory, State)
    {
        Property storage p = properties[_propertyId];
        return (
            p.landlord,
            p.totalRentAmount,
            p.seriousnessDeposit,
            p.requiredTenantCount,
            p.amountPooledForRent,
            p.interestedTenants,
            p.state
        );
    }
}