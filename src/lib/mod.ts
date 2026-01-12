export { CurrentWorkingDirectory } from './workspace.ts'
export { resolveCliVersion } from './cli-version.ts'

// Config
export {
  CONFIG_FILE_NAME,
  defineConfig,
  DotdotConfigSchema,
  RepoConfigSchema,
  type DotdotConfig,
  type RepoConfig,
} from './config.ts'

// Loader
export {
  collectAllConfigs,
  ConfigError,
  findWorkspaceRoot,
  loadConfigFile,
  loadRepoConfig,
  loadRootConfig,
  type ConfigSource,
} from './loader.ts'

// Git and shell
export * as Git from './git.ts'
export { GitError, runShellCommand, ShellError } from './git.ts'

// Config Writer
export {
  ConfigWriteError,
  createEmptyConfig,
  removeRepo,
  updateRepoRevision,
  upsertRepo,
  writeConfig,
} from './config-writer.ts'
