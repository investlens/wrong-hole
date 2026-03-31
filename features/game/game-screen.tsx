"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type HoleType = "correct" | "danger" | "fake" | "dead";
type BonusType = "sprm" | "time" | "combo";

type Hole = {
  id: number;
  top: number;
  left: number;
  targetTop: number;
  targetLeft: number;
  type: HoleType;
  size: number;
};

type FloatingText = {
  id: number;
  x: number;
  y: number;
  text: string;
};

const GAME_WIDTH = 300;
const GAME_HEIGHT = 420;
const TOTAL_HOLES = 5;
const ROUND_TIME = 20;

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getMultiplier(combo: number) {
  if (combo >= 12) return 5;
  if (combo >= 8) return 4;
  if (combo >= 5) return 3;
  if (combo >= 3) return 2;
  return 1;
}

function getComboTitle(combo: number) {
  if (combo >= 12) return "Perfect Run 😏";
  if (combo >= 8) return "Dangerously Smooth";
  if (combo >= 5) return "Locked In";
  if (combo >= 3) return "Getting Lucky";
  if (combo >= 1) return "Warming Up";
  return "Fresh Start";
}

function getFailMessage(type: HoleType) {
  if (type === "danger") return "Wrong hole 💀";
  if (type === "fake") return "Too tempting. Bad choice.";
  if (type === "dead") return "That was never the one.";
  return "Run over.";
}

function getHoleClasses(type: HoleType) {
  if (type === "correct") {
    return "border-pink-300/70 bg-pink-400/20 shadow-[0_0_28px_rgba(244,114,182,0.45)]";
  }

  if (type === "fake") {
    return "border-fuchsia-300/30 bg-fuchsia-400/10 shadow-[0_0_18px_rgba(217,70,239,0.18)]";
  }

  if (type === "dead") {
    return "border-slate-400/20 bg-slate-500/10 shadow-[0_0_12px_rgba(148,163,184,0.12)]";
  }

  return "border-red-300/30 bg-red-400/10 shadow-[0_0_18px_rgba(248,113,113,0.18)]";
}

function getHoleLabel(type: HoleType) {
  if (type === "correct") return "♥";
  if (type === "fake") return "?";
  if (type === "dead") return "×";
  return "!";
}

function getLevelFromScore(score: number) {
  return Math.min(10, 1 + Math.floor(score / 60));
}

function getTimeBonus(combo: number) {
  if (combo >= 9) return 4;
  if (combo >= 6) return 3;
  if (combo >= 3) return 2;
  return 1;
}

function createHoles(level: number): Hole[] {
  const correctIndex = randomBetween(0, TOTAL_HOLES - 1);
  const minSize = Math.max(38, 54 - level * 2);
  const maxSize = Math.max(46, 64 - level * 2);

  return Array.from({ length: TOTAL_HOLES }).map((_, index) => {
    let type: HoleType = "danger";

    if (index === correctIndex) {
      type = "correct";
    } else {
      const trapPool: HoleType[] =
        level <= 2
          ? ["danger", "dead", "danger"]
          : level <= 4
          ? ["danger", "fake", "dead"]
          : ["danger", "fake", "dead", "fake"];

      type = trapPool[randomBetween(0, trapPool.length - 1)];
    }

    const size =
      type === "correct"
        ? randomBetween(minSize, maxSize)
        : randomBetween(minSize + 2, maxSize + 8);

    const top = randomBetween(36, GAME_HEIGHT - 100);
    const left = randomBetween(16, GAME_WIDTH - 84);

    return {
      id: index,
      top,
      left,
      targetTop: top,
      targetLeft: left,
      type,
      size,
    };
  });
}

type GameScreenProps = {
  onRunComplete?: (result: {
    score: number;
    shownEarned: number;
    level: number;
  }) => void;
};

export default function GameScreen({ onRunComplete }: GameScreenProps) {
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [holes, setHoles] = useState<Hole[]>(createHoles(1));
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [shownEarned, setShownEarned] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [message, setMessage] = useState("Tap play and hit the right one.");
  const [pulse, setPulse] = useState<"idle" | "hit" | "miss" | "levelup">("idle");
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [bestScore, setBestScore] = useState(0);
  const [highestLevel, setHighestLevel] = useState(1);
  const [totalRuns, setTotalRuns] = useState(0);
  const [lastResult, setLastResult] = useState("");
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showEndSplash, setShowEndSplash] = useState(false);
  const [bonus, setBonus] = useState<{
    x: number;
    y: number;
    type: BonusType;
    id: number;
  } | null>(null);

  const floatIdRef = useRef(0);

  const multiplier = useMemo(() => getMultiplier(combo), [combo]);
  const comboTitle = useMemo(() => getComboTitle(combo), [combo]);
  const level = useMemo(() => getLevelFromScore(score), [score]);

  const boardTheme = useMemo(() => {
    if (level <= 2) {
      return "bg-[radial-gradient(circle_at_top,rgba(217,70,239,0.16),transparent_30%),radial-gradient(circle_at_bottom,rgba(244,114,182,0.12),transparent_30%)]";
    }
    if (level <= 4) {
      return "bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.22),transparent_30%),radial-gradient(circle_at_bottom,rgba(168,85,247,0.18),transparent_30%)]";
    }
    if (level <= 6) {
      return "bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.24),transparent_25%),radial-gradient(circle_at_bottom,rgba(251,191,36,0.14),transparent_30%)]";
    }
    if (level <= 8) {
      return "bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.20),transparent_25%),radial-gradient(circle_at_bottom,rgba(244,63,94,0.18),transparent_30%)]";
    }
    return "bg-[radial-gradient(circle_at_top,rgba(244,63,94,0.24),transparent_25%),radial-gradient(circle_at_bottom,rgba(217,70,239,0.20),transparent_30%)]";
  }, [level]);

  const clutchMode = timeLeft <= 5 && started && !gameOver;

  useEffect(() => {
    const savedBest = Number(localStorage.getItem("wh_best_score") || 0);
    const savedLevel = Number(localStorage.getItem("wh_highest_level") || 1);
    const savedRuns = Number(localStorage.getItem("wh_total_runs") || 0);

    setBestScore(savedBest);
    setHighestLevel(savedLevel);
    setTotalRuns(savedRuns);
  }, []);

  useEffect(() => {
    if (!started || gameOver) return;

    const interval = setInterval(() => {
      const types: BonusType[] = ["sprm", "time", "combo"];

      setBonus({
        id: Math.random(),
        x: randomBetween(16, GAME_WIDTH - 76),
        y: randomBetween(36, GAME_HEIGHT - 110),
        type: types[randomBetween(0, types.length - 1)],
      });

      setTimeout(() => setBonus(null), 1000);
    }, randomBetween(1500, 3000));

    return () => clearInterval(interval);
  }, [started, gameOver]);

  useEffect(() => {
    if (!started || gameOver) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          finishRun("Time’s up. Run it back.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [started, gameOver, score, level, shownEarned, totalRuns, bestScore, highestLevel]);

  useEffect(() => {
    if (!started || gameOver) return;

    const baseSpeed = Math.max(1400 - level * 60, 700);
    const speed = baseSpeed + randomBetween(-80, 80);

    const moveTargets = setInterval(() => {
      setHoles(createHoles(level));
    }, speed);

    return () => clearInterval(moveTargets);
  }, [started, gameOver, combo, level]);

  useEffect(() => {
    if (!started || gameOver) return;

    const drift = setInterval(() => {
      setHoles((prev) =>
        prev.map((hole) => {
          const driftAmount = Math.min(6 + level, 12);

          const nextTop = Math.max(
            18,
            Math.min(
              GAME_HEIGHT - 90,
              hole.top + randomBetween(-driftAmount, driftAmount)
            )
          );

          const nextLeft = Math.max(
            8,
            Math.min(
              GAME_WIDTH - 72,
              hole.left + randomBetween(-driftAmount, driftAmount)
            )
          );

          return {
            ...hole,
            top: nextTop,
            left: nextLeft,
          };
        })
      );
    }, 300);

    return () => clearInterval(drift);
  }, [started, gameOver, level]);

  useEffect(() => {
    if (pulse === "idle") return;

    const timeout = setTimeout(() => {
      setPulse("idle");
    }, 220);

    return () => clearTimeout(timeout);
  }, [pulse]);

  useEffect(() => {
    if (!showLevelUp) return;

    const timeout = setTimeout(() => {
      setShowLevelUp(false);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [showLevelUp]);

  function pushFloatingText(text: string, x: number, y: number) {
    const id = ++floatIdRef.current;
    setFloatingTexts((prev) => [...prev, { id, text, x, y }]);

    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((item) => item.id !== id));
    }, 900);
  }

  function finishRun(endMessage: string) {
    setGameOver(true);
    setStarted(false);
    setMessage(endMessage);
    setLastResult(`Final score ${score} · Level ${level} · ${shownEarned} SPRM shown`);
    setShowEndSplash(true);

    const newRuns = totalRuns + 1;
    setTotalRuns(newRuns);
    localStorage.setItem("wh_total_runs", String(newRuns));

    if (score > bestScore) {
      setBestScore(score);
      localStorage.setItem("wh_best_score", String(score));
    }

    if (level > highestLevel) {
      setHighestLevel(level);
      localStorage.setItem("wh_highest_level", String(level));
    }

    if (onRunComplete) {
      onRunComplete({
        score,
        shownEarned: Math.floor(shownEarned),
        level,
      });
    }
  }

  function startGame() {
    setStarted(true);
    setGameOver(false);
    setScore(0);
    setCombo(0);
    setShownEarned(0);
    setTimeLeft(ROUND_TIME);
    setHoles(createHoles(1));
    setMessage("Go. Don’t miss.");
    setPulse("idle");
    setLastResult("");
    setShowLevelUp(false);
    setFloatingTexts([]);
    setShowEndSplash(false);
    setBonus(null);
  }

  function onBonusClick() {
    if (!bonus) return;

    if (bonus.type === "sprm") {
      setShownEarned((prev) => prev + 20);
      pushFloatingText("+20 SPRM", bonus.x, bonus.y);
    }

    if (bonus.type === "time") {
      setTimeLeft((prev) => Math.min(prev + 4, 30));
      pushFloatingText("+4s", bonus.x, bonus.y);
    }

    if (bonus.type === "combo") {
      setCombo((prev) => prev + 3);
      pushFloatingText("Combo +3", bonus.x, bonus.y);
    }

    setBonus(null);
  }

  function onHoleClick(hole: Hole) {
    if (!started || gameOver) return;

    if (hole.type !== "correct") {
      setPulse("miss");
      finishRun(getFailMessage(hole.type));
      return;
    }

    const prevLevel = getLevelFromScore(score);
    const nextCombo = combo + 1;
    const nextMultiplier = getMultiplier(nextCombo);
    const gainedScore = 10 * nextMultiplier;
    const nextScore = score + gainedScore;
    const nextLevel = getLevelFromScore(nextScore);
    const earned = 5 * nextMultiplier;
    const timeBonus = getTimeBonus(nextCombo);

    setCombo(nextCombo);
    setScore(nextScore);
    setShownEarned((prev) => prev + earned);
    setTimeLeft((prev) => Math.min(prev + timeBonus, 30));
    setMessage(nextCombo >= 5 ? "Clean streak 😏" : "Nice hit.");
    setHoles(createHoles(nextLevel));
    setPulse("hit");

    pushFloatingText(`+${earned} SPRM · +${timeBonus}s`, hole.left, hole.top);

    if (nextLevel > prevLevel) {
      setShowLevelUp(true);
      setPulse("levelup");
      setMessage(`Level ${nextLevel} unlocked 🔥`);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:rounded-3xl md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black md:text-2xl">Wrong Hole</h2>
            <p className="mt-1 text-sm text-white/60">
              Tap the inviting one. The others are trouble.
            </p>
          </div>

          <button
            onClick={startGame}
            className="rounded-2xl bg-fuchsia-500 px-4 py-3 font-semibold text-white transition hover:bg-fuchsia-400 md:px-5"
          >
            {gameOver || !started ? "Play / Restart" : "Playing"}
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatBox label="Score" value={String(score)} />
          <StatBox label="Combo" value={`x${multiplier}`} />
          <StatBox label="Shown Earned" value={`${shownEarned} SPRM`} />
          <StatBox label="Time" value={`${timeLeft}s`} />
          <StatBox label="Level" value={String(level)} />
        </div>

        <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="text-xs uppercase tracking-[0.25em] text-pink-300/70">
            Current Mood
          </div>
          <div className="mt-2 text-base font-bold md:text-lg">{comboTitle}</div>
        </div>

        <div className="overflow-x-auto">
          <div
            className={`relative mx-auto overflow-hidden rounded-[24px] border border-white/10 bg-neutral-900 transition-all duration-150 ${
              pulse === "hit"
                ? "scale-[1.01] shadow-[0_0_30px_rgba(244,114,182,0.18)]"
                : pulse === "miss"
                ? "-translate-x-1 scale-[0.99] shadow-[0_0_30px_rgba(248,113,113,0.16)]"
                : pulse === "levelup"
                ? "scale-[1.015] shadow-[0_0_36px_rgba(251,191,36,0.20)]"
                : ""
            } ${clutchMode ? "ring-2 ring-red-400/40 shadow-[0_0_40px_rgba(248,113,113,0.18)]" : ""}`}
            style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
          >
            {bonus && (
              <button
                onClick={onBonusClick}
                className="absolute z-30 animate-bonus"
                style={{
                  left: bonus.x,
                  top: bonus.y,
                }}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 via-fuchsia-400 to-pink-500 text-xl shadow-[0_0_30px_rgba(244,114,182,0.7)] animate-pulse sm:h-16 sm:w-16 sm:text-2xl">
                  {bonus.type === "sprm" && "🎀"}
                  {bonus.type === "time" && "👙"}
                  {bonus.type === "combo" && "🧸"}
                </div>
              </button>
            )}

            {showEndSplash && (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="relative flex items-center justify-center">
                  <div className="absolute h-52 w-52 animate-splash rounded-full bg-gradient-to-br from-pink-400/40 via-white/20 to-fuchsia-500/30 blur-2xl sm:h-64 sm:w-64" />

                  <div className="relative flex h-40 w-40 items-center justify-center rounded-full border border-white/20 bg-white/10 shadow-[0_0_60px_rgba(244,114,182,0.25)] backdrop-blur-xl sm:h-48 sm:w-48">
                    <div className="px-3 text-center">
                      <div className="text-[10px] uppercase tracking-[0.3em] text-white/50 sm:text-xs">
                        Final Score
                      </div>
                      <div className="mt-2 text-3xl font-black text-white sm:text-4xl">
                        {score}
                      </div>
                      <div className="mt-2 text-xs text-white/60 sm:text-sm">
                        Level {level} · {shownEarned} SPRM
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-6 flex flex-col gap-3 sm:bottom-10 sm:flex-row sm:gap-4">
                  <button
                    onClick={startGame}
                    className="rounded-2xl bg-fuchsia-500 px-5 py-3 font-semibold text-white hover:bg-fuchsia-400 sm:px-6"
                  >
                    Run it back
                  </button>

                  <button
                    onClick={() => setShowEndSplash(false)}
                    className="rounded-2xl border border-white/20 px-5 py-3 text-white/80 hover:bg-white/10 sm:px-6"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            <div className={`absolute inset-0 ${boardTheme}`} />

            {showLevelUp && (
              <div className="absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-full border border-amber-300/30 bg-amber-400/15 px-4 py-2 text-xs font-bold text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.15)] sm:top-6 sm:px-5 sm:text-sm">
                Level Up · {level}
              </div>
            )}

            {clutchMode && (
              <div className="absolute left-1/2 top-16 z-30 -translate-x-1/2 rounded-full border border-red-300/30 bg-red-400/15 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.25em] text-red-200 shadow-[0_0_18px_rgba(248,113,113,0.16)] sm:top-20 sm:px-4 sm:text-xs">
                Clutch Mode
              </div>
            )}

            {!started && !showEndSplash && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/45 px-4 text-center backdrop-blur-sm">
                <h3 className="text-2xl font-black sm:text-3xl">
                  {gameOver ? "Run Over" : "Ready?"}
                </h3>
                <p className="mt-3 max-w-xs text-sm text-white/65">{message}</p>
                {lastResult ? (
                  <p className="mt-2 max-w-xs text-xs text-white/45">{lastResult}</p>
                ) : null}
              </div>
            )}

            {holes.map((hole) => (
              <button
                key={`${hole.id}-${hole.top}-${hole.left}-${hole.size}`}
                onClick={() => onHoleClick(hole)}
                className={`absolute rounded-full border transition-all duration-300 ease-out hover:scale-105 ${getHoleClasses(
                  hole.type
                )}`}
                style={{
                  top: `${hole.top}px`,
                  left: `${hole.left}px`,
                  width: `${hole.size}px`,
                  height: `${hole.size}px`,
                }}
              >
                <div className="relative mx-auto mt-1 flex h-[70%] w-[70%] items-center justify-center rounded-full bg-black/75 text-base font-black text-white/80 sm:text-lg">
                  {getHoleLabel(hole.type)}
                </div>

                {hole.type === "correct" && (
                  <div className="absolute -inset-1 rounded-full border border-pink-300/30 animate-pulse" />
                )}
              </button>
            ))}

            {floatingTexts.map((item) => (
              <div
                key={item.id}
                className="pointer-events-none absolute z-30 animate-[floatUp_0.9s_ease-out_forwards] text-xs font-bold text-emerald-300 sm:text-sm"
                style={{ left: item.x, top: item.y }}
              >
                {item.text}
              </div>
            ))}

            <div className="absolute bottom-3 left-3 right-3 rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-xs text-white/80 backdrop-blur sm:text-sm">
              {message}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Panel title="Session Stats" color="text-fuchsia-300/70">
          <div className="space-y-3 text-sm text-white/70">
            <div className="flex justify-between">
              <span>Best Score</span>
              <span className="font-bold text-white">{bestScore}</span>
            </div>
            <div className="flex justify-between">
              <span>Highest Level</span>
              <span className="font-bold text-white">{highestLevel}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Runs</span>
              <span className="font-bold text-white">{totalRuns}</span>
            </div>
          </div>
        </Panel>

        <Panel title="Why This Hooks" color="text-emerald-300/70">
          <div className="space-y-3 text-sm text-white/70">
            <div>• Visible score and reward growth</div>
            <div>• Pressure rises with level</div>
            <div>• Fast loss, fast retry</div>
            <div>• Best score chase</div>
            <div>• Level-up dopamine</div>
          </div>
        </Panel>

        <Panel title="Hole Guide" color="text-pink-300/70">
          <div className="space-y-3 text-sm text-white/70">
            <div>
              <span className="font-bold text-pink-300">♥</span> inviting target
            </div>
            <div>
              <span className="font-bold text-red-300">!</span> obvious danger
            </div>
            <div>
              <span className="font-bold text-fuchsia-300">?</span> tempting fake-out
            </div>
            <div>
              <span className="font-bold text-slate-300">×</span> dead zone
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 md:p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/45 md:text-xs">
        {label}
      </div>
      <div className="mt-2 text-base font-black md:text-xl">{value}</div>
    </div>
  );
}

function Panel({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:rounded-3xl md:p-5">
      <div className={`text-xs uppercase tracking-[0.25em] md:text-sm ${color}`}>{title}</div>
      <div className="mt-4">{children}</div>
    </div>
  );
}