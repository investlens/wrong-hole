"use client";

import { useEffect, useMemo, useState } from "react";

type ZoneId =
  | "bed"
  | "mirror"
  | "chair"
  | "toy"
  | "lights"
  | "music";

type RoomItemDef = {
  id: ZoneId;
  name: string;
  icon: string;
  description: string;
  vibe: string;
  zoneLabel: string;
  unlockCost: number;
  baseOutput: number;
  maxLevel: number;
};

type OwnedRoomItem = {
  owned: boolean;
  level: number;
};

type RoomState = Record<ZoneId, OwnedRoomItem>;

type ActiveBoost = {
  multiplier: number;
  expiresAt: number;
};

const STARTING_BALANCE = 400;

const ITEM_DEFS: RoomItemDef[] = [
  {
    id: "bed",
    name: "Soft Bed",
    icon: "🛏️",
    description:
      "The center of the room. Stable, reliable output with the strongest visual progression.",
    vibe: "Comfort core",
    zoneLabel: "Center Stage",
    unlockCost: 50,
    baseOutput: 10,
    maxLevel: 5,
  },
  {
    id: "mirror",
    name: "Neon Mirror",
    icon: "🪞",
    description:
      "Reflects the room mood and adds sharp visual presence to the wall.",
    vibe: "Glow reflection",
    zoneLabel: "Left Wall",
    unlockCost: 70,
    baseOutput: 12,
    maxLevel: 5,
  },
  {
    id: "chair",
    name: "Pulse Chair",
    icon: "💺",
    description:
      "Premium seating with stronger side pressure and upscale room energy.",
    vibe: "Pressure point",
    zoneLabel: "Right Side",
    unlockCost: 90,
    baseOutput: 15,
    maxLevel: 5,
  },
  {
    id: "toy",
    name: "Rhythm Toy",
    icon: "🧸",
    description: "Small, playful, and easy to scale. Great early room filler.",
    vibe: "Playful boost",
    zoneLabel: "Floor Corner",
    unlockCost: 40,
    baseOutput: 8,
    maxLevel: 5,
  },
  {
    id: "lights",
    name: "Mood Lights",
    icon: "💡",
    description: "Brightens the room and improves the whole atmosphere.",
    vibe: "Atmosphere bonus",
    zoneLabel: "Ceiling Glow",
    unlockCost: 65,
    baseOutput: 9,
    maxLevel: 5,
  },
  {
    id: "music",
    name: "Sound System",
    icon: "🔊",
    description: "Sets rhythm and gives the room a more active, premium edge.",
    vibe: "Tempo control",
    zoneLabel: "Back Corner",
    unlockCost: 80,
    baseOutput: 11,
    maxLevel: 5,
  },
];

function createInitialRoomState(): RoomState {
  return {
    bed: { owned: false, level: 0 },
    mirror: { owned: false, level: 0 },
    chair: { owned: false, level: 0 },
    toy: { owned: false, level: 0 },
    lights: { owned: false, level: 0 },
    music: { owned: false, level: 0 },
  };
}

function getItemDef(id: ZoneId) {
  const item = ITEM_DEFS.find((x) => x.id === id);
  if (!item) throw new Error(`Unknown item: ${id}`);
  return item;
}

function getItemOutput(def: RoomItemDef, owned: OwnedRoomItem) {
  if (!owned.owned || owned.level === 0) return 0;
  return def.baseOutput * owned.level;
}

function getUpgradeCost(def: RoomItemDef, level: number) {
  return Math.floor(def.unlockCost * Math.pow(1.9, level));
}

function zonePosition(id: ZoneId) {
  switch (id) {
    case "bed":
      return "left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2";
    case "mirror":
      return "left-[14%] top-[30%] -translate-x-1/2 -translate-y-1/2";
    case "chair":
      return "right-[10%] top-[58%] translate-x-1/2 -translate-y-1/2";
    case "toy":
      return "left-[25%] bottom-[10%] -translate-x-1/2 translate-y-1/2";
    case "lights":
      return "left-1/2 top-[12%] -translate-x-1/2 -translate-y-1/2";
    case "music":
      return "right-[14%] bottom-[14%] translate-x-1/2 translate-y-1/2";
    default:
      return "";
  }
}

function getLevelVisual(level: number) {
  if (level >= 5) {
    return {
      tile: "border-pink-300/60 bg-gradient-to-br from-pink-400/30 via-fuchsia-400/25 to-purple-500/35 shadow-[0_0_40px_rgba(244,114,182,0.42)]",
      iconSize: "text-4xl sm:text-5xl",
      badge: "bg-gradient-to-r from-amber-300 via-pink-300 to-fuchsia-400 text-black",
      ring: true,
      sparkles: 4,
      scale: "scale-105 sm:scale-110",
    };
  }
  if (level === 4) {
    return {
      tile: "border-pink-300/50 bg-gradient-to-br from-pink-400/24 via-fuchsia-400/18 to-purple-500/20 shadow-[0_0_30px_rgba(244,114,182,0.34)]",
      iconSize: "text-4xl sm:text-5xl",
      badge: "bg-pink-300 text-black",
      ring: true,
      sparkles: 3,
      scale: "scale-105",
    };
  }
  if (level === 3) {
    return {
      tile: "border-pink-300/40 bg-pink-400/18 shadow-[0_0_22px_rgba(244,114,182,0.26)]",
      iconSize: "text-3xl sm:text-4xl",
      badge: "bg-fuchsia-300 text-black",
      ring: false,
      sparkles: 2,
      scale: "scale-100",
    };
  }
  if (level === 2) {
    return {
      tile: "border-pink-300/25 bg-pink-400/10 shadow-[0_0_12px_rgba(244,114,182,0.18)]",
      iconSize: "text-3xl sm:text-4xl",
      badge: "bg-white/80 text-black",
      ring: false,
      sparkles: 1,
      scale: "scale-100",
    };
  }
  return {
    tile: "border-white/10 bg-white/5",
    iconSize: "text-2xl sm:text-3xl",
    badge: "bg-white/15 text-white",
    ring: false,
    sparkles: 0,
    scale: "scale-100",
  };
}

function getNextActionText(def: RoomItemDef, owned: OwnedRoomItem, balance: number) {
  if (!owned.owned) {
    return {
      label: `Unlock · ${def.unlockCost} SPRM`,
      disabled: balance < def.unlockCost,
    };
  }

  if (owned.level >= def.maxLevel) {
    return {
      label: "Maxed",
      disabled: true,
    };
  }

  const cost = getUpgradeCost(def, owned.level);
  return {
    label: `Upgrade · ${cost} SPRM`,
    disabled: balance < cost,
  };
}

function Sparkles({ count }: { count: number }) {
  if (count <= 0) return null;

  const points = [
    "left-1.5 top-1.5",
    "right-1.5 top-2",
    "left-2 bottom-2",
    "right-2 bottom-1.5",
  ];

  return (
    <>
      {points.slice(0, count).map((p, i) => (
        <div
          key={i}
          className={`absolute ${p} text-[9px] sm:text-[10px] text-pink-200/80 animate-pulse`}
        >
          ✦
        </div>
      ))}
    </>
  );
}

function ZoneDecor({
  id,
  level,
  owned,
}: {
  id: ZoneId;
  level: number;
  owned: boolean;
}) {
  if (!owned) return null;

  if (id === "bed") {
    return (
      <>
        <div
          className={`absolute inset-x-3 bottom-2 h-4 rounded-full bg-pink-400/20 blur-xl ${
            level >= 4 ? "opacity-100" : level >= 2 ? "opacity-70" : "opacity-40"
          }`}
        />
        {level >= 3 && (
          <div className="absolute left-2 right-2 top-2 flex justify-between text-pink-200/80">
            <span className="animate-pulse">✦</span>
            <span className="animate-pulse">✦</span>
          </div>
        )}
      </>
    );
  }

  if (id === "mirror") {
    return (
      <>
        <div
          className={`absolute inset-y-3 left-1/2 w-[2px] -translate-x-1/2 bg-white/20 blur-[1px] ${
            level >= 4 ? "opacity-100" : "opacity-60"
          }`}
        />
        {level >= 3 && (
          <div className="absolute right-2 top-2 text-white/70 animate-pulse">✧</div>
        )}
      </>
    );
  }

  if (id === "chair") {
    return (
      <>
        <div
          className={`absolute bottom-2 left-2 right-2 h-3 rounded-full bg-fuchsia-400/15 blur-lg ${
            level >= 4 ? "opacity-100" : "opacity-60"
          }`}
        />
        {level >= 5 && (
          <div className="absolute inset-y-4 right-2 w-1 rounded-full bg-pink-300/50 blur-sm" />
        )}
      </>
    );
  }

  if (id === "toy") {
    return (
      <>
        <div className={`absolute inset-0 rounded-3xl ${level >= 4 ? "animate-pulse" : ""}`} />
        {level >= 3 && (
          <div className="absolute top-2 right-2 text-pink-200/80 animate-bounce">✦</div>
        )}
      </>
    );
  }

  if (id === "lights") {
    return (
      <>
        <div
          className={`absolute -top-3 left-1/2 h-8 w-16 -translate-x-1/2 rounded-full bg-amber-200/20 blur-2xl ${
            level >= 4 ? "opacity-100" : level >= 2 ? "opacity-70" : "opacity-40"
          }`}
        />
        {level >= 5 && (
          <div className="absolute inset-x-2 -top-1 h-4 rounded-full bg-pink-200/20 blur-xl" />
        )}
      </>
    );
  }

  if (id === "music") {
    return (
      <>
        {level >= 2 && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-pink-200/70">♪</div>
        )}
        {level >= 3 && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-pink-200/70">♫</div>
        )}
        {level >= 5 && (
          <div className="absolute left-1/2 top-2 -translate-x-1/2 text-fuchsia-200/70 animate-pulse">
            ♬
          </div>
        )}
      </>
    );
  }

  return null;
}

export default function LabPage() {
  const [balance, setBalance] = useState(STARTING_BALANCE);
  const [room, setRoom] = useState<RoomState>(createInitialRoomState());
  const [selectedId, setSelectedId] = useState<ZoneId | null>(null);
  const [message, setMessage] = useState(
    "Build the room. Unlock each item once, then upgrade it to make the room stronger."
  );

  const [claimable, setClaimable] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [boost, setBoost] = useState<ActiveBoost | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const savedBalance = localStorage.getItem("wh_lab_balance");
    const savedRoom = localStorage.getItem("wh_room_state");
    const savedClaimable = localStorage.getItem("wh_claimable");
    const savedTime = localStorage.getItem("wh_last_update");
    const savedBoost = localStorage.getItem("wh_boost");

    if (savedBalance) setBalance(Number(savedBalance));
    if (savedRoom) setRoom(JSON.parse(savedRoom));
    if (savedClaimable) setClaimable(Number(savedClaimable));
    if (savedTime) setLastUpdate(Number(savedTime));
    if (savedBoost) setBoost(JSON.parse(savedBoost));
  }, []);

  const totalOutput = useMemo(() => {
    return ITEM_DEFS.reduce((sum, def) => {
      return sum + getItemOutput(def, room[def.id]);
    }, 0);
  }, [room]);

  const ownedCount = useMemo(() => {
    return ITEM_DEFS.filter((def) => room[def.id].owned).length;
  }, [room]);

  const selectedDef = selectedId ? getItemDef(selectedId) : null;
  const selectedOwned = selectedId ? room[selectedId] : null;

  const boostActive = !!boost && boost.expiresAt > now;
  const boostMultiplier = boostActive ? boost!.multiplier : 1;
  const boostedOutput = totalOutput * boostMultiplier;
  const maxStorage = Math.max(boostedOutput * 6, 0);

  useEffect(() => {
    const clock = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());

      setClaimable((prevClaimable) => {
        const currentNow = Date.now();
        const elapsed = currentNow - lastUpdate;
        if (elapsed <= 0) return prevClaimable;

        const currentBoostRaw = localStorage.getItem("wh_boost");
        const currentBoost = currentBoostRaw
          ? (JSON.parse(currentBoostRaw) as ActiveBoost | null)
          : boost;

        const activeMultiplier =
          currentBoost && currentBoost.expiresAt > currentNow
            ? currentBoost.multiplier
            : 1;

        const currentOutputPerHour = totalOutput * activeMultiplier;
        const earned = (currentOutputPerHour * elapsed) / 3600000;
        const capped = Math.min(prevClaimable + earned, currentOutputPerHour * 6);

        localStorage.setItem("wh_last_update", String(currentNow));
        setLastUpdate(currentNow);

        return capped;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [totalOutput, boost, lastUpdate]);

  useEffect(() => {
    localStorage.setItem("wh_lab_balance", String(balance));
  }, [balance]);

  useEffect(() => {
    localStorage.setItem("wh_room_state", JSON.stringify(room));
  }, [room]);

  useEffect(() => {
    localStorage.setItem("wh_claimable", String(claimable));
  }, [claimable]);

  useEffect(() => {
    localStorage.setItem("wh_last_update", String(lastUpdate));
  }, [lastUpdate]);

  useEffect(() => {
    localStorage.setItem("wh_boost", JSON.stringify(boost));
  }, [boost]);

  const roomLightIntensity = useMemo(() => {
    const lightsLevel = room.lights.level;
    const bedLevel = room.bed.level;
    const mirrorLevel = room.mirror.level;

    return Math.min(lightsLevel * 0.18 + bedLevel * 0.08 + mirrorLevel * 0.06, 1);
  }, [room]);

  function handleClaim() {
    if (claimable <= 0) {
      setMessage("Nothing to claim yet. Let the room build more output.");
      return;
    }

    const amount = Math.floor(claimable);
    setBalance((prev) => prev + amount);
    setClaimable(0);
    setMessage(`${amount} SPRM claimed into your lab balance.`);
  }

  function activateBoost() {
    const boostCost = 50;

    if (balance < boostCost) {
      setMessage("Not enough SPRM to activate Overdrive.");
      return;
    }

    const expiresAt = Date.now() + 5 * 60 * 1000;

    setBalance((prev) => prev - boostCost);
    setBoost({
      multiplier: 2,
      expiresAt,
    });
    setMessage("Overdrive active. Output doubled for 5 minutes.");
  }

  function unlockOrUpgrade(id: ZoneId) {
    const def = getItemDef(id);
    const owned = room[id];

    if (!owned.owned) {
      if (balance < def.unlockCost) {
        setMessage("Not enough SPRM. Play more, then come back to upgrade the room.");
        return;
      }

      setRoom((prev) => ({
        ...prev,
        [id]: {
          owned: true,
          level: 1,
        },
      }));
      setBalance((prev) => prev - def.unlockCost);
      setSelectedId(id);
      setMessage(`${def.name} unlocked and placed in the room.`);
      return;
    }

    if (owned.level >= def.maxLevel) {
      setMessage(`${def.name} is already maxed out.`);
      return;
    }

    const cost = getUpgradeCost(def, owned.level);

    if (balance < cost) {
      setMessage("Not enough SPRM for this upgrade.");
      return;
    }

    setRoom((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        level: prev[id].level + 1,
      },
    }));
    setBalance((prev) => prev - cost);
    setSelectedId(id);
    setMessage(`${def.name} upgraded to level ${owned.level + 1}.`);
  }

  function selectItem(id: ZoneId) {
    setSelectedId(id);
    const def = getItemDef(id);
    const owned = room[id];

    if (!owned.owned) {
      setMessage(`${def.name} is available to unlock.`);
    } else {
      setMessage(`${def.name} selected. Upgrade it to boost room output.`);
    }
  }

  const boostSecondsLeft = boostActive
    ? Math.max(0, Math.floor((boost!.expiresAt - now) / 1000))
    : 0;

  return (
    <div className="space-y-5 md:space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">Lab</h1>
        <p className="mt-2 text-sm text-white/60 md:text-base">
          Build a premium room, unlock each item once, upgrade everything, claim passive
          output, and use boosts to accelerate your setup.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard label="Balance" value={`${balance} SPRM`} />
        <StatCard label="Owned Items" value={`${ownedCount} / ${ITEM_DEFS.length}`} />
        <StatCard label="Base Output" value={`${totalOutput} / hr`} />
        <StatCard label="Claimable" value={`${Math.floor(claimable)} SPRM`} />
        <StatCard label="Boost" value={boostActive ? `x${boostMultiplier}` : "Inactive"} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <ActionCard
          title="Claim Output"
          subtitle={`Storage cap: ${Math.floor(maxStorage)} SPRM`}
          value={`${Math.floor(claimable)} SPRM`}
          buttonLabel="Claim"
          onClick={handleClaim}
          disabled={claimable <= 0}
          accent="green"
        />

        <ActionCard
          title="Overdrive"
          subtitle={boostActive ? `Ends in ${boostSecondsLeft}s` : "Doubles output for 5 min"}
          value={boostActive ? "Active" : "50 SPRM"}
          buttonLabel={boostActive ? "Running" : "Boost"}
          onClick={activateBoost}
          disabled={boostActive}
          accent="pink"
        />

        <ActionCard
          title="Storage Status"
          subtitle="Passive output stops at cap"
          value={`${Math.floor((claimable / Math.max(maxStorage || 1, 1)) * 100)}% full`}
          buttonLabel="Passive"
          onClick={() => {}}
          disabled
          accent="neutral"
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70 md:rounded-3xl">
        {message}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 md:rounded-3xl md:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-pink-300/70 md:text-sm">
                Pleasure Room
              </div>
              <div className="mt-1 text-base font-bold md:text-lg">Visual Layout</div>
            </div>
            <div className="text-xs text-white/50 md:text-sm">Tap any zone</div>
          </div>

          <div className="relative mx-auto aspect-[4/3] w-full max-w-3xl overflow-hidden rounded-[20px] border border-white/10 bg-neutral-900 sm:rounded-[24px] md:rounded-[32px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.18),transparent_28%),radial-gradient(circle_at_bottom,rgba(168,85,247,0.18),transparent_30%)]" />

            <div
              className="absolute inset-0 transition-all duration-500"
              style={{
                background: `radial-gradient(circle at 50% 12%, rgba(255,220,180,${
                  0.06 + roomLightIntensity * 0.18
                }), transparent 28%),
                             radial-gradient(circle at 50% 58%, rgba(244,114,182,${
                               0.05 + roomLightIntensity * 0.14
                             }), transparent 24%)`,
              }}
            />

            {boostActive && (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.08),transparent_38%)] animate-pulse" />
            )}

            <div className="absolute inset-x-0 bottom-0 h-[34%] bg-gradient-to-t from-black/50 via-pink-950/10 to-transparent" />
            <div className="absolute inset-x-4 bottom-3 h-[24%] rounded-[20px] border border-white/8 bg-gradient-to-b from-white/5 to-black/25 sm:inset-x-6 sm:bottom-4 sm:rounded-[28px]" />
            <div className="absolute inset-x-0 top-[42%] border-t border-white/6" />

            {ITEM_DEFS.map((def) => {
              const owned = room[def.id];
              const itemOutput = getItemOutput(def, owned);
              const visual = getLevelVisual(owned.level);

              return (
                <button
                  key={def.id}
                  onClick={() => selectItem(def.id)}
                  className={`absolute flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-2xl border transition-all duration-300 hover:scale-105 sm:h-24 sm:w-24 sm:rounded-3xl md:h-28 md:w-28 ${zonePosition(
                    def.id
                  )} ${
                    owned.owned
                      ? `${visual.tile} ${visual.scale}`
                      : "border-dashed border-white/10 bg-black/35 opacity-70 hover:bg-white/5"
                  } ${selectedId === def.id ? "ring-2 ring-pink-300/40" : ""}`}
                >
                  {owned.owned && visual.ring && (
                    <div className="absolute inset-[-4px] rounded-[20px] border border-pink-300/30 animate-pulse sm:inset-[-6px] sm:rounded-[28px]" />
                  )}

                  {owned.owned && <Sparkles count={visual.sparkles} />}
                  <ZoneDecor id={def.id} level={owned.level} owned={owned.owned} />

                  {!owned.owned && (
                    <div className="absolute inset-0 rounded-2xl bg-black/20 backdrop-blur-[1px] sm:rounded-3xl" />
                  )}

                  <div
                    className={`relative z-10 ${
                      owned.owned ? visual.iconSize : "text-2xl sm:text-3xl opacity-45 grayscale"
                    } transition-all duration-300`}
                  >
                    {def.icon}
                  </div>

                  <div className="relative z-10 mt-1 text-center text-[8px] uppercase tracking-[0.16em] text-white/55 sm:text-[10px]">
                    {def.zoneLabel}
                  </div>

                  {owned.owned ? (
                    <>
                      <div
                        className={`relative z-10 mt-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold sm:px-2 sm:text-[10px] ${visual.badge}`}
                      >
                        Lv {owned.level}
                      </div>
                      <div className="relative z-10 mt-1 text-[8px] text-pink-200 sm:text-[10px]">
                        +{itemOutput}/hr
                      </div>
                    </>
                  ) : (
                    <div className="relative z-10 mt-1 text-[8px] text-white/30 sm:text-[10px]">
                      Locked
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:rounded-3xl md:p-5">
            <div className="text-xs uppercase tracking-[0.25em] text-fuchsia-300/70 md:text-sm">
              Selected Zone
            </div>

            {selectedDef && selectedOwned ? (
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`relative flex h-14 w-14 items-center justify-center rounded-2xl border text-2xl sm:h-16 sm:w-16 sm:text-3xl ${
                      selectedOwned.owned
                        ? getLevelVisual(selectedOwned.level).tile
                        : "border-white/10 bg-black/20"
                    }`}
                  >
                    {selectedOwned.owned && (
                      <Sparkles count={Math.min(getLevelVisual(selectedOwned.level).sparkles, 2)} />
                    )}
                    <span
                      className={
                        selectedOwned.owned
                          ? getLevelVisual(selectedOwned.level).iconSize
                          : "opacity-55 grayscale"
                      }
                    >
                      {selectedDef.icon}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="truncate font-bold">{selectedDef.name}</div>
                    <div className="text-sm text-white/55">{selectedDef.zoneLabel}</div>
                    <div className="mt-1 text-xs text-pink-300">{selectedDef.vibe}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
                  <div>{selectedDef.description}</div>

                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between gap-4">
                      <span>Status</span>
                      <span className="text-right font-bold text-white">
                        {selectedOwned.owned ? `Owned · Lv ${selectedOwned.level}` : "Locked"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Current Output</span>
                      <span className="text-right font-bold text-white">
                        {getItemOutput(selectedDef, selectedOwned)} / hr
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Next Action</span>
                      <span className="text-right font-bold text-pink-300">
                        {getNextActionText(selectedDef, selectedOwned, balance).label}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => unlockOrUpgrade(selectedDef.id)}
                  disabled={getNextActionText(selectedDef, selectedOwned, balance).disabled}
                  className={`w-full rounded-2xl px-4 py-3 font-semibold text-white transition ${
                    getNextActionText(selectedDef, selectedOwned, balance).disabled
                      ? "cursor-not-allowed bg-white/10 text-white/35"
                      : "bg-fuchsia-500 hover:bg-fuchsia-400"
                  }`}
                >
                  {!selectedOwned.owned
                    ? `Unlock ${selectedDef.name}`
                    : selectedOwned.level >= selectedDef.maxLevel
                    ? `${selectedDef.name} Maxed`
                    : `Upgrade ${selectedDef.name}`}
                </button>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/55">
                Tap any room zone to inspect it, unlock it, or upgrade it.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:rounded-3xl md:p-5">
            <div className="text-xs uppercase tracking-[0.25em] text-emerald-300/70 md:text-sm">
              Room Catalog
            </div>

            <div className="mt-4 space-y-3">
              {ITEM_DEFS.map((def) => {
                const owned = room[def.id];
                const currentOutput = getItemOutput(def, owned);
                const visual = getLevelVisual(owned.level);
                const nextAction = getNextActionText(def, owned, balance);

                return (
                  <div
                    key={def.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => selectItem(def.id)}
                        className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-xl sm:h-14 sm:w-14 sm:text-2xl ${
                          owned.owned ? visual.tile : "border-white/10 bg-white/5"
                        }`}
                      >
                        {owned.owned && <Sparkles count={Math.min(visual.sparkles, 2)} />}
                        <span className={!owned.owned ? "opacity-55 grayscale" : ""}>
                          {def.icon}
                        </span>
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="truncate font-bold">{def.name}</div>
                          <div className="shrink-0 text-xs text-white/45">{def.zoneLabel}</div>
                        </div>

                        <div className="mt-1 text-sm text-white/55">
                          {def.description}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/65">
                            Base +{def.baseOutput}/hr
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/65">
                            {owned.owned ? `Level ${owned.level}` : "Not owned"}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-pink-300">
                            {currentOutput}/hr now
                          </span>
                        </div>

                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="text-sm text-white/55">
                            <span className="font-bold text-white">{nextAction.label}</span>
                          </div>

                          <button
                            onClick={() => unlockOrUpgrade(def.id)}
                            disabled={nextAction.disabled}
                            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                              nextAction.disabled
                                ? "cursor-not-allowed bg-white/10 text-white/35"
                                : "bg-white/10 text-white hover:bg-white/20"
                            }`}
                          >
                            {!owned.owned
                              ? "Unlock"
                              : owned.level >= def.maxLevel
                              ? "Maxed"
                              : "Upgrade"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:rounded-3xl md:p-5">
      <div className="text-xs text-white/50 md:text-sm">{label}</div>
      <div className="mt-2 text-lg font-black md:text-2xl">{value}</div>
    </div>
  );
}

function ActionCard({
  title,
  subtitle,
  value,
  buttonLabel,
  onClick,
  disabled,
  accent,
}: {
  title: string;
  subtitle: string;
  value: string;
  buttonLabel: string;
  onClick: () => void;
  disabled?: boolean;
  accent: "green" | "pink" | "neutral";
}) {
  const buttonClass =
    accent === "green"
      ? "bg-emerald-500 hover:bg-emerald-400"
      : accent === "pink"
      ? "bg-fuchsia-500 hover:bg-fuchsia-400"
      : "bg-white/10 hover:bg-white/20";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:rounded-3xl md:p-5">
      <div className="text-xs uppercase tracking-[0.2em] text-white/45">{title}</div>
      <div className="mt-2 text-xl font-black md:text-2xl">{value}</div>
      <div className="mt-1 text-sm text-white/55">{subtitle}</div>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`mt-4 w-full rounded-2xl px-4 py-3 font-semibold text-white transition ${
          disabled ? "cursor-not-allowed bg-white/10 text-white/35" : buttonClass
        }`}
      >
        {buttonLabel}
      </button>
    </div>
  );
}