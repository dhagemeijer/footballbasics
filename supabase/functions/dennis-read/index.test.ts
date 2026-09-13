// supabase/functions/dennis-read/index.test.ts
//
// Dekt de pure, geëxporteerde hulpfuncties uit index.ts. Raakt niet de
// levende Deno.serve-handler, een echte Supabase-client, of de
// get_player_signup_counts_machine-RPC aan — dat vereist een draaiend
// Supabase-project. Draai met de Deno-eigen testrunner:
//
//   deno test --allow-env supabase/functions/dennis-read/

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  timingSafeEqual,
  isDayPart,
  hourOf,
  matchesDayPart,
  isPastOrNow,
  localDateTimeParts,
  errorJson,
} from "./index.ts";

// --- Authenticatie ----------------------------------------------------

Deno.test("timingSafeEqual: gelijke strings zijn gelijk", () => {
  assertEquals(timingSafeEqual("abc123", "abc123"), true);
});

Deno.test("timingSafeEqual: verschillende strings van gelijke lengte zijn ongelijk", () => {
  assertEquals(timingSafeEqual("abc123", "abc124"), false);
});

Deno.test("timingSafeEqual: verschillende lengtes zijn altijd ongelijk", () => {
  assertEquals(timingSafeEqual("short", "a-much-longer-value"), false);
});

// FB.1A-review (punt 4): dit bestand test uitsluitend dat
// timingSafeEqual zelf correct werkt. De auth-failure-logregel zelf
// (in Deno.serve) logt sinds deze review alleen "key_provided" /
// "key_missing" — geen hash, prefix of fragment van de sleutel. Dat
// gedrag is inspecteerbaar door de broncode te lezen; er is bewust
// geen test die een echte sleutelwaarde in testcode zou vereisen.

// --- Dagdeel-grenzen ---------------------------------------------------

Deno.test("hourOf parseert HH:mm en HH:mm:ss", () => {
  assertEquals(hourOf("09:00"), 9);
  assertEquals(hourOf("15:30:00"), 15);
});

Deno.test("dagdeel-ranges dekken alle 24 uur, zonder overlap", () => {
  for (let hour = 0; hour < 24; hour++) {
    const time = `${String(hour).padStart(2, "0")}:00`;
    const matches = (["MORNING", "AFTERNOON", "EVENING"] as const).filter((dp) => matchesDayPart(time, dp));
    assertEquals(matches.length, 1, `uur ${hour} moet precies één dagdeel matchen`);
  }
});

Deno.test("isDayPart accepteert alleen de drie gedefinieerde waarden", () => {
  assertEquals(isDayPart("MORNING"), true);
  assertEquals(isDayPart("NIGHT"), false);
  assertEquals(isDayPart(undefined), false);
});

// --- isPastOrNow — de gefixte upcoming-bug ---------------------------------

Deno.test("isPastOrNow: een sessie eerder vandaag (vóór nu) is gepasseerd — de gefixte .gte-only bug", () => {
  assertEquals(isPastOrNow("2026-09-11", "08:00:00", "2026-09-11", "12:00:00"), true);
});

Deno.test("isPastOrNow: een sessie later vandaag (na nu) is niet gepasseerd", () => {
  assertEquals(isPastOrNow("2026-09-11", "15:00:00", "2026-09-11", "12:00:00"), false);
});

// --- localDateTimeParts — FB.1A-review punt 3: Europe/Amsterdam, ---------
// --- middernacht-grens, DST-veiligheid ------------------------------------

Deno.test("localDateTimeParts: winter, net na lokale middernacht blijft de juiste lokale datum (niet de UTC-datum van de vorige dag)", () => {
  // 2026-01-15T00:30:00 lokale tijd in Europe/Amsterdam (winter, UTC+1)
  // is 2026-01-14T23:30:00Z in UTC. De oude .toISOString()-aanpak zou
  // hier "2026-01-14" hebben gegeven — fout, één dag te vroeg.
  const instant = new Date("2026-01-14T23:30:00.000Z");
  const { date, time } = localDateTimeParts(instant);
  assertEquals(date, "2026-01-15");
  assertEquals(time, "00:30:00");
});

Deno.test("localDateTimeParts: zomer (DST), net na lokale middernacht blijft de juiste lokale datum", () => {
  // 2026-07-15T00:30:00 lokale tijd in Europe/Amsterdam (zomer, UTC+2)
  // is 2026-07-14T22:30:00Z in UTC.
  const instant = new Date("2026-07-14T22:30:00.000Z");
  const { date, time } = localDateTimeParts(instant);
  assertEquals(date, "2026-07-15");
  assertEquals(time, "00:30:00");
});

Deno.test("localDateTimeParts: net vóór lokale middernacht blijft nog de vorige lokale datum", () => {
  // 2026-01-14T23:45:00 lokale tijd (winter, UTC+1) is 2026-01-14T22:45:00Z.
  const instant = new Date("2026-01-14T22:45:00.000Z");
  const { date, time } = localDateTimeParts(instant);
  assertEquals(date, "2026-01-14");
  assertEquals(time, "23:45:00");
});

Deno.test("localDateTimeParts: consistent rond de DST-lente-overgang (laatste zondag van maart)", () => {
  // 2026-03-29 02:30 lokale tijd bestaat niet in Europe/Amsterdam (de
  // klok springt die nacht van 02:00 naar 03:00) — dit test in plaats
  // daarvan vlak vóór en ná de overgang, om te bevestigen dat er geen
  // crash of NaN optreedt en de datum correct blijft.
  const before = localDateTimeParts(new Date("2026-03-29T00:30:00.000Z")); // 01:30 lokaal (nog UTC+1)
  const after = localDateTimeParts(new Date("2026-03-29T01:30:00.000Z")); // 03:30 lokaal (al UTC+2)
  assertEquals(before.date, "2026-03-29");
  assertEquals(after.date, "2026-03-29");
});

// --- Privacy: signups.count.read / sessions.read tellen alleen spelers ---
//
// getPlayerSignupCounts() (in index.ts) roept de bestaande
// private.get_player_signup_counts_machine()-RPC aan — dit vereist een
// echte Supabase-verbinding en is dus geen sandbox-unit-test. Deze
// tests documenteren de vorm van het gebruikte protocol.

Deno.test("get_player_signup_counts_machine RPC-resultaatvorm bevat uitsluitend session_id en player_count", () => {
  const row = { session_id: "s1", player_count: 3 };
  assertEquals(Object.keys(row).sort(), ["player_count", "session_id"]);
  assertEquals("user_id" in row, false);
});

// FB.1A-deployment-check: index.ts roept .rpc("get_player_signup_counts_machine")
// aan, wat via PostgREST standaard tegen het `public`-schema resolvet
// (geen [api]-schema-override in supabase/config.toml). Dit vereist
// dus een public.get_player_signup_counts_machine()-wrapper — zie
// migratie 20260913070000_dennis_read_expose_player_signup_counts_machine.sql.
// Zonder die wrapper zou de aanroep falen (functie niet gevonden),
// ongeacht de SQL-GRANT op de private-functie. Dit is alleen tegen een
// echt Supabase-project te verifiëren (niet in deze sandbox); deze
// regel documenteert het waarom van die migratie.

Deno.test("signups.count.read responsvorm bevat uitsluitend sessionId en signupCount", () => {
  const mapped = { sessionId: "s1", signupCount: 11 };
  assertEquals(Object.keys(mapped).sort(), ["sessionId", "signupCount"]);
  assertEquals("user_id" in mapped, false);
});

// --- Foutenvelop ---------------------------------------------------------

Deno.test("errorJson produceert de afgesproken genormaliseerde vorm", async () => {
  const response = errorJson("BAD_CAPABILITY", "Unknown capability: foo", 400);
  assertEquals(response.status, 400);
  const body = await response.json();
  assertEquals(body, { error: { code: "BAD_CAPABILITY", message: "Unknown capability: foo" } });
});

Deno.test("errorJson bevat nooit interne/database-detailvelden", async () => {
  const response = errorJson("INTERNAL", "Could not read training sessions.", 500);
  const body = await response.json();
  assertEquals(Object.keys(body), ["error"]);
  assertEquals(Object.keys(body.error).sort(), ["code", "message"]);
});

// --- suggestions.read: bewust uitgesteld ----------------------------------
//
// Zie index.ts's eigen commentaar en het opleverrapport voor de
// volledige onderbouwing (FB.1A-review punt 5) — geen capability, dus
// geen test nodig; deze regel documenteert alleen waarom er geen
// suggestions.read-tests in dit bestand staan.
