import { useCallback, useEffect, useRef, useState } from 'react'
import type { ApplicationResult, ArchiveContextDto } from '../../../shared/contracts/application'
import type {
  CreatePortDto,
  PortHistoryDto,
  PortPageDto,
  PortPreviewDto,
  PortVersionDto,
  PortDescriptionDto,
} from '../../../shared/contracts/ports'
import type { MomentInputDto, MomentResolutionDto } from '../../../shared/contracts/values'
import type { useArchives } from './use-archives'
import { useApplicationRequest } from './use-application-request'
import { fieldErrors } from './response-scope'

const empty: CreatePortDto = {
  name: '',
  locality: '',
  countryCode: 'IT',
  initialZoneId: 'Europe/Rome',
}
export interface VersionDraft {
  description: PortDescriptionDto
  moment: MomentInputDto | null
  versionId: string | null
  portId: string
  context: ArchiveContextDto
}

export function usePorts(archives: ReturnType<typeof useArchives>) {
  const { state, setError, setNotice, execute } = archives
  const context = state.context!
  const list = useApplicationRequest(context, setError)
  const details = useApplicationRequest(context, setError)
  const company = useApplicationRequest(context, setError)
  const action = useApplicationRequest(context, setError)
  const resolver = useApplicationRequest(context, setError)
  const effects = useApplicationRequest(context, setError)
  const [page, setPage] = useState<PortPageDto | null>(null)
  const [search, setSearch] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)
  const [selection, setSelection] = useState<string | null>(null)
  const selected = useRef(selection)
  const [history, setHistory] = useState<{
    value: PortHistoryDto
    context: ArchiveContextDto
  } | null>(null)
  const [draft, setDraft] = useState(empty)
  const [draftContext, setDraftContext] = useState<ArchiveContextDto | null>(null)
  const [editor, setEditor] = useState<VersionDraft | null>(null)
  const [preview, setPreview] = useState<PortPreviewDto | null>(null)
  const [previewPort, setPreviewPort] = useState<string | null>(null)
  const [resolution, setResolution] = useState<MomentResolutionDto | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [createFields, setCreateFields] = useState<Record<string, string>>({})
  const busy = archives.busy || archives.commandBusy || action.loading
  const { request: listRequest } = list
  const { request: detailRequest } = details
  const { request: companyRequest } = company

  const loadList = useCallback(async () => {
    const result = await listRequest(() =>
      window.ports.list({
        context: { sessionId: context.sessionId },
        query: { page: pageNumber, pageSize: 25, search },
      }),
    )
    if (result?.ok) {
      setPage(result.value)
      if (!result.value.items.length && result.value.total && pageNumber > 1)
        setPageNumber(Math.ceil(result.value.total / 25))
    }
  }, [listRequest, context.sessionId, pageNumber, search])
  const loadDetail = useCallback(async () => {
    if (!selection) return
    const result = await detailRequest(() =>
      window.ports.history({
        context: { sessionId: context.sessionId },
        query: { id: selection, page: historyPage, pageSize: 25 },
      }),
    )
    if (!result) return
    if (result.ok) {
      setHistory({ value: result.value, context: result.context })
      if (!result.value.versions.items.length && historyPage > 1)
        setHistoryPage(Math.max(1, Math.ceil(result.value.versions.total / 25)))
    } else if (result.error.code === 'NOT_FOUND') {
      selected.current = null
      setSelection(null)
      setHistory(null)
      setEditor(null)
      setPreview(null)
      setError(null)
    }
  }, [detailRequest, context.sessionId, selection, historyPage, setError])
  useEffect(() => {
    void loadList()
  }, [loadList, context.revision])
  useEffect(() => {
    void loadDetail()
  }, [loadDetail, context.revision])
  useEffect(() => {
    void companyRequest(() =>
      window.time.getCompanyZone({ context: { sessionId: context.sessionId }, query: null }),
    ).then((result) => {
      if (result?.ok) {
        setDraft((value) => ({ ...value, initialZoneId: result.value.zoneId }))
        setDraftContext(result.context)
      }
    })
  }, [companyRequest, context.sessionId])

  // Refresh views at temporal boundaries, without rebasing an open editor or preview.
  const nextTransition = [history?.value.port, ...(page?.items ?? [])]
    .map((port) => port?.nextTransitionAt)
    .filter((time): time is string => !!time)
    .sort()[0]
  useEffect(() => {
    if (!nextTransition) return
    let timer: number
    const schedule = () => {
      timer = window.setTimeout(
        () => {
          void loadList()
          void loadDetail()
          schedule()
        },
        Math.max(100, Math.min(60_000, Date.parse(nextTransition) - Date.now() + 50)),
      )
    }
    schedule()
    return () => window.clearTimeout(timer)
  }, [nextTransition, loadList, loadDetail])
  useEffect(() => {
    const refresh = () => {
      void loadList()
      void loadDetail()
    }
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [loadList, loadDetail])

  function cancelPreview() {
    action.invalidate()
    resolver.invalidate()
    effects.invalidate()
    setPreview(null)
    setResolution(null)
  }
  function select(id: string | null) {
    details.invalidate()
    cancelPreview()
    selected.current = id
    setSelection(id)
    setHistory(null)
    setHistoryPage(1)
    setEditor(null)
    setFields({})
    setError(null)
  }
  function changeEditor(value: VersionDraft | null) {
    cancelPreview()
    setFields({})
    setEditor(value)
  }
  function edit(version?: PortVersionDto) {
    if (!history) return
    changeEditor({
      portId: history.value.port.id,
      versionId: version?.id ?? null,
      context: history.context,
      description: version
        ? { name: version.name, locality: version.locality, countryCode: version.countryCode }
        : {
            name: history.value.port.version.name,
            locality: history.value.port.version.locality,
            countryCode: history.value.port.version.countryCode,
          },
      moment: version
        ? version.effectiveMoment
          ? {
              localDateTime: version.effectiveMoment.localDateTime,
              selectedOffset: version.effectiveMoment.offset,
            }
          : null
        : { localDateTime: '', selectedOffset: null },
    })
  }
  async function reloadCreate() {
    const result = await companyRequest(() =>
      window.time.getCompanyZone({ context: { sessionId: context.sessionId }, query: null }),
    )
    if (result?.ok) {
      setDraftContext(result.context)
      setCreateFields({})
      await archives.update(() => window.archives.getState())
    }
  }
  async function create() {
    if (!draftContext) return
    setError(null)
    setCreateFields({})
    const result = await action.request(() =>
      execute(() => window.ports.create({ context: draftContext, payload: draft })),
    )
    if (!result) return
    if (!result.ok) {
      setCreateFields(fieldErrors(result.error.fields))
      return
    }
    setDraft({ ...empty, initialZoneId: draft.initialZoneId })
    setDraftContext(result.context)
    select(result.value.id)
    setNotice(`Porto ${result.value.code} creato.`)
    await loadList()
  }
  async function resolveVersion() {
    if (!editor?.moment) return
    const result = await resolver.request(() =>
      window.ports.resolveVersionMoment({
        context: { sessionId: editor.context.sessionId },
        query: { portId: editor.portId, moment: editor.moment! },
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
  async function showPreview(
    operation: () => Promise<ApplicationResult<PortPreviewDto>>,
    portId: string,
  ) {
    setError(null)
    setFields({})
    setPreview(null)
    const result = await action.request(() => execute(operation))
    if (!result) return
    if (result.ok && selected.current === portId) {
      setPreview(result.value)
      setPreviewPort(portId)
    } else if (!result.ok) setFields(fieldErrors(result.error.fields))
  }
  function previewVersion() {
    if (!editor) return
    const payload = { ...editor.description, portId: editor.portId, moment: editor.moment }
    return showPreview(
      () =>
        editor.versionId
          ? window.ports.previewUpdateVersion({
              context: editor.context,
              payload: { ...payload, versionId: editor.versionId! },
            })
          : window.ports.previewInsertVersion({
              context: editor.context,
              payload: { ...payload, moment: editor.moment! },
            }),
      editor.portId,
    )
  }
  function previewDeleteVersion(versionId: string) {
    if (!history) return
    changeEditor(null)
    return showPreview(
      () =>
        window.ports.previewDeleteVersion({
          context: history.context,
          payload: { portId: history.value.port.id, versionId },
        }),
      history.value.port.id,
    )
  }
  function previewPortChange(kind: 'delete' | 'deactivate') {
    if (!history) return
    changeEditor(null)
    const request = { context: history.context, payload: { portId: history.value.port.id } }
    return showPreview(
      () =>
        kind === 'delete'
          ? window.ports.previewDelete(request)
          : window.ports.previewDeactivate(request),
      history.value.port.id,
    )
  }
  async function confirm() {
    if (!preview || !previewPort) return
    const methods = {
      INSERT_VERSION: window.ports.confirmInsertVersion,
      UPDATE_VERSION: window.ports.confirmUpdateVersion,
      DELETE_VERSION: window.ports.confirmDeleteVersion,
      DEACTIVATE_PORT: window.ports.confirmDeactivate,
      DELETE_PORT: window.ports.confirmDelete,
    }
    const result = await action.request(() =>
      execute(() =>
        methods[preview.operation]({
          context: preview.context,
          payload: { previewId: preview.previewId },
        }),
      ),
    )
    if (!result) return
    if (!result.ok) return
    const removed = preview.operation === 'DELETE_PORT'
    setPreview(null)
    setEditor(null)
    setFields({})
    setNotice('Modifica del porto salvata.')
    if (removed) select(null)
    else await loadDetail()
    await loadList()
  }
  async function reactivate() {
    if (!history) return
    const result = await action.request(() =>
      execute(() =>
        window.ports.reactivate({
          context: history.context,
          payload: { portId: history.value.port.id },
        }),
      ),
    )
    if (result?.ok) {
      setNotice('Porto riattivato.')
      await loadDetail()
      await loadList()
    }
  }
  async function loadEffects(pageNumber: number) {
    if (!preview) return
    const result = await effects.request(() =>
      window.ports.previewEffects({
        context: { sessionId: preview.context.sessionId },
        query: { previewId: preview.previewId, page: pageNumber, pageSize: 50 },
      }),
    )
    if (result?.ok) setPreview({ ...preview, effects: result.value })
  }
  return {
    page,
    search,
    setSearch: (value: string) => {
      list.invalidate()
      setSearch(value)
      setPageNumber(1)
    },
    pageNumber,
    setPageNumber: (page: number) => {
      list.invalidate()
      setPageNumber(page)
    },
    history: history?.value ?? null,
    selection,
    select,
    historyPage,
    setHistoryPage: (page: number) => {
      details.invalidate()
      setHistoryPage(page)
    },
    draft,
    setDraft,
    draftContext,
    createFields,
    create,
    reloadCreate,
    editor,
    changeEditor,
    edit,
    fields,
    previewVersion,
    previewDeleteVersion,
    previewPortChange,
    preview,
    cancelPreview,
    confirm,
    reactivate,
    resolution,
    resolveVersion,
    loadEffects,
    busy,
    loadingList: list.loading,
    loadingDetail: details.loading,
    loadingMoment: resolver.loading,
    loadingEffects: effects.loading,
    revision: context.revision,
    refresh: async () => {
      await loadList()
      await loadDetail()
    },
  }
}
