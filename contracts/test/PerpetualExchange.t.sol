// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MockUSDC.sol";
import "../src/MockOracle.sol";
import "../src/PerpetualExchange.sol";

contract PerpetualExchangeTest is Test {
    MockUSDC usdc;
    MockOracle oracle;
    PerpetualExchange exchange;

    address owner = address(0x1);
    address user = address(0x2);
    address tracker = address(0x3);
    bytes32 btcAsset = keccak256("BTC");

    function setUp() public {
        vm.startPrank(owner);
        usdc = new MockUSDC();
        oracle = new MockOracle();
        exchange = new PerpetualExchange(address(usdc), address(oracle));
        
        oracle.addAsset(btcAsset, 50000e18); // $50,000
        vm.stopPrank();

        usdc.mint(user, 100000e18); // $100,000
        usdc.mint(tracker, 100000e18);
    }

    // 1. depositMargin / withdrawMargin 正常
    function test_DepositWithdraw() public {
        vm.startPrank(user);
        usdc.approve(address(exchange), 1000e18);
        exchange.depositMargin(1000e18);
        assertEq(exchange.freeMargin(user), 1000e18);
        assertEq(usdc.balanceOf(address(exchange)), 1000e18);

        exchange.withdrawMargin(400e18);
        assertEq(exchange.freeMargin(user), 600e18);
        assertEq(usdc.balanceOf(user), 100000e18 - 600e18);
        vm.stopPrank();
    }

    // 2. openPosition long 正常，鎖 entryPrice 正確
    function test_OpenPositionLong() public {
        vm.startPrank(user);
        usdc.approve(address(exchange), 100e18);
        exchange.depositMargin(100e18);
        
        uint256 pid = exchange.openPosition(btcAsset, true, 50e18, 2);
        
        PerpetualExchange.Position memory pos = exchange.getPosition(pid);
        assertEq(pos.entryPrice, 50000e18);
        assertEq(pos.margin, 50e18);
        assertEq(pos.leverage, 2);
        assertTrue(pos.isLong);
        assertTrue(pos.isOpen);
        assertEq(exchange.freeMargin(user), 50e18);
        vm.stopPrank();
    }

    // 3. openPosition short 正常
    function test_OpenPositionShort() public {
        vm.startPrank(user);
        usdc.approve(address(exchange), 100e18);
        exchange.depositMargin(100e18);
        
        uint256 pid = exchange.openPosition(btcAsset, false, 50e18, 5);
        
        PerpetualExchange.Position memory pos = exchange.getPosition(pid);
        assertFalse(pos.isLong);
        assertEq(pos.leverage, 5);
        vm.stopPrank();
    }

    // 4. closePosition 價格上漲後 long 賺錢
    function test_CloseLongProfit() public {
        vm.startPrank(user);
        usdc.approve(address(exchange), 100e18);
        exchange.depositMargin(100e18);
        uint256 pid = exchange.openPosition(btcAsset, true, 100e18, 2); 
        vm.stopPrank();

        // Price 50000 -> 60000 (+20%)
        vm.prank(owner);
        oracle.updatePrice(btcAsset, 60000e18);

        // PnL = (60k-50k) * 0.004 = 40
        assertEq(exchange.getUnrealizedPnL(pid), 40e18);

        vm.prank(user);
        exchange.closePosition(pid);
        assertEq(exchange.freeMargin(user), 140e18); // 100 margin + 40 profit
    }

    // 5. closePosition 價格上漲後 short 賠錢
    function test_CloseShortLoss() public {
        vm.startPrank(user);
        usdc.approve(address(exchange), 100e18);
        exchange.depositMargin(100e18);
        uint256 pid = exchange.openPosition(btcAsset, false, 100e18, 2);
        vm.stopPrank();

        // Price 50000 -> 55000 (+10%)
        vm.prank(owner);
        oracle.updatePrice(btcAsset, 55000e18);

        // Short Loss = 10% * 200 = 20
        assertEq(exchange.getUnrealizedPnL(pid), -20e18);

        vm.prank(user);
        exchange.closePosition(pid);
        assertEq(exchange.freeMargin(user), 80e18); // 100 - 20
    }

    // 6. closePosition 價格下跌後 short 賺錢
    function test_CloseShortProfit() public {
        vm.startPrank(user);
        usdc.approve(address(exchange), 100e18);
        exchange.depositMargin(100e18);
        uint256 pid = exchange.openPosition(btcAsset, false, 100e18, 2);
        vm.stopPrank();

        // Price 50000 -> 40000 (-20%)
        vm.prank(owner);
        oracle.updatePrice(btcAsset, 40000e18);

        // Short Profit = 20% * 200 = 40
        assertEq(exchange.getUnrealizedPnL(pid), 40e18);

        vm.prank(user);
        exchange.closePosition(pid);
        assertEq(exchange.freeMargin(user), 140e18);
    }

    // 7. 槓桿 2x 時 PnL 是現貨的兩倍
    function test_LeverageEffect() public {
        vm.startPrank(user);
        usdc.approve(address(exchange), 200e18);
        exchange.depositMargin(200e18);
        
        uint256 pid1 = exchange.openPosition(btcAsset, true, 100e18, 1);
        uint256 pid2 = exchange.openPosition(btcAsset, true, 100e18, 2);
        vm.stopPrank();

        vm.prank(owner);
        oracle.updatePrice(btcAsset, 55000e18); // +10%

        int256 pnl1 = exchange.getUnrealizedPnL(pid1);
        int256 pnl2 = exchange.getUnrealizedPnL(pid2);

        assertEq(pnl1, 10e18);
        assertEq(pnl2, 20e18);
        assertEq(pnl2, pnl1 * 2);
    }

    // 8. 價格暴跌時 closeAmount 不會變負（被清算為 0）
    function test_LiquidationToZero() public {
        vm.startPrank(user);
        usdc.approve(address(exchange), 100e18);
        exchange.depositMargin(100e18);
        uint256 pid = exchange.openPosition(btcAsset, true, 100e18, 5); // 500 notional
        vm.stopPrank();

        // Price 50000 -> 30000 (-40%)
        // Loss = 40% * 500 = 200. Margin 100.
        vm.prank(owner);
        oracle.updatePrice(btcAsset, 30000e18);

        assertEq(exchange.getUnrealizedPnL(pid), -200e18);
        assertEq(exchange.getPositionValue(pid), 0);

        vm.prank(user);
        exchange.closePosition(pid);
        assertEq(exchange.freeMargin(user), 0);
    }

    // 9. leverage > 5 會 revert
    function test_RevertInvalidLeverage() public {
        vm.startPrank(user);
        usdc.approve(address(exchange), 100e18);
        exchange.depositMargin(100e18);
        
        vm.expectRevert("Invalid leverage");
        exchange.openPosition(btcAsset, true, 50e18, 6);
        vm.stopPrank();
    }

    // 10. margin < MIN_MARGIN 會 revert
    function test_RevertMinMargin() public {
        vm.startPrank(user);
        usdc.approve(address(exchange), 100e18);
        exchange.depositMargin(100e18);
        
        vm.expectRevert("Margin too low");
        exchange.openPosition(btcAsset, true, 5e18, 1);
        vm.stopPrank();
    }

    // 11. copyTracker 未設定時 openPositionFor 會 revert
    function test_RevertCopyTrackerAccess() public {
        vm.startPrank(tracker);
        vm.expectRevert("Only copyTracker can call");
        exchange.openPositionFor(user, btcAsset, true, 50e18, 1);
        vm.stopPrank();

        vm.prank(owner);
        exchange.setCopyTracker(tracker);

        // Now should revert for insufficient margin (instead of permission)
        vm.startPrank(tracker);
        vm.expectRevert("Insufficient free margin");
        exchange.openPositionFor(user, btcAsset, true, 50e18, 1);
        vm.stopPrank();
    }

    // 12. 多筆 position 各自獨立結算
    function test_MultiplePositionsIndependent() public {
        vm.startPrank(user);
        usdc.approve(address(exchange), 200e18);
        exchange.depositMargin(200e18);
        
        uint256 pid1 = exchange.openPosition(btcAsset, true, 100e18, 2);
        uint256 pid2 = exchange.openPosition(btcAsset, false, 100e18, 2);
        vm.stopPrank();

        // Price 50k -> 60k
        vm.prank(owner);
        oracle.updatePrice(btcAsset, 60000e18);

        // pos1 (Long) +40, pos2 (Short) -40
        assertEq(exchange.getUnrealizedPnL(pid1), 40e18);
        assertEq(exchange.getUnrealizedPnL(pid2), -40e18);

        vm.prank(user);
        exchange.closePosition(pid1);
        assertEq(exchange.freeMargin(user), 140e18);
        
        vm.prank(user);
        exchange.closePosition(pid2);
        assertEq(exchange.freeMargin(user), 140e18 + 60e18); // 200 total back
    }
}
