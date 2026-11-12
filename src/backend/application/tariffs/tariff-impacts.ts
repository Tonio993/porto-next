import type { TariffDto } from '../../../shared/contracts/tariffs'
import type { DatabaseSession } from '../../infrastructure/database/database-session'
import { foreignReferences } from '../../infrastructure/database/port-references'

/** P10 adds interval-aware analysis and atomic recalculation of its real charges here.
 * Until then, unknown external dependencies are blocked rather than silently made stale.
 */
export function tariffInsertionBlockers(database: DatabaseSession, previous: TariffDto | null) {
  if (!previous) return []
  const reference = { kind: 'TARIFF' as const, id: previous.id, label: 'Tariffa precedente' }
  const owned = ['tariff_configurations', 'tariff_brackets']
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
