# dotdot Roadmap

## Completed

- [x] **Phase 0: Foundation**
  - [x] Project setup (bun workspace, Effect dependencies)
  - [x] TypeScript configuration
  - [x] Config schema (`defineConfig`, `RepoConfig`, `DotdotConfig`)
  - [x] Git operations module (`isGitRepo`, `getCurrentRev`, `isDirty`, etc.)
  - [x] Config loader (dynamic import of `dotdot.config.ts`)
  - [x] Workspace discovery (`findWorkspaceRoot`)
  - [x] Config flattening (`collectAllConfigs`)
  - [x] Test infrastructure with fixtures
  - [x] `init` command (basic)
  - [x] `status` command (full implementation)

## Phase 1: Core Clone Operations

Essential commands to populate a workspace.

- [ ] **`clone` command**
  - [ ] Parse git URL to extract repo name
  - [ ] Clone repo to workspace root
  - [ ] Add entry to root `dotdot.config.ts`
  - [ ] Pin current revision automatically
  - [ ] Handle name conflicts
  - [ ] Support custom target name (`dotdot clone <url> [name]`)

- [ ] **`restore` command**
  - [ ] Find all declared repos with MISSING status
  - [ ] Clone each from configured URL
  - [ ] Checkout pinned revision if specified
  - [ ] Run `install` command if specified
  - [ ] Parallel cloning for performance
  - [ ] Progress reporting

- [ ] **Config file modification**
  - [ ] AST-based editing of `dotdot.config.ts`
  - [ ] Preserve formatting and comments
  - [ ] Add/update/remove repo entries

## Phase 2: Synchronization

Keep workspace in sync with config and remotes.

- [ ] **`update` command**
  - [ ] Get current HEAD for specified repos (or all)
  - [ ] Update `rev` in declaring config file
  - [ ] Report changes made
  - [ ] Dry-run mode (`--dry-run`)

- [ ] **`pull` command**
  - [ ] Run `git pull` in each repo
  - [ ] Parallel execution
  - [ ] Report success/failure per repo
  - [ ] Warn if repo becomes diverged from pinned rev
  - [ ] Handle repos on detached HEAD

- [ ] **`checkout` command** (optional)
  - [ ] Checkout pinned revision for specified repos
  - [ ] `dotdot checkout --all` to restore exact pinned state

## Phase 3: Dependency Management

Handle repo dependencies and expose features.

- [ ] **`tree` command**
  - [ ] Build dependency graph from all configs
  - [ ] Display as ASCII tree
  - [ ] Show which config declares each dependency
  - [ ] Detect and highlight diamond dependencies

- [ ] **`link` command**
  - [ ] Read `expose` configs from all repos
  - [ ] Create symlinks at workspace root
  - [ ] Detect and report conflicts
  - [ ] `--clean` to remove stale symlinks
  - [ ] Idempotent (safe to run multiple times)

- [ ] **Diamond dependency resolution**
  - [ ] Detect when same repo declared with different revisions
  - [ ] Report conflicts clearly
  - [ ] Suggest resolution strategies

## Phase 4: Developer Experience

Workflow improvements and integrations.

- [ ] **`exec` command**
  - [ ] Run command in all repos (or specified subset)
  - [ ] Stream output with repo prefix
  - [ ] Report exit codes
  - [ ] `--parallel` / `--sequential` modes
  - [ ] Filter by dirty/clean status

- [ ] **Shell completions**
  - [ ] Bash completions
  - [ ] Zsh completions
  - [ ] Fish completions

- [ ] **Improved output formatting**
  - [ ] Color support (detect TTY)
  - [ ] `--json` output for scripting
  - [ ] `--quiet` mode

- [ ] **`install` command** (optional)
  - [ ] Run install commands for all repos
  - [ ] Respect dependency order
  - [ ] Skip if already installed (hash-based)

## Phase 5: Distribution

Package and distribute the CLI.

- [ ] **Nix build**
  - [ ] Create `flake.nix` with CLI package
  - [ ] Use `mk-bun-cli.nix` pattern from effect-utils
  - [ ] Binary output for fast startup
  - [ ] Version stamping

- [ ] **npm package**
  - [ ] Publish to npm as `dotdot`
  - [ ] Include TypeScript types for `defineConfig`
  - [ ] Export schema for external validation

- [ ] **Documentation**
  - [ ] Man pages
  - [ ] Website (optional)
  - [ ] Video walkthrough (optional)

## Phase 6: Advanced Features (Future)

Nice-to-haves for later.

- [ ] **Watch mode**
  - [ ] `dotdot status --watch` for live updates
  - [ ] File system watching for config changes

- [ ] **Hooks**
  - [ ] Pre/post clone hooks
  - [ ] Pre/post pull hooks
  - [ ] Custom scripts per repo

- [ ] **Workspace templates**
  - [ ] `dotdot init --template <name>`
  - [ ] Predefined workspace configurations

- [ ] **GitHub/GitLab integration**
  - [ ] `dotdot clone org/repo` shorthand
  - [ ] PR status across repos

---

## Priority Order

Recommended implementation order:

1. **Phase 1** - Clone/restore are essential for basic usability
2. **Phase 2** - Sync commands complete the core workflow
3. **Phase 5** - Nix build enables real-world usage
4. **Phase 3** - Dependency features for complex workspaces
5. **Phase 4** - DX polish
6. **Phase 6** - Future enhancements

## Current Focus

**Next up: Phase 1 - Clone Operations**

Start with `clone` command as it's the most fundamental operation after `status`.
