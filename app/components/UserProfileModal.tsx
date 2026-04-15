"use client";
import { useState, useEffect } from "react";
import { useUser } from "./UserContext";
import PixelDog from "./PixelDog";
import { initials } from "./AuthGate";

interface TopLift { name: string; weight: number; }
interface ProfileData {
  id: string; name: string; handle: string; avatar_color: string;
  dog_id: number; bio: string; topLifts: TopLift[];
}

function Avatar({ name, color }: { name: string; color: string }) {
  return <div className="avatar" style={{ background: color, width: 44, height: 44, fontSize: 14 }}>{initials(name)}</div>;
}

export default function UserProfileModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const me = useUser()!;
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [editing, setEditing] = useState(false);
  const [bioText, setBioText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/users/${userId}`).then(r => r.json()).then(d => {
      setProfile(d); setBioText(d.bio ?? "");
    });
  }, [userId]);

  const saveBio = async () => {
    if (!profile) return;
    setSaving(true);
    await fetch(`/api/users/${userId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio: bioText, callerId: me.id }),
    });
    setProfile(prev => prev ? { ...prev, bio: bioText } : prev);
    setSaving(false); setEditing(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, maxWidth: 380, width: "100%", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        {!profile ? (
          <div style={{ color: "var(--muted)", textAlign: "center", padding: 24 }}>Loading...</div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 20, lineHeight: 1 }} onClick={onClose}>&times;</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
              <PixelDog dogId={profile.dog_id ?? 0} size={8} />
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar name={profile.name} color={profile.avatar_color} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{profile.name}</div>
                  <div style={{ color: "var(--muted)", fontSize: 11 }}>@{profile.handle}</div>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>Bio</div>
              {me.id === userId && editing ? (
                <div>
                  <textarea
                    style={{ width: "100%", background: "var(--s1)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--fg)", fontSize: 12, padding: "8px 10px", resize: "vertical", minHeight: 70 }}
                    value={bioText} onChange={e => setBioText(e.target.value)} maxLength={200} />
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <button className="btn btn-save" style={{ fontSize: 10, padding: "4px 12px" }} onClick={saveBio} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
                    <button className="btn" style={{ fontSize: 10, padding: "4px 12px" }} onClick={() => { setEditing(false); setBioText(profile.bio ?? ""); }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ fontSize: 12, color: profile.bio ? "var(--fg)" : "var(--muted)", flex: 1 }}>{profile.bio || (me.id === userId ? "No bio yet." : "—")}</div>
                  {me.id === userId && <button className="btn" style={{ fontSize: 9, padding: "3px 8px", flexShrink: 0 }} onClick={() => setEditing(true)}>Edit</button>}
                </div>
              )}
            </div>

            {/* Top 5 lifts */}
            <div>
              <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>Top Lifts</div>
              {profile.topLifts.length === 0 ? (
                <div style={{ fontSize: 11, color: "var(--muted)" }}>No logged workouts yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {profile.topLifts.map((lift, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--s1)", border: "1px solid var(--border)", borderRadius: 6, padding: "7px 12px" }}>
                      <span style={{ fontSize: 12 }}>{lift.name}</span>
                      <span style={{ fontWeight: 700, fontSize: 13, color: "var(--accent)" }}>{lift.weight} kg</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
