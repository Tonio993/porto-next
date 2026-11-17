import { useEffect, useState } from 'react'
import { Button, Select, SimpleGrid, Stack, TextInput } from '@mantine/core'
import type { ArchiveContextDto } from '../../../../shared/contracts/application'
import type { ServiceListQuery } from '../../../../shared/contracts/services'
import type { PageDto } from '../../../../shared/contracts/master-data'
import type { VoyageDto } from '../../../../shared/contracts/operations'
import { useApplicationRequest } from '../../api/use-application-request'
import { PortPicker } from '../tariffs/PortPicker'
import { BerthPicker } from '../operations/BerthPicker'
import { SubjectPicker } from '../operations/SubjectPicker'
import { CatalogPicker } from './CatalogPicker'
import { PageControls } from '../PageControls'
import { executionLabels } from '../operations/OperationDetail'

export type ServiceFiltersValue = Omit<ServiceListQuery, 'vesselId' | 'page' | 'pageSize'>
export function ServiceFilters({
  context,
  vesselId,
  value,
  onChange,
  disabled,
}: {
  context: ArchiveContextDto
  vesselId: string | null
  value: ServiceFiltersValue
  onChange: (value: ServiceFiltersValue) => void
  disabled: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [page, setPage] = useState(1),
    [voyages, setVoyages] = useState<PageDto<VoyageDto> | null>(null),
    [chosen, setChosen] = useState<VoyageDto | null>(null),
    [error, setError] = useState<string | null>(null)
  const { request, invalidate, loading } = useApplicationRequest(context, setError)
  useEffect(() => {
    if (!vesselId || !expanded) return
    void request(() =>
      window.operations.stays({
        context: { sessionId: context.sessionId },
        query: { vesselId, page, pageSize: 25 },
      }),
    ).then((r) => {
      if (r?.ok) setVoyages(r.value)
    })
  }, [request, context.sessionId, context.revision, vesselId, page, expanded])
  const options = voyages?.items ?? []
  const selected =
    options.find((v) => v.id === value.voyageId) ?? (chosen?.id === value.voyageId ? chosen : null)
  const voyageOptions = [...options]
  if (selected && !options.some((v) => v.id === selected.id)) voyageOptions.unshift(selected)
  const visits = selected?.visits ?? [],
    visit = visits.find((v) => v.id === value.portCallId)
  const activeCount = Object.values(value).filter((v) => v != null && v !== '').length
  return (
    <details
      className="service-filters"
      onToggle={(e) => {
        if (e.currentTarget.open) setExpanded(true)
      }}
    >
      <summary>
        <span>Filtri prestazioni</span>
        <span className="filter-summary">
          {activeCount ? `${activeCount} attivi · combinati` : 'Nessun filtro attivo'}
        </span>
      </summary>
      {expanded && (
        <Stack
          className="service-filter-fields"
          gap="xs"
          role="region"
          aria-label="Filtri combinati"
          tabIndex={0}
        >
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Select
              label="Categoria"
              clearable
              placeholder="Tutte"
              disabled={disabled}
              value={value.category ?? null}
              data={[
                { value: 'FREE', label: 'Libera' },
                { value: 'CATALOG', label: 'Catalogo' },
              ]}
              onChange={(category) =>
                onChange({
                  ...value,
                  category: category as ServiceFiltersValue['category'],
                  serviceTypeId: null,
                })
              }
            />
            <Select
              label="Stato prestazione"
              clearable
              placeholder="Tutti"
              disabled={disabled}
              value={value.executionStatus ?? null}
              data={Object.entries(executionLabels).map(([value, label]) => ({ value, label }))}
              onChange={(executionStatus) =>
                onChange({
                  ...value,
                  executionStatus: executionStatus as ServiceFiltersValue['executionStatus'],
                })
              }
            />
            {(['fromUtc', 'toUtc'] as const).map((key) => (
              <TextInput
                key={key}
                type="datetime-local"
                label={key === 'fromUtc' ? 'Periodo da (UTC, incluso)' : 'Periodo a (UTC, incluso)'}
                disabled={disabled}
                value={value[key]?.slice(0, 16) ?? ''}
                onChange={(e) =>
                  onChange({
                    ...value,
                    [key]: e.currentTarget.value ? e.currentTarget.value + ':00.000Z' : null,
                  })
                }
              />
            ))}
          </SimpleGrid>
          <p>Il periodo usa istanti UTC; gli estremi sono inclusi. Tutti i filtri si combinano.</p>
          {value.category !== 'FREE' && (
            <CatalogPicker
              context={context}
              historical
              value={value.serviceTypeId ?? null}
              disabled={disabled}
              onChange={(serviceTypeId) => onChange({ ...value, serviceTypeId })}
            />
          )}
          <PortPicker
            context={context}
            value={value.portId ?? null}
            disabled={disabled}
            onChange={(portId) => onChange({ ...value, portId, berthId: null })}
          />
          {value.portId && (
            <BerthPicker
              key={value.portId}
              context={context}
              historical
              portId={value.portId}
              value={value.berthId ?? null}
              disabled={disabled}
              onChange={(berthId) => onChange({ ...value, berthId })}
            />
          )}
          <SubjectPicker
            kind="customer"
            historical
            context={context}
            value={value.customerId ?? null}
            disabled={disabled}
            onChange={(customerId) => onChange({ ...value, customerId })}
          />
          <SubjectPicker
            kind="agency"
            historical
            context={context}
            value={value.agencyId ?? null}
            disabled={disabled}
            onChange={(agencyId) => onChange({ ...value, agencyId })}
          />
          {vesselId && (
            <>
              <Select
                label="Viaggio"
                clearable
                placeholder="Tutti i viaggi"
                value={value.voyageId ?? null}
                disabled={disabled || loading}
                data={voyageOptions.map((v) => ({
                  value: v.id,
                  label: v.startedAt + ' → ' + (v.endedAt ?? 'aperto'),
                }))}
                onChange={(voyageId) => {
                  setChosen(voyageOptions.find((v) => v.id === voyageId) ?? null)
                  onChange({ ...value, voyageId, portCallId: null, berthStayId: null })
                }}
              />
              {voyages && voyages.total > 25 && (
                <PageControls
                  page={voyages}
                  disabled={disabled || loading}
                  onPage={(p) => {
                    invalidate()
                    setPage(p)
                  }}
                />
              )}
              {selected && (
                <Select
                  label="Visita"
                  clearable
                  placeholder="Tutte le visite"
                  value={value.portCallId ?? null}
                  disabled={disabled}
                  data={visits.map((v) => ({
                    value: v.id,
                    label: v.portName + ' · ' + v.startedAt,
                  }))}
                  onChange={(portCallId) => onChange({ ...value, portCallId, berthStayId: null })}
                />
              )}
              {visit && (
                <Select
                  label="Ormeggio"
                  clearable
                  placeholder="Tutti gli ormeggi"
                  value={value.berthStayId ?? null}
                  disabled={disabled}
                  data={visit.stays.map((v) => ({
                    value: v.id,
                    label: (v.berthName ?? 'Banchina non specificata') + ' · ' + v.startedAt,
                  }))}
                  onChange={(berthStayId) => onChange({ ...value, berthStayId })}
                />
              )}
            </>
          )}
          {error && <p role="alert">{error}</p>}
          <Button variant="default" disabled={disabled} onClick={() => onChange({})}>
            Azzera filtri
          </Button>
        </Stack>
      )}
    </details>
  )
}
