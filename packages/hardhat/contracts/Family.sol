// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Family is ERC721, Ownable {
	uint256 private _nextTokenId;

	constructor(
		address initialOwner
	) ERC721("Family", "FAM") Ownable(initialOwner) {}

	function safeMint(address to) public onlyOwner returns (uint256 tokenId) {
		tokenId = _nextTokenId++;
		_safeMint(to, tokenId);
	}

	function lastTokenId() public view returns (uint256) {
		require(_nextTokenId > 0, "No Family yet");

		return _nextTokenId - 1;
	}

	function totalFamilies() external view returns (uint256) {
		return lastTokenId() + 1;
	}
}
