import { useEffect, useRef, useState } from 'react'
import { Badge, Button, Group, Modal, Stack, TextInput } from '@mantine/core'
import type { PageDto } from '../../../../shared/contracts/master-data'
import type { useArchives } from '../../api/use-archives'
import { useAgencies } from '../../api/use-agencies'
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

export function Agencies({
  archives,
  onDialogChange,
}: {
  archives: ReturnType<typeof useArchives>
  onDialogChange: (open: boolean) => void
}) {
  const agencies = useAgencies(archives)
  const [creating, setCreating] = useState(false)
  const [restorePending, setRestorePending] = useState(false)
  const trigger = useRef<HTMLElement | null>(null)
  const section = useRef<HTMLElement>(null)
  const createButton = useRef<HTMLButtonElement>(null)
  const { busy, editor, preview, history, page } = agencies
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
    agencies.clearErrors()
    setCreating(false)
  }

  const message = agencies.error && (
    <StateMessage kind="error" title="Operazione agenzia non riuscita">
      {agencies.error}
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
      aria-labelledby="agencies-heading"
      tabIndex={-1}
    >
      <div className="ports-workspace">
        <section className="archive-panel port-list" role="group" aria-label="Elenco agenzie">
          <Group justify="space-between">
            <h2 id="agencies-heading">Agenzie</h2>
            <Button
              ref={createButton}
              disabled={busy}
              onClick={() =>
                openDialog(() => {
                  agencies.openCreate()
                  setCreating(true)
                })
              }
            >
              Nuova agenzia
            </Button>
          </Group>
          {!opened && message}
          <TextInput
            label="Cerca ragione sociale o codice"
            value={agencies.search}
            onChange={(event) => agencies.setSearch(event.currentTarget.value)}
          />
          <Stack className="port-list-results" gap="xs" aria-busy={agencies.loadingList}>
            {agencies.loadingList && <p role="status">Caricamento agenzie…</p>}
            {agencies.listError && (
              <StateMessage kind="error" title="Elenco agenzie">
                {agencies.listError}
              </StateMessage>
            )}
            {page && !page.total && (
              <p className="panel-description">
                Nessun elemento trovato. Crea un’agenzia o modifica la ricerca.
              </p>
            )}
            {page?.items.map((agency) => (
              <Button
                key={agency.id}
                className="agency-list-entry"
                variant={agencies.selection === agency.id ? 'light' : 'default'}
                aria-pressed={agencies.selection === agency.id}
                disabled={busy}
                onClick={() => agencies.select(agency.id)}
              >
                {agency.code} · {agency.version.businessName} ·{' '}
                {agency.status === 'ACTIVE' ? 'Attiva' : 'Disattivata'}
              </Button>
            ))}
          </Stack>
          {page && (
            <PageControls
              page={page}
              disabled={busy || agencies.loadingList}
              onPage={agencies.setPage}
            />
          )}
        </section>
        <div className="port-inspector" tabIndex={0} aria-label="Consultazione agenzia">
          {!history && !agencies.loadingDetail && (
            <p>Seleziona un’agenzia per consultare dettaglio e cronologia.</p>
          )}
          {agencies.loadingDetail && <p role="status">Caricamento dettaglio agenzia…</p>}
          {agencies.detailError && (
            <StateMessage kind="error" title="Dettaglio agenzia">
              {agencies.detailError}
            </StateMessage>
          )}
          {history && (
            <Stack
              gap="sm"
              role="region"
              aria-label="Dettaglio agenzia"
              aria-busy={agencies.loadingDetail}
            >
              <h3>
                Agenzia {history.agency.code} · {history.agency.version.businessName}
              </h3>
              <Group gap="xs">
                <Badge
                  variant="outline"
                  color={history.agency.status === 'ACTIVE' ? 'teal' : 'gray'}
                >
                  {history.agency.status === 'ACTIVE' ? 'Attiva' : 'Disattivata'}
                </Badge>
                <span>
                  {history.agency.selectable
                    ? 'Selezionabile per nuovi riferimenti'
                    : 'Non selezionabile per nuovi riferimenti'}
                </span>
              </Group>
              <Group gap="xs">
                <Button disabled={busy} onClick={() => openDialog(() => agencies.edit())}>
                  Nuova versione agenzia
                </Button>
                {history.agency.status === 'ACTIVE' ? (
                  <Button
                    variant="default"
                    disabled={busy}
                    onClick={() =>
                      openDialog(() => void agencies.previewChange('DEACTIVATE_AGENCY'))
                    }
                  >
                    Disattiva agenzia
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    disabled={busy}
                    onClick={() => void agencies.reactivate()}
                  >
                    Riattiva agenzia
                  </Button>
                )}
                <Button
                  variant="subtle"
                  color="red"
                  disabled={busy}
                  onClick={() => openDialog(() => void agencies.previewChange('DELETE_AGENCY'))}
                >
                  Elimina agenzia
                </Button>
              </Group>
              <Stack gap="xs" role="group" aria-label="Cronologia agenzia">
                <h3>Cronologia agenzia</h3>
                <p className="panel-description">Inizio incluso, fine esclusa.</p>
                {history.versions.items.map((version) => (
                  <VersionCard
                    key={version.id}
                    version={version}
                    description={version.businessName}
                    disabled={busy}
                    onEdit={() => openDialog(() => agencies.edit(version))}
                    onDelete={() =>
                      openDialog(() => void agencies.previewChange('DELETE_VERSION', version.id))
                    }
                  />
                ))}
                <PageControls
                  page={history.versions}
                  disabled={busy || agencies.loadingDetail}
                  onPage={agencies.setHistoryPage}
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
        title="Nuova agenzia"
        size="lg"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void agencies.create().then((created) => {
              if (created) closeCreate()
            })
          }}
        >
          <Stack>
            {message}
            <TextInput
              label="Ragione sociale"
              data-autofocus
              required
              disabled={busy}
              value={agencies.businessName}
              error={agencies.fields.businessName}
              onChange={(event) => agencies.setBusinessName(event.currentTarget.value)}
            />
            {agencies.createContext?.revision !== agencies.revision && (
              <StateMessage kind="warning" title="Bozza da aggiornare">
                I dati dell’archivio sono cambiati. Ricarica i dati prima di salvare.
              </StateMessage>
            )}
            <Group className="form-actions">
              <Button variant="default" disabled={busy} onClick={closeCreate}>
                Annulla inserimento
              </Button>
              <Button
                variant="default"
                disabled={busy}
                onClick={() => void agencies.reloadCreate()}
              >
                Ricarica dati
              </Button>
              <Button type="submit" disabled={busy || !agencies.createContext}>
                Crea agenzia
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        {...modalProps}
        opened={!!editor && !preview}
        onClose={() => !busy && agencies.changeEditor(null)}
        title={editor?.versionId ? 'Correggi versione agenzia' : 'Nuova versione agenzia'}
        size="lg"
      >
        {editor && (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void agencies.previewVersion()
            }}
          >
            <Stack>
              {message}
              <TextInput
                label="Ragione sociale"
                data-autofocus
                required
                disabled={busy || agencies.loadingMoment}
                value={editor.businessName}
                error={agencies.fields.businessName}
                onChange={(event) =>
                  agencies.changeEditor({ ...editor, businessName: event.currentTarget.value })
                }
              />
              {editor.moment && (
                <p className="panel-description">
                  Le decorrenze usano il fuso aziendale. Confermalo in Riferimenti temporali prima
                  di inserire una versione datata.
                </p>
              )}
              <VersionMomentFields
                moment={editor.moment}
                fields={agencies.fields}
                disabled={busy || agencies.loadingMoment}
                onResolve={() => void agencies.resolveVersion()}
                resolution={agencies.resolution}
                onChange={(moment) => agencies.changeEditor({ ...editor, moment })}
              />
              {editor.context.revision !== agencies.revision && (
                <StateMessage kind="warning" title="Bozza precedente ai dati attuali">
                  Riapri la versione per ripartire dai dati aggiornati.
                </StateMessage>
              )}
              <Group className="form-actions">
                <Button
                  variant="subtle"
                  disabled={busy}
                  onClick={() => agencies.changeEditor(null)}
                >
                  Annulla modifica
                </Button>
                <Button type="submit" disabled={busy || agencies.loadingMoment}>
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
        onClose={() => !busy && agencies.cancelPreview()}
        title="Anteprima agenzia e conferma"
        size="xl"
      >
        {preview && (
          <>
            {message}
            <PortConfirmation
              key={preview.previewId}
              preview={preview}
              disabled={busy || agencies.loadingEffects}
              revision={agencies.revision}
              onConfirm={() => void agencies.confirm()}
              onCancel={agencies.cancelPreview}
              onPage={(page) => void agencies.loadEffects(page)}
            />
          </>
        )}
      </Modal>
    </section>
  )
}
