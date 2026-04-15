import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET — fetch comments for a post
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const postId = (await params).id;
  const sql = getDb();
  const rows = await sql`
    SELECT pc.id, pc.text, pc.created_at, u.name AS user_name, u.avatar_color
    FROM post_comments pc
    JOIN users u ON u.id = pc.user_id
    WHERE pc.post_id = ${postId}
    ORDER BY pc.created_at ASC
  `;
  return NextResponse.json(rows);
}

// POST — add comment
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const postId = (await params).id;
  const { id, userId, text } = await request.json();
  if (!id || !userId || !text?.trim()) return NextResponse.json({ error: "required" }, { status: 400 });
  const sql = getDb();
  await sql`INSERT INTO post_comments (id, post_id, user_id, text) VALUES (${id}, ${postId}, ${userId}, ${text.trim()})`;
  const row = await sql`
    SELECT pc.id, pc.text, pc.created_at, u.name AS user_name, u.avatar_color
    FROM post_comments pc JOIN users u ON u.id = pc.user_id WHERE pc.id = ${id}
  `;
  return NextResponse.json(row[0]);
}

// DELETE — remove own comment
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const postId = (await params).id;
  const { commentId, userId } = await request.json();
  const sql = getDb();
  await sql`DELETE FROM post_comments WHERE id = ${commentId} AND post_id = ${postId} AND user_id = ${userId}`;
  return NextResponse.json({ ok: true });
}
