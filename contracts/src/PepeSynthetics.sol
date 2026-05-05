// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./MockUSDC.sol";
import "./MockOracle.sol";
import "./SynthToken.sol";

/**
 * @title PepeSynthetics
 * @dev A simplified copy-trading vault for synthetic assets.
 * Users deposit USDC (Collateral) and a Trader manages positions.
 */
contract PepeSynthetics is Ownable, ReentrancyGuard {
    MockUSDC public immutable collateralToken;
    MockOracle public immutable oracle;

    // Pool-wide positions: symbol => amount
    mapping(bytes32 => uint256) public poolPositions;
    mapping(bytes32 => address) public synthTokens;
    bytes32[] public activeSymbols;
    mapping(bytes32 => bool) public isSymbolActive;

    // Follower balances: LP shares
    uint256 public totalShares;
    mapping(address => uint256) public shares;

    address public trader;

    event Deposited(address indexed user, uint256 amount, uint256 shares);
    event Withdrawn(address indexed user, uint256 amount, uint256 shares);
    event PositionOpened(bytes32 indexed symbol, uint256 amount, uint256 price, uint256 cost);
    event PositionClosed(bytes32 indexed symbol, uint256 amount, uint256 price, uint256 revenue);

    constructor(address _collateral, address _oracle, address _trader) Ownable(msg.sender) {
        collateralToken = MockUSDC(_collateral);
        oracle = MockOracle(_oracle);
        trader = _trader;
    }

    modifier onlyTrader() {
        require(msg.sender == trader || msg.sender == owner(), "Not trader or owner");
        _;
    }

    function setTrader(address _trader) external onlyOwner {
        trader = _trader;
    }

    function addSynthToken(bytes32 symbol, address token) external onlyOwner {
        synthTokens[symbol] = token;
        if (!isSymbolActive[symbol]) {
            activeSymbols.push(symbol);
            isSymbolActive[symbol] = true;
        }
    }

    /**
     * @dev Deposit USDC to get pool shares.
     */
    function deposit(uint256 amount) external nonReentrant {
        uint256 poolValue = getPoolTotalValue();
        uint256 sharesToMint;

        if (totalShares == 0 || poolValue == 0) {
            sharesToMint = amount;
        } else {
            sharesToMint = (amount * totalShares) / poolValue;
        }

        collateralToken.transferFrom(msg.sender, address(this), amount);
        shares[msg.sender] += sharesToMint;
        totalShares += sharesToMint;

        emit Deposited(msg.sender, amount, sharesToMint);
    }

    /**
     * @dev Withdraw USDC by burning shares.
     */
    function withdraw(uint256 shareAmount) external nonReentrant {
        require(shares[msg.sender] >= shareAmount, "Insufficient shares");
        
        uint256 poolValue = getPoolTotalValue();
        uint256 amountToWithdraw = (shareAmount * poolValue) / totalShares;

        shares[msg.sender] -= shareAmount;
        totalShares -= shareAmount;

        // Ensure enough USDC is available (trader might need to close positions first)
        require(collateralToken.balanceOf(address(this)) >= amountToWithdraw, "Insufficient USDC in vault");
        collateralToken.transfer(msg.sender, amountToWithdraw);

        emit Withdrawn(msg.sender, amountToWithdraw, shareAmount);
    }

    /**
     * @dev Trader buys a synthetic asset using pool USDC.
     */
    function openPosition(bytes32 symbol, uint256 amount) external onlyTrader {
        address synth = synthTokens[symbol];
        require(synth != address(0), "Synth not supported");
        require(!oracle.isStale(symbol), "Price is stale");

        (uint256 price, ) = oracle.getPrice(symbol);
        uint256 cost = (amount * price) / 1e18;
        
        require(collateralToken.balanceOf(address(this)) >= cost, "Insufficient USDC to buy");
        
        // "Spend" USDC by transferring to address(0) or just locking it.
        // For simplicity, we'll burn it from the vault's perspective.
        // In a real system, it would go to a counterparty or a liquidity pool.
        collateralToken.transfer(address(0xdead), cost);
        
        SynthToken(synth).mint(address(this), amount);
        poolPositions[symbol] += amount;

        emit PositionOpened(symbol, amount, price, cost);
    }

    /**
     * @dev Trader sells a synthetic asset to get USDC back.
     */
    function closePosition(bytes32 symbol, uint256 amount) external onlyTrader {
        require(poolPositions[symbol] >= amount, "Insufficient position");
        require(!oracle.isStale(symbol), "Price is stale");

        (uint256 price, ) = oracle.getPrice(symbol);
        uint256 revenue = (amount * price) / 1e18;
        
        SynthToken(synthTokens[symbol]).burn(address(this), amount);
        poolPositions[symbol] -= amount;

        // "Receive" USDC by minting it back to the vault.
        collateralToken.mint(address(this), revenue);

        emit PositionClosed(symbol, amount, price, revenue);
    }

    /**
     * @dev Total Value = USDC Balance + Market Value of Synths.
     */
    function getPoolTotalValue() public view returns (uint256) {
        uint256 totalValue = collateralToken.balanceOf(address(this));
        
        for (uint256 i = 0; i < activeSymbols.length; i++) {
            bytes32 symbol = activeSymbols[i];
            uint256 amount = poolPositions[symbol];
            if (amount > 0) {
                (uint256 price, ) = oracle.getPrice(symbol);
                totalValue += (amount * price) / 1e18;
            }
        }
        return totalValue;
    }
}
