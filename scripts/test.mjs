import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

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
process.exit(result.status ?? 1)
