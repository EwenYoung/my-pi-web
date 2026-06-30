import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { command, cwd } = await request.json();

    if (!command || typeof command !== "string") {
      return NextResponse.json({ error: "Missing command" }, { status: 400 });
    }

    const workingDir = cwd || process.env.HOME || "/tmp";

    const { stdout, stderr } = await execAsync(command, {
      cwd: workingDir,
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, TERM: "dumb" },
    });

    return NextResponse.json({
      stdout: stdout || "",
      stderr: stderr || "",
      exitCode: 0,
    });
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; code?: number; message?: string };
    return NextResponse.json({
      stdout: e.stdout || "",
      stderr: e.stderr || e.message || "Execution failed",
      exitCode: e.code ?? 1,
    });
  }
}
