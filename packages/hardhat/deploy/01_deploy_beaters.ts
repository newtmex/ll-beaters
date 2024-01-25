import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Beat, FakeAirnodeRrpV0 } from "../typechain-types";

let beatersName = "Beaters";

/**
 * Deploys a contract named "YourContract" using the deployer account and
 * constructor arguments set to the deployer address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployBeaters: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
    On localhost, the deployer account is the one that comes with Hardhat, which is already funded.

    When deploying to live networks (e.g `yarn deploy --network goerli`), the deployer account
    should have sufficient balance to pay for the gas fees for contract creation.

    You can generate a random account with `yarn generate` which will fill DEPLOYER_PRIVATE_KEY
    with a random private key in the .env file (then used on hardhat.config.ts)
    You can run the `yarn account` command to check your balance in every network.
  */

  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const networkName = hre.network.name;
  let airnodeRrp = "0xa0AD79D995DdeeB18a14eAef56A549A04e3Aa1Bd";
  let epochLength = 6;
  const beat = await hre.ethers.getContract<Beat>("Beat", deployer);
  const beatAddr = await beat.getAddress();

  if (networkName == "localhost") {
    await deploy("FakeAirnodeRrpV0", { from: deployer });
    const fakeAirnodeRrpV0 = await hre.ethers.getContract<FakeAirnodeRrpV0>("FakeAirnodeRrpV0", deployer);
    airnodeRrp = await fakeAirnodeRrpV0.getAddress();
    beatersName = "FakeBeaters";
    epochLength = 1;
  }

  const result = await deploy(beatersName, {
    from: deployer,
    // Contract constructor arguments
    args: [airnodeRrp, epochLength, beatAddr],
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });

  const beatersAddr = result.address;
  await beat.transfer(beatersAddr, await beat.totalSupply());
};

export default deployBeaters;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags YourContract
deployBeaters.tags = [beatersName];
