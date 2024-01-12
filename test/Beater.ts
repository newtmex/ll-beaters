import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Beaters", function () {
    async function deployBeatersFixture() {
        const [owner] = await ethers.getSigners();

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
    });
});
