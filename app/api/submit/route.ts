import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { SubmitResponse } from "@/lib/types";

function cleanHandle(raw: string): string {
  return raw.trim().replace(/^@+/, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const deviceId: string | undefined = body?.deviceId;
    const rawHandle: string | undefined = body?.handle;

    if (!deviceId || typeof deviceId !== "string") {
      return NextResponse.json<SubmitResponse>(
        { ok: false, error: "Missing device id." },
        { status: 400 }
      );
    }
    if (!rawHandle || typeof rawHandle !== "string") {
      return NextResponse.json<SubmitResponse>(
        { ok: false, error: "Missing handle." },
        { status: 400 }
      );
    }

    const handle = cleanHandle(rawHandle);
    if (handle.length < 1 || handle.length > 30) {
      return NextResponse.json<SubmitResponse>(
        { ok: false, error: "That doesn't look like a valid handle." },
        { status: 400 }
      );
    }
    const handleLower = handle.toLowerCase();

    // Already registered on this device? Return their existing handle (idempotent).
    const { data: existing, error: existingErr } = await supabaseAdmin
      .from("scratchers")
      .select("handle")
      .eq("device_id", deviceId)
      .maybeSingle();

    if (existingErr) throw existingErr;
    if (existing) {
      return NextResponse.json<SubmitResponse>({ ok: true, handle: existing.handle });
    }

    // Handle already claimed by a different device? (case-insensitive exact match)
    const { data: claimed, error: claimedErr } = await supabaseAdmin
      .from("scratchers")
      .select("device_id")
      .ilike("handle", handleLower)
      .maybeSingle();

    if (claimedErr) throw claimedErr;
    if (claimed && claimed.device_id !== deviceId) {
      return NextResponse.json<SubmitResponse>(
        {
          ok: false,
          error:
            "That handle already has beef registered. Pick a different one or ask a friend who signed you up.",
        },
        { status: 409 }
      );
    }

    const { error: insertErr } = await supabaseAdmin
      .from("scratchers")
      .insert({ device_id: deviceId, handle });

    if (insertErr) {
      // 23505 = unique_violation (race condition: two requests at once)
      if ((insertErr as { code?: string }).code === "23505") {
        return NextResponse.json<SubmitResponse>(
          { ok: false, error: "That handle or device just got registered. Try refreshing." },
          { status: 409 }
        );
      }
      throw insertErr;
    }

    return NextResponse.json<SubmitResponse>({ ok: true, handle });
  } catch (err) {
    console.error(err);
    return NextResponse.json<SubmitResponse>(
      { ok: false, error: "Something broke. Try again." },
      { status: 500 }
    );
  }
}
