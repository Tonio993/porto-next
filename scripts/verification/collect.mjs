import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdir, mkdtemp, open, readFile, writeFile } from 'node:fs/promises'
import { openSync, closeSync } from 'node:fs'
import { arch, platform, release } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { finalize, normalize, summary } from './results.mjs'

const require = createRequire(import.meta.url)
const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const quote = (arg) => `'${arg.replaceAll("'", "''")}'`
export const commandText = (command, args) => `& ${[command, ...args].map(quote).join(' ')}`

// Una sola fase. Sequenza, profili, timeout, cache e consolidamento appartengono a V02+.
export async function collect({
  runner,
  phase,
  scope,
  args = [],
  cwd = repository,
  signal,
  command,
}) {
  if (!['vitest', 'playwright'].includes(runner))
    throw new Error('Runner ammessi: vitest, playwright')
  if (!phase?.trim() || !scope?.trim()) throw new Error('Fase e ambito richiesto sono obbligatori')
  const reserved =
    runner === 'vitest'
      ? ['--reporter', '--outputFile', '--watch', '-w', '--ui', '--merge-reports', '--list']
      : ['--reporter', '--output', '--list', '--ui', '--watch']
  if (
    args.some((a) =>
      reserved.some((key) => a === key || a.startsWith(`${key}=`) || a.startsWith(`${key}.`)),
    )
  )
    throw new Error('Reporter, output e modalità interattive sono riservati alla raccolta')
  const startedAt = new Date().toISOString()
  const parent = resolve(cwd, 'test-results/verification')
  await mkdir(parent, { recursive: true })
  const directory = await mkdtemp(resolve(parent, `${startedAt.replaceAll(':', '-')}-`))
  await mkdir(resolve(directory, 'native'))
  await mkdir(resolve(directory, 'artifacts'))
  const nativePath = resolve(directory, 'native/report.json')
  const contextPath = resolve(directory, 'native/context.json')
  const runtimePath = resolve(directory, 'native/process.json')
  const actual = command ?? {
    executable: process.execPath,
    args:
      runner === 'vitest'
        ? [
            resolve(repository, 'scripts/test.mjs'),
            ...args,
            '--includeTaskLocation',
            '--reporter=default',
            '--reporter=json',
            `--reporter=${resolve(repository, 'scripts/verification/vitest-context.mjs')}`,
            `--outputFile=${nativePath}`,
          ]
        : [
            resolve(repository, 'node_modules/@playwright/test/cli.js'),
            'test',
            ...args,
            '--reporter=list,json,' +
              resolve(repository, 'scripts/verification/playwright-context.mjs'),
            `--output=${resolve(directory, 'artifacts')}`,
          ],
  }
  const environment = {
    cwd,
    platform: platform(),
    architecture: arch(),
    osRelease: release(),
    node: process.version,
    runnerVersion: require(`${runner === 'vitest' ? 'vitest' : '@playwright/test'}/package.json`)
      .version,
    electronVersion: require('electron/package.json').version,
    variables: Object.fromEntries(
      ['CI', 'TZ', 'NODE_ENV', 'PORTO_PACKAGED_EXE']
        .filter((k) => process.env[k] !== undefined)
        .map((k) => [k, process.env[k]]),
    ),
  }
  const reproduction = command
    ? commandText(command.executable, command.args)
    : commandText(process.execPath, [
        resolve(repository, 'scripts/verification/collect.mjs'),
        runner,
        '--phase',
        phase,
        '--scope',
        scope,
        '--',
        ...args,
      ])
  const metadata = {
    runId: directory.split(/[\\/]/).at(-1),
    runner,
    phase,
    scope,
    requestedArgs: args,
    command: actual,
    environment,
    reproduction,
    startedAt,
    artifacts: {
      nativeReport: 'native/report.json',
      context: 'native/context.json',
      runtime: runner === 'vitest' ? 'native/process.json' : null,
      stdout: 'stdout.log',
      stderr: 'stderr.log',
      directory: 'artifacts/',
    },
  }
  await writeFile(
    resolve(directory, 'execution.json'),
    JSON.stringify(metadata, null, 2) + '\n',
    'utf8',
  )
  const processResult = await execute(actual, {
    cwd,
    directory,
    signal,
    env: {
      ...process.env,
      PORTO_VERIFICATION_CONTEXT: contextPath,
      PORTO_VERIFICATION_PROCESS_FILE: runtimePath,
      PLAYWRIGHT_JSON_OUTPUT_FILE: nativePath,
    },
  })
  let native, context
  const reportIssues = []
  const availableReports = []
  for (const [path, label] of [
    [nativePath, 'Report nativo'],
    [contextPath, 'Contesto runner'],
  ]) {
    try {
      const contents = await readFile(path, 'utf8')
      availableReports.push(path === nativePath ? 'native/report.json' : 'native/context.json')
      const parsed = JSON.parse(contents)
      if (label === 'Report nativo') native = parsed
      else context = parsed
    } catch (error) {
      reportIssues.push(`${label} assente o malformato: ${error.message}`)
    }
  }
  const data = normalize(runner, native ?? {}, context ?? {})
  environment.runnerRuntime = context?.runtime ?? { node: process.versions.node }
  data.issues.push(...reportIssues)
  if (runner === 'vitest' && !command) {
    try {
      processResult.runtime = JSON.parse(await readFile(runtimePath, 'utf8'))
      if (
        processResult.runtime.error ||
        processResult.runtime.signal ||
        processResult.runtime.exitCode === null
      )
        data.issues.push('Avvio o esecuzione Electron non completati; vedere native/process.json')
      if (
        processResult.runtime.exitCode !== null &&
        processResult.runtime.exitCode !== processResult.exitCode
      )
        data.issues.push('Codici di uscita wrapper/Electron discordanti')
    } catch (error) {
      data.issues.push(`Metadati runtime Electron assenti/non validi: ${error.message}`)
    }
  }
  const logFile = await open(resolve(directory, 'stderr.log'), 'r')
  let stderrExcerpt
  try {
    const buffer = Buffer.alloc(2048)
    const { bytesRead } = await logFile.read(buffer, 0, buffer.length, 0)
    stderrExcerpt = buffer.subarray(0, bytesRead).toString('utf8')
  } finally {
    await logFile.close()
  }
  const result = finalize(
    {
      ...metadata,
      availableReports,
      diagnostics: { stderrExcerpt },
      process: processResult,
      endedAt: new Date().toISOString(),
      durationMs: Date.now() - Date.parse(startedAt),
    },
    data,
  )
  await writeFile(
    resolve(directory, 'execution.json'),
    JSON.stringify({ ...metadata, process: processResult }, null, 2) + '\n',
    'utf8',
  )
  await writeFile(
    resolve(directory, 'results.json'),
    JSON.stringify(result, null, 2) + '\n',
    'utf8',
  )
  await writeFile(resolve(directory, 'summary.md'), summary(result), 'utf8')
  return { directory, result }
}

export function execute(command, { cwd, directory, env, signal }) {
  return new Promise((resolveResult) => {
    const stdout = openSync(resolve(directory, 'stdout.log'), 'wx')
    const stderr = openSync(resolve(directory, 'stderr.log'), 'wx')
    let error = null
    let interrupted = null
    let child
    const cancel = () => {
      interrupted = signal?.reason?.message ?? 'Interruzione richiesta'
      if (!child?.pid) return
      if (process.platform === 'win32') {
        // Solo l'albero di questo processo: non lasciare worker/Electron orfani.
        const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
          windowsHide: true,
          stdio: 'ignore',
        })
        killer.on('error', (e) => {
          error ??= { message: e.message, code: e.code }
        })
      } else {
        try {
          process.kill(-child.pid, 'SIGTERM')
        } catch (e) {
          if (e.code !== 'ESRCH') error ??= { message: e.message, code: e.code }
        }
      }
    }
    const finish = (exitCode, exitSignal) => {
      signal?.removeEventListener('abort', cancel)
      closeSync(stdout)
      closeSync(stderr)
      resolveResult({
        exitCode: child?.pid ? exitCode : null,
        closeCode: exitCode,
        signal: exitSignal,
        error,
        interrupted,
      })
    }
    try {
      child = spawn(command.executable, command.args, {
        cwd,
        env,
        windowsHide: true,
        detached: process.platform !== 'win32',
        stdio: ['ignore', stdout, stderr],
      })
      child.on('error', (e) => {
        error = { message: e.message, code: e.code, stack: e.stack }
      })
      child.on('close', finish)
      signal?.addEventListener('abort', cancel, { once: true })
      if (signal?.aborted) cancel()
    } catch (e) {
      error = { message: e.message, code: e.code, stack: e.stack }
      finish(null, null)
    }
  })
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const abort = new AbortController()
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, () => abort.abort(new Error(signal)))
  try {
    const argv = process.argv.slice(2)
    const separator = argv.indexOf('--')
    const head = separator < 0 ? argv : argv.slice(0, separator)
    const { values, positionals } = parseArgs({
      args: head,
      allowPositionals: true,
      options: { phase: { type: 'string' }, scope: { type: 'string' } },
    })
    if (positionals.length !== 1)
      throw new Error(
        'Uso: npm run test:report -- <vitest|playwright> --phase <fase> --scope <ambito> -- [argomenti runner]',
      )
    const { directory, result } = await collect({
      runner: positionals[0],
      phase: values.phase,
      scope: values.scope,
      args: separator < 0 ? [] : argv.slice(separator + 1),
      signal: abort.signal,
    })
    console.log(`${result.outcome}: ${resolve(directory, 'summary.md')}`)
    process.exitCode = result.exitCode
  } catch (error) {
    console.error(error.message)
    process.exitCode = 2
  }
}
