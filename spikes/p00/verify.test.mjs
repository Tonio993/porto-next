import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import Decimal from 'decimal.js'
import { Temporal } from '@js-temporal/polyfill'
import { bracketCases, decimalCases, timeCases, transferTimeCases } from '../../doc/p00/scenari.mts'

// Esperimento P00: nessun servizio di dominio, accesso a SQLite o integrazione nella UI.
const Exact = Decimal.clone({ precision: 1024, rounding: Decimal.ROUND_HALF_UP })

function candidates(localDateTime, zoneId) {
  const local = Temporal.PlainDateTime.from(localDateTime, { overflow: 'reject' })
  const results = new Map()
  for (const disambiguation of ['earlier', 'later']) {
    const zoned = local.toZonedDateTime(zoneId, { disambiguation })
    // Temporal risolve un gap spostando l'orario: il confronto esclude questo adattamento.
    if (!zoned.toPlainDateTime().equals(local)) continue
    const utc = zoned.toInstant().toString({ fractionalSecondDigits: 3 })
    results.set(utc, {
      localDateTime: zoned.toPlainDateTime().toString({ smallestUnit: 'minute' }),
      zoneId: zoned.timeZoneId,
      offset: zoned.offset,
      utc,
    })
  }
  return [...results.values()].sort((left, right) => Temporal.Instant.compare(left.utc, right.utc))
}

for (const scenario of decimalCases) {
  test(`${scenario.id}: prodotto e arrotondamento commerciale`, () => {
    const result = new Exact(scenario.amount).times(scenario.weight)
    assert.equal(result.toFixed(2), scenario.expected)
  })
}

for (const scenario of bracketCases) {
  test(`${scenario.id}: prova aritmetica della formula degli extra`, () => {
    const excess = BigInt(scenario.size) - BigInt(scenario.lastLimit)
    const width = BigInt(scenario.extraWidth)
    const count = excess > 0n ? (excess + width - 1n) / width : 0n
    const value = new Exact(scenario.lastValue).plus(
      new Exact(scenario.extraValue).times(count.toString()),
    )
    assert.equal(count.toString(), String(scenario.expected.extraCount))
    assert.equal(value.toFixed(), scenario.expected.tariffValue)
    assert.equal(value.times(scenario.weight).toFixed(2), scenario.expected.base)
  })
}

test('NUM-PRECISION: prodotto esatto di due operandi con 256 cifre', () => {
  const operand = '9'.repeat(256)
  const expected = (BigInt(operand) * BigInt(operand)).toString()
  assert.equal(new Exact(operand).times(operand).toFixed(), expected)
})

test('NUM-INT64: i centesimi massimi non passano da number', () => {
  const maximum = 9223372036854775807n
  assert.equal(new Exact('92233720368547758.07').times('100').toFixed(0), maximum.toString())
  assert.ok(new Exact('92233720368547758.08').times('100').greaterThan(maximum.toString()))
})

for (const scenario of timeCases) {
  test(`${scenario.id}: possibili istanti senza scelta implicita`, () => {
    assert.deepEqual(candidates(scenario.localDateTime, scenario.zoneId), scenario.candidates)
  })
}

test('TEM-REJECT: disambiguation reject respinge gap e sovrapposizione', () => {
  for (const local of ['2026-03-29T02:30', '2026-10-25T02:30']) {
    assert.throws(
      () =>
        Temporal.PlainDateTime.from(local).toZonedDateTime('Europe/Rome', {
          disambiguation: 'reject',
        }),
      RangeError,
    )
  }
})

test('TEM-OFFSET: le due occorrenze sono distinte; un offset estraneo è rifiutato', () => {
  const earlier = Temporal.ZonedDateTime.from('2026-10-25T02:30+02:00[Europe/Rome]', {
    offset: 'reject',
  })
  const later = Temporal.ZonedDateTime.from('2026-10-25T02:30+01:00[Europe/Rome]', {
    offset: 'reject',
  })
  assert.equal(Temporal.ZonedDateTime.compare(earlier, later), -1)
  assert.equal(later.epochNanoseconds - earlier.epochNanoseconds, 3_600_000_000_000n)
  assert.throws(
    () => Temporal.ZonedDateTime.from('2026-10-25T02:30+03:00[Europe/Rome]', { offset: 'reject' }),
    RangeError,
  )
})

test('TEM-INVALID: calendario e fuso non validi non vengono corretti silenziosamente', () => {
  assert.throws(() => candidates('2026-02-30T09:00', 'Europe/Rome'), RangeError)
  assert.throws(() => candidates('2026-11-10T09:00', 'Porto/FusoInesistente'), RangeError)
})

for (const scenario of transferTimeCases) {
  test(`${scenario.id}: ordine UTC tra porti con fusi diversi`, () => {
    const departure = candidates(scenario.departure.localDateTime, scenario.departure.zoneId)[0]
    const arrival = candidates(scenario.arrival.localDateTime, scenario.arrival.zoneId)[0]
    assert.equal(Temporal.Instant.compare(departure.utc, arrival.utc), scenario.expectedUtcOrder)
  })
}

test('TEM-HOST: lo stesso momento resta identico con tre fusi del processo', () => {
  const source = `
    import { Temporal } from '@js-temporal/polyfill';
    const value = Temporal.PlainDateTime.from('2026-11-10T09:00')
      .toZonedDateTime('Europe/Rome', { disambiguation: 'reject' });
    console.log(value.toInstant().toString({ fractionalSecondDigits: 3 }));
  `
  for (const zone of ['UTC', 'America/Los_Angeles', 'Pacific/Auckland']) {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', source], {
      cwd: fileURLToPath(new URL('.', import.meta.url)),
      env: { ...process.env, TZ: zone },
      encoding: 'utf8',
      windowsHide: true,
      timeout: 15_000,
    })
    assert.equal(result.status, 0, result.error?.message ?? result.stderr)
    assert.equal(result.stdout.trim(), '2026-11-10T08:00:00.000Z')
  }
})
