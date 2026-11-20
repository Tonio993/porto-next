import type {
  OperationType,
  WeightOwnerDto,
  WeightVersionDto,
} from '../../../shared/contracts/catalog'
import { operationLabels } from '../../../shared/contracts/catalog'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { versionSequence } from '../../domain/ports/version-sequence'
import type { DatabaseSession } from './database-session'
import { momentFromColumns } from './moment-storage'
import { foreignReferences } from './port-references'

type Row = {
  id: string
  sequenceId: string
  weight: string
  effectiveFrom: string | null
  local_date_time: string | null
  zone_id: string | null
  utc_offset: string | null
}
export class WeightRepository {
  constructor(
    private readonly database: DatabaseSession,
    private readonly observedAt = new Date().toISOString(),
  ) {}
  owner(sequenceId: string): { owner: WeightOwnerDto; label: string } {
    const row = this.database.sqlite
      .prepare(
        'SELECT operation_type AS operation,service_type_id AS serviceTypeId FROM weight_sequences WHERE id=?',
      )
      .get(sequenceId) as
      { operation: OperationType | null; serviceTypeId: string | null } | undefined
    if (!row) throw new ArchiveError('NOT_FOUND', 'La sequenza dei pesi non esiste più.')
    if (row.operation)
      return {
        owner: { kind: 'OPERATION', operation: row.operation },
        label: operationLabels[row.operation],
      }
    const label = this.database.sqlite
      .prepare('SELECT description FROM service_types WHERE id=?')
      .pluck()
      .get(row.serviceTypeId) as string
    return { owner: { kind: 'CATALOG', serviceTypeId: row.serviceTypeId! }, label }
  }
  versions(sequenceId: string): WeightVersionDto[] {
    this.owner(sequenceId)
    const rows = this.database.sqlite
      .prepare(
        'SELECT id,sequence_id AS sequenceId,weight,effective_from AS effectiveFrom,effective_local_date_time AS local_date_time,effective_zone_id AS zone_id,effective_utc_offset AS utc_offset FROM weight_versions WHERE sequence_id=? ORDER BY effective_from',
      )
      .all(sequenceId) as Row[]
    return versionSequence(
      rows.map((row) => ({
        id: row.id,
        sequenceId: row.sequenceId,
        weight: row.weight,
        effectiveFrom: row.effectiveFrom,
        effectiveMoment:
          row.effectiveFrom === null ? null : momentFromColumns({ ...row, utc: row.effectiveFrom }),
        effectiveTo: null,
        phase: 'CURRENT' as const,
      })),
      this.observedAt,
    )
  }
  get(sequenceId: string, versionId: string) {
    const version = this.versions(sequenceId).find((v) => v.id === versionId)
    if (!version)
      throw new ArchiveError('NOT_FOUND', 'La versione del peso non esiste più in questa sequenza.')
    return version
  }
  at(owner: WeightOwnerDto, utc: string) {
    const row = this.database.sqlite
      .prepare(
        'SELECT id FROM weight_sequences WHERE ' +
          (owner.kind === 'OPERATION' ? 'operation_type' : 'service_type_id') +
          '=?',
      )
      .get(owner.kind === 'OPERATION' ? owner.operation : owner.serviceTypeId) as
      { id: string } | undefined
    if (!row) throw new ArchiveError('INVALID_ARCHIVE', 'Manca la sequenza dei pesi dell’attività.')
    const version = this.versions(row.id).find(
      (v) =>
        (!v.effectiveFrom || v.effectiveFrom <= utc) && (!v.effectiveTo || utc < v.effectiveTo),
    )
    if (!version) throw new ArchiveError('INVALID_ARCHIVE', 'Manca il peso applicabile.')
    return version
  }
  save(version: WeightVersionDto, insert: boolean) {
    const m = version.effectiveMoment
    const values = [
      version.sequenceId,
      version.weight,
      version.effectiveFrom,
      m?.localDateTime ?? null,
      m?.zoneId ?? null,
      m?.offset ?? null,
      version.id,
    ]
    this.database.sqlite
      .prepare(
        insert
          ? 'INSERT INTO weight_versions (sequence_id,weight,effective_from,effective_local_date_time,effective_zone_id,effective_utc_offset,id) VALUES (?,?,?,?,?,?,?)'
          : 'UPDATE weight_versions SET sequence_id=?,weight=?,effective_from=?,effective_local_date_time=?,effective_zone_id=?,effective_utc_offset=? WHERE id=?',
      )
      .run(...values)
  }
  remove(versionId: string) {
    this.database.sqlite.prepare('DELETE FROM weight_versions WHERE id=?').run(versionId)
  }
  blockers(versionIds: readonly string[]) {
    return versionIds.flatMap((id) =>
      foreignReferences(
        this.database,
        { kind: 'WEIGHT_VERSION', id, label: 'Versione peso' },
        null,
        'weight_versions',
        [id],
        ['operation_charges', 'service_activities'],
      ),
    )
  }
}
