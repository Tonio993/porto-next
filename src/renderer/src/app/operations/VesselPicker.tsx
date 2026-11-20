import { useEffect, useState } from 'react'
import { Select, TextInput } from '@mantine/core'
import type { ArchiveContextDto } from '../../../../shared/contracts/application'
import type { PageDto } from '../../../../shared/contracts/master-data'
import type { VesselDto } from '../../../../shared/contracts/vessels'
import { useApplicationRequest } from '../../api/use-application-request'
import { PageControls } from '../PageControls'

export function VesselPicker({
  context,
  value,
  onChange,
  disabled,
  retainedId,
}: {
  context: ArchiveContextDto
  value: string | null
  onChange: (id: string | null) => void
  disabled?: boolean
  retainedId?: string
}) {
  const [search, setSearch] = useState(''),
    [page, setPage] = useState(1),
    [list, setList] = useState<PageDto<VesselDto> | null>(null)
  const [chosen, setChosen] = useState<{ value: string; label: string } | null>(null),
    [error, setError] = useState<string | null>(null)
  const { request, invalidate, loading } = useApplicationRequest(context, setError)
  useEffect(() => {
    void request(() =>
      window.vessels.list({
        context: { sessionId: context.sessionId },
        query: { search, page, pageSize: 25, selectableOnly: false },
      }),
    ).then((r) => {
      if (r?.ok) setList(r.value)
    })
  }, [request, context.sessionId, context.revision, search, page])
  const { request: readChosen, invalidate: invalidateChosen } = useApplicationRequest(
    context,
    setError,
  )
  useEffect(() => {
    invalidateChosen()
    setChosen(null)
    if (value)
      void readChosen(() =>
        window.vessels.get({ context: { sessionId: context.sessionId }, query: { id: value } }),
      ).then((r) => {
        if (r?.ok)
          setChosen({
            value: r.value.id,
            label:
              r.value.code +
              ' · ' +
              r.value.version.registeredName +
              (r.value.selectable ? '' : ' · Disattivata'),
          })
      })
  }, [readChosen, invalidateChosen, context.sessionId, context.revision, value])
  const options =
    list?.items.map((v) => ({
      value: v.id,
      ...(retainedId !== undefined ? { disabled: !v.selectable && v.id !== retainedId } : {}),
      label: `${v.code} · ${v.version.registeredName}${v.selectable ? '' : ' · Disattivata'}`,
    })) ?? []
  if (chosen?.value === value && !options.some((o) => o.value === value)) options.unshift(chosen)
  return (
    <>
      <div className="tariff-port-picker">
        <TextInput
          label="Cerca nave"
          value={search}
          disabled={disabled}
          onChange={(e) => {
            invalidate()
            setList(null)
            setSearch(e.currentTarget.value)
            setPage(1)
          }}
        />
        <Select
          label="Nave"
          placeholder={loading ? 'Caricamento…' : 'Seleziona una nave'}
          data={options}
          value={value}
          disabled={disabled || loading}
          error={error}
          allowDeselect={false}
          onChange={(id) => {
            setChosen(options.find((o) => o.value === id) ?? null)
            onChange(id)
          }}
        />
      </div>
      {list && list.total > 25 && (
        <PageControls
          page={list}
          disabled={disabled || loading}
          onPage={(n) => {
            invalidate()
            setPage(n)
          }}
        />
      )}
    </>
  )
}
