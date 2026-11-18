import { stripVTControlCharacters } from 'node:util'

export const clean = (value) =>
  stripVTControlCharacters(String(value))
    .replace(/[\r\n|]/g, ' ')
    .replaceAll('`', "'")
    .slice(0, 260)

// Deduplicare dopo la pulizia: due stack diversi possono avere lo stesso estratto.
export function details(items, { verbose = false, limit = 8 } = {}) {
  const unique = [...new Set(items.filter(Boolean).map(clean))]
  const shown = unique.slice(0, verbose ? 32 : limit)
  return [
    ...shown.map((item) => `- ${item}`),
    ...(unique.length > shown.length
      ? [`- Altri ${unique.length - shown.length} dettagli distinti nei report completi.`]
      : []),
  ]
}

export function countsText(c) {
  return `${c.total} casi: ${c.passed} passati, ${c.failed} falliti, ${c.skipped} saltati, ${c.flaky} flaky, ${c['expected-failure']} fallimenti attesi, ${c.incomplete} incompleti; ${c.attempts} tentativi, ${c.retried} casi con retry.`
}

export function noteworthy(phase) {
  return (
    phase.requested &&
    (phase.status !== 'passed' ||
      ['failed', 'skipped', 'flaky', 'expected-failure', 'incomplete', 'retried'].some(
        (key) => phase.counts?.[key] > 0,
      ))
  )
}
