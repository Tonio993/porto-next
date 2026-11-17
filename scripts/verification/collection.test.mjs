import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { collect, commandText } from './collect.mjs'
import { finalize, normalize, summary } from './results.mjs'

const root = process.cwd()
const sources = {
  vitest: `import { test, expect } from 'vitest'
test('successo à', () => expect(1).toBe(1))
test('fallimento', () => expect('iniziale').toBe('atteso'))
test.skip('saltato', () => {})
test.todo('da implementare')
test.fails('fallimento atteso', () => expect(1).toBe(2))
let attempts = 0
test('ripetuto', { retry: 1 }, () => expect(++attempts).toBe(2))
test.each([1, 2])('parametro %s', (value) => expect(value).toBeGreaterThan(0))
`,
  playwright: `import { test, expect } from '@playwright/test'
test('successo à', () => expect(1).toBe(1))
test('fallimento', () => expect('iniziale').toBe('atteso'))
test.skip('saltato', () => {})
test('fallimento atteso', () => { test.fail(); expect(1).toBe(2) })
test('ripetuto', ({}, info) => expect(info.retry).toBe(1))
for (const value of [1, 2]) test('parametro ' + value, () => expect(value).toBeGreaterThan(0))
`,
}

for (const runner of ['vitest', 'playwright']) {
  test(`${runner}: reporter nativo, setup, retry, parametri e diagnostiche isolate`, async () => {
    await mkdir(resolve(root, 'test-results/verification-fixtures'), { recursive: true })
    const fixture = await mkdtemp(resolve(root, `test-results/verification-fixtures/${runner}-`))
    const file = resolve(fixture, runner === 'vitest' ? 'cases.test.mjs' : 'cases.spec.mjs')
    const setup = resolve(fixture, runner === 'vitest' ? 'setup.test.mjs' : 'setup.spec.mjs')
    await writeFile(file, sources[runner], 'utf8')
    await writeFile(
      setup,
      runner === 'vitest'
        ? `import { test, beforeAll } from 'vitest'; beforeAll(() => { throw new Error('setup à fallito') }); test('setup impedisce il corpo', () => { throw new Error('corpo non raggiungibile') })`
        : `import { test } from '@playwright/test'; test.beforeAll(() => { throw new Error('setup à fallito') }); test('setup impedisce il corpo', () => { throw new Error('corpo non raggiungibile') })`,
      'utf8',
    )
    const config = resolve(fixture, 'config.mjs')
    await writeFile(
      config,
      runner === 'vitest'
        ? `export default ${JSON.stringify({ test: { include: [file, setup].map((p) => p.replaceAll('\\', '/')), pool: 'forks' } })}`
        : `export default ${JSON.stringify({ testDir: fixture, workers: 1, retries: 1, projects: [{ name: 'primo', repeatEach: 2 }, { name: 'secondo' }] })}`,
      'utf8',
    )
    const { result, directory } = await collect({
      runner,
      phase: 'fixture',
      scope: 'successo, errore, setup, salto e retry',
      args: ['--config', config],
    })
    assert.equal(result.outcome, 'failed', JSON.stringify(result.issues))
    assert.equal(result.process.exitCode, 1)
    assert.equal(result.exitCode, 1)
    assert.equal(result.issues.length, 0, JSON.stringify(result.issues))
    assert.ok(result.counts.skipped > 0)
    assert.ok(result.counts.failed > 0)
    assert.ok(result.counts.flaky > 0)
    assert.ok(result.counts.retried > 0)
    assert.ok(result.counts['expected-failure'] > 0)
    const retried = result.cases.find((c) => c.titlePath.at(-1) === 'ripetuto')
    assert.deepEqual(
      retried.attempts.map((a) => a.status),
      ['failed', 'passed'],
    )
    assert.ok(retried.attempts[0].errors.length > 0)
    assert.ok(result.cases.some((c) => c.titlePath.at(-1) === 'successo à'))
    assert.equal(new Set(result.cases.map((c) => c.id)).size, result.cases.length)
    assert.ok(
      result.cases.some(
        (c) => c.titlePath.at(-1) === 'setup impedisce il corpo' && c.status !== 'passed',
      ),
    )
    assert.ok(JSON.stringify(result).includes('setup à fallito'))
    assert.ok(result.cases.find((c) => c.titlePath.at(-1) === 'fallimento').location.line > 0)
    assert.match(await readFile(resolve(directory, 'summary.md'), 'utf8'), /Riproduzione/)
    if (runner === 'vitest')
      assert.match(await readFile(resolve(directory, 'summary.md'), 'utf8'), /setup\.test\.mjs:1/)
    assert.ok((await readFile(resolve(directory, 'stdout.log'), 'utf8')).length)

    const native = JSON.parse(await readFile(resolve(directory, 'native/report.json'), 'utf8'))
    const context = JSON.parse(await readFile(resolve(directory, 'native/context.json'), 'utf8'))
    const check = (n, c, process = result.process) => finalize({ process }, normalize(runner, n, c))
    const interrupted = structuredClone(context)
    interrupted.completed = false
    assert.equal(check(native, interrupted).outcome, 'incomplete')
    const truncated = structuredClone(native)
    if (runner === 'vitest') truncated.testResults.pop()
    else truncated.suites.pop()
    assert.equal(check(truncated, context).outcome, 'incomplete')
    assert.equal(check({}, context).outcome, 'incomplete')
    const contradictory = structuredClone(native)
    if (runner === 'vitest') contradictory.testResults[0].assertionResults[0].status = 'failed'
    else contradictory.stats.expected++
    assert.equal(check(contradictory, context).outcome, 'incomplete')
    assert.equal(check(native, context, { exitCode: 0 }).outcome, 'incomplete')
    assert.equal(check(native, context, { exitCode: 37 }).exitCode, 37)

    // Riusa i JSON reali come fixture per sessioni riuscite, saltate e flaky.
    for (const [title, outcome] of [
      ['successo à', 'passed'],
      ['saltato', 'passed-with-skips'],
      ['ripetuto', 'flaky'],
    ]) {
      const successNative = structuredClone(native)
      const successContext = structuredClone(context)
      if (runner === 'vitest') {
        for (const m of successContext.modules) {
          m.errors = []
          m.state = 'passed'
          m.cases = m.cases.filter((c) => c.titlePath.at(-1) === title)
        }
        successContext.reason = 'passed'
        successContext.errors = []
        for (const f of successNative.testResults) {
          f.status = 'passed'
          f.message = ''
          f.assertionResults = f.assertionResults.filter((c) => c.title === title)
        }
        successNative.success = true
        Object.assign(successNative, {
          numTotalTests: successNative.testResults.flatMap((f) => f.assertionResults).length,
          numPassedTests: successNative.testResults
            .flatMap((f) => f.assertionResults)
            .filter((a) => a.status === 'passed').length,
          numFailedTests: 0,
          numPendingTests: successNative.testResults
            .flatMap((f) => f.assertionResults)
            .filter((a) => a.status === 'skipped').length,
          numTodoTests: 0,
        })
      } else {
        const prune = (suites) => {
          for (const suite of suites) {
            suite.specs = suite.specs.filter((s) => s.title === title)
            prune(suite.suites ?? [])
          }
        }
        prune(successNative.suites)
        successNative.errors = []
        successContext.cases = successContext.cases.filter((c) => c.titlePath.at(-1) === title)
        Object.assign(successNative.stats, {
          expected: 0,
          unexpected: 0,
          flaky: 0,
          skipped: 0,
          [title === 'successo à' ? 'expected' : title === 'saltato' ? 'skipped' : 'flaky']:
            successContext.cases.length,
        })
        successContext.status = 'passed'
      }
      const successful = check(successNative, successContext, { exitCode: 0 })
      assert.equal(successful.outcome, outcome, JSON.stringify(successful.issues))
      assert.equal(check(successNative, successContext, { exitCode: 1 }).outcome, 'incomplete')
      assert.equal(
        check(successNative, successContext, { exitCode: 0, signal: 'SIGTERM' }).outcome,
        'incomplete',
      )
    }
  })
}

test('avvio fallito, JSON assente/malformato e interruzione conservano esito e log', async () => {
  const run = (command, signal) =>
    collect({ runner: 'playwright', phase: 'fixture', scope: 'processi isolati', command, signal })
  const startup = await run({
    executable: resolve(root, 'test-results/programma-inesistente.exe'),
    args: [],
  })
  assert.equal(startup.result.outcome, 'incomplete')
  assert.equal(startup.result.process.error.code, 'ENOENT')
  assert.equal(startup.result.process.exitCode, null)
  assert.equal(startup.result.exitCode, 2)
  const absent = await run({ executable: process.execPath, args: ['-e', 'process.exit(23)'] })
  assert.equal(absent.result.process.exitCode, 23)
  assert.equal(absent.result.exitCode, 23)
  assert.equal(absent.result.outcome, 'incomplete')
  const malformed = await run({
    executable: process.execPath,
    args: [
      '-e',
      `require('fs').writeFileSync(process.env.PLAYWRIGHT_JSON_OUTPUT_FILE, '{'); console.error('diagnostica à completa')`,
    ],
  })
  assert.equal(malformed.result.outcome, 'incomplete')
  assert.equal(malformed.result.process.exitCode, 0)
  assert.equal(malformed.result.exitCode, 2)
  assert.match(
    await readFile(resolve(malformed.directory, 'stderr.log'), 'utf8'),
    /diagnostica à completa/,
  )
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(new Error('fixture interrotta')), 800)
  try {
    const interrupted = await run(
      { executable: process.execPath, args: ['-e', 'setInterval(() => {}, 1000)'] },
      abort.signal,
    )
    assert.equal(interrupted.result.outcome, 'incomplete')
    assert.equal(interrupted.result.process.interrupted, 'fixture interrotta')
  } finally {
    clearTimeout(timer)
  }
})

test('argomenti riservati e comandi PowerShell mantengono separazione e quoting', async () => {
  await assert.rejects(
    collect({
      runner: 'vitest',
      phase: 'fixture',
      scope: 'vietato',
      args: ['--outputFile=vecchio.json'],
    }),
  )
  assert.equal(
    commandText('C:\\Program Files\\node.exe', ["l'accento", '$HOME', 'a;b']),
    "& 'C:\\Program Files\\node.exe' 'l''accento' '$HOME' 'a;b'",
  )
  const text = summary({
    runner: 'fixture',
    phase: 'fixture',
    scope: 'ambito',
    process: {},
    durationMs: 0,
    environment: {},
    counts: { total: 0 },
    reproduction: 'node',
    issues: Array(100).fill('problema'),
    errors: [],
    cases: [],
  })
  assert.ok(text.split('\n').length < 30)
})
