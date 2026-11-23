import { useProtectedDraft } from './DraftProtection'
import { useEffect, useRef, useState } from 'react'
import { Button, Group, Modal, Stack, TextInput } from '@mantine/core'
import type { useArchives } from '../api/use-archives'
import { usePorts } from '../api/use-ports'
import { PortDescriptionFields } from './ports/PortDescriptionFields'
import { PortList } from './ports/PortList'
import { PortDetail } from './ports/PortDetail'
import { PortHistory } from './ports/PortHistory'
import { PortVersionForm } from './ports/PortVersionForm'
import { PortConfirmation } from './ports/PortConfirmation'
import { Berths } from './berths/Berths'
import { StateMessage } from './StateMessage'

export function Ports({
  archives,
  onDialogChange,
}: {
  archives: ReturnType<typeof useArchives>
  onDialogChange: (opened: boolean) => void
}) {
  const ports = usePorts(archives, () => {
    setCreating(false)
    setCreateStarted(false)
    setEditorHidden(false)
    setPreviewHidden(false)
  })
  const [creating, setCreating] = useState(false)
  const [createStarted, setCreateStarted] = useState(false)
  const [editorHidden, setEditorHidden] = useState(false)
  const [previewHidden, setPreviewHidden] = useState(false)
  const [berthDialogOpened, setBerthDialogOpened] = useState(false)
  const dialogTrigger = useRef<HTMLElement | null>(null)
  const guard = useProtectedDraft({
    state: ports.busy
      ? 'BUSY'
      : createStarted ||
          !!ports.editor ||
          !!ports.preview ||
          !!ports.draft.name ||
          !!ports.draft.locality
        ? 'DRAFT'
        : 'CLEAN',
    discard: () => {
      setCreating(false)
      setCreateStarted(false)
      setEditorHidden(false)
      setPreviewHidden(false)
      ports.discardDraft()
    },
    recover: () => {},
  })
  function openDialog(action: () => void) {
    dialogTrigger.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    guard.request({
      label: 'avviare il nuovo comando',
      run: () => {
        setEditorHidden(false)
        setPreviewHidden(false)
        action()
      },
    })
  }
  function restoreFocus() {
    if (creating || ports.editor || ports.preview) return
    const target = dialogTrigger.current?.isConnected
      ? dialogTrigger.current
      : document.querySelector<HTMLButtonElement>('.port-list-heading button')
    target?.focus()
  }
  const dialogOpened =
    creating ||
    (!!ports.editor && !editorHidden) ||
    (!!ports.preview && !previewHidden) ||
    berthDialogOpened
  useEffect(() => {
    onDialogChange(dialogOpened)
    return () => onDialogChange(false)
  }, [dialogOpened, onDialogChange])
  const modalError = archives.error && (
    <StateMessage kind="error" title="Operazione non riuscita">
      {archives.error}
    </StateMessage>
  )
  return (
    <>
      {ports.writeRecovery}
      {(editorHidden || previewHidden || (!creating && createStarted)) && (
        <Button
          variant="default"
          onClick={() => {
            if (ports.preview) setPreviewHidden(false)
            else if (ports.editor) setEditorHidden(false)
            else setCreating(true)
          }}
        >
          Riprendi bozza
        </Button>
      )}
      <div className="ports-workspace">
        <PortList
          page={ports.page}
          search={ports.search}
          onSearch={ports.setSearch}
          onSelect={(id) => {
            guard.request({ label: 'cambiare porto', run: () => ports.select(id) })
          }}
          onPage={ports.setPageNumber}
          loading={ports.loadingList}
          disabled={archives.busy}
          selected={ports.selection}
          onCreate={() =>
            openDialog(() => {
              ports.openCreate()
              setCreateStarted(true)
              setCreating(true)
            })
          }
        />
        <div
          className="port-inspector"
          role="region"
          aria-label="Consultazione porto"
          tabIndex={0}
          aria-busy={ports.loadingDetail}
        >
          {ports.loadingDetail && <p role="status">Caricamento dettaglio…</p>}
          {ports.history ? (
            <>
              <PortDetail
                port={ports.history.port}
                disabled={ports.busy}
                onAdd={() => openDialog(() => ports.edit())}
                onDeactivate={() => openDialog(() => void ports.previewPortChange('deactivate'))}
                onReactivate={() => void ports.reactivate()}
                onDelete={() => openDialog(() => void ports.previewPortChange('delete'))}
              />
              <Berths
                key={ports.history.port.id}
                port={ports.history.port}
                archives={archives}
                onDialogChange={setBerthDialogOpened}
              />
              <PortHistory
                history={ports.history}
                loading={ports.loadingDetail}
                disabled={ports.busy}
                onEdit={(version) => openDialog(() => ports.edit(version))}
                onDelete={(id) => openDialog(() => void ports.previewDeleteVersion(id))}
                onPage={ports.setHistoryPage}
              />
            </>
          ) : (
            !ports.loadingDetail && (
              <section className="archive-panel selection-empty">
                <h2>Consulta un porto</h2>
                <p>Seleziona un porto dall’elenco per vedere dati correnti e cronologia.</p>
                <p>Per iniziare un nuovo inserimento, scegli «Nuovo porto».</p>
              </section>
            )
          )}
        </div>
      </div>
      <Modal
        opened={creating}
        onClose={() => !ports.busy && setCreating(false)}
        title="Nuovo porto"
        centered
        size="lg"
        closeButtonProps={{ 'aria-label': 'Chiudi creazione' }}
        closeOnEscape={!ports.busy}
        closeOnClickOutside={false}
        returnFocus={false}
        onExitTransitionEnd={restoreFocus}
      >
        <section aria-label="Creazione porto">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void ports.create().then((created) => {
                if (created) {
                  setCreateStarted(false)
                  setCreating(false)
                }
              })
            }}
          >
            <Stack>
              {ports.writeRecoveryControl}
              {modalError}
              <p className="panel-description">
                Il porto nasce attivo, con una versione iniziale senza decorrenza.
              </p>
              <PortDescriptionFields
                value={ports.draft}
                onChange={(value) => ports.setDraft({ ...ports.draft, ...value })}
                disabled={ports.busy}
                fields={ports.createFields}
              />
              <TextInput
                label="Fuso IANA del porto"
                required
                disabled={ports.busy || !ports.draftContext}
                description="Proposto dal fuso aziendale. Rimane autonomo dopo la creazione."
                value={ports.draft.initialZoneId}
                error={ports.createFields.initialZoneId}
                onChange={(event) =>
                  ports.setDraft({ ...ports.draft, initialZoneId: event.currentTarget.value })
                }
              />
              {ports.draftContext && ports.draftContext.revision !== ports.revision && (
                <StateMessage kind="warning" title="Bozza da aggiornare">
                  I dati dell’archivio sono cambiati. Ricarica i dati prima di salvare.
                </StateMessage>
              )}
              <Group className="form-actions">
                <Button variant="default" disabled={ports.busy} onClick={() => setCreating(false)}>
                  Annulla inserimento
                </Button>
                <Button
                  variant="default"
                  disabled={ports.busy}
                  onClick={() => void ports.reloadCreate()}
                >
                  Ricarica dati
                </Button>
                <Button type="submit" disabled={ports.busy || !ports.draftContext}>
                  Crea porto
                </Button>
              </Group>
            </Stack>
          </form>
        </section>
      </Modal>
      <Modal
        opened={!!ports.editor && !ports.preview && !editorHidden}
        onClose={() => !ports.busy && setEditorHidden(true)}
        title={ports.editor?.versionId ? 'Correggi versione' : 'Nuova versione'}
        centered
        size="lg"
        closeOnClickOutside={false}
        closeOnEscape={!ports.busy}
        closeButtonProps={{ 'aria-label': 'Chiudi editor' }}
        returnFocus={false}
        onExitTransitionEnd={restoreFocus}
      >
        {ports.editor && (
          <>
            {ports.writeRecoveryControl}
            {modalError}
            <PortVersionForm
              draft={ports.editor}
              onChange={ports.changeEditor}
              fields={ports.fields}
              disabled={ports.busy || ports.loadingMoment}
              onPreview={() => void ports.previewVersion()}
              onResolve={() => void ports.resolveVersion()}
              resolution={ports.resolution}
              onCancel={() => ports.changeEditor(null)}
              revision={ports.revision}
            />
          </>
        )}
      </Modal>
      <Modal
        opened={!!ports.preview && !previewHidden}
        onClose={() => !ports.busy && setPreviewHidden(true)}
        title="Anteprima e conferma"
        centered
        size="xl"
        closeOnClickOutside={false}
        closeOnEscape={!ports.busy}
        closeButtonProps={{ 'aria-label': 'Chiudi conferma' }}
        returnFocus={false}
        onExitTransitionEnd={restoreFocus}
      >
        {ports.preview && (
          <>
            {ports.writeRecoveryControl}
            {modalError}
            <PortConfirmation
              key={ports.preview.previewId}
              preview={ports.preview}
              disabled={ports.busy || ports.loadingEffects}
              revision={ports.revision}
              onConfirm={() => void ports.confirm()}
              onCancel={ports.cancelPreview}
              onPage={(page) => void ports.loadEffects(page)}
            />
          </>
        )}
      </Modal>
    </>
  )
}
