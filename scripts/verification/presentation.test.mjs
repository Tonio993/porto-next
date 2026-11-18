import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runSummary } from './coordinator.mjs'
import { summary } from './results.mjs'

const counts = {
  total: 1,
  passed: 1,
  failed: 0,
  skipped: 0,
  flaky: 0,
  incomplete: 0,
  'expected-failure': 0,
  attempts: 1,
  retried: 0,
}
const phase = (id, status = 'passed', extra = {}) => ({
  id,
  status,
  requested: true,
  process: { exitCode: 0 },
  details: `${id}/execution.json`,
  ...extra,
})
const run = (phases, extra = {}) => ({
  profile: 'step',
  outcome: 'passed',
  completed: true,
  exitCode: 0,
  coverage: 'requested-profile',
  issues: [],
  phases,
  ...extra,
})
const result = (extra = {}) => ({
  runner: 'vitest',
  phase: 'backend',
  scope: 'completo',
  outcome: 'passed',
  exitCode: 0,
  process: { exitCode: 0 },
  counts,
  durationMs: 1,
  environment: { cwd: 'repo' },
  reproduction: 'node test.mjs',
  issues: [],
  errors: [],
  cases: [{ status: 'passed', attempts: [{ status: 'passed' }] }],
  ...extra,
})

test('successo completo: poche righe, contesto e conteggi, nessuna fase passata o non richiesta', () => {
  const input = run([
    phase('backend', 'passed', { counts }),
    phase('package', 'not-requested', { requested: false }),
  ])
  const before = structuredClone(input)
  const text = runSummary(input)
  assert.equal(text.trimEnd().split('\n').length, 4)
  assert.match(text, /step: passed/)
  assert.match(text, /Completezza: completa.*finale: true.*requested-profile.*Uscita: 0/)
  assert.match(text, /Fasi richieste: 1; passate: 1; problematiche: 0/)
  assert.match(text, /1 casi: 1 passati/)
  assert.match(text, /results.json/)
  assert.doesNotMatch(text, /backend:|package:/)
  const detailed = runSummary(input, { verbose: true })
  assert.match(detailed, /backend: passed/)
  assert.match(detailed, /package: not-requested/)
  assert.deepEqual(input, before)
})

test('fallimenti, blocchi, report mancanti/incompleti, interruzioni e avvisi richiesti visibili', () => {
  for (const [status, reason] of [
    ['failed', 'asserzione fallita'],
    ['blocked', 'dipendenza fallita'],
    ['incomplete', 'Report assente'],
    ['incomplete', 'Report incompleto'],
    ['incomplete', 'SIGINT'],
    ['not-executed', 'Interruzione prima della fase'],
    ['known-warning', 'Avviso legacy'],
    ['running', 'In corso'],
  ]) {
    const input = run(
      [phase('backend', status, { reason, process: { exitCode: 37 }, collectorExitCode: 2 })],
      { outcome: 'incomplete', exitCode: 2 },
    )
    const text = runSummary(input)
    assert.ok(text.includes(`backend: ${status}`))
    assert.ok(text.includes(reason))
    assert.match(text, /processo 37, collector 2/)
    assert.match(text, /Completezza: incompleta/)
    assert.match(text, /backend\/execution.json/)
  }
})

test('diagnostica riuscita parziale, esecuzione vuota e in corso mai verdi completi', () => {
  const text = runSummary(
    run([phase('diff')], { profile: 'diagnostica', coverage: 'partial', exitCode: 2 }),
  )
  assert.match(text, /diagnostica: passed/)
  assert.match(text, /Copertura: partial. Uscita: 2/)
  for (const input of [
    run([]),
    run([phase('diff', 'not-executed')], { completed: false, outcome: 'incomplete', exitCode: 2 }),
  ]) {
    assert.match(runSummary(input), /: incomplete/)
    assert.match(runSummary(input), /Completezza: incompleta/)
  }
})

test('collector: salti, flaky, retry, fallimenti attesi e tentativi falliti conservano contatori e dettagli', () => {
  const cases = ['skipped', 'flaky', 'expected-failure', 'passed'].map((status) => ({
    status,
    file: 'test.mjs',
    titlePath: [status],
    attempts: [
      { status: 'failed', errors: [{ message: 'primo tentativo' }] },
      { status: 'passed' },
    ],
  }))
  const c = {
    ...counts,
    total: 4,
    skipped: 1,
    flaky: 1,
    'expected-failure': 1,
    attempts: 8,
    retried: 4,
  }
  const input = result({ cases, counts: c, outcome: 'flaky' })
  const before = structuredClone(input)
  for (const verbose of [false, true]) {
    const text = summary(input, { verbose })
    assert.match(text, /1 saltati, 1 flaky, 1 fallimenti attesi/)
    assert.match(text, /8 tentativi, 4 casi con retry.*Tentativi falliti: 4/)
    for (const status of ['skipped', 'flaky', 'expected-failure', 'passed'])
      assert.ok(text.includes(`${status}: test.mjs`))
    assert.match(text, /primo tentativo/)
  }
  assert.deepEqual(input, before)
  assert.match(runSummary(run([phase('backend', 'passed', { counts: c })])), /backend: passed/)
})

test('collector: successo compatto, incompleto e zero casi espliciti; dettagli e riproduzione consultabili', () => {
  const input = result()
  const before = structuredClone(input)
  assert.equal(summary(input).trimEnd().split('\n').length, 4)
  assert.doesNotMatch(summary(input), /Riproduzione|Durata/)
  assert.match(summary(input, { verbose: true }), /Riproduzione.*cwd repo/)
  assert.match(summary(input, { verbose: true }), /stdout.log/)
  assert.deepEqual(input, before)
  for (const incomplete of [
    result({ outcome: 'incomplete', exitCode: 2, issues: ['Report mancante'] }),
    result({ counts: { ...counts, total: 0, passed: 0 }, cases: [] }),
  ]) {
    assert.match(summary(incomplete), /backend: incomplete/)
    assert.match(summary(incomplete), /Completezza: incompleta/)
  }
})

test('dettagli limitati e deduplicati dopo pulizia, con numero residuo e JSON intatto', () => {
  const input = result({
    outcome: 'incomplete',
    issues: ['uguale\n', 'uguale\r', ...Array.from({ length: 40 }, (_, i) => `errore ${i}`)],
  })
  const before = structuredClone(input)
  const text = summary(input)
  assert.equal(text.match(/- uguale/g).length, 1)
  assert.match(text, /Altri 33 dettagli distinti nei report completi/)
  assert.match(summary(input, { verbose: true }), /Altri 9 dettagli distinti/)
  assert.deepEqual(input, before)
  const many = run(
    Array.from({ length: 12 }, (_, i) => phase(`fase${i}`, 'blocked')),
    { outcome: 'incomplete' },
  )
  assert.match(runSummary(many), /Altre 4 fasi problematiche/)
})
