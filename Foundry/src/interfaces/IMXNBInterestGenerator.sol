// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Interfaz para el Generador de Intereses MXNB (IMXNBInterestGenerator)
 * @author RoomFi Team
 * @notice Esta interfaz define las funciones esenciales que el contrato `MXNBInterestGenerator`
 * debe implementar. Permite que otros contratos interactúen con la bóveda de rendimientos
 * de una manera estandarizada y segura, sin necesidad de conocer su código fuente completo.
 * Las funciones aquí definidas son el punto de entrada para depositar, retirar y consultar
 * balances y rendimientos.
 */
interface IMXNBInterestGenerator {
    
    /**
     * @notice Deposita una cantidad de tokens en la bóveda.
     * @param amount La cantidad de tokens a depositar.
     */
    function deposit(uint256 amount) external;

    /**
     * @notice Retira una cantidad de tokens de la bóveda.
     * @param amount La cantidad de tokens a retirar.
     */
    function withdraw(uint256 amount) external;

    /**
     * @notice Consulta el balance total (capital + intereses) de un usuario.
     * @param user La dirección del usuario a consultar.
     * @return El balance total.
     */
    function balanceOf(address user) external view returns (uint256);

    /**
     * @notice Calcula el interés acumulado para un usuario.
     * @param user La dirección del usuario.
     * @return El monto del interés ganado.
     */
    function calculateInterest(address user) external view returns (uint256);
}