import { useState, useEffect, useRef, useCallback } from "react";

// ─────────────────────────────────────────────
// CONFIG — replace these with your real values
// ─────────────────────────────────────────────
const STRIPE_MONTHLY_LINK = "https://buy.stripe.com/YOUR_MONTHLY_LINK";   // ← paste your Stripe link
const STRIPE_YEARLY_LINK  = "https://buy.stripe.com/YOUR_YEARLY_LINK";    // ← paste your Stripe link
const CLAUDE_MODEL = "claude-sonnet-4-20250514";

// ─────────────────────────────────────────────
// PLANS
// ─────────────────────────────────────────────
const PLANS = {
  free: {
    name: "Free",
    price: 0,
    features: ["Budget tracker","Up to 3 expenses","1 savings goal","Overview dashboard"],
    limits: { expenses: 3, goals: 1, debts: 0, ai: false },
  },
  pro: {
    name: "Pro",
    price: 149,
    yearlyPrice: 1199,
    features: ["Unlimited expenses","Unlimited goals","Debt tracker","Money Assistant","Health Score","Priority support"],
    limits: { expenses: Infinity, goals: Infinity, debts: Infinity, ai: true },
  },
};

const fmt = (n) => new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:0 }).format(n);
const CAT_COLORS = { Housing:"#6366f1",Food:"#f59e0b",Transport:"#10b981",Debt:"#ef4444",Bills:"#8b5cf6",Leisure:"#ec4899",Health:"#14b8a6",Education:"#3b82f6",Other:"#94a3b8" };
const CAT_ICONS  = { Housing:"🏠",Food:"🍔",Transport:"🚗",Debt:"💳",Bills:"⚡",Leisure:"🎬",Health:"❤️",Education:"📚",Other:"💼" };
const CATS = Object.keys(CAT_COLORS);
const GOAL_COLORS = ["#10b981","#f59e0b","#6366f1","#ec4899","#14b8a6","#3b82f6"];
const DEBT_COLORS = ["#ef4444","#8b5cf6","#f59e0b","#3b82f6","#ec4899"];

// ─────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────
function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 800);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}

function useLocalStorage(key, initial) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initial; }
    catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }, [key, val]);
  return [val, setVal];
}

// ─────────────────────────────────────────────
// SMALL COMPONENTS
// ─────────────────────────────────────────────
function Bar({ pct, color, h=8 }) {
  return <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:h, height:h, overflow:"hidden" }}>
    <div style={{ width:`${Math.min(pct,100)}%`, height:"100%", background:color, borderRadius:h, transition:"width 0.4s" }} />
  </div>;
}

function EditableAmount({ value, onChange, style={} }) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState("");
  const ref = useRef(null);
  useEffect(() => { if (editing && ref.current) { ref.current.focus(); ref.current.select(); } }, [editing]);
  const commit = () => { const n = parseFloat(raw.replace(/,/g,"")); if (!isNaN(n) && n >= 0) onChange(n); setEditing(false); };
  if (editing) return <input ref={ref} value={raw} type="number" inputMode="decimal"
    onChange={e=>setRaw(e.target.value)} onBlur={commit}
    onKeyDown={e=>{ if(e.key==="Enter") commit(); if(e.key==="Escape") setEditing(false); }}
    style={{ background:"rgba(16,185,129,0.12)", border:"1px solid #10b981", borderRadius:6, padding:"3px 8px", color:"#10b981", fontSize:"inherit", fontWeight:"inherit", fontFamily:"inherit", width:110, outline:"none", ...style }} />;
  return <span onClick={()=>{ setRaw(String(value)); setEditing(true); }} title="Tap to edit"
    style={{ cursor:"pointer", borderBottom:"1px dashed rgba(255,255,255,0.3)", paddingBottom:1, ...style }}>
    {value.toLocaleString("en-IN")}
  </span>;
}

function EditableText({ value, onChange, style={} }) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState("");
  const ref = useRef(null);
  useEffect(() => { if (editing && ref.current) { ref.current.focus(); ref.current.select(); } }, [editing]);
  const commit = () => { if (raw.trim()) onChange(raw.trim()); setEditing(false); };
  if (editing) return <input ref={ref} value={raw} onChange={e=>setRaw(e.target.value)} onBlur={commit}
    onKeyDown={e=>{ if(e.key==="Enter") commit(); if(e.key==="Escape") setEditing(false); }}
    style={{ background:"rgba(16,185,129,0.12)", border:"1px solid #10b981", borderRadius:6, padding:"3px 8px", color:"#e8e4d9", fontSize:"inherit", fontFamily:"inherit", width:160, outline:"none", ...style }} />;
  return <span onClick={()=>{ setRaw(value); setEditing(true); }} title="Tap to edit"
    style={{ cursor:"pointer", borderBottom:"1px dashed rgba(255,255,255,0.3)", paddingBottom:1, ...style }}>{value}</span>;
}

function healthScore(income, totalExp, savingsRate, debts) {
  let s = 100;
  if (savingsRate < 10) s -= 30; else if (savingsRate < 20) s -= 15;
  const emi = debts.reduce((t,d)=>t+d.emi,0);
  const dti = income > 0 ? (emi/income)*100 : 100;
  if (dti > 40) s -= 30; else if (dti > 20) s -= 15;
  if (totalExp > income) s -= 20;
  return Math.max(s, 5);
}

// ─────────────────────────────────────────────
// UPGRADE MODAL
// ─────────────────────────────────────────────
function UpgradeModal({ onClose }) {
  const [yearly, setYearly] = useState(false);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#0d1b2a", border:"1px solid rgba(16,185,129,0.3)", borderRadius:20, padding:32, maxWidth:460, width:"100%", position:"relative" }}>
        <button onClick={onClose} style={{ position:"absolute", top:16, right:16, background:"transparent", border:"none", color:"#64748b", fontSize:20, cursor:"pointer" }}>✕</button>

        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:32, marginBottom:8 }}>🚀</div>
          <h2 style={{ fontSize:22, margin:"0 0 8px", color:"#e8e4d9" }}>Upgrade to Pro</h2>
          <p style={{ color:"#64748b", fontSize:14, margin:0 }}>Unlock everything. Cancel anytime.</p>
        </div>

        {/* Toggle */}
        <div style={{ display:"flex", background:"rgba(255,255,255,0.04)", borderRadius:10, padding:4, marginBottom:24, position:"relative" }}>
          <button onClick={()=>setYearly(false)} style={{ flex:1, padding:"8px 0", borderRadius:7, border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:13, background:!yearly?"rgba(16,185,129,0.15)":"transparent", color:!yearly?"#10b981":"#64748b" }}>Monthly</button>
          <button onClick={()=>setYearly(true)} style={{ flex:1, padding:"8px 0", borderRadius:7, border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:13, background:yearly?"rgba(16,185,129,0.15)":"transparent", color:yearly?"#10b981":"#64748b", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            Yearly <span style={{ background:"#10b981", color:"#fff", fontSize:10, padding:"2px 6px", borderRadius:10 }}>SAVE 37%</span>
          </button>
        </div>

        {/* Price */}
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:48, fontWeight:900, color:"#10b981" }}>
            ₹{yearly ? "1,199" : "149"}
            <span style={{ fontSize:16, color:"#64748b", fontWeight:400 }}>{yearly ? "/year" : "/month"}</span>
          </div>
          {yearly && <div style={{ color:"#10b981", fontSize:13, marginTop:4 }}>= ₹100/month · Save ₹589/year</div>}
        </div>

        {/* Features */}
        <div style={{ marginBottom:24, display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {PLANS.pro.features.map(f => (
            <div key={f} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#94a3b8" }}>
              <span style={{ color:"#10b981", fontWeight:700 }}>✓</span>{f}
            </div>
          ))}
        </div>

        <a href={yearly ? STRIPE_YEARLY_LINK : STRIPE_MONTHLY_LINK} target="_blank" rel="noreferrer"
          style={{ display:"block", width:"100%", padding:"14px 0", background:"linear-gradient(135deg,#10b981,#059669)", border:"none", borderRadius:12, color:"#fff", fontSize:16, fontWeight:700, cursor:"pointer", textAlign:"center", textDecoration:"none", boxSizing:"border-box", boxShadow:"0 0 30px rgba(16,185,129,0.3)" }}>
          Upgrade to Pro →
        </a>
        <p style={{ textAlign:"center", fontSize:12, color:"#334155", marginTop:12, marginBottom:0 }}>Secure payment via Stripe · Cancel anytime</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PRO GATE — blurred locked section
// ─────────────────────────────────────────────
function ProGate({ onUpgrade, label="This is a Pro feature" }) {
  return (
    <div style={{ position:"relative", borderRadius:14, overflow:"hidden" }}>
      <div style={{ filter:"blur(4px)", pointerEvents:"none", userSelect:"none", opacity:0.4, padding:20, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14 }}>
        <div style={{ height:60, background:"rgba(255,255,255,0.05)", borderRadius:8, marginBottom:10 }} />
        <div style={{ height:40, background:"rgba(255,255,255,0.05)", borderRadius:8, marginBottom:10 }} />
        <div style={{ height:40, background:"rgba(255,255,255,0.05)", borderRadius:8 }} />
      </div>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12 }}>
        <div style={{ fontSize:28 }}>🔒</div>
        <div style={{ fontSize:14, fontWeight:700, color:"#e8e4d9" }}>{label}</div>
        <button onClick={onUpgrade} style={{ background:"linear-gradient(135deg,#10b981,#059669)", border:"none", borderRadius:10, padding:"10px 24px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
          Upgrade to Pro — ₹149/mo
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ONBOARDING
// ─────────────────────────────────────────────
function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [income, setIncome] = useState("");
  const [currency] = useState("INR");

  const inp = { background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:10, padding:"14px 16px", color:"#e8e4d9", fontSize:16, fontFamily:"inherit", outline:"none", width:"100%", boxSizing:"border-box" };

  const steps = [
    {
      emoji:"👋", title:"Welcome to ClearWealth",
      sub:"Your personal AI financial planner. Let's set up your profile in 2 quick steps.",
      content: (
        <div>
          <label style={{ fontSize:12, color:"#64748b", display:"block", marginBottom:8 }}>YOUR FIRST NAME</label>
          <input style={inp} placeholder="e.g. Rahul" value={name} onChange={e=>setName(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&name.trim()&&setStep(1)} autoFocus />
        </div>
      ),
      canNext: name.trim().length > 0,
      nextLabel: "Next →",
    },
    {
      emoji:"💰", title:`Hi ${name || "there"}! What's your monthly income?`,
      sub:"This helps us calculate your savings rate and give you accurate advice.",
      content: (
        <div>
          <label style={{ fontSize:12, color:"#64748b", display:"block", marginBottom:8 }}>MONTHLY INCOME (₹)</label>
          <input style={{ ...inp, fontSize:22, fontWeight:700, color:"#10b981" }} type="number" inputMode="decimal"
            placeholder="e.g. 85000" value={income} onChange={e=>setIncome(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&income&&setStep(2)} autoFocus />
          <p style={{ fontSize:12, color:"#334155", marginTop:8 }}>Include salary, freelance, rent income — everything.</p>
        </div>
      ),
      canNext: parseFloat(income) > 0,
      nextLabel: "Start Planning →",
      extra: <p style={{ fontSize:11, color:"#334155", marginTop:12, textAlign:"center", lineHeight:1.7 }}>By continuing you agree to our <span style={{ color:"#10b981", cursor:"pointer" }}>Terms of Service</span> and acknowledge that ClearWealth is a budgeting tool, not a SEBI-registered financial advisor.</p>,
    },
  ];

  const current = steps[step];

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#080e1a,#0d1b2a)", display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"'Georgia',serif" }}>
      <div style={{ maxWidth:460, width:"100%" }}>
        {/* Progress */}
        <div style={{ display:"flex", gap:8, marginBottom:32 }}>
          {steps.map((_,i) => (
            <div key={i} style={{ flex:1, height:3, borderRadius:3, background:i<=step?"#10b981":"rgba(255,255,255,0.1)", transition:"background 0.3s" }} />
          ))}
        </div>

        <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, padding:32 }}>
          <div style={{ fontSize:40, marginBottom:16, textAlign:"center" }}>{current.emoji}</div>
          <h2 style={{ fontSize:22, color:"#e8e4d9", margin:"0 0 8px", textAlign:"center" }}>{current.title}</h2>
          <p style={{ color:"#64748b", fontSize:14, textAlign:"center", marginBottom:28, lineHeight:1.6 }}>{current.sub}</p>

          {current.content}
          {current.extra && current.extra}

          <div style={{ display:"flex", gap:10, marginTop:24 }}>
            {step > 0 && <button onClick={()=>setStep(s=>s-1)} style={{ flex:1, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"13px 0", color:"#94a3b8", fontSize:15, cursor:"pointer", fontFamily:"inherit" }}>← Back</button>}
            <button
              onClick={() => {
                if (step < steps.length - 1) setStep(s=>s+1);
                else onDone({ name: name.trim(), income: parseFloat(income) });
              }}
              disabled={!current.canNext}
              style={{ flex:2, background:current.canNext?"linear-gradient(135deg,#10b981,#059669)":"rgba(255,255,255,0.05)", border:"none", borderRadius:10, padding:"13px 0", color:current.canNext?"#fff":"#334155", fontSize:15, fontWeight:700, cursor:current.canNext?"pointer":"default", fontFamily:"inherit", transition:"all 0.2s" }}>
              {current.nextLabel}
            </button>
          </div>
        </div>

        <p style={{ textAlign:"center", color:"#1e293b", fontSize:12, marginTop:16 }}>No account needed · Your data stays on your device · Free forever</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ADD FORMS (self-contained state = no focus jump)
// ─────────────────────────────────────────────
function AddExpenseForm({ onAdd, onCancel }) {
  const [name, setName] = useState(""); const [amount, setAmount] = useState(""); const [cat, setCat] = useState("Food");
  const ref = useRef(null);
  useEffect(()=>{ if(ref.current) ref.current.focus(); },[]);
  const inp = { background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:8, padding:"11px 12px", color:"#e8e4d9", fontSize:15, fontFamily:"inherit", outline:"none", width:"100%", boxSizing:"border-box" };
  const submit = () => { if(!name.trim()||!amount) return; onAdd({name:name.trim(),amount:parseFloat(amount),category:cat}); };
  return (
    <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(16,185,129,0.3)", borderRadius:14, padding:18, marginBottom:14 }}>
      <div style={{ fontWeight:700, color:"#10b981", fontSize:13, marginBottom:12 }}>New Expense</div>
      <div style={{ display:"grid", gap:10, marginBottom:10 }}>
        <div><label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:5 }}>EXPENSE NAME</label>
          <input ref={ref} style={inp} placeholder="e.g. Netflix, Gym" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} /></div>
        <div><label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:5 }}>AMOUNT (₹)</label>
          <input style={inp} type="number" inputMode="decimal" placeholder="0" value={amount} onChange={e=>setAmount(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} /></div>
        <div><label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:5 }}>CATEGORY</label>
          <select style={inp} value={cat} onChange={e=>setCat(e.target.value)}>{CATS.map(c=><option key={c}>{c}</option>)}</select></div>
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={submit} style={{ flex:1, background:"linear-gradient(135deg,#10b981,#059669)", border:"none", borderRadius:8, padding:"11px 0", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Add</button>
        <button onClick={onCancel} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"11px 16px", color:"#94a3b8", fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
      </div>
    </div>
  );
}

function AddGoalForm({ onAdd, onCancel }) {
  const [name, setName] = useState(""); const [target, setTarget] = useState(""); const [saved, setSaved] = useState("0");
  const ref = useRef(null);
  useEffect(()=>{ if(ref.current) ref.current.focus(); },[]);
  const inp = { background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:8, padding:"11px 12px", color:"#e8e4d9", fontSize:15, fontFamily:"inherit", outline:"none", width:"100%", boxSizing:"border-box" };
  const submit = () => { if(!name.trim()||!target) return; onAdd({name:name.trim(),target:parseFloat(target),saved:parseFloat(saved)||0}); };
  return (
    <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(16,185,129,0.3)", borderRadius:14, padding:18, marginBottom:14 }}>
      <div style={{ fontWeight:700, color:"#10b981", fontSize:13, marginBottom:12 }}>New Goal</div>
      <div style={{ display:"grid", gap:10, marginBottom:10 }}>
        <div><label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:5 }}>GOAL NAME</label>
          <input ref={ref} style={inp} placeholder="e.g. Europe Trip" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} /></div>
        <div><label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:5 }}>TARGET (₹)</label>
          <input style={inp} type="number" inputMode="decimal" placeholder="100000" value={target} onChange={e=>setTarget(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} /></div>
        <div><label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:5 }}>ALREADY SAVED (₹)</label>
          <input style={inp} type="number" inputMode="decimal" placeholder="0" value={saved} onChange={e=>setSaved(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} /></div>
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={submit} style={{ flex:1, background:"linear-gradient(135deg,#10b981,#059669)", border:"none", borderRadius:8, padding:"11px 0", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Add</button>
        <button onClick={onCancel} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"11px 16px", color:"#94a3b8", fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
      </div>
    </div>
  );
}

function AddDebtForm({ onAdd, onCancel }) {
  const [name, setName] = useState(""); const [remaining, setRemaining] = useState(""); const [emi, setEmi] = useState(""); const [rate, setRate] = useState("");
  const ref = useRef(null);
  useEffect(()=>{ if(ref.current) ref.current.focus(); },[]);
  const inp = { background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:8, padding:"11px 12px", color:"#e8e4d9", fontSize:15, fontFamily:"inherit", outline:"none", width:"100%", boxSizing:"border-box" };
  const submit = () => { if(!name.trim()||!remaining||!emi) return; onAdd({name:name.trim(),remaining:parseFloat(remaining),emi:parseFloat(emi),rate:parseFloat(rate)||0}); };
  return (
    <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:14, padding:18, marginBottom:14 }}>
      <div style={{ fontWeight:700, color:"#ef4444", fontSize:13, marginBottom:12 }}>New Debt / Loan</div>
      <div style={{ display:"grid", gap:10, marginBottom:10 }}>
        <div><label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:5 }}>DEBT NAME</label>
          <input ref={ref} style={inp} placeholder="e.g. Home Loan" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} /></div>
        <div><label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:5 }}>REMAINING (₹)</label>
          <input style={inp} type="number" inputMode="decimal" placeholder="500000" value={remaining} onChange={e=>setRemaining(e.target.value)} /></div>
        <div><label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:5 }}>MONTHLY EMI (₹)</label>
          <input style={inp} type="number" inputMode="decimal" placeholder="10000" value={emi} onChange={e=>setEmi(e.target.value)} /></div>
        <div><label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:5 }}>INTEREST RATE (%) — optional</label>
          <input style={inp} type="number" inputMode="decimal" placeholder="9" value={rate} onChange={e=>setRate(e.target.value)} /></div>
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={submit} style={{ flex:1, background:"linear-gradient(135deg,#ef4444,#dc2626)", border:"none", borderRadius:8, padding:"11px 0", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Add</button>
        <button onClick={onCancel} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"11px 16px", color:"#94a3b8", fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// LEGAL MODALS
// ─────────────────────────────────────────────
function LegalModal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#0d1b2a", border:"1px solid rgba(255,255,255,0.1)", borderRadius:20, padding:28, maxWidth:620, width:"100%", maxHeight:"85vh", overflowY:"auto", position:"relative" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h2 style={{ margin:0, fontSize:20, color:"#e8e4d9" }}>{title}</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#64748b", fontSize:22, cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ color:"#94a3b8", fontSize:13, lineHeight:1.9 }}>{children}</div>
      </div>
    </div>
  );
}

function TermsContent() {
  return (
    <>
      <p style={{ color:"#64748b", fontSize:12, marginBottom:16 }}>Last updated: March 2026</p>
      <p><strong style={{ color:"#e8e4d9" }}>1. Acceptance of Terms</strong><br/>By using ClearWealth ("the App"), you agree to these Terms. If you disagree, please stop using the App immediately.</p>
      <p><strong style={{ color:"#e8e4d9" }}>2. Not Financial Advice</strong><br/>ClearWealth is a personal budgeting and expense tracking tool only. Nothing in this App — including any AI-generated suggestions from the Money Assistant — constitutes financial, investment, tax, or legal advice. ClearWealth is not a SEBI-registered investment advisor. Always consult a qualified, SEBI-registered financial advisor before making any investment or financial decision.</p>
      <p><strong style={{ color:"#e8e4d9" }}>3. No Liability</strong><br/>ClearWealth and its owners shall not be liable for any financial losses, decisions, or damages arising from your use of the App or reliance on any information provided within it. Use the App at your own risk.</p>
      <p><strong style={{ color:"#e8e4d9" }}>4. Data Storage</strong><br/>Your financial data is stored locally on your device using browser storage. ClearWealth does not store your personal financial data on any server. You are responsible for the safety of your device and data.</p>
      <p><strong style={{ color:"#e8e4d9" }}>5. Subscriptions & Payments</strong><br/>Pro subscriptions are billed monthly (₹149) or yearly (₹1,199). Payments are processed by Stripe. You may cancel at any time. Refunds are subject to our refund policy. ClearWealth reserves the right to change pricing with 30 days' notice.</p>
      <p><strong style={{ color:"#e8e4d9" }}>6. Eligibility</strong><br/>You must be at least 18 years old to use ClearWealth.</p>
      <p><strong style={{ color:"#e8e4d9" }}>7. Changes to Terms</strong><br/>We may update these Terms at any time. Continued use of the App after changes constitutes your acceptance of the new Terms.</p>
      <p><strong style={{ color:"#e8e4d9" }}>8. Governing Law</strong><br/>These Terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts in India.</p>
    </>
  );
}

function PrivacyContent() {
  return (
    <>
      <p style={{ color:"#64748b", fontSize:12, marginBottom:16 }}>Last updated: March 2026</p>
      <p><strong style={{ color:"#e8e4d9" }}>1. What Data We Collect</strong><br/>ClearWealth collects only the information you enter into the App: your name, income, expenses, goals, and debt information. This data is stored locally on your device only and is never transmitted to our servers.</p>
      <p><strong style={{ color:"#e8e4d9" }}>2. AI Money Assistant</strong><br/>When you use the Money Assistant, your financial summary (income, expenses, goals, debts) is sent to Anthropic's API to generate a response. This data is processed by Anthropic under their privacy policy. We do not store these conversations on our servers.</p>
      <p><strong style={{ color:"#e8e4d9" }}>3. Payment Data</strong><br/>Payment information is handled entirely by Stripe. ClearWealth never sees or stores your card details. Please review Stripe's Privacy Policy for details.</p>
      <p><strong style={{ color:"#e8e4d9" }}>4. Cookies & Analytics</strong><br/>We may use basic analytics to understand how many people use the App. No personally identifiable information is collected through analytics.</p>
      <p><strong style={{ color:"#e8e4d9" }}>5. Data Deletion</strong><br/>Since your data is stored on your device, you can delete it at any time by clearing your browser's local storage or uninstalling the App.</p>
      <p><strong style={{ color:"#e8e4d9" }}>6. Third-Party Services</strong><br/>We use: Anthropic (AI responses), Stripe (payments), and Vercel (hosting). Each operates under their own privacy policy.</p>
      <p><strong style={{ color:"#e8e4d9" }}>7. Contact</strong><br/>For privacy concerns, please contact us through the App's support channel.</p>
    </>
  );
}

// ─────────────────────────────────────────────
// LANDING PAGE
// ─────────────────────────────────────────────
function Landing({ onEnter }) {
  const w = useWindowWidth(); const mob = w < 640;
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#080e1a,#0d1b2a)", fontFamily:"'Georgia',serif", color:"#e8e4d9", overflowX:"hidden" }}>
      {showUpgrade && <UpgradeModal onClose={()=>setShowUpgrade(false)} />}
      {showTerms && <LegalModal title="Terms of Service" onClose={()=>setShowTerms(false)}><TermsContent /></LegalModal>}
      {showPrivacy && <LegalModal title="Privacy Policy" onClose={()=>setShowPrivacy(false)}><PrivacyContent /></LegalModal>}

      <div style={{ position:"fixed", top:"-20%", right:"-10%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(16,185,129,0.08),transparent 70%)", pointerEvents:"none" }} />
      <nav style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:mob?"16px 20px":"20px 44px", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:24 }}>₹</span>
          <span style={{ fontSize:18, fontWeight:700, letterSpacing:1 }}>ClearWealth</span>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={()=>setShowUpgrade(true)} style={{ background:"transparent", border:"1px solid rgba(16,185,129,0.4)", borderRadius:8, padding:"8px 16px", color:"#10b981", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Pricing</button>
          <button onClick={onEnter} style={{ background:"linear-gradient(135deg,#10b981,#059669)", border:"none", borderRadius:8, padding:"9px 20px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Start Free →</button>
        </div>
      </nav>

      <div style={{ textAlign:"center", padding:mob?"60px 20px 50px":"90px 24px 70px" }}>
        <div style={{ display:"inline-block", background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.3)", borderRadius:20, padding:"5px 16px", fontSize:12, color:"#10b981", marginBottom:28 }}>✦ FREE TO START — NO CARD NEEDED</div>
        <h1 style={{ fontSize:mob?"36px":"clamp(36px,6vw,76px)", fontWeight:700, lineHeight:1.05, margin:"0 auto 20px", maxWidth:820, background:"linear-gradient(135deg,#e8e4d9 30%,#10b981 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
          Your Money.<br/>Finally Under Control.
        </h1>
        <p style={{ fontSize:mob?15:18, color:"#94a3b8", maxWidth:500, margin:"0 auto 40px", lineHeight:1.7 }}>
          Budget smarter, crush debt, reach your goals — with a smart assistant that helps you understand your money.
        </p>
        <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
          <button onClick={onEnter} style={{ background:"linear-gradient(135deg,#10b981,#059669)", border:"none", borderRadius:12, padding:"15px 40px", color:"#fff", fontSize:16, fontWeight:700, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 0 40px rgba(16,185,129,0.3)" }}>Start Free</button>
          <button onClick={()=>setShowUpgrade(true)} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:12, padding:"15px 40px", color:"#e8e4d9", fontSize:16, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>See Pro Plan →</button>
        </div>
        <p style={{ marginTop:16, color:"#334155", fontSize:12 }}>Built for India · Free to start · No credit card needed</p>
      </div>

      {/* Features grid */}
      <div style={{ maxWidth:1000, margin:"0 auto", padding:mob?"0 16px 50px":"0 24px 60px", display:"grid", gridTemplateColumns:mob?"1fr 1fr":"repeat(3,1fr)", gap:12 }}>
        {[
          {icon:"📊",t:"Budget Tracker",d:"Know where every rupee goes",free:true},
          {icon:"🎯",t:"Goal Tracker",d:"Visualise savings targets",free:true},
          {icon:"💳",t:"Debt Planner",d:"Track EMIs, crush debt faster",free:false},
          {icon:"❤️",t:"Health Score",d:"Your overall financial fitness",free:false},
          {icon:"🤖",t:"Money Assistant",d:"Get budgeting tips & general guidance",free:false},
          {icon:"💾",t:"Auto Save",d:"Your data is always saved",free:true},
        ].map(f=>(
          <div key={f.t} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:mob?"14px":"20px", position:"relative" }}>
            {!f.free && <span style={{ position:"absolute", top:10, right:10, background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", fontSize:9, padding:"2px 7px", borderRadius:8, fontWeight:700 }}>PRO</span>}
            <div style={{ fontSize:mob?24:28, marginBottom:8 }}>{f.icon}</div>
            <div style={{ fontSize:mob?13:15, fontWeight:700, marginBottom:4 }}>{f.t}</div>
            <div style={{ color:"#64748b", fontSize:mob?12:13, lineHeight:1.5 }}>{f.d}</div>
          </div>
        ))}
      </div>

      {/* Pricing section */}
      <div style={{ maxWidth:700, margin:"0 auto", padding:mob?"0 16px 60px":"0 24px 80px" }}>
        <h2 style={{ textAlign:"center", fontSize:mob?26:32, marginBottom:8 }}>Simple Pricing</h2>
        <p style={{ textAlign:"center", color:"#64748b", marginBottom:36, fontSize:14 }}>Less than your morning chai.</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          {[
            { name:"Free", price:"₹0", sub:"forever", features:["Budget tracker","Up to 3 expenses","1 savings goal","Overview dashboard"], cta:"Start Free", action:onEnter, hi:false },
            { name:"Pro", price:"₹149", sub:"/month", features:["Everything in Free","Unlimited expenses & goals","Debt tracker","Money Assistant","Health Score"], cta:"Get Pro", action:()=>setShowUpgrade(true), hi:true },
          ].map(p=>(
            <div key={p.name} style={{ background:p.hi?"rgba(16,185,129,0.06)":"rgba(255,255,255,0.03)", border:`1px solid ${p.hi?"rgba(16,185,129,0.35)":"rgba(255,255,255,0.07)"}`, borderRadius:18, padding:mob?20:28 }}>
              {p.hi&&<div style={{ color:"#10b981", fontSize:11, fontWeight:700, letterSpacing:1, marginBottom:8 }}>MOST POPULAR</div>}
              <div style={{ fontSize:18, fontWeight:700, marginBottom:4 }}>{p.name}</div>
              <div style={{ fontSize:mob?28:36, fontWeight:900, color:p.hi?"#10b981":"#e8e4d9", marginBottom:20 }}>{p.price}<span style={{ fontSize:13, color:"#64748b", fontWeight:400 }}> {p.sub}</span></div>
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
                {p.features.map(f=><div key={f} style={{ color:"#94a3b8", fontSize:mob?12:13 }}>✓ {f}</div>)}
              </div>
              <button onClick={p.action} style={{ width:"100%", padding:"12px 0", background:p.hi?"linear-gradient(135deg,#10b981,#059669)":"rgba(255,255,255,0.06)", border:"none", borderRadius:9, color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>{p.cta}</button>
            </div>
          ))}
        </div>
      </div>

      {/* Legal disclaimer */}
      <div style={{ maxWidth:700, margin:"0 auto", padding:mob?"0 20px 32px":"0 44px 32px" }}>
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:"14px 18px", fontSize:12, color:"#475569", lineHeight:1.8, textAlign:"center" }}>
          ⚠️ <strong style={{ color:"#64748b" }}>Disclaimer:</strong> ClearWealth is a budgeting tool only. Nothing in this app constitutes financial, investment, or legal advice. The Money Assistant provides general guidance — not personalised recommendations. Always consult a SEBI-registered financial advisor before making investment decisions.
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop:"1px solid rgba(255,255,255,0.05)", padding:mob?"20px 20px":"20px 44px", display:"flex", flexDirection:mob?"column":"row", justifyContent:"space-between", alignItems:"center", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:16 }}>₹</span>
          <span style={{ fontSize:14, fontWeight:700 }}>ClearWealth</span>
          <span style={{ color:"#1e293b", fontSize:12 }}>© 2026</span>
        </div>
        <div style={{ color:"#1e293b", fontSize:11 }}>Not a SEBI-registered advisor · For budgeting use only</div>
        <div style={{ display:"flex", gap:20 }}>
          <button onClick={()=>setShowTerms(true)} style={{ background:"none", border:"none", color:"#475569", fontSize:12, cursor:"pointer", fontFamily:"inherit", padding:0 }}>Terms of Service</button>
          <button onClick={()=>setShowPrivacy(true)} style={{ background:"none", border:"none", color:"#475569", fontSize:12, cursor:"pointer", fontFamily:"inherit", padding:0 }}>Privacy Policy</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────
function Dashboard({ userName, userIncome }) {
  const w = useWindowWidth(); const mob = w < 640;
  const [tab, setTab] = useState("overview");
  const [plan] = useLocalStorage("cw_plan", "free");   // "free" | "pro"  — set to "pro" after payment
  const [income, setIncome] = useLocalStorage("cw_income", userIncome);
  const [expenses, setExpenses] = useLocalStorage("cw_expenses", []);
  const [goals, setGoals] = useLocalStorage("cw_goals", []);
  const [debts, setDebts] = useLocalStorage("cw_debts", []);
  const [showAddExp, setShowAddExp] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [msgs, setMsgs] = useLocalStorage("cw_chat", [{ role:"assistant", content:`Hi ${userName}! 👋 I'm your AI Money Assistant. I can see your full financial picture. Ask me anything about budgeting, saving, or investing!` }]);
  const [chatInput, setChatInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const chatRef = useRef(null);

  const isPro = plan === "pro";
  const limits = isPro ? PLANS.pro.limits : PLANS.free.limits;

  const totalExp = expenses.reduce((s,e)=>s+e.amount,0);
  const savings = income - totalExp;
  const savingsRate = income>0?Math.round((savings/income)*100):0;
  const totalDebt = debts.reduce((s,d)=>s+d.remaining,0);
  const totalEMI = debts.reduce((s,d)=>s+d.emi,0);
  const byCat = expenses.reduce((a,e)=>{a[e.category]=(a[e.category]||0)+e.amount;return a},{});
  const score = healthScore(income,totalExp,savingsRate,debts);
  const scoreColor = score>=80?"#10b981":score>=60?"#f59e0b":"#ef4444";
  const scoreLabel = score>=80?"Excellent 🌟":score>=60?"Good 👍":score>=40?"Fair ⚠️":"Needs Work 🔴";

  useEffect(()=>{ if(chatRef.current) chatRef.current.scrollTop=chatRef.current.scrollHeight; },[msgs]);

  const handleAddExp = useCallback(data => {
    if (expenses.length >= limits.expenses) { setShowAddExp(false); setShowUpgrade(true); return; }
    setExpenses(x=>[...x,{id:Date.now(),...data}]); setShowAddExp(false);
  },[expenses.length, limits.expenses]);

  const handleAddGoal = useCallback(data => {
    if (goals.length >= limits.goals) { setShowAddGoal(false); setShowUpgrade(true); return; }
    setGoals(g=>[...g,{id:Date.now(),color:GOAL_COLORS[g.length%GOAL_COLORS.length],...data}]); setShowAddGoal(false);
  },[goals.length, limits.goals]);

  const handleAddDebt = useCallback(data => {
    if (!isPro) { setShowAddDebt(false); setShowUpgrade(true); return; }
    setDebts(d=>[...d,{id:Date.now(),total:data.remaining,color:DEBT_COLORS[d.length%DEBT_COLORS.length],...data}]); setShowAddDebt(false);
  },[isPro]);

  const sendMsg = async () => {
    if (!isPro) { setShowUpgrade(true); return; }
    if (!chatInput.trim()||aiLoading) return;
    const u = chatInput.trim(); setChatInput(""); setMsgs(m=>[...m,{role:"user",content:u}]); setAiLoading(true);
    const ctx=`You are a friendly budgeting assistant for Indian users. User: ${userName}. Data:
- Income: ₹${income.toLocaleString()} | Expenses: ₹${totalExp.toLocaleString()} | Savings: ₹${savings.toLocaleString()} (${savingsRate}%)
- Spending: ${JSON.stringify(byCat)}
- Goals: ${goals.map(g=>`${g.name} ₹${g.saved}/${g.target}`).join("; ")||"none"}
- Debts: ${debts.map(d=>`${d.name} ₹${d.remaining} at ${d.rate}% EMI ₹${d.emi}`).join("; ")||"none"}
- Health Score: ${score}/100 (${scoreLabel})
Give concise, practical budgeting guidance in 2-4 sentences. You are NOT a licensed financial advisor. Always remind the user to consult a qualified SEBI-registered advisor before making investment decisions. Use Indian context — PPF, NPS, SIPs, FD when relevant but frame them as general options, not personal recommendations.`;
    try {
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:CLAUDE_MODEL,max_tokens:1000,system:ctx,messages:[...msgs.map(m=>({role:m.role,content:m.content})),{role:"user",content:u}]})});
      const data=await res.json();
      setMsgs(m=>[...m,{role:"assistant",content:data.content?.[0]?.text||"Sorry, try again."}]);
    } catch { setMsgs(m=>[...m,{role:"assistant",content:"Connection error. Try again."}]); }
    setAiLoading(false);
  };

  const card = {background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:mob?14:20};
  const btnStyle = (bg="#10b981")=>({background:`linear-gradient(135deg,${bg},${bg}cc)`,border:"none",borderRadius:8,padding:"10px 18px",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"});
  const del = {background:"rgba(239,68,68,0.08)",border:"none",borderRadius:6,padding:"6px 10px",color:"#ef4444",cursor:"pointer",fontSize:13};
  const lbl = {fontSize:10,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:0.5};

  const TABS = mob
    ? [{id:"overview",icon:"📊",label:"HOME"},{id:"budget",icon:"💰",label:"BUDGET"},{id:"goals",icon:"🎯",label:"GOALS"},{id:"debts",icon:"💳",label:"DEBTS"},{id:"advisor",icon:"🤖",label:"CHAT"}]
    : [{id:"overview",l:"📊 Overview"},{id:"budget",l:"💰 Budget"},{id:"goals",l:"🎯 Goals"},{id:"debts",l:"💳 Debts"},{id:"advisor",l:"🤖 Money Assistant"}];

  return (
    <div style={{ minHeight:"100vh", background:"#080e1a", color:"#e8e4d9", fontFamily:"'Georgia',serif", paddingBottom:mob?80:0 }}>
      {showUpgrade && <UpgradeModal onClose={()=>setShowUpgrade(false)} />}

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:mob?"12px 16px":"12px 24px", borderBottom:"1px solid rgba(255,255,255,0.06)", background:"rgba(8,14,26,0.97)", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:20 }}>₹</span>
          <span style={{ fontSize:15, fontWeight:700 }}>ClearWealth</span>
        </div>
        {!mob && <nav style={{ display:"flex", gap:2, background:"rgba(255,255,255,0.03)", borderRadius:10, padding:3 }}>
          {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:"7px 14px", borderRadius:8, border:"none", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit", background:tab===t.id?"rgba(16,185,129,0.15)":"transparent", color:tab===t.id?"#10b981":"#64748b" }}>{t.l}</button>)}
        </nav>}
        {!isPro
          ? <button onClick={()=>setShowUpgrade(true)} style={{ background:"linear-gradient(135deg,#10b981,#059669)", border:"none", borderRadius:8, padding:"7px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>⚡ Upgrade — ₹149/mo</button>
          : <span style={{ background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.3)", color:"#10b981", fontSize:11, padding:"4px 10px", borderRadius:8, fontWeight:700 }}>PRO ✓</span>}
      </div>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:mob?"14px":"24px", boxSizing:"border-box" }}>

        {/* ══ OVERVIEW ══ */}
        {tab==="overview"&&(
          <div>
            <h2 style={{ fontSize:mob?17:21, marginBottom:16 }}>Good day, {userName}! 👋</h2>

            {/* Health Score — Pro only */}
            {isPro ? (
              <div style={{ ...card, marginBottom:14, position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${scoreColor},${scoreColor}55)` }} />
                <div style={{ display:"flex", alignItems:"center", gap:mob?14:22, flexWrap:"wrap" }}>
                  <div style={{ textAlign:"center", flexShrink:0 }}>
                    <div style={{ width:mob?70:86, height:mob?70:86, borderRadius:"50%", border:`4px solid ${scoreColor}`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                      <div style={{ fontSize:mob?20:25, fontWeight:900, color:scoreColor }}>{score}</div>
                      <div style={{ fontSize:9, color:"#64748b" }}>/100</div>
                    </div>
                    <div style={{ fontSize:11, color:scoreColor, fontWeight:700, marginTop:6 }}>Health Score</div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:mob?15:18, fontWeight:800, marginBottom:10 }}>{scoreLabel}</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                      {[{l:"Income",v:fmt(income),c:"#10b981"},{l:"Expenses",v:fmt(totalExp),c:"#ef4444"},{l:"Savings",v:fmt(savings),c:savings>=0?"#10b981":"#ef4444"},{l:"Rate",v:`${savingsRate}%`,c:savingsRate>=20?"#10b981":"#f59e0b"}].map(s=>(
                        <div key={s.l} style={{ background:"rgba(255,255,255,0.03)", borderRadius:9, padding:"8px 10px" }}>
                          <div style={{ fontSize:10, color:"#64748b", marginBottom:2 }}>{s.l}</div>
                          <div style={{ fontSize:mob?13:16, fontWeight:800, color:s.c }}>{s.v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom:14 }}>
                <ProGate onUpgrade={()=>setShowUpgrade(true)} label="Health Score — Pro Feature" />
              </div>
            )}

            <div style={{ ...card, marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:13 }}>
                <span style={{ color:"#64748b" }}>Income: <span style={{ color:"#10b981", fontWeight:700 }}>₹<EditableAmount value={income} onChange={setIncome} style={{ color:"#10b981", fontWeight:700 }} /></span></span>
                <span style={{ color:"#ef4444", fontWeight:700 }}>{Math.round((totalExp/Math.max(income,1))*100)}% spent</span>
              </div>
              <Bar pct={(totalExp/Math.max(income,1))*100} color={totalExp>income?"#ef4444":"#10b981"} h={10} />
            </div>

            {Object.keys(byCat).length > 0 && (
              <div style={{ ...card, marginBottom:14 }}>
                <div style={{ fontSize:14, fontWeight:700, marginBottom:12 }}>Spending Breakdown</div>
                {Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([cat,amt])=>(
                  <div key={cat} style={{ marginBottom:9 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, fontSize:13 }}>
                      <span style={{ color:"#94a3b8" }}>{CAT_ICONS[cat]} {cat}</span>
                      <span style={{ color:CAT_COLORS[cat], fontWeight:700 }}>{fmt(amt)}</span>
                    </div>
                    <Bar pct={(amt/Math.max(totalExp,1))*100} color={CAT_COLORS[cat]} h={5} />
                  </div>
                ))}
              </div>
            )}

            {expenses.length===0&&goals.length===0&&(
              <div style={{ ...card, textAlign:"center", padding:"32px 20px" }}>
                <div style={{ fontSize:32, marginBottom:12 }}>👆</div>
                <div style={{ fontSize:15, fontWeight:700, marginBottom:8 }}>Start by adding your expenses</div>
                <div style={{ color:"#475569", fontSize:13, marginBottom:16 }}>Go to the Budget tab and add what you spend each month</div>
                <button onClick={()=>setTab("budget")} style={{ background:"linear-gradient(135deg,#10b981,#059669)", border:"none", borderRadius:8, padding:"10px 24px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Go to Budget →</button>
              </div>
            )}
          </div>
        )}

        {/* ══ BUDGET ══ */}
        {tab==="budget"&&(
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16, flexWrap:"wrap", gap:8 }}>
              <div>
                <h2 style={{ fontSize:mob?18:22, margin:0 }}>Budget</h2>
                <p style={{ color:"#475569", fontSize:13, marginTop:4 }}>
                  Income: ₹<EditableAmount value={income} onChange={setIncome} style={{ color:"#10b981", fontWeight:700 }} />
                  &nbsp;·&nbsp;
                  {savings>=0?<span style={{ color:"#10b981" }}>Saving {fmt(savings)}/mo</span>:<span style={{ color:"#ef4444" }}>Over by {fmt(Math.abs(savings))}</span>}
                </p>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                {!isPro&&expenses.length>=limits.expenses&&<span style={{ fontSize:12, color:"#f59e0b" }}>Free limit: {expenses.length}/{limits.expenses}</span>}
                <button style={btnStyle()} onClick={()=>setShowAddExp(v=>!v)}>{showAddExp?"✕ Cancel":"+ Add"}</button>
              </div>
            </div>
            {showAddExp&&<AddExpenseForm onAdd={handleAddExp} onCancel={()=>setShowAddExp(false)} />}
            <div style={{ ...card, marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#64748b", marginBottom:8 }}>
                <span>Spent: <span style={{ color:"#ef4444", fontWeight:700 }}>{fmt(totalExp)}</span></span>
                <span>Income: <span style={{ color:"#10b981", fontWeight:700 }}>{fmt(income)}</span></span>
              </div>
              <Bar pct={(totalExp/Math.max(income,1))*100} color={totalExp>income?"#ef4444":"#10b981"} h={10} />
            </div>
            <div style={card}>
              {expenses.length===0&&<div style={{ textAlign:"center", padding:"30px 0", color:"#334155" }}>No expenses yet — add one above!</div>}
              {expenses.map(exp=>(
                <div key={exp.id} style={{ display:"flex", alignItems:"center", gap:mob?8:12, padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ width:34, height:34, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", background:`${CAT_COLORS[exp.category]}22`, fontSize:16, flexShrink:0 }}>{CAT_ICONS[exp.category]}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <EditableText value={exp.name} onChange={v=>setExpenses(x=>x.map(e=>e.id===exp.id?{...e,name:v}:e))} style={{ fontSize:14, fontWeight:600 }} />
                    <div style={{ fontSize:11, color:CAT_COLORS[exp.category], marginTop:2 }}>{exp.category}</div>
                  </div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#ef4444", flexShrink:0 }}>−₹<EditableAmount value={exp.amount} onChange={v=>setExpenses(x=>x.map(e=>e.id===exp.id?{...e,amount:v}:e))} style={{ fontSize:14, fontWeight:700, color:"#ef4444" }} /></div>
                  <button onClick={()=>setExpenses(x=>x.filter(e=>e.id!==exp.id))} style={del}>✕</button>
                </div>
              ))}
              {expenses.length>0&&<div style={{ display:"flex", justifyContent:"space-between", padding:"12px 0 0", borderTop:"1px solid rgba(255,255,255,0.07)", marginTop:8, fontWeight:700 }}>
                <span style={{ color:"#64748b" }}>Total</span><span style={{ color:"#ef4444", fontSize:17 }}>{fmt(totalExp)}</span>
              </div>}
            </div>
            {!isPro&&<div style={{ marginTop:12, padding:"10px 14px", background:"rgba(16,185,129,0.05)", border:"1px solid rgba(16,185,129,0.15)", borderRadius:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:13, color:"#64748b" }}>Free plan: {expenses.length}/{limits.expenses} expenses</span>
              <button onClick={()=>setShowUpgrade(true)} style={{ background:"linear-gradient(135deg,#10b981,#059669)", border:"none", borderRadius:7, padding:"6px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Upgrade — ₹149/mo</button>
            </div>}
          </div>
        )}

        {/* ══ GOALS ══ */}
        {tab==="goals"&&(
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16, flexWrap:"wrap", gap:8 }}>
              <div>
                <h2 style={{ fontSize:mob?18:22, margin:0 }}>Goals</h2>
                <p style={{ color:"#475569", fontSize:13, marginTop:4 }}>{savings>0?<span>You can save <span style={{ color:"#10b981", fontWeight:700 }}>{fmt(savings)}/mo</span></span>:"Fix budget first!"}</p>
              </div>
              <button style={btnStyle()} onClick={()=>setShowAddGoal(v=>!v)}>{showAddGoal?"✕ Cancel":"+ New Goal"}</button>
            </div>
            {showAddGoal&&<AddGoalForm onAdd={handleAddGoal} onCancel={()=>setShowAddGoal(false)} />}
            {goals.length===0&&!showAddGoal&&<div style={{ ...card, textAlign:"center", padding:"36px 0", color:"#334155" }}>No goals yet — add your first one!</div>}
            <div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"repeat(auto-fit,minmax(280px,1fr))", gap:14 }}>
              {goals.map(g=>{
                const pct=g.target>0?Math.min(Math.round((g.saved/g.target)*100),100):0;
                const rem=Math.max(g.target-g.saved,0);
                const months=savings>0&&rem>0?Math.ceil(rem/savings):null;
                return (
                  <div key={g.id} style={{ ...card, position:"relative", overflow:"hidden" }}>
                    <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:g.color }} />
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
                      <EditableText value={g.name} onChange={v=>setGoals(gs=>gs.map(x=>x.id===g.id?{...x,name:v}:x))} style={{ fontSize:16, fontWeight:800 }} />
                      <button onClick={()=>setGoals(gs=>gs.filter(x=>x.id!==g.id))} style={del}>✕</button>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
                      <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:9, padding:"10px 12px" }}>
                        <div style={lbl}>Saved</div>
                        <div style={{ fontSize:17, fontWeight:800, color:g.color }}>₹<EditableAmount value={g.saved} onChange={v=>setGoals(gs=>gs.map(x=>x.id===g.id?{...x,saved:Math.min(v,x.target)}:x))} style={{ fontSize:17, fontWeight:800, color:g.color }} /></div>
                      </div>
                      <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:9, padding:"10px 12px" }}>
                        <div style={lbl}>Target</div>
                        <div style={{ fontSize:17, fontWeight:800 }}>₹<EditableAmount value={g.target} onChange={v=>setGoals(gs=>gs.map(x=>x.id===g.id?{...x,target:v}:x))} style={{ fontSize:17, fontWeight:800 }} /></div>
                      </div>
                    </div>
                    <Bar pct={pct} color={g.color} h={8} />
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, margin:"6px 0 12px" }}>
                      <span style={{ color:g.color, fontWeight:700 }}>{pct}% done</span>
                      <span style={{ color:"#475569" }}>{months?`~${months} months left`:rem===0?"🎉 Complete!":"—"}</span>
                    </div>
                    {rem>0&&savings>0&&<button onClick={()=>setGoals(gs=>gs.map(x=>x.id===g.id?{...x,saved:Math.min(x.saved+savings,x.target)}:x))} style={{ ...btnStyle(g.color), width:"100%", fontSize:12, padding:"9px 0" }}>+ Add This Month ({fmt(savings)})</button>}
                    {rem===0&&<div style={{ textAlign:"center", color:g.color, fontWeight:700 }}>🎉 Goal Reached!</div>}
                  </div>
                );
              })}
            </div>
            {!isPro&&<div style={{ marginTop:12, padding:"10px 14px", background:"rgba(16,185,129,0.05)", border:"1px solid rgba(16,185,129,0.15)", borderRadius:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:13, color:"#64748b" }}>Free plan: {goals.length}/{limits.goals} goal</span>
              <button onClick={()=>setShowUpgrade(true)} style={{ background:"linear-gradient(135deg,#10b981,#059669)", border:"none", borderRadius:7, padding:"6px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Upgrade — ₹149/mo</button>
            </div>}
          </div>
        )}

        {/* ══ DEBTS ══ */}
        {tab==="debts"&&(
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16, flexWrap:"wrap", gap:8 }}>
              <div>
                <h2 style={{ fontSize:mob?18:22, margin:0 }}>Debt Tracker</h2>
                <p style={{ color:"#475569", fontSize:13, marginTop:4 }}>{totalDebt>0?<span>Total: <span style={{ color:"#ef4444", fontWeight:700 }}>{fmt(totalDebt)}</span></span>:"No debts — amazing! 🎉"}</p>
              </div>
              {isPro&&<button style={btnStyle("#ef4444")} onClick={()=>setShowAddDebt(v=>!v)}>{showAddDebt?"✕ Cancel":"+ Add Debt"}</button>}
            </div>
            {!isPro ? <ProGate onUpgrade={()=>setShowUpgrade(true)} label="Debt Tracker is a Pro feature" />
            : (
              <>
                {showAddDebt&&<AddDebtForm onAdd={handleAddDebt} onCancel={()=>setShowAddDebt(false)} />}
                {debts.length===0&&!showAddDebt&&<div style={{ ...card, textAlign:"center", padding:"40px 0", color:"#334155" }}>No debts tracked yet.</div>}
                {debts.map(d=>{
                  const paidPct=Math.round(((d.total-d.remaining)/Math.max(d.total,1))*100);
                  const monthsLeft=d.emi>0?Math.ceil(d.remaining/d.emi):0;
                  return (
                    <div key={d.id} style={{ ...card, marginBottom:12, position:"relative", overflow:"hidden" }}>
                      <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:d.color }} />
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
                        <div><div style={{ fontSize:16, fontWeight:800 }}>{d.name}</div>{d.rate>0&&<div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{d.rate}% p.a.</div>}</div>
                        <button onClick={()=>setDebts(ds=>ds.filter(x=>x.id!==d.id))} style={del}>✕</button>
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:12 }}>
                        {[{l:"Remaining",v:fmt(d.remaining),c:d.color},{l:"EMI/mo",v:fmt(d.emi),c:"#8b5cf6"},{l:"Months Left",v:monthsLeft,c:"#f59e0b"}].map(s=>(
                          <div key={s.l} style={{ background:"rgba(255,255,255,0.03)", borderRadius:9, padding:"8px 10px" }}>
                            <div style={lbl}>{s.l}</div>
                            <div style={{ fontSize:14, fontWeight:700, color:s.c }}>{s.v}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize:11, color:"#64748b", marginBottom:5 }}>{paidPct}% paid off</div>
                      <Bar pct={paidPct} color={d.color} h={8} />
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* ══ AI ADVISOR ══ */}
        {tab==="advisor"&&(
          <div style={{ display:"flex", flexDirection:"column", height:mob?"calc(100vh - 160px)":"calc(100vh - 130px)", minHeight:400 }}>
            <div style={{ marginBottom:12 }}>
              <h2 style={{ fontSize:mob?18:22, margin:0 }}>Money Assistant</h2>
              <p style={{ color:"#475569", fontSize:12, marginTop:4 }}>General budgeting guidance · Not financial advice</p>
              <div style={{ marginTop:8, padding:"8px 12px", background:"rgba(245,158,11,0.06)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:8, fontSize:11, color:"#92400e" }}>
                ⚠️ The Money Assistant provides general information only — not personalised financial or investment advice. Consult a SEBI-registered advisor for investment decisions.
              </div>
            </div>
            {!isPro ? (
              <ProGate onUpgrade={()=>setShowUpgrade(true)} label="Money Assistant is a Pro feature" />
            ) : (
              <>
                <div style={{ display:"flex", gap:8, marginBottom:10, flexWrap:"wrap" }}>
                  {["Save more?","Overspending?","Pay debt faster?","Where to invest?","Improve score?"].map(q=>(
                    <button key={q} onClick={()=>setChatInput(q)} style={{ background:"rgba(16,185,129,0.07)", border:"1px solid rgba(16,185,129,0.2)", borderRadius:20, padding:"5px 12px", color:"#10b981", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>{q}</button>
                  ))}
                </div>
                <div ref={chatRef} style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:12, padding:14, background:"rgba(255,255,255,0.02)", borderRadius:14, border:"1px solid rgba(255,255,255,0.06)", marginBottom:10 }}>
                  {msgs.map((m,i)=>(
                    <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
                      <div style={{ maxWidth:mob?"88%":"72%", padding:"11px 14px", borderRadius:14, fontSize:14, lineHeight:1.65, background:m.role==="user"?"linear-gradient(135deg,#10b981,#059669)":"rgba(255,255,255,0.05)", color:m.role==="user"?"#fff":"#e8e4d9", borderBottomRightRadius:m.role==="user"?4:14, borderBottomLeftRadius:m.role==="assistant"?4:14 }}>
                        {m.role==="assistant"&&<div style={{ fontSize:10, color:"#475569", marginBottom:4 }}>🤖 MONEY ASSISTANT</div>}
                        {m.content}
                        {m.role==="assistant"&&<div style={{ fontSize:10, color:"#475569", marginTop:8, paddingTop:8, borderTop:"1px solid rgba(255,255,255,0.06)" }}>⚠️ General guidance only — not financial advice. Consult a SEBI-registered advisor for investments.</div>}
                      </div>
                    </div>
                  ))}
                  {aiLoading&&<div style={{ display:"flex" }}><div style={{ background:"rgba(255,255,255,0.05)", padding:"11px 14px", borderRadius:14, color:"#475569", fontSize:14 }}>Thinking…</div></div>}
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <input style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:8, padding:"12px 14px", color:"#e8e4d9", fontSize:15, fontFamily:"inherit", outline:"none" }}
                    placeholder="Ask anything…" value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMsg()} />
                  <button onClick={sendMsg} disabled={aiLoading} style={{ background:"linear-gradient(135deg,#10b981,#059669)", border:"none", borderRadius:8, padding:"12px 20px", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", opacity:aiLoading?0.5:1 }}>Send</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Mobile Bottom Nav */}
      {mob&&(
        <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"rgba(8,14,26,0.97)", borderTop:"1px solid rgba(255,255,255,0.08)", display:"flex", zIndex:200, paddingBottom:"env(safe-area-inset-bottom,0px)" }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, padding:"10px 0 8px", border:"none", background:"transparent", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
              <span style={{ fontSize:20 }}>{t.icon}</span>
              <span style={{ fontSize:9, fontWeight:700, color:tab===t.id?"#10b981":"#475569" }}>{t.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useLocalStorage("cw_screen", "landing");
  const [profile, setProfile] = useLocalStorage("cw_profile", null);

  if (screen === "landing") return <Landing onEnter={() => setScreen("onboarding")} />;
  if (screen === "onboarding" || !profile) return (
    <Onboarding onDone={data => { setProfile(data); setScreen("app"); }} />
  );
  return <Dashboard userName={profile.name} userIncome={profile.income} />;
}
