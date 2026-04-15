import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const sql = getDb();
  const [plans, logs] = await Promise.all([
    sql`SELECT id, name, activity, base_distance, unit, weeks_completed, metadata, created_at FROM cardio_plans ORDER BY created_at DESC`,
    sql`SELECT id, protocol, duration_min, notes, logged_at FROM hiit_logs ORDER BY logged_at DESC`,
  ]);
  return NextResponse.json({ plans, logs });
}

export async function POST(request: Request) {
  const body = await request.json();
  const sql = getDb();
  if (body.type === "plan") {
    const { id, name, activity, base_distance, unit, metadata = {} } = body;
    await sql`INSERT INTO cardio_plans (id, name, activity, base_distance, unit, metadata)
      VALUES (${id}, ${name}, ${activity}, ${base_distance ?? 0}, ${unit}, ${JSON.stringify(metadata)})`;
  } else if (body.type === "hiit") {
    const { id, protocol, duration_min, notes } = body;
    await sql`INSERT INTO hiit_logs (id, protocol, duration_min, notes)
      VALUES (${id}, ${protocol}, ${duration_min ?? null}, ${notes ?? null})`;
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const { id, weeks_completed } = await request.json();
  if (!id || !Array.isArray(weeks_completed))
    return NextResponse.json({ error: "id and weeks_completed required" }, { status: 400 });
  const sql = getDb();
  await sql`UPDATE cardio_plans SET weeks_completed = ${weeks_completed} WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { id, type } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const sql = getDb();
  if (type === "hiit") await sql`DELETE FROM hiit_logs WHERE id = ${id}`;
  else await sql`DELETE FROM cardio_plans WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
