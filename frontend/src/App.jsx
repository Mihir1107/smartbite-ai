import React, { useState, useEffect, useRef } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const API = "http://localhost:8000";

// ─── MOCK DATA (fallback if backend not running) ──────────────────────────
const MOCK = {
  summary: {
    total_revenue_30d: 847320,
    total_margin_30d: 312840,
    margin_pct: 36.9,
    aov_7d: 418,
    total_orders_7d: 312,
    voice_orders: 64,
    stars: 6,
    dogs: 3,
    puzzles: 4,
    missed_calls: 3,
    opportunity_score_total: 48200,
  },
  menuItems: [
    {
      id: 1,
      name: "Butter Chicken",
      category: "Main",
      selling_price: 320,
      food_cost: 95,
      contribution_margin: 225,
      cm_percentage: 70.3,
      units_sold: 148,
      revenue: 47360,
      total_margin: 33300,
      quadrant: "Star",
      quadrant_color: "#22c55e",
      opportunity_score: 4050,
      price_action: "Maintain current pricing",
    },
    {
      id: 2,
      name: "Dal Makhani",
      category: "Main",
      selling_price: 220,
      food_cost: 40,
      contribution_margin: 180,
      cm_percentage: 81.8,
      units_sold: 112,
      revenue: 24640,
      total_margin: 20160,
      quadrant: "Star",
      quadrant_color: "#22c55e",
      opportunity_score: 6480,
      price_action: "Maintain current pricing",
    },
    {
      id: 3,
      name: "Paneer Tikka",
      category: "Starter",
      selling_price: 280,
      food_cost: 75,
      contribution_margin: 205,
      cm_percentage: 73.2,
      units_sold: 38,
      revenue: 10640,
      total_margin: 7790,
      quadrant: "Puzzle",
      quadrant_color: "#3b82f6",
      opportunity_score: 22550,
      price_action: "Promote more — high margin, low visibility",
    },
    {
      id: 4,
      name: "Chicken Biryani",
      category: "Rice",
      selling_price: 340,
      food_cost: 110,
      contribution_margin: 230,
      cm_percentage: 67.6,
      units_sold: 97,
      revenue: 32980,
      total_margin: 22310,
      quadrant: "Star",
      quadrant_color: "#22c55e",
      opportunity_score: 11730,
      price_action: "Maintain current pricing",
    },
    {
      id: 5,
      name: "Veg Biryani",
      category: "Rice",
      selling_price: 250,
      food_cost: 60,
      contribution_margin: 190,
      cm_percentage: 76.0,
      units_sold: 78,
      revenue: 19500,
      total_margin: 14820,
      quadrant: "Plowhorse",
      quadrant_color: "#f59e0b",
      opportunity_score: 13300,
      price_action: "Maintain current pricing",
    },
    {
      id: 6,
      name: "Garlic Naan",
      category: "Bread",
      selling_price: 60,
      food_cost: 10,
      contribution_margin: 50,
      cm_percentage: 83.3,
      units_sold: 210,
      revenue: 12600,
      total_margin: 10500,
      quadrant: "Star",
      quadrant_color: "#22c55e",
      opportunity_score: 0,
      price_action: "Maintain current pricing",
    },
    {
      id: 7,
      name: "Mango Lassi",
      category: "Beverage",
      selling_price: 120,
      food_cost: 25,
      contribution_margin: 95,
      cm_percentage: 79.2,
      units_sold: 44,
      revenue: 5280,
      total_margin: 4180,
      quadrant: "Puzzle",
      quadrant_color: "#3b82f6",
      opportunity_score: 15770,
      price_action: "Promote more — high margin, low visibility",
    },
    {
      id: 8,
      name: "Chicken Korma",
      category: "Main",
      selling_price: 340,
      food_cost: 130,
      contribution_margin: 210,
      cm_percentage: 61.8,
      units_sold: 18,
      revenue: 6120,
      total_margin: 3780,
      quadrant: "Dog",
      quadrant_color: "#ef4444",
      opportunity_score: 40320,
      price_action: "Consider removing or bundling",
    },
    {
      id: 9,
      name: "Masala Chai",
      category: "Beverage",
      selling_price: 40,
      food_cost: 8,
      contribution_margin: 32,
      cm_percentage: 80.0,
      units_sold: 188,
      revenue: 7520,
      total_margin: 6016,
      quadrant: "Plowhorse",
      quadrant_color: "#f59e0b",
      opportunity_score: 704,
      price_action: "Maintain current pricing",
    },
    {
      id: 10,
      name: "Gulab Jamun",
      category: "Dessert",
      selling_price: 80,
      food_cost: 15,
      contribution_margin: 65,
      cm_percentage: 81.3,
      units_sold: 31,
      revenue: 2480,
      total_margin: 2015,
      quadrant: "Puzzle",
      quadrant_color: "#3b82f6",
      opportunity_score: 11635,
      price_action: "Promote more — high margin, low visibility",
    },
  ],
  combos: [
    {
      item_a: "Butter Chicken",
      item_b: "Garlic Naan",
      frequency: 89,
      original_price: 380,
      combo_price: 334,
      saving: 46,
    },
    {
      item_a: "Chicken Biryani",
      item_b: "Raita",
      frequency: 74,
      original_price: 400,
      combo_price: 352,
      saving: 48,
    },
    {
      item_a: "Paneer Tikka",
      item_b: "Mango Lassi",
      frequency: 52,
      original_price: 400,
      combo_price: 352,
      saving: 48,
    },
    {
      item_a: "Dal Makhani",
      item_b: "Butter Naan",
      frequency: 68,
      original_price: 270,
      combo_price: 238,
      saving: 32,
    },
  ],
  hourlyData: [
    { hour: "08", orders: 2, avg_aov: 180 },
    { hour: "09", orders: 3, avg_aov: 210 },
    { hour: "10", orders: 4, avg_aov: 190 },
    { hour: "11", orders: 8, avg_aov: 280 },
    { hour: "12", orders: 18, avg_aov: 420 },
    { hour: "13", orders: 22, avg_aov: 445 },
    { hour: "14", orders: 16, avg_aov: 390 },
    { hour: "15", orders: 4, avg_aov: 220 },
    { hour: "16", orders: 3, avg_aov: 195 },
    { hour: "17", orders: 5, avg_aov: 240 },
    { hour: "18", orders: 9, avg_aov: 310 },
    { hour: "19", orders: 20, avg_aov: 460 },
    { hour: "20", orders: 24, avg_aov: 490 },
    { hour: "21", orders: 19, avg_aov: 435 },
    { hour: "22", orders: 11, avg_aov: 380 },
    { hour: "23", orders: 6, avg_aov: 290 },
  ],
  missedCalls: [
    {
      id: 1,
      phone: "+919876543210",
      timestamp: "2024-01-15T14:32:00",
      recovered: 0,
    },
    {
      id: 2,
      phone: "+918765432109",
      timestamp: "2024-01-15T13:18:00",
      recovered: 0,
    },
    {
      id: 3,
      phone: "+917654321098",
      timestamp: "2024-01-14T20:44:00",
      recovered: 1,
    },
  ],
  voiceOrders: [
    {
      id: 1,
      phone: "+919876543210",
      transcript: "Ek butter chicken aur do garlic naan",
      structured_order:
        '[{"name":"Butter Chicken","qty":1},{"name":"Garlic Naan","qty":2}]',
      created_at: "2024-01-15T13:22:00",
      status: "confirmed",
    },
    {
      id: 2,
      phone: "+918765432109",
      transcript: "One chicken biryani and one mango lassi",
      structured_order:
        '[{"name":"Chicken Biryani","qty":1},{"name":"Mango Lassi","qty":1}]',
      created_at: "2024-01-15T12:45:00",
      status: "confirmed",
    },
  ],
};

function KPICard({ label, value, sub, color = "#f97316", icon }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: "#94a3b8",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          {label}
        </span>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          color,
          fontFamily: "'Space Grotesk', sans-serif",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: "#64748b" }}>{sub}</div>}
    </div>
  );
}

function QuadrantBadge({ q }) {
  const cfg = {
    Star: { bg: "#052e16", c: "#4ade80", icon: "⭐" },
    Plowhorse: { bg: "#1c1008", c: "#fb923c", icon: "🐎" },
    Puzzle: { bg: "#0c1a40", c: "#60a5fa", icon: "🧩" },
    Dog: { bg: "#2d0a0a", c: "#f87171", icon: "🐕" },
  };
  const s = cfg[q] || cfg.Dog;
  return (
    <span
      style={{
        background: s.bg,
        color: s.c,
        border: `1px solid ${s.c}30`,
        borderRadius: 20,
        padding: "2px 10px",
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {s.icon} {q}
    </span>
  );
}

function MenuTable({ items, onAction }) {
  const [selected, setSelected] = useState(null);
  return (
    <div style={{ overflow: "auto" }}>
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
      >
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            {[
              "Item",
              "Category",
              "Price",
              "Food Cost",
              "CM",
              "CM%",
              "Units",
              "Quadrant",
              "Opp. Score",
              "Action",
            ].map((h) => (
              <th
                key={h}
                style={{
                  padding: "10px 12px",
                  textAlign: "left",
                  color: "#64748b",
                  fontWeight: 600,
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              onClick={() =>
                setSelected(selected?.id === item.id ? null : item)
              }
              style={{
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                cursor: "pointer",
                background:
                  selected?.id === item.id
                    ? "rgba(249,115,22,0.06)"
                    : "transparent",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.03)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background =
                  selected?.id === item.id
                    ? "rgba(249,115,22,0.06)"
                    : "transparent")
              }
            >
              <td
                style={{ padding: "12px", fontWeight: 600, color: "#f1f5f9" }}
              >
                {item.name}
              </td>
              <td style={{ padding: "12px", color: "#94a3b8" }}>
                {item.category}
              </td>
              <td style={{ padding: "12px", color: "#f1f5f9" }}>
                ₹{item.selling_price}
              </td>
              <td style={{ padding: "12px", color: "#94a3b8" }}>
                ₹{item.food_cost}
              </td>
              <td
                style={{ padding: "12px", color: "#4ade80", fontWeight: 700 }}
              >
                ₹{item.contribution_margin}
              </td>
              <td style={{ padding: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      height: 4,
                      width: 60,
                      background: "#1e293b",
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${item.cm_percentage}%`,
                        background:
                          item.cm_percentage > 70
                            ? "#4ade80"
                            : item.cm_percentage > 50
                              ? "#fb923c"
                              : "#f87171",
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  <span style={{ color: "#94a3b8" }}>
                    {item.cm_percentage}%
                  </span>
                </div>
              </td>
              <td style={{ padding: "12px", color: "#f1f5f9" }}>
                {item.units_sold}
              </td>
              <td style={{ padding: "12px" }}>
                <QuadrantBadge q={item.quadrant} />
              </td>
              <td
                style={{
                  padding: "12px",
                  color: item.opportunity_score > 10000 ? "#f97316" : "#64748b",
                  fontWeight: item.opportunity_score > 10000 ? 700 : 400,
                }}
              >
                ₹{item.opportunity_score.toLocaleString()}
              </td>
              <td style={{ padding: "12px" }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction(item);
                  }}
                  style={{
                    background: "rgba(249,115,22,0.15)",
                    border: "1px solid rgba(249,115,22,0.3)",
                    color: "#f97316",
                    borderRadius: 8,
                    padding: "4px 10px",
                    fontSize: 11,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Fix →
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActionModal({ item, onClose }) {
  const [done, setDone] = useState(false);
  if (!item) return null;
  const suggestedPrice = Math.round(item.selling_price * 1.15);

  const handleAction = (type) => {
    fetch(`${API}/api/menu/${item.id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, new_price: suggestedPrice }),
    }).catch(() => {});
    setDone(true);
    setTimeout(onClose, 1500);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#0f172a",
          border: "1px solid rgba(249,115,22,0.3)",
          borderRadius: 20,
          padding: 32,
          width: 420,
          boxShadow: "0 0 60px rgba(249,115,22,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 40 }}>✅</div>
            <div style={{ color: "#4ade80", fontWeight: 700, marginTop: 12 }}>
              Action applied! PoS update queued.
            </div>
          </div>
        ) : (
          <>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#f1f5f9",
                marginBottom: 6,
              }}
            >
              Fix: {item.name}
            </div>
            <div style={{ color: "#64748b", fontSize: 13, marginBottom: 24 }}>
              {item.price_action}
            </div>
            <div
              style={{
                background: "rgba(255,255,255,0.04)",
                borderRadius: 12,
                padding: 16,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ color: "#64748b", fontSize: 11 }}>
                    Current Price
                  </div>
                  <div
                    style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 20 }}
                  >
                    ₹{item.selling_price}
                  </div>
                </div>
                <div>
                  <div style={{ color: "#64748b", fontSize: 11 }}>
                    Suggested Price
                  </div>
                  <div
                    style={{ color: "#4ade80", fontWeight: 700, fontSize: 20 }}
                  >
                    ₹{suggestedPrice}
                  </div>
                </div>
                <div>
                  <div style={{ color: "#64748b", fontSize: 11 }}>
                    Current CM%
                  </div>
                  <div style={{ color: "#fb923c", fontWeight: 700 }}>
                    {item.cm_percentage}%
                  </div>
                </div>
                <div>
                  <div style={{ color: "#64748b", fontSize: 11 }}>
                    Opportunity Score
                  </div>
                  <div style={{ color: "#f97316", fontWeight: 700 }}>
                    ₹{item.opportunity_score.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => handleAction("raise_price")}
                style={{
                  flex: 1,
                  background: "#f97316",
                  border: "none",
                  color: "#000",
                  borderRadius: 10,
                  padding: "12px 0",
                  fontWeight: 800,
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                ✅ Raise to ₹{suggestedPrice}
              </button>
              <button
                onClick={() => handleAction("archive")}
                style={{
                  flex: 1,
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#f87171",
                  borderRadius: 10,
                  padding: "12px 0",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                🗑 Archive Item
              </button>
            </div>
            <button
              onClick={onClose}
              style={{
                width: "100%",
                marginTop: 10,
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#64748b",
                borderRadius: 10,
                padding: "10px 0",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function LiveVoiceDemo({ onOrderPlaced }) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        setRecording(false);
        setProcessing(true);
        setResult(null);

        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");

        try {
          const res = await fetch(API + "/api/voice/live", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          setResult(data);
          if (data.success && onOrderPlaced) {
            onOrderPlaced();
          }
        } catch (err) {
          console.error(err);
          setResult({ success: false, error: "Failed to connect to backend" });
        } finally {
          setProcessing(false);
          stream.getTracks().forEach((track) => track.stop());
        }
      };

      mediaRecorder.start();
      setRecording(true);
      setResult(null);
    } catch (err) {
      console.error("Microphone access denied or error:", err);
      alert("Microphone access is required for this demo.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 16,
      padding: 24,
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    }}>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>🎙 Live Voice Demo</div>
      <div style={{ color: "#64748b", fontSize: 13, marginBottom: 24 }}>Tap to speak your order in Hinglish</div>
      
      <button
        onClick={recording ? stopRecording : startRecording}
        disabled={processing}
        style={{
          width: 100, height: 100, borderRadius: "50%",
          display: "flex", justifyContent: "center", alignItems: "center",
          fontSize: 40, cursor: processing ? "not-allowed" : "pointer",
          background: processing ? "rgba(100,116,139,0.1)" : recording ? "rgba(239,68,68,0.1)" : "rgba(249,115,22,0.1)",
          border: `2px solid ${processing ? "#64748b" : recording ? "#ef4444" : "#f97316"}`,
          boxShadow: recording ? "0 0 20px rgba(239,68,68,0.4)" : !processing ? "0 0 15px rgba(249,115,22,0.2)" : "none",
          transition: "all 0.3s ease",
          animation: recording ? "pulse 1.5s infinite" : "none"
        }}
      >
        {processing ? "⏳" : recording ? "⏹" : "🎙"}
      </button>

      <div style={{ marginTop: 16, fontWeight: 700, color: recording ? "#ef4444" : processing ? "#64748b" : "#f1f5f9" }}>
        {recording ? "Recording... Tap to stop" : processing ? "Processing AI..." : "Idle"}
      </div>

      {!recording && !processing && !result && (
        <div style={{ marginTop: 24, display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <span style={{ fontSize: 12, background: "rgba(255,255,255,0.05)", padding: "6px 14px", borderRadius: 20, color: "#94a3b8" }}>"ek butter chicken aur do garlic naan"</span>
          <span style={{ fontSize: 12, background: "rgba(255,255,255,0.05)", padding: "6px 14px", borderRadius: 20, color: "#94a3b8" }}>"mujhe dal makhani chahiye"</span>
        </div>
      )}

      {result && (
        <div style={{
          marginTop: 24, width: "100%", padding: 16, borderRadius: 12,
          background: result.success ? "rgba(74,222,128,0.05)" : "rgba(239,68,68,0.05)",
          border: `1px solid ${result.success ? "rgba(74,222,128,0.2)" : "rgba(239,68,68,0.2)"}`,
          animation: "fadeIn 0.5s ease"
        }}>
          {result.success ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#4ade80", fontWeight: 800, marginBottom: 8 }}>✅ Order Processed Successfully!</div>
              <div style={{ color: "#f1f5f9", fontSize: 16, fontStyle: "italic", marginBottom: 16 }}>"{result.transcript}"</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 16 }}>
                {result.items?.map((item, i) => (
                  <span key={i} style={{ background: "rgba(255,255,255,0.1)", padding: "6px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                    {item.qty}× {item.item}
                  </span>
                ))}
              </div>
              <div style={{ fontWeight: 800, color: "#f97316", fontSize: 18 }}>Total: ₹{result.total}</div>
            </div>
          ) : (
            <div style={{ color: "#ef4444", fontWeight: 700, textAlign: "center" }}>❌ Error: {result.error || "Failed to process order"}</div>
          )}
        </div>
      )}
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function VoiceOrderFeed({ orders }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {orders.map((o, i) => {
        let items = [];
        try {
          items = JSON.parse(o.structured_order);
        } catch {
          /* ignore */
        }
        return (
          <div
            key={i}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12,
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#4ade80",
                    boxShadow: "0 0 8px #4ade80",
                  }}
                />
                <span style={{ color: "#94a3b8", fontSize: 12 }}>
                  {o.phone}
                </span>
              </div>
              <span
                style={{
                  background: "rgba(74,222,128,0.1)",
                  color: "#4ade80",
                  border: "1px solid rgba(74,222,128,0.2)",
                  borderRadius: 20,
                  padding: "2px 8px",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {o.status.toUpperCase()}
              </span>
            </div>
            <div
              style={{
                color: "#64748b",
                fontSize: 12,
                fontStyle: "italic",
                marginBottom: 8,
              }}
            >
              "{o.transcript}"
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {items.map((item, j) => (
                <span
                  key={j}
                  style={{
                    background: "rgba(249,115,22,0.1)",
                    color: "#f97316",
                    border: "1px solid rgba(249,115,22,0.2)",
                    borderRadius: 6,
                    padding: "2px 8px",
                    fontSize: 11,
                  }}
                >
                  {item.qty}× {item.name}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MissedCallCard({ call, onRecover }) {
  const [sent, setSent] = useState(call.recovered === 1);
  const timeAgo = (ts) => {
     
    const diff = new Date().getTime() - new Date(ts).getTime();
    const h = Math.floor(diff / 3600000);
    return h < 1 ? "< 1 hour ago" : `${h}h ago`;
  };
  const handleRecover = () => {
    fetch(`${API}/api/missed-calls/${call.id}/recover`, {
      method: "POST",
    }).catch(() => {});
    setSent(true);
    onRecover && onRecover(call.id);
  };
  return (
    <div
      style={{
        background: sent ? "rgba(74,222,128,0.04)" : "rgba(239,68,68,0.05)",
        border: `1px solid ${sent ? "rgba(74,222,128,0.15)" : "rgba(239,68,68,0.15)"}`,
        borderRadius: 12,
        padding: "14px 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <div style={{ color: "#f1f5f9", fontWeight: 600 }}>{call.phone}</div>
        <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>
          {timeAgo(call.timestamp)}
        </div>
      </div>
      {sent ? (
        <span style={{ color: "#4ade80", fontSize: 12, fontWeight: 700 }}>
          ✅ WhatsApp Sent
        </span>
      ) : (
        <button
          onClick={handleRecover}
          style={{
            background: "rgba(34,197,94,0.15)",
            border: "1px solid rgba(34,197,94,0.3)",
            color: "#4ade80",
            borderRadius: 8,
            padding: "6px 14px",
            fontSize: 12,
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          📲 Send WhatsApp
        </button>
      )}
    </div>
  );
}

function AIRecommendations({ tick }) {
  const { data, refetch } = usePollableFetch("/api/menu/ai-recommendations",
    { recommendations: [], total_projected_monthly_gain: 0 }, tick);
  const [decided, setDecided] = useState({});

  const decide = async (item_id, action, suggested_price) => {
    await fetch(`${API}/api/menu/ai-recommendations/${item_id}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, suggested_price })
    });
    setDecided(prev => ({ ...prev, [item_id]: action }));
    // Wait slightly for db propagation then refetch
    setTimeout(() => refetch && refetch(), 500);
  };

  const recs = data?.recommendations || [];
  const total = data?.total_projected_monthly_gain || 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>🧠 AI Price Optimizer</div>
          <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
            AI-generated recommendations — approve to sync with PoS
          </div>
        </div>
        <div style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)",
          borderRadius: 12, padding: "10px 18px", textAlign: "center" }}>
          <div style={{ color: "#4ade80", fontWeight: 800, fontSize: 22 }}>
            ₹{(total/1000).toFixed(1)}K
          </div>
          <div style={{ color: "#64748b", fontSize: 11 }}>projected monthly gain</div>
        </div>
      </div>

      {recs.map(rec => {
        const d = decided[rec.item_id];
        return (
          <div key={rec.item_id} style={{
            background: d === "approve" ? "rgba(74,222,128,0.05)" :
                        d === "reject"  ? "rgba(239,68,68,0.05)" :
                        "rgba(255,255,255,0.03)",
            border: `1px solid ${d === "approve" ? "rgba(74,222,128,0.2)" :
                                  d === "reject"  ? "rgba(239,68,68,0.15)" :
                                  "rgba(255,255,255,0.07)"}`,
            borderRadius: 16, padding: 20, transition: "all 0.3s"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <QuadrantBadge q={rec.quadrant} />
                <span style={{ fontWeight: 700, fontSize: 16, color: "#f1f5f9" }}>{rec.item_name}</span>
                <span style={{ color: "#64748b", fontSize: 13 }}>₹{rec.current_price}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: rec.confidence === "High" ? "rgba(74,222,128,0.1)" : "rgba(251,146,60,0.1)",
                  color: rec.confidence === "High" ? "#4ade80" : "#fb923c",
                  border: `1px solid ${rec.confidence === "High" ? "rgba(74,222,128,0.2)" : "rgba(251,146,60,0.2)"}`,
                  borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
                  {rec.confidence} Confidence
                </span>
                <span style={{ color: "#4ade80", fontWeight: 800, fontSize: 16 }}>
                  +₹{rec.projected_gain?.toLocaleString()}/mo
                </span>
              </div>
            </div>

            {/* AI Reasoning box */}
            <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)",
              borderRadius: 10, padding: "12px 14px", marginBottom: 14,
              fontSize: 13, color: "#c7d2fe", lineHeight: 1.6 }}>
              <span style={{ color: "#818cf8", fontWeight: 700, marginRight: 6 }}>🤖 AI:</span>
              {rec.reasoning}
            </div>

            {/* Action row */}
            {!d ? (
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {rec.action === "raise_price" && (
                  <div style={{ color: "#94a3b8", fontSize: 13 }}>
                    Suggested price: <strong style={{ color: "#f1f5f9" }}>₹{rec.suggested_price}</strong>
                  </div>
                )}
                {rec.action === "create_combo" && (
                  <div style={{ color: "#94a3b8", fontSize: 13 }}>
                    Bundle with: <strong style={{ color: "#f97316" }}>{rec.combo_with}</strong>
                    {" "}at <strong style={{ color: "#f1f5f9" }}>₹{rec.combo_price}</strong>
                  </div>
                )}
                {rec.action === "promote" && (
                  <div style={{ color: "#94a3b8", fontSize: 13 }}>
                    Action: <strong style={{ color: "#38bdf8" }}>Feature on Top</strong>
                  </div>
                )}
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <button onClick={() => decide(rec.item_id, "reject")}
                    style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                      color: "#f87171", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600 }}>
                    ✗ Reject
                  </button>
                  <button onClick={() => decide(rec.item_id, "approve", rec.suggested_price)}
                    style={{ background: "#f97316", border: "none", color: "#000",
                      borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontWeight: 800 }}>
                    ✅ Approve → Sync PoS
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ color: d === "approve" ? "#4ade80" : "#f87171", fontWeight: 700, fontSize: 13 }}>
                {d === "approve" ? "✅ Approved — PoS update queued" : "✗ Rejected — kept for review"}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Update useFetch to respect the polling tick
function usePollableFetch(endpoint, mockData, tick) {
  const [data, setData] = useState(mockData);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    fetch(API + endpoint)
      .then((r) => r.json())
      .then((d) => {
        if (active) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.error("Poll fetch error on " + endpoint, err);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
     
  }, [endpoint, tick]);
  return { data, loading };
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────

export default function SmartBiteApp() {
  const [tab, setTab] = useState("overview");
  const [actionItem, setActionItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Polling state to trigger refetching
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch real data
  const { data: summary } = usePollableFetch(
    "/api/dashboard/summary",
    MOCK.summary,
    tick
  );
  const { data: menuData } = usePollableFetch("/api/menu/analytics", {
    items: MOCK.menuItems,
    median_units: 0,
    median_cm: 0,
  }, tick);
  const menuItems = menuData.items || [];
  const { data: combosData } = usePollableFetch("/api/menu/combos", {
    combos: MOCK.combos,
  }, tick);
  const combos = combosData.combos || [];
  const { data: deadHoursData } = usePollableFetch("/api/revenue/dead-hours", {
    hourly_data: MOCK.hourlyData,
  }, tick);
  const hourlyData = deadHoursData.hourly_data || [];
  const { data: voiceOrdersData } = usePollableFetch("/api/voice/orders", {
    orders: MOCK.voiceOrders,
  }, tick);

  // Manage local optimistic state for voice orders for instant updates
  const [voiceOrders, setVoiceOrders] = useState(MOCK.voiceOrders);
  const lastOptimisticUpdate = useRef(0);
  const prevServerOrdersRef = useRef([]);
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    if (voiceOrdersData.orders && !isUpdatingRef.current) {
      const serverOrders = voiceOrdersData.orders;

      // Only update from server if enough time has passed since last optimistic update
      const timeSinceOptimistic = Date.now() - lastOptimisticUpdate.current;

      // Check if server data actually changed (compare stringified IDs to be safe)
      const serverSignature = JSON.stringify(
        serverOrders.slice(0, 3).map((o) => o.id),
      );
      const prevSignature = JSON.stringify(
        prevServerOrdersRef.current.slice(0, 3).map((o) => o.id),
      );
      const dataChanged = serverSignature !== prevSignature;

      if (timeSinceOptimistic > 1500 && dataChanged) {
        // Safe to sync from server
        console.log("🔄 Syncing from server:", serverOrders.length, "orders");
        isUpdatingRef.current = true;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVoiceOrders(serverOrders);
        prevServerOrdersRef.current = serverOrders;
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 100);
      } else if (
        timeSinceOptimistic > 1500 &&
        prevServerOrdersRef.current.length === 0
      ) {
        // Initial load
        console.log("📥 Initial load:", serverOrders.length, "orders");
        setVoiceOrders(serverOrders);
        prevServerOrdersRef.current = serverOrders;
      }
    }
  }, [voiceOrdersData.orders]);

  const { data: missedCallsData } = usePollableFetch("/api/missed-calls", {
    missed_calls: MOCK.missedCalls,
  }, tick);

  // Manage local optimistic state for missed calls slightly differently because of the action
  const [missedCalls, setMissedCalls] = useState(MOCK.missedCalls);
  useEffect(() => {
    if (missedCallsData.missed_calls) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMissedCalls(missedCallsData.missed_calls);
    }
  }, [missedCallsData]);

  const scatterData = menuItems.map((i) => ({
    x: i.units_sold,
    y: i.contribution_margin,
    name: i.name,
    q: i.quadrant,
    color: i.quadrant_color,
  }));

  const tabs = [
    { id: "overview", label: "📊 Overview" },
    { id: "menu", label: "🍽 Menu Intelligence" },
    { id: "voice", label: "🎙 Voice Orders" },
    { id: "recovery", label: "📞 Ghost Recovery" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080d14",
        color: "#f1f5f9",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "0 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 64,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg,#f97316,#ea580c)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            🍛
          </div>
          <div>
            <span
              style={{
                fontWeight: 800,
                fontSize: 18,
                letterSpacing: "-0.02em",
              }}
            >
              SmartBite
            </span>
            <span
              style={{
                color: "#f97316",
                fontWeight: 800,
                fontSize: 18,
                letterSpacing: "-0.02em",
              }}
            >
              {" "}
              AI
            </span>
          </div>
          <span
            style={{
              background: "rgba(249,115,22,0.1)",
              color: "#f97316",
              border: "1px solid rgba(249,115,22,0.2)",
              borderRadius: 20,
              padding: "2px 10px",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            Revenue Copilot
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#4ade80",
              boxShadow: "0 0 10px #4ade80",
              animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            }}
          />
          <style>
            {`
              @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: .5; }
              }
            `}
          </style>
          <span style={{ color: "#4ade80", fontSize: 12, fontWeight: 600 }}>
            Live
          </span>
          <span style={{ color: "#64748b", fontSize: 12, marginLeft: 8 }}>
            Petpooja PoS Connected
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "0 32px",
          display: "flex",
          gap: 4,
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "14px 20px",
              background: "transparent",
              border: "none",
              color: tab === t.id ? "#f97316" : "#64748b",
              fontWeight: tab === t.id ? 700 : 500,
              fontSize: 14,
              cursor: "pointer",
              borderBottom:
                tab === t.id ? "2px solid #f97316" : "2px solid transparent",
              transition: "all 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 32 }}>
        {/* ── OVERVIEW TAB ── */}
        {tab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* KPIs */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 16,
              }}
            >
              <KPICard
                label="Revenue (30d)"
                value={`₹${(summary.total_revenue_30d / 1000).toFixed(0)}K`}
                sub={`${summary.margin_pct}% margin`}
                color="#4ade80"
                icon="💰"
              />
              <KPICard
                label="Avg Order Value"
                value={`₹${summary.aov_7d}`}
                sub="Last 7 days"
                color="#f97316"
                icon="📈"
              />
              <KPICard
                label="Voice Orders"
                value={summary.voice_orders}
                sub="AI-handled calls"
                color="#60a5fa"
                icon="🎙"
              />
              <KPICard
                label="Opportunity"
                value={`₹${(summary.opportunity_score_total / 1000).toFixed(0)}K`}
                sub="Unrealized margin"
                color="#a78bfa"
                icon="🎯"
              />
            </div>

            {/* Quadrant Summary */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 12,
              }}
            >
              {[
                {
                  l: "⭐ Stars",
                  v: summary.stars,
                  c: "#4ade80",
                  d: "High margin + High sales",
                },
                {
                  l: "🐎 Plowhorses",
                  v: 3,
                  c: "#fb923c",
                  d: "Low margin + High sales",
                },
                {
                  l: "🧩 Puzzles",
                  v: summary.puzzles,
                  c: "#60a5fa",
                  d: "High margin + Low sales",
                },
                {
                  l: "🐕 Dogs",
                  v: summary.dogs,
                  c: "#f87171",
                  d: "Low margin + Low sales",
                },
              ].map((q) => (
                <div
                  key={q.l}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 12,
                    padding: "16px 20px",
                  }}
                >
                  <div style={{ fontSize: 24, fontWeight: 800, color: q.c }}>
                    {q.v}
                  </div>
                  <div
                    style={{ fontWeight: 700, color: "#f1f5f9", marginTop: 4 }}
                  >
                    {q.l}
                  </div>
                  <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>
                    {q.d}
                  </div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.6fr 1fr",
                gap: 20,
              }}
            >
              <div
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    marginBottom: 20,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>Hourly Order Flow</span>
                  <span
                    style={{ color: "#ef4444", fontSize: 12, fontWeight: 600 }}
                  >
                    🔴 Dead Hours Detected
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={hourlyData}>
                    <defs>
                      <linearGradient id="og" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="#f97316"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#f97316"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                    />
                    <XAxis
                      dataKey="hour"
                      stroke="#475569"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(h) => `${h}:00`}
                    />
                    <YAxis stroke="#475569" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: "#0f172a",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 8,
                        color: "#f1f5f9",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="orders"
                      stroke="#f97316"
                      fill="url(#og)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 20 }}>
                  Menu Matrix
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <ScatterChart>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                    />
                    <XAxis
                      dataKey="x"
                      name="Units Sold"
                      stroke="#475569"
                      tick={{ fontSize: 10 }}
                      label={{
                        value: "Popularity →",
                        position: "insideBottom",
                        fill: "#475569",
                        fontSize: 10,
                        offset: -2,
                      }}
                    />
                    <YAxis
                      dataKey="y"
                      name="Margin"
                      stroke="#475569"
                      tick={{ fontSize: 10 }}
                      label={{
                        value: "↑ Margin",
                        angle: -90,
                        position: "insideLeft",
                        fill: "#475569",
                        fontSize: 10,
                      }}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      contentStyle={{
                        background: "#0f172a",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 8,
                        color: "#f1f5f9",
                        fontSize: 12,
                      }}
                      formatter={(v, n) => [v, n === "x" ? "Units" : "CM ₹"]}
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.name || ""
                      }
                    />
                    <Scatter data={scatterData}>
                      {scatterData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Combos */}
            <div
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 16,
                padding: 24,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 16 }}>
                🔗 Recommended Combos{" "}
                <span
                  style={{ color: "#64748b", fontWeight: 500, fontSize: 13 }}
                >
                  — based on order co-occurrence
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2,1fr)",
                  gap: 12,
                }}
              >
                {combos.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      background: "rgba(249,115,22,0.05)",
                      border: "1px solid rgba(249,115,22,0.15)",
                      borderRadius: 12,
                      padding: "14px 16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: "#f1f5f9" }}>
                        {c.item_a} + {c.item_b}
                      </div>
                      <div
                        style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}
                      >
                        Ordered together {c.frequency}× this month
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: "#4ade80", fontWeight: 800 }}>
                        ₹{c.combo_price}
                      </div>
                      <div style={{ color: "#64748b", fontSize: 11 }}>
                        save ₹{c.saving}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── MENU INTELLIGENCE TAB ── */}
        {tab === "menu" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Added AI Recommendations Component at Top */}
            <div
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 16,
                padding: 16,
              }}
            >
              <AIRecommendations tick={tick} />
            </div>
            
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>
                  Menu Intelligence
                </div>
                <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
                  Click any item → one-click fix to optimize pricing or archive
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div
                  style={{
                    background: "rgba(249,115,22,0.1)",
                    border: "1px solid rgba(249,115,22,0.2)",
                    borderRadius: 10,
                    padding: "8px 14px",
                    fontSize: 12,
                    color: "#f97316",
                    fontWeight: 700,
                  }}
                >
                  Total Opportunity: ₹
                  {(summary.opportunity_score_total / 1000).toFixed(1)}K
                </div>
              </div>
            </div>
            <div
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 16,
                padding: 16,
              }}
            >
              <MenuTable items={menuItems} onAction={setActionItem} />
            </div>
          </div>
        )}
        {/* ── VOICE ORDERS TAB ── */}
        {tab === "voice" && (
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 800 }}>
                  🎙 Voice Order Feed
                </div>
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        "⚠️ WARNING: This will permanently delete all voice orders!\n\n" +
                          `You have ${voiceOrders.length} order(s) in the feed.\n\n` +
                          "Are you sure you want to clear everything?",
                      )
                    ) {
                      console.log("🗑️ Clearing all voice orders...");
                      fetch(API + "/api/voice/orders", {
                        method: "DELETE",
                      })
                        .then((res) => res.json())
                        .then((data) => {
                          console.log("✅ Orders cleared:", data);
                          setVoiceOrders([]);
                          prevServerOrdersRef.current = [];
                          setTick((t) => t + 1);
                        })
                        .catch((err) => {
                          console.error("❌ Error clearing orders:", err);
                          alert("Failed to clear orders. Check console.");
                        });
                    }
                  }}
                  style={{
                    background: "rgba(239, 68, 68, 0.1)",
                    color: "#ef4444",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  🗑️ Clear All
                </button>
              </div>
              <div style={{ color: "#64748b", fontSize: 13, marginBottom: 20 }}>
                Real-time AI-handled phone orders
              </div>
              <VoiceOrderFeed orders={voiceOrders} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Added LiveVoiceDemo component passing the refetch tick setter */}
              <LiveVoiceDemo onOrderPlaced={() => setTick(t => t + 1)} />

              {/* Voice Simulator Widget */}
              <div
                style={{
                  background: "rgba(96, 165, 250, 0.05)",
                  border: "1px solid rgba(96, 165, 250, 0.2)",
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontSize: 20 }}>🤖</div>
                  <div>
                    <div
                      style={{
                        fontWeight: 800,
                        color: "#60a5fa",
                        fontSize: 16,
                      }}
                    >
                      Live Demo Simulator
                    </div>
                    <div style={{ color: "#94a3b8", fontSize: 12 }}>
                      Test the AI pipeline with Hinglish text
                    </div>
                  </div>
                </div>

                {/* Success Notification */}
                {successMessage && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "10px 14px",
                      background: "rgba(74, 222, 128, 0.1)",
                      border: "1px solid rgba(74, 222, 128, 0.3)",
                      borderRadius: 8,
                      color: "#4ade80",
                      fontSize: 13,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      animation: "slideIn 0.3s ease-out",
                    }}
                  >
                    <span>⚡</span>
                    {successMessage}
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    console.log("Form submitted!");
                    const text = e.target.elements.transcript.value;
                    console.log("Transcript:", text);
                    if (!text) return;

                    setIsSubmitting(true);
                    console.log("Sending to:", API + "/api/voice/demo");
                    const startTime = Date.now();
                    fetch(API + "/api/voice/demo", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ transcript: text }),
                    })
                      .then((res) => {
                        console.log("Response status:", res.status);
                        if (res.ok) {
                          return res.json();
                        }
                        throw new Error(`HTTP ${res.status}`);
                      })
                      .then((data) => {
                        const elapsed = Date.now() - startTime;
                        console.log(`✅ Success! Processed in ${elapsed}ms`);
                        console.log("Response:", data);

                        // OPTIMISTIC UPDATE: Add order to UI immediately
                        const newOrder = {
                          id: Date.now(),
                          phone: "+919999999999",
                          transcript: text,
                          structured_order: JSON.stringify(data.items || []),
                          status: "confirmed",
                          created_at: new Date().toISOString(),
                        };
                        setVoiceOrders((prev) => [newOrder, ...prev]);
                        lastOptimisticUpdate.current = Date.now();
                        console.log("✨ Order added to UI instantly!");

                        // Show success message
                        setSuccessMessage(
                          `✅ Order processed in ${elapsed}ms!`,
                        );
                        setTimeout(() => setSuccessMessage(""), 3000);

                        e.target.reset();
                        // Sync with server after 1.5 seconds to get real data
                        setTimeout(() => {
                          console.log("🔄 Allowing server sync...");
                          lastOptimisticUpdate.current = 0; // Allow server update now
                          setTick((t) => t + 1); // Trigger refresh
                        }, 1500);
                        setIsSubmitting(false);
                      })
                      .catch((err) => {
                        console.error("Voice demo error:", err);
                        alert("Error: " + err.message);
                        setIsSubmitting(false);
                      });
                  }}
                  style={{ display: "flex", gap: 10 }}
                >
                  <input
                    name="transcript"
                    placeholder="E.g., ek butter chicken aur do garlic naan"
                    style={{
                      flex: 1,
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid rgba(96, 165, 250, 0.3)",
                      borderRadius: 10,
                      padding: "12px 16px",
                      color: "#f1f5f9",
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      background: isSubmitting ? "#94a3b8" : "#60a5fa",
                      color: "#0f172a",
                      border: "none",
                      borderRadius: 10,
                      padding: "0 20px",
                      fontWeight: 800,
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      opacity: isSubmitting ? 0.7 : 1,
                    }}
                  >
                    {isSubmitting ? "Submitting..." : "Simulate"}
                  </button>
                </form>
              </div>

              {/* Voice Pipeline */}
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
                  🧠 Voice Pipeline
                </div>
                <div
                  style={{ color: "#64748b", fontSize: 13, marginBottom: 20 }}
                >
                  How the AI processes each call
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {[
                    {
                      step: "1",
                      label: "Call Received",
                      desc: "Twilio intercepts incoming call",
                      icon: "📞",
                      color: "#60a5fa",
                    },
                    {
                      step: "2",
                      label: "Speech → Text",
                      desc: "OpenAI Whisper transcribes audio (EN/HI/Hinglish)",
                      icon: "🎙",
                      color: "#a78bfa",
                    },
                    {
                      step: "3",
                      label: "Intent Parsing",
                      desc: "spaCy extracts items, qty, modifiers",
                      icon: "🧠",
                      color: "#f97316",
                    },
                    {
                      step: "4",
                      label: "Fuzzy Match",
                      desc: "Maps speech to exact PoS menu items",
                      icon: "🔍",
                      color: "#fb923c",
                    },
                    {
                      step: "5",
                      label: "Upsell Injection",
                      desc: "Dead-hour combos suggested in real-time",
                      icon: "💡",
                      color: "#4ade80",
                    },
                    {
                      step: "6",
                      label: "PoS Push",
                      desc: "Structured JSON → KOT auto-created",
                      icon: "✅",
                      color: "#4ade80",
                    },
                  ].map((s) => (
                    <div
                      key={s.step}
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 12,
                        padding: "14px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: `${s.color}15`,
                          border: `1px solid ${s.color}30`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 16,
                          flexShrink: 0,
                        }}
                      >
                        {s.icon}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: "#f1f5f9" }}>
                          {s.label}
                        </div>
                        <div style={{ color: "#64748b", fontSize: 12 }}>
                          {s.desc}
                        </div>
                      </div>
                      <div
                        style={{
                          marginLeft: "auto",
                          color: s.color,
                          fontWeight: 800,
                          fontSize: 12,
                        }}
                      >
                        STEP {s.step}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── GHOST RECOVERY TAB ── */}
        {tab === "recovery" && (
          <div style={{ maxWidth: 600 }}>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
              📞 Ghost Call Recovery
            </div>
            <div style={{ color: "#64748b", fontSize: 13, marginBottom: 8 }}>
              Missed calls = lost revenue. Recover them automatically via
              WhatsApp.
            </div>
            <div
              style={{
                background: "rgba(249,115,22,0.08)",
                border: "1px solid rgba(249,115,22,0.2)",
                borderRadius: 12,
                padding: "12px 16px",
                marginBottom: 24,
                fontSize: 13,
                color: "#fb923c",
              }}
            >
              💡 Restaurants miss avg. 18% of calls during peak hours. Each
              recovered call = ₹{summary.aov_7d} AOV opportunity.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {missedCalls.map((call) => (
                <MissedCallCard
                  key={call.id}
                  call={call}
                  onRecover={(id) =>
                    setMissedCalls((prev) =>
                      prev.map((c) =>
                        c.id === id ? { ...c, recovered: 1 } : c,
                      ),
                    )
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Modal */}
      <ActionModal item={actionItem} onClose={() => setActionItem(null)} />
    </div>
  );
}
