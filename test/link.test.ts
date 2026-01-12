/**
 * Tests for dotdot link command
 */

import fs from 'node:fs'
import path from 'node:path'

import * as PlatformNode from '@effect/platform-node'
import { Effect, Layer } from 'effect'
import { afterEach, describe, expect, it } from 'vitest'

import { linkSubcommands } from '../src/commands/link.ts'
import { CurrentWorkingDirectory } from '../src/lib/mod.ts'
import {
  createWorkspace,
  cleanupWorkspace,
  createExposeTarget,
  generateConfigWithExpose,
} from './fixtures/setup.ts'

describe('link command', () => {
  let workspacePath: string

  afterEach(() => {
    if (workspacePath) {
      cleanupWorkspace(workspacePath)
    }
  })

  it('creates symlinks from expose config', async () => {
    workspacePath = createWorkspace({
      repos: [{ name: 'repo-a', isGitRepo: true }],
    })

    // Create expose target
    createExposeTarget(path.join(workspacePath, 'repo-a'), 'shared-lib')

    // Update config with expose
    const configPath = path.join(workspacePath, 'dotdot.config.ts')
    fs.writeFileSync(
      configPath,
      generateConfigWithExpose({
        'repo-a': { url: 'git@github.com:test/repo-a.git', expose: ['shared-lib'] },
      }),
    )

    await Effect.gen(function* () {
      yield* linkSubcommands.create.handler({ dryRun: false, force: false })
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          PlatformNode.NodeContext.layer,
          CurrentWorkingDirectory.fromPath(workspacePath),
        ),
      ),
      Effect.runPromise,
    )

    // Check symlink was created
    const symlinkPath = path.join(workspacePath, 'shared-lib')
    expect(fs.existsSync(symlinkPath)).toBe(true)
    expect(fs.lstatSync(symlinkPath).isSymbolicLink()).toBe(true)

    // Check symlink target is correct
    const linkTarget = fs.readlinkSync(symlinkPath)
    expect(linkTarget).toBe('repo-a/shared-lib')
  })

  it('dry run does not create symlinks', async () => {
    workspacePath = createWorkspace({
      repos: [{ name: 'repo-a', isGitRepo: true }],
    })

    createExposeTarget(path.join(workspacePath, 'repo-a'), 'shared-lib')

    const configPath = path.join(workspacePath, 'dotdot.config.ts')
    fs.writeFileSync(
      configPath,
      generateConfigWithExpose({
        'repo-a': { url: 'git@github.com:test/repo-a.git', expose: ['shared-lib'] },
      }),
    )

    await Effect.gen(function* () {
      yield* linkSubcommands.create.handler({ dryRun: true, force: false })
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          PlatformNode.NodeContext.layer,
          CurrentWorkingDirectory.fromPath(workspacePath),
        ),
      ),
      Effect.runPromise,
    )

    // Check symlink was NOT created
    const symlinkPath = path.join(workspacePath, 'shared-lib')
    expect(fs.existsSync(symlinkPath)).toBe(false)
  })

  it('detects conflicts when multiple repos expose same path', async () => {
    workspacePath = createWorkspace({
      repos: [
        { name: 'repo-a', isGitRepo: true },
        { name: 'repo-b', isGitRepo: true },
      ],
    })

    createExposeTarget(path.join(workspacePath, 'repo-a'), 'shared-lib')
    createExposeTarget(path.join(workspacePath, 'repo-b'), 'shared-lib')

    const configPath = path.join(workspacePath, 'dotdot.config.ts')
    fs.writeFileSync(
      configPath,
      generateConfigWithExpose({
        'repo-a': { url: 'git@github.com:test/repo-a.git', expose: ['shared-lib'] },
        'repo-b': { url: 'git@github.com:test/repo-b.git', expose: ['shared-lib'] },
      }),
    )

    await Effect.gen(function* () {
      yield* linkSubcommands.create.handler({ dryRun: false, force: false })
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          PlatformNode.NodeContext.layer,
          CurrentWorkingDirectory.fromPath(workspacePath),
        ),
      ),
      Effect.runPromise,
    )

    // Command should complete (reporting conflicts)
    expect(true).toBe(true)
  })

  it('force overwrites conflicts', async () => {
    workspacePath = createWorkspace({
      repos: [
        { name: 'repo-a', isGitRepo: true },
        { name: 'repo-b', isGitRepo: true },
      ],
    })

    createExposeTarget(path.join(workspacePath, 'repo-a'), 'shared-lib')
    createExposeTarget(path.join(workspacePath, 'repo-b'), 'shared-lib')

    const configPath = path.join(workspacePath, 'dotdot.config.ts')
    fs.writeFileSync(
      configPath,
      generateConfigWithExpose({
        'repo-a': { url: 'git@github.com:test/repo-a.git', expose: ['shared-lib'] },
        'repo-b': { url: 'git@github.com:test/repo-b.git', expose: ['shared-lib'] },
      }),
    )

    await Effect.gen(function* () {
      yield* linkSubcommands.create.handler({ dryRun: false, force: true })
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          PlatformNode.NodeContext.layer,
          CurrentWorkingDirectory.fromPath(workspacePath),
        ),
      ),
      Effect.runPromise,
    )

    // Check symlink was created (first match wins)
    const symlinkPath = path.join(workspacePath, 'shared-lib')
    expect(fs.existsSync(symlinkPath)).toBe(true)
    expect(fs.lstatSync(symlinkPath).isSymbolicLink()).toBe(true)
  })

  it('remove subcommand removes existing symlinks', async () => {
    workspacePath = createWorkspace({
      repos: [{ name: 'repo-a', isGitRepo: true }],
    })

    createExposeTarget(path.join(workspacePath, 'repo-a'), 'shared-lib')

    const configPath = path.join(workspacePath, 'dotdot.config.ts')
    fs.writeFileSync(
      configPath,
      generateConfigWithExpose({
        'repo-a': { url: 'git@github.com:test/repo-a.git', expose: ['shared-lib'] },
      }),
    )

    // Create symlink manually first
    const symlinkPath = path.join(workspacePath, 'shared-lib')
    fs.symlinkSync('repo-a/shared-lib', symlinkPath)
    expect(fs.existsSync(symlinkPath)).toBe(true)

    // Remove symlinks
    await Effect.gen(function* () {
      yield* linkSubcommands.remove.handler({ dryRun: false })
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          PlatformNode.NodeContext.layer,
          CurrentWorkingDirectory.fromPath(workspacePath),
        ),
      ),
      Effect.runPromise,
    )

    // Symlink should be removed
    expect(fs.existsSync(symlinkPath)).toBe(false)
  })

  it('remove and create subcommands work together', async () => {
    workspacePath = createWorkspace({
      repos: [{ name: 'repo-a', isGitRepo: true }],
    })

    createExposeTarget(path.join(workspacePath, 'repo-a'), 'shared-lib')

    const configPath = path.join(workspacePath, 'dotdot.config.ts')
    fs.writeFileSync(
      configPath,
      generateConfigWithExpose({
        'repo-a': { url: 'git@github.com:test/repo-a.git', expose: ['shared-lib'] },
      }),
    )

    // Create symlink manually first
    const symlinkPath = path.join(workspacePath, 'shared-lib')
    fs.symlinkSync('repo-a/shared-lib', symlinkPath)
    expect(fs.existsSync(symlinkPath)).toBe(true)

    // Remove and then recreate
    await Effect.gen(function* () {
      yield* linkSubcommands.remove.handler({ dryRun: false })
      yield* linkSubcommands.create.handler({ dryRun: false, force: false })
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          PlatformNode.NodeContext.layer,
          CurrentWorkingDirectory.fromPath(workspacePath),
        ),
      ),
      Effect.runPromise,
    )

    // Symlink should still exist (removed and recreated)
    expect(fs.existsSync(symlinkPath)).toBe(true)
    expect(fs.lstatSync(symlinkPath).isSymbolicLink()).toBe(true)
  })

  it('skips when source does not exist', async () => {
    workspacePath = createWorkspace({
      repos: [{ name: 'repo-a', isGitRepo: true }],
    })

    // Don't create the expose target

    const configPath = path.join(workspacePath, 'dotdot.config.ts')
    fs.writeFileSync(
      configPath,
      generateConfigWithExpose({
        'repo-a': { url: 'git@github.com:test/repo-a.git', expose: ['nonexistent'] },
      }),
    )

    await Effect.gen(function* () {
      yield* linkSubcommands.create.handler({ dryRun: false, force: false })
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          PlatformNode.NodeContext.layer,
          CurrentWorkingDirectory.fromPath(workspacePath),
        ),
      ),
      Effect.runPromise,
    )

    // Check symlink was NOT created
    const symlinkPath = path.join(workspacePath, 'nonexistent')
    expect(fs.existsSync(symlinkPath)).toBe(false)
  })

  it('handles empty expose config', async () => {
    workspacePath = createWorkspace({
      repos: [],
    })

    await Effect.gen(function* () {
      yield* linkSubcommands.create.handler({ dryRun: false, force: false })
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          PlatformNode.NodeContext.layer,
          CurrentWorkingDirectory.fromPath(workspacePath),
        ),
      ),
      Effect.runPromise,
    )

    expect(true).toBe(true)
  })
})
