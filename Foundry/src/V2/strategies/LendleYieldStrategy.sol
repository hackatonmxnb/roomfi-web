// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../Interfaces.sol";
import "../interfaces/ILendingPool.sol";

/**
 * @title LendleYieldStrategy
 * @author RoomFi Team
 * @notice Yield farming strategy using Lendle Protocol on Mantle
 * @dev Lendle is an Aave V3 fork, native to Mantle Network
 *
 * How it works:
 * - Deposits USDT into Lendle lending pool
 * - Receives aUSDT (interest-bearing token)
 * - aUSDT balance grows automatically over time
 * - Typical APY: 4-8% on stablecoins
 *
 * Contract addresses (Mantle Mainnet):
 * - Pool: 0xCFa5aE7c2CE8Fadc6426C1ff872cA45378Fb7cF3
 * - USDT: 0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE
 */
contract LendleYieldStrategy is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    ILendingPool public immutable lendlePool;
    IERC20 public immutable usdt;
    IAToken public aUSDT;
    address public vault;

    uint256 public totalDeposited;
    uint256 public totalYieldHarvested;
    uint256 public lastHarvestTime;

    uint256 public constant MIN_DEPLOY_AMOUNT = 10 * 1e6; // 10 USDT

    event Deposited(uint256 amount, uint256 aTokensReceived, uint256 timestamp);
    event Withdrawn(uint256 amount, uint256 yieldEarned, uint256 timestamp);
    event YieldHarvested(uint256 yieldAmount, uint256 timestamp);
    event VaultUpdated(address indexed oldVault, address indexed newVault);
    event EmergencyWithdraw(uint256 amount, address to);

    error OnlyVault();
    error ZeroAddress();
    error ZeroAmount();
    error InsufficientBalance();
    error LendleSupplyFailed();
    error LendleWithdrawFailed();

    modifier onlyVault() {
        if (msg.sender != vault) revert OnlyVault();
        _;
    }

    /**
     * @param _lendlePool Lendle Pool address on Mantle
     * @param _usdt USDT token address on Mantle
     * @param _vault RoomFiVault address (authorized caller)
     */
    constructor(
        address _lendlePool,
        address _usdt,
        address _vault,
        address initialOwner
    ) Ownable(initialOwner) {
        if (_lendlePool == address(0)) revert ZeroAddress();
        if (_usdt == address(0)) revert ZeroAddress();
        if (_vault == address(0)) revert ZeroAddress();

        lendlePool = ILendingPool(_lendlePool);
        usdt = IERC20(_usdt);
        vault = _vault;
        lastHarvestTime = block.timestamp;

        // Get aUSDT address from Lendle pool
        ReserveData memory reserveData = lendlePool.getReserveData(_usdt);
        aUSDT = IAToken(reserveData.aTokenAddress);

        require(address(aUSDT) != address(0), "Invalid aToken address");
        require(aUSDT.UNDERLYING_ASSET_ADDRESS() == _usdt, "aToken mismatch");
    }

    /**
     * @notice Deposit USDT into Lendle to earn yield
     * @dev Receives aUSDT which accrues interest automatically
     */
    function deposit(uint256 amount) external nonReentrant onlyVault {
        if (amount == 0) revert ZeroAmount();
        if (amount < MIN_DEPLOY_AMOUNT) revert ZeroAmount();

        usdt.safeTransferFrom(msg.sender, address(this), amount);

        uint256 aTokenBalanceBefore = aUSDT.balanceOf(address(this));

        usdt.forceApprove(address(lendlePool), amount);

        lendlePool.supply(
            address(usdt),
            amount,
            address(this),
            0 // no referral code
        );

        uint256 aTokenBalanceAfter = aUSDT.balanceOf(address(this));
        uint256 aTokensReceived = aTokenBalanceAfter - aTokenBalanceBefore;

        if (aTokensReceived == 0) revert LendleSupplyFailed();

        totalDeposited += amount;

        emit Deposited(amount, aTokensReceived, block.timestamp);
    }

    /**
     * @notice Withdraw USDT from Lendle (principal + yield)
     * @dev Burns aUSDT and receives USDT including accrued interest
     */
    function withdraw(uint256 amount) external nonReentrant onlyVault returns (bytes32 withdrawId) {
        if (amount == 0) revert ZeroAmount();

        uint256 usdtBalanceBefore = usdt.balanceOf(address(this));
        uint256 aTokenBalanceBefore = aUSDT.balanceOf(address(this));

        uint256 withdrawn = lendlePool.withdraw(
            address(usdt),
            amount,
            address(this)
        );

        if (withdrawn == 0) revert LendleWithdrawFailed();

        uint256 usdtBalanceAfter = usdt.balanceOf(address(this));
        uint256 aTokenBalanceAfter = aUSDT.balanceOf(address(this));

        uint256 aTokensBurned = aTokenBalanceBefore - aTokenBalanceAfter;
        uint256 usdtReceived = usdtBalanceAfter - usdtBalanceBefore;
        uint256 yieldEarned = usdtReceived > amount ? usdtReceived - amount : 0;

        if (amount <= totalDeposited) {
            totalDeposited -= amount;
        } else {
            totalDeposited = 0;
        }

        usdt.safeTransfer(vault, usdtReceived);

        withdrawId = keccak256(abi.encodePacked(block.timestamp, amount, vault, withdrawn));

        emit Withdrawn(withdrawn, yieldEarned, block.timestamp);

        return withdrawId;
    }

    /**
     * @notice Calculate accrued yield without withdrawing
     * @dev Yield is automatically accumulated in aToken balance
     */
    function harvestYield() external nonReentrant returns (uint256 yieldEarned) {
        uint256 currentBalance = aUSDT.balanceOf(address(this));

        if (currentBalance > totalDeposited) {
            yieldEarned = currentBalance - totalDeposited;
        } else {
            yieldEarned = 0;
        }

        if (yieldEarned > 0) {
            totalYieldHarvested += yieldEarned;
            lastHarvestTime = block.timestamp;
            emit YieldHarvested(yieldEarned, block.timestamp);
        }

        return yieldEarned;
    }

    /**
     * @notice Get total balance (principal + yield) in USDT equivalent
     */
    function balanceOf(address _vault) external view returns (uint256) {
        if (_vault != vault) return 0;
        return aUSDT.balanceOf(address(this));
    }

    /**
     * @notice Get current APY from Lendle for USDT deposits
     * @return APY in basis points (800 = 8.00%)
     */
    function getAPY() public view returns (uint256) {
        ReserveData memory reserveData = lendlePool.getReserveData(address(usdt));

        // Convert from ray (27 decimals) to basis points (4 decimals)
        uint256 liquidityRateRay = uint256(reserveData.currentLiquidityRate);
        uint256 apyBasisPoints = liquidityRateRay / 1e23;

        return apyBasisPoints;
    }

    /**
     * @notice Get detailed deployment information
     */
    function getDeploymentInfo() external view returns (
        uint256 total,
        uint256 currentBalance,
        uint256 yieldAccrued,
        uint256 apy
    ) {
        total = totalDeposited;
        currentBalance = aUSDT.balanceOf(address(this));
        yieldAccrued = currentBalance > total ? currentBalance - total : 0;
        apy = getAPY();

        return (total, currentBalance, yieldAccrued, apy);
    }

    function getAvailableYield() external view returns (uint256) {
        uint256 currentBalance = aUSDT.balanceOf(address(this));
        if (currentBalance > totalDeposited) {
            return currentBalance - totalDeposited;
        }
        return 0;
    }

    function checkHealth() external view returns (bool isHealthy, string memory message) {
        uint256 aTokenBalance = aUSDT.balanceOf(address(this));

        if (aTokenBalance == 0 && totalDeposited > 0) {
            return (false, "No aTokens but totalDeposited > 0");
        }

        if (aTokenBalance < totalDeposited) {
            return (false, "aToken balance < principal (potential loss)");
        }

        uint256 apy = getAPY();
        if (apy == 0) {
            return (false, "APY is 0 (pool might be paused)");
        }
        if (apy > 5000) {
            return (false, "APY too high (>50%, suspicious)");
        }

        return (true, "All checks passed");
    }

    function setVault(address newVault) external onlyOwner {
        if (newVault == address(0)) revert ZeroAddress();
        address oldVault = vault;
        vault = newVault;
        emit VaultUpdated(oldVault, newVault);
    }

    function emergencyWithdraw() external onlyOwner {
        uint256 aTokenBalance = aUSDT.balanceOf(address(this));

        if (aTokenBalance > 0) {
            uint256 withdrawn = lendlePool.withdraw(
                address(usdt),
                type(uint256).max,
                owner()
            );

            totalDeposited = 0;
            emit EmergencyWithdraw(withdrawn, owner());
        }
    }

    function rescueTokens(address token, uint256 amount) external onlyOwner {
        require(token != address(usdt), "Cannot rescue USDT");
        require(token != address(aUSDT), "Cannot rescue aUSDT");

        IERC20(token).safeTransfer(owner(), amount);
    }
}
