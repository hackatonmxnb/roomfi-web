// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IMXNBInterestGenerator
 * @notice Interfaz para el contrato MXNBInterestGenerator.
 */
interface IMXNBInterestGenerator {
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function balanceOf(address user) external view returns (uint256);
    function calculateInterest(address user) external view returns (uint256);
}
