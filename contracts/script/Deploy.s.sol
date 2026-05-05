// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockUSDC.sol";
import "../src/MockOracle.sol";
import "../src/SynthToken.sol";
import "../src/PepeSynthetics.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        MockUSDC usdc = new MockUSDC();
        MockOracle oracle = new MockOracle();
        
        // Use deployer as trader for now
        address trader = vm.addr(deployerPrivateKey);
        PepeSynthetics vault = new PepeSynthetics(address(usdc), address(oracle), trader);

        // Add BTC Synth
        SynthToken pBTC = new SynthToken("Pepe BTC", "pBTC");
        vault.addSynthToken(keccak256("BTC"), address(pBTC));
        pBTC.grantRole(pBTC.MINTER_ROLE(), address(vault));
        pBTC.grantRole(pBTC.BURNER_ROLE(), address(vault));

        // Initial Price
        oracle.addAsset(keccak256("BTC"), 50000e18);

        // Mint some USDC to deployer for testing
        usdc.mint(trader, 1000000e18);

        vm.stopBroadcast();
    }
}
