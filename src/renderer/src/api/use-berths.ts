import { useCallback, useEffect, useState } from 'react'
import type { ArchiveContextDto } from '../../../shared/contracts/application'
import type {
  BerthChangeDto,
  BerthDto,
  BerthHistoryDto,
  BerthPreviewDto,
  BerthVersionDto,
} from '../../../shared/contracts/berths'
import type { PageDto } from '../../../shared/contracts/master-data'
import type { MomentInputDto, MomentResolutionDto } from '../../../shared/contracts/values'
import type { useArchives } from './use-archives'
import { useApplicationRequest } from './use-application-request'
import { fieldErrors } from './response-scope'

interface Editor {
  context: ArchiveContextDto
  berthId: string
  versionId: string | null
  name: string
  moment: MomentInputDto | null
}

export function useBerths(archives: ReturnType<typeof useArchives>, portId: string) {
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
  const [page, setPage] = useState<PageDto<BerthDto> | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)
  const [selection, setSelection] = useState<string | null>(null)
  const [history, setHistory] = useState<{
    value: BerthHistoryDto
    context: ArchiveContextDto
  } | null>(null)
  const [createContext, setCreateContext] = useState<ArchiveContextDto | null>(null)
  const [name, setName] = useState('')
  const [editor, setEditor] = useState<Editor | null>(null)
  const [resolution, setResolution] = useState<MomentResolutionDto | null>(null)
  const [preview, setPreview] = useState<BerthPreviewDto | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const busy = archives.busy || archives.commandBusy || action.loading

  const loadList = useCallback(async () => {
    setListError(null)
    const result = await listRequest(() =>
      window.berths.list({
        context: { sessionId },
        query: { portId, page: pageNumber, pageSize: 10, selectableOnly: false },
      }),
    )
    if (result?.ok) {
      setPage(result.value)
      if (!result.value.items.length && pageNumber > 1)
        setPageNumber(Math.max(1, Math.ceil(result.value.total / 10)))
    }
    return result
  }, [listRequest, sessionId, portId, pageNumber])

  const loadHistory = useCallback(async () => {
    if (!selection) return
    setDetailError(null)
    const result = await historyRequest(() =>
      window.berths.history({
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

  const nextTransition = [history?.value.berth, ...(page?.items ?? [])]
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
      const response = await window.berths.list({
        context: { sessionId },
        query: { portId, page: 1, pageSize: 1, selectableOnly: false },
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
      execute(() => window.berths.create({ context: createContext, payload: { portId, name } })),
    )
    if (!result) return false
    if (!result.ok) {
      setFields(fieldErrors(result.error.fields))
      return false
    }
    setName('')
    setCreateContext(null)
    select(result.value.id)
    setNotice(`Banchina ${result.value.code} creata.`)
    return true
  }

  function changeEditor(value: Editor | null) {
    resolver.invalidate()
    setResolution(null)
    clearErrors()
    setEditor(value)
  }

  function edit(version?: BerthVersionDto) {
    if (!history) return
    const berth = history.value.berth
    changeEditor({
      context: history.context,
      berthId: berth.id,
      versionId: version?.id ?? null,
      name: version?.name ?? berth.version.name,
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
    const { berthId, moment } = editor
    const result = await resolver.request(() =>
      window.berths.resolveVersionMoment({
        context: { sessionId: editor.context.sessionId },
        query: { berthId, moment },
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

  async function showPreview(context: ArchiveContextDto, payload: BerthChangeDto) {
    clearErrors()
    resolver.invalidate()
    const result = await action.request(() =>
      execute(() => window.berths.preview({ context, payload })),
    )
    if (result?.ok) setPreview(result.value)
    else if (result) setFields(fieldErrors(result.error.fields))
  }

  function previewVersion() {
    if (!editor) return
    const { berthId, name, moment, versionId } = editor
    if (versionId)
      return showPreview(editor.context, {
        operation: 'UPDATE_VERSION',
        berthId,
        versionId,
        name,
        moment,
      })
    if (moment)
      return showPreview(editor.context, { operation: 'INSERT_VERSION', berthId, name, moment })
  }

  function previewChange(
    operation: 'DELETE_BERTH' | 'DEACTIVATE_BERTH' | 'DELETE_VERSION',
    versionId?: string,
  ) {
    if (!history) return
    const berthId = history.value.berth.id
    if (operation === 'DELETE_VERSION') {
      if (versionId) return showPreview(history.context, { operation, berthId, versionId })
    } else return showPreview(history.context, { operation, berthId })
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
        window.berths.confirm({
          context: preview.context,
          payload: { previewId: preview.previewId },
        }),
      ),
    )
    if (result?.ok) {
      if (preview.operation === 'DELETE_BERTH') select(null)
      cancelPreview()
      changeEditor(null)
      setNotice('Modifica della banchina salvata.')
    }
  }

  async function reactivate() {
    if (!history) return
    clearErrors()
    const result = await action.request(() =>
      execute(() =>
        window.berths.reactivate({
          context: history.context,
          payload: { berthId: history.value.berth.id },
        }),
      ),
    )
    if (result?.ok) setNotice('Banchina riattivata.')
  }

  async function loadEffects(page: number) {
    if (!preview) return
    clearErrors()
    const result = await effects.request(() =>
      window.berths.previewEffects({
        context: { sessionId: preview.context.sessionId },
        query: { previewId: preview.previewId, page, pageSize: 50 },
      }),
    )
    if (result?.ok) setPreview({ ...preview, effects: result.value })
  }

  return {
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
    name,
    setName,
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
