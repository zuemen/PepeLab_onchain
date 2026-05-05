// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MockUSDC.sol";
import "../src/MockOracle.sol";
import "../src/SynthToken.sol";
import "../src/PepeSynthetics.sol";

contract PepeSyntheticsTest is Test {
    MockUSDC usdc;
    MockOracle oracle;
    SynthToken pBTC;
    PepeSynthetics vault;

    address owner = address(0x1);
    address trader = address(0x2);
    address follower = address(0x3);
    bytes32 btcSymbol = keccak256("BTC");

    function setUp() public {
        vm.startPrank(owner);
        usdc = new MockUSDC();
        oracle = new MockOracle();
        pBTC = new SynthToken("Pepe BTC", "pBTC");
        vault = new PepeSynthetics(address(usdc), address(oracle), trader);

        // Setup Synth
        vault.addSynthToken(btcSymbol, address(pBTC));
        pBTC.grantRole(pBTC.MINTER_ROLE(), address(vault));
        pBTC.grantRole(pBTC.BURNER_ROLE(), address(vault));

        // Setup Oracle
        oracle.addAsset(btcSymbol, 50000e18); // 1 BTC = 50k USDC
        vm.stopPrank();

        // Give follower some USDC
        usdc.mint(follower, 100000e18);
    }

    function test_DepositAndWithdraw() public {
        vm.startPrank(follower);
        usdc.approve(address(vault), 10000e18);
        vault.deposit(10000e18);
        
        assertEq(vault.shares(follower), 10000e18);
        assertEq(vault.totalShares(), 10000e18);
        assertEq(usdc.balanceOf(address(vault)), 10000e18);

        vault.withdraw(10000e18);
        assertEq(vault.shares(follower), 0);
        assertEq(usdc.balanceOf(follower), 100000e18);
        vm.stopPrank();
    }

    function test_CopyTrading_Profit() public {
        // 1. Follower deposits 100k USDC
        vm.startPrank(follower);
        usdc.approve(address(vault), 100000e18);
        vault.deposit(100000e18);
        vm.stopPrank();

        // 2. Trader buys 1 BTC at 50k
        vm.startPrank(trader);
        vault.openPosition(btcSymbol, 1e18);
        vm.stopPrank();

        assertEq(vault.poolPositions(btcSymbol), 1e18);
        assertEq(usdc.balanceOf(address(vault)), 50000e18); // 100k - 50k

        // 3. Price goes up to 60k (+20%)
        vm.prank(owner);
        oracle.updatePrice(btcSymbol, 60000e18);

        // Pool Total Value = 50k USDC + 1 BTC * 60k = 110k
        assertEq(vault.getPoolTotalValue(), 110000e18);

        // 4. Trader closes position
        vm.startPrank(trader);
        vault.closePosition(btcSymbol, 1e18);
        vm.stopPrank();

        assertEq(usdc.balanceOf(address(vault)), 110000e18); // 50k + 60k revenue

        // 5. Follower withdraws (should get 110k)
        vm.startPrank(follower);
        vault.withdraw(vault.shares(follower));
        assertEq(usdc.balanceOf(follower), 110000e18);
        vm.stopPrank();
    }

    function test_CopyTrading_Loss() public {
        // 1. Follower deposits 100k USDC
        vm.startPrank(follower);
        usdc.approve(address(vault), 100000e18);
        vault.deposit(100000e18);
        vm.stopPrank();

        // 2. Trader buys 1 BTC at 50k
        vm.prank(trader);
        vault.openPosition(btcSymbol, 1e18);

        // 3. Price goes down to 40k (-20%)
        vm.prank(owner);
        oracle.updatePrice(btcSymbol, 40000e18);

        // 4. Trader closes position
        vm.prank(trader);
        vault.closePosition(btcSymbol, 1e18);

        // Pool Total Value = 50k USDC + 40k revenue = 90k
        assertEq(usdc.balanceOf(address(vault)), 90000e18);

        // 5. Follower withdraws (should get 90k)
        vm.startPrank(follower);
        vault.withdraw(vault.shares(follower));
        assertEq(usdc.balanceOf(follower), 90000e18);
        vm.stopPrank();
    }
}
