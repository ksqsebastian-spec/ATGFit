import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/users?q=searchterm&excludeUserId=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.toLowerCase() || "";
  const exclude = searchParams.get("excludeUserId") || "";
  if (!q) return NextResponse.json([]);
  const sql = getDb();
  const rows = await sql`
    SELECT id, name, handle, avatar_color FROM users
    WHERE (LOWER(name) LIKE ${"%" + q + "%"} OR handle LIKE ${"%" + q + "%"})
      AND id != ${exclude}
    LIMIT 10
  `;
  return NextResponse.json(rows);
}
