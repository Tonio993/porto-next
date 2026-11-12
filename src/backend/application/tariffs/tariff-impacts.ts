import type { TariffDto } from '../../../shared/contracts/tariffs'
import type { DatabaseSession } from '../../infrastructure/database/database-session'
import { foreignReferences } from '../../infrastructure/database/port-references'

/** Known charges are recalculated by interval; unknown FK dependencies remain blockers. */
export function tariffInsertionBlockers(database: DatabaseSession, previous: TariffDto | null) {
  if (!previous) return []
  const reference = { kind: 'TARIFF' as const, id: previous.id, label: 'Tariffa precedente' }
  const owned = ['tariff_configurations', 'tariff_brackets', 'operation_charges']
  return [
    ...foreignReferences(
      database,
      reference,
      'tariffs',
      'tariff_configurations',
      previous.configurations.map((c) => c.id),
      owned,
    ),
    ...foreignReferences(
      database,
      reference,
      null,
      'tariff_brackets',
      previous.configurations.flatMap((c) => c.brackets.map((b) => b.id)),
      owned,
    ),
  ]
}
