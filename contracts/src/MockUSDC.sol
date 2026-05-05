// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") {}

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    // Set decimals to 18 as requested
    function decimals() public view virtual override returns (uint8) {
        return 18;
    }
}
