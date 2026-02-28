import React, { useState, useEffect } from "react";
import axios from "axios";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [messages, setMessages] = useState([]);
  const [simulating, setSimulating] = useState(false);
  const [simForm, setSimForm] = useState({ platform: "facebook", sender: "John Doe", message: "Hi, I want to buy your product! What's the price?" });
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [s, m] = await Promise.all([
      axios.get("/api/dashboard/stats"),
      axios.get("/api/messages")
    ]);
    setStats(s.data);
    setMessages(m.data.slice(0, 5));
  };

  const simulateMessage = async () => {
    setSimulating(true);
    try {
      const res = await axios.post("/api/messages/simulate", {
        platform: simForm.platform,
        sender: simForm.sender,
        message: simForm.message
      });
      setLastResult(res.data);
      await fetchAll();
    } catch (e) { alert("Error: " + (e.response?.data?.error || e.message)); }
    setSimulating(false);
  };

  const tagColors = { hot: "#ef4444", warm: "#f59e0b", cold: "#60a5fa" };

  return (
    <div style={s.wrap}>
      <h1 style={s.h1}>📊 Dashboard Overview</h1>

      {/* Stats Grid */}
      <div style={s.statsGrid}>
        {stats && [
          { label: "Total Messages", value: stats.total_messages, icon: "💬", color: "#7c3aed" },
          { label: "Total Leads", value: stats.total_leads, icon: "👥", color: "#2563eb" },
          { label: "Hot Leads 🔥", value: stats.hot_leads, icon: "🔥", color: "#ef4444" },
          { label: "Auto-Reply Rate", value: stats.reply_rate + "%", icon: "🤖", color: "#10b981" },
        ].map((stat, i) => (
          <div key={i} style={{ ...s.statCard, borderTop: `3px solid ${stat.color}` }}>
            <div style={s.statIcon}>{stat.icon}</div>
            <div style={{ ...s.statValue, color: stat.color }}>{stat.value}</div>
            <div style={s.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Lead Distribution */}
      {stats && (
        <div style={s.card}>
          <h3 style={s.cardTitle}>Lead Distribution</h3>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[
              { tag: "hot", count: stats.hot_leads, label: "Hot Leads" },
              { tag: "warm", count: stats.warm_leads, label: "Warm Leads" },
              { tag: "cold", count: stats.cold_leads, label: "Cold Leads" },
            ].map(({ tag, count, label }) => (
              <div key={tag} style={{ flex: 1, minWidth: 100, background: tagColors[tag] + "22", border: `1px solid ${tagColors[tag]}44`, borderRadius: 12, padding: "16px", textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: tagColors[tag] }}>{count}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Simulate Message */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>🧪 Simulate Incoming Message</h3>
        <p style={s.cardSub}>Test the AI pipeline: message → analysis → auto-reply → lead tagging</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <select style={s.select} value={simForm.platform} onChange={e => setSimForm({ ...simForm, platform: e.target.value })}>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="twitter">Twitter/X</option>
            <option value="linkedin">LinkedIn</option>
          </select>
          <input style={{ ...s.input, flex: 1 }} placeholder="Sender name" value={simForm.sender}
            onChange={e => setSimForm({ ...simForm, sender: e.target.value })} />
        </div>
        <textarea style={s.textarea} rows={3} placeholder="Type a message..."
          value={simForm.message} onChange={e => setSimForm({ ...simForm, message: e.target.value })} />
        <button style={{ ...s.btn, opacity: simulating ? 0.6 : 1 }} onClick={simulateMessage} disabled={simulating}>
          {simulating ? "⏳ AI Processing..." : "🚀 Send & Analyze"}
        </button>

        {lastResult && (
          <div style={s.result}>
            <div style={s.resultRow}>
              <span style={s.resultLabel}>Sentiment:</span>
              <span style={{ color: lastResult.analysis?.sentiment === "positive" ? "#10b981" : lastResult.analysis?.sentiment === "negative" ? "#ef4444" : "#94a3b8" }}>
                {lastResult.analysis?.sentiment}
              </span>
            </div>
            <div style={s.resultRow}>
              <span style={s.resultLabel}>Intent:</span>
              <span style={{ color: "#f59e0b" }}>{lastResult.analysis?.intent}</span>
            </div>
            <div style={s.resultRow}>
              <span style={s.resultLabel}>Lead Tag:</span>
              <span style={{ background: tagColors[lastResult.lead_tag] + "33", color: tagColors[lastResult.lead_tag], padding: "2px 10px", borderRadius: 20, fontWeight: 700 }}>
                {lastResult.lead_tag?.toUpperCase()}
              </span>
            </div>
            <div style={{ ...s.resultRow, flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
              <span style={s.resultLabel}>🤖 AI Reply:</span>
              <span style={{ color: "#e2e8f0", lineHeight: 1.5 }}>{lastResult.ai_reply}</span>
            </div>
          </div>
        )}
      </div>

      {/* Recent Messages */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>💬 Recent Messages</h3>
        {messages.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: 14 }}>No messages yet. Simulate one above!</p>
        ) : (
          messages.map(msg => (
            <div key={msg.id} style={s.msgRow}>
              <div style={s.platform}>{msg.platform}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: "#e2e8f0", fontSize: 13 }}>{msg.sender_name}</div>
                <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>{msg.content}</div>
                {msg.ai_reply && <div style={{ color: "#818cf8", fontSize: 11, marginTop: 4 }}>🤖 {msg.ai_reply.slice(0, 80)}...</div>}
              </div>
              <div style={{ fontSize: 11, color: "#475569" }}>{msg.sentiment}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const s = {
  wrap: { padding: "24px", color: "#e2e8f0", maxWidth: 900 },
  h1: { fontSize: 24, fontWeight: 800, marginBottom: 24, color: "#f1f5f9" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 },
  statCard: { background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: "20px", textAlign: "center" },
  statIcon: { fontSize: 24, marginBottom: 8 },
  statValue: { fontSize: 32, fontWeight: 800 },
  statLabel: { fontSize: 12, color: "#64748b", marginTop: 4 },
  card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24, marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#f1f5f9" },
  cardSub: { fontSize: 13, color: "#64748b", marginBottom: 16 },
  input: { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 13, outline: "none" },
  select: { background: "#1e293b", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 13 },
  textarea: { width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 13, resize: "vertical", boxSizing: "border-box", marginBottom: 12 },
  btn: { background: "linear-gradient(135deg, #7c3aed, #3b82f6)", color: "#fff", border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  result: { marginTop: 16, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 10 },
  resultRow: { display: "flex", alignItems: "center", gap: 10 },
  resultLabel: { color: "#64748b", fontSize: 12, minWidth: 80 },
  msgRow: { display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" },
  platform: { background: "rgba(124,58,237,0.2)", color: "#a78bfa", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600, height: "fit-content" }
};