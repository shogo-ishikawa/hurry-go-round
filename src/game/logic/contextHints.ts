export type ContextHintVisibility = "hidden" | "hint" | "interaction";
export interface ContextHintCandidate { id: string; distance: number; interactionRadius: number; priority: number; completed: boolean; decorative?: boolean; }
export function getContextHintVisibility(distance: number, interactionRadius: number, completed = false): ContextHintVisibility {
  if (completed || interactionRadius <= 0 || distance > interactionRadius * 2) return "hidden";
  return distance <= interactionRadius * 1.05 ? "interaction" : "hint";
}
export function selectContextHint(candidates: readonly ContextHintCandidate[]): ContextHintCandidate | null {
  return candidates.filter((c) => !c.decorative && getContextHintVisibility(c.distance, c.interactionRadius, c.completed) === "hint")
    .sort((a, b) => b.priority - a.priority || a.distance - b.distance)[0] ?? null;
}
