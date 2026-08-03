import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_training_sessions",
  title: "List training sessions",
  description: "List upcoming or past Football Basics training sessions with date, time, location and title.",
  inputSchema: {
    upcoming_only: z.boolean().optional().describe("Only return sessions from today onwards. Defaults to true."),
    limit: z.number().int().optional().describe("Maximum number of sessions to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ upcoming_only, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("training_sessions")
      .select("id, title, description, session_date, session_time, location, max_participants, is_completed")
      .order("session_date", { ascending: true })
      .limit(Math.min(Math.max(limit ?? 20, 1), 100));

    if (upcoming_only !== false) {
      query = query.gte("session_date", new Date().toISOString().slice(0, 10));
    }

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { sessions: data ?? [] },
    };
  },
});
