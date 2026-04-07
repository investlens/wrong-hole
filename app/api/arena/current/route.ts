import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_SUPABASE_URL" },
        { status: 500 }
      );
    }

    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: "Missing SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from("rounds")
      .select("*")
      .in("status", ["waiting", "active"])
      .order("id", { ascending: false })
      .limit(1);

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to load round." },
        { status: 500 }
      );
    }

    const round = data?.[0] || null;

    return NextResponse.json(
      round || {
        id: null,
        status: "waiting",
        players: [],
        total_pool: 0,
        winner_wallet: null,
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Something went wrong." },
      { status: 500 }
    );
  }
}