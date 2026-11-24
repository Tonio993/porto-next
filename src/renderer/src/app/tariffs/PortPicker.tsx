import type { ConsultationPicker } from '../../api/use-consultation-state'
import { useEffect, useState } from 'react'
import { Select, Stack, TextInput } from '@mantine/core'
import type { ArchiveContextDto } from '../../../../shared/contracts/application'
import type { PortPageDto } from '../../../../shared/contracts/ports'
import { useApplicationRequest } from '../../api/use-application-request'
import { PageControls } from '../PageControls'

export function PortPicker({
  context,
  value,
  onChange,
  disabled,
  label = 'Porto',
  retainedId,
  consultation,
  onMissing,
}: {
  context: ArchiveContextDto
  value: string | null
  onChange: (id: string | null) => void
  disabled?: boolean
  label?: string
  consultation?: ConsultationPicker
  onMissing?: () => void
  retainedId?: string
}) {
  const [localSearch, setLocalSearch] = useState('')
  const [localPage, setLocalPage] = useState(1)
  const { search, setSearch, page, setPage } = consultation ?? {
    search: localSearch,
    setSearch: setLocalSearch,
    page: localPage,
    setPage: setLocalPage,
  }
  const [list, setList] = useState<PortPageDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { request, invalidate, loading } = useApplicationRequest(context, setError)
  const [chosen, setChosen] = useState<{ value: string; label: string } | null>(null)
  const { request: readChosen, invalidate: invalidateChosen } = useApplicationRequest(
    context,
    setError,
  )
  useEffect(() => {
    if (!value) return
    void readChosen(() =>
      window.ports.get({ context: { sessionId: context.sessionId }, query: { id: value } }),
    ).then((r) => {
      if (r?.ok)
        setChosen({
          value: r.value.id,
          label: `${r.value.code} · ${r.value.version.name}${r.value.status === 'INACTIVE' ? ' · Disattivato' : ''}`,
        })
      else if (r && !r.ok && r.error.code === 'NOT_FOUND') onMissing?.()
    })
    return invalidateChosen
  }, [readChosen, invalidateChosen, value, context.sessionId, context.revision])
  const options =
    list?.items.map((p) => ({
      value: p.id,
      ...(retainedId !== undefined
        ? { disabled: p.status !== 'ACTIVE' && p.id !== retainedId }
        : {}),
      label: `${p.code} · ${p.version.name}${p.status === 'INACTIVE' ? ' · Disattivato' : ''}`,
    })) ?? []
  if (chosen?.value === value && !options.some((o) => o.value === value)) options.unshift(chosen)
  useEffect(() => {
    void request(() =>
      window.ports.list({
        context: { sessionId: context.sessionId },
        query: { search, page, pageSize: 25 },
      }),
    ).then((r) => {
      if (r?.ok && (!consultation || consultation.current())) {
        setList(r.value)
        const last = Math.max(1, Math.ceil(r.value.total / 25))
        if (page > last) setPage(last)
      }
    })
    return invalidate
  }, [request, invalidate, context.sessionId, context.revision, search, page])
  return (
    <Stack gap="xs">
      <div className="tariff-port-picker">
        <TextInput
          label={`Cerca ${label.toLowerCase()}`}
          value={search}
          disabled={disabled}
          onChange={(e) => {
            invalidate()
            setSearch(e.currentTarget.value)
            setPage(1)
            setList(null)
          }}
        />
        <Select
          label={label}
          placeholder={loading ? 'Caricamento…' : 'Seleziona un porto'}
          value={value}
          data={options}
          onChange={(id) => {
            invalidateChosen()
            setChosen(options.find((o) => o.value === id) ?? null)
            onChange(id)
          }}
          disabled={disabled || loading}
          error={error}
          allowDeselect={false}
        />
      </div>
      {list && list.total > 25 && (
        <PageControls
          page={list}
          disabled={disabled || loading}
          onPage={(next) => {
            invalidate()
            setPage(next)
          }}
        />
      )}
    </Stack>
  )
}
