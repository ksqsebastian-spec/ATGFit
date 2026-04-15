"use client";
import { useState, useEffect } from "react";
import UserContext, { User } from "./UserContext";

const AVATAR_COLORS = ["#9a6f1a","#2a72a8","#2a8a5a","#c05030","#8040a0","#c05070","#207080"];
const LS_KEY = "atgfit_user_id";

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function genHandle(name: string) {
  return name.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "").slice(0, 20) || "user";
}

function randColor() { return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]; }

export { initials };

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"create" | "signin">("create");
  const [nameInput, setNameInput] = useState("");
  const [handleInput, setHandleInput] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (!stored) { setLoading(false); return; }
    fetch(`/api/auth?userId=${stored}`)
      .then(r => r.json())
      .then(u => { if (u) setUser(u); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const createAccount = async () => {
    if (!nameInput.trim()) { setError("Enter your name"); return; }
    setSubmitting(true); setError("");
    const id = "u" + Date.now() + Math.random().toString(36).slice(2, 6);
    const handle = handleInput.trim() || genHandle(nameInput.trim());
    const avatar_color = randColor();
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "create", id, name: nameInput.trim(), handle, avatar_color }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error === "handle_taken" ? "Handle taken, try another" : "Error"); setSubmitting(false); return; }
    localStorage.setItem(LS_KEY, id);
    setUser(data); setSubmitting(false);
  };

  const signIn = async () => {
    if (!handleInput.trim()) { setError("Enter your handle"); return; }
    setSubmitting(true); setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "signin", handle: handleInput.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { setError("Account not found"); setSubmitting(false); return; }
    localStorage.setItem(LS_KEY, data.id);
    setUser(data); setSubmitting(false);
  };

  if (loading) return <div className="main"><div className="loading-state">Loading...</div></div>;

  if (!user) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "var(--s1)", border: "1px solid var(--border)", borderRadius: 12, padding: "2rem", width: "100%", maxWidth: 380 }}>
        <div style={{ fontFamily: "'Fraunces',serif", fontSize: "1.8rem", fontWeight: 600, marginBottom: 4 }}>ATGFit</div>
        <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "1.75rem" }}>Your fitness journal</div>

        <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem" }}>
          {(["create","signin"] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); }} className="btn"
              style={mode === m ? { color: "var(--accent)", borderColor: "var(--accent)", background: "var(--accent-bg)" } : {}}>
              {m === "create" ? "Create account" : "Sign in"}
            </button>
          ))}
        </div>

        {mode === "create" && (
          <>
            <label className="form-label">Your name</label>
            <input className="form-inp modal-inp" value={nameInput} onChange={e => { setNameInput(e.target.value); setHandleInput(genHandle(e.target.value)); }} placeholder="e.g. Sebastian" onKeyDown={e => e.key === "Enter" && createAccount()} style={{ display: "block", width: "100%", marginBottom: 12 }} />
            <label className="form-label">Handle</label>
            <div style={{ position: "relative", marginBottom: 12 }}>
              <span style={{ position: "absolute", left: 10, top: 9, fontSize: 12, color: "var(--muted)" }}>@</span>
              <input className="form-inp modal-inp" value={handleInput} onChange={e => setHandleInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} style={{ paddingLeft: 22, display: "block", width: "100%" }} placeholder="your_handle" />
            </div>
            {error && <div style={{ fontSize: 11, color: "var(--danger)", marginBottom: 8 }}>{error}</div>}
            <button className="btn btn-save" style={{ width: "100%" }} onClick={createAccount} disabled={submitting}>{submitting ? "Creating..." : "Create account"}</button>
          </>
        )}

        {mode === "signin" && (
          <>
            <label className="form-label">Your handle</label>
            <div style={{ position: "relative", marginBottom: 12 }}>
              <span style={{ position: "absolute", left: 10, top: 9, fontSize: 12, color: "var(--muted)" }}>@</span>
              <input className="form-inp modal-inp" value={handleInput} onChange={e => setHandleInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} style={{ paddingLeft: 22, display: "block", width: "100%" }} placeholder="your_handle" onKeyDown={e => e.key === "Enter" && signIn()} />
            </div>
            {error && <div style={{ fontSize: 11, color: "var(--danger)", marginBottom: 8 }}>{error}</div>}
            <button className="btn btn-save" style={{ width: "100%" }} onClick={signIn} disabled={submitting}>{submitting ? "Signing in..." : "Sign in"}</button>
          </>
        )}
      </div>
    </div>
  );

  return <UserContext.Provider value={user}><>{children}</></UserContext.Provider>;
}
