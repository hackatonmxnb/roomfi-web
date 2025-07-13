// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./tokens/TenantPassport.sol";
import "./interfaces/IMXNBInterestGenerator.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract RentalAgreement {
    using SafeERC20 for IERC20;


    enum AgreementState { Funding, Active, Completed, Cancelled }

    TenantPassport public tenantPassport;
    IERC20 public mxnbToken;
    IMXNBInterestGenerator public interestGenerator;

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
    uint256 public paymentDayStart;
    uint256 public paymentDayEnd;

    event FundsDeposited(address indexed tenant, uint256 amount);
    event AgreementActivated(uint256 totalAmount);
    event RentPaid(address indexed tenant, uint256 amount, bool onTime);
    event VaultDeposit(address indexed caller, uint256 amount);
    event VaultWithdrawal(address indexed caller, uint256 amount);

    modifier onlyTenant() {
        require(isTenant[msg.sender], "Only a tenant can call this");
        _;
    }

    modifier onlyLandlord() {
        require(msg.sender == landlord, "Only the landlord can call this");
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
        uint256 _paymentDayStart,
        uint256 _paymentDayEnd,
        address _passportAddress,
        address _tokenAddress,
        address _interestGeneratorAddress
    ) {
        require(_tenants.length == _passportIds.length, "Array lengths must match");
        require(_interestGeneratorAddress != address(0), "Invalid interest generator address");

        landlord = _landlord;
        rentAmount = _rentAmount;
        depositAmount = _depositAmount;
        paymentDayStart = _paymentDayStart;
        paymentDayEnd = _paymentDayEnd;
        tenantPassport = TenantPassport(_passportAddress);
        mxnbToken = IERC20(_tokenAddress);
        interestGenerator = IMXNBInterestGenerator(_interestGeneratorAddress);

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


    /**
     * @dev Permite al inquilino depositar su parte del fondo inicial (depósito + primer mes).
     * El inquilino debe haber aprobado el contrato para gastar sus tokens MXNBT de antemano.
     */
    function deposit(uint256 amount) external onlyTenant inState(AgreementState.Funding) {
        require(amount > 0, "El monto tiene que ser mayor a 0");
        
        mxnbToken.safeTransferFrom(msg.sender, address(this), amount);

        tenantContributions[msg.sender] += amount;
        fundsPooled += amount;
        emit FundsDeposited(msg.sender, amount);

        if (fundsPooled >= totalGoal) {
            currentState = AgreementState.Active;
            emit AgreementActivated(fundsPooled);
        }
    }

    /**
     * @dev Permite la paga de la renta
     */
    function payRent() external onlyTenant inState(AgreementState.Active) {
        // TODO: Implementar la lógica para verificar que el pago se realiza dentro de la ventana de pago.
        // Esto requeriría un oráculo para obtener el día del mes actual.
        // Por ahora, asumimos que el pago siempre está a tiempo.

        uint256 paymentAmount = rentAmount / tenants.length;
        
        mxnbToken.safeTransferFrom(msg.sender, address(this), paymentAmount);

        // Verificacion simple: verifica si se hizo el apgo en los 30 dias
        bool onTime = true; // Siempre true para la demo, ya que la verificación de fecha real requiere un oráculo        
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
    }


    /**
     * @notice Deposita fondos del contrato en la boveda de intereses. Solo el arrendador puede llamar.
     * @param _amount La cantidad a depositar.
     */
    function depositToVault(uint256 _amount) external onlyLandlord {
        require(_amount > 0, "Amount must be greater than 0");
        require(mxnbToken.balanceOf(address(this)) >= _amount, "Insufficient balance in contract");

        // Aprueba a la boveda para que gaste los tokens de este contrato
        mxnbToken.approve(address(interestGenerator), _amount);
        
        // Llama a la funcion de deposito de la boveda
        interestGenerator.deposit(_amount);

        emit VaultDeposit(msg.sender, _amount);
    }

    /**
     * @notice Retira fondos de la boveda de intereses al contrato. Solo el arrendador puede llamar.
     * @param _amount La cantidad a retirar.
     */
    function withdrawFromVault(uint256 _amount) external onlyLandlord {
        require(_amount > 0, "Amount must be greater than 0");
        
        // Llama a la funcion de retiro de la boveda
        interestGenerator.withdraw(_amount);

        emit VaultWithdrawal(msg.sender, _amount);
    }

    /**
     * @notice Permite al arrendador retirar los fondos acumulados (rentas) a su propia wallet.
     * @param _amount La cantidad a retirar.
     */
    function landlordWithdraw(uint256 _amount) external onlyLandlord {
        require(_amount > 0, "Amount must be greater than 0");
        require(mxnbToken.balanceOf(address(this)) >= _amount, "Insufficient balance in contract");
        
        mxnbToken.safeTransfer(landlord, _amount);
    }


    /**
     * @notice Devuelve el balance total de este contrato en la boveda de intereses.
     */
    function getVaultBalance() external view returns (uint256) {
        return interestGenerator.balanceOf(address(this));
    }
}
