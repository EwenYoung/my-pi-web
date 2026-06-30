import { NextResponse } from "next/server";
import { readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import {
  resolveSessionPath,
  invalidateSessionPathCache,
  buildSessionContext,
} from "@/lib/session-reader";
import { getRpcSession } from "@/lib/rpc-manager";

// Session parse cache: sessionId -> { data, mtime }
const sessionCache = new Map<string, { data: any; mtime: number }>();
const SESSION_CACHE_TTL = 30_000; // 30s

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const filePath = await resolveSessionPath(id);
    if (!filePath) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Check cache
    const fileMtime = statSync(filePath).mtimeMs;
    const cached = sessionCache.get(id);
    if (cached && cached.mtime === fileMtime && Date.now() - cached.mtime < SESSION_CACHE_TTL) {
      // Apply pagination to cached data
      const url = new URL(req.url);
      const offset = parseInt(url.searchParams.get("offset") ?? "-1", 10);
      const limit = parseInt(url.searchParams.get("limit") ?? "-1", 10);
      const last = parseInt(url.searchParams.get("last") ?? "-1", 10);
      const hasPagination = offset >= 0 && limit > 0;
      const hasLast = last > 0;
      if (hasPagination) {
        const paginated = { ...cached.data };
        paginated.context = {
          ...cached.data.context,
          messages: cached.data.context.messages.slice(offset, offset + limit),
          entryIds: cached.data.context.entryIds ? cached.data.context.entryIds.slice(offset, offset + limit) : undefined,
        };
        paginated.hasMore = offset + limit < cached.data.totalMessages;
        return NextResponse.json(paginated);
      }
      if (hasLast) {
        const paginated = { ...cached.data };
        paginated.context = {
          ...cached.data.context,
          messages: cached.data.context.messages.slice(-last),
          entryIds: cached.data.context.entryIds ? cached.data.context.entryIds.slice(-last) : undefined,
        };
        paginated.hasMore = last < cached.data.totalMessages;
        return NextResponse.json(paginated);
      }
      return NextResponse.json(cached.data);
    }

    const sm = SessionManager.open(filePath);
    const entries = sm.getEntries() as never[];
    const entryCount = Array.isArray(entries) ? entries.length : 0;
    const header = sm.getHeader();
    const leafId = sm.getLeafId();

    // Skip getTree/getSessionName for large sessions (stack overflow)
    const isSmall = entryCount < 500;
    let tree: any = null;
    if (isSmall) {
      try { tree = sm.getTree(); } catch { /* fallback */ }
    }

    const context = buildSessionContext(entries, leafId);

    let modified = header?.timestamp ?? new Date().toISOString();
    try { modified = statSync(filePath).mtime.toISOString(); } catch { /* use header timestamp */ }
    let parentSessionId: string | undefined;
    try {
      const firstLine = readFileSync(filePath, "utf8").split("\n")[0];
      const h = JSON.parse(firstLine) as { parentSession?: string };
      if (h.parentSession) {
        const parentFirstLine = readFileSync(h.parentSession, "utf8").split("\n")[0];
        const ph = JSON.parse(parentFirstLine) as { id?: string };
        parentSessionId = ph.id;
      }
    } catch { /* parent not found */ }
    const sessionName = isSmall ? sm.getSessionName() : null;
    const info = header ? {
      path: filePath,
      id: header.id,
      cwd: header.cwd ?? "",
      name: sessionName,
      created: header.timestamp,
      modified,
      messageCount: context.messages.length,
      firstMessage: context.messages.find((m) => m.role === "user")
        ? (() => {
            const msg = context.messages.find((m) => m.role === "user")!;
            const c = (msg as { content: unknown }).content;
            return typeof c === "string" ? c : (Array.isArray(c) ? (c.find((b: { type: string }) => b.type === "text") as { text: string } | undefined)?.text ?? "" : "") || "(no messages)";
          })()
        : "(no messages)",
      parentSessionId,
    } : null;

    const url = new URL(req.url);
    let agentState: { running: boolean; state?: unknown } | undefined;
    if (url.searchParams.has("includeState")) {
      const rpc = getRpcSession(id);
      if (rpc?.isAlive()) {
        const state = await rpc.send({ type: "get_state" });
        agentState = { running: true, state };
      } else {
        // Check global store for last known context usage
        const savedCu = (globalThis as any).__piLastContextUsage?.get(id);
        if (savedCu) {
          agentState = { running: false, state: { contextUsage: savedCu } };
        } else {
          agentState = { running: false };
        }
      }
    }

    // Pagination support
    const offset = parseInt(url.searchParams.get("offset") ?? "-1", 10);
    const limit = parseInt(url.searchParams.get("limit") ?? "-1", 10);
    const last = parseInt(url.searchParams.get("last") ?? "-1", 10);
    const hasPagination = offset >= 0 && limit > 0;
    const hasLast = last > 0;
    const totalMessages = context.messages.length;
    const paginatedContext = hasPagination ? {
      ...context,
      messages: context.messages.slice(offset, offset + limit),
      entryIds: context.entryIds ? context.entryIds.slice(offset, offset + limit) : undefined,
    } : hasLast ? {
      ...context,
      messages: context.messages.slice(-last),
      entryIds: context.entryIds ? context.entryIds.slice(-last) : undefined,
    } : context;

    const result = {
      sessionId: id,
      filePath,
      info,
      tree,
      leafId,
      context: paginatedContext,
      totalMessages,
      hasMore: hasPagination ? (offset + limit < totalMessages) : hasLast ? (last < totalMessages) : false,
      ...(agentState !== undefined ? { agentState } : {}),
    };

    // Update cache with FULL context (not paginated)
    const fullResult = {
      sessionId: id,
      filePath,
      info,
      tree,
      leafId,
      context,
      totalMessages,
      hasMore: false,
      ...(agentState !== undefined ? { agentState } : {}),
    };
    sessionCache.set(id, { data: fullResult, mtime: fileMtime });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// PATCH /api/sessions/[id]  body: { name: string }
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { name } = await req.json() as { name?: string };
    if (typeof name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const filePath = await resolveSessionPath(id);
    if (!filePath) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    const sm = SessionManager.open(filePath);
    sm.appendSessionInfo(name.trim());
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// DELETE /api/sessions/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const filePath = await resolveSessionPath(id);
    if (!filePath) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Read header before deleting to get parentSession path
    const firstLine = readFileSync(filePath, "utf8").split("\n")[0];
    let parentSessionPath: string | undefined;
    try {
      const header = JSON.parse(firstLine) as { type?: string; parentSession?: string };
      if (header.type === "session") parentSessionPath = header.parentSession;
    } catch { /* ignore */ }

    // Re-attach all direct children to this session's parent (cascade re-parent)
    // Scan sibling files in the same directory
    const dir = filePath.replace(/\\/g, "/").split("/").slice(0, -1).join("/");
    try {
      const files = readdirSync(dir).filter((f) => f.endsWith(".jsonl") && join(dir, f) !== filePath);
      for (const file of files) {
        const childPath = join(dir, file);
        try {
          const content = readFileSync(childPath, "utf8");
          const lines = content.split("\n");
          const header = JSON.parse(lines[0]) as { type?: string; parentSession?: string };
          if (header.type === "session" && header.parentSession === filePath) {
            // Rewrite header with new parentSession
            header.parentSession = parentSessionPath;
            lines[0] = JSON.stringify(header);
            writeFileSync(childPath, lines.join("\n"));
          }
        } catch { /* skip malformed */ }
      }
    } catch { /* skip if dir unreadable */ }

    getRpcSession(id)?.destroy();
    unlinkSync(filePath);
    invalidateSessionPathCache(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
