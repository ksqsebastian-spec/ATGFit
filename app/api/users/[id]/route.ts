import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/users/[id] — profile + top lifts
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sql = getDb();
  const [users, logs] = await Promise.all([
    sql`SELECT id, name, handle, avatar_color, dog_id, bio FROM users WHERE id = ${id}`,
    sql`SELECT exercises FROM workout_logs WHERE user_id = ${id} ORDER BY created_at DESC LIMIT 200`,
  ]);
  if (!users.length) return NextResponse.json({ error: "not found" }, { status: 404 });
  const user = users[0];

  // Compute top 5 lifts by max single-set weight
  const liftMap: Record<string, number> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const log of logs as any[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const ex of (log.exercises || []) as any[]) {
      if (!ex.name) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const set of (ex.sets || []) as any[]) {
        const w = parseFloat(set.weight);
        if (!isNaN(w) && w > 0) {
          liftMap[ex.name] = Math.max(liftMap[ex.name] ?? 0, w);
        }
      }
    }
  }
  const topLifts = Object.entries(liftMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, weight]) => ({ name, weight }));

  return NextResponse.json({ ...user, topLifts });
}

// PATCH /api/users/[id] — update bio
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { bio, callerId } = await request.json();
  if (callerId !== id) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const sql = getDb();
  await sql`UPDATE users SET bio = ${bio ?? ""} WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
