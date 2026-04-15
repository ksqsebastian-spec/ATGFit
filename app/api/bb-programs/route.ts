import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const sql = getDb();
  const rows = await sql`SELECT id, name, days, created_at FROM bb_programs ORDER BY created_at DESC`;
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const { id, name, days } = await request.json();
  if (!id || !name || !Array.isArray(days))
    return NextResponse.json({ error: "id, name, days[] required" }, { status: 400 });
  const sql = getDb();
  await sql`INSERT INTO bb_programs (id, name, days) VALUES (${id}, ${name}, ${JSON.stringify(days)})
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, days = EXCLUDED.days`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const sql = getDb();
  await sql`DELETE FROM bb_programs WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
