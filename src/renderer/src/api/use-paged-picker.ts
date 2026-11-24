import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ApplicationResult, ArchiveContextDto } from '../../../shared/contracts/application'
import type { PageDto } from '../../../shared/contracts/master-data'
import type { ConsultationPicker } from './use-consultation-state'
import { useApplicationRequest } from './use-application-request'

export interface PickerOption {
  value: string
  label: string
  disabled: boolean
}
export type PickerSelectedState = 'empty' | 'missing' | 'error' | 'ready' | 'loading'

/** Shared request lifecycle; each adapter owns its DTO, query and eligibility rules. */
export function usePagedPicker<T>({
  context,
  owner,
  consultation,
  value,
  retainedId,
  loadPage,
  loadOne,
  option,
  onMissing,
  onChange,
}: {
  context: ArchiveContextDto
  owner: string
  consultation?: ConsultationPicker
  value: string | null
  retainedId?: string | null
  loadPage: (search: string, page: number) => Promise<ApplicationResult<PageDto<T>>>
  loadOne: (id: string) => Promise<ApplicationResult<T>>
  option: (item: T) => PickerOption | null
  onMissing?: () => void
  onChange: (id: string | null) => void
}) {
  const localKey = JSON.stringify([context.sessionId, owner])
  const [local, setLocal] = useState({ key: localKey, search: '', page: 1 })
  const localState = local.key === localKey ? local : { key: localKey, search: '', page: 1 }
  const { search, setSearch, page, setPage } = consultation ?? {
    search: localState.search,
    setSearch: (search: string) =>
      setLocal((previous) => ({ ...(previous.key === localKey ? previous : localState), search })),
    page: localState.page,
    setPage: (page: number) =>
      setLocal((previous) => ({ ...(previous.key === localKey ? previous : localState), page })),
  }
  const [refresh, setRefresh] = useState(0)
  const key = JSON.stringify([
    context.sessionId,
    context.revision,
    owner,
    consultation?.scope,
    refresh,
  ])
  const listKey = JSON.stringify([key, search, page])
  const selectedKey = JSON.stringify([key, value])
  const retainedKey = JSON.stringify([key, retainedId])
  const latest = useRef({ listKey, selectedKey, retainedKey })
  latest.current = { listKey, selectedKey, retainedKey }
  const [list, setList] = useState<{ key: string; page: PageDto<T> } | null>(null)
  const [chosen, setChosen] = useState<{ key: string; item: T | null } | null>(null)
  const [retained, setRetained] = useState<{ key: string; item: T } | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [selectedError, setSelectedError] = useState<string | null>(null)
  const [retainedError, setRetainedError] = useState<string | null>(null)
  const consultationRef = useRef(consultation)
  consultationRef.current = consultation
  const reportList = useCallback((message: string | null) => {
    if (!consultationRef.current || consultationRef.current.current()) setListError(message)
  }, [])
  const listRequest = useApplicationRequest(context, reportList)
  const selectedRequest = useApplicationRequest(context, setSelectedError)
  const retainedRequest = useApplicationRequest(context, setRetainedError)
  const { request, invalidate } = listRequest
  const { request: readSelected, invalidate: invalidateSelected } = selectedRequest
  const { request: readRetained, invalidate: invalidateRetained } = retainedRequest

  // Invalidate in layout, before continuations for the previous owner/selection can run.
  useLayoutEffect(() => {
    invalidate()
    setListError(null)
    return invalidate
  }, [invalidate, listKey])
  useLayoutEffect(() => {
    invalidateSelected()
    setSelectedError(null)
    return invalidateSelected
  }, [invalidateSelected, selectedKey])
  useLayoutEffect(() => {
    invalidateRetained()
    setRetainedError(null)
    return invalidateRetained
  }, [invalidateRetained, retainedKey])
  useEffect(() => {
    void request(() => loadPage(search, page)).then((r) => {
      if (latest.current.listKey !== listKey || (consultation && !consultation.current())) return
      if (r?.ok) {
        setList({ key: listKey, page: r.value })
        const last = Math.max(1, Math.ceil(r.value.total / r.value.pageSize))
        if (page > last) setPage(last)
      }
    })
    return invalidate
  }, [request, invalidate, listKey])
  useEffect(() => {
    if (!value) return
    void readSelected(() => loadOne(value), { expectedAbsence: true }).then((r) => {
      if (latest.current.selectedKey !== selectedKey) return
      if (r?.ok) setChosen({ key: selectedKey, item: r.value })
      else if (r && !r.ok && r.error.code === 'NOT_FOUND') {
        setChosen({ key: selectedKey, item: null })
        onMissing?.()
      }
    })
    return invalidateSelected
  }, [readSelected, invalidateSelected, selectedKey])
  useEffect(() => {
    if (!retainedId || retainedId === value) return
    void readRetained(() => loadOne(retainedId), { expectedAbsence: true }).then((r) => {
      if (r?.ok && latest.current.retainedKey === retainedKey)
        setRetained({ key: retainedKey, item: r.value })
    })
    return invalidateRetained
  }, [readRetained, invalidateRetained, retainedKey, value])

  const currentPage = list?.key === listKey ? list.page : null
  const results = currentPage?.items.flatMap((item) => option(item) ?? []) ?? []
  const selected = chosen?.key === selectedKey ? chosen : null
  const selectedOption = selected?.item ? option(selected.item) : null
  const missing = !!value && !!selected && !selectedOption
  const data = new Map(results.map((item) => [item.value, item]))
  if (retained?.key === retainedKey) {
    const original = option(retained.item)
    if (original) data.set(original.value, original)
  }
  if (selectedOption) data.set(selectedOption.value, selectedOption)
  if (missing && value) data.delete(value)
  const selectedState: PickerSelectedState = !value
    ? 'empty'
    : missing
      ? 'missing'
      : selectedError
        ? 'error'
        : selectedOption
          ? 'ready'
          : 'loading'
  return {
    search,
    value,
    data: [...data.values()],
    chosen: selectedOption ?? (value && !missing ? (data.get(value) ?? null) : null),
    selectedState,
    page: currentPage,
    loading: listRequest.loading,
    error: listError ?? selectedError ?? retainedError,
    onRetry: () => setRefresh((previous) => previous + 1),
    onSearchChange: (text: string) => {
      invalidate()
      setList(null)
      setListError(null)
      setSearch(text)
      setPage(1)
    },
    onPage: (next: number) => {
      invalidate()
      setList(null)
      setListError(null)
      setPage(next)
    },
    onChange: (id: string | null) => {
      if (id !== null && (!data.has(id) || data.get(id)!.disabled)) return
      onChange(id)
    },
  }
}
