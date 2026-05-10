const hre = require("hardhat");
const fs = require("node:fs");
const path = require("node:path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying VeilIntentVault from ${deployer.address}`);

  const factory = await hre.ethers.getContractFactory("VeilIntentVault");
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`VeilIntentVault deployed to ${address}`);

  const artifactPath = path.join(
    __dirname,
    "..",
    "src",
    "lib",
    "contracts",
    "veil-intent-vault.json",
  );
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(
    artifactPath,
    JSON.stringify(
      {
        chainId: hre.network.config.chainId,
        network: hre.network.name,
        address,
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
