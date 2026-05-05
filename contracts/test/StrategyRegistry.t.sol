// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/StrategyRegistry.sol";

contract StrategyRegistryTest is Test {
    StrategyRegistry registry;
    address trader = address(0x1);
    bytes32 btc = keccak256("BTC");
    bytes32 eth = keccak256("ETH");

    function setUp() public {
        registry = new StrategyRegistry();
    }

    // 註冊重複會 revert
    function test_RevertDoubleRegistration() public {
        vm.startPrank(trader);
        registry.registerTrader("PepeTrader");
        vm.expectRevert("Trader already registered");
        registry.registerTrader("PepeTrader2");
        vm.stopPrank();
    }

    // 權重總和不等於 10000 會 revert
    function test_RevertInvalidTotalWeight() public {
        vm.startPrank(trader);
        registry.registerTrader("Trader");
        
        StrategyRegistry.Allocation[] memory allocations = new StrategyRegistry.Allocation[](1);
        allocations[0] = StrategyRegistry.Allocation(btc, 9000, true, 2);
        
        vm.expectRevert("Total weight must be 10000 bps");
        registry.publishStrategy(allocations);
        vm.stopPrank();
    }

    // leverage 無效會 revert (0)
    function test_RevertLeverageZero() public {
        vm.startPrank(trader);
        registry.registerTrader("Trader");
        
        StrategyRegistry.Allocation[] memory allocations = new StrategyRegistry.Allocation[](1);
        allocations[0] = StrategyRegistry.Allocation(btc, 10000, true, 0);
        
        vm.expectRevert("Invalid leverage");
        registry.publishStrategy(allocations);
        vm.stopPrank();
    }

    // leverage 無效會 revert (6)
    function test_RevertLeverageTooHigh() public {
        vm.startPrank(trader);
        registry.registerTrader("Trader");
        
        StrategyRegistry.Allocation[] memory allocations = new StrategyRegistry.Allocation[](1);
        allocations[0] = StrategyRegistry.Allocation(btc, 10000, true, 6);
        
        vm.expectRevert("Invalid leverage");
        registry.publishStrategy(allocations);
        vm.stopPrank();
    }

    // weight = 0 會 revert
    function test_RevertWeightZero() public {
        vm.startPrank(trader);
        registry.registerTrader("Trader");
        
        StrategyRegistry.Allocation[] memory allocations = new StrategyRegistry.Allocation[](2);
        allocations[0] = StrategyRegistry.Allocation(btc, 10000, true, 1);
        allocations[1] = StrategyRegistry.Allocation(eth, 0, true, 1);
        
        vm.expectRevert("Weight must be greater than 0");
        registry.publishStrategy(allocations);
        vm.stopPrank();
    }

    // 多次發布留下版本歷史
    function test_StrategyHistory() public {
        vm.startPrank(trader);
        registry.registerTrader("Trader");
        
        StrategyRegistry.Allocation[] memory a1 = new StrategyRegistry.Allocation[](1);
        a1[0] = StrategyRegistry.Allocation(btc, 10000, true, 1);
        registry.publishStrategy(a1);
        
        StrategyRegistry.Allocation[] memory a2 = new StrategyRegistry.Allocation[](1);
        a2[0] = StrategyRegistry.Allocation(btc, 10000, true, 2);
        registry.publishStrategy(a2);
        
        assertEq(registry.getStrategyCount(trader), 2);
        
        (StrategyRegistry.Allocation[] memory fetched, uint256 vId) = registry.getLatestStrategy(trader);
        assertEq(vId, 1);
        assertEq(fetched[0].leverage, 2);
        vm.stopPrank();
    }

    // 可發布混合多空策略
    function test_MixedStrategy() public {
        vm.startPrank(trader);
        registry.registerTrader("Trader");
        
        StrategyRegistry.Allocation[] memory allocations = new StrategyRegistry.Allocation[](2);
        allocations[0] = StrategyRegistry.Allocation(btc, 5000, true, 2);  // BTC Long 2x 50%
        allocations[1] = StrategyRegistry.Allocation(eth, 5000, false, 1); // ETH Short 1x 50%
        
        registry.publishStrategy(allocations);
        
        (StrategyRegistry.Allocation[] memory fetched, ) = registry.getLatestStrategy(trader);
        assertEq(fetched.length, 2);
        assertEq(fetched[0].asset, btc);
        assertTrue(fetched[0].isLong);
        assertEq(fetched[1].asset, eth);
        assertFalse(fetched[1].isLong);
        vm.stopPrank();
    }

    function test_GetAllTraders() public {
        registry.registerTrader("T1");
        vm.prank(address(0x123));
        registry.registerTrader("T2");
        
        address[] memory list = registry.getAllTraders();
        assertEq(list.length, 2);
        assertEq(list[0], address(this));
        assertEq(list[1], address(0x123));
    }
}
