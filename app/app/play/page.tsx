"use client";

import { useMemo, useState } from "react";
import GameScreen from "@/features/game/game-screen";

type RunResult = {
  score: number;
  shownEarned: number;
  level: number;
};

export default function PlayPage() {
  const [lastRun, setLastRun] = useState<RunResult | null>(null);
  const [labBalance, setLabBalance] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return Number(localStorage.getItem("wh_lab_balance") || 0);
  });

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

    const totalRuns = Number(localStorage.getItem("wh_total_runs") || 0);
    localStorage.setItem("wh_total_runs", String(Math.max(totalRuns, 1)));
  }

  const earlyPlayerNote = useMemo(() => {
    return "Progress is saved now and can later map into your live token economy.";
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Play</h1>
        <p className="mt-2 text-white/60">
          Fast action. Clean hits. Build your room balance with every strong run.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <TopStat label="Lab Balance" value={`${labBalance} SPRM`} />
        <TopStat
          label="Last Run"
          value={lastRun ? `${lastRun.shownEarned} SPRM` : "No run yet"}
        />
        <TopStat
          label="Progress Note"
          value={lastRun ? `Level ${lastRun.level} reached` : "Early player advantage"}
        />
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
        {earlyPlayerNote}
      </div>

      <GameScreen onRunComplete={handleRunComplete} />

      {lastRun && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm uppercase tracking-[0.25em] text-pink-300/70">
            Last Completed Run
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <MiniStat label="Score" value={String(lastRun.score)} />
            <MiniStat label="Shown Earned" value={`${lastRun.shownEarned} SPRM`} />
            <MiniStat label="Level Reached" value={String(lastRun.level)} />
          </div>

          <div className="mt-4 text-sm text-white/60">
            This run reward has already been added to your Lab balance.
          </div>
        </div>
      )}
    </div>
  );
}

function TopStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="text-sm text-white/50">{label}</div>
      <div className="mt-2 text-xl font-black">{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-white/45">{label}</div>
      <div className="mt-2 text-lg font-black">{value}</div>
    </div>
  );
}