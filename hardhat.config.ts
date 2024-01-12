require("dotenv").config();

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";

const config: HardhatUserConfig = {
    solidity: "0.8.20",
    networks: {
        hardhat: {
            forking: {
                url: `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`,
                blockNumber: 3_000_000
            },
        },
    },
};

export default config;
