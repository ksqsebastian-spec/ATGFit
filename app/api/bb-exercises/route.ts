import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const sql = getDb();
  const rows = await sql`SELECT id, name, tags FROM bb_exercises ORDER BY id`;
  return NextResponse.json(rows);
}

export async function PUT(request: Request) {
  const { id, tags } = await request.json();
  if (!id || !Array.isArray(tags))
    return NextResponse.json({ error: "id and tags[] required" }, { status: 400 });
  const sql = getDb();
  await sql`UPDATE bb_exercises SET tags = ${tags} WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
