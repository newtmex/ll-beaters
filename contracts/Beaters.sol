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
        uint256 famId;
        uint256 rps;
    }

    struct FamilyProps {
        uint256 totalStake;
        uint256 ownerShare;
        uint256 membersShare;
        uint256 rps;
    }

    uint256 private _totalUsers = 0;
    mapping(address => uint) private _usersId;
    mapping(uint => address) private _userIds;
    mapping(uint => uint) private _referredBy;

    uint256 public minStake = 10 ** 14;
    mapping(uint256 => MemberProps) _memberProps;
    mapping(uint256 => FamilyProps) _familyProps;

    address public fam_addr;
    address public mem_addr;
    address public beat_addr;

    // Tokens
    Family fam;
    Member mem;
    Beat beat;

    constructor() Ownable(msg.sender) {
        fam = new Family(address(this));
        mem = new Member(address(this));
        beat = new Beat();

        fam_addr = address(fam);
        mem_addr = address(mem);
        beat_addr = address(beat);

        address _owner = owner();

        _addUser(_owner, 0);

        uint256 famId = fam.safeMint(_owner);
        _mintMem(_owner, 0, famId);
    }

    // INTERNALS

    function _mintMem(address to, uint256 stake, uint256 famId) internal {
        uint256 memId = mem.safeMint(to);

        MemberProps storage memProps = _memberProps[memId];

        memProps.totalStake = stake;
        _updateMemberFam(memProps, famId);
    }

    function _updateMemberFam(
        MemberProps memory memProps,
        uint256 newFamId
    ) internal {
        uint256 lastFamId = fam.lastTokenId();
        require(newFamId <= lastFamId, "Invalid family Id");

        if (memProps.famId != 0) {
            revert("Collect winnings from old fam");
        }

        FamilyProps storage newFamProps = _familyProps[newFamId];

        memProps.famId = newFamId;
        memProps.rps = newFamProps.rps;

        newFamProps.totalStake += memProps.totalStake;
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

            MemberProps storage memProps = _memberProps[memId];
            require(memProps.totalStake > 0, "Invalid member Id");

            memProps.totalStake += stake;
            _updateMemberFam(memProps, famId);
        }
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
}
