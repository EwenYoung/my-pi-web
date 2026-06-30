import { NextRequest, NextResponse } from "next/server";
import { resolveSessionPath } from "@/lib/session-reader";
import { SessionManager } from "@earendil-works/pi-coding-agent";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const msgIdx = parseInt(req.nextUrl.searchParams.get("msg") ?? "-1", 10);
  const blockIdx = parseInt(req.nextUrl.searchParams.get("block") ?? "0", 10);

  if (msgIdx < 0) return NextResponse.json({ error: "Missing msg param" }, { status: 400 });

  const filePath = await resolveSessionPath(id);
  if (!filePath) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const sm = SessionManager.open(filePath);
  const entries = sm.getEntries() as any[];

  let msgCount = 0;
  for (const entry of entries) {
    if (entry.type !== "message") continue;
    const role = entry.message?.role;
    if (role !== "user" && role !== "assistant") continue; // skip toolResult etc
    if (msgCount !== msgIdx) { msgCount++; continue; }

    const content = entry.message?.content;
    if (!Array.isArray(content)) return NextResponse.json({ error: "No image" }, { status: 404 });

    let imgBlockIdx = 0;
    for (const block of content) {
      if (block.type === "image" || block.type === "image_url") {
        if (imgBlockIdx === blockIdx) {
          const base64Data = block.data ?? block.url ?? block.image_url?.url ?? "";
          const mimeType = block.mimeType ?? "image/jpeg";
          const binary = Buffer.from(base64Data, "base64");
          return new NextResponse(binary, {
            headers: {
              "Content-Type": mimeType,
              "Content-Length": String(binary.length),
              "Cache-Control": "public, max-age=86400",
            },
          });
        }
        imgBlockIdx++;
      }
    }
    return NextResponse.json({ error: "Image block not found" }, { status: 404 });
  }

  return NextResponse.json({ error: "Message not found" }, { status: 404 });
}
