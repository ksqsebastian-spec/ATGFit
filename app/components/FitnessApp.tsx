"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Exercise, Day, Program, DayExercise, tClass, tLabel, tStyle } from "./types";
import HistoryCard from "./HistoryCard";
import { useUser } from "./UserContext";

export default function FitnessApp() {
  const user = useUser();
  const [tab, setTab] = useState("exercises");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [days, setDays] = useState<Day[]>([]);
  const [dayCounter, setDayCounter] = useState(0);
  const [history, setHistory] = useState<Program[]>([]);
  const [filter, setFilter] = useState("all");
  const [poolSearch, setPoolSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [snapName, setSnapName] = useState("");
  const [loading, setLoading] = useState(true);
  const [tagPopup, setTagPopup] = useState<{exId:string;x:number;y:number}|null>(null);
  const dragRef = useRef<{type:string;exId:string;fromDay?:string;idx?:number}|null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTags, setNewTags] = useState<string[]>([]);
  const [poolFilter, setPoolFilter] = useState("all");

  // Load data from API on mount
  useEffect(() => {
    Promise.all([
      fetch("/api/exercises").then(r => r.json()),
      fetch("/api/programs").then(r => r.json()),
    ]).then(([ex, progs]) => {
      setExercises(ex);
      setHistory(progs);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const exById = useCallback((id: string) => exercises.find(e => e.id === id), [exercises]);

  const useCount = useCallback((exId: string) => {
    let n = 0;
    days.forEach(d => d.exercises.forEach(e => { if (e.id === exId) n++; }));
    return n;
  }, [days]);

  // Tag update
  const updateTags = async (exId: string, tags: string[]) => {
    setExercises(prev => prev.map(e => e.id === exId ? { ...e, tags } : e));
    await fetch("/api/exercises", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: exId, tags }) });
  };

  const addExercise = async () => {
    const name = newName.trim();
    if (!name) return;
    const id = "custom_" + Date.now();
    const ex = { id, name, tags: newTags };
    const created = await fetch("/api/exercises", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ex) }).then(r => r.json());
    setExercises(prev => [...prev, created]);
    setNewName(""); setNewTags([]); setAddOpen(false);
  };

  const deleteExercise = async (exId: string) => {
    if (!confirm("Remove this exercise?")) return;
    setExercises(prev => prev.filter(e => e.id !== exId));
    await fetch("/api/exercises", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: exId }) });
  };

  // Day management
  const addDay = () => {
    const nc = dayCounter + 1;
    setDayCounter(nc);
    setDays(prev => [...prev, { id: "d" + nc, num: nc, label: "", env: "gym", exercises: [] }]);
  };
  const removeDay = (id: string) => setDays(prev => prev.filter(d => d.id !== id));
  const clearDays = () => { if (confirm("Clear all days?")) { setDays([]); setDayCounter(0); } };
  const updateDay = (id: string, field: string, val: string) => {
    setDays(prev => prev.map(d => {
      if (d.id !== id) return d;
      if (field === "num") return { ...d, num: parseInt(val) || 1 };
      if (field === "label") return { ...d, label: val };
      if (field === "env") return { ...d, env: val };
      return d;
    }));
  };
  const updateSets = (dayId: string, idx: number, val: string) => {
    setDays(prev => prev.map(d => {
      if (d.id !== dayId) return d;
      const exs = [...d.exercises];
      if (exs[idx]) exs[idx] = { ...exs[idx], sets: val };
      return { ...d, exercises: exs };
    }));
  };
  const removeEx = (dayId: string, idx: number) => {
    setDays(prev => prev.map(d => {
      if (d.id !== dayId) return d;
      const exs = [...d.exercises];
      exs.splice(idx, 1);
      return { ...d, exercises: exs };
    }));
  };

  // Drop handler
  const dropInto = (dayId: string) => {
    const drag = dragRef.current;
    if (!drag) return;
    setDays(prev => {
      const next = prev.map(d => ({ ...d, exercises: [...d.exercises] }));
      const target = next.find(d => d.id === dayId);
      if (!target) return prev;
      if (drag.type === "pool") {
        target.exercises.push({ id: drag.exId, sets: "" });
      } else if (drag.type === "day" && drag.fromDay && drag.fromDay !== dayId) {
        const src = next.find(d => d.id === drag.fromDay);
        if (src && drag.idx !== undefined) {
          const [item] = src.exercises.splice(drag.idx, 1);
          if (item) target.exercises.push(item);
        }
      }
      return next;
    });
    dragRef.current = null;
  };

  // Save snapshot
  const saveSnapshot = async () => {
    const name = snapName.trim() || ("Program " + new Date().toLocaleDateString("de-DE"));
    const snap: Program = { id: "h" + Date.now(), name, days: JSON.parse(JSON.stringify(days)), created_at: new Date().toISOString() };
    setHistory(prev => [snap, ...prev]);
    setModalOpen(false);
    const enrichedDays = days.map(day => ({
      ...day,
      exercises: day.exercises.map(item => ({ ...item, name: exById(item.id)?.name || item.id })),
    }));
    await Promise.all([
      fetch("/api/programs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: snap.id, name, days: snap.days, user_id: user?.id }) }),
      user && fetch("/api/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: "p" + snap.id, userId: user.id, section: "atg", title: name, days: enrichedDays }) }),
    ]);
    alert("Saved: " + name);
  };

  const deleteSnap = async (id: string) => {
    setHistory(prev => prev.filter(h => h.id !== id));
    await fetch("/api/programs", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
  };

  const clearHistory = async () => {
    if (!confirm("Clear all history?")) return;
    for (const h of history) {
      await fetch("/api/programs", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: h.id }) });
    }
    setHistory([]);
  };

  const loadSnap = (id: string) => {
    const snap = history.find(h => h.id === id);
    if (!snap || !confirm('Load "' + snap.name + '" into builder?')) return;
    const d = JSON.parse(JSON.stringify(snap.days)) as Day[];
    setDays(d);
    setDayCounter(d.reduce((mx, dd) => Math.max(mx, parseInt(dd.id.replace("d", "")) || 0), 0));
    setTab("builder");
  };

  // Export
  const exportPDF = () => { setTab("builder"); setTimeout(() => window.print(), 150); };

  const buildHTMLBlob = (title: string, snapDays: Day[]) => {
    const rows = snapDays.map(day => {
      const exRows = day.exercises.map(item => {
        const ex = exById(item.id);
        const name = ex ? ex.name : item.id;
        const tags = ex ? ex.tags.map(t => `<span style="display:inline-flex;font-size:9px;padding:1px 5px;border-radius:3px;margin-right:3px;font-weight:500;${tStyle(t)}">${tLabel(t)}</span>`).join("") : "";
        return `<tr style="border-bottom:1px solid #ede9e3"><td style="padding:7px 10px;font-size:12px">${name}</td><td style="padding:7px 10px">${tags}</td><td style="padding:7px 10px;font-size:11px;color:#8a8480">${item.sets || "\u2014"}</td></tr>`;
      }).join("");
      const envColor = day.env === "gym" ? "#9a6f1a" : day.env === "home" ? "#2a72a8" : "#7040a0";
      return `<div style="break-inside:avoid;background:#fff;border:1px solid #ddd9d2;border-radius:8px;overflow:hidden;margin-bottom:12px"><div style="padding:10px 14px;background:#f0ede8;border-bottom:1px solid #ddd9d2;display:flex;align-items:center;gap:10px"><span style="font-family:monospace;font-size:13px;font-weight:500">Day ${day.num}${day.label ? " \u00b7 " + day.label : ""}</span><span style="font-size:9px;padding:2px 7px;border-radius:3px;background:#fff;border:1px solid ${envColor};color:${envColor};text-transform:uppercase">${day.env}</span></div><table style="width:100%;border-collapse:collapse"><thead><tr style="border-bottom:1px solid #ede9e3"><th style="padding:5px 10px;font-size:9px;text-transform:uppercase;color:#8a8480;text-align:left;font-weight:400">Exercise</th><th style="padding:5px 10px;font-size:9px;text-transform:uppercase;color:#8a8480;text-align:left;font-weight:400">Tags</th><th style="padding:5px 10px;font-size:9px;text-transform:uppercase;color:#8a8480;text-align:left;font-weight:400">Sets / Reps</th></tr></thead><tbody>${exRows}</tbody></table></div>`;
    }).join("");
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${title}</title></head><body style="background:#f5f3ef;font-family:monospace;padding:2rem;max-width:900px;margin:0 auto"><div style="margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:1px solid #ddd9d2"><div style="font-family:Georgia,serif;font-size:1.8rem;font-weight:600;margin-bottom:3px">${title}</div><div style="font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#8a8480">Generated ${new Date().toLocaleDateString("de-DE")}</div></div>${rows}</body></html>`;
    return new Blob([html], { type: "text/html" });
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const exportHTML = () => downloadBlob(buildHTMLBlob("ATG \u00b7 Current Split", days), "atg-split-" + new Date().toISOString().slice(0, 10) + ".html");
  const exportSnapHTML = (id: string) => {
    const snap = history.find(h => h.id === id);
    if (!snap) return;
    downloadBlob(buildHTMLBlob("ATG \u00b7 " + snap.name, snap.days), "atg-" + snap.name.replace(/[^a-z0-9]/gi, "-").toLowerCase() + ".html");
  };

  // Stats computation
  const getStats = () => {
    const counts: Record<string, number> = {};
    const dates: Record<string, string[]> = {};
    history.forEach(snap => (snap.days || []).forEach(d => (d.exercises || []).forEach(item => {
      counts[item.id] = (counts[item.id] || 0) + 1;
      if (!dates[item.id]) dates[item.id] = [];
      dates[item.id].push(snap.created_at);
    })));
    return { counts, dates, used: Object.keys(counts).sort((a, b) => counts[b] - counts[a]), max: Math.max(...Object.values(counts), 1) };
  };

  // Close tag popup on outside click
  useEffect(() => {
    const handler = () => setTagPopup(null);
    if (tagPopup) { document.addEventListener("click", handler); return () => document.removeEventListener("click", handler); }
  }, [tagPopup]);

  if (loading) return <div className="main"><div className="loading-state">Loading...</div></div>;

  const filteredEx = exercises.filter(ex =>
    filter === "all" || ex.tags.includes(filter)
  );

  const poolEx = exercises.filter(ex =>
    (poolFilter === "all" || ex.tags.includes(poolFilter)) &&
    (!poolSearch || ex.name.toLowerCase().includes(poolSearch.toLowerCase()))
  );

  const stats = getStats();

  return (
    <>
      <nav className="nav">
        <div className="nav-brand">ATG</div>
        {["exercises", "builder", "history", "stats"].map(t => (
          <button key={t} className={`nav-tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
            {t === "exercises" ? "Library" : t === "builder" ? "Builder" : t === "history" ? "History" : "Stats"}
          </button>
        ))}
      </nav>

      <div className="main">
        {/* LIBRARY */}
        <div className={`panel${tab === "exercises" ? " active" : ""}`}>
          <div className="hero"><h1>Exercise Library</h1><div className="hero-sub">ATG &middot; Mobility &middot; Strength</div></div>
          <div className="legend">
            <div className="leg"><div className="leg-dot" style={{ background: "var(--gym)" }} />Gym</div>
            <div className="leg"><div className="leg-dot" style={{ background: "var(--home)" }} />Home</div>
            <div className="leg"><div className="leg-dot" style={{ background: "var(--str)" }} />Strength</div>
            <div className="leg"><div className="leg-dot" style={{ background: "var(--mob)" }} />Mobility</div>
            <span style={{ fontSize: "10px", color: "var(--muted)", marginLeft: "auto" }}>Click any tag to edit</span>
          </div>
          <div className="filter-row">
            {[["all", ""], ["gym", "fg"], ["home", "fh"], ["strength", "fs"], ["mobility", "fm"]].map(([f, cls]) => (
              <button key={f} className={`fbtn ${cls}${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>{f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}</button>
            ))}
          </div>
          <table className="ex-table">
            <thead><tr><th>Exercise</th><th>Tags</th><th></th></tr></thead>
            <tbody>
              {filteredEx.map(ex => (
                <tr key={ex.id}>
                  <td style={{ fontSize: "12px" }}>{ex.name}</td>
                  <td>
                    <div className="tags-cell">
                      {ex.tags.map(t => (
                        <span key={t} className={`tag ${tClass(t)}`} style={{ cursor: "pointer" }} onClick={e => { e.stopPropagation(); setTagPopup({ exId: ex.id, x: e.clientX, y: e.clientY + 8 }); }}>{tLabel(t)}</span>
                      ))}
                      <span className="add-tag-btn" onClick={e => { e.stopPropagation(); setTagPopup({ exId: ex.id, x: e.clientX, y: e.clientY + 8 }); }}>+tag</span>
                    </div>
                  </td>
                  <td><button className="btn btn-danger" style={{ fontSize: 9, padding: "2px 6px" }} onClick={() => deleteExercise(ex.id)}>&times;</button></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Add exercise */}
          <div style={{ marginTop: 16 }}>
            {!addOpen ? (
              <button className="btn btn-add" style={{ fontSize: 10 }} onClick={() => setAddOpen(true)}>+ Add exercise</button>
            ) : (
              <div style={{ background: "var(--s1)", border: "1px solid var(--border)", borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>New Exercise</div>
                <input className="form-inp" style={{ width: "100%", marginBottom: 10 }} placeholder="Exercise name" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && addExercise()} autoFocus />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  {["gym","home","strength","mobility"].map(t => (
                    <label key={t} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, cursor: "pointer" }}>
                      <input type="checkbox" checked={newTags.includes(t)} onChange={e => setNewTags(prev => e.target.checked ? [...prev, t] : prev.filter(x => x !== t))} />
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </label>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-save" style={{ fontSize: 10 }} onClick={addExercise} disabled={!newName.trim()}>Add</button>
                  <button className="btn" style={{ fontSize: 10 }} onClick={() => { setAddOpen(false); setNewName(""); setNewTags([]); }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BUILDER */}
        <div className={`panel${tab === "builder" ? " active" : ""}`}>
          <div className="hero"><h1>Split Builder</h1><div className="hero-sub">Drag &middot; drop &middot; edit inline</div></div>
          <div className="note">Drag from pool into days. An exercise can appear in multiple days. Edit sets/reps inline. Save to history or export.</div>
          <div className="builder-layout">
            <div className="pool-wrap">
              <div className="pool-hdr"><span className="pool-title">Exercise pool</span><span className="pool-cnt">{poolEx.length}</span></div>
              <input className="pool-search" type="text" placeholder="Search..." value={poolSearch} onChange={e => setPoolSearch(e.target.value)} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "6px 6px 2px" }}>
                {[["all","All"],["gym","Gym"],["home","Home"],["strength","Str"],["mobility","Mob"]].map(([f, label]) => (
                  <button key={f} onClick={() => setPoolFilter(f)}
                    style={{ fontSize: 9, padding: "2px 7px", borderRadius: 3, border: `1px solid ${poolFilter === f ? "var(--border2)" : "var(--border)"}`, background: poolFilter === f ? "var(--s2)" : "transparent", color: poolFilter === f ? "var(--text)" : "var(--muted)", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="pool-list">
                {poolEx.map(ex => {
                  const used = useCount(ex.id);
                  return (
                    <div key={ex.id} className="chip" draggable
                      onDragStart={() => { dragRef.current = { type: "pool", exId: ex.id }; }}
                    >
                      <span className="chip-name">{ex.name}</span>
                      <div className="chip-tags">
                        {used > 0 && <span className="chip-usecount">{used}&times;</span>}
                        {ex.tags.map(t => <span key={t} className={`tag ${tClass(t)}`}>{tLabel(t)}</span>)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="days-hdr">
                <div className="days-title">Your Split</div>
                <div className="btns-row">
                  <button className="btn btn-add" onClick={addDay}>+ Day</button>
                  <button className="btn btn-save" onClick={() => { setSnapName(""); setModalOpen(true); }}>Save</button>
                  <button className="btn btn-pdf" onClick={exportPDF}>PDF</button>
                  <button className="btn btn-html" onClick={exportHTML}>Save as HTML</button>
                  <button className="btn btn-danger" onClick={clearDays}>Clear</button>
                </div>
              </div>
              <div className="days-grid">
                {days.map(day => (
                  <div key={day.id} className="day-card"
                    onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("drag-over"); }}
                    onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) e.currentTarget.classList.remove("drag-over"); }}
                    onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove("drag-over"); dropInto(day.id); }}
                  >
                    <div className="day-hdr">
                      <input className="day-num" type="number" value={day.num} min={1} max={99} onChange={e => updateDay(day.id, "num", e.target.value)} />
                      <input className="day-lbl" type="text" value={day.label} placeholder="focus..." onChange={e => updateDay(day.id, "label", e.target.value)} />
                      <select className={`env-sel env-${day.env}`} value={day.env} onChange={e => updateDay(day.id, "env", e.target.value)}>
                        <option value="gym">gym</option><option value="home">home</option><option value="mixed">mixed</option>
                      </select>
                      <button className="day-del" onClick={() => removeDay(day.id)}>&times;</button>
                    </div>
                    <div className="drop-zone">
                      {day.exercises.length === 0 ? (
                        <div className="drop-hint">Drop exercises here</div>
                      ) : day.exercises.map((item, idx) => {
                        const ex = exById(item.id);
                        if (!ex) return null;
                        const total = useCount(ex.id);
                        return (
                          <div key={`${day.id}-${idx}`} className="ex-row" draggable
                            onDragStart={e => { e.stopPropagation(); dragRef.current = { type: "day", exId: ex.id, fromDay: day.id, idx }; }}
                          >
                            <div className="ex-left">
                              <div className="ex-name">{ex.name}</div>
                              <div className="ex-tags-row">
                                {total > 1 && <span className="tag tag-dup">{total}&times;</span>}
                                {ex.tags.map(t => <span key={t} className={`tag ${tClass(t)}`}>{tLabel(t)}</span>)}
                              </div>
                            </div>
                            <input className="sets-inp" type="text" value={item.sets} placeholder="3x10" onChange={e => updateSets(day.id, idx, e.target.value)} />
                            <button className="ex-del" onClick={() => removeEx(day.id, idx)}>&times;</button>
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
        <div className={`panel${tab === "history" ? " active" : ""}`}>
          <div className="hero"><h1>Saved Programs</h1><div className="hero-sub">Click a program to expand &amp; edit sets/reps</div></div>
          <div className="btns-row" style={{ marginBottom: "1rem" }}>
            <button className="btn btn-danger" onClick={clearHistory}>Clear all</button>
          </div>
          {history.length === 0 ? (
            <div className="empty-state">No saved programs yet.<br />Build a split and hit &quot;Save&quot;.</div>
          ) : history.map(snap => (
            <HistoryCard
              key={snap.id}
              snap={snap}
              exById={exById}
              apiPath="/api/programs"
              onLoad={loadSnap}
              onDelete={deleteSnap}
              onUpdate={updated => setHistory(prev => prev.map(h => h.id === updated.id ? updated : h))}
              onPrint={id => {
                const s = history.find(h => h.id === id); if (!s) return;
                const prev = [...days]; const prevDc = dayCounter;
                setDays(JSON.parse(JSON.stringify(s.days))); setTab("builder");
                setTimeout(() => { window.print(); setTimeout(() => { setDays(prev); setDayCounter(prevDc); }, 600); }, 300);
              }}
              onExportHTML={exportSnapHTML}
            />
          ))}
        </div>

        {/* STATS */}
        <div className={`panel${tab === "stats" ? " active" : ""}`}>
          <div className="hero"><h1>Exercise Stats</h1><div className="hero-sub">Usage across all saved programs</div></div>
          <div className="stats-grid">
            {stats.used.length === 0 ? (
              <div className="empty-state">No stats yet.<br />Save some programs first.</div>
            ) : stats.used.map(id => {
              const ex = exById(id);
              if (!ex) return null;
              const cnt = stats.counts[id];
              const pct = Math.round((cnt / stats.max) * 100);
              const lastDates = (stats.dates[id] || []).slice(-5).reverse().map(d => new Date(d).toLocaleDateString("de-DE")).join(", ");
              return (
                <div key={id} className="stat-card">
                  <div className="stat-name">{ex.name}</div>
                  <div className="stat-bar-row"><div className="stat-bar"><div className="stat-fill" style={{ width: pct + "%" }} /></div><span className="stat-cnt">{cnt}&times;</span></div>
                  <div className="stat-dates">Used: {lastDates}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* TAG POPUP */}
      {tagPopup && (() => {
        const ex = exById(tagPopup.exId);
        if (!ex) return null;
        return (
          <div className="tag-popup" style={{ display: "flex", left: tagPopup.x, top: tagPopup.y }} onClick={e => e.stopPropagation()}>
            <div className="tag-popup-title">Edit tags</div>
            {(["gym", "home", "strength", "mobility"] as const).map(t => (
              <label key={t} className="tag-opt">
                <input type="checkbox" checked={ex.tags.includes(t)} onChange={() => {
                  const newTags = ex.tags.includes(t) ? ex.tags.filter(x => x !== t) : [...ex.tags, t];
                  updateTags(ex.id, newTags);
                }} />
                <span className={`tag ${tClass(t)}`}>{t === "gym" ? "G gym" : t === "home" ? "H home" : t.charAt(0).toUpperCase() + t.slice(1)}</span>
              </label>
            ))}
          </div>
        );
      })()}

      {/* SAVE MODAL */}
      <div className={`modal-bg${modalOpen ? " open" : ""}`}>
        <div className="modal">
          <h3>Save snapshot</h3>
          <input className="modal-inp" type="text" value={snapName} onChange={e => setSnapName(e.target.value)} placeholder="Program name..." autoFocus />
          <div className="modal-note">Saves the current split to history and logs usage in stats.</div>
          <div className="modal-btns">
            <button className="btn" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-save" onClick={saveSnapshot}>Save</button>
          </div>
        </div>
      </div>

      <div className="print-hdr">ATG &middot; Current Split</div>
    </>
  );
}
