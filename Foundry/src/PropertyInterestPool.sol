// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Interfaz para interactuar con TenantPassport
interface ITenantPassport {
    function incrementPropertiesOwned(uint256 tokenId) external;
    function balanceOf(address owner) external view returns (uint256);
    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256);
}

// --- NUEVO: Interfaz para interactuar con la Bóveda de Intereses ---
interface IMXNBInterestGenerator {
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function balanceOf(address user) external view returns (uint256);
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
        string name; // --- NUEVO ---
        string description; // --- NUEVO ---
        address landlord;
        uint256 totalRentAmount;
        uint256 seriousnessDeposit;
        uint256 requiredTenantCount;
        uint256 amountPooledForRent;
        uint256 amountInVault; 
        address[] interestedTenants;
        mapping(address => uint256) tenantDeposits;
        State state;
        uint256 paymentDayStart;
        uint256 paymentDayEnd;
    }

    IERC20 public mxnbToken;
    ITenantPassport public tenantPassport;
    IMXNBInterestGenerator public interestGenerator; // --- NUEVO: Instancia del contrato de la Bóveda

    mapping(uint256 => Property) public properties;
    uint256 public propertyCounter;

    // --- Eventos ---
    event PropertyCreated(uint256 indexed propertyId, address indexed landlord, uint256 totalRent);
    event InterestExpressed(uint256 indexed propertyId, address indexed tenant, uint256 depositAmount);
    event GroupFinalized(uint256 indexed propertyId);
    event RentFunded(uint256 indexed propertyId, address indexed tenant, uint256 amount);
    event LeaseClaimed(uint256 indexed propertyId, address landlord, uint256 rentAmount);
    event InterestWithdrawn(uint256 indexed propertyId, address indexed tenant, uint256 depositAmount);
    event PoolCanceled(uint256 indexed propertyId);
    // --- NUEVOS EVENTOS ---
    event LandlordFundsAdded(uint256 indexed propertyId, uint256 amount);
    event FundsDepositedToVault(uint256 indexed propertyId, uint256 amount);
    event FundsWithdrawnFromVault(uint256 indexed propertyId, uint256 amount);


    modifier onlyState(uint256 _propertyId, State _state) {
        require(properties[_propertyId].state == _state, "Property not in correct state");
        _;
    }

    modifier onlyLandlord(uint256 _propertyId) {
        require(properties[_propertyId].landlord == msg.sender, "Only landlord can call this");
        _;
    }

    // --- ACTUALIZADO: El constructor ahora acepta la dirección de la Bóveda ---
    constructor(address _mxnbTokenAddress, address _tenantPassportAddress, address _interestGeneratorAddress) {
        mxnbToken = IERC20(_mxnbTokenAddress);
        tenantPassport = ITenantPassport(_tenantPassportAddress);
        interestGenerator = IMXNBInterestGenerator(_interestGeneratorAddress);
    }

    function createPropertyPool(
        string memory _name,
        string memory _description,
        uint256 _totalRent,
        uint256 _seriousnessDeposit,
        uint256 _tenantCount,
        uint256 _paymentDayStart,
        uint256 _paymentDayEnd
    ) external {
        require(_tenantCount > 0, "Tenant count must be greater than 0");
        require(_totalRent % _tenantCount == 0, "Rent must be divisible by tenant count");
        require(_paymentDayStart >= 1 && _paymentDayStart <= 31, "Payment start day must be between 1 and 31");
        require(_paymentDayEnd >= 1 && _paymentDayEnd <= 31, "Payment end day must be between 1 and 31");
        require(_paymentDayEnd >= _paymentDayStart, "Payment end day must be greater than or equal to start day");

        propertyCounter++;
        uint256 propertyId = propertyCounter;

        Property storage newProperty = properties[propertyId];
        newProperty.name = _name;
        newProperty.description = _description;
        newProperty.landlord = msg.sender;
        newProperty.totalRentAmount = _totalRent;
        newProperty.seriousnessDeposit = _seriousnessDeposit;
        newProperty.requiredTenantCount = _tenantCount;
        newProperty.state = State.OPEN;
        newProperty.paymentDayStart = _paymentDayStart;
        newProperty.paymentDayEnd = _paymentDayEnd;

        uint256 landlordPassportBalance = tenantPassport.balanceOf(msg.sender);
        require(landlordPassportBalance > 0, "Landlord must have a Tenant Passport NFT");
        uint256 landlordTokenId = tenantPassport.tokenOfOwnerByIndex(msg.sender, 0);
        tenantPassport.incrementPropertiesOwned(landlordTokenId);

        emit PropertyCreated(propertyId, msg.sender, _totalRent);
    }

    // --- Lógica existente (sin cambios) ---
    function expressInterest(uint256 _propertyId) external onlyState(_propertyId, State.OPEN) {
        require(propertyCounter >= _propertyId && _propertyId > 0, "Property does not exist");
        require(!_isInterested(_propertyId, msg.sender), "Already expressed interest");
        Property storage property = properties[_propertyId];
        property.tenantDeposits[msg.sender] = property.seriousnessDeposit;
        property.interestedTenants.push(msg.sender);
        mxnbToken.safeTransferFrom(msg.sender, address(this), property.seriousnessDeposit);
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
        mxnbToken.safeTransferFrom(msg.sender, address(this), amountToPay);
        emit RentFunded(_propertyId, msg.sender, rentShare);
    }

    function claimLease(uint256 _propertyId) external onlyLandlord(_propertyId) {
        Property storage property = properties[_propertyId];
        require(property.amountPooledForRent == property.totalRentAmount, "Rent not fully funded");
        property.state = State.LEASED;
        mxnbToken.safeTransfer(property.landlord, property.totalRentAmount);
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
        mxnbToken.safeTransfer(msg.sender, depositAmount);
        emit InterestWithdrawn(_propertyId, msg.sender, depositAmount);
    }

    // --- NUEVAS FUNCIONES DE GESTIÓN DE BÓVEDA ---

    function addLandlordFunds(uint256 _propertyId, uint256 _amount) external onlyLandlord(_propertyId) {
        require(_amount > 0, "Amount must be positive");
        properties[_propertyId].amountPooledForRent += _amount;
        mxnbToken.safeTransferFrom(msg.sender, address(this), _amount);
        emit LandlordFundsAdded(_propertyId, _amount);
    }

    function depositToVault(uint256 _propertyId) external onlyLandlord(_propertyId) {
        Property storage property = properties[_propertyId];
        uint256 amountToDeposit = property.amountPooledForRent;
        require(amountToDeposit > 0, "No funds in pool to deposit");

        property.amountPooledForRent = 0;
        property.amountInVault += amountToDeposit;

        mxnbToken.approve(address(interestGenerator), amountToDeposit);
        interestGenerator.deposit(amountToDeposit);

        emit FundsDepositedToVault(_propertyId, amountToDeposit);
    }

    function withdrawFromVault(uint256 _propertyId, uint256 _amount) external onlyLandlord(_propertyId) {
        Property storage property = properties[_propertyId];
        require(_amount > 0, "Amount must be positive");
        require(property.amountInVault >= _amount, "Withdraw amount exceeds vault balance");

        property.amountInVault -= _amount;
        property.amountPooledForRent += _amount;

        interestGenerator.withdraw(_amount);

        emit FundsWithdrawnFromVault(_propertyId, _amount);
    }

    // --- Funciones de Vista ---

    function _isInterested(uint256 _propertyId, address _tenant) internal view returns (bool) {
        address[] memory tenants = properties[_propertyId].interestedTenants;
        for (uint i = 0; i < tenants.length; i++) {
            if (tenants[i] == _tenant) {
                return true;
            }
        }
        return false;
    }

    // --- ACTUALIZADO: Devuelve también amountInVault ---
    function getPropertyInfo(uint256 _propertyId) 
        public 
        view 
        returns (
            string memory name,
            string memory description,
            address landlord,
            uint256 totalRentAmount,
            uint256 seriousnessDeposit,
            uint256 requiredTenantCount,
            uint256 amountPooledForRent,
            uint256 amountInVault,
            address[] memory interestedTenants,
            State state,
            uint256 paymentDayStart,
            uint256 paymentDayEnd
        )
    {
        Property storage p = properties[_propertyId];
        return (
            p.name,
            p.description,
            p.landlord,
            p.totalRentAmount,
            p.seriousnessDeposit,
            p.requiredTenantCount,
            p.amountPooledForRent,
            p.amountInVault,
            p.interestedTenants,
            p.state,
            p.paymentDayStart,
            p.paymentDayEnd
        );
    }
}
