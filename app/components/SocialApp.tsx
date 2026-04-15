"use client";
import { useState, useEffect, useCallback } from "react";
import { useUser } from "./UserContext";
import { initials } from "./AuthGate";
import UserProfileModal from "./UserProfileModal";

const EMOJIS = ["💪","🔥","❤️","🙌","😅","👏"];

interface Reaction { emoji: string; count: number; reacted_by_me: boolean; }
interface Comment { id: string; text: string; created_at: string; user_name: string; avatar_color: string; }
interface FeedPost {
  id: string; user_id: string; user_name: string; avatar_color: string; dog_id: number;
  section: string; title: string; days: EnrichedDay[]; created_at: string;
  reactions: Reaction[]; comment_count: number;
}
interface EnrichedDay { id: string; num: number; label: string; exercises: { id: string; name: string; sets: string; }[]; }

function Avatar({ name, color, small, onClick }: { name: string; color: string; small?: boolean; onClick?: () => void }) {
  return (
    <div className={`avatar${small ? " avatar-sm" : ""}`} style={{ background: color, cursor: onClick ? "pointer" : undefined }} onClick={onClick}>
      {initials(name)}
    </div>
  );
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  return new Date(dateStr).toLocaleDateString("de-DE");
}

function PostCard({ post, userId, onDelete, onReactionChange, onProfileClick }: {
  post: FeedPost; userId: string;
  onDelete: (id: string) => void;
  onReactionChange: (postId: string, emoji: string, action: string) => void;
  onProfileClick: (userId: string) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [showAllDays, setShowAllDays] = useState(false);

  const loadComments = async () => {
    setLoadingComments(true);
    const rows = await fetch(`/api/posts/${post.id}/comments`).then(r => r.json());
    setComments(rows); setLoadingComments(false);
  };

  const toggleComments = () => {
    if (!showComments) loadComments();
    setShowComments(v => !v);
  };

  const addComment = async () => {
    if (!commentText.trim()) return;
    const id = "c" + Date.now();
    const data = await fetch(`/api/posts/${post.id}/comments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, userId, text: commentText.trim() }),
    }).then(r => r.json());
    setComments(prev => [...prev, data]);
    setCommentText("");
  };

  const deleteComment = async (commentId: string) => {
    await fetch(`/api/posts/${post.id}/comments`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId, userId }),
    });
    setComments(prev => prev.filter(c => c.id !== commentId));
  };

  const react = async (emoji: string) => {
    const res = await fetch(`/api/posts/${post.id}/reactions`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, emoji }),
    }).then(r => r.json());
    onReactionChange(post.id, emoji, res.action);
  };

  const visibleDays = showAllDays ? post.days : (post.days || []).slice(0, 2);

  return (
    <div className="feed-post">
      <div className="feed-post-hdr">
        <Avatar name={post.user_name} color={post.avatar_color} onClick={() => onProfileClick(post.user_id)} />
        <div className="feed-post-meta">
          <div className="feed-user-name" style={{ cursor: "pointer" }} onClick={() => onProfileClick(post.user_id)}>
            {post.user_name}
            <span className={`section-badge section-badge-${post.section}`} style={{ marginLeft: 6 }}>{post.section === "atg" ? "ATG" : "BB"}</span>
          </div>
          <div className="feed-post-time">{timeAgo(post.created_at)}</div>
        </div>
        {post.user_id === userId && (
          <button className="btn btn-danger" style={{ padding: "3px 8px", fontSize: 10 }} onClick={() => onDelete(post.id)}>&times;</button>
        )}
      </div>

      <div className="feed-post-body">
        <div className="feed-post-title">{post.title}</div>
        {visibleDays.map((day, i) => (
          <div key={i} className="feed-day">
            <div className="feed-day-hdr">Day {day.num}{day.label ? " · " + day.label : ""}</div>
            {(day.exercises || []).slice(0, 4).map((ex, j) => (
              <div key={j} className="feed-ex-row">
                <span>{ex.name}</span>
                <span className="feed-ex-sets">{ex.sets || "—"}</span>
              </div>
            ))}
            {day.exercises.length > 4 && <div style={{ fontSize: 10, color: "var(--muted)", paddingTop: 2 }}>+{day.exercises.length - 4} more exercises</div>}
          </div>
        ))}
        {(post.days || []).length > 2 && (
          <button className="btn" style={{ fontSize: 9, padding: "3px 8px", marginTop: 4 }} onClick={() => setShowAllDays(v => !v)}>
            {showAllDays ? "Show less" : `+${post.days.length - 2} more days`}
          </button>
        )}
      </div>

      <div className="reaction-bar">
        {EMOJIS.map(emoji => {
          const r = post.reactions.find(x => x.emoji === emoji);
          return (
            <button key={emoji} className={`reaction-btn${r?.reacted_by_me ? " reacted" : ""}`} onClick={() => react(emoji)}>
              {emoji}{r && r.count > 0 && <span className="reaction-count">{r.count}</span>}
            </button>
          );
        })}
        <button className="btn" style={{ marginLeft: "auto", fontSize: 10, padding: "4px 10px" }} onClick={toggleComments}>
          💬 {post.comment_count > 0 ? post.comment_count : ""} {showComments ? "Hide" : "Comments"}
        </button>
      </div>

      {showComments && (
        <div className="comments-section">
          {loadingComments && <div style={{ fontSize: 11, color: "var(--muted)" }}>Loading...</div>}
          {comments.map(c => (
            <div key={c.id} className="comment-row">
              <Avatar name={c.user_name} color={c.avatar_color} small />
              <div className="comment-text-wrap">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="comment-author">{c.user_name}</span>
                  <span className="comment-time">{timeAgo(c.created_at)}</span>
                </div>
                <div className="comment-text">{c.text}</div>
              </div>
              {c.user_name === post.user_name && (
                <button className="btn btn-danger" style={{ fontSize: 9, padding: "2px 6px" }} onClick={() => deleteComment(c.id)}>&times;</button>
              )}
            </div>
          ))}
          <div className="comment-input-row">
            <input className="comment-inp" value={commentText} onChange={e => setCommentText(e.target.value)}
              placeholder="Write a comment..." onKeyDown={e => e.key === "Enter" && addComment()} />
            <button className="btn btn-save" style={{ fontSize: 10, padding: "5px 10px" }} onClick={addComment}>Post</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SocialApp() {
  const user = useUser()!;
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    const f = await fetch(`/api/posts?userId=${user.id}`).then(r => r.json());
    setFeed(f); setLoading(false);
  }, [user.id]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const deletePost = async (postId: string) => {
    await fetch("/api/posts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: postId, userId: user.id }) });
    setFeed(prev => prev.filter(p => p.id !== postId));
  };

  const handleReaction = (postId: string, emoji: string, action: string) => {
    setFeed(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const existing = p.reactions.find(r => r.emoji === emoji);
      if (action === "added") {
        if (existing) return { ...p, reactions: p.reactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, reacted_by_me: true } : r) };
        return { ...p, reactions: [...p.reactions, { emoji, count: 1, reacted_by_me: true }] };
      } else {
        return { ...p, reactions: p.reactions.map(r => r.emoji === emoji ? { ...r, count: Math.max(0, r.count - 1), reacted_by_me: false } : r).filter(r => r.count > 0 || r.reacted_by_me) };
      }
    }));
  };

  if (loading) return <div className="main"><div className="loading-state">Loading feed...</div></div>;

  return (
    <div className="main" style={{ maxWidth: 680 }}>
      {profileUserId && <UserProfileModal userId={profileUserId} onClose={() => setProfileUserId(null)} />}

      {/* Profile */}
      <div className="social-profile-bar" style={{ cursor: "pointer" }} onClick={() => setProfileUserId(user.id)}>
        <Avatar name={user.name} color={user.avatar_color} />
        <div className="profile-info">
          <div className="profile-name">{user.name}</div>
          <div className="profile-handle">@{user.handle}</div>
          <div className="profile-stats">
            <div className="profile-stat"><strong>{feed.filter(p => p.user_id === user.id).length}</strong> workouts</div>
          </div>
        </div>
        <button className="btn btn-danger" style={{ fontSize: 10 }} onClick={e => { e.stopPropagation(); localStorage.removeItem("atgfit_user_id"); window.location.reload(); }}>Sign out</button>
      </div>

      {/* Feed */}
      <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>Feed</div>
      {feed.length === 0
        ? <div className="empty-state">No workouts yet.<br />Finish a workout session to post here.</div>
        : feed.map(post => (
            <PostCard key={post.id} post={post} userId={user.id} onDelete={deletePost} onReactionChange={handleReaction} onProfileClick={setProfileUserId} />
          ))}
    </div>
  );
}
