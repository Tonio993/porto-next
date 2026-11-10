import { Select, TextInput } from '@mantine/core'
import type { PortDescriptionDto } from '../../../../shared/contracts/ports'
import { countryCodes } from '../../../../shared/contracts/countries'
const names = new Intl.DisplayNames(['it'], { type: 'region' })
export const countryName = (code: string) => names.of(code) ?? code
const countries = countryCodes
  .map((value) => ({ value, label: `${countryName(value)} (${value})` }))
  .sort((a, b) => a.label.localeCompare(b.label, 'it'))
export function PortDescriptionFields({
  value,
  onChange,
  disabled,
  fields,
}: {
  value: PortDescriptionDto
  onChange: (value: PortDescriptionDto) => void
  disabled: boolean
  fields: Record<string, string>
}) {
  return (
    <>
      <TextInput
        label="Nome del porto"
        required
        disabled={disabled}
        value={value.name}
        error={fields.name}
        onChange={(event) => onChange({ ...value, name: event.currentTarget.value })}
      />
      <TextInput
        label="Località"
        required
        disabled={disabled}
        value={value.locality}
        error={fields.locality}
        onChange={(event) => onChange({ ...value, locality: event.currentTarget.value })}
      />
      <Select
        label="Paese"
        searchable
        required
        disabled={disabled}
        data={countries}
        value={value.countryCode}
        error={fields.countryCode}
        onChange={(countryCode) => onChange({ ...value, countryCode: countryCode ?? '' })}
      />
    </>
  )
}
