import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const sql = getDb();
  const rows = await sql`SELECT id, name, tags FROM bb_exercises ORDER BY name`;
  return NextResponse.json(rows);
}

// POST /api/bb-exercises — add a custom exercise
export async function POST(request: Request) {
  const { id, name, tags } = await request.json();
  if (!id || !name?.trim()) return NextResponse.json({ error: "id and name required" }, { status: 400 });
  const sql = getDb();
  await sql`INSERT INTO bb_exercises (id, name, tags) VALUES (${id}, ${name.trim()}, ${tags ?? []})`;
  return NextResponse.json({ id, name: name.trim(), tags: tags ?? [] });
}

export async function PUT(request: Request) {
  const { id, tags } = await request.json();
  if (!id || !Array.isArray(tags)) return NextResponse.json({ error: "id and tags[] required" }, { status: 400 });
  const sql = getDb();
  await sql`UPDATE bb_exercises SET tags = ${tags} WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

// DELETE /api/bb-exercises — remove an exercise
export async function DELETE(request: Request) {
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const sql = getDb();
  await sql`DELETE FROM bb_exercises WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
