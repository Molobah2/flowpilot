import * as fs from "fs";
import * as path from "path";
import type { ExecutionRecord } from "flowpilot-engine";

export function saveExecution(filePath: string, record: ExecutionRecord): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  let records: ExecutionRecord[] = [];
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    records = JSON.parse(raw, (_, v) => v) as ExecutionRecord[];
  } catch {
    records = [];
  }

  records.unshift(record); // newest first
  // Keep last 500
  records = records.slice(0, 500);

  fs.writeFileSync(
    filePath,
    JSON.stringify(records, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2),
    "utf8"
  );
}

export function loadExecutions(filePath: string): ExecutionRecord[] {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as ExecutionRecord[];
  } catch {
    return [];
  }
}
