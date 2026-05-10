const hre = require("hardhat");
const fs = require("node:fs");
const path = require("node:path");

const SEPOLIA_USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const underlying = process.env.SEPOLIA_USDC_ADDRESS || SEPOLIA_USDC;

  console.log(`Deploying VeilConfidentialUSDC from ${deployer.address}`);
  console.log(`Underlying USDC: ${underlying}`);

  const factory = await hre.ethers.getContractFactory("VeilConfidentialUSDC");
  const contract = await factory.deploy(underlying);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`VeilConfidentialUSDC deployed to ${address}`);

  const artifactPath = path.join(
    __dirname,
    "..",
    "src",
    "lib",
    "contracts",
    "veil-confidential-usdc.json",
  );
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(
    artifactPath,
    JSON.stringify(
      {
        chainId: hre.network.config.chainId,
        network: hre.network.name,
        address,
        underlying,
        deployedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
