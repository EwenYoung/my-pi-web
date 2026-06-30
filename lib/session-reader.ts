import { SessionManager, getAgentDir } from "@earendil-works/pi-coding-agent";
import type { SessionEntry, SessionInfo, SessionContext, SessionTreeNode } from "./types";
import type { SessionInfo as PiSessionInfo } from "@earendil-works/pi-coding-agent";
import { normalizeToolCalls } from "./normalize";

export { getAgentDir };

export function getSessionsDir(): string {
  return `${getAgentDir()}/sessions`;
}

// Cache for listAllSessions — avoids scanning all files on every session load
let __sessionListCache: { sessions: SessionInfo[]; timestamp: number } | null = null;
const SESSION_LIST_CACHE_MS = 60_000;

export async function listAllSessions(cwd?: string): Promise<SessionInfo[]> {
  // Return cached result if fresh enough (only for full list, not cwd-scoped)
  if (!cwd && __sessionListCache && Date.now() - __sessionListCache.timestamp < SESSION_LIST_CACHE_MS) {
    return __sessionListCache.sessions;
  }

  const piSessions: PiSessionInfo[] = cwd
    ? await SessionManager.list(cwd)
    : await SessionManager.listAll();
  const pathToId = new Map<string, string>();
  for (const s of piSessions) pathToId.set(s.path, s.id);

  const cache = getPathCache();
  const sessions = piSessions.map((s) => {
    // Populate path cache so resolveSessionPath works without a full scan
    cache.set(s.id, s.path);
    return {
      path: s.path,
      id: s.id,
      cwd: s.cwd,
      name: s.name,
      created: s.created instanceof Date ? s.created.toISOString() : String(s.created),
      modified: s.modified instanceof Date ? s.modified.toISOString() : String(s.modified),
      messageCount: s.messageCount,
      firstMessage: s.firstMessage || "(no messages)",
      parentSessionId: s.parentSessionPath ? pathToId.get(s.parentSessionPath) : undefined,
    };
  });
  __sessionListCache = { sessions, timestamp: Date.now() };
  return sessions;
}

// ============================================================================
// Session path cache: sessionId → absolute file path
// Stored in globalThis for hot-reload safety
// ============================================================================
declare global {
  var __piSessionPathCache: Map<string, string> | undefined;
}

function getPathCache(): Map<string, string> {
  if (!globalThis.__piSessionPathCache) globalThis.__piSessionPathCache = new Map();
  return globalThis.__piSessionPathCache;
}

export async function resolveSessionPath(sessionId: string): Promise<string | null> {
  const cached = getPathCache().get(sessionId);
  if (cached) return cached;

  // Cache miss: scan all sessions to populate cache, then retry
  await listAllSessions();
  return getPathCache().get(sessionId) ?? null;
}

export function cacheSessionPath(sessionId: string, filePath: string): void {
  getPathCache().set(sessionId, filePath);
}

export function invalidateSessionPathCache(sessionId: string): void {
  getPathCache().delete(sessionId);
  __sessionListCache = null;
}

export function getSessionEntries(filePath: string): SessionEntry[] {
  const entries = SessionManager.open(filePath).getEntries();
  return entries as unknown as SessionEntry[];
}

export function buildTree(entries: SessionEntry[]): SessionTreeNode[] {
  const nodeMap = new Map<string, SessionTreeNode>();
  const labelsById = new Map<string, string>();

  for (const entry of entries) {
    if (entry.type === "label") {
      const l = entry as { type: "label"; targetId: string; label?: string };
      if (l.label) labelsById.set(l.targetId, l.label);
      else labelsById.delete(l.targetId);
    }
  }

  const roots: SessionTreeNode[] = [];
  for (const entry of entries) {
    nodeMap.set(entry.id, { entry, children: [], label: labelsById.get(entry.id) });
  }
  for (const entry of entries) {
    const node = nodeMap.get(entry.id)!;
    if (!entry.parentId) {
      roots.push(node);
    } else {
      const parent = nodeMap.get(entry.parentId);
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
  }

  const stack = [...roots];
  while (stack.length > 0) {
    const node = stack.pop()!;
    node.children.sort((a, b) => new Date(a.entry.timestamp).getTime() - new Date(b.entry.timestamp).getTime());
    stack.push(...node.children);
  }
  return roots;
}

export function buildSessionContext(entries: SessionEntry[], leafId?: string | null): SessionContext {
  const byId = new Map<string, SessionEntry>();
  for (const e of entries) byId.set(e.id, e);

  // Find target leaf
  let targetLeaf: SessionEntry | undefined;
  if (leafId === null) {
    return { messages: [], entryIds: [], thinkingLevel: "off", model: null };
  }
  if (leafId) targetLeaf = byId.get(leafId);
  if (!targetLeaf) targetLeaf = entries[entries.length - 1];
  if (!targetLeaf) {
    return { messages: [], entryIds: [], thinkingLevel: "off", model: null };
  }

  // Walk path from target leaf to root
  const path: SessionEntry[] = [];
  let cur: SessionEntry | undefined = targetLeaf;
  while (cur) {
    path.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }

  // Extract thinking level and model from path
  let thinkingLevel = "off";
  let model: { provider: string; modelId: string } | null = null;
  for (const e of path) {
    if (e.type === "thinking_level_change") {
      thinkingLevel = (e as any).thinkingLevel ?? thinkingLevel;
    } else if (e.type === "model_change") {
      model = { provider: (e as any).provider, modelId: (e as any).modelId };
    }
  }

  // Build messages from ALL path entries (skip compaction stripping).
  // compactions produce a synthetic summary message, normal messages are kept as-is.
  const entryIds: string[] = [];
  const rawMessages: any[] = [];

  for (const e of path) {
    if (e.type === "message") {
      entryIds.push(e.id);
      rawMessages.push((e as any).message);
    } else if (e.type === "compaction") {
      entryIds.push(e.id);
      rawMessages.push({
        role: "compactionSummary" as const,
        summary: (e as any).summary ?? "",
        tokensBefore: (e as any).tokensBefore,
        timestamp: (e as any).timestamp,
      });
    } else if (e.type === "custom_message") {
      entryIds.push(e.id);
      rawMessages.push({
        role: "user" as const,
        content: `*${(e as any).display || (e as any).customType || "Custom message"}*\n\n${(e as any).content ?? ""}`,
        timestamp: (e as any).timestamp,
      });
    } else if (e.type === "branch_summary" && (e as any).summary) {
      entryIds.push(e.id);
      rawMessages.push({
        role: "user" as const,
        content: `*Branch summary: ${(e as any).summary}*`,
        timestamp: (e as any).timestamp,
      });
    }
  }

  // Convert compactionSummary to user message format
  const messages = rawMessages.map((msg: any) => {
    if (msg.role === "compactionSummary") {
      return {
        role: "user" as const,
        content: `*The conversation history before this point was compacted into the following summary:*\n\n${msg.summary ?? ""}`,
        timestamp: msg.timestamp as number | undefined,
      };
    }
    return normalizeToolCalls(msg);
  });

  return {
    messages,
    entryIds,
    thinkingLevel,
    model,
  };
}

export function getLeafId(entries: SessionEntry[]): string | null {
  if (entries.length === 0) return null;
  return entries[entries.length - 1].id;
}



