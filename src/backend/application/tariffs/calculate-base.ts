import type { BaseCalculationDto, TariffActivity } from '../../../shared/contracts/tariffs'
import type { ResolvedMomentDto } from '../../../shared/contracts/values'
import { calculateBracket } from '../../domain/tariffs/base-calculator'
import { CatalogRepository } from '../../infrastructure/database/catalog-repository'
import { TariffRepository } from '../../infrastructure/database/tariff-repository'
import { VesselRepository } from '../../infrastructure/database/vessel-repository'
import type { DatabaseSession } from '../../infrastructure/database/database-session'
import { ArchiveError } from '../../../shared/errors/archive-error'
import type { VesselVersionDto } from '../../../shared/contracts/vessels'
import type { TariffDto } from '../../../shared/contracts/tariffs'

/** Synchronous, read-only; future activity commands call this inside their own transaction.
 * The caller owns context, selectability, economic port/moment and persistence of this trace.
 */
export function calculateBase(
  database: DatabaseSession,
  input: { portId: string; vesselId: string; moment: ResolvedMomentDto; activity: TariffActivity },
  simulated: { vesselVersion?: VesselVersionDto; tariff?: TariffDto } = {},
): BaseCalculationDto {
  const vessel =
    simulated.vesselVersion ??
    new VesselRepository(database, new Date().toISOString()).versionAt(
      input.vesselId,
      input.moment.utc,
    )
  const tariff =
    simulated.tariff ?? new TariffRepository(database).at(input.portId, input.moment.utc)
  const configuration = tariff.configurations.find((c) => c.vesselTypeId === vessel.vesselTypeId)!
  const catalog = new CatalogRepository(database)
  const activity = input.activity
  const weight =
    activity.kind === 'OPERATION'
      ? catalog.fixedWeights().find((w) => w.operation === activity.operation)!.initialWeight
      : catalog.get(activity.serviceTypeId).initialWeight
  // P19 replaces the initial-only weight resolver when dated weights are introduced.
  if (!weight) throw new ArchiveError('INVALID_ARCHIVE', 'Manca il peso applicabile.')
  const result = calculateBracket(configuration, vessel.size, weight.weight)
  const bracket = configuration.brackets[result.bracketIndex]
  return {
    ...input,
    vesselVersionId: vessel.id,
    vesselName: vessel.registeredName,
    vesselTypeId: vessel.vesselTypeId,
    size: vessel.size,
    tariffId: tariff.id,
    tariffEffectiveFrom: tariff.effectiveFrom!,
    configurationId: configuration.id,
    bracketId: bracket.id,
    upperLimit: bracket.upperLimit,
    ordinaryValue: bracket.value,
    extraWidth: configuration.extraWidth,
    extraValue: configuration.extraValue,
    extraCount: result.extraCount,
    tariffValue: result.tariffValue,
    weightSequenceId: weight.sequenceId,
    weightVersionId: weight.id,
    weight: weight.weight,
    base: result.base,
    steps: [
      `Dimensione ${vessel.size}: limite ordinario incluso ${bracket.upperLimit}, valore ${bracket.value} EUR.`,
      `Extra: ${result.extraCount} × ${configuration.extraValue} EUR (ampiezza ${configuration.extraWidth}).`,
      `Valore tariffario: arrotondamento commerciale di ${bracket.value} + ${result.extraCount} × ${configuration.extraValue} = ${result.tariffValue} EUR.`,
      `Base: ${result.tariffValue} × ${weight.weight} = ${result.base} EUR, arrotondamento commerciale a due decimali.`,
    ],
  }
}
