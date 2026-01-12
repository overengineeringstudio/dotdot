import { tsconfigJson } from '../effect-utils/packages/@overeng/genie/src/runtime/mod.ts'
import { baseTsconfigCompilerOptions, packageTsconfigCompilerOptions } from './genie/internal.ts'

export default tsconfigJson({
  compilerOptions: {
    ...baseTsconfigCompilerOptions,
    ...packageTsconfigCompilerOptions,
    types: ['node', 'bun'],
    typeRoots: ['./node_modules/@types'],
  },
  include: ['src/**/*.ts'],
  exclude: ['node_modules', 'dist'],
})
