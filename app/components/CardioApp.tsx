"use client";
import { useState, useEffect } from "react";

interface PlanMeta { sessions_per_week: number; long_run_session: number | null; }
interface CardioPlan { id: string; name: string; activity: string; base_distance: number; unit: string; weeks_completed: number[]; metadata: PlanMeta; created_at: string; }
interface HiitLog { id: string; protocol: string; duration_min: number | null; notes: string | null; logged_at: string; }

const ACTIVITY_ICON: Record<string, string> = { run: "🏃", swim: "🏊", bike: "🚴", "12330": "🏔️" };
const ACTIVITY_LABEL: Record<string, string> = { run: "Run", swim: "Swim", bike: "Bike", "12330": "12/3/30" };

const HIIT_PROTOCOLS = [
  { name: "Tabata", detail: "20s work / 10s rest · 8 rounds · 4 min per exercise" },
  { name: "Classic HIIT", detail: "30s work / 30s rest · 10 rounds · 10 min" },
  { name: "Sprint Intervals", detail: "60s work / 120s rest · 6 rounds · 18 min" },
  { name: "Pyramid", detail: "10/20/30/40/30/20/10s work, equal rest · 7 rounds" },
];

const NUM_WEEKS = 12;

function weekTotal(base: number, week: number) {
  return +(base * Math.pow(1.1, week - 1)).toFixed(2);
}

function sessionSplit(total: number, sessions: number, longRunSession: number | null) {
  if (!longRunSession || sessions <= 1) {
    const each = +(total / sessions).toFixed(2);
    return Array.from({ length: sessions }, (_, i) => ({ label: `Session ${i + 1}`, dist: each, isLong: false }));
  }
  const longDist = +(total * 0.4).toFixed(2);
  const otherDist = +((total - longDist) / (sessions - 1)).toFixed(2);
  return Array.from({ length: sessions }, (_, i) => {
    const n = i + 1;
    const isLong = n === longRunSession;
    return { label: isLong ? "Long Run" : `Run ${n <= longRunSession ? n : n - 1}`, dist: isLong ? longDist : otherDist, isLong };
  });
}

export default function CardioApp() {
  const [subtab, setSubtab] = useState<"aerobic" | "hiit">("aerobic");
  const [plans, setPlans] = useState<CardioPlan[]>([]);
  const [logs, setLogs] = useState<HiitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showHiitForm, setShowHiitForm] = useState(false);

  const [planName, setPlanName] = useState("");
  const [planActivity, setPlanActivity] = useState("run");
  const [planBase, setPlanBase] = useState("");
  const [planUnit, setPlanUnit] = useState("km");
  const [planSessions, setPlanSessions] = useState("3");
  const [planLongRun, setPlanLongRun] = useState("3");

  const [hiitProtocol, setHiitProtocol] = useState(HIIT_PROTOCOLS[0].name);
  const [hiitDuration, setHiitDuration] = useState("");
  const [hiitNotes, setHiitNotes] = useState("");

  useEffect(() => {
    fetch("/api/cardio").then(r => r.json())
      .then(({ plans, logs }) => { setPlans(plans); setLogs(logs); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const createPlan = async () => {
    const is12330 = planActivity === "12330";
    if (!planName.trim() || (!is12330 && !planBase)) return;
    const sessions = parseInt(planSessions) || 3;
    const longRun = (!is12330 && planActivity === "run" && planLongRun) ? parseInt(planLongRun) : null;
    const meta: PlanMeta = { sessions_per_week: sessions, long_run_session: longRun };
    const plan: CardioPlan = {
      id: "c" + Date.now(), name: planName.trim(), activity: planActivity,
      base_distance: is12330 ? 0 : parseFloat(planBase),
      unit: planUnit, weeks_completed: [], metadata: meta, created_at: new Date().toISOString(),
    };
    setPlans(prev => [plan, ...prev]);
    setShowPlanForm(false); setPlanName(""); setPlanBase("");
    await fetch("/api/cardio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "plan", ...plan, metadata: meta }) });
  };

  const deletePlan = async (id: string) => {
    setPlans(prev => prev.filter(p => p.id !== id));
    await fetch("/api/cardio", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, type: "plan" }) });
  };

  const toggleWeek = async (plan: CardioPlan, week: number) => {
    const wc = plan.weeks_completed.includes(week) ? plan.weeks_completed.filter(w => w !== week) : [...plan.weeks_completed, week];
    setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, weeks_completed: wc } : p));
    await fetch("/api/cardio", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: plan.id, weeks_completed: wc }) });
  };

  const logHiit = async () => {
    const log: HiitLog = { id: "h" + Date.now(), protocol: hiitProtocol, duration_min: hiitDuration ? parseInt(hiitDuration) : null, notes: hiitNotes.trim() || null, logged_at: new Date().toISOString() };
    setLogs(prev => [log, ...prev]);
    setShowHiitForm(false); setHiitDuration(""); setHiitNotes("");
    await fetch("/api/cardio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "hiit", ...log }) });
  };

  const deleteLog = async (id: string) => {
    setLogs(prev => prev.filter(l => l.id !== id));
    await fetch("/api/cardio", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, type: "hiit" }) });
  };

  if (loading) return <div className="main"><div className="loading-state">Loading...</div></div>;

  const sessCount = parseInt(planSessions) || 3;
  const longRunOpts = Array.from({ length: sessCount }, (_, i) => i + 1);

  return (
    <>
      <nav className="nav">
        <div className="nav-brand" style={{ color: "#60c080" }}>Cardio</div>
        <button className={`nav-tab${subtab === "aerobic" ? " active" : ""}`} onClick={() => setSubtab("aerobic")} style={subtab === "aerobic" ? { color: "#60c080", borderBottomColor: "#60c080" } : {}}>Aerobic</button>
        <button className={`nav-tab${subtab === "hiit" ? " active" : ""}`} onClick={() => setSubtab("hiit")} style={subtab === "hiit" ? { color: "#60c080", borderBottomColor: "#60c080" } : {}}>HIIT</button>
      </nav>

      <div className="main">
        {/* ── AEROBIC ── */}
        {subtab === "aerobic" && (
          <div>
            <div className="hero"><h1>Aerobic Training</h1><div className="hero-sub">Progressive overload · 10% weekly increase</div></div>

            <div className="btns-row" style={{ marginBottom: "1.25rem" }}>
              <button className="btn btn-add" onClick={() => setShowPlanForm(v => !v)}>+ New Plan</button>
            </div>

            {showPlanForm && (
              <div className="form-card">
                <h3>New Aerobic Plan</h3>

                {/* Row 1 */}
                <div className="form-row" style={{ alignItems: "flex-end" }}>
                  <div>
                    <label className="form-label">Plan name</label>
                    <input className="form-inp" style={{ width: 200 }} value={planName} onChange={e => setPlanName(e.target.value)} placeholder="e.g. Spring Running" />
                  </div>
                  <div>
                    <label className="form-label">Activity</label>
                    <select className="form-sel" value={planActivity} onChange={e => { setPlanActivity(e.target.value); }}>
                      <option value="run">🏃 Run</option>
                      <option value="swim">🏊 Swim</option>
                      <option value="bike">🚴 Bike</option>
                      <option value="12330">🏔️ 12/3/30</option>
                    </select>
                  </div>
                </div>

                {/* Row 2 — distance only for non-12330 */}
                {planActivity !== "12330" ? (
                  <div className="form-row" style={{ alignItems: "flex-end" }}>
                    <div>
                      <label className="form-label">Weekly distance (week 1)</label>
                      <div style={{ display: "flex", gap: 4 }}>
                        <input className="form-inp" style={{ width: 80 }} type="number" min="0" step="0.5" value={planBase} onChange={e => setPlanBase(e.target.value)} placeholder="15" />
                        <select className="form-sel" value={planUnit} onChange={e => setPlanUnit(e.target.value)}>
                          <option value="km">km</option>
                          <option value="mi">mi</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Sessions / week</label>
                      <input className="form-inp" style={{ width: 60 }} type="number" min="1" max="7" value={planSessions} onChange={e => setPlanSessions(e.target.value)} />
                    </div>
                    {planActivity === "run" && (
                      <div>
                        <label className="form-label">Long run session #</label>
                        <select className="form-sel" value={planLongRun} onChange={e => setPlanLongRun(e.target.value)}>
                          <option value="">None</option>
                          {longRunOpts.map(n => <option key={n} value={n}>Session {n}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="form-row" style={{ alignItems: "flex-end" }}>
                    <div>
                      <label className="form-label">Sessions / week</label>
                      <input className="form-inp" style={{ width: 60 }} type="number" min="1" max="7" value={planSessions} onChange={e => setPlanSessions(e.target.value)} />
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", paddingBottom: 8 }}>
                      12% incline · 3 mph · 30 min per session
                    </div>
                  </div>
                )}

                <div className="modal-btns" style={{ justifyContent: "flex-start" }}>
                  <button className="btn btn-add" onClick={createPlan}>Create Plan</button>
                  <button className="btn" onClick={() => setShowPlanForm(false)}>Cancel</button>
                </div>
              </div>
            )}

            {plans.length === 0 && !showPlanForm && (
              <div className="empty-state">No plans yet.<br />Create one to get started.</div>
            )}

            <div className="cardio-grid">
              {plans.map(plan => {
                const meta: PlanMeta = plan.metadata || { sessions_per_week: 1, long_run_session: null };
                const sessions = meta.sessions_per_week || 1;
                const longRun = meta.long_run_session || null;
                const done = plan.weeks_completed.length;
                const is12330 = plan.activity === "12330";

                return (
                  <div key={plan.id} className="cardio-card" style={{ gridColumn: "span 1" }}>
                    <div className="cardio-hdr">
                      <div>
                        <div className="cardio-title">{ACTIVITY_ICON[plan.activity]} {plan.name}</div>
                        <div className="cardio-meta">
                          {is12330
                            ? `${sessions}× /week · 12% · 3mph · 30min`
                            : `${plan.base_distance} ${plan.unit}/wk · ${sessions} sessions${longRun ? ` · long run: S${longRun}` : ""}`}
                          {" "}· {done}/{NUM_WEEKS} weeks done
                        </div>
                      </div>
                      <button className="btn btn-danger" style={{ padding: "4px 8px", fontSize: 10 }} onClick={() => deletePlan(plan.id)}>&times;</button>
                    </div>

                    {/* Progress bar */}
                    <div style={{ padding: "8px 14px 0", display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 4, background: "var(--s3)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(done / NUM_WEEKS) * 100}%`, background: "#60c080", borderRadius: 2, transition: "width .3s" }} />
                      </div>
                      <span style={{ fontSize: 10, color: "var(--muted)" }}>{Math.round((done / NUM_WEEKS) * 100)}%</span>
                    </div>

                    <div className="cardio-body">
                      <table className="week-table">
                        <thead>
                          <tr>
                            <th>Wk</th>
                            {is12330 ? <th>Sessions</th> : <th>Total</th>}
                            {!is12330 && <th style={{ minWidth: 160 }}>Breakdown</th>}
                            <th>✓</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: NUM_WEEKS }, (_, i) => i + 1).map(w => {
                            const isDone = plan.weeks_completed.includes(w);
                            if (is12330) {
                              return (
                                <tr key={w} className={isDone ? "done" : ""}>
                                  <td>{w}</td>
                                  <td>{sessions} × 30 min</td>
                                  <td><input type="checkbox" className="week-check" checked={isDone} onChange={() => toggleWeek(plan, w)} /></td>
                                </tr>
                              );
                            }
                            const total = weekTotal(plan.base_distance, w);
                            const splits = sessionSplit(total, sessions, longRun);
                            return (
                              <tr key={w} className={isDone ? "done" : ""}>
                                <td>{w}</td>
                                <td style={{ fontWeight: 500 }}>{total} {plan.unit}</td>
                                <td>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 8px" }}>
                                    {splits.map((s, i) => (
                                      <span key={i} style={{ fontSize: 10, color: s.isLong ? "#2a8a5a" : "var(--muted)", fontWeight: s.isLong ? 600 : 400 }}>
                                        {s.label}: {s.dist}{plan.unit}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td><input type="checkbox" className="week-check" checked={isDone} onChange={() => toggleWeek(plan, w)} /></td>
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

        {/* ── HIIT ── */}
        {subtab === "hiit" && (
          <div>
            <div className="hero"><h1>HIIT Training</h1><div className="hero-sub">High intensity interval protocols</div></div>

            <div className="btns-row" style={{ marginBottom: "1.25rem" }}>
              <button className="btn btn-add" onClick={() => setShowHiitForm(v => !v)}>+ Log Session</button>
            </div>

            {showHiitForm && (
              <div className="form-card">
                <h3>Log HIIT Session</h3>
                <div className="form-row" style={{ alignItems: "flex-end" }}>
                  <div>
                    <label className="form-label">Protocol</label>
                    <select className="form-sel" value={hiitProtocol} onChange={e => setHiitProtocol(e.target.value)}>
                      {HIIT_PROTOCOLS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Duration (min)</label>
                    <input className="form-inp" style={{ width: 70 }} type="number" min="1" value={hiitDuration} onChange={e => setHiitDuration(e.target.value)} placeholder="20" />
                  </div>
                  <div>
                    <label className="form-label">Notes</label>
                    <input className="form-inp" style={{ width: 200 }} value={hiitNotes} onChange={e => setHiitNotes(e.target.value)} placeholder="Optional..." />
                  </div>
                </div>
                <div className="modal-btns" style={{ justifyContent: "flex-start" }}>
                  <button className="btn btn-save" onClick={logHiit}>Log Session</button>
                  <button className="btn" onClick={() => setShowHiitForm(false)}>Cancel</button>
                </div>
              </div>
            )}

            <div className="hiit-protocols">
              {HIIT_PROTOCOLS.map(p => (
                <div key={p.name} className="protocol-card">
                  <div className="protocol-name">⚡ {p.name}</div>
                  <div className="protocol-detail">{p.detail}</div>
                  <button className="btn btn-save" style={{ fontSize: 10, padding: "5px 12px" }} onClick={() => { setHiitProtocol(p.name); setShowHiitForm(true); }}>Log this</button>
                </div>
              ))}
            </div>

            {logs.length > 0 && (
              <div style={{ marginTop: "2rem" }}>
                <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.75rem" }}>Session History</div>
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
                    <button className="btn btn-danger" style={{ padding: "3px 8px", fontSize: 10 }} onClick={() => deleteLog(log.id)}>&times;</button>
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
