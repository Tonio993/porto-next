import { randomUUID } from 'node:crypto'
import type {
  TariffDto,
  TariffSummaryDto,
  TariffConfigurationDto,
} from '../../../shared/contracts/tariffs'
import { ArchiveError } from '../../../shared/errors/archive-error'
import type { DatabaseSession } from './database-session'
import { momentFromColumns } from './moment-storage'

type Row = {
  id: string
  portId: string
  effectiveFrom: string
  local_date_time: string
  zone_id: string
  utc_offset: string
  effectiveTo: string | null
}
const selection = `SELECT t.id, t.port_id AS portId, t.effective_from AS effectiveFrom,
  t.effective_local_date_time AS local_date_time, t.effective_zone_id AS zone_id, t.effective_utc_offset AS utc_offset,
  (SELECT min(n.effective_from) FROM tariffs n WHERE n.port_id=t.port_id AND n.effective_from>t.effective_from) AS effectiveTo FROM tariffs t`
export class TariffRepository {
  constructor(
    private readonly database: DatabaseSession,
    private readonly observedAt = new Date().toISOString(),
  ) {}
  private summary(row: Row): TariffSummaryDto {
    return {
      id: row.id,
      portId: row.portId,
      effectiveFrom: row.effectiveFrom,
      effectiveMoment: momentFromColumns({ ...row, utc: row.effectiveFrom }),
      effectiveTo: row.effectiveTo,
      phase:
        row.effectiveFrom > this.observedAt
          ? 'FUTURE'
          : row.effectiveTo !== null && row.effectiveTo <= this.observedAt
            ? 'HISTORICAL'
            : 'CURRENT',
    }
  }
  list(portId: string, page: number, pageSize: number) {
    const sql = this.database.sqlite
    const total = sql
      .prepare('SELECT count(*) FROM tariffs WHERE port_id=?')
      .pluck()
      .get(portId) as number
    const rows = sql
      .prepare(`${selection} WHERE t.port_id=? ORDER BY t.effective_from LIMIT ? OFFSET ?`)
      .all(portId, pageSize, (page - 1) * pageSize) as Row[]
    return { items: rows.map((row) => this.summary(row)), total, page, pageSize }
  }
  get(id: string): TariffDto {
    const sql = this.database.sqlite
    const row = sql.prepare(`${selection} WHERE t.id=?`).get(id) as Row | undefined
    if (!row) throw new ArchiveError('NOT_FOUND', 'La tariffa non esiste più.')
    const configs = sql
      .prepare(
        'SELECT id, vessel_type_id AS vesselTypeId, extra_width AS extraWidth, extra_value AS extraValue FROM tariff_configurations WHERE tariff_id=? ORDER BY vessel_type_id',
      )
      .all(id) as Omit<TariffConfigurationDto, 'brackets'>[]
    const configurations = configs.map((c) => ({
      ...c,
      brackets: sql
        .prepare(
          'SELECT id, upper_limit AS upperLimit, value FROM tariff_brackets WHERE configuration_id=? ORDER BY upper_limit',
        )
        .all(c.id) as TariffConfigurationDto['brackets'],
    }))
    if (configurations.length !== 3 || configurations.some((c) => !c.brackets.length))
      throw new ArchiveError('INVALID_ARCHIVE', 'La tariffa salvata non è completa.')
    return { ...this.summary(row), configurations }
  }
  at(portId: string, instant: string) {
    const row = this.database.sqlite
      .prepare(
        'SELECT id FROM tariffs WHERE port_id=? AND effective_from<=? ORDER BY effective_from DESC LIMIT 1',
      )
      .get(portId, instant) as { id: string } | undefined
    if (!row)
      throw new ArchiveError(
        'TARIFF_NOT_FOUND',
        'Nessuna tariffa applicabile al porto e al momento economico indicati.',
      )
    return this.get(row.id)
  }
  neighbors(portId: string, instant: string) {
    const sql = this.database.sqlite
    if (
      sql
        .prepare('SELECT id FROM tariffs WHERE port_id=? AND effective_from=?')
        .get(portId, instant)
    )
      throw new ArchiveError(
        'DUPLICATE_IDENTIFIER',
        'Esiste già una tariffa con questa decorrenza nel porto.',
        [{ path: ['moment'], code: 'DUPLICATE_START', message: 'Scegli una decorrenza diversa.' }],
      )
    const previous = sql
      .prepare(
        'SELECT id FROM tariffs WHERE port_id=? AND effective_from<? ORDER BY effective_from DESC LIMIT 1',
      )
      .get(portId, instant) as { id: string } | undefined
    const next = sql
      .prepare(
        'SELECT effective_from FROM tariffs WHERE port_id=? AND effective_from>? ORDER BY effective_from LIMIT 1',
      )
      .pluck()
      .get(portId, instant) as string | undefined
    return { previous: previous ? this.get(previous.id) : null, next: next ?? null }
  }
  insert(tariff: TariffDto) {
    const sql = this.database.sqlite,
      moment = tariff.effectiveMoment!
    sql
      .prepare('INSERT INTO tariffs VALUES (?,?,?,?,?,?)')
      .run(tariff.id, tariff.portId, moment.utc, moment.localDateTime, moment.zoneId, moment.offset)
    for (const c of tariff.configurations) {
      sql
        .prepare('INSERT INTO tariff_configurations VALUES (?,?,?,?,?)')
        .run(c.id, tariff.id, c.vesselTypeId, c.extraWidth, c.extraValue)
      for (const b of c.brackets)
        sql
          .prepare('INSERT INTO tariff_brackets VALUES (?,?,?,?)')
          .run(b.id, c.id, b.upperLimit, b.value)
    }
    return this.get(tariff.id)
  }
  copyConfigurations(id: string) {
    return this.get(id).configurations.map((c) => ({
      vesselTypeId: c.vesselTypeId,
      extraWidth: c.extraWidth,
      extraValue: c.extraValue,
      brackets: c.brackets.map((b) => ({ upperLimit: b.upperLimit, value: b.value })),
    }))
  }
  static identify(
    configurations: readonly import('../../../shared/contracts/tariffs').TariffConfigurationInput[],
  ): TariffConfigurationDto[] {
    return configurations.map((c) => ({
      ...c,
      id: randomUUID(),
      brackets: c.brackets.map((b) => ({ ...b, id: randomUUID() })),
    }))
  }
}
