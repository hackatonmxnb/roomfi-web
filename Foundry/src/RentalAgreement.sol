// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./tokens/TenantPassport.sol";
import "./interfaces/IMXNBInterestGenerator.sol";

/**
 * @title RentalAgreement
 * @author RoomFi Team
 * @notice Contrato que representa un acuerdo de alquiler entre un arrendador y sus inquilinos.
 * @dev Gestiona la recolección de fondos, pagos de renta y la reputación de los inquilinos.
 *      Hereda de Ownable, Pausable y ReentrancyGuard para máxima seguridad.
 */
contract RentalAgreement is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- Constantes de Reputación ---
    uint32 private constant MAX_REPUTATION = 100;
    uint32 private constant REPUTATION_ON_TIME_PAYMENT = 1;
    uint32 private constant REPUTATION_MISSED_PAYMENT = 5;

    // --- Estados del Contrato ---
    enum AgreementState { FUNDING, ACTIVE, COMPLETED, CANCELLED }

    // --- Variables de Estado ---
    TenantPassport public immutable tenantPassport;
    IERC20 public immutable mxnbToken;
    IMXNBInterestGenerator public immutable interestGenerator;

    address public immutable landlord;
    address[] public tenants;
    mapping(address => bool) public isTenant;
    mapping(address => uint256) public tenantPassportId;

    uint256 public immutable rentAmount; // Renta mensual total.
    uint256 public immutable depositAmount; // Depósito en garantía.
    uint256 public immutable totalGoal; // Meta inicial a recaudar (depósito + 1er mes).

    uint256 public fundsPooled; // Fondos acumulados en el contrato.
    mapping(address => uint256) public tenantContributions;

    AgreementState public currentState;
    uint256 public paymentDueDate; // Fecha límite para el próximo pago de renta.

    // --- Eventos ---
    event FundsDeposited(address indexed tenant, uint256 amount);
    event AgreementActivated(uint256 totalAmount, uint256 nextDueDate);
    event RentPaid(address indexed tenant, uint256 amount, bool onTime);
    event VaultDeposit(address indexed caller, uint256 amount);
    event VaultWithdrawal(address indexed caller, uint256 amount);

    // --- Modificadores ---
    modifier onlyTenant() {
        require(isTenant[msg.sender], "No eres un inquilino de este contrato");
        _;
    }

    modifier onlyLandlord() {
        require(msg.sender == landlord, "No eres el arrendador");
        _;
    }

    modifier inState(AgreementState _state) {
        require(currentState == _state, "Accion no permitida en el estado actual");
        _;
    }

    /**
     * @notice Crea un nuevo contrato de arrendamiento.
     * @param _landlord La dirección del arrendador.
     * @param _tenants La lista de direcciones de los inquilinos.
     * @param _passportIds Los IDs de los NFTs "TenantPassport" de cada inquilino.
     * @param _rentAmount El monto de la renta mensual.
     * @param _depositAmount El monto del depósito en garantía.
     * @param _paymentDueDate La primera fecha de vencimiento del pago (timestamp).
     * @param _passportAddress La dirección del contrato TenantPassport.
     * @param _tokenAddress La dirección del token de pago (MXNB).
     * @param _interestGeneratorAddress La dirección de la bóveda de rendimientos.
     * @param _initialOwner El dueño del contrato, quien podrá pausarlo en emergencias.
     */
    constructor(
        address _landlord,
        address[] memory _tenants,
        uint256[] memory _passportIds,
        uint256 _rentAmount,
        uint256 _depositAmount,
        uint256 _paymentDueDate,
        address _passportAddress,
        address _tokenAddress,
        address _interestGeneratorAddress,
        address _initialOwner
    ) Ownable(_initialOwner) {
        require(_tenants.length == _passportIds.length, "Inquilinos y IDs de pasaporte no coinciden");
        require(_tenants.length > 0, "Debe haber al menos un inquilino");
        require(_interestGeneratorAddress != address(0), "Direccion de boveda invalida");

        landlord = _landlord;
        rentAmount = _rentAmount;
        depositAmount = _depositAmount;
        paymentDueDate = _paymentDueDate;
        tenantPassport = TenantPassport(_passportAddress);
        mxnbToken = IERC20(_tokenAddress);
        interestGenerator = IMXNBInterestGenerator(_interestGeneratorAddress);

        totalGoal = depositAmount + rentAmount;
        currentState = AgreementState.FUNDING;

        for (uint i = 0; i < _tenants.length; i++) {
            address tenant = _tenants[i];
            require(tenant != address(0), "Direccion de inquilino invalida");
            isTenant[tenant] = true;
            tenants.push(tenant);
            tenantPassportId[tenant] = _passportIds[i];
        }
    }

    // --- Funciones de Pausa (Seguridad) ---
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // --- Lógica de Pagos ---

    /**
     * @notice Un inquilino deposita su parte del fondo inicial (depósito + primer mes).
     * @dev Protegido contra re-entrada para mayor seguridad.
     */
    function deposit(uint256 amount) external nonReentrant whenNotPaused onlyTenant inState(AgreementState.FUNDING) {
        require(amount > 0, "El monto debe ser mayor a 0");
        
        tenantContributions[msg.sender] += amount;
        fundsPooled += amount;

        mxnbToken.safeTransferFrom(msg.sender, address(this), amount);

        emit FundsDeposited(msg.sender, amount);

        if (fundsPooled >= totalGoal) {
            currentState = AgreementState.ACTIVE;
            emit AgreementActivated(fundsPooled, paymentDueDate);
        }
    }

    /**
     * @notice Un inquilino paga su parte de la renta mensual.
     * @dev Actualiza la reputación del inquilino en su TenantPassport según si paga a tiempo.
     */
    function payRent() external nonReentrant whenNotPaused onlyTenant inState(AgreementState.ACTIVE) {
        uint256 paymentAmount = rentAmount / tenants.length;
        require(paymentAmount > 0, "El monto de la renta debe ser positivo");

        // Lógica para determinar si el pago está a tiempo.
        // En un sistema real, block.timestamp se compararía con paymentDueDate.
        bool onTime = block.timestamp <= paymentDueDate;

        // Actualiza la fecha para el siguiente pago.
        paymentDueDate += 30 days;

        // Transfiere los fondos.
        mxnbToken.safeTransferFrom(msg.sender, address(this), paymentAmount);

        // --- Actualización de Reputación en el NFT ---
        uint256 passportId = tenantPassportId[msg.sender];
        TenantPassport.TenantInfo memory currentInfo = tenantPassport.getTenantInfo(passportId);

        uint32 newReputation = currentInfo.reputation;
        uint32 newPaymentsMade = currentInfo.paymentsMade;
        uint32 newPaymentsMissed = currentInfo.paymentsMissed;

        if (onTime) {
            newPaymentsMade++;
            if (newReputation < MAX_REPUTATION) {
                newReputation = newReputation + REPUTATION_ON_TIME_PAYMENT > MAX_REPUTATION 
                    ? MAX_REPUTATION 
                    : newReputation + REPUTATION_ON_TIME_PAYMENT;
            }
        } else {
            newPaymentsMissed++;
            if (newReputation > REPUTATION_MISSED_PAYMENT) {
                newReputation -= REPUTATION_MISSED_PAYMENT;
            } else {
                newReputation = 0;
            }
        }
        
        tenantPassport.updateTenantInfo(
            passportId,
            newReputation,
            newPaymentsMade,
            newPaymentsMissed,
            0 // Se asume que el pago liquida cualquier saldo pendiente.
        );

        emit RentPaid(msg.sender, paymentAmount, onTime);
    }

    // --- Gestión de Fondos y Bóveda ---

    /**
     * @notice El arrendador deposita fondos en la bóveda para generar intereses.
     * @param _amount La cantidad a depositar.
     */
    function depositToVault(uint256 _amount) external nonReentrant onlyLandlord {
        require(_amount > 0, "El monto debe ser mayor a 0");
        require(mxnbToken.balanceOf(address(this)) >= _amount, "Balance insuficiente");

        mxnbToken.approve(address(interestGenerator), _amount);
        interestGenerator.deposit(_amount);

        emit VaultDeposit(msg.sender, _amount);
    }

    /**
     * @notice El arrendador retira fondos de la bóveda de vuelta a este contrato.
     */
    function withdrawFromVault(uint256 _amount) external nonReentrant onlyLandlord {
        require(_amount > 0, "El monto debe ser mayor a 0");
        interestGenerator.withdraw(_amount);
        emit VaultWithdrawal(msg.sender, _amount);
    }

    /**
     * @notice El arrendador retira la renta acumulada.
     * @dev Medida de seguridad: No se puede retirar más que la renta acumulada,
     *      dejando el depósito en garantía intacto hasta el fin del contrato.
     */
    function landlordWithdraw(uint256 _amount) external nonReentrant onlyLandlord inState(AgreementState.ACTIVE) {
        require(_amount > 0, "El monto debe ser mayor a 0");
        uint256 withdrawableRent = mxnbToken.balanceOf(address(this)) - depositAmount;
        require(_amount <= withdrawableRent, "No puedes retirar mas que la renta acumulada");
        
        mxnbToken.safeTransfer(landlord, _amount);
    }

    // --- Funciones de Vista ---

    /**
     * @notice Devuelve el balance total que este contrato tiene en la bóveda (capital + intereses).
     */
    function getVaultBalance() external view returns (uint256) {
        return interestGenerator.balanceOf(address(this));
    }
}