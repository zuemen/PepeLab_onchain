// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./MockUSDC.sol";
import "./MockOracle.sol";

contract PerpetualExchange is Ownable, ReentrancyGuard {
    struct Position {
        uint256 id;
        address owner;
        bytes32 asset;
        bool isLong;
        uint256 entryPrice;     // 18 decimals
        uint256 margin;         // 18 decimals
        uint256 leverage;       // 1, 2, or 5
        uint256 openedAt;
        uint256 closedAt;
        int256 realizedPnL;
        bool isOpen;
    }

    MockUSDC public immutable usdc;
    MockOracle public immutable oracle;

    mapping(uint256 => Position) public positions;
    mapping(address => uint256[]) public userPositions;
    mapping(address => uint256) public freeMargin;
    
    uint256 public nextPositionId;
    address public copyTracker;

    uint256 public constant MAX_LEVERAGE = 5;
    uint256 public constant MIN_MARGIN = 10e18;

    event PositionOpened(uint256 indexed id, address indexed owner, bytes32 asset, bool isLong, uint256 price, uint256 margin, uint256 leverage);
    event PositionClosed(uint256 indexed id, address indexed owner, uint256 price, int256 pnl, uint256 returnedAmount);
    event MarginDeposited(address indexed user, uint256 amount);
    event MarginWithdrawn(address indexed user, uint256 amount);

    constructor(address _usdc, address _oracle) Ownable(msg.sender) {
        usdc = MockUSDC(_usdc);
        oracle = MockOracle(_oracle);
    }

    modifier onlyCopyTracker() {
        require(msg.sender == copyTracker, "Only copyTracker can call");
        _;
    }

    function setCopyTracker(address _copyTracker) external onlyOwner {
        copyTracker = _copyTracker;
    }

    function depositMargin(uint256 amount) external nonReentrant {
        _depositMargin(msg.sender, msg.sender, amount);
    }

    function depositMarginFor(address user, uint256 amount) external onlyCopyTracker nonReentrant {
        _depositMargin(msg.sender, user, amount);
    }

    function _depositMargin(address from, address to, uint256 amount) internal {
        usdc.transferFrom(from, address(this), amount);
        freeMargin[to] += amount;
        emit MarginDeposited(to, amount);
    }

    function withdrawMargin(uint256 amount) external nonReentrant {
        require(freeMargin[msg.sender] >= amount, "Insufficient free margin");
        freeMargin[msg.sender] -= amount;
        usdc.transfer(msg.sender, amount);
        emit MarginWithdrawn(msg.sender, amount);
    }

    function openPosition(
        bytes32 asset, 
        bool isLong, 
        uint256 margin, 
        uint256 leverage
    ) external nonReentrant returns (uint256) {
        return _openPosition(msg.sender, asset, isLong, margin, leverage);
    }

    function openPositionFor(
        address user,
        bytes32 asset,
        bool isLong,
        uint256 margin,
        uint256 leverage
    ) external onlyCopyTracker nonReentrant returns (uint256) {
        return _openPosition(user, asset, isLong, margin, leverage);
    }

    function _openPosition(
        address user,
        bytes32 asset,
        bool isLong,
        uint256 margin,
        uint256 leverage
    ) internal returns (uint256) {
        require(margin >= MIN_MARGIN, "Margin too low");
        require(leverage == 1 || leverage == 2 || leverage == 5, "Invalid leverage");
        require(freeMargin[user] >= margin, "Insufficient free margin");
        
        // Oracle check
        (uint256 price, ) = oracle.getPrice(asset);
        require(price > 0, "Invalid oracle price");
        require(!oracle.isStale(asset), "Price is stale");

        freeMargin[user] -= margin;

        uint256 positionId = nextPositionId++;
        Position storage pos = positions[positionId];
        pos.id = positionId;
        pos.owner = user;
        pos.asset = asset;
        pos.isLong = isLong;
        pos.entryPrice = price;
        pos.margin = margin;
        pos.leverage = leverage;
        pos.openedAt = block.timestamp;
        pos.isOpen = true;

        userPositions[user].push(positionId);

        emit PositionOpened(positionId, user, asset, isLong, price, margin, leverage);
        return positionId;
    }

    function closePosition(uint256 positionId) external nonReentrant {
        Position storage pos = positions[positionId];
        require(pos.isOpen, "Position already closed");
        require(msg.sender == pos.owner || msg.sender == copyTracker, "Not authorized");

        (uint256 currentPrice, ) = oracle.getPrice(pos.asset);
        require(!oracle.isStale(pos.asset), "Price is stale");

        // Calculate PnL
        // notional = margin * leverage
        // size = notional * 1e18 / entryPrice
        // priceChange = currentPrice - entryPrice
        // pnl = priceChange * size / 1e18
        
        uint256 notional = pos.margin * pos.leverage;
        uint256 size = (notional * 1e18) / pos.entryPrice;
        
        int256 priceChange = int256(currentPrice) - int256(pos.entryPrice);
        int256 pnl = (priceChange * int256(size)) / 1e18;
        
        if (!pos.isLong) {
            pnl = -pnl;
        }

        int256 closeAmountInt = int256(pos.margin) + pnl;
        uint256 closeAmount = closeAmountInt > 0 ? uint256(closeAmountInt) : 0;

        pos.isOpen = false;
        pos.closedAt = block.timestamp;
        pos.realizedPnL = pnl;

        freeMargin[pos.owner] += closeAmount;

        emit PositionClosed(positionId, pos.owner, currentPrice, pnl, closeAmount);
    }

    function getUnrealizedPnL(uint256 positionId) public view returns (int256) {
        Position storage pos = positions[positionId];
        if (!pos.isOpen) return pos.realizedPnL;

        (uint256 currentPrice, ) = oracle.getPrice(pos.asset);
        uint256 notional = pos.margin * pos.leverage;
        uint256 size = (notional * 1e18) / pos.entryPrice;
        
        int256 priceChange = int256(currentPrice) - int256(pos.entryPrice);
        int256 pnl = (priceChange * int256(size)) / 1e18;
        
        if (!pos.isLong) {
            pnl = -pnl;
        }
        return pnl;
    }

    function getPositionValue(uint256 positionId) public view returns (uint256) {
        Position storage pos = positions[positionId];
        if (!pos.isOpen) return 0;

        int256 pnl = getUnrealizedPnL(positionId);
        int256 value = int256(pos.margin) + pnl;
        return value > 0 ? uint256(value) : 0;
    }

    function getUserPositions(address user) external view returns (uint256[] memory) {
        return userPositions[user];
    }

    function getPosition(uint256 positionId) external view returns (Position memory) {
        return positions[positionId];
    }
}
