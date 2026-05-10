// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
import {ERC7984ERC20Wrapper} from "@openzeppelin/confidential-contracts/token/ERC7984/extensions/ERC7984ERC20Wrapper.sol";

/// @title VeilConfidentialUSDC
/// @notice ERC7984 wrapper for Sepolia USDC confidential balances and transfers.
contract VeilConfidentialUSDC is ZamaEthereumConfig, ERC7984ERC20Wrapper {
    constructor(IERC20 underlying_)
        ERC7984("Veil Confidential USDC", "vcUSDC", "https://veil.local/metadata/vcusdc.json")
        ERC7984ERC20Wrapper(underlying_)
    {}
}
