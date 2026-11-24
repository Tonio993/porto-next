import { proposedPortZone } from '../../../shared/time-zones'
import { useConsultationState } from './use-consultation-state'
import { useWriteAttempt } from './use-write-attempt'
import { trackedRequest } from '../../../shared/contracts/write-outcomes'
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

export function usePorts(archives: ReturnType<typeof useArchives>, onRecovered?: () => void) {
  const { state, setError, setNotice, execute } = archives
  const context = state.context!
  const list = useApplicationRequest(context, setError)
  const details = useApplicationRequest(context, setError)
  const company = useApplicationRequest(context, setError)
  const action = useApplicationRequest(context, setError)
  const resolver = useApplicationRequest(context, setError)
  const effects = useApplicationRequest(context, setError)
  const [page, setPage] = useState<PortPageDto | null>(null)
  const [search, setSearch] = useConsultationState('ports', 'search')
  const [pageNumber, setPageNumber, pageCurrent] = useConsultationState('ports', 'page')
  const [selection, setSelection, selectionCurrent] = useConsultationState('ports', 'selection')
  const [historyPage, setHistoryPage, historyPageCurrent] = useConsultationState(
    'portHistory',
    'page',
    selection,
  )
  const selected = useRef(selection)
  const [history, setHistory] = useState<{
    value: PortHistoryDto
    context: ArchiveContextDto
  } | null>(null)
  const [draft, setDraft] = useState(empty)
  const createGeneration = useRef(0)
  const companyZone = useRef(empty.initialZoneId)
  const [draftContext, setDraftContext] = useState<ArchiveContextDto | null>(null)
  const [editor, setEditor] = useState<VersionDraft | null>(null)
  const [preview, setPreview] = useState<PortPreviewDto | null>(null)
  const [previewPort, setPreviewPort] = useState<string | null>(null)
  const [resolution, setResolution] = useState<MomentResolutionDto | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [createFields, setCreateFields] = useState<Record<string, string>>({})
  function discardDraft() {
    setDraft({ ...empty, initialZoneId: proposedPortZone(empty.countryCode, companyZone.current) })
    setDraftContext(null)
    setEditor(null)
    setPreview(null)
    setResolution(null)
    setFields({})
    setCreateFields({})
    action.invalidate()
    resolver.invalidate()
    effects.invalidate()
    company.invalidate()
  }
  const writes = useWriteAttempt(
    archives,
    () => {
      discardDraft()
      selected.current = null
      setSelection(null)
      setHistory(null)
      details.invalidate()
      setError(null)
      onRecovered?.()
      void loadList()
    },
    details.suspendWhile,
  )
  const busy =
    writes.attempt.busy ||
    writes.attempt.uncertain ||
    archives.busy ||
    archives.commandBusy ||
    action.loading
  const { request: listRequest } = list
  const { request: detailRequest, invalidate: invalidateDetail } = details
  const { request: companyRequest } = company

  const loadList = useCallback(async () => {
    const result = await listRequest(() =>
      window.ports.list({
        context: { sessionId: context.sessionId },
        query: { page: pageNumber, pageSize: 25, search },
      }),
    )
    if (result?.ok && pageCurrent()) {
      setPage(result.value)
      if (!result.value.items.length && pageNumber > 1)
        setPageNumber(Math.max(1, Math.ceil(result.value.total / 25)))
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
    if (!result || !selectionCurrent() || !historyPageCurrent()) return
    if (result.ok) {
      setHistory({ value: result.value, context: result.context })
      if (!result.value.versions.items.length && historyPage > 1)
        setHistoryPage(Math.max(1, Math.ceil(result.value.versions.total / 25)))
    } else if (result.error.code === 'NOT_FOUND') {
      selected.current = null
      setSelection(null)
      setHistory(null)
      setError(null)
    }
  }, [detailRequest, context.sessionId, selection, historyPage, setError])
  useEffect(() => {
    void loadList()
    return list.invalidate
  }, [list.invalidate, loadList, context.revision])
  useEffect(() => {
    void loadDetail()
    return invalidateDetail
  }, [invalidateDetail, loadDetail, context.revision])
  useEffect(() => {
    const generation = createGeneration.current
    void companyRequest(() =>
      window.time.getCompanyZone({ context: { sessionId: context.sessionId }, query: null }),
    ).then((result) => {
      if (result?.ok) {
        companyZone.current = result.value.zoneId
        if (generation !== createGeneration.current) return
        setDraft((value) => ({
          ...value,
          initialZoneId: proposedPortZone(
            value.countryCode,
            result.value.zoneId,
            value.initialZoneId,
          ),
        }))
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
    if (id === selected.current) return
    details.invalidate()
    cancelPreview()
    selected.current = id
    setSelection(id)
    setHistory(null)
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
  function openCreate() {
    createGeneration.current++
    setDraftContext({ ...context })
    setCreateFields({})
    setError(null)
  }
  async function create() {
    if (!draftContext) return
    setError(null)
    setCreateFields({})
    const result = await writes.attempt.run(draftContext, crypto.randomUUID(), (attemptId) =>
      action.request(() =>
        execute(() =>
          window.ports.create(trackedRequest({ context: draftContext, payload: draft }, attemptId)),
        ),
      ),
    )
    if (!result) return
    if (!result.ok) {
      setCreateFields(fieldErrors(result.error.fields))
      return
    }
    setDraft({ ...empty, initialZoneId: proposedPortZone(empty.countryCode, companyZone.current) })
    setDraftContext(result.context)
    select(result.value.id)
    setNotice(`Porto ${result.value.code} creato.`)
    await loadList()
    return true
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
    return details.suspendWhile(async () => {
      if (!preview || !previewPort) return
      const methods = {
        INSERT_VERSION: window.ports.confirmInsertVersion,
        UPDATE_VERSION: window.ports.confirmUpdateVersion,
        DELETE_VERSION: window.ports.confirmDeleteVersion,
        DEACTIVATE_PORT: window.ports.confirmDeactivate,
        DELETE_PORT: window.ports.confirmDelete,
      }
      const result = await writes.attempt.run(preview.context, crypto.randomUUID(), (attemptId) =>
        action.request(() =>
          execute(() =>
            methods[preview.operation](
              trackedRequest(
                {
                  context: preview.context,
                  payload: { previewId: preview.previewId },
                },
                attemptId,
              ),
            ),
          ),
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
    }, preview?.operation === 'DELETE_PORT')
  }
  async function reactivate() {
    if (!history) return
    const result = await writes.attempt.run(history.context, crypto.randomUUID(), (attemptId) =>
      action.request(() =>
        execute(() =>
          window.ports.reactivate(
            trackedRequest(
              {
                context: history.context,
                payload: { portId: history.value.port.id },
              },
              attemptId,
            ),
          ),
        ),
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
    discardDraft,
    writeRecovery: writes.recovery,
    writeRecoveryControl: writes.control,
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
    setDraft: (value: CreatePortDto) => {
      createGeneration.current++
      setDraft((previous) => ({
        ...value,
        initialZoneId:
          value.countryCode === previous.countryCode
            ? value.initialZoneId
            : proposedPortZone(value.countryCode, companyZone.current, value.initialZoneId),
      }))
    },
    draftContext,
    createFields,
    create,
    openCreate,
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
