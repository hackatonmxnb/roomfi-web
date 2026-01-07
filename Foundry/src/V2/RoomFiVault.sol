// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./Interfaces.sol";

/**
 * @title RoomFiVault
 * @author RoomFi Team - Firrton
 * @notice Vault que genera yield depositando USDT en protocolos DeFi
 * @dev Usuarios (RentalAgreements) depositan USDT y ganan yield automáticamente
 *
 * ARQUITECTURA:
 * - EVM-compatible vault (Mantle, Ethereum L2s)
 * - USDT como asset base (6 decimals)
 * - Yield farming en lending protocols + DEXes
 * - Split fees: 70% user, 30% protocol
 *
 * FLUJO DE FONDOS:
 * 1. RentalAgreement deposita security deposit → Vault
 * 2. Vault despliega 85% a YieldStrategy (15% buffer)
 * 3. Strategy genera yield 6-12% APY en DeFi protocols
 * 4. Al completar contrato → withdraw con yield
 * 5. User recibe 70% yield, protocol 30%
 *
 * SEGURIDAD:
 * - Solo RentalAgreements autorizados pueden depositar
 * - SafeERC20 para todos los transfers
 * - ReentrancyGuard en funciones críticas
 * - Emergency pause por owner
 * - Loss tracking si strategy pierde fondos
 */
contract RoomFiVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============================================
    // STATE VARIABLES
    // ============================================

    /// @notice USDT token (6 decimals)
    IERC20 public immutable usdt;

    /// @notice Strategy activa para generar yield
    IYieldStrategy public strategy;

    /// @notice Direcciones autorizadas para depositar (RentalAgreements)
    mapping(address => bool) public authorizedDepositors;

    /// @notice Balance depositado por cada usuario (agreements)
    mapping(address => uint256) public deposits;

    /// @notice Timestamp del último depósito de cada usuario
    mapping(address => uint256) public depositTime;

    /// @notice Yield ya retirado por cada user (prevenir double-claim)
    mapping(address => uint256) public yieldWithdrawn;

    /// @notice Total depositado en el vault
    uint256 public totalDeposits;

    /// @notice Total yield generado históricamente
    uint256 public totalYieldEarned;

    /// @notice Porcentaje de yield que va al protocolo (30 = 30%)
    uint256 public protocolFeePercent = 30;

    /// @notice Fees acumulados del protocolo
    uint256 public accumulatedProtocolFees;

    /// @notice Losses acumuladas (si strategy pierde fondos)
    uint256 public accumulatedLosses;

    /// @notice Emergency pause
    bool public emergencyPaused;

    /// @notice Minimum deposit amount (10 USDT - ajustado para testing)
    uint256 public constant MIN_DEPOSIT = 10 * 1e6;

    /// @notice Buffer reserve (% que se queda en el vault sin deploy)
    /// @dev 15% según spec del documento V2_PREPARACION
    uint256 public bufferPercent = 15;

    /// @notice Última vez que se harvested yield
    uint256 public lastHarvestTime;

    // ============================================
    // EVENTS
    // ============================================

    event Deposited(
        address indexed user,
        uint256 amount,
        uint256 timestamp,
        uint256 toStrategy,
        uint256 buffer
    );

    event Withdrawn(
        address indexed user,
        uint256 principal,
        uint256 yieldAmount,
        uint256 protocolFee
    );

    event YieldHarvested(
        uint256 totalYield,
        uint256 timestamp
    );

    event ProtocolFeesCollected(
        address indexed collector,
        uint256 amount
    );

    event StrategyUpdated(
        address indexed oldStrategy,
        address indexed newStrategy
    );

    event LossReported(
        uint256 lossAmount,
        uint256 timestamp
    );

    event EmergencyPauseToggled(
        bool paused
    );

    event AuthorizedDepositorUpdated(
        address indexed depositor,
        bool authorized
    );

    event ProtocolFeePercentUpdated(
        uint256 oldPercent,
        uint256 newPercent
    );

    event BufferPercentUpdated(
        uint256 oldPercent,
        uint256 newPercent
    );

    // ============================================
    // ERRORS
    // ============================================

    error Paused();
    error NotPaused();
    error ZeroAmount();
    error ZeroAddress();
    error Unauthorized();
    error InsufficientBalance();
    error InsufficientLiquidity();
    error InvalidPercent();
    error StrategyWithdrawFailed();
    error TransferFailed();
    error StrategyNotSet();

    // ============================================
    // MODIFIERS
    // ============================================

    modifier whenNotPaused() {
        if (emergencyPaused) revert Paused();
        _;
    }

    modifier whenPaused() {
        if (!emergencyPaused) revert NotPaused();
        _;
    }

    modifier onlyAuthorized() {
        if (!authorizedDepositors[msg.sender] && msg.sender != owner()) {
            revert Unauthorized();
        }
        _;
    }

    // ============================================
    // CONSTRUCTOR
    // ============================================

    /**
     * @notice Inicializa el vault
     * @param _usdt Address del token USDT (6 decimals)
     * @param initialOwner Owner del contrato
     */
    constructor(
        address _usdt,
        address initialOwner
    ) Ownable(initialOwner) {
        if (_usdt == address(0)) revert ZeroAddress();

        usdt = IERC20(_usdt);
        lastHarvestTime = block.timestamp;

        // Auto-authorize owner para testing
        authorizedDepositors[initialOwner] = true;
    }

    // ============================================
    // USER FUNCTIONS
    // ============================================

    /**
     * @notice Deposita USDT en el vault para generar yield
     * @dev Solo callable por RentalAgreement contracts autorizados
     * @param amount Cantidad de USDT (6 decimals)
     * @param user Address del beneficiario (el RentalAgreement address para tracking)
     *
     * FLUJO:
     * 1. Transfer USDT del caller al vault (SafeERC20)
     * 2. Update tracking
     * 3. Deploy 85% a strategy, 15% buffer
     */
    function deposit(
        uint256 amount,
        address user
    )
        external
        nonReentrant
        whenNotPaused
        onlyAuthorized
    {
        if (amount == 0) revert ZeroAmount();
        if (amount < MIN_DEPOSIT) revert InvalidPercent();
        if (user == address(0)) revert ZeroAddress();

        // Transfer USDT del caller (RentalAgreement) al vault usando SafeERC20
        usdt.safeTransferFrom(msg.sender, address(this), amount);

        // Update tracking
        deposits[user] += amount;
        depositTime[user] = block.timestamp;
        totalDeposits += amount;

        // Split: 85% to strategy, 15% buffer en vault
        uint256 toDeploy = (amount * (100 - bufferPercent)) / 100;
        uint256 buffer = amount - toDeploy;

        // Deploy a strategy si hay cantidad significativa y strategy está seteada
        if (toDeploy > 0 && address(strategy) != address(0)) {
            usdt.approve(address(strategy), toDeploy);
            strategy.deposit(toDeploy);
        } else {
            // Si no hay strategy, todo se queda como buffer
            buffer = amount;
            toDeploy = 0;
        }

        // Buffer se queda en vault para retiros rápidos

        emit Deposited(user, amount, block.timestamp, toDeploy, buffer);
    }

    /**
     * @notice Retira principal + yield de un usuario
     * @dev Calcula yield proporcional y aplica protocol fee
     * @param amount Cantidad de principal a retirar
     * @param user Address del agreement
     * @return principal Cantidad de principal retornada
     * @return yieldAmount Cantidad de yield retornado (después de fees)
     */
    function withdraw(
        uint256 amount,
        address user
    )
        external
        nonReentrant
        onlyAuthorized
        returns (uint256 principal, uint256 yieldAmount)
    {
        if (amount == 0) revert ZeroAmount();
        if (deposits[user] < amount) revert InsufficientBalance();

        // Calcular yield antes de actualizar balances
        uint256 totalYield = calculateYield(user);

        // Protocol fee sobre el yield (30%)
        uint256 protocolFee = (totalYield * protocolFeePercent) / 100;
        uint256 userYield = totalYield - protocolFee;

        // Acumular fees
        accumulatedProtocolFees += protocolFee;
        totalYieldEarned += totalYield;

        // Update accounting ANTES de transfers (CEI pattern)
        deposits[user] -= amount;
        totalDeposits -= amount;
        yieldWithdrawn[user] += userYield;

        // Calcular total a transferir (principal + yield del usuario, NO incluye protocol fee)
        uint256 totalToTransfer = amount + userYield;

        // Verificar liquidez en vault
        uint256 vaultBalance = usdt.balanceOf(address(this));

        if (vaultBalance < totalToTransfer) {
            // Necesitamos retirar de strategy
            uint256 needed = totalToTransfer - vaultBalance;

            // Retirar de strategy (puede fallar si no hay liquidez)
            try strategy.withdraw(needed) returns (bytes32) {
                // Wait for XCM callback en producción
                // Para testnet/mock, funds están disponibles inmediatamente
            } catch {
                revert StrategyWithdrawFailed();
            }

            // Re-check balance después de withdraw
            vaultBalance = usdt.balanceOf(address(this));
            if (vaultBalance < totalToTransfer) {
                revert InsufficientLiquidity();
            }
        }

        // Transfer al caller (RentalAgreement) usando SafeERC20
        // El agreement luego distribuye al tenant
        usdt.safeTransfer(msg.sender, amount + userYield);

        emit Withdrawn(user, amount, userYield, protocolFee);

        return (amount, userYield);
    }

    /**
     * @notice Calcula yield proporcional de un usuario
     * @dev Formula: userYield = (totalVaultYield * userDeposit) / totalDeposits
     * @param user Address del agreement
     * @return Yield acumulado no retirado
     */
    function calculateYield(address user) public view returns (uint256) {
        uint256 userDeposit = deposits[user];
        if (userDeposit == 0) return 0;
        if (totalDeposits == 0) return 0;

        // Balance total: strategy + buffer en vault
        uint256 strategyBalance = 0;
        if (address(strategy) != address(0)) {
            strategyBalance = strategy.balanceOf(address(this));
        }
        uint256 vaultBuffer = usdt.balanceOf(address(this));
        uint256 totalBalance = strategyBalance + vaultBuffer;

        // Restar losses acumuladas
        uint256 adjustedBalance = totalBalance > accumulatedLosses
            ? totalBalance - accumulatedLosses
            : 0;

        // Yield total del vault
        uint256 vaultYield = adjustedBalance > totalDeposits
            ? adjustedBalance - totalDeposits
            : 0;

        // Yield proporcional del usuario
        uint256 userShare = (vaultYield * userDeposit) / totalDeposits;

        // Restar lo que ya retiró
        uint256 alreadyWithdrawn = yieldWithdrawn[user];

        return userShare > alreadyWithdrawn
            ? userShare - alreadyWithdrawn
            : 0;
    }

    /**
     * @notice Obtiene balance total de un usuario (principal + yield)
     */
    function balanceOf(address user) external view returns (uint256) {
        return deposits[user] + calculateYield(user);
    }

    /**
     * @notice Obtiene info detallada de un usuario
     */
    function getUserInfo(address user) external view returns (
        uint256 depositAmount,
        uint256 yieldEarned,
        uint256 totalBalance,
        uint256 depositTimestamp,
        uint256 daysDeposited
    ) {
        depositAmount = deposits[user];
        yieldEarned = calculateYield(user);
        totalBalance = depositAmount + yieldEarned;
        depositTimestamp = depositTime[user];

        if (depositTimestamp > 0) {
            daysDeposited = (block.timestamp - depositTimestamp) / 1 days;
        } else {
            daysDeposited = 0;
        }
    }

    // ============================================
    // YIELD MANAGEMENT
    // ============================================

    /**
     * @notice Harvest yield de la strategy
     * @dev Callable por owner o keeper bot
     * @return yieldHarvested Cantidad de yield cosechado
     */
    function harvestYield()
        external
        nonReentrant
        whenNotPaused
        returns (uint256 yieldHarvested)
    {
        // Solo owner puede harvest manualmente
        if (msg.sender != owner()) revert Unauthorized();

        // Harvest de strategy
        yieldHarvested = strategy.harvestYield();

        if (yieldHarvested > 0) {
            totalYieldEarned += yieldHarvested;
            lastHarvestTime = block.timestamp;

            emit YieldHarvested(yieldHarvested, block.timestamp);
        }

        return yieldHarvested;
    }

    /**
     * @notice Rebalancea fondos entre vault y strategy
     * @dev Mantiene el buffer reserve correcto
     */
    function rebalance() external onlyOwner nonReentrant {
        uint256 vaultBalance = usdt.balanceOf(address(this));
        uint256 targetBuffer = (totalDeposits * bufferPercent) / 100;

        if (vaultBalance > targetBuffer) {
            // Depositar exceso a strategy
            uint256 excess = vaultBalance - targetBuffer;
            usdt.approve(address(strategy), excess);
            strategy.deposit(excess);
        } else if (vaultBalance < targetBuffer) {
            // Retirar de strategy para mantener buffer
            uint256 needed = targetBuffer - vaultBalance;
            strategy.withdraw(needed);
        }
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /**
     * @notice Establece strategy por primera vez
     * @param _strategy Address de la strategy
     */
    function setStrategy(address _strategy) external onlyOwner {
        if (_strategy == address(0)) revert ZeroAddress();
        if (address(strategy) != address(0)) revert Unauthorized();

        strategy = IYieldStrategy(_strategy);

        emit StrategyUpdated(address(0), _strategy);
    }

    /**
     * @notice Actualiza la estrategia de yield
     * @dev Migra fondos de strategy vieja a nueva
     * @param newStrategy Address de la nueva strategy
     */
    function updateStrategy(address newStrategy) external onlyOwner nonReentrant {
        if (newStrategy == address(0)) revert ZeroAddress();
        if (address(strategy) == address(0)) revert StrategyNotSet();

        address oldStrategy = address(strategy);

        // Withdraw todos los fondos de strategy vieja
        uint256 strategyBalance = strategy.balanceOf(address(this));
        if (strategyBalance > 0) {
            strategy.withdraw(strategyBalance);
        }

        // Set nueva strategy
        strategy = IYieldStrategy(newStrategy);

        // Re-deploy fondos a nueva strategy
        uint256 vaultBalance = usdt.balanceOf(address(this));
        uint256 bufferNeeded = (totalDeposits * bufferPercent) / 100;

        if (vaultBalance > bufferNeeded) {
            uint256 toDeploy = vaultBalance - bufferNeeded;
            usdt.approve(newStrategy, toDeploy);
            strategy.deposit(toDeploy);
        }

        emit StrategyUpdated(oldStrategy, newStrategy);
    }

    /**
     * @notice Reporta losses de la strategy
     * @dev Solo owner puede reportar losses
     * @param lossAmount Cantidad perdida
     */
    function reportLoss(uint256 lossAmount) external onlyOwner {
        if (lossAmount == 0) revert ZeroAmount();

        accumulatedLosses += lossAmount;

        emit LossReported(lossAmount, block.timestamp);
    }

    /**
     * @notice Actualiza protocol fee percentage
     * @param newPercent Nuevo porcentaje (0-100)
     */
    function setProtocolFeePercent(uint256 newPercent) external onlyOwner {
        if (newPercent > 100) revert InvalidPercent();

        uint256 oldPercent = protocolFeePercent;
        protocolFeePercent = newPercent;

        emit ProtocolFeePercentUpdated(oldPercent, newPercent);
    }

    /**
     * @notice Actualiza buffer reserve percent
     * @param newPercent Nuevo porcentaje (max 30%)
     */
    function setBufferPercent(uint256 newPercent) external onlyOwner {
        if (newPercent > 30) revert InvalidPercent();

        uint256 oldPercent = bufferPercent;
        bufferPercent = newPercent;

        emit BufferPercentUpdated(oldPercent, newPercent);
    }

    /**
     * @notice Autoriza/desautoriza depositor (RentalAgreement)
     * @param depositor Address a autorizar
     * @param authorized true para autorizar, false para revocar
     */
    function setAuthorizedDepositor(
        address depositor,
        bool authorized
    ) external onlyOwner {
        if (depositor == address(0)) revert ZeroAddress();

        authorizedDepositors[depositor] = authorized;

        emit AuthorizedDepositorUpdated(depositor, authorized);
    }

    /**
     * @notice Batch authorize depositors
     * @param depositors Array de addresses a autorizar
     * @param authorized true para autorizar todos
     */
    function batchSetAuthorizedDepositors(
        address[] calldata depositors,
        bool authorized
    ) external onlyOwner {
        for (uint256 i = 0; i < depositors.length; i++) {
            if (depositors[i] != address(0)) {
                authorizedDepositors[depositors[i]] = authorized;
                emit AuthorizedDepositorUpdated(depositors[i], authorized);
            }
        }
    }

    /**
     * @notice Retira protocol fees acumulados
     * @dev Solo owner puede retirar fees
     */
    function collectProtocolFees() external onlyOwner nonReentrant {
        uint256 fees = accumulatedProtocolFees;
        if (fees == 0) revert ZeroAmount();

        accumulatedProtocolFees = 0;

        // Verificar si necesitamos retirar de strategy
        uint256 vaultBalance = usdt.balanceOf(address(this));
        if (vaultBalance < fees) {
            uint256 needed = fees - vaultBalance;
            strategy.withdraw(needed);
        }

        usdt.safeTransfer(owner(), fees);

        emit ProtocolFeesCollected(owner(), fees);
    }

    /**
     * @notice Pausa de emergencia
     * @dev Previene deposits/withdraws
     */
    function toggleEmergencyPause() external onlyOwner {
        emergencyPaused = !emergencyPaused;

        emit EmergencyPauseToggled(emergencyPaused);
    }

    /**
     * @notice Emergency withdraw (solo cuando paused)
     * @dev Permite a owner rescatar fondos en emergencia
     */
    function emergencyWithdraw() external onlyOwner whenPaused nonReentrant {
        // Withdraw de strategy si existe
        if (address(strategy) != address(0)) {
            uint256 strategyBalance = strategy.balanceOf(address(this));
            if (strategyBalance > 0) {
                strategy.withdraw(strategyBalance);
            }
        }

        // Transfer todo al owner
        uint256 vaultBalance = usdt.balanceOf(address(this));
        if (vaultBalance > 0) {
            usdt.safeTransfer(owner(), vaultBalance);
        }
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @notice APY actual de la strategy
     * @return APY en basis points (800 = 8%)
     */
    function getCurrentAPY() external view returns (uint256) {
        return strategy.getAPY();
    }

    /**
     * @notice Balance total del vault (strategy + buffer)
     * @return Total USDT controlado por vault
     */
    function getTotalBalance() external view returns (uint256) {
        uint256 strategyBalance = strategy.balanceOf(address(this));
        uint256 vaultBuffer = usdt.balanceOf(address(this));
        return strategyBalance + vaultBuffer;
    }

    /**
     * @notice Estadísticas completas del vault
     * @return totalDepositsAmount Total principal depositado
     * @return totalYieldEarnedAmount Total yield generado
     * @return strategyBalance Balance en strategy
     * @return vaultBuffer Buffer de liquidez
     * @return protocolFeesAmount Fees acumulados
     * @return lossesAmount Losses acumuladas
     * @return apy APY actual
     */
    function getVaultStats() external view returns (
        uint256 totalDepositsAmount,
        uint256 totalYieldEarnedAmount,
        uint256 strategyBalance,
        uint256 vaultBuffer,
        uint256 protocolFeesAmount,
        uint256 lossesAmount,
        uint256 apy
    ) {
        totalDepositsAmount = totalDeposits;
        totalYieldEarnedAmount = totalYieldEarned;
        strategyBalance = strategy.balanceOf(address(this));
        vaultBuffer = usdt.balanceOf(address(this));
        protocolFeesAmount = accumulatedProtocolFees;
        lossesAmount = accumulatedLosses;
        apy = strategy.getAPY();
    }
}
