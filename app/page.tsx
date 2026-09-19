"use client";

import { useEffect, useState } from "react";
import { MatchResponse, Pairing } from "@/lib/types";

const DEVICE_KEY = "scratcher-device-id";

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);

  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  return id;
}

export default function Home() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<MatchResponse | null>(null);
  const [handleInput, setHandleInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMatch(id: string) {
    const res = await fetch(`/api/match?deviceId=${encodeURIComponent(id)}`);
    const data: MatchResponse = await res.json();
    setMatch(data);
  }

  useEffect(() => {
    const id = getOrCreateDeviceId();
    setDeviceId(id);
    const existing = localStorage.getItem(DEVICE_KEY);

    (async () => {
      if (existing) {
        await loadMatch(existing);
      }

      setLoading(false);
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!deviceId) return;
    setError(null);

    const clean = handleInput.trim();
    if (!clean) {
      setError("You gotta type something in there.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, handle: clean }),
      });

      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Something went wrong.");
        setSubmitting(false);
        return;
      }

      localStorage.setItem(DEVICE_KEY, deviceId);
      await loadMatch(deviceId);
	} catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page-wrap">
      <header className="banner">
        <h1>🔥🔥🔥 SCRATCHER vs SCRATCHER 🔥🔥🔥</h1>
        <div className="marquee-wrap">
          <div className="marquee-track">
            🔥 worldstar of brooklyn scratchers 🔥 new matchup every saturday @ 9am 🔥 health departments worst nightmare 🔥 worldstar of brooklyn scratchers 🔥 new matchup every saturday @ 9am 🔥 health departments worst nightmare 🔥
          </div>
        </div>
      </header>

      <section className="retro-box">

        {loading && <p>loading...</p>}

        {!loading && match?.registered && (
          <div>
            <p>
              youre signed up as <strong>@{match.handle}</strong>. just must wait now ...
            </p>

            {match.opponent === undefined && (
              <p className="blink">patience ... check back every saturday @ 9am</p>
            )}

            {match.opponent === null && (
              <p>
                you drew a <strong>bye</strong> this time — no fight for you
              </p>
            )}

            {match.opponent && (
              <div className="vs-row">
                <div className="vs-card">
                  <span className="label">SCRATCHER</span>
                  <span className="handle">@{match.handle}</span>
                </div>
                <span className="vs-lightning">vs</span>
                <div className="vs-card">
                  <span className="label">BEEF</span>
                  <span className="handle">@{match.opponent}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && !match?.registered && (
          <form className="beef-form" onSubmit={handleSubmit}>
            <label htmlFor="handle">your instagram handle:</label>
            <input
              id="handle"
              type="text"
              placeholder="@yourname"
              value={handleInput}
              onChange={(e) => setHandleInput(e.target.value)}
              disabled={submitting}
            />
            {error && <div className="error-text">{error}</div>}
            <button type="submit" disabled={submitting}>
              {submitting ? "entering..." : "enter"}
            </button>
            <p style={{ fontSize: "0.75rem", marginTop: "8px" }}>
              one entry per device
            </p>
          </form>
        )}
      </section>
    </main>
  );
}
