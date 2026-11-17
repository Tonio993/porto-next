import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'

// Il driver nativo deve essere testato con lo stesso runtime dell'applicazione.
const require = createRequire(import.meta.url)
const electron = require('electron')
const result = spawnSync(
  electron,
  ['node_modules/vitest/vitest.mjs', 'run', ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    windowsHide: true,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  },
)
if (result.error) console.error(result.error)
if (process.env.PORTO_VERIFICATION_PROCESS_FILE)
  writeFileSync(
    process.env.PORTO_VERIFICATION_PROCESS_FILE,
    JSON.stringify({
      executable: electron,
      args: ['node_modules/vitest/vitest.mjs', 'run', ...process.argv.slice(2)],
      exitCode: result.status,
      signal: result.signal,
      error: result.error
        ? { message: result.error.message, code: result.error.code, stack: result.error.stack }
        : null,
      environment: { ELECTRON_RUN_AS_NODE: '1' },
    }),
    'utf8',
  )
process.exit(result.status ?? 1)
