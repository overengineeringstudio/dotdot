import { pkg, privatePackageDefaults } from './genie/repo.ts'

export default pkg.package({
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
  dependencies: ['@overeng/utils'],
  devDependencies: [
    '@effect/cli',
    '@effect/platform',
    '@effect/platform-node',
    '@effect/vitest',
    '@types/node',
    '@types/bun',
    'effect',
    'typescript',
    'vitest',
  ],
  peerDependencies: {
    '@effect/cli': '^',
    '@effect/platform': '^',
    '@effect/platform-node': '^',
    effect: '^',
  },
})
