import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

Deno.serve(async () => {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const ids = [
    "2e088a4e-d88e-44bd-82a1-241651e1d068",
    "008f8d84-78c2-44dd-8cec-43382b604b33",
    "9e7d4eb8-591b-4aa0-b977-37c7afd3b2b1",
    "8738ee1f-7f27-4100-90ca-ad920686b5c1",
    "38fed7ee-4700-4ef8-96a7-988c6655e987",
    "61bd08ab-22d5-42c9-9696-023c2d9c7b46",
    "9bfe9bc9-75d9-4b0c-92b6-82207b10700d",
    "a1236509-5439-475e-ab77-caba7ae481f3",
    "03125831-ae94-495c-93ca-f1778d616142",
    "1ab56240-d519-42fb-842c-102e69826a93",
    "ae00121d-f439-4d3f-b2cb-497ea2527a1b",
    "e3cdecde-2d8d-4579-82a4-43b6531c359c",
    "e72b1c0f-0fad-4087-bfa0-390b0ab0a410",
    "7086eece-5e38-4bf8-8a78-aa95cb356222",
  ];

  const results: Record<string, string> = {};
  for (const id of ids) {
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("user_id", id)
      .maybeSingle();
    if (profile) {
      results[id] = "skipped (has profile)";
      continue;
    }
    const { error } = await admin.auth.admin.deleteUser(id);
    results[id] = error ? `error: ${error.message}` : "deleted";
  }

  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" },
  });
});
