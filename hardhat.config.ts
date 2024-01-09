import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";

const config: HardhatUserConfig = {
    solidity: "0.8.19",
    networks: {
        "lightlink-testnet": {
            url: "https://replicator.pegasus.lightlink.io/rpc/v1",
            accounts: [process.env.WALLET_KEY as string],
            gasPrice: 1000000000,
        },
    },
};

export default config;
