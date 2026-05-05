// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/MockUSDC.sol";
import "../src/MockOracle.sol";
import "../src/PerpetualExchange.sol";
import "../src/StrategyRegistry.sol";
import "../src/CopyTracker.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy MockUSDC
        MockUSDC usdc = new MockUSDC();
        
        // 2. Deploy MockOracle
        MockOracle oracle = new MockOracle();
        
        // 3. oracle.addAsset
        oracle.addAsset(keccak256("BTC"), 50000e18);
        oracle.addAsset(keccak256("ETH"), 3000e18);
        oracle.addAsset(keccak256("AAPL"), 200e18);
        oracle.addAsset(keccak256("TSLA"), 250e18);

        // 4. Deploy PerpetualExchange
        PerpetualExchange exchange = new PerpetualExchange(address(usdc), address(oracle));

        // 5. Deploy StrategyRegistry
        StrategyRegistry registry = new StrategyRegistry();

        // 6. Deploy CopyTracker
        CopyTracker tracker = new CopyTracker(address(usdc), address(exchange), address(registry));

        // 7. Call exchange.setCopyTracker
        exchange.setCopyTracker(address(tracker));

        // 8. Console.log addresses
        console.log("MockUSDC:", address(usdc));
        console.log("MockOracle:", address(oracle));
        console.log("PerpetualExchange:", address(exchange));
        console.log("StrategyRegistry:", address(registry));
        console.log("CopyTracker:", address(tracker));

        vm.stopBroadcast();
    }
}
