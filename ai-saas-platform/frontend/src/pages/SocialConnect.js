import React, { useState } from "react";
import axios from "axios";

const PLATFORMS = [
  { id: "facebook", name: "Facebook", icon: "📘", color: "#1877f2", desc: "Connect your Facebook Business Page" },
  { id: "instagram", name: "Instagram", icon: "📸", color: "#e1306c", desc: "Connect your Instagram Business account" },
  { id: "twitter", name: "Twitter / X", icon: "🐦", color: "#1da1f2", desc: "Connect your Twitter/X profile" },
  { id: "linkedin", name: "LinkedIn", icon: "💼", color: "#0077b5", desc: "Connect your LinkedIn Company Page" },
];

export default function SocialConnect() {
  const [connected, setConnected] = useState({});
  const [connecting, setConnecting] = useState(null);

  const connect = async (platformId) => {
    setConnecting(platformId);
    try {
      const res = await axios.post("/api/social/connect", { platform: platformId });
      setConnected(prev => ({ ...prev, [platformId]: res.data }));
    } catch (e) { alert("Connection failed"); }
    setConnecting(null);
  };

  const disconnect = (platformId) => {
    setConnected(prev => { const n = { ...prev }; delete n[platformId]; return n; });
  };

  return (
    <div style={s.wrap}>
      <h1 style={s.h1}>🔌 Social Media Connections</h1>
      <p style={s.sub}>Connect your social media pages to enable AI-powered auto-replies and lead tracking.</p>

      <div style={s.grid}>
        {PLATFORMS.map(p => {
          const isConn = connected[p.id];
          const isConnecting = connecting === p.id;
          return (
            <div key={p.id} style={{ ...s.card, borderColor: isConn ? p.color + "55" : "rgba(255,255,255,0.08)" }}>
              <div style={s.cardTop}>
                <span style={s.icon}>{p.icon}</span>
                <div>
                  <div style={s.name}>{p.name}</div>
                  <div style={s.desc}>{p.desc}</div>
                </div>
                <div style={{ ...s.badge, background: isConn ? "#10b981" + "22" : "rgba(255,255,255,0.05)", color: isConn ? "#10b981" : "#64748b" }}>
                  {isConn ? "✓ Connected" : "Disconnected"}
                </div>
              </div>
              {isConn && (
                <div style={s.connInfo}>
                  Connected as: <strong style={{ color: "#a78bfa" }}>{isConn.account}</strong>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                {!isConn ? (
                  <button style={{ ...s.btn, background: p.color, opacity: isConnecting ? 0.7 : 1 }}
                    onClick={() => connect(p.id)} disabled={isConnecting}>
                    {isConnecting ? "Connecting..." : `Connect ${p.name}`}
                  </button>
                ) : (
                  <button style={s.btnOutline} onClick={() => disconnect(p.id)}>Disconnect</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={s.infoCard}>
        <h3 style={s.infoTitle}>🔐 Security & Privacy</h3>
        <ul style={s.list}>
          <li>All OAuth tokens are encrypted and stored securely</li>
          <li>We only request minimum required permissions (read messages, send replies)</li>
          <li>You can disconnect any platform at any time</li>
          <li>Data is processed in real-time and not stored permanently unless you opt-in</li>
          <li>Compliant with GDPR and platform-specific data policies</li>
        </ul>
      </div>
    </div>
  );
}

const s = {
  wrap: { padding: 24, color: "#e2e8f0", maxWidth: 900 },
  h1: { fontSize: 24, fontWeight: 800, marginBottom: 8 },
  sub: { color: "#64748b", marginBottom: 28, fontSize: 14 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 16, marginBottom: 24 },
  card: { background: "rgba(255,255,255,0.04)", border: "1px solid", borderRadius: 16, padding: 20 },
  cardTop: { display: "flex", alignItems: "center", gap: 14 },
  icon: { fontSize: 32 },
  name: { fontWeight: 700, fontSize: 16, color: "#f1f5f9" },
  desc: { fontSize: 12, color: "#64748b", marginTop: 2 },
  badge: { marginLeft: "auto", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  connInfo: { marginTop: 12, background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#94a3b8" },
  btn: { color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnOutline: { background: "transparent", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171", borderRadius: 8, padding: "10px 20px", fontSize: 13, cursor: "pointer" },
  infoCard: { background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 16, padding: 24 },
  infoTitle: { fontSize: 16, fontWeight: 700, marginBottom: 12, color: "#6ee7b7" },
  list: { color: "#94a3b8", fontSize: 13, lineHeight: 2.2, paddingLeft: 20 }
};