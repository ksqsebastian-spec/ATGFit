import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/auth?userId=xxx — fetch user by id
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json(null);
  const sql = getDb();
  const rows = await sql`SELECT id, name, handle, avatar_color, dog_id FROM users WHERE id = ${userId}`;
  return NextResponse.json(rows[0] ?? null);
}

// POST /api/auth — create or sign in
export async function POST(request: Request) {
  const body = await request.json();
  const sql = getDb();

  if (body.type === "create") {
    const { id, name, handle, avatar_color } = body;
    // Check handle taken
    const existing = await sql`SELECT id FROM users WHERE handle = ${handle}`;
    if (existing.length > 0)
      return NextResponse.json({ error: "handle_taken" }, { status: 409 });

    // Random dog (0-7)
    const dogId = Math.floor(Math.random() * 8);

    await sql`INSERT INTO users (id, name, handle, avatar_color, dog_id) VALUES (${id}, ${name}, ${handle}, ${avatar_color}, ${dogId})`;

    // Auto-friend: insert mutual friendships with every existing user
    const others = await sql`SELECT id FROM users WHERE id != ${id}`;
    if (others.length > 0) {
      for (const other of others as { id: string }[]) {
        await sql`INSERT INTO friendships (user_id, friend_id) VALUES (${id}, ${other.id}) ON CONFLICT DO NOTHING`;
        await sql`INSERT INTO friendships (user_id, friend_id) VALUES (${other.id}, ${id}) ON CONFLICT DO NOTHING`;
      }
    }

    return NextResponse.json({ id, name, handle, avatar_color, dog_id: dogId });
  }

  if (body.type === "signin") {
    const { handle } = body;
    const rows = await sql`SELECT id, name, handle, avatar_color, dog_id FROM users WHERE handle = ${handle.toLowerCase()}`;
    if (!rows.length) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(rows[0]);
  }

  return NextResponse.json({ error: "invalid type" }, { status: 400 });
}
