import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";

export const walletConnectProjectId =
  (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined) ||
  "00000000000000000000000000000000";

export const wagmiConfig = getDefaultConfig({
  appName: "Veil",
  projectId: walletConnectProjectId,
  chains: [sepolia],
  ssr: true,
});
