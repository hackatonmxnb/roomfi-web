// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockAToken
 * @notice Mock aToken (Aave/Lendle interest-bearing token)
 * @dev Simulates aUSDT behavior where balance grows with interest
 *
 * Real aToken behavior:
 * - Balance increases automatically based on reserve's liquidity index
 * - Users receive aTokens 1:1 when depositing
 * - When withdrawing, aTokens are burned and underlying + interest returned
 * - Interest accrues continuously via scaledBalance * liquidityIndex
 *
 * This mock simulates via:
 * - Timestamp-based interest accrual
 * - 6% APY (600 basis points)
 * - Simple interest calculation for demo purposes
 */
contract MockAToken is ERC20 {

    uint256 public constant APY_BASIS_POINTS = 600; // 6% APY
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    IERC20 public immutable underlyingAsset;
    address public immutable pool;

    // Scaled balances (principal without interest)
    mapping(address => uint256) private _scaledBalances;
    mapping(address => uint256) private _depositTimestamps;

    event Mint(address indexed user, uint256 amount, uint256 timestamp);
    event Burn(address indexed user, uint256 amount, uint256 timestamp);

    constructor(
        address _underlyingAsset,
        address _pool,
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) {
        require(_underlyingAsset != address(0), "Invalid underlying");
        require(_pool != address(0), "Invalid pool");

        underlyingAsset = IERC20(_underlyingAsset);
        pool = _pool;
    }

    /**
     * @notice Get underlying asset address (Aave V3 aToken interface)
     * @return Address of the underlying asset
     */
    function UNDERLYING_ASSET_ADDRESS() public view returns (address) {
        return address(underlyingAsset);
    }

    /**
     * @notice Mint aTokens (called by pool on deposit)
     * @param user Recipient of aTokens
     * @param amount Amount to mint (1:1 with underlying)
     */
    function mint(address user, uint256 amount) external {
        require(msg.sender == pool, "Only pool can mint");
        require(amount > 0, "Amount must be > 0");

        // Update existing balance first
        _updateBalance(user);

        _scaledBalances[user] += amount;
        _depositTimestamps[user] = block.timestamp;

        _mint(user, amount);

        emit Mint(user, amount, block.timestamp);
    }

    /**
     * @notice Burn aTokens (called by pool on withdraw)
     * @param user Address to burn from
     * @param amount Amount to burn
     */
    function burn(address user, uint256 amount) external {
        require(msg.sender == pool, "Only pool can burn");

        _updateBalance(user);

        uint256 totalBalance = balanceOf(user);
        require(amount <= totalBalance, "Insufficient balance");

        // Calculate proportion of scaled balance to burn
        uint256 scaledToBurn = (amount * _scaledBalances[user]) / totalBalance;
        _scaledBalances[user] -= scaledToBurn;

        _burn(user, amount);

        emit Burn(user, amount, block.timestamp);
    }

    /**
     * @notice Override balanceOf to include accrued interest
     * @dev This is the key feature - balance grows automatically
     */
    function balanceOf(address account) public view override returns (uint256) {
        uint256 scaledBalance = _scaledBalances[account];
        if (scaledBalance == 0) {
            return super.balanceOf(account);
        }

        uint256 interest = _calculateInterest(account);
        return scaledBalance + interest;
    }

    /**
     * @notice Get scaled balance (principal without interest)
     */
    function scaledBalanceOf(address account) external view returns (uint256) {
        return _scaledBalances[account];
    }

    /**
     * @notice Calculate accrued interest for an account
     */
    function _calculateInterest(address account) internal view returns (uint256) {
        uint256 scaledBalance = _scaledBalances[account];
        if (scaledBalance == 0) {
            return 0;
        }

        uint256 depositTime = _depositTimestamps[account];
        if (depositTime == 0) {
            return 0;
        }

        uint256 timeElapsed = block.timestamp - depositTime;

        // Interest = principal * APY * timeElapsed / (BASIS_POINTS * SECONDS_PER_YEAR)
        return (scaledBalance * APY_BASIS_POINTS * timeElapsed) / (BASIS_POINTS * SECONDS_PER_YEAR);
    }

    /**
     * @notice Update balance by converting interest to principal
     */
    function _updateBalance(address user) internal {
        uint256 interest = _calculateInterest(user);

        if (interest > 0) {
            _scaledBalances[user] += interest;
            _depositTimestamps[user] = block.timestamp;

            // Note: We don't actually _mint() here because we're simulating
            // the Aave liquidity index growth, not minting new tokens
        }
    }

    /**
     * @notice Override transfer to update balances
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        _updateBalance(msg.sender);
        _updateBalance(to);

        // Transfer scaled balances proportionally
        uint256 senderTotal = balanceOf(msg.sender);
        require(amount <= senderTotal, "Insufficient balance");

        uint256 scaledToTransfer = (amount * _scaledBalances[msg.sender]) / senderTotal;

        _scaledBalances[msg.sender] -= scaledToTransfer;
        _scaledBalances[to] += scaledToTransfer;
        _depositTimestamps[to] = block.timestamp;

        return super.transfer(to, amount);
    }

    /**
     * @notice Override transferFrom
     */
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        _updateBalance(from);
        _updateBalance(to);

        uint256 fromTotal = balanceOf(from);
        require(amount <= fromTotal, "Insufficient balance");

        uint256 scaledToTransfer = (amount * _scaledBalances[from]) / fromTotal;

        _scaledBalances[from] -= scaledToTransfer;
        _scaledBalances[to] += scaledToTransfer;
        _depositTimestamps[to] = block.timestamp;

        return super.transferFrom(from, to, amount);
    }

    /**
     * @notice Get current APY
     */
    function getAPY() external pure returns (uint256) {
        return APY_BASIS_POINTS;
    }

    /**
     * @notice Simulate time passing for testing
     */
    function simulateTimePass(address user, uint256 secondsToPass) external {
        require(msg.sender == pool, "Only pool");
        _depositTimestamps[user] -= secondsToPass;
    }
}
