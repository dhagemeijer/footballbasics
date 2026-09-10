import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

// Geen CORS: dit endpoint is uitsluitend server-to-server.
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) {
    // Vergelijk toch, tegen lengte-timing; resultaat blijft false.
    let diff = 1;
    for (let i = 0; i < Math.max(ab.length, bb.length); i++) {
      diff |= (ab[i % (ab.length || 1)] ?? 0) ^ (bb[i % (bb.length || 1)] ?? 0);
    }
    return false && diff === 0;
  }
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

async function hashPrefix(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest).slice(0, 4))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const expected = Deno.env.get("DENNIS_INTEGRATION_KEY") ?? "";
  const provided = req.headers.get("X-Integration-Key") ?? "";

  if (!expected || !provided || !timingSafeEqual(provided, expected)) {
    console.log(
      "dennis-read unauthorized",
      provided ? `key_prefix=${await hashPrefix(provided)}` : "key_missing",
    );
    return json({ error: "unauthorized" }, 401);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const capability = String((body as { capability?: string }).capability ?? "");

    if (capability !== "upcoming_sessions") {
      return json({ error: "unknown_capability" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await admin
      .from("training_sessions")
      .select("id, title, description, session_date, session_time, location, max_participants")
      .gte("session_date", today)
      .order("session_date", { ascending: true })
      .order("session_time", { ascending: true });

    if (error) {
      console.error("dennis-read query failed", error.message);
      return json({ error: "internal_error" }, 500);
    }

    // Spelers-tellingen: alleen aggregaten, geen persoonsgegevens in de response.
    const counts = new Map<string, number>();
    const sessionIds = (data ?? []).map((s) => s.id);
    if (sessionIds.length > 0) {
      const [{ data: playerRoles }, { data: signups }] = await Promise.all([
        admin.from("user_roles").select("user_id").eq("role", "player"),
        admin.from("session_signups").select("session_id, user_id").in("session_id", sessionIds),
      ]);
      const players = new Set((playerRoles ?? []).map((r) => r.user_id));
      for (const s of signups ?? []) {
        if (players.has(s.user_id)) {
          counts.set(s.session_id, (counts.get(s.session_id) ?? 0) + 1);
        }
      }
    }

    const sessions = (data ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      date: s.session_date,
      time: s.session_time,
      location: s.location,
      maxParticipants: s.max_participants,
      signupCount: counts.get(s.id) ?? 0,
    }));

    return json({ sessions });
  } catch (e) {
    console.error("dennis-read error", (e as Error).message);
    return json({ error: "internal_error" }, 500);
  }
});
