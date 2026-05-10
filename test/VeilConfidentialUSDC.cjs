const assert = require("node:assert/strict");
const hre = require("hardhat");
const { FhevmType } = require("@fhevm/hardhat-plugin");

describe("VeilConfidentialUSDC", function () {
  async function deployFixture() {
    const [alice, bob] = await hre.ethers.getSigners();

    const usdcFactory = await hre.ethers.getContractFactory("MockUSDC");
    const usdc = await usdcFactory.deploy();
    await usdc.waitForDeployment();

    const wrapperFactory = await hre.ethers.getContractFactory("VeilConfidentialUSDC");
    const wrapper = await wrapperFactory.deploy(await usdc.getAddress());
    await wrapper.waitForDeployment();

    const wrapperAddress = await wrapper.getAddress();
    await hre.fhevm.assertCoprocessorInitialized(wrapperAddress, "VeilConfidentialUSDC");

    await usdc.mint(alice.address, 100_000_000n);

    return { alice, bob, usdc, wrapper, wrapperAddress };
  }

  it("wraps public USDC, transfers confidentially, and creates an unwrap request", async function () {
    const { alice, bob, usdc, wrapper, wrapperAddress } = await deployFixture();

    await usdc.connect(alice).approve(wrapperAddress, 25_000_000n);
    await wrapper.connect(alice).wrap(alice.address, 25_000_000n);

    assert.equal(await usdc.balanceOf(alice.address), 75_000_000n);
    assert.equal(await usdc.balanceOf(wrapperAddress), 25_000_000n);

    const aliceWrapped = await wrapper.confidentialBalanceOf(alice.address);
    const aliceWrappedClear = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      aliceWrapped,
      wrapperAddress,
      alice,
    );
    assert.equal(aliceWrappedClear, 25_000_000n);

    const input = hre.fhevm.createEncryptedInput(wrapperAddress, alice.address);
    input.add64(10_000_000);
    const encrypted = await input.encrypt();

    const transferTx = await wrapper
      .connect(alice)
      [
        "confidentialTransfer(address,bytes32,bytes)"
      ](bob.address, encrypted.handles[0], encrypted.inputProof);
    await transferTx.wait();

    const bobWrapped = await wrapper.confidentialBalanceOf(bob.address);
    const bobWrappedClear = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      bobWrapped,
      wrapperAddress,
      bob,
    );
    assert.equal(bobWrappedClear, 10_000_000n);

    const unwrapInput = hre.fhevm.createEncryptedInput(wrapperAddress, bob.address);
    unwrapInput.add64(4_000_000);
    const encryptedUnwrap = await unwrapInput.encrypt();

    const unwrapTx = await wrapper
      .connect(bob)
      [
        "unwrap(address,address,bytes32,bytes)"
      ](bob.address, bob.address, encryptedUnwrap.handles[0], encryptedUnwrap.inputProof);
    const receipt = await unwrapTx.wait();

    const unwrapEvent = receipt.logs
      .map((log) => {
        try {
          return wrapper.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((event) => event?.name === "UnwrapRequested");

    assert.ok(unwrapEvent?.args?.unwrapRequestId);
    assert.equal(await wrapper.unwrapRequester(unwrapEvent.args.unwrapRequestId), bob.address);

    const publicDecrypt = await hre.fhevm.publicDecrypt([unwrapEvent.args.unwrapRequestId]);
    const clearUnwrapAmount = publicDecrypt.clearValues[unwrapEvent.args.unwrapRequestId];

    await wrapper
      .connect(bob)
      .finalizeUnwrap(
        unwrapEvent.args.unwrapRequestId,
        clearUnwrapAmount,
        publicDecrypt.decryptionProof,
      );

    assert.equal(await usdc.balanceOf(bob.address), 4_000_000n);
  });
});
