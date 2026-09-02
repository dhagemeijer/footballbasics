import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

Deno.serve(async () => {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const username = `diagtest${Date.now()}`;
  const steps: Record<string, unknown> = {};

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: `${username}@footballbasics.app`,
    password: "diagtest123",
    email_confirm: true,
  });
  steps.createError = createError?.message ?? null;

  if (created?.user) {
    const { error: profileError } = await admin.from("profiles").insert({
      user_id: created.user.id,
      username,
      first_name: "Diag",
      avatar_id: 1,
      session_quota: 6,
    });
    steps.profileError = profileError
      ? { message: profileError.message, details: profileError.details, hint: profileError.hint, code: profileError.code }
      : null;
    await admin.auth.admin.deleteUser(created.user.id);
  }

  return new Response(JSON.stringify(steps), { headers: { "Content-Type": "application/json" } });
});
