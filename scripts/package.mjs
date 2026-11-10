import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const env = { ...process.env }
// Usa la versione di sistema quando disponibile; altrimenti builder scarica i propri strumenti.
if (process.platform === 'win32' && !env.ELECTRON_BUILDER_7ZIP_PATH) {
  const system7zip = join(env.ProgramFiles ?? 'C:/Program Files', '7-Zip', '7z.exe')
  if (existsSync(system7zip)) env.ELECTRON_BUILDER_7ZIP_PATH = system7zip
}
const result = spawnSync(
  process.execPath,
  ['node_modules/electron-builder/cli.js', ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    windowsHide: true,
    env,
  },
)
if (result.error) console.error(result.error)
process.exit(result.status ?? 1)
