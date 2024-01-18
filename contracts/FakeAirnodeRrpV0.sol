// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FakeAirnodeRrpV0 {
    function setSponsorshipStatus(address _a, bool _b) external {}

    function makeFullRequest(
        address airnode,
        bytes32 endpointId,
        address sponsor,
        address sponsorWallet,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata parameters
    ) external pure returns (bytes32 requestId) {}
}
