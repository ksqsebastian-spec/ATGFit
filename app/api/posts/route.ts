import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/posts?userId=xxx — feed: own posts + friends posts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json([]);
  const sql = getDb();

  const posts = await sql`
    SELECT wp.id, wp.user_id, wp.section, wp.title, wp.days, wp.created_at,
           u.name AS user_name, u.avatar_color, u.dog_id
    FROM workout_posts wp
    JOIN users u ON u.id = wp.user_id
    ORDER BY wp.created_at DESC
    LIMIT 50
  `;
  if (!posts.length) return NextResponse.json([]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const postIds = posts.map((p: any) => p.id);

  const [reactions, commentCounts] = await Promise.all([
    sql`SELECT post_id, emoji, COUNT(*)::int AS count,
               bool_or(user_id = ${userId}) AS reacted_by_me
        FROM post_reactions WHERE post_id = ANY(${postIds})
        GROUP BY post_id, emoji`,
    sql`SELECT post_id, COUNT(*)::int AS count
        FROM post_comments WHERE post_id = ANY(${postIds})
        GROUP BY post_id`,
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enriched = posts.map((p: any) => ({
    ...p,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reactions: reactions.filter((r: any) => r.post_id === p.id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    comment_count: (commentCounts.find((c: any) => c.post_id === p.id) as { count?: number })?.count ?? 0,
  }));

  return NextResponse.json(enriched);
}

// POST /api/posts — create post
export async function POST(request: Request) {
  const { id, userId, section, title, days } = await request.json();
  if (!id || !userId || !title) return NextResponse.json({ error: "id, userId, title required" }, { status: 400 });
  const sql = getDb();
  await sql`INSERT INTO workout_posts (id, user_id, section, title, days) VALUES (${id}, ${userId}, ${section ?? "atg"}, ${title}, ${JSON.stringify(days ?? [])})`;
  return NextResponse.json({ ok: true });
}

// DELETE /api/posts — delete own post
export async function DELETE(request: Request) {
  const { id, userId } = await request.json();
  if (!id || !userId) return NextResponse.json({ error: "required" }, { status: 400 });
  const sql = getDb();
  await sql`DELETE FROM workout_posts WHERE id = ${id} AND user_id = ${userId}`;
  return NextResponse.json({ ok: true });
}
