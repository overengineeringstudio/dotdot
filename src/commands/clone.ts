/**
 * dotdot clone command
 *
 * Clone a repo into the workspace
 */

import path from 'node:path'

import * as Cli from '@effect/cli'
import { FileSystem } from '@effect/platform'
import { Effect, Option, Schema } from 'effect'

import {
  CONFIG_FILE_NAME,
  CurrentWorkingDirectory,
  findWorkspaceRoot,
  Git,
  loadRootConfig,
  runShellCommand,
  upsertRepo,
} from '../lib/mod.ts'

/** Error during clone operation */
export class CloneError extends Schema.TaggedError<CloneError>()('CloneError', {
  url: Schema.String,
  message: Schema.String,
  cause: Schema.optional(Schema.Defect),
}) {}

/** Extract repo name from git URL */
const extractRepoName = (url: string): string => {
  // Handle various URL formats:
  // git@github.com:org/repo.git -> repo
  // https://github.com/org/repo.git -> repo
  // https://github.com/org/repo -> repo
  // /path/to/repo.git -> repo
  // /path/to/repo -> repo

  let name = url

  // Remove .git suffix
  if (name.endsWith('.git')) {
    name = name.slice(0, -4)
  }

  // Get last path segment
  const lastSlash = Math.max(name.lastIndexOf('/'), name.lastIndexOf(':'))
  if (lastSlash !== -1) {
    name = name.slice(lastSlash + 1)
  }

  return name
}

/** Clone command implementation */
export const cloneCommand = Cli.Command.make(
  'clone',
  {
    url: Cli.Args.text({ name: 'url' }).pipe(
      Cli.Args.withDescription('Git repository URL to clone'),
    ),
    name: Cli.Args.text({ name: 'name' }).pipe(
      Cli.Args.withDescription('Target directory name (defaults to repo name from URL)'),
      Cli.Args.optional,
    ),
    install: Cli.Options.text('install').pipe(
      Cli.Options.withDescription('Install command to run after cloning'),
      Cli.Options.optional,
    ),
  },
  ({ url, name, install }) =>
    Effect.gen(function* () {
      const cwd = yield* CurrentWorkingDirectory
      const fs = yield* FileSystem.FileSystem

      // Find workspace root
      const workspaceRoot = yield* findWorkspaceRoot(cwd)

      // Determine target name
      const targetName = Option.getOrElse(name, () => extractRepoName(url))
      const targetPath = path.join(workspaceRoot, targetName)

      // Check if target already exists
      const exists = yield* fs.exists(targetPath)
      if (exists) {
        return yield* Effect.fail(
          new CloneError({
            url,
            message: `Target directory '${targetName}' already exists`,
          }),
        )
      }

      yield* Effect.log(`Cloning ${url} into ${targetName}...`)

      // Clone the repo
      yield* Git.clone(url, targetPath)

      // Get current revision
      const rev = yield* Git.getCurrentRev(targetPath)

      // Load root config and add the repo
      const rootConfig = yield* loadRootConfig(workspaceRoot)
      const configPath = path.join(workspaceRoot, CONFIG_FILE_NAME)

      const installCmd = Option.getOrUndefined(install)
      yield* upsertRepo(
        configPath,
        targetName,
        { url, revision: rev, install: installCmd },
        rootConfig.config,
      )

      yield* Effect.log(`Cloned ${targetName} at revision ${rev.slice(0, 7)}`)
      yield* Effect.log(`Added to ${CONFIG_FILE_NAME}`)

      // Run install command if specified
      if (installCmd) {
        yield* Effect.log(`Running install command: ${installCmd}`)
        yield* runShellCommand(installCmd, targetPath)
        yield* Effect.log('Install completed')
      }
    }).pipe(Effect.withSpan('dotdot/clone')),
)
