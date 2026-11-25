import { describeEffects } from '../presentation/effect-descriptions'
import { ReadDescriptions } from '../presentation/read-descriptions'
import type {
  AssignmentApi,
  AssignmentChangeDto,
  AssignmentTarget,
  AssignmentPreviewDto,
} from '../../../shared/contracts/assignments'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { AssignmentRepository } from '../../infrastructure/database/assignment-repository'
import { CustomerRepository } from '../../infrastructure/database/customer-repository'
import { AgencyRepository } from '../../infrastructure/database/agency-repository'
import type { ArchiveApplicationSession, ArchiveCoordinator } from '../archives/archive-coordinator'
import { record } from '../archives/context-validation'
import { entityId, pagination } from '../ports/port-input'
import { subjectEffects, subjectPlan } from './subject-resolution'

const namespace = 'SUBJECT_ASSIGNMENT'
function target(value: unknown): AssignmentTarget {
  const i = record(value, ['kind', 'id'])
  if (
    typeof i.kind !== 'string' ||
    !['VOYAGE', 'PORT_CALL', 'BERTH_STAY', 'VESSEL_OPERATION'].includes(i.kind)
  )
    throw new ArchiveError('VALIDATION_ERROR', 'Livello di assegnazione non valido.')
  return { kind: i.kind as AssignmentTarget['kind'], id: entityId(i.id, 'id') }
}
export class AssignmentService implements AssignmentApi {
  constructor(private readonly coordinator: ArchiveCoordinator) {}
  get: AssignmentApi['get'] = (request) =>
    this.coordinator.query(request, (s, q) => {
      const t = target(q)
      new AssignmentRepository(s.database).specified(t)
      return new ReadDescriptions(s.database).assignment(subjectPlan(s.database).values(t))
    })
  private analyse(s: ArchiveApplicationSession, change: AssignmentChangeDto) {
    const repository = new AssignmentRepository(s.database),
      before = repository.specified(change.target),
      now = new Date().toISOString()
    for (const kind of ['customer', 'agency'] as const) {
      const field = kind === 'customer' ? 'customerId' : 'agencyId',
        id = change.specified[field]
      if (id && id !== before[field]) {
        try {
          if (kind === 'customer') new CustomerRepository(s.database, now).requireSelectable(id)
          else new AgencyRepository(s.database, now).requireSelectable(id)
        } catch (error) {
          if (error instanceof ArchiveError)
            throw new ArchiveError(error.code, error.message, [
              { path: ['specified', field], code: error.code, message: error.message },
            ])
          throw error
        }
      }
    }
    const plan = subjectPlan(s.database, { assignment: change })
    const effects = [
      ...subjectEffects(
        { ...change.target, label: 'Assegnazione' },
        before,
        change.specified,
        s.database,
      ),
      ...plan.effects,
    ]
    return { repository, plan, effects }
  }
  preview: AssignmentApi['preview'] = (request) =>
    this.coordinator.command(request, (s, p): AssignmentPreviewDto => {
      const i = record(p, ['target', 'specified']),
        v = record(i.specified, ['customerId', 'agencyId'])
      const change: AssignmentChangeDto = {
        target: target(i.target),
        specified: {
          customerId: v.customerId === null ? null : entityId(v.customerId, 'customerId'),
          agencyId: v.agencyId === null ? null : entityId(v.agencyId, 'agencyId'),
        },
      }
      const { plan, effects } = this.analyse(s, change)
      return {
        ...s.previews.put(namespace, s.context(), change),
        operation: namespace,
        context: s.context(),
        status: 'READY',
        summary: {
          created: 0,
          updated: effects.length,
          deleted: 0,
          recalculated: 0,
          reattributed: plan.updates.length,
        },
        effects: {
          items: describeEffects(s.database, effects.slice(0, 50)),
          total: effects.length,
          page: 1,
          pageSize: 50,
        },
        blockers: [],
        warnings: [],
        assignment: new ReadDescriptions(s.database).assignment(plan.values(change.target)),
      }
    })
  previewEffects: AssignmentApi['previewEffects'] = (request) =>
    this.coordinator.query(request, (s, q) => {
      const i = record(q, ['previewId', 'page', 'pageSize']),
        p = pagination(i.page, i.pageSize)
      const change = s.previews.get(entityId(i.previewId, 'previewId'), namespace, s.context())
        .input as AssignmentChangeDto
      const { effects } = this.analyse(s, change)
      return {
        items: describeEffects(
          s.database,
          effects.slice((p.page - 1) * p.pageSize, p.page * p.pageSize),
        ),
        total: effects.length,
        ...p,
      }
    })
  confirm: AssignmentApi['confirm'] = (request) => {
    let consumed = ''
    return this.coordinator.command(
      request,
      (s, p) => {
        const id = entityId(record(p, ['previewId']).previewId, 'previewId'),
          change = s.previews.get(id, namespace, s.context()).input as AssignmentChangeDto
        const { repository, plan } = this.analyse(s, change)
        repository.save(change.target, change.specified)
        plan.apply()
        consumed = id
        return new ReadDescriptions(s.database).assignment(plan.values(change.target))
      },
      (s) => s.previews.consume(consumed),
    )
  }
}
