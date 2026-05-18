import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const TODAY = { year: 2026, month: 5, day: 18 };
const TODAY_STR = "2026-5-18";
const EV_COLORS = ["#f59e0b","#818cf8","#fb7185","#34d399","#60a5fa"];
const MONTH_LABELS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const DAY_LABELS = ["일","월","화","수","목","금","토"];
const CATS = ["일","운동","공부","기타"];
const CAT_COLOR = { "일":"#f59e0b","운동":"#34d399","공부":"#818cf8","기타":"#fb7185" };
const CAT_LIGHT = { "일":"#fef3c7","운동":"#dcfce7","공부":"#ede9fe","기타":"#fce7f3" };
const CAT_TEXT  = { "일":"#78350f","운동":"#14532d","공부":"#3b0764","기타":"#831843" };
const NAV = [["calendar","▦"],["goals","◎"],["analytics","▲"]];

const BASE_RATES = {
  "2026-5-1":78,"2026-5-2":65,"2026-5-3":82,"2026-5-4":91,"2026-5-5":70,
  "2026-5-6":88,"2026-5-7":95,"2026-5-8":73,"2026-5-9":86,"2026-5-10":80,
  "2026-5-11":92,"2026-5-12":67,"2026-5-13":84,"2026-5-14":96,"2026-5-15":75,
  "2026-5-16":88,"2026-5-17":71,
};

const DEFAULT_TODOS = [
  {id:1,text:"주간 보고서 작성",done:true,category:"일"},
  {id:2,text:"이메일 답장",done:true,category:"일"},
  {id:3,text:"디자인 피드백 전달",done:false,category:"공부"},
  {id:4,text:"코드 리뷰",done:false,category:"공부"},
  {id:5,text:"미팅 자료 준비",done:true,category:"일"},
  {id:6,text:"30분 런닝",done:true,category:"운동"},
];

const DEFAULT_EVENTS = {
  "2026-5-18":[{id:1,time:"09:00",title:"팀 스탠드업"},{id:2,time:"13:00",title:"디자인 리뷰"},{id:3,time:"15:30",title:"클라이언트 미팅"}],
  "2026-5-20":[{id:4,time:"10:00",title:"기획 회의"}],
  "2026-5-22":[{id:5,time:"14:00",title:"코드 리뷰"}],
};

const SAMPLE_CAT = {
  "일":   [72,78,75,82],
  "운동": [45,52,60,58],
  "공부": [80,85,78,88],
  "기타": [65,70,62,75],
};

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
  const validMay = CATS.map(c => cr[c]).filter(v => v !== null);
  const mayR = validMay.length ? Math.round(validMay.reduce((a, b) => a + b, 0) / validMay.length) : null;
  return ["1월","2월","3월","4월","5월"].map((m, i) => {
    if (i < 4) {
      const vals = CATS.map(c => SAMPLE_CAT[c][i]);
      return { month: m, rate: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) };
    }
    return { month: m, rate: mayR };
  });
}

function getMonthlyForCat(cat, todos) {
  const items = todos.filter(t => t.category === cat);
  const mayR = items.length ? Math.round(items.filter(t => t.done).length / items.length * 100) : null;
  return ["1월","2월","3월","4월","5월"].map((m, i) => ({
    month: m, rate: i < 4 ? SAMPLE_CAT[cat][i] : mayR
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
      <p style={{margin:0,color:"#888"}}>5월 {payload[0].payload.day}일{isToday ? " · 오늘" : ""}</p>
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

  useEffect(() => {
    const init = async () => {
      try {
        const [dateRes, todosRes, ratesRes] = await Promise.allSettled([
          window.storage.get("wt_date"),
          window.storage.get("wt_todos"),
          window.storage.get("wt_rates"),
        ]);
        let merged = { ...BASE_RATES };
        if (ratesRes.status === "fulfilled" && ratesRes.value)
          merged = { ...merged, ...JSON.parse(ratesRes.value.value) };
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
    const day = i + 1, key = "2026-5-" + day;
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
              <h1 style={{margin:0,fontSize:22,fontWeight:700,letterSpacing:"-0.5px"}}>2026년 5월</h1>
            </div>
            <div style={{display:"flex",gap:8}}>
              <div style={{background:"white",borderRadius:12,padding:"8px 16px",fontSize:12,color:"#666",fontWeight:500,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>월평균 <strong style={{color:"#1a1a1a"}}>{avgRate}%</strong></div>
              <div style={{background:"#1c1c1e",borderRadius:12,padding:"8px 16px",fontSize:12,color:"white",fontWeight:600}}>오늘 · 5/18</div>
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
                  <span style={{fontSize:10,color:"#b0a89a",background:"#f5f2ee",borderRadius:7,padding:"3px 9px",fontWeight:500}}>MAY 18</span>
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
        <main style={{flex:1,overflow:"auto",padding:"24px 22px 24px 10px"}}>
          <div style={{marginBottom:20}}>
            <p style={{margin:"0 0 2px",fontSize:10,color:"#b0a89a",letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:600}}>애널리틱스</p>
            <h1 style={{margin:0,fontSize:22,fontWeight:700,letterSpacing:"-0.5px"}}>2026 달성률 분석</h1>
          </div>

          {/* Top metric cards */}
          <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr 1fr 1fr 1fr",gap:10,marginBottom:16}}>
            <div style={{background:"#1c1c1e",borderRadius:16,padding:"14px 16px"}}>
              <p style={{margin:"0 0 8px",fontSize:10,color:"rgba(255,255,255,0.45)",fontWeight:600,letterSpacing:"0.05em",textTransform:"uppercase"}}>2026 전체</p>
              <p style={{margin:0,fontSize:28,fontWeight:800,color:"#f59e0b",letterSpacing:"-0.5px"}}>{overall2026}%</p>
              <p style={{margin:"4px 0 0",fontSize:10,color:"rgba(255,255,255,0.35)"}}>전체 달성률</p>
            </div>
            {CATS.map(cat => {
              const rate = catRates[cat];
              return (
                <div key={cat} style={{background:"white",borderRadius:16,padding:"14px 16px",boxShadow:"0 2px 8px rgba(0,0,0,0.07)"}}>
                  <p style={{margin:"0 0 8px",fontSize:10,color:"#b0a89a",fontWeight:600,letterSpacing:"0.05em",textTransform:"uppercase"}}>5월 {cat}</p>
                  <p style={{margin:0,fontSize:26,fontWeight:800,color:CAT_COLOR[cat],letterSpacing:"-0.5px"}}>{rate!==null?rate+"%":"—"}</p>
                  <div style={{marginTop:8,height:3,background:"#f5f2ee",borderRadius:2}}>
                    <div style={{height:"100%",width:(rate||0)+"%",background:CAT_COLOR[cat],borderRadius:2,transition:"width 0.4s"}}/>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main grid */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 210px",gap:14,alignItems:"start"}}>
            {/* Monthly overall chart */}
            <div style={{background:"white",borderRadius:18,padding:"20px 22px",boxShadow:"0 2px 8px rgba(0,0,0,0.07)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                <div>
                  <p style={{margin:0,fontWeight:700,fontSize:13}}>매월 달성률</p>
                  <p style={{margin:"3px 0 0",fontSize:11,color:"#c0b8ad"}}>2026년 1월 — 5월 · 전체 카테고리 평균</p>
                </div>
                <span style={{background:"#fef3c7",borderRadius:8,padding:"4px 11px",fontSize:11,color:"#92400e",fontWeight:600}}>
                  5월 {(monthlyOverall.find(m=>m.month==="5월")||{}).rate||0}%
                </span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
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

            {/* 4 category mini charts */}
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {CATS.map(cat => {
                const data = getMonthlyForCat(cat, todos);
                const mayVal = (data.find(d=>d.month==="5월")||{}).rate;
                return (
                  <div key={cat} style={{background:"white",borderRadius:14,padding:"12px 14px",boxShadow:"0 2px 8px rgba(0,0,0,0.07)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <div style={{width:7,height:7,borderRadius:"50%",background:CAT_COLOR[cat]}}/>
                        <span style={{fontSize:11,fontWeight:700}}>{cat}</span>
                      </div>
                      <span style={{fontSize:11,fontWeight:700,color:CAT_COLOR[cat]}}>{mayVal!==null&&mayVal!==undefined?mayVal+"%":"—"}</span>
                    </div>
                    <ResponsiveContainer width="100%" height={48}>
                      <LineChart data={data} margin={{top:2,right:4,left:-40,bottom:0}}>
                        <YAxis domain={[0,100]} hide/>
                        <Tooltip content={<SimpleTooltip/>}/>
                        <Line type="monotone" dataKey="rate" stroke={CAT_COLOR[cat]} strokeWidth={2}
                          dot={{fill:CAT_COLOR[cat],r:3,stroke:"white",strokeWidth:1.5}} connectNulls={false}/>
                      </LineChart>
                    </ResponsiveContainer>
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
      {nav === "goals" && (
        <main style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{textAlign:"center",color:"#b0a89a"}}>
            <p style={{fontSize:40,margin:"0 0 12px"}}>◎</p>
            <p style={{fontSize:15,fontWeight:600,color:"#555",margin:"0 0 6px"}}>Goals</p>
            <p style={{fontSize:12,margin:0}}>곧 출시될 예정이에요</p>
          </div>
        </main>
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
