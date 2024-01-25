// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IMember is IERC721 {
	function safeMint(address to) external returns (uint256 tokenId);
}

contract Member is ERC721, Ownable {
	uint256 private _nextTokenId;

	constructor(
		address initialOwner
	) ERC721("Member", "MEM") Ownable(initialOwner) {}

	function safeMint(address to) public onlyOwner returns (uint256 tokenId) {
		tokenId = _nextTokenId++;
		_safeMint(to, tokenId);
	}
}
