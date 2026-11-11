import { useCallback, useEffect, useState } from 'react'
import type { ArchiveContextDto } from '../../../shared/contracts/application'
import type {
  AgencyChangeDto,
  AgencyDto,
  AgencyHistoryDto,
  AgencyPreviewDto,
  AgencyVersionDto,
} from '../../../shared/contracts/agencies'
import type { PageDto } from '../../../shared/contracts/master-data'
import type { MomentInputDto, MomentResolutionDto } from '../../../shared/contracts/values'
import type { useArchives } from './use-archives'
import { useApplicationRequest } from './use-application-request'
import { fieldErrors } from './response-scope'

interface Editor {
  context: ArchiveContextDto
  agencyId: string
  versionId: string | null
  businessName: string
  moment: MomentInputDto | null
}

export function useAgencies(archives: ReturnType<typeof useArchives>) {
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
  const [page, setPage] = useState<PageDto<AgencyDto> | null>(null)
  const [search, setSearch] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)
  const [selection, setSelection] = useState<string | null>(null)
  const [history, setHistory] = useState<{
    value: AgencyHistoryDto
    context: ArchiveContextDto
  } | null>(null)
  const [createContext, setCreateContext] = useState<ArchiveContextDto | null>(null)
  const [businessName, setBusinessName] = useState('')
  const [editor, setEditor] = useState<Editor | null>(null)
  const [resolution, setResolution] = useState<MomentResolutionDto | null>(null)
  const [preview, setPreview] = useState<AgencyPreviewDto | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const busy = archives.busy || archives.commandBusy || action.loading

  const loadList = useCallback(async () => {
    setListError(null)
    const result = await listRequest(() =>
      window.agencies.list({
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
      window.agencies.history({
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

  const nextTransition = [history?.value.agency, ...(page?.items ?? [])]
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
      const response = await window.agencies.list({
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
      execute(() => window.agencies.create({ context: createContext, payload: { businessName } })),
    )
    if (!result) return false
    if (!result.ok) {
      setFields(fieldErrors(result.error.fields))
      return false
    }
    setBusinessName('')
    setCreateContext(null)
    select(result.value.id)
    setNotice(`Agenzia ${result.value.code} creata.`)
    return true
  }

  function changeEditor(value: Editor | null) {
    resolver.invalidate()
    setResolution(null)
    clearErrors()
    setEditor(value)
  }

  function edit(version?: AgencyVersionDto) {
    if (!history) return
    const agency = history.value.agency
    changeEditor({
      context: history.context,
      agencyId: agency.id,
      versionId: version?.id ?? null,
      businessName: version?.businessName ?? agency.version.businessName,
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
    const { agencyId, moment } = editor
    const result = await resolver.request(() =>
      window.agencies.resolveVersionMoment({
        context: { sessionId: editor.context.sessionId },
        query: { agencyId, moment },
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

  async function showPreview(context: ArchiveContextDto, payload: AgencyChangeDto) {
    clearErrors()
    resolver.invalidate()
    const result = await action.request(() =>
      execute(() => window.agencies.preview({ context, payload })),
    )
    if (result?.ok) setPreview(result.value)
    else if (result) setFields(fieldErrors(result.error.fields))
  }

  function previewVersion() {
    if (!editor) return
    const { agencyId, businessName, moment, versionId } = editor
    if (versionId)
      return showPreview(editor.context, {
        operation: 'UPDATE_VERSION',
        agencyId,
        versionId,
        businessName,
        moment,
      })
    if (moment)
      return showPreview(editor.context, {
        operation: 'INSERT_VERSION',
        agencyId,
        businessName,
        moment,
      })
  }

  function previewChange(
    operation: 'DELETE_AGENCY' | 'DEACTIVATE_AGENCY' | 'DELETE_VERSION',
    versionId?: string,
  ) {
    if (!history) return
    const agencyId = history.value.agency.id
    if (operation === 'DELETE_VERSION') {
      if (versionId) return showPreview(history.context, { operation, agencyId, versionId })
    } else return showPreview(history.context, { operation, agencyId })
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
        window.agencies.confirm({
          context: preview.context,
          payload: { previewId: preview.previewId },
        }),
      ),
    )
    if (result?.ok) {
      if (preview.operation === 'DELETE_AGENCY') select(null)
      cancelPreview()
      changeEditor(null)
      setNotice('Modifica dell’agenzia salvata.')
    }
  }

  async function reactivate() {
    if (!history) return
    clearErrors()
    const result = await action.request(() =>
      execute(() =>
        window.agencies.reactivate({
          context: history.context,
          payload: { agencyId: history.value.agency.id },
        }),
      ),
    )
    if (result?.ok) setNotice('Agenzia riattivata.')
  }

  async function loadEffects(page: number) {
    if (!preview) return
    clearErrors()
    const result = await effects.request(() =>
      window.agencies.previewEffects({
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
