import type { DotdotConfig } from './src/lib/config.ts'
import { JSON_SCHEMA_URL } from './src/lib/config.ts'

/** dotdot config for the dotdot CLI workspace itself */
export default {
  $schema: JSON_SCHEMA_URL,
  repos: {
    'effect-utils': {
      url: 'git@github.com:overengineeringstudio/effect-utils.git',
      rev: '3f6251fb01dbfd13f38f011aca66d126a2ad6791',
    },
    /** For reference only to help agents write better Effect code */
    effect: {
      url: 'git@github.com:effect-ts/effect.git',
      rev: 'c9dc711464561227b8470edaa6052056ede41289',
    },
  },
} satisfies DotdotConfig
