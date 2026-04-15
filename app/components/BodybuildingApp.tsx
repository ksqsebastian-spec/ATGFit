"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Exercise, Day, Program, tStyle } from "./types";

const MUSCLE_GROUPS = ["all","glutes","abs","chest","back","shoulders","arms","legs"];
const EQUIPMENT = ["all","barbell","dumbbell","cable","machine","bodyweight"];

function bbTClass(t: string) {
  const map: Record<string,string> = {
    glutes:"tag-glutes",abs:"tag-abs",chest:"tag-chest",back:"tag-back",
    shoulders:"tag-shoulders",biceps:"tag-biceps",triceps:"tag-triceps",legs:"tag-legs",
    barbell:"tag-barbell",dumbbell:"tag-dumbbell",cable:"tag-cable",machine:"tag-machine",bodyweight:"tag-bodyweight"
  };
  return map[t] || "";
}
function bbTLabel(t: string) {
  const map: Record<string,string> = {
    glutes:"Glutes",abs:"Abs",chest:"Chest",back:"Back",shoulders:"Shoulders",
    biceps:"Bi",triceps:"Tri",legs:"Legs",
    barbell:"BB",dumbbell:"DB",cable:"Cable",machine:"Mach",bodyweight:"BW"
  };
  return map[t] || t;
}

export default function BodybuildingApp() {
  const [tab, setTab] = useState("library");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [days, setDays] = useState<Day[]>([]);
  const [dayCounter, setDayCounter] = useState(0);
  const [history, setHistory] = useState<Program[]>([]);
  const [muscleFilter, setMuscleFilter] = useState("all");
  const [equipFilter, setEquipFilter] = useState("all");
  const [poolSearch, setPoolSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [snapName, setSnapName] = useState("");
  const [loading, setLoading] = useState(true);
  const [tagPopup, setTagPopup] = useState<{exId:string;x:number;y:number}|null>(null);
  const dragRef = useRef<{type:string;exId:string;fromDay?:string;idx?:number}|null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/bb-exercises").then(r => r.json()),
      fetch("/api/bb-programs").then(r => r.json()),
    ]).then(([ex, progs]) => { setExercises(ex); setHistory(progs); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const exById = useCallback((id: string) => exercises.find(e => e.id === id), [exercises]);
  const useCount = useCallback((exId: string) => days.reduce((n,d) => n + d.exercises.filter(e => e.id === exId).length, 0), [days]);

  const updateTags = async (exId: string, tags: string[]) => {
    setExercises(prev => prev.map(e => e.id === exId ? { ...e, tags } : e));
    await fetch("/api/bb-exercises", { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ id: exId, tags }) });
  };

  const addDay = () => { const nc = dayCounter+1; setDayCounter(nc); setDays(prev => [...prev, {id:"d"+nc,num:nc,label:"",env:"gym",exercises:[]}]); };
  const removeDay = (id: string) => setDays(prev => prev.filter(d => d.id !== id));
  const clearDays = () => { if (confirm("Clear all days?")) { setDays([]); setDayCounter(0); } };
  const updateDay = (id: string, field: string, val: string) => setDays(prev => prev.map(d => d.id !== id ? d : {...d, [field]: field==="num" ? parseInt(val)||1 : val}));
  const updateSets = (dayId: string, idx: number, val: string) => setDays(prev => prev.map(d => { if (d.id !== dayId) return d; const exs=[...d.exercises]; if(exs[idx]) exs[idx]={...exs[idx],sets:val}; return {...d,exercises:exs}; }));
  const removeEx = (dayId: string, idx: number) => setDays(prev => prev.map(d => { if (d.id !== dayId) return d; const exs=[...d.exercises]; exs.splice(idx,1); return {...d,exercises:exs}; }));

  const dropInto = (dayId: string) => {
    const drag = dragRef.current; if (!drag) return;
    setDays(prev => {
      const next = prev.map(d => ({...d, exercises:[...d.exercises]}));
      const target = next.find(d => d.id === dayId); if (!target) return prev;
      if (drag.type === "pool") { target.exercises.push({id:drag.exId,sets:""}); }
      else if (drag.type === "day" && drag.fromDay && drag.fromDay !== dayId) {
        const src = next.find(d => d.id === drag.fromDay);
        if (src && drag.idx !== undefined) { const [item]=src.exercises.splice(drag.idx,1); if(item) target.exercises.push(item); }
      }
      return next;
    });
    dragRef.current = null;
  };

  const saveSnapshot = async () => {
    const name = snapName.trim() || ("Program " + new Date().toLocaleDateString("de-DE"));
    const snap: Program = {id:"h"+Date.now(), name, days:JSON.parse(JSON.stringify(days)), created_at:new Date().toISOString()};
    setHistory(prev => [snap, ...prev]); setModalOpen(false);
    await fetch("/api/bb-programs", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({id:snap.id,name:snap.name,days:snap.days}) });
    alert("Saved: " + name);
  };

  const deleteSnap = async (id: string) => {
    setHistory(prev => prev.filter(h => h.id !== id));
    await fetch("/api/bb-programs", { method:"DELETE", headers:{"Content-Type":"application/json"}, body:JSON.stringify({id}) });
  };

  const loadSnap = (id: string) => {
    const snap = history.find(h => h.id === id);
    if (!snap || !confirm('Load "'+snap.name+'" into builder?')) return;
    const d = JSON.parse(JSON.stringify(snap.days)) as Day[];
    setDays(d); setDayCounter(d.reduce((mx,dd)=>Math.max(mx,parseInt(dd.id.replace("d",""))||0),0)); setTab("builder");
  };

  const getStats = () => {
    const counts: Record<string,number> = {}, dates: Record<string,string[]> = {};
    history.forEach(s => (s.days||[]).forEach(d => d.exercises.forEach(item => {
      counts[item.id]=(counts[item.id]||0)+1;
      if (!dates[item.id]) dates[item.id]=[];
      dates[item.id].push(s.created_at);
    })));
    return { counts, dates, used: Object.keys(counts).sort((a,b)=>counts[b]-counts[a]), max: Math.max(...Object.values(counts),1) };
  };

  const exportPDF = () => { setTab("builder"); setTimeout(()=>window.print(),150); };

  const buildBlob = (title: string, snapDays: Day[]) => {
    const rows = snapDays.map(day => {
      const exRows = day.exercises.map(item => {
        const ex = exById(item.id); const name = ex?.name || item.id;
        const tags = ex ? ex.tags.map(t=>`<span style="display:inline-flex;font-size:9px;padding:1px 5px;border-radius:3px;margin-right:3px;font-weight:500;${tStyle(t)}">${bbTLabel(t)}</span>`).join("") : "";
        return `<tr><td style="padding:7px 10px;font-size:12px">${name}</td><td style="padding:7px 10px">${tags}</td><td style="padding:7px 10px;font-size:11px;color:#8a8480">${item.sets||"—"}</td></tr>`;
      }).join("");
      return `<div style="break-inside:avoid;background:#fff;border:1px solid #ddd9d2;border-radius:8px;overflow:hidden;margin-bottom:12px"><div style="padding:10px 14px;background:#f0ede8;border-bottom:1px solid #ddd9d2"><span style="font-family:monospace;font-size:13px;font-weight:500">Day ${day.num}${day.label?" · "+day.label:""}</span></div><table style="width:100%;border-collapse:collapse"><thead><tr><th style="padding:5px 10px;font-size:9px;text-transform:uppercase;color:#8a8480;text-align:left;font-weight:400">Exercise</th><th style="padding:5px 10px;font-size:9px;text-transform:uppercase;color:#8a8480;text-align:left;font-weight:400">Tags</th><th style="padding:5px 10px;font-size:9px;text-transform:uppercase;color:#8a8480;text-align:left;font-weight:400">Sets/Reps</th></tr></thead><tbody>${exRows}</tbody></table></div>`;
    }).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title></head><body style="background:#f5f3ef;font-family:monospace;padding:2rem;max-width:900px;margin:0 auto"><div style="margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:1px solid #ddd9d2"><div style="font-family:Georgia,serif;font-size:1.8rem;font-weight:600">${title}</div><div style="font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#8a8480">Generated ${new Date().toLocaleDateString("de-DE")}</div></div>${rows}</body></html>`;
    return new Blob([html],{type:"text/html"});
  };
  const downloadBlob = (blob: Blob, filename: string) => {
    const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!tagPopup) return;
    const h = () => setTagPopup(null);
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, [tagPopup]);

  if (loading) return <div className="main"><div className="loading-state">Loading...</div></div>;

  const filteredEx = exercises.filter(ex => {
    const muscleMatch = muscleFilter === "all" || ex.tags.includes(muscleFilter) || (muscleFilter === "arms" && (ex.tags.includes("biceps") || ex.tags.includes("triceps")));
    const equipMatch = equipFilter === "all" || ex.tags.includes(equipFilter);
    return muscleMatch && equipMatch;
  });

  const poolEx = exercises.filter(ex => !poolSearch || ex.name.toLowerCase().includes(poolSearch.toLowerCase()));
  const stats = getStats();
  const ALL_TAGS = ["glutes","abs","chest","back","shoulders","biceps","triceps","legs","barbell","dumbbell","cable","machine","bodyweight"];

  return (
    <>
      <nav className="nav">
        <div className="nav-brand" style={{color:"var(--bb-accent,#d080e0)"}}>BB</div>
        {["library","builder","history","stats"].map(t => (
          <button key={t} className={`nav-tab${tab===t?" active":""}`} onClick={()=>setTab(t)} style={tab===t?{color:"#d080e0",borderBottomColor:"#d080e0"}:{}}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </nav>

      <div className="main">
        {/* LIBRARY */}
        <div className={`panel${tab==="library"?" active":""}`}>
          <div className="hero"><h1>Exercise Library</h1><div className="hero-sub">Bodybuilding &middot; 57 exercises</div></div>
          <div className="filter-row">
            {MUSCLE_GROUPS.map(f => (
              <button key={f} className={`fbtn${muscleFilter===f?" active":""}`} onClick={()=>setMuscleFilter(f)}
                style={muscleFilter===f?{color:"#d080e0",borderColor:"#d080e0",background:"#f8eefb"}:{}}>
                {f==="all"?"All":f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
          </div>
          <div className="filter-row2">
            {EQUIPMENT.map(f => (
              <button key={f} className={`fbtn${equipFilter===f?" active":""}`} onClick={()=>setEquipFilter(f)}
                style={equipFilter===f?{color:"#606060",borderColor:"#909090",background:"#f0f0f0"}:{}}>
                {f==="all"?"All Equipment":f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
          </div>
          <table className="ex-table">
            <thead><tr><th>Exercise</th><th>Tags</th></tr></thead>
            <tbody>
              {filteredEx.map(ex => (
                <tr key={ex.id}>
                  <td style={{fontSize:"12px"}}>{ex.name}</td>
                  <td>
                    <div className="tags-cell">
                      {ex.tags.map(t => (
                        <span key={t} className={`tag ${bbTClass(t)}`} style={{cursor:"pointer"}} onClick={e=>{e.stopPropagation();setTagPopup({exId:ex.id,x:e.clientX,y:e.clientY+8});}}>{bbTLabel(t)}</span>
                      ))}
                      <span className="add-tag-btn" onClick={e=>{e.stopPropagation();setTagPopup({exId:ex.id,x:e.clientX,y:e.clientY+8});}}>+tag</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* BUILDER */}
        <div className={`panel${tab==="builder"?" active":""}`}>
          <div className="hero"><h1>Split Builder</h1><div className="hero-sub">Drag &middot; drop &middot; edit inline</div></div>
          <div className="note">Drag from pool into days. Edit sets/reps inline. Save to history or export.</div>
          <div className="builder-layout">
            <div className="pool-wrap">
              <div className="pool-hdr"><span className="pool-title">Exercise pool</span><span className="pool-cnt">{poolEx.length}</span></div>
              <input className="pool-search" type="text" placeholder="Search..." value={poolSearch} onChange={e=>setPoolSearch(e.target.value)} />
              <div className="pool-list">
                {poolEx.map(ex => (
                  <div key={ex.id} className="chip" draggable onDragStart={()=>{dragRef.current={type:"pool",exId:ex.id};}}>
                    <span className="chip-name">{ex.name}</span>
                    <div className="chip-tags">
                      {useCount(ex.id)>0 && <span className="chip-usecount">{useCount(ex.id)}&times;</span>}
                      {ex.tags.filter(t=>!["barbell","dumbbell","cable","machine","bodyweight"].includes(t)).map(t=><span key={t} className={`tag ${bbTClass(t)}`}>{bbTLabel(t)}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="days-hdr">
                <div className="days-title">Your Split</div>
                <div className="btns-row">
                  <button className="btn btn-add" onClick={addDay}>+ Day</button>
                  <button className="btn btn-save" onClick={()=>{setSnapName("");setModalOpen(true);}}>Save</button>
                  <button className="btn btn-pdf" onClick={exportPDF}>PDF</button>
                  <button className="btn btn-html" onClick={()=>downloadBlob(buildBlob("BB · Current Split",days),"bb-split-"+new Date().toISOString().slice(0,10)+".html")}>HTML</button>
                  <button className="btn btn-danger" onClick={clearDays}>Clear</button>
                </div>
              </div>
              <div className="days-grid">
                {days.map(day => (
                  <div key={day.id} className="day-card"
                    onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add("drag-over");}}
                    onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))e.currentTarget.classList.remove("drag-over");}}
                    onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove("drag-over");dropInto(day.id);}}>
                    <div className="day-hdr">
                      <input className="day-num" type="number" value={day.num} min={1} max={99} onChange={e=>updateDay(day.id,"num",e.target.value)} />
                      <input className="day-lbl" type="text" value={day.label} placeholder="focus..." onChange={e=>updateDay(day.id,"label",e.target.value)} />
                      <button className="day-del" onClick={()=>removeDay(day.id)}>&times;</button>
                    </div>
                    <div className="drop-zone"
                      onDragOver={e=>e.preventDefault()}
                      onDrop={e=>{e.preventDefault();e.stopPropagation();dropInto(day.id);}}>
                      {day.exercises.length===0 ? <div className="drop-hint">Drop exercises here</div> :
                        day.exercises.map((item,idx) => {
                          const ex = exById(item.id); if (!ex) return null;
                          const total = useCount(ex.id);
                          return (
                            <div key={`${day.id}-${idx}`} className="ex-row" draggable onDragStart={e=>{e.stopPropagation();dragRef.current={type:"day",exId:ex.id,fromDay:day.id,idx};}}>
                              <div className="ex-left">
                                <div className="ex-name">{ex.name}</div>
                                <div className="ex-tags-row">
                                  {total>1 && <span className="tag tag-dup">{total}&times;</span>}
                                  {ex.tags.filter(t=>!["barbell","dumbbell","cable","machine","bodyweight"].includes(t)).map(t=><span key={t} className={`tag ${bbTClass(t)}`}>{bbTLabel(t)}</span>)}
                                </div>
                              </div>
                              <input className="sets-inp" type="text" value={item.sets} placeholder="3x10" onChange={e=>updateSets(day.id,idx,e.target.value)} />
                              <button className="ex-del" onClick={()=>removeEx(day.id,idx)}>&times;</button>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* HISTORY */}
        <div className={`panel${tab==="history"?" active":""}`}>
          <div className="hero"><h1>Program History</h1><div className="hero-sub">Saved BB snapshots</div></div>
          <div className="btns-row" style={{marginBottom:"1rem"}}>
            <button className="btn btn-danger" onClick={async()=>{if(!confirm("Clear all history?"))return;for(const h of history)await fetch("/api/bb-programs",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:h.id})});setHistory([]);}}>Clear history</button>
          </div>
          {history.length===0 ? <div className="empty-state">No saved programs yet.<br/>Build a split and hit &quot;Save&quot;.</div> :
            history.map(snap => {
              const d=new Date(snap.created_at);
              const ds=d.toLocaleDateString("de-DE")+" "+d.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});
              return (
                <div key={snap.id} className="hist-card">
                  <div className="hist-hdr">
                    <div><div className="hist-name">{snap.name}</div><div className="hist-meta">{ds} &middot; {(snap.days||[]).length} days</div></div>
                    <div className="btns-row">
                      <button className="btn" onClick={()=>loadSnap(snap.id)}>Load</button>
                      <button className="btn btn-html" onClick={()=>downloadBlob(buildBlob("BB · "+snap.name,snap.days),"bb-"+snap.name.replace(/[^a-z0-9]/gi,"-").toLowerCase()+".html")}>HTML</button>
                      <button className="btn btn-danger" onClick={()=>deleteSnap(snap.id)}>&times;</button>
                    </div>
                  </div>
                  <div className="hist-body"><div className="hist-days">{(snap.days||[]).map((day,i)=>(
                    <div key={i} className="hist-pill"><strong>Day {day.num}{day.label?" · "+day.label:""}</strong><br/><span style={{fontSize:"9px"}}>{day.exercises.map(e=>exById(e.id)?.name||e.id).join(", ")||"—"}</span></div>
                  ))}</div></div>
                </div>
              );
            })}
        </div>

        {/* STATS */}
        <div className={`panel${tab==="stats"?" active":""}`}>
          <div className="hero"><h1>Exercise Stats</h1><div className="hero-sub">Usage across all saved programs</div></div>
          <div className="stats-grid">
            {stats.used.length===0 ? <div className="empty-state">No stats yet.<br/>Save some programs first.</div> :
              stats.used.map(id => {
                const ex=exById(id); if(!ex) return null;
                const cnt=stats.counts[id]; const pct=Math.round(cnt/stats.max*100);
                const lastDates=(stats.dates[id]||[]).slice(-5).reverse().map(d=>new Date(d).toLocaleDateString("de-DE")).join(", ");
                return (
                  <div key={id} className="stat-card">
                    <div className="stat-name">{ex.name}</div>
                    <div className="stat-bar-row"><div className="stat-bar"><div className="stat-fill" style={{width:pct+"%",background:"#d080e0"}} /></div><span className="stat-cnt" style={{color:"#d080e0"}}>{cnt}&times;</span></div>
                    <div className="stat-dates">Used: {lastDates}</div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* TAG POPUP */}
      {tagPopup && (() => {
        const ex = exById(tagPopup.exId); if (!ex) return null;
        return (
          <div className="tag-popup" style={{display:"flex",left:tagPopup.x,top:tagPopup.y}} onClick={e=>e.stopPropagation()}>
            <div className="tag-popup-title">Edit tags</div>
            {ALL_TAGS.map(t => (
              <label key={t} className="tag-opt">
                <input type="checkbox" checked={ex.tags.includes(t)} onChange={()=>updateTags(ex.id,ex.tags.includes(t)?ex.tags.filter(x=>x!==t):[...ex.tags,t])} />
                <span className={`tag ${bbTClass(t)}`}>{bbTLabel(t)}</span>
              </label>
            ))}
          </div>
        );
      })()}

      {/* SAVE MODAL */}
      <div className={`modal-bg${modalOpen?" open":""}`}>
        <div className="modal">
          <h3>Save snapshot</h3>
          <input className="modal-inp" type="text" value={snapName} onChange={e=>setSnapName(e.target.value)} placeholder="Program name..." autoFocus />
          <div className="modal-btns">
            <button className="btn" onClick={()=>setModalOpen(false)}>Cancel</button>
            <button className="btn btn-save" onClick={saveSnapshot}>Save</button>
          </div>
        </div>
      </div>
    </>
  );
}
