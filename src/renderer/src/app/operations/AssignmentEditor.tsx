import { useProtectedDraft } from '../DraftProtection'
import { useWriteAttempt } from '../../api/use-write-attempt'
import { trackedRequest } from '../../../../shared/contracts/write-outcomes'
import { useEffect, useRef, useState } from 'react'
import { Button, Group, Modal, Stack } from '@mantine/core'
import type { ArchiveContextDto } from '../../../../shared/contracts/application'
import type {
  AssignmentDto,
  AssignmentTarget,
  AssignmentPreviewDto,
  SpecifiedSubjectsDto,
} from '../../../../shared/contracts/assignments'
import type { useArchives } from '../../api/use-archives'
import { useApplicationRequest } from '../../api/use-application-request'
import { StateMessage } from '../StateMessage'
import { PortConfirmation } from '../ports/PortConfirmation'
import { SubjectPicker } from './SubjectPicker'
import { SubjectValues, assignmentLabels } from './SubjectValues'

export function AssignmentEditor({
  archives,
  target,
  opened,
  onClose,
  onResume,
  onSaved,
  trigger,
}: {
  archives: ReturnType<typeof useArchives>
  target: AssignmentTarget
  opened: boolean
  onClose: () => void
  onResume: () => void
  onSaved: () => void
  trigger: HTMLElement | null
}) {
  const context = archives.state.context!
  const [draft, setDraft] = useState<{
      context: ArchiveContextDto
      specified: SpecifiedSubjectsDto
    } | null>(null),
    [values, setValues] = useState<AssignmentDto | null>(null),
    [preview, setPreview] = useState<AssignmentPreviewDto | null>(null),
    [error, setError] = useState<string | null>(null)
  const read = useApplicationRequest(context, setError),
    command = useApplicationRequest(context, setError),
    effects = useApplicationRequest(context, setError)
  const latest = useRef(context)
  latest.current = context
  const content = useRef<HTMLDivElement | null>(null)
  const initialFocus = useRef(true)
  useEffect(() => {
    if (!opened) {
      initialFocus.current = true
      return
    }
    if (!draft || read.loading || !initialFocus.current) return
    const input = content.current?.querySelector<HTMLInputElement>('[data-autofocus]')
    if (input && !input.disabled) {
      input.focus()
      initialFocus.current = false
    }
  }, [opened, draft, read.loading])
  const { request: query } = read
  const reload = () => {
    command.invalidate()
    effects.invalidate()
    setPreview(null)
    setError(null)
    void query(() =>
      window.assignments.get({ context: { sessionId: latest.current.sessionId }, query: target }),
    ).then((r) => {
      if (r?.ok) {
        setValues(r.value)
        setDraft({ context: r.context!, specified: r.value.specified })
      }
    })
  }
  useEffect(() => {
    if (!opened || draft) return
    void query(() =>
      window.assignments.get({ context: { sessionId: latest.current.sessionId }, query: target }),
    ).then((r) => {
      if (r?.ok) {
        setValues(r.value)
        setDraft({ context: r.context!, specified: r.value.specified })
      }
    })
  }, [query, target, opened, draft])
  const writes = useWriteAttempt(archives, () => {
    read.invalidate()
    command.invalidate()
    effects.invalidate()
    setDraft(null)
    setPreview(null)
    onSaved()
    onClose()
  })
  useProtectedDraft({
    state: writes.attempt.uncertain
      ? 'UNCERTAIN'
      : archives.commandBusy || command.loading || writes.attempt.busy
        ? 'BUSY'
        : draft
          ? 'DRAFT'
          : 'CLEAN',
    discard: () => {
      read.invalidate()
      command.invalidate()
      effects.invalidate()
      setDraft(null)
      setPreview(null)
      onClose()
    },
    recover: onResume,
  })
  const busy =
      writes.attempt.busy ||
      writes.attempt.uncertain ||
      archives.busy ||
      archives.commandBusy ||
      command.loading,
    obsolete = draft?.context.revision !== context.revision
  const change = (specified: SpecifiedSubjectsDto) => {
    command.invalidate()
    effects.invalidate()
    setPreview(null)
    setError(null)
    if (draft) setDraft({ ...draft, specified })
  }
  const close = () => {
    if (!busy) {
      read.invalidate()
      command.invalidate()
      effects.invalidate()
      onClose()
    }
  }
  return (
    <>
      {' '}
      {writes.recovery}
      <Modal
        opened={opened}
        onClose={close}
        title={'Assegnazioni · ' + assignmentLabels[target.kind]}
        size="xl"
        closeOnClickOutside={false}
        closeOnEscape={!busy}
        withCloseButton={!busy}
        onExitTransitionEnd={() => trigger?.isConnected && trigger.focus()}
      >
        {writes.control}
        {error && (
          <StateMessage kind="error" title="Assegnazione non disponibile">
            {error}
          </StateMessage>
        )}
        {obsolete && draft && (
          <StateMessage kind="warning" title="Bozza obsoleta">
            I dati sono cambiati. Ricarica esplicitamente le assegnazioni per proseguire.
          </StateMessage>
        )}
        {!draft && !read.loading && <Button onClick={reload}>Ricarica assegnazioni</Button>}
        {read.loading ? (
          <p role="status">Caricamento assegnazioni…</p>
        ) : (
          draft && (
            <Stack ref={content}>
              <p>
                Un valore esplicito assente eredita dal livello superiore. Cliente e agenzia sono
                indipendenti. I valori delle permanenze sono riferiti al loro inizio; ogni
                componente usa il proprio istante economico.
              </p>
              {preview && !obsolete ? (
                <>
                  <SubjectValues subjects={preview.assignment.effective} ownLevel={target.kind} />
                  {preview.assignment.components.map((c) => (
                    <section key={c.id} aria-label={c.label}>
                      <h4>{c.label}</h4>
                      <SubjectValues subjects={c.subjects} ownLevel="VESSEL_OPERATION" />
                    </section>
                  ))}
                  <PortConfirmation
                    preview={preview}
                    revision={context.revision}
                    disabled={busy || effects.loading}
                    onCancel={() => {
                      effects.invalidate()
                      setPreview(null)
                    }}
                    onPage={(page) => {
                      void effects
                        .request(() =>
                          window.assignments.previewEffects({
                            context: { sessionId: context.sessionId },
                            query: { previewId: preview.previewId, page, pageSize: 50 },
                          }),
                        )
                        .then((r) => {
                          if (r?.ok) setPreview({ ...preview, effects: r.value })
                        })
                    }}
                    onConfirm={() => {
                      void writes.attempt
                        .run(preview.context, crypto.randomUUID(), (attemptId) =>
                          command.request(() =>
                            archives.execute(() =>
                              window.assignments.confirm(
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
                        .then((r) => {
                          if (r?.ok) {
                            setValues(r.value)
                            setDraft(null)
                            setPreview(null)
                            onSaved()
                            onClose()
                          }
                        })
                    }}
                  />
                </>
              ) : (
                <>
                  <SubjectPicker
                    kind="customer"
                    context={context}
                    value={draft.specified.customerId}
                    disabled={busy}
                    onChange={(customerId) => change({ ...draft.specified, customerId })}
                  />
                  <SubjectPicker
                    kind="agency"
                    context={context}
                    value={draft.specified.agencyId}
                    disabled={busy}
                    onChange={(agencyId) => change({ ...draft.specified, agencyId })}
                  />
                  <h4>Valori attualmente registrati</h4>
                  {values?.components.length
                    ? values.components.map((c) => (
                        <section key={c.id}>
                          <h4>{c.label}</h4>
                          <SubjectValues subjects={c.subjects} ownLevel="VESSEL_OPERATION" />
                        </section>
                      ))
                    : values && (
                        <SubjectValues subjects={values.effective} ownLevel={target.kind} />
                      )}
                  <Group className="form-actions">
                    <Button variant="default" disabled={busy} onClick={close}>
                      Chiudi
                    </Button>
                    <Button variant="default" disabled={busy || read.loading} onClick={reload}>
                      Ricarica assegnazioni
                    </Button>
                    <Button
                      disabled={busy || obsolete}
                      loading={command.loading}
                      onClick={() => {
                        void command
                          .request(() =>
                            archives.execute(() =>
                              window.assignments.preview({
                                context: draft.context,
                                payload: { target, specified: draft.specified },
                              }),
                            ),
                          )
                          .then((r) => {
                            if (r?.ok) setPreview(r.value)
                          })
                      }}
                    >
                      Verifica assegnazioni
                    </Button>
                  </Group>
                </>
              )}
            </Stack>
          )
        )}
      </Modal>
    </>
  )
}
