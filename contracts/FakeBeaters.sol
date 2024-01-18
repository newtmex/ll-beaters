// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Beaters.sol";

contract FakeBeaters is Beaters {
    function giveUserBeat(address user, uint256 amt) public onlyOwner {
        IERC20(this.beat_addr()).transfer(user, amt);
    }
}
