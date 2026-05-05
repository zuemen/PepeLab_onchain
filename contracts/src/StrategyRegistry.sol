// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract StrategyRegistry {
    struct Allocation {
        bytes32 asset;
        uint256 weight;     // bps, total weight = 10000
        bool isLong;
        uint256 leverage;   // 1, 2, or 5
    }

    struct StrategyVersion {
        Allocation[] allocations;
        uint256 createdAt;
    }

    struct TraderProfile {
        bool isRegistered;
        string displayName;
        uint256 createdAt;
    }

    mapping(address => TraderProfile) public traders;
    mapping(address => StrategyVersion[]) public strategies;
    address[] public traderList;

    event TraderRegistered(address indexed trader, string displayName);
    event StrategyPublished(address indexed trader, uint256 versionId, uint256 createdAt);

    function registerTrader(string memory displayName) external {
        require(!traders[msg.sender].isRegistered, "Trader already registered");
        require(bytes(displayName).length > 0, "Display name cannot be empty");

        traders[msg.sender] = TraderProfile({
            isRegistered: true,
            displayName: displayName,
            createdAt: block.timestamp
        });
        traderList.push(msg.sender);

        emit TraderRegistered(msg.sender, displayName);
    }

    function publishStrategy(Allocation[] memory allocations) external {
        require(traders[msg.sender].isRegistered, "Trader not registered");
        require(allocations.length > 0, "Allocations cannot be empty");

        uint256 totalWeight = 0;
        for (uint256 i = 0; i < allocations.length; i++) {
            require(allocations[i].weight > 0, "Weight must be greater than 0");
            require(
                allocations[i].leverage == 1 || 
                allocations[i].leverage == 2 || 
                allocations[i].leverage == 5, 
                "Invalid leverage"
            );
            totalWeight += allocations[i].weight;
        }

        require(totalWeight == 10000, "Total weight must be 10000 bps");

        // Create new strategy version
        StrategyVersion storage newVersion = strategies[msg.sender].push();
        newVersion.createdAt = block.timestamp;
        
        for (uint256 i = 0; i < allocations.length; i++) {
            newVersion.allocations.push(allocations[i]);
        }

        emit StrategyPublished(msg.sender, strategies[msg.sender].length - 1, block.timestamp);
    }

    function getLatestStrategy(address trader) external view returns (Allocation[] memory allocations, uint256 versionId) {
        require(strategies[trader].length > 0, "No strategy found for trader");
        versionId = strategies[trader].length - 1;
        allocations = strategies[trader][versionId].allocations;
    }

    function getStrategyCount(address trader) external view returns (uint256) {
        return strategies[trader].length;
    }

    function getAllTraders() external view returns (address[] memory) {
        return traderList;
    }

    function getStrategyVersion(address trader, uint256 versionId) external view returns (Allocation[] memory allocations, uint256 createdAt) {
        require(versionId < strategies[trader].length, "Version does not exist");
        StrategyVersion storage version = strategies[trader][versionId];
        return (version.allocations, version.createdAt);
    }
}
