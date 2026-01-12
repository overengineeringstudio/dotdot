import path from 'node:path'

import * as Cli from '@effect/cli'
import { FileSystem } from '@effect/platform'
import * as PlatformNode from '@effect/platform-node'
import { Effect, Layer, pipe } from 'effect'

import {
  cloneCommand,
  execCommand,
  linkCommand,
  pullCommand,
  restoreCommand,
  statusCommand,
  treeCommand,
  updateCommand,
} from './commands/mod.ts'
import { CONFIG_FILE_NAME, CurrentWorkingDirectory, resolveCliVersion } from './lib/mod.ts'

const baseVersion = '0.1.0'
const buildVersion = '__CLI_VERSION__'
const version = resolveCliVersion({
  baseVersion,
  buildVersion,
  runtimeStampEnvVar: 'NIX_CLI_BUILD_STAMP',
})

/** Initialize a new dotdot workspace */
const initCommand = Cli.Command.make('init', {}, () =>
  Effect.gen(function* () {
    const cwd = yield* CurrentWorkingDirectory
    const fs = yield* FileSystem.FileSystem

    const configPath = path.join(cwd, CONFIG_FILE_NAME)

    const exists = yield* fs.exists(configPath)
    if (exists) {
      yield* Effect.log('Workspace already initialized')
      return
    }

    yield* fs.writeFileString(
      configPath,
      `import { defineConfig } from 'dotdot'

export default defineConfig({
  repos: {},
})
`,
    )

    yield* Effect.log(`Initialized dotdot workspace at ${cwd}`)
  }).pipe(Effect.withSpan('dotdot/init')),
)

/** Root command */
const rootCommand = Cli.Command.make('dotdot', {}).pipe(
  Cli.Command.withSubcommands([
    initCommand,
    statusCommand,
    cloneCommand,
    restoreCommand,
    updateCommand,
    pullCommand,
    treeCommand,
    linkCommand,
    execCommand,
  ]),
)

/** Main CLI entry point */
export const dotdotCommand = rootCommand

if (import.meta.main) {
  pipe(
    Cli.Command.run(dotdotCommand, {
      name: 'dotdot',
      version,
    })(process.argv),
    Effect.provide(Layer.mergeAll(PlatformNode.NodeContext.layer, CurrentWorkingDirectory.live)),
    PlatformNode.NodeRuntime.runMain,
  )
}
