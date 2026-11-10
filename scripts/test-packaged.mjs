import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const result = spawnSync(process.execPath, ['node_modules/@playwright/test/cli.js', 'test'], {
  stdio: 'inherit',
  windowsHide: true,
  env: { ...process.env, PORTO_PACKAGED_EXE: resolve('dist/win-unpacked/Porto Next.exe') },
})
if (result.error) console.error(result.error)
process.exit(result.status ?? 1)
