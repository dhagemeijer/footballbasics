import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listTrainingSessionsTool from "./tools/list-training-sessions";
import signUpForTrainingTool from "./tools/sign-up-for-training";
import getMyStatsTool from "./tools/get-my-stats";
import submitTrainingSuggestionTool from "./tools/submit-training-suggestion";
import getLeaderboardTool from "./tools/get-leaderboard";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "football-basics",
  title: "Football Basics",
  version: "0.1.0",
  instructions:
    "Tools for the Football Basics training app. List training sessions, sign the signed-in player up for a session, read their stats, view the leaderboard, and submit training focus suggestions. All tools act as the authenticated player.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listTrainingSessionsTool,
    signUpForTrainingTool,
    getMyStatsTool,
    getLeaderboardTool,
    submitTrainingSuggestionTool,
  ],
});
