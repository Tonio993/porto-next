import type { ConsultationPicker } from '../../api/use-consultation-state'
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
  consultation,
  historical = false,
  retained,
}: {
  context: ArchiveContextDto
  portId: string
  value: string | null
  onChange: (value: string | null) => void
  consultation?: Pick<ConsultationPicker, 'page' | 'setPage' | 'current'>
  historical?: boolean
  retained?: { id: string; label: string } | null
  disabled: boolean
}) {
  const [localPage, setLocalPage] = useState(1)
  const { page, setPage } = consultation ?? { page: localPage, setPage: setLocalPage }
  const [list, setList] = useState<PageDto<BerthDto> | null>(null),
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
      if (r?.ok && (!consultation || consultation.current())) {
        setList(r.value)
        const last = Math.max(1, Math.ceil(r.value.total / 25))
        if (page > last) setPage(last)
      }
    })
    return invalidate
  }, [request, invalidate, context.sessionId, context.revision, portId, page, historical])
  const { request: readChosen, invalidate: invalidateChosen } = useApplicationRequest(
    context,
    setError,
  )
  useEffect(() => {
    setChosen(null)
    if (!historical || !value) return
    void readChosen(() =>
      window.berths.history({
        context: { sessionId: context.sessionId },
        query: { id: value, page: 1, pageSize: 1 },
      }),
    ).then((r) => {
      if (r?.ok && r.value.berth.portId === portId)
        setChosen({
          value: r.value.berth.id,
          label: r.value.berth.code + ' · ' + r.value.berth.version.name,
        })
    })
    return invalidateChosen
  }, [readChosen, invalidateChosen, context.sessionId, context.revision, portId, historical, value])
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
