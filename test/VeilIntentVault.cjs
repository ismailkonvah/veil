const assert = require("node:assert/strict");
const hre = require("hardhat");
const { FhevmType } = require("@fhevm/hardhat-plugin");

describe("VeilIntentVault", function () {
  async function deployFixture() {
    const [alice] = await hre.ethers.getSigners();
    const factory = await hre.ethers.getContractFactory("VeilIntentVault");
    const vault = await factory.connect(alice).deploy();
    await vault.waitForDeployment();
    const vaultAddress = await vault.getAddress();
    await hre.fhevm.assertCoprocessorInitialized(vaultAddress, "VeilIntentVault");
    return { alice, vault, vaultAddress };
  }

  it("stores encrypted intent fields and computes an encrypted risk flag", async function () {
    const { alice, vault, vaultAddress } = await deployFixture();

    const input = hre.fhevm.createEncryptedInput(vaultAddress, alice.address);
    input.add64(12_500);
    input.add16(125);
    input.addBool(true);
    const encrypted = await input.encrypt();

    const action = hre.ethers.encodeBytes32String("swap");
    const routeCommitment = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("USDC->ETH"));

    const tx = await vault.submitIntent(
      action,
      routeCommitment,
      encrypted.handles[0],
      encrypted.handles[1],
      encrypted.handles[2],
      encrypted.inputProof,
    );
    await tx.wait();

    assert.equal(await vault.intentCount(), 1n);

    const encryptedAmount = await vault.encryptedAmount(1);
    const clearAmount = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedAmount,
      vaultAddress,
      alice,
    );
    assert.equal(clearAmount, 12_500n);

    const encryptedExposure = await vault.encryptedExposure();
    const clearExposure = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedExposure,
      vaultAddress,
      alice,
    );
    assert.equal(clearExposure, 12_500n);

    const riskTx = await vault.computeRiskSignal(1);
    await riskTx.wait();

    const encryptedRisk = await vault.encryptedRiskFlag(1);
    const clearRisk = await hre.fhevm.userDecryptEbool(encryptedRisk, vaultAddress, alice);
    assert.equal(clearRisk, true);
  });
});
