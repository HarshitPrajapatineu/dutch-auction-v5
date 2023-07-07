// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";

contract BidToken is ERC20, ERC20Permit {
    constructor() ERC20("BidToken", "BTK") ERC20Permit("BidToken"){
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }
}
