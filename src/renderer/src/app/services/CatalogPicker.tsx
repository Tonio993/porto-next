import { useEffect, useState } from 'react'
import { Select, TextInput } from '@mantine/core'
import type { ArchiveContextDto } from '../../../../shared/contracts/application'
import type { ServiceTypeDto } from '../../../../shared/contracts/catalog'
import type { PageDto } from '../../../../shared/contracts/master-data'
import { useApplicationRequest } from '../../api/use-application-request'
import { PageControls } from '../PageControls'

export function CatalogPicker({
  context,
  value,
  onChange,
  disabled,
  historical = false,
  retainedId = null,
}: {
  context: ArchiveContextDto
  value: string | null
  onChange: (id: string | null) => void
  retainedId?: string | null
  historical?: boolean
  disabled: boolean
}) {
  const [search, setSearch] = useState(''),
    [page, setPage] = useState(1),
    [list, setList] = useState<PageDto<ServiceTypeDto> | null>(null),
    [chosen, setChosen] = useState<{ value: string; label: string } | null>(null),
    [error, setError] = useState<string | null>(null)
  const { request, invalidate, loading } = useApplicationRequest(context, setError),
    chosenRequest = useApplicationRequest(context, setError)
  const [retained, setRetained] = useState<{ value: string; label: string } | null>(null)
  const { request: readRetained, invalidate: invalidateRetained } = useApplicationRequest(
    context,
    setError,
  )
  const api = window.catalog
  const option = (s: ServiceTypeDto) => ({
    value: s.id,
    label: `${s.description}${s.status === 'ACTIVE' ? '' : ' · Disattivato'}`,
  })
  useEffect(() => {
    void request(() =>
      api.list({
        context: { sessionId: context.sessionId },
        query: { search, page, pageSize: 25, status: historical ? 'ALL' : 'ACTIVE' },
      }),
    ).then((r) => {
      if (r?.ok) setList(r.value)
    })
  }, [request, api, context.sessionId, context.revision, search, page, historical])
  const { request: readChosen, invalidate: invalidateChosen } = chosenRequest
  useEffect(() => {
    invalidateChosen()
    setChosen(null)
    if (value)
      void readChosen(() =>
        api.get({ context: { sessionId: context.sessionId }, query: { id: value } }),
      ).then((r) => {
        if (r?.ok) setChosen(option(r.value))
      })
  }, [readChosen, invalidateChosen, api, context.sessionId, context.revision, value])
  useEffect(() => {
    invalidateRetained()
    setRetained(null)
    if (retainedId)
      void readRetained(() =>
        api.get({ context: { sessionId: context.sessionId }, query: { id: retainedId } }),
      ).then((r) => {
        if (r?.ok) setRetained(option(r.value))
      })
  }, [readRetained, invalidateRetained, api, context.sessionId, context.revision, retainedId])
  const options = list?.items.map(option) ?? []
  if (retained?.value === retainedId && !options.some((o) => o.value === retainedId))
    options.unshift(retained)
  if (chosen?.value === value && !options.some((o) => o.value === value)) options.unshift(chosen)
  return (
    <>
      <TextInput
        label="Cerca tipo di prestazione"
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
        label="Tipo di prestazione"
        required
        allowDeselect={false}
        data={options}
        value={value}
        disabled={disabled || loading}
        error={error}
        onChange={onChange}
      />
      {list && list.total > 25 && (
        <PageControls
          page={list}
          disabled={disabled || loading}
          onPage={(p) => {
            invalidate()
            setPage(p)
          }}
        />
      )}
    </>
  )
}
