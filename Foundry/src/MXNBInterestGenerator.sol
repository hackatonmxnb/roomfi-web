// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MXNBInterestGenerator
 * @author RoomFi Team
 * @notice Bóveda (vault) segura para generar intereses sobre depósitos de tokens MXNB.
 * @dev Simula un protocolo de "yield farming". Este contrato está protegido con controles
 *      de acceso (Ownable), pausa de emergencia (Pausable) y defensas contra ataques
 *      de re-entrada (ReentrancyGuard).
 */
contract MXNBInterestGenerator is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- Constantes del Contrato ---
    IERC20 public immutable mxnbToken;
    uint256 public constant APR = 500; // 5% APR (500 / 10000 = 0.05)
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant SECONDS_IN_YEAR = 31_536_000;

    // --- Variables de Estado ---
    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public depositTimestamps;

    // --- Eventos ---
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount, uint256 interestEarned);

    /**
     * @notice Inicializa el contrato con la dirección del token y el dueño.
     * @param _mxnbTokenAddress La dirección del token ERC20 (MXNB).
     * @param _initialOwner La dirección que será dueña del contrato y tendrá permisos administrativos.
     */
    constructor(address _mxnbTokenAddress, address _initialOwner) Ownable(_initialOwner) {
        require(_mxnbTokenAddress != address(0), "Direccion de token invalida");
        mxnbToken = IERC20(_mxnbTokenAddress);
    }

    // --- Funciones de Pausa (Seguridad) ---
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // --- Lógica Principal ---

    /**
     * @notice Deposita tokens en la bóveda. El usuario debe aprobar a este contrato primero.
     * @dev Si ya existe un depósito, se capitalizan los intereses y se suman al nuevo depósito.
     *      La función está protegida contra re-entradas y puede ser pausada.
     * @param _amount La cantidad de tokens a depositar.
     */
    function deposit(uint256 _amount) external nonReentrant whenNotPaused {
        require(_amount > 0, "El monto a depositar debe ser mayor a 0");

        uint256 currentDeposit = userDeposits[msg.sender];

        if (currentDeposit > 0) {
            uint256 interest = calculateInterest(msg.sender);
            currentDeposit += interest;
        }

        userDeposits[msg.sender] = currentDeposit + _amount;
        depositTimestamps[msg.sender] = block.timestamp;

        mxnbToken.safeTransferFrom(msg.sender, address(this), _amount);
        emit Deposited(msg.sender, _amount);
    }

    /**
     * @notice Retira una cantidad de tokens de la bóveda.
     * @dev Antes de retirar, se capitalizan los intereses. El timestamp del depósito se resetea.
     *      La función está protegida contra re-entradas y puede ser pausada.
     * @param _amount La cantidad a retirar. No puede ser mayor al balance total.
     */
    function withdraw(uint256 _amount) external nonReentrant whenNotPaused {
        uint256 currentDeposit = userDeposits[msg.sender];
        uint256 interest = calculateInterest(msg.sender);
        uint256 totalBalance = currentDeposit + interest;

        require(_amount > 0, "El monto a retirar debe ser mayor a 0");
        require(_amount <= totalBalance, "Retiro excede el balance total");

        currentDeposit = totalBalance - _amount;
        
        userDeposits[msg.sender] = currentDeposit;
        depositTimestamps[msg.sender] = block.timestamp;

        mxnbToken.safeTransfer(msg.sender, _amount);
        emit Withdrawn(msg.sender, _amount, interest);
    }

    // --- Funciones de Vista ---

    /**
     * @notice Calcula el interés ganado por un usuario hasta el momento.
     * @param _user La dirección del usuario.
     * @return El monto del interés ganado.
     */
    function calculateInterest(address _user) public view returns (uint256) {
        if (depositTimestamps[_user] == 0) {
            return 0;
        }
        uint256 timeElapsed = block.timestamp - depositTimestamps[_user];
        // Interes = (Principal * Tasa * Tiempo) / (Puntos_Base * Segundos_en_un_año)
        return (userDeposits[_user] * APR * timeElapsed) / (BASIS_POINTS * SECONDS_IN_YEAR);
    }

    /**
     * @notice Devuelve el balance total de un usuario (depósito + intereses).
     * @param _user La dirección del usuario.
     * @return El balance total.
     */
    function balanceOf(address _user) public view returns (uint256) {
        return userDeposits[_user] + calculateInterest(_user);
    }
}
