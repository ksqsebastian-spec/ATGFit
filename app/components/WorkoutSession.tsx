"use client";
import { useState, useEffect, useRef } from "react";
import { useUser } from "./UserContext";

interface ExSet { weight: string; reps: string; done: boolean; }
interface ActiveEx { id: string; name: string; targetSets: string; sets: ExSet[]; }
interface ActiveDay { num: number; label: string; exercises: ActiveEx[]; }
interface Program { id: string; name: string; days: { id: string; num: number; label: string; exercises: { id: string; name: string; sets: string; }[] }[] }

function parseSets(setsStr: string): ExSet[] {
  // "3×8 @60kg" or "4×12" or "3 sets" — extract count
  const m = setsStr.match(/^(\d+)/);
  const count = m ? parseInt(m[1]) : 3;
  const wM = setsStr.match(/@(\d+)/);
  const weight = wM ? wM[1] : "";
  const repsM = setsStr.match(/[×x](\d+)/);
  const reps = repsM ? repsM[1] : "";
  return Array.from({ length: count }, () => ({ weight, reps, done: false }));
}

function fmt(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

export default function WorkoutSession() {
  const user = useUser()!;
  const [atgPrograms, setAtgPrograms] = useState<Program[]>([]);
  const [bbPrograms, setBbPrograms] = useState<Program[]>([]);
  const [selectedSection, setSelectedSection] = useState<"atg" | "bodybuilding">("atg");
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [activeDay, setActiveDay] = useState<ActiveDay | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  useEffect(() => {
    Promise.all([
      fetch(`/api/programs?userId=${user.id}`).then(r => r.json()),
      fetch(`/api/bb-programs?userId=${user.id}`).then(r => r.json()),
    ]).then(([a, b]) => { setAtgPrograms(a); setBbPrograms(b); });
  }, [user.id]);

  const programs = selectedSection === "atg" ? atgPrograms : bbPrograms;

  const startDay = (day: Program["days"][0]) => {
    const activeExercises: ActiveEx[] = day.exercises.map(ex => ({
      id: ex.id, name: ex.name, targetSets: ex.sets,
      sets: parseSets(ex.sets),
    }));
    setActiveDay({ num: day.num, label: day.label, exercises: activeExercises });
    setElapsed(0); setFinished(false);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  };

  const toggleSet = (exIdx: number, setIdx: number) => {
    if (!activeDay) return;
    setActiveDay(prev => {
      if (!prev) return prev;
      const exs = prev.exercises.map((ex, i) => {
        if (i !== exIdx) return ex;
        const sets = ex.sets.map((s, j) => j === setIdx ? { ...s, done: !s.done } : s);
        return { ...ex, sets };
      });
      return { ...prev, exercises: exs };
    });
  };

  const updateSet = (exIdx: number, setIdx: number, field: "weight" | "reps", val: string) => {
    if (!activeDay) return;
    setActiveDay(prev => {
      if (!prev) return prev;
      const exs = prev.exercises.map((ex, i) => {
        if (i !== exIdx) return ex;
        const sets = ex.sets.map((s, j) => j === setIdx ? { ...s, [field]: val } : s);
        return { ...ex, sets };
      });
      return { ...prev, exercises: exs };
    });
  };

  const finishWorkout = async () => {
    if (!activeDay || !selectedProgram) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSaving(true);
    const logId = "wl" + Date.now();
    const exercises = activeDay.exercises.map(ex => ({
      name: ex.name, targetSets: ex.targetSets,
      sets: ex.sets.filter(s => s.done || s.weight || s.reps),
    }));
    await fetch("/api/workout-logs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: logId, userId: user.id,
        programId: selectedProgram.id, programName: selectedProgram.name,
        section: selectedSection, dayNum: activeDay.num, dayLabel: activeDay.label,
        exercises, durationS: elapsed,
      }),
    });
    // Post to social feed
    const postId = "wp" + Date.now();
    const title = `${selectedProgram.name} — Day ${activeDay.num}${activeDay.label ? " · " + activeDay.label : ""}`;
    const days = [{ id: activeDay.num.toString(), num: activeDay.num, label: activeDay.label, exercises: exercises.map(ex => ({ id: ex.name, name: ex.name, sets: ex.targetSets })) }];
    await fetch("/api/posts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: postId, userId: user.id, section: selectedSection, title, days }),
    });
    setSaving(false); setFinished(true);
  };

  const reset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setActiveDay(null); setSelectedProgram(null); setFinished(false); setElapsed(0);
  };

  // ---- Finished screen ----
  if (finished) {
    return (
      <div className="main" style={{ maxWidth: 480 }}>
        <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💪</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Workout done!</div>
          <div style={{ color: "var(--muted)", marginBottom: 24 }}>Duration: {fmt(elapsed)}</div>
          <button className="btn btn-save" onClick={reset}>Back to programs</button>
        </div>
      </div>
    );
  }

  // ---- Active session ----
  if (activeDay) {
    const totalSets = activeDay.exercises.reduce((a, ex) => a + ex.sets.length, 0);
    const doneSets = activeDay.exercises.reduce((a, ex) => a + ex.sets.filter(s => s.done).length, 0);
    const progress = totalSets > 0 ? (doneSets / totalSets) * 100 : 0;
    return (
      <div className="main" style={{ maxWidth: 480 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <button className="btn" style={{ fontSize: 10, padding: "4px 10px" }} onClick={reset}>← Back</button>
          <div style={{ fontSize: 12, fontWeight: 700 }}>Day {activeDay.num}{activeDay.label ? " · " + activeDay.label : ""}</div>
          <div style={{ fontFamily: "monospace", fontSize: 14, color: "var(--accent)" }}>{fmt(elapsed)}</div>
        </div>
        <div style={{ height: 4, background: "var(--border)", borderRadius: 2, marginBottom: 20 }}>
          <div style={{ height: 4, background: "var(--accent)", borderRadius: 2, width: `${progress}%`, transition: "width 0.3s" }} />
        </div>
        {activeDay.exercises.map((ex, exIdx) => (
          <div key={ex.id} className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13 }}>{ex.name}</div>
            <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 8 }}>Target: {ex.targetSets}</div>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr auto", gap: "6px 8px", alignItems: "center", fontSize: 11 }}>
              <div style={{ color: "var(--muted)", fontSize: 10 }}>SET</div>
              <div style={{ color: "var(--muted)", fontSize: 10 }}>KG</div>
              <div style={{ color: "var(--muted)", fontSize: 10 }}>REPS</div>
              <div></div>
              {ex.sets.map((s, setIdx) => (
                <>
                  <div key={`lbl-${setIdx}`} style={{ color: s.done ? "var(--accent)" : "var(--muted)", fontWeight: 700 }}>{setIdx + 1}</div>
                  <input key={`w-${setIdx}`}
                    className="form-inp" style={{ padding: "4px 6px", fontSize: 11, opacity: s.done ? 0.5 : 1 }}
                    placeholder="—" value={s.weight}
                    onChange={e => updateSet(exIdx, setIdx, "weight", e.target.value)} />
                  <input key={`r-${setIdx}`}
                    className="form-inp" style={{ padding: "4px 6px", fontSize: 11, opacity: s.done ? 0.5 : 1 }}
                    placeholder="—" value={s.reps}
                    onChange={e => updateSet(exIdx, setIdx, "reps", e.target.value)} />
                  <button key={`chk-${setIdx}`}
                    onClick={() => toggleSet(exIdx, setIdx)}
                    style={{ width: 26, height: 26, borderRadius: 6, border: `2px solid ${s.done ? "var(--accent)" : "var(--border)"}`, background: s.done ? "var(--accent)" : "transparent", color: s.done ? "#fff" : "var(--muted)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {s.done ? "✓" : ""}
                  </button>
                </>
              ))}
            </div>
          </div>
        ))}
        <button className="btn btn-save" style={{ width: "100%", marginTop: 8 }} onClick={finishWorkout} disabled={saving}>
          {saving ? "Saving..." : "Finish workout"}
        </button>
      </div>
    );
  }

  // ---- Program + day picker ----
  return (
    <div className="main" style={{ maxWidth: 480 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button className={`btn${selectedSection === "atg" ? " btn-save" : ""}`} style={{ flex: 1 }} onClick={() => { setSelectedSection("atg"); setSelectedProgram(null); }}>ATG</button>
        <button className={`btn${selectedSection === "bodybuilding" ? " btn-save" : ""}`} style={{ flex: 1 }} onClick={() => { setSelectedSection("bodybuilding"); setSelectedProgram(null); }}>Bodybuilding</button>
      </div>
      {programs.length === 0 && (
        <div className="empty-state">No saved {selectedSection === "atg" ? "ATG" : "Bodybuilding"} programs yet.</div>
      )}
      {programs.map(p => (
        <div key={p.id} className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>{p.name}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(p.days || []).map(day => (
              <button key={day.id} className="btn" style={{ fontSize: 11, padding: "5px 12px" }} onClick={() => { setSelectedProgram(p); startDay(day); }}>
                Day {day.num}{day.label ? " · " + day.label : ""}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
