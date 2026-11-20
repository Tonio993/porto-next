import type { BaseCalculationDto, TariffActivity } from '../../../shared/contracts/tariffs'
import type { ResolvedMomentDto } from '../../../shared/contracts/values'
import { calculateBracket } from '../../domain/tariffs/base-calculator'
import { WeightRepository } from '../../infrastructure/database/weight-repository'
import type { WeightVersionDto } from '../../../shared/contracts/catalog'
import { TariffRepository } from '../../infrastructure/database/tariff-repository'
import { VesselRepository } from '../../infrastructure/database/vessel-repository'
import type { DatabaseSession } from '../../infrastructure/database/database-session'
import type { VesselVersionDto } from '../../../shared/contracts/vessels'
import type { TariffDto } from '../../../shared/contracts/tariffs'

/** Synchronous, read-only; future activity commands call this inside their own transaction.
 * The caller owns context, selectability, economic port/moment and persistence of this trace.
 */
export function calculateBase(
  database: DatabaseSession,
  input: { portId: string; vesselId: string; moment: ResolvedMomentDto; activity: TariffActivity },
  simulated: {
    vesselVersion?: VesselVersionDto
    tariff?: TariffDto
    weight?: WeightVersionDto
  } = {},
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
  const weight =
    simulated.weight ?? new WeightRepository(database).at(input.activity, input.moment.utc)
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
