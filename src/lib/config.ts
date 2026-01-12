/**
 * dotdot configuration schema and types
 *
 * Config files are TypeScript: `dotdot.config.ts`
 */

import { Schema } from 'effect'

/** Configuration for a single repo */
export const RepoConfigSchema = Schema.Struct({
  /** Git clone URL */
  url: Schema.String,
  /** Pinned commit hash */
  revision: Schema.optional(Schema.String),
  /** Command to run after cloning (e.g., "bun install") */
  install: Schema.optional(Schema.String),
  /** Paths to symlink at workspace root (for monorepos) */
  expose: Schema.optional(Schema.Array(Schema.String)),
})

export type RepoConfig = typeof RepoConfigSchema.Type

/** Root dotdot configuration */
export const DotdotConfigSchema = Schema.Struct({
  repos: Schema.Record({ key: Schema.String, value: RepoConfigSchema }),
})

export type DotdotConfig = typeof DotdotConfigSchema.Type

/** Helper to define config with type checking */
export const defineConfig = (config: DotdotConfig): DotdotConfig => config

/** Config file name */
export const CONFIG_FILE_NAME = 'dotdot.config.ts'
