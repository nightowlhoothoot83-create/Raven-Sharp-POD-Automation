import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import "@/App.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import AuthCallback from "./pages/AuthCallback";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import PodSuite from "./pages/PodSuite";
import ImageGen from "./pages/ImageGen";
import Optimiser from "./pages/Optimiser";
import ContentEngine from "./pages/ContentEngine";
import Pricing from "./pages/Pricing";
import Account from "./pages/Account";

function Protected({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--muted)] font-mono text-xs uppercase tracking-widest">Loading...</div>
      </div>
    );
  }
  if (!user) {
    // Save intended path
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  return children;
}

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/pod-suite" element={<Protected><PodSuite /></Protected>} />
        <Route path="/image-gen" element={<Protected><ImageGen /></Protected>} />
        <Route path="/optimiser" element={<Protected><Optimiser /></Protected>} />
        <Route path="/content" element={<Protected><ContentEngine /></Protected>} />
        <Route path="/account" element={<Protected><Account /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRouter />
        <Toaster position="top-right" theme="dark" />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
