/**
 * Config file writer
 *
 * Writes/updates dotdot.config.ts files
 */

import path from 'node:path'

import { FileSystem } from '@effect/platform'
import { Effect, Schema } from 'effect'

import { CONFIG_FILE_NAME, type DotdotConfig, type RepoConfig } from './config.ts'

/** Error when writing config file fails */
export class ConfigWriteError extends Schema.TaggedError<ConfigWriteError>()('ConfigWriteError', {
  path: Schema.String,
  message: Schema.String,
  cause: Schema.optional(Schema.Defect),
}) {}

/** Generate TypeScript config file content */
const generateConfigContent = (config: DotdotConfig): string => {
  const lines: string[] = []

  lines.push(`import { defineConfig } from 'dotdot'`)
  lines.push(``)
  lines.push(`export default defineConfig({`)
  lines.push(`  repos: {`)

  const repoEntries = Object.entries(config.repos)
  for (let i = 0; i < repoEntries.length; i++) {
    const [name, repoConfig] = repoEntries[i]!
    const props: string[] = []

    props.push(`url: '${repoConfig.url}'`)

    if (repoConfig.revision !== undefined) {
      props.push(`revision: '${repoConfig.revision}'`)
    }

    if (repoConfig.install !== undefined) {
      props.push(`install: '${repoConfig.install}'`)
    }

    if (repoConfig.expose !== undefined && repoConfig.expose.length > 0) {
      const exposeStr = repoConfig.expose.map((e) => `'${e}'`).join(', ')
      props.push(`expose: [${exposeStr}]`)
    }

    const comma = i < repoEntries.length - 1 ? ',' : ''
    lines.push(`    '${name}': { ${props.join(', ')} }${comma}`)
  }

  lines.push(`  },`)
  lines.push(`})`)
  lines.push(``)

  return lines.join('\n')
}

/** Write a config file */
export const writeConfig = (configPath: string, config: DotdotConfig) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const content = generateConfigContent(config)
    yield* fs.writeFileString(configPath, content).pipe(
      Effect.mapError(
        (cause) =>
          new ConfigWriteError({
            path: configPath,
            message: 'Failed to write config file',
            cause,
          }),
      ),
    )
  }).pipe(Effect.withSpan('config-writer/writeConfig'))

/** Add or update a repo in a config file */
export const upsertRepo = (
  configPath: string,
  name: string,
  repoConfig: RepoConfig,
  existingConfig: DotdotConfig,
) =>
  Effect.gen(function* () {
    const newConfig: DotdotConfig = {
      ...existingConfig,
      repos: {
        ...existingConfig.repos,
        [name]: repoConfig,
      },
    }
    yield* writeConfig(configPath, newConfig)
    return newConfig
  }).pipe(Effect.withSpan('config-writer/upsertRepo'))

/** Remove a repo from a config file */
export const removeRepo = (configPath: string, name: string, existingConfig: DotdotConfig) =>
  Effect.gen(function* () {
    const { [name]: _, ...remainingRepos } = existingConfig.repos
    const newConfig: DotdotConfig = {
      ...existingConfig,
      repos: remainingRepos,
    }
    yield* writeConfig(configPath, newConfig)
    return newConfig
  }).pipe(Effect.withSpan('config-writer/removeRepo'))

/** Update a repo's revision in a config file */
export const updateRepoRevision = (
  configPath: string,
  name: string,
  revision: string,
  existingConfig: DotdotConfig,
) =>
  Effect.gen(function* () {
    const existingRepo = existingConfig.repos[name]
    if (!existingRepo) {
      return yield* Effect.fail(
        new ConfigWriteError({
          path: configPath,
          message: `Repo '${name}' not found in config`,
        }),
      )
    }

    const newConfig: DotdotConfig = {
      ...existingConfig,
      repos: {
        ...existingConfig.repos,
        [name]: {
          ...existingRepo,
          revision,
        },
      },
    }
    yield* writeConfig(configPath, newConfig)
    return newConfig
  }).pipe(Effect.withSpan('config-writer/updateRepoRevision'))

/** Create an empty config file */
export const createEmptyConfig = (dir: string) =>
  Effect.gen(function* () {
    const configPath = path.join(dir, CONFIG_FILE_NAME)
    const config: DotdotConfig = { repos: {} }
    yield* writeConfig(configPath, config)
    return configPath
  }).pipe(Effect.withSpan('config-writer/createEmptyConfig'))
