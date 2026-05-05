// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MockUSDC.sol";
import "../src/MockOracle.sol";
import "../src/PerpetualExchange.sol";
import "../src/StrategyRegistry.sol";
import "../src/CopyTracker.sol";

contract CopyTrackerTest is Test {
    MockUSDC usdc;
    MockOracle oracle;
    PerpetualExchange exchange;
    StrategyRegistry registry;
    CopyTracker tracker;

    address owner = address(0x1);
    address trader = address(0x2);
    address follower = address(0x3);
    bytes32 btc = keccak256("BTC");
    bytes32 eth = keccak256("ETH");

    function setUp() public {
        vm.startPrank(owner);
        usdc = new MockUSDC();
        oracle = new MockOracle();
        exchange = new PerpetualExchange(address(usdc), address(oracle));
        registry = new StrategyRegistry();
        tracker = new CopyTracker(address(usdc), address(exchange), address(registry));

        // Setup exchange permission
        exchange.setCopyTracker(address(tracker));

        // Setup Oracle prices
        oracle.addAsset(btc, 50000e18);
        oracle.addAsset(eth, 3000e18);
        vm.stopPrank();

        // Trader registers and publishes strategy
        vm.startPrank(trader);
        registry.registerTrader("PepeTrader");
        StrategyRegistry.Allocation[] memory allocations = new StrategyRegistry.Allocation[](2);
        allocations[0] = StrategyRegistry.Allocation(btc, 6000, true, 2);  // 60% BTC Long 2x
        allocations[1] = StrategyRegistry.Allocation(eth, 4000, false, 5); // 40% ETH Short 5x
        registry.publishStrategy(allocations);
        vm.stopPrank();

        // Give follower USDC
        usdc.mint(follower, 10000e18);
    }

    // 1. 跟單後 positions 數量正確
    // 2. 跟單後每個 position 的 margin 比例正確
    // 3. 跟單後 entryPrice 都鎖在當下 oracle 價
    function test_FollowTraderSuccess() public {
        vm.startPrank(follower);
        usdc.approve(address(tracker), 1000e18);
        tracker.followTrader(trader, 1000e18);
        vm.stopPrank();

        CopyTracker.CopyRecord[] memory records = tracker.getCopyRecords(follower);
        assertEq(records.length, 1);
        assertEq(records[0].positionIds.length, 2);
        assertEq(records[0].initialAmount, 1000e18);

        // Position 0 (BTC)
        PerpetualExchange.Position memory p0 = exchange.getPosition(records[0].positionIds[0]);
        assertEq(p0.asset, btc);
        assertEq(p0.margin, 600e18); // 60% of 1000
        assertEq(p0.entryPrice, 50000e18);
        assertTrue(p0.isLong);
        assertEq(p0.leverage, 2);

        // Position 1 (ETH)
        PerpetualExchange.Position memory p1 = exchange.getPosition(records[0].positionIds[1]);
        assertEq(p1.asset, eth);
        assertEq(p1.margin, 400e18); // 40% of 1000
        assertEq(p1.entryPrice, 3000e18);
        assertFalse(p1.isLong);
        assertEq(p1.leverage, 5);
    }

    // 4. 沒授權 USDC 會 revert
    function test_RevertNoApprove() public {
        vm.startPrank(follower);
        vm.expectRevert(); // ERC20InsufficientAllowance or similar
        tracker.followTrader(trader, 1000e18);
        vm.stopPrank();
    }

    // 5. unfollow 後所有 positions 都關閉，freeMargin 加回
    function test_UnfollowAndCloseAll() public {
        vm.startPrank(follower);
        usdc.approve(address(tracker), 1000e18);
        tracker.followTrader(trader, 1000e18);
        
        tracker.unfollowAndCloseAll(0);
        vm.stopPrank();

        CopyTracker.CopyRecord[] memory records = tracker.getCopyRecords(follower);
        assertFalse(records[0].active);

        // Check positions closed
        PerpetualExchange.Position memory p0 = exchange.getPosition(records[0].positionIds[0]);
        assertFalse(p0.isOpen);
        PerpetualExchange.Position memory p1 = exchange.getPosition(records[0].positionIds[1]);
        assertFalse(p1.isOpen);

        // Check margin returned (no price change, should be 1000)
        assertEq(exchange.freeMargin(follower), 1000e18);
    }

    function test_MultipleFollowers() public {
        address f2 = address(0x4);
        usdc.mint(f2, 5000e18);

        vm.prank(follower);
        usdc.approve(address(tracker), 1000e18);
        vm.prank(follower);
        tracker.followTrader(trader, 1000e18);

        vm.prank(f2);
        usdc.approve(address(tracker), 2000e18);
        vm.prank(f2);
        tracker.followTrader(trader, 2000e18);

        assertEq(tracker.getFollowerCount(trader), 2);
    }
}
