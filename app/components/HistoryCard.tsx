"use client";
import { useState } from "react";
import { Exercise, Program, Day } from "./types";

interface Props {
  snap: Program;
  exById: (id: string) => Exercise | undefined;
  apiPath: string;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (updated: Program) => void;
  onPrint?: (id: string) => void;
  onExportHTML?: (id: string) => void;
  accentColor?: string;
}

export default function HistoryCard({ snap, exById, apiPath, onLoad, onDelete, onUpdate, onPrint, onExportHTML, accentColor = "var(--accent)" }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [localDays, setLocalDays] = useState<Day[]>(() => JSON.parse(JSON.stringify(snap.days || [])));
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  const d = new Date(snap.created_at);
  const ds = d.toLocaleDateString("de-DE") + " " + d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  const updateSets = (dayId: string, idx: number, val: string) => {
    setLocalDays(prev => prev.map(day => {
      if (day.id !== dayId) return day;
      const exs = [...day.exercises];
      if (exs[idx]) exs[idx] = { ...exs[idx], sets: val };
      return { ...day, exercises: exs };
    }));
    setStatus("idle");
  };

  const saveChanges = async () => {
    setStatus("saving");
    const updated = { ...snap, days: localDays };
    await fetch(apiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: snap.id, name: snap.name, days: localDays }),
    });
    onUpdate(updated);
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  };

  return (
    <div className="hist-card">
      <div className="hist-hdr">
        <div style={{ cursor: "pointer", flex: 1 }} onClick={() => setExpanded(v => !v)}>
          <div className="hist-name">
            {snap.name}
            <span style={{ fontSize: 9, color: "var(--muted)", marginLeft: 6 }}>{expanded ? "▲" : "▼"}</span>
          </div>
          <div className="hist-meta">{ds} &middot; {(snap.days || []).length} days</div>
        </div>
        <div className="btns-row">
          <button className="btn" onClick={() => onLoad(snap.id)}>Load</button>
          {onPrint && <button className="btn btn-pdf" onClick={() => onPrint(snap.id)}>PDF</button>}
          {onExportHTML && <button className="btn btn-html" onClick={() => onExportHTML(snap.id)}>HTML</button>}
          <button className="btn btn-danger" onClick={() => onDelete(snap.id)}>&times;</button>
        </div>
      </div>

      {/* Collapsed pill view */}
      {!expanded && (
        <div className="hist-body">
          <div className="hist-days">
            {localDays.map((day, i) => (
              <div key={i} className="hist-pill">
                <strong>Day {day.num}{day.label ? " \u00b7 " + day.label : ""}</strong><br />
                <span style={{ fontSize: 9 }}>{day.exercises.map(e => exById(e.id)?.name || e.id).join(", ") || "\u2014"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expanded editable view */}
      {expanded && (
        <div className="hist-body">
          {localDays.map(day => (
            <div key={day.id} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", paddingBottom: 5, borderBottom: "1px solid var(--border)", marginBottom: 5 }}>
                Day {day.num}{day.label ? " \u00b7 " + day.label : ""}
                {day.env && <span style={{ marginLeft: 8, fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "var(--s2)", border: "1px solid var(--border)" }}>{day.env}</span>}
              </div>
              {day.exercises.length === 0
                ? <div style={{ fontSize: 11, color: "var(--faint)", padding: "4px 0" }}>No exercises</div>
                : day.exercises.map((item, idx) => {
                    const ex = exById(item.id);
                    return (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
                        <span style={{ flex: 1, fontSize: 11, color: "var(--text)" }}>{ex?.name || item.id}</span>
                        <input
                          className="sets-inp"
                          type="text"
                          value={item.sets || ""}
                          placeholder="3\u00d710"
                          onChange={e => updateSets(day.id, idx, e.target.value)}
                        />
                      </div>
                    );
                  })}
            </div>
          ))}
          <div style={{ paddingTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className="btn btn-save"
              onClick={saveChanges}
              disabled={status === "saving"}
              style={{ opacity: status === "saving" ? 0.7 : 1 }}
            >
              {status === "saving" ? "Saving..." : status === "saved" ? "Saved \u2713" : "Save changes"}
            </button>
            {status === "saved" && <span style={{ fontSize: 10, color: "#2a8a5a" }}>Changes saved to database</span>}
          </div>
        </div>
      )}
    </div>
  );
}
