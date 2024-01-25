// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Beaters.sol";

contract FakeBeaters is Beaters {
	constructor(
		address _airnodeRrp,
		uint256 _epochLength,
		address _beat_addr
	) Beaters(_airnodeRrp, _epochLength, _beat_addr) {}

	function giveUserBeat(address user, uint256 amt) public {
		_totalMint += amt;
		IERC20(this.beat_addr()).transfer(user, amt);
	}

	function fakeCompleteComputeWin(
		bytes32 requestId,
		uint256[] memory qrngUint256Array
	) external {
		_disburseFamWins(qrngUint256Array, requestId);
	}
}
