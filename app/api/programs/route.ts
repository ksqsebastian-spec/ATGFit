import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/programs — return all saved programs, newest first
export async function GET() {
  const sql = getDb();
  const rows = await sql`SELECT id, name, days, created_at FROM programs ORDER BY created_at DESC`;
  return NextResponse.json(rows);
}

// POST /api/programs — save a new program snapshot
// Body: { id: string, name: string, days: object[] }
export async function POST(request: Request) {
  const { id, name, days } = await request.json();
  if (!id || !name || !Array.isArray(days)) {
    return NextResponse.json({ error: "id, name, and days[] required" }, { status: 400 });
  }
  const sql = getDb();
  await sql`
    INSERT INTO programs (id, name, days)
    VALUES (${id}, ${name}, ${JSON.stringify(days)})
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, days = EXCLUDED.days
  `;
  return NextResponse.json({ ok: true });
}

// DELETE /api/programs — delete a program by id
// Body: { id: string }
export async function DELETE(request: Request) {
  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const sql = getDb();
  await sql`DELETE FROM programs WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
