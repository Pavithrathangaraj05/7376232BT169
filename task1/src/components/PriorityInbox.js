import { useState, useEffect, useCallback } from "react";

const API_URL = "http://4.224.186.213/evaluation-service/notifications";
const TOKEN =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJwYXZpdGhyYS5idDIzQGJpdHNhdGh5LmFjLmluIiwiZXhwIjoxNzc4MjM0OTYwLCJpYXQiOjE3NzgyMzQwNjAsImlzcyI6IkFmZm9yZCBNZWRpY2FsIFRlY2hub2xvZ2llcyBQcml2YXRlIExpbWl0ZWQiLCJqdGkiOiI2NzcyNGQ4Ni1iZWNkLTRkOGQtOGJjMS1kODdkODZiYzFiM2MiLCJsb2NhbGUiOiJlbi1JTiIsIm5hbWUiOiJwYXZpdGhyYSIsInN1YiI6ImJlM2E1YzQyLWRmMWUtNDVkZS05NTUwLThkYTM4ZDQ4ODA0NyJ9LCJlbWFpbCI6InBhdml0aHJhLmJ0MjNAYml0c2F0aHkuYWMuaW4iLCJuYW1lIjoicGF2aXRocmEiLCJyb2xsTm8iOiI3Mzc2MjMyYnQxNjkiLCJhY2Nlc3NDb2RlIjoidUthSmZtIiwiY2xpZW50SUQiOiJiZTNhNWM0Mi1kZjFlLTQ1ZGUtOTU1MC04ZGEzOGQ0ODgwNDciLCJjbGllbnRTZWNyZXQiOiJuU1FQclVXUUhlUmNZVGp0In0.luI3D-dirqCvWnOleWRtgJMsNQ-ki7UJUT8jkpR74fo";

// --- Priority Logic ---
// Weight order: placement (3) > result (2) > event (1) > other (0.5)
function getTypeWeight(type = "") {
  const t = type.toLowerCase();
  if (t.includes("placement")) return { weight: 3, label: "placement" };
  if (t.includes("result")) return { weight: 2, label: "result" };
  if (t.includes("event")) return { weight: 1, label: "event" };
  return { weight: 0.5, label: "other" };
}

// Recency score: 1.0 for brand-new, decays linearly to 0 over 7 days
function getRecencyScore(timestamp) {
  if (!timestamp) return 0;
  const ageHours = (Date.now() - new Date(timestamp).getTime()) / 3600000;
  return Math.max(0, 1 - ageHours / 168);
}

// Final priority = weight * 10 + recency * 5
function calcPriority(notif) {
  const ts = notif.timestamp || notif.createdAt || notif.created_at;
  const { weight } = getTypeWeight(notif.type);
  const recency = getRecencyScore(ts);
  return parseFloat((weight * 10 + recency * 5).toFixed(2));
}

function formatTime(ts) {
  if (!ts) return "N/A";
  const d = new Date(ts);
  return isNaN(d)
    ? ts
    : d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

// --- Styles (inline for portability) ---
const styles = {
  root: {
    minHeight: "100vh",
    background: "#0a0a0f",
    color: "#e8e8f0",
    fontFamily: "'DM Mono', 'Courier New', monospace",
    padding: "32px 16px",
  },
  wrap: { maxWidth: 860, margin: "0 auto" },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 28,
    paddingBottom: 20,
    borderBottom: "1px solid #2a2a3a",
  },
  logo: { display: "flex", alignItems: "center", gap: 12 },
  logoIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    background: "linear-gradient(135deg,#7c6aff,#ff6a8e)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
  },
  h1: {
    fontFamily: "'Syne','Arial Black',sans-serif",
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: -0.5,
    margin: 0,
  },
  subtitle: {
    fontSize: 11,
    color: "#6b6b80",
    marginTop: 2,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  controls: { display: "flex", alignItems: "center", gap: 10 },
  select: {
    background: "#16161f",
    border: "1px solid #2a2a3a",
    borderRadius: 8,
    padding: "6px 12px",
    color: "#7c6aff",
    fontFamily: "inherit",
    fontSize: 14,
    cursor: "pointer",
    outline: "none",
  },
  refreshBtn: {
    background: "linear-gradient(135deg,#7c6aff,#9b8aff)",
    border: "none",
    borderRadius: 8,
    padding: "8px 18px",
    color: "white",
    fontFamily: "'Syne',sans-serif",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    letterSpacing: 0.5,
  },
  statusBar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 14px",
    background: "#111118",
    border: "1px solid #2a2a3a",
    borderRadius: 8,
    marginBottom: 18,
    fontSize: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#6affb8",
    flexShrink: 0,
  },
  badge: {
    marginLeft: "auto",
    background: "#16161f",
    border: "1px solid #2a2a3a",
    borderRadius: 20,
    padding: "2px 10px",
    fontSize: 11,
    color: "#7c6aff",
  },
  legend: { display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" },
  legendItem: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#6b6b80" },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  card: {
    background: "#16161f",
    border: "1px solid #2a2a3a",
    borderRadius: 12,
    padding: "16px 18px",
    display: "grid",
    gridTemplateColumns: "36px 1fr auto",
    gap: 14,
    alignItems: "start",
    cursor: "default",
    transition: "border-color 0.2s",
  },
  rank: {
    fontFamily: "'Syne',sans-serif",
    fontWeight: 800,
    fontSize: 22,
    color: "#2a2a3a",
    lineHeight: 1,
    textAlign: "center",
    paddingTop: 2,
  },
  rankTop: { color: "#7c6aff" },
  typeTag: {
    display: "inline-block",
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    padding: "2px 8px",
    borderRadius: 4,
    marginBottom: 6,
  },
  message: { fontSize: 14, lineHeight: 1.5, marginBottom: 6 },
  meta: { display: "flex", gap: 14, fontSize: 11, color: "#6b6b80", flexWrap: "wrap" },
  scoreBlock: { textAlign: "right", minWidth: 70 },
  scoreValue: {
    fontFamily: "'Syne',sans-serif",
    fontWeight: 800,
    fontSize: 20,
    background: "linear-gradient(135deg,#7c6aff,#ff6a8e)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  scoreLabel: { fontSize: 10, color: "#6b6b80", textTransform: "uppercase", letterSpacing: 1, marginTop: 2 },
  scoreBreak: { fontSize: 10, color: "#6b6b80", marginTop: 4 },
  center: { textAlign: "center", padding: "60px 20px", color: "#6b6b80" },
};

const TYPE_COLORS = {
  placement: { bg: "rgba(124,106,255,0.15)", color: "#7c6aff", dot: "#7c6aff" },
  result:    { bg: "rgba(255,159,106,0.15)", color: "#ff9f6a", dot: "#ff9f6a" },
  event:     { bg: "rgba(106,255,184,0.15)", color: "#6affb8", dot: "#6affb8" },
  other:     { bg: "rgba(107,107,128,0.15)", color: "#6b6b80", dot: "#6b6b80" },
};

function NotifCard({ notif, rank }) {
  const ts = notif.timestamp || notif.createdAt || notif.created_at;
  const { weight, label } = getTypeWeight(notif.type);
  const recency = getRecencyScore(ts);
  const colors = TYPE_COLORS[label] || TYPE_COLORS.other;
  const isTop = rank <= 3;

  return (
    <div style={styles.card}>
      <div style={{ ...styles.rank, ...(isTop ? styles.rankTop : {}) }}>{rank}</div>
      <div>
        <span
          style={{
            ...styles.typeTag,
            background: colors.bg,
            color: colors.color,
          }}
        >
          {notif.type || "general"}
        </span>
        <div style={styles.message}>
          {notif.message || notif.title || notif.content || "No message"}
        </div>
        <div style={styles.meta}>
          <span>🕐 {formatTime(ts)}</span>
          {notif.id && <span>ID: {notif.id}</span>}
        </div>
      </div>
      <div style={styles.scoreBlock}>
        <div style={styles.scoreValue}>{notif._priority}</div>
        <div style={styles.scoreLabel}>Priority</div>
        <div style={styles.scoreBreak}>
          <div>Weight: ×{weight}</div>
          <div>Recency: {(recency * 5).toFixed(1)}</div>
        </div>
      </div>
    </div>
  );
}

export default function PriorityInbox() {
  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [topN, setTopN] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);



  const fetchNotifications = useCallback(async () => {
  setLoading(true);
  setError(null);

  try {
    const res = await fetch(API_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    const raw = Array.isArray(data)
      ? data
      : data.notifications || data.data || [];

    setTotal(raw.length);

    const scored = raw
      .map((n) => ({
        ...n,
        _priority: calcPriority(n),
      }))
      .sort((a, b) => b._priority - a._priority);

    setNotifications(scored);
    setLastFetched(new Date().toLocaleTimeString("en-IN"));
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}, []);



//   const fetchNotifications = useCallback(async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       const res = await fetch(API_URL, {
//         headers: { Authorization: `Bearer ${TOKEN}` },
//       });
//       if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
//       const data = await res.json();

//       const raw = Array.isArray(data)
//         ? data
//         : data.notifications || data.data || [];

//       setTotal(raw.length);

//       const scored = raw
//         .map((n) => ({ ...n, _priority: calcPriority(n) }))
//         .sort((a, b) => b._priority - a._priority);

//       setNotifications(scored);
//       setLastFetched(new Date().toLocaleTimeString("en-IN"));
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const displayed = notifications.slice(0, topN);

  return (
    <div style={styles.root}>
      <link
        href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap"
        rel="stylesheet"
      />
      <div style={styles.wrap}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}>📬</div>
            <div>
              <h1 style={styles.h1}>Priority Inbox</h1>
              <div style={styles.subtitle}>Campus Notification System</div>
            </div>
          </div>
          <div style={styles.controls}>
            <select
              style={styles.select}
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
            >
              {[10, 15, 20].map((n) => (
                <option key={n} value={n}>Top {n}</option>
              ))}
            </select>
            <button
              style={{ ...styles.refreshBtn, opacity: loading ? 0.6 : 1 }}
              onClick={fetchNotifications}
              disabled={loading}
            >
              {loading ? "Loading..." : "⟳ Refresh"}
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div style={styles.statusBar}>
          <div style={styles.dot} />
          <span style={{ color: "#6b6b80", fontSize: 12 }}>
            {loading
              ? "Fetching notifications..."
              : error
              ? "Error fetching data"
              : lastFetched
              ? `Last updated ${lastFetched} · ${total} total notifications`
              : "Ready"}
          </span>
          <span style={styles.badge}>{displayed.length} shown</span>
        </div>

        {/* Legend */}
        <div style={styles.legend}>
          {Object.entries(TYPE_COLORS).map(([key, val]) => (
            <div key={key} style={styles.legendItem}>
              <div style={{ ...styles.legendDot, background: val.dot }} />
              {key} {key === "placement" ? "(w:3)" : key === "result" ? "(w:2)" : key === "event" ? "(w:1)" : "(w:0.5)"}
            </div>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={styles.center}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
            <div>Loading notifications...</div>
          </div>
        ) : error ? (
          <div style={styles.center}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
            <div>Failed: {error}</div>
            <div style={{ fontSize: 11, marginTop: 8 }}>
              Check CORS / network / token expiry
            </div>
          </div>
        ) : displayed.length === 0 ? (
          <div style={styles.center}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
            <div>No notifications found</div>
          </div>
        ) : (
          <div style={styles.list}>
            {displayed.map((n, i) => (
              <NotifCard key={n.id || i} notif={n} rank={i + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
