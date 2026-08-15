import type { PersistedGameSnapshot } from "../persistence/saveSchema";

/** The single boundary between frame-time state and the integer save format. */
export function normalizePersistedSnapshot(snapshot: PersistedGameSnapshot): PersistedGameSnapshot {
  assertFinite(snapshot, "payload");
  const normalized = structuredClone(snapshot);
  normalizeNumbers(normalized, "payload");
  return normalized;
}

export function normalizeDurationMs(value: number): number {
  if (!Number.isFinite(value)) throw new TypeError("duration must be finite");
  return Math.max(0, Math.round(value));
}

function assertFinite(value: unknown, path: string): void {
  if (typeof value === "number" && !Number.isFinite(value)) throw new TypeError(`${path} must be finite`);
  if (value && typeof value === "object") for (const [key, child] of Object.entries(value)) assertFinite(child, `${path}.${key}`);
}

function normalizeNumbers(value: unknown, path: string): void {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (typeof child === "number") {
      // Player coordinates are spatial values; every other persisted number is a
      // count, level, index, seed or millisecond value in schema 5.
      (value as Record<string, unknown>)[key] = childPath === "payload.player.x" || childPath === "payload.player.y"
        ? child
        : Math.max(0, Math.round(child));
    } else normalizeNumbers(child, childPath);
  }
}
