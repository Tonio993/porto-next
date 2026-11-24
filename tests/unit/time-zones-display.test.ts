import { createHash } from 'node:crypto'
import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { expect, it } from 'vitest'
import {
  timeZoneDataset,
  geographicZone,
  availableTimeZones,
  countryTimeZones,
  compatibleTimeZone,
  proposedPortZone,
  supportsTimeZone,
} from '../../src/shared/time-zones'
import { countryCodes } from '../../src/shared/contracts/countries'
import {
  formatCivilDate,
  formatLocalMinute,
  formatHistoricalMoment,
  formatUtcInstant,
  formatPreciseUtcInstant,
  historicalMomentDetail,
} from '../../src/renderer/src/api/date-display'
import { resolveMoment } from '../../src/backend/domain/values/moments'
import { momentFromColumns } from '../../src/backend/infrastructure/database/moment-storage'
import { selectableZone } from '../../src/backend/application/time/selectable-zone'

it('PR06 dataset IANA versionato: hash fonti, generazione riproducibile e paesi ISO', () => {
  expect(timeZoneDataset.version).toBe('2026f')
  expect(timeZoneDataset.license).toBe('Public domain')
  for (const [file, hash] of Object.entries(timeZoneDataset.hashes))
    expect(
      createHash('sha256')
        .update(readFileSync('resources/time-zones/2026f/' + file))
        .digest('hex'),
    ).toBe(hash)
  expect(Object.keys(timeZoneDataset.countries).every((code) => countryCodes.includes(code))).toBe(
    true,
  )
  const folder = mkdtempSync(join(tmpdir(), 'pr06-generation-'))
  try {
    const target = join(folder, 'zones.json')
    const run = spawnSync(process.execPath, ['scripts/generate-time-zones.mjs', target], {
      windowsHide: true,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      encoding: 'utf8',
    })
    expect(run.status, run.stderr).toBe(0)
    expect(readFileSync(target, 'utf8')).toBe(
      readFileSync('src/shared/data/time-zones.json', 'utf8'),
    )
  } finally {
    rmSync(folder, { recursive: true, force: true })
  }
})
it('PR06 unione zone.tab/zone1970, paesi multipli, territori e nessuna associazione inventata', () => {
  expect(countryTimeZones('IT')).toEqual(['Europe/Rome'])
  expect(countryTimeZones('US')).toContain('America/New_York')
  expect(countryTimeZones('US').length).toBeGreaterThan(10)
  expect(countryTimeZones('RE')).toContain('Asia/Dubai')
  expect(countryTimeZones('VA')).toEqual(['Europe/Rome'])
  expect(countryTimeZones('GU')).toContain('Pacific/Guam')
  expect(countryTimeZones('AQ').length).toBeGreaterThan(1)
  for (const code of ['BV', 'HM', 'ZZ', '']) expect(countryTimeZones(code)).toEqual([])
  expect(compatibleTimeZone('IT', 'Europe/London')).toBe(false)
  expect(compatibleTimeZone('IT', 'UTC')).toBe(false)
  expect(availableTimeZones()).toContain('UTC')
})
it('PR06 alias geografici supportati e fallback deterministico con runtime simulato più vecchio', () => {
  expect(geographicZone('US/Eastern')).toBe('America/New_York')
  expect(geographicZone('Asia/Calcutta')).toBe('Asia/Kolkata')
  expect(compatibleTimeZone('US', 'US/Eastern')).toBe(true)
  expect(compatibleTimeZone('NP', 'Asia/Katmandu')).toBe(true)
  expect(selectableZone('US/Eastern', 'US')).toBe('US/Eastern')
  expect(countryTimeZones('NP', (zone) => zone === 'Asia/Katmandu')).toEqual(['Asia/Katmandu'])
  expect(countryTimeZones('NP', () => false)).toEqual([])
  expect(availableTimeZones(() => false)).toEqual([])
  expect(supportsTimeZone('Europe/Inesistente')).toBe(false)
})
it('PR06 compatibilità reale di tutti i nomi proposti nel runtime Electron e resolver autorevole', () => {
  for (const code of countryCodes)
    for (const zone of countryTimeZones(code)) {
      expect(compatibleTimeZone(code, zone), code + '/' + zone).toBe(true)
      expect(resolveMoment('2026-01-15T12:00', zone, null).status).toBe('RESOLVED')
    }
  expect(availableTimeZones().every(supportsTimeZone)).toBe(true)
  // The dataset may be newer than ICU. Unavailable names are excluded, never silently used.
  for (const zone of timeZoneDataset.zones.filter((z) => !supportsTimeZone(z)))
    expect(availableTimeZones()).not.toContain(zone)
})
it.each([
  ['IT', 'Europe/Rome', '', 'Europe/Rome'],
  ['IT', 'America/New_York', '', 'Europe/Rome'],
  ['US', 'Europe/Rome', '', ''],
  ['US', 'America/New_York', '', 'America/New_York'],
  ['US', 'US/Eastern', '', 'America/New_York'],
  ['US', 'America/New_York', 'America/Chicago', 'America/Chicago'],
  ['IT', 'America/New_York', 'America/Chicago', 'Europe/Rome'],
  ['US', 'Europe/Rome', 'Europe/Rome', ''],
  ['BV', 'Europe/Rome', 'Europe/Rome', ''],
])('PR06 proposta/cambio paese %s %s %s', (country, company, current, expected) => {
  expect(proposedPortZone(country, company, current)).toBe(expected)
})
it.each([
  ['0001-01-01T00:00', '01/01/0001 00:00'],
  ['0099-09-09T09:09', '09/09/0099 09:09'],
  ['2000-02-29T23:59', '29/02/2000 23:59'],
  ['9999-12-31T23:59', '31/12/9999 23:59'],
])('PR06 confini calendario/padding %s', (iso, expected) => {
  expect(formatLocalMinute(iso)).toBe(expected)
  const resolution = resolveMoment(iso, 'UTC', null)
  if (resolution.status !== 'RESOLVED') throw Error('resolution')
  expect(formatHistoricalMoment(resolution.moment)).toBe(expected + ' (+00:00)')
})
it.each([
  '0000-01-01T00:00',
  '1900-02-29T12:00',
  '2026-04-31T00:00',
  '2026-00-01T00:00',
  '2026-01-00T00:00',
  '2026-01-01T24:00',
  '2026-01-01T23:60',
  '2026-1-1T00:00',
  '2026-01-01T00:00:00',
])('PR06 calendario/sintassi senza normalizzazione %s', (iso) => {
  expect(() => formatLocalMinute(iso)).toThrow()
})
it('PR06 data civile resta civile; ISO dei controlli separato dalla presentazione', () => {
  expect(formatCivilDate('2026-10-25')).toBe('25/10/2026')
  expect(() => formatCivilDate('2026-10-25T00:00')).toThrow()
  expect(() => formatCivilDate('2026-02-29')).toThrow()
  expect(() => formatLocalMinute('25/10/2026 02:30')).toThrow()
})
it('PR06 gap respinto e due occorrenze esplicite distinguibili con offset', () => {
  expect(() => resolveMoment('2026-03-29T02:30', 'Europe/Rome', null)).toThrow(
    expect.objectContaining({ code: 'LOCAL_TIME_NOT_EXISTENT' }),
  )
  const resolution = resolveMoment('2026-10-25T02:30', 'Europe/Rome', null)
  if (resolution.status !== 'CHOICE_REQUIRED') throw Error('overlap')
  expect(resolution.choices.map(formatHistoricalMoment)).toEqual([
    '25/10/2026 02:30 (+02:00)',
    '25/10/2026 02:30 (+01:00)',
  ])
  for (const choice of resolution.choices)
    expect(resolveMoment(choice.localDateTime, choice.zoneId, choice.offset)).toEqual({
      status: 'RESOLVED',
      moment: choice,
    })
})
it('PR06 offset con secondi e tupla storica non reinterpretata secondo IANA corrente', () => {
  const saved = momentFromColumns({
    local_date_time: '1900-01-01T12:00',
    zone_id: 'Europe/Paris',
    utc_offset: '+00:09:21',
    utc: '1900-01-01T11:50:39.000Z',
  })
  expect(formatHistoricalMoment(saved)).toBe('01/01/1900 12:00 (+00:09:21)')
  const old = momentFromColumns({
    local_date_time: '2026-07-01T12:00',
    zone_id: 'Europe/Rome',
    utc_offset: '+01:00',
    utc: '2026-07-01T11:00:00.000Z',
  })
  expect(formatHistoricalMoment(old)).toBe('01/07/2026 12:00 (+01:00)')
  expect(historicalMomentDetail(old)).toContain('2026-07-01T11:00:00.000Z')
  expect(historicalMomentDetail(old)).toContain('Europe/Rome')
})
it('PR06 istante tecnico al minuto conserva la precisione originale e ignora il fuso del processo', () => {
  // Execute the production module unchanged in isolated Electron child processes.
  const source = readFileSync('src/renderer/src/api/date-display.ts', 'utf8').replace(
    /^import type.*\n/m,
    '',
  )
  const program = `import ts from 'typescript'; const code=ts.transpile(${JSON.stringify(source)}, {module:ts.ModuleKind.ESNext}); const m=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64')); process.stdout.write(JSON.stringify(['2026-10-25T00:30:59.123Z','2026-10-25T02:30:59.123+02:00'].map(m.formatUtcInstant)));`
  for (const TZ of ['UTC', 'America/New_York', 'Asia/Tokyo']) {
    const run = spawnSync(process.execPath, ['--input-type=module', '-e', program], {
      windowsHide: true,
      encoding: 'utf8',
      env: { ...process.env, TZ, ELECTRON_RUN_AS_NODE: '1' },
    })
    expect(run.status, run.stderr).toBe(0)
    expect(JSON.parse(run.stdout)).toEqual(Array(2).fill('25/10/2026 00:30 (+00:00) · UTC'))
  }
  for (const iso of ['2026-10-25T00:30Z', '2026-10-25T00:30:00Z', '2026-10-25T02:30:00+02:00'])
    expect(formatUtcInstant(iso)).toBe('25/10/2026 00:30 (+00:00) · UTC')
  expect(formatPreciseUtcInstant('2026-10-25T02:30:59.1+02:00')).toBe(
    '25/10/2026 00:30:59.100 (+00:00) · UTC',
  )
  for (const iso of [
    '2026-10-25',
    '2026-10-25T00:30',
    '2026-02-30T00:30Z',
    '0001-01-01T00:00+01:00',
  ])
    expect(() => formatUtcInstant(iso)).toThrow()
  expect(formatUtcInstant('0001-01-01T00:00:00.000Z')).toBe('01/01/0001 00:00 (+00:00) · UTC')
  expect(formatUtcInstant('9999-12-31T23:59:59.999Z')).toBe('31/12/9999 23:59 (+00:00) · UTC')
})
