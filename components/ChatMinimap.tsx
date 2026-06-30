"use client";

import { useEffect, useRef, useState, useCallback, useMemo, RefObject } from "react";
import { createPortal } from "react-dom";
import type { AgentMessage, AssistantMessage, TextContent } from "@/lib/types";

interface Props {
  messages: AgentMessage[];
  streamingMessage: Partial<AgentMessage> | null;
  scrollContainer: RefObject<HTMLDivElement | null>;
  messageRefs: RefObject<(HTMLDivElement | null)[]>;
}

const MINIMAP_WIDTH = 8;

function getMessagePreview(msg: AgentMessage | Partial<AgentMessage>): string {
  if (msg.role === "user") {
    const content = msg.content;
    if (typeof content === "string") return content.slice(0, 200);
    if (Array.isArray(content)) {
      return (content as { type: string; text?: string }[])
        .filter((b) => b.type === "text" && b.text).map((b) => b.text!).join("\n").slice(0, 200);
    }
    return "";
  }
  if (msg.role === "assistant") {
    const blocks = (msg as Partial<AssistantMessage>).content ?? [];
    const text = blocks.filter((b): b is TextContent => b.type === "text").map((b) => b.text).join(" ");
    if (text) return text.slice(0, 200);
    const toolNames = blocks.filter((b) => b.type === "toolCall").map((b) => (b as { toolName: string }).toolName);
    if (toolNames.length) return toolNames.join(", ");
    return "";
  }
  return "";
}

function formatTime(msg: AgentMessage | Partial<AgentMessage>): string {
  const ts = (msg as { timestamp?: string }).timestamp;
  if (!ts) return "";
  try { const d = new Date(ts); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }
  catch { return ""; }
}

function getDotPreview(msg: AgentMessage | Partial<AgentMessage>): string {
  const text = getMessagePreview(msg);
  if (text) return text;
  if (msg.role === "user" && Array.isArray(msg.content)) {
    if (msg.content.some((b: any) => b.type === "image" || b.type === "image_url")) return "[image]";
  }
  return "(empty)";
}

interface NodeInfo { msg: AgentMessage | Partial<AgentMessage>; index: number; domTop: number; refIdx: number; }

export function ChatMinimap({ messages, streamingMessage, scrollContainer, messageRefs }: Props) {
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [hovered, setHovered] = useState(false);
  const [hoveredMsgIdx, setHoveredMsgIdx] = useState<number | null>(null);
  const [hoveredItemTop, setHoveredItemTop] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

  const allMessages = useMemo(
    () => (streamingMessage ? [...messages, streamingMessage] : messages) as (AgentMessage | Partial<AgentMessage>)[],
    [messages, streamingMessage]
  );
  const allMessagesRef = useRef(allMessages);
  allMessagesRef.current = allMessages;

  // Track node positions from message list
  const syncRef = useRef<() => void>(null!);
  syncRef.current = () => {
    const scrollEl = scrollContainer.current;
    if (!scrollEl) return;
    const totalH = scrollEl.scrollHeight;

    const refs = messageRefs.current;
    const newNodes: NodeInfo[] = [];
    let refIndex = 0;
    for (const msg of allMessagesRef.current) {
      if (msg.role !== "user" && msg.role !== "assistant") continue;
      const el = refs?.[refIndex]; refIndex++;
      if (msg.role !== "user") continue;
      if (el && totalH > 0) {
        const cr = scrollEl.getBoundingClientRect();
        const top = el.getBoundingClientRect().top - cr.top + scrollEl.scrollTop;
        newNodes.push({ msg, index: newNodes.length, domTop: top, refIdx: refIndex - 1 });
      }
    }
    setNodes(newNodes);
  };

  const sync = useCallback(() => syncRef.current(), []);

  useEffect(() => {
    const el = scrollContainer.current;
    if (!el) return;
    el.addEventListener("scroll", sync, { passive: true });
    const ro = new ResizeObserver(sync); ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    sync();
    return () => { el.removeEventListener("scroll", sync); ro.disconnect(); };
  }, [scrollContainer, sync]);

  useEffect(() => { const t = setTimeout(sync, 50); return () => clearTimeout(t); }, [messages.length, sync]);

  // Collapse when mouse leaves area
  useEffect(() => {
    if (!hovered) return;
    const handleGlobalMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const overArea = e.clientX >= rect.left - 260 && e.clientX <= rect.right &&
                        e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!overArea) {
        setHovered(false);
        setHoveredMsgIdx(null);
      }
    };
    document.addEventListener("mousemove", handleGlobalMove, { passive: true });
    return () => document.removeEventListener("mousemove", handleGlobalMove);
  }, [hovered]);

  // Update container rect
  useEffect(() => {
    if (!hovered) return;
    const update = () => {
      if (containerRef.current) setContainerRect(containerRef.current.getBoundingClientRect());
    };
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, [hovered]);

  if (nodes.length === 0) return null;

  return (
    <div ref={containerRef}
      onMouseEnter={() => { clearTimeout(hoverTimerRef.current!); setHovered(true); }}
      onMouseLeave={() => { hoverTimerRef.current = setTimeout(() => { setHovered(false); setHoveredMsgIdx(null); }, 200); }}
      style={{ width: MINIMAP_WIDTH, flexShrink: 0, cursor: "default", userSelect: "none", background: "transparent", overflow: "visible", zIndex: 1 }}
    >
      {/* Side list — portal to body */}
      {hovered && containerRect && createPortal(
        <>
          <div
            onMouseEnter={() => { clearTimeout(hoverTimerRef.current!); setHovered(true); }}
            onMouseLeave={() => { hoverTimerRef.current = setTimeout(() => { setHovered(false); setHoveredMsgIdx(null); }, 200); }}
            style={{
              position: "fixed", top: containerRect.top, left: containerRect.left - 234, width: 230,
              height: "auto", maxHeight: containerRect.height,
              overflowY: "auto", scrollbarWidth: "none",
              background: "var(--bg-panel)", borderRadius: "4px 0 0 4px",
              boxShadow: "-2px 0 12px rgba(0,0,0,0.12)", zIndex: 200,
            }} className="minimap-scroll">
            {nodes.map((node) => {
              const preview = getDotPreview(node.msg);
              if (!preview) return null;
              return (
                <div key={node.index}
                  onClick={() => {
                    const sEl = scrollContainer.current;
                    if (sEl) sEl.scrollTo({ top: node.domTop, behavior: "smooth" });
                  }}
                  onMouseEnter={(e) => { setHoveredMsgIdx(node.index); setHoveredItemTop(e.currentTarget.getBoundingClientRect().top); }}
                  onMouseLeave={() => { setHoveredMsgIdx(null); setHoveredItemTop(null); }}
                  style={{
                    padding: "4px 8px", cursor: "pointer", position: "relative",
                    borderBottom: node.index < nodes.length - 1 ? "1px solid var(--border)" : "none",
                  }}>
                  <span style={{ color: "var(--text-muted)", fontSize: 10, display: "block", lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {preview.slice(0, 45)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Hover tooltip */}
          {hoveredMsgIdx !== null && hoveredMsgIdx < nodes.length && (() => {
            const node = nodes[hoveredMsgIdx];
            const fullContent = getDotPreview(node.msg);
            const time = formatTime(node.msg);
            return (
              <div style={{
                position: "fixed", top: hoveredItemTop ?? containerRect.top, left: containerRect.left - 234 - 4 - 280, width: 280,
                height: "auto", maxHeight: containerRect.height, overflowY: "auto",
                background: "var(--bg)", borderRadius: "4px 0 0 4px", padding: "8px 10px", fontSize: 11,
                boxShadow: "-4px 0 16px rgba(0,0,0,0.18)", zIndex: 250,
              }}>
                <span style={{ color: "var(--text)", fontSize: 11, display: "block", lineHeight: 1.5, wordBreak: "break-word" }}>{fullContent}</span>
                {time && <span style={{ color: "var(--text-dim)", fontSize: 9, display: "block", marginTop: 4 }}>{time}</span>}
              </div>
            );
          })()}
        </>,
        document.body
      )}
    </div>
  );
}

export function useMessageRefs(count: number): RefObject<(HTMLDivElement | null)[]> {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  refs.current = Array(count).fill(null).map((_, i) => refs.current[i] ?? null);
  return refs;
}
