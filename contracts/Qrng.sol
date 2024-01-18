//SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@api3/airnode-protocol/contracts/rrp/requesters/RrpRequesterV0.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

abstract contract Qrng is RrpRequesterV0, Ownable {
    event RequestedUint256(bytes32 indexed requestId);
    event ReceivedUint256(bytes32 indexed requestId, uint256 response);
    event RequestedUint256Array(bytes32 indexed requestId, uint256 size);
    event ReceivedUint256Array(bytes32 indexed requestId, uint256[] response);

    // These variables can also be declared as `constant`/`immutable`.
    // However, this would mean that they would not be updatable.
    // Since it is impossible to ensure that a particular Airnode will be
    // indefinitely available, you are recommended to always implement a way
    // to update these parameters.
    address public airnode;
    bytes32 public endpointIdUint256Array;
    address public sponsorWallet;

    mapping(bytes32 => bool) public expectingRequestWithIdToBeFulfilled;

    /// @dev RrpRequester sponsors itself, meaning that it can make requests
    /// that will be fulfilled by its sponsor wallet. See the Airnode protocol
    /// docs about sponsorship for more information.
    /// @param _airnodeRrp Airnode RRP contract address
    constructor(address _airnodeRrp) RrpRequesterV0(_airnodeRrp) {}

    /// @notice Sets parameters used in requesting QRNG services
    /// @dev No access control is implemented here for convenience. This is not
    /// secure because it allows the contract to be pointed to an arbitrary
    /// Airnode. Normally, this function should only be callable by the "owner"
    /// or not exist in the first place.
    /// @param _airnode Airnode address
    /// @param _endpointIdUint256Array Endpoint ID used to request a `uint256[]`
    /// @param _sponsorWallet Sponsor wallet address
    function setRequestParameters(
        address _airnode,
        bytes32 _endpointIdUint256Array,
        address _sponsorWallet
    ) external onlyOwner {
        airnode = _airnode;
        endpointIdUint256Array = _endpointIdUint256Array;
        sponsorWallet = _sponsorWallet;
    }

    /// @notice Requests a `uint256[]`
    /// @param size Size of the requested array
    function _makeRequestUint256Array(
        uint256 size,
        bytes4 fulfillFunctionId
    ) internal returns (bytes32 requestId) {
        requestId = airnodeRrp.makeFullRequest(
            airnode,
            endpointIdUint256Array,
            address(this),
            sponsorWallet,
            address(this),
            fulfillFunctionId,
            // Using Airnode ABI to encode the parameters
            abi.encode(bytes32("1u"), bytes32("size"), size)
        );
        expectingRequestWithIdToBeFulfilled[requestId] = true;
        emit RequestedUint256Array(requestId, size);
    }
}
