import type { BaseCalculationDto } from '../../../shared/contracts/tariffs'
import { formatNumeric, formatMoney } from '../api/numeric-input'
import { useNumericFormat } from '../api/use-numeric-preference'

/** Presentation uses typed operands; saved textual steps remain original evidence. */
export function CalculationNumbers({ value: v }: { value: BaseCalculationDto }) {
  const format = useNumericFormat()
  return (
    <>
      <p>
        Limite {formatNumeric(v.upperLimit, format)} · Valore ordinario{' '}
        {formatNumeric(v.ordinaryValue, format)} EUR · Ampiezza extra{' '}
        {formatNumeric(v.extraWidth, format)} · Extra {formatNumeric(v.extraCount, format)} ×{' '}
        {formatNumeric(v.extraValue, format)} EUR
      </p>
      <p>
        Valore tariffario {formatNumeric(v.tariffValue, format)} EUR × Peso{' '}
        {formatNumeric(v.weight, format)} = Base {formatMoney(v.base, format)}
      </p>
      <details>
        <summary>Traccia originale salvata</summary>
        <ol>
          {v.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </details>
    </>
  )
}
