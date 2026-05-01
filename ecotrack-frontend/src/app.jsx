import { useState, useEffect, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const API = "http://localhost:5000/api";

/* ─── TOKENS ───────────────────────────────────────────── */
const T = {
  bg0:     "#0A0A0B",   // deepest bg
  bg1:     "#111113",   // sidebar
  bg2:     "#16171A",   // cards
  bg3:     "#1E1F23",   // inputs / table rows
  bg4:     "#26272C",   // hover states
  border:  "#2A2B30",
  border2: "#3A3B42",
  text:    "#F0F0F2",
  muted:   "#6B6C75",
  muted2:  "#9A9BA6",
  accent:  "#A8FF3E",   // lime green — the ONE color
  accentD: "#7ACC20",
  accentBg:"#A8FF3E18",
  red:     "#FF4C4C",
  redBg:   "#FF4C4C18",
  amber:   "#FFB340",
  amberBg: "#FFB34018",
  blue:    "#4C9EFF",
  blueBg:  "#4C9EFF18",
};

const MODE_ACCENT = { Road: T.accent, Sea: T.blue, Rail: T.amber, Air: T.red };

const fmt  = (n, d = 0) => Number(n).toLocaleString("en-IN", { maximumFractionDigits: d });
const fmtK = n => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : fmt(n, 1);

/* ─── GLOBAL STYLES injected once ──────────────────────── */
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; background: ${T.bg0}; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: ${T.bg1}; }
  ::-webkit-scrollbar-thumb { background: ${T.border2}; border-radius: 2px; }
  ::-webkit-scrollbar-thumb:hover { background: ${T.muted}; }

  .nav-btn { transition: background 0.15s, color 0.15s; }
  .nav-btn:hover { background: ${T.bg3} !important; color: ${T.text} !important; }
  .nav-btn.active { background: ${T.accentBg} !important; color: ${T.accent} !important; }

  .row-hover:hover { background: ${T.bg3} !important; }

  .card { background: ${T.bg2}; border: 1px solid ${T.border}; border-radius: 8px; }

  .inp {
    width: 100%; background: ${T.bg3}; border: 1px solid ${T.border};
    border-radius: 6px; padding: 9px 12px; color: ${T.text};
    font-family: 'IBM Plex Sans', sans-serif; font-size: 13px; outline: none;
    transition: border-color 0.15s;
  }
  .inp:focus { border-color: ${T.accent}; }
  .inp::placeholder { color: ${T.muted}; }

  .btn-primary {
    background: ${T.accent}; color: ${T.bg0}; border: none; border-radius: 6px;
    padding: 10px 20px; font-family: 'IBM Plex Sans', sans-serif;
    font-size: 13px; font-weight: 600; cursor: pointer; width: 100%;
    transition: background 0.15s, transform 0.1s;
  }
  .btn-primary:hover { background: ${T.accentD}; }
  .btn-primary:active { transform: scale(0.99); }
  .btn-primary:disabled { background: ${T.bg4}; color: ${T.muted}; cursor: default; }

  .tag {
    display: inline-block; border-radius: 4px; padding: 2px 8px;
    font-size: 11px; font-weight: 600; font-family: 'IBM Plex Mono', monospace;
  }

  .kpi-card {
    background: ${T.bg2}; border: 1px solid ${T.border}; border-radius: 8px;
    padding: 20px 22px; display: flex; flex-direction: column; gap: 6px;
    transition: border-color 0.2s;
  }
  .kpi-card:hover { border-color: ${T.border2}; }

  .fade-in { animation: fadeUp 0.3s ease both; }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .section-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; font-weight: 600; letter-spacing: 0.12em;
    text-transform: uppercase; color: ${T.muted};
    padding-bottom: 10px; border-bottom: 1px solid ${T.border};
    margin-bottom: 16px;
  }

  th { font-family: 'IBM Plex Mono', monospace !important; }
`;

function StyleTag() {
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = STYLE;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);
  return null;
}

/* ─── HOOKS ─────────────────────────────────────────────── */
function useFetch(ep, deps = []) {
  const [data, setData]     = useState(null);
  const [loading, setLoad]  = useState(true);
  const [tick, setTick]     = useState(0);
  const reload = () => setTick(t => t + 1);
  useEffect(() => {
    if (!ep) return;
    setLoad(true);
    fetch(`${API}${ep}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoad(false); })
      .catch(() => setLoad(false));
  }, [ep, tick, ...deps]);
  return { data, loading, reload };
}

/* ─── PRIMITIVES ─────────────────────────────────────────── */
function Loader() {
  return (
    <div style={{ padding: "60px 0", textAlign: "center" }}>
      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.muted, letterSpacing: "0.15em" }}>
        LOADING...
      </div>
    </div>
  );
}

function Toast({ msg, type = "ok", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  const bg = type === "ok" ? T.accentBg : T.redBg;
  const cl = type === "ok" ? T.accent   : T.red;
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 999,
      background: T.bg2, border: `1px solid ${cl}`, borderRadius: 8,
      padding: "13px 18px", display: "flex", gap: 12, alignItems: "center",
      fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13,
      boxShadow: `0 8px 32px ${T.bg0}88`,
      animation: "fadeUp 0.25s ease",
    }}>
      <span style={{ color: cl, fontWeight: 700 }}>{type === "ok" ? "✓" : "✕"}</span>
      <span style={{ color: T.text }}>{msg}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", marginLeft: 8, fontSize: 15 }}>×</button>
    </div>
  );
}

function Badge({ label, color }) {
  return (
    <span className="tag" style={{ background: `${color}20`, color }}>
      {label}
    </span>
  );
}

function EcoScore({ v }) {
  const score = Number(v);
  const color = score >= 70 ? T.accent : score >= 40 ? T.amber : T.red;
  return (
    <span style={{
      fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 600, color,
    }}>{score.toFixed(1)}</span>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: T.bg3, border: `1px solid ${T.border2}`, borderRadius: 6,
      padding: "8px 12px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 11 }}>
      <div style={{ color: T.muted2, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || T.accent }}>{fmt(p.value, 1)}</div>
      ))}
    </div>
  );
};

/* ─── INLINE SHIPMENT FORM (on dashboard) ────────────────── */
function ShipmentQuickForm({ suppliers, modes, onSuccess }) {
  const blank = {
    supplier_id: "", mode_id: "", origin_location: "",
    destination: "", distance_km: "", weight_kg: "",
    shipment_date: new Date().toISOString().split("T")[0],
    status: "pending",
  };
  const [f, setF]       = useState(blank);
  const [sub, setSub]   = useState(false);
  const [err, setErr]   = useState("");

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const EF = { Road: 0.096, Air: 0.602, Sea: 0.0082, Rail: 0.028 };
  const modeName = modes?.find(m => m.mode_id === Number(f.mode_id))?.mode_name;
  const co2 = f.distance_km && f.weight_kg && modeName
    ? (Number(f.distance_km) * Number(f.weight_kg) / 1000 * EF[modeName]).toFixed(2)
    : null;

  const submit = async () => {
    setErr("");
    if (!f.supplier_id || !f.mode_id || !f.origin_location || !f.destination || !f.distance_km) {
      setErr("Fill all required fields."); return;
    }
    setSub(true);
    try {
      const res = await fetch(`${API}/shipments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_id: Number(f.supplier_id), mode_id: Number(f.mode_id),
          origin_location: f.origin_location, destination: f.destination,
          distance_km: Number(f.distance_km), shipment_date: f.shipment_date,
          status: f.status,
        }),
      });
      if (!res.ok) throw new Error();
      setF(blank);
      onSuccess("Shipment logged — CO₂ & eco scores updated.");
    } catch { setErr("API error. Is Flask running?"); }
    finally { setSub(false); }
  };

  const inpSt = { className: "inp" };
  const lbl = (t, req) => (
    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.muted,
      textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>
      {t}{req && <span style={{ color: T.accent }}> *</span>}
    </div>
  );

  return (
    <div className="card" style={{ padding: 22 }}>
      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.accent,
        letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 18 }}>
        ＋ LOG NEW SHIPMENT
      </div>

      {/* Row 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          {lbl("Supplier", true)}
          <select {...inpSt} value={f.supplier_id} onChange={e => set("supplier_id", e.target.value)}>
            <option value="">Select…</option>
            {(suppliers ?? []).map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>)}
          </select>
        </div>
        <div>
          {lbl("Mode", true)}
          <select {...inpSt} value={f.mode_id} onChange={e => set("mode_id", e.target.value)}>
            <option value="">Select…</option>
            {(modes ?? []).map(m => <option key={m.mode_id} value={m.mode_id}>{m.mode_name}</option>)}
          </select>
        </div>
      </div>

      {/* Row 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          {lbl("Origin", true)}
          <input {...inpSt} placeholder="e.g. Mumbai, India" value={f.origin_location} onChange={e => set("origin_location", e.target.value)} />
        </div>
        <div>
          {lbl("Destination", true)}
          <input {...inpSt} placeholder="e.g. Dubai, UAE" value={f.destination} onChange={e => set("destination", e.target.value)} />
        </div>
      </div>

      {/* Row 3 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div>
          {lbl("Distance (km)", true)}
          <input {...inpSt} type="number" min="1" placeholder="1924" value={f.distance_km} onChange={e => set("distance_km", e.target.value)} />
        </div>
        <div>
          {lbl("Weight (kg)")}
          <input {...inpSt} type="number" min="1" placeholder="500" value={f.weight_kg} onChange={e => set("weight_kg", e.target.value)} />
        </div>
        <div>
          {lbl("Date")}
          <input {...inpSt} type="date" value={f.shipment_date} onChange={e => set("shipment_date", e.target.value)} />
        </div>
        <div>
          {lbl("Status")}
          <select {...inpSt} value={f.status} onChange={e => set("status", e.target.value)}>
            <option value="pending">Pending</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>
      </div>

      {/* CO2 preview + submit */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flex: 1, background: T.bg3, borderRadius: 6, padding: "10px 14px",
          border: `1px solid ${co2 ? T.accent + "40" : T.border}`, transition: "border-color 0.2s" }}>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.muted,
            textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>Est. CO₂</div>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 20, fontWeight: 600,
            color: co2 ? T.accent : T.muted }}>
            {co2 ? `${co2} kg` : "— —"}
          </div>
          {modeName && <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.muted, marginTop: 2 }}>
            via {modeName} · {EF[modeName]} kg/t·km
          </div>}
        </div>
        <div style={{ flex: 1 }}>
          {err && <div style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 12,
            color: T.red, marginBottom: 8 }}>{err}</div>}
          <button className="btn-primary" onClick={submit} disabled={sub}>
            {sub ? "SUBMITTING…" : "SUBMIT SHIPMENT"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── PAGES ──────────────────────────────────────────────── */

function DashboardPage({ toast }) {
  const { data: summary }   = useFetch("/reports/summary");
  const { data: trend }     = useFetch("/reports/monthly-trend");
  const { data: suppliers } = useFetch("/suppliers");
  const { data: modes }     = useFetch("/transport-modes");

  const trendData = (trend ?? []).map(r => ({
    m: new Date(r.month).toLocaleString("en", { month: "short" }),
    v: parseFloat(r.emissions),
  }));

  const kpis = [
    { label: "SUPPLIERS",    value: summary?.total_suppliers    ?? "—", sub: "active vendors" },
    { label: "DELIVERIES",   value: summary?.delivered_shipments ?? "—", sub: "completed" },
    { label: "TOTAL CO₂",    value: summary ? fmtK(summary.total_emissions_kg) + " kg" : "—", sub: "lifetime emissions" },
    { label: "AVG ECO SCORE",value: summary ? Number(summary.avg_eco_score).toFixed(1) : "—", sub: "/ 100 fleet avg" },
    { label: "PRODUCTS",     value: summary?.total_products ?? "—", sub: "tracked SKUs" },
  ];

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
        {kpis.map(k => (
          <div key={k.label} className="kpi-card">
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: T.muted,
              letterSpacing: "0.14em", textTransform: "uppercase" }}>{k.label}</div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 26,
              fontWeight: 600, color: T.text, lineHeight: 1.1 }}>{k.value}</div>
            <div style={{ fontFamily: "'IBM Plex Sans',monospace", fontSize: 11, color: T.muted }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
  {/* Area chart */}
  <div className="card" style={{ padding: "20px 20px 12px" }}>
    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.muted,
      letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
      CO₂ EMISSIONS — MONTHLY TREND
    </div>
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="co2grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={T.accent} stopOpacity={0.25} />
            <stop offset="95%" stopColor={T.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 4" stroke={T.border} />
        <XAxis dataKey="m" tick={{ fill: T.muted, fontSize: 10, fontFamily: "'IBM Plex Mono',monospace" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: T.muted, fontSize: 10, fontFamily: "'IBM Plex Mono',monospace" }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="v" stroke={T.accent} strokeWidth={2}
          fill="url(#co2grad)" dot={false} activeDot={{ r: 4, fill: T.accent }} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
</div> {/* ← closes the charts grid */}

      {/* ── SHIPMENT FORM inline on dashboard ── */}
      <ShipmentQuickForm suppliers={suppliers} modes={modes} onSuccess={msg => toast(msg)} />
      {/* Supplier table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}` }}>
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.muted,
            letterSpacing: "0.12em", textTransform: "uppercase" }}>TOP SUPPLIERS — ECO RANKING</span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              {["#", "SUPPLIER", "COUNTRY", "ECO SCORE", "CO₂/KG", "SHIPMENTS", "CERTIFIED"].map(h => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 9,
                  color: T.muted, fontWeight: 600, letterSpacing: "0.1em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(suppliers ?? []).slice(0, 6).map((s, i) => (
              <tr key={s.supplier_id} className="row-hover"
                style={{ borderBottom: `1px solid ${T.border}`, transition: "background 0.12s" }}>
                <td style={{ padding: "11px 16px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.muted }}>{i + 1}</td>
                <td style={{ padding: "11px 16px", fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13, fontWeight: 500, color: T.text }}>{s.supplier_name}</td>
                <td style={{ padding: "11px 16px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.muted2 }}>{s.country}</td>
                <td style={{ padding: "11px 16px" }}><EcoScore v={s.eco_score} /></td>
                <td style={{ padding: "11px 16px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.muted2 }}>{Number(s.kg_co2_per_kg_shipped).toFixed(4)}</td>
                <td style={{ padding: "11px 16px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.muted2 }}>{s.total_shipments}</td>
                <td style={{ padding: "11px 16px" }}>
                  {s.certified_green
                    ? <Badge label="CERTIFIED" color={T.accent} />
                    : <span style={{ color: T.muted, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11 }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SuppliersPage() {
  const { data, loading } = useFetch("/suppliers");
  if (loading) return <Loader />;
  return (
    <div className="fade-in">
      <div className="section-label">ALL SUPPLIERS — {data?.length ?? 0} RECORDS</div>
      <div className="card" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.bg3 }}>
              {["RNK", "SUPPLIER", "COUNTRY", "ECO SCORE", "LIFETIME CO₂", "CO₂/KG SHIPPED", "SHIPMENTS", "STATUS"].map(h => (
                <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 9,
                  color: T.muted, fontWeight: 600, letterSpacing: "0.1em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((s, i) => (
              <tr key={s.supplier_id} className="row-hover"
                style={{ borderBottom: `1px solid ${T.border}` }}>
                <td style={{ padding: "11px 16px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.muted }}>
                  {String(i + 1).padStart(2, "0")}
                </td>
                <td style={{ padding: "11px 16px", fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13, fontWeight: 500, color: T.text }}>{s.supplier_name}</td>
                <td style={{ padding: "11px 16px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.muted2 }}>{s.country}</td>
                <td style={{ padding: "11px 16px" }}><EcoScore v={s.eco_score} /></td>
                <td style={{ padding: "11px 16px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.muted2 }}>{fmt(s.lifetime_emissions_kg, 1)} kg</td>
                <td style={{ padding: "11px 16px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.muted2 }}>{Number(s.kg_co2_per_kg_shipped).toFixed(4)}</td>
                <td style={{ padding: "11px 16px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.muted2 }}>{s.total_shipments}</td>
                <td style={{ padding: "11px 16px" }}>
                  {s.certified_green
                    ? <Badge label="GREEN" color={T.accent} />
                    : <Badge label="STANDARD" color={T.muted} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductsPage() {
  const { data, loading } = useFetch("/products");
  const [selected, setSelected] = useState(null);
  const [bom, setBom]           = useState(null);
  const [bomLoading, setBomLoad] = useState(false);

  const loadBom = async (pid, name) => {
    setSelected(name);
    setBomLoad(true);
    const r = await fetch(`${API}/products/${pid}/bom`);
    setBom(await r.json());
    setBomLoad(false);
  };

  if (loading) return <Loader />;

  return (
    <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div>
        <div className="section-label">PRODUCTS — {data?.length ?? 0} SKUs</div>
        <div className="card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.bg3 }}>
                {["PRODUCT", "SKU", "CAT", "CO₂", ""].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 9, color: T.muted, fontWeight: 600, letterSpacing: "0.1em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((p, i) => (
                <tr key={p.product_id} className="row-hover"
                  style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: "10px 14px", fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13, fontWeight: 500, color: T.text }}>{p.product_name}</td>
                  <td style={{ padding: "10px 14px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.muted }}>{p.sku}</td>
                  <td style={{ padding: "10px 14px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.muted2 }}>{p.category}</td>
                  <td style={{ padding: "10px 14px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.muted2 }}>{Number(p.carbon_footprint).toFixed(2)}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <button onClick={() => loadBom(p.product_id, p.product_name)}
                      style={{ background: "none", border: `1px solid ${T.border2}`, borderRadius: 4,
                        padding: "3px 10px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 10,
                        color: T.muted2, cursor: "pointer", transition: "all 0.15s" }}
                      onMouseEnter={e => { e.target.style.borderColor = T.accent; e.target.style.color = T.accent; }}
                      onMouseLeave={e => { e.target.style.borderColor = T.border2; e.target.style.color = T.muted2; }}>
                      BOM →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="section-label">{selected ? `BOM TREE — ${selected.toUpperCase()}` : "BILL OF MATERIALS"}</div>
        <div className="card" style={{ padding: 20, minHeight: 300 }}>
          {!bom && !bomLoading && (
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.muted, paddingTop: 20 }}>
              SELECT A PRODUCT TO VIEW ITS BOM TREE →
            </div>
          )}
          {bomLoading && <Loader />}
          {bom && bom.length === 0 && (
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.muted }}>
              NO SUB-COMPONENTS FOUND
            </div>
          )}
          {(bom ?? []).map((b, i) => (
            <div key={i} style={{
              marginLeft: (b.depth - 1) * 18,
              padding: "9px 14px", marginBottom: 6,
              background: T.bg3, borderRadius: 6,
              borderLeft: `2px solid ${b.depth === 1 ? T.accent : T.border2}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13, fontWeight: 500, color: T.text }}>{b.child_name}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.muted, marginLeft: 8 }}>{b.child_sku}</span>
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.muted }}>
                  QTY {b.quantity} · L{b.depth}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ShipmentsPage() {
  const { data, loading } = useFetch("/shipments");

  const STATUS = {
    delivered:  { label: "DELIVERED",  color: T.accent },
    in_transit: { label: "IN TRANSIT", color: T.blue   },
    pending:    { label: "PENDING",    color: T.amber  },
    cancelled:  { label: "CANCELLED",  color: T.red    },
  };

  if (loading) return <Loader />;
  return (
    <div className="fade-in">
      <div className="section-label">ALL SHIPMENTS — {data?.length ?? 0} RECORDS</div>
      <div className="card" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.bg3 }}>
              {["ID", "SUPPLIER", "MODE", "ORIGIN", "DESTINATION", "DIST", "DATE", "WEIGHT", "CO₂ (kg)", "STATUS"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 9,
                  color: T.muted, fontWeight: 600, letterSpacing: "0.1em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((s, i) => {
              const st = STATUS[s.status] ?? { label: s.status, color: T.muted };
              return (
                <tr key={s.shipment_id} className="row-hover"
                  style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: "10px 14px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.muted }}>
                    #{String(s.shipment_id).padStart(3, "0")}
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13, fontWeight: 500, color: T.text, whiteSpace: "nowrap" }}>{s.supplier_name}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <Badge label={s.mode_name.toUpperCase()} color={MODE_ACCENT[s.mode_name] ?? T.muted} />
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.muted2, whiteSpace: "nowrap" }}>{s.origin_location}</td>
                  <td style={{ padding: "10px 14px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.muted2, whiteSpace: "nowrap" }}>{s.destination}</td>
                  <td style={{ padding: "10px 14px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.muted2 }}>{fmt(s.distance_km)}</td>
                  <td style={{ padding: "10px 14px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.muted2, whiteSpace: "nowrap" }}>{s.shipment_date}</td>
                  <td style={{ padding: "10px 14px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.muted2 }}>{fmt(s.total_weight_kg, 0)}</td>
                  <td style={{ padding: "10px 14px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.text }}>{fmt(s.total_emissions, 2)}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <Badge label={st.label} color={st.color} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportsPage() {
  const { data }       = useFetch("/reports/monthly");
  const { data: byMode } = useFetch("/reports/by-mode");

  const byMonth = {};
  (data ?? []).forEach(r => {
    const m = new Date(r.report_month).toLocaleString("en", { month: "short", year: "2-digit" });
    byMonth[m] = (byMonth[m] ?? 0) + parseFloat(r.total_emissions);
  });
  const barData = Object.entries(byMonth).map(([m, v]) => ({ m, v: +v.toFixed(1) }));

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16 }}>
        <div className="card" style={{ padding: "20px 20px 12px" }}>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.muted,
            letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
            MONTHLY CO₂ EMISSIONS
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={T.border} />
              <XAxis dataKey="m" tick={{ fill: T.muted, fontSize: 10, fontFamily: "'IBM Plex Mono',monospace" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: T.muted, fontSize: 10, fontFamily: "'IBM Plex Mono',monospace" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="v" fill={T.accent} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding: "20px" }}>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.muted,
            letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
            EMISSIONS BY MODE
          </div>
          {(byMode ?? []).map(m => {
            const max = Math.max(...(byMode ?? []).map(x => x.total_emissions));
            const pct = (m.total_emissions / max) * 100;
            return (
              <div key={m.mode_name} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.muted2 }}>{m.mode_name}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: MODE_ACCENT[m.mode_name] }}>{fmt(m.total_emissions, 0)}</span>
                </div>
                <div style={{ height: 4, background: T.bg3, borderRadius: 2 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: MODE_ACCENT[m.mode_name] ?? T.muted, borderRadius: 2, transition: "width 0.6s ease" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="section-label">DETAILED REPORT — {data?.length ?? 0} ENTRIES</div>
        <div className="card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.bg3 }}>
                {["MONTH", "SUPPLIER", "CATEGORY", "CO₂ (kg)", "SHIPMENTS"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 9, color: T.muted, fontWeight: 600, letterSpacing: "0.1em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((r, i) => (
                <tr key={i} className="row-hover" style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: "10px 16px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.muted2 }}>
                    {new Date(r.report_month).toLocaleString("en", { month: "short", year: "numeric" }).toUpperCase()}
                  </td>
                  <td style={{ padding: "10px 16px", fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13, fontWeight: 500, color: T.text }}>{r.supplier_name}</td>
                  <td style={{ padding: "10px 16px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.muted2 }}>{r.category}</td>
                  <td style={{ padding: "10px 16px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: T.text }}>{fmt(r.total_emissions, 2)}</td>
                  <td style={{ padding: "10px 16px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.muted2 }}>{r.shipment_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AddSupplierPage({ toast }) {
  const blank = { name: "", country: "", contact_email: "", contact_phone: "", certified_green: false };
  const [f, setF]     = useState(blank);
  const [sub, setSub] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const COUNTRIES = ["Australia","Brazil","Canada","China","France","Germany","India","Indonesia",
    "Italy","Japan","Mexico","Netherlands","Norway","Saudi Arabia","South Korea","Spain","Sweden","Turkey","UAE","UK","USA","Other"];

  const submit = async () => {
    if (!f.name.trim() || !f.country) { toast("Name and country are required.", "err"); return; }
    setSub(true);
    try {
      const res = await fetch(`${API}/suppliers`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      if (!res.ok) throw new Error();
      setF(blank);
      toast("Supplier added successfully.");
    } catch { toast("Submission failed — is Flask running?", "err"); }
    finally { setSub(false); }
  };

  const lbl = (t, req) => (
    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.muted,
      textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>
      {t}{req && <span style={{ color: T.accent }}> *</span>}
    </div>
  );

  return (
    <div className="fade-in" style={{ maxWidth: 640 }}>
      <div className="section-label">ADD NEW SUPPLIER</div>
      <div className="card" style={{ padding: 28 }}>
        <div style={{ marginBottom: 14 }}>
          {lbl("Supplier Name", true)}
          <input className="inp" placeholder="e.g. GreenParts GmbH" value={f.name} onChange={e => set("name", e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div>
            {lbl("Country", true)}
            <select className="inp" value={f.country} onChange={e => set("country", e.target.value)}>
              <option value="">Select…</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            {lbl("Contact Email")}
            <input className="inp" type="email" placeholder="ops@supplier.com" value={f.contact_email} onChange={e => set("contact_email", e.target.value)} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div>
            {lbl("Contact Phone")}
            <input className="inp" placeholder="+91 98765 43210" value={f.contact_phone} onChange={e => set("contact_phone", e.target.value)} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={f.certified_green} onChange={e => set("certified_green", e.target.checked)}
                style={{ width: 15, height: 15, accentColor: T.accent, cursor: "pointer" }} />
              <div>
                <div style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13, color: T.text, fontWeight: 500 }}>Green Certified</div>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.muted }}>ISO 14001 / GHG Protocol</div>
              </div>
            </label>
          </div>
        </div>

        <div style={{ background: T.bg3, borderRadius: 6, padding: "12px 14px", marginBottom: 20,
          borderLeft: `2px solid ${T.blue}` }}>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.blue,
            textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>AUTO-CALCULATED</div>
          <div style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 12, color: T.muted2 }}>
            Eco Score initialises at 50.00 and recalculates automatically each time a shipment from this supplier is marked as delivered.
          </div>
        </div>

        <button className="btn-primary" onClick={submit} disabled={sub}>
          {sub ? "ADDING…" : "ADD SUPPLIER"}
        </button>
      </div>
    </div>
  );
}

/* ─── APP SHELL ──────────────────────────────────────────── */
const NAV = [
  { key: "dashboard",    label: "DASHBOARD",     icon: "▦" },
  { key: "suppliers",    label: "SUPPLIERS",      icon: "◈" },
  { key: "products",     label: "PRODUCTS",       icon: "◻" },
  { key: "shipments",    label: "SHIPMENTS",      icon: "→" },
  { key: "reports",      label: "REPORTS",        icon: "≡" },
  { key: "add-supplier", label: "ADD SUPPLIER",   icon: "＋" },
];

export default function App() {
  const [page, setPage]   = useState("dashboard");
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "ok") => setToast({ msg, type });

  return (
    <>
      <StyleTag />
      <div style={{ display: "flex", height: "100vh", background: T.bg0, fontFamily: "'IBM Plex Sans',sans-serif", overflow: "hidden" }}>

        {/* ── Sidebar ── */}
        <aside style={{
          width: 200, background: T.bg1, borderRight: `1px solid ${T.border}`,
          display: "flex", flexDirection: "column", padding: "0", flexShrink: 0,
        }}>
          {/* Logo */}
          <div style={{ padding: "22px 20px 20px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, fontWeight: 600,
              color: T.accent, letterSpacing: "0.05em" }}>ECO-TRACK</div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: T.muted,
              letterSpacing: "0.12em", marginTop: 3 }}>CARBON / SUPPLY CHAIN</div>
          </div>

          {/* Nav */}
          <nav style={{ padding: "12px 10px", flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            {NAV.map(n => (
              <button key={n.key} onClick={() => setPage(n.key)}
                className={`nav-btn${page === n.key ? " active" : ""}`}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 6, border: "none",
                  background: "transparent", color: T.muted,
                  fontFamily: "'IBM Plex Mono',monospace", fontSize: 10,
                  fontWeight: 600, letterSpacing: "0.1em", cursor: "pointer",
                  textAlign: "left", width: "100%",
                }}>
                <span style={{ fontSize: 14, lineHeight: 1 }}>{n.icon}</span>
                {n.label}
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div style={{ padding: "14px 20px", borderTop: `1px solid ${T.border}` }}>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: T.muted, lineHeight: 1.8 }}>
              DBMS PROJECT 2024<br />
              <span style={{ color: T.muted2 }}>SANEH · MANIT · TANMAY</span>
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <main style={{ flex: 1, overflowY: "auto", padding: "28px 32px", background: T.bg0 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            {/* Page header */}
            <div style={{ marginBottom: 24, display: "flex", alignItems: "baseline", gap: 12 }}>
              <h1 style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 16, fontWeight: 600,
                color: T.text, letterSpacing: "0.05em" }}>
                {NAV.find(n => n.key === page)?.label}
              </h1>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.muted }}>
                {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}
              </div>
            </div>

            {page === "dashboard"    && <DashboardPage toast={showToast} />}
            {page === "suppliers"    && <SuppliersPage />}
            {page === "products"     && <ProductsPage />}
            {page === "shipments"    && <ShipmentsPage />}
            {page === "reports"      && <ReportsPage />}
            {page === "add-supplier" && <AddSupplierPage toast={showToast} />}
          </div>
        </main>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
