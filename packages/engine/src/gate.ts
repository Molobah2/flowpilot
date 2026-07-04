import * as fs from "fs";
import * as path from "path";

export interface GateConfig {
  maxPerExecution: bigint;
  maxPerDay: bigint;
  stateFilePath: string;
}

interface GateState {
  dailyTotal: string;   // bigint as string
  dayStart: string;     // ISO timestamp of the start of the current day window
  lastExecution: string | null;
}

function loadState(filePath: string): GateState {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as GateState;
  } catch {
    return { dailyTotal: "0", dayStart: new Date().toISOString(), lastExecution: null };
  }
}

function saveState(filePath: string, state: GateState): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2), "utf8");
}

export class SpendGate {
  private readonly config: GateConfig;

  constructor(config: GateConfig) {
    this.config = config;
  }

  check(amount: bigint): { allowed: boolean; reason?: string } {
    if (amount > this.config.maxPerExecution) {
      return {
        allowed: false,
        reason: `Execution cap exceeded: ${amount} > ${this.config.maxPerExecution} micro-USDCx`,
      };
    }

    const state = loadState(this.config.stateFilePath);
    const dayStart = new Date(state.dayStart);
    const now = new Date();

    // Reset daily window if more than 24h have passed
    const daily =
      now.getTime() - dayStart.getTime() < 86_400_000
        ? BigInt(state.dailyTotal)
        : 0n;

    if (daily + amount > this.config.maxPerDay) {
      return {
        allowed: false,
        reason: `Daily cap exceeded: already spent ${daily}, adding ${amount} > ${this.config.maxPerDay} micro-USDCx`,
      };
    }

    return { allowed: true };
  }

  record(amount: bigint): void {
    const state = loadState(this.config.stateFilePath);
    const dayStart = new Date(state.dayStart);
    const now = new Date();

    const isNewDay = now.getTime() - dayStart.getTime() >= 86_400_000;

    const newState: GateState = {
      dailyTotal: isNewDay
        ? amount.toString()
        : (BigInt(state.dailyTotal) + amount).toString(),
      dayStart: isNewDay ? now.toISOString() : state.dayStart,
      lastExecution: now.toISOString(),
    };

    saveState(this.config.stateFilePath, newState);
  }
}
