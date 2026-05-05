// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MockUSDC.sol";
import "../src/MockOracle.sol";

contract MockTest is Test {
    MockUSDC usdc;
    MockOracle oracle;
    address owner = address(0x1);
    address user = address(0x2);
    bytes32 btcSymbol = keccak256("BTC");

    function setUp() public {
        vm.prank(owner);
        usdc = new MockUSDC();
        vm.prank(owner);
        oracle = new MockOracle();
    }

    // --- MockUSDC Tests ---

    function testUSDC_Metadata() public view {
        assertEq(usdc.name(), "Mock USDC");
        assertEq(usdc.symbol(), "mUSDC");
        assertEq(usdc.decimals(), 18);
    }

    function testUSDC_Mint() public {
        usdc.mint(user, 1000e18);
        assertEq(usdc.balanceOf(user), 1000e18);
    }

    // --- MockOracle Tests ---

    function testOracle_AddAsset() public {
        vm.prank(owner);
        oracle.addAsset(btcSymbol, 50000e18);
        
        (uint256 price, uint256 updatedAt) = oracle.getPrice(btcSymbol);
        assertEq(price, 50000e18);
        assertEq(updatedAt, block.timestamp);
    }

    function testOracle_UpdatePrice() public {
        vm.prank(owner);
        oracle.addAsset(btcSymbol, 50000e18);
        
        vm.prank(owner);
        oracle.updatePrice(btcSymbol, 60000e18); // 20% increase
        
        (uint256 price, ) = oracle.getPrice(btcSymbol);
        assertEq(price, 60000e18);
    }

    function test_RevertWhen_Oracle_UpdatePriceDeviationHigh() public {
        vm.prank(owner);
        oracle.addAsset(btcSymbol, 50000e18);
        
        vm.prank(owner);
        vm.expectRevert("Price increase > 50%");
        oracle.updatePrice(btcSymbol, 80000e18); // 60% increase, should fail
    }

    function test_RevertWhen_Oracle_UpdatePriceDeviationLow() public {
        vm.prank(owner);
        oracle.addAsset(btcSymbol, 50000e18);
        
        vm.prank(owner);
        vm.expectRevert("Price decrease > 50%");
        oracle.updatePrice(btcSymbol, 20000e18); // 60% decrease, should fail
    }

    function testOracle_IsStale() public {
        vm.prank(owner);
        oracle.addAsset(btcSymbol, 50000e18);
        
        assertFalse(oracle.isStale(btcSymbol));
        
        vm.warp(block.timestamp + 86401); // Fast forward 24h + 1s
        assertTrue(oracle.isStale(btcSymbol));
    }

    function testOracle_OnlyOwnerCanUpdate() public {
        vm.prank(owner);
        oracle.addAsset(btcSymbol, 50000e18);
        
        vm.prank(user);
        vm.expectRevert(); // OwnableUnauthorizedAccount
        oracle.updatePrice(btcSymbol, 60000e18);
    }

    function testOracle_NonExistentAsset() public {
        vm.expectRevert("Asset does not exist");
        oracle.getPrice(keccak256("ETH"));
    }
}
