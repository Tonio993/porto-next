import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, writeFile, access, unlink } from 'node:fs/promises'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { coordinate, createPlan, readCollector } from './coordinator.mjs'
import { execute } from './collect.mjs'
import { checkDocuments } from './documents.mjs'

const root = process.cwd()
const ok = () => ({ exitCode: 0, error: null, signal: null, interrupted: null })
const options = (profile, extra = {}) => ({
  profile,
  documents: ['doc.md'],
  desktop: profile === 'step' ? ['tests/e2e/archives.spec.ts'] : [],
  ...extra,
})
async function fixture() {
  const parent = resolve(root, 'test-results/verification-fixtures')
  await mkdir(parent, { recursive: true })
  return mkdtemp(resolve(parent, 'coordinator-'))
}
function report(overrides = {}) {
  return {
    formatVersion: 1,
    outcome: 'passed',
    exitCode: 0,
    process: ok(),
    issues: [],
    errors: [],
    counts: {
      total: 1,
      passed: 1,
      failed: 0,
      skipped: 0,
      incomplete: 0,
      flaky: 0,
      'expected-failure': 0,
      attempts: 1,
      retried: 0,
    },
    cases: [{ file: 'tests/e2e/milestone-migrations.spec.ts' }],
    ...overrides,
  }
}
function drivers(events = [], customize = {}) {
  return {
    progress: () => {},
    runExecute: async (command, context) => {
      const id = context.directory.split(/[\\/]/).at(-1)
      events.push({ id, command, env: context.env })
      await writeFile(resolve(context.directory, 'stdout.log'), 'fixture à\n', 'utf8')
      await writeFile(resolve(context.directory, 'stderr.log'), '', 'utf8')
      return customize.execute?.(id, context) ?? ok()
    },
    runCollect: async (input) => {
      events.push({ id: input.phase, env: input.env, args: input.args })
      const directory = resolve(input.outputRoot, 'attempt')
      await mkdir(directory, { recursive: true })
      await input.onDirectory(directory)
      await writeFile(resolve(directory, 'execution.json'), '{}', 'utf8')
      const result = customize.report?.(input.phase) ?? report()
      if (!customize.missing)
        await writeFile(resolve(directory, 'results.json'), JSON.stringify(result), 'utf8')
      return { directory, result }
    },
  }
}

test('profili: piano completo, diagnostica parziale e selezione esplicita senza riduzioni implicite', () => {
  assert.throws(() => createPlan({ profile: 'step' }), /document/)
  assert.throws(() => createPlan(options('step', { desktop: [] })), /desktop/)
  assert.throws(() => createPlan(options('step', { desktop: ['--grep'] })), /file/)
  assert.throws(
    () => createPlan(options('step', { backend: ['tests/unit/archive-service.test.ts'] })),
    /diagnostica/,
  )
  assert.throws(
    () => createPlan(options('milestone', { desktop: ['tests/e2e/archives.spec.ts'] })),
    /complete/,
  )
  assert.throws(() => createPlan(options('diagnostica')), /fasi/)
  assert.throws(() => createPlan(options('documentazione', { timeoutMs: 0 })), /Timeout/)
  assert.throws(
    () => createPlan(options('documentazione', { timeoutMs: 2_147_483_648 })),
    /Timeout/,
  )
  for (const profile of ['documentazione', 'step', 'milestone', 'diagnostica']) {
    const plan = createPlan(
      options(profile, profile === 'diagnostica' ? { phases: ['packaged-desktop'] } : {}),
    )
    const ids = plan.phases.filter((p) => p.requested).map((p) => p.id)
    if (profile === 'documentazione') assert.deepEqual(ids, ['documents', 'diff', 'formatting'])
    else if (profile === 'step') {
      assert.ok(ids.includes('backend'))
      assert.ok(!ids.includes('package'))
    } else if (profile === 'milestone') assert.equal(ids.length, plan.phases.length)
    else {
      assert.equal(plan.coverage, 'partial')
      assert.deepEqual(ids, [
        'typescript-node',
        'typescript-web',
        'build',
        'package',
        'packaged-desktop',
      ])
    }
  }
})

test('tutti i profili: sequenza, report persistenti, ambiente, suite complete e separazione build/package', async () => {
  const previous = process.env.PORTO_PACKAGED_EXE
  process.env.PORTO_PACKAGED_EXE = 'residuo.exe'
  try {
    for (const profile of ['documentazione', 'step', 'milestone', 'diagnostica']) {
      const cwd = await fixture(),
        events = []
      const { result, directory } = await coordinate(
        options(
          profile,
          profile === 'diagnostica'
            ? { phases: ['backend'], backend: ['tests/unit/archive-service.test.ts'] }
            : {},
        ),
        { cwd, ...drivers(events) },
      )
      assert.equal(result.outcome, 'passed')
      assert.equal(result.exitCode, profile === 'diagnostica' ? 2 : 0)
      assert.equal(result.completed, true)
      assert.deepEqual(
        events.map((e) => e.id),
        result.phases.filter((p) => p.requested).map((p) => p.id),
      )
      assert.ok(
        events.every((e) =>
          e.id === 'packaged-desktop'
            ? e.env.PORTO_PACKAGED_EXE === resolve(cwd, 'dist/win-unpacked/Porto Next.exe')
            : e.env.PORTO_PACKAGED_EXE === undefined,
        ),
      )
      if (profile === 'step')
        assert.deepEqual(events.find((e) => e.id === 'desktop').args, [
          'tests/e2e/archives.spec.ts',
        ])
      if (profile === 'milestone') {
        assert.deepEqual(events.find((e) => e.id === 'desktop').args, [])
        assert.deepEqual(events.find((e) => e.id === 'packaged-desktop').args, [])
        assert.ok(!events.find((e) => e.id === 'package').command.args.includes('build'))
      }
      const json = JSON.parse(await readFile(resolve(directory, 'results.json'), 'utf8'))
      assert.equal(json.runId, result.runId)
      assert.match(await readFile(resolve(directory, 'summary.md'), 'utf8'), /Piano/)
      await assert.rejects(access(resolve(cwd, '.local/verification.lock')))
    }
  } finally {
    if (previous === undefined) delete process.env.PORTO_PACKAGED_EXE
    else process.env.PORTO_PACKAGED_EXE = previous
  }
})

test('dipendenze fallite bloccano desktop e pacchetto anche con artefatti residui; fasi indipendenti proseguono', async () => {
  const cwd = await fixture(),
    events = []
  await mkdir(resolve(cwd, 'dist/win-unpacked'), { recursive: true })
  await writeFile(resolve(cwd, 'dist/win-unpacked/Porto Next.exe'), 'residuo')
  const { result } = await coordinate(options('milestone'), {
    cwd,
    ...drivers(events, { execute: (id) => (id === 'build' ? { ...ok(), exitCode: 37 } : ok()) }),
  })
  assert.equal(result.outcome, 'incomplete')
  assert.equal(result.phases.find((p) => p.id === 'build').process.exitCode, 37)
  for (const id of ['desktop', 'package', 'packaged-desktop'])
    assert.equal(result.phases.find((p) => p.id === id).status, 'blocked')
  assert.ok(events.some((e) => e.id === 'backend'))
  assert.ok(!events.some((e) => e.id === 'package'))
  const typescript = await coordinate(options('diagnostica', { phases: ['desktop'] }), {
    cwd,
    ...drivers([], {
      execute: (id) => (id === 'typescript-node' ? { ...ok(), exitCode: 1 } : ok()),
    }),
  })
  assert.equal(typescript.result.phases.find((p) => p.id === 'build').status, 'blocked')
})

test('contratto V01: zero non promuove salti, flaky, errori, conteggi incoerenti o report incompleti', () => {
  assert.equal(readCollector(report()).status, 'passed')
  for (const result of [
    undefined,
    report({ formatVersion: 2 }),
    report({ issues: ['parziale'] }),
    report({ exitCode: 2 }),
    report({ errors: ['setup'] }),
    report({ process: { ...ok(), signal: 'SIGTERM' } }),
    report({ counts: {} }),
    report({ counts: { ...report().counts, passed: 0 } }),
  ])
    assert.equal(readCollector(result).status, 'incomplete')
  for (const status of ['skipped', 'flaky', 'incomplete']) {
    const result = report({
      outcome: status === 'skipped' ? 'passed-with-skips' : status,
      counts: { ...report().counts, passed: 0, [status]: 1 },
    })
    assert.equal(readCollector(result).status, 'incomplete')
    assert.equal(readCollector(result).process.exitCode, 0)
    assert.equal(readCollector(result).collectorExitCode, 0)
  }
  assert.equal(
    readCollector(
      report({
        outcome: 'failed',
        process: { ...ok(), exitCode: 9 },
        exitCode: 9,
        counts: { ...report().counts, passed: 0, failed: 1 },
      }),
    ).status,
    'failed',
  )
})

test('tentativo collector senza risultato finale e migrazioni mancanti restano incompleti', async () => {
  const cwd = await fixture()
  const missing = await coordinate(options('diagnostica', { phases: ['backend'] }), {
    cwd,
    ...drivers([], { missing: true }),
  })
  const phase = missing.result.phases.find((p) => p.id === 'backend')
  assert.equal(phase.status, 'incomplete')
  assert.ok(phase.collectorDirectory)
  const milestone = await coordinate(options('milestone'), {
    cwd,
    ...drivers([], { report: () => report({ cases: [] }) }),
  })
  assert.equal(milestone.result.phases.find((p) => p.id === 'desktop').status, 'incomplete')
})

test('lock: seconda invocazione bloccata e crash precedente non rimosso automaticamente', async () => {
  const cwd = await fixture()
  let entered, release
  const started = new Promise((r) => {
      entered = r
    }),
    gate = new Promise((r) => {
      release = r
    })
  const first = coordinate(options('diagnostica', { phases: ['diff'] }), {
    cwd,
    ...drivers([], {
      execute: async () => {
        entered()
        await gate
        return ok()
      },
    }),
  })
  await started
  const second = await coordinate(options('diagnostica', { phases: ['build'] }), {
    cwd,
    ...drivers(),
  })
  assert.ok(second.result.phases.filter((p) => p.requested).every((p) => p.status === 'blocked'))
  assert.equal(second.result.outcome, 'incomplete')
  await access(resolve(cwd, '.local/verification.lock'))
  release()
  await first
  await writeFile(resolve(cwd, '.local/verification.lock'), '{"pid":0}')
  const stale = await coordinate(options('diagnostica', { phases: ['diff'] }), {
    cwd,
    ...drivers(),
  })
  assert.equal(stale.result.outcome, 'incomplete')
  await access(resolve(cwd, '.local/verification.lock'))
  await unlink(resolve(cwd, '.local/verification.lock'))
  const lost = await coordinate(options('diagnostica', { phases: ['diff'] }), {
    cwd,
    ...drivers([], {
      execute: async () => {
        await unlink(resolve(cwd, '.local/verification.lock'))
        return ok()
      },
    }),
  })
  assert.equal(lost.result.completed, true)
  assert.equal(lost.result.outcome, 'incomplete')
  assert.match(lost.result.issues[0], /Rilascio lock/)
})

test('processi reali: avvio fallito, timeout e arresto con riepilogo e fasi non eseguite', async () => {
  for (const kind of ['startup', 'timeout', 'interrupt']) {
    const cwd = await fixture(),
      abort = new AbortController()
    const { result, directory } = await coordinate(
      options('diagnostica', { phases: ['diff', 'eslint'], timeoutMs: 600 }),
      {
        cwd,
        signal: abort.signal,
        progress: () => {},
        runExecute: async (_command, context) => {
          if (kind === 'interrupt') setTimeout(() => abort.abort(new Error('SIGINT fixture')), 200)
          return execute(
            {
              executable: kind === 'startup' ? resolve(cwd, 'missing.exe') : process.execPath,
              args: ['-e', 'setInterval(() => {}, 1000)'],
            },
            context,
          )
        },
      },
    )
    assert.equal(result.outcome, 'incomplete')
    const phase = result.phases.find((p) => p.id === 'diff')
    assert.equal(phase.status, 'incomplete')
    if (kind === 'startup') assert.equal(phase.process.error.code, 'ENOENT')
    if (kind === 'timeout') assert.equal(phase.timedOut, true)
    if (kind === 'interrupt')
      assert.equal(result.phases.find((p) => p.id === 'eslint').status, 'not-executed')
    assert.match(await readFile(resolve(directory, 'summary.md'), 'utf8'), /incomplete/)
  }
})

test('documenti: UTF-8, destinazioni e ancore reali; rifiuto link rotti e bytes invalidi', async () => {
  const cwd = await fixture()
  await writeFile(resolve(cwd, 'doc.md'), '# È valido\n\n[Sezione](#è-valido)\n', 'utf8')
  assert.deepEqual(await checkDocuments(['doc.md'], cwd), ['doc.md'])
  await writeFile(resolve(cwd, 'doc.md'), '[Rotto](missing.md)')
  await assert.rejects(checkDocuments(['doc.md'], cwd))
  await writeFile(resolve(cwd, 'doc.md'), '[Rotto](#assente)')
  await assert.rejects(checkDocuments(['doc.md'], cwd), /ancora/)
  await writeFile(resolve(cwd, 'doc.md'), Buffer.from([0xc3, 0x28]))
  await assert.rejects(checkDocuments(['doc.md'], cwd))
})

test('Prettier: avvisi legacy separati da regressioni con uscita originale conservata', async () => {
  const cwd = await fixture()
  await writeFile(resolve(cwd, '.prettierignore'), '.local\ntest-results\n')
  await mkdir(resolve(cwd, 'doc/legacy'), { recursive: true })
  await writeFile(resolve(cwd, 'doc/legacy/00-roadmap-progetto.md'), '# Titolo    \n')
  const opts = options('diagnostica', { phases: ['formatting'] })
  const injected = drivers([], { execute: () => ({ ...ok(), exitCode: 1 }) })
  const known = await coordinate(opts, { cwd, ...injected })
  let phase = known.result.phases.find((p) => p.id === 'formatting')
  assert.equal(phase.status, 'known-warning')
  assert.equal(phase.process.exitCode, 1)
  assert.equal(known.result.exitCode, 2)
  await writeFile(resolve(cwd, 'new.md'), '# Nuovo    \n')
  const regression = await coordinate(opts, { cwd, ...injected })
  phase = regression.result.phases.find((p) => p.id === 'formatting')
  assert.equal(phase.status, 'failed')
  assert.deepEqual(phase.formatting.regressions, ['new.md'])
})
