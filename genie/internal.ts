/**
 * Internal configuration - dotdot specific
 *
 * This file contains configuration specific to the dotdot repo.
 * For external/peer repo use, import from `./external.ts` instead.
 */

// Re-export from external for convenience (explicit exports to avoid barrel file)
export {
  baseTsconfigCompilerOptions,
  CatalogBrand,
  catalog,
  createEffectUtilsRefs,
  defineCatalog,
  definePatchedDependencies,
  domLib,
  effectUtilsPackages,
  packageJson,
  packageTsconfigCompilerOptions,
  privatePackageDefaults,
  reactJsx,
  type TSConfigCompilerOptions,
  workspaceRoot,
} from './external.ts'
