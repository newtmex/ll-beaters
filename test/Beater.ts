import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Beaters", function () {
    async function deployBeatersFixture() {
        const [owner, user1] = await ethers.getSigners();

        const beaters = await ethers.deployContract("Beaters");

        const famAddr = await beaters.fam_addr();
        const family = await ethers.getContractAt("Family", famAddr);

        const memAddr = await beaters.mem_addr();
        const member = await ethers.getContractAt("Family", memAddr);

        const beatAddr = await beaters.beat_addr();
        const beat = await ethers.getContractAt("Family", beatAddr);

        return {
            beaters,
            family: { addr: famAddr, instance: family },
            beat: { addr: beatAddr, instance: beat },
            member: { addr: memAddr, instance: member },
            owner,
            user1,
        };
    }

    it("should make initial family, with one member", async function () {
        const { owner, family, member, beaters } = await loadFixture(
            deployBeatersFixture
        );

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

            await beaters
                .connect(user1)
                .addStake(memId, famId, refId, { value: 1e14 });

            expect(await beaters.getRefId(user1)).to.eq(2);
            expect(await beaters.referredBy(user1)).to.eq(0);
        });

        it("should not change referrer on subsequent add stake", async function () {
            const { beaters, user1, member } = await loadFixture(
                deployBeatersFixture
            );

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
            const { beaters, user1, member } = await loadFixture(
                deployBeatersFixture
            );

            await beaters.connect(user1).addStake(0, 0, 0, { value: 1e14 });
            // Subsequent stake
            await beaters.connect(user1).addStake(1, 0, 0, { value: 30e14 });

            expect(
                (await beaters.connect(user1).memberProps(1)).at(0)
            ).to.equal(31e14);
        });

        it("should revert when sent eth not enough", async function () {
            const { beaters, user1 } = await loadFixture(deployBeatersFixture);

            await expect(
                beaters.connect(user1).addStake(0, 0, 0, { value: 1e13 })
            ).to.revertedWith("Sent eth not enough");

            await expect(beaters.getRefId(user1)).to.revertedWith(
                "Not a member"
            );
        });
    });
});
