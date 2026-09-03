import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) {
      return json({ error: "Niet ingelogd" }, 401);
    }

    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);

    if (!(roles ?? []).some((r) => r.role === "admin")) {
      return json({ error: "Geen toegang" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const userId = String((body as { user_id?: string }).user_id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(userId)) {
      return json({ error: "Ongeldige speler" }, 400);
    }
    if (userId === userData.user.id) {
      return json({ error: "Je kunt je eigen account niet verwijderen" }, 400);
    }

    // Profielen ophalen om gerelateerde meldingen op te ruimen
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    await admin.from("session_comments").delete().eq("user_id", userId);
    await admin.from("session_signups").delete().eq("user_id", userId);
    await admin.from("training_focus_suggestions").delete().eq("user_id", userId);
    await admin.from("notifications").delete().eq("user_id", userId);
    await admin.from("notifications").delete().eq("related_id", userId);
    if (profile?.id) {
      await admin.from("notifications").delete().eq("related_id", profile.id);
    }
    await admin.from("user_roles").delete().eq("user_id", userId);

    const { error: profileError } = await admin.from("profiles").delete().eq("user_id", userId);
    if (profileError) {
      console.error("profile delete failed", profileError);
      return json({ error: profileError.message }, 400);
    }

    const { error: authError } = await admin.auth.admin.deleteUser(userId);
    if (authError) {
      console.error("auth delete failed", authError);
      return json({ error: authError.message }, 400);
    }

    return json({ success: true });
  } catch (e) {
    console.error("delete-player error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
