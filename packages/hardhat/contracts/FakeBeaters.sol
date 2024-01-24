// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Beaters.sol";

contract FakeBeaters is Beaters {
	constructor(address _airnodeRrp) Beaters(_airnodeRrp) {}

	function giveUserBeat(address user, uint256 amt) public onlyOwner {
		IERC20(this.beat_addr()).transfer(user, amt);
	}

	function fakeCompleteComputeWin(
		bytes32 requestId,
		uint256[] memory qrngUint256Array
	) external onlyOwner {
		_disburseFamWins(qrngUint256Array, requestId);
	}
}
