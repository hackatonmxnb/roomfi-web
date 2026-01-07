// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./MockAToken.sol";
import "../../src/V2/interfaces/ILendingPool.sol";

/**
 * @title MockLendlePool
 * @notice Mock implementation of Lendle Protocol (Aave V3 fork on Mantle)
 * @dev Simulates core lending pool functionality for testing
 *
 * Real Lendle behavior:
 * - Users deposit USDT, receive aUSDT
 * - aUSDT balance grows with interest (liquidity index)
 * - Users can withdraw underlying + interest by burning aUSDT
 * - Interest rates are dynamic based on utilization
 * - Multiple reserves (USDT, USDC, WETH, etc.)
 *
 * This mock:
 * - Simplified to single reserve (USDT)
 * - Fixed 6% APY
 * - 1:1 mint/burn of aTokens
 * - Interest accrues via MockAToken
 */
contract MockLendlePool is ILendingPool {
    using SafeERC20 for IERC20;

    struct MockReserveData {
        address aTokenAddress;
        uint128 currentLiquidityRate; // APY in ray (27 decimals)
        uint128 currentVariableBorrowRate;
        bool isActive;
        uint256 totalLiquidity;
    }

    mapping(address => MockReserveData) public reserves;

    uint256 public constant RAY = 1e27;
    uint256 public constant APY_6_PERCENT = 60000000000000000000000000; // 6% in ray

    event Supply(
        address indexed reserve,
        address indexed user,
        uint256 amount,
        uint16 referralCode
    );

    event Withdraw(
        address indexed reserve,
        address indexed user,
        address indexed to,
        uint256 amount
    );

    event ReserveDataUpdated(
        address indexed reserve,
        uint256 liquidityRate
    );

    /**
     * @notice Initialize a reserve (setup aToken)
     * @param asset Address of underlying asset (e.g., USDT)
     * @param aToken Address of corresponding aToken
     */
    function initializeReserve(address asset, address aToken) external {
        require(asset != address(0), "Invalid asset");
        require(aToken != address(0), "Invalid aToken");

        reserves[asset] = MockReserveData({
            aTokenAddress: aToken,
            currentLiquidityRate: uint128(APY_6_PERCENT),
            currentVariableBorrowRate: 0,
            isActive: true,
            totalLiquidity: 0
        });

        emit ReserveDataUpdated(asset, APY_6_PERCENT);
    }

    /**
     * @notice Supply (deposit) underlying asset to the protocol
     * @param asset Address of underlying asset
     * @param amount Amount to supply
     * @param onBehalfOf Address that will receive the aTokens
     * @param referralCode Referral code for integrators
     */
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external override {
        require(amount > 0, "Amount must be > 0");

        MockReserveData storage reserve = reserves[asset];
        require(reserve.isActive, "Reserve not active");

        // Transfer underlying asset from user to pool
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

        // Mint aTokens to user (1:1 ratio)
        MockAToken aToken = MockAToken(reserve.aTokenAddress);
        aToken.mint(onBehalfOf, amount);

        reserve.totalLiquidity += amount;

        emit Supply(asset, msg.sender, amount, referralCode);
    }

    /**
     * @notice Withdraw underlying asset from the protocol
     * @param asset Address of underlying asset
     * @param amount Amount to withdraw (uint256.max for full balance)
     * @param to Address that will receive the underlying
     * @return amountWithdrawn Actual amount withdrawn
     */
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external override returns (uint256 amountWithdrawn) {
        MockReserveData storage reserve = reserves[asset];
        require(reserve.isActive, "Reserve not active");

        MockAToken aToken = MockAToken(reserve.aTokenAddress);

        // If amount is max uint256, withdraw full balance
        uint256 userBalance = aToken.balanceOf(msg.sender);
        if (amount == type(uint256).max) {
            amount = userBalance;
        }

        require(amount <= userBalance, "Insufficient aToken balance");
        require(amount <= reserve.totalLiquidity, "Insufficient pool liquidity");

        // Burn aTokens (includes interest)
        aToken.burn(msg.sender, amount);

        // Transfer underlying asset to user
        IERC20(asset).safeTransfer(to, amount);

        reserve.totalLiquidity -= amount;
        amountWithdrawn = amount;

        emit Withdraw(asset, msg.sender, to, amount);

        return amountWithdrawn;
    }

    /**
     * @notice Get reserve configuration data
     * @param asset Address of underlying asset
     * @return Configuration data as bitmap
     */
    function getConfiguration(address asset)
        external
        view
        override
        returns (ReserveConfigurationMap memory)
    {
        MockReserveData storage reserve = reserves[asset];

        // Simplified configuration
        return ReserveConfigurationMap({
            data: reserve.isActive ? 1 : 0
        });
    }

    /**
     * @notice Get user account data
     * @param user Address of the user
     * @return totalCollateralBase Total collateral in base currency
     * @return totalDebtBase Total debt in base currency
     * @return availableBorrowsBase Available borrows in base currency
     * @return currentLiquidationThreshold Current liquidation threshold
     * @return ltv Loan to value ratio
     * @return healthFactor Health factor
     */
    function getUserAccountData(address user)
        external
        view
        override
        returns (
            uint256 totalCollateralBase,
            uint256 totalDebtBase,
            uint256 availableBorrowsBase,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        )
    {
        // Simplified - just return supply balance
        // In real Lendle, this calculates across all reserves
        totalCollateralBase = 0;
        totalDebtBase = 0;
        availableBorrowsBase = 0;
        currentLiquidationThreshold = 8500; // 85%
        ltv = 7500; // 75%
        healthFactor = type(uint256).max; // No debt = infinite health

        return (
            totalCollateralBase,
            totalDebtBase,
            availableBorrowsBase,
            currentLiquidationThreshold,
            ltv,
            healthFactor
        );
    }

    /**
     * @notice Get reserve data
     * @param asset Address of the underlying asset
     */
    function getReserveData(address asset) external view override returns (ReserveData memory) {
        MockReserveData storage reserve = reserves[asset];

        // Convert our internal struct to the interface struct
        return ReserveData({
            configuration: ReserveConfigurationMap({data: reserve.isActive ? 1 : 0}),
            liquidityIndex: 0,
            currentLiquidityRate: reserve.currentLiquidityRate,
            variableBorrowIndex: 0,
            currentVariableBorrowRate: reserve.currentVariableBorrowRate,
            currentStableBorrowRate: 0,
            lastUpdateTimestamp: uint40(block.timestamp),
            id: 0,
            aTokenAddress: reserve.aTokenAddress,
            stableDebtTokenAddress: address(0),
            variableDebtTokenAddress: address(0),
            interestRateStrategyAddress: address(0),
            accruedToTreasury: 0,
            unbacked: 0,
            isolationModeTotalDebt: 0
        });
    }

    /**
     * @notice Get simplified reserve data (for internal use)
     */
    function getSimplifiedReserveData(address asset) external view returns (
        address aTokenAddress,
        uint128 currentLiquidityRate,
        uint256 totalLiquidity
    ) {
        MockReserveData storage reserve = reserves[asset];
        return (
            reserve.aTokenAddress,
            reserve.currentLiquidityRate,
            reserve.totalLiquidity
        );
    }

    /**
     * @notice Get reserve APY in basis points
     */
    function getReserveAPY(address asset) external view returns (uint256) {
        MockReserveData storage reserve = reserves[asset];
        // Convert from ray (27 decimals) to basis points
        return (uint256(reserve.currentLiquidityRate) * 10000) / RAY;
    }

    /**
     * @notice Check if reserve is active
     */
    function isReserveActive(address asset) external view returns (bool) {
        return reserves[asset].isActive;
    }

    /**
     * @notice Get aToken address for asset
     */
    function getATokenAddress(address asset) external view returns (address) {
        return reserves[asset].aTokenAddress;
    }

    /**
     * @notice Emergency withdraw (for testing only)
     */
    function emergencyWithdraw(address asset, address to, uint256 amount) external {
        IERC20(asset).safeTransfer(to, amount);
    }

    /**
     * @notice Set APY for testing
     */
    function setAPY(address asset, uint128 apyInRay) external {
        reserves[asset].currentLiquidityRate = apyInRay;
        emit ReserveDataUpdated(asset, apyInRay);
    }
}
