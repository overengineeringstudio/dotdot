/**
 * dotdot package configuration
 *
 * Imports directly from effect-utils (sibling repo)
 */

export {
  baseTsconfigCompilerOptions,
  catalog,
  CatalogBrand,
  packageTsconfigCompilerOptions,
  pkg,
  privatePackageDefaults,
} from '../../effect-utils/genie/repo.ts'

/** Workspace package patterns for dotdot */
export const workspacePackages = ['@overeng/*'] as const
