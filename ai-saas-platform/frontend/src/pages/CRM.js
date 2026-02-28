import React, { useState, useEffect } from "react";
import axios from "axios";

export default function CRM() {
  const [contacts, setContacts] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  useEffect(() => { fetchContacts(); }, []);

  const fetchContacts = async () => {
    const res = await axios.get("/api/crm/contacts");
    setContacts(res.data);
  };

  const syncCRM = async () => {
    setSyncing(true);
    const res = await axios.post("/api/crm/sync");
    setSyncResult(res.data);
    await fetchContacts();
    setSyncing(false);
  };

  const tagColor = { hot: "#ef4444", warm: "#f59e0b", cold: "#60a5fa" };

  return (
    <div style={s.wrap}>
      <h1 style={s.h1}>🔗 CRM Integration</h1>

      <div style={s.banner}>
        <div>
          <div style={s.bannerTitle}>Auto-Sync Hot & Warm Leads</div>
          <div style={s.bannerSub}>Automatically push qualified leads to your CRM system</div>
        </div>
        <button style={{ ...s.btn, opacity: syncing ? 0.6 : 1 }} onClick={syncCRM} disabled={syncing}>
          {syncing ? "⏳ Syncing..." : "🔄 Sync Now"}
        </button>
      </div>

      {syncResult && (
        <div style={s.alert}>
          ✅ Synced <strong>{syncResult.synced}</strong> new contacts. Total in CRM: <strong>{syncResult.total_contacts}</strong>
        </div>
      )}

      <div style={s.card}>
        <h3 style={s.cardTitle}>CRM Contacts ({contacts.length})</h3>
        {contacts.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: 14 }}>No contacts yet. Create leads from the Dashboard and sync them here.</p>
        ) : (
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                <th>Name</th><th>Platform</th><th>Lead Score</th><th>Messages</th><th>Synced At</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map(c => (
                <tr key={c.id} style={s.tr}>
                  <td style={s.tdName}>{c.name}</td>
                  <td style={s.td}>{c.platform}</td>
                  <td style={s.td}>
                    <span style={{ ...s.tag, background: tagColor[c.lead_score] + "22", color: tagColor[c.lead_score] }}>
                      {c.lead_score?.toUpperCase()}
                    </span>
                  </td>
                  <td style={s.td}>{c.message_count}</td>
                  <td style={s.tdSm}>{c.synced_at ? new Date(c.synced_at).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* CRM Architecture Info */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>📡 Data Flow Architecture</h3>
        <div style={s.flow}>
          {["Social Media Messages", "AI Analysis Agent", "Lead Classification", "CRM Database", "Sales Team"].map((step, i, arr) => (
            <React.Fragment key={i}>
              <div style={s.flowBox}>{step}</div>
              {i < arr.length - 1 && <div style={s.arrow}>→</div>}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

const s = {
  wrap: { padding: 24, color: "#e2e8f0", maxWidth: 1000 },
  h1: { fontSize: 24, fontWeight: 800, marginBottom: 24 },
  banner: { background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(59,130,246,0.3))", border: "1px solid rgba(124,58,237,0.4)", borderRadius: 16, padding: 24, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  bannerTitle: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  bannerSub: { fontSize: 13, color: "#94a3b8" },
  btn: { background: "linear-gradient(135deg, #7c3aed, #3b82f6)", color: "#fff", border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  alert: { background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#6ee7b7" },
  card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24, marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: 700, marginBottom: 16 },
  table: { width: "100%", borderCollapse: "collapse" },
  thead: { fontSize: 12, color: "#64748b", textAlign: "left" },
  tr: { borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 13 },
  tdName: { padding: "12px 8px", fontWeight: 600, color: "#f1f5f9" },
  td: { padding: "12px 8px", color: "#94a3b8" },
  tdSm: { padding: "12px 8px", color: "#64748b", fontSize: 11 },
  tag: { padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 },
  flow: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  flowBox: { background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 8, padding: "8px 14px", fontSize: 12, color: "#a78bfa" },
  arrow: { color: "#475569", fontSize: 16 }
};