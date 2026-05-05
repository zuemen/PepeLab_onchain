// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./StrategyRegistry.sol";
import "./PerpetualExchange.sol";
import "./MockUSDC.sol";

contract CopyTracker is Ownable {
    struct CopyRecord {
        address trader;
        uint256 versionId;
        uint256 initialAmount;
        uint256[] positionIds;
        uint256 copiedAt;
        bool active;
    }

    MockUSDC public immutable usdc;
    PerpetualExchange public immutable exchange;
    StrategyRegistry public immutable registry;

    mapping(address => CopyRecord[]) public copyRecords;
    mapping(address => address[]) public followersByTrader;

    event TraderFollowed(address indexed follower, address indexed trader, uint256 amount, uint256 recordIdx);
    event TraderUnfollowed(address indexed follower, address indexed trader, uint256 recordIdx);

    constructor(address _usdc, address _exchange, address _registry) Ownable(msg.sender) {
        usdc = MockUSDC(_usdc);
        exchange = PerpetualExchange(_exchange);
        registry = StrategyRegistry(_registry);
    }

    function followTrader(address trader, uint256 totalMargin) external {
        // 1. Get latest strategy
        (StrategyRegistry.Allocation[] memory allocations, uint256 versionId) = registry.getLatestStrategy(trader);
        require(allocations.length > 0, "Trader has no strategy");

        // 2. Transfer USDC to this contract
        usdc.transferFrom(msg.sender, address(this), totalMargin);

        // 3. Approve exchange to take USDC
        usdc.approve(address(exchange), totalMargin);

        // 4. Deposit margin for follower on exchange
        exchange.depositMarginFor(msg.sender, totalMargin);

        // 5. Open positions for each allocation
        uint256[] memory positionIds = new uint256[](allocations.length);
        for (uint256 i = 0; i < allocations.length; i++) {
            uint256 portion = (totalMargin * allocations[i].weight) / 10000;
            // Open position on exchange using the follower's deposited margin
            positionIds[i] = exchange.openPositionFor(
                msg.sender,
                allocations[i].asset,
                allocations[i].isLong,
                portion,
                allocations[i].leverage
            );
        }

        // 6. Record the copy action
        copyRecords[msg.sender].push(CopyRecord({
            trader: trader,
            versionId: versionId,
            initialAmount: totalMargin,
            positionIds: positionIds,
            copiedAt: block.timestamp,
            active: true
        }));

        followersByTrader[trader].push(msg.sender);

        emit TraderFollowed(msg.sender, trader, totalMargin, copyRecords[msg.sender].length - 1);
    }

    function unfollowAndCloseAll(uint256 recordIdx) external {
        require(recordIdx < copyRecords[msg.sender].length, "Invalid record index");
        CopyRecord storage record = copyRecords[msg.sender][recordIdx];
        require(record.active, "Record already inactive");

        for (uint256 i = 0; i < record.positionIds.length; i++) {
            exchange.closePositionFor(msg.sender, record.positionIds[i]);
        }

        record.active = false;
        emit TraderUnfollowed(msg.sender, record.trader, recordIdx);
    }

    function getCopyRecords(address follower) external view returns (CopyRecord[] memory) {
        return copyRecords[follower];
    }

    function getFollowerCount(address trader) external view returns (uint256) {
        return followersByTrader[trader].length;
    }
}
