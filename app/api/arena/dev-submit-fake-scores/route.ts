import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeAddress(value: string) {
  return value.trim().toLowerCase();
}

function pickWeightedWinner(
  entries: Array<{
    wallet_address: string;
    score: number;
    tickets: number;
  }>
) {
  if (!entries.length) return null;

  const weighted = entries.map((entry) => {
    const weight = Math.max(1, entry.score + entry.tickets * 25);
    return { ...entry, weight };
  });

  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = Math.random() * totalWeight;

  for (const entry of weighted) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry;
  }

  return weighted[weighted.length - 1];
}

async function findTargetRound(roundIdRaw: unknown) {
  const parsedRoundId = Number(roundIdRaw);

  if (Number.isFinite(parsedRoundId) && parsedRoundId > 0) {
    const { data, error } = await supabase
      .from("rounds")
      .select("*")
      .eq("id", parsedRoundId)
      .maybeSingle();

    if (error) throw new Error("Failed to load requested round.");
    if (data) return data;
  }

  const { data: activeRounds, error: activeError } = await supabase
    .from("rounds")
    .select("*")
    .eq("status", "active")
    .order("id", { ascending: false })
    .limit(1);

  if (activeError) {
    throw new Error("Failed to load active round.");
  }

  if (activeRounds?.[0]) {
    return activeRounds[0];
  }

  const { data: waitingRounds, error: waitingError } = await supabase
    .from("rounds")
    .select("*")
    .in("status", ["waiting", "active"])
    .order("id", { ascending: false })
    .limit(1);

  if (waitingError) {
    throw new Error("Failed to load fallback round.");
  }

  if (waitingRounds?.[0]) {
    return waitingRounds[0];
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const keepWalletAddress = String(body?.keepWalletAddress || "")
      .trim()
      .toLowerCase();

    const round = await findTargetRound(body?.roundId);

    if (!round) {
      return NextResponse.json(
        { error: "No active or waiting round found." },
        { status: 404 }
      );
    }

    const roundId = Number(round.id);
    const players = Array.isArray(round.players) ? round.players : [];

    const fakeEntries = players
      .filter((p: any) => normalizeAddress(p.address) !== keepWalletAddress)
      .map((p: any) => ({
        round_id: roundId,
        wallet_address: normalizeAddress(p.address),
        score: Math.floor(Math.random() * 900) + 100,
        shown_earned: Math.floor(Math.random() * 80) + 20,
        level: Math.floor(Math.random() * 5) + 1,
        tickets: Number(p.tickets || 1),
        submitted_at: new Date().toISOString(),
      }));

    if (fakeEntries.length > 0) {
      const { error: insertError } = await supabase
        .from("arena_scores")
        .upsert(fakeEntries, { onConflict: "round_id,wallet_address" });

      if (insertError) {
        return NextResponse.json(
          { error: "Failed to insert fake scores." },
          { status: 500 }
        );
      }
    }

    const { data: submittedScores, error: submittedScoresError } = await supabase
      .from("arena_scores")
      .select("*")
      .eq("round_id", roundId);

    if (submittedScoresError) {
      return NextResponse.json(
        { error: "Failed to load scores." },
        { status: 500 }
      );
    }

    const allScores = submittedScores || [];
    const expectedPlayers = players.length;

    if (allScores.length >= expectedPlayers && expectedPlayers > 0) {
      const winner = pickWeightedWinner(
        allScores.map((entry: any) => ({
          wallet_address: entry.wallet_address,
          score: Number(entry.score || 0),
          tickets: Number(entry.tickets || 1),
        }))
      );

      if (winner) {
        const { error: updateError } = await supabase
          .from("rounds")
          .update({
            status: "finished",
            winner_wallet: winner.wallet_address,
          })
          .eq("id", roundId);

        if (updateError) {
          return NextResponse.json(
            { error: "Winner selected, but failed to finish round." },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          roundId,
          allSubmitted: true,
          winnerWallet: winner.wallet_address,
        });
      }
    }

    return NextResponse.json({
      success: true,
      roundId,
      allSubmitted: false,
      submittedCount: allScores.length,
      expectedPlayers,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Something went wrong." },
      { status: 500 }
    );
  }
}