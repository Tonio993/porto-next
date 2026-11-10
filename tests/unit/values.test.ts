import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { decimalCases, timeCases } from '../../doc/p00/scenari.mjs'
import {
  decimalText,
  Money,
  multiplyToMoney,
  positiveDecimal,
} from '../../src/backend/domain/values/numbers'
import {
  initialPortTimeZone,
  resolveMoment,
  timeZoneId,
} from '../../src/backend/domain/values/moments'
import {
  momentFromColumns,
  momentToColumns,
  type MomentColumns,
} from '../../src/backend/infrastructure/database/moment-storage'
import { decimalInput, formatMoney, moneyInput } from '../../src/renderer/src/api/numeric-input'

describe('numeri esatti e adattatori EUR', () => {
  for (const scenario of decimalCases) {
    it(scenario.id, () => {
      expect(multiplyToMoney(scenario.amount, scenario.weight).text).toBe(scenario.expected)
    })
  }

  it('distingue importi manuali, fattori e normalizzazione italiana', () => {
    expect(moneyInput(' 000172,5 ')).toBe('172.50')
    expect(moneyInput('2,675')).toBeNull()
    expect(moneyInput('1.234,50')).toBeNull()
    expect(decimalInput('0001,12345678901234567890100')).toBe('1.123456789012345678901')
    expect(decimalText('0001.2300')).toBe('1.23')
    expect(formatMoney('92233720368547758.07')).toBe('92.233.720.368.547.758,07 €')
    for (const input of [0.01, '2.675', '01.00', '1,00', '-1.00', '1e2', ' 1.00 ', '1.00\n'])
      expect(() => Money.parse(input)).toThrowError(
        expect.objectContaining({ code: 'VALIDATION_ERROR' }),
      )
    for (const input of ['1e2', '1,5', 'Infinity', 'NaN', '-1', 1, '', '.5'])
      expect(() => decimalText(input)).toThrow()
    expect(() => positiveDecimal('0.000')).toThrow()
    expect(positiveDecimal('0.0000000000000000000001')).toBe('0.0000000000000000000001')
  })

  it('mantiene la precisione limite e arrotonda ogni passaggio monetario', () => {
    const operand = `0.${'9'.repeat(255)}`
    expect(multiplyToMoney(operand, operand).text).toBe('1.00')
    // A binary float would collapse this factor to 0.5 and incorrectly round up.
    expect(multiplyToMoney('0.01', `0.4${'9'.repeat(254)}`).text).toBe('0.00')
    expect(() => decimalText(`0.${'0'.repeat(255)}1`)).toThrow()
    expect(multiplyToMoney('0.01', '0.5').multiply('0.5').text).toBe('0.01')
    expect(Money.parse('0.00').cents).toBe(0n)
  })

  it('conserva centesimi oltre 2^53 in SQLite e rifiuta overflow senza scritture parziali', () => {
    const sqlite = new Database(':memory:')
    try {
      sqlite.exec('CREATE TABLE amounts (cents INTEGER NOT NULL) STRICT')
      const maximum = Money.parse('92233720368547758.07')
      sqlite.prepare('INSERT INTO amounts VALUES (?)').run(maximum.cents)
      const read = sqlite.prepare('SELECT CAST(cents AS TEXT) FROM amounts').pluck().get() as string
      expect(Money.fromCents(BigInt(read)).text).toBe(maximum.text)
      expect(() => Money.fromCents(9223372036854775808n)).toThrowError(
        expect.objectContaining({ code: 'AMOUNT_OUT_OF_RANGE' }),
      )
      expect(() => Money.parse('92233720368547758.08')).toThrow()
      expect(() =>
        sqlite.transaction(() => {
          sqlite.prepare('INSERT INTO amounts VALUES (?)').run(1n)
          maximum.multiply('2')
        })(),
      ).toThrowError(expect.objectContaining({ code: 'AMOUNT_OUT_OF_RANGE' }))
      expect(sqlite.prepare('SELECT COUNT(*) FROM amounts').pluck().get()).toBe(1)
    } finally {
      sqlite.close()
    }
  })
})

describe('momenti espliciti e fusi IANA', () => {
  it('propone il fuso aziendale al porto e ne crea una configurazione autonoma senza decorrenza', () => {
    expect(initialPortTimeZone('Europe/Rome')).toEqual({
      zoneId: 'Europe/Rome',
      effectiveFrom: null,
    })
    expect(initialPortTimeZone('Europe/Rome', 'Europe/London')).toEqual({
      zoneId: 'Europe/London',
      effectiveFrom: null,
    })
    expect(() => initialPortTimeZone('Europe/Rome', '+01:00')).toThrow()
  })

  it('conserva la tupla locale/fuso/offset/UTC in SQLite senza reinterpretare lo storico', () => {
    const result = resolveMoment('1900-01-01T12:00', 'Europe/Paris', null)
    if (result.status !== 'RESOLVED') throw new Error('Momento non univoco')
    const sqlite = new Database(':memory:')
    try {
      sqlite.exec(
        'CREATE TABLE moments (local_date_time TEXT, zone_id TEXT, utc_offset TEXT, utc TEXT) STRICT',
      )
      const columns = momentToColumns(result.moment)
      sqlite
        .prepare('INSERT INTO moments VALUES (@local_date_time, @zone_id, @utc_offset, @utc)')
        .run(columns)
      const read = sqlite.prepare('SELECT * FROM moments').get() as MomentColumns
      expect(momentFromColumns(read)).toEqual(result.moment)
      // A stored offset survives an IANA rule change; only the tuple's arithmetic is checked.
      expect(momentFromColumns({ ...read, zone_id: 'Europe/London' }).offset).toBe('+00:09:21')
      expect(() => momentFromColumns({ ...read, utc: '1900-01-01T12:00:00.000Z' })).toThrow()
    } finally {
      sqlite.close()
    }
  })
  for (const scenario of timeCases) {
    it(scenario.id, () => {
      if (scenario.candidates.length === 0) {
        expect(() => resolveMoment(scenario.localDateTime, scenario.zoneId, null)).toThrowError(
          expect.objectContaining({ code: 'LOCAL_TIME_NOT_EXISTENT' }),
        )
        return
      }
      const result = resolveMoment(scenario.localDateTime, scenario.zoneId, null)
      expect(result.status === 'RESOLVED' ? [result.moment] : result.choices).toEqual(
        scenario.candidates,
      )
      for (const candidate of scenario.candidates)
        expect(resolveMoment(scenario.localDateTime, scenario.zoneId, candidate.offset)).toEqual({
          status: 'RESOLVED',
          moment: candidate,
        })
    })
  }

  it('rifiuta date normalizzate, secondi, offset e fusi non validi', () => {
    for (const local of [
      '2026-02-30T10:00',
      '2026-01-01T24:00',
      '0000-01-01T00:00',
      '2026-01-01T10:00:00',
      '2026-1-1T10:00',
      '2026-01-01T10:00Z',
      null,
    ])
      expect(() => resolveMoment(local, 'Europe/Rome', null)).toThrowError(
        expect.objectContaining({ code: 'VALIDATION_ERROR' }),
      )
    for (const zone of ['+01:00', '-03:00', 'Europe/Inesistente', '', null, ' Europe/Rome '])
      expect(() => timeZoneId(zone)).toThrowError(
        expect.objectContaining({ code: 'INVALID_TIME_ZONE' }),
      )
    for (const offset of ['+03:00', '', undefined, 60])
      expect(() => resolveMoment('2026-10-25T02:30', 'Europe/Rome', offset)).toThrowError(
        expect.objectContaining({ code: 'INVALID_OFFSET' }),
      )
  })

  it('conserva offset storici con secondi senza troncare l’UTC', () => {
    expect(resolveMoment('1900-01-01T12:00', 'Europe/Paris', null)).toEqual({
      status: 'RESOLVED',
      moment: {
        localDateTime: '1900-01-01T12:00',
        zoneId: 'Europe/Paris',
        offset: '+00:09:21',
        utc: '1900-01-01T11:50:39.000Z',
      },
    })
  })

  it('il fuso del processo non cambia la risoluzione con il runtime Electron', () => {
    const program = `
      import { Temporal } from '@js-temporal/polyfill';
      const value = Temporal.PlainDateTime.from('2026-10-25T02:30');
      process.stdout.write(JSON.stringify(['earlier', 'later'].map(disambiguation =>
        value.toZonedDateTime('Europe/Rome', { disambiguation }).toInstant().toString())));
    `
    const outputs = ['UTC', 'America/New_York', 'Asia/Tokyo'].map((TZ) => {
      const result = spawnSync(process.execPath, ['--input-type=module', '-e', program], {
        cwd: resolve('.'),
        env: { ...process.env, TZ, ELECTRON_RUN_AS_NODE: '1' },
        encoding: 'utf8',
        windowsHide: true,
      })
      expect(result.status, result.stderr).toBe(0)
      return result.stdout
    })
    expect(new Set(outputs).size).toBe(1)
    expect(JSON.parse(outputs[0])).toEqual(['2026-10-25T00:30:00Z', '2026-10-25T01:30:00Z'])
  })
})
