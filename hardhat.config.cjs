require("dotenv").config();
require("@fhevm/hardhat-plugin");
require("@nomicfoundation/hardhat-ethers");

const { SEPOLIA_RPC_URL, PRIVATE_KEY } = process.env;

/** @type {import("hardhat/config").HardhatUserConfig} */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun",
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL || "",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
};
