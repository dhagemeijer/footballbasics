import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

Deno.serve(async () => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const username = `diagadmin${Date.now()}`;
  const out: Record<string, unknown> = {};

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: `${username}@footballbasics.app`,
    password: "diagtest123",
    email_confirm: true,
  });
  if (createError || !created.user) {
    return new Response(JSON.stringify({ createError: createError?.message }), { status: 200 });
  }
  const uid = created.user.id;
  await admin.from("profiles").insert({ user_id: uid, username, first_name: "Diag", avatar_id: 1, session_quota: 6 });
  await admin.from("user_roles").insert({ user_id: uid, role: "admin" });

  const pub = createClient(url, anonKey);
  const { data: signIn, error: signInError } = await pub.auth.signInWithPassword({
    email: `${username}@footballbasics.app`,
    password: "diagtest123",
  });
  out.signInError = signInError?.message ?? null;

  if (signIn?.session) {
    const res = await fetch(`${url}/functions/v1/create-player`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${signIn.session.access_token}`,
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        first_name: "Proefje",
        username: `proefje${Date.now()}`,
        password: "proefje123",
        avatar_id: 1,
        package: "woensdag_5",
      }),
    });
    out.status = res.status;
    out.body = await res.text();
  }

  // cleanup created admin + any player created by the call
  if (out.body) {
    try {
      const parsed = JSON.parse(String(out.body));
      if (parsed.user_id) {
        await admin.from("profiles").delete().eq("user_id", parsed.user_id);
        await admin.auth.admin.deleteUser(parsed.user_id);
      }
    } catch (_) { /* ignore */ }
  }
  await admin.from("profiles").delete().eq("user_id", uid);
  await admin.auth.admin.deleteUser(uid);

  return new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json" } });
});
