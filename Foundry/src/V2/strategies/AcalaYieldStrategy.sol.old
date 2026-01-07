// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../Interfaces.sol";

/**
 * @title AcalaYieldStrategy
 * @author RoomFi Team - Firrton
 * @notice Strategy que deposita USDT en Acala para generar yield via XCM
 * @dev Integra con Acala Lending + DEX usando XCM (Cross-Consensus Messaging)
 *
 * ARQUITECTURA:
 * - Moonbeam (Parachain ID 2004) ←XCM→ Acala (Parachain ID 2000)
 * - USDT transferido via XCM
 * - Yield farming en: 70% Lending, 30% DEX
 * - APY target: 6-12%
 *
 * COMPONENTES DE ACALA:
 * - Acala Dollar Lending Protocol (taUSD)
 * - Acala Swap DEX (USDT-aUSD pool)
 * - Liquid Staking (LDOT)
 *
 * XCM FLOW:
 * 1. Moonbeam strategy recibe USDT
 * 2. XCM message: Transfer USDT to Acala
 * 3. Acala pallet recibe y deposita en lending/DEX
 * 4. Yield acumula en Acala
 * 5. Harvest: XCM message para claim rewards
 * 6. Withdraw: XCM message para transfer back to Moonbeam
 */
contract AcalaYieldStrategy is Ownable, ReentrancyGuard {

    // ============================================
    // STATE VARIABLES
    // ============================================

    /// @notice USDT token (6 decimals)
    IERC20 public immutable usdt;

    /// @notice XCM Precompile address (Moonbeam)
    address public constant XCM_PRECOMPILE = 0x0000000000000000000000000000000000000804;

    /// @notice Acala Parachain ID
    uint32 public constant ACALA_PARACHAIN_ID = 2000;

    /// @notice Moonbeam Parachain ID
    uint32 public constant MOONBEAM_PARACHAIN_ID = 2004;

    /// @notice Strategy allocation
    uint256 public lendingAllocation = 70;  // 70% en Acala Lending
    uint256 public dexAllocation = 30;      // 30% en Acala DEX

    /// @notice Total depositado en Acala
    uint256 public totalDeployed;

    /// @notice Total en lending
    uint256 public deployedInLending;

    /// @notice Total en DEX
    uint256 public deployedInDEX;

    /// @notice Último harvest timestamp
    uint256 public lastHarvestTime;

    /// @notice Total yield cosechado históricamente
    uint256 public totalYieldHarvested;

    /// @notice Pending withdrawals (XCM es asíncrono)
    mapping(bytes32 => PendingWithdrawal) public pendingWithdrawals;

    /// @notice Emergency pause
    bool public paused;

    // ============================================
    // STRUCTS
    // ============================================

    struct PendingWithdrawal {
        uint256 amount;
        uint256 timestamp;
        bool completed;
    }

    // ============================================
    // EVENTS
    // ============================================

    event Deposited(uint256 amount, uint256 toLending, uint256 toDEX, uint256 timestamp);
    event WithdrawInitiated(bytes32 indexed withdrawId, uint256 amount, uint256 timestamp);
    event WithdrawCompleted(bytes32 indexed withdrawId, uint256 amount, uint256 timestamp);
    event YieldHarvested(uint256 lendingYield, uint256 dexYield, uint256 totalYield, uint256 timestamp);
    event AllocationUpdated(uint256 lending, uint256 dex);
    event XCMTransferSent(uint32 indexed destParachain, uint256 amount, bytes32 messageHash);
    event StrategyPaused(bool paused);

    // ============================================
    // ERRORS
    // ============================================

    error StrategyIsPaused();
    error InvalidAmount();
    error InvalidAllocation();
    error XCMTransferFailed();
    error WithdrawalNotFound();
    error WithdrawalAlreadyCompleted();

    // ============================================
    // MODIFIERS
    // ============================================

    modifier whenNotPaused() {
        if (paused) revert StrategyIsPaused();
        _;
    }

    // ============================================
    // CONSTRUCTOR
    // ============================================

    /**
     * @notice Inicializa la strategy
     * @param _usdt Address del token USDT en Moonbeam
     * @param initialOwner Owner del contrato
     */
    constructor(
        address _usdt,
        address initialOwner
    ) Ownable(initialOwner) {
        require(_usdt != address(0), "Invalid USDT address");

        usdt = IERC20(_usdt);
        lastHarvestTime = block.timestamp;
    }

    // ============================================
    // CORE FUNCTIONS
    // ============================================

    /**
     * @notice Deposita USDT y lo despliega en Acala
     * @param amount Cantidad de USDT
     *
     * FLUJO:
     * 1. Recibe USDT del vault
     * 2. Split según allocation (70% lending, 30% DEX)
     * 3. XCM transfer a Acala
     * 4. Acala pallet deposita en lending/DEX
     */
    function deposit(uint256 amount)
        external
        onlyOwner
        nonReentrant
        whenNotPaused
    {
        if (amount == 0) revert InvalidAmount();

        // Transfer USDT del vault
        bool success = usdt.transferFrom(msg.sender, address(this), amount);
        require(success, "USDT transfer failed");

        // Split según allocation
        uint256 toLending = (amount * lendingAllocation) / 100;
        uint256 toDEX = amount - toLending;

        // Deploy to Acala Lending via XCM
        if (toLending > 0) {
            _deployToLending(toLending);
            deployedInLending += toLending;
        }

        // Deploy to Acala DEX via XCM
        if (toDEX > 0) {
            _deployToDEX(toDEX);
            deployedInDEX += toDEX;
        }

        totalDeployed += amount;

        emit Deposited(amount, toLending, toDEX, block.timestamp);
    }

    /**
     * @notice Retira USDT de Acala back to Moonbeam
     * @param amount Cantidad a retirar
     *
     * NOTA: XCM es asíncrono, el withdrawal completo puede tomar tiempo
     */
    function withdraw(uint256 amount)
        external
        onlyOwner
        nonReentrant
        returns (bytes32 withdrawId)
    {
        if (amount == 0) revert InvalidAmount();
        require(amount <= totalDeployed, "Insufficient deployed balance");

        // Generate withdrawal ID
        withdrawId = keccak256(abi.encodePacked(
            block.timestamp,
            amount,
            msg.sender
        ));

        // Registrar pending withdrawal
        pendingWithdrawals[withdrawId] = PendingWithdrawal({
            amount: amount,
            timestamp: block.timestamp,
            completed: false
        });

        // Split según allocation actual
        uint256 fromLending = (amount * lendingAllocation) / 100;
        uint256 fromDEX = amount - fromLending;

        // Withdraw from Acala Lending via XCM
        if (fromLending > 0) {
            _withdrawFromLending(fromLending);
            deployedInLending -= fromLending;
        }

        // Withdraw from Acala DEX via XCM
        if (fromDEX > 0) {
            _withdrawFromDEX(fromDEX);
            deployedInDEX -= fromDEX;
        }

        totalDeployed -= amount;

        emit WithdrawInitiated(withdrawId, amount, block.timestamp);

        return withdrawId;
    }

    /**
     * @notice Marca un withdrawal como completado
     * @dev Llamado manualmente o por relayer después de confirmar XCM
     */
    function completeWithdrawal(bytes32 withdrawId) external onlyOwner {
        PendingWithdrawal storage withdrawal = pendingWithdrawals[withdrawId];

        if (withdrawal.amount == 0) revert WithdrawalNotFound();
        if (withdrawal.completed) revert WithdrawalAlreadyCompleted();

        withdrawal.completed = true;

        emit WithdrawCompleted(withdrawId, withdrawal.amount, block.timestamp);
    }

    /**
     * @notice Cosecha yield generado en Acala
     * @return yieldEarned Total yield cosechado
     *
     * FLUJO:
     * 1. XCM call para claim lending rewards
     * 2. XCM call para claim DEX fees
     * 3. Transfer rewards back to Moonbeam
     */
    function harvestYield()
        external
        onlyOwner
        nonReentrant
        returns (uint256 yieldEarned)
    {
        // Harvest lending rewards
        uint256 lendingRewards = _harvestLendingRewards();

        // Harvest DEX rewards
        uint256 dexRewards = _harvestDEXRewards();

        yieldEarned = lendingRewards + dexRewards;
        totalYieldHarvested += yieldEarned;
        lastHarvestTime = block.timestamp;

        emit YieldHarvested(lendingRewards, dexRewards, yieldEarned, block.timestamp);

        return yieldEarned;
    }

    // ============================================
    // XCM INTEGRATION (ACALA LENDING)
    // ============================================

    /**
     * @notice Deposita USDT en Acala Lending via XCM
     * @param amount Cantidad de USDT
     *
     * XCM MESSAGE:
     * - Origen: Moonbeam (parachain 2004)
     * - Destino: Acala (parachain 2000)
     * - Asset: USDT
     * - Acción: Deposit en Acala Lending
     */
    function _deployToLending(uint256 amount) internal {
        // Approve XCM precompile
        usdt.approve(XCM_PRECOMPILE, amount);

        // Construir XCM message
        // Nota: Esto es una simplificación. En producción usar XCM v3/v4
        bytes memory xcmMessage = _buildXCMLendingDeposit(amount);

        // Send XCM message
        (bool success, bytes memory returnData) = XCM_PRECOMPILE.call(xcmMessage);

        if (!success) revert XCMTransferFailed();

        bytes32 messageHash = keccak256(returnData);
        emit XCMTransferSent(ACALA_PARACHAIN_ID, amount, messageHash);
    }

    /**
     * @notice Retira USDT de Acala Lending via XCM
     */
    function _withdrawFromLending(uint256 amount) internal {
        bytes memory xcmMessage = _buildXCMLendingWithdraw(amount);

        (bool success, bytes memory returnData) = XCM_PRECOMPILE.call(xcmMessage);

        if (!success) revert XCMTransferFailed();

        bytes32 messageHash = keccak256(returnData);
        emit XCMTransferSent(ACALA_PARACHAIN_ID, amount, messageHash);
    }

    /**
     * @notice Cosecha rewards de Acala Lending
     */
    function _harvestLendingRewards() internal returns (uint256) {
        // XCM call para claim lending rewards
        bytes memory xcmMessage = _buildXCMLendingHarvest();

        (bool success, ) = XCM_PRECOMPILE.call(xcmMessage);

        if (!success) return 0;

        // En producción, esto retornaría el amount real de rewards
        // Por ahora, retorna 0 (se actualizará cuando se implementen pallets de Acala)
        return 0;
    }

    // ============================================
    // XCM INTEGRATION (ACALA DEX)
    // ============================================

    /**
     * @notice Deposita USDT en Acala DEX (liquidity pool) via XCM
     */
    function _deployToDEX(uint256 amount) internal {
        usdt.approve(XCM_PRECOMPILE, amount);

        bytes memory xcmMessage = _buildXCMDEXDeposit(amount);

        (bool success, bytes memory returnData) = XCM_PRECOMPILE.call(xcmMessage);

        if (!success) revert XCMTransferFailed();

        bytes32 messageHash = keccak256(returnData);
        emit XCMTransferSent(ACALA_PARACHAIN_ID, amount, messageHash);
    }

    /**
     * @notice Retira USDT de Acala DEX via XCM
     */
    function _withdrawFromDEX(uint256 amount) internal {
        bytes memory xcmMessage = _buildXCMDEXWithdraw(amount);

        (bool success, bytes memory returnData) = XCM_PRECOMPILE.call(xcmMessage);

        if (!success) revert XCMTransferFailed();

        bytes32 messageHash = keccak256(returnData);
        emit XCMTransferSent(ACALA_PARACHAIN_ID, amount, messageHash);
    }

    /**
     * @notice Cosecha fees de Acala DEX
     */
    function _harvestDEXRewards() internal returns (uint256) {
        bytes memory xcmMessage = _buildXCMDEXHarvest();

        (bool success, ) = XCM_PRECOMPILE.call(xcmMessage);

        if (!success) return 0;

        return 0; // Placeholder
    }

    // ============================================
    // XCM MESSAGE BUILDERS
    // ============================================

    /**
     * @notice Construye XCM message para deposit en Acala Lending
     *
     * XCM v3 FORMAT (simplificado):
     * - WithdrawAsset: Retirar USDT del sender
     * - BuyExecution: Pagar fees de XCM
     * - DepositAsset: Depositar en Acala
     * - Transact: Llamar pallet de lending
     */
    function _buildXCMLendingDeposit(uint256 amount) internal pure returns (bytes memory) {
        // Placeholder - En producción usar XCM builder library
        // Ejemplo de estructura XCM:
        /*
        {
            WithdrawAsset: [{ id: USDT, fun: Fungible(amount) }],
            BuyExecution: { fees: ..., weightLimit: Unlimited },
            Transact: {
                originType: SovereignAccount,
                call: acalaLending.deposit(amount)
            },
            DepositAsset: { assets: All, beneficiary: ... }
        }
        */

        return abi.encode(
            "XCM_ACALA_LENDING_DEPOSIT",
            ACALA_PARACHAIN_ID,
            amount
        );
    }

    function _buildXCMLendingWithdraw(uint256 amount) internal pure returns (bytes memory) {
        return abi.encode(
            "XCM_ACALA_LENDING_WITHDRAW",
            ACALA_PARACHAIN_ID,
            amount
        );
    }

    function _buildXCMLendingHarvest() internal pure returns (bytes memory) {
        return abi.encode(
            "XCM_ACALA_LENDING_HARVEST",
            ACALA_PARACHAIN_ID
        );
    }

    function _buildXCMDEXDeposit(uint256 amount) internal pure returns (bytes memory) {
        return abi.encode(
            "XCM_ACALA_DEX_DEPOSIT",
            ACALA_PARACHAIN_ID,
            amount
        );
    }

    function _buildXCMDEXWithdraw(uint256 amount) internal pure returns (bytes memory) {
        return abi.encode(
            "XCM_ACALA_DEX_WITHDRAW",
            ACALA_PARACHAIN_ID,
            amount
        );
    }

    function _buildXCMDEXHarvest() internal pure returns (bytes memory) {
        return abi.encode(
            "XCM_ACALA_DEX_HARVEST",
            ACALA_PARACHAIN_ID
        );
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @notice Obtiene balance total en Acala
     * @dev En producción, query via XCM. Por ahora usa tracking local.
     */
    function balanceOf(address /* vault */) external view returns (uint256) {
        // TODO: Query balance real via XCM read call
        // Por ahora, usa tracking local
        return totalDeployed;
    }

    /**
     * @notice Obtiene APY estimado
     * @return APY en basis points (800 = 8%)
     *
     * CÁLCULO:
     * - Acala Lending: ~6-8% APY
     * - Acala DEX: ~10-15% APY
     * - Weighted average según allocation
     */
    function getAPY() external view returns (uint256) {
        // APYs estimados (en producción, query real de Acala)
        uint256 lendingAPY = 700;  // 7% APY
        uint256 dexAPY = 1200;      // 12% APY

        // Weighted average
        uint256 weightedAPY = (lendingAPY * lendingAllocation + dexAPY * dexAllocation) / 100;

        return weightedAPY;
    }

    /**
     * @notice Obtiene deployment detallado
     */
    function getDeploymentInfo() external view returns (
        uint256 total,
        uint256 lending,
        uint256 dex,
        uint256 lendingPercent,
        uint256 dexPercent
    ) {
        total = totalDeployed;
        lending = deployedInLending;
        dex = deployedInDEX;
        lendingPercent = lendingAllocation;
        dexPercent = dexAllocation;
    }

    /**
     * @notice Obtiene info de un pending withdrawal
     */
    function getWithdrawalInfo(bytes32 withdrawId) external view returns (
        uint256 amount,
        uint256 timestamp,
        bool completed
    ) {
        PendingWithdrawal memory withdrawal = pendingWithdrawals[withdrawId];
        return (withdrawal.amount, withdrawal.timestamp, withdrawal.completed);
    }

    /**
     * @notice Obtiene estadísticas completas
     */
    function getStrategyStats() external view returns (
        uint256 _totalDeployed,
        uint256 _deployedLending,
        uint256 _deployedDEX,
        uint256 _totalYieldHarvested,
        uint256 _currentAPY,
        uint256 _lastHarvest,
        bool _isPaused
    ) {
        _totalDeployed = totalDeployed;
        _deployedLending = deployedInLending;
        _deployedDEX = deployedInDEX;
        _totalYieldHarvested = totalYieldHarvested;
        _currentAPY = this.getAPY();
        _lastHarvest = lastHarvestTime;
        _isPaused = paused;
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /**
     * @notice Actualiza allocation entre lending y DEX
     * @param _lending Porcentaje para lending (0-100)
     * @param _dex Porcentaje para DEX (0-100)
     */
    function updateAllocation(uint256 _lending, uint256 _dex) external onlyOwner {
        if (_lending + _dex != 100) revert InvalidAllocation();

        lendingAllocation = _lending;
        dexAllocation = _dex;

        emit AllocationUpdated(_lending, _dex);
    }

    /**
     * @notice Rebalancea fondos entre lending y DEX
     * @dev Ajusta deployment para match allocation target
     */
    function rebalance() external onlyOwner nonReentrant {
        if (totalDeployed == 0) return;

        uint256 targetLending = (totalDeployed * lendingAllocation) / 100;
        uint256 targetDEX = totalDeployed - targetLending;

        // Si lending está over-allocated
        if (deployedInLending > targetLending) {
            uint256 excess = deployedInLending - targetLending;
            _withdrawFromLending(excess);
            _deployToDEX(excess);

            deployedInLending -= excess;
            deployedInDEX += excess;
        }
        // Si DEX está over-allocated
        else if (deployedInDEX > targetDEX) {
            uint256 excess = deployedInDEX - targetDEX;
            _withdrawFromDEX(excess);
            _deployToLending(excess);

            deployedInDEX -= excess;
            deployedInLending += excess;
        }
    }

    /**
     * @notice Toggle pause
     */
    function togglePause() external onlyOwner {
        paused = !paused;
        emit StrategyPaused(paused);
    }

    /**
     * @notice Emergency withdraw all funds back to Moonbeam
     */
    function emergencyWithdrawAll() external onlyOwner {
        if (deployedInLending > 0) {
            _withdrawFromLending(deployedInLending);
        }

        if (deployedInDEX > 0) {
            _withdrawFromDEX(deployedInDEX);
        }

        // Reset tracking
        uint256 total = totalDeployed;
        totalDeployed = 0;
        deployedInLending = 0;
        deployedInDEX = 0;

        // Transfer USDT back to owner (vault)
        uint256 balance = usdt.balanceOf(address(this));
        if (balance > 0) {
            usdt.transfer(owner(), balance);
        }
    }
}
