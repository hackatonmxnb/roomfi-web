// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./MockUSDY.sol";

/**
 * @title MockDEXRouter
 * @notice Mock DEX Router simulating Merchant Moe / Aurelius Finance on Mantle
 * @dev Simulates swapping between USDT and USDY with realistic slippage
 *
 * Real DEX behavior:
 * - Swap USDT → USDY (buy USDY with USDT)
 * - Swap USDY → USDT (sell USDY for USDT)
 * - Slippage: ~0.1-0.3% depending on liquidity
 * - Price impact based on pool reserves
 *
 * This mock:
 * - Maintains virtual liquidity pools
 * - Simulates 0.3% trading fee
 * - Approximately 1:1 price ratio (USDY slightly premium)
 * - Handles USDY's accumulating balance correctly
 */
contract MockDEXRouter {
    using SafeERC20 for IERC20;

    // Trading fee: 0.3% (30 basis points)
    uint256 public constant TRADING_FEE_BP = 30;
    uint256 public constant BASIS_POINTS = 10000;

    // Virtual liquidity for price calculation
    uint256 public constant VIRTUAL_USDT_RESERVE = 1_000_000 * 1e6; // 1M USDT
    uint256 public constant VIRTUAL_USDY_RESERVE = 980_000 * 1e18; // 980K USDY (slightly less = premium)

    IERC20 public immutable usdt;
    MockUSDY public immutable usdy;

    event Swap(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 timestamp
    );

    event LiquidityAdded(
        address indexed provider,
        uint256 usdtAmount,
        uint256 usdyAmount,
        uint256 timestamp
    );

    constructor(address _usdt, address _usdy) {
        require(_usdt != address(0), "Invalid USDT");
        require(_usdy != address(0), "Invalid USDY");

        usdt = IERC20(_usdt);
        usdy = MockUSDY(_usdy);
    }

    /**
     * @notice Swap exact tokens for tokens (Uniswap V2 style)
     * @dev Supports USDT → USDY and USDY → USDT swaps
     * @param amountIn Amount of input token
     * @param amountOutMin Minimum amount of output token (slippage protection)
     * @param path Array of token addresses [tokenIn, tokenOut]
     * @param to Recipient of output tokens
     * @param deadline Timestamp deadline for swap
     */
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        require(deadline >= block.timestamp, "Swap expired");
        require(path.length == 2, "Invalid path");
        require(amountIn > 0, "Amount must be > 0");

        address tokenIn = path[0];
        address tokenOut = path[1];

        // Calculate output amount
        uint256 amountOut = _getAmountOut(amountIn, tokenIn, tokenOut);
        require(amountOut >= amountOutMin, "Insufficient output amount");

        // Transfer input token from user
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Handle USDY accumulating token special case
        if (tokenOut == address(usdy)) {
            // Minting USDY (simulates buying from pool)
            usdy.deposit(to, amountOut);
        } else {
            // Transfer output token to user
            IERC20(tokenOut).safeTransfer(to, amountOut);
        }

        emit Swap(msg.sender, tokenIn, tokenOut, amountIn, amountOut, block.timestamp);

        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = amountOut;

        return amounts;
    }

    /**
     * @notice Get output amount for a given input (with fees)
     * @dev Simulates constant product formula with 0.3% fee
     */
    function _getAmountOut(
        uint256 amountIn,
        address tokenIn,
        address tokenOut
    ) internal view returns (uint256) {
        require(
            (tokenIn == address(usdt) && tokenOut == address(usdy)) ||
            (tokenIn == address(usdy) && tokenOut == address(usdt)),
            "Invalid token pair"
        );

        // Apply trading fee
        uint256 amountInWithFee = amountIn * (BASIS_POINTS - TRADING_FEE_BP);

        uint256 reserveIn;
        uint256 reserveOut;

        if (tokenIn == address(usdt)) {
            // USDT → USDY swap
            reserveIn = VIRTUAL_USDT_RESERVE;
            reserveOut = VIRTUAL_USDY_RESERVE;

            // USDY has 18 decimals, USDT has 6, need to adjust
            amountInWithFee = amountInWithFee * 1e12; // Convert USDT (6 decimals) to 18 decimals
        } else {
            // USDY → USDT swap
            reserveIn = VIRTUAL_USDY_RESERVE;
            reserveOut = VIRTUAL_USDT_RESERVE;
        }

        // Constant product formula: (x + dx) * (y - dy) = x * y
        // dy = y * dx / (x + dx)
        uint256 numerator = reserveOut * amountInWithFee;
        uint256 denominator = (reserveIn * BASIS_POINTS) + amountInWithFee;
        uint256 amountOut = numerator / denominator;

        if (tokenIn == address(usdt)) {
            // Result is in 18 decimals, keep as is for USDY
            return amountOut;
        } else {
            // Convert from 18 decimals to 6 decimals for USDT
            return amountOut / 1e12;
        }
    }

    /**
     * @notice Get amount out for external quote (view function)
     */
    function getAmountOut(
        uint256 amountIn,
        address tokenIn,
        address tokenOut
    ) external view returns (uint256) {
        return _getAmountOut(amountIn, tokenIn, tokenOut);
    }

    /**
     * @notice Get amounts out for a path
     * @dev Returns array of amounts for each step in the path
     */
    function getAmountsOut(
        uint256 amountIn,
        address[] calldata path
    ) external view returns (uint256[] memory amounts) {
        require(path.length == 2, "Invalid path");

        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = _getAmountOut(amountIn, path[0], path[1]);

        return amounts;
    }

    /**
     * @notice Add liquidity to the mock pool (for testing)
     * @dev In real DEX, this would add to reserves. Here it just accepts tokens.
     */
    function addLiquidity(
        uint256 usdtAmount,
        uint256 usdyAmount,
        address provider
    ) external {
        require(usdtAmount > 0 && usdyAmount > 0, "Amounts must be > 0");

        usdt.safeTransferFrom(msg.sender, address(this), usdtAmount);

        // For USDY, need to handle accumulating token
        IERC20(address(usdy)).safeTransferFrom(msg.sender, address(this), usdyAmount);

        emit LiquidityAdded(provider, usdtAmount, usdyAmount, block.timestamp);
    }

    /**
     * @notice Get current price of USDY in USDT
     * @dev Returns price with 6 decimals (e.g., 1.02 USDT = 1020000)
     */
    function getUSDYPriceInUSDT() external pure returns (uint256) {
        // USDY typically trades at slight premium to USDT
        // ~1.02 USDT per USDY
        return (VIRTUAL_USDT_RESERVE * 1e6) / (VIRTUAL_USDY_RESERVE / 1e12);
    }

    /**
     * @notice Get virtual reserves (for testing/verification)
     */
    function getReserves() external pure returns (uint256 usdtReserve, uint256 usdyReserve) {
        return (VIRTUAL_USDT_RESERVE, VIRTUAL_USDY_RESERVE);
    }

    /**
     * @notice Emergency withdraw (only for testing)
     */
    function emergencyWithdrawUSDT(address to, uint256 amount) external {
        usdt.safeTransfer(to, amount);
    }

    function emergencyWithdrawUSDY(address to, uint256 amount) external {
        IERC20(address(usdy)).safeTransfer(to, amount);
    }
}
