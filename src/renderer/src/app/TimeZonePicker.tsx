import { useEffect, useMemo, useState } from 'react'
import { availableTimeZones, countryTimeZones, geographicZone } from '../../../shared/time-zones'
import type { PickerOption } from '../api/use-paged-picker'
import { PagedPicker } from './PagedPicker'

export function staticZoneOptions(zones: readonly string[], search: string): PickerOption[] {
  const terms = search.trim().toLowerCase().split(/\s+/)
  return zones
    .filter((zone) => terms.every((term) => zone.toLowerCase().includes(term)))
    .map((zone) => ({ value: zone, label: zone, disabled: false }))
}

export function TimeZonePicker({
  label,
  value,
  country,
  onChange,
  disabled,
  error,
}: {
  label: string
  value: string
  country?: string
  onChange: (zone: string) => void
  disabled?: boolean
  error?: string
}) {
  const [search, setSearch] = useState('')
  useEffect(() => setSearch(''), [country])
  const zones = useMemo(
    () => (country === undefined ? availableTimeZones() : countryTimeZones(country)),
    [country],
  )
  const chosen = value
    ? {
        value,
        label: value,
        disabled: !zones.some((z) => geographicZone(z) === geographicZone(value)),
      }
    : null
  return (
    <>
      <PagedPicker
        label={label}
        placeholder="Cerca e scegli un fuso"
        required
        value={value || null}
        search={search}
        data={staticZoneOptions(zones, search)}
        chosen={chosen}
        selectedState={chosen ? 'ready' : 'empty'}
        page={null}
        loading={false}
        error={error ?? null}
        disabled={disabled || zones.length === 0}
        onChange={(zone) => {
          if (zone && zones.includes(zone)) {
            onChange(zone)
            setSearch('')
          }
        }}
        onSearchChange={setSearch}
        onPage={() => {}}
      />
      {country !== undefined && (
        <p>
          {zones.length === 0
            ? 'Nessun fuso supportato associato a questo paese nel dataset offline. Creazione non disponibile.'
            : zones.length > 1
              ? 'Il paese ha più fusi: scegli quello del porto.'
              : 'Un solo fuso disponibile per questo paese.'}
        </p>
      )}
      {zones.length > 0 && staticZoneOptions(zones, search).length === 0 && (
        <p role="status">Nessun fuso corrisponde alla ricerca.</p>
      )}
    </>
  )
}
