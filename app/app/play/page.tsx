"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleDollarSign, Wallet, Zap } from "lucide-react";
import GameScreen from "@/features/game/game-screen";
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
    const val = Number(localStorage.getItem("wh_lab_balance") || 0);
    setLabBalance(val);
  }, []);

  function handleRunComplete(result: RunResult) {
    setLastRun(result);

    const currentBalance = Number(localStorage.getItem("wh_lab_balance") || 0);
    const nextBalance = currentBalance + Math.floor(result.shownEarned);

    localStorage.setItem("wh_lab_balance", String(nextBalance));
    setLabBalance(nextBalance);

    const totalEarned = Number(localStorage.getItem("wh_total_game_earned") || 0);
    localStorage.setItem(
      "wh_total_game_earned",
      String(totalEarned + Math.floor(result.shownEarned))
    );
  }

  const earlyPlayerNote = useMemo(() => {
    return "Free runs build SPRM Points now. Paid SUI rounds can plug in later.";
  }, []);

  return (
    <main className="space-y-6 md:space-y-8">
      <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black/40 p-5 backdrop-blur-xl md:rounded-[36px] md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.18),transparent_30%),radial-gradient(circle_at_bottom,rgba(168,85,247,0.16),transparent_35%)]" />
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-pink-300/20 bg-pink-400/10 px-4 py-2 text-[11px] uppercase tracking-[0.3em] text-pink-200/80">
              Live Arena
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
              Enter the Arena
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-7 text-white/62 md:text-base">
              Train on free rounds now, stack SPRM Points, and build your edge
              before live SUI entry rounds arrive.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/app/mine"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-6 py-4 font-semibold text-white transition hover:scale-[1.02] hover:from-fuchsia-400 hover:to-pink-400"
              >
                Build Your Lab
                <ArrowRight className="h-4 w-4" />
              </Link>

              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-4 font-semibold text-white/80 transition hover:bg-white/10"
              >
                SUI Rounds Soon
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ArenaCard
              icon={<Wallet className="h-5 w-5" />}
              title="Wallet Status"
              value={account ? "Connected" : "Not Connected"}
              sub={account ? "Wallet linked for future SUI entry" : "Connect later for SUI entry"}
            />
            <ArenaCard
              icon={<CircleDollarSign className="h-5 w-5" />}
              title="Entry Mode"
              value="Free Training"
              sub="Paid pool mode coming next"
            />
            <ArenaCard
              icon={<Zap className="h-5 w-5" />}
              title="Reward Feed"
              value={`${labBalance} SPRM`}
              sub="Current in-app Lab balance"
            />
            <ArenaCard
              icon={<ArrowRight className="h-5 w-5" />}
              title="Next Phase"
              value="SUI Integration"
              sub="Wallet + pool entry + payouts"
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

            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
              Early Access
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <MiniStat label="Players" value="1 / Solo" />
            <MiniStat label="Entry" value="0 SUI" />
            <MiniStat label="Reward" value="SPRM Points" />
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
                <span className="font-bold text-white">
                  {account.address.slice(0, 6)}...{account.address.slice(-4)}
                </span>
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

              <div className="mt-3 text-xs text-white/50">
                Paid entry rounds coming soon
              </div>
            </div>
          ) : (
            <div className="mt-4 text-sm text-white/50">
              Connect wallet to enable SUI features
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
              Train. Earn. Repeat.
            </div>
          </div>

          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
            Rewards feed your Lab
          </div>
        </div>

        <GameScreen onRunComplete={handleRunComplete} />
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

          <div className="mt-4 text-sm text-white/60">
            This reward has already been added to your Lab balance.
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <InfoCard
          title="Now"
          text="Free rounds build points, train reactions, and grow your in-app economy."
        />
        <InfoCard
          title="Next"
          text="Connect SUI wallet, show balance, and unlock live entry flow."
        />
        <InfoCard
          title="Later"
          text="Move into paid pool rounds, verified entry, and live token mechanics."
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
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
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