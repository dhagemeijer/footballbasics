import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Niet ingelogd" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);

    const allowed = (roles ?? []).some((r) => r.role === "admin" || r.role === "trainer");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Geen toegang" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const firstName = String(body.first_name ?? "").trim();
    const avatarId = Number(body.avatar_id ?? 1);

    const PACKAGES: Record<string, { quota: number; trainer: boolean }> = {
      woensdag_los: { quota: 2, trainer: false },
      zondag_los: { quota: 2, trainer: false },
      woensdag_5: { quota: 6, trainer: false },
      zondag_5: { quota: 6, trainer: false },
      woensdag_10: { quota: 11, trainer: false },
      zondag_10: { quota: 11, trainer: false },
      trainer: { quota: 0, trainer: true },
    };
    const packageKey = String(body.package ?? "woensdag_10");
    const pkg = PACKAGES[packageKey];
    if (!pkg) {
      return new Response(JSON.stringify({ error: "Ongeldig pakket" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sessionQuota = pkg.quota;

    if (!username || !password || !firstName) {
      return new Response(JSON.stringify({ error: "Vul alle velden in" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "Wachtwoord moet minimaal 6 tekens zijn" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: `${username}@footballbasics.app`,
      password,
      email_confirm: true,
    });

    if (createError || !created.user) {
      return new Response(JSON.stringify({ error: createError?.message ?? "Aanmaken mislukt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: profileError } = await admin.from("profiles").insert({
      user_id: created.user.id,
      username,
      first_name: firstName,
      avatar_id: avatarId,
      session_quota: sessionQuota,
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (pkg.trainer) {
      await admin.from("user_roles").insert({ user_id: created.user.id, role: "trainer" });
    }

    return new Response(JSON.stringify({ success: true, user_id: created.user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
