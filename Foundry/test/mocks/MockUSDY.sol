// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDY
 * @notice Mock USDY token that simulates Ondo Finance's accumulating token behavior
 * @dev Balance grows automatically based on APY, simulating US Treasury bond yields
 *
 * Real USDY behavior:
 * - Balance increases automatically (no need to claim)
 * - APY: ~4.29% backed by US Treasuries
 * - 1 USDY today becomes 1.0429 USDY in 1 year
 *
 * This mock simulates that by:
 * - Tracking deposit timestamps
 * - Calculating accrued interest on balanceOf()
 * - Using 4.29% APY (429 basis points)
 */
contract MockUSDY is ERC20, Ownable {

    uint256 public constant APY_BASIS_POINTS = 429; // 4.29% APY
    uint256 public constant BASIS_POINTS_DIVISOR = 10000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    struct UserDeposit {
        uint256 principal;
        uint256 lastUpdateTime;
        uint256 accruedInterest;
    }

    mapping(address => UserDeposit) public deposits;

    event Deposited(address indexed user, uint256 amount, uint256 timestamp);
    event Withdrawn(address indexed user, uint256 principal, uint256 interest, uint256 timestamp);
    event InterestAccrued(address indexed user, uint256 interest, uint256 timestamp);

    constructor() ERC20("Mock USDY", "USDY") Ownable(msg.sender) {}

    /**
     * @notice Deposit USDY (in real scenario, would be swapped from USDT)
     * @dev Mints USDY and starts accruing interest
     */
    function deposit(address user, uint256 amount) external {
        require(amount > 0, "Amount must be > 0");

        // Update existing balance first
        _updateBalance(user);

        deposits[user].principal += amount;
        deposits[user].lastUpdateTime = block.timestamp;

        _mint(user, amount);

        emit Deposited(user, amount, block.timestamp);
    }

    /**
     * @notice Withdraw USDY with accrued interest
     */
    function withdraw(address user, uint256 amount) external {
        _updateBalance(user);

        uint256 totalBalance = deposits[user].principal + deposits[user].accruedInterest;
        require(amount <= totalBalance, "Insufficient balance");

        uint256 principal = deposits[user].principal;
        uint256 interest = deposits[user].accruedInterest;

        // Reduce from principal first, then interest
        if (amount <= principal) {
            deposits[user].principal -= amount;
        } else {
            uint256 remainingAmount = amount - principal;
            deposits[user].principal = 0;
            deposits[user].accruedInterest -= remainingAmount;
        }

        _burn(user, amount);

        emit Withdrawn(user, principal, interest, block.timestamp);
    }

    /**
     * @notice Override balanceOf to include accrued interest
     * @dev This is the key feature - balance grows automatically
     */
    function balanceOf(address account) public view override returns (uint256) {
        UserDeposit memory userDeposit = deposits[account];

        if (userDeposit.principal == 0) {
            return super.balanceOf(account);
        }

        uint256 timeElapsed = block.timestamp - userDeposit.lastUpdateTime;
        uint256 interest = _calculateInterest(userDeposit.principal, timeElapsed);

        return userDeposit.principal + userDeposit.accruedInterest + interest;
    }

    /**
     * @notice Get underlying principal (without interest)
     */
    function principalBalanceOf(address account) external view returns (uint256) {
        return deposits[account].principal;
    }

    /**
     * @notice Get total accrued interest for user
     */
    function accruedInterestOf(address account) external view returns (uint256) {
        UserDeposit memory userDeposit = deposits[account];
        uint256 timeElapsed = block.timestamp - userDeposit.lastUpdateTime;
        uint256 newInterest = _calculateInterest(userDeposit.principal, timeElapsed);
        return userDeposit.accruedInterest + newInterest;
    }

    /**
     * @notice Internal function to update user's accrued interest
     */
    function _updateBalance(address user) internal {
        UserDeposit storage userDeposit = deposits[user];

        if (userDeposit.principal == 0) {
            return;
        }

        uint256 timeElapsed = block.timestamp - userDeposit.lastUpdateTime;
        uint256 interest = _calculateInterest(userDeposit.principal, timeElapsed);

        if (interest > 0) {
            userDeposit.accruedInterest += interest;
            userDeposit.lastUpdateTime = block.timestamp;
            emit InterestAccrued(user, interest, block.timestamp);
        }
    }

    /**
     * @notice Calculate interest based on APY
     * @dev Formula: principal * APY * timeElapsed / (BASIS_POINTS_DIVISOR * SECONDS_PER_YEAR)
     */
    function _calculateInterest(uint256 principal, uint256 timeElapsed) internal pure returns (uint256) {
        if (principal == 0 || timeElapsed == 0) {
            return 0;
        }

        // Interest = principal * 0.0429 * (timeElapsed / 365 days)
        return (principal * APY_BASIS_POINTS * timeElapsed) / (BASIS_POINTS_DIVISOR * SECONDS_PER_YEAR);
    }

    /**
     * @notice Get current APY
     */
    function getAPY() external pure returns (uint256) {
        return APY_BASIS_POINTS;
    }

    /**
     * @notice Mint USDY for testing purposes
     */
    function mint(address to, uint256 amount) external onlyOwner {
        deposits[to].principal += amount;
        deposits[to].lastUpdateTime = block.timestamp;
        _mint(to, amount);
    }

    /**
     * @notice Override transfer to update balances with accrued interest
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        _updateBalance(msg.sender);
        _updateBalance(to);

        // Transfer includes moving principal proportionally
        uint256 totalBalance = deposits[msg.sender].principal + deposits[msg.sender].accruedInterest;
        require(amount <= totalBalance, "Insufficient balance");

        uint256 principalToTransfer = (amount * deposits[msg.sender].principal) / totalBalance;
        uint256 interestToTransfer = amount - principalToTransfer;

        deposits[msg.sender].principal -= principalToTransfer;
        deposits[msg.sender].accruedInterest -= interestToTransfer;

        deposits[to].principal += principalToTransfer;
        deposits[to].accruedInterest += interestToTransfer;
        deposits[to].lastUpdateTime = block.timestamp;

        return super.transfer(to, amount);
    }

    /**
     * @notice Override transferFrom to update balances
     */
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        _updateBalance(from);
        _updateBalance(to);

        uint256 totalBalance = deposits[from].principal + deposits[from].accruedInterest;
        require(amount <= totalBalance, "Insufficient balance");

        uint256 principalToTransfer = (amount * deposits[from].principal) / totalBalance;
        uint256 interestToTransfer = amount - principalToTransfer;

        deposits[from].principal -= principalToTransfer;
        deposits[from].accruedInterest -= interestToTransfer;

        deposits[to].principal += principalToTransfer;
        deposits[to].accruedInterest += interestToTransfer;
        deposits[to].lastUpdateTime = block.timestamp;

        return super.transferFrom(from, to, amount);
    }

    /**
     * @notice Simulate time passing for testing
     * @dev Only for testing - advance user's last update time
     */
    function simulateTimePass(address user, uint256 secondsToPass) external onlyOwner {
        deposits[user].lastUpdateTime -= secondsToPass;
    }
}
