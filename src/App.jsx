import { useState, useEffect, useRef, useCallback } from "react";

const CLAUDE_MODEL = "claude-sonnet-4-20250514";
const fmt = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const CAT_COLORS = { Housing:"#6366f1",Food:"#f59e0b",Transport:"#10b981",Debt:"#ef4444",Bills:"#8b5cf6",Leisure:"#ec4899",Health:"#14b8a6",Education:"#3b82f6",Other:"#94a3b8" };
const CAT_ICONS  = { Housing:"🏠",Food:"🍔",Transport:"🚗",Debt:"💳",Bills:"⚡",Leisure:"🎬",Health:"❤️",Education:"📚",Other:"💼" };
const CATS = Object.keys(CAT_COLORS);

const DEFAULTS = {
  income: 85000,
  expenses:[
    {id:1,name:"Rent",amount:18000,category:"Housing"},
    {id:2,name:"Groceries",amount:8000,category:"Food"},
    {id:3,name:"Car EMI",amount:12000,category:"Debt"},
    {id:4,name:"Utilities",amount:2500,category:"Bills"},
    {id:5,name:"Dining Out",amount:5000,category:"Food"},
    {id:6,name:"Transport",amount:3500,category:"Transport"},
  ],
  goals:[
    {id:1,name:"Emergency Fund",target:300000,saved:120000,color:"#10b981"},
    {id:2,name:"Europe Trip",target:150000,saved:45000,color:"#f59e0b"},
  ],
  debts:[
    {id:1,name:"Car Loan",total:480000,remaining:320000,emi:12000,rate:9,color:"#ef4444"},
    {id:2,name:"Credit Card",total:50000,remaining:28000,emi:5000,rate:36,color:"#8b5cf6"},
  ],
};

function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 800);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}

/* ── EditableAmount — only commits on blur/enter, never on keystroke ── */
function EditableAmount({ value, onChange, style = {} }) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState("");
  const ref = useRef(null);

  const open = () => { setRaw(String(value)); setEditing(true); };
  useEffect(() => { if (editing && ref.current) { ref.current.focus(); ref.current.select(); } }, [editing]);

  const commit = () => {
    const n = parseFloat(raw.replace(/,/g, ""));
    if (!isNaN(n) && n >= 0) onChange(n);
    setEditing(false);
  };

  if (editing) return (
    <input
      ref={ref}
      value={raw}
      type="number"
      inputMode="decimal"
      onChange={e => setRaw(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === "Enter") { commit(); } if (e.key === "Escape") setEditing(false); }}
      style={{ background:"rgba(16,185,129,0.12)", border:"1px solid #10b981", borderRadius:6, padding:"3px 8px", color:"#10b981", fontSize:"inherit", fontWeight:"inherit", fontFamily:"inherit", width:110, outline:"none", ...style }}
    />
  );
  return (
    <span
      onClick={open}
      title="Tap to edit"
      style={{ cursor:"pointer", borderBottom:"1px dashed rgba(255,255,255,0.3)", paddingBottom:1, ...style }}
    >
      {value.toLocaleString("en-IN")}
    </span>
  );
}

/* ── EditableText ── */
function EditableText({ value, onChange, style = {} }) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState("");
  const ref = useRef(null);

  const open = () => { setRaw(value); setEditing(true); };
  useEffect(() => { if (editing && ref.current) { ref.current.focus(); ref.current.select(); } }, [editing]);

  const commit = () => { if (raw.trim()) onChange(raw.trim()); setEditing(false); };

  if (editing) return (
    <input
      ref={ref}
      value={raw}
      onChange={e => setRaw(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
      style={{ background:"rgba(16,185,129,0.12)", border:"1px solid #10b981", borderRadius:6, padding:"3px 8px", color:"#e8e4d9", fontSize:"inherit", fontFamily:"inherit", width:160, outline:"none", ...style }}
    />
  );
  return (
    <span onClick={open} title="Tap to edit" style={{ cursor:"pointer", borderBottom:"1px dashed rgba(255,255,255,0.3)", paddingBottom:1, ...style }}>
      {value}
    </span>
  );
}

function Bar({ pct, color, h = 8 }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:h, height:h, overflow:"hidden" }}>
      <div style={{ width:`${Math.min(pct,100)}%`, height:"100%", background:color, borderRadius:h, transition:"width 0.4s" }} />
    </div>
  );
}

function healthScore(income, totalExp, savingsRate, debts) {
  let score = 100;
  if (savingsRate < 10) score -= 30; else if (savingsRate < 20) score -= 15;
  const totalEMI = debts.reduce((s,d) => s + d.emi, 0);
  const dti = income > 0 ? (totalEMI / income) * 100 : 100;
  if (dti > 40) score -= 30; else if (dti > 20) score -= 15;
  if (totalExp > income) score -= 20;
  return Math.max(score, 5);
}

/* ════ ADD EXPENSE FORM — self-contained state, no focus issues ════ */
function AddExpenseForm({ onAdd, onCancel, mob }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const nameRef = useRef(null);
  useEffect(() => { if (nameRef.current) nameRef.current.focus(); }, []);

  const inp = { background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:8, padding:"10px 12px", color:"#e8e4d9", fontSize:15, fontFamily:"inherit", outline:"none", width:"100%", boxSizing:"border-box" };
  const lbl = { fontSize:11, color:"#64748b", display:"block", marginBottom:5 };

  const submit = () => {
    if (!name.trim() || !amount) return;
    onAdd({ name: name.trim(), amount: parseFloat(amount), category });
  };

  return (
    <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(16,185,129,0.3)", borderRadius:14, padding:mob?14:18, marginBottom:14 }}>
      <div style={{ fontSize:13, color:"#10b981", marginBottom:12, fontWeight:700 }}>New Expense</div>
      <div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"1fr 1fr", gap:10, marginBottom:10 }}>
        <div>
          <label style={lbl}>EXPENSE NAME</label>
          <input ref={nameRef} style={inp} placeholder="e.g. Netflix, Gym" value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()} />
        </div>
        <div>
          <label style={lbl}>AMOUNT (₹)</label>
          <input style={inp} type="number" inputMode="decimal" placeholder="0" value={amount}
            onChange={e => setAmount(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()} />
        </div>
      </div>
      <div style={{ marginBottom:12 }}>
        <label style={lbl}>CATEGORY</label>
        <select style={inp} value={category} onChange={e => setCategory(e.target.value)}>
          {CATS.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={submit} style={{ flex:1, background:"linear-gradient(135deg,#10b981,#059669)", border:"none", borderRadius:8, padding:"11px 0", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Add Expense</button>
        <button onClick={onCancel} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"11px 16px", color:"#94a3b8", fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
      </div>
    </div>
  );
}

/* ════ ADD GOAL FORM ════ */
function AddGoalForm({ onAdd, onCancel, mob }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("0");
  const nameRef = useRef(null);
  useEffect(() => { if (nameRef.current) nameRef.current.focus(); }, []);

  const inp = { background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:8, padding:"10px 12px", color:"#e8e4d9", fontSize:15, fontFamily:"inherit", outline:"none", width:"100%", boxSizing:"border-box" };
  const lbl = { fontSize:11, color:"#64748b", display:"block", marginBottom:5 };

  const submit = () => {
    if (!name.trim() || !target) return;
    onAdd({ name: name.trim(), target: parseFloat(target), saved: parseFloat(saved) || 0 });
  };

  return (
    <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(16,185,129,0.3)", borderRadius:14, padding:mob?14:18, marginBottom:14 }}>
      <div style={{ fontSize:13, color:"#10b981", marginBottom:12, fontWeight:700 }}>New Goal</div>
      <div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr", gap:10, marginBottom:12 }}>
        <div>
          <label style={lbl}>GOAL NAME</label>
          <input ref={nameRef} style={inp} placeholder="e.g. New Car" value={name}
            onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
        </div>
        <div>
          <label style={lbl}>TARGET (₹)</label>
          <input style={inp} type="number" inputMode="decimal" placeholder="500000" value={target}
            onChange={e => setTarget(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
        </div>
        <div>
          <label style={lbl}>ALREADY SAVED (₹)</label>
          <input style={inp} type="number" inputMode="decimal" placeholder="0" value={saved}
            onChange={e => setSaved(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
        </div>
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={submit} style={{ flex:1, background:"linear-gradient(135deg,#10b981,#059669)", border:"none", borderRadius:8, padding:"11px 0", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Add Goal</button>
        <button onClick={onCancel} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"11px 16px", color:"#94a3b8", fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
      </div>
    </div>
  );
}

/* ════ ADD DEBT FORM ════ */
function AddDebtForm({ onAdd, onCancel, mob }) {
  const [name, setName] = useState("");
  const [remaining, setRemaining] = useState("");
  const [emi, setEmi] = useState("");
  const [rate, setRate] = useState("");
  const nameRef = useRef(null);
  useEffect(() => { if (nameRef.current) nameRef.current.focus(); }, []);

  const inp = { background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:8, padding:"10px 12px", color:"#e8e4d9", fontSize:15, fontFamily:"inherit", outline:"none", width:"100%", boxSizing:"border-box" };
  const lbl = { fontSize:11, color:"#64748b", display:"block", marginBottom:5 };

  const submit = () => {
    if (!name.trim() || !remaining || !emi) return;
    onAdd({ name: name.trim(), remaining: parseFloat(remaining), emi: parseFloat(emi), rate: parseFloat(rate) || 0 });
  };

  return (
    <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:14, padding:mob?14:18, marginBottom:14 }}>
      <div style={{ fontSize:13, color:"#ef4444", marginBottom:12, fontWeight:700 }}>New Debt / Loan</div>
      <div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr 1fr", gap:10, marginBottom:12 }}>
        <div>
          <label style={lbl}>DEBT NAME</label>
          <input ref={nameRef} style={inp} placeholder="e.g. Home Loan" value={name}
            onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
        </div>
        <div>
          <label style={lbl}>REMAINING (₹)</label>
          <input style={inp} type="number" inputMode="decimal" placeholder="500000" value={remaining}
            onChange={e => setRemaining(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
        </div>
        <div>
          <label style={lbl}>MONTHLY EMI (₹)</label>
          <input style={inp} type="number" inputMode="decimal" placeholder="10000" value={emi}
            onChange={e => setEmi(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
        </div>
        <div>
          <label style={lbl}>INTEREST RATE (%)</label>
          <input style={inp} type="number" inputMode="decimal" placeholder="9" value={rate}
            onChange={e => setRate(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
        </div>
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={submit} style={{ flex:1, background:"linear-gradient(135deg,#ef4444,#dc2626)", border:"none", borderRadius:8, padding:"11px 0", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Add Debt</button>
        <button onClick={onCancel} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"11px 16px", color:"#94a3b8", fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
      </div>
    </div>
  );
}

/* ════════ LANDING ════════ */
function Landing({ onEnter }) {
  const w = useWindowWidth();
  const mob = w < 640;
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#080e1a,#0d1b2a)", fontFamily:"'Georgia',serif", color:"#e8e4d9", overflowX:"hidden" }}>
      <div style={{ position:"fixed", top:"-20%", right:"-10%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(16,185,129,0.08),transparent 70%)", pointerEvents:"none" }} />
      <nav style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:mob?"16px 20px":"20px 44px", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:24 }}>₹</span>
          <span style={{ fontSize:18, fontWeight:700, letterSpacing:1 }}>ClearWealth</span>
        </div>
        <button onClick={onEnter} style={{ background:"linear-gradient(135deg,#10b981,#059669)", border:"none", borderRadius:8, padding:"9px 20px", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Try Free →</button>
      </nav>
      <div style={{ textAlign:"center", padding:mob?"60px 20px 50px":"90px 24px 70px" }}>
        <div style={{ display:"inline-block", background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.3)", borderRadius:20, padding:"5px 16px", fontSize:12, color:"#10b981", marginBottom:28, letterSpacing:1 }}>✦ FREE · NO CARD NEEDED</div>
        <h1 style={{ fontSize:mob?"36px":"clamp(36px,6vw,76px)", fontWeight:700, lineHeight:1.05, margin:"0 auto 20px", maxWidth:820, background:"linear-gradient(135deg,#e8e4d9 30%,#10b981 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
          Your Money.<br/>Finally Under Control.
        </h1>
        <p style={{ fontSize:mob?15:18, color:"#94a3b8", maxWidth:500, margin:"0 auto 40px", lineHeight:1.7 }}>Budget, goals, debt tracking and an AI advisor — all in one free app.</p>
        <button onClick={onEnter} style={{ background:"linear-gradient(135deg,#10b981,#059669)", border:"none", borderRadius:12, padding:mob?"14px 32px":"16px 44px", color:"#fff", fontSize:mob?15:17, fontWeight:700, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 0 40px rgba(16,185,129,0.3)" }}>Start Planning Free</button>
        <p style={{ marginTop:16, color:"#334155", fontSize:12 }}>Trusted by 12,400+ people · ⭐ 4.9/5</p>
      </div>
      <div style={{ maxWidth:1000, margin:"0 auto", padding:mob?"0 16px 60px":"0 24px 80px", display:"grid", gridTemplateColumns:mob?"1fr 1fr":"repeat(3,1fr)", gap:12 }}>
        {[
          {icon:"📊",t:"Budget Tracker",d:"Know where every rupee goes"},
          {icon:"✏️",t:"Fully Editable",d:"Tap any number to change it"},
          {icon:"🎯",t:"Goal Tracker",d:"Visualise your savings targets"},
          {icon:"💳",t:"Debt Planner",d:"Track EMIs, crush debt faster"},
          {icon:"❤️",t:"Health Score",d:"See your overall financial fitness"},
          {icon:"🤖",t:"AI Advisor",d:"Claude answers any money question"},
        ].map(f => (
          <div key={f.t} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:mob?"16px":"22px" }}>
            <div style={{ fontSize:mob?24:28, marginBottom:8 }}>{f.icon}</div>
            <div style={{ fontSize:mob?13:15, fontWeight:700, marginBottom:4 }}>{f.t}</div>
            <div style={{ color:"#64748b", lineHeight:1.5, fontSize:mob?12:13 }}>{f.d}</div>
          </div>
        ))}
      </div>
      <div style={{ textAlign:"center", padding:mob?"0 20px 60px":"0 24px 80px" }}>
        <button onClick={onEnter} style={{ background:"linear-gradient(135deg,#10b981,#059669)", border:"none", borderRadius:12, padding:"14px 40px", color:"#fff", fontSize:16, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Get Started Free →</button>
      </div>
    </div>
  );
}

/* ════════ DASHBOARD ════════ */
function Dashboard() {
  const w = useWindowWidth();
  const mob = w < 640;
  const [tab, setTab] = useState("overview");
  const [income, setIncome] = useState(DEFAULTS.income);
  const [expenses, setExpenses] = useState(DEFAULTS.expenses);
  const [goals, setGoals] = useState(DEFAULTS.goals);
  const [debts, setDebts] = useState(DEFAULTS.debts);
  const [showAddExp, setShowAddExp] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [msgs, setMsgs] = useState([{ role:"assistant", content:"Hi! I'm your AI financial advisor. I can see your full financial picture. Ask me anything about budgeting, saving, investing, or debt! 💰" }]);
  const [chatInput, setChatInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const chatRef = useRef(null);

  const totalExp = expenses.reduce((s,e) => s + e.amount, 0);
  const savings = income - totalExp;
  const savingsRate = income > 0 ? Math.round((savings/income)*100) : 0;
  const totalDebt = debts.reduce((s,d) => s + d.remaining, 0);
  const totalEMI = debts.reduce((s,d) => s + d.emi, 0);
  const byCat = expenses.reduce((a,e) => { a[e.category] = (a[e.category]||0) + e.amount; return a; }, {});
  const score = healthScore(income, totalExp, savingsRate, debts);
  const scoreColor = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  const scoreLabel = score >= 80 ? "Excellent 🌟" : score >= 60 ? "Good 👍" : score >= 40 ? "Fair ⚠️" : "Needs Work 🔴";

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [msgs]);

  const handleAddExp = useCallback((data) => {
    setExpenses(x => [...x, { id:Date.now(), ...data }]);
    setShowAddExp(false);
  }, []);

  const handleAddGoal = useCallback((data) => {
    const cols = ["#10b981","#f59e0b","#6366f1","#ec4899","#14b8a6"];
    setGoals(g => [...g, { id:Date.now(), color:cols[g.length%cols.length], ...data }]);
    setShowAddGoal(false);
  }, []);

  const handleAddDebt = useCallback((data) => {
    const cols = ["#ef4444","#8b5cf6","#f59e0b","#3b82f6","#ec4899"];
    setDebts(d => [...d, { id:Date.now(), total:data.remaining, color:cols[d.length%cols.length], ...data }]);
    setShowAddDebt(false);
  }, []);

  const sendMsg = async () => {
    if (!chatInput.trim() || aiLoading) return;
    const u = chatInput.trim();
    setChatInput("");
    setMsgs(m => [...m, { role:"user", content:u }]);
    setAiLoading(true);
    const ctx = `You are a friendly AI financial advisor for Indian users. User data:
- Income: ₹${income.toLocaleString()} | Expenses: ₹${totalExp.toLocaleString()} | Savings: ₹${savings.toLocaleString()} (${savingsRate}%)
- Spending: ${JSON.stringify(byCat)}
- Goals: ${goals.map(g=>`${g.name} ₹${g.saved}/${g.target}`).join("; ")}
- Debts: ${debts.map(d=>`${d.name} ₹${d.remaining} remaining at ${d.rate}% (EMI ₹${d.emi})`).join("; ")}
- Financial Health Score: ${score}/100 (${scoreLabel})
Give concise, actionable advice in 2-4 sentences. Use Indian context — mention PPF, NPS, SIPs when relevant.`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ model:CLAUDE_MODEL, max_tokens:1000, system:ctx, messages:[...msgs.map(m=>({role:m.role,content:m.content})),{role:"user",content:u}] }) });
      const data = await res.json();
      setMsgs(m => [...m, { role:"assistant", content:data.content?.[0]?.text || "Sorry, try again." }]);
    } catch { setMsgs(m => [...m, { role:"assistant", content:"Connection error. Try again." }]); }
    setAiLoading(false);
  };

  /* shared styles */
  const card = { background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:mob?14:20 };
  const btn = (bg2="#10b981") => ({ background:`linear-gradient(135deg,${bg2},${bg2}cc)`, border:"none", borderRadius:8, padding:"10px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" });
  const del = { background:"rgba(239,68,68,0.08)", border:"none", borderRadius:6, padding:"6px 10px", color:"#ef4444", cursor:"pointer", fontSize:13 };
  const lbl = { fontSize:10, color:"#64748b", display:"block", marginBottom:4, letterSpacing:0.5, textTransform:"uppercase" };

  const TABS = mob
    ? [{id:"overview",icon:"📊",label:"HOME"},{id:"budget",icon:"💰",label:"BUDGET"},{id:"goals",icon:"🎯",label:"GOALS"},{id:"debts",icon:"💳",label:"DEBTS"},{id:"advisor",icon:"🤖",label:"AI"}]
    : [{id:"overview",l:"📊 Overview"},{id:"budget",l:"💰 Budget"},{id:"goals",l:"🎯 Goals"},{id:"debts",l:"💳 Debts"},{id:"advisor",l:"🤖 AI Advisor"}];

  return (
    <div style={{ minHeight:"100vh", background:"#080e1a", color:"#e8e4d9", fontFamily:"'Georgia',serif", paddingBottom:mob?80:0 }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:mob?"12px 16px":"12px 24px", borderBottom:"1px solid rgba(255,255,255,0.06)", background:"rgba(8,14,26,0.97)", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:20 }}>₹</span>
          <span style={{ fontSize:15, fontWeight:700 }}>ClearWealth</span>
          <span style={{ background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.3)", color:"#10b981", fontSize:10, padding:"2px 6px", borderRadius:8 }}>FREE</span>
        </div>
        {!mob && (
          <nav style={{ display:"flex", gap:2, background:"rgba(255,255,255,0.03)", borderRadius:10, padding:3 }}>
            {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ padding:"7px 14px", borderRadius:8, border:"none", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit", background:tab===t.id?"rgba(16,185,129,0.15)":"transparent", color:tab===t.id?"#10b981":"#64748b" }}>{t.l}</button>)}
          </nav>
        )}
        <div style={{ fontSize:11, color:"#475569" }}>✏️ Tap any value</div>
      </div>

      {/* Body */}
      <div style={{ maxWidth:1100, margin:"0 auto", padding:mob?"14px":"24px", boxSizing:"border-box" }}>

        {/* ══ OVERVIEW ══ */}
        {tab === "overview" && (
          <div>
            {/* Health Score */}
            <div style={{ ...card, marginBottom:14, position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${scoreColor},${scoreColor}88)` }} />
              <div style={{ display:"flex", alignItems:"center", gap:mob?14:24, flexWrap:mob?"wrap":"nowrap" }}>
                <div style={{ textAlign:"center", flexShrink:0 }}>
                  <div style={{ width:mob?72:88, height:mob?72:88, borderRadius:"50%", border:`4px solid ${scoreColor}`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                    <div style={{ fontSize:mob?22:26, fontWeight:900, color:scoreColor }}>{score}</div>
                    <div style={{ fontSize:9, color:"#64748b" }}>/100</div>
                  </div>
                  <div style={{ fontSize:11, color:scoreColor, fontWeight:700, marginTop:6 }}>Health Score</div>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:mob?16:20, fontWeight:800, marginBottom:2 }}>{scoreLabel}</div>
                  <div style={{ fontSize:12, color:"#64748b", marginBottom:12 }}>Based on savings rate, debt load & spending</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    {[
                      {l:"Income",v:fmt(income),c:"#10b981"},
                      {l:"Expenses",v:fmt(totalExp),c:"#ef4444"},
                      {l:"Savings",v:fmt(savings),c:savings>=0?"#10b981":"#ef4444"},
                      {l:"Savings Rate",v:`${savingsRate}%`,c:savingsRate>=20?"#10b981":"#f59e0b"},
                    ].map(s => (
                      <div key={s.l} style={{ background:"rgba(255,255,255,0.03)", borderRadius:10, padding:"8px 12px" }}>
                        <div style={{ fontSize:10, color:"#64748b", marginBottom:2 }}>{s.l}</div>
                        <div style={{ fontSize:mob?14:16, fontWeight:800, color:s.c }}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Income bar */}
            <div style={{ ...card, marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:13 }}>
                <span style={{ color:"#64748b" }}>Income: <span style={{ color:"#10b981", fontWeight:700 }}>₹<EditableAmount value={income} onChange={setIncome} style={{ color:"#10b981", fontWeight:700 }} /></span></span>
                <span style={{ color:"#ef4444", fontWeight:700 }}>{Math.round((totalExp/Math.max(income,1))*100)}% spent</span>
              </div>
              <Bar pct={(totalExp/Math.max(income,1))*100} color={totalExp>income?"#ef4444":"#10b981"} h={10} />
            </div>

            {/* Breakdown */}
            <div style={{ ...card, marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:12 }}>Spending Breakdown</div>
              {Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([cat,amt]) => (
                <div key={cat} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, fontSize:13 }}>
                    <span style={{ color:"#94a3b8" }}>{CAT_ICONS[cat]} {cat}</span>
                    <span style={{ color:CAT_COLORS[cat], fontWeight:700 }}>{fmt(amt)}</span>
                  </div>
                  <Bar pct={(amt/Math.max(totalExp,1))*100} color={CAT_COLORS[cat]} h={5} />
                </div>
              ))}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"1fr 1fr", gap:14 }}>
              <div style={card}>
                <div style={{ fontSize:14, fontWeight:700, marginBottom:12 }}>🎯 Goals</div>
                {goals.length===0 && <div style={{ color:"#334155", fontSize:13 }}>No goals yet — add one!</div>}
                {goals.slice(0,3).map(g => (
                  <div key={g.id} style={{ marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, fontSize:13 }}><span>{g.name}</span><span style={{ color:g.color, fontWeight:700 }}>{Math.min(Math.round((g.saved/g.target)*100),100)}%</span></div>
                    <Bar pct={(g.saved/Math.max(g.target,1))*100} color={g.color} h={6} />
                  </div>
                ))}
              </div>
              <div style={card}>
                <div style={{ fontSize:14, fontWeight:700, marginBottom:12 }}>💳 Debts</div>
                {debts.length===0 && <div style={{ color:"#334155", fontSize:13 }}>No debts — amazing! 🎉</div>}
                {debts.slice(0,3).map(d => (
                  <div key={d.id} style={{ marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, fontSize:13 }}><span>{d.name}</span><span style={{ color:d.color, fontWeight:700 }}>{fmt(d.remaining)}</span></div>
                    <Bar pct={(d.remaining/Math.max(d.total,1))*100} color={d.color} h={6} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ BUDGET ══ */}
        {tab === "budget" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16, flexWrap:"wrap", gap:8 }}>
              <div>
                <h2 style={{ fontSize:mob?18:22, margin:0 }}>Budget Tracker</h2>
                <p style={{ color:"#475569", fontSize:13, marginTop:4 }}>
                  Income: ₹<EditableAmount value={income} onChange={setIncome} style={{ color:"#10b981", fontWeight:700 }} />
                  &nbsp;·&nbsp;
                  {savings >= 0
                    ? <span style={{ color:"#10b981" }}>Saving {fmt(savings)}/mo</span>
                    : <span style={{ color:"#ef4444" }}>Over by {fmt(Math.abs(savings))}</span>}
                </p>
              </div>
              <button style={btn()} onClick={() => setShowAddExp(v => !v)}>{showAddExp ? "✕ Cancel" : "+ Add Expense"}</button>
            </div>

            {showAddExp && <AddExpenseForm onAdd={handleAddExp} onCancel={() => setShowAddExp(false)} mob={mob} />}

            <div style={{ ...card, marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#64748b", marginBottom:8 }}>
                <span>Spent: <span style={{ color:"#ef4444", fontWeight:700 }}>{fmt(totalExp)}</span></span>
                <span>Income: <span style={{ color:"#10b981", fontWeight:700 }}>{fmt(income)}</span></span>
              </div>
              <Bar pct={(totalExp/Math.max(income,1))*100} color={totalExp>income?"#ef4444":"#10b981"} h={10} />
            </div>

            <div style={card}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#475569", marginBottom:10 }}>
                <span>{expenses.length} expenses · tap name or amount to edit</span>
                <span style={{ color:"#ef4444", fontWeight:700 }}>{fmt(totalExp)}</span>
              </div>
              {expenses.length === 0 && <div style={{ textAlign:"center", padding:"30px 0", color:"#1e293b" }}>No expenses yet — add one above!</div>}
              {expenses.map(exp => (
                <div key={exp.id} style={{ display:"flex", alignItems:"center", gap:mob?8:12, padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ width:34, height:34, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", background:`${CAT_COLORS[exp.category]}22`, fontSize:16, flexShrink:0 }}>
                    {CAT_ICONS[exp.category]}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <EditableText value={exp.name} onChange={v => setExpenses(x => x.map(e => e.id===exp.id?{...e,name:v}:e))} style={{ fontSize:14, fontWeight:600 }} />
                    {mob && <div style={{ fontSize:11, color:CAT_COLORS[exp.category], marginTop:2 }}>{exp.category}</div>}
                  </div>
                  {!mob && (
                    <select value={exp.category} onChange={e => setExpenses(x => x.map(ex => ex.id===exp.id?{...ex,category:e.target.value}:ex))}
                      style={{ background:`${CAT_COLORS[exp.category]}18`, border:`1px solid ${CAT_COLORS[exp.category]}44`, borderRadius:6, padding:"4px 8px", color:CAT_COLORS[exp.category], fontSize:11, fontFamily:"inherit", cursor:"pointer", outline:"none" }}>
                      {CATS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  )}
                  <div style={{ fontSize:14, fontWeight:700, color:"#ef4444", flexShrink:0 }}>
                    −₹<EditableAmount value={exp.amount} onChange={v => setExpenses(x => x.map(e => e.id===exp.id?{...e,amount:v}:e))} style={{ fontSize:14, fontWeight:700, color:"#ef4444" }} />
                  </div>
                  <button onClick={() => setExpenses(x => x.filter(e => e.id!==exp.id))} style={del}>✕</button>
                </div>
              ))}
              {expenses.length > 0 && (
                <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 0 0", borderTop:"1px solid rgba(255,255,255,0.07)", marginTop:8, fontWeight:700 }}>
                  <span style={{ color:"#64748b" }}>Total</span>
                  <span style={{ color:"#ef4444", fontSize:17 }}>{fmt(totalExp)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ GOALS ══ */}
        {tab === "goals" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16, flexWrap:"wrap", gap:8 }}>
              <div>
                <h2 style={{ fontSize:mob?18:22, margin:0 }}>Savings Goals</h2>
                <p style={{ color:"#475569", fontSize:13, marginTop:4 }}>
                  {savings > 0 ? <span>Available: <span style={{ color:"#10b981", fontWeight:700 }}>{fmt(savings)}/mo</span></span> : "Fix budget first!"}
                </p>
              </div>
              <button style={btn()} onClick={() => setShowAddGoal(v => !v)}>{showAddGoal ? "✕ Cancel" : "+ New Goal"}</button>
            </div>

            {showAddGoal && <AddGoalForm onAdd={handleAddGoal} onCancel={() => setShowAddGoal(false)} mob={mob} />}

            <div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"repeat(auto-fit,minmax(280px,1fr))", gap:14 }}>
              {goals.map(g => {
                const pct = g.target > 0 ? Math.min(Math.round((g.saved/g.target)*100),100) : 0;
                const rem = Math.max(g.target - g.saved, 0);
                const months = savings > 0 && rem > 0 ? Math.ceil(rem/savings) : null;
                return (
                  <div key={g.id} style={{ ...card, position:"relative", overflow:"hidden" }}>
                    <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:g.color }} />
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
                      <EditableText value={g.name} onChange={v => setGoals(gs => gs.map(x => x.id===g.id?{...x,name:v}:x))} style={{ fontSize:16, fontWeight:800 }} />
                      <button onClick={() => setGoals(gs => gs.filter(x => x.id!==g.id))} style={del}>✕</button>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
                      <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:10, padding:"10px 12px" }}>
                        <div style={lbl}>Saved</div>
                        <div style={{ fontSize:17, fontWeight:800, color:g.color }}>₹<EditableAmount value={g.saved} onChange={v => setGoals(gs => gs.map(x => x.id===g.id?{...x,saved:Math.min(v,x.target)}:x))} style={{ fontSize:17, fontWeight:800, color:g.color }} /></div>
                      </div>
                      <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:10, padding:"10px 12px" }}>
                        <div style={lbl}>Target</div>
                        <div style={{ fontSize:17, fontWeight:800 }}>₹<EditableAmount value={g.target} onChange={v => setGoals(gs => gs.map(x => x.id===g.id?{...x,target:v}:x))} style={{ fontSize:17, fontWeight:800 }} /></div>
                      </div>
                    </div>
                    <Bar pct={pct} color={g.color} h={8} />
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, margin:"6px 0 12px" }}>
                      <span style={{ color:g.color, fontWeight:700 }}>{pct}% done</span>
                      <span style={{ color:"#475569" }}>{months ? `~${months} months left` : rem===0 ? "🎉 Complete!" : "—"}</span>
                    </div>
                    {rem > 0 && savings > 0 && (
                      <button onClick={() => setGoals(gs => gs.map(x => x.id===g.id?{...x,saved:Math.min(x.saved+savings,x.target)}:x))}
                        style={{ ...btn(g.color), width:"100%", fontSize:12, padding:"9px 0" }}>
                        + Add This Month's Savings ({fmt(savings)})
                      </button>
                    )}
                    {rem === 0 && <div style={{ textAlign:"center", color:g.color, fontWeight:700 }}>🎉 Goal Reached!</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ DEBTS ══ */}
        {tab === "debts" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16, flexWrap:"wrap", gap:8 }}>
              <div>
                <h2 style={{ fontSize:mob?18:22, margin:0 }}>Debt Tracker</h2>
                <p style={{ color:"#475569", fontSize:13, marginTop:4 }}>
                  {totalDebt > 0 ? <span>Total: <span style={{ color:"#ef4444", fontWeight:700 }}>{fmt(totalDebt)}</span> · EMIs: <span style={{ color:"#8b5cf6", fontWeight:700 }}>{fmt(totalEMI)}/mo</span></span> : "No debts — incredible! 🎉"}
                </p>
              </div>
              <button style={btn("#ef4444")} onClick={() => setShowAddDebt(v => !v)}>{showAddDebt ? "✕ Cancel" : "+ Add Debt"}</button>
            </div>

            {showAddDebt && <AddDebtForm onAdd={handleAddDebt} onCancel={() => setShowAddDebt(false)} mob={mob} />}

            {debts.length > 0 && (
              <div style={{ ...card, marginBottom:14, display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:10 }}>
                {[
                  {l:"Total Debt",v:fmt(totalDebt),c:"#ef4444"},
                  {l:"Monthly EMIs",v:fmt(totalEMI),c:"#8b5cf6"},
                  {l:"EMI / Income",v:`${Math.round((totalEMI/Math.max(income,1))*100)}%`,c:(totalEMI/Math.max(income,1))>0.4?"#ef4444":"#10b981"},
                ].map(s => (
                  <div key={s.l} style={{ background:"rgba(255,255,255,0.03)", borderRadius:10, padding:"10px 12px" }}>
                    <div style={lbl}>{s.l}</div>
                    <div style={{ fontSize:16, fontWeight:800, color:s.c }}>{s.v}</div>
                  </div>
                ))}
              </div>
            )}

            {debts.length === 0 && <div style={{ ...card, textAlign:"center", padding:"50px 0", color:"#334155" }}>No debts tracked yet.</div>}

            {debts.map(d => {
              const paidPct = Math.round(((d.total-d.remaining)/Math.max(d.total,1))*100);
              const monthsLeft = d.emi > 0 ? Math.ceil(d.remaining/d.emi) : 0;
              return (
                <div key={d.id} style={{ ...card, marginBottom:12, position:"relative", overflow:"hidden" }}>
                  <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:d.color }} />
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
                    <div>
                      <div style={{ fontSize:16, fontWeight:800 }}>{d.name}</div>
                      {d.rate > 0 && <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{d.rate}% p.a. interest</div>}
                    </div>
                    <button onClick={() => setDebts(ds => ds.filter(x => x.id!==d.id))} style={del}>✕</button>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))", gap:10, marginBottom:12 }}>
                    {[
                      {l:"Remaining",v:fmt(d.remaining),c:d.color},
                      {l:"Monthly EMI",v:fmt(d.emi),c:"#8b5cf6"},
                      {l:"Months Left",v:monthsLeft,c:"#f59e0b"},
                    ].map(s => (
                      <div key={s.l} style={{ background:"rgba(255,255,255,0.03)", borderRadius:10, padding:"8px 10px" }}>
                        <div style={lbl}>{s.l}</div>
                        <div style={{ fontSize:14, fontWeight:700, color:s.c }}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize:11, color:"#64748b", marginBottom:5 }}>{paidPct}% paid off</div>
                  <Bar pct={paidPct} color={d.color} h={8} />
                  {savings - totalEMI > 0 && (
                    <div style={{ marginTop:10, padding:"10px 12px", background:"rgba(16,185,129,0.06)", borderRadius:8, border:"1px solid rgba(16,185,129,0.15)", fontSize:12, color:"#64748b" }}>
                      💡 Paying {fmt(Math.round((savings-totalEMI)*0.5))} extra/month could cut ~{Math.round(monthsLeft*0.25)} months off this loan
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══ AI ADVISOR ══ */}
        {tab === "advisor" && (
          <div style={{ display:"flex", flexDirection:"column", height:mob?"calc(100vh - 160px)":"calc(100vh - 130px)", minHeight:400 }}>
            <div style={{ marginBottom:12 }}>
              <h2 style={{ fontSize:mob?18:22, margin:0 }}>AI Financial Advisor</h2>
              <p style={{ color:"#475569", fontSize:12, marginTop:4 }}>Powered by Claude · Sees your full financial picture</p>
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:10, flexWrap:"wrap" }}>
              {["How to save more?","Am I overspending?","Pay debt faster?","Where to invest?","Improve my score?"].map(q => (
                <button key={q} onClick={() => setChatInput(q)} style={{ background:"rgba(16,185,129,0.07)", border:"1px solid rgba(16,185,129,0.2)", borderRadius:20, padding:"5px 12px", color:"#10b981", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>{q}</button>
              ))}
            </div>
            <div ref={chatRef} style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:12, padding:14, background:"rgba(255,255,255,0.02)", borderRadius:14, border:"1px solid rgba(255,255,255,0.06)", marginBottom:10 }}>
              {msgs.map((m,i) => (
                <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
                  <div style={{ maxWidth:mob?"88%":"72%", padding:"11px 14px", borderRadius:14, fontSize:14, lineHeight:1.65, background:m.role==="user"?"linear-gradient(135deg,#10b981,#059669)":"rgba(255,255,255,0.05)", color:m.role==="user"?"#fff":"#e8e4d9", borderBottomRightRadius:m.role==="user"?4:14, borderBottomLeftRadius:m.role==="assistant"?4:14 }}>
                    {m.role==="assistant" && <div style={{ fontSize:10, color:"#475569", marginBottom:4 }}>🤖 AI ADVISOR</div>}
                    {m.content}
                  </div>
                </div>
              ))}
              {aiLoading && <div style={{ display:"flex" }}><div style={{ background:"rgba(255,255,255,0.05)", padding:"11px 14px", borderRadius:14, color:"#475569", fontSize:14 }}>Thinking…</div></div>}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <input
                style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:8, padding:"12px 14px", color:"#e8e4d9", fontSize:15, fontFamily:"inherit", outline:"none" }}
                placeholder="Ask anything about your finances…"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key==="Enter" && sendMsg()}
              />
              <button onClick={sendMsg} disabled={aiLoading} style={{ background:"linear-gradient(135deg,#10b981,#059669)", border:"none", borderRadius:8, padding:"12px 20px", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", opacity:aiLoading?0.5:1 }}>Send</button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Nav */}
      {mob && (
        <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"rgba(8,14,26,0.97)", borderTop:"1px solid rgba(255,255,255,0.08)", display:"flex", zIndex:200, paddingBottom:"env(safe-area-inset-bottom,0px)" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex:1, padding:"10px 0 8px", border:"none", background:"transparent", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
              <span style={{ fontSize:22 }}>{t.icon}</span>
              <span style={{ fontSize:9, fontWeight:700, color:tab===t.id?"#10b981":"#475569", letterSpacing:0.3 }}>{t.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("landing");
  return screen === "landing" ? <Landing onEnter={() => setScreen("app")} /> : <Dashboard />;
}

