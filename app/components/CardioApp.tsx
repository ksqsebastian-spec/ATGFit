"use client";
import { useState, useEffect } from "react";

interface CardioPlan { id:string; name:string; activity:string; base_distance:number; unit:string; weeks_completed:number[]; created_at:string; }
interface HiitLog { id:string; protocol:string; duration_min:number|null; notes:string|null; logged_at:string; }

const ACTIVITY_ICON: Record<string,string> = { run:"🏃", swim:"🏊", bike:"🚴" };
const HIIT_PROTOCOLS = [
  { name:"Tabata", detail:"20s work / 10s rest · 8 rounds · 4 min per exercise", rounds:8, work:20, rest:10 },
  { name:"Classic HIIT", detail:"30s work / 30s rest · 10 rounds · 10 min", rounds:10, work:30, rest:30 },
  { name:"Sprint Intervals", detail:"60s work / 120s rest · 6 rounds · 18 min", rounds:6, work:60, rest:120 },
  { name:"Pyramid", detail:"10/20/30/40/30/20/10s work, equal rest · 7 rounds", rounds:7, work:0, rest:0 },
];

const NUM_WEEKS = 12;

function weekTarget(base: number, week: number) {
  return +(base * Math.pow(1.1, week - 1)).toFixed(2);
}

export default function CardioApp() {
  const [subtab, setSubtab] = useState<"aerobic"|"hiit">("aerobic");
  const [plans, setPlans] = useState<CardioPlan[]>([]);
  const [logs, setLogs] = useState<HiitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showHiitForm, setShowHiitForm] = useState(false);

  // Plan form state
  const [planName, setPlanName] = useState("");
  const [planActivity, setPlanActivity] = useState("run");
  const [planBase, setPlanBase] = useState("");
  const [planUnit, setPlanUnit] = useState("km");

  // HIIT log form state
  const [hiitProtocol, setHiitProtocol] = useState(HIIT_PROTOCOLS[0].name);
  const [hiitDuration, setHiitDuration] = useState("");
  const [hiitNotes, setHiitNotes] = useState("");

  useEffect(() => {
    fetch("/api/cardio").then(r => r.json())
      .then(({ plans, logs }) => { setPlans(plans); setLogs(logs); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const createPlan = async () => {
    if (!planName.trim() || !planBase) return;
    const plan: CardioPlan = { id:"c"+Date.now(), name:planName.trim(), activity:planActivity, base_distance:parseFloat(planBase), unit:planUnit, weeks_completed:[], created_at:new Date().toISOString() };
    setPlans(prev => [plan, ...prev]);
    setShowPlanForm(false); setPlanName(""); setPlanBase("");
    await fetch("/api/cardio", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({type:"plan",...plan}) });
  };

  const deletePlan = async (id: string) => {
    setPlans(prev => prev.filter(p => p.id !== id));
    await fetch("/api/cardio", { method:"DELETE", headers:{"Content-Type":"application/json"}, body:JSON.stringify({id,type:"plan"}) });
  };

  const toggleWeek = async (plan: CardioPlan, week: number) => {
    const wc = plan.weeks_completed.includes(week) ? plan.weeks_completed.filter(w=>w!==week) : [...plan.weeks_completed, week];
    setPlans(prev => prev.map(p => p.id===plan.id ? {...p, weeks_completed:wc} : p));
    await fetch("/api/cardio", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({id:plan.id, weeks_completed:wc}) });
  };

  const logHiit = async () => {
    const log: HiitLog = { id:"h"+Date.now(), protocol:hiitProtocol, duration_min:hiitDuration?parseInt(hiitDuration):null, notes:hiitNotes.trim()||null, logged_at:new Date().toISOString() };
    setLogs(prev => [log, ...prev]);
    setShowHiitForm(false); setHiitDuration(""); setHiitNotes("");
    await fetch("/api/cardio", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({type:"hiit",...log}) });
  };

  const deleteLog = async (id: string) => {
    setLogs(prev => prev.filter(l => l.id !== id));
    await fetch("/api/cardio", { method:"DELETE", headers:{"Content-Type":"application/json"}, body:JSON.stringify({id,type:"hiit"}) });
  };

  if (loading) return <div className="main"><div className="loading-state">Loading...</div></div>;

  return (
    <>
      <nav className="nav">
        <div className="nav-brand" style={{color:"#60c080"}}>Cardio</div>
        <button className={`nav-tab${subtab==="aerobic"?" active":""}`} onClick={()=>setSubtab("aerobic")} style={subtab==="aerobic"?{color:"#60c080",borderBottomColor:"#60c080"}:{}}>Aerobic</button>
        <button className={`nav-tab${subtab==="hiit"?" active":""}`} onClick={()=>setSubtab("hiit")} style={subtab==="hiit"?{color:"#60c080",borderBottomColor:"#60c080"}:{}}>HIIT</button>
      </nav>

      <div className="main">
        {/* AEROBIC */}
        {subtab === "aerobic" && (
          <div>
            <div className="hero">
              <h1>Aerobic Training</h1>
              <div className="hero-sub">10% weekly progression · run · swim · bike</div>
            </div>

            <div className="btns-row" style={{marginBottom:"1.25rem"}}>
              <button className="btn btn-add" onClick={()=>setShowPlanForm(v=>!v)}>+ New Plan</button>
            </div>

            {showPlanForm && (
              <div className="form-card">
                <h3>New Aerobic Plan</h3>
                <div className="form-row">
                  <div>
                    <label className="form-label">Plan name</label>
                    <input className="form-inp" style={{width:"200px"}} value={planName} onChange={e=>setPlanName(e.target.value)} placeholder="e.g. Spring Running" />
                  </div>
                  <div>
                    <label className="form-label">Activity</label>
                    <select className="form-sel" value={planActivity} onChange={e=>setPlanActivity(e.target.value)}>
                      <option value="run">🏃 Run</option>
                      <option value="swim">🏊 Swim</option>
                      <option value="bike">🚴 Bike</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Week 1 distance</label>
                    <div style={{display:"flex",gap:"4px"}}>
                      <input className="form-inp" style={{width:"80px"}} type="number" min="0" step="0.5" value={planBase} onChange={e=>setPlanBase(e.target.value)} placeholder="20" />
                      <select className="form-sel" value={planUnit} onChange={e=>setPlanUnit(e.target.value)}>
                        <option value="km">km</option>
                        <option value="mi">mi</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-btns" style={{justifyContent:"flex-start"}}>
                  <button className="btn btn-add" onClick={createPlan}>Create Plan</button>
                  <button className="btn" onClick={()=>setShowPlanForm(false)}>Cancel</button>
                </div>
              </div>
            )}

            {plans.length === 0 && !showPlanForm && (
              <div className="empty-state">No plans yet.<br/>Create one above to get started.</div>
            )}

            <div className="cardio-grid">
              {plans.map(plan => {
                const totalDone = plan.weeks_completed.length;
                return (
                  <div key={plan.id} className="cardio-card">
                    <div className="cardio-hdr">
                      <div>
                        <div className="cardio-title">{ACTIVITY_ICON[plan.activity] || "🏋️"} {plan.name}</div>
                        <div className="cardio-meta">Base: {plan.base_distance} {plan.unit} · {totalDone}/{NUM_WEEKS} weeks done</div>
                      </div>
                      <button className="btn btn-danger" style={{padding:"4px 8px",fontSize:"10px"}} onClick={()=>deletePlan(plan.id)}>&times;</button>
                    </div>
                    <div className="cardio-body">
                      <table className="week-table">
                        <thead>
                          <tr><th>Week</th><th>Target</th><th>Done?</th></tr>
                        </thead>
                        <tbody>
                          {Array.from({length:NUM_WEEKS},(_,i)=>i+1).map(w => {
                            const done = plan.weeks_completed.includes(w);
                            return (
                              <tr key={w} className={done?"done":""}>
                                <td>Week {w}</td>
                                <td>{weekTarget(plan.base_distance,w)} {plan.unit}</td>
                                <td><input type="checkbox" className="week-check" checked={done} onChange={()=>toggleWeek(plan,w)} /></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* HIIT */}
        {subtab === "hiit" && (
          <div>
            <div className="hero">
              <h1>HIIT Training</h1>
              <div className="hero-sub">High intensity interval protocols</div>
            </div>

            <div className="btns-row" style={{marginBottom:"1.25rem"}}>
              <button className="btn btn-add" onClick={()=>setShowHiitForm(v=>!v)}>+ Log Session</button>
            </div>

            {showHiitForm && (
              <div className="form-card">
                <h3>Log HIIT Session</h3>
                <div className="form-row">
                  <div>
                    <label className="form-label">Protocol</label>
                    <select className="form-sel" value={hiitProtocol} onChange={e=>setHiitProtocol(e.target.value)}>
                      {HIIT_PROTOCOLS.map(p=><option key={p.name} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Duration (min)</label>
                    <input className="form-inp" style={{width:"80px"}} type="number" min="1" value={hiitDuration} onChange={e=>setHiitDuration(e.target.value)} placeholder="20" />
                  </div>
                  <div>
                    <label className="form-label">Notes</label>
                    <input className="form-inp" style={{width:"200px"}} value={hiitNotes} onChange={e=>setHiitNotes(e.target.value)} placeholder="Optional..." />
                  </div>
                </div>
                <div className="modal-btns" style={{justifyContent:"flex-start"}}>
                  <button className="btn btn-save" onClick={logHiit}>Log Session</button>
                  <button className="btn" onClick={()=>setShowHiitForm(false)}>Cancel</button>
                </div>
              </div>
            )}

            <div className="hiit-protocols">
              {HIIT_PROTOCOLS.map(p => (
                <div key={p.name} className="protocol-card">
                  <div className="protocol-name">⚡ {p.name}</div>
                  <div className="protocol-detail">{p.detail}</div>
                  <button className="btn btn-save" style={{fontSize:"10px",padding:"5px 12px"}} onClick={()=>{setHiitProtocol(p.name);setShowHiitForm(true);}}>Log this</button>
                </div>
              ))}
            </div>

            {logs.length > 0 && (
              <div style={{marginTop:"2rem"}}>
                <div style={{fontSize:"10px",letterSpacing:"0.1em",textTransform:"uppercase",color:"var(--muted)",marginBottom:"0.75rem"}}>Session History</div>
                {logs.map(log => (
                  <div key={log.id} className="hiit-log-card">
                    <div>
                      <div className="hiit-log-name">⚡ {log.protocol}</div>
                      <div className="hiit-log-meta">
                        {new Date(log.logged_at).toLocaleDateString("de-DE")}
                        {log.duration_min ? ` · ${log.duration_min} min` : ""}
                        {log.notes ? ` · ${log.notes}` : ""}
                      </div>
                    </div>
                    <button className="btn btn-danger" style={{padding:"3px 8px",fontSize:"10px"}} onClick={()=>deleteLog(log.id)}>&times;</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
