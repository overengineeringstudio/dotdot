/**
 * External configuration - reusable by peer repos
 *
 * Re-exports from effect-utils for use by dotdot packages.
 * For dotdot internal use, import from `./internal.ts` instead.
 */

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
} from '../../effect-utils/genie/external.ts'
