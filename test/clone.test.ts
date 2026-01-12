/**
 * Tests for dotdot clone command
 */

import fs from 'node:fs'
import path from 'node:path'

import * as PlatformNode from '@effect/platform-node'
import { Effect, Layer, Option } from 'effect'
import { afterEach, describe, expect, it } from 'vitest'

import { cloneCommand } from '../src/commands/mod.ts'
import { CurrentWorkingDirectory } from '../src/lib/mod.ts'
import {
  createWorkspace,
  cleanupWorkspace,
  createBareRepo,
  readConfig,
  getGitRev,
} from './fixtures/setup.ts'

describe('clone command', () => {
  let workspacePath: string
  let bareRepoPath: string

  afterEach(() => {
    if (workspacePath) {
      cleanupWorkspace(workspacePath)
    }
    if (bareRepoPath) {
      const parentDir = path.dirname(bareRepoPath)
      fs.rmSync(parentDir, { recursive: true, force: true })
    }
  })

  it('clones a repo into workspace', async () => {
    workspacePath = createWorkspace({ repos: [] })
    bareRepoPath = createBareRepo('test-repo')

    await Effect.gen(function* () {
      yield* cloneCommand.handler({
        url: bareRepoPath,
        name: Option.none(),
        install: Option.none(),
      })
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          PlatformNode.NodeContext.layer,
          CurrentWorkingDirectory.fromPath(workspacePath),
        ),
      ),
      Effect.runPromise,
    )

    // Check repo was cloned (extractRepoName removes .git suffix)
    const repoPath = path.join(workspacePath, 'test-repo')
    expect(fs.existsSync(repoPath)).toBe(true)
    expect(fs.existsSync(path.join(repoPath, '.git'))).toBe(true)

    // Check config was updated
    const config = readConfig(workspacePath)
    expect(config).toContain("'test-repo'")
    expect(config).toContain(`url: '${bareRepoPath}'`)
  })

  it('clones with custom name', async () => {
    workspacePath = createWorkspace({ repos: [] })
    bareRepoPath = createBareRepo('original-name')

    await Effect.gen(function* () {
      yield* cloneCommand.handler({
        url: bareRepoPath,
        name: Option.some('custom-name'),
        install: Option.none(),
      })
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          PlatformNode.NodeContext.layer,
          CurrentWorkingDirectory.fromPath(workspacePath),
        ),
      ),
      Effect.runPromise,
    )

    // Check repo was cloned with custom name
    const repoPath = path.join(workspacePath, 'custom-name')
    expect(fs.existsSync(repoPath)).toBe(true)

    // Check config uses custom name
    const config = readConfig(workspacePath)
    expect(config).toContain("'custom-name'")
    expect(config).not.toContain("'original-name'")
  })

  it('fails if target already exists', async () => {
    workspacePath = createWorkspace({
      repos: [{ name: 'existing-repo', isGitRepo: true }],
    })
    bareRepoPath = createBareRepo('existing-repo')

    const result = await Effect.gen(function* () {
      yield* cloneCommand.handler({
        url: bareRepoPath,
        name: Option.some('existing-repo'),
        install: Option.none(),
      })
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          PlatformNode.NodeContext.layer,
          CurrentWorkingDirectory.fromPath(workspacePath),
        ),
      ),
      Effect.either,
      Effect.runPromise,
    )

    expect(result._tag).toBe('Left')
  })

  it('pins revision in config', async () => {
    workspacePath = createWorkspace({ repos: [] })
    bareRepoPath = createBareRepo('repo-with-rev')

    await Effect.gen(function* () {
      yield* cloneCommand.handler({
        url: bareRepoPath,
        name: Option.some('repo-with-rev'),
        install: Option.none(),
      })
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          PlatformNode.NodeContext.layer,
          CurrentWorkingDirectory.fromPath(workspacePath),
        ),
      ),
      Effect.runPromise,
    )

    const repoPath = path.join(workspacePath, 'repo-with-rev')
    const rev = getGitRev(repoPath)

    const config = readConfig(workspacePath)
    expect(config).toContain(`revision: '${rev}'`)
  })
})
