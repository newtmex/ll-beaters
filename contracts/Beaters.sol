// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Family.sol";
import "./Member.sol";
import "./Beat.sol";
import "./Qrng.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract Beaters is Ownable, Qrng {
    struct MemberProps {
        uint256 totalStake;
        uint256 activePeriods;
        uint256 lastActivePeriod;
        uint256 stakeWeight;
        uint256 famId;
        uint256 rps;
    }

    struct FamilyProps {
        uint256 id;
        uint256 totalStakeWeight;
        uint256 ownerShare;
        uint256 membersShare;
        uint256 rps;
    }

    uint256 internal constant DIVISION_SAFETY_CONSTANT = 1e18;
    uint256 internal constant EPOCH_ZERO_MINT = 3_000e18;

    uint256 private _totalUsers = 0;
    uint256 private _genesis;
    uint256 private _lastComputeEpoch = 0;

    mapping(address => uint) private _usersId;
    mapping(uint => address) private _userIds;
    mapping(uint => uint) private _referredBy;

    uint256 public minStake = 10 ** 14;
    mapping(uint256 => MemberProps) _memberProps;
    mapping(uint256 => FamilyProps) _familyProps;
    mapping(bytes32 => uint256) _totalMintForRequestId;

    uint256 public _totalStake = 0;
    uint256 public _totalMint = 0;
    // Team, Marketing, Liquidity, etc
    uint256 public _totalMintForHouse = 0;

    address public fam_addr;
    address public mem_addr;
    address public beat_addr;

    // Tokens
    Family fam;
    Member mem;
    Beat beat;

    constructor(address _airnodeRrp) Qrng(_airnodeRrp) Ownable(msg.sender) {
        _genesis = block.timestamp;

        fam = new Family(address(this));
        mem = new Member(address(this));
        beat = new Beat();

        fam_addr = address(fam);
        mem_addr = address(mem);
        beat_addr = address(beat);

        address _owner = owner();

        _addUser(_owner, 0);

        uint256 famId = _mintFam(_owner);
        _mintMem(_owner, 0, famId);
    }

    // INTERNALS

    function _mintFam(address to) internal returns (uint256 famId) {
        famId = fam.safeMint(to);
        _familyProps[famId].id = famId;
    }

    function _mintMem(address to, uint256 stake, uint256 famId) internal {
        uint256 memId = mem.safeMint(to);
        _updateMemberFam(memId, famId, stake);
    }

    function _updateMemberFam(
        uint256 memId,
        uint256 newFamId,
        uint256 stake
    ) internal {
        uint256 lastFamId = fam.lastTokenId();
        require(newFamId <= lastFamId, "Invalid family Id");

        MemberProps storage memProps = _memberProps[memId];
        FamilyProps storage oldFamProps = _familyProps[memProps.famId];

        if (memProps.famId != 0) {
            require(
                memProps.rps == oldFamProps.rps,
                "Claim previous wins before adding new stake"
            );
            require(memProps.totalStake > 0, "Invalid member Id");
        }

        // Strip old memProps from oldFamProps
        oldFamProps.totalStakeWeight -= memProps.stakeWeight;

        // Update memProps
        memProps.totalStake += stake;
        memProps.lastActivePeriod = _currentPeriod();
        memProps.activePeriods += 1;
        memProps.stakeWeight = memProps.totalStake * memProps.activePeriods;

        FamilyProps storage newFamProps;
        if (newFamId != 0 && newFamId != memProps.famId) {
            newFamProps = _familyProps[newFamId];
        } else {
            newFamProps = oldFamProps;
        }

        memProps.famId = newFamProps.id;
        memProps.rps = newFamProps.rps;

        newFamProps.totalStakeWeight += memProps.stakeWeight;
    }

    function _addUser(address user, uint refId) internal {
        uint userId = _usersId[user];

        if (userId == 0) {
            userId = ++_totalUsers;

            _usersId[user] = userId;
            _userIds[userId] = user;
            _referredBy[userId] = refId;
        }
    }

    function _currentEpoch() internal view returns (uint256 epoch) {
        if (block.timestamp > 0)
            require(_genesis > 0, "Invalid genesis timestamp");

        epoch = (block.timestamp - _genesis) / (24 * 60 * 60);
    }

    function _currentPeriod() internal view returns (uint256) {
        return _currentEpoch() / 30;
    }

    function _getEpochMint(uint256 epoch) internal pure returns (uint256 mint) {
        mint = EPOCH_ZERO_MINT;
        uint256 halfLife = 3_465;

        mint >>= (epoch / halfLife);
        epoch %= halfLife;
        mint -= ((mint * epoch) / halfLife / 2);
    }

    function _disburseFamWins(
        uint256[] memory qrngUint256Array,
        bytes32 requestId
    ) internal {
        uint256 disburseAmt = _totalMintForRequestId[requestId];
        _totalMintForRequestId[requestId] = 0;
        require(disburseAmt > 0, "No value to disburse");

        uint totalWinners = qrngUint256Array.length;
        disburseAmt /= uint256(totalWinners);

        uint256 toBurn = 0;
        for (uint index = 0; index < totalWinners; index++) {
            // https://docs.api3.org/guides/qrng/
            uint256 famId = (qrngUint256Array[index] %
                (fam.lastTokenId() - 0 + 1)) + 0;

            FamilyProps storage famProps = _familyProps[famId];

            // Owner takes 30%, members share 70%
            uint256 ownerShare = (disburseAmt * 30) / 100;
            famProps.ownerShare += ownerShare;

            uint256 membersShare = disburseAmt - ownerShare;
            if (membersShare > 0 && famProps.totalStakeWeight > 0) {
                uint256 rpsIncrease = (membersShare *
                    DIVISION_SAFETY_CONSTANT) / famProps.totalStakeWeight;

                famProps.rps += rpsIncrease;
                famProps.membersShare += membersShare;
            } else if (membersShare > 0) {
                toBurn += membersShare;
            }
        }

        if (toBurn > 0) {
            _totalMint -= toBurn;
            beat.burn(toBurn);
        }

        emit ReceivedUint256Array(requestId, qrngUint256Array);
    }

    function _checkMemberOwner(uint256 memId, address user) internal view {
        address memberOwner = mem.ownerOf(memId);
        require(memberOwner == user, "Member not owned");
    }

    function _checkFamilyOwner(uint256 famId, address user) internal view {
        address familyOwner = fam.ownerOf(famId);
        require(familyOwner == user, "Family not owned");
    }

    // ENDPOINTS

    function addStake(uint256 memId, uint256 famId, uint refId) public payable {
        uint256 stake = msg.value;
        address sender = msg.sender;

        require(stake >= minStake, "Sent eth not enough");

        _addUser(sender, refId);

        if (memId == 0) {
            _mintMem(sender, stake, famId);
        } else {
            _checkMemberOwner(memId, sender);

            _updateMemberFam(memId, famId, stake);
        }

        _totalStake += stake;
    }

    function computeWin() public {
        uint256 currentEpoch = _currentEpoch();
        require((currentEpoch + 1) > _lastComputeEpoch, "Epoch still active");
        uint256 totalMintToDistribute = 0;
        do {
            totalMintToDistribute += _getEpochMint(_lastComputeEpoch++);
        } while (_lastComputeEpoch < currentEpoch);

        _totalMint += totalMintToDistribute;

        // 10% of families + 1 will be selected
        uint256 familiesToChoose = fam.totalFamilies() / 10;
        familiesToChoose += 1;
        bytes32 requestId = _makeRequestUint256Array(
            familiesToChoose,
            this.completeComputeWin.selector
        );

        // Winners take 75%, house reserves 25%
        uint256 winnersShare = _totalMintForRequestId[requestId] =
            (totalMintToDistribute * 75) /
            100;
        _totalMintForHouse += totalMintToDistribute - winnersShare;
    }

    /// @notice Called by the Airnode through the AirnodeRrp contract to
    /// fulfill the request
    /// @param requestId Request ID
    /// @param data ABI-encoded response
    function completeComputeWin(
        bytes32 requestId,
        bytes calldata data
    ) external onlyAirnodeRrp {
        require(
            expectingRequestWithIdToBeFulfilled[requestId],
            "Request ID not known"
        );
        expectingRequestWithIdToBeFulfilled[requestId] = false;
        uint256[] memory qrngUint256Array = abi.decode(data, (uint256[]));

        _disburseFamWins(qrngUint256Array, requestId);
    }

    function mintFamily() public {
        uint256 cost = famMintCost();
        beat.burnFrom(_msgSender(), cost);
        _totalMint -= cost;

        _mintFam(_msgSender());
    }

    function claimMemberWinnings(uint256 memId) public {
        address sender = _msgSender();
        _checkMemberOwner(memId, sender);

        MemberProps storage memProps = _memberProps[memId];
        FamilyProps storage famProps = _familyProps[memProps.famId];

        if (memProps.rps < famProps.rps) {
            uint256 rpsDiff = famProps.rps - memProps.rps;

            uint256 winning = (rpsDiff * memProps.stakeWeight) /
                DIVISION_SAFETY_CONSTANT;

            memProps.rps = famProps.rps;
            famProps.membersShare -= winning;

            IERC20(beat_addr).transfer(sender, winning);
        }
    }

    function claimFamilyWinnings(uint256 famId) public {
        address sender = _msgSender();
        _checkFamilyOwner(famId, sender);

        FamilyProps storage famProps = _familyProps[famId];
        uint256 winning = famProps.ownerShare;

        famProps.ownerShare = 0;

        IERC20(beat_addr).transfer(sender, winning);
    }

    //  VIEWS

    function getUserId(address user) public view returns (uint userId) {
        userId = _usersId[user];
        require(userId > 0, "Not a member");

        return userId;
    }

    function getRefId(address user) public view returns (uint) {
        return getUserId(user);
    }

    function referredBy(address user) public view returns (uint) {
        uint userId = getUserId(user);

        return _referredBy[userId];
    }

    function memberProps(
        uint256 memId
    ) public view returns (MemberProps memory) {
        return _memberProps[memId];
    }

    function familyProps(
        uint256 famId
    ) public view returns (FamilyProps memory) {
        return _familyProps[famId];
    }

    function stakeLeft() public view returns (uint256) {
        return _totalStake;
    }

    function mintLeft() public view returns (uint256) {
        return _totalMint;
    }

    function famMintCost() public view returns (uint256 cost) {
        uint256 epochValue = _currentEpoch() + 1;

        cost = (_getEpochMint(epochValue)) + 1e18;
        cost *= (epochValue ** 3) % (epochValue);
        cost *= epochValue ** 2;
        cost /= epochValue * 1e5;
    }

    function famSwitchCost() public view returns (uint256) {
        return (famMintCost() / 1_000) * 5;
    }
}
