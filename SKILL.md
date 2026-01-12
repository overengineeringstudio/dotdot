---
name: managing-dotdot-workspaces
description: Manage and migrate to multi-repo workspaces with dotdot. Use when working with dotdot.ts config files, migrating from bun monorepos, cloning sibling repos, creating symlinks for monorepo packages, or setting up path dependencies across repos. Helps with bun, cargo, and nix flake relative path patterns. Covers replacing catalog: and workspace:* with actual versions and ../ paths.
---

# Managing dotdot Workspaces

dotdot manages multi-repo workspaces where sibling repos use `../` paths to depend on each other.

## Core Concept

```
workspace/
├── dotdot.ts            # workspace config
├── repo-a/              # git repo
├── repo-b/              # depends on ../repo-a
├── @scope/              # symlinks for monorepo packages
│   └── utils -> ../monorepo/packages/@scope/utils
└── monorepo/            # exposes nested packages
```

## Config: dotdot.ts

```typescript
export default {
  "repo-a": {
    url: "git@github.com:org/repo-a.git",
    revision: "abc123...",
    install: "bun install",
  },
  "my-monorepo": {
    url: "git@github.com:org/my-monorepo.git",
    revision: "def456...",
    expose: ["packages/@scope/utils", "packages/@scope/core"],
  },
} as const;
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `url` | Yes | Git clone URL |
| `revision` | No | Pinned commit hash |
| `install` | No | Command after clone (e.g., `bun install`) |
| `expose` | No | Paths to symlink at workspace root |

## Commands

| Command | Description |
|---------|-------------|
| `dotdot clone` | Clone missing repos, create symlinks |
| `dotdot status` | Show repo states and revision status |
| `dotdot restore` | Checkout pinned revisions |
| `dotdot update` | Save current HEADs to config |
| `dotdot pull` | Pull all repos |
| `dotdot tree` | Show dependency tree |
| `dotdot link status/create/remove` | Manage symlinks |
| `dotdot install` | Run install commands |
| `dotdot exec "cmd"` | Run command in all repos |

## Path Dependencies by Ecosystem

### Bun/Node (package.json)

```json
{
  "dependencies": {
    "sibling-repo": "../sibling-repo",
    "@scope/utils": "../@scope/utils"
  }
}
```

**Do not use** `link:` or `file:` prefixes - they fail with bun.

### Rust (Cargo.toml)

```toml
[dependencies]
sibling-repo = { path = "../sibling-repo" }
myorg-utils = { path = "../myorg/utils" }
```

### Nix Flakes (flake.nix)

```nix
inputs = {
  sibling-repo.url = "git+file:../sibling-repo";
  # Deduplicate shared inputs
  other-repo.inputs.sibling-repo.follows = "sibling-repo";
};
```

**Do not use** `path:` - it cannot escape git repo boundaries.

### devenv (devenv.yaml)

```yaml
inputs:
  sibling-repo:
    url: git+file:../sibling-repo
```

## The Expose Pattern

When a monorepo has nested packages, use `expose` to create symlinks:

```typescript
// dotdot.ts
"my-monorepo": {
  url: "...",
  expose: ["packages/@scope/utils", "packages/@scope/core"],
}
```

Creates:
```
workspace/
├── @scope/
│   ├── utils -> ../my-monorepo/packages/@scope/utils
│   └── core -> ../my-monorepo/packages/@scope/core
└── my-monorepo/
    └── packages/@scope/{utils,core}
```

Now any repo can use `../@scope/utils` instead of `../my-monorepo/packages/@scope/utils`.

## Nested dotdot.ts

Repos can have their own `dotdot.ts` declaring dependencies. All repos are **flattened to root level** - never cloned inside other repos.

```
workspace/
├── dotdot.ts          # declares repo-a
└── repo-a/
    └── dotdot.ts      # declares repo-b → cloned to workspace/repo-b
```

The root `dotdot.ts` is the **authority** for conflict resolution.

## Common Tasks

### Set up a new workspace
1. Create directory with `dotdot.ts`
2. Run `dotdot clone`
3. All repos cloned, symlinks created, install commands run

### Add a dependency to another repo
1. Add entry to your repo's `dotdot.ts`
2. Run `dotdot clone` from workspace root
3. Use `../repo-name` in your package.json/Cargo.toml/flake.nix

### Pin current state
```bash
dotdot update  # saves all current HEADs to dotdot.ts
```

### Restore to pinned state
```bash
dotdot restore  # checks out pinned revisions
```

## Migrating to dotdot

### From a Bun Monorepo

A bun workspace monorepo uses features that don't work across repos:

| Bun Workspace | dotdot Equivalent |
|---------------|-------------------|
| `"dep": "catalog:"` | `"dep": "^1.2.3"` (actual version) |
| `"pkg": "workspace:*"` | `"pkg": "../pkg"` (relative path) |
| Single `bun install` at root | `bun install` per repo |
| Single `bun.lock` | Lockfile per repo |

**Migration steps:**

1. **Decide what stays together** - Tightly coupled packages can remain in a monorepo and use `expose`

2. **Replace catalog: dependencies** - Change to actual version strings
   ```json
   // Before
   { "effect": "catalog:" }
   // After
   { "effect": "^3.12.0" }
   ```

3. **Replace workspace: with paths** - For packages becoming separate repos
   ```json
   // Before
   { "@myorg/utils": "workspace:*" }
   // After
   { "@myorg/utils": "../@myorg/utils" }
   ```

4. **Create dotdot.ts** - In your new workspace root
   ```typescript
   export default {
     "my-monorepo": {
       url: "git@github.com:org/my-monorepo.git",
       expose: ["packages/@myorg/utils", "packages/@myorg/core"],
       install: "bun install",
     },
     "my-app": {
       url: "git@github.com:org/my-app.git",
       install: "bun install",
     },
   } as const;
   ```

5. **Split repos if needed** - Move packages to their own git repos

6. **Run bun install in each repo** - No single root install anymore

### From Separate Repos (Linking Existing Repos)

If you have repos that should depend on each other:

1. **Create workspace directory** with `dotdot.ts`
2. **Add entries for each repo**
3. **Run `dotdot clone`**
4. **Update dependencies** to use `../` paths
5. **Run `bun install`** in each repo

### Hybrid Approach

Keep tightly coupled packages in a monorepo, link to external repos:

```typescript
export default {
  // Monorepo with internal packages
  "core-packages": {
    url: "...",
    expose: ["packages/@myorg/utils", "packages/@myorg/types"],
  },
  // Standalone repos that use the exposed packages
  "frontend-app": { url: "...", install: "bun install" },
  "backend-api": { url: "...", install: "bun install" },
} as const;
```

### What You Lose

- Single `bun install` for everything
- Atomic commits across packages
- `catalog:` for shared dependency versions
- `--filter` workspace commands
- Single lockfile

### What You Gain

- Independent repo lifecycles
- Separate access control per repo
- Mix ecosystems (bun + rust + nix)
- Smaller clones for focused work
- Clearer ownership boundaries

## Important Constraints

1. **No dependency files at workspace root** - The root has no parent, so `../` doesn't work there
2. **Each repo cloned once** - Even if declared in multiple dotdot.ts files
3. **Symlinks for scoped packages** - `@scope/name` symlinks need parent directory created first
4. **Git repos required for nix** - `git+file:` only works with git repositories
5. **Files must be staged for nix** - Run `git add flake.nix` before `nix flake show`
