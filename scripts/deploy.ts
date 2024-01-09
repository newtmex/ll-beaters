import { ethers, upgrades } from "hardhat";

async function main() {
    const Beaters = await ethers.getContractFactory("Beaters");
    console.log("Deploying Beaters..");

    let beaters = await upgrades.deployProxy(Beaters);
    await beaters.waitForDeployment();
    const beatersAddr = await beaters.getAddress();

    console.log("Beaters deployed to: ", beatersAddr);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
