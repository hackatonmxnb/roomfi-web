// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title MXNBInterestGenerator
 * @author Gemini
 * @notice Este contrato actua como una boveda (vault) que genera intereses
 * para los depositos de tokens MXNB. Simula un protocolo de yield.
 */
contract MXNBInterestGenerator {
    using SafeERC20 for IERC20;

    IERC20 public immutable mxnbToken;

    // 5% APR. Se usa 500 para evitar decimales (500 / 10000 = 0.05)
    uint256 public constant APR = 500; 
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant SECONDS_IN_YEAR = 31_536_000;

    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public depositTimestamps;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    constructor(address _mxnbTokenAddress) {
        require(_mxnbTokenAddress != address(0), "Invalid token address");
        mxnbToken = IERC20(_mxnbTokenAddress);
    }

    /**
     * @notice Calcula el interes ganado por un usuario hasta el momento.
     * @param _user La direccion del usuario.
     * @return El monto del interes ganado.
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
     * @notice Devuelve el balance total de un usuario (deposito + intereses).
     * @param _user La direccion del usuario.
     * @return El balance total.
     */
    function balanceOf(address _user) public view returns (uint256) {
        return userDeposits[_user] + calculateInterest(_user);
    }

    /**
     * @notice Deposita tokens en la boveda. El usuario debe aprobar este contrato primero.
     * Si ya existe un deposito, se cosecha el interes y se añade al nuevo deposito.
     * @param _amount La cantidad de tokens a depositar.
     */
    function deposit(uint256 _amount) external {
        require(_amount > 0, "Deposit amount must be greater than 0");

        // Si hay un deposito previo, se calcula el interes, se suma al capital y se actualiza el timestamp.
        if (userDeposits[msg.sender] > 0) {
            uint256 interest = calculateInterest(msg.sender);
            userDeposits[msg.sender] += interest;
        }

        userDeposits[msg.sender] += _amount;
        depositTimestamps[msg.sender] = block.timestamp;

        mxnbToken.safeTransferFrom(msg.sender, address(this), _amount);
        emit Deposited(msg.sender, _amount);
    }

    /**
     * @notice Retira una cantidad especifica de tokens de la boveda.
     * @param _amount La cantidad a retirar. No puede ser mayor al balance total.
     */
    function withdraw(uint256 _amount) external {
        uint256 currentBalance = balanceOf(msg.sender);
        require(_amount > 0, "Withdraw amount must be greater than 0");
        require(_amount <= currentBalance, "Cannot withdraw more than balance");

        uint256 interest = calculateInterest(msg.sender);
        userDeposits[msg.sender] += interest; // Cosecha y actualiza el capital
        userDeposits[msg.sender] -= _amount;  // Reduce el capital por el monto retirado
        
        depositTimestamps[msg.sender] = block.timestamp; // Resetea el tiempo del deposito

        mxnbToken.safeTransfer(msg.sender, _amount);
        emit Withdrawn(msg.sender, _amount);
    }
}
