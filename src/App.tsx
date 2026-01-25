import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import TrainingPage from "./pages/TrainingPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ProfilePage from "./pages/ProfilePage";
import SuggestionsPage from "./pages/SuggestionsPage";
import AdminPage from "./pages/AdminPage";
import AdminTrainingsPage from "./pages/admin/AdminTrainingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/inloggen" element={<LoginPage />} />
            <Route path="/aanmelden" element={<SignupPage />} />
            <Route path="/trainingen" element={<TrainingPage />} />
            <Route path="/ranglijst" element={<LeaderboardPage />} />
            <Route path="/profiel" element={<ProfilePage />} />
            <Route path="/suggesties" element={<SuggestionsPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/trainingen" element={<AdminTrainingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
