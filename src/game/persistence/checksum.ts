export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>; return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}
export async function checksumPayload(payload: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(payload)); const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
export async function verifyChecksum(payload: unknown, checksum: string): Promise<boolean> { return (await checksumPayload(payload)) === checksum.toLowerCase(); }
