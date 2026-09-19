import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data: beef, error: beefErr } = await supabaseAdmin
    .from("beef_state")
    .select("pairings, generated_at")
    .eq("id", 1)
    .maybeSingle();

  if (beefErr) {
    console.error(beefErr);
  }

  const { count, error: countErr } = await supabaseAdmin
    .from("scratchers")
    .select("*", { count: "exact", head: true });

  if (countErr) {
    console.error(countErr);
  }

  return NextResponse.json({
    pairings: beef?.pairings ?? [],
    generatedAt: beef?.generated_at ? new Date(beef.generated_at).getTime() : null,
    totalScratchers: count ?? 0,
  });
}
