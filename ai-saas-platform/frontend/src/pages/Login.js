import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: "", email: "demo@company.com", password: "demo1234" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    }
    setLoading(false);
  };

  return (
    <div style={styles.bg}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>⚡</span>
          <span style={styles.logoText}>SocialAI</span>
        </div>
        <h2 style={styles.title}>{isLogin ? "Welcome back" : "Get started"}</h2>
        <p style={styles.sub}>{isLogin ? "Sign in to your dashboard" : "Create your free account"}</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handle}>
          {!isLogin && (
            <div style={styles.field}>
              <label style={styles.label}>Company Name</label>
              <input style={styles.input} placeholder="Acme Inc." value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
          )}
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input style={styles.input} type="email" placeholder="you@company.com" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input style={styles.input} type="password" placeholder="••••••••" value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} required />
          </div>

          <button style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
            {loading ? "Please wait..." : isLogin ? "Sign In →" : "Create Account →"}
          </button>
        </form>

        <p style={styles.switchText}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span style={styles.link} onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Sign up" : "Sign in"}
          </span>
        </p>

        <div style={styles.demo}>
          <strong>Demo credentials:</strong> demo@company.com / demo1234
        </div>
      </div>
    </div>
  );
}

const styles = {
  bg: { minHeight: "100vh", background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif" },
  card: { background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "40px", width: "100%", maxWidth: 420, color: "#fff" },
  logo: { display: "flex", alignItems: "center", gap: 10, marginBottom: 30 },
  logoIcon: { fontSize: 28 },
  logoText: { fontSize: 24, fontWeight: 800, background: "linear-gradient(90deg, #a78bfa, #60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  title: { fontSize: 28, fontWeight: 700, margin: "0 0 8px" },
  sub: { color: "rgba(255,255,255,0.6)", marginBottom: 24, fontSize: 14 },
  error: { background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.5)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#fca5a5" },
  field: { marginBottom: 16 },
  label: { display: "block", fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 6 },
  input: { width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" },
  btn: { width: "100%", background: "linear-gradient(135deg, #7c3aed, #3b82f6)", color: "#fff", border: "none", borderRadius: 10, padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 8 },
  switchText: { textAlign: "center", marginTop: 20, fontSize: 13, color: "rgba(255,255,255,0.6)" },
  link: { color: "#a78bfa", cursor: "pointer", fontWeight: 600 },
  demo: { background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 8, padding: "10px 14px", marginTop: 20, fontSize: 12, color: "rgba(255,255,255,0.6)", textAlign: "center" }
};