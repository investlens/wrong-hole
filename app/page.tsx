"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Volume2, VolumeX, ArrowRight } from "lucide-react";

type Particle = {
  id: number;
  left: string;
  top: string;
  delay: string;
  duration: string;
  size: string;
};

const PARTICLES: Particle[] = Array.from({ length: 18 }).map((_, i) => ({
  id: i,
  left: `${5 + ((i * 13) % 90)}%`,
  top: `${8 + ((i * 17) % 84)}%`,
  delay: `${(i % 7) * 0.6}s`,
  duration: `${7 + (i % 6)}s`,
  size: `${6 + (i % 5) * 4}px`,
}));

export default function HomePage() {
  const [glowTick, setGlowTick] = useState(0);
  const [soundOn, setSoundOn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [cursor, setCursor] = useState({ x: 50, y: 35 });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlowTick((v) => (v + 1) % 1000);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setCursor({ x, y });
    }

    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!audioRef.current) {
      audioRef.current = new Audio("/audio/theme.mp3");
      audioRef.current.loop = true;
      audioRef.current.volume = 0.35;
    }

    if (soundOn) {
      audioRef.current.play().catch(() => {
        setSoundOn(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [soundOn, mounted]);

  const backgroundStyle = useMemo(() => {
    const a = 0.16 + Math.sin(glowTick / 22) * 0.05;
    const b = 0.14 + Math.cos(glowTick / 18) * 0.05;
    const c = 0.08 + Math.sin(glowTick / 30) * 0.03;

    return {
      background: `
        radial-gradient(circle at 50% 18%, rgba(244,114,182,${a}), transparent 30%),
        radial-gradient(circle at 50% 82%, rgba(168,85,247,${b}), transparent 34%),
        radial-gradient(circle at ${cursor.x}% ${cursor.y}%, rgba(255,255,255,${c}), transparent 18%)
      `,
    };
  }, [glowTick, cursor]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 transition-all duration-500" style={backgroundStyle} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_22%)]" />
        <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
      </div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {PARTICLES.map((p) => (
          <span
            key={p.id}
            className="absolute rounded-full bg-white/20 blur-[1px] animate-homeFloat"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        ))}
      </div>

      <header className="relative z-20 flex items-center justify-between px-5 py-5 md:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative h-10 w-10 rounded-full border border-pink-300/30 bg-white/5">
            <div className="absolute inset-2 rounded-full bg-pink-400/25 blur-md" />
            <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-[0.18em] text-pink-300">
              WRONG HOLE
            </div>
            <div className="text-[10px] uppercase tracking-[0.26em] text-white/35">
              Early Access
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundOn((v) => !v)}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10"
          >
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {soundOn ? "Sound On" : "Sound Off"}
          </button>

          <Link
            href="/app"
            className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 md:inline-flex"
          >
            Open App
          </Link>
        </div>
      </header>

      <section className="relative z-10 flex min-h-[82vh] items-center px-5 pb-16 pt-8 md:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-pink-300/20 bg-pink-400/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-pink-200/80">
              Live now
            </div>

            <h1 className="mt-6 text-5xl font-black leading-none tracking-tight sm:text-6xl md:text-7xl xl:text-[92px]">
              Wrong
              <span className="block bg-gradient-to-r from-white via-pink-200 to-fuchsia-300 bg-clip-text text-transparent">
                Hole
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/62 sm:text-lg lg:mx-0 lg:max-w-xl">
              Pick wisely. Miss badly. Chase the streak. Build your edge early
              before the token goes live.
            </p>

            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row lg:items-start">
              <Link
                href="/play"
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-8 py-4 text-lg font-semibold text-white transition hover:scale-[1.03] hover:from-fuchsia-400 hover:to-pink-400"
              >
                Enter the Arena
                <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
              </Link>

              <Link
                href="/app/mine"
                className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-8 py-4 text-lg text-white/78 transition hover:bg-white/10"
              >
                Explore Lab
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3 sm:max-w-lg">
              <HeroStat label="Mode" value="Free + Growth" />
              <HeroStat label="Token" value="Pre-launch" />
              <HeroStat label="Hook" value="Play to build" />
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute inset-0 rounded-[34px] bg-gradient-to-br from-pink-500/10 via-fuchsia-400/10 to-purple-500/10 blur-2xl" />

            <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/5 p-4 backdrop-blur-xl sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.28em] text-pink-300/70">
                    Live Round Preview
                  </div>
                  <div className="mt-1 text-lg font-bold">Pressure picks up fast</div>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                  10 players
                </div>
              </div>

              <div className="relative rounded-[28px] border border-white/10 bg-black/40 p-4">
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <MiniPanel title="Pool" value="10 SUI" />
                  <MiniPanel title="Winner" value="1" />
                </div>

                <div className="relative h-[310px] rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.16),transparent_32%),radial-gradient(circle_at_bottom,rgba(168,85,247,0.14),transparent_32%)]">
                  <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-red-300/20 bg-red-400/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-red-200">
                    Clutch mode
                  </div>

                  {[
                    { left: "18%", top: "24%", size: "58px", label: "?" },
                    { left: "48%", top: "18%", size: "64px", label: "♥" },
                    { left: "75%", top: "26%", size: "56px", label: "!" },
                    { left: "23%", top: "58%", size: "60px", label: "×" },
                    { left: "52%", top: "54%", size: "68px", label: "♥" },
                    { left: "77%", top: "64%", size: "54px", label: "?" },
                  ].map((orb, i) => (
                    <div
                      key={i}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border ${
                        orb.label === "♥"
                          ? "border-pink-300/60 bg-pink-400/20 shadow-[0_0_22px_rgba(244,114,182,0.38)]"
                          : orb.label === "!"
                          ? "border-red-300/40 bg-red-400/10"
                          : orb.label === "×"
                          ? "border-slate-300/25 bg-slate-400/10"
                          : "border-fuchsia-300/30 bg-fuchsia-400/10"
                      } animate-homePulse`}
                      style={{
                        left: orb.left,
                        top: orb.top,
                        width: orb.size,
                        height: orb.size,
                        animationDelay: `${i * 0.15}s`,
                      }}
                    >
                      <div className="absolute inset-[18%] flex items-center justify-center rounded-full bg-black/70 text-lg font-black text-white/85">
                        {orb.label}
                      </div>
                    </div>
                  ))}

                  <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/75">
                    Tap at the right moment. Build points now. Go live stronger later.
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <MiniPanel title="Fast rounds" value="20s" />
                <MiniPanel title="Replay loop" value="Instant" />
                <MiniPanel title="Early edge" value="Active" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 px-5 pb-16 md:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl md:grid-cols-3 md:p-8">
          <FeatureBlock
            index="01"
            title="Play free now"
            text="Build SPRM Points, test your reactions, and grow your position before token launch."
          />
          <FeatureBlock
            index="02"
            title="Upgrade the Lab"
            text="Turn runs into room growth, passive output, and stronger progression over time."
          />
          <FeatureBlock
            index="03"
            title="Go live later"
            text="Bridge your early progress into the token phase once the live economy is ready."
          />
        </div>
      </section>

      <section className="relative z-10 px-5 pb-24 md:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="text-xs uppercase tracking-[0.35em] text-purple-300/65">
            Early access
          </div>
          <h2 className="mt-4 text-3xl font-black md:text-5xl">
            Earn now. Build now.
            <span className="block text-white/70">Claim later.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/60 md:text-lg">
            The current system is live as a playable economy. Your progress, room
            strength, and earned value give you a stronger position before the next phase.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/play"
              className="rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-10 py-4 text-lg font-semibold text-white transition hover:scale-[1.03] hover:from-fuchsia-400 hover:to-pink-400"
            >
              Play Now
            </Link>
            <Link
              href="/app/rewards"
              className="rounded-2xl border border-white/15 bg-white/5 px-10 py-4 text-lg text-white/78 transition hover:bg-white/10"
            >
              View Rewards
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-white/45 md:flex-row">
          <div>Wrong Hole · Early Access</div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/play" className="transition hover:text-white">
              Play
            </Link>
            <Link href="/app/mine" className="transition hover:text-white">
              Lab
            </Link>
            <Link href="/app/rewards" className="transition hover:text-white">
              Rewards
            </Link>
            <Link href="/app/wallet" className="transition hover:text-white">
              Wallet
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left backdrop-blur">
      <div className="text-[10px] uppercase tracking-[0.24em] text-white/40">{label}</div>
      <div className="mt-1 text-sm font-bold text-white sm:text-base">{value}</div>
    </div>
  );
}

function MiniPanel({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="text-[10px] uppercase tracking-[0.24em] text-white/40">{title}</div>
      <div className="mt-1 text-sm font-bold text-white sm:text-base">{value}</div>
    </div>
  );
}

function FeatureBlock({
  index,
  title,
  text,
}: {
  index: string;
  title: string;
  text: string;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.3em] text-pink-300/65">{index}</div>
      <div className="mt-3 text-xl font-bold">{title}</div>
      <div className="mt-3 text-sm leading-7 text-white/60">{text}</div>
    </div>
  );
}