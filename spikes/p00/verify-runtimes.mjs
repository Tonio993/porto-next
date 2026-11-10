import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL('../../', import.meta.url))
const electron = require('electron')

for (const [runtime, executable, extraEnv] of [
  ['Node.js di sviluppo', process.execPath, {}],
  ['Node.js incluso in Electron', electron, { ELECTRON_RUN_AS_NODE: '1' }],
]) {
  console.log(`\nP00 — ${runtime}`)
  const result = spawnSync(executable, ['--test', 'spikes/p00/verify.test.mjs'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
    windowsHide: true,
    timeout: 60_000,
  })
  if (result.error) console.error(result.error)
  if (result.status !== 0) process.exit(result.status ?? 1)
}
