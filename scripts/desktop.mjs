import { spawn } from 'node:child_process'

const env = { ...process.env }
// Alcuni terminali ospitati in Electron ereditano questa variabile.
delete env.ELECTRON_RUN_AS_NODE
const child = spawn(
  process.execPath,
  ['node_modules/electron-vite/bin/electron-vite.js', ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    windowsHide: true,
    env,
  },
)
child.on('error', (error) => {
  console.error(error)
  process.exitCode = 1
})
child.on('exit', (code) => {
  process.exitCode = code ?? 1
})
