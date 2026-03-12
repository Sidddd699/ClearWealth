import { useState, useEffect, useRef } from "react";

const CLAUDE_MODEL = "claude-sonnet-4-20250514";

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const CAT_COLORS = {
  Housing: "#6366f1", Food: "#f59e0b", Transport: "#10b981",
  Debt: "#ef4444", Bills: "#8b5cf6", Leisure: "#ec4899",
  Health: "#14b8a6", Education: "#3b82f6", Other: "#94a3b8",
};
const CAT_ICONS = {
  Housing: "🏠", Food: "🍔", Transport: "🚗", Debt: "💳",
  Bills: "⚡", Leisure: "🎬", Health: "❤️", Education: "📚", Other: "💼",
};
const CATEGORIES = Object.keys(CAT_COLORS);

const DEFAULT_DATA = {
  income: 85000,
  expenses: [
    { id: 1, name: "Rent", amount: 18000, category: "Housing" },
    { id: 2, name: "Groceries", amount: 8000, category: "Food" },
    { id: 3, name: "Transport", amount: 3500, category: "Transport" },
    { id: 4, name: "Car EMI", amount: 12000, category: "Debt" },
    { id: 5, name: "Utilities", amount: 2500, category: "Bills" },
    { id: 6, name: "Entertainment", amount: 4000, category: "Leisure" },
    { id: 7, name: "Dining Out", amount: 5000, category: "Food" },
  ],
  goals: [
    { id: 1, name: "Emergency Fund", target: 300000, saved: 120000, color: "#10b981" },
    { id: 2, name: "Europe Trip", target: 150000, saved: 45000, color: "#f59e0b" },
    { id: 3, name: "New Laptop", target: 80000, saved: 30000, color: "#6366f1" },
  ],
};

function EditableAmount({ value, onChange, style = {} }) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState(String(value));
  const inputRef = useRef(null);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.select(); }, [editing]);
  const commit = () => {
    const n = parseFloat(raw.replace(/,/g, ""));
    if (!isNaN(n) && n >= 0) onChange(n);
    else setRaw(String(value));
    setEditing(false);
  };
  if (editing) return (
    <input ref={inputRef} value={raw} onChange={e => setRaw(e.target.value)}
      onBlur={commit} onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setRaw(String(value)); setEditing(false); } }}
      style={{ background: "rgba(16,185,129,0.1)", border: "1px solid #10b981", borderRadius: 6, padding: "3px 8px", color: "#10b981", fontSize: "inherit", fontWeight: "inherit", fontFamily: "inherit", width: 120, outline: "none", ...style }} />
  );
  return (
    <span onClick={() => { setRaw(String(value)); setEditing(true); }} title="Click to edit"
      style={{ cursor: "pointer", borderBottom: "1px dashed rgba(255,255,255,0.25)", paddingBottom: 1, ...style }}
      onMouseEnter={e => e.currentTarget.style.borderBottomColor = "#10b981"}
      onMouseLeave={e => e.currentTarget.style.borderBottomColor = "rgba(255,255,255,0.25)"}>
      {value.toLocaleString("en-IN")}
    </span>
  );
}

function EditableText({ value, onChange, style = {} }) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState(value);
  const inputRef = useRef(null);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.select(); }, [editing]);
  const commit = () => { if (raw.trim()) onChange(raw.trim()); else setRaw(value); setEditing(false); };
  if (editing) return (
    <input ref={inputRef} value={raw} onChange={e => setRaw(e.target.value)}
      onBlur={commit} onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setRaw(value); setEditing(false); } }}
      style={{ background: "rgba(16,185,129,0.1)", border: "1px solid #10b981", borderRadius: 6, padding: "3px 8px", color: "#e8e4d9", fontSize: "inherit", fontFamily: "inherit", width: 160, outline: "none", ...style }} />
  );
  return (
    <span onClick={() => { setRaw(value); setEditing(true); }} title="Click to edit"
      style={{ cursor: "pointer", borderBottom: "1px dashed rgba(255,255,255,0.25)", paddingBottom: 1, ...style }}
      onMouseEnter={e => e.currentTarget.style.borderBottomColor = "#10b981"}
      onMouseLeave={e => e.currentTarget.style.borderBottomColor = "rgba(255,255,255,0.25)"}>
      {value}
    </span>
  );
}

function LandingPage({ onEnter }) {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0a0f1e,#0d1b2a,#0a1628)", fontFamily: "'Georgia',serif", color: "#e8e4d9" }}>
      <div style={{ position: "fixed", top: "-20%", right: "-10%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,rgba(16,185,129,0.08) 0%,transparent 70%)", pointerEvents: "none" }} />
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 44px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 26 }}>₹</span>
          <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: 1 }}>ClearWealth</span>
        </div>
        <button onClick={onEnter} style={{ background: "linear-gradient(135deg,#10b981,#059669)", border: "none", borderRadius: 8, padding: "10px 24px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          Try Free →
        </button>
      </nav>
      <div style={{ textAlign: "center", padding: "90px 24px 70px" }}>
        <div style={{ display: "inline-block", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 20, padding: "6px 18px", fontSize: 12, color: "#10b981", marginBottom: 32, letterSpacing: 1 }}>
          ✦ FREE TO START — NO CARD NEEDED
        </div>
        <h1 style={{ fontSize: "clamp(36px,6vw,78px)", fontWeight: 700, lineHeight: 1.05, margin: "0 auto 24px", maxWidth: 860, background: "linear-gradient(135deg,#e8e4d9 30%,#10b981 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Your Money.<br />Finally Under Control.
        </h1>
        <p style={{ fontSize: 18, color: "#94a3b8", maxWidth: 520, margin: "0 auto 44px", lineHeight: 1.7 }}>
          Enter your income, add your expenses, set savings goals — and get instant AI advice on what to do next.
        </p>
        <button onClick={onEnter} style={{ background: "linear-gradient(135deg,#10b981,#059669)", border: "none", borderRadius: 12, padding: "16px 44px", color: "#fff", fontSize: 17, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 0 40px rgba(16,185,129,0.3)" }}>
          Start Planning Free
        </button>
        <p style={{ marginTop: 18, color: "#334155", fontSize: 13 }}>Trusted by 12,400+ people · ⭐ 4.9/5</p>
      </div>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 24px 80px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>
        {[
          { icon: "📊", t: "Smart Budgeting", d: "Track every rupee with automatic categorisation" },
          { icon: "✏️", t: "Fully Editable", d: "Change any number — income, expenses, goals — instantly" },
          { icon: "🎯", t: "Goal Tracker", d: "See exactly how many months to reach each target" },
          { icon: "🤖", t: "AI Advisor", d: "Claude-powered advice based on your real numbers" },
          { icon: "💳", t: "Debt Planner", d: "Track EMIs and see your path to being debt-free" },
          { icon: "📈", t: "Savings Rate", d: "Know your savings rate and how to improve it" },
        ].map(f => (
          <div key={f.t} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{f.t}</div>
            <div style={{ color: "#64748b", lineHeight: 1.6, fontSize: 13 }}>{f.d}</div>
          </div>
        ))}
      </div>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px 100px", textAlign: "center" }}>
        <h2 style={{ fontSize: 32, marginBottom: 12 }}>Simple Pricing</h2>
        <p style={{ color: "#64748b", marginBottom: 40 }}>Less than your morning chai.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          {[
            { name: "Free", price: "₹0", features: ["Budget tracker","3 savings goals","Expense categories","Overview dashboard"], cta: "Get Started" },
            { name: "Pro", price: "₹199", sub: "/mo", features: ["Everything in Free","AI Financial Advisor","Unlimited goals","Debt payoff planner","Bill reminders","Priority support"], cta: "Start Pro", hi: true },
          ].map(p => (
            <div key={p.name} style={{ background: p.hi ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.03)", border: `1px solid ${p.hi ? "rgba(16,185,129,0.35)" : "rgba(255,255,255,0.07)"}`, borderRadius: 18, padding: 30 }}>
              {p.hi && <div style={{ color: "#10b981", fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>MOST POPULAR</div>}
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{p.name}</div>
              <div style={{ fontSize: 38, fontWeight: 800, color: p.hi ? "#10b981" : "#e8e4d9", marginBottom: 20 }}>{p.price}<span style={{ fontSize: 14, color: "#64748b" }}>{p.sub}</span></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                {p.features.map(f => <div key={f} style={{ color: "#94a3b8", fontSize: 13, textAlign: "left" }}>✓ {f}</div>)}
              </div>
              <button onClick={onEnter} style={{ width: "100%", padding: "12px 0", background: p.hi ? "linear-gradient(135deg,#10b981,#059669)" : "rgba(255,255,255,0.06)", border: "none", borderRadius: 9, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{p.cta}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const [tab, setTab] = useState("overview");
  const [income, setIncome] = useState(DEFAULT_DATA.income);
  const [expenses, setExpenses] = useState(DEFAULT_DATA.expenses);
  const [goals, setGoals] = useState(DEFAULT_DATA.goals);
  const [messages, setMessages] = useState([{ role: "assistant", content: "Hi! I'm your AI financial advisor. I can see all your numbers — income, expenses, goals. Ask me anything about your finances! 💰" }]);
  const [chatInput, setChatInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [newExp, setNewExp] = useState({ name: "", amount: "", category: "Food" });
  const [showAdd, setShowAdd] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: "", target: "", saved: "0" });
  const [showAddGoal, setShowAddGoal] = useState(false);
  const chatRef = useRef(null);

  const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
  const savings = income - totalExp;
  const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;
  const byCategory = expenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc; }, {});

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages]);

  const addExpense = () => {
    if (!newExp.name.trim() || !newExp.amount) return;
    setExpenses(ex => [...ex, { id: Date.now(), name: newExp.name.trim(), amount: parseFloat(newExp.amount), category: newExp.category }]);
    setNewExp({ name: "", amount: "", category: "Food" });
    setShowAdd(false);
  };
  const delExp = id => setExpenses(ex => ex.filter(e => e.id !== id));
  const updExp = (id, field, val) => setExpenses(ex => ex.map(e => e.id === id ? { ...e, [field]: val } : e));

  const addGoal = () => {
    if (!newGoal.name.trim() || !newGoal.target) return;
    const colors = ["#10b981","#f59e0b","#6366f1","#ec4899","#14b8a6","#3b82f6","#ef4444"];
    setGoals(g => [...g, { id: Date.now(), name: newGoal.name.trim(), target: parseFloat(newGoal.target), saved: parseFloat(newGoal.saved) || 0, color: colors[g.length % colors.length] }]);
    setNewGoal({ name: "", target: "", saved: "0" });
    setShowAddGoal(false);
  };
  const delGoal = id => setGoals(g => g.filter(x => x.id !== id));
  const updGoal = (id, field, val) => setGoals(g => g.map(x => x.id === id ? { ...x, [field]: val } : x));

  const sendMessage = async () => {
    if (!chatInput.trim() || aiLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setMessages(m => [...m, { role: "user", content: userMsg }]);
    setAiLoading(true);
    const ctx = `You are a friendly AI financial advisor for Indian users. The user's data:
- Monthly Income: ₹${income.toLocaleString()}
- Total Expenses: ₹${totalExp.toLocaleString()} (${Math.round((totalExp/income)*100)}% of income)
- Monthly Savings: ₹${savings.toLocaleString()} (${savingsRate}% savings rate)
- Spending: ${JSON.stringify(byCategory)}
- Goals: ${goals.map(g=>`${g.name}: ₹${g.saved.toLocaleString()} of ₹${g.target.toLocaleString()}`).join("; ")}
Give concise, actionable advice (2-4 sentences). Use Indian context — mention PPF, NPS, SIPs, FD when relevant.`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 1000, system: ctx, messages: [...messages.map(m=>({role:m.role,content:m.content})), {role:"user",content:userMsg}] }),
      });
      const data = await res.json();
      setMessages(m => [...m, { role: "assistant", content: data.content?.[0]?.text || "Sorry, try again." }]);
    } catch { setMessages(m => [...m, { role: "assistant", content: "Connection error. Please try again." }]); }
    setAiLoading(false);
  };

  const C = {
    page: { minHeight: "100vh", background: "#080e1a", color: "#e8e4d9", fontFamily: "'Georgia',serif" },
    hdr: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 26px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(8,14,26,0.97)", position: "sticky", top: 0, zIndex: 100, flexWrap: "wrap", gap: 8 },
    navWrap: { display: "flex", gap: 3, background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 3 },
    navBtn: a => ({ padding: "7px 15px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", background: a ? "rgba(16,185,129,0.15)" : "transparent", color: a ? "#10b981" : "#64748b" }),
    body: { maxWidth: 1160, margin: "0 auto", padding: "26px 22px", boxSizing: "border-box" },
    card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 22 },
    sc: c => ({ background: `rgba(${c},0.05)`, border: `1px solid rgba(${c},0.15)`, borderRadius: 16, padding: 22 }),
    inp: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "9px 12px", color: "#e8e4d9", fontSize: 14, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" },
    btn: (bg="#10b981") => ({ background: `linear-gradient(135deg,${bg},${bg}cc)`, border: "none", borderRadius: 8, padding: "9px 18px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }),
    lbl: { fontSize: 10, color: "#64748b", display: "block", marginBottom: 5, letterSpacing: 0.5, textTransform: "uppercase" },
    del: { background: "rgba(239,68,68,0.08)", border: "none", borderRadius: 6, padding: "5px 9px", color: "#ef4444", cursor: "pointer", fontSize: 12 },
  };

  const TABS = [{ id:"overview",l:"📊 Overview"},{id:"budget",l:"💰 Budget"},{id:"goals",l:"🎯 Goals"},{id:"advisor",l:"🤖 AI Advisor"}];

  return (
    <div style={C.page}>
      <div style={C.hdr}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:22 }}>₹</span>
          <span style={{ fontSize:16, fontWeight:700 }}>ClearWealth</span>
          <span style={{ background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.3)", color:"#10b981", fontSize:10, padding:"2px 7px", borderRadius:10 }}>FREE</span>
        </div>
        <nav style={C.navWrap}>{TABS.map(t=><button key={t.id} style={C.navBtn(tab===t.id)} onClick={()=>setTab(t.id)}>{t.l}</button>)}</nav>
        <div style={{ fontSize:11, color:"#475569" }}>✏️ Click any value to edit it</div>
      </div>

      <div style={C.body}>

        {tab==="overview" && (
          <div>
            <h2 style={{ fontSize:23, marginBottom:4 }}>Financial Overview</h2>
            <p style={{ color:"#475569", fontSize:13, marginBottom:26 }}>All values are editable — click any number to update it</p>

            <div style={{ ...C.card, marginBottom:18, display:"flex", alignItems:"center", gap:24, flexWrap:"wrap" }}>
              <div>
                <div style={C.lbl}>Monthly Income</div>
                <div style={{ fontSize:34, fontWeight:800, color:"#10b981" }}>
                  ₹<EditableAmount value={income} onChange={setIncome} style={{ fontSize:34, fontWeight:800, color:"#10b981" }} />
                </div>
                <div style={{ fontSize:11, color:"#334155", marginTop:4 }}>👆 Click to change</div>
              </div>
              <div style={{ flex:1, minWidth:200 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:6 }}>
                  <span style={{ color:"#64748b" }}>Spent: <span style={{ color:"#ef4444", fontWeight:700 }}>{fmt(totalExp)}</span></span>
                  <span style={{ color:"#64748b" }}>Saved: <span style={{ color:savings>=0?"#10b981":"#ef4444", fontWeight:700 }}>{fmt(Math.abs(savings))}</span></span>
                </div>
                <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:8, height:10, overflow:"hidden" }}>
                  <div style={{ width:`${Math.min((totalExp/income)*100,100)}%`, height:"100%", background:totalExp>income?"#ef4444":"linear-gradient(90deg,#10b981,#059669)", borderRadius:8 }} />
                </div>
                <div style={{ textAlign:"right", fontSize:11, color:"#475569", marginTop:4 }}>{Math.round((totalExp/income)*100)}% of income spent · <span style={{ color:savingsRate>=20?"#10b981":"#f59e0b" }}>{savingsRate}% savings rate</span></div>
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:12, marginBottom:18 }}>
              {[
                { l:"Total Expenses", v:fmt(totalExp), c:"239,68,68", i:"💸" },
                { l:"Monthly Savings", v:fmt(savings), c:savings>=0?"16,185,129":"239,68,68", i:"🏦" },
                { l:"Savings Rate", v:`${savingsRate}%`, c:savingsRate>=20?"16,185,129":"245,158,11", i:"📈" },
                { l:"Expense Items", v:expenses.length, c:"99,102,241", i:"📋" },
              ].map(s=>(
                <div key={s.l} style={C.sc(s.c)}>
                  <div style={{ fontSize:20, marginBottom:7 }}>{s.i}</div>
                  <div style={C.lbl}>{s.l}</div>
                  <div style={{ fontSize:22, fontWeight:800, color:`rgb(${s.c})` }}>{s.v}</div>
                </div>
              ))}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <div style={C.card}>
                <h3 style={{ fontSize:14, marginBottom:16 }}>Spending by Category</h3>
                {Object.entries(byCategory).sort((a,b)=>b[1]-a[1]).map(([cat,amt])=>(
                  <div key={cat} style={{ marginBottom:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, fontSize:13 }}>
                      <span style={{ color:"#94a3b8" }}>{CAT_ICONS[cat]} {cat}</span>
                      <span style={{ color:CAT_COLORS[cat], fontWeight:700 }}>{fmt(amt)}</span>
                    </div>
                    <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:4, height:5 }}>
                      <div style={{ width:`${(amt/totalExp)*100}%`, height:"100%", background:CAT_COLORS[cat], borderRadius:4 }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={C.card}>
                <h3 style={{ fontSize:14, marginBottom:16 }}>Goals Progress</h3>
                {goals.map(g=>(
                  <div key={g.id} style={{ marginBottom:14 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, fontSize:13 }}>
                      <span>{g.name}</span>
                      <span style={{ color:g.color, fontWeight:700 }}>{Math.min(Math.round((g.saved/g.target)*100),100)}%</span>
                    </div>
                    <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:6, height:7 }}>
                      <div style={{ width:`${Math.min((g.saved/g.target)*100,100)}%`, height:"100%", background:g.color, borderRadius:6 }} />
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#475569", marginTop:3 }}>
                      <span>{fmt(g.saved)}</span><span>{fmt(g.target)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab==="budget" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:22, flexWrap:"wrap", gap:10 }}>
              <div>
                <h2 style={{ fontSize:23, marginBottom:4 }}>Budget Tracker</h2>
                <p style={{ color:"#475569", fontSize:13 }}>
                  Income: ₹<EditableAmount value={income} onChange={setIncome} style={{ color:"#10b981", fontWeight:700 }} />
                  &nbsp;·&nbsp;
                  {savings>=0 ? <span>Saving <span style={{ color:"#10b981", fontWeight:700 }}>{fmt(savings)}</span>/mo</span> : <span style={{ color:"#ef4444", fontWeight:700 }}>Over budget by {fmt(Math.abs(savings))}</span>}
                </p>
              </div>
              <button style={C.btn()} onClick={()=>setShowAdd(v=>!v)}>{showAdd?"✕ Cancel":"+ Add Expense"}</button>
            </div>

            {showAdd && (
              <div style={{ ...C.card, marginBottom:16, border:"1px solid rgba(16,185,129,0.3)" }}>
                <div style={{ fontSize:13, color:"#10b981", marginBottom:12, fontWeight:700 }}>New Expense</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 110px 150px auto", gap:10, alignItems:"end" }}>
                  <div><label style={C.lbl}>Name</label><input style={C.inp} placeholder="e.g. Netflix" value={newExp.name} onChange={e=>setNewExp(x=>({...x,name:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&addExpense()} autoFocus /></div>
                  <div><label style={C.lbl}>Amount (₹)</label><input style={C.inp} type="number" placeholder="0" value={newExp.amount} onChange={e=>setNewExp(x=>({...x,amount:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&addExpense()} /></div>
                  <div><label style={C.lbl}>Category</label>
                    <select style={{...C.inp}} value={newExp.category} onChange={e=>setNewExp(x=>({...x,category:e.target.value}))}>
                      {CATEGORIES.map(c=><option key={c}>{CAT_ICONS[c]} {c}</option>)}
                    </select>
                  </div>
                  <button style={{...C.btn(),padding:"9px 20px"}} onClick={addExpense}>Add</button>
                </div>
              </div>
            )}

            <div style={{ ...C.card, marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10, fontSize:12, color:"#475569" }}>
                <span>Income vs Spending</span>
                <span>{fmt(totalExp)} / {fmt(income)}</span>
              </div>
              <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:8, height:12, overflow:"hidden" }}>
                <div style={{ width:`${Math.min((totalExp/income)*100,100)}%`, height:"100%", background:totalExp>income?"#ef4444":"linear-gradient(90deg,#10b981,#059669)", borderRadius:8 }} />
              </div>
            </div>

            <div style={C.card}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12, fontSize:12, color:"#475569" }}>
                <span>{expenses.length} expenses · click name or amount to edit</span>
                <span style={{ color:"#ef4444", fontWeight:700 }}>{fmt(totalExp)} total</span>
              </div>
              {expenses.length===0 && <div style={{ textAlign:"center", padding:"36px 0", color:"#1e293b" }}>No expenses yet — add one above!</div>}
              {expenses.map(exp=>(
                <div key={exp.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 2px", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ width:34, height:34, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", background:`${CAT_COLORS[exp.category]}22`, fontSize:16, flexShrink:0 }}>
                    {CAT_ICONS[exp.category]}
                  </div>
                  <div style={{ flex:1 }}>
                    <EditableText value={exp.name} onChange={v=>updExp(exp.id,"name",v)} style={{ fontSize:14, fontWeight:600 }} />
                  </div>
                  <select value={exp.category} onChange={e=>updExp(exp.id,"category",e.target.value)}
                    style={{ background:`${CAT_COLORS[exp.category]}18`, border:`1px solid ${CAT_COLORS[exp.category]}44`, borderRadius:6, padding:"4px 9px", color:CAT_COLORS[exp.category], fontSize:11, fontFamily:"inherit", cursor:"pointer", outline:"none" }}>
                    {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                  </select>
                  <div style={{ fontSize:15, fontWeight:700, color:"#ef4444", minWidth:80, textAlign:"right" }}>
                    −₹<EditableAmount value={exp.amount} onChange={v=>updExp(exp.id,"amount",v)} style={{ fontSize:15, fontWeight:700, color:"#ef4444" }} />
                  </div>
                  <button onClick={()=>delExp(exp.id)} style={C.del}>✕</button>
                </div>
              ))}
              {expenses.length>0 && (
                <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 2px 0", marginTop:8, borderTop:"1px solid rgba(255,255,255,0.07)", fontWeight:700 }}>
                  <span style={{ color:"#64748b" }}>Total</span>
                  <span style={{ color:"#ef4444", fontSize:18 }}>{fmt(totalExp)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {tab==="goals" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:26, flexWrap:"wrap", gap:10 }}>
              <div>
                <h2 style={{ fontSize:23, marginBottom:4 }}>Savings Goals</h2>
                <p style={{ color:"#475569", fontSize:13 }}>
                  {savings>0 ? <>Available to save: <span style={{ color:"#10b981", fontWeight:700 }}>{fmt(savings)}/month</span></> : "Fix your budget to start saving!"}
                </p>
              </div>
              <button style={C.btn()} onClick={()=>setShowAddGoal(v=>!v)}>{showAddGoal?"✕ Cancel":"+ New Goal"}</button>
            </div>

            {showAddGoal && (
              <div style={{ ...C.card, marginBottom:20, border:"1px solid rgba(16,185,129,0.3)" }}>
                <div style={{ fontSize:13, color:"#10b981", marginBottom:12, fontWeight:700 }}>New Goal</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 140px 140px auto", gap:10, alignItems:"end" }}>
                  <div><label style={C.lbl}>Goal Name</label><input style={C.inp} placeholder="e.g. New Car, Wedding" value={newGoal.name} onChange={e=>setNewGoal(x=>({...x,name:e.target.value}))} autoFocus /></div>
                  <div><label style={C.lbl}>Target (₹)</label><input style={C.inp} type="number" placeholder="500000" value={newGoal.target} onChange={e=>setNewGoal(x=>({...x,target:e.target.value}))} /></div>
                  <div><label style={C.lbl}>Already Saved (₹)</label><input style={C.inp} type="number" placeholder="0" value={newGoal.saved} onChange={e=>setNewGoal(x=>({...x,saved:e.target.value}))} /></div>
                  <button style={{...C.btn(),padding:"9px 20px"}} onClick={addGoal}>Add</button>
                </div>
              </div>
            )}

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))", gap:16 }}>
              {goals.map(g=>{
                const pct = g.target>0 ? Math.min(Math.round((g.saved/g.target)*100),100) : 0;
                const remaining = Math.max(g.target-g.saved,0);
                const months = savings>0&&remaining>0 ? Math.ceil(remaining/savings) : null;
                return (
                  <div key={g.id} style={{ ...C.card, position:"relative", overflow:"hidden" }}>
                    <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:g.color }} />
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                      <EditableText value={g.name} onChange={v=>updGoal(g.id,"name",v)} style={{ fontSize:17, fontWeight:800 }} />
                      <button onClick={()=>delGoal(g.id)} style={C.del}>✕</button>
                    </div>

                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
                      <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:10, padding:"11px 13px" }}>
                        <div style={C.lbl}>Saved So Far</div>
                        <div style={{ fontSize:20, fontWeight:800, color:g.color }}>
                          ₹<EditableAmount value={g.saved} onChange={v=>updGoal(g.id,"saved",Math.min(v,g.target))} style={{ fontSize:20, fontWeight:800, color:g.color }} />
                        </div>
                      </div>
                      <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:10, padding:"11px 13px" }}>
                        <div style={C.lbl}>Target</div>
                        <div style={{ fontSize:20, fontWeight:800 }}>
                          ₹<EditableAmount value={g.target} onChange={v=>updGoal(g.id,"target",v)} style={{ fontSize:20, fontWeight:800 }} />
                        </div>
                      </div>
                    </div>

                    <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:8, height:9, marginBottom:7 }}>
                      <div style={{ width:`${pct}%`, height:"100%", background:g.color, borderRadius:8, transition:"width 0.4s" }} />
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:14 }}>
                      <span style={{ color:g.color, fontWeight:700 }}>{pct}% complete</span>
                      <span style={{ color:"#475569" }}>{months ? `~${months} months left` : remaining===0 ? "🎉 Done!" : "—"}</span>
                    </div>

                    {remaining>0&&savings>0 && (
                      <button onClick={()=>updGoal(g.id,"saved",Math.min(g.saved+savings,g.target))}
                        style={{ ...C.btn(g.color), width:"100%", fontSize:12, padding:"8px 0" }}>
                        + Add This Month's Savings ({fmt(savings)})
                      </button>
                    )}
                    {remaining===0 && <div style={{ textAlign:"center", color:g.color, fontWeight:700 }}>🎉 Goal Reached!</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab==="advisor" && (
          <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 155px)", minHeight:500 }}>
            <div style={{ marginBottom:14 }}>
              <h2 style={{ fontSize:23, marginBottom:4 }}>AI Financial Advisor</h2>
              <p style={{ color:"#475569", fontSize:13 }}>Powered by Claude · Has access to your full financial picture</p>
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
              {["How can I save more?","Am I overspending?","How to pay off my debt?","Where should I invest?","How long to reach my goals?"].map(q=>(
                <button key={q} onClick={()=>setChatInput(q)} style={{ background:"rgba(16,185,129,0.07)", border:"1px solid rgba(16,185,129,0.2)", borderRadius:20, padding:"5px 13px", color:"#10b981", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>{q}</button>
              ))}
            </div>
            <div ref={chatRef} style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:13, padding:16, background:"rgba(255,255,255,0.02)", borderRadius:16, border:"1px solid rgba(255,255,255,0.06)", marginBottom:12 }}>
              {messages.map((m,i)=>(
                <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
                  <div style={{ maxWidth:"72%", padding:"12px 16px", borderRadius:14, fontSize:14, lineHeight:1.65, background:m.role==="user"?"linear-gradient(135deg,#10b981,#059669)":"rgba(255,255,255,0.05)", color:m.role==="user"?"#fff":"#e8e4d9", borderBottomRightRadius:m.role==="user"?4:14, borderBottomLeftRadius:m.role==="assistant"?4:14 }}>
                    {m.role==="assistant" && <div style={{ fontSize:10, color:"#475569", marginBottom:5 }}>🤖 AI ADVISOR</div>}
                    {m.content}
                  </div>
                </div>
              ))}
              {aiLoading && <div style={{ display:"flex", justifyContent:"flex-start" }}><div style={{ background:"rgba(255,255,255,0.05)", padding:"12px 16px", borderRadius:14, color:"#475569", fontSize:14 }}>Thinking…</div></div>}
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <input style={{ ...C.inp, fontSize:14, flex:1 }} placeholder="Ask anything about your finances…" value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMessage()} />
              <button onClick={sendMessage} disabled={aiLoading} style={{ ...C.btn(), padding:"10px 22px", opacity:aiLoading?0.5:1, whiteSpace:"nowrap" }}>Send →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("landing");
  return screen==="landing" ? <LandingPage onEnter={()=>setScreen("app")} /> : <Dashboard />;
}
