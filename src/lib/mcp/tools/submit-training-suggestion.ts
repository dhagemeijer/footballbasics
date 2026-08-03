import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "submit_training_suggestion",
  title: "Submit a training focus suggestion",
  description: "Submit a suggestion for what a Football Basics training should focus on, optionally tied to a session.",
  inputSchema: {
    suggestion: z.string().describe("The training focus suggestion text."),
    session_id: z.string().optional().describe("Optional id of the session the suggestion relates to."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ suggestion, session_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const text = suggestion.trim();
    if (!text) return { content: [{ type: "text", text: "Suggestion cannot be empty." }], isError: true };

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("training_focus_suggestions")
      .insert({ user_id: ctx.getUserId(), suggestion: text, session_id: session_id ?? null })
      .select()
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: "Suggestion submitted." }],
      structuredContent: { suggestion: data },
    };
  },
});
