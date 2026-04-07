import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  SuiJsonRpcClient,
  getJsonRpcFullnodeUrl,
} from "@mysten/sui/jsonRpc";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const suiClient = new SuiJsonRpcClient({
  url: getJsonRpcFullnodeUrl("testnet"),
  network: "testnet",
});

const MAX_PLAYERS = 10;
const TICKET_PRICE_SUI = 0.1;
const TICKET_PRICE_MIST = 100_000_000; // 0.1 SUI
const RECEIVER_ADDRESS =
  "0x673a1b61af35112ab6fefb05192550cbc9523e7f4f22520d0a666a01a1bb3667";

type ArenaPlayer = {
  id?: number;
  address: string;
  tickets: number;
};

function normalizeAddress(value: string) {
  return value.trim().toLowerCase();
}

function isValidTicketCount(value: unknown): value is number {
  return value === 1 || value === 2 || value === 3;
}

function calculatePool(players: ArenaPlayer[]) {
  return players.reduce((sum, player) => {
    return sum + player.tickets * TICKET_PRICE_SUI;
  }, 0);
}

async function verifySuiPayment({
  txDigest,
  expectedSender,
  expectedReceiver,
  expectedAmountMist,
}: {
  txDigest: string;
  expectedSender: string;
  expectedReceiver: string;
  expectedAmountMist: bigint;
}) {
  await suiClient.waitForTransaction({
    digest: txDigest,
    options: {
      showEffects: true,
      showInput: true,
      showBalanceChanges: true,
    },
    timeout: 60_000,
    pollInterval: 2_000,
  });

  const tx = await suiClient.getTransactionBlock({
    digest: txDigest,
    options: {
      showEffects: true,
      showInput: true,
      showBalanceChanges: true,
    },
  });

  if (!tx) {
    throw new Error("Transaction not found.");
  }

  if (tx.effects?.status.status !== "success") {
    throw new Error("Transaction failed on-chain.");
  }

  const sender = normalizeAddress(tx.transaction?.data?.sender || "");
  if (!sender || sender !== normalizeAddress(expectedSender)) {
    throw new Error("Transaction sender does not match connected wallet.");
  }

  const balanceChanges = tx.balanceChanges || [];

  const receiverGain = balanceChanges
    .filter((change: any) => {
      const owner = change.owner;
      if (!owner || typeof owner !== "object") return false;
      if (!("AddressOwner" in owner)) return false;

      return (
        normalizeAddress(String(owner.AddressOwner)) ===
          normalizeAddress(expectedReceiver) &&
        change.coinType === "0x2::sui::SUI"
      );
    })
    .reduce((sum: bigint, change: any) => sum + BigInt(change.amount), BigInt(0));

  if (receiverGain < expectedAmountMist) {
    throw new Error("Expected payment amount was not received.");
  }

  return tx;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const address = String(body?.address || "").trim();
    const tickets = Number(body?.tickets);
    const txDigest = String(body?.txDigest || "").trim();

    if (!address) {
      return NextResponse.json(
        { error: "Wallet address is required." },
        { status: 400 }
      );
    }

    if (!isValidTicketCount(tickets)) {
      return NextResponse.json(
        { error: "Tickets must be 1, 2, or 3." },
        { status: 400 }
      );
    }

    if (!txDigest) {
      return NextResponse.json(
        { error: "Transaction digest is required." },
        { status: 400 }
      );
    }

    const { data: existingTx, error: existingTxError } = await supabase
      .from("arena_join_transactions")
      .select("tx_digest")
      .eq("tx_digest", txDigest)
      .maybeSingle();

    if (existingTxError) {
      console.error("Replay check error:", existingTxError);
      return NextResponse.json(
        { error: "Failed to validate transaction reuse." },
        { status: 500 }
      );
    }

    if (existingTx) {
      return NextResponse.json(
        { error: "This transaction was already used to join." },
        { status: 400 }
      );
    }

    const expectedAmountMist = BigInt(tickets * TICKET_PRICE_MIST);

    await verifySuiPayment({
      txDigest,
      expectedSender: address,
      expectedReceiver: RECEIVER_ADDRESS,
      expectedAmountMist,
    });

    const { data: existingRounds, error: roundFetchError } = await supabase
      .from("rounds")
      .select("*")
      .eq("status", "waiting")
      .order("id", { ascending: true })
      .limit(1);

    if (roundFetchError) {
      console.error("Round fetch error:", roundFetchError);
      return NextResponse.json(
        { error: "Failed to load arena round." },
        { status: 500 }
      );
    }

    let round = existingRounds?.[0];

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
        console.error("Round creation error:", createRoundError);
        return NextResponse.json(
          { error: "Failed to create arena round." },
          { status: 500 }
        );
      }

      round = newRound;
    }

    const players: ArenaPlayer[] = Array.isArray(round.players) ? round.players : [];
    const normalizedAddress = normalizeAddress(address);

    const alreadyJoined = players.some(
      (player) => normalizeAddress(player.address) === normalizedAddress
    );

    if (alreadyJoined) {
      return NextResponse.json(
        { error: "Wallet already joined this round." },
        { status: 400 }
      );
    }

    if (players.length >= MAX_PLAYERS) {
      return NextResponse.json(
        { error: "Arena is already full." },
        { status: 400 }
      );
    }

    const updatedPlayers: ArenaPlayer[] = [
      ...players,
      {
        id: players.length + 1,
        address,
        tickets,
      },
    ];

    const nextStatus = updatedPlayers.length >= MAX_PLAYERS ? "active" : "waiting";
    const totalPool = calculatePool(updatedPlayers);

    const { error: updateError } = await supabase
      .from("rounds")
      .update({
        players: updatedPlayers,
        total_pool: totalPool,
        status: nextStatus,
      })
      .eq("id", round.id);

    if (updateError) {
      console.error("Round update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update arena round." },
        { status: 500 }
      );
    }

    const { error: insertTxError } = await supabase
      .from("arena_join_transactions")
      .insert({
        tx_digest: txDigest,
        wallet_address: address,
        round_id: round.id,
      });

    if (insertTxError) {
      console.error("Consumed tx insert error:", insertTxError);
      return NextResponse.json(
        { error: "Joined round, but failed to finalize transaction record." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      players: updatedPlayers,
      total_pool: totalPool,
      status: nextStatus,
    });
  } catch (error: any) {
    console.error("Arena join error:", error);
    return NextResponse.json(
      { error: error?.message || "Something went wrong." },
      { status: 500 }
    );
  }
}