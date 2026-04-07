import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeAddress(value: string) {
  return value.trim().toLowerCase();
}

export async function GET(req: NextRequest) {
  try {
    const walletAddress = req.nextUrl.searchParams.get("walletAddress") || "";

    if (!walletAddress.trim()) {
      return NextResponse.json(
        { error: "walletAddress is required." },
        { status: 400 }
      );
    }

    const normalizedWallet = normalizeAddress(walletAddress);

    const { data, error } = await supabase
      .from("player_points")
      .select("*")
      .eq("wallet_address", normalizedWallet)
      .maybeSingle();

    if (error) {
      console.error("GET player_points error:", error);
      return NextResponse.json(
        { error: "Failed to fetch player points." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      playerPoints: data || {
        wallet_address: normalizedWallet,
        total_points: 0,
        free_points: 0,
        paid_points: 0,
        total_runs: 0,
        free_runs: 0,
        paid_runs: 0,
      },
    });
  } catch (error: any) {
    console.error("points route error:", error);
    return NextResponse.json(
      { error: error?.message || "Something went wrong." },
      { status: 500 }
    );
  }
}