import { useEffect, useState } from 'react'
import { Select, TextInput } from '@mantine/core'
import type { ArchiveContextDto } from '../../../../shared/contracts/application'
import type { CustomerDto } from '../../../../shared/contracts/customers'
import type { AgencyDto } from '../../../../shared/contracts/agencies'
import type { PageDto } from '../../../../shared/contracts/master-data'
import { useApplicationRequest } from '../../api/use-application-request'
import { PageControls } from '../PageControls'

export function SubjectPicker({
  kind,
  context,
  value,
  onChange,
  disabled,
  historical = false,
}: {
  kind: 'customer' | 'agency'
  context: ArchiveContextDto
  value: string | null
  onChange: (id: string | null) => void
  historical?: boolean
  disabled: boolean
}) {
  const [search, setSearch] = useState(''),
    [page, setPage] = useState(1),
    [list, setList] = useState<PageDto<CustomerDto | AgencyDto> | null>(null),
    [chosen, setChosen] = useState<{ value: string; label: string } | null>(null),
    [error, setError] = useState<string | null>(null)
  const { request, invalidate, loading } = useApplicationRequest(context, setError),
    chosenRequest = useApplicationRequest(context, setError)
  const api = kind === 'customer' ? window.customers : window.agencies,
    label = kind === 'customer' ? 'Cliente' : 'Agenzia'
  const option = (s: CustomerDto | AgencyDto) => ({
    value: s.id,
    label: `${s.code} · ${s.version.businessName}${s.selectable ? '' : ' · Disattivato'}`,
  })
  useEffect(() => {
    void request(() =>
      api.list({
        context: { sessionId: context.sessionId },
        query: { search, page, pageSize: 25, selectableOnly: !historical },
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
  const options = list?.items.map(option) ?? []
  if (chosen?.value === value && !options.some((o) => o.value === value)) options.unshift(chosen)
  return (
    <>
      <TextInput
        data-autofocus={kind === 'customer' || undefined}
        label={'Cerca ' + label.toLowerCase()}
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
        label={
          historical
            ? label + (kind === 'customer' ? ' effettivo' : ' effettiva')
            : label + (kind === 'customer' ? ' esplicito' : ' esplicita')
        }
        placeholder={historical ? 'Tutti' : 'Eredita dal livello superiore'}
        clearable
        clearButtonProps={{
          tabIndex: 0,
          'aria-hidden': false,
          'aria-label':
            'Rimuovi ' + label.toLowerCase() + (kind === 'customer' ? ' esplicito' : ' esplicita'),
        }}
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
