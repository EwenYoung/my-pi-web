import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const CONFIG_DIR = path.join(os.homedir(), ".pi", "agent");
const CAVEMAN_CONFIG = path.join(CONFIG_DIR, "caveman.json");
const RTK_CONFIG = path.join(CONFIG_DIR, "rtk-config.json");

interface CavemanConfig {
  defaultLevel: string;
  showStatusBar: boolean;
}

interface RtkConfig {
  enabled: boolean;
  logSavings: boolean;
  showUpdateEvery: number;
  techniques: Record<string, any>;
}

const DEFAULT_CAVEMAN: CavemanConfig = { defaultLevel: "lite", showStatusBar: true };
const DEFAULT_RTK: RtkConfig = {
  enabled: true, logSavings: true, showUpdateEvery: 10,
  techniques: {
    ansiStripping: true,
    truncation: { enabled: true, maxChars: 10000 },
    sourceCodeFiltering: { enabled: true, level: "minimal" },
    smartTruncation: { enabled: true, maxLines: 200 },
    testOutputAggregation: true, buildOutputFiltering: true,
    gitCompaction: true, searchResultGrouping: true, linterAggregation: true,
  },
};

function readJson<T>(filePath: string, fallback: T): T {
  try { return JSON.parse(fs.readFileSync(filePath, "utf-8")); }
  catch { return fallback; }
}

function writeJson(filePath: string, data: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function fileExists(filePath: string): boolean {
  try { fs.accessSync(filePath); return true; } catch { return false; }
}

export async function GET() {
  const cavemanInstalled = fileExists(CAVEMAN_CONFIG);
  const rtkInstalled = fileExists(RTK_CONFIG);
  const caveman = readJson<CavemanConfig>(CAVEMAN_CONFIG, DEFAULT_CAVEMAN);
  const rtk = readJson<RtkConfig>(RTK_CONFIG, DEFAULT_RTK);
  return NextResponse.json({
    caveman: { installed: cavemanInstalled, enabled: caveman.defaultLevel !== "off", level: caveman.defaultLevel },
    rtk: { installed: rtkInstalled, enabled: rtk.enabled },
  });
}

export async function PUT(request: NextRequest) {
  const body = await request.json() as { caveman?: boolean; rtk?: boolean };

  if (body.caveman !== undefined) {
    const config = readJson<CavemanConfig>(CAVEMAN_CONFIG, DEFAULT_CAVEMAN);
    config.defaultLevel = body.caveman ? "lite" : "off";
    writeJson(CAVEMAN_CONFIG, config);
  }

  if (body.rtk !== undefined) {
    const config = readJson<RtkConfig>(RTK_CONFIG, DEFAULT_RTK);
    config.enabled = body.rtk;
    writeJson(RTK_CONFIG, config);
  }

  return NextResponse.json({ success: true });
}
