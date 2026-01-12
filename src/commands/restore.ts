/**
 * dotdot restore command
 *
 * Clone all declared repos that are missing
 */

import path from 'node:path'

import * as Cli from '@effect/cli'
import { FileSystem } from '@effect/platform'
import { Effect, Schema } from 'effect'

import {
  collectAllConfigs,
  CurrentWorkingDirectory,
  findWorkspaceRoot,
  Git,
  runShellCommand,
  type RepoConfig,
} from '../lib/mod.ts'

/** Error during restore operation */
export class RestoreError extends Schema.TaggedError<RestoreError>()('RestoreError', {
  repo: Schema.String,
  message: Schema.String,
  cause: Schema.optional(Schema.Defect),
}) {}

/** Result of restoring a single repo */
type RestoreResult = {
  name: string
  status: 'cloned' | 'checked-out' | 'skipped' | 'failed'
  message?: string
}

/** Restore a single repo */
const restoreRepo = (workspaceRoot: string, name: string, config: RepoConfig) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const repoPath = path.join(workspaceRoot, name)

    // Check if directory exists
    const exists = yield* fs.exists(repoPath)

    if (exists) {
      // Check if it's a git repo
      const isGitRepo = yield* Git.isGitRepo(repoPath)
      if (isGitRepo) {
        // Already exists as git repo - check if we need to checkout pinned revision
        if (config.revision) {
          const currentRev = yield* Git.getCurrentRev(repoPath)
          if (!currentRev.startsWith(config.revision) && currentRev !== config.revision) {
            yield* Git.checkout(repoPath, config.revision)
            return {
              name,
              status: 'checked-out',
              message: `Checked out ${config.revision.slice(0, 7)}`,
            } as RestoreResult
          }
        }
        return { name, status: 'skipped', message: 'Already exists' } as RestoreResult
      } else {
        // Directory exists but not a git repo
        return {
          name,
          status: 'failed',
          message: 'Directory exists but is not a git repo',
        } as RestoreResult
      }
    }

    // Clone the repo
    yield* Git.clone(config.url, repoPath)

    // Checkout pinned revision if specified
    if (config.revision) {
      yield* Git.checkout(repoPath, config.revision)
    }

    // Run install command if specified
    if (config.install) {
      yield* runShellCommand(config.install, repoPath)
    }

    const rev = yield* Git.getCurrentRev(repoPath)
    return {
      name,
      status: 'cloned',
      message: `Cloned at ${rev.slice(0, 7)}${config.install ? ' (installed)' : ''}`,
    } as RestoreResult
  }).pipe(
    Effect.catchAll((error) =>
      Effect.succeed({
        name,
        status: 'failed',
        message: error instanceof Error ? error.message : String(error),
      } as RestoreResult),
    ),
  )

/** Collect all declared repos from configs */
const collectDeclaredRepos = (
  configs: Array<{ config: { repos: Record<string, RepoConfig> }; isRoot: boolean; dir: string }>,
) => {
  const repos = new Map<string, RepoConfig>()

  for (const source of configs) {
    for (const [name, config] of Object.entries(source.config.repos)) {
      // First declaration wins (root config takes precedence)
      if (!repos.has(name)) {
        repos.set(name, config)
      }
    }
  }

  return repos
}

/** Restore command implementation */
export const restoreCommand = Cli.Command.make(
  'restore',
  {
    dryRun: Cli.Options.boolean('dry-run').pipe(
      Cli.Options.withDescription('Show what would be done without making changes'),
      Cli.Options.withDefault(false),
    ),
  },
  ({ dryRun }) =>
    Effect.gen(function* () {
      const cwd = yield* CurrentWorkingDirectory

      // Find workspace root
      const workspaceRoot = yield* findWorkspaceRoot(cwd)

      yield* Effect.log(`dotdot workspace: ${workspaceRoot}`)

      // Collect all configs
      const configs = yield* collectAllConfigs(workspaceRoot)

      // Get declared repos
      const declaredRepos = collectDeclaredRepos(configs)

      if (declaredRepos.size === 0) {
        yield* Effect.log('No repos declared in config')
        return
      }

      yield* Effect.log(`Found ${declaredRepos.size} declared repo(s)`)
      yield* Effect.log('')

      if (dryRun) {
        yield* Effect.log('Dry run - no changes will be made')
        yield* Effect.log('')
      }

      // Restore each repo
      const results: RestoreResult[] = []

      for (const [name, config] of declaredRepos.entries()) {
        if (dryRun) {
          const fs = yield* FileSystem.FileSystem
          const repoPath = path.join(workspaceRoot, name)
          const exists = yield* fs.exists(repoPath)
          if (exists) {
            yield* Effect.log(`  ${name}: would skip (already exists)`)
          } else {
            yield* Effect.log(`  ${name}: would clone from ${config.url}`)
          }
        } else {
          yield* Effect.log(`Restoring ${name}...`)
          const result = yield* restoreRepo(workspaceRoot, name, config)
          results.push(result)
          yield* Effect.log(`  ${result.status}: ${result.message ?? ''}`)
        }
      }

      if (!dryRun) {
        yield* Effect.log('')

        const cloned = results.filter((r) => r.status === 'cloned').length
        const checkedOut = results.filter((r) => r.status === 'checked-out').length
        const skipped = results.filter((r) => r.status === 'skipped').length
        const failed = results.filter((r) => r.status === 'failed').length

        const summary: string[] = []
        if (cloned > 0) summary.push(`${cloned} cloned`)
        if (checkedOut > 0) summary.push(`${checkedOut} checked out`)
        if (skipped > 0) summary.push(`${skipped} skipped`)
        if (failed > 0) summary.push(`${failed} failed`)

        yield* Effect.log(`Done: ${summary.join(', ')}`)
      }
    }).pipe(Effect.withSpan('dotdot/restore')),
)
