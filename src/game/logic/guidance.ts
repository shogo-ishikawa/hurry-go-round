export type GuidancePriority = 1|2|3|4|5|6;
export interface GuidanceMessage { id: string; text: string; priority: GuidancePriority; createdAtMs: number }
export function chooseGuidance(messages: readonly GuidanceMessage[]): GuidanceMessage | null { return [...messages].sort((a,b) => a.priority-b.priority || b.createdAtMs-a.createdAtMs)[0] ?? null; }
export function canShowNotification(id: string, nowMs: number, lastShown: Readonly<Record<string, number>>, cooldownMs = 2500): boolean { return lastShown[id] === undefined || nowMs - lastShown[id]! >= cooldownMs; }
