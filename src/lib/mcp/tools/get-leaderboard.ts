import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_leaderboard",
  title: "Get the player leaderboard",
  description: "Get the Football Basics player ranking by sessions attended or crossbars hit.",
  inputSchema: {
    sort_by: z.enum(["sessions_attended", "crossbars_hit"]).optional().describe("Ranking metric, defaults to sessions_attended."),
    limit: z.number().int().optional().describe("Number of players to return (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ sort_by, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const column = sort_by ?? "sessions_attended";
    const { data, error } = await supabase
      .from("profiles")
      .select("username, first_name, sessions_attended, crossbars_hit")
      .order(column, { ascending: false })
      .limit(Math.min(Math.max(limit ?? 10, 1), 100));

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { leaderboard: data ?? [] },
    };
  },
});
