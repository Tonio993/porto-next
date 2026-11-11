import { useCallback, useEffect, useState } from 'react'
import type { ArchiveContextDto } from '../../../shared/contracts/application'
import type {
  CustomerChangeDto,
  CustomerDto,
  CustomerHistoryDto,
  CustomerPreviewDto,
  CustomerVersionDto,
} from '../../../shared/contracts/customers'
import type { PageDto } from '../../../shared/contracts/master-data'
import type { MomentInputDto, MomentResolutionDto } from '../../../shared/contracts/values'
import type { useArchives } from './use-archives'
import { useApplicationRequest } from './use-application-request'
import { fieldErrors } from './response-scope'

interface Editor {
  context: ArchiveContextDto
  customerId: string
  versionId: string | null
  businessName: string
  moment: MomentInputDto | null
}

export function useCustomers(archives: ReturnType<typeof useArchives>) {
  const { state, execute, setNotice, update } = archives
  const context = state.context!
  const { sessionId, revision } = context
  const [error, setError] = useState<string | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const {
    request: listRequest,
    invalidate: invalidateList,
    loading: loadingList,
  } = useApplicationRequest(context, setListError)
  const {
    request: historyRequest,
    invalidate: invalidateHistory,
    loading: loadingDetail,
  } = useApplicationRequest(context, setDetailError)
  const action = useApplicationRequest(context, setError)
  const resolver = useApplicationRequest(context, setError)
  const effects = useApplicationRequest(context, setError)
  const [page, setPage] = useState<PageDto<CustomerDto> | null>(null)
  const [search, setSearch] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)
  const [selection, setSelection] = useState<string | null>(null)
  const [history, setHistory] = useState<{
    value: CustomerHistoryDto
    context: ArchiveContextDto
  } | null>(null)
  const [createContext, setCreateContext] = useState<ArchiveContextDto | null>(null)
  const [businessName, setBusinessName] = useState('')
  const [editor, setEditor] = useState<Editor | null>(null)
  const [resolution, setResolution] = useState<MomentResolutionDto | null>(null)
  const [preview, setPreview] = useState<CustomerPreviewDto | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const busy = archives.busy || archives.commandBusy || action.loading

  const loadList = useCallback(async () => {
    setListError(null)
    const result = await listRequest(() =>
      window.customers.list({
        context: { sessionId },
        query: { search, page: pageNumber, pageSize: 10, selectableOnly: false },
      }),
    )
    if (result?.ok) {
      setPage(result.value)
      if (!result.value.items.length && pageNumber > 1)
        setPageNumber(Math.max(1, Math.ceil(result.value.total / 10)))
    }
    return result
  }, [listRequest, sessionId, search, pageNumber])

  const loadHistory = useCallback(async () => {
    if (!selection) return
    setDetailError(null)
    const result = await historyRequest(() =>
      window.customers.history({
        context: { sessionId },
        query: { id: selection, page: historyPage, pageSize: 10 },
      }),
    )
    if (result?.ok) {
      setHistory({ value: result.value, context: result.context })
      if (!result.value.versions.items.length && historyPage > 1)
        setHistoryPage(Math.max(1, Math.ceil(result.value.versions.total / 10)))
    } else if (result && result.error.code === 'NOT_FOUND') {
      setSelection(null)
      setHistory(null)
      setDetailError(null)
    }
  }, [historyRequest, sessionId, selection, historyPage])

  useEffect(() => {
    void loadList()
  }, [loadList, revision])
  useEffect(() => {
    void loadHistory()
  }, [loadHistory, revision])

  const nextTransition = [history?.value.customer, ...(page?.items ?? [])]
    .map((item) => item?.nextTransitionAt)
    .filter((instant): instant is string => !!instant)
    .sort()[0]
  useEffect(() => {
    const refresh = () => {
      void loadList()
      void loadHistory()
    }
    let timer: number | undefined
    const schedule = () => {
      if (!nextTransition) return
      timer = window.setTimeout(
        () => {
          refresh()
          schedule()
        },
        Math.max(100, Math.min(60_000, Date.parse(nextTransition) - Date.now() + 50)),
      )
    }
    schedule()
    window.addEventListener('focus', refresh)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [nextTransition, loadList, loadHistory])

  function clearErrors() {
    setError(null)
    setFields({})
  }

  function select(id: string | null) {
    if (id === selection) return
    invalidateHistory()
    setHistory(null)
    setDetailError(null)
    clearErrors()
    setHistoryPage(1)
    setSelection(id)
  }

  function openCreate() {
    clearErrors()
    setCreateContext((saved) => saved ?? context)
  }

  async function reloadCreate() {
    clearErrors()
    const result = await action.request(async () => {
      const response = await window.customers.list({
        context: { sessionId },
        query: { search, page: 1, pageSize: 1, selectableOnly: false },
      })
      if (response.ok) await update(() => window.archives.getState())
      return response
    })
    if (result?.ok) setCreateContext(result.context)
  }

  async function create() {
    if (!createContext) return false
    clearErrors()
    const result = await action.request(() =>
      execute(() => window.customers.create({ context: createContext, payload: { businessName } })),
    )
    if (!result) return false
    if (!result.ok) {
      setFields(fieldErrors(result.error.fields))
      return false
    }
    setBusinessName('')
    setCreateContext(null)
    select(result.value.id)
    setNotice(`Cliente ${result.value.code} creato.`)
    return true
  }

  function changeEditor(value: Editor | null) {
    resolver.invalidate()
    setResolution(null)
    clearErrors()
    setEditor(value)
  }

  function edit(version?: CustomerVersionDto) {
    if (!history) return
    const customer = history.value.customer
    changeEditor({
      context: history.context,
      customerId: customer.id,
      versionId: version?.id ?? null,
      businessName: version?.businessName ?? customer.version.businessName,
      moment: version
        ? version.effectiveMoment && {
            localDateTime: version.effectiveMoment.localDateTime,
            selectedOffset: version.effectiveMoment.offset,
          }
        : { localDateTime: '', selectedOffset: null },
    })
  }

  async function resolveVersion() {
    if (!editor?.moment) return
    clearErrors()
    const { customerId, moment } = editor
    const result = await resolver.request(() =>
      window.customers.resolveVersionMoment({
        context: { sessionId: editor.context.sessionId },
        query: { customerId, moment },
      }),
    )
    if (result?.ok) {
      setResolution(result.value)
      if (result.value.status === 'RESOLVED')
        setEditor({
          ...editor,
          moment: {
            localDateTime: result.value.moment.localDateTime,
            selectedOffset: result.value.moment.offset,
          },
        })
    }
  }

  async function showPreview(context: ArchiveContextDto, payload: CustomerChangeDto) {
    clearErrors()
    resolver.invalidate()
    const result = await action.request(() =>
      execute(() => window.customers.preview({ context, payload })),
    )
    if (result?.ok) setPreview(result.value)
    else if (result) setFields(fieldErrors(result.error.fields))
  }

  function previewVersion() {
    if (!editor) return
    const { customerId, businessName, moment, versionId } = editor
    if (versionId)
      return showPreview(editor.context, {
        operation: 'UPDATE_VERSION',
        customerId,
        versionId,
        businessName,
        moment,
      })
    if (moment)
      return showPreview(editor.context, {
        operation: 'INSERT_VERSION',
        customerId,
        businessName,
        moment,
      })
  }

  function previewChange(
    operation: 'DELETE_CUSTOMER' | 'DEACTIVATE_CUSTOMER' | 'DELETE_VERSION',
    versionId?: string,
  ) {
    if (!history) return
    const customerId = history.value.customer.id
    if (operation === 'DELETE_VERSION') {
      if (versionId) return showPreview(history.context, { operation, customerId, versionId })
    } else return showPreview(history.context, { operation, customerId })
  }

  function cancelPreview() {
    effects.invalidate()
    setPreview(null)
    clearErrors()
  }

  async function confirm() {
    if (!preview) return
    clearErrors()
    const result = await action.request(() =>
      execute(() =>
        window.customers.confirm({
          context: preview.context,
          payload: { previewId: preview.previewId },
        }),
      ),
    )
    if (result?.ok) {
      if (preview.operation === 'DELETE_CUSTOMER') select(null)
      cancelPreview()
      changeEditor(null)
      setNotice('Modifica del cliente salvata.')
    }
  }

  async function reactivate() {
    if (!history) return
    clearErrors()
    const result = await action.request(() =>
      execute(() =>
        window.customers.reactivate({
          context: history.context,
          payload: { customerId: history.value.customer.id },
        }),
      ),
    )
    if (result?.ok) setNotice('Cliente riattivato.')
  }

  async function loadEffects(page: number) {
    if (!preview) return
    clearErrors()
    const result = await effects.request(() =>
      window.customers.previewEffects({
        context: { sessionId: preview.context.sessionId },
        query: { previewId: preview.previewId, page, pageSize: 50 },
      }),
    )
    if (result?.ok) setPreview({ ...preview, effects: result.value })
  }

  return {
    search,
    setSearch: (value: string) => {
      invalidateList()
      setSearch(value)
      setPageNumber(1)
    },
    revision,
    busy,
    fields,
    error,
    listError,
    detailError,
    clearErrors,
    page,
    loadingList,
    selection,
    select,
    setPage: (page: number) => {
      invalidateList()
      setPageNumber(page)
    },
    history: history?.value,
    loadingDetail,
    setHistoryPage: (page: number) => {
      invalidateHistory()
      setHistoryPage(page)
    },
    openCreate,
    createContext,
    businessName,
    setBusinessName,
    reloadCreate,
    create,
    editor,
    edit,
    changeEditor,
    resolution,
    resolveVersion,
    loadingMoment: resolver.loading,
    previewVersion,
    previewChange,
    preview,
    cancelPreview,
    confirm,
    reactivate,
    loadEffects,
    loadingEffects: effects.loading,
  }
}
