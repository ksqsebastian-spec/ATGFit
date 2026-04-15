import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// POST — toggle reaction (add if not exists, remove if exists)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const postId = (await params).id;
  const { userId, emoji } = await request.json();
  if (!userId || !emoji) return NextResponse.json({ error: "userId and emoji required" }, { status: 400 });
  const sql = getDb();
  const deleted = await sql`
    DELETE FROM post_reactions WHERE post_id = ${postId} AND user_id = ${userId} AND emoji = ${emoji}
    RETURNING post_id
  `;
  if (deleted.length === 0) {
    await sql`INSERT INTO post_reactions (post_id, user_id, emoji) VALUES (${postId}, ${userId}, ${emoji})`;
    return NextResponse.json({ action: "added" });
  }
  return NextResponse.json({ action: "removed" });
}
