import { tsconfigJSON } from '../effect-utils/packages/@overeng/genie/src/runtime/mod.ts'
import { packageTsconfigCompilerOptions } from './genie/repo.ts'

export default tsconfigJSON({
  extends: '../tsconfig.base.json',
  compilerOptions: {
    ...packageTsconfigCompilerOptions,
    types: ['node', 'bun'],
  },
  include: ['src/**/*.ts'],
})
