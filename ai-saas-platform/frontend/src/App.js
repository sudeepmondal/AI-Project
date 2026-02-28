import React from "react";
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import CRM from "./pages/CRM";
import SocialConnect from "./pages/SocialConnect";

function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { to: "/dashboard", icon: "📊", label: "Dashboard" },
    { to: "/social", icon: "🔌", label: "Social Connect" },
    { to: "/leads", icon: "👥", label: "Leads" },
    { to: "/crm", icon: "🔗", label: "CRM" },
  ];

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div style={s.app}>
      {/* Sidebar */}
      <div style={s.sidebar}>
        <div style={s.logo}>
          <span>⚡</span>
          <span style={s.logoText}>SocialAI</span>
        </div>
        <nav style={s.nav}>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} style={({ isActive }) => ({ ...s.navItem, ...(isActive ? s.navActive : {}) })}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div style={s.userSection}>
          <div style={s.userInfo}>
            <div style={s.avatar}>{user?.name?.[0] || "U"}</div>
            <div>
              <div style={s.userName}>{user?.name}</div>
              <div style={s.userEmail}>{user?.email}</div>
            </div>
          </div>
          <button style={s.logoutBtn} onClick={handleLogout}>Sign Out</button>
        </div>
      </div>
      {/* Main content */}
      <div style={s.main}>{children}</div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ color: "#fff", padding: 40 }}>Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/social" element={<SocialConnect />} />
                  <Route path="/leads" element={<Leads />} />
                  <Route path="/crm" element={<CRM />} />
                  <Route path="*" element={<Navigate to="/dashboard" />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

const s = {
  app: { display: "flex", height: "100vh", background: "#0f172a", fontFamily: "'Segoe UI', sans-serif", overflow: "hidden" },
  sidebar: { width: 220, background: "rgba(255,255,255,0.03)", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", padding: "20px 0", flexShrink: 0 },
  logo: { display: "flex", alignItems: "center", gap: 10, padding: "0 20px 24px", fontSize: 20 },
  logoText: { fontWeight: 800, background: "linear-gradient(90deg, #a78bfa, #60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  nav: { flex: 1, display: "flex", flexDirection: "column", gap: 4, padding: "0 10px" },
  navItem: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, color: "#64748b", textDecoration: "none", fontSize: 13, fontWeight: 500, transition: "all 0.2s" },
  navActive: { background: "rgba(124,58,237,0.2)", color: "#a78bfa" },
  userSection: { padding: "16px 16px 0", borderTop: "1px solid rgba(255,255,255,0.06)" },
  userInfo: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 },
  avatar: { width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14 },
  userName: { fontSize: 13, fontWeight: 600, color: "#e2e8f0" },
  userEmail: { fontSize: 11, color: "#475569" },
  logoutBtn: { width: "100%", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "8px", color: "#f87171", fontSize: 12, cursor: "pointer" },
  main: { flex: 1, overflow: "auto" }
};