import { mkdir, mkdtemp, open, readFile, unlink, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { collect, commandText, execute } from './collect.mjs'
import { formattingDetails } from './formatting.mjs'
import { clean, countsText, details, noteworthy } from './presentation.mjs'

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const ids = [
  'documents',
  'diff',
  'typescript-node',
  'typescript-web',
  'eslint',
  'formatting',
  'fixtures',
  'backend',
  'build',
  'desktop',
  'package',
  'packaged-desktop',
]
const node = (...args) => ({ executable: process.execPath, args })

export function createPlan({
  profile,
  desktop = [],
  documents = [],
  phases = [],
  backend = [],
  timeoutMs = 1_800_000,
}) {
  if (!['documentazione', 'step', 'milestone', 'diagnostica'].includes(profile))
    throw new Error('Profilo richiesto: documentazione, step, milestone, diagnostica')
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2_147_483_647)
    throw new Error('Timeout non valido: usare 1–2147483647 ms')
  if (['step', 'documentazione'].includes(profile) && !documents.length)
    throw new Error('Specificare i documenti da controllare con --document')
  if (profile === 'step' && !desktop.length)
    throw new Error('Lo step richiede --desktop <file.spec.ts> esplicito')
  if (desktop.some((file) => !/^tests\/e2e\/[\w/-]+\.spec\.ts$/.test(file)))
    throw new Error('--desktop accetta soltanto file tests/e2e/*.spec.ts, senza opzioni runner')
  if (
    backend.length &&
    (profile !== 'diagnostica' ||
      backend.some((file) => !/^tests\/unit\/[\w/-]+\.test\.ts$/.test(file)))
  )
    throw new Error('--backend è riservato ai file unitari del profilo diagnostica')
  if (profile !== 'diagnostica' && phases.length)
    throw new Error('--phase è riservato alla diagnostica')
  if (profile === 'milestone' && (desktop.length || backend.length))
    throw new Error('La milestone richiede suite complete')
  if (profile === 'diagnostica' && (!phases.length || phases.some((id) => !ids.includes(id))))
    throw new Error('Specificare fasi diagnostiche valide con --phase')
  const requested = new Set(
    profile === 'diagnostica'
      ? phases
      : profile === 'documentazione'
        ? ['documents', 'diff', 'formatting']
        : ids.filter(
            (id) => profile === 'milestone' || !['package', 'packaged-desktop'].includes(id),
          ),
  )
  if (profile === 'milestone' && !documents.length)
    throw new Error('Specificare i documenti da controllare con --document')
  const dependencies = {
    backend: ['fixtures'],
    build: ['typescript-node', 'typescript-web'],
    desktop: ['build'],
    package: ['build'],
    'packaged-desktop': ['package'],
  }
  // In diagnostica le dipendenze restano obbligatorie: nessun riuso implicito di out/dist.
  function include(id) {
    for (const dep of dependencies[id] ?? []) {
      requested.add(dep)
      include(dep)
    }
  }
  for (const id of [...requested]) include(id)
  if (requested.has('documents') && !documents.length)
    throw new Error('La fase documents richiede --document')
  return {
    profile,
    coverage: profile === 'diagnostica' ? 'partial' : 'requested-profile',
    timeoutMs,
    documents,
    desktop,
    backend,
    phases: ids.map((id) => ({
      id,
      requested: requested.has(id),
      dependencies: dependencies[id] ?? [],
      scope:
        id === 'desktop'
          ? profile === 'milestone'
            ? 'suite completa, incluse migrazioni cumulative'
            : desktop.join(', ') || 'suite completa'
          : id === 'packaged-desktop'
            ? 'suite completa sul medesimo eseguibile'
            : id === 'backend'
              ? backend.join(', ') || 'backend completo, invarianti e migrazioni SQLite'
              : id,
    })),
  }
}

function commandFor(id, plan, cwd) {
  switch (id) {
    case 'documents':
      return node(resolve(repository, 'scripts/verification/documents.mjs'), ...plan.documents)
    case 'diff':
      return { executable: 'git', args: ['diff', '--check'] }
    case 'typescript-node':
      return node('node_modules/typescript/bin/tsc', '--noEmit', '-p', 'tsconfig.node.json')
    case 'typescript-web':
      return node('node_modules/typescript/bin/tsc', '--noEmit', '-p', 'tsconfig.web.json')
    case 'eslint':
      return node('node_modules/eslint/bin/eslint.js', '.')
    case 'formatting':
      return node('node_modules/prettier/bin/prettier.cjs', '--check', '.')
    case 'fixtures':
      return node(
        '--test',
        '--test-concurrency=1',
        ...['collection', 'coordinator'].map((name) =>
          resolve(cwd, `scripts/verification/${name}.test.mjs`),
        ),
      )
    case 'build':
      return node('node_modules/electron-vite/bin/electron-vite.js', 'build')
    case 'package':
      return node('scripts/package.mjs', '--dir')
    default:
      return null
  }
}

export function readCollector(result) {
  if (
    result?.formatVersion !== 1 ||
    !result.process ||
    !Array.isArray(result.issues) ||
    !result.counts ||
    !Array.isArray(result.errors)
  )
    return {
      status: 'incomplete',
      issues: ['Risultato finale collector assente o formato non supportato'],
    }
  const { outcome, counts, issues, process: original } = result
  const validCounts = [
    'total',
    'passed',
    'failed',
    'skipped',
    'incomplete',
    'flaky',
    'expected-failure',
    'attempts',
    'retried',
  ].every((key) => Number.isSafeInteger(counts[key]) && counts[key] >= 0)
  const complete =
    validCounts &&
    counts.total > 0 &&
    counts.total ===
      ['passed', 'failed', 'skipped', 'incomplete', 'flaky', 'expected-failure'].reduce(
        (sum, key) => sum + counts[key],
        0,
      )
  let status = 'incomplete'
  if (complete && !issues.length && !original.error && !original.signal && !original.interrupted) {
    if (
      outcome === 'failed' &&
      Number.isInteger(original.exitCode) &&
      original.exitCode !== 0 &&
      Number.isInteger(result.exitCode) &&
      result.exitCode !== 0
    )
      status = 'failed'
    else if (
      original.exitCode === 0 &&
      result.exitCode === 0 &&
      !counts.failed &&
      !counts.incomplete &&
      !result.errors.length
    ) {
      if (outcome === 'passed' && !counts.skipped && !counts.flaky) status = 'passed'
      else if (['passed-with-skips', 'flaky'].includes(outcome)) status = 'incomplete'
    }
  }
  return { status, outcome, process: original, collectorExitCode: result.exitCode, issues, counts }
}

function phaseText(phase) {
  return `${phase.id}: ${phase.status} (processo ${phase.process?.exitCode ?? '—'}, collector ${phase.collectorExitCode ?? '—'})${phase.reason ? `; ${clean(phase.reason)}` : ''}`
}

export function runSummary(run, { verbose = false } = {}) {
  const required = run.phases.filter((p) => p.requested)
  const complete = run.completed && required.length > 0 && run.outcome !== 'incomplete'
  const totals = required
    .filter((p) => p.counts)
    .reduce((sum, p) => {
      for (const [key, value] of Object.entries(p.counts)) sum[key] = (sum[key] ?? 0) + value
      return sum
    }, {})
  const selected = run.phases.filter((p) => verbose || noteworthy(p))
  // Le righe di fase restano corte; ragioni e conteggi hanno un budget separato.
  const shown = selected.slice(0, verbose ? run.phases.length : 8)
  const problems = [
    ...run.issues,
    ...selected.flatMap((p) => [
      ...(p.counts ? [`${p.id}: ${countsText(p.counts)}`] : []),
      ...(p.formatting?.legacy ?? []).map((file) => `${p.id}: avviso ${file}`),
      ...(p.formatting?.regressions ?? []).map((file) => `${p.id}: differenza ${file}`),
    ]),
  ]
  return [
    `# ${run.profile}: ${required.length ? run.outcome : 'incomplete'}`,
    `Completezza: ${complete ? 'completa' : 'incompleta'}; finale: ${run.completed}. Copertura: ${run.coverage}. Uscita: ${run.exitCode}.`,
    `Fasi richieste: ${required.length}; passate: ${required.filter((p) => p.status === 'passed').length}; problematiche: ${required.filter(noteworthy).length}.${totals.total ? ` ${countsText(totals)}` : ''}`,
    '[Risultati completi](results.json) · [Piano](plan.json) · [Dettagli](summary.verbose.md)',
    ...shown.map((p) => `- ${phaseText(p)}${p.details ? `; [report](${p.details})` : ''}`),
    ...(selected.length > shown.length
      ? [`- Altre ${selected.length - shown.length} fasi problematiche nei report completi.`]
      : []),
    ...details(problems, { verbose }),
    ...(verbose ? ['', 'Nessuna attestazione di chiusura task/milestone.'] : []),
    '',
  ].join('\n')
}

export async function coordinate(
  options,
  {
    cwd = repository,
    signal,
    progress = console.log,
    runCollect = collect,
    runExecute = execute,
  } = {},
) {
  const plan = createPlan(options)
  for (const phase of plan.phases) {
    phase.command = commandFor(phase.id, plan, cwd)
    if (!phase.command)
      phase.collector = {
        runner: phase.id === 'backend' ? 'vitest' : 'playwright',
        args: phase.id === 'backend' ? plan.backend : phase.id === 'desktop' ? plan.desktop : [],
      }
  }
  const root = resolve(cwd, 'test-results/verification')
  await mkdir(root, { recursive: true })
  const directory = await mkdtemp(
    resolve(root, `${new Date().toISOString().replaceAll(':', '-')}-coordinator-`),
  )
  const relativePath = (path) => relative(directory, path).replaceAll('\\', '/')
  const run = {
    formatVersion: 1,
    kind: 'coordinator',
    runId: directory.split(/[\\/]/).at(-1),
    profile: plan.profile,
    coverage: plan.coverage,
    startedAt: new Date().toISOString(),
    completed: false,
    outcome: 'incomplete',
    exitCode: 2,
    issues: [],
    phases: plan.phases.map((phase) => ({
      ...phase,
      status: phase.requested ? 'not-executed' : 'not-requested',
    })),
  }
  const save = async () => {
    await writeFile(resolve(directory, 'results.json'), JSON.stringify(run, null, 2) + '\n', 'utf8')
    await writeFile(resolve(directory, 'summary.md'), runSummary(run, options), 'utf8')
    await writeFile(
      resolve(directory, 'summary.verbose.md'),
      runSummary(run, { verbose: true }),
      'utf8',
    )
  }
  await writeFile(resolve(directory, 'plan.json'), JSON.stringify(plan, null, 2) + '\n', 'utf8')
  await save()
  progress(`[${run.profile}] avvio: ${resolve(directory, 'summary.md')}`)
  const reported = new Set()
  const problemProgress = (phase) => {
    const text = clean(phaseText(phase))
    if (noteworthy(phase) && !reported.has(text)) {
      if (options.verbose || reported.size < 8) progress(text)
      reported.add(text)
    }
  }
  const lockPath = resolve(cwd, '.local/verification.lock')
  let lock
  try {
    await mkdir(dirname(lockPath), { recursive: true })
    try {
      lock = await open(lockPath, 'wx')
    } catch (error) {
      if (error.code !== 'EEXIST') throw error
      run.issues.push(`Artefatti occupati: ${lockPath}; nessuna rimozione automatica del lock`)
      for (const phase of run.phases.filter((p) => p.requested)) {
        phase.status = 'blocked'
        phase.reason = 'Lock di altra esecuzione'
        problemProgress(phase)
      }
    }
    if (lock) {
      await lock.writeFile(
        JSON.stringify({ pid: process.pid, directory, startedAt: run.startedAt }),
        'utf8',
      )
      for (const phase of run.phases.filter((p) => p.requested)) {
        if (signal?.aborted) {
          phase.reason = 'Esecuzione interrotta prima della fase'
          problemProgress(phase)
          continue
        }
        const blocked = phase.dependencies.filter(
          (id) => run.phases.find((p) => p.id === id).status !== 'passed',
        )
        if (blocked.length) {
          phase.status = 'blocked'
          phase.reason = `Dipendenze non riuscite: ${blocked.join(', ')}`
          await save()
          problemProgress(phase)
          continue
        }
        phase.status = 'running'
        phase.startedAt = new Date().toISOString()
        const phaseDirectory = resolve(directory, phase.id)
        await mkdir(phaseDirectory)
        phase.details = `${phase.id}/execution.json`
        await save()
        if (options.verbose) progress(`[${phase.id}] avvio — ${phase.scope}`)
        const abort = new AbortController()
        const cancel = () => abort.abort(signal.reason)
        signal?.addEventListener('abort', cancel, { once: true })
        if (signal?.aborted) cancel()
        const timer = setTimeout(() => {
          phase.timedOut = true
          abort.abort(new Error(`Timeout fase: ${plan.timeoutMs} ms`))
        }, plan.timeoutMs)
        const env = { ...process.env }
        for (const key of [
          'PORTO_PACKAGED_EXE',
          'ELECTRON_RUN_AS_NODE',
          'PORTO_VERIFICATION_CONTEXT',
          'PORTO_VERIFICATION_PROCESS_FILE',
          'PLAYWRIGHT_JSON_OUTPUT_FILE',
          'PLAYWRIGHT_JSON_OUTPUT_NAME',
          'PLAYWRIGHT_JSON_OUTPUT_DIR',
        ])
          delete env[key]
        if (phase.id === 'packaged-desktop')
          env.PORTO_PACKAGED_EXE = resolve(cwd, 'dist/win-unpacked/Porto Next.exe')
        try {
          phase.environment = {
            removedInherited: ['PORTO_PACKAGED_EXE', 'ELECTRON_RUN_AS_NODE'],
            packagedExe: env.PORTO_PACKAGED_EXE ?? null,
          }
          const command = commandFor(phase.id, plan, cwd)
          if (command) {
            phase.command = command
            phase.reproduction = commandText(command.executable, command.args)
            await writeFile(
              resolve(phaseDirectory, 'execution.json'),
              JSON.stringify(phase, null, 2),
              'utf8',
            )
            phase.process = await runExecute(command, {
              cwd,
              directory: phaseDirectory,
              env,
              signal: abort.signal,
            })
            const proc = phase.process
            phase.status =
              proc.error || proc.interrupted || proc.signal || proc.exitCode === null
                ? 'incomplete'
                : proc.exitCode === 0
                  ? 'passed'
                  : 'failed'
            if (phase.id === 'formatting' && proc.exitCode === 1 && phase.status === 'failed') {
              phase.formatting = await formattingDetails(cwd)
              if (phase.formatting.legacy.length && !phase.formatting.regressions.length)
                phase.status = 'known-warning'
            }
            if (phase.status === 'incomplete')
              phase.reason =
                proc.error?.message ?? proc.interrupted ?? proc.signal ?? 'Uscita assente'
          } else {
            const runner = phase.id === 'backend' ? 'vitest' : 'playwright'
            const collected = await runCollect({
              runner,
              phase: phase.id,
              scope: phase.scope,
              args:
                phase.id === 'backend' ? plan.backend : phase.id === 'desktop' ? plan.desktop : [],
              cwd,
              env,
              signal: abort.signal,
              outputRoot: resolve(phaseDirectory, 'collection'),
              verbose: options.verbose,
              onDirectory: async (path) => {
                phase.collectorDirectory = relativePath(path)
                await save()
              },
            })
            // Il file finale è obbligatorio anche se il collector restituisce un oggetto in memoria.
            phase.collectorDirectory = relativePath(collected.directory)
            const result = JSON.parse(
              await readFile(resolve(collected.directory, 'results.json'), 'utf8'),
            )
            Object.assign(phase, readCollector(result))
            phase.details = `${phase.collectorDirectory}/summary.md`
            if (phase.status !== 'passed')
              phase.reason = `Collector: ${result.outcome}; ${phase.issues.join('; ') || 'consultare casi e conteggi'}`
            if (
              plan.profile === 'milestone' &&
              ['desktop', 'packaged-desktop'].includes(phase.id) &&
              !result.cases?.some((c) =>
                c.file?.replaceAll('\\', '/').endsWith('milestone-migrations.spec.ts'),
              )
            ) {
              phase.status = 'incomplete'
              phase.reason = 'Migrazioni cumulative assenti dalla suite desktop'
            }
          }
          if (abort.signal.aborted) {
            phase.status = 'incomplete'
            phase.reason = abort.signal.reason?.message ?? 'Interruzione'
          }
        } catch (error) {
          phase.status = 'incomplete'
          phase.reason = error.message
          phase.error = { message: error.message, stack: error.stack }
        } finally {
          clearTimeout(timer)
          signal?.removeEventListener('abort', cancel)
          phase.endedAt = new Date().toISOString()
          phase.durationMs = Date.parse(phase.endedAt) - Date.parse(phase.startedAt)
          await writeFile(
            resolve(phaseDirectory, 'execution.json'),
            JSON.stringify(phase, null, 2) + '\n',
            'utf8',
          )
          await save()
          if (options.verbose && !noteworthy(phase)) progress(phaseText(phase))
          problemProgress(phase)
        }
      }
    }
  } catch (error) {
    run.issues.push(error.message)
  } finally {
    if (lock) {
      try {
        await lock.close()
        await unlink(lockPath)
      } catch (error) {
        run.issues.push(`Rilascio lock non completato: ${error.message}`)
      }
    }
    run.completed = true
    run.endedAt = new Date().toISOString()
    run.durationMs = Date.parse(run.endedAt) - Date.parse(run.startedAt)
    const required = run.phases.filter((p) => p.requested)
    run.outcome =
      run.issues.length ||
      required.some((p) => ['incomplete', 'blocked', 'running', 'not-executed'].includes(p.status))
        ? 'incomplete'
        : required.some((p) => p.status === 'failed')
          ? 'failed'
          : required.some((p) => p.status === 'known-warning')
            ? 'known-warning'
            : 'passed'
    // Avvisi noti e copertura diagnostica non diventano un verde completo.
    run.exitCode =
      run.outcome === 'failed' ? 1 : run.outcome !== 'passed' || run.coverage === 'partial' ? 2 : 0
    await save()
    if (!options.verbose && reported.size > 8)
      progress(`Altre ${reported.size - 8} fasi problematiche nei report completi.`)
    for (const issue of details(run.issues, options)) progress(issue)
    progress(
      `[${run.profile}] ${run.outcome}; finale: ${run.completed}; copertura: ${run.coverage}; uscita: ${run.exitCode}.`,
    )
  }
  return { directory, result: run }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const abort = new AbortController()
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, () => abort.abort(new Error(signal)))
  try {
    const { values, positionals } = parseArgs({
      allowPositionals: true,
      options: {
        desktop: { type: 'string', multiple: true },
        document: { type: 'string', multiple: true },
        phase: { type: 'string', multiple: true },
        backend: { type: 'string', multiple: true },
        'timeout-ms': { type: 'string' },
        verbose: { type: 'boolean' },
      },
    })
    if (positionals.length !== 1)
      throw new Error(
        'Uso: node scripts/verification/coordinator.mjs <profilo> --document <file.md> --desktop <file.spec.ts>',
      )
    const { result } = await coordinate(
      {
        profile: positionals[0],
        desktop: values.desktop,
        documents: values.document,
        phases: values.phase,
        backend: values.backend,
        timeoutMs: values['timeout-ms'] === undefined ? undefined : Number(values['timeout-ms']),
        verbose: values.verbose,
      },
      { signal: abort.signal },
    )
    process.exitCode = result.exitCode
  } catch (error) {
    console.error(error.message)
    process.exitCode = 2
  }
}
