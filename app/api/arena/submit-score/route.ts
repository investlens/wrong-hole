import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ArenaPlayer = {
  id?: number;
  address: string;
  tickets: number;
};

function normalizeAddress(value: string) {
  return value.trim().toLowerCase();
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
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
    const safeScore = Math.max(0, entry.score);
    const safeTickets = Math.max(1, entry.tickets);

    // Simple weighted formula:
    // score matters most, tickets boost a little
    const weight = Math.max(1, safeScore + safeTickets * 25);

    return {
      ...entry,
      weight,
    };
  });

  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);

  let cursor = Math.random() * totalWeight;

  for (const entry of weighted) {
    cursor -= entry.weight;
    if (cursor <= 0) {
      return entry;
    }
  }

  return weighted[weighted.length - 1];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const roundId = Number(body?.roundId);
    const walletAddress = String(body?.walletAddress || "").trim();
    const score = clampNumber(Number(body?.score ?? 0), 0, 1_000_000);
    const shownEarned = clampNumber(Number(body?.shownEarned ?? 0), 0, 1_000_000);
    const level = clampNumber(Number(body?.level ?? 1), 1, 10_000);
    const tickets = clampNumber(Number(body?.tickets ?? 1), 1, 3);

    if (!Number.isFinite(roundId) || roundId <= 0) {
      return NextResponse.json(
        { error: "Valid roundId is required." },
        { status: 400 }
      );
    }

    if (!walletAddress) {
      return NextResponse.json(
        { error: "walletAddress is required." },
        { status: 400 }
      );
    }

    const normalizedWallet = normalizeAddress(walletAddress);

    // 1) Load the round
    const { data: round, error: roundError } = await supabase
      .from("rounds")
      .select("*")
      .eq("id", roundId)
      .maybeSingle();

    if (roundError || !round) {
      console.error("Round fetch error:", roundError);
      return NextResponse.json(
        { error: "Round not found." },
        { status: 404 }
      );
    }

    const players: ArenaPlayer[] = Array.isArray(round.players) ? round.players : [];

    // 2) Make sure this wallet is actually in the round
    const playerEntry = players.find(
      (player) => normalizeAddress(player.address) === normalizedWallet
    );

    if (!playerEntry) {
      return NextResponse.json(
        { error: "This wallet is not part of the round." },
        { status: 400 }
      );
    }

    // 3) Save or update the player's score
    const { error: scoreUpsertError } = await supabase
      .from("arena_scores")
      .upsert(
        {
          round_id: roundId,
          wallet_address: normalizedWallet,
          score,
          shown_earned: shownEarned,
          level,
          tickets: playerEntry.tickets || tickets,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "round_id,wallet_address" }
      );

    if (scoreUpsertError) {
      console.error("Score upsert error:", scoreUpsertError);
      return NextResponse.json(
        { error: "Failed to save score." },
        { status: 500 }
      );
    }

    // 4) Check how many scores have been submitted
    const { data: submittedScores, error: submittedScoresError } = await supabase
      .from("arena_scores")
      .select("*")
      .eq("round_id", roundId);

    if (submittedScoresError) {
      console.error("Submitted scores fetch error:", submittedScoresError);
      return NextResponse.json(
        { error: "Failed to load round scores." },
        { status: 500 }
      );
    }

    const expectedPlayers = players.length;
    const submittedCount = submittedScores?.length || 0;

    // 5) If not everyone submitted yet, keep round active
    if (submittedCount < expectedPlayers) {
      return NextResponse.json({
        success: true,
        roundId,
        submitted: true,
        allSubmitted: false,
        submittedCount,
        expectedPlayers,
        message: "Score saved. Waiting for other players.",
      });
    }

    // 6) All submitted -> pick winner
    const winner = pickWeightedWinner(
      (submittedScores || []).map((entry: any) => ({
        wallet_address: entry.wallet_address,
        score: Number(entry.score || 0),
        tickets: Number(entry.tickets || 1),
      }))
    );

    if (!winner) {
      return NextResponse.json(
        { error: "Failed to determine winner." },
        { status: 500 }
      );
    }

    // 7) Finish the round
    const { error: updateRoundError } = await supabase
      .from("rounds")
      .update({
        status: "finished",
        winner_wallet: winner.wallet_address,
      })
      .eq("id", roundId);

    if (updateRoundError) {
      console.error("Round finish update error:", updateRoundError);
      return NextResponse.json(
        { error: "Score saved, but failed to finalize round." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      roundId,
      submitted: true,
      allSubmitted: true,
      winnerWallet: winner.wallet_address,
      submittedCount,
      expectedPlayers,
      message: "All scores submitted. Winner selected.",
    });
  } catch (error: any) {
    console.error("submit-score route error:", error);
    return NextResponse.json(
      { error: error?.message || "Something went wrong." },
      { status: 500 }
    );
  }
}