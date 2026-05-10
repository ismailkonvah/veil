import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Wallet } from "lucide-react";

export function TopNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="relative z-20 border-b border-border/80 bg-[#050505]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="text-[15px] font-medium tracking-tight text-foreground">Veil</span>
          </Link>
          <span className="ml-2 hidden rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:inline-block">
            Confidential / Beta
          </span>
          <nav className="ml-4 hidden items-center gap-1 sm:flex">
            <NavLink to="/" active={path === "/"}>
              Dashboard
            </NavLink>
            <NavLink to="/console" active={path === "/console"}>
              Console
            </NavLink>
            <NavLink to="/dashboard" active={path === "/dashboard"}>
              Audits
            </NavLink>
          </nav>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <PrivacyStatus />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}

function NavLink({
  to,
  active,
  children,
}: {
  to: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
        active ? "bg-surface text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;

        if (!connected) {
          return (
            <button
              type="button"
              onClick={openConnectModal}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-[13px] font-medium text-foreground transition-colors hover:border-border-strong hover:bg-surface-elevated"
            >
              <Wallet className="h-3.5 w-3.5 text-[#a78bfa]" />
              Connect
            </button>
          );
        }

        if (chain.unsupported) {
          return (
            <button
              type="button"
              onClick={openChainModal}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 text-[13px] font-medium text-destructive transition-colors hover:bg-destructive/15"
            >
              Wrong network
            </button>
          );
        }

        return (
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={openChainModal}
              className="hidden h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-[12px] text-muted-foreground transition-colors hover:border-border-strong sm:inline-flex"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
              {chain.name}
            </button>
            <button
              type="button"
              onClick={openAccountModal}
              className="inline-flex h-9 min-w-0 items-center gap-2 rounded-md border border-border bg-surface px-3 text-[13px] font-medium text-foreground transition-colors hover:border-border-strong hover:bg-surface-elevated"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6] shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
              <span className="max-w-[88px] truncate sm:max-w-[140px]">{account.displayName}</span>
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

function Logo() {
  return (
    <div className="relative h-6 w-6">
      <div className="absolute inset-0 rounded-[5px] bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] opacity-90" />
      <div className="absolute inset-[3px] rounded-[3px] bg-[#050505]" />
      <div className="absolute inset-0 m-auto h-1.5 w-1.5 rounded-full bg-[#8B5CF6] shadow-[0_0_10px_rgba(139,92,246,0.9)]" />
    </div>
  );
}

function PrivacyStatus() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="hidden h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-[12px] text-muted-foreground md:inline-flex"
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#8B5CF6] opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#8B5CF6]" />
      </span>
      <span className="font-mono text-[11px] tracking-wide">FHE / ACTIVE</span>
    </motion.div>
  );
}
