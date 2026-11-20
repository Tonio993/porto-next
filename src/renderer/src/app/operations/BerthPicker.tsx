import { useEffect, useState } from 'react'
import { Select } from '@mantine/core'
import type { ArchiveContextDto } from '../../../../shared/contracts/application'
import type { PageDto } from '../../../../shared/contracts/master-data'
import type { BerthDto } from '../../../../shared/contracts/berths'
import { useApplicationRequest } from '../../api/use-application-request'
import { PageControls } from '../PageControls'
export function BerthPicker({
  context,
  portId,
  value,
  onChange,
  disabled,
  historical = false,
  retained,
}: {
  context: ArchiveContextDto
  portId: string
  value: string | null
  onChange: (value: string | null) => void
  historical?: boolean
  retained?: { id: string; label: string } | null
  disabled: boolean
}) {
  const [page, setPage] = useState(1),
    [list, setList] = useState<PageDto<BerthDto> | null>(null),
    [error, setError] = useState<string | null>(null)
  const [chosen, setChosen] = useState<{ value: string; label: string } | null>(null)
  const { request, invalidate, loading } = useApplicationRequest(context, setError)
  useEffect(() => {
    void request(() =>
      window.berths.list({
        context: { sessionId: context.sessionId },
        query: { portId, page, pageSize: 25, selectableOnly: !historical },
      }),
    ).then((r) => {
      if (r?.ok) setList(r.value)
    })
  }, [request, context.sessionId, context.revision, portId, page, historical])
  const options =
    list?.items.map((b) => ({
      value: b.id,
      label: `${b.code} · ${b.version.name}${b.selectable ? '' : ' · Disattivata'}`,
      ...(retained !== undefined ? { disabled: !b.selectable && b.id !== retained?.id } : {}),
    })) ?? []
  if (retained && retained.id === value && !options.some((o) => o.value === value))
    options.unshift({ value: retained.id, label: retained.label })
  if (chosen?.value === value && !options.some((o) => o.value === value)) options.unshift(chosen)
  return (
    <>
      <Select
        label="Banchina (facoltativa)"
        placeholder="Non specificata"
        clearable
        value={value}
        data={options}
        disabled={disabled || loading}
        error={error}
        onChange={(id) => {
          setChosen(options.find((o) => o.value === id) ?? null)
          onChange(id)
        }}
      />
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
