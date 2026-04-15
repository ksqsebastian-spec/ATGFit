import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/friends?userId=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json([]);
  const sql = getDb();
  const rows = await sql`
    SELECT u.id, u.name, u.handle, u.avatar_color
    FROM friendships f
    JOIN users u ON u.id = f.friend_id
    WHERE f.user_id = ${userId}
    ORDER BY u.name
  `;
  return NextResponse.json(rows);
}

// POST — add friend
export async function POST(request: Request) {
  const { userId, friendId } = await request.json();
  if (!userId || !friendId) return NextResponse.json({ error: "userId and friendId required" }, { status: 400 });
  const sql = getDb();
  await sql`INSERT INTO friendships (user_id, friend_id) VALUES (${userId}, ${friendId}) ON CONFLICT DO NOTHING`;
  return NextResponse.json({ ok: true });
}

// DELETE — remove friend
export async function DELETE(request: Request) {
  const { userId, friendId } = await request.json();
  if (!userId || !friendId) return NextResponse.json({ error: "required" }, { status: 400 });
  const sql = getDb();
  await sql`DELETE FROM friendships WHERE user_id = ${userId} AND friend_id = ${friendId}`;
  return NextResponse.json({ ok: true });
}
