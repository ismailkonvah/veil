// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {
    FHE,
    ebool,
    euint16,
    euint64,
    externalEbool,
    externalEuint16,
    externalEuint64
} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {FHESafeMath} from "@openzeppelin/confidential-contracts/utils/FHESafeMath.sol";

/// @title VeilIntentVault
/// @notice Stores private DeFi intent parameters and computes an encrypted risk signal.
contract VeilIntentVault is ZamaEthereumConfig {
    struct IntentMetadata {
        address owner;
        bytes32 action;
        bytes32 routeCommitment;
        uint64 createdAt;
    }

    uint256 private _nextIntentId;

    mapping(uint256 => IntentMetadata) private _metadata;
    mapping(uint256 => euint64) private _encryptedAmount;
    mapping(uint256 => euint16) private _encryptedSlippageBps;
    mapping(uint256 => ebool) private _encryptedMevProtection;
    mapping(uint256 => ebool) private _encryptedRiskFlag;
    mapping(address => euint64) private _encryptedExposure;
    mapping(address => ebool) private _lastExposureUpdateOk;

    event ConfidentialIntentSubmitted(
        uint256 indexed intentId,
        address indexed owner,
        bytes32 indexed action,
        bytes32 routeCommitment
    );
    event RiskSignalComputed(uint256 indexed intentId, address indexed owner);

    error NotIntentOwner();
    error UnknownIntent();

    function submitIntent(
        bytes32 action,
        bytes32 routeCommitment,
        externalEuint64 amount,
        externalEuint16 slippageBps,
        externalEbool mevProtection,
        bytes calldata inputProof
    ) external returns (uint256 intentId) {
        intentId = ++_nextIntentId;

        euint64 sealedAmount = FHE.fromExternal(amount, inputProof);
        euint16 sealedSlippage = FHE.fromExternal(slippageBps, inputProof);
        ebool sealedMevProtection = FHE.fromExternal(mevProtection, inputProof);

        _metadata[intentId] = IntentMetadata({
            owner: msg.sender,
            action: action,
            routeCommitment: routeCommitment,
            createdAt: uint64(block.timestamp)
        });
        _encryptedAmount[intentId] = sealedAmount;
        _encryptedSlippageBps[intentId] = sealedSlippage;
        _encryptedMevProtection[intentId] = sealedMevProtection;

        (ebool exposureUpdateOk, euint64 updatedExposure) = FHESafeMath.tryIncrease(
            _encryptedExposure[msg.sender],
            sealedAmount
        );
        _encryptedExposure[msg.sender] = updatedExposure;
        _lastExposureUpdateOk[msg.sender] = exposureUpdateOk;

        _grantIntentAccess(intentId, msg.sender);
        FHE.allowThis(_encryptedExposure[msg.sender]);
        FHE.allow(_encryptedExposure[msg.sender], msg.sender);
        FHE.allowThis(_lastExposureUpdateOk[msg.sender]);
        FHE.allow(_lastExposureUpdateOk[msg.sender], msg.sender);

        emit ConfidentialIntentSubmitted(intentId, msg.sender, action, routeCommitment);
    }

    function computeRiskSignal(uint256 intentId) external returns (ebool) {
        _requireOwner(intentId);

        ebool highSlippage = FHE.gt(_encryptedSlippageBps[intentId], uint16(100));
        ebool largeIntent = FHE.gt(_encryptedAmount[intentId], uint64(10_000));
        ebool riskFlag = FHE.or(highSlippage, largeIntent);

        _encryptedRiskFlag[intentId] = riskFlag;
        FHE.allowThis(riskFlag);
        FHE.allow(riskFlag, msg.sender);

        emit RiskSignalComputed(intentId, msg.sender);
        return riskFlag;
    }

    function metadata(uint256 intentId) external view returns (IntentMetadata memory) {
        if (_metadata[intentId].owner == address(0)) {
            revert UnknownIntent();
        }
        return _metadata[intentId];
    }

    function encryptedAmount(uint256 intentId) external view returns (euint64) {
        _requireOwner(intentId);
        return _encryptedAmount[intentId];
    }

    function encryptedSlippageBps(uint256 intentId) external view returns (euint16) {
        _requireOwner(intentId);
        return _encryptedSlippageBps[intentId];
    }

    function encryptedMevProtection(uint256 intentId) external view returns (ebool) {
        _requireOwner(intentId);
        return _encryptedMevProtection[intentId];
    }

    function encryptedRiskFlag(uint256 intentId) external view returns (ebool) {
        _requireOwner(intentId);
        return _encryptedRiskFlag[intentId];
    }

    function intentCount() external view returns (uint256) {
        return _nextIntentId;
    }

    function encryptedExposure() external view returns (euint64) {
        return _encryptedExposure[msg.sender];
    }

    function lastExposureUpdateOk() external view returns (ebool) {
        return _lastExposureUpdateOk[msg.sender];
    }

    function _grantIntentAccess(uint256 intentId, address account) private {
        FHE.allowThis(_encryptedAmount[intentId]);
        FHE.allow(_encryptedAmount[intentId], account);
        FHE.allowThis(_encryptedSlippageBps[intentId]);
        FHE.allow(_encryptedSlippageBps[intentId], account);
        FHE.allowThis(_encryptedMevProtection[intentId]);
        FHE.allow(_encryptedMevProtection[intentId], account);
    }

    function _requireOwner(uint256 intentId) private view {
        address owner = _metadata[intentId].owner;
        if (owner == address(0)) {
            revert UnknownIntent();
        }
        if (owner != msg.sender) {
            revert NotIntentOwner();
        }
    }
}
