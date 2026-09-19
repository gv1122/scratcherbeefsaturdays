import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { Pairing } from "@/lib/types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret configured, allow (fine for local/dev testing)

  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  const queryToken = req.nextUrl.searchParams.get("secret");
  if (queryToken === secret) return true;

  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: scratchers, error: fetchErr } = await supabaseAdmin
    .from("scratchers")
    .select("handle");

  if (fetchErr) {
    console.error(fetchErr);
    return NextResponse.json({ ok: false, error: "Failed to load scratchers." }, { status: 500 });
  }

  const handles = (scratchers ?? []).map((s) => s.handle as string);

  if (handles.length < 2) {
    return NextResponse.json({
      ok: false,
      error: "Not enough scratchers registered yet (need at least 2).",
    });
  }

  const shuffled = shuffle(handles);
  const pairings: Pairing[] = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    if (i + 1 < shuffled.length) {
      pairings.push({ a: shuffled[i], b: shuffled[i + 1] });
    } else {
      pairings.push({ a: shuffled[i], b: null }); // odd one out gets a bye
    }
  }

  const generatedAt = new Date().toISOString();

  const { error: updateErr } = await supabaseAdmin
    .from("beef_state")
    .update({ pairings, generated_at: generatedAt })
    .eq("id", 1);

  if (updateErr) {
    console.error(updateErr);
    return NextResponse.json({ ok: false, error: "Failed to save pairings." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, pairings, generatedAt });
}

// Allow manual triggering via POST too (handy for testing from a browser/Postman).
export const POST = GET;
