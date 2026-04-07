import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type GameMode = "free" | "paid";

function normalizeAddress(value: string) {
  return value.trim().toLowerCase();
}

function isValidMode(value: unknown): value is GameMode {
  return value === "free" || value === "paid";
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function calculateCreditedPoints({
  mode,
  score,
  shownEarned,
  level,
}: {
  mode: GameMode;
  score: number;
  shownEarned: number;
  level: number;
}) {
  const safeScore = clampNumber(score, 0, 1_000_000);
  const safeShownEarned = clampNumber(shownEarned, 0, 1_000_000);
  const safeLevel = clampNumber(level, 1, 10_000);

  // Base reward from frontend result
  const baseEarned = Math.floor(safeShownEarned);

  // Tiny skill bonus
  const scoreBonus = Math.floor(safeScore / 100);

  // Tiny level bonus
  const levelBonus = Math.floor(safeLevel / 5);

  const rawPoints = baseEarned + scoreBonus + levelBonus;

  // Free mode gives less, paid mode gives more
  if (mode === "free") {
    return Math.max(1, Math.floor(rawPoints * 0.35));
  }

  return Math.max(1, Math.floor(rawPoints * 1.0));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const walletAddress = String(body?.walletAddress || "").trim();
    const mode = body?.mode;
    const score = Number(body?.score ?? 0);
    const shownEarned = Number(body?.shownEarned ?? 0);
    const level = Number(body?.level ?? 1);

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required." },
        { status: 400 }
      );
    }

    if (!isValidMode(mode)) {
      return NextResponse.json(
        { error: "Mode must be 'free' or 'paid'." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(score) || score < 0) {
      return NextResponse.json(
        { error: "Invalid score." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(shownEarned) || shownEarned < 0) {
      return NextResponse.json(
        { error: "Invalid shownEarned value." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(level) || level < 1) {
      return NextResponse.json(
        { error: "Invalid level." },
        { status: 400 }
      );
    }

    const normalizedWallet = normalizeAddress(walletAddress);

    const creditedPoints = calculateCreditedPoints({
      mode,
      score,
      shownEarned,
      level,
    });

    const { data: existing, error: fetchError } = await supabase
      .from("player_points")
      .select("*")
      .eq("wallet_address", normalizedWallet)
      .maybeSingle();

    if (fetchError) {
      console.error("Fetch player_points error:", fetchError);
      return NextResponse.json(
        { error: "Failed to load player points." },
        { status: 500 }
      );
    }

    const current = existing || {
      wallet_address: normalizedWallet,
      total_points: 0,
      free_points: 0,
      paid_points: 0,
      total_runs: 0,
      free_runs: 0,
      paid_runs: 0,
    };

    const nextTotalPoints = Number(current.total_points || 0) + creditedPoints;
    const nextFreePoints =
      Number(current.free_points || 0) + (mode === "free" ? creditedPoints : 0);
    const nextPaidPoints =
      Number(current.paid_points || 0) + (mode === "paid" ? creditedPoints : 0);

    const nextTotalRuns = Number(current.total_runs || 0) + 1;
    const nextFreeRuns =
      Number(current.free_runs || 0) + (mode === "free" ? 1 : 0);
    const nextPaidRuns =
      Number(current.paid_runs || 0) + (mode === "paid" ? 1 : 0);

    const payload = {
      wallet_address: normalizedWallet,
      total_points: nextTotalPoints,
      free_points: nextFreePoints,
      paid_points: nextPaidPoints,
      total_runs: nextTotalRuns,
      free_runs: nextFreeRuns,
      paid_runs: nextPaidRuns,
      updated_at: new Date().toISOString(),
    };

    const { data: saved, error: upsertError } = await supabase
      .from("player_points")
      .upsert(payload, { onConflict: "wallet_address" })
      .select()
      .single();

    if (upsertError) {
      console.error("Upsert player_points error:", upsertError);
      return NextResponse.json(
        { error: "Failed to save player points." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      creditedPoints,
      playerPoints: saved,
    });
  } catch (error: any) {
    console.error("claim-points route error:", error);
    return NextResponse.json(
      { error: error?.message || "Something went wrong." },
      { status: 500 }
    );
  }
}