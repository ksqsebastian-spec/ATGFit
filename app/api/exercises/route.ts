import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/exercises — return all exercises
export async function GET() {
  const sql = getDb();
  const rows = await sql`SELECT id, name, tags FROM exercises ORDER BY id`;
  return NextResponse.json(rows);
}

// PUT /api/exercises — update a single exercise's tags
// Body: { id: string, tags: string[] }
export async function PUT(request: Request) {
  const { id, tags } = await request.json();
  if (!id || !Array.isArray(tags)) {
    return NextResponse.json({ error: "id and tags[] required" }, { status: 400 });
  }
  const sql = getDb();
  await sql`UPDATE exercises SET tags = ${tags} WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
