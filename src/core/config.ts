import { DEFAULT_CONFIG, type Config } from "./types.ts";

export type ConfigInput = Partial<Config> & { me: string };

/**
 * Merge user-supplied configuration over the defaults. The only required field
 * is `me` — the account owner's name as it appears in the export.
 */
export function buildConfig(input: ConfigInput): Config {
  return {
    ...DEFAULT_CONFIG,
    ...input,
    workHours: { ...DEFAULT_CONFIG.workHours, ...(input.workHours ?? {}) },
    contacts: input.contacts ?? [],
  };
}
