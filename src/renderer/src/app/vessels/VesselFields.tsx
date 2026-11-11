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
  size: string
}

export const emptyVesselForm: VesselFormValue = {
  registeredName: '',
  imoNumber: '',
  vesselTypeId: null,
  size: '',
}

export function vesselForm(description: VesselDescriptionDto): VesselFormValue {
  return {
    registeredName: description.registeredName,
    imoNumber: description.imoNumber ?? '',
    vesselTypeId: description.vesselTypeId,
    size: String(description.size),
  }
}

export function vesselFormInput(value: VesselFormValue): VesselDescriptionDto | null {
  const size = value.size.trim()
  if (!value.vesselTypeId || !/^[0-9]+$/.test(size) || !Number.isSafeInteger(Number(size)))
    return null
  return {
    registeredName: value.registeredName,
    imoNumber: value.imoNumber.trim() || null,
    vesselTypeId: value.vesselTypeId,
    size: Number(size),
  }
}

export function vesselSummary(value: VesselDescriptionDto): string {
  return `${value.registeredName} · IMO: ${value.imoNumber ?? 'assente'} · ${vesselTypes.find(({ id }) => id === value.vesselTypeId)!.label} · Dimensione: ${value.size}`
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
      <TextInput
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
