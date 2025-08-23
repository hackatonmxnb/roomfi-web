// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TenantPassport
 * @author RoomFi Team
 * @notice NFT (ERC721) que funciona como un pasaporte de identidad y reputación on-chain.
 * @dev Este contrato crea un sistema de confianza descentralizado. La potestad de actualizar
 *      la reputación se delega a los contratos de alquiler, eliminando el control centralizado.
 */
contract TenantPassport is ERC721Enumerable, Ownable {
    
    /**
     * @notice Estructura de datos optimizada para la información del titular del pasaporte.
     * @dev Se utiliza "struct packing" con tipos de datos pequeños (uint32, uint8) para
     *      reducir drásticamente los costos de gas en las operaciones de escritura (storage).
     * @param reputation Puntuación de 0 a 100.
     * @param paymentsMade Contador de pagos a tiempo (hasta 4.2 mil millones).
     * @param paymentsMissed Contador de pagos fallidos (hasta 4.2 mil millones).
     * @param propertiesOwned Contador de propiedades gestionadas (hasta 4.2 mil millones).
     * @param outstandingBalance Saldo pendiente de pago (en la unidad más pequeña del token).
     */
    struct TenantInfo {
        uint32 reputation;
        uint32 paymentsMade;
        uint32 paymentsMissed;
        uint32 propertiesOwned;
        uint256 outstandingBalance;
    }

    mapping(uint256 => TenantInfo) public tenantInfo;
    
    address public rentalAgreementAddress; // DEPRECATED: Se gestionará por contrato de alquiler.
    address public propertyInterestPoolAddress;

    // --- Modificadores de Acceso ---

    modifier onlyPropertyInterestPool() {
        require(msg.sender == propertyInterestPoolAddress, "Accion solo para el Property Interest Pool");
        _;
    }

    // NOTA: En una implementación futura y más compleja, en lugar de una sola dirección
    // para `rentalAgreementAddress`, se podría usar un mapping o un registro para
    // autorizar a MÚLTIPLES contratos de alquiler a actualizar la información.
    modifier onlyRentalAgreement() {
        require(msg.sender == rentalAgreementAddress, "Accion solo para un Contrato de Alquiler");
        _;
    }

    /**
     * @notice Inicializa el NFT. El desplegador es el dueño inicial (Owner).
     */
    constructor(address initialOwner) ERC721("Tenant Passport", "TP") Ownable(initialOwner) {}

    /**
     * @notice Permite a cualquier usuario acuñar su propio y único pasaporte.
     * @dev El ID del token se deriva de la dirección del usuario para asegurar unicidad.
     *      Este es el ÚNICO método para crear pasaportes, garantizando un proceso descentralizado.
     */
    function mintForSelf() external {
        uint256 tokenId = uint256(uint160(msg.sender));
        require(ownerOf(tokenId) == address(0), "Ya tienes un pasaporte");
        _mint(msg.sender, tokenId);
        tenantInfo[tokenId] = TenantInfo({
            reputation: 100,
            paymentsMade: 0,
            paymentsMissed: 0,
            propertiesOwned: 0,
            outstandingBalance: 0
        });
    }

    /**
     * @notice Incrementa el contador de propiedades de un arrendador.
     * @dev Llamado por el PropertyInterestPool cuando un arrendador crea un nuevo pool.
     */
    function incrementPropertiesOwned(uint256 tokenId) external onlyPropertyInterestPool {
        tenantInfo[tokenId].propertiesOwned++;
    }

    /**
     * @notice Actualiza la reputación y pagos de un pasaporte.
     * @dev ¡Mejora de Seguridad! Esta función ahora solo puede ser llamada por un contrato
     *      de alquiler autorizado, no por el dueño del contrato. Esto descentraliza el poder.
     */
    function updateTenantInfo(
        uint256 tokenId,
        uint32 newReputation,
        uint32 paymentsMade,
        uint32 paymentsMissed,
        uint256 outstandingBalance
    ) external onlyRentalAgreement {
        TenantInfo storage info = tenantInfo[tokenId];
        info.reputation = newReputation;
        info.paymentsMade = paymentsMade;
        info.paymentsMissed = paymentsMissed;
        info.outstandingBalance = outstandingBalance;
    }

    /**
     * @notice Devuelve la información de un pasaporte específico.
     */
    function getTenantInfo(uint256 tokenId) external view returns (TenantInfo memory) {
        return tenantInfo[tokenId];
    }

    // --- Funciones Administrativas (Solo para el Dueño) ---

    /**
     * @notice Establece la dirección del contrato de alquiler autorizado.
     * @dev El dueño puede cambiar qué contrato tiene permiso para actualizar la reputación.
     */
    function setRentalAgreementAddress(address _rentalAgreementAddress) external onlyOwner {
        require(_rentalAgreementAddress != address(0), "Direccion invalida");
        rentalAgreementAddress = _rentalAgreementAddress;
    }

    /**
     * @notice Establece la dirección del contrato de pools de propiedades.
     */
    function setPropertyInterestPoolAddress(address _poolAddress) external onlyOwner {
        require(_poolAddress != address(0), "Direccion invalida");
        propertyInterestPoolAddress = _poolAddress;
    }

    // --- Overrides de OpenZeppelin ---

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
