import { VesselFields, vesselSummary } from './VesselFields'
import { useEffect, useRef, useState } from 'react'
import { Badge, Button, Group, Modal, Stack, TextInput } from '@mantine/core'
import type { PageDto } from '../../../../shared/contracts/master-data'
import type { useArchives } from '../../api/use-archives'
import { useVessels } from '../../api/use-vessels'
import { PortConfirmation } from '../ports/PortConfirmation'
import { VersionCard } from '../ports/VersionCard'
import { VersionMomentFields } from '../ports/VersionMomentFields'
import { StateMessage } from '../StateMessage'

function PageControls({
  page,
  disabled,
  onPage,
}: {
  page: PageDto<unknown>
  disabled: boolean
  onPage: (number: number) => void
}) {
  if (page.total <= page.pageSize && page.page === 1) return null
  return (
    <Group gap="xs">
      <Button
        variant="default"
        disabled={disabled || page.page === 1}
        onClick={() => onPage(page.page - 1)}
      >
        Indietro
      </Button>
      <span>
        Pagina {page.page} di {Math.max(1, Math.ceil(page.total / page.pageSize))}
      </span>
      <Button
        variant="default"
        disabled={disabled || page.page * page.pageSize >= page.total}
        onClick={() => onPage(page.page + 1)}
      >
        Avanti
      </Button>
    </Group>
  )
}

export function Vessels({
  archives,
  onDialogChange,
}: {
  archives: ReturnType<typeof useArchives>
  onDialogChange: (open: boolean) => void
}) {
  const vessels = useVessels(archives)
  const [creating, setCreating] = useState(false)
  const [restorePending, setRestorePending] = useState(false)
  const trigger = useRef<HTMLElement | null>(null)
  const section = useRef<HTMLElement>(null)
  const createButton = useRef<HTMLButtonElement>(null)
  const { busy, editor, preview, history, page } = vessels
  const opened = creating || !!editor || !!preview
  useEffect(() => {
    onDialogChange(opened)
    return () => onDialogChange(false)
  }, [opened, onDialogChange])

  function openDialog(action: () => void) {
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    action()
  }
  useEffect(() => {
    if (!restorePending || opened || busy) return
    setRestorePending(false)
    const target = trigger.current
    if (target?.isConnected && !target.matches(':disabled')) target.focus()
    else if (createButton.current && !createButton.current.disabled) createButton.current.focus()
    else section.current?.focus()
  }, [restorePending, opened, busy])

  function restoreFocus() {
    if (!opened) setRestorePending(true)
  }
  function closeCreate() {
    vessels.clearErrors()
    setCreating(false)
  }

  const message = vessels.error && (
    <StateMessage kind="error" title="Operazione nave non riuscita">
      {vessels.error}
    </StateMessage>
  )
  const modalProps = {
    centered: true,
    closeOnClickOutside: false,
    closeOnEscape: !busy,
    returnFocus: false,
    onExitTransitionEnd: restoreFocus,
    closeButtonProps: { disabled: busy },
  }

  return (
    <section
      ref={section}
      className="subjects-page"
      aria-labelledby="vessels-heading"
      tabIndex={-1}
    >
      <div className="ports-workspace">
        <section className="archive-panel port-list" role="group" aria-label="Elenco navi">
          <Group justify="space-between">
            <h2 id="vessels-heading">Navi</h2>
            <Button
              ref={createButton}
              disabled={busy}
              onClick={() =>
                openDialog(() => {
                  vessels.openCreate()
                  setCreating(true)
                })
              }
            >
              Nuova nave
            </Button>
          </Group>
          {!opened && message}
          <TextInput
            label="Cerca nome, IMO o codice"
            value={vessels.search}
            onChange={(event) => vessels.setSearch(event.currentTarget.value)}
          />
          <Stack className="port-list-results" gap="xs" aria-busy={vessels.loadingList}>
            {vessels.loadingList && <p role="status">Caricamento navi…</p>}
            {vessels.listError && (
              <StateMessage kind="error" title="Elenco navi">
                {vessels.listError}
              </StateMessage>
            )}
            {page && !page.total && (
              <p className="panel-description">
                Nessun elemento trovato. Crea una nave o modifica la ricerca.
              </p>
            )}
            {page?.items.map((vessel) => (
              <Button
                key={vessel.id}
                className="vessel-list-entry"
                variant={vessels.selection === vessel.id ? 'light' : 'default'}
                aria-pressed={vessels.selection === vessel.id}
                disabled={busy}
                onClick={() => vessels.select(vessel.id)}
              >
                {vessel.code} · {vessel.version.registeredName} ·{' '}
                {vessel.status === 'ACTIVE' ? 'Attiva' : 'Disattivata'}
              </Button>
            ))}
          </Stack>
          {page && (
            <PageControls
              page={page}
              disabled={busy || vessels.loadingList}
              onPage={vessels.setPage}
            />
          )}
        </section>
        <div className="port-inspector" tabIndex={0} aria-label="Consultazione nave">
          {!history && !vessels.loadingDetail && (
            <p>Seleziona una nave per consultare dettaglio e cronologia.</p>
          )}
          {vessels.loadingDetail && <p role="status">Caricamento dettaglio nave…</p>}
          {vessels.detailError && (
            <StateMessage kind="error" title="Dettaglio nave">
              {vessels.detailError}
            </StateMessage>
          )}
          {history && (
            <Stack
              gap="sm"
              role="region"
              aria-label="Dettaglio nave"
              aria-busy={vessels.loadingDetail}
            >
              <h3>
                Nave {history.vessel.code} · {history.vessel.version.registeredName}
              </h3>
              <p>{vesselSummary(history.vessel.version)}</p>
              <Group gap="xs">
                <Badge
                  variant="outline"
                  color={history.vessel.status === 'ACTIVE' ? 'teal' : 'gray'}
                >
                  {history.vessel.status === 'ACTIVE' ? 'Attiva' : 'Disattivata'}
                </Badge>
                <span>
                  {history.vessel.selectable
                    ? 'Selezionabile per nuovi riferimenti'
                    : 'Non selezionabile per nuovi riferimenti'}
                </span>
              </Group>
              <Group gap="xs">
                <Button disabled={busy} onClick={() => openDialog(() => vessels.edit())}>
                  Nuova versione nave
                </Button>
                {history.vessel.status === 'ACTIVE' ? (
                  <Button
                    variant="default"
                    disabled={busy}
                    onClick={() =>
                      openDialog(() => void vessels.previewChange('DEACTIVATE_VESSEL'))
                    }
                  >
                    Disattiva nave
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    disabled={busy}
                    onClick={() => void vessels.reactivate()}
                  >
                    Riattiva nave
                  </Button>
                )}
                <Button
                  variant="subtle"
                  color="red"
                  disabled={busy}
                  onClick={() => openDialog(() => void vessels.previewChange('DELETE_VESSEL'))}
                >
                  Elimina nave
                </Button>
              </Group>
              <Stack gap="xs" role="group" aria-label="Cronologia nave">
                <h3>Cronologia nave</h3>
                <p className="panel-description">Inizio incluso, fine esclusa.</p>
                {history.versions.items.map((version) => (
                  <VersionCard
                    key={version.id}
                    version={version}
                    description={vesselSummary(version)}
                    disabled={busy}
                    onEdit={() => openDialog(() => vessels.edit(version))}
                    onDelete={() =>
                      openDialog(() => void vessels.previewChange('DELETE_VERSION', version.id))
                    }
                  />
                ))}
                <PageControls
                  page={history.versions}
                  disabled={busy || vessels.loadingDetail}
                  onPage={vessels.setHistoryPage}
                />
              </Stack>
            </Stack>
          )}
        </div>
      </div>

      <Modal
        {...modalProps}
        opened={creating}
        onClose={() => !busy && closeCreate()}
        title="Nuova nave"
        size="lg"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void vessels.create().then((created) => {
              if (created) closeCreate()
            })
          }}
        >
          <Stack>
            {message}
            <VesselFields
              value={vessels.description}
              fields={vessels.fields}
              disabled={busy}
              onChange={vessels.setDescription}
            />
            {vessels.createContext?.revision !== vessels.revision && (
              <StateMessage kind="warning" title="Bozza da aggiornare">
                I dati dell’archivio sono cambiati. Ricarica i dati prima di salvare.
              </StateMessage>
            )}
            <Group className="form-actions">
              <Button variant="default" disabled={busy} onClick={closeCreate}>
                Annulla inserimento
              </Button>
              <Button variant="default" disabled={busy} onClick={() => void vessels.reloadCreate()}>
                Ricarica dati
              </Button>
              <Button type="submit" disabled={busy || !vessels.createContext}>
                Crea nave
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        {...modalProps}
        opened={!!editor && !preview}
        onClose={() => !busy && vessels.changeEditor(null)}
        title={editor?.versionId ? 'Correggi versione nave' : 'Nuova versione nave'}
        size="lg"
      >
        {editor && (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void vessels.previewVersion()
            }}
          >
            <Stack>
              {message}
              <VesselFields
                value={editor}
                fields={vessels.fields}
                disabled={busy || vessels.loadingMoment}
                onChange={(value) => vessels.changeEditor({ ...editor, ...value })}
              />
              {editor.moment && (
                <p className="panel-description">
                  Le decorrenze usano il fuso aziendale. Confermalo in Riferimenti temporali prima
                  di inserire una versione datata.
                </p>
              )}
              <VersionMomentFields
                moment={editor.moment}
                fields={vessels.fields}
                disabled={busy || vessels.loadingMoment}
                onResolve={() => void vessels.resolveVersion()}
                resolution={vessels.resolution}
                onChange={(moment) => vessels.changeEditor({ ...editor, moment })}
              />
              {editor.context.revision !== vessels.revision && (
                <StateMessage kind="warning" title="Bozza precedente ai dati attuali">
                  Riapri la versione per ripartire dai dati aggiornati.
                </StateMessage>
              )}
              <Group className="form-actions">
                <Button variant="subtle" disabled={busy} onClick={() => vessels.changeEditor(null)}>
                  Annulla modifica
                </Button>
                <Button type="submit" disabled={busy || vessels.loadingMoment}>
                  Anteprima versione
                </Button>
              </Group>
            </Stack>
          </form>
        )}
      </Modal>

      <Modal
        {...modalProps}
        opened={!!preview}
        onClose={() => !busy && vessels.cancelPreview()}
        title="Anteprima nave e conferma"
        size="xl"
      >
        {preview && (
          <>
            {message}
            <PortConfirmation
              key={preview.previewId}
              preview={preview}
              disabled={busy || vessels.loadingEffects}
              revision={vessels.revision}
              onConfirm={() => void vessels.confirm()}
              onCancel={vessels.cancelPreview}
              onPage={(page) => void vessels.loadEffects(page)}
            />
          </>
        )}
      </Modal>
    </section>
  )
}
