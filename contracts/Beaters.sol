// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Family.sol";
import "./Member.sol";
import "./Beat.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract Beaters is Ownable {
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

    uint256 public _totalStake = 0;
    uint256 public _totalMint = 0;

    address public fam_addr;
    address public mem_addr;
    address public beat_addr;

    // Tokens
    Family fam;
    Member mem;
    Beat beat;

    constructor() Ownable(msg.sender) {
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

    // ENDPOINTS

    function addStake(uint256 memId, uint256 famId, uint refId) public payable {
        uint256 stake = msg.value;
        address sender = msg.sender;

        require(stake >= minStake, "Sent eth not enough");

        _addUser(sender, refId);

        if (memId == 0) {
            _mintMem(sender, stake, famId);
        } else {
            address memberOwner = mem.ownerOf(memId);
            require(memberOwner == sender, "Member not owned");

            _updateMemberFam(memId, famId, stake);
        }

        _totalStake += stake;
    }

    function computeWin() public {
        uint256 currentEpoch = _currentEpoch();
        require((currentEpoch + 1) > _lastComputeEpoch, "Epoch still active");

        // TODO: Get winning families using API3 QRNG

        uint256 totalMintToDistribute = 0;
        do {
            totalMintToDistribute += _getEpochMint(_lastComputeEpoch++);
        } while (_lastComputeEpoch < currentEpoch);

        _totalMint += totalMintToDistribute;
    }

    function mintFamily() public {
        uint256 cost = famMintCost();
        beat.burnFrom(_msgSender(), cost);

        _mintFam(_msgSender());
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

    function stakeLeft() public view returns (uint256) {
        return _totalStake;
    }

    function mintLeft() public view returns (uint256) {
        return _totalMint;
    }
}
