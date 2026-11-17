import { createHash } from 'node:crypto'
import { stripVTControlCharacters } from 'node:util'

const statuses = ['passed', 'failed', 'skipped', 'incomplete', 'flaky', 'expected-failure']
const array = (value, name) => {
  if (!Array.isArray(value)) throw new Error(`Campo ${name} assente o non valido`)
  return value
}
const number = (value, name) => {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Conteggio/durata ${name} non valido`)
  return value
}
const string = (value, name) => {
  if (typeof value !== 'string') throw new Error(`Campo ${name} non valido`)
  return value
}
const same = (actual, expected, name) => {
  if (actual !== expected) throw new Error(`Incoerenza ${name}: ${actual} / ${expected}`)
}
const id = (runner, context) =>
  createHash('sha256')
    .update(JSON.stringify([runner, context]))
    .digest('hex')

export function normalize(runner, native, context) {
  const data = { cases: [], errors: [], issues: [], nativeCounts: null }
  try {
    same(context.version, 1, 'versione contesto')
    if (context.completed !== true)
      data.issues.push('Il runner non ha completato il report di contesto')
    if (runner === 'vitest') vitest(native, context, data)
    else playwright(native, context, data)
    const ids = data.cases.map((c) => c.id)
    same(new Set(ids).size, ids.length, 'identità duplicate')
    if (!ids.length) data.issues.push('Nessun caso eseguito o inventariato per l’ambito richiesto')
  } catch (error) {
    data.issues.push(error.message)
  }
  data.counts = Object.fromEntries(statuses.map((status) => [status, 0]))
  data.counts.total = data.cases.length
  data.counts.attempts = 0
  data.counts.retried = 0
  for (const [index, test] of data.cases.entries()) {
    test.detailsPointer = `/cases/${index}`
    data.counts[test.status]++
    data.counts.attempts += test.attempts.length
    if (test.attempts.some((a) => a.retryIndex > 0)) data.counts.retried++
  }
  return data
}

function vitest(native, context, data) {
  const modules = array(context.modules, 'modules')
  const expected = array(context.expectedModules, 'expectedModules')
  same(modules.length, expected.length, 'moduli attesi/ricevuti')
  same(new Set(modules.map((m) => m.id)).size, modules.length, 'moduli duplicati')
  for (const module of modules) {
    if (!expected.some((e) => e.id === module.id)) throw new Error('Modulo inatteso')
    data.errors.push(...array(module.errors, 'module.errors'))
    if (module.state === 'failed') data.errors.push({ message: `Modulo fallito: ${module.file}` })
    if (['pending', 'queued'].includes(module.state))
      data.issues.push(`Modulo incompleto: ${module.file}`)
    for (const test of array(module.cases, 'module.cases')) {
      string(test.runnerId, 'runnerId')
      const attempts = array(test.attempts, 'attempts').map((a) => ({
        status: a.state,
        retryIndex: number(a.retryIndex, 'retryIndex'),
        repeatIndex: number(a.repeatIndex, 'repeatIndex'),
        durationMs: number(a.duration, 'attempt.duration'),
        startedAt: new Date(a.startTime).toISOString(),
        errors: a.errors ?? [],
      }))
      if (attempts.some((a) => !['passed', 'failed', 'skipped'].includes(a.status)))
        throw new Error('Stato tentativo Vitest non valido')
      const status = test.state === 'pending' ? 'incomplete' : test.state
      if (!statuses.includes(status)) throw new Error('Stato caso Vitest non valido')
      const flaky = status === 'passed' && attempts.some((a) => a.status === 'failed')
      const identity = {
        runnerId: test.runnerId,
        project: string(test.project, 'project'),
        file: string(test.file, 'file'),
        titlePath: array(test.titlePath, 'titlePath'),
        parameters: { each: test.options?.each ?? false, meta: test.meta ?? {} },
      }
      data.cases.push({
        ...identity,
        id: id('vitest', identity),
        location: test.location,
        status: flaky
          ? 'flaky'
          : status === 'passed' && test.options?.fails
            ? 'expected-failure'
            : status,
        nativeStatus: test.state,
        expectedStatus: test.options?.fails ? 'failed' : 'passed',
        durationMs: number(test.durationMs, 'durationMs'),
        attempts,
        errors: test.errors,
      })
      if (['passed', 'failed'].includes(status) && !attempts.length)
        data.issues.push(`Tentativi mancanti: ${test.runnerId}`)
      if (status === 'passed' && attempts.at(-1)?.status !== 'passed')
        data.issues.push(`Esito e ultimo tentativo discordanti: ${test.runnerId}`)
    }
  }
  data.errors.push(...array(context.errors, 'context.errors'))
  if (context.reason === 'interrupted') data.issues.push('Vitest interrotto')
  const files = array(native.testResults, 'testResults')
  same(files.length, modules.length, 'file nativi/moduli')
  for (const file of files) {
    if (!['passed', 'failed'].includes(file.status)) throw new Error('Stato file Vitest non valido')
    if (!modules.some((m) => m.file === file.name)) throw new Error('File Vitest senza modulo')
  }
  if (native.success === true && files.some((f) => f.status === 'failed'))
    throw new Error('Sessione Vitest riuscita con file falliti')
  const assertions = files.flatMap((f) => array(f.assertionResults, 'assertionResults'))
  data.nativeCounts = Object.fromEntries(
    ['numTotalTests', 'numPassedTests', 'numFailedTests', 'numPendingTests', 'numTodoTests'].map(
      (key) => [key, number(native[key], key)],
    ),
  )
  same(assertions.length, native.numTotalTests, 'test nativi')
  if (typeof native.success !== 'boolean') throw new Error('Esito finale Vitest assente')
  if (!['passed', 'failed', 'interrupted'].includes(context.reason))
    throw new Error('Stato finale Vitest assente')
  same(data.cases.length, native.numTotalTests, 'casi/JSON nativo')
  same(
    assertions.filter((a) => a.status === 'passed').length,
    native.numPassedTests,
    'asserzioni passate',
  )
  same(
    assertions.filter((a) => a.status === 'failed').length,
    native.numFailedTests,
    'asserzioni fallite',
  )
  same(
    data.cases.filter((c) => c.nativeStatus === 'passed').length,
    native.numPassedTests,
    'passati',
  )
  same(
    data.cases.filter((c) => c.nativeStatus === 'failed').length,
    native.numFailedTests,
    'falliti',
  )
  same(
    native.numPassedTests + native.numFailedTests + native.numPendingTests + native.numTodoTests,
    native.numTotalTests,
    'somma conteggi Vitest',
  )
  const unmatched = [...data.cases]
  for (const file of files) {
    if (file.message) data.errors.push({ message: file.message, file: file.name })
    for (const assertion of file.assertionResults) {
      const index = unmatched.findIndex(
        (c) =>
          c.file === file.name &&
          JSON.stringify(c.titlePath) ===
            JSON.stringify([...assertion.ancestorTitles, assertion.title]) &&
          (['skipped', 'todo', 'disabled'].includes(assertion.status)
            ? c.nativeStatus === 'skipped'
            : assertion.status === 'pending'
              ? c.nativeStatus === 'pending'
              : c.nativeStatus === assertion.status),
      )
      if (index < 0) throw new Error(`Asserzione senza contesto coerente: ${assertion.fullName}`)
      unmatched.splice(index, 1)
    }
  }
  if (native.success !== true || context.reason === 'failed')
    data.errors.push({ message: 'Il runner Vitest dichiara il fallimento della sessione' })
}

function playwright(native, context, data) {
  const inventory = [...array(context.cases, 'context.cases')]
  const visit = (suites, parents = []) => {
    for (const suite of array(suites, 'suites')) {
      const titlePath = [...parents, suite.title]
      for (const spec of array(suite.specs, 'specs')) {
        for (const test of array(spec.tests, 'tests')) {
          const index = inventory.findIndex(
            (c) =>
              c.file === spec.file &&
              c.project === test.projectName &&
              JSON.stringify(c.titlePath) === JSON.stringify([...titlePath.slice(1), spec.title]),
          )
          if (index < 0) throw new Error(`Caso Playwright senza contesto: ${spec.title}`)
          const identity = inventory.splice(index, 1)[0]
          string(identity.runnerId, 'runnerId')
          const attempts = array(test.results, 'results').map((a) => ({
            ...a,
            status:
              a.status === 'timedOut'
                ? 'failed'
                : a.status === 'interrupted'
                  ? 'incomplete'
                  : a.status,
            retryIndex: number(a.retry, 'retry'),
            repeatIndex: identity.repeatEachIndex,
            durationMs: number(a.duration, 'duration'),
            startedAt: a.startTime,
            errors: a.error ? [a.error, ...a.errors] : array(a.errors, 'errors'),
          }))
          if (attempts.some((a) => !statuses.includes(a.status)))
            throw new Error('Stato tentativo Playwright non valido')
          let status = {
            skipped: 'skipped',
            expected: 'passed',
            unexpected: 'failed',
            flaky: 'flaky',
          }[test.status]
          if (!status) throw new Error('Stato caso Playwright non valido')
          if (
            attempts.some((a) => a.status === 'incomplete') ||
            (!attempts.length && status !== 'skipped')
          )
            status = 'incomplete'
          if (status === 'passed' && test.expectedStatus === 'failed') status = 'expected-failure'
          if (status === 'passed' && attempts.at(-1)?.status !== 'passed')
            throw new Error('Caso passato senza tentativo passato')
          if (
            status === 'flaky' &&
            (!attempts.some((a) => a.status === 'failed') || attempts.at(-1)?.status !== 'passed')
          )
            throw new Error('Caso flaky senza fallimento iniziale e successo finale')
          if (status === 'skipped' && attempts.some((a) => a.status !== 'skipped'))
            throw new Error('Caso saltato con tentativi discordanti')
          data.cases.push({
            ...identity,
            id: id('playwright', identity),
            specId: spec.id,
            projectId: test.projectId,
            status,
            nativeStatus: test.status,
            expectedStatus: test.expectedStatus,
            durationMs: attempts.reduce((sum, a) => sum + a.durationMs, 0),
            attempts,
            errors: attempts.flatMap((a) => a.errors),
          })
        }
      }
      visit(suite.suites ?? [], titlePath)
    }
  }
  visit(native.suites)
  for (const missing of inventory) {
    data.cases.push({
      ...missing,
      id: id('playwright', missing),
      status: 'incomplete',
      attempts: [],
      durationMs: 0,
      errors: [],
    })
    data.issues.push(`Caso assente nel JSON nativo: ${missing.runnerId}`)
  }
  data.errors.push(...array(native.errors, 'errors'))
  data.nativeCounts = native.stats
  number(native.stats.duration, 'stats.duration')
  for (const status of ['expected', 'unexpected', 'flaky', 'skipped']) {
    same(
      data.cases.filter((c) => c.nativeStatus === status).length,
      number(native.stats[status], status),
      `Playwright ${status}`,
    )
  }
  if (['interrupted', 'timedout'].includes(context.status))
    data.issues.push(`Playwright: ${context.status}`)
  else if (context.status !== 'passed' && context.status !== 'failed')
    throw new Error('Stato finale Playwright assente')
  if (context.status === 'failed')
    data.errors.push({ message: 'Il runner Playwright dichiara il fallimento della sessione' })
}

export function finalize(metadata, data) {
  const issues = [...data.issues]
  const process = metadata.process
  if (process.error) issues.push(`Avvio/processo: ${process.error.message}`)
  if (process.signal || process.interrupted)
    issues.push(`Processo interrotto: ${process.signal ?? process.interrupted}`)
  if (!Number.isInteger(process.exitCode)) issues.push('Codice di uscita del processo assente')
  if (data.counts.incomplete) issues.push('Casi non completati')
  const failures = data.counts.failed > 0 || data.errors.length > 0
  if (process.exitCode === 0 && failures) issues.push('Processo riuscito ma risultati falliti')
  if (process.exitCode !== null && process.exitCode !== 0 && !failures && !issues.length)
    issues.push('Processo fallito ma report senza fallimenti: consultare stderr/setup')
  const outcome = issues.length
    ? 'incomplete'
    : failures
      ? 'failed'
      : data.counts.flaky
        ? 'flaky'
        : data.counts.skipped
          ? 'passed-with-skips'
          : 'passed'
  return {
    formatVersion: 1,
    ...metadata,
    ...data,
    issues,
    outcome,
    exitCode:
      Number.isInteger(process.exitCode) && process.exitCode !== 0
        ? process.exitCode
        : outcome === 'incomplete'
          ? 2
          : outcome === 'failed'
            ? 1
            : 0,
  }
}

const clean = (value) =>
  stripVTControlCharacters(String(value))
    .replaceAll('\n', ' ')
    .replaceAll('\r', ' ')
    .replaceAll('`', "'")
    .slice(0, 260)
function describeError(error) {
  if (typeof error === 'string') return error
  const location = error.location ?? error.stacks?.[0]
  const file = location?.file ?? error.file
  return `${file ? `${file}:${location?.line ?? '?'} — ` : ''}${error.message ?? error.stack ?? JSON.stringify(error)}`
}
export function summary(result) {
  const c = result.counts
  const lines = [
    `# ${result.runner} · ${result.phase}: ${result.outcome}`,
    '',
    `Ambito: ${clean(result.scope)}. Uscita processo: ${result.process.exitCode ?? 'assente'}; raccolta: ${result.exitCode}. Durata: ${result.durationMs} ms.`,
    '',
    `${c.total} casi: ${c.passed} passati, ${c.failed} falliti, ${c.skipped} saltati, ${c.flaky} flaky, ${c['expected-failure']} fallimenti attesi, ${c.incomplete} incompleti. ${c.attempts} tentativi; ${c.retried} casi con retry.`,
    '',
    `Riproduzione (PowerShell, cwd ${clean(result.environment.cwd)}):`,
    '',
    '```powershell',
    result.reproduction,
    '```',
    '',
    '[Risultati completi](results.json) · [Metadati](execution.json) · [stdout](stdout.log) · [stderr](stderr.log) · [Artefatti](artifacts/)',
  ]
  if (result.availableReports?.length)
    lines.push(result.availableReports.map((path) => `[${path}](${path})`).join(' · '))
  const problems = [
    ...result.issues,
    ...result.errors.map(describeError),
    ...result.cases
      .filter((t) => t.status !== 'passed')
      .map((t) => {
        const error = t.attempts.flatMap((a) => a.errors ?? [])[0] ?? t.errors?.[0]
        return `${t.status}: ${t.file}:${t.location?.line ?? '?'} — ${t.titlePath.join(' > ')}${error ? ` — ${describeError(error)}` : ''}`
      }),
  ]
  if (result.issues.length && !result.errors.length && result.diagnostics?.stderrExcerpt)
    problems.unshift(`Diagnostica stderr (estratto): ${result.diagnostics.stderrExcerpt}`)
  if (problems.length) {
    lines.push('', ...problems.slice(0, 8).map((p) => `- ${clean(p)}`))
    if (problems.length > 8)
      lines.push(`- Altri ${problems.length - 8} dettagli in results.json e nei report nativi.`)
  }
  return `${lines.join('\n')}\n`
}
