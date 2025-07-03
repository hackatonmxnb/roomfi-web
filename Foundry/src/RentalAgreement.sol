// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./tokens/TenantPassport.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract RentalAgreement {
    // --- State ---

    enum AgreementState { Funding, Active, Completed, Cancelled }

    TenantPassport public tenantPassport;
    IERC20 public mxbntToken;

    address public landlord;
    address[] public tenants;
    mapping(address => bool) public isTenant;
    mapping(address => uint256) public tenantPassportId;

    uint256 public rentAmount;
    uint256 public depositAmount;
    uint256 public totalGoal;

    uint256 public fundsPooled;
    mapping(address => uint256) public tenantContributions;

    AgreementState public currentState;
    uint256 public lastPaymentDate;

    // --- Events ---
    event FundsDeposited(address indexed tenant, uint256 amount);
    event AgreementActivated(uint256 totalAmount);
    event RentPaid(address indexed tenant, uint256 amount, bool onTime);

    // --- Modifiers ---
    modifier onlyTenant() {
        require(isTenant[msg.sender], "Only a tenant can call this");
        _;
    }

    modifier inState(AgreementState _state) {
        require(currentState == _state, "Invalid state for this action");
        _;
    }

    // --- Constructor ---
    constructor(
        address _landlord,
        address[] memory _tenants,
        uint256[] memory _passportIds,
        uint256 _rentAmount,
        uint256 _depositAmount,
        address _passportAddress,
        address _tokenAddress
    ) {
        require(_tenants.length == _passportIds.length, "Array lengths must match");

        landlord = _landlord;
        rentAmount = _rentAmount;
        depositAmount = _depositAmount;
        tenantPassport = TenantPassport(_passportAddress);
        mxbntToken = IERC20(_tokenAddress);

        totalGoal = depositAmount + rentAmount;
        currentState = AgreementState.Funding;

        for (uint i = 0; i < _tenants.length; i++) {
            address tenant = _tenants[i];
            require(tenant != address(0), "Address del inquilino invalido");
            isTenant[tenant] = true;
            tenants.push(tenant);
            tenantPassportId[tenant] = _passportIds[i];
        }
        require(tenants.length > 0, "No tenants specified");
    }

    // --- Functions ---

    /**
     * @dev Permite al inquilino depositar su parte del fondo inicial (depósito + primer mes).
     * El inquilino debe haber aprobado el contrato para gastar sus tokens MXNBT de antemano.
     */
    function deposit(uint256 amount) external onlyTenant inState(AgreementState.Funding) {
        require(amount > 0, "El monto tiene que ser mayor a 0");
        
        // Transfiere tokens del user al contrato
        bool success = mxbntToken.transferFrom(msg.sender, address(this), amount);
        require(success, "Fallo la transferencia de tokens");

        tenantContributions[msg.sender] += amount;
        fundsPooled += amount;
        emit FundsDeposited(msg.sender, amount);

        if (fundsPooled >= totalGoal) {
            currentState = AgreementState.Active;
            lastPaymentDate = block.timestamp;
            emit AgreementActivated(fundsPooled);
        }
    }

    /**
     * @dev Permite la paga de la renta
     */
    function payRent() external onlyTenant inState(AgreementState.Active) {
        uint256 paymentAmount = rentAmount / tenants.length;
        
        bool success = mxbntToken.transferFrom(msg.sender, address(this), paymentAmount);
        require(success, "Token transfer failed");

        // Verificacion simple: verifica si se hizo el apgo en los 30 dias
        bool onTime = (block.timestamp <= lastPaymentDate + 30 days);
        
        // Sube al pasaporte lo que se hizo
        uint256 passportId = tenantPassportId[msg.sender];
        TenantPassport.TenantInfo memory currentInfo = tenantPassport.getTenantInfo(passportId);

        uint256 newReputation = currentInfo.reputation;
        uint256 newPaymentsMade = currentInfo.paymentsMade;
        uint256 newPaymentsMissed = currentInfo.paymentsMissed;
        uint256 newOutstandingBalance = 0; // Assuming payment clears outstanding balance

        if (onTime) {
            newPaymentsMade++;
            if (newReputation < 100) {
                newReputation = newReputation + 1 > 100 ? 100 : newReputation + 1;
            }
        } else {
            newPaymentsMissed++;
            if (newReputation > 0) {
                newReputation = newReputation - 5 < 0 ? 0 : newReputation - 5;
            }
        }
        
        tenantPassport.updateTenantInfo(
            passportId,
            newReputation,
            newPaymentsMade,
            newPaymentsMissed,
            newOutstandingBalance
        );

        emit RentPaid(msg.sender, paymentAmount, onTime);

        lastPaymentDate = block.timestamp;
    }
}
