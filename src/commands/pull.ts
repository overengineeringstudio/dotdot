/**
 * dotdot pull command
 *
 * Pull all repos from their remotes
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
  type RepoConfig,
} from '../lib/mod.ts'

/** Error during pull operation */
export class PullError extends Schema.TaggedError<PullError>()('PullError', {
  repo: Schema.String,
  message: Schema.String,
  cause: Schema.optional(Schema.Defect),
}) {}

/** Result of pulling a single repo */
type PullResult = {
  name: string
  status: 'pulled' | 'skipped' | 'failed'
  message?: string
  diverged?: boolean
}

/** Collect all declared repos from configs */
const collectDeclaredRepos = (
  configs: Array<{ config: { repos: Record<string, RepoConfig> }; isRoot: boolean; dir: string }>,
) => {
  const repos = new Map<string, RepoConfig>()

  for (const source of configs) {
    for (const [name, config] of Object.entries(source.config.repos)) {
      if (!repos.has(name)) {
        repos.set(name, config)
      }
    }
  }

  return repos
}

/** Pull a single repo */
const pullRepo = (workspaceRoot: string, name: string, config: RepoConfig) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const repoPath = path.join(workspaceRoot, name)

    // Check if directory exists
    const exists = yield* fs.exists(repoPath)
    if (!exists) {
      return { name, status: 'skipped', message: 'Directory does not exist' } as PullResult
    }

    // Check if it's a git repo
    const isGitRepo = yield* Git.isGitRepo(repoPath)
    if (!isGitRepo) {
      return { name, status: 'skipped', message: 'Not a git repo' } as PullResult
    }

    // Check if on a branch (not detached HEAD)
    const branch = yield* Git.getCurrentBranch(repoPath)
    if (branch === 'HEAD') {
      return { name, status: 'skipped', message: 'Detached HEAD' } as PullResult
    }

    // Check if dirty
    const isDirty = yield* Git.isDirty(repoPath)
    if (isDirty) {
      return {
        name,
        status: 'skipped',
        message: 'Working tree has uncommitted changes',
      } as PullResult
    }

    // Pull
    yield* Git.pull(repoPath)

    // Check if now diverged from pinned revision
    let diverged = false
    if (config.revision) {
      const currentRev = yield* Git.getCurrentRev(repoPath)
      diverged = !currentRev.startsWith(config.revision) && currentRev !== config.revision
    }

    return {
      name,
      status: 'pulled',
      message: diverged ? 'Pulled (now diverged from pinned revision)' : 'Pulled',
      diverged,
    } as PullResult
  }).pipe(
    Effect.catchAll((error) =>
      Effect.succeed({
        name,
        status: 'failed',
        message: error instanceof Error ? error.message : String(error),
      } as PullResult),
    ),
  )

/** Pull command implementation */
export const pullCommand = Cli.Command.make('pull', {}, () =>
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
      yield* Effect.log('No repos to pull')
      return
    }

    yield* Effect.log(`Pulling ${declaredRepos.size} repo(s)...`)
    yield* Effect.log('')

    const results: PullResult[] = []

    for (const [name, config] of declaredRepos.entries()) {
      yield* Effect.log(`Pulling ${name}...`)
      const result = yield* pullRepo(workspaceRoot, name, config)
      results.push(result)

      const statusIcon =
        result.status === 'pulled'
          ? result.diverged
            ? '⚠'
            : '✓'
          : result.status === 'failed'
            ? '✗'
            : '○'
      yield* Effect.log(`  ${statusIcon} ${result.message ?? result.status}`)
    }

    yield* Effect.log('')

    const pulled = results.filter((r) => r.status === 'pulled').length
    const diverged = results.filter((r) => r.diverged).length
    const skipped = results.filter((r) => r.status === 'skipped').length
    const failed = results.filter((r) => r.status === 'failed').length

    const summary: string[] = []
    if (pulled > 0) summary.push(`${pulled} pulled`)
    if (diverged > 0) summary.push(`${diverged} diverged`)
    if (skipped > 0) summary.push(`${skipped} skipped`)
    if (failed > 0) summary.push(`${failed} failed`)

    yield* Effect.log(`Done: ${summary.join(', ')}`)

    if (diverged > 0) {
      yield* Effect.log('')
      yield* Effect.log('Warning: Some repos are now diverged from their pinned revisions.')
      yield* Effect.log(
        'Run `dotdot update` to update pins, or `dotdot restore` to reset to pinned revisions.',
      )
    }
  }).pipe(Effect.withSpan('dotdot/pull')),
)
