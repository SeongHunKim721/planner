import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const _now = new Date();
const TODAY = { year: _now.getFullYear(), month: _now.getMonth() + 1, day: _now.getDate() };
const TODAY_STR = `${TODAY.year}-${TODAY.month}-${TODAY.day}`;
const EV_COLORS = ["#f59e0b","#818cf8","#fb7185","#34d399","#60a5fa"];
const MONTH_LABELS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const DAY_LABELS = ["일","월","화","수","목","금","토"];
const CATS = ["일","운동","공부","기타"];
const CAT_COLOR = { "일":"#f59e0b","운동":"#34d399","공부":"#818cf8","기타":"#fb7185" };
const CAT_LIGHT = { "일":"#fef3c7","운동":"#dcfce7","공부":"#ede9fe","기타":"#fce7f3" };
const CAT_TEXT  = { "일":"#78350f","운동":"#14532d","공부":"#3b0764","기타":"#831843" };
const NAV = [["calendar","▦"],["goals","◎"],["analytics","▲"]];

const BASE_RATES = {};

const DEFAULT_TODOS = [];

const DEFAULT_EVENTS = {};

const SAMPLE_CAT = {
  "일":   [],
  "운동": [],
  "공부": [],
  "기타": [],
};

const DEFAULT_MONTHLY_GOALS = {
  "일": [],
  "운동": [],
  "공부": [],
  "기타": []
};

const DEFAULT_YEARLY_GOALS = [];

function calcCatRates(todos) {
  const r = {};
  CATS.forEach(c => {
    const items = todos.filter(t => t.category === c);
    r[c] = items.length ? Math.round(items.filter(t => t.done).length / items.length * 100) : null;
  });
  return r;
}

function getMonthlyOverall(todos) {
  const cr = calcCatRates(todos);
  const validCur = CATS.map(c => cr[c]).filter(v => v !== null);
  const curR = validCur.length ? Math.round(validCur.reduce((a, b) => a + b, 0) / validCur.length) : null;
  const months = Array.from({ length: TODAY.month }, (_, i) => `${i + 1}월`);
  return months.map((m, i) => {
    if (i < TODAY.month - 1) {
      const vals = CATS.map(c => SAMPLE_CAT[c][i]).filter(v => typeof v === 'number');
      return { month: m, rate: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null };
    }
    return { month: m, rate: curR };
  });
}

function getMonthlyForCat(cat, todos) {
  const items = todos.filter(t => t.category === cat);
  const curR = items.length ? Math.round(items.filter(t => t.done).length / items.length * 100) : null;
  const months = Array.from({ length: TODAY.month }, (_, i) => `${i + 1}월`);
  return months.map((m, i) => ({
    month: m, rate: i < TODAY.month - 1 ? (typeof SAMPLE_CAT[cat][i] === 'number' ? SAMPLE_CAT[cat][i] : null) : curR
  }));
}

function SimpleTooltip({ active, payload }) {
  if (!active || !payload || !payload.length || payload[0].value === null) return null;
  return (
    <div style={{background:"#1c1c1e",borderRadius:8,padding:"6px 10px",fontSize:11}}>
      <p style={{margin:0,color:"#888"}}>{payload[0].payload.month}</p>
      <p style={{margin:"2px 0 0",fontWeight:700,color:"white"}}>{payload[0].value}%</p>
    </div>
  );
}

function DailyTooltip({ active, payload }) {
  if (!active || !payload || !payload.length || payload[0].value === null) return null;
  const isToday = payload[0].payload.day === TODAY.day;
  return (
    <div style={{background:"#1c1c1e",borderRadius:9,padding:"8px 12px",fontSize:11}}>
      <p style={{margin:0,color:"#888"}}>{TODAY.month}월 {payload[0].payload.day}일{isToday ? " · 오늘" : ""}</p>
      <p style={{margin:"3px 0 0",fontWeight:700,color:isToday?"#f59e0b":"white",fontSize:13}}>{payload[0].value}%</p>
    </div>
  );
}

function DailyDot(props) {
  const { cx, cy, payload } = props;
  if (!payload || payload.rate === null) return null;
  if (payload.day === TODAY.day)
    return <circle cx={cx} cy={cy} r={5} fill="#f59e0b" stroke="white" strokeWidth={2.5} />;
  return <circle cx={cx} cy={cy} r={2.5} fill="#f59e0b" fillOpacity={0.7} />;
}

function EventModal({ modal, events, onClose, onAdd, onDelete, onSave }) {
  const mk = modal.year + "-" + modal.month + "-" + modal.day;
  const modalEvts = events[mk] || [];
  const [editingId, setEditingId] = useState(null);
  const [editEvt, setEditEvt] = useState({ time: "", title: "" });
  const [newEvt, setNewEvt] = useState({ time: "", title: "" });

  function handleSave() {
    if (!editEvt.title.trim()) return;
    onSave(mk, editingId, editEvt);
    setEditingId(null);
  }
  function handleAdd() {
    if (!newEvt.title.trim()) return;
    onAdd(mk, newEvt);
    setNewEvt({ time: "", title: "" });
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{position:"fixed",inset:0,background:"rgba(28,20,10,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
      <div style={{background:"white",borderRadius:22,padding:"24px",width:320,boxShadow:"0 24px 64px rgba(0,0,0,0.18)",maxHeight:"80vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
          <div>
            <p style={{margin:"0 0 2px",fontSize:10,color:"#b0a89a",letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:600}}>일정</p>
            <h3 style={{margin:0,fontSize:17,fontWeight:700,letterSpacing:"-0.4px"}}>{modal.year}년 {modal.month}월 {modal.day}일</h3>
          </div>
          <button onClick={onClose} style={{border:"none",background:"#f5f2ee",borderRadius:9,width:30,height:30,cursor:"pointer",fontSize:15,color:"#999",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>

        {modalEvts.length > 0 && (
          <div style={{marginBottom:18}}>
            <p style={{margin:"0 0 10px",fontSize:11,color:"#b0a89a",fontWeight:600}}>등록된 일정 {modalEvts.length}개</p>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {modalEvts.map((ev, idx) => {
                const c = EV_COLORS[idx % EV_COLORS.length];
                const isEditing = editingId === ev.id;
                return (
                  <div key={ev.id} style={{borderRadius:12,border:"1.5px solid "+(isEditing?"#1c1c1e":"#f0ece6"),overflow:"hidden"}}>
                    {isEditing ? (
                      <div style={{padding:"11px 12px",background:"#faf8f5"}}>
                        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
                          <input type="time" value={editEvt.time} onChange={e => setEditEvt(p => ({...p,time:e.target.value}))}
                            style={{border:"1px solid #ede9e3",borderRadius:9,padding:"8px 11px",fontSize:12,outline:"none",background:"white",color:"#333"}}/>
                          <input value={editEvt.title} onChange={e => setEditEvt(p => ({...p,title:e.target.value}))}
                            onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
                            style={{border:"1px solid #ede9e3",borderRadius:9,padding:"8px 11px",fontSize:12,outline:"none",background:"white",color:"#333"}}/>
                        </div>
                        <div style={{display:"flex",gap:7}}>
                          <button onClick={() => setEditingId(null)} style={{flex:1,padding:"8px",border:"1px solid #ede9e3",borderRadius:9,cursor:"pointer",background:"transparent",fontSize:11,color:"#999"}}>취소</button>
                          <button onClick={handleSave} style={{flex:1,padding:"8px",border:"none",borderRadius:9,cursor:"pointer",background:"#1c1c1e",color:"white",fontSize:11,fontWeight:700}}>저장</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{display:"flex",alignItems:"center",padding:"10px 12px",background:c+"10"}}>
                        <div style={{width:7,height:7,borderRadius:"50%",background:c,flexShrink:0,marginRight:10}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:10,color:"#b0a89a",fontWeight:600}}>{ev.time || "시간 미정"}</div>
                          <div style={{fontSize:12,fontWeight:600,color:"#222",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.title}</div>
                        </div>
                        <div style={{display:"flex",gap:5,flexShrink:0,marginLeft:8}}>
                          <button onClick={() => { setEditingId(ev.id); setEditEvt({time:ev.time,title:ev.title}); }}
                            style={{width:28,height:28,border:"1px solid #ede9e3",borderRadius:8,cursor:"pointer",background:"white",fontSize:13,color:"#888",display:"flex",alignItems:"center",justifyContent:"center"}}>✎</button>
                          <button onClick={() => onDelete(mk, ev.id)}
                            style={{width:28,height:28,border:"1px solid #fde8e8",borderRadius:8,cursor:"pointer",background:"#fff5f5",fontSize:13,color:"#fb7185",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {modalEvts.length > 0 && <div style={{height:1,background:"#f0ece6",marginBottom:18}}/>}
        <p style={{margin:"0 0 10px",fontSize:11,color:"#b0a89a",fontWeight:600}}>새 일정 추가</p>
        <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:14}}>
          <input type="time" value={newEvt.time} onChange={e => setNewEvt(p => ({...p,time:e.target.value}))}
            style={{border:"1px solid #ede9e3",borderRadius:11,padding:"10px 13px",fontSize:12,outline:"none",background:"#faf8f5",color:"#333"}}/>
          <input value={newEvt.title} onChange={e => setNewEvt(p => ({...p,title:e.target.value}))}
            placeholder="일정 제목을 입력하세요" onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
            style={{border:"1px solid #ede9e3",borderRadius:11,padding:"10px 13px",fontSize:12,outline:"none",background:"#faf8f5",color:"#333"}}/>
        </div>
        <button onClick={handleAdd} style={{width:"100%",padding:"12px",border:"none",borderRadius:12,cursor:"pointer",background:"#1c1c1e",color:"white",fontSize:13,fontWeight:700}}>+ 일정 추가</button>
      </div>
    </div>
  );
function GoalModal({ category, goals, onClose, onAdd, onEdit, onDelete, color }) {
  const [newGoal, setNewGoal] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editGoal, setEditGoal] = useState("");

  function handleAdd() {
    if (!newGoal.trim()) return;
    onAdd(category, newGoal.trim());
    setNewGoal("");
  }

  function handleSave() {
    if (!editGoal.trim()) return;
    onEdit(category, editingId, editGoal.trim());
    setEditingId(null);
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{position:"fixed",inset:0,background:"rgba(28,20,10,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
      <div style={{background:"white",borderRadius:22,padding:"24px",width:320,boxShadow:"0 24px 64px rgba(0,0,0,0.18)",maxHeight:"80vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {color && <div style={{width:10,height:10,borderRadius:"50%",background:color}}/>}
            <h3 style={{margin:0,fontSize:17,fontWeight:700,letterSpacing:"-0.4px"}}>{category}</h3>
          </div>
          <button onClick={onClose} style={{border:"none",background:"#f5f2ee",borderRadius:9,width:30,height:30,cursor:"pointer",fontSize:15,color:"#999",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>

        {goals.length > 0 && (
          <div style={{marginBottom:18}}>
            <p style={{margin:"0 0 10px",fontSize:11,color:"#b0a89a",fontWeight:600}}>등록된 목표 {goals.length}개</p>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {goals.map((g) => {
                const isEditing = editingId === g.id;
                return (
                  <div key={g.id} style={{borderRadius:12,border:"1.5px solid "+(isEditing?"#1c1c1e":"#f0ece6"),overflow:"hidden"}}>
                    {isEditing ? (
                      <div style={{padding:"11px 12px",background:"#faf8f5"}}>
                        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
                          <input value={editGoal} onChange={e => setEditGoal(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
                            style={{border:"1px solid #ede9e3",borderRadius:9,padding:"8px 11px",fontSize:12,outline:"none",background:"white",color:"#333"}}/>
                        </div>
                        <div style={{display:"flex",gap:7}}>
                          <button onClick={() => setEditingId(null)} style={{flex:1,padding:"8px",border:"1px solid #ede9e3",borderRadius:9,cursor:"pointer",background:"transparent",fontSize:11,color:"#999"}}>취소</button>
                          <button onClick={handleSave} style={{flex:1,padding:"8px",border:"none",borderRadius:9,cursor:"pointer",background:"#1c1c1e",color:"white",fontSize:11,fontWeight:700}}>저장</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{display:"flex",alignItems:"center",padding:"10px 12px",background:"#faf8f5"}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:500,color:g.done?"#c5bdb3":"#333",textDecoration:g.done?"line-through":"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.text}</div>
                        </div>
                        <div style={{display:"flex",gap:5,flexShrink:0,marginLeft:8}}>
                          <button onClick={() => { setEditingId(g.id); setEditGoal(g.text); }}
                            style={{width:28,height:28,border:"1px solid #ede9e3",borderRadius:8,cursor:"pointer",background:"white",fontSize:13,color:"#888",display:"flex",alignItems:"center",justifyContent:"center"}}>✎</button>
                          <button onClick={() => onDelete(category, g.id)}
                            style={{width:28,height:28,border:"1px solid #fde8e8",borderRadius:8,cursor:"pointer",background:"#fff5f5",fontSize:13,color:"#fb7185",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {goals.length > 0 && <div style={{height:1,background:"#f0ece6",marginBottom:18}}/>}
        <p style={{margin:"0 0 10px",fontSize:11,color:"#b0a89a",fontWeight:600}}>새 목표 추가</p>
        <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:14}}>
          <input value={newGoal} onChange={e => setNewGoal(e.target.value)}
            placeholder="목표 내용을 입력하세요" onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
            style={{border:"1px solid #ede9e3",borderRadius:11,padding:"10px 13px",fontSize:12,outline:"none",background:"#faf8f5",color:"#333"}}/>
        </div>
        <button onClick={handleAdd} style={{width:"100%",padding:"12px",border:"none",borderRadius:12,cursor:"pointer",background:"#1c1c1e",color:"white",fontSize:13,fontWeight:700}}>+ 목표 추가</button>
      </div>
    </div>
  );
}

export default function WorkTime() {
  const [nav, setNav] = useState("calendar");
  const [curMonth, setCurMonth] = useState({ year: 2026, month: 5 });
  const [todos, setTodos] = useState(DEFAULT_TODOS);
  const [dailyRates, setDailyRates] = useState(BASE_RATES);
  const [events, setEvents] = useState(DEFAULT_EVENTS);
  const [modal, setModal] = useState(null);
  const [newTodo, setNewTodo] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [monthlyGoals, setMonthlyGoals] = useState(DEFAULT_MONTHLY_GOALS);
  const [yearlyGoals, setYearlyGoals] = useState(DEFAULT_YEARLY_GOALS);
  const [goalsTab, setGoalsTab] = useState("전체");
  const [goalModal, setGoalModal] = useState(null);

  const handleAddGoal = (category, text) => {
    if (category === `${TODAY.year}년 목표`) {
      setYearlyGoals(p => [...p, {id: Date.now(), text, done: false}]);
    } else {
      setMonthlyGoals(p => ({...p, [category]: [...p[category], {id: Date.now(), text, done: false}]}));
    }
  };

  const handleEditGoal = (category, id, newText) => {
    if (category === `${TODAY.year}년 목표`) {
      setYearlyGoals(p => p.map(g => g.id === id ? {...g, text: newText} : g));
    } else {
      setMonthlyGoals(p => ({...p, [category]: p[category].map(g => g.id === id ? {...g, text: newText} : g)}));
    }
  };

  const handleDeleteGoal = (category, id) => {
    if (category === `${TODAY.year}년 목표`) {
      setYearlyGoals(p => p.filter(g => g.id !== id));
    } else {
      setMonthlyGoals(p => ({...p, [category]: p[category].filter(g => g.id !== id)}));
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const [dateRes, todosRes, ratesRes] = await Promise.allSettled([
          window.storage.get("wt_date"),
          window.storage.get("wt_todos"),
          window.storage.get("wt_rates"),
        ]);
        let merged = { ...BASE_RATES };
        if (ratesRes.status === "fulfilled" && ratesRes.value) {
          const storedRates = JSON.parse(ratesRes.value.value);
          Object.keys(storedRates).forEach(k => {
            const [y, m, d] = k.split('-').map(Number);
            if (y < 2026 || (y === 2026 && m < 5) || (y === 2026 && m === 5 && d < 19)) {
              delete storedRates[k];
            }
          });
          merged = { ...merged, ...storedRates };
        }
        const storedDate = dateRes.status === "fulfilled" && dateRes.value ? dateRes.value.value : null;
        const storedTodos = todosRes.status === "fulfilled" && todosRes.value ? JSON.parse(todosRes.value.value) : null;
        if (storedDate && storedDate !== TODAY_STR) {
          const prevTodos = storedTodos || [];
          const prevRate = prevTodos.length ? Math.round(prevTodos.filter(t => t.done).length / prevTodos.length * 100) : 0;
          merged[storedDate] = prevRate;
          await window.storage.set("wt_rates", JSON.stringify(merged));
          await window.storage.set("wt_todos", JSON.stringify(DEFAULT_TODOS));
          await window.storage.set("wt_date", TODAY_STR);
          setTodos(DEFAULT_TODOS);
        } else {
          if (storedTodos) setTodos(storedTodos);
          if (!storedDate) await window.storage.set("wt_date", TODAY_STR);
        }
        setDailyRates(merged);
      } catch { try { await window.storage.set("wt_date", TODAY_STR); } catch {} }
      setLoaded(true);
    };
    init();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (window.storage && window.storage.set) {
      window.storage.set("wt_todos", JSON.stringify(todos)).catch(() => {});
    }
  }, [todos, loaded]);

  const doneCount = todos.filter(t => t.done).length;
  const todoRate = todos.length ? Math.round((doneCount / todos.length) * 100) : 0;

  const chartData = Array.from({ length: 31 }, (_, i) => {
    const day = i + 1, key = `${TODAY.year}-${TODAY.month}-${day}`;
    if (day < TODAY.day) return { day, rate: dailyRates[key] ?? null };
    if (day === TODAY.day) return { day, rate: todoRate };
    return { day, rate: null };
  });

  const validRates = chartData.filter(d => d.rate !== null);
  const avgRate = validRates.length ? Math.round(validRates.reduce((a, b) => a + b.rate, 0) / validRates.length) : 0;

  const daysInMonth = (y, m) => new Date(y, m, 0).getDate();
  const firstDay = (y, m) => new Date(y, m - 1, 1).getDay();
  const grid = [];
  for (let i = 0; i < firstDay(curMonth.year, curMonth.month); i++) grid.push(null);
  for (let i = 1; i <= daysInMonth(curMonth.year, curMonth.month); i++) grid.push(i);

  const eKey = (y, m, d) => y + "-" + m + "-" + d;
  const todayEvts = events[eKey(TODAY.year, TODAY.month, TODAY.day)] || [];

  function handleAddEvent(mk, ev) { setEvents(p => ({ ...p, [mk]: [...(p[mk]||[]), {id:Date.now(),...ev}] })); }
  function handleDeleteEvent(mk, id) {
    setEvents(p => {
      const updated = (p[mk]||[]).filter(e => e.id !== id);
      if (!updated.length) { const c = {...p}; delete c[mk]; return c; }
      return { ...p, [mk]: updated };
    });
  }
  function handleSaveEvent(mk, id, data) { setEvents(p => ({ ...p, [mk]: (p[mk]||[]).map(e => e.id===id?{...e,...data}:e) })); }
  function addTodo() {
    if (!newTodo.trim()) return;
    setTodos(p => [...p, { id: Date.now(), text: newTodo.trim(), done: false, category: "기타" }]);
    setNewTodo("");
  }
  function toggleCat(id) {
    setTodos(p => p.map(t => {
      if (t.id !== id) return t;
      return { ...t, category: CATS[(CATS.indexOf(t.category) + 1) % CATS.length] };
    }));
  }

  const C16 = 2 * Math.PI * 16;
  const catRates = calcCatRates(todos);
  const monthlyOverall = getMonthlyOverall(todos);
  const overall2026 = (() => {
    const v = monthlyOverall.filter(m => m.rate !== null);
    return v.length ? Math.round(v.reduce((a, b) => a + b.rate, 0) / v.length) : 0;
  })();

  const Sidebar = () => (
    <div style={{width:72,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px 0",flexShrink:0}}>
      <div style={{background:"#1c1c1e",borderRadius:22,padding:"18px 12px",display:"flex",flexDirection:"column",alignItems:"center",gap:6,boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}>
        <div style={{marginBottom:10,textAlign:"center",lineHeight:1.15}}>
          <span style={{fontSize:9,fontWeight:800,color:"white",display:"block",letterSpacing:"-0.3px"}}>work</span>
          <span style={{fontSize:9,fontWeight:800,color:"#f59e0b",display:"block",letterSpacing:"-0.3px"}}>time</span>
        </div>
        {NAV.map(([id, icon]) => (
          <button key={id} onClick={() => setNav(id)} style={{
            width:40,height:40,borderRadius:13,border:"none",cursor:"pointer",
            background:nav===id?"#f59e0b":"rgba(255,255,255,0.07)",
            color:nav===id?"#fff":"rgba(255,255,255,0.4)",
            fontSize:17,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"
          }}>{icon}</button>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{display:"flex",height:"100vh",background:"#e8e4db",fontFamily:"'SF Pro Display','Helvetica Neue',Arial,sans-serif",fontSize:13,color:"#1a1a1a"}}>
      <Sidebar />

      {/* ── CALENDAR ── */}
      {nav === "calendar" && (
        <main style={{flex:1,overflow:"auto",padding:"24px 22px 24px 10px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
            <div>
              <p style={{margin:"0 0 2px",fontSize:10,color:"#b0a89a",letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:600}}>캘린더</p>
              <h1 style={{margin:0,fontSize:22,fontWeight:700,letterSpacing:"-0.5px"}}>{curMonth.year}년 {curMonth.month}월</h1>
            </div>
            <div style={{display:"flex",gap:8}}>
              <div style={{background:"white",borderRadius:12,padding:"8px 16px",fontSize:12,color:"#666",fontWeight:500,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>월평균 <strong style={{color:"#1a1a1a"}}>{avgRate}%</strong></div>
              <div style={{background:"#1c1c1e",borderRadius:12,padding:"8px 16px",fontSize:12,color:"white",fontWeight:600}}>오늘 · {TODAY.month}/{TODAY.day}</div>
            </div>
          </div>

          <div style={{background:"white",borderRadius:18,padding:"20px 22px 14px",marginBottom:16,boxShadow:"0 2px 8px rgba(0,0,0,0.07)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
              <div>
                <p style={{margin:0,fontWeight:600,fontSize:13}}>일별 계획 달성률</p>
                <p style={{margin:"3px 0 0",fontSize:11,color:"#c0b8ad"}}>오늘 할 일 체크 현황이 실시간으로 반영돼요</p>
              </div>
              <div style={{display:"flex",gap:7}}>
                <span style={{background:"#fef3c7",borderRadius:8,padding:"4px 11px",fontSize:11,color:"#92400e",fontWeight:600}}>평균 {avgRate}%</span>
                <span style={{background:"#f59e0b",borderRadius:8,padding:"4px 11px",fontSize:11,color:"white",fontWeight:700}}>오늘 {todoRate}%</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={128}>
              <LineChart data={chartData} margin={{top:6,right:8,left:-26,bottom:0}}>
                <CartesianGrid strokeDasharray="4 4" stroke="#f5f3ee" vertical={false}/>
                <XAxis dataKey="day" tick={{fontSize:10,fill:"#c8c0b5"}} axisLine={false} tickLine={false}/>
                <YAxis domain={[50,100]} tick={{fontSize:10,fill:"#c8c0b5"}} tickFormatter={v=>v+"%"} axisLine={false} tickLine={false}/>
                <Tooltip content={<DailyTooltip/>}/>
                <ReferenceLine x={TODAY.day} stroke="#e8e4db" strokeWidth={2} strokeDasharray="4 3"/>
                <Line type="monotone" dataKey="rate" stroke="#f59e0b" strokeWidth={2.5} dot={<DailyDot/>} connectNulls={false}/>
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 258px",gap:14,alignItems:"start"}}>
            <div style={{background:"white",borderRadius:18,padding:"18px 16px",boxShadow:"0 2px 8px rgba(0,0,0,0.07)"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                <button onClick={()=>setCurMonth(p=>{const m=p.month-1;return m<1?{year:p.year-1,month:12}:{...p,month:m};})}
                  style={{width:30,height:30,border:"1px solid #ede9e3",background:"#faf8f5",cursor:"pointer",color:"#999",fontSize:15,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
                <span style={{fontWeight:700,fontSize:14}}>{curMonth.year}년 {MONTH_LABELS[curMonth.month-1]}</span>
                <button onClick={()=>setCurMonth(p=>{const m=p.month+1;return m>12?{year:p.year+1,month:1}:{...p,month:m};})}
                  style={{width:30,height:30,border:"1px solid #ede9e3",background:"#faf8f5",cursor:"pointer",color:"#999",fontSize:15,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:4}}>
                {DAY_LABELS.map(d=><div key={d} style={{textAlign:"center",fontSize:10,fontWeight:600,color:"#cdc5bb",padding:"2px 0"}}>{d}</div>)}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
                {grid.map((day, i) => {
                  const isToday = day===TODAY.day&&curMonth.month===TODAY.month&&curMonth.year===TODAY.year;
                  const k = day ? eKey(curMonth.year,curMonth.month,day) : null;
                  const evs = k ? (events[k]||[]) : [];
                  const sr = k ? dailyRates[k] : undefined;
                  const hasRate = sr!==undefined&&!isToday&&day&&day<TODAY.day&&curMonth.month===TODAY.month;
                  const rc = sr>=90?"#34d399":sr>=70?"#f59e0b":"#fb7185";
                  return (
                    <div key={i} onClick={()=>{if(day)setModal({year:curMonth.year,month:curMonth.month,day});}}
                      style={{minHeight:60,padding:"5px 4px",borderRadius:11,cursor:day?"pointer":"default",background:isToday?"#1c1c1e":"transparent",position:"relative",transition:"background 0.12s"}}
                      onMouseEnter={e=>{if(day&&!isToday)e.currentTarget.style.background="#faf7f2";}}
                      onMouseLeave={e=>{if(day&&!isToday)e.currentTarget.style.background="transparent";}}>
                      {day && <>
                        <div style={{textAlign:"center",fontSize:12,fontWeight:isToday?700:400,color:isToday?"white":i%7===0?"#fb7185":i%7===6?"#818cf8":"#374151",marginBottom:2}}>{day}</div>
                        {evs.slice(0,2).map((ev,ei)=>(
                          <div key={ev.id} style={{fontSize:9,borderRadius:4,padding:"1px 3px",marginTop:2,background:isToday?"rgba(255,255,255,0.13)":EV_COLORS[ei%EV_COLORS.length]+"20",color:isToday?"rgba(255,255,255,0.85)":EV_COLORS[ei%EV_COLORS.length],overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:500}}>{ev.title}</div>
                        ))}
                        {hasRate && <div style={{position:"absolute",bottom:5,left:4,right:4,height:2.5,background:"#f0ede8",borderRadius:2}}><div style={{height:"100%",width:sr+"%",background:rc,borderRadius:2}}/></div>}
                      </>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{background:"white",borderRadius:18,padding:"16px",boxShadow:"0 2px 8px rgba(0,0,0,0.07)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <span style={{fontWeight:700,fontSize:13}}>오늘 일정</span>
                  <span style={{fontSize:10,color:"#b0a89a",background:"#f5f2ee",borderRadius:7,padding:"3px 9px",fontWeight:500}}>{["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][TODAY.month-1]} {TODAY.day}</span>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:7}}>
                  {todayEvts.map((ev,idx)=>{
                    const c=EV_COLORS[idx%EV_COLORS.length];
                    return (
                      <div key={ev.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 11px",borderRadius:11,background:c+"14"}}>
                        <div style={{width:7,height:7,borderRadius:"50%",background:c,flexShrink:0}}/>
                        <div>
                          <div style={{fontSize:10,color:"#b0a89a",fontWeight:600}}>{ev.time}</div>
                          <div style={{fontSize:12,fontWeight:600,color:"#222",marginTop:1}}>{ev.title}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{background:"white",borderRadius:18,padding:"16px",boxShadow:"0 2px 8px rgba(0,0,0,0.07)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                  <div>
                    <span style={{fontWeight:700,fontSize:13}}>오늘 할 일</span>
                    <span style={{fontSize:10,color:"#b0a89a",marginLeft:8}}>{doneCount}/{todos.length} 완료</span>
                  </div>
                  <div style={{position:"relative",width:42,height:42}}>
                    <svg width="42" height="42" style={{transform:"rotate(-90deg)"}}>
                      <circle cx="21" cy="21" r="16" fill="none" stroke="#f0ede8" strokeWidth="3"/>
                      <circle cx="21" cy="21" r="16" fill="none" stroke="#f59e0b" strokeWidth="3"
                        strokeDasharray={C16} strokeDashoffset={C16-(todoRate/100)*C16}
                        strokeLinecap="round" style={{transition:"stroke-dashoffset 0.45s"}}/>
                    </svg>
                    <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800}}>{todoRate}%</div>
                  </div>
                </div>
                <div style={{height:3,background:"#f5f2ee",borderRadius:2,marginBottom:13}}>
                  <div style={{height:"100%",width:todoRate+"%",background:"#f59e0b",borderRadius:2,transition:"width 0.45s"}}/>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:2,marginBottom:11}}>
                  {todos.map(t => (
                    <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 4px",borderRadius:9,transition:"background 0.1s"}}
                      onMouseEnter={e=>e.currentTarget.style.background="#faf7f2"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div onClick={()=>setTodos(p=>p.map(x=>x.id===t.id?{...x,done:!x.done}:x))}
                        style={{width:16,height:16,borderRadius:5,flexShrink:0,border:"2px solid "+(t.done?"#f59e0b":"#ddd8d0"),background:t.done?"#f59e0b":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all 0.18s"}}>
                        {t.done && <span style={{color:"white",fontSize:9,lineHeight:1,fontWeight:800}}>✓</span>}
                      </div>
                      <span onClick={()=>setTodos(p=>p.map(x=>x.id===t.id?{...x,done:!x.done}:x))}
                        style={{fontSize:12,color:t.done?"#c5bdb3":"#333",textDecoration:t.done?"line-through":"none",flex:1,cursor:"pointer"}}>{t.text}</span>
                      <button onClick={()=>toggleCat(t.id)}
                        title="클릭해서 카테고리 변경"
                        style={{fontSize:9,padding:"2px 7px",borderRadius:6,border:"none",cursor:"pointer",fontWeight:700,background:CAT_LIGHT[t.category],color:CAT_TEXT[t.category],flexShrink:0,letterSpacing:"0.01em"}}>
                        {t.category}
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:7}}>
                  <input value={newTodo} onChange={e=>setNewTodo(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter")addTodo();}}
                    placeholder="할 일 추가"
                    style={{flex:1,border:"1px solid #ede9e3",borderRadius:9,padding:"7px 10px",fontSize:11,outline:"none",color:"#333",background:"#faf8f5"}}/>
                  <button onClick={addTodo} style={{background:"#1c1c1e",color:"white",border:"none",borderRadius:9,padding:"7px 12px",cursor:"pointer",fontSize:15,lineHeight:1}}>+</button>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ── ANALYTICS ── */}
      {nav === "analytics" && (
        <main style={{flex:1,overflow:"auto",padding:"24px 22px 24px 10px",display:"flex",flexDirection:"column"}}>
          <div style={{marginBottom:20}}>
            <p style={{margin:"0 0 2px",fontSize:10,color:"#b0a89a",letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:600}}>애널리틱스</p>
            <h1 style={{margin:0,fontSize:22,fontWeight:700,letterSpacing:"-0.5px"}}>{TODAY.year} 달성률 분석</h1>
          </div>

          {/* Top metric cards */}
          <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr 1fr 1fr 1fr",gap:10,marginBottom:16}}>
            <div style={{background:"#1c1c1e",borderRadius:16,padding:"14px 16px"}}>
              <p style={{margin:"0 0 8px",fontSize:10,color:"rgba(255,255,255,0.45)",fontWeight:600,letterSpacing:"0.05em",textTransform:"uppercase"}}>{TODAY.year} 전체</p>
              <p style={{margin:0,fontSize:28,fontWeight:800,color:"#f59e0b",letterSpacing:"-0.5px"}}>{overall2026}%</p>
              <p style={{margin:"4px 0 0",fontSize:10,color:"rgba(255,255,255,0.35)"}}>전체 달성률</p>
            </div>
            {CATS.map(cat => {
              const rate = catRates[cat];
              return (
                <div key={cat} style={{background:"white",borderRadius:16,padding:"14px 16px",boxShadow:"0 2px 8px rgba(0,0,0,0.07)"}}>
                  <p style={{margin:"0 0 8px",fontSize:10,color:"#b0a89a",fontWeight:600,letterSpacing:"0.05em",textTransform:"uppercase"}}>{TODAY.month}월 {cat}</p>
                  <p style={{margin:0,fontSize:26,fontWeight:800,color:CAT_COLOR[cat],letterSpacing:"-0.5px"}}>{rate!==null?rate+"%":"—"}</p>
                  <div style={{marginTop:8,height:3,background:"#f5f2ee",borderRadius:2}}>
                    <div style={{height:"100%",width:(rate||0)+"%",background:CAT_COLOR[cat],borderRadius:2,transition:"width 0.4s"}}/>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main grid */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,flex:1,minHeight:0}}>
            {/* Monthly overall chart */}
            <div style={{background:"white",borderRadius:18,padding:"20px 22px",boxShadow:"0 2px 8px rgba(0,0,0,0.07)",display:"flex",flexDirection:"column"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                <div>
                  <p style={{margin:0,fontWeight:700,fontSize:13}}>매월 달성률</p>
                  <p style={{margin:"3px 0 0",fontSize:11,color:"#c0b8ad"}}>{TODAY.year}년 1월 — {TODAY.month}월 · 전체 카테고리 평균</p>
                </div>
                <span style={{background:"#fef3c7",borderRadius:8,padding:"4px 11px",fontSize:11,color:"#92400e",fontWeight:600}}>
                  {TODAY.month}월 {(monthlyOverall.find(m=>m.month===`${TODAY.month}월`)||{}).rate||0}%
                </span>
              </div>
              <div style={{flex:1,minHeight:0}}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyOverall} margin={{top:6,right:8,left:-26,bottom:0}}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#f5f3ee" vertical={false}/>
                  <XAxis dataKey="month" tick={{fontSize:11,fill:"#c8c0b5"}} axisLine={false} tickLine={false}/>
                  <YAxis domain={[0,100]} tick={{fontSize:10,fill:"#c8c0b5"}} tickFormatter={v=>v+"%"} axisLine={false} tickLine={false}/>
                  <Tooltip content={<SimpleTooltip/>}/>
                  <Line type="monotone" dataKey="rate" stroke="#f59e0b" strokeWidth={2.5}
                    dot={{fill:"#f59e0b",r:4,stroke:"white",strokeWidth:2}} connectNulls={false}/>
                </LineChart>
              </ResponsiveContainer>
              </div>
            </div>

            {/* 4 category mini charts */}
            <div style={{display:"flex",flexDirection:"column",gap:14,height:"100%"}}>
              {CATS.map(cat => {
                const data = getMonthlyForCat(cat, todos);
                const curVal = (data.find(d=>d.month===`${TODAY.month}월`)||{}).rate;
                return (
                  <div key={cat} style={{background:"white",borderRadius:14,padding:"12px 14px",boxShadow:"0 2px 8px rgba(0,0,0,0.07)",display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <div style={{width:7,height:7,borderRadius:"50%",background:CAT_COLOR[cat]}}/>
                        <span style={{fontSize:11,fontWeight:700}}>{cat}</span>
                      </div>
                      <span style={{fontSize:11,fontWeight:700,color:CAT_COLOR[cat]}}>{curVal!==null&&curVal!==undefined?curVal+"%":"—"}</span>
                    </div>
                    <div style={{flex:1,minHeight:0}}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{top:2,right:4,left:-40,bottom:0}}>
                          <YAxis domain={[0,100]} hide/>
                          <Tooltip content={<SimpleTooltip/>}/>
                          <Line type="monotone" dataKey="rate" stroke={CAT_COLOR[cat]} strokeWidth={2}
                            dot={{fill:CAT_COLOR[cat],r:3,stroke:"white",strokeWidth:1.5}} connectNulls={false}/>
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:2}}>
                      {data.map(d=><span key={d.month} style={{fontSize:9,color:"#c8c0b5"}}>{d.month}</span>)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      )}

      {/* ── GOALS ── */}
      {nav === "goals" && (() => {
        const allMonthly = Object.values(monthlyGoals).flat();
        const monthlyDone = allMonthly.filter(g=>g.done).length;
        const monthlyRate = allMonthly.length ? Math.round(monthlyDone / allMonthly.length * 100) : 0;
        
        const yearlyDone = yearlyGoals.filter(g=>g.done).length;
        const yearlyRate = yearlyGoals.length ? Math.round(yearlyDone / yearlyGoals.length * 100) : 0;
        
        const displayYearly = yearlyGoals.filter(g => goalsTab==="전체" ? true : goalsTab==="진행중" ? !g.done : g.done);

        return (
          <main style={{flex:1,overflow:"auto",padding:"24px 22px 24px 10px"}}>
            <div style={{display:"flex",justifyContent:"center",marginBottom:24}}>
              <div style={{display:"flex",background:"white",borderRadius:14,padding:5,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
                {["전체", "진행중", "완료"].map(tab => (
                  <button key={tab} onClick={() => setGoalsTab(tab)}
                    style={{
                      border:"none",padding:"10px 28px",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer",
                      background:goalsTab===tab?"#1c1c1e":"transparent",
                      color:goalsTab===tab?"white":"#b0a89a",
                      transition:"all 0.2s"
                    }}>{tab}</button>
                ))}
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1.3fr",gap:16}}>
              {/* Left Column: 5월 세부 목표 */}
              <div style={{background:"white",borderRadius:22,padding:"24px",boxShadow:"0 2px 8px rgba(0,0,0,0.07)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                  <h2 style={{margin:0,fontSize:18,fontWeight:700,letterSpacing:"-0.4px"}}>{TODAY.month}월 세부 목표</h2>
                  <span style={{background:"#f59e0b",color:"white",padding:"5px 12px",borderRadius:9,fontSize:12,fontWeight:700}}>{monthlyRate}% 달성</span>
                </div>
                
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {CATS.map(cat => {
                    const goals = monthlyGoals[cat];
                    const catDone = goals.filter(g=>g.done).length;
                    const catRate = goals.length ? Math.round(catDone / goals.length * 100) : 0;
                    const displayGoals = goals.filter(g => goalsTab==="전체" ? true : goalsTab==="진행중" ? !g.done : g.done);
                    
                    return (
                      <div key={cat} style={{background:"#faf8f5",borderRadius:16,padding:"16px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}} onClick={() => setGoalModal(cat)}>
                            <div style={{width:8,height:8,borderRadius:"50%",background:CAT_COLOR[cat]}}/>
                            <span style={{fontWeight:700,fontSize:14}}>{cat}</span>
                            <span style={{fontSize:11,color:"#999",marginLeft:4}}>추가/수정 ✎</span>
                          </div>
                          <span style={{fontWeight:700,fontSize:14,color:CAT_COLOR[cat]}}>{catRate}%</span>
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:8}}>
                          {displayGoals.map(g => (
                            <div key={g.id} onClick={()=>setMonthlyGoals(p=>({...p, [cat]: p[cat].map(x=>x.id===g.id?{...x,done:!x.done}:x)}))}
                              style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"4px 0"}}>
                              <div style={{width:18,height:18,borderRadius:5,border:"2px solid "+(g.done?CAT_COLOR[cat]:"#ddd8d0"),background:g.done?CAT_COLOR[cat]:"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s",flexShrink:0}}>
                                {g.done && <span style={{color:"white",fontSize:10,fontWeight:800}}>✓</span>}
                              </div>
                              <span style={{fontSize:13,fontWeight:500,color:g.done?"#c5bdb3":"#333",textDecoration:g.done?"line-through":"none"}}>{g.text}</span>
                            </div>
                          ))}
                          {displayGoals.length === 0 && <div style={{fontSize:12,color:"#b0a89a",marginBottom:4}}>항목이 없습니다.</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: 2026년 목표 */}
              <div style={{background:"white",borderRadius:22,padding:"24px",boxShadow:"0 2px 8px rgba(0,0,0,0.07)",alignSelf:"start"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}} onClick={() => setGoalModal(`${TODAY.year}년 목표`)}>
                    <h2 style={{margin:0,fontSize:18,fontWeight:700,letterSpacing:"-0.4px"}}>{TODAY.year}년 목표</h2>
                    <span style={{fontSize:12,color:"#999",marginLeft:4}}>추가/수정 ✎</span>
                  </div>
                  <span style={{background:"#1c1c1e",color:"white",padding:"5px 12px",borderRadius:9,fontSize:12,fontWeight:700}}>{yearlyRate}% 달성</span>
                </div>
                
                <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:16}}>
                  {displayYearly.map(g => (
                    <div key={g.id} onClick={()=>setYearlyGoals(p=>p.map(x=>x.id===g.id?{...x,done:!x.done}:x))}
                      style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"8px 0"}}>
                      <div style={{width:20,height:20,borderRadius:6,border:"2px solid "+(g.done?"#f59e0b":"#ddd8d0"),background:g.done?"#f59e0b":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s",flexShrink:0}}>
                        {g.done && <span style={{color:"white",fontSize:12,fontWeight:800}}>✓</span>}
                      </div>
                      <span style={{fontSize:14,fontWeight:500,color:g.done?"#c5bdb3":"#333",textDecoration:g.done?"line-through":"none"}}>{g.text}</span>
                    </div>
                  ))}
                  {displayYearly.length === 0 && <div style={{fontSize:13,color:"#b0a89a",gridColumn:"1/-1"}}>항목이 없습니다.</div>}
                </div>
              </div>
            </div>
          </main>
        );
      })()}

      {goalModal && (
        <GoalModal
          category={goalModal}
          goals={goalModal === `${TODAY.year}년 목표` ? yearlyGoals : monthlyGoals[goalModal]}
          color={goalModal === `${TODAY.year}년 목표` ? null : CAT_COLOR[goalModal]}
          onClose={() => setGoalModal(null)}
          onAdd={handleAddGoal}
          onEdit={handleEditGoal}
          onDelete={handleDeleteGoal}
        />
      )}

      {modal && (
        <EventModal modal={modal} events={events}
          onClose={()=>setModal(null)}
          onAdd={handleAddEvent} onDelete={handleDeleteEvent} onSave={handleSaveEvent}
        />
      )}
    </div>
  );
}
