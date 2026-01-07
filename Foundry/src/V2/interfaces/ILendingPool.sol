// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ILendingPool
 * @notice Interface para Lendle Pool (fork de Aave V3)
 * @dev Lendle usa la misma interface que Aave V3 Pool
 *
 * Documentación: https://docs.lendle.xyz
 * Basado en: Aave V3 Core
 */
interface ILendingPool {
    /**
     * @notice Deposita assets en el lending pool
     * @param asset Address del token a depositar (USDT, USDC, etc)
     * @param amount Cantidad a depositar
     * @param onBehalfOf Address que recibirá los aTokens
     * @param referralCode Código de referral (0 si no hay)
     */
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external;

    /**
     * @notice Retira assets del lending pool
     * @param asset Address del token a retirar
     * @param amount Cantidad a retirar (use type(uint256).max para retirar todo)
     * @param to Address que recibirá los tokens
     * @return uint256 Cantidad real retirada
     */
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256);

    /**
     * @notice Obtiene datos de una reserve (asset)
     * @param asset Address del asset
     * @return ReserveData Struct con información de la reserve
     */
    function getReserveData(address asset) external view returns (ReserveData memory);

    /**
     * @notice Obtiene configuration de una reserve
     * @param asset Address del asset
     * @return ReserveConfigurationMap Configuration bitmap
     */
    function getConfiguration(address asset) external view returns (ReserveConfigurationMap memory);

    /**
     * @notice Obtiene los datos de cuenta de un usuario
     * @param user Address del usuario
     * @return totalCollateralBase Total colateral en base currency
     * @return totalDebtBase Total deuda en base currency
     * @return availableBorrowsBase Capacidad de borrowing disponible
     * @return currentLiquidationThreshold Threshold de liquidación actual
     * @return ltv Loan to value ratio
     * @return healthFactor Factor de salud de la posición
     */
    function getUserAccountData(address user)
        external
        view
        returns (
            uint256 totalCollateralBase,
            uint256 totalDebtBase,
            uint256 availableBorrowsBase,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        );
}

/**
 * @notice Datos de una reserve
 */
struct ReserveData {
    ReserveConfigurationMap configuration;
    uint128 liquidityIndex;
    uint128 currentLiquidityRate;      // APY de depósito
    uint128 variableBorrowIndex;
    uint128 currentVariableBorrowRate;  // APY de borrow variable
    uint128 currentStableBorrowRate;    // APY de borrow estable
    uint40 lastUpdateTimestamp;
    uint16 id;
    address aTokenAddress;              // Address del aToken (receipt token)
    address stableDebtTokenAddress;
    address variableDebtTokenAddress;
    address interestRateStrategyAddress;
    uint128 accruedToTreasury;
    uint128 unbacked;
    uint128 isolationModeTotalDebt;
}

/**
 * @notice Configuration map de una reserve
 */
struct ReserveConfigurationMap {
    uint256 data;
}

/**
 * @title IAToken
 * @notice Interface para aTokens (receipt tokens de Lendle)
 * @dev Los aTokens representan el balance depositado + intereses acumulados
 */
interface IAToken {
    /**
     * @notice Retorna el balance de aTokens de un usuario
     * @param user Address del usuario
     * @return uint256 Balance incluyendo intereses acumulados
     */
    function balanceOf(address user) external view returns (uint256);

    /**
     * @notice Retorna el balance escalado (sin intereses)
     * @param user Address del usuario
     * @return uint256 Balance sin intereses
     */
    function scaledBalanceOf(address user) external view returns (uint256);

    /**
     * @notice Address del underlying asset (e.g., USDT)
     */
    function UNDERLYING_ASSET_ADDRESS() external view returns (address);

    /**
     * @notice Address del pool
     */
    function POOL() external view returns (address);
}
