import { prefixPatchPaths } from '../effect-utils/packages/@overeng/genie/src/runtime/package-json/overrides.ts'
import utilsPkg from '../effect-utils/packages/@overeng/utils/package.json.genie.ts'
import { catalog, packageJson, privatePackageDefaults } from './genie/internal.ts'

export default packageJson({
  name: '@overeng/dotdot',
  ...privatePackageDefaults,
  exports: {
    '.': './src/mod.ts',
    './cli': './src/cli.ts',
  },
  publishConfig: {
    access: 'public',
    exports: {
      '.': './dist/mod.js',
      './cli': './dist/cli.js',
    },
  },
  dependencies: {
    '@overeng/utils': 'file:../effect-utils/packages/@overeng/utils',
  },
  devDependencies: {
    ...utilsPkg.data.peerDependencies,
    ...catalog.pick('@effect/cli', '@types/bun', '@types/node', 'typescript'),
  },
  peerDependencies: {
    ...utilsPkg.data.peerDependencies,
    '@effect/cli': `^${catalog['@effect/cli']}`,
  },
  patchedDependencies: {
    ...prefixPatchPaths({
      patches: utilsPkg.data.patchedDependencies,
      prefix: 'effect-utils/',
    }),
  },
})
