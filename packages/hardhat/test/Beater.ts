import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { Beat } from "../typechain-types";

describe("Beaters", function () {
  const oneEpoch = 24 * 60 * 60;
  async function deployBeatersFixture() {
    const [owner, user1, user2, user3] = await ethers.getSigners();

    const beat = await ethers.deployContract("Beat");
    const beatAddr = await beat.getAddress();

    const fakeAirRrp = await ethers.deployContract("FakeAirnodeRrpV0");
    const airRrpAdr = await fakeAirRrp.getAddress();
    const beaters = await ethers.deployContract("FakeBeaters", [airRrpAdr, 24, beatAddr]);

    const famAddr = await beaters.fam_addr();
    const family = await ethers.getContractAt("Family", famAddr);

    const memAddr = await beaters.mem_addr();
    const member = await ethers.getContractAt("Member", memAddr);

    const beatersAddr = await beaters.getAddress();
    const beatTotal = await beat.totalSupply();
    await beat.connect(owner).transfer(beatersAddr, beatTotal);

    return {
      beaters,
      beatersAddr,
      family: { addr: famAddr, instance: family },
      beat: { addr: beatAddr, instance: beat },
      member: { addr: memAddr, instance: member },
      owner,
      user1,
      user2,
      user3,
    };
  }

  async function approveSpend(token: Beat, spender: string, users: any[]) {
    for (const user of users) {
      await token.connect(user).approve(spender, ethers.MaxUint256);
    }
  }

  it("should make initial family, with one member", async function () {
    const { owner, family, member, beaters } = await loadFixture(deployBeatersFixture);

    for (const nft of [family, member]) {
      const ownerNftBal = await nft.instance.balanceOf(owner);
      expect(+ownerNftBal.toString()).to.equal(1);
    }

    const ownerRefId = await beaters.getRefId(owner);
    expect(ownerRefId).to.equal(1);

    expect((await beaters.memberProps(0))[0]).to.eq(0);
  });

  describe("addStake", function () {
    it("should create new user on first stake", async function () {
      const { beaters, user1 } = await loadFixture(deployBeatersFixture);

      const refId = 0;
      const famId = 0;
      const memId = 0;

      await beaters.connect(user1).addStake(memId, famId, refId, { value: 1e14 });

      expect(await beaters.getRefId(user1)).to.eq(2);
      expect(await beaters.referredBy(user1)).to.eq(0);
    });

    it("should not change referrer on subsequent add stake", async function () {
      const { beaters, user1, member } = await loadFixture(deployBeatersFixture);

      const refId = 1;

      await beaters.connect(user1).addStake(0, 0, refId, { value: 1e14 });

      expect(await beaters.getRefId(user1)).to.eq(2);
      expect(await beaters.referredBy(user1)).to.eq(refId);
      expect(await member.instance.balanceOf(user1)).to.eq(1);

      await beaters.connect(user1).addStake(0, 0, 0, { value: 10e14 });
      expect(await beaters.referredBy(user1)).to.eq(refId);
      expect(await member.instance.balanceOf(user1)).to.eq(2);
    });

    it("should increase user member stake balance on subsequent stake", async function () {
      const { beaters, user1 } = await loadFixture(deployBeatersFixture);

      await beaters.connect(user1).addStake(0, 0, 0, { value: 1e14 });
      // Subsequent stake
      await beaters.connect(user1).addStake(1, 0, 0, { value: 30e14 });

      expect((await beaters.connect(user1).memberProps(1)).at(0)).to.equal(31e14);
    });

    it("should revert when sent eth not enough", async function () {
      const { beaters, user1 } = await loadFixture(deployBeatersFixture);

      await expect(beaters.connect(user1).addStake(0, 0, 0, { value: 1e13 })).to.revertedWith("Sent eth not enough");

      await expect(beaters.getRefId(user1)).to.revertedWith("Not a member");
    });

    it("should increase stake left", async function () {
      const { beaters, user1, user2 } = await loadFixture(deployBeatersFixture);

      const stakeActions: [typeof user1, number][] = [
        [user2, 2e14],
        [user2, 2.43e14],
        [user1, 2e14],
        [user2, 6.345e14],
        [user1, 1.345e14],
        [user2, 9.0345e14],
      ];

      const totalStake = stakeActions.reduce((acc, [, stake]) => acc + stake, 0);

      for (const [user, stake] of stakeActions) {
        await beaters.connect(user).addStake(0, 0, 0, { value: stake });
      }

      expect(await beaters.stakeLeft()).to.eq(totalStake);
    });
  });

  describe("computeWin", function () {
    it("should increase mint left", async function () {
      const { beaters } = await loadFixture(deployBeatersFixture);

      expect(await beaters.mintLeft()).to.eq(0);

      await beaters.computeWin();
      expect(await beaters.mintLeft()).to.eq(BigInt(3000 * 10e17));

      await time.increase(3 * 24 * 60 * 60); // After 3 days
      await beaters.computeWin();
      expect(await beaters.mintLeft()).to.eq(
        BigInt("8998701298701298701300"), // 8,998.701298701298701300
      );

      await time.increase(30 * 24 * 60 * 60); // After 30 days
      await beaters.computeWin();
      expect(await beaters.mintLeft()).to.eq(
        BigInt("98771428571428571428588"), // 98,771.428571428571428588
      );
    });

    it("should disburse winnings", async function () {
      const { beaters, user1, user2, user3, beat, beatersAddr } = await loadFixture(deployBeatersFixture);

      const users = [user1, user2];
      await approveSpend(beat.instance, beatersAddr, users);

      await time.increase(30 * 24 * 60 * 60); // After 30 days

      const famMintCost = await beaters.famMintCost();
      for (const user of users) {
        await beaters.giveUserBeat(user, famMintCost);
        await beaters.connect(user).addStake(0, 0, 0, { value: 1e14 });
        await beaters.connect(user).mintFamily();
      }
      await beaters.connect(user3).addStake(0, 2, 0, { value: 20e14 });

      const expectedWinners = [1, 2];
      const checkBal = async (balance: bigint, memBal: bigint[]) => {
        for (const famId of expectedWinners) {
          const [, , ownerShare, membersShare] = await beaters.familyProps(famId);
          expect(ownerShare).to.eq(balance);
          expect(membersShare).to.eq(memBal[expectedWinners.indexOf(famId)]);
        }
      };

      await checkBal(0n, [0n, 0n]);

      await beaters.computeWin();
      const randNums = [1, 236];
      const requestId: number[] = [];
      requestId.fill(0);

      await beaters.fakeCompleteComputeWin(ethers.zeroPadBytes(new Uint8Array([0]), 32), randNums);

      await checkBal(BigInt("10103814935064935064936"), [0n, BigInt("23575568181818181818186")]);

      await beaters.connect(user3).claimMemberWinnings(3);
      await beaters.connect(user1).claimFamilyWinnings(1);
      await beaters.connect(user2).claimFamilyWinnings(2);

      await checkBal(0n, [0n, 0n]);

      expect(await beaters.stakeLeft()).to.eq(2200000000000000n);
      await approveSpend(beat.instance, beatersAddr, [user3, user1, user2]);

      await beaters.connect(user3).widthdrawStake(22_396_789772727272727277n);
      await beaters.connect(user1).widthdrawStake(9_598_624188311688311690n);
      await beaters.connect(user2).widthdrawStake(9_598_624188311688311690n);

      expect(await beaters.mintLeft()).to.eq(22_452_922077922077922082n);
      expect(await beaters.stakeLeft()).to.eq(872849977907672n);
    });
  });

  describe("mintFamily", function () {
    it("should burn Beat to mint Family", async function () {
      const { beaters, user1, beat, beatersAddr, family } = await loadFixture(deployBeatersFixture);

      await beat.instance.connect(user1).approve(beatersAddr, ethers.MaxUint256);

      await time.increase(oneEpoch);

      const famMintCost = await beaters.famMintCost();
      await beaters.giveUserBeat(user1, famMintCost);
      expect(await beat.instance.balanceOf(user1)).to.eq(famMintCost);
      expect(await family.instance.balanceOf(user1)).to.eq(0);

      await beaters.connect(user1).addStake(0, 0, 0, { value: 1e14 });
      await beaters.connect(user1).mintFamily();
      expect(await beat.instance.balanceOf(user1)).to.eq(0);
      expect(await family.instance.balanceOf(user1)).to.eq(1);
    });
  });

  it.skip("rapid", async () => {
    const { beaters, beat, beatersAddr, owner } = await loadFixture(deployBeatersFixture);
    const signers = await ethers.getSigners();
    const totalSigners = signers.length;

    let totalMems = 1;
    let totalFams = 1;

    type UserStatKey = "ethDep" | "ethWidthdrawn";
    const userStat: {
      [key: string]: { [key in UserStatKey]: bigint } | undefined;
    } = {};
    const addUserStat = (user: string, key: UserStatKey, value: bigint) => {
      const stat = userStat[user] || { ethDep: 0n, ethWidthdrawn: 0n };
      stat[key] += value;
      userStat[user] = stat;
    };

    const userMems: { [key: string]: number[] | null } = {};
    userMems[owner.address] = [0];

    const userFamIds: Map<number, (typeof signers)[number]> = new Map();
    userFamIds.set(0, owner);

    const getNum = (max: number, min: number) => (Math.floor(Math.random() * 1000) % (max - min + 1)) + min;
    const randUserIndex = () => getNum(totalSigners - 1, 0);
    const randFamId = () => getNum(totalFams - 1, 0);

    const claimWinnings = async (user: (typeof signers)[number], memId: number) => {
      // if(memId<=0){
      //     throw `${memId} is invalid for memId`
      // }

      await beaters.connect(user).claimMemberWinnings(memId);
      const bal = await beat.instance.balanceOf(user);
      if (bal > 0) {
        const stakeLeftA = await beaters.stakeLeft();
        await approveSpend(beat.instance, beatersAddr, [user]);

        await beaters.connect(user).widthdrawStake(bal);

        const stakeLeft = await beaters.stakeLeft();
        const mintLeft = await beaters.mintLeft();
        const ethWidthdrawn = stakeLeftA - stakeLeft;

        addUserStat(user.address, "ethWidthdrawn", ethWidthdrawn);

        console.log(
          `Ratio : `,
          format((ethWidthdrawn * BigInt(1e18)) / bal),
          "Price: ",
          format((stakeLeft * BigInt(1e18)) / mintLeft),
          // " stakeLeft: ",
          // format(stakeLeft),
          // " mintLeft: ",
          // format(mintLeft)
        );
      }
    };

    let epoch = 2;
    while (epoch <= 90) {
      epoch *= 1.25;
      epoch = Math.ceil(epoch);

      const selectCount = randUserIndex();
      const winningFams: number[] = [];

      if (selectCount > 0) {
        for (let i = 1; i <= selectCount; i++) {
          const index = randUserIndex();
          const user = signers.at(index);

          if (!user) {
            continue;
          }

          winningFams.push(randFamId());
          const userAddr = user.address;

          const list = userMems[userAddr] || [];

          const memId = list.at(Math.floor(Math.random() * 1000) % (list.length + 2)) || 0;

          const famId = randFamId();

          const totalUsers = Object.keys(userMems).length;
          const refId = totalUsers && Math.floor(Math.random() * 1000) % totalUsers;

          const stakeValue =
            BigInt(Math.floor(Math.random() * 1e14) + 1e14) * BigInt(Math.floor(Math.random() * 1000 * epoch));
          memId > 0 && (await claimWinnings(user, memId));
          await beaters.connect(user).addStake(memId, famId, refId, {
            value: stakeValue,
          });
          addUserStat(userAddr, "ethDep", stakeValue);

          if (memId == 0) {
            list.push(totalMems++);
            userMems[userAddr] = list;
          }

          if (Math.random() > 0.55) {
            const mintCost = await beaters.famMintCost();
            await beaters.giveUserBeat(user, mintCost);
            await approveSpend(beat.instance, beatersAddr, [user]);
            await beaters.connect(user).mintFamily();
            userFamIds.set(totalFams++, user);
          }
        }
      }

      if (winningFams.length) {
        await beaters.computeWin();
        await beaters.fakeCompleteComputeWin(ethers.zeroPadBytes(new Uint8Array([0]), 32), winningFams);
      }
      for (const famId of winningFams) {
        const famOwner = userFamIds.get(famId);
        famOwner && (await beaters.connect(famOwner).claimFamilyWinnings(famId));

        for (const user of signers) {
          const memIds = user && userMems[user.address];

          if (user && memIds?.length) {
            for (const id of memIds) {
              await claimWinnings(user, id);
            }
          }
        }
      }

      await time.increase(epoch * oneEpoch);
    }

    for (const user of Object.keys(userStat)) {
      const stat = userStat[user];
      if (!stat) {
        continue;
      }

      const diff = stat.ethWidthdrawn - stat.ethDep;
      console.log(user, format(diff));
    }
  });
});

function format(n: bigint) {
  const isNeg = n < 0n;
  isNeg && (n = -1n * n);

  const one = BigInt(1e18);
  const int = n / one;
  const mts = (int > 0 ? n - int * one : n).toString().padStart(18, "0");

  return (
    (isNeg ? "-" : "") +
    int
      .toString()
      .replace(/^0{2,}/, "")
      .split("")
      .reverse()
      .reduce((a, c, i) => {
        i >= 3 && i % 3 == 0 && (a = "," + a);
        a = c + a;

        return a;
      }, ".") +
    mts
  );
}
