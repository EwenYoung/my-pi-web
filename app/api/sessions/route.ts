import { NextResponse } from "next/server";
import { listAllSessions } from "@/lib/session-reader";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cwd = searchParams.get("cwd");
    const sessions = await listAllSessions(cwd || undefined);
    return NextResponse.json({ sessions });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
