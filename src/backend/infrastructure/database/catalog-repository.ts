import { randomUUID } from 'node:crypto'
import type {
  CatalogListQuery,
  InitialWeightDto,
  OperationType,
  ServiceTypeDto,
} from '../../../shared/contracts/catalog'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { normalizedIdentifier } from '../../domain/values/identifiers'
import type { DatabaseSession } from './database-session'
import { foreignReferences } from './port-references'

interface TypeRow {
  id: string
  description: string
  status: 'ACTIVE' | 'INACTIVE'
  used: number
}
export class CatalogRepository {
  constructor(private readonly database: DatabaseSession) {}
  private get sql() {
    return this.database.sqlite
  }
  get(id: string): ServiceTypeDto {
    const row = this.sql
      .prepare(
        'SELECT id, description, status, has_ever_been_used AS used FROM service_types WHERE id = ?',
      )
      .get(id) as TypeRow | undefined
    if (!row) throw new ArchiveError('NOT_FOUND', 'Il tipo di prestazione non esiste più.')
    return {
      id,
      description: row.description,
      status: row.status,
      hasEverBeenUsed: row.used === 1,
      initialWeight: this.weight('service_type_id', id),
    }
  }
  private weight(column: 'service_type_id' | 'operation_type', id: string): InitialWeightDto {
    const row = this.sql
      .prepare(
        `SELECT w.id, w.sequence_id AS sequenceId, w.effective_from AS effectiveFrom, w.weight FROM weight_versions w JOIN weight_sequences s ON s.id = w.sequence_id WHERE s.${column} = ? AND w.effective_from IS NULL`,
      )
      .get(id) as InitialWeightDto | undefined
    if (!row) throw new ArchiveError('INVALID_ARCHIVE', 'Manca il peso iniziale del tipo.')
    return row
  }
  fixedWeights() {
    return (['ENTRY', 'EXIT', 'MOVEMENT'] as OperationType[]).map((operation) => ({
      operation,
      initialWeight: this.weight('operation_type', operation),
    }))
  }
  list(query: CatalogListQuery) {
    const where = "WHERE (? = 'ALL' OR status = ?) AND instr(normalized_description, ?) > 0"
    const args = [query.status, query.status, normalizedIdentifier(query.search)]
    const total = this.sql
      .prepare(`SELECT count(*) FROM service_types ${where}`)
      .pluck()
      .get(...args) as number
    const rows = this.sql
      .prepare(
        `SELECT id FROM service_types ${where} ORDER BY normalized_description, id LIMIT ? OFFSET ?`,
      )
      .all(...args, query.pageSize, (query.page - 1) * query.pageSize) as { id: string }[]
    return {
      items: rows.map((row) => this.get(row.id)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    }
  }
  assertDescription(description: string, except: string | null = null) {
    const key = normalizedIdentifier(description)
    if (['ENTRATA', 'USCITA', 'SPOSTAMENTO'].includes(key))
      throw new ArchiveError('VALIDATION_ERROR', 'Denominazione riservata alle operazioni fisse.', [
        {
          path: ['description'],
          code: 'RESERVED_DESCRIPTION',
          message: 'Scegli una descrizione diversa da entrata, uscita e spostamento.',
        },
      ])
    if (
      this.sql
        .prepare(
          'SELECT id FROM service_types WHERE normalized_description = ? AND (? IS NULL OR id <> ?)',
        )
        .get(key, except, except)
    )
      throw new ArchiveError(
        'DUPLICATE_IDENTIFIER',
        'Questa descrizione è già presente nel catalogo.',
        [
          {
            path: ['description'],
            code: 'DUPLICATE_IDENTIFIER',
            message: 'Descrizione già presente.',
          },
        ],
      )
  }
  create(description: string, weight: string) {
    this.assertDescription(description)
    const id = randomUUID(),
      sequenceId = randomUUID()
    this.sql
      .prepare("INSERT INTO service_types VALUES (?, ?, ?, 'ACTIVE', 0)")
      .run(id, description, normalizedIdentifier(description))
    this.sql.prepare('INSERT INTO weight_sequences VALUES (?, ?, NULL)').run(sequenceId, id)
    this.sql
      .prepare('INSERT INTO weight_versions VALUES (?, ?, NULL, ?)')
      .run(randomUUID(), sequenceId, weight)
    return this.get(id)
  }
  rename(id: string, description: string) {
    const current = this.get(id)
    this.assertDescription(description, id)
    if (current.description !== description)
      this.sql
        .prepare(
          'UPDATE service_types SET description = ?, normalized_description = ? WHERE id = ?',
        )
        .run(description, normalizedIdentifier(description), id)
  }
  setStatus(id: string, status: 'ACTIVE' | 'INACTIVE') {
    if (this.get(id).status !== status)
      this.sql.prepare('UPDATE service_types SET status = ? WHERE id = ?').run(status, id)
    return this.get(id)
  }
  requireSelectable(id: string) {
    const type = this.get(id)
    if (type.status !== 'ACTIVE')
      throw new ArchiveError('NOT_SELECTABLE', 'Il tipo di prestazione è disattivato.')
    return type
  }
  /** P15 must call this inside the SAME transaction that registers the activity. */
  markUsed(id: string): void {
    if (!this.sql.inTransaction)
      throw new ArchiveError(
        'UNEXPECTED',
        'L’utilizzo va registrato nella transazione della prestazione.',
      )
    this.requireSelectable(id)
    this.sql
      .prepare(
        'UPDATE service_types SET has_ever_been_used = 1 WHERE id = ? AND has_ever_been_used = 0',
      )
      .run(id)
  }
  deleteBlockers(id: string) {
    const type = this.get(id)
    const reference = { kind: 'SERVICE_TYPE' as const, id, label: type.description }
    const owned = ['weight_sequences', 'weight_versions']
    const blockers = foreignReferences(
      this.database,
      reference,
      'service_types',
      'weight_versions',
      [type.initialWeight.id],
      owned,
    )
    blockers.push(
      ...foreignReferences(
        this.database,
        { ...reference, id: type.initialWeight.sequenceId },
        'weight_sequences',
        '',
        [],
        owned,
      ).map((blocker) => ({ ...blocker, reference: { ...blocker.reference, id } })),
    )
    if (type.hasEverBeenUsed)
      blockers.unshift({
        reference,
        reason: 'Il tipo è stato utilizzato almeno una volta e non può essere eliminato.',
      })
    return blockers
  }
  delete(id: string) {
    const blockers = this.deleteBlockers(id)
    if (blockers.length)
      throw new ArchiveError(
        'REFERENCE_IN_USE',
        'Il tipo di prestazione non può essere eliminato.',
        [],
        blockers,
      )
    const type = this.get(id)
    this.sql
      .prepare('DELETE FROM weight_versions WHERE sequence_id = ?')
      .run(type.initialWeight.sequenceId)
    this.sql.prepare('DELETE FROM weight_sequences WHERE id = ?').run(type.initialWeight.sequenceId)
    this.sql.prepare('DELETE FROM service_types WHERE id = ?').run(id)
  }
}
