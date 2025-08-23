// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ITenantPassport
 * @notice Interfaz para interactuar con el contrato de NFTs "TenantPassport".
 * @dev Define las funciones necesarias para verificar la identidad y el historial
 *      de los participantes en la plataforma.
 */
interface ITenantPassport {
    function incrementPropertiesOwned(uint256 tokenId) external;
    function balanceOf(address owner) external view returns (uint256);
    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256);
}

/**
 * @title IMXNBInterestGenerator
 * @notice Interfaz para el generador de intereses (la "bóveda").
 * @dev Permite a este contrato depositar y retirar fondos para generar rendimientos.
 */
interface IMXNBInterestGenerator {
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function balanceOf(address user) external view returns (uint256);
}

/**
 * @title PropertyInterestPool ---
 * @author Firrton
 * @notice Contrato para crear "pools" de financiamiento colectivo para el alquiler de propiedades.
 * @dev Orquesta la lógica de negocio para que arrendadores e inquilinos colaboren.
 *      Los fondos pueden ser depositados en una bóveda para generar intereses.
 *      Hereda de Ownable para la gestión de roles y de Pausable para la seguridad.
 */
contract PropertyInterestPool is Ownable, Pausable {
    using SafeERC20 for IERC20;

    // Estados del Pool 
    // Define el ciclo de vida de una propiedad en la plataforma.
    enum State {
        OPEN,      // Abierto: Aceptando inquilinos. El arrendador puede cancelar.
        FUNDING,   // Financiación: Grupo completo. Ya no se puede cancelar. Se recolecta la renta.
        LEASED,    // Arrendado: Renta financiada y reclamada por el arrendador.
        CANCELED   // Cancelado: El pool fue cancelado por el arrendador (solo posible en estado OPEN).
    }

    // Estructura de la Propiedad ---
    // Almacena la información de cada propiedad listada.
    // Optimizada para reducir costos de gas mediante "struct packing".
    struct Property {
        string name;
        string description;
        
        // --- Slot de Storage Empaquetado (32 bytes) ---
        // Agrupar estas variables en un solo slot ahorra gas en cada escritura.
        address landlord;           // 20 bytes
        State state;                // 1 byte
        uint8 paymentDayStart;      // 1 byte
        uint8 paymentDayEnd;        // 1 byte
        // Total: 23 bytes. ¡Cabe en un solo slot de 32 bytes!

        // --- Slots de Storage Individuales ---
        uint256 totalRentAmount;
        uint256 seriousnessDeposit;
        uint256 requiredTenantCount;
        uint256 amountPooledForRent;
        uint256 amountInVault;
        
        // --- Mapeos y Arrays Dinámicos ---
        address[] interestedTenants;
        mapping(address => bool) isInterested; // Optimización para búsquedas O(1)
        mapping(address => uint256) tenantDeposits;
    }

    // --- Variables de Estado ---
    IERC20 public immutable mxnbToken;
    ITenantPassport public immutable tenantPassport;
    IMXNBInterestGenerator public immutable interestGenerator;

    mapping(uint256 => Property) public properties;
    uint256 public propertyCounter;

    mapping(address => uint256[]) public landlordProperties;

    // --- Eventos ---
    event PropertyCreated(uint256 indexed propertyId, address indexed landlord, uint256 totalRent);
    event InterestExpressed(uint256 indexed propertyId, address indexed tenant, uint256 depositAmount);
    event GroupFinalized(uint256 indexed propertyId);
    event RentFunded(uint256 indexed propertyId, address indexed tenant, uint256 amount);
    event LeaseClaimed(uint256 indexed propertyId, address landlord, uint256 rentAmount);
    event InterestWithdrawn(uint256 indexed propertyId, address indexed tenant, uint256 depositAmount);
    event PoolCanceled(uint256 indexed propertyId);
    event LandlordFundsAdded(uint256 indexed propertyId, uint256 amount);
    event FundsDepositedToVault(uint256 indexed propertyId, uint256 amount);
    event FundsWithdrawnFromVault(uint256 indexed propertyId, uint256 amount);

    // --- Modificadores ---
    modifier onlyState(uint256 _propertyId, State _state) {
        require(properties[_propertyId].state == _state, "Estado incorrecto");
        _;
    }

    modifier onlyLandlord(uint256 _propertyId) {
        require(properties[_propertyId].landlord == msg.sender, "No eres el arrendador");
        _;
    }

    // --- Constructor ---
    constructor(
        address _mxnbTokenAddress,
        address _tenantPassportAddress,
        address _interestGeneratorAddress,
        address initialOwner
    ) Ownable(initialOwner) {
        mxnbToken = IERC20(_mxnbTokenAddress);
        tenantPassport = ITenantPassport(_tenantPassportAddress);
        interestGenerator = IMXNBInterestGenerator(_interestGeneratorAddress);
    }

    // --- Funciones de Pausa (Seguridad) ---
    
    /**
     * @notice Pausa el contrato en caso de emergencia.
     * @dev Solo el "owner" puede llamar a esta función.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Reanuda el contrato si estaba pausado.
     * @dev Solo el "owner" puede llamar a esta función.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // --- Funciones Principales ---

    /**
     * @notice Publica una nueva propiedad para que los inquilinos puedan unirse.
     * @dev Valida los datos de entrada para asegurar la integridad del pool.
     */
    function createPropertyPool(
        string calldata _name,
        string calldata _description,
        uint256 _totalRent,
        uint256 _seriousnessDeposit,
        uint256 _tenantCount,
        uint8 _paymentDayStart,
        uint8 _paymentDayEnd
    ) external whenNotPaused {
        require(_tenantCount > 0, "Debe haber al menos 1 inquilino");
        require(_totalRent % _tenantCount == 0, "La renta debe ser divisible entre los inquilinos");
        require(_paymentDayStart >= 1 && _paymentDayStart <= 31, "Dia de inicio invalido");
        require(_paymentDayEnd >= 1 && _paymentDayEnd <= 31, "Dia de fin invalido");
        require(_paymentDayEnd >= _paymentDayStart, "El rango de dias es invalido");

        propertyCounter++;
        uint256 propertyId = propertyCounter;

        landlordProperties[msg.sender].push(propertyId);

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

        require(tenantPassport.balanceOf(msg.sender) > 0, "El arrendador necesita un Tenant Passport");
        uint256 landlordTokenId = tenantPassport.tokenOfOwnerByIndex(msg.sender, 0);
        tenantPassport.incrementPropertiesOwned(landlordTokenId);

        emit PropertyCreated(propertyId, msg.sender, _totalRent);
    }

    /**
     * @notice Permite a un inquilino mostrar interés en una propiedad depositando una garantía.
     * @dev El pool pasa a "Financiación" automáticamente cuando se alcanza el número de inquilinos.
     */
    function expressInterest(uint256 _propertyId) external whenNotPaused onlyState(_propertyId, State.OPEN) {
        require(_propertyId > 0 && _propertyId <= propertyCounter, "La propiedad no existe");
        Property storage property = properties[_propertyId];
        require(!property.isInterested[msg.sender], "Ya mostraste interes");

        property.tenantDeposits[msg.sender] = property.seriousnessDeposit;
        property.interestedTenants.push(msg.sender);
        property.isInterested[msg.sender] = true;
        
        mxnbToken.safeTransferFrom(msg.sender, address(this), property.seriousnessDeposit);
        
        emit InterestExpressed(_propertyId, msg.sender, property.seriousnessDeposit);

        if (property.interestedTenants.length == property.requiredTenantCount) {
            property.state = State.FUNDING;
            emit GroupFinalized(_propertyId);
        }
    }

    /**
     * @notice Un inquilino del grupo paga su parte de la renta.
     * @dev El monto a pagar es la parte de la renta menos el depósito de seriedad ya entregado.
     */
    function fundRent(uint256 _propertyId) external whenNotPaused onlyState(_propertyId, State.FUNDING) {
        Property storage property = properties[_propertyId];
        require(property.isInterested[msg.sender], "No eres un inquilino del grupo");
        
        uint256 rentShare = property.totalRentAmount / property.requiredTenantCount;
        uint256 amountToPay = rentShare - property.tenantDeposits[msg.sender];
        
        property.amountPooledForRent += rentShare;
        
        mxnbToken.safeTransferFrom(msg.sender, address(this), amountToPay);
        
        emit RentFunded(_propertyId, msg.sender, rentShare);
    }

    /**
     * @notice El arrendador reclama la renta total una vez que todos los inquilinos han pagado.
     */
    function claimLease(uint256 _propertyId) external whenNotPaused onlyLandlord(_propertyId) {
        Property storage property = properties[_propertyId];
        require(property.amountPooledForRent >= property.totalRentAmount, "La renta aun no esta completa");
        
        property.state = State.LEASED;
        
        mxnbToken.safeTransfer(property.landlord, property.totalRentAmount);
        
        emit LeaseClaimed(_propertyId, property.landlord, property.totalRentAmount);
    }

    /**
     * @notice El arrendador cancela el pool.
     * @dev ¡Mejora de seguridad! Solo se puede cancelar si el pool está en estado "OPEN".
     *      Esto protege a los inquilinos que ya se comprometieron.
     */
    function cancelPool(uint256 _propertyId) external onlyLandlord(_propertyId) onlyState(_propertyId, State.OPEN) {
        properties[_propertyId].state = State.CANCELED;
        emit PoolCanceled(_propertyId);
    }

    /**
     * @notice Un inquilino retira su depósito si el pool fue cancelado.
     */
    function withdrawInterest(uint256 _propertyId) external onlyState(_propertyId, State.CANCELED) {
        Property storage property = properties[_propertyId];
        uint256 depositAmount = property.tenantDeposits[msg.sender];
        
        require(depositAmount > 0, "No tienes deposito para retirar");
        
        property.tenantDeposits[msg.sender] = 0;
        
        mxnbToken.safeTransfer(msg.sender, depositAmount);
        
        emit InterestWithdrawn(_propertyId, msg.sender, depositAmount);
    }

    // --- Funciones de Gestión de la Bóveda ---

    /**
     * @notice El arrendador puede añadir fondos extra al pool (ej. para completar la renta).
     */
    function addLandlordFunds(uint256 _propertyId, uint256 _amount) external whenNotPaused onlyLandlord(_propertyId) {
        require(_amount > 0, "El monto debe ser positivo");
        properties[_propertyId].amountPooledForRent += _amount;
        mxnbToken.safeTransferFrom(msg.sender, address(this), _amount);
        emit LandlordFundsAdded(_propertyId, _amount);
    }

    /**
     * @notice El arrendador deposita los fondos del pool en la bóveda para generar intereses.
     */
    function depositToVault(uint256 _propertyId) external whenNotPaused onlyLandlord(_propertyId) {
        Property storage property = properties[_propertyId];
        uint256 amountToDeposit = property.amountPooledForRent;
        require(amountToDeposit > 0, "No hay fondos para depositar");

        property.amountPooledForRent = 0;
        property.amountInVault += amountToDeposit;

        // Se aprueba el monto exacto para que la bóveda lo pueda depositar.
        // Usamos approve() directamente, ya que safeApprove() está obsoleto.
        mxnbToken.approve(address(interestGenerator), amountToDeposit);
        interestGenerator.deposit(amountToDeposit);

        emit FundsDepositedToVault(_propertyId, amountToDeposit);
    }

    /**
     * @notice El arrendador retira fondos de la bóveda de vuelta al pool.
     */
    function withdrawFromVault(uint256 _propertyId, uint256 _amount) external whenNotPaused onlyLandlord(_propertyId) {
        Property storage property = properties[_propertyId];
        require(_amount > 0, "El monto debe ser positivo");
        require(property.amountInVault >= _amount, "Fondos insuficientes en la boveda");

        property.amountInVault -= _amount;
        property.amountPooledForRent += _amount;

        interestGenerator.withdraw(_amount);

        emit FundsWithdrawnFromVault(_propertyId, _amount);
    }

    // --- Funciones de Vista (solo lectura) ---

    /**
     * @notice Devuelve la información completa de una propiedad.
     */
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
            State state,
            uint8 paymentDayStart,
            uint8 paymentDayEnd
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
            p.state,
            p.paymentDayStart,
            p.paymentDayEnd
        );
    }

    /**
     * @notice Devuelve la lista de inquilinos interesados en una propiedad.
     * @dev Se separa de getPropertyInfo para evitar problemas de ABI con arrays dinámicos.
     */
    function getInterestedTenants(uint256 _propertyId) public view returns (address[] memory) {
        return properties[_propertyId].interestedTenants;
    }

    /**
     * @notice Devuelve los IDs de las propiedades de un arrendador.
     */
    function getPropertiesByLandlord(address _landlord) public view returns (uint256[] memory) {
        return landlordProperties[_landlord];
    }
}
