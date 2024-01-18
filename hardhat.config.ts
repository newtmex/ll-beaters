require("dotenv").config();

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 1000,
            },
        },
    },
    // networks: {
    //     hardhat: {
    //         forking: {
    //             url: `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`,
    //             blockNumber: 60_000_000 // Block after API3 QRNG was deplyed
    //         },
    //     },
    // },
};

export default config;
