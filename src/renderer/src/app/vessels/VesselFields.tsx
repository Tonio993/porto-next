import { ExactNumericInput } from '../ExactNumericInput'
import { integerInput, formatNumeric } from '../../api/numeric-input'
import {
  italianNumericFormat,
  type NumericFormat,
} from '../../../../shared/contracts/numeric-preference'
import { Select, Stack, TextInput } from '@mantine/core'
import {
  vesselTypes,
  type VesselTypeId,
  type VesselDescriptionDto,
} from '../../../../shared/contracts/vessels'

export interface VesselFormValue {
  registeredName: string
  imoNumber: string
  vesselTypeId: VesselTypeId | null
  numericFormat: NumericFormat
  size: string
}

export const emptyVesselForm: VesselFormValue = {
  numericFormat: { ...italianNumericFormat },
  registeredName: '',
  imoNumber: '',
  vesselTypeId: null,
  size: '',
}

export function vesselForm(
  description: VesselDescriptionDto,
  numericFormat: NumericFormat,
): VesselFormValue {
  return {
    numericFormat: { ...numericFormat },
    registeredName: description.registeredName,
    imoNumber: description.imoNumber ?? '',
    vesselTypeId: description.vesselTypeId,
    size: String(description.size),
  }
}

export function vesselFormInput(value: VesselFormValue): VesselDescriptionDto | null {
  const size = integerInput(value.size)
  if (!value.vesselTypeId || size === null) return null
  return {
    registeredName: value.registeredName,
    imoNumber: value.imoNumber.trim() || null,
    vesselTypeId: value.vesselTypeId,
    size,
  }
}

export function vesselSummary(value: VesselDescriptionDto, format: NumericFormat): string {
  return `${value.registeredName} · ${vesselDetails(value, format)}`
}

export function vesselDetails(value: VesselDescriptionDto, format: NumericFormat): string {
  return `IMO: ${value.imoNumber ?? 'assente'} · ${vesselTypes.find(({ id }) => id === value.vesselTypeId)!.label} · Dimensione: ${formatNumeric(value.size, format)}`
}

export function VesselFields({
  value,
  onChange,
  fields,
  disabled,
}: {
  value: VesselFormValue
  onChange: (value: VesselFormValue) => void
  fields: Record<string, string>
  disabled: boolean
}) {
  return (
    <Stack gap="sm">
      <TextInput
        label="Nome di registrazione"
        data-autofocus
        required
        disabled={disabled}
        value={value.registeredName}
        error={fields.registeredName}
        onChange={(event) => onChange({ ...value, registeredName: event.currentTarget.value })}
      />
      <TextInput
        label="IMO"
        description="Facoltativo, conservato come testo."
        disabled={disabled}
        value={value.imoNumber}
        error={fields.imoNumber}
        onChange={(event) => onChange({ ...value, imoNumber: event.currentTarget.value })}
      />
      <Select
        label="Tipologia"
        required
        disabled={disabled}
        value={value.vesselTypeId}
        data={vesselTypes.map(({ id, label }) => ({ value: id, label }))}
        error={fields.vesselTypeId}
        onChange={(type) => onChange({ ...value, vesselTypeId: type as VesselTypeId | null })}
      />
      <ExactNumericInput
        integer
        format={value.numericFormat}
        label="Dimensione"
        description="Intero non negativo, senza unità di misura."
        required
        inputMode="numeric"
        disabled={disabled}
        value={value.size}
        error={fields.size}
        onChange={(event) => onChange({ ...value, size: event.currentTarget.value })}
      />
    </Stack>
  )
}
