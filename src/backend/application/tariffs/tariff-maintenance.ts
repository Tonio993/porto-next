import { DescriptiveReferenceRepository } from '../../infrastructure/database/descriptive-reference-repository'
import { describeEffects } from '../presentation/effect-descriptions'
import { randomUUID } from 'node:crypto'
import type { TariffApi, TariffDto, TariffPreviewDto } from '../../../shared/contracts/tariffs'
import type { ChangeEffectDto } from '../../../shared/contracts/master-data'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { resolveMoment } from '../../domain/values/moments'
import { TariffRepository } from '../../infrastructure/database/tariff-repository'
import { PortRepository } from '../../infrastructure/database/port-repository'
import { ArchiveCoordinator, type ArchiveApplicationSession } from '../archives/archive-coordinator'
import { record } from '../archives/context-validation'
import { entityId, pagination } from '../ports/port-input'
import { configurationsInput, momentInput } from './tariff-input'
import { tariffInsertionBlockers } from './tariff-impacts'
import { tariffSequenceImpacts } from '../operations/operation-impacts'

type Change = { before: TariffDto; after: TariffDto | null; blocked: boolean }
type Kind = 'TARIFF_UPDATE' | 'TARIFF_DELETE'
const encode = (value: unknown) =>
  value == null
    ? null
    : typeof value === 'object'
      ? JSON.stringify(value, (_key, v) =>
          v && typeof v === 'object' && !Array.isArray(v)
            ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
            : v,
        )
      : String(value)

export class TariffMaintenance {
  constructor(private readonly coordinator: ArchiveCoordinator) {}
  previewUpdate: TariffApi['previewUpdate'] = (request) =>
    this.coordinator.command(request, (session, payload) => {
      const input = record(payload, ['id', 'moment', 'configurations'])
      const before = new TariffRepository(session.database).get(entityId(input.id, 'id'))
      const m = momentInput(input.moment)
      const historical = before.effectiveMoment
      const resolution =
        m.localDateTime === historical.localDateTime &&
        (m.selectedOffset === null || m.selectedOffset === historical.offset)
          ? { status: 'RESOLVED' as const, moment: historical }
          : resolveMoment(
              m.localDateTime,
              new PortRepository(session.database).get(before.portId).initialZoneId,
              m.selectedOffset,
            )
      if (resolution.status !== 'RESOLVED')
        throw new ArchiveError(
          'LOCAL_TIME_AMBIGUOUS',
          'Scegli esplicitamente l’occorrenza della decorrenza.',
        )
      const configurations = configurationsInput(input.configurations)
        .map((c) => {
          const previous = before.configurations.find((v) => v.vesselTypeId === c.vesselTypeId)!
          return {
            ...c,
            id: previous.id,
            brackets: c.brackets.map((b) => ({
              ...b,
              id:
                previous.brackets.find((old) => old.upperLimit === b.upperLimit)?.id ??
                randomUUID(),
            })),
          }
        })
        .sort((a, b) => a.vesselTypeId.localeCompare(b.vesselTypeId))
      return this.preview(session, 'TARIFF_UPDATE', {
        before,
        after: {
          ...before,
          configurations,
          effectiveFrom: resolution.moment.utc,
          effectiveMoment: resolution.moment,
        },
        blocked: false,
      })
    })
  previewDelete: TariffApi['previewDelete'] = (request) =>
    this.coordinator.command(request, (session, payload) => {
      const before = new TariffRepository(session.database).get(
        entityId(record(payload, ['id']).id, 'id'),
      )
      return this.preview(session, 'TARIFF_DELETE', { before, after: null, blocked: false })
    })
  private preview(session: ArchiveApplicationSession, kind: Kind, change: Change) {
    const analysis = this.analyze(session, change)
    change.blocked = analysis.blockers.length > 0
    const entry = session.previews.put(kind, session.context(), change)
    return this.dto(session, kind, change, entry, 1, 50)
  }
  private analyze(session: ArchiveApplicationSession, change: Change) {
    const now = new Date().toISOString()
    const repository = new TariffRepository(session.database, now)
    const before = repository.sequence(change.before.portId)
    const after = before.filter((t) => t.id !== change.before.id)
    if (change.after) after.push(change.after)
    after.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
    for (let i = 0; i < after.length; i++) {
      if (i && after[i - 1].effectiveFrom === after[i].effectiveFrom)
        throw new ArchiveError(
          'DUPLICATE_IDENTIFIER',
          'Esiste già una tariffa con questa decorrenza nel porto.',
          [
            {
              path: ['moment'],
              code: 'DUPLICATE_START',
              message: 'Scegli una decorrenza diversa.',
            },
          ],
        )
      after[i] = {
        ...after[i],
        effectiveTo: after[i + 1]?.effectiveFrom ?? null,
        phase:
          after[i].effectiveFrom > now
            ? 'FUTURE'
            : after[i + 1] && after[i + 1].effectiveFrom <= now
              ? 'HISTORICAL'
              : 'CURRENT',
      }
    }
    const effects: ChangeEffectDto[] = []
    const affected: TariffDto[] = []
    for (const old of before) {
      const next = after.find((t) => t.id === old.id)
      const changes = ['effectiveFrom', 'effectiveMoment', 'effectiveTo', 'configurations'].flatMap(
        (field) => {
          const a = encode(old[field as keyof TariffDto]),
            b = next ? encode(next[field as keyof TariffDto]) : null
          return a === b ? [] : [{ field, before: a, after: b }]
        },
      )
      if (!changes.length) continue
      affected.push(old)
      effects.push({
        reference: {
          kind: 'TARIFF',
          id: old.id,
          label: 'Tariffa · ' + old.effectiveMoment.localDateTime,
        },
        versionId: null,
        versionReference: {
          kind: 'TARIFF',
          name: new DescriptiveReferenceRepository(session.database, old.effectiveFrom).identity(
            'PORT',
            old.portId,
          ),
          effectiveFrom: (next ?? old).effectiveFrom,
          effectiveTo: (next ?? old).effectiveTo,
          effectiveMoment: (next ?? old).effectiveMoment,
        },
        action: next ? 'UPDATE' : 'DELETE',
        changes,
      })
    }
    const impacts = tariffSequenceImpacts(session.database, (portId, utc) => {
      if (portId !== change.before.portId) return undefined
      const old = before.find(
        (t) => t.effectiveFrom <= utc && (!t.effectiveTo || utc < t.effectiveTo),
      )
      const next = after.find(
        (t) => t.effectiveFrom <= utc && (!t.effectiveTo || utc < t.effectiveTo),
      )
      if (!next) return null
      return old && !affected.some((t) => t.id === old.id) && old.id === next.id ? undefined : next
    })
    effects.push(...impacts.effects)
    const blockers = [
      ...affected.flatMap((t) => tariffInsertionBlockers(session.database, t)),
      ...impacts.blockers,
    ]
    return { repository, effects, blockers, impacts, after }
  }
  private dto(
    session: ArchiveApplicationSession,
    kind: Kind,
    change: Change,
    entry: { previewId: string; generatedAtUtc: string; expiresAtUtc: string },
    page: number,
    pageSize: number,
  ): TariffPreviewDto {
    const { effects, blockers, impacts, after } = this.analyze(session, change)
    return {
      previewId: entry.previewId,
      generatedAtUtc: entry.generatedAtUtc,
      expiresAtUtc: entry.expiresAtUtc,
      operation: kind,
      context: session.context(),
      status: blockers.length || change.blocked ? 'BLOCKED' : 'READY',
      summary: {
        created: 0,
        updated: effects.filter((e) => e.action === 'UPDATE').length,
        deleted: effects.filter((e) => e.action === 'DELETE').length,
        reattributed: 0,
        recalculated: impacts.recalculated,
      },
      effects: {
        items: describeEffects(
          session.database,
          effects.slice((page - 1) * pageSize, page * pageSize),
        ),
        total: effects.length,
        page,
        pageSize,
      },
      blockers,
      warnings: [
        'Le basi FREE e le sostituzioni manuali, incluso zero, restano conservate. I calcoli teorici e i riferimenti vengono aggiornati.',
      ],
      tariff: after.find((t) => t.id === change.before.id) ?? change.before,
    }
  }
  private effects(kind: Kind, request: Parameters<TariffApi['updateEffects']>[0]) {
    return this.coordinator.query(request, (session, query) => {
      const input = record(query, ['previewId', 'page', 'pageSize'])
      const id = entityId(input.previewId, 'previewId'),
        { page, pageSize } = pagination(input.page, input.pageSize)
      const entry = session.previews.get(id, kind, session.context())
      return this.dto(
        session,
        kind,
        entry.input as Change,
        { ...entry, previewId: id },
        page,
        pageSize,
      )
    })
  }
  updateEffects: TariffApi['updateEffects'] = (request) => this.effects('TARIFF_UPDATE', request)
  deletionEffects: TariffApi['deletionEffects'] = (request) =>
    this.effects('TARIFF_DELETE', request)
  private confirm(
    kind: 'TARIFF_UPDATE',
    request: Parameters<TariffApi['confirmUpdate']>[0],
  ): ReturnType<TariffApi['confirmUpdate']>
  private confirm(
    kind: 'TARIFF_DELETE',
    request: Parameters<TariffApi['confirmDelete']>[0],
  ): ReturnType<TariffApi['confirmDelete']>
  private confirm(kind: Kind, request: Parameters<TariffApi['confirmUpdate']>[0]) {
    let consumed = ''
    return this.coordinator.command(
      request,
      (session, payload) => {
        const id = entityId(record(payload, ['previewId']).previewId, 'previewId')
        const change = session.previews.get(id, kind, session.context()).input as Change
        const { repository, effects, blockers, impacts } = this.analyze(session, change)
        if (blockers.length || change.blocked)
          throw new ArchiveError(
            'PREVIEW_BLOCKED',
            'La modifica tariffaria è bloccata. Risolvi i vincoli e genera una nuova anteprima.',
            [],
            blockers,
          )
        if (effects.length) {
          if (change.after) repository.update(change.after)
          impacts.apply()
          repository.retire(change.before, change.after)
        }
        consumed = id
        return kind === 'TARIFF_UPDATE'
          ? repository.get(change.before.id)
          : { id: change.before.id }
      },
      (session) => session.previews.consume(consumed),
    )
  }
  confirmUpdate: TariffApi['confirmUpdate'] = (request) => this.confirm('TARIFF_UPDATE', request)
  confirmDelete: TariffApi['confirmDelete'] = (request) => this.confirm('TARIFF_DELETE', request)
}
