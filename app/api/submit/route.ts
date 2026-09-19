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
        { ok: false, error: "missing device id" },
        { status: 400 }
      );
    }
    if (!rawHandle || typeof rawHandle !== "string") {
      return NextResponse.json<SubmitResponse>(
        { ok: false, error: "missing handle" },
        { status: 400 }
      );
    }

    const handle = cleanHandle(rawHandle);
    if (handle.length < 1 || handle.length > 30) {
      return NextResponse.json<SubmitResponse>(
        { ok: false, error: "that doesnt look like a valid handle" },
        { status: 400 }
      );
    }
    const handleLower = handle.toLowerCase();

    const { data: existing, error: existingErr } = await supabaseAdmin
      .from("scratchers")
      .select("handle")
      .eq("device_id", deviceId)
      .maybeSingle();

    if (existingErr) throw existingErr;
    if (existing) {
      return NextResponse.json<SubmitResponse>({ ok: true, handle: existing.handle });
    }

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
            "that handle has already been registered. pick a different one or ask a friend who signed you up",
        },
        { status: 409 }
      );
    }

    const { error: insertErr } = await supabaseAdmin
      .from("scratchers")
      .insert({ device_id: deviceId, handle });

    if (insertErr) {
      if ((insertErr as { code?: string }).code === "23505") {
        return NextResponse.json<SubmitResponse>(
          { ok: false, error: "that handle or device just got registered , try refreshing the page" },
          { status: 409 }
        );
      }
      throw insertErr;
    }

    return NextResponse.json<SubmitResponse>({ ok: true, handle });
  } catch (err) {
    console.error(err);
    return NextResponse.json<SubmitResponse>(
      { ok: false, error: "something broke :( try again" },
      { status: 500 }
    );
  }
}
