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
}: {
  context: ArchiveContextDto
  value: string | null
  onChange: (id: string | null) => void
  disabled: boolean
}) {
  const [search, setSearch] = useState(''),
    [page, setPage] = useState(1),
    [list, setList] = useState<PageDto<ServiceTypeDto> | null>(null),
    [chosen, setChosen] = useState<{ value: string; label: string } | null>(null),
    [error, setError] = useState<string | null>(null)
  const { request, invalidate, loading } = useApplicationRequest(context, setError),
    chosenRequest = useApplicationRequest(context, setError)
  const api = window.catalog
  const option = (s: ServiceTypeDto) => ({
    value: s.id,
    label: `${s.description}${s.status === 'ACTIVE' ? '' : ' · Disattivato'}`,
  })
  useEffect(() => {
    void request(() =>
      api.list({
        context: { sessionId: context.sessionId },
        query: { search, page, pageSize: 25, status: 'ACTIVE' },
      }),
    ).then((r) => {
      if (r?.ok) setList(r.value)
    })
  }, [request, api, context.sessionId, context.revision, search, page])
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
  const options = list?.items.map(option) ?? []
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
