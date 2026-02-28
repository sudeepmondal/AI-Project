import React, { useState, useEffect } from "react";
import axios from "axios";

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLeads(); }, [filter]);

  const fetchLeads = async () => {
    setLoading(true);
    const url = filter === "all" ? "/api/leads" : `/api/leads?tag=${filter}`;
    const res = await axios.get(url);
    setLeads(res.data);
    setLoading(false);
  };

  const updateTag = async (id, tag) => {
    await axios.put(`/api/leads/${id}/tag`, { tag });
    fetchLeads();
  };

  const tagColor = { hot: "#ef4444", warm: "#f59e0b", cold: "#60a5fa" };
  const platformIcon = { facebook: "📘", instagram: "📸", twitter: "🐦", linkedin: "💼" };

  return (
    <div style={s.wrap}>
      <h1 style={s.h1}>👥 Lead Management</h1>

      {/* Filter Tabs */}
      <div style={s.tabs}>
        {["all", "hot", "warm", "cold"].map(t => (
          <button key={t} onClick={() => setFilter(t)}
            style={{ ...s.tab, ...(filter === t ? s.tabActive : {}) }}>
            {t === "all" ? "All Leads" : `${t === "hot" ? "🔥" : t === "warm" ? "☀️" : "❄️"} ${t.charAt(0).toUpperCase() + t.slice(1)}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={s.empty}>Loading...</div>
      ) : leads.length === 0 ? (
        <div style={s.empty}>No {filter !== "all" ? filter : ""} leads yet. Simulate messages from the Dashboard!</div>
      ) : (
        <div style={s.table}>
          <div style={s.tableHeader}>
            <span>Name</span>
            <span>Platform</span>
            <span>Messages</span>
            <span>Last Active</span>
            <span>Tag</span>
            <span>Actions</span>
          </div>
          {leads.map(lead => (
            <div key={lead.id} style={s.tableRow}>
              <span style={s.name}>{lead.name}</span>
              <span style={s.cell}>{platformIcon[lead.platform] || "🌐"} {lead.platform}</span>
              <span style={s.cell}>{lead.message_count}</span>
              <span style={s.cellSm}>{lead.last_interaction ? new Date(lead.last_interaction).toLocaleDateString() : "—"}</span>
              <span>
                <span style={{ ...s.tag, background: tagColor[lead.tag] + "22", color: tagColor[lead.tag], border: `1px solid ${tagColor[lead.tag]}55` }}>
                  {lead.tag?.toUpperCase()}
                </span>
              </span>
              <span style={{ display: "flex", gap: 6 }}>
                {["hot", "warm", "cold"].filter(t => t !== lead.tag).map(t => (
                  <button key={t} style={{ ...s.tagBtn, borderColor: tagColor[t], color: tagColor[t] }}
                    onClick={() => updateTag(lead.id, t)}>
                    → {t}
                  </button>
                ))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { padding: 24, color: "#e2e8f0", maxWidth: 1000 },
  h1: { fontSize: 24, fontWeight: 800, marginBottom: 24 },
  tabs: { display: "flex", gap: 8, marginBottom: 20 },
  tab: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 16px", color: "#94a3b8", cursor: "pointer", fontSize: 13 },
  tabActive: { background: "rgba(124,58,237,0.3)", borderColor: "rgba(124,58,237,0.6)", color: "#a78bfa" },
  empty: { color: "#64748b", fontSize: 14, padding: 40, textAlign: "center" },
  table: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden" },
  tableHeader: { display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1.5fr 1fr 2fr", padding: "12px 20px", background: "rgba(255,255,255,0.05)", fontSize: 12, color: "#64748b", fontWeight: 600 },
  tableRow: { display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1.5fr 1fr 2fr", padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.05)", alignItems: "center", fontSize: 13 },
  name: { fontWeight: 600, color: "#f1f5f9" },
  cell: { color: "#94a3b8" },
  cellSm: { color: "#64748b", fontSize: 11 },
  tag: { padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 },
  tagBtn: { background: "transparent", border: "1px solid", borderRadius: 6, padding: "3px 8px", fontSize: 11, cursor: "pointer" }
};