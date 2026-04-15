import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/workout-logs?userId=xxx — recent logs
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json([]);
  const sql = getDb();
  const logs = await sql`
    SELECT id, user_id, program_id, program_name, section, day_num, day_label,
           exercises, duration_s, created_at
    FROM workout_logs
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 100
  `;
  return NextResponse.json(logs);
}

// POST /api/workout-logs — save completed workout
export async function POST(request: Request) {
  const { id, userId, programId, programName, section, dayNum, dayLabel, exercises, durationS } = await request.json();
  if (!id || !userId || !programId) return NextResponse.json({ error: "required" }, { status: 400 });
  const sql = getDb();
  await sql`
    INSERT INTO workout_logs (id, user_id, program_id, program_name, section, day_num, day_label, exercises, duration_s)
    VALUES (
      ${id}, ${userId}, ${programId}, ${programName ?? ""},
      ${section ?? "atg"}, ${dayNum ?? 1}, ${dayLabel ?? ""},
      ${JSON.stringify(exercises ?? [])}, ${durationS ?? 0}
    )
  `;
  return NextResponse.json({ ok: true });
}
