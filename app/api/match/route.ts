import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { MatchResponse, Pairing } from "@/lib/types";

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("deviceId");
  if (!deviceId) {
    return NextResponse.json<MatchResponse>({ registered: false });
  }

  const { data: scratcher, error: scratcherErr } = await supabaseAdmin
    .from("scratchers")
    .select("handle")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (scratcherErr) {
    console.error(scratcherErr);
    return NextResponse.json({ registered: false, error: "lookup failed" }, { status: 500 });
  }
  if (!scratcher) {
    return NextResponse.json<MatchResponse>({ registered: false });
  }

  const handle = scratcher.handle;

  const { data: beef, error: beefErr } = await supabaseAdmin
    .from("beef_state")
    .select("pairings, generated_at")
    .eq("id", 1)
    .maybeSingle();

  if (beefErr) {
    console.error(beefErr);
    return NextResponse.json<MatchResponse>({ registered: true, handle });
  }

  const pairings: Pairing[] = (beef?.pairings as Pairing[]) ?? [];
  const pairing = pairings.find((p) => p.a === handle || p.b === handle);

  if (!pairing) {
    // They registered after the last shuffle ran, so they're not in it yet.
    return NextResponse.json<MatchResponse>({ registered: true, handle });
  }

  const opponent = pairing.a === handle ? pairing.b : pairing.a;

  return NextResponse.json<MatchResponse>({
    registered: true,
    handle,
    opponent,
    generatedAt: beef?.generated_at ? new Date(beef.generated_at).getTime() : undefined,
  });
}
