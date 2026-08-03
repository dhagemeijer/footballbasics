import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "sign_up_for_training",
  title: "Sign up for a training session",
  description: "Sign the current player up for a Football Basics training session by session id.",
  inputSchema: {
    session_id: z.string().describe("The id of the training session to join."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ session_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();

    const { data: existing } = await supabase
      .from("session_signups")
      .select("id")
      .eq("session_id", session_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      return { content: [{ type: "text", text: "Already signed up for this session." }] };
    }

    const { data, error } = await supabase
      .from("session_signups")
      .insert({ session_id, user_id: userId })
      .select()
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Signed up for session ${session_id}.` }],
      structuredContent: { signup: data },
    };
  },
});
