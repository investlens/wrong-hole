"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CircleDollarSign,
  Wallet,
  Zap,
  ShieldCheck,
  LockKeyhole,
  Trophy,
} from "lucide-react";
import GameScreen from "../../../features/game/game-screen";
import {
  ConnectButton,
  useCurrentAccount,
  useSuiClientQuery,
} from "@mysten/dapp-kit";

type RunResult = {
  score: number;
  shownEarned: number;
  level: number;
};

const FREE_MODE_LABEL = "Free Training";
const FREE_MODE_POINTS_MULTIPLIER_TEXT = "Lower SPRM Points";
const PAID_MODE_POINTS_MULTIPLIER_TEXT = "Higher SPRM Points";
const FREE_POINTS_NOTE =
  "Free runs award reduced SPRM Points. Paid arena rounds will award more.";
const WALLET_REQUIRED_NOTE =
  "Connect your wallet before playing so rewards can be linked to your wallet identity.";

export default function PlayPage() {
  const account = useCurrentAccount();

  const { data: balanceData } = useSuiClientQuery(
    "getBalance",
    {
      owner: account?.address || "",
      coinType: "0x2::sui::SUI",
    },
    {
      enabled: !!account,
    }
  );

  const balance = balanceData?.totalBalance
    ? Number(balanceData.totalBalance) / 1e9
    : 0;

  const [lastRun, setLastRun] = useState<RunResult | null>(null);
  const [labBalance, setLabBalance] = useState(0);

  useEffect(() => {
    if (!account?.address) {
      setLabBalance(0);
      return;
    }

    const key = `wh_lab_balance_${account.address.toLowerCase()}`;
    const val = Number(localStorage.getItem(key) || 0);
    setLabBalance(val);
  }, [account?.address]);

  function handleRunComplete(result: RunResult) {
    if (!account?.address) return;

    setLastRun(result);

    const walletKey = account.address.toLowerCase();
    const balanceKey = `wh_lab_balance_${walletKey}`;
    const totalEarnedKey = `wh_total_game_earned_${walletKey}`;

    const currentBalance = Number(localStorage.getItem(balanceKey) || 0);

    // Free mode gives less SPRM Points
    const creditedPoints = Math.max(1, Math.floor(result.shownEarned * 0.35));
    const nextBalance = currentBalance + creditedPoints;

    localStorage.setItem(balanceKey, String(nextBalance));
    setLabBalance(nextBalance);

    const totalEarned = Number(localStorage.getItem(totalEarnedKey) || 0);
    localStorage.setItem(totalEarnedKey, String(totalEarned + creditedPoints));

    setLastRun({
      ...result,
      shownEarned: creditedPoints,
    });
  }

  const earlyPlayerNote = useMemo(() => {
    return "Free runs now award fewer SPRM Points. Paid SUI arena rounds should award more once live.";
  }, []);

  const walletShort = account
    ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
    : "Not Connected";

  return (
    <main className="space-y-6 md:space-y-8">
      <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black/40 p-5 backdrop-blur-xl md:rounded-[36px] md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.20),transparent_28%),radial-gradient(circle_at_bottom,rgba(168,85,247,0.18),transparent_34%),radial-gradient(circle_at_center,rgba(59,130,246,0.10),transparent_40%)]" />
        <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute -right-8 bottom-0 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-pink-300/20 bg-pink-400/10 px-4 py-2 text-[11px] uppercase tracking-[0.3em] text-pink-200/80">
              Skill Arena
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
              Train Free. Climb Fast. Enter Paid Later.
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-7 text-white/62 md:text-base">
              Free mode is your training ground. Build reactions, improve score,
              and stack reduced SPRM Points. Paid SUI arena rounds will reward
              higher SPRM Points and stronger upside.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/app/arena"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-6 py-4 font-semibold text-white transition hover:scale-[1.02] hover:from-fuchsia-400 hover:to-pink-400"
              >
                Open Arena Hub
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/app/arena/sui"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-4 font-semibold text-white/80 transition hover:bg-white/10"
              >
                Paid Arena
                <Trophy className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ArenaCard
              icon={<Wallet className="h-5 w-5" />}
              title="Wallet Status"
              value={account ? "Connected" : "Required"}
              sub={
                account
                  ? "Rewards are linked to this wallet identity"
                  : "Connect wallet before playing"
              }
            />
            <ArenaCard
              icon={<CircleDollarSign className="h-5 w-5" />}
              title="Mode"
              value={FREE_MODE_LABEL}
              sub={FREE_MODE_POINTS_MULTIPLIER_TEXT}
            />
            <ArenaCard
              icon={<Zap className="h-5 w-5" />}
              title="Linked Balance"
              value={`${labBalance} SPRM`}
              sub={account ? "Wallet-linked local test balance" : "Connect wallet to activate"}
            />
            <ArenaCard
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Protection"
              value="Wallet Gate"
              sub="Helps reduce fake runs and bot abuse"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-pink-300/70">
                Current Mode
              </div>
              <div className="mt-2 text-xl font-bold md:text-2xl">
                Free Skill Arena
              </div>
            </div>

            <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200">
              Wallet Required
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <MiniStat label="Players" value="1 / Solo" />
            <MiniStat label="Entry" value="0 SUI" />
            <MiniStat label="Reward" value="Reduced SPRM" />
            <MiniStat label="Paid Mode" value="Higher SPRM" />
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/65">
            {earlyPlayerNote}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <div className="text-xs uppercase tracking-[0.28em] text-fuchsia-300/70">
            Wallet
          </div>

          <div className="mt-4">
            <ConnectButton />
          </div>

          {account ? (
            <div className="mt-4 space-y-2 text-sm text-white/70">
              <div className="flex justify-between gap-4">
                <span>Address</span>
                <span className="font-bold text-white">{walletShort}</span>
              </div>

              <div className="flex justify-between gap-4">
                <span>Network</span>
                <span className="font-bold text-white">Testnet</span>
              </div>

              <div className="flex justify-between gap-4">
                <span>SUI Balance</span>
                <span className="font-bold text-white">
                  {balance.toFixed(3)} SUI
                </span>
              </div>

              <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs text-emerald-200">
                Free mode rewards are now tied to this wallet identity.
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-sm text-yellow-100">
              {WALLET_REQUIRED_NOTE}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-4 md:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-emerald-300/70">
              Arena Session
            </div>
            <div className="mt-2 text-xl font-bold md:text-2xl">
              Train. Earn Less. Upgrade Into Paid.
            </div>
          </div>

          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
            Free = lower rewards / Paid = higher rewards
          </div>
        </div>

        {account ? (
          <GameScreen onRunComplete={handleRunComplete} />
        ) : (
          <div className="rounded-[24px] border border-white/10 bg-black/25 p-6 md:p-8">
            <div className="mx-auto max-w-xl text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-200">
                <LockKeyhole className="h-6 w-6" />
              </div>

              <div className="mt-4 text-2xl font-black text-white">
                Connect Wallet To Start Free Runs
              </div>

              <p className="mt-3 text-sm leading-7 text-white/60 md:text-base">
                This blocks anonymous farming, helps reduce bot abuse, and makes
                sure SPRM Points can be attached to a wallet identity from the
                start.
              </p>

              <div className="mt-6 flex justify-center">
                <ConnectButton />
              </div>
            </div>
          </div>
        )}
      </section>

      {lastRun && (
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 md:p-6">
          <div className="text-xs uppercase tracking-[0.28em] text-pink-300/70">
            Last Completed Run
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MiniStat label="Score" value={String(lastRun.score)} />
            <MiniStat label="Earned" value={`${lastRun.shownEarned} SPRM`} />
            <MiniStat label="Level" value={String(lastRun.level)} />
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
            Free mode reward has been added against the connected wallet profile.
            Paid arena mode should credit more SPRM Points than free mode.
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <InfoCard
          title="Free Mode"
          text="Practice the mechanic, improve your score, and earn reduced SPRM Points."
        />
        <InfoCard
          title="Paid Arena"
          text="Spend SUI, play the same core game, and unlock higher SPRM Point rewards."
        />
        <InfoCard
          title="Next Layer"
          text="Move reward storage from local testing into Supabase by wallet address, then later convert eligible points into claimable SPRM."
        />
      </section>
    </main>
  );
}

function ArenaCard({
  icon,
  title,
  value,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_30px_rgba(255,255,255,0.02)]">
      <div className="flex items-center gap-2 text-pink-300">{icon}</div>
      <div className="mt-3 text-xs uppercase tracking-[0.22em] text-white/40">
        {title}
      </div>
      <div className="mt-2 text-lg font-bold text-white">{value}</div>
      <div className="mt-1 text-sm text-white/55">{sub}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-[10px] uppercase tracking-[0.22em] text-white/45">
        {label}
      </div>
      <div className="mt-2 text-lg font-black text-white">{value}</div>
    </div>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
      <div className="text-xs uppercase tracking-[0.28em] text-fuchsia-300/70">
        {title}
      </div>
      <div className="mt-3 text-sm leading-7 text-white/62">{text}</div>
    </div>
  );
}

