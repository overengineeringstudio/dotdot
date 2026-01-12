/**
 * dotdot link command
 *
 * Manage symlinks based on expose configuration
 */

import path from 'node:path'

import * as Cli from '@effect/cli'
import { FileSystem } from '@effect/platform'
import { Effect, Schema } from 'effect'

import {
  collectAllConfigs,
  CurrentWorkingDirectory,
  findWorkspaceRoot,
  type ConfigSource,
} from '../lib/mod.ts'

/** Error during link operation */
export class LinkError extends Schema.TaggedError<LinkError>()('LinkError', {
  path: Schema.String,
  message: Schema.String,
  cause: Schema.optional(Schema.Defect),
}) {}

/** Expose mapping info */
type ExposeMapping = {
  /** Source path (absolute) */
  source: string
  /** Target path at workspace root (absolute) */
  target: string
  /** Target name (for display) */
  targetName: string
  /** Repo that declares this expose */
  declaredBy: string
  /** Repo that contains the source */
  sourceRepo: string
}

/** Collect all expose mappings from configs */
const collectExposeMappings = (workspaceRoot: string, configs: ConfigSource[]): ExposeMapping[] => {
  const mappings: ExposeMapping[] = []

  for (const source of configs) {
    const sourceRepoName = source.isRoot ? null : path.basename(source.dir)

    for (const [repoName, config] of Object.entries(source.config.repos)) {
      if (!config.expose || config.expose.length === 0) continue

      for (const exposePath of config.expose) {
        // Source is relative to the repo
        const sourceFull = path.join(workspaceRoot, repoName, exposePath)

        // Target is at workspace root using the last segment of the expose path
        const targetName = path.basename(exposePath)
        const targetFull = path.join(workspaceRoot, targetName)

        mappings.push({
          source: sourceFull,
          target: targetFull,
          targetName,
          declaredBy: source.isRoot ? '(root)' : sourceRepoName!,
          sourceRepo: repoName,
        })
      }
    }
  }

  return mappings
}

/** Check for conflicts in expose mappings */
const findConflicts = (mappings: ExposeMapping[]): Map<string, ExposeMapping[]> => {
  const byTarget = new Map<string, ExposeMapping[]>()

  for (const mapping of mappings) {
    const existing = byTarget.get(mapping.targetName) ?? []
    existing.push(mapping)
    byTarget.set(mapping.targetName, existing)
  }

  // Return only those with conflicts
  const conflicts = new Map<string, ExposeMapping[]>()
  for (const [targetName, sources] of byTarget) {
    if (sources.length > 1) {
      conflicts.set(targetName, sources)
    }
  }

  return conflicts
}

/** Get unique mappings (first one wins in case of conflicts) */
const getUniqueMappings = (mappings: ExposeMapping[]): Map<string, ExposeMapping> => {
  const uniqueMappings = new Map<string, ExposeMapping>()
  for (const mapping of mappings) {
    if (!uniqueMappings.has(mapping.targetName)) {
      uniqueMappings.set(mapping.targetName, mapping)
    }
  }
  return uniqueMappings
}

/** Show status of all expose mappings */
const linkStatusCommand = Cli.Command.make('status', {}, () =>
  Effect.gen(function* () {
    const cwd = yield* CurrentWorkingDirectory
    const fs = yield* FileSystem.FileSystem

    const workspaceRoot = yield* findWorkspaceRoot(cwd)

    yield* Effect.log(`dotdot workspace: ${workspaceRoot}`)
    yield* Effect.log('')

    const configs = yield* collectAllConfigs(workspaceRoot)
    const mappings = collectExposeMappings(workspaceRoot, configs)

    if (mappings.length === 0) {
      yield* Effect.log('No expose configurations found')
      return
    }

    // Check for conflicts
    const conflicts = findConflicts(mappings)
    if (conflicts.size > 0) {
      yield* Effect.log('Conflicts:')
      for (const [targetName, sources] of conflicts) {
        yield* Effect.log(`  ${targetName}:`)
        for (const source of sources) {
          yield* Effect.log(
            `    - ${source.sourceRepo}/${path.relative(path.join(workspaceRoot, source.sourceRepo), source.source)} (from ${source.declaredBy})`,
          )
        }
      }
      yield* Effect.log('')
    }

    yield* Effect.log('Expose mappings:')

    const uniqueMappings = getUniqueMappings(mappings)

    for (const [targetName, mapping] of uniqueMappings) {
      const targetExists = yield* fs.exists(mapping.target)
      const sourceExists = yield* fs.exists(mapping.source)
      const relativePath = path.relative(workspaceRoot, mapping.source)

      let status: string
      if (!sourceExists) {
        status = 'source missing'
      } else if (!targetExists) {
        status = 'not linked'
      } else {
        const stat = yield* fs.stat(mapping.target)
        if (stat.type === 'SymbolicLink') {
          status = 'linked'
        } else {
          status = 'blocked (not a symlink)'
        }
      }

      yield* Effect.log(`  ${targetName} -> ${relativePath} [${status}]`)
    }
  }).pipe(Effect.withSpan('dotdot/link/status')),
)

/** Create symlinks for all expose mappings */
const linkCreateCommand = Cli.Command.make(
  'create',
  {
    dryRun: Cli.Options.boolean('dry-run').pipe(
      Cli.Options.withDescription('Show what would be done without making changes'),
      Cli.Options.withDefault(false),
    ),
    force: Cli.Options.boolean('force').pipe(
      Cli.Options.withDescription('Overwrite existing files/symlinks'),
      Cli.Options.withDefault(false),
    ),
  },
  ({ dryRun, force }) =>
    Effect.gen(function* () {
      const cwd = yield* CurrentWorkingDirectory
      const fs = yield* FileSystem.FileSystem

      const workspaceRoot = yield* findWorkspaceRoot(cwd)

      yield* Effect.log(`dotdot workspace: ${workspaceRoot}`)
      yield* Effect.log('')

      const configs = yield* collectAllConfigs(workspaceRoot)
      const mappings = collectExposeMappings(workspaceRoot, configs)

      if (mappings.length === 0) {
        yield* Effect.log('No expose configurations found')
        return
      }

      // Check for conflicts
      const conflicts = findConflicts(mappings)
      if (conflicts.size > 0 && !force) {
        yield* Effect.log('Expose conflicts detected:')
        yield* Effect.log('')

        for (const [targetName, sources] of conflicts) {
          yield* Effect.log(`  ${targetName}:`)
          for (const source of sources) {
            yield* Effect.log(
              `    - ${source.sourceRepo}/${path.relative(path.join(workspaceRoot, source.sourceRepo), source.source)} (from ${source.declaredBy})`,
            )
          }
        }

        yield* Effect.log('')
        yield* Effect.log('Use --force to overwrite with the first match')
        return
      }

      if (dryRun) {
        yield* Effect.log('Dry run - no changes will be made')
        yield* Effect.log('')
      }

      yield* Effect.log('Creating symlinks...')

      const created: string[] = []
      const skipped: string[] = []

      const uniqueMappings = getUniqueMappings(mappings)

      for (const [targetName, mapping] of uniqueMappings) {
        const sourceExists = yield* fs.exists(mapping.source)
        if (!sourceExists) {
          yield* Effect.log(`  Skipped: ${targetName} (source does not exist)`)
          skipped.push(targetName)
          continue
        }

        const targetExists = yield* fs.exists(mapping.target)
        if (targetExists) {
          if (force) {
            if (!dryRun) {
              yield* fs.remove(mapping.target)
            }
          } else {
            yield* Effect.log(`  Skipped: ${targetName} (target already exists)`)
            skipped.push(targetName)
            continue
          }
        }

        const relativePath = path.relative(workspaceRoot, mapping.source)

        if (dryRun) {
          yield* Effect.log(`  Would create: ${targetName} -> ${relativePath}`)
          created.push(targetName)
        } else {
          yield* fs.symlink(relativePath, mapping.target).pipe(
            Effect.mapError(
              (cause) =>
                new LinkError({
                  path: mapping.target,
                  message: `Failed to create symlink`,
                  cause,
                }),
            ),
          )
          yield* Effect.log(`  Created: ${targetName} -> ${relativePath}`)
          created.push(targetName)
        }
      }

      yield* Effect.log('')

      const summary: string[] = []
      if (created.length > 0) summary.push(`${created.length} created`)
      if (skipped.length > 0) summary.push(`${skipped.length} skipped`)

      yield* Effect.log(`Done: ${summary.join(', ')}`)
    }).pipe(Effect.withSpan('dotdot/link/create')),
)

/** Remove all symlinks created by expose */
const linkRemoveCommand = Cli.Command.make(
  'remove',
  {
    dryRun: Cli.Options.boolean('dry-run').pipe(
      Cli.Options.withDescription('Show what would be done without making changes'),
      Cli.Options.withDefault(false),
    ),
  },
  ({ dryRun }) =>
    Effect.gen(function* () {
      const cwd = yield* CurrentWorkingDirectory
      const fs = yield* FileSystem.FileSystem

      const workspaceRoot = yield* findWorkspaceRoot(cwd)

      yield* Effect.log(`dotdot workspace: ${workspaceRoot}`)
      yield* Effect.log('')

      const configs = yield* collectAllConfigs(workspaceRoot)
      const mappings = collectExposeMappings(workspaceRoot, configs)

      if (mappings.length === 0) {
        yield* Effect.log('No expose configurations found')
        return
      }

      if (dryRun) {
        yield* Effect.log('Dry run - no changes will be made')
        yield* Effect.log('')
      }

      yield* Effect.log('Removing symlinks...')

      const removed: string[] = []
      const skipped: string[] = []

      const seenTargets = new Set(mappings.map((m) => m.targetName))

      for (const targetName of seenTargets) {
        const targetPath = path.join(workspaceRoot, targetName)
        const exists = yield* fs.exists(targetPath)

        if (!exists) {
          skipped.push(targetName)
          continue
        }

        const stat = yield* fs.stat(targetPath)
        if (stat.type !== 'SymbolicLink') {
          yield* Effect.log(`  Skipped: ${targetName} (not a symlink)`)
          skipped.push(targetName)
          continue
        }

        if (dryRun) {
          yield* Effect.log(`  Would remove: ${targetName}`)
          removed.push(targetName)
        } else {
          yield* fs.remove(targetPath)
          yield* Effect.log(`  Removed: ${targetName}`)
          removed.push(targetName)
        }
      }

      yield* Effect.log('')

      const summary: string[] = []
      if (removed.length > 0) summary.push(`${removed.length} removed`)
      if (skipped.length > 0) summary.push(`${skipped.length} skipped`)

      yield* Effect.log(`Done: ${summary.join(', ')}`)
    }).pipe(Effect.withSpan('dotdot/link/remove')),
)

/** Root link command with subcommands */
const linkRoot = Cli.Command.make('link', {})

/** Link command with subcommands: status, create, remove */
export const linkCommand = linkRoot.pipe(
  Cli.Command.withSubcommands([linkStatusCommand, linkCreateCommand, linkRemoveCommand]),
)

/** Exported subcommands for testing */
export const linkSubcommands = {
  status: linkStatusCommand,
  create: linkCreateCommand,
  remove: linkRemoveCommand,
}
