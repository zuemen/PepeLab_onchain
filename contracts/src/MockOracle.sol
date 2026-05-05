// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract MockOracle is Ownable {
    struct PriceData {
        uint256 price;
        uint256 updatedAt;
    }

    mapping(bytes32 => PriceData) public prices;
    uint256 public constant STALE_THRESHOLD = 86400; // 24 hours

    event PriceUpdated(bytes32 indexed symbol, uint256 newPrice, uint256 updatedAt);

    constructor() Ownable(msg.sender) {}

    function addAsset(bytes32 symbol, uint256 initialPrice) external onlyOwner {
        require(prices[symbol].updatedAt == 0, "Asset already exists");
        prices[symbol] = PriceData({
            price: initialPrice,
            updatedAt: block.timestamp
        });
        emit PriceUpdated(symbol, initialPrice, block.timestamp);
    }

    function updatePrice(bytes32 symbol, uint256 newPrice) external onlyOwner {
        PriceData storage data = prices[symbol];
        require(data.updatedAt != 0, "Asset does not exist");
        
        uint256 oldPrice = data.price;
        
        // 50% deviation check
        // Max: oldPrice * 1.5, Min: oldPrice * 0.5
        if (newPrice > oldPrice) {
            require(newPrice <= (oldPrice * 150) / 100, "Price increase > 50%");
        } else {
            require(newPrice >= (oldPrice * 50) / 100, "Price decrease > 50%");
        }

        data.price = newPrice;
        data.updatedAt = block.timestamp;

        emit PriceUpdated(symbol, newPrice, block.timestamp);
    }

    function getPrice(bytes32 symbol) external view returns (uint256 price, uint256 updatedAt) {
        PriceData memory data = prices[symbol];
        require(data.updatedAt != 0, "Asset does not exist");
        return (data.price, data.updatedAt);
    }

    function isStale(bytes32 symbol) external view returns (bool) {
        PriceData memory data = prices[symbol];
        if (data.updatedAt == 0) return true;
        return (block.timestamp - data.updatedAt) > STALE_THRESHOLD;
    }
}
