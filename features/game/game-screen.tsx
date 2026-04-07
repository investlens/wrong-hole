"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  TimerReset,
  Trophy,
  Zap,
  Target,
  Gem,
  Droplets,
  TriangleAlert,
  Star,
  Hexagon,
  Diamond,
  CircleHelp,
  Plus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type RunResult = {
  score: number;
  shownEarned: number;
  level: number;
};

type OrbKind =
  | "good"
  | "bonus"
  | "trap"
  | "juice"
  | "combo_drop"
  | "focus_drop"
  | "chaos_drop"
  | "jackpot_drop";

type Orb = {
  id: number;
  x: number;
  y: number;
  size: number;
  kind: OrbKind;
  bornAt: number;
  ttl: number;
};

type FloatingText = {
  id: number;
  x: number;
  y: number;
  text: string;
};

type GameScreenProps = {
  onRunComplete: (result: RunResult) => void;
  mode?: "free" | "paid";
};

const FREE_DURATION = 15;
const FREE_MAX_DURATION = 30;
const PAID_DURATION = 60;

const FREE_MAX_ORBS = 3;
const PAID_MAX_ORBS = 4;

const FREE_BASE_SPAWN_MS = 900;
const PAID_BASE_SPAWN_MS = 650;

const GOOD_POINTS = 10;
const BONUS_POINTS = 25;
const TRAP_POINTS = -12;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function getLevelFromScore(score: number) {
  if (score >= 900) return 10;
  if (score >= 760) return 9;
  if (score >= 620) return 8;
  if (score >= 500) return 7;
  if (score >= 400) return 6;
  if (score >= 300) return 5;
  if (score >= 220) return 4;
  if (score >= 150) return 3;
  if (score >= 90) return 2;
  return 1;
}

function getStabilityLabel(score: number) {
  if (score >= 700) return "Mythic Stability";
  if (score >= 520) return "Elite Stability";
  if (score >= 360) return "Strong Stability";
  if (score >= 220) return "Balanced Stability";
  if (score >= 100) return "Unstable";
  return "Critical";
}

function getOrbVisual(kind: OrbKind) {
  switch (kind) {
    case "good":
      return {
        shell:
          "border-fuchsia-300/40 bg-fuchsia-500/20 shadow-[0_0_35px_rgba(217,70,239,0.35)]",
        core:
          "from-cyan-300/80 via-fuchsia-300/90 to-purple-500/80",
        icon: null,
        iconClass: "",
        shape: "rounded-full",
        pulse: "animate-pulse",
      };

    case "bonus":
      return {
        shell:
          "border-yellow-300/50 bg-yellow-400/20 shadow-[0_0_35px_rgba(250,204,21,0.45)]",
        core:
          "from-yellow-300/90 via-amber-300/80 to-orange-400/80",
        icon: Plus,
        iconClass: "text-white",
        shape: "rounded-[30%] rotate-12",
        pulse: "animate-pulse",
      };

    case "trap":
      return {
        shell:
          "border-rose-300/40 bg-rose-500/20 shadow-[0_0_35px_rgba(244,63,94,0.35)]",
        core:
          "from-rose-300/90 via-pink-400/80 to-red-500/80",
        icon: TriangleAlert,
        iconClass: "text-white",
        shape: "rounded-[22%] rotate-45",
        pulse: "animate-[pulse_0.6s_ease-in-out_infinite]",
      };

    case "juice":
      return {
        shell:
          "border-cyan-300/50 bg-cyan-400/20 shadow-[0_0_35px_rgba(34,211,238,0.45)]",
        core:
          "from-cyan-200/90 via-sky-300/80 to-blue-400/80",
        icon: Droplets,
        iconClass: "text-white",
        shape: "rounded-[45%_45%_55%_55%/55%_55%_45%_45%]",
        pulse: "animate-[pulse_1.1s_ease-in-out_infinite]",
      };

    case "combo_drop":
      return {
        shell:
          "border-violet-300/50 bg-violet-400/20 shadow-[0_0_35px_rgba(167,139,250,0.45)]",
        core:
          "from-violet-200/90 via-fuchsia-300/80 to-purple-500/80",
        icon: Hexagon,
        iconClass: "text-white",
        shape: "rounded-[24%]",
        pulse: "animate-[pulse_0.7s_ease-in-out_infinite]",
      };

    case "focus_drop":
      return {
        shell:
          "border-emerald-300/50 bg-emerald-400/20 shadow-[0_0_35px_rgba(52,211,153,0.45)]",
        core:
          "from-emerald-200/90 via-lime-300/80 to-teal-400/80",
        icon: Diamond,
        iconClass: "text-white",
        shape: "rotate-45 rounded-[18%]",
        pulse: "animate-[pulse_1.4s_ease-in-out_infinite]",
      };

    case "chaos_drop":
      return {
        shell:
          "border-orange-300/50 bg-orange-400/20 shadow-[0_0_35px_rgba(251,146,60,0.45)]",
        core:
          "from-orange-200/90 via-pink-300/80 to-red-500/80",
        icon: CircleHelp,
        iconClass: "text-white",
        shape: "rounded-[38%_62%_55%_45%/45%_40%_60%_55%]",
        pulse: "animate-[pulse_0.5s_ease-in-out_infinite]",
      };

    case "jackpot_drop":
      return {
        shell:
          "border-yellow-200/70 bg-yellow-300/25 shadow-[0_0_42px_rgba(250,204,21,0.65)]",
        core:
          "from-yellow-100/95 via-yellow-300/90 to-amber-500/90",
        icon: Star,
        iconClass: "text-white",
        shape: "rounded-full",
        pulse: "animate-[pulse_0.8s_ease-in-out_infinite]",
      };
  }
}

export default function GameScreen({
  onRunComplete,
  mode = "free",
}: GameScreenProps) {
  const isPaid = mode === "paid";
  const baseDuration = isPaid ? PAID_DURATION : FREE_DURATION;
  const maxDuration = isPaid ? PAID_DURATION : FREE_MAX_DURATION;
  const baseSpawnMs = isPaid ? PAID_BASE_SPAWN_MS : FREE_BASE_SPAWN_MS;
  const maxOrbs = isPaid ? PAID_MAX_ORBS : FREE_MAX_ORBS;

  const arenaRef = useRef<HTMLDivElement | null>(null);
  const orbIdRef = useRef(1);
  const floatIdRef = useRef(1);
  const spawnIntervalRef = useRef<number | null>(null);
  const cleanupIntervalRef = useRef<number | null>(null);
  const tickIntervalRef = useRef<number | null>(null);

  const timeLeftRef = useRef(baseDuration);
  const scoreRef = useRef(0);
  const bestComboRef = useRef(0);
  const focusUntilRef = useRef(0);

  const [stage, setStage] = useState<"ready" | "countdown" | "live" | "finished">("ready");
  const [countdown, setCountdown] = useState(3);

  const [timeLeft, setTimeLeft] = useState(baseDuration);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [orbs, setOrbs] = useState<Orb[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [shake, setShake] = useState(false);
  const [lastResult, setLastResult] = useState<RunResult | null>(null);

  const [focusUntil, setFocusUntil] = useState(0);
  const [dropFeed, setDropFeed] = useState<string[]>([]);
  const [mobileGuideOpen, setMobileGuideOpen] = useState(true);

  const level = useMemo(() => getLevelFromScore(score), [score]);

  const accuracy = useMemo(() => {
    const total = hits + misses;
    if (total <= 0) return 100;
    return Math.round((hits / total) * 100);
  }, [hits, misses]);

  const stability = useMemo(() => getStabilityLabel(score), [score]);

  const effectiveSpawnMs = useMemo(() => {
    const focusActive = Date.now() < focusUntil;
    const speedRamp = isPaid
      ? 1 - Math.min((level - 1) * 0.07, 0.45)
      : 1 - Math.min((level - 1) * 0.08, 0.5);

    let next = Math.floor(baseSpawnMs * speedRamp);

    if (focusActive) {
      next = Math.floor(next * 1.3);
    }

    return clamp(next, isPaid ? 260 : 300, 1600);
  }, [baseSpawnMs, focusUntil, isPaid, level]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    bestComboRef.current = bestCombo;
  }, [bestCombo]);

  useEffect(() => {
    focusUntilRef.current = focusUntil;
  }, [focusUntil]);

  function clearTimers() {
    if (spawnIntervalRef.current) {
      window.clearInterval(spawnIntervalRef.current);
      spawnIntervalRef.current = null;
    }
    if (cleanupIntervalRef.current) {
      window.clearInterval(cleanupIntervalRef.current);
      cleanupIntervalRef.current = null;
    }
    if (tickIntervalRef.current) {
      window.clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
  }

  function finishRun() {
    clearTimers();
    setOrbs([]);
    setStage("finished");
    setMobileGuideOpen(true);

    const finalScore = scoreRef.current;
    const finalBestCombo = bestComboRef.current;

    const result: RunResult = {
      score: finalScore,
      shownEarned: Math.max(
        1,
        Math.floor(finalScore / (isPaid ? 7 : 9) + finalBestCombo * (isPaid ? 4 : 2))
      ),
      level: getLevelFromScore(finalScore),
    };

    setLastResult(result);
    onRunComplete(result);
  }

  function pushDropFeed(text: string) {
    setDropFeed((prev) => [text, ...prev].slice(0, 5));
  }

  function restartSpawnLoop() {
    if (spawnIntervalRef.current) {
      window.clearInterval(spawnIntervalRef.current);
      spawnIntervalRef.current = null;
    }

    spawnIntervalRef.current = window.setInterval(() => {
      spawnOrb();
    }, effectiveSpawnMs);
  }

  function addTime(seconds: number) {
    if (isPaid || stage !== "live") return;

    const next = clamp(timeLeftRef.current + seconds, 0, maxDuration);
    timeLeftRef.current = next;
    setTimeLeft(next);
  }

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  useEffect(() => {
    if (stage !== "countdown") return;

    if (countdown === 0) {
      setStage("live");
      setMobileGuideOpen(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 800);

    return () => window.clearTimeout(timer);
  }, [countdown, stage]);

  useEffect(() => {
    if (stage !== "live") return;
    restartSpawnLoop();

    return () => {
      if (spawnIntervalRef.current) {
        window.clearInterval(spawnIntervalRef.current);
        spawnIntervalRef.current = null;
      }
    };
  }, [effectiveSpawnMs, stage]);

  function pickOrbKind(): OrbKind {
    const roll = Math.random();

    if (roll < (isPaid ? 0.12 : 0.08)) return "trap";
    if (roll < (isPaid ? 0.19 : 0.14)) return "bonus";
    if (roll < (isPaid ? 0.27 : 0.21)) return "juice";
    if (roll < (isPaid ? 0.33 : 0.26)) return "combo_drop";
    if (roll < (isPaid ? 0.38 : 0.30)) return "focus_drop";
    if (roll < (isPaid ? 0.43 : 0.34)) return "chaos_drop";
    if (roll < (isPaid ? 0.445 : 0.35)) return "jackpot_drop";

    return "good";
  }

  function isFarEnough(x: number, y: number, size: number, existing: Orb[]) {
    for (const orb of existing) {
      const dx = x - orb.x;
      const dy = y - orb.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const minDistance = (size + orb.size) * 0.55;
      if (distance < minDistance) return false;
    }
    return true;
  }

  function spawnOrb() {
    if (!arenaRef.current) return;

    setOrbs((prev) => {
      if (prev.length >= maxOrbs) return prev;

      const rect = arenaRef.current!.getBoundingClientRect();
      const isMobile = window.innerWidth < 768;
      const minSize = isMobile ? 68 : isPaid ? 56 : 60;
      const maxSize = isMobile ? 96 : isPaid ? 84 : 92;
      const size = randomBetween(minSize, maxSize);

      const leftPadding = 12;
      const rightPadding = 12;
      const topPadding = isMobile ? rect.height * 0.12 : 18;
      const bottomPadding = isMobile ? rect.height * 0.08 : 18;

      let x = leftPadding;
      let y = topPadding;
      let found = false;

      for (let i = 0; i < 12; i++) {
        const candidateX = clamp(
          randomBetween(leftPadding, rect.width - size - rightPadding),
          leftPadding,
          Math.max(leftPadding, rect.width - size - rightPadding)
        );

        const candidateY = clamp(
          randomBetween(topPadding, rect.height - size - bottomPadding),
          topPadding,
          Math.max(topPadding, rect.height - size - bottomPadding)
        );

        if (isFarEnough(candidateX, candidateY, size, prev)) {
          x = candidateX;
          y = candidateY;
          found = true;
          break;
        }
      }

      if (!found) {
        x = clamp(
          randomBetween(leftPadding, rect.width - size - rightPadding),
          leftPadding,
          Math.max(leftPadding, rect.width - size - rightPadding)
        );
        y = clamp(
          randomBetween(topPadding, rect.height - size - bottomPadding),
          topPadding,
          Math.max(topPadding, rect.height - size - bottomPadding)
        );
      }

      const kind = pickOrbKind();

      let ttl = isPaid ? 1050 : 1250;
      if (kind === "bonus") ttl = isPaid ? 950 : 1100;
      if (kind === "trap") ttl = isPaid ? 1350 : 1500;
      if (kind === "juice") ttl = isPaid ? 1000 : 1150;
      if (kind === "combo_drop") ttl = isPaid ? 900 : 1050;
      if (kind === "focus_drop") ttl = isPaid ? 1000 : 1200;
      if (kind === "chaos_drop") ttl = isPaid ? 1100 : 1300;
      if (kind === "jackpot_drop") ttl = isPaid ? 800 : 900;

      return [
        ...prev,
        {
          id: orbIdRef.current++,
          x,
          y,
          size,
          kind,
          bornAt: Date.now(),
          ttl,
        },
      ];
    });
  }

  useEffect(() => {
    if (stage !== "live") return;

    timeLeftRef.current = baseDuration;
    setTimeLeft(baseDuration);

    tickIntervalRef.current = window.setInterval(() => {
      const next = Math.max(0, timeLeftRef.current - 0.1);
      timeLeftRef.current = next;
      setTimeLeft(next);

      if (next <= 0) {
        finishRun();
      }
    }, 100);

    cleanupIntervalRef.current = window.setInterval(() => {
      const now = Date.now();
      setOrbs((prev) => {
        const expired = prev.filter((orb) => now - orb.bornAt > orb.ttl);
        if (expired.length > 0) {
          setMisses((m) => m + expired.filter((o) => o.kind !== "trap").length);
          setCombo(0);
        }
        return prev.filter((orb) => now - orb.bornAt <= orb.ttl);
      });

      setFloatingTexts((prev) => prev.slice(-8));
    }, 120);

    return () => {
      if (cleanupIntervalRef.current) {
        window.clearInterval(cleanupIntervalRef.current);
        cleanupIntervalRef.current = null;
      }
      if (tickIntervalRef.current) {
        window.clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
    };
  }, [baseDuration, stage]);

  function addFloatingText(x: number, y: number, text: string) {
    setFloatingTexts((prev) => [
      ...prev,
      {
        id: floatIdRef.current++,
        x,
        y,
        text,
      },
    ]);

    window.setTimeout(() => {
      setFloatingTexts((prev) => prev.slice(1));
    }, 650);
  }

  function triggerShake() {
    setShake(true);
    window.setTimeout(() => setShake(false), 160);
  }

  function handleSpecialDrop(orb: Orb, x: number, y: number) {
    if (orb.kind === "juice") {
      setScore((prev) => prev + 35);
      setHits((prev) => prev + 1);
      setCombo((prev) => prev + 1);
      setBestCombo((prev) => Math.max(prev, combo + 1));
      addFloatingText(x, y, "+35");
      addTime(1.25);
      pushDropFeed("Juice Drop: +35 Stability, +1.25s");
      triggerShake();
      return;
    }

    if (orb.kind === "combo_drop") {
      const boostedCombo = combo + 4;
      setScore((prev) => prev + 18);
      setHits((prev) => prev + 1);
      setCombo(boostedCombo);
      setBestCombo((prev) => Math.max(prev, boostedCombo));
      addFloatingText(x, y, "COMBO");
      addTime(1.5);
      pushDropFeed("Combo Drop: +18 Stability, combo boost, +1.5s");
      triggerShake();
      return;
    }

    if (orb.kind === "focus_drop") {
      const until = Date.now() + 2500;
      setFocusUntil(until);
      setScore((prev) => prev + 14);
      setHits((prev) => prev + 1);
      setCombo((prev) => prev + 1);
      setBestCombo((prev) => Math.max(prev, combo + 1));
      addFloatingText(x, y, "FOCUS");
      addTime(2);
      pushDropFeed("Focus Drop: slower spawns 2.5s, +14 Stability, +2s");
      triggerShake();
      return;
    }

    if (orb.kind === "chaos_drop") {
      const lucky = Math.random() > 0.45;
      const delta = lucky ? 70 : -35;
      setScore((prev) => Math.max(0, prev + delta));

      if (lucky) {
        setHits((prev) => prev + 1);
        setCombo((prev) => prev + 2);
        setBestCombo((prev) => Math.max(prev, combo + 2));
        addFloatingText(x, y, "+70");
        addTime(2.5);
        pushDropFeed("Chaos Drop: lucky boost +70, +2.5s");
      } else {
        setMisses((prev) => prev + 1);
        setCombo(0);
        addFloatingText(x, y, "-35");
        if (!isPaid) addTime(-1.5);
        pushDropFeed(
          isPaid
            ? "Chaos Drop: backfired -35"
            : "Chaos Drop: backfired -35, -1.5s"
        );
      }

      triggerShake();
      return;
    }

    if (orb.kind === "jackpot_drop") {
      setScore((prev) => prev + 120);
      setHits((prev) => prev + 1);
      setCombo((prev) => prev + 2);
      setBestCombo((prev) => Math.max(prev, combo + 2));
      addFloatingText(x, y, "JACKPOT");
      addTime(3);
      pushDropFeed("Jackpot Drop: +120 Stability, +3s");
      triggerShake();
    }
  }

  function handleOrbTap(orb: Orb) {
    if (stage !== "live") return;

    setOrbs((prev) => prev.filter((item) => item.id !== orb.id));

    const isDrop =
      orb.kind === "juice" ||
      orb.kind === "combo_drop" ||
      orb.kind === "focus_drop" ||
      orb.kind === "chaos_drop" ||
      orb.kind === "jackpot_drop";

    if (isDrop) {
      handleSpecialDrop(orb, orb.x, orb.y);
      return;
    }

    let points = GOOD_POINTS;
    if (orb.kind === "bonus") points = BONUS_POINTS;
    if (orb.kind === "trap") points = TRAP_POINTS;

    const nextCombo = orb.kind === "trap" ? 0 : combo + 1;
    const comboMultiplier =
      nextCombo >= 10 ? 2.0 : nextCombo >= 6 ? 1.5 : nextCombo >= 3 ? 1.2 : 1.0;

    const finalPoints =
      orb.kind === "trap" ? points : Math.floor(points * comboMultiplier);

    setScore((prev) => Math.max(0, prev + finalPoints));
    setCombo(nextCombo);
    setBestCombo((prev) => Math.max(prev, nextCombo));

    if (orb.kind === "trap") {
      setMisses((prev) => prev + 1);
      addFloatingText(orb.x, orb.y, `${finalPoints}`);
      if (!isPaid) addTime(-0.5);
      pushDropFeed(isPaid ? "Trap: -12 Stability" : "Trap: -12 Stability, -0.5s");
    } else if (orb.kind === "bonus") {
      setHits((prev) => prev + 1);
      addFloatingText(orb.x, orb.y, `+${finalPoints}`);
      addTime(1.5);
      pushDropFeed("Bonus Core: +25 base, combo boosted, +1.5s");
    } else {
      setHits((prev) => prev + 1);
      addFloatingText(orb.x, orb.y, `+${finalPoints}`);
      addTime(0.75);
      pushDropFeed("Stability Core: +10 base, combo boosted, +0.75s");
    }

    triggerShake();
  }

  function startRun() {
    clearTimers();
    setCountdown(3);
    setStage("countdown");
    setTimeLeft(baseDuration);
    timeLeftRef.current = baseDuration;
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setHits(0);
    setMisses(0);
    setOrbs([]);
    setFloatingTexts([]);
    setLastResult(null);
    setFocusUntil(0);
    setDropFeed([]);
  }

  const modeLabel = isPaid ? "Paid Stability Battle" : "Free Stability Run";
  const modeAccent = isPaid
    ? "from-fuchsia-500/20 via-pink-500/10 to-rose-500/10"
    : "from-emerald-500/20 via-cyan-500/10 to-blue-500/10";

  return (
    <div className="space-y-5">
      <section
        className={`relative overflow-hidden rounded-[28px] border border-white/10 bg-black/40 p-4 backdrop-blur-xl md:p-5 ${
          shake ? "animate-[pulse_0.16s_ease-in-out]" : ""
        }`}
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${modeAccent}`} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_55%)]" />
        {stage === "live" && (
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(244,114,182,0.08),transparent_50%)] animate-pulse" />
        )}

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.32em] text-white/50">
              {modeLabel}
            </div>
            <div className="mt-2 text-2xl font-black text-white md:text-3xl">
              Build Stability. Catch Drops. Avoid Collapse.
            </div>
            <div className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
              {isPaid
                ? "60-second paid battle. No extra time. Speed ramps up as your level rises."
                : "Start at 15 seconds. Every good click adds time, but speed ramps up so the run still ends."}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/45">
              Run State
            </div>
            <div className="mt-1 text-lg font-black text-white">
              {stage === "ready"
                ? "Ready"
                : stage === "countdown"
                ? "Countdown"
                : stage === "live"
                ? "Live"
                : "Finished"}
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-5 grid grid-cols-2 gap-3 md:grid-cols-6">
          <StatCard
            icon={<TimerReset className="h-4 w-4" />}
            label="Time Left"
            value={`${Math.max(0, Math.ceil(timeLeft))}s`}
          />
          <StatCard
            icon={<Target className="h-4 w-4" />}
            label="Stability"
            value={String(score)}
          />
          <StatCard
            icon={<Zap className="h-4 w-4" />}
            label="Combo"
            value={`x${Math.max(combo, 0)}`}
          />
          <StatCard
            icon={<Sparkles className="h-4 w-4" />}
            label="Accuracy"
            value={`${accuracy}%`}
          />
          <StatCard
            icon={<Trophy className="h-4 w-4" />}
            label="Level"
            value={String(level)}
          />
          <StatCard
            icon={<Gem className="h-4 w-4" />}
            label="Tier"
            value={stability}
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-3 md:p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300/70">
                Arena Core
              </div>
              <div className="mt-1 text-lg font-bold text-white md:text-xl">
                Mobile-first premium reaction board
              </div>
            </div>

            {stage !== "live" ? (
              <button
                type="button"
                onClick={startRun}
                className="rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-5 py-3 text-sm font-semibold text-white transition hover:from-fuchsia-400 hover:to-pink-400"
              >
                {stage === "finished" ? "Play Again" : "Start Run"}
              </button>
            ) : (
              <div className="rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-2 text-sm font-semibold text-fuchsia-200">
                Live Run
              </div>
            )}
          </div>

          <div
            ref={arenaRef}
            className="relative h-[64vh] min-h-[460px] max-h-[760px] overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.12),transparent_25%),radial-gradient(circle_at_bottom,rgba(56,189,248,0.08),transparent_28%),linear-gradient(180deg,rgba(5,5,10,0.92),rgba(9,9,16,0.98))] md:h-[68vh]"
          >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] opacity-25" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent_60%)]" />

            {stage === "ready" && (
              <CenteredOverlay
                title={isPaid ? "Paid Battle Ready" : "Free Run Ready"}
                subtitle={
                  isPaid
                    ? "Fixed 60-second battle. Learn the drops, avoid traps, keep pressure high."
                    : "Start at 15 seconds, extend your run by good play, but expect speed to ramp up."
                }
                accent={isPaid ? "text-fuchsia-200" : "text-emerald-200"}
              />
            )}

            {stage === "countdown" && (
              <div className="absolute inset-0 z-20 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-sm uppercase tracking-[0.3em] text-white/50">
                    Entering Stability Run
                  </div>
                  <div className="mt-3 animate-pulse text-7xl font-black text-white md:text-8xl">
                    {countdown === 0 ? "GO" : countdown}
                  </div>
                </div>
              </div>
            )}

            {stage === "live" && (
              <>
                {orbs.map((orb) => {
                  const visual = getOrbVisual(orb.kind);
                  const Icon = visual.icon;

                  return (
                    <button
                      key={orb.id}
                      type="button"
                      onClick={() => handleOrbTap(orb)}
                      className={`absolute flex items-center justify-center border backdrop-blur-md transition active:scale-95 ${visual.shell} ${visual.shape} ${visual.pulse}`}
                      style={{
                        left: orb.x,
                        top: orb.y,
                        width: orb.size,
                        height: orb.size,
                      }}
                    >
                      <div
                        className={`absolute inset-[14%] bg-gradient-to-br ${visual.core} ${visual.shape}`}
                      />

                      {orb.kind === "jackpot_drop" && (
                        <>
                          <div className="absolute inset-[-10%] rounded-full border border-yellow-200/50 animate-spin [animation-duration:4s]" />
                          <div className="absolute inset-[-18%] rounded-full border border-yellow-100/25 animate-spin [animation-duration:6s] [animation-direction:reverse]" />
                        </>
                      )}

                      {orb.kind === "trap" && (
                        <div className="absolute inset-[-6%] rounded-[22%] border border-rose-200/25 rotate-45" />
                      )}

                      <div className="relative z-10 flex items-center justify-center">
                        {Icon ? (
                          <Icon
                            className={`h-6 w-6 md:h-7 md:w-7 ${visual.iconClass} ${
                              orb.kind === "focus_drop" ? "-rotate-45" : ""
                            }`}
                            strokeWidth={2.4}
                          />
                        ) : (
                          <div className="h-3 w-3 rounded-full bg-white/80 shadow-[0_0_12px_rgba(255,255,255,0.8)]" />
                        )}
                      </div>
                    </button>
                  );
                })}

                {floatingTexts.map((item) => (
                  <div
                    key={item.id}
                    className="pointer-events-none absolute z-30 animate-[floatUp_0.65s_ease-out_forwards] text-sm font-black text-white"
                    style={{ left: item.x, top: item.y }}
                  >
                    {item.text}
                  </div>
                ))}
              </>
            )}

            {stage === "finished" && lastResult && (
              <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
                <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-black/60 p-6 text-center backdrop-blur-xl">
                  <div className="text-[11px] uppercase tracking-[0.3em] text-fuchsia-300/70">
                    Run Complete
                  </div>
                  <div className="mt-3 text-3xl font-black text-white md:text-4xl">
                    {stability}
                  </div>
                  <div className="mt-3 text-sm leading-7 text-white/60">
                    Your stability score and speed level now feed the next phase.
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                    <ResultStat label="Score" value={String(lastResult.score)} />
                    <ResultStat label="Earned" value={`${lastResult.shownEarned}`} />
                    <ResultStat label="Level" value={String(lastResult.level)} />
                    <ResultStat label="Best Combo" value={`x${bestCombo}`} />
                  </div>

                  <button
                    type="button"
                    onClick={startRun}
                    className="mt-6 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-6 py-3 font-semibold text-white transition hover:from-fuchsia-400 hover:to-pink-400"
                  >
                    Run Again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
            <button
              type="button"
              onClick={() => setMobileGuideOpen((prev) => !prev)}
              className="flex w-full items-center justify-between gap-3 lg:cursor-default"
            >
              <div className="text-xs uppercase tracking-[0.28em] text-fuchsia-300/70">
                What To Catch / Avoid
              </div>
              <div className="lg:hidden text-white/70">
                {mobileGuideOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </button>

            <div className={`mt-3 space-y-2 ${mobileGuideOpen ? "block" : "hidden"} lg:block`}>
              <GuideItem kind="good" title="Stability Core" text="+10 base, combo boosted, +0.75s free mode" />
              <GuideItem kind="bonus" title="Bonus Core" text="+25 base, combo boosted, +1.5s free mode" />
              <GuideItem kind="juice" title="Juice Drop" text="+35 stability, +1.25s free mode" />
              <GuideItem kind="combo_drop" title="Combo Drop" text="+18 stability, combo boost, +1.5s free mode" />
              <GuideItem kind="focus_drop" title="Focus Drop" text="+14 stability, slower spawns, +2s free mode" />
              <GuideItem kind="chaos_drop" title="Chaos Drop" text="either +70 or -35, risky, may add or cut time in free mode" />
              <GuideItem kind="jackpot_drop" title="Jackpot Drop" text="+120 stability, +3s free mode, very rare" />
              <GuideItem kind="trap" title="Trap" text="avoid this: -12 stability, combo break, -0.5s free mode" />
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-[0.28em] text-fuchsia-300/70">
              Live Feed
            </div>
            <div className="mt-3 space-y-2">
              {dropFeed.length ? (
                dropFeed.map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/75"
                  >
                    {item}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-4 text-sm text-white/45">
                  Catch orbs to see live effects here.
                </div>
              )}
            </div>
          </div>
        </aside>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <InfoPanel
          title="Free Mode"
          text="Starts at 15 seconds, gains time on good clicks, capped at 30 seconds, speed rises with level."
        />
        <InfoPanel
          title="Paid Mode"
          text="Fixed 60-second battle. No extra time. Speed rises with level for real pressure."
        />
        <InfoPanel
          title="Theme Fit"
          text="Treat the score as Stability. Higher stability can later improve survival odds in the wrong-hole phase."
        />
      </section>

      <style jsx>{`
        @keyframes floatUp {
          0% {
            opacity: 0;
            transform: translateY(0px) scale(0.9);
          }
          20% {
            opacity: 1;
            transform: translateY(-8px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-34px) scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center gap-2 text-fuchsia-200">{icon}</div>
      <div className="mt-2 text-[10px] uppercase tracking-[0.22em] text-white/45">
        {label}
      </div>
      <div className="mt-1 text-lg font-black text-white">{value}</div>
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="text-[10px] uppercase tracking-[0.22em] text-white/45">
        {label}
      </div>
      <div className="mt-1 text-lg font-black text-white">{value}</div>
    </div>
  );
}

function InfoPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
      <div className="text-xs uppercase tracking-[0.28em] text-fuchsia-300/70">
        {title}
      </div>
      <div className="mt-3 text-sm leading-7 text-white/62">{text}</div>
    </div>
  );
}

function CenteredOverlay({
  title,
  subtitle,
  accent,
}: {
  title: string;
  subtitle: string;
  accent: string;
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-black/55 p-6 text-center backdrop-blur-xl">
        <div className={`text-[11px] uppercase tracking-[0.3em] ${accent}`}>
          Stability Protocol
        </div>
        <div className="mt-3 text-3xl font-black text-white md:text-4xl">
          {title}
        </div>
        <div className="mt-3 text-sm leading-7 text-white/60">{subtitle}</div>
      </div>
    </div>
  );
}

function GuideItem({
  kind,
  title,
  text,
}: {
  kind: OrbKind;
  title: string;
  text: string;
}) {
  const visual = getOrbVisual(kind);
  const Icon = visual.icon;

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className={`relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center border ${visual.shell} ${visual.shape}`}>
        <div className={`absolute inset-[18%] bg-gradient-to-br ${visual.core} ${visual.shape}`} />
        <div className="relative z-10 flex items-center justify-center">
          {Icon ? (
            <Icon
              className={`h-4 w-4 ${visual.iconClass} ${
                kind === "focus_drop" ? "-rotate-45" : ""
              }`}
              strokeWidth={2.4}
            />
          ) : (
            <div className="h-2.5 w-2.5 rounded-full bg-white/80" />
          )}
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="mt-1 text-xs leading-5 text-white/60">{text}</div>
      </div>
    </div>
  );
}