# dotdot

Opinionated multi-repo workspace management CLI - an alternative to Git submodules.

## Status

**Early development** - Core infrastructure and `status` command implemented.

## Overview

dotdot provides an opinionated way to:
- Manage multiple git repos as flat peers in a workspace
- Track dependencies between repos with revision pinning
- Share repo configurations across the workspace
- Work with tools like pnpm, bun, and nix flakes

## Quick Start

```bash
# Initialize a workspace
mkdir my-workspace && cd my-workspace
dotdot init

# This creates:
# - .dotdot/          (workspace marker)
# - dotdot.config.ts  (root configuration)

# Check workspace status
dotdot status
```

## Workspace Structure

```
my-workspace/
├── .dotdot/              # Workspace marker directory
├── dotdot.config.ts      # Root configuration
├── repo-a/               # Peer repo
│   └── dotdot.config.ts  # Optional: repo's own dependencies
├── repo-b/               # Peer repo
└── repo-c/               # Peer repo
```

## Configuration

dotdot uses TypeScript configuration files for type safety and IDE support.

```typescript
// dotdot.config.ts
import { defineConfig } from 'dotdot'

export default defineConfig({
  repos: {
    'effect-utils': {
      url: 'git@github.com:org/effect-utils.git',
      rev: 'abc123...',  // Optional: pinned revision
    },
    'shared-types': {
      url: 'git@github.com:org/shared-types.git',
      expose: ['packages/types'],  // Optional: symlink paths to root
    },
  },
})
```

### Repo Config Schema

```typescript
type RepoConfig = {
  url: string                // Git remote URL
  rev?: string              // Pinned revision (commit SHA)
  install?: string          // Post-clone install command
  expose?: string[]         // Paths to symlink to workspace root
}
```

## Commands

### `dotdot init`

Initialize a new workspace in the current directory.

```bash
dotdot init
```

Creates `.dotdot/` directory and `dotdot.config.ts` file.

### `dotdot status`

Show the status of all repos in the workspace.

```bash
dotdot status
```

Output example:
```
dotdot workspace: /path/to/workspace

Declared repos (3):
  repo-a: main@abc1234
  repo-b: main@def5678 *dirty* [diverged from old1234]
  missing-repo: MISSING

Undeclared repos (1):
  extra-repo: feature@ghi9012 [not in config]
```

Status indicators:
- `*dirty*` - Working tree has uncommitted changes
- `[diverged from xxx]` - Current revision doesn't match pinned revision
- `[no pin]` - No revision pinned in config
- `MISSING` - Declared but directory doesn't exist
- `[not in config]` - Git repo exists but not declared in any config

### `dotdot clone` (planned)

Clone a repo into the workspace.

### `dotdot restore` (planned)

Clone all declared repos that are missing.

### `dotdot update` (planned)

Update pinned revisions to current HEAD.

## Design Documents

- [Core Concepts](./design/concepts.md) - Workspace, repos, configuration
- [Commands](./design/commands.md) - CLI command reference
- [Workflows](./design/workflows.md) - Common usage patterns
- [Opinions](./design/opinions.md) - Design decisions and rationale

## Tech Stack

- **Runtime**: Bun
- **CLI Framework**: @effect/cli
- **Platform**: @effect/platform-node
- **Build**: Nix flakes
