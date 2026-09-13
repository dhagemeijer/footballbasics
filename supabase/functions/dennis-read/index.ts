import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

// Geen CORS: dit endpoint is uitsluitend server-to-server.
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// FB.1A: genormaliseerde foutenvelop, i.p.v. de losse { error: "string" }
// van voorheen. Toegepast op alle responses in dit bestand, inclusief de
// bestaande upcoming_sessions-capability — dit is de veiligste timing
// om dat te doen, aangezien DENNIS zelf deze capability nog niet
// aanroept (FB.1B is nog niet gestart), dus er is nog geen consument
// die op de oude, platte vorm vertrouwt.
type ErrorCode = "UNAUTHORIZED" | "BAD_CAPABILITY" | "BAD_INPUT" | "NOT_FOUND" | "AMBIGUOUS" | "INTERNAL";

export const errorJson = (code: ErrorCode, message: string, status: number) =>
  json({ error: { code, message } }, status);

export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) {
    // Vergelijk toch, tegen lengte-timing; itereert evenveel als de
    // gelijke-lengte-tak hieronder, maar het resultaat is altijd
    // false — een lengteverschil betekent per definitie geen match.
    let diff = 1;
    for (let i = 0; i < Math.max(ab.length, bb.length); i++) {
      diff |= (ab[i % (ab.length || 1)] ?? 0) ^ (bb[i % (bb.length || 1)] ?? 0);
    }
    void diff;
    return false;
  }
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

// FB.1A-review-fix (punt 4): loggen bij falende auth mag géén enkel
// spoor van de aangeboden sleutel bevatten — geen plaintext, geen hash,
// geen prefix. Alleen niet-gevoelige metadata (aanwezig ja/nee).
// De eerdere hashPrefix()-functie (SHA-256-prefix loggen) is verwijderd.

// --- FB.1A: dagdeel-grenzen -------------------------------------------
//
// DENNIS 0.7.0 definieert alleen representatieve uren voor weer
// (MORNING=9, AFTERNOON=15, EVENING=19), geen ranges — een weersverwachting
// is een momentopname, geen filter over een lijst. Voor het filteren van
// echte trainingssessies op dagdeel zijn wél ranges nodig. Onderstaande
// grenzen zijn gekozen in lijn met die representatieve uren (9 valt in
// MORNING, 15 in AFTERNOON, 19 in EVENING), dekken alle 24 uur, en
// overlappen niet.
type DayPart = "MORNING" | "AFTERNOON" | "EVENING";

const DAY_PART_RANGES: Record<DayPart, { startHour: number; endHour: number }> = {
  MORNING: { startHour: 0, endHour: 12 },
  AFTERNOON: { startHour: 12, endHour: 18 },
  EVENING: { startHour: 18, endHour: 24 },
};

export function isDayPart(value: unknown): value is DayPart {
  return value === "MORNING" || value === "AFTERNOON" || value === "EVENING";
}

export function hourOf(time: string): number {
  return Number(time.split(":")[0]);
}

export function matchesDayPart(time: string, dayPart: DayPart): boolean {
  const hour = hourOf(time);
  const range = DAY_PART_RANGES[dayPart];
  return hour >= range.startHour && hour < range.endHour;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * FB.1A-fix: de oude `upcoming`-logica gebruikte uitsluitend
 * `.gte("session_date", today)`, wat een sessie eerder vandaag (die al
 * heeft plaatsgevonden) ten onrechte nog meetelde. Combineert datum én
 * tijd om te bepalen of een sessie al is gepasseerd.
 */
export function isPastOrNow(date: string, time: string, nowDate: string, nowTime: string): boolean {
  if (date !== nowDate) return date < nowDate;
  return time <= nowTime;
}

const TIMEZONE = "Europe/Amsterdam";

/**
 * FB.1A-review-fix (punt 3): de vorige implementatie gebruikte
 * `new Date().toISOString()`, wat altijd UTC is. Rond middernacht
 * lokale tijd (bijv. 00:30 in de winter = 23:30 UTC de vorige dag)
 * zou dit "vandaag" op de verkeerde kalenderdatum laten uitkomen.
 * Gebruikt nu Intl.DateTimeFormat met een expliciete Europe/Amsterdam
 * timeZone — DST-veilig doordat de ICU-tijdzonedata de
 * zomertijd-overgang zelf correct afhandelt, niet handmatige
 * uur-rekenkunde. Uitgesplitst in een puur, testbaar deel
 * (`localDateTimeParts`, neemt een `Date` als parameter) en een dunne
 * wrapper (`nowParts`) voor de echte klok.
 */
export function localDateTimeParts(instant: Date): { date: string; time: string } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const time = `${get("hour")}:${get("minute")}:${get("second")}`;
  return { date, time };
}

function nowParts(): { date: string; time: string } {
  return localDateTimeParts(new Date());
}

interface SessionRow {
  id: string;
  title: string;
  description: string | null;
  session_date: string;
  session_time: string;
  location: string | null;
  max_participants: number;
}

/**
 * FB.1A-review-fix (punt 1): telt via de bestaande, doelbewust
 * gebouwde `private.get_player_signup_counts_machine()`-RPC (migratie
 * 20260910055400) in plaats van een kale COUNT(*) op
 * `session_signups`. Dit is geen optionele verbetering maar een
 * correctie: `session_signups` kan wel degelijk niet-spelers bevatten
 * — bevestigd door de app's eigen commentaar elders
 * ("Player-only signup counts (trainers/admins do not count towards
 * 'X/max spelers')") en door `TrainingPage.tsx`'s eigen gebruik van
 * dezelfde RPC-familie voor precies dit doel. Een kale COUNT(*) zou
 * dus trainers/admins ten onrechte meetellen.
 *
 * De RPC is uitsluitend aan `service_role` toegekend (nooit aan
 * `authenticated`/`anon`) en voert de speler-rol-filter volledig in
 * SQL uit — er wordt nooit een `user_id` of andere identiteitsdragende
 * kolom opgehaald, alleen `{session_id, player_count}`-paren.
 *
 * Roept `public.get_player_signup_counts_machine()` aan (via
 * `.rpc()`, dat standaard tegen het `public`-schema resolvet — er is
 * geen `[api]`-schema-override in `supabase/config.toml`). Dit is een
 * dunne, SECURITY INVOKER-wrapper (zie migratie
 * `20260913070000_dennis_read_expose_player_signup_counts_machine.sql`)
 * die doorverwijst naar `private.get_player_signup_counts_machine()` —
 * zonder die wrapper zou deze aanroep falen (PGRST202, functie niet
 * gevonden), ongeacht de SQL-GRANT op de private-functie zelf: een
 * GRANT EXECUTE maakt een functie niet zichtbaar voor PostgREST, alleen
 * uitvoerbaar ís die al bereikbaar. `anon`/`authenticated` hebben geen
 * EXECUTE op geen van beide functies — alleen `service_role`.
 *
 * Haalt in één aanroep de tellingen voor alle sessies op (geen
 * parameter om tot één sessie te beperken) — geen privacyrisico, het
 * resultaat is al een geaggregeerde tabel, geen rij bevat ooit een
 * speler-identiteit.
 */
async function getPlayerSignupCounts(
  admin: ReturnType<typeof createClient>,
): Promise<Map<string, number> | null> {
  const { data, error } = await admin.rpc("get_player_signup_counts_machine");
  if (error) return null;
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { session_id: string; player_count: number }[]) {
    counts.set(row.session_id, Number(row.player_count));
  }
  return counts;
}

async function handleSessionsRead(
  admin: ReturnType<typeof createClient>,
  input: unknown,
): Promise<Response> {
  const v = (input ?? {}) as Record<string, unknown>;
  if (v.date !== undefined && (typeof v.date !== "string" || !DATE_PATTERN.test(v.date))) {
    return errorJson("BAD_INPUT", 'date must be a "YYYY-MM-DD" string.', 400);
  }
  if (v.dayPart !== undefined && !isDayPart(v.dayPart)) {
    return errorJson("BAD_INPUT", "dayPart must be one of MORNING, AFTERNOON, EVENING.", 400);
  }
  if (v.upcoming !== undefined && typeof v.upcoming !== "boolean") {
    return errorJson("BAD_INPUT", "upcoming must be a boolean.", 400);
  }
  const date = v.date as string | undefined;
  const dayPart = v.dayPart as DayPart | undefined;
  const upcoming = v.upcoming as boolean | undefined;

  let query = admin
    .from("training_sessions")
    .select("id, title, description, session_date, session_time, location, max_participants");

  if (date) {
    query = query.eq("session_date", date);
  } else if (upcoming) {
    const { date: nowDate } = nowParts();
    query = query.gte("session_date", nowDate);
  }

  query = query.order("session_date", { ascending: true }).order("session_time", { ascending: true });

  const { data, error } = await query;
  if (error) {
    console.error("dennis-read sessions.read query failed", error.message);
    return errorJson("INTERNAL", "Could not read training sessions.", 500);
  }

  let rows = (data ?? []) as SessionRow[];

  if (dayPart) {
    rows = rows.filter((row) => matchesDayPart(row.session_time, dayPart));
  }

  if (upcoming) {
    const { date: nowDate, time: nowTime } = nowParts();
    rows = rows.filter((row) => !isPastOrNow(row.session_date, row.session_time, nowDate, nowTime));
    // Deterministiek "volgende sessie": de ORDER BY hierboven (datum
    // ASC, tijd ASC) levert al de juiste volgorde; de eerste
    // overgebleven rij is ondubbelzinnig "de volgende".
    rows = rows.slice(0, 1);
  }

  const counts = await getPlayerSignupCounts(admin);
  if (counts === null) {
    return errorJson("INTERNAL", "Could not count signups.", 500);
  }

  const sessions = rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    date: row.session_date,
    time: row.session_time,
    location: row.location,
    maxParticipants: row.max_participants,
    signupCount: counts.get(row.id) ?? 0,
  }));

  return json({ sessions });
}

async function handleSignupsCountRead(
  admin: ReturnType<typeof createClient>,
  input: unknown,
): Promise<Response> {
  const v = (input ?? {}) as Record<string, unknown>;
  if (v.sessionId !== undefined && typeof v.sessionId !== "string") {
    return errorJson("BAD_INPUT", "sessionId must be a string.", 400);
  }
  if (v.date !== undefined && (typeof v.date !== "string" || !DATE_PATTERN.test(v.date))) {
    return errorJson("BAD_INPUT", 'date must be a "YYYY-MM-DD" string.', 400);
  }
  if (!v.sessionId && !v.date) {
    return errorJson("BAD_INPUT", "At least one of sessionId or date is required.", 400);
  }

  let sessionId = v.sessionId as string | undefined;

  if (!sessionId) {
    const { data, error } = await admin
      .from("training_sessions")
      .select("id")
      .eq("session_date", v.date as string);
    if (error) {
      console.error("dennis-read signups.count.read date lookup failed", error.message);
      return errorJson("INTERNAL", "Could not resolve session for that date.", 500);
    }
    const rows = data ?? [];
    if (rows.length === 0) {
      return errorJson("NOT_FOUND", "No session found for that date.", 404);
    }
    if (rows.length > 1) {
      // FB.1A-vereiste: nooit stilzwijgend een sessie kiezen bij
      // meerdere kandidaten op dezelfde datum.
      return errorJson("AMBIGUOUS", "Multiple sessions exist on that date — specify sessionId instead.", 409);
    }
    sessionId = rows[0].id as string;
  }

  const { data: sessionRow, error: sessionError } = await admin
    .from("training_sessions")
    .select("id")
    .eq("id", sessionId)
    .maybeSingle();
  if (sessionError) {
    console.error("dennis-read signups.count.read session verify failed", sessionError.message);
    return errorJson("INTERNAL", "Could not verify session.", 500);
  }
  if (!sessionRow) {
    return errorJson("NOT_FOUND", "No session found with that id.", 404);
  }

  const counts = await getPlayerSignupCounts(admin);
  if (counts === null) {
    return errorJson("INTERNAL", "Could not count signups.", 500);
  }

  return json({ sessionId, signupCount: counts.get(sessionId) ?? 0 });
}

// FB.1A-review-fix (punt 5): suggestions.read is bewust NIET
// geïmplementeerd in deze fase — zie het opleverrapport voor de volledige
// onderbouwing. Kernbevinding: `training_focus_suggestions` is in de
// praktijk een per-speler, per-sessie trainer-goedkeuringsworkflow
// (kolommen `session_id`, `status` pending/approved/rejected, `options`)
// — de bestaande admin-UI (`useSuggestions.ts`) toont een suggestie
// altijd sámen met de spelersnaam (`profiles.first_name`), nooit los.
// Een DENNIS-antwoord met suggestietekst maar zonder speler-context zou
// dus geen bruikbare weergave zijn van hoe deze functie daadwerkelijk
// wordt gebruikt — en zou bovendien vaak een lege `suggestion`-tekst
// tonen, omdat het werkelijke antwoord vaak in `options` zit, niet in
// het inmiddels optionele `suggestion`-veld. Aanbevolen: uitstellen tot
// een vervolgfase die bewust ontwerpt met deze context in gedachten,
// in plaats van de oorspronkelijke {id, suggestion, createdAt}-vorm
// geforceerd te implementeren.

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return errorJson("BAD_INPUT", "Only POST is supported.", 405);
  }

  const expected = Deno.env.get("DENNIS_INTEGRATION_KEY") ?? "";
  const provided = req.headers.get("X-Integration-Key") ?? "";

  if (!expected || !provided || !timingSafeEqual(provided, expected)) {
    // FB.1A-review-fix (punt 4): geen hash/prefix/fragment van de
    // aangeboden sleutel meer loggen — alleen aanwezig ja/nee.
    console.log("dennis-read unauthorized", provided ? "key_provided" : "key_missing");
    return errorJson("UNAUTHORIZED", "Missing or invalid integration credentials.", 401);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const capability = String((body as { capability?: string }).capability ?? "");
    const input = (body as { input?: unknown }).input;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    switch (capability) {
      case "sessions.read":
        return await handleSessionsRead(admin, input);
      case "upcoming_sessions":
        // Backward-compatibel alias — mapt op dezelfde, nu gefixte
        // logica als sessions.read met upcoming:true. Nog onbekend of
        // hier een actieve consument van afhangt; zie het bijbehorende
        // opleverrapport voor de aanbeveling dit te verwijderen zodra
        // dat bevestigd is.
        return await handleSessionsRead(admin, { upcoming: true });
      case "signups.count.read":
        return await handleSignupsCountRead(admin, input);
      default:
        return errorJson("BAD_CAPABILITY", `Unknown capability: ${capability}`, 400);
    }
  } catch (e) {
    console.error("dennis-read error", (e as Error).message);
    return errorJson("INTERNAL", "An unexpected error occurred.", 500);
  }
});

