// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../Interfaces.sol";

/**
 * @title USDYStrategy
 * @author RoomFi Team - Mantle Hackathon 2025
 * @notice Yield farming strategy using Ondo Finance USDY (US Treasury-backed token)
 * @dev Implements IYieldStrategy for RoomFiVault integration
 *
 * Strategy Flow:
 * 1. Vault calls deposit(amount) with USDT
 * 2. Strategy swaps USDT → USDY via DEX (Merchant Moe/Aurelius)
 * 3. USDY balance grows automatically (accumulating token)
 * 4. On withdraw: USDY → USDT swap
 * 5. Yield = (current USDY balance - initial deposits)
 *
 * Why Mantle-specific:
 * - USDY only available on Mantle + Ethereum mainnet
 * - Native integration with Mantle DEXs
 * - RWA (properties) backed by RWA (US Treasuries)
 *
 * APY: ~4.29% (backed by US Treasury bonds)
 */
contract USDYStrategy is IYieldStrategy, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /* State Variables */

    IERC20 public immutable usdt;
    IERC20 public immutable usdy;
    address public immutable vault;
    address public dexRouter;

    uint256 public totalDeployed; // Total USDT deployed (in USDT terms)
    uint256 public totalWithdrawn; // Total USDT withdrawn
    uint256 public accumulatedYield; // Total yield harvested

    uint256 public constant APY_BASIS_POINTS = 429; // 4.29% APY
    uint256 public constant SLIPPAGE_TOLERANCE_BP = 200; // 2% max slippage
    uint256 public constant BASIS_POINTS = 10000;

    // Deployment allocation
    uint256 public constant USDY_ALLOCATION_PERCENT = 100; // 100% to USDY

    /* Events */

    event Deposited(uint256 usdtAmount, uint256 usdyReceived, uint256 timestamp);
    event Withdrawn(uint256 usdyAmount, uint256 usdtReceived, bytes32 withdrawId, uint256 timestamp);
    event YieldHarvested(uint256 yieldAmount, uint256 timestamp);
    event DEXRouterUpdated(address oldRouter, address newRouter);
    event EmergencyWithdraw(uint256 usdtAmount, uint256 usdyAmount, uint256 timestamp);

    /* Errors */

    error OnlyVault();
    error ZeroAmount();
    error ZeroAddress();
    error InsufficientBalance();
    error SlippageTooHigh();
    error SwapFailed();

    /* Modifiers */

    modifier onlyVault() {
        if (msg.sender != vault) revert OnlyVault();
        _;
    }

    /* Constructor */

    constructor(
        address _usdt,
        address _usdy,
        address _dexRouter,
        address _vault,
        address initialOwner
    ) Ownable(initialOwner) {
        if (_usdt == address(0)) revert ZeroAddress();
        if (_usdy == address(0)) revert ZeroAddress();
        if (_dexRouter == address(0)) revert ZeroAddress();
        if (_vault == address(0)) revert ZeroAddress();

        usdt = IERC20(_usdt);
        usdy = IERC20(_usdy);
        dexRouter = _dexRouter;
        vault = _vault;
    }

    /* IYieldStrategy Implementation */

    /**
     * @notice Deposit USDT and swap to USDY for yield generation
     * @dev Called by vault when tenant pays security deposit
     * @param amount Amount of USDT to deploy
     */
    function deposit(uint256 amount) external override nonReentrant onlyVault {
        if (amount == 0) revert ZeroAmount();

        // Transfer USDT from vault
        usdt.safeTransferFrom(msg.sender, address(this), amount);

        // Swap USDT → USDY via DEX
        uint256 usdyReceived = _swapUSDTToUSDY(amount);

        totalDeployed += amount;

        emit Deposited(amount, usdyReceived, block.timestamp);
    }

    /**
     * @notice Withdraw USDT by swapping USDY back
     * @dev Called by vault when tenant completes rental or terminates
     * @param amount Amount of USDT to withdraw
     * @return withdrawId Unique identifier for withdraw (for XCM compatibility)
     */
    function withdraw(uint256 amount) external override nonReentrant onlyVault returns (bytes32 withdrawId) {
        if (amount == 0) revert ZeroAmount();

        // Calculate how much USDY we need to sell to get `amount` USDT
        // Account for slippage and fees
        uint256 usdyToSwap = _calculateUSDYNeeded(amount);

        uint256 usdyBalance = usdy.balanceOf(address(this));
        if (usdyBalance < usdyToSwap) revert InsufficientBalance();

        // Swap USDY → USDT
        uint256 usdtReceived = _swapUSDYToUSDT(usdyToSwap);

        // Ensure we got at least the requested amount
        require(usdtReceived >= amount, "Insufficient USDT received");

        // Transfer USDT back to vault
        usdt.safeTransfer(vault, amount);

        // If we got extra USDT due to yield, track it
        if (usdtReceived > amount) {
            uint256 extraYield = usdtReceived - amount;
            // Keep extra in strategy for next operations
        }

        totalWithdrawn += amount;

        // Generate unique withdraw ID
        withdrawId = keccak256(abi.encodePacked(block.timestamp, amount, msg.sender));

        emit Withdrawn(usdyToSwap, usdtReceived, withdrawId, block.timestamp);

        return withdrawId;
    }

    /**
     * @notice Harvest accumulated yield
     * @dev Calculates yield as (current USDY balance in USDT terms - initial deposits + withdrawn)
     * @return yieldEarned Amount of yield in USDT terms
     */
    function harvestYield() external override nonReentrant onlyVault returns (uint256 yieldEarned) {
        // Current value of USDY holdings in USDT terms
        uint256 currentValueUSDT = _getUSDYValueInUSDT(usdy.balanceOf(address(this)));

        // Net deposits = total deployed - total withdrawn
        uint256 netDeposits = totalDeployed > totalWithdrawn
            ? totalDeployed - totalWithdrawn
            : 0;

        // Yield = current value - net deposits
        yieldEarned = currentValueUSDT > netDeposits
            ? currentValueUSDT - netDeposits
            : 0;

        if (yieldEarned > 0) {
            accumulatedYield += yieldEarned;
            emit YieldHarvested(yieldEarned, block.timestamp);
        }

        return yieldEarned;
    }

    /**
     * @notice Get strategy's balance in USDT terms
     * @dev Returns current value of USDY holdings
     */
    function balanceOf(address) external view override returns (uint256) {
        return _getUSDYValueInUSDT(usdy.balanceOf(address(this)));
    }

    /**
     * @notice Get current APY
     * @return APY in basis points (429 = 4.29%)
     */
    function getAPY() external pure override returns (uint256) {
        return APY_BASIS_POINTS;
    }

    /**
     * @notice Get deployment info for dashboard
     */
    function getDeploymentInfo() external view override returns (
        uint256 total,
        uint256 lending,
        uint256 dex,
        uint256 lendingPercent,
        uint256 dexPercent
    ) {
        total = _getUSDYValueInUSDT(usdy.balanceOf(address(this)));
        lending = 0; // Not using lending
        dex = total; // All in USDY (which we treat as DEX-acquired asset)
        lendingPercent = 0;
        dexPercent = USDY_ALLOCATION_PERCENT;

        return (total, lending, dex, lendingPercent, dexPercent);
    }

    /* Internal Swap Functions */

    /**
     * @notice Swap USDT to USDY via DEX
     */
    function _swapUSDTToUSDY(uint256 usdtAmount) internal returns (uint256 usdyReceived) {
        // Approve DEX router
        usdt.forceApprove(dexRouter, usdtAmount);

        // Calculate minimum output with slippage tolerance
        uint256 expectedUSDY = _quoteUSDTToUSDY(usdtAmount);
        uint256 minUSDY = (expectedUSDY * (BASIS_POINTS - SLIPPAGE_TOLERANCE_BP)) / BASIS_POINTS;

        // Build swap path
        address[] memory path = new address[](2);
        path[0] = address(usdt);
        path[1] = address(usdy);

        // Execute swap
        uint256 usdyBefore = usdy.balanceOf(address(this));

        // Call DEX router
        (bool success, bytes memory data) = dexRouter.call(
            abi.encodeWithSignature(
                "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)",
                usdtAmount,
                minUSDY,
                path,
                address(this),
                block.timestamp + 300 // 5 min deadline
            )
        );

        if (!success) revert SwapFailed();

        uint256 usdyAfter = usdy.balanceOf(address(this));
        usdyReceived = usdyAfter - usdyBefore;

        if (usdyReceived < minUSDY) revert SlippageTooHigh();

        return usdyReceived;
    }

    /**
     * @notice Swap USDY to USDT via DEX
     */
    function _swapUSDYToUSDT(uint256 usdyAmount) internal returns (uint256 usdtReceived) {
        // Approve DEX router
        usdy.forceApprove(dexRouter, usdyAmount);

        // Calculate minimum output
        uint256 expectedUSDT = _quoteUSDYToUSDT(usdyAmount);
        uint256 minUSDT = (expectedUSDT * (BASIS_POINTS - SLIPPAGE_TOLERANCE_BP)) / BASIS_POINTS;

        // Build swap path
        address[] memory path = new address[](2);
        path[0] = address(usdy);
        path[1] = address(usdt);

        // Execute swap
        uint256 usdtBefore = usdt.balanceOf(address(this));

        (bool success,) = dexRouter.call(
            abi.encodeWithSignature(
                "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)",
                usdyAmount,
                minUSDT,
                path,
                address(this),
                block.timestamp + 300
            )
        );

        if (!success) revert SwapFailed();

        uint256 usdtAfter = usdt.balanceOf(address(this));
        usdtReceived = usdtAfter - usdtBefore;

        if (usdtReceived < minUSDT) revert SlippageTooHigh();

        return usdtReceived;
    }

    /* Quote Functions */

    /**
     * @notice Get quote for USDT → USDY swap
     */
    function _quoteUSDTToUSDY(uint256 usdtAmount) internal view returns (uint256) {
        (bool success, bytes memory data) = dexRouter.staticcall(
            abi.encodeWithSignature(
                "getAmountOut(uint256,address,address)",
                usdtAmount,
                address(usdt),
                address(usdy)
            )
        );

        if (success && data.length > 0) {
            return abi.decode(data, (uint256));
        }

        // Fallback: assume ~1:1 ratio
        return usdtAmount * 1e12; // Convert 6 decimals to 18 decimals
    }

    /**
     * @notice Get quote for USDY → USDT swap
     */
    function _quoteUSDYToUSDT(uint256 usdyAmount) internal view returns (uint256) {
        (bool success, bytes memory data) = dexRouter.staticcall(
            abi.encodeWithSignature(
                "getAmountOut(uint256,address,address)",
                usdyAmount,
                address(usdy),
                address(usdt)
            )
        );

        if (success && data.length > 0) {
            return abi.decode(data, (uint256));
        }

        // Fallback: assume ~1:1 ratio
        return usdyAmount / 1e12; // Convert 18 decimals to 6 decimals
    }

    /**
     * @notice Calculate how much USDY needed to get exact USDT amount
     */
    function _calculateUSDYNeeded(uint256 usdtAmount) internal view returns (uint256) {
        // Add 1% buffer for fees and slippage
        uint256 buffer = (usdtAmount * 101) / 100;
        return buffer * 1e12; // Convert to 18 decimals
    }

    /**
     * @notice Get value of USDY in USDT terms
     */
    function _getUSDYValueInUSDT(uint256 usdyAmount) internal view returns (uint256) {
        if (usdyAmount == 0) return 0;
        return _quoteUSDYToUSDT(usdyAmount);
    }

    /* Admin Functions */

    /**
     * @notice Update DEX router address
     */
    function updateDEXRouter(address newRouter) external onlyOwner {
        if (newRouter == address(0)) revert ZeroAddress();
        address oldRouter = dexRouter;
        dexRouter = newRouter;
        emit DEXRouterUpdated(oldRouter, newRouter);
    }

    /**
     * @notice Emergency withdraw all funds
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 usdtBalance = usdt.balanceOf(address(this));
        uint256 usdyBalance = usdy.balanceOf(address(this));

        if (usdtBalance > 0) {
            usdt.safeTransfer(owner(), usdtBalance);
        }

        if (usdyBalance > 0) {
            usdy.safeTransfer(owner(), usdyBalance);
        }

        emit EmergencyWithdraw(usdtBalance, usdyBalance, block.timestamp);
    }

    /* View Functions */

    /**
     * @notice Get current USDY balance
     */
    function getUSDYBalance() external view returns (uint256) {
        return usdy.balanceOf(address(this));
    }

    /**
     * @notice Get strategy stats
     */
    function getStrategyStats() external view returns (
        uint256 _totalDeployed,
        uint256 _totalWithdrawn,
        uint256 _accumulatedYield,
        uint256 _currentUSDYBalance,
        uint256 _currentValueUSDT
    ) {
        uint256 usdyBal = usdy.balanceOf(address(this));
        return (
            totalDeployed,
            totalWithdrawn,
            accumulatedYield,
            usdyBal,
            _getUSDYValueInUSDT(usdyBal)
        );
    }
}
