import { useState, useEffect, useRef } from "react";

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

/* ── useWindowWidth ── */
function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 800);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}

/* ── EditableAmount ── */
function EditableAmount({ value, onChange, style = {}, prefix = "" }) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState(String(value));
  const ref = useRef(null);
  useEffect(() => { if (editing && ref.current) ref.current.select(); }, [editing]);
  const commit = () => {
    const n = parseFloat(raw.replace(/,/g,""));
    if (!isNaN(n) && n >= 0) onChange(n); else setRaw(String(value));
    setEditing(false);
  };
  if (editing) return <input ref={ref} value={raw} type="number" inputMode="numeric"
    onChange={e=>setRaw(e.target.value)} onBlur={commit}
    onKeyDown={e=>{if(e.key==="Enter")commit();if(e.key==="Escape"){setRaw(String(value));setEditing(false);}}}
    style={{background:"rgba(16,185,129,0.12)",border:"1px solid #10b981",borderRadius:6,padding:"3px 8px",color:"#10b981",fontSize:"inherit",fontWeight:"inherit",fontFamily:"inherit",width:110,outline:"none",...style}} />;
  return <span onClick={()=>{setRaw(String(value));setEditing(true);}} title="Tap to edit"
    style={{cursor:"pointer",borderBottom:"1px dashed rgba(255,255,255,0.3)",paddingBottom:1,...style}}>{prefix}{value.toLocaleString("en-IN")}</span>;
}

/* ── EditableText ── */
function EditableText({ value, onChange, style = {} }) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState(value);
  const ref = useRef(null);
  useEffect(() => { if (editing && ref.current) ref.current.select(); }, [editing]);
  const commit = () => { if (raw.trim()) onChange(raw.trim()); else setRaw(value); setEditing(false); };
  if (editing) return <input ref={ref} value={raw} onChange={e=>setRaw(e.target.value)} onBlur={commit}
    onKeyDown={e=>{if(e.key==="Enter")commit();if(e.key==="Escape"){setRaw(value);setEditing(false);}}}
    style={{background:"rgba(16,185,129,0.12)",border:"1px solid #10b981",borderRadius:6,padding:"3px 8px",color:"#e8e4d9",fontSize:"inherit",fontFamily:"inherit",width:150,outline:"none",...style}} />;
  return <span onClick={()=>{setRaw(value);setEditing(true);}} title="Tap to edit"
    style={{cursor:"pointer",borderBottom:"1px dashed rgba(255,255,255,0.3)",paddingBottom:1,...style}}>{value}</span>;
}

/* ── ProgressBar ── */
function Bar({ pct, color, h = 8 }) {
  return <div style={{background:"rgba(255,255,255,0.06)",borderRadius:h,height:h,overflow:"hidden"}}>
    <div style={{width:`${Math.min(pct,100)}%`,height:"100%",background:color,borderRadius:h,transition:"width 0.4s"}} />
  </div>;
}

/* ── Health Score ── */
function healthScore(income, totalExp, savingsRate, debts) {
  let score = 100;
  if (savingsRate < 10) score -= 30; else if (savingsRate < 20) score -= 15;
  const debtPayments = debts.reduce((s,d)=>s+d.emi,0);
  const dti = income > 0 ? (debtPayments/income)*100 : 100;
  if (dti > 40) score -= 30; else if (dti > 20) score -= 15;
  if (totalExp > income) score -= 20;
  return Math.max(score, 5);
}

/* ════════════════════════════════════════════════════════
   LANDING PAGE
════════════════════════════════════════════════════════ */
function Landing({ onEnter }) {
  const w = useWindowWidth();
  const mob = w < 640;
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#080e1a,#0d1b2a)",fontFamily:"'Georgia',serif",color:"#e8e4d9",overflowX:"hidden"}}>
      <div style={{position:"fixed",top:"-20%",right:"-10%",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(16,185,129,0.08),transparent 70%)",pointerEvents:"none"}} />
      {/* Nav */}
      <nav style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:mob?"16px 20px":"20px 44px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:24}}>₹</span>
          <span style={{fontSize:18,fontWeight:700,letterSpacing:1}}>ClearWealth</span>
        </div>
        <button onClick={onEnter} style={{background:"linear-gradient(135deg,#10b981,#059669)",border:"none",borderRadius:8,padding:"9px 20px",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Try Free →</button>
      </nav>
      {/* Hero */}
      <div style={{textAlign:"center",padding:mob?"60px 20px 50px":"90px 24px 70px"}}>
        <div style={{display:"inline-block",background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.3)",borderRadius:20,padding:"5px 16px",fontSize:12,color:"#10b981",marginBottom:28,letterSpacing:1}}>✦ FREE · NO CARD NEEDED</div>
        <h1 style={{fontSize:mob?"36px":"clamp(36px,6vw,76px)",fontWeight:700,lineHeight:1.05,margin:"0 auto 20px",maxWidth:820,background:"linear-gradient(135deg,#e8e4d9 30%,#10b981 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Your Money.<br/>Finally Under Control.</h1>
        <p style={{fontSize:mob?15:18,color:"#94a3b8",maxWidth:500,margin:"0 auto 40px",lineHeight:1.7}}>Budget, goals, debt tracking and an AI advisor — all in one free app.</p>
        <button onClick={onEnter} style={{background:"linear-gradient(135deg,#10b981,#059669)",border:"none",borderRadius:12,padding:mob?"14px 32px":"16px 44px",color:"#fff",fontSize:mob?15:17,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 0 40px rgba(16,185,129,0.3)"}}>Start Planning Free</button>
        <p style={{marginTop:16,color:"#334155",fontSize:12}}>Trusted by 12,400+ people · ⭐ 4.9/5</p>
      </div>
      {/* Features */}
      <div style={{maxWidth:1000,margin:"0 auto",padding:mob?"0 16px 60px":"0 24px 80px",display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(3,1fr)",gap:12}}>
        {[
          {icon:"📊",t:"Budget Tracker",d:"Know where every rupee goes"},
          {icon:"✏️",t:"Fully Editable",d:"Tap any number to change it"},
          {icon:"🎯",t:"Goal Tracker",d:"Visualise your savings targets"},
          {icon:"💳",t:"Debt Planner",d:"Track EMIs, crush debt faster"},
          {icon:"❤️",t:"Health Score",d:"See your overall financial fitness"},
          {icon:"🤖",t:"AI Advisor",d:"Claude answers any money question"},
        ].map(f=>(
          <div key={f.t} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:mob?"16px":"22px"}}>
            <div style={{fontSize:mob?24:28,marginBottom:8}}>{f.icon}</div>
            <div style={{fontSize:mob?13:15,fontWeight:700,marginBottom:4}}>{f.t}</div>
            <div style={{color:"#64748b",lineHeight:1.5,fontSize:mob?12:13}}>{f.d}</div>
          </div>
        ))}
      </div>
      {/* CTA */}
      <div style={{textAlign:"center",padding:mob?"0 20px 60px":"0 24px 80px"}}>
        <button onClick={onEnter} style={{background:"linear-gradient(135deg,#10b981,#059669)",border:"none",borderRadius:12,padding:"14px 40px",color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Get Started Free →</button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   DASHBOARD
════════════════════════════════════════════════════════ */
function Dashboard() {
  const w = useWindowWidth();
  const mob = w < 640;
  const [tab, setTab] = useState("overview");
  const [income, setIncome] = useState(DEFAULTS.income);
  const [expenses, setExpenses] = useState(DEFAULTS.expenses);
  const [goals, setGoals] = useState(DEFAULTS.goals);
  const [debts, setDebts] = useState(DEFAULTS.debts);
  const [msgs, setMsgs] = useState([{role:"assistant",content:"Hi! I'm your AI financial advisor. I can see your full financial picture — income, expenses, goals and debts. Ask me anything! 💰"}]);
  const [chatInput, setChatInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showAddExp, setShowAddExp] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [newExp, setNewExp] = useState({name:"",amount:"",category:"Food"});
  const [newGoal, setNewGoal] = useState({name:"",target:"",saved:"0"});
  const [newDebt, setNewDebt] = useState({name:"",remaining:"",emi:"",rate:"",color:"#ef4444"});
  const chatRef = useRef(null);

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

  const addExp = () => { if(!newExp.name.trim()||!newExp.amount) return; setExpenses(x=>[...x,{id:Date.now(),name:newExp.name.trim(),amount:parseFloat(newExp.amount),category:newExp.category}]); setNewExp({name:"",amount:"",category:"Food"}); setShowAddExp(false); };
  const delExp = id => setExpenses(x=>x.filter(e=>e.id!==id));
  const updExp = (id,f,v) => setExpenses(x=>x.map(e=>e.id===id?{...e,[f]:v}:e));

  const addGoal = () => { if(!newGoal.name.trim()||!newGoal.target) return; const cols=["#10b981","#f59e0b","#6366f1","#ec4899","#14b8a6"]; setGoals(g=>[...g,{id:Date.now(),name:newGoal.name.trim(),target:parseFloat(newGoal.target),saved:parseFloat(newGoal.saved)||0,color:cols[g.length%cols.length]}]); setNewGoal({name:"",target:"",saved:"0"}); setShowAddGoal(false); };
  const delGoal = id => setGoals(g=>g.filter(x=>x.id!==id));
  const updGoal = (id,f,v) => setGoals(g=>g.map(x=>x.id===id?{...x,[f]:v}:x));

  const addDebt = () => { if(!newDebt.name.trim()||!newDebt.remaining||!newDebt.emi) return; setDebts(d=>[...d,{id:Date.now(),name:newDebt.name.trim(),total:parseFloat(newDebt.remaining),remaining:parseFloat(newDebt.remaining),emi:parseFloat(newDebt.emi),rate:parseFloat(newDebt.rate)||0,color:newDebt.color}]); setNewDebt({name:"",remaining:"",emi:"",rate:"",color:"#ef4444"}); setShowAddDebt(false); };
  const delDebt = id => setDebts(d=>d.filter(x=>x.id!==id));

  const sendMsg = async () => {
    if(!chatInput.trim()||aiLoading) return;
    const u=chatInput.trim(); setChatInput(""); setMsgs(m=>[...m,{role:"user",content:u}]); setAiLoading(true);
    const ctx=`You are a friendly AI financial advisor for Indian users. User data:
- Income: ₹${income.toLocaleString()} | Expenses: ₹${totalExp.toLocaleString()} | Savings: ₹${savings.toLocaleString()} (${savingsRate}%)
- Spending: ${JSON.stringify(byCat)}
- Goals: ${goals.map(g=>`${g.name} ₹${g.saved}/${g.target}`).join("; ")}
- Debts: ${debts.map(d=>`${d.name} ₹${d.remaining} at ${d.rate}% (EMI ₹${d.emi})`).join("; ")}
- Financial Health Score: ${score}/100 (${scoreLabel})
Give concise, actionable advice (2-4 sentences). Use Indian context — PPF, NPS, SIPs, FD when relevant.`;
    try {
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:CLAUDE_MODEL,max_tokens:1000,system:ctx,messages:[...msgs.map(m=>({role:m.role,content:m.content})),{role:"user",content:u}]})});
      const data=await res.json();
      setMsgs(m=>[...m,{role:"assistant",content:data.content?.[0]?.text||"Sorry, try again."}]);
    } catch { setMsgs(m=>[...m,{role:"assistant",content:"Connection error. Try again."}]); }
    setAiLoading(false);
  };

  /* ── Styles ── */
  const bg = "#080e1a";
  const card = {background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:mob?14:20};
  const inp = {background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,padding:"10px 12px",color:"#e8e4d9",fontSize:14,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box"};
  const btn = (bg2="#10b981")=>({background:`linear-gradient(135deg,${bg2},${bg2}cc)`,border:"none",borderRadius:8,padding:"10px 18px",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"});
  const lbl = {fontSize:10,color:"#64748b",display:"block",marginBottom:5,letterSpacing:0.5,textTransform:"uppercase"};
  const del = {background:"rgba(239,68,68,0.08)",border:"none",borderRadius:6,padding:"6px 10px",color:"#ef4444",cursor:"pointer",fontSize:13};

  const TABS = mob
    ? [{id:"overview",l:"📊"},{id:"budget",l:"💰"},{id:"goals",l:"🎯"},{id:"debts",l:"💳"},{id:"advisor",l:"🤖"}]
    : [{id:"overview",l:"📊 Overview"},{id:"budget",l:"💰 Budget"},{id:"goals",l:"🎯 Goals"},{id:"debts",l:"💳 Debts"},{id:"advisor",l:"🤖 AI Advisor"}];

  const Section = ({title,sub,action,onAction,actionLabel})=>(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:8}}>
      <div><h2 style={{fontSize:mob?18:22,margin:0}}>{title}</h2>{sub&&<p style={{color:"#475569",fontSize:13,marginTop:4}}>{sub}</p>}</div>
      {action&&<button style={btn()} onClick={onAction}>{actionLabel}</button>}
    </div>
  );

  const AddForm = ({show, fields, onAdd, onCancel}) => show?(
    <div style={{...card,marginBottom:14,border:"1px solid rgba(16,185,129,0.3)"}}>
      <div style={{display:"grid",gridTemplateColumns:mob?`repeat(${Math.min(fields.length,2)},1fr)`:`repeat(${fields.length},1fr) auto`,gap:10,alignItems:"end"}}>
        {fields.map(f=>(
          <div key={f.key}>
            <label style={lbl}>{f.label}</label>
            {f.type==="select"
              ? <select style={inp} value={f.value} onChange={e=>f.onChange(e.target.value)}>{f.options.map(o=><option key={o}>{o}</option>)}</select>
              : <input style={inp} type={f.type||"text"} inputMode={f.type==="number"?"numeric":"text"} placeholder={f.placeholder} value={f.value} onChange={e=>f.onChange(e.target.value)} onKeyDown={e=>e.key==="Enter"&&onAdd()} autoFocus={f.auto} />}
          </div>
        ))}
        <div style={{display:"flex",gap:8,marginTop:mob?8:0,gridColumn:mob?"1/-1":"auto"}}>
          <button style={{...btn(),flex:1}} onClick={onAdd}>Add</button>
          <button style={{...btn("#374151"),padding:"10px 14px"}} onClick={onCancel}>✕</button>
        </div>
      </div>
    </div>
  ):null;

  return (
    <div style={{minHeight:"100vh",background:bg,color:"#e8e4d9",fontFamily:"'Georgia',serif",paddingBottom:mob?80:0}}>

      {/* ── Header ── */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:mob?"12px 16px":"12px 24px",borderBottom:"1px solid rgba(255,255,255,0.06)",background:"rgba(8,14,26,0.97)",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:20}}>₹</span>
          <span style={{fontSize:15,fontWeight:700}}>ClearWealth</span>
          <span style={{background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.3)",color:"#10b981",fontSize:10,padding:"2px 6px",borderRadius:8}}>FREE</span>
        </div>
        {/* Desktop tabs */}
        {!mob&&<nav style={{display:"flex",gap:2,background:"rgba(255,255,255,0.03)",borderRadius:10,padding:3}}>
          {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"7px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit",background:tab===t.id?"rgba(16,185,129,0.15)":"transparent",color:tab===t.id?"#10b981":"#64748b"}}>{t.l}</button>)}
        </nav>}
        <div style={{fontSize:11,color:"#475569"}}>✏️ Tap any value</div>
      </div>

      {/* ── Body ── */}
      <div style={{maxWidth:1100,margin:"0 auto",padding:mob?"14px 14px":"24px 24px",boxSizing:"border-box"}}>

        {/* ══ OVERVIEW ══ */}
        {tab==="overview"&&(
          <div>
            {/* Health Score Hero */}
            <div style={{...card,marginBottom:14,background:"rgba(255,255,255,0.03)",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${scoreColor},${scoreColor}88)`}} />
              <div style={{display:"flex",alignItems:"center",gap:mob?14:24,flexWrap:mob?"wrap":"nowrap"}}>
                <div style={{textAlign:"center",flexShrink:0}}>
                  <div style={{width:mob?72:90,height:mob?72:90,borderRadius:"50%",border:`4px solid ${scoreColor}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",margin:"0 auto"}}>
                    <div style={{fontSize:mob?22:28,fontWeight:900,color:scoreColor}}>{score}</div>
                    <div style={{fontSize:9,color:"#64748b"}}>/ 100</div>
                  </div>
                  <div style={{fontSize:11,color:scoreColor,fontWeight:700,marginTop:6}}>Health Score</div>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:mob?16:20,fontWeight:800,marginBottom:2}}>{scoreLabel}</div>
                  <div style={{fontSize:13,color:"#64748b",marginBottom:12}}>Based on savings rate, debt load & spending</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    {[
                      {l:"Income",v:fmt(income),c:"#10b981"},
                      {l:"Expenses",v:fmt(totalExp),c:"#ef4444"},
                      {l:"Savings",v:fmt(savings),c:savings>=0?"#10b981":"#ef4444"},
                      {l:"Savings Rate",v:`${savingsRate}%`,c:savingsRate>=20?"#10b981":"#f59e0b"},
                    ].map(s=>(
                      <div key={s.l} style={{background:"rgba(255,255,255,0.03)",borderRadius:10,padding:"8px 12px"}}>
                        <div style={{fontSize:10,color:"#64748b",marginBottom:2}}>{s.l}</div>
                        <div style={{fontSize:mob?14:17,fontWeight:800,color:s.c}}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Income bar */}
            <div style={{...card,marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,fontSize:13}}>
                <span style={{color:"#64748b"}}>Monthly Income: <span style={{color:"#10b981",fontWeight:700}}>₹<EditableAmount value={income} onChange={setIncome} style={{color:"#10b981",fontWeight:700}} /></span></span>
                <span style={{color:"#ef4444",fontWeight:700}}>{Math.round((totalExp/income)*100)}% spent</span>
              </div>
              <Bar pct={(totalExp/income)*100} color={totalExp>income?"#ef4444":"#10b981"} h={10} />
            </div>

            {/* Category breakdown */}
            <div style={{...card,marginBottom:14}}>
              <div style={{fontSize:14,fontWeight:700,marginBottom:12}}>Spending Breakdown</div>
              {Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([cat,amt])=>(
                <div key={cat} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:13}}>
                    <span style={{color:"#94a3b8"}}>{CAT_ICONS[cat]} {cat}</span>
                    <span style={{color:CAT_COLORS[cat],fontWeight:700}}>{fmt(amt)}</span>
                  </div>
                  <Bar pct={(amt/totalExp)*100} color={CAT_COLORS[cat]} h={6} />
                </div>
              ))}
            </div>

            {/* Goals + Debts preview */}
            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:14}}>
              <div style={card}>
                <div style={{fontSize:14,fontWeight:700,marginBottom:12}}>🎯 Goals</div>
                {goals.slice(0,3).map(g=>(
                  <div key={g.id} style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:13}}><span>{g.name}</span><span style={{color:g.color,fontWeight:700}}>{Math.min(Math.round((g.saved/g.target)*100),100)}%</span></div>
                    <Bar pct={(g.saved/g.target)*100} color={g.color} h={6} />
                  </div>
                ))}
              </div>
              <div style={card}>
                <div style={{fontSize:14,fontWeight:700,marginBottom:12}}>💳 Debts</div>
                {debts.slice(0,3).map(d=>(
                  <div key={d.id} style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:13}}><span>{d.name}</span><span style={{color:d.color,fontWeight:700}}>{fmt(d.remaining)}</span></div>
                    <Bar pct={(d.remaining/d.total)*100} color={d.color} h={6} />
                  </div>
                ))}
                {debts.length===0&&<div style={{color:"#334155",fontSize:13}}>No debts — amazing! 🎉</div>}
              </div>
            </div>
          </div>
        )}

        {/* ══ BUDGET ══ */}
        {tab==="budget"&&(
          <div>
            <Section title="Budget Tracker"
              sub={<>Income: ₹<EditableAmount value={income} onChange={setIncome} style={{color:"#10b981",fontWeight:700}} /> · {savings>=0?<span style={{color:"#10b981"}}>Saving {fmt(savings)}/mo</span>:<span style={{color:"#ef4444"}}>Over by {fmt(Math.abs(savings))}</span>}</>}
              action onAction={()=>setShowAddExp(v=>!v)} actionLabel={showAddExp?"✕ Cancel":"+ Add"} />

            <AddForm show={showAddExp} onAdd={addExp} onCancel={()=>setShowAddExp(false)} fields={[
              {key:"name",label:"Expense Name",placeholder:"e.g. Netflix",value:newExp.name,onChange:v=>setNewExp(x=>({...x,name:v})),auto:true},
              {key:"amount",label:"Amount (₹)",type:"number",placeholder:"0",value:newExp.amount,onChange:v=>setNewExp(x=>({...x,amount:v}))},
              {key:"cat",label:"Category",type:"select",value:newExp.category,onChange:v=>setNewExp(x=>({...x,category:v})),options:CATS},
            ]} />

            {/* Spending bar */}
            <div style={{...card,marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#64748b",marginBottom:8}}>
                <span>Spent: <span style={{color:"#ef4444",fontWeight:700}}>{fmt(totalExp)}</span></span>
                <span>Income: <span style={{color:"#10b981",fontWeight:700}}>{fmt(income)}</span></span>
              </div>
              <Bar pct={(totalExp/income)*100} color={totalExp>income?"#ef4444":"#10b981"} h={10} />
              <div style={{textAlign:"right",fontSize:11,color:"#475569",marginTop:4}}>{Math.round((totalExp/income)*100)}% used</div>
            </div>

            {/* Expense list */}
            <div style={card}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#475569",marginBottom:10}}>
                <span>{expenses.length} expenses · tap to edit</span>
                <span style={{color:"#ef4444",fontWeight:700}}>{fmt(totalExp)}</span>
              </div>
              {expenses.length===0&&<div style={{textAlign:"center",padding:"30px 0",color:"#1e293b"}}>No expenses yet!</div>}
              {expenses.map(exp=>(
                <div key={exp.id} style={{display:"flex",alignItems:"center",gap:mob?8:12,padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  <div style={{width:34,height:34,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",background:`${CAT_COLORS[exp.category]}22`,fontSize:16,flexShrink:0}}>{CAT_ICONS[exp.category]}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <EditableText value={exp.name} onChange={v=>updExp(exp.id,"name",v)} style={{fontSize:14,fontWeight:600}} />
                    {mob&&<div style={{fontSize:11,color:CAT_COLORS[exp.category],marginTop:2}}>{exp.category}</div>}
                  </div>
                  {!mob&&<select value={exp.category} onChange={e=>updExp(exp.id,"category",e.target.value)} style={{background:`${CAT_COLORS[exp.category]}18`,border:`1px solid ${CAT_COLORS[exp.category]}44`,borderRadius:6,padding:"4px 8px",color:CAT_COLORS[exp.category],fontSize:11,fontFamily:"inherit",cursor:"pointer",outline:"none"}}>{CATS.map(c=><option key={c}>{c}</option>)}</select>}
                  <div style={{fontSize:14,fontWeight:700,color:"#ef4444",flexShrink:0}}>−₹<EditableAmount value={exp.amount} onChange={v=>updExp(exp.id,"amount",v)} style={{fontSize:14,fontWeight:700,color:"#ef4444"}} /></div>
                  <button onClick={()=>delExp(exp.id)} style={del}>✕</button>
                </div>
              ))}
              {expenses.length>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"12px 0 0",borderTop:"1px solid rgba(255,255,255,0.07)",fontWeight:700,marginTop:8}}>
                <span style={{color:"#64748b"}}>Total</span><span style={{color:"#ef4444",fontSize:17}}>{fmt(totalExp)}</span>
              </div>}
            </div>
          </div>
        )}

        {/* ══ GOALS ══ */}
        {tab==="goals"&&(
          <div>
            <Section title="Savings Goals"
              sub={savings>0?<>Available: <span style={{color:"#10b981",fontWeight:700}}>{fmt(savings)}/mo</span></>:"Fix budget to start saving!"}
              action onAction={()=>setShowAddGoal(v=>!v)} actionLabel={showAddGoal?"✕ Cancel":"+ New Goal"} />

            <AddForm show={showAddGoal} onAdd={addGoal} onCancel={()=>setShowAddGoal(false)} fields={[
              {key:"name",label:"Goal Name",placeholder:"e.g. New Car",value:newGoal.name,onChange:v=>setNewGoal(x=>({...x,name:v})),auto:true},
              {key:"target",label:"Target (₹)",type:"number",placeholder:"500000",value:newGoal.target,onChange:v=>setNewGoal(x=>({...x,target:v}))},
              {key:"saved",label:"Saved So Far (₹)",type:"number",placeholder:"0",value:newGoal.saved,onChange:v=>setNewGoal(x=>({...x,saved:v}))},
            ]} />

            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(auto-fit,minmax(280px,1fr))",gap:14}}>
              {goals.map(g=>{
                const pct=g.target>0?Math.min(Math.round((g.saved/g.target)*100),100):0;
                const rem=Math.max(g.target-g.saved,0);
                const months=savings>0&&rem>0?Math.ceil(rem/savings):null;
                return (
                  <div key={g.id} style={{...card,position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:g.color}} />
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                      <EditableText value={g.name} onChange={v=>updGoal(g.id,"name",v)} style={{fontSize:16,fontWeight:800}} />
                      <button onClick={()=>delGoal(g.id)} style={del}>✕</button>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                      <div style={{background:"rgba(255,255,255,0.03)",borderRadius:10,padding:"10px 12px"}}>
                        <div style={lbl}>Saved</div>
                        <div style={{fontSize:18,fontWeight:800,color:g.color}}>₹<EditableAmount value={g.saved} onChange={v=>updGoal(g.id,"saved",Math.min(v,g.target))} style={{fontSize:18,fontWeight:800,color:g.color}} /></div>
                      </div>
                      <div style={{background:"rgba(255,255,255,0.03)",borderRadius:10,padding:"10px 12px"}}>
                        <div style={lbl}>Target</div>
                        <div style={{fontSize:18,fontWeight:800}}>₹<EditableAmount value={g.target} onChange={v=>updGoal(g.id,"target",v)} style={{fontSize:18,fontWeight:800}} /></div>
                      </div>
                    </div>
                    <Bar pct={pct} color={g.color} h={8} />
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,margin:"6px 0 12px"}}>
                      <span style={{color:g.color,fontWeight:700}}>{pct}% done</span>
                      <span style={{color:"#475569"}}>{months?`~${months} months left`:rem===0?"🎉 Complete!":"—"}</span>
                    </div>
                    {rem>0&&savings>0&&<button onClick={()=>updGoal(g.id,"saved",Math.min(g.saved+savings,g.target))} style={{...btn(g.color),width:"100%",fontSize:12,padding:"9px 0"}}>+ Add This Month's Savings ({fmt(savings)})</button>}
                    {rem===0&&<div style={{textAlign:"center",color:g.color,fontWeight:700}}>🎉 Goal Reached!</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ DEBTS ══ */}
        {tab==="debts"&&(
          <div>
            <Section title="Debt Tracker"
              sub={totalDebt>0?<>Total debt: <span style={{color:"#ef4444",fontWeight:700}}>{fmt(totalDebt)}</span> · EMIs: <span style={{color:"#8b5cf6",fontWeight:700}}>{fmt(totalEMI)}/mo</span></>:"No debts — incredible! 🎉"}
              action onAction={()=>setShowAddDebt(v=>!v)} actionLabel={showAddDebt?"✕ Cancel":"+ Add Debt"} />

            <AddForm show={showAddDebt} onAdd={addDebt} onCancel={()=>setShowAddDebt(false)} fields={[
              {key:"name",label:"Debt Name",placeholder:"e.g. Home Loan",value:newDebt.name,onChange:v=>setNewDebt(x=>({...x,name:v})),auto:true},
              {key:"remaining",label:"Remaining (₹)",type:"number",placeholder:"500000",value:newDebt.remaining,onChange:v=>setNewDebt(x=>({...x,remaining:v}))},
              {key:"emi",label:"Monthly EMI (₹)",type:"number",placeholder:"10000",value:newDebt.emi,onChange:v=>setNewDebt(x=>({...x,emi:v}))},
              {key:"rate",label:"Interest Rate (%)",type:"number",placeholder:"9",value:newDebt.rate,onChange:v=>setNewDebt(x=>({...x,rate:v}))},
            ]} />

            {/* Summary card */}
            {debts.length>0&&(
              <div style={{...card,marginBottom:14,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
                {[
                  {l:"Total Debt",v:fmt(totalDebt),c:"#ef4444"},
                  {l:"Monthly EMIs",v:fmt(totalEMI),c:"#8b5cf6"},
                  {l:"EMI / Income",v:`${Math.round((totalEMI/income)*100)}%`,c:(totalEMI/income)>0.4?"#ef4444":"#10b981"},
                  {l:"Debt-Free In",v:savings-totalEMI>0?`~${Math.ceil(totalDebt/(savings))} mo`:"Pay EMIs first",c:"#f59e0b"},
                ].map(s=>(
                  <div key={s.l} style={{background:"rgba(255,255,255,0.03)",borderRadius:10,padding:"10px 12px"}}>
                    <div style={lbl}>{s.l}</div>
                    <div style={{fontSize:16,fontWeight:800,color:s.c}}>{s.v}</div>
                  </div>
                ))}
              </div>
            )}

            {debts.length===0&&<div style={{...card,textAlign:"center",padding:"50px 0",color:"#334155"}}>No debts tracked. Add one above.</div>}

            {debts.map(d=>{
              const paidPct=Math.round(((d.total-d.remaining)/d.total)*100);
              const monthsLeft=d.emi>0?Math.ceil(d.remaining/d.emi):0;
              const interest=Math.round(d.remaining*(d.rate/100/12)*monthsLeft);
              return (
                <div key={d.id} style={{...card,marginBottom:12,position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:d.color}} />
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                    <div>
                      <div style={{fontSize:16,fontWeight:800}}>{d.name}</div>
                      {d.rate>0&&<div style={{fontSize:11,color:"#64748b",marginTop:2}}>{d.rate}% p.a. interest</div>}
                    </div>
                    <button onClick={()=>delDebt(d.id)} style={del}>✕</button>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:10,marginBottom:12}}>
                    {[
                      {l:"Remaining",v:fmt(d.remaining),c:d.color},
                      {l:"Monthly EMI",v:fmt(d.emi),c:"#8b5cf6"},
                      {l:"Months Left",v:monthsLeft,c:"#f59e0b"},
                      ...(d.rate>0?[{l:"Est. Interest",v:fmt(interest),c:"#94a3b8"}]:[]),
                    ].map(s=>(
                      <div key={s.l} style={{background:"rgba(255,255,255,0.03)",borderRadius:10,padding:"8px 10px"}}>
                        <div style={lbl}>{s.l}</div>
                        <div style={{fontSize:14,fontWeight:700,color:s.c}}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:11,color:"#64748b",marginBottom:6}}>{paidPct}% paid off</div>
                  <Bar pct={paidPct} color={d.color} h={8} />
                  {/* Extra EMI impact */}
                  {savings-totalEMI>0&&(
                    <div style={{marginTop:12,padding:"10px 12px",background:"rgba(16,185,129,0.06)",borderRadius:8,border:"1px solid rgba(16,185,129,0.15)",fontSize:12,color:"#64748b"}}>
                      💡 Paying {fmt(Math.round((savings-totalEMI)*0.5))} extra/month cuts this loan by ~{Math.round(monthsLeft*0.3)} months
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══ AI ADVISOR ══ */}
        {tab==="advisor"&&(
          <div style={{display:"flex",flexDirection:"column",height:mob?"calc(100vh - 160px)":"calc(100vh - 130px)",minHeight:400}}>
            <div style={{marginBottom:12}}>
              <h2 style={{fontSize:mob?18:22,margin:0}}>AI Financial Advisor</h2>
              <p style={{color:"#475569",fontSize:12,marginTop:4}}>Powered by Claude · Sees your full financial picture</p>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
              {["How to save more?","Am I overspending?","Pay off debt faster?","Where to invest?","My health score?"].map(q=>(
                <button key={q} onClick={()=>setChatInput(q)} style={{background:"rgba(16,185,129,0.07)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:20,padding:"5px 12px",color:"#10b981",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{q}</button>
              ))}
            </div>
            <div ref={chatRef} style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:12,padding:14,background:"rgba(255,255,255,0.02)",borderRadius:14,border:"1px solid rgba(255,255,255,0.06)",marginBottom:10}}>
              {msgs.map((m,i)=>(
                <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                  <div style={{maxWidth:mob?"88%":"72%",padding:"11px 14px",borderRadius:14,fontSize:14,lineHeight:1.65,background:m.role==="user"?"linear-gradient(135deg,#10b981,#059669)":"rgba(255,255,255,0.05)",color:m.role==="user"?"#fff":"#e8e4d9",borderBottomRightRadius:m.role==="user"?4:14,borderBottomLeftRadius:m.role==="assistant"?4:14}}>
                    {m.role==="assistant"&&<div style={{fontSize:10,color:"#475569",marginBottom:4}}>🤖 AI ADVISOR</div>}
                    {m.content}
                  </div>
                </div>
              ))}
              {aiLoading&&<div style={{display:"flex",justifyContent:"flex-start"}}><div style={{background:"rgba(255,255,255,0.05)",padding:"11px 14px",borderRadius:14,color:"#475569",fontSize:14}}>Thinking…</div></div>}
            </div>
            <div style={{display:"flex",gap:8}}>
              <input style={{...inp,flex:1,fontSize:14}} placeholder="Ask anything…" value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMsg()} />
              <button onClick={sendMsg} disabled={aiLoading} style={{...btn(),opacity:aiLoading?0.5:1,padding:"10px 18px"}}>Send</button>
            </div>
          </div>
        )}

      </div>

      {/* ── Mobile Bottom Nav ── */}
      {mob&&(
        <div style={{position:"fixed",bottom:0,left:0,right:0,background:"rgba(8,14,26,0.97)",borderTop:"1px solid rgba(255,255,255,0.08)",display:"flex",zIndex:200,paddingBottom:"env(safe-area-inset-bottom,0)"}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"12px 0",border:"none",background:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,color:tab===t.id?"#10b981":"#475569",fontFamily:"inherit"}}>
              <span style={{fontSize:20}}>{t.l}</span>
              <span style={{fontSize:9,fontWeight:600,letterSpacing:0.3}}>{t.id==="overview"?"HOME":t.id==="budget"?"BUDGET":t.id==="goals"?"GOALS":t.id==="debts"?"DEBTS":"AI CHAT"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("landing");
  return screen==="landing"?<Landing onEnter={()=>setScreen("app")}/>:<Dashboard/>;
}
