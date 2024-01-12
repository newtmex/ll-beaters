// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract Beat is ERC20, ERC20Burnable, ERC20Permit {
    constructor() ERC20("Beat", "BTK") ERC20Permit("Beat") {
        _mint(msg.sender, 21000000 * 10 ** decimals());
    }
}
