import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET() {
  try {
    const pkgPath = join(
      process.env.HOME ?? process.env.USERPROFILE ?? "/home/even",
      ".npm-global/lib/node_modules/@earendil-works/pi-coding-agent/package.json"
    );
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    return NextResponse.json({ version: pkg.version as string });
  } catch {
    return NextResponse.json({ version: "unknown" }, { status: 200 });
  }
}
