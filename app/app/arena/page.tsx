"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ConnectButton,
  useCurrentAccount,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import {
  ArrowLeft,
  CircleDollarSign,
  ShieldCheck,
  Trophy,
  Users,
  Wallet,
  Zap,
  FlaskConical,
  RefreshCw,
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
  total_pool?: number;
  winner_wallet?: string | null;
};

type SubmitState = "idle" | "submitting" | "submitted" | "failed";

const TICKET_PRICE_SUI = 0.1;

function shortAddress(address: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getTicketMultiplier(tickets: number) {
  if (tickets === 2) return 1.25;
  if (tickets === 3) return 1.5;
  return 1.0;
}

function ArenaGamePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const account = useCurrentAccount();
  const roundIdFromQuery = searchParams.get("roundId") || "";

  const [mounted, setMounted] = useState(false);
  const [loadingRound, setLoadingRound] = useState(true);
  const [roundError, setRoundError] = useState<string | null>(null);
  const [roundData, setRoundData] = useState<CurrentRoundResponse | null>(null);

  const [gameStarted, setGameStarted] = useState(false);
  const [lastRun, setLastRun] = useState<RunResult | null>(null);

  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

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
  const totalPool =
    typeof roundData?.total_pool === "number"
      ? roundData.total_pool
      : players.reduce((sum, p) => sum + p.tickets * TICKET_PRICE_SUI, 0);

  const effectiveRoundId = roundIdFromQuery || roundData?.id || "";

  const myEntry = useMemo(() => {
    if (!account?.address) return null;
    return players.find(
      (p) => p.address?.toLowerCase() === account.address.toLowerCase()
    );
  }, [players, account?.address]);

  const myTickets = myEntry?.tickets ?? 0;
  const myPaidAmount = myTickets * TICKET_PRICE_SUI;
  const myMultiplier = getTicketMultiplier(myTickets);

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

  async function handleRunComplete(result: RunResult) {
    setLastRun(result);
    setSubmitState("submitting");
    setSubmitMessage("Submitting your paid arena score...");

    try {
      const payload = {
        roundId: effectiveRoundId || null,
        walletAddress: account?.address || "",
        score: result.score,
        shownEarned: result.shownEarned,
        level: result.level,
        tickets: myTickets,
        mode: "paid",
      };

      const res = await fetch("/api/arena/submit-score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (res.status === 404) {
        setSubmitState("failed");
        setSubmitMessage(
          "Game completed, but /api/arena/submit-score is not built yet."
        );
        return;
      }

      if (!res.ok || data?.error) {
        throw new Error(data?.error || "Failed to submit score.");
      }

      setSubmitState("submitted");

      if (data?.allSubmitted) {
        setSubmitMessage("All scores submitted. Round finished.");
        setTimeout(() => {
          router.push(`/app/arena/result/${data.roundId || effectiveRoundId}`);
        }, 1200);
      } else {
        setSubmitMessage("Score submitted. Waiting for other players.");
      }

      await loadRound();
    } catch (err: any) {
      console.error("Submit score error:", err);
      setSubmitState("failed");
      setSubmitMessage(err.message || "Failed to submit score.");
    }
  }

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

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.error) {
        throw new Error(data?.error || "Failed to fill fake round.");
      }

      setRoundData({
        id: data?.roundId,
        status: data?.status,
        players: data?.players || [],
        total_pool: data?.total_pool || 0,
      });

      setDevMessage(
        `Fake round ready. Round #${data?.roundId} now has ${data?.players?.length || 0} players.`
      );
    } catch (err: any) {
      console.error("fillFakeRound error:", err);
      setDevMessage(err.message || "Failed to fill fake round.");
    } finally {
      setDevLoading(false);
    }
  }

  async function submitFakeOpponentScores() {
    if (!account?.address) {
      setDevMessage("Connect wallet first.");
      return;
    }

    try {
      setDevLoading(true);
      setDevMessage("Submitting fake opponent scores...");

      const res = await fetch("/api/arena/dev-submit-fake-scores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roundId: effectiveRoundId ? Number(effectiveRoundId) : undefined,
          keepWalletAddress: account.address,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.error) {
        throw new Error(data?.error || "Failed to submit fake scores.");
      }

      if (data?.allSubmitted) {
        setDevMessage(
          `All fake scores submitted. Winner: ${shortAddress(
            data.winnerWallet || ""
          )}`
        );
        setTimeout(() => {
          router.push(`/app/arena/result/${data.roundId || effectiveRoundId}`);
        }, 1200);
      } else {
        setDevMessage(
          `Fake scores submitted. ${data?.submittedCount || 0}/${data?.expectedPlayers || 0} total scores saved.`
        );
      }

      await loadRound();
    } catch (err: any) {
      console.error("submitFakeOpponentScores error:", err);
      setDevMessage(err.message || "Failed to submit fake scores.");
    } finally {
      setDevLoading(false);
    }
  }

  function resetLocalView() {
    setGameStarted(false);
    setLastRun(null);
    setSubmitState("idle");
    setSubmitMessage(null);
    setDevMessage("Local view reset.");
  }

  if (!mounted) {
    return (
      <main className="space-y-6 md:space-y-8">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <div className="text-white/60">Loading paid arena...</div>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6 md:space-y-8">
      <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black/40 p-5 backdrop-blur-xl md:rounded-[36px] md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.20),transparent_28%),radial-gradient(circle_at_bottom,rgba(168,85,247,0.18),transparent_34%),radial-gradient(circle_at_center,rgba(59,130,246,0.10),transparent_40%)]" />
        <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute -right-8 bottom-0 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-pink-300/20 bg-pink-400/10 px-4 py-2 text-[11px] uppercase tracking-[0.3em] text-pink-200/80">
              Paid Arena Match
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
              Enter. Perform. Win The Pool.
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-7 text-white/62 md:text-base">
              This is the paid skill round. Every player runs the same game,
              scores are captured, and the winner is chosen using score and
              ticket-weighted odds.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/app/arena"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-4 font-semibold text-white/80 transition hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Arena
              </Link>

              <button
                type="button"
                onClick={() => setGameStarted(true)}
                disabled={!account || !myEntry || gameStarted}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-6 py-4 font-semibold text-white transition hover:scale-[1.02] hover:from-fuchsia-400 hover:to-pink-400 disabled:opacity-50"
              >
                {gameStarted ? "Run Active" : "Start Paid Run"}
                <Zap className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ArenaCard
              icon={<Users className="h-5 w-5" />}
              title="Round Fill"
              value={`${players.length}/10`}
              sub={loadingRound ? "Loading players..." : "Current round roster"}
            />
            <ArenaCard
              icon={<CircleDollarSign className="h-5 w-5" />}
              title="Pool"
              value={`${totalPool.toFixed(1)} SUI`}
              sub="Live paid arena pool"
            />
            <ArenaCard
              icon={<Wallet className="h-5 w-5" />}
              title="Your Entry"
              value={
                myEntry
                  ? `${myTickets} Ticket${myTickets > 1 ? "s" : ""}`
                  : "Not in round"
              }
              sub={
                myEntry
                  ? `${myPaidAmount.toFixed(1)} SUI entered`
                  : "Join arena lobby first"
              }
            />
            <ArenaCard
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Your Boost"
              value={`${myMultiplier.toFixed(2)}x`}
              sub="Ticket multiplier on your score"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-pink-300/70">
                Match Status
              </div>
              <div className="mt-2 text-xl font-bold md:text-2xl">
                {gameStarted ? "Run In Progress" : "Ready To Start"}
              </div>
            </div>

            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
              {submitState === "submitting"
                ? "Submitting Score"
                : submitState === "submitted"
                ? "Score Saved"
                : "Paid Mode"}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <MiniStat label="Mode" value="Paid" />
            <MiniStat label="Entry" value={`${myPaidAmount.toFixed(1)} SUI`} />
            <MiniStat label="Tickets" value={String(myTickets || 0)} />
            <MiniStat label="Multiplier" value={`${myMultiplier.toFixed(2)}x`} />
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/65">
            Paid arena uses the same core skill game as free mode, but with
            stronger rewards, real stakes, and transparent winner logic.
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
                  {shortAddress(account.address)}
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

              <div className="flex justify-between gap-4">
                <span>Round ID</span>
                <span className="font-bold text-white">
                  {String(effectiveRoundId || "Current")}
                </span>
              </div>

              <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs text-emerald-200">
                Your wallet is connected and ready for paid score submission.
              </div>
            </div>
          ) : (
            <div className="mt-4 text-sm text-white/50">
              Connect wallet to play the paid arena run.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/10 via-black/30 to-purple-500/10 p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-fuchsia-300/70">
              Winner Logic
            </div>
            <div className="mt-2 text-xl font-bold md:text-2xl">
              How The Winner Is Chosen
            </div>
          </div>

          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
            Score + Tickets = Final Weight
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/45">
              Step 1
            </div>
            <div className="mt-2 text-lg font-black text-white">
              Play For Score
            </div>
            <div className="mt-2 text-sm leading-6 text-white/60">
              Your run performance creates your base score. Higher score means
              stronger winning odds.
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/45">
              Step 2
            </div>
            <div className="mt-2 text-lg font-black text-white">
              Tickets Boost Weight
            </div>
            <div className="mt-2 text-sm leading-6 text-white/60">
              More tickets increase your final weight:
              <br />
              1 Ticket = 1.0x
              <br />
              2 Tickets = 1.25x
              <br />
              3 Tickets = 1.5x
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/45">
              Step 3
            </div>
            <div className="mt-2 text-lg font-black text-white">
              Weighted Winner Draw
            </div>
            <div className="mt-2 text-sm leading-6 text-white/60">
              Final Weight = Score × Ticket Multiplier.
              <br />
              Winner is selected using weighted odds from all players’ final
              weights.
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-200">
          Highest score improves your chance, but does not guarantee the win.
          More tickets improve your chance, but do not guarantee the win. The
          final winner is chosen from the weighted odds of the whole round.
        </div>
      </section>

      {process.env.NODE_ENV === "development" && (
        <section className="rounded-[28px] border border-yellow-500/30 bg-yellow-500/10 p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-yellow-200">
            <FlaskConical className="h-4 w-4" />
            Dev Test Controls
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={fillFakeRound}
              disabled={!account || devLoading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-400/30 bg-yellow-500/20 px-4 py-3 text-sm font-semibold text-yellow-100 transition hover:bg-yellow-500/30 disabled:opacity-50"
            >
              Fill Fake Round
            </button>

            <button
              onClick={submitFakeOpponentScores}
              disabled={!account || devLoading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-400/30 bg-yellow-500/20 px-4 py-3 text-sm font-semibold text-yellow-100 transition hover:bg-yellow-500/30 disabled:opacity-50"
            >
              Submit Fake Opponent Scores
            </button>

            <button
              onClick={resetLocalView}
              disabled={devLoading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              Reset Local View
            </button>
          </div>

          {devMessage && (
            <div className="mt-4 rounded-2xl border border-yellow-400/20 bg-black/20 p-4 text-sm text-yellow-100">
              {devMessage}
            </div>
          )}
        </section>
      )}

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-4 md:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-emerald-300/70">
              Gameplay
            </div>
            <div className="mt-2 text-xl font-bold md:text-2xl">
              Same Skill Loop, Higher Stakes
            </div>
          </div>

          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
            Paid run = premium reward path
          </div>
        </div>

        {!account ? (
          <LockedPanel text="Connect wallet to enter the paid skill run." />
        ) : loadingRound ? (
          <div className="rounded-[24px] border border-white/10 bg-black/25 p-6 text-sm text-white/60">
            Loading current round...
          </div>
        ) : roundError ? (
          <div className="rounded-[24px] border border-red-400/20 bg-red-500/10 p-6 text-sm text-red-200">
            {roundError}
          </div>
        ) : !myEntry ? (
          <LockedPanel text="Your wallet is not part of the current paid round. Use 'Fill Fake Round' in dev mode or join the arena lobby first." />
        ) : !gameStarted ? (
          <div className="rounded-[24px] border border-white/10 bg-black/25 p-6 md:p-8">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-200">
                <Trophy className="h-6 w-6" />
              </div>

              <div className="mt-4 text-2xl font-black text-white">
                Paid Arena Run Ready
              </div>

              <p className="mt-3 text-sm leading-7 text-white/60 md:text-base">
                You are in the round with {myTickets} ticket
                {myTickets > 1 ? "s" : ""}. Start your run when ready. After
                completion, your score will be saved and used in the weighted
                winner draw.
              </p>

              <button
                type="button"
                onClick={() => setGameStarted(true)}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-6 py-4 font-semibold text-white transition hover:scale-[1.02] hover:from-fuchsia-400 hover:to-pink-400"
              >
                Start Run
                <Zap className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <GameScreen onRunComplete={handleRunComplete} />

            {submitMessage && (
              <div
                className={`mt-4 rounded-2xl border p-4 text-sm ${
                  submitState === "failed"
                    ? "border-red-400/20 bg-red-500/10 text-red-200"
                    : submitState === "submitted"
                    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                    : "border-white/10 bg-black/20 text-white/70"
                }`}
              >
                {submitMessage}
              </div>
            )}
          </>
        )}
      </section>

      {lastRun && (
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 md:p-6">
          <div className="text-xs uppercase tracking-[0.28em] text-pink-300/70">
            Your Paid Run
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <MiniStat label="Score" value={String(lastRun.score)} />
            <MiniStat label="Tickets" value={String(myTickets || 0)} />
            <MiniStat label="Multiplier" value={`${myMultiplier.toFixed(2)}x`} />
            <MiniStat
              label="Final Weight"
              value={String(Math.floor(lastRun.score * myMultiplier))}
            />
          </div>

          <div className="mt-4 text-sm text-white/60">
            Your final weight is based on your score and ticket multiplier. This
            weight is used in the round’s winner draw.
          </div>
        </section>
      )}
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

export default function ArenaGamePage() {
  return (
    <Suspense
      fallback={
        <main className="space-y-6 md:space-y-8">
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
            <div className="text-white/60">Loading arena...</div>
          </section>
        </main>
      }
    >
      <ArenaGamePageContent />
    </Suspense>
  );
}