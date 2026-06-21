import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import TopNav from "./components/TopNav";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Pipeline from "./pages/Pipeline";
import ReviewQueue from "./pages/ReviewQueue";
import Account from "./pages/Account";
import Pricing from "./pages/Pricing";
import Schedules from "./pages/Schedules";
import ImageGen from "./pages/ImageGen";
import LegalPage from "./pages/Legal";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-2 border-[var(--raven)] border-t-transparent animate-spin" />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function AuthRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-2 border-[var(--raven)] border-t-transparent animate-spin" />
    </div>
  );
  return user ? <Navigate to="/dashboard" replace /> : children;
}

function AppRoutes() {
  return (
    <>
      <TopNav />
      <Routes>
        {/* Public */}
        <Route path="/"         element={<Landing />} />
        <Route path="/pricing"  element={<Pricing />} />
        <Route path="/legal/:page" element={<LegalPage />} />

        {/* Auth */}
        <Route path="/login"    element={<AuthRoute><Login /></AuthRoute>} />
        <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />

        {/* Protected */}
        <Route path="/dashboard"   element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/pipeline"    element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
        <Route path="/review"      element={<ProtectedRoute><ReviewQueue /></ProtectedRoute>} />
        <Route path="/review/:runId" element={<ProtectedRoute><ReviewQueue /></ProtectedRoute>} />
        <Route path="/image-gen"   element={<ProtectedRoute><ImageGen /></ProtectedRoute>} />
        <Route path="/schedules"   element={<ProtectedRoute><Schedules /></ProtectedRoute>} />
        <Route path="/account"     element={<ProtectedRoute><Account /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            fontFamily: "'Outfit', sans-serif",
            fontSize: "14px",
          }
        }}
      />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
