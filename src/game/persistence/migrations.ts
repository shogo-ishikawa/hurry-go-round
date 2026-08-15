import { SAVE_SCHEMA_VERSION, type SaveEnvelope } from "./saveSchema";
import { validateEnvelope, type ValidationResult } from "./saveValidation";
export async function migrateSaveEnvelope(input: unknown): Promise<ValidationResult<SaveEnvelope>> {
  if (typeof input !== "object" || input === null || !("schemaVersion" in input)) return { ok: false, errors: ["schema version missing"] };
  const version = (input as { schemaVersion: unknown }).schemaVersion; if (typeof version !== "number" || version > SAVE_SCHEMA_VERSION) return { ok: false, errors: ["このセーブデータは新しいバージョンで作成されています"] };
  return validateEnvelope(structuredClone(input));
}
