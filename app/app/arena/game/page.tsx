"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ConnectButton,
  useCurrentAccount,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import {
  ArrowLeft,
  CircleDollarSign,
  Wallet,
  Zap,
  RefreshCw,
  FlaskConical,
  CheckCircle2,
  XCircle,
  Sparkles,
} from "lucide-react";
import GameScreen from "@/features/game/game-screen";

type Player = {
  id?: number;
  address: string;
  tickets: number;
};

type RunResult = {
  score: number;
  shownEarned: number;
  level: number;
};

type CurrentRoundResponse = {
  id?: string | number;
  status?: string;
  players?: Player[];
  total_pool?: number; // stored in MIST
  winner_wallet?: string | null;
};

type GameStage =
  | "ready"
  | "skill"
  | "hole_select"
  | "hole_reveal"
  | "final_draw"
  | "result";

type SurvivorEntry = {
  wallet: string;
  score: number;
  tickets: number;
  ticketMultiplier: number;
  survivalBoost: number;
  finalPower: number;
};

const TICKET_PRICE_SUI = 0.1;
const TICKET_PRICE_MIST = 100_000_000;
const HOLES = [1, 2, 3, 4, 5];
const SURVIVOR_SPRM = 20;
const WINNER_BONUS_SPRM = 30;
const SURVIVAL_BOOST = 1.5;

function shortAddress(address: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getTicketMultiplier(tickets: number) {
  if (tickets === 2) return 1.1;
  if (tickets === 3) return 1.25;
  return 1.0;
}

function makeSeedFromValue(value: string | number | null | undefined) {
  const text = String(value ?? "0");
  let hash = 0;

  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) % 2147483647;
  }

  return hash;
}

function pickWrongHole(seed?: number) {
  const holes = [...HOLES];
  let random = Number.isFinite(seed) ? (seed as number) : Date.now();
  random = (random * 9301 + 49297) % 233280;
  const index = Math.floor((random / 233280) * holes.length);
  return holes[Math.max(0, Math.min(index, holes.length - 1))];
}

function buildSurvivorEntries({
  players,
  myWallet,
  myScore,
  mySurvived,
}: {
  players: Player[];
  myWallet: string;
  myScore: number;
  mySurvived: boolean;
}): SurvivorEntry[] {
  const entries: SurvivorEntry[] = [];

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const wallet = String(p.address || "");
    const tickets = Number(p.tickets || 1);
    const ticketMultiplier = getTicketMultiplier(tickets);

    let survived = false;
    let score = 0;

    if (wallet.toLowerCase() === myWallet.toLowerCase()) {
      survived = mySurvived;
      score = myScore;
    } else {
      survived = i % 2 === 0;
      score = 130 + ((i + 1) * 29) % 210;
    }

    if (!survived) continue;

    const finalPower = Number(
      (score * ticketMultiplier * SURVIVAL_BOOST).toFixed(2)
    );

    entries.push({
      wallet,
      score,
      tickets,
      ticketMultiplier,
      survivalBoost: SURVIVAL_BOOST,
      finalPower,
    });
  }

  return entries;
}

function pickWinnerByFinalPower(entries: SurvivorEntry[]) {
  if (!entries.length) return null;

  const totalPower = entries.reduce((sum, e) => sum + e.finalPower, 0);
  let cursor = Math.random() * totalPower;

  for (const entry of entries) {
    cursor -= entry.finalPower;
    if (cursor <= 0) return entry;
  }

  return entries[entries.length - 1];
}

export default function ArenaGamePage() {
  const account = useCurrentAccount();

  const [mounted, setMounted] = useState(false);
  const [loadingRound, setLoadingRound] = useState(true);
  const [roundError, setRoundError] = useState<string | null>(null);
  const [roundData, setRoundData] = useState<CurrentRoundResponse | null>(null);

  const [gameStage, setGameStage] = useState<GameStage>("ready");
  const [lastRun, setLastRun] = useState<RunResult | null>(null);

  const [selectedHole, setSelectedHole] = useState<number | null>(null);
  const [wrongHole, setWrongHole] = useState<number | null>(null);
  const [isSurvivor, setIsSurvivor] = useState<boolean | null>(null);
  const [winnerWallet, setWinnerWallet] = useState<string | null>(null);
  const [estimatedChance, setEstimatedChance] = useState<number | null>(null);
  const [survivorEntries, setSurvivorEntries] = useState<SurvivorEntry[]>([]);
  const [myFinalPower, setMyFinalPower] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [devLoading, setDevLoading] = useState(false);
  const [devMessage, setDevMessage] = useState<string | null>(null);

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

  const players = roundData?.players || [];
  const totalPoolMist =
    typeof roundData?.total_pool === "number"
      ? roundData.total_pool
      : players.reduce((sum, p) => sum + p.tickets * TICKET_PRICE_MIST, 0);
  const totalPoolSui = totalPoolMist / 1e9;

  const myEntry = useMemo(() => {
    if (!account?.address) return null;
    return players.find(
      (p) => p.address?.toLowerCase() === account.address.toLowerCase()
    );
  }, [players, account?.address]);

  const myTickets = myEntry?.tickets ?? 0;
  const myTicketMultiplier = getTicketMultiplier(myTickets);
  const myPaidAmount = myTickets * TICKET_PRICE_SUI;

  const finalPowerPreview = lastRun
    ? Number((lastRun.score * myTicketMultiplier * SURVIVAL_BOOST).toFixed(2))
    : 0;

  const isMyWin =
    !!winnerWallet &&
    !!account?.address &&
    winnerWallet.toLowerCase() === account.address.toLowerCase();

  useEffect(() => {
    setMounted(true);
  }, []);

  async function loadRound() {
    try {
      setLoadingRound(true);
      setRoundError(null);

      const res = await fetch("/api/arena/current", { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load arena round.");
      }

      setRoundData(data || null);
    } catch (err: any) {
      console.error("Load round error:", err);
      setRoundError(err.message || "Failed to load round.");
    } finally {
      setLoadingRound(false);
    }
  }

  useEffect(() => {
    if (!mounted) return;
    loadRound();
  }, [mounted]);

  async function fillFakeRound() {
    if (!account?.address) {
      setDevMessage("Connect wallet first.");
      return;
    }

    try {
      setDevLoading(true);
      setDevMessage("Filling fake round...");

      const res = await fetch("/api/arena/dev-fill-round", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: account.address,
        }),
      });

      const raw = await res.text();
      let data: any = null;

      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = { error: raw || "Invalid server response." };
      }

      if (!res.ok || data?.error) {
        throw new Error(data?.error || `Request failed with status ${res.status}`);
      }

      setRoundData({
        id: data?.roundId,
        status: data?.status,
        players: data?.players || [],
        total_pool: data?.total_pool || 0,
      });

      setDevMessage(
        `Fake round ready. Round #${data?.roundId} now has ${
          data?.players?.length || 0
        } players.`
      );
    } catch (err: any) {
      console.error("fillFakeRound error:", err);
      setDevMessage(err.message || "Failed to fill fake round.");
    } finally {
      setDevLoading(false);
    }
  }

  function resetLocalView() {
    setGameStage("ready");
    setLastRun(null);
    setSelectedHole(null);
    setWrongHole(null);
    setIsSurvivor(null);
    setWinnerWallet(null);
    setEstimatedChance(null);
    setSurvivorEntries([]);
    setMyFinalPower(0);
    setStatusMessage(null);
    setDevMessage("Local match flow reset.");
  }

  function handleRunComplete(result: RunResult) {
    setLastRun(result);
    setGameStage("hole_select");
    setStatusMessage("Skill battle complete. Choose 1 of 5 holes.");
  }

  function handleConfirmHole() {
    if (!selectedHole || !lastRun) return;

    const roundSeed = makeSeedFromValue(roundData?.id);
    const wrong = pickWrongHole(lastRun.score + myTickets * 17 + roundSeed);
    const survived = selectedHole !== wrong;

    setWrongHole(wrong);
    setIsSurvivor(survived);
    setGameStage("hole_reveal");

    if (survived) {
      setStatusMessage(
        `You survived. +${SURVIVOR_SPRM} SPRM unlocked. Final Power = ${
          lastRun.score
        } × ${myTicketMultiplier.toFixed(2)} × ${SURVIVAL_BOOST.toFixed(
          1
        )} = ${finalPowerPreview.toFixed(2)}`
      );
    } else {
      setStatusMessage("Wrong hole. You are eliminated from the final draw.");
    }
  }

  function handleContinueAfterReveal() {
    if (isSurvivor) {
      setGameStage("final_draw");
      runFinalDraw();
    } else {
      setEstimatedChance(0);
      setWinnerWallet(null);
      setMyFinalPower(0);
      setGameStage("result");
    }
  }

  function runFinalDraw() {
    if (!lastRun || !account?.address) {
      setGameStage("result");
      return;
    }

    const entries = buildSurvivorEntries({
      players,
      myWallet: account.address,
      myScore: lastRun.score,
      mySurvived: !!isSurvivor,
    });

    setSurvivorEntries(entries);

    if (!entries.length) {
      setEstimatedChance(0);
      setWinnerWallet(null);
      setMyFinalPower(0);
      setGameStage("result");
      return;
    }

    const mine =
      entries.find(
        (entry) => entry.wallet.toLowerCase() === account.address.toLowerCase()
      ) || null;

    if (mine) {
      setMyFinalPower(mine.finalPower);
      const totalPower = entries.reduce((sum, e) => sum + e.finalPower, 0);
      setEstimatedChance(
        Number(((mine.finalPower / totalPower) * 100).toFixed(1))
      );
    } else {
      setMyFinalPower(0);
      setEstimatedChance(0);
    }

    const winner = pickWinnerByFinalPower(entries);

    setTimeout(() => {
      setWinnerWallet(winner?.wallet || null);
      setGameStage("result");
    }, 1800);
  }

  if (!mounted) {
    return (
      <main className="space-y-6">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <div className="text-white/60">Loading premium arena...</div>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-black/40 p-5 backdrop-blur-xl md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.18),transparent_28%),radial-gradient(circle_at_bottom,rgba(168,85,247,0.14),transparent_34%),radial-gradient(circle_at_center,rgba(59,130,246,0.08),transparent_40%)]" />
        <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute -right-8 bottom-0 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-pink-300/20 bg-pink-400/10 px-4 py-2 text-[11px] uppercase tracking-[0.3em] text-pink-200/80">
            Wrong Hole Arena
          </div>

          <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
                One wrong hole. One real winner.
              </h1>

              <p className="mt-4 text-sm leading-7 text-white/62 md:text-base">
                Build your <span className="font-semibold text-white">Score</span>{" "}
                in the paid battle. Pick 1 of 5 holes. If you avoid the wrong
                hole, you enter the final draw with{" "}
                <span className="font-semibold text-white">Final Power</span>.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/app/arena"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3 font-semibold text-white/80 transition hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>

              {gameStage === "ready" && (
                <button
                  type="button"
                  onClick={() => setGameStage("skill")}
                  disabled={!account || !myEntry}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-5 py-3 font-semibold text-white transition hover:from-fuchsia-400 hover:to-pink-400 disabled:opacity-50"
                >
                  Start Match
                  <Zap className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 md:p-6">
          <div className="text-xs uppercase tracking-[0.28em] text-fuchsia-300/70">
            How the game works
          </div>

          <div className="mt-4 space-y-3 text-sm leading-7 text-white/68">
            <p>
              <span className="font-semibold text-white">Step 1:</span> Play the
              premium skill battle and finish with your Score.
            </p>
            <p>
              <span className="font-semibold text-white">Step 2:</span> Choose 1
              out of 5 holes.
            </p>
            <p>
              <span className="font-semibold text-white">Step 3:</span> One hole
              is wrong. Anyone who picked that hole is kicked out.
            </p>
            <p>
              <span className="font-semibold text-white">Step 4:</span>{" "}
              Surviving players get <span className="text-white">1.5x</span>{" "}
              survival boost and enter the final winner draw.
            </p>
            <p>
              <span className="font-semibold text-white">Step 5:</span> Winner
              is chosen from survivors only using Final Power.
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/45">
              Final Power
            </div>
            <div className="mt-2 text-lg font-black text-white">
              Score × Ticket Multiplier × Survival Boost
            </div>
            <div className="mt-2 text-sm text-white/60">
              1 ticket = 1.0x · 2 tickets = 1.1x · 3 tickets = 1.25x · Survive
              wrong hole = 1.5x
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <div className="text-xs uppercase tracking-[0.28em] text-fuchsia-300/70">
            Match snapshot
          </div>

          <div className="mt-4 space-y-3">
            <Row label="Pool" value={`${totalPoolSui.toFixed(2)} SUI`} />
            <Row
              label="Your Tickets"
              value={myEntry ? String(myTickets) : "Not in round"}
            />
            <Row
              label="Ticket Boost"
              value={`${myTicketMultiplier.toFixed(2)}x`}
            />
            <Row
              label="Survival Boost"
              value={`${SURVIVAL_BOOST.toFixed(1)}x`}
            />
            <Row label="SUI Winner" value="90% of pool" />
            <Row label="Survivor Reward" value={`${SURVIVOR_SPRM} SPRM`} />
          </div>

          <div className="mt-5">
            <ConnectButton />
          </div>

          {account && (
            <div className="mt-4 space-y-2 text-sm text-white/70">
              <Row label="Wallet" value={shortAddress(account.address)} />
              <Row label="Balance" value={`${balance.toFixed(3)} SUI`} />
              <Row label="Round" value={String(roundData?.id ?? "Current")} />
            </div>
          )}
        </div>
      </section>

      {process.env.NODE_ENV === "development" && (
        <section className="rounded-[24px] border border-yellow-500/30 bg-yellow-500/10 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-yellow-200">
            <FlaskConical className="h-4 w-4" />
            Dev test controls
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={fillFakeRound}
              disabled={!account || devLoading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-400/30 bg-yellow-500/20 px-4 py-3 text-sm font-semibold text-yellow-100 transition hover:bg-yellow-500/30 disabled:opacity-50"
            >
              Fill Fake Round
            </button>

            <button
              onClick={resetLocalView}
              disabled={devLoading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              Reset View
            </button>
          </div>

          {devMessage && (
            <div className="mt-3 text-sm text-yellow-100">{devMessage}</div>
          )}
        </section>
      )}

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-4 md:p-6">
        {!account ? (
          <LockedPanel text="Connect wallet to enter the paid match." />
        ) : loadingRound ? (
          <InfoPanel text="Loading current round..." />
        ) : roundError ? (
          <ErrorPanel text={roundError} />
        ) : !myEntry ? (
          <LockedPanel text="Your wallet is not in the round yet. Use Fill Fake Round in dev mode or join from the arena lobby." />
        ) : gameStage === "ready" ? (
          <StageIntro
            stage="Ready"
            title="Premium Match Ready"
            text="Start the battle. When you finish, you’ll go straight into hole selection."
          />
        ) : gameStage === "skill" ? (
          <div className="space-y-5">
            <StageIntro
              stage="Stage 1"
              title="Build Your Score"
              text="Your paid battle score becomes the base for your Final Power if you survive the wrong-hole phase."
            />
            <GameScreen mode="paid" onRunComplete={handleRunComplete} />
          </div>
        ) : gameStage === "hole_select" ? (
          <div className="space-y-5">
            <StageIntro
              stage="Stage 2"
              title="Choose 1 of 5 Holes"
              text="One hole is wrong. If you avoid it, you survive and your Final Power becomes active."
            />

            {lastRun && (
              <div className="grid gap-3 sm:grid-cols-4">
                <StatBox label="Score" value={String(lastRun.score)} />
                <StatBox label="Tickets" value={String(myTickets)} />
                <StatBox
                  label="Ticket Boost"
                  value={`${myTicketMultiplier.toFixed(2)}x`}
                />
                <StatBox
                  label="If You Survive"
                  value={finalPowerPreview.toFixed(2)}
                />
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/68">
              If you survive:
              <span className="ml-2 font-semibold text-white">
                {lastRun?.score ?? 0} × {myTicketMultiplier.toFixed(2)} ×{" "}
                {SURVIVAL_BOOST.toFixed(1)} = {finalPowerPreview.toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              {HOLES.map((hole) => {
                const active = selectedHole === hole;
                return (
                  <button
                    key={hole}
                    onClick={() => setSelectedHole(hole)}
                    className={`group relative overflow-hidden rounded-[28px] border p-6 text-center transition duration-200 ${
                      active
                        ? "border-fuchsia-400 bg-fuchsia-500/20 text-white shadow-[0_0_35px_rgba(217,70,239,0.25)] scale-[1.02]"
                        : "border-white/10 bg-black/20 text-white/70 hover:bg-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_60%)] opacity-60" />
                    <div className="relative text-4xl transition group-hover:scale-110">
                      🕳️
                    </div>
                    <div className="mt-3 text-lg font-black">Hole {hole}</div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleConfirmHole}
              disabled={!selectedHole}
              className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-5 py-4 font-semibold text-white transition hover:from-fuchsia-400 hover:to-pink-400 disabled:opacity-50"
            >
              Confirm Hole Selection
            </button>
          </div>
        ) : gameStage === "hole_reveal" ? (
          <div className="space-y-5">
            <StageIntro
              stage="Stage 3"
              title="Wrong Hole Reveal"
              text="Anyone who picked the wrong hole is out. Survivors earn SPRM and move to the final draw."
            />

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
              <div className="text-xs uppercase tracking-[0.28em] text-white/45">
                Revealed Wrong Hole
              </div>
              <div className="mt-2 text-3xl font-black text-rose-300">
                Hole {wrongHole ?? "--"}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              {HOLES.map((hole) => {
                const isWrong = wrongHole === hole;
                const isMine = selectedHole === hole;

                return (
                  <div
                    key={hole}
                    className={`relative overflow-hidden rounded-[28px] border p-6 text-center transition-all duration-500 ${
                      isWrong
                        ? "border-rose-400/30 bg-rose-500/15 shadow-[0_0_35px_rgba(244,63,94,0.18)] scale-[1.02]"
                        : "border-emerald-400/30 bg-emerald-500/15 shadow-[0_0_35px_rgba(16,185,129,0.12)]"
                    } ${isMine ? "ring-1 ring-white/20" : ""}`}
                  >
                    <div
                      className={`absolute inset-0 ${
                        isWrong
                          ? "bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.12),transparent_60%)]"
                          : "bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.10),transparent_60%)]"
                      }`}
                    />

                    <div className="relative text-5xl animate-pulse">
                      {isWrong ? "💥" : "🛡️"}
                    </div>

                    <div className="mt-3 text-lg font-black text-white">
                      Hole {hole}
                    </div>

                    <div
                      className={`mt-2 text-sm font-semibold ${
                        isWrong ? "text-rose-200" : "text-emerald-200"
                      }`}
                    >
                      {isWrong ? "WRONG" : "SAFE"}
                    </div>

                    {isMine && (
                      <div className="mt-3 inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white">
                        Your Choice
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div
              className={`rounded-[24px] border p-5 text-center ${
                isSurvivor
                  ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                  : "border-rose-400/20 bg-rose-500/10 text-rose-200"
              }`}
            >
              <div className="mx-auto flex w-fit items-center gap-2 text-lg font-bold">
                {isSurvivor ? (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    You Survived
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5" />
                    You Were Eliminated
                  </>
                )}
              </div>
              <div className="mt-3 text-sm text-white/80">{statusMessage}</div>
            </div>

            <button
              onClick={handleContinueAfterReveal}
              className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-5 py-4 font-semibold text-white transition hover:from-fuchsia-400 hover:to-pink-400"
            >
              Continue
            </button>
          </div>
        ) : gameStage === "final_draw" ? (
          <div className="space-y-5">
            <StageIntro
              stage="Stage 4"
              title="Final Winner Draw"
              text="Only survivors are in this draw. Winner is selected from survivor Final Power."
            />

            {lastRun && (
              <>
                <div className="grid gap-3 sm:grid-cols-5">
                  <StatBox label="Score" value={String(lastRun.score)} />
                  <StatBox label="Tickets" value={String(myTickets)} />
                  <StatBox
                    label="Ticket Boost"
                    value={`${myTicketMultiplier.toFixed(2)}x`}
                  />
                  <StatBox
                    label="Survival Boost"
                    value={`${SURVIVAL_BOOST.toFixed(1)}x`}
                  />
                  <StatBox
                    label="Final Power"
                    value={myFinalPower.toFixed(2)}
                  />
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-sm text-white/70">
                    Final Power = Score × Ticket Multiplier × Survival Boost
                  </div>
                  <div className="mt-2 text-lg font-bold text-white">
                    {lastRun.score} × {myTicketMultiplier.toFixed(2)} ×{" "}
                    {SURVIVAL_BOOST.toFixed(1)} = {myFinalPower.toFixed(2)}
                  </div>
                  <div className="mt-2 text-sm text-white/60">
                    Estimated winner chance: {estimatedChance ?? "--"}%
                  </div>
                </div>
              </>
            )}

            <div className="rounded-[24px] border border-fuchsia-400/20 bg-fuchsia-500/10 p-6 text-center text-white shadow-[0_0_35px_rgba(217,70,239,0.12)]">
              <div className="mx-auto flex w-fit items-center gap-2 text-xl font-black">
                <Sparkles className="h-5 w-5 animate-pulse text-fuchsia-200" />
                Drawing Winner...
              </div>
              <div className="mt-3 text-sm text-white/70">
                Final Power decides your weighted chance.
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <StageIntro
              stage="Result"
              title={isMyWin ? "You Won The Pool" : "Round Complete"}
              text={
                isMyWin
                  ? "You survived the wrong hole and won the final weighted draw."
                  : isSurvivor
                  ? "You survived, earned SPRM, but did not win the SUI pool."
                  : "You were eliminated in the wrong-hole phase."
              }
            />

            <div className="grid gap-3 sm:grid-cols-5">
              {lastRun && <StatBox label="Score" value={String(lastRun.score)} />}
              <StatBox label="Tickets" value={String(myTickets)} />
              <StatBox
                label="Survivor SPRM"
                value={isSurvivor ? `${SURVIVOR_SPRM}` : "0"}
              />
              <StatBox
                label="Winner Bonus SPRM"
                value={isMyWin ? `${WINNER_BONUS_SPRM}` : "0"}
              />
              <StatBox
                label="Final Power"
                value={myFinalPower.toFixed(2)}
              />
            </div>

            <div
              className={`rounded-[24px] border p-6 text-center ${
                isMyWin
                  ? "border-emerald-400/20 bg-emerald-500/10"
                  : "border-white/10 bg-black/20"
              }`}
            >
              <div className="text-sm uppercase tracking-[0.28em] text-white/50">
                Winner
              </div>
              <div className="mt-3 text-2xl font-black text-white">
                {winnerWallet ? shortAddress(winnerWallet) : "No winner yet"}
              </div>
              <div className="mt-3 text-sm text-white/70">
                {isMyWin
                  ? `You win ${(totalPoolSui * 0.9).toFixed(2)} SUI`
                  : isSurvivor
                  ? `You keep ${SURVIVOR_SPRM} SPRM survivor reward`
                  : "Try again next round"}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-white/55">{label}</span>
      <span className="font-bold text-white">{value}</span>
    </div>
  );
}

function StageIntro({
  stage,
  title,
  text,
}: {
  stage: string;
  title: string;
  text: string;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.28em] text-fuchsia-300/70">
        {stage}
      </div>
      <div className="mt-2 text-2xl font-black text-white">{title}</div>
      <div className="mt-3 max-w-2xl text-sm leading-7 text-white/60">
        {text}
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-[10px] uppercase tracking-[0.22em] text-white/45">
        {label}
      </div>
      <div className="mt-2 text-lg font-black text-white">{value}</div>
    </div>
  );
}

function LockedPanel({ text }: { text: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/25 p-6 md:p-8">
      <div className="mx-auto max-w-xl text-center">
        <div className="mt-1 text-2xl font-black text-white">Access Locked</div>
        <p className="mt-3 text-sm leading-7 text-white/60 md:text-base">
          {text}
        </p>
      </div>
    </div>
  );
}

function InfoPanel({ text }: { text: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-6 text-sm text-white/70">
      {text}
    </div>
  );
}

function ErrorPanel({ text }: { text: string }) {
  return (
    <div className="rounded-[24px] border border-red-400/20 bg-red-500/10 p-6 text-sm text-red-200">
      {text}
    </div>
  );
}