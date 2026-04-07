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

const MAX_PLAYERS = 10;
const TICKET_PRICE_MIST = 100_000_000; // 0.1 SUI

function fakeAddress(index: number) {
  return `0xfakeplayer${String(index).padStart(4, "0")}`;
}

function randomTickets() {
  return [1, 2, 3][Math.floor(Math.random() * 3)];
}

function normalizeAddress(value: string) {
  return value.trim().toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_SUPABASE_URL" },
        { status: 500 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Missing SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const walletAddress = String(body?.walletAddress || "").trim();

    if (!walletAddress) {
      return NextResponse.json(
        { error: "walletAddress is required." },
        { status: 400 }
      );
    }

    const normalizedWallet = normalizeAddress(walletAddress);

    // 1) Try to find an existing waiting or active round
    const { data: existingRounds, error: roundFetchError } = await supabase
      .from("rounds")
      .select("*")
      .in("status", ["waiting", "active"])
      .order("id", { ascending: false })
      .limit(1);

    if (roundFetchError) {
      console.error("roundFetchError:", roundFetchError);
      return NextResponse.json(
        { error: roundFetchError.message || "Failed to load round." },
        { status: 500 }
      );
    }

    let round = existingRounds?.[0];

    // 2) Create one if none exists
    if (!round) {
      const { data: newRound, error: createRoundError } = await supabase
        .from("rounds")
        .insert({
          status: "waiting",
          players: [],
          total_pool: 0,
        })
        .select()
        .single();

      if (createRoundError || !newRound) {
        console.error("createRoundError:", createRoundError);
        return NextResponse.json(
          { error: createRoundError?.message || "Failed to create round." },
          { status: 500 }
        );
      }

      round = newRound;
    }

    let players: ArenaPlayer[] = Array.isArray(round.players) ? round.players : [];

    // 3) Reset weird/broken overfilled data if needed
    if (players.length > MAX_PLAYERS) {
      players = [];
    }

    // 4) Ensure user's wallet is in the round
    const alreadyExists = players.some(
      (p) => normalizeAddress(String(p.address || "")) === normalizedWallet
    );

    if (!alreadyExists) {
      players.push({
        id: players.length + 1,
        address: walletAddress,
        tickets: 2,
      });
    }

    // 5) Fill with fake players
    let fakeIndex = 1;
    while (players.length < MAX_PLAYERS) {
      const address = fakeAddress(fakeIndex++);
      const exists = players.some(
        (p) => normalizeAddress(String(p.address || "")) === address
      );

      if (!exists) {
        players.push({
          id: players.length + 1,
          address,
          tickets: randomTickets(),
        });
      }
    }

    // 6) Re-number ids safely
    players = players.slice(0, MAX_PLAYERS).map((player, index) => ({
      id: index + 1,
      address: player.address,
      tickets: Number(player.tickets || 1),
    }));

    const totalPool = players.reduce(
      (sum, p) => sum + Number(p.tickets || 0) * TICKET_PRICE_MIST,
      0
    );

    // 7) Update round
    const { data: updatedRound, error: updateError } = await supabase
      .from("rounds")
      .update({
        players,
        total_pool: totalPool,
        status: "active",
      })
      .eq("id", round.id)
      .select()
      .single();

    if (updateError) {
      console.error("updateError:", updateError);
      return NextResponse.json(
        { error: updateError.message || "Failed to fill round." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      roundId: updatedRound.id,
      players: updatedRound.players || players,
      total_pool: updatedRound.total_pool ?? totalPool,
      status: updatedRound.status || "active",
    });
  } catch (error: any) {
    console.error("dev-fill-round route error:", error);
    return NextResponse.json(
      { error: error?.message || "Something went wrong." },
      { status: 500 }
    );
  }
}