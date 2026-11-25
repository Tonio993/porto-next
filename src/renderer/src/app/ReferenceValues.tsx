import type { ScalarReferenceDto } from '../../../shared/contracts/descriptive-references'
import type { BaseCalculationDto } from '../../../shared/contracts/tariffs'
import {
  italianNumericFormat,
  type NumericFormat,
} from '../../../shared/contracts/numeric-preference'
import { entityLabels, vesselTypeLabels } from '../../../shared/description-labels'
import { formatHistoricalMoment, formatUtcInstant } from '../api/date-display'
import { useNumericFormat } from '../api/use-numeric-preference'
import { formatNumeric } from '../api/numeric-input'

export function referenceText(
  value: ScalarReferenceDto | undefined,
  format: NumericFormat = italianNumericFormat,
): string {
  if (value === undefined || value === null) return 'Riferimento non disponibile'
  if (typeof value === 'string') return value
  if ('subject' in value)
    return (
      value.businessName +
      ' · ' +
      referenceText(value.version, format) +
      ' · Fonte: ' +
      referenceText(value.origin, format)
    )
  if ('configuration' in value)
    return (
      vesselTypeLabels[value.vesselTypeId] +
      (value.upperLimit !== undefined
        ? ' · Scaglione fino a ' +
          formatNumeric(value.upperLimit, format) +
          ' incluso · ' +
          formatNumeric(value.value!, format) +
          ' EUR'
        : ' · Configurazione tariffaria') +
      ' · ' +
      referenceText(value.tariff, format)
    )
  if ('effectiveFrom' in value)
    return (
      entityLabels[value.kind] +
      ' · ' +
      value.name +
      ' · ' +
      (value.effectiveFrom === null
        ? 'Versione iniziale'
        : 'dal ' +
          (value.effectiveMoment
            ? formatHistoricalMoment(value.effectiveMoment) + ' · ' + value.effectiveMoment.zoneId
            : formatUtcInstant(value.effectiveFrom))) +
      ' · ' +
      (value.effectiveTo
        ? 'fino al ' + formatUtcInstant(value.effectiveTo) + ' (escluso)'
        : 'senza fine')
    )
  if ('opening' in value)
    return (
      value.name +
      ' · Apertura: ' +
      referenceText(value.opening) +
      ' · Chiusura: ' +
      (value.closing ? referenceText(value.closing) : 'Aperta')
    )
  return value.name + ' · ' + formatHistoricalMoment(value.moment) + ' · ' + value.moment.zoneId
}
export function ReferenceValue({ value }: { value: Parameters<typeof referenceText>[0] }) {
  const format = useNumericFormat()
  return <span>{referenceText(value, format)}</span>
}
export function CalculationReferences({ value: v }: { value: BaseCalculationDto }) {
  const format = useNumericFormat()
  return (
    <dl>
      <dt>Versione nave</dt>
      <dd>
        <ReferenceValue value={v.references?.vessel} />
      </dd>
      <dt>Attività</dt>
      <dd>{v.references?.activity ?? 'Riferimento non disponibile'}</dd>
      <dt>Tariffa</dt>
      <dd>
        <ReferenceValue value={v.references?.tariff} />
      </dd>
      <dt>Configurazione</dt>
      <dd>
        {vesselTypeLabels[v.vesselTypeId]} · dimensione {formatNumeric(v.size, format)}
      </dd>
      <dt>Scaglione</dt>
      <dd>
        Fino a {formatNumeric(v.upperLimit, format)} incluso ·{' '}
        {formatNumeric(v.ordinaryValue, format)} EUR
      </dd>
      <dt>Peso applicato</dt>
      <dd>
        <ReferenceValue value={v.references?.weight} /> · valore {formatNumeric(v.weight, format)}
      </dd>
    </dl>
  )
}
