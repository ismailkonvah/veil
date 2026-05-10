import type { Eip1193Provider } from "ethers";
import type { WalletClient } from "viem";

export function walletClientToEip1193(walletClient: WalletClient): Eip1193Provider {
  return {
    request: ({ method, params }) =>
      walletClient.request({
        method,
        params: params as never,
      }),
  };
}
