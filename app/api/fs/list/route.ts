import { NextRequest, NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import { join, resolve, sep } from "path";
import { homedir } from "os";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let dir = searchParams.get("dir") || "~";

  // Expand ~
  if (dir === "~" || dir.startsWith("~/")) {
    dir = dir === "~" ? homedir() : join(homedir(), dir.slice(2));
  }

  dir = resolve(dir);

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const items = await Promise.all(
      entries
        .filter((e) => !e.name.startsWith("."))
        .map(async (e) => {
          const fullPath = join(dir, e.name);
          let isDir = e.isDirectory();
          // Resolve symlinks
          try {
            const s = await stat(fullPath);
            isDir = s.isDirectory();
          } catch {
            // ignore broken symlinks
          }
          return {
            name: e.name,
            path: fullPath,
            isDir,
          };
        })
    );

    // Sort: directories first, then alphabetical
    items.sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      dir,
      parent: dir === "/" ? null : dir.slice(0, dir.lastIndexOf(sep)) || "/",
      items,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message, dir, items: [] }, { status: 400 });
  }
}
