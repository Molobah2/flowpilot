import * as fs from "fs";
import * as path from "path";

export class IdempotencyStore {
  private readonly filePath: string;
  private processed: Set<string>;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.processed = this.load();
  }

  private load(): Set<string> {
    try {
      const raw = fs.readFileSync(this.filePath, "utf8");
      const arr = JSON.parse(raw) as string[];
      return new Set(arr);
    } catch {
      return new Set();
    }
  }

  has(txId: string): boolean {
    return this.processed.has(txId);
  }

  mark(txId: string): void {
    this.processed.add(txId);
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(
      this.filePath,
      JSON.stringify([...this.processed], null, 2),
      "utf8"
    );
  }
}
