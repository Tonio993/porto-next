import { useEffect, useRef, useState } from 'react'
import { Badge, Button, Group, Modal, Stack, TextInput } from '@mantine/core'
import type { PortDto } from '../../../../shared/contracts/ports'
import type { PageDto } from '../../../../shared/contracts/master-data'
import type { useArchives } from '../../api/use-archives'
import { useBerths } from '../../api/use-berths'
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

export function Berths({
  port,
  archives,
  onDialogChange,
}: {
  port: PortDto
  archives: ReturnType<typeof useArchives>
  onDialogChange: (open: boolean) => void
}) {
  const berths = useBerths(archives, port.id)
  const [creating, setCreating] = useState(false)
  const [restorePending, setRestorePending] = useState(false)
  const trigger = useRef<HTMLElement | null>(null)
  const section = useRef<HTMLElement>(null)
  const createButton = useRef<HTMLButtonElement>(null)
  const { busy, editor, preview, history, page } = berths
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
    berths.clearErrors()
    setCreating(false)
  }

  const message = berths.error && (
    <StateMessage kind="error" title="Operazione banchina non riuscita">
      {berths.error}
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
    <section ref={section} className="archive-panel" aria-labelledby="berths-heading" tabIndex={-1}>
      <Stack gap="sm">
        <Group justify="space-between">
          <h2 id="berths-heading">Banchine</h2>
          <Button
            ref={createButton}
            disabled={busy || port.status !== 'ACTIVE'}
            onClick={() =>
              openDialog(() => {
                berths.openCreate()
                setCreating(true)
              })
            }
          >
            Nuova banchina
          </Button>
        </Group>
        {port.status === 'INACTIVE' && (
          <p className="panel-description">
            Il porto è disattivato. Riattivalo per creare banchine e rendere selezionabili quelle
            attive.
          </p>
        )}
        {!opened && message}
        <Stack gap="xs" role="group" aria-label="Elenco banchine" aria-busy={berths.loadingList}>
          {berths.loadingList && <p role="status">Caricamento banchine…</p>}
          {berths.listError && (
            <StateMessage kind="error" title="Elenco banchine">
              {berths.listError}
            </StateMessage>
          )}
          {page && !page.total && (
            <p className="panel-description">Questo porto non ha banchine.</p>
          )}
          {page?.items.map((berth) => (
            <Button
              key={berth.id}
              className="berth-list-entry"
              variant={berths.selection === berth.id ? 'light' : 'default'}
              aria-pressed={berths.selection === berth.id}
              disabled={busy}
              onClick={() => berths.select(berth.id)}
            >
              {berth.code} · {berth.version.name} ·{' '}
              {berth.status === 'ACTIVE' ? 'Attiva' : 'Disattivata'}
            </Button>
          ))}
          {page && (
            <PageControls
              page={page}
              disabled={busy || berths.loadingList}
              onPage={berths.setPage}
            />
          )}
        </Stack>
        {berths.loadingDetail && <p role="status">Caricamento dettaglio banchina…</p>}
        {berths.detailError && (
          <StateMessage kind="error" title="Dettaglio banchina">
            {berths.detailError}
          </StateMessage>
        )}
        {history && (
          <Stack
            gap="sm"
            role="region"
            aria-label="Dettaglio banchina"
            aria-busy={berths.loadingDetail}
          >
            <h3>
              Banchina {history.berth.code} · {history.berth.version.name}
            </h3>
            <Group gap="xs">
              <Badge variant="outline" color={history.berth.status === 'ACTIVE' ? 'teal' : 'gray'}>
                {history.berth.status === 'ACTIVE' ? 'Attiva' : 'Disattivata'}
              </Badge>
              <span>
                {history.berth.selectable
                  ? 'Selezionabile per nuovi riferimenti'
                  : 'Non selezionabile per nuovi riferimenti'}
              </span>
            </Group>
            <Group gap="xs">
              <Button disabled={busy} onClick={() => openDialog(() => berths.edit())}>
                Nuova versione banchina
              </Button>
              {history.berth.status === 'ACTIVE' ? (
                <Button
                  variant="default"
                  disabled={busy}
                  onClick={() => openDialog(() => void berths.previewChange('DEACTIVATE_BERTH'))}
                >
                  Disattiva banchina
                </Button>
              ) : (
                <Button variant="default" disabled={busy} onClick={() => void berths.reactivate()}>
                  Riattiva banchina
                </Button>
              )}
              <Button
                variant="subtle"
                color="red"
                disabled={busy}
                onClick={() => openDialog(() => void berths.previewChange('DELETE_BERTH'))}
              >
                Elimina banchina
              </Button>
            </Group>
            <Stack gap="xs" role="group" aria-label="Cronologia banchina">
              <h3>Cronologia banchina</h3>
              <p className="panel-description">Inizio incluso, fine esclusa.</p>
              {history.versions.items.map((version) => (
                <VersionCard
                  key={version.id}
                  version={version}
                  description={version.name}
                  disabled={busy}
                  onEdit={() => openDialog(() => berths.edit(version))}
                  onDelete={() =>
                    openDialog(() => void berths.previewChange('DELETE_VERSION', version.id))
                  }
                />
              ))}
              <PageControls
                page={history.versions}
                disabled={busy || berths.loadingDetail}
                onPage={berths.setHistoryPage}
              />
            </Stack>
          </Stack>
        )}
      </Stack>

      <Modal
        {...modalProps}
        opened={creating}
        onClose={() => !busy && closeCreate()}
        title="Nuova banchina"
        size="lg"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void berths.create().then((created) => {
              if (created) closeCreate()
            })
          }}
        >
          <Stack>
            {message}
            <TextInput
              label="Nome banchina"
              data-autofocus
              required
              disabled={busy}
              value={berths.name}
              error={berths.fields.name}
              onChange={(event) => berths.setName(event.currentTarget.value)}
            />
            {berths.createContext?.revision !== berths.revision && (
              <StateMessage kind="warning" title="Bozza da aggiornare">
                I dati dell’archivio sono cambiati. Ricarica i dati prima di salvare.
              </StateMessage>
            )}
            <Group className="form-actions">
              <Button variant="default" disabled={busy} onClick={closeCreate}>
                Annulla inserimento
              </Button>
              <Button variant="default" disabled={busy} onClick={() => void berths.reloadCreate()}>
                Ricarica dati
              </Button>
              <Button
                type="submit"
                disabled={busy || !berths.createContext || port.status !== 'ACTIVE'}
              >
                Crea banchina
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        {...modalProps}
        opened={!!editor && !preview}
        onClose={() => !busy && berths.changeEditor(null)}
        title={editor?.versionId ? 'Correggi versione banchina' : 'Nuova versione banchina'}
        size="lg"
      >
        {editor && (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void berths.previewVersion()
            }}
          >
            <Stack>
              {message}
              <TextInput
                label="Nome banchina"
                data-autofocus
                required
                disabled={busy || berths.loadingMoment}
                value={editor.name}
                error={berths.fields.name}
                onChange={(event) =>
                  berths.changeEditor({ ...editor, name: event.currentTarget.value })
                }
              />
              <VersionMomentFields
                moment={editor.moment}
                fields={berths.fields}
                disabled={busy || berths.loadingMoment}
                onResolve={() => void berths.resolveVersion()}
                resolution={berths.resolution}
                onChange={(moment) => berths.changeEditor({ ...editor, moment })}
              />
              {editor.context.revision !== berths.revision && (
                <StateMessage kind="warning" title="Bozza precedente ai dati attuali">
                  Riapri la versione per ripartire dai dati aggiornati.
                </StateMessage>
              )}
              <Group className="form-actions">
                <Button variant="subtle" disabled={busy} onClick={() => berths.changeEditor(null)}>
                  Annulla modifica
                </Button>
                <Button type="submit" disabled={busy || berths.loadingMoment}>
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
        onClose={() => !busy && berths.cancelPreview()}
        title="Anteprima banchina e conferma"
        size="xl"
      >
        {preview && (
          <>
            {message}
            <PortConfirmation
              key={preview.previewId}
              preview={preview}
              disabled={busy || berths.loadingEffects}
              revision={berths.revision}
              onConfirm={() => void berths.confirm()}
              onCancel={berths.cancelPreview}
              onPage={(page) => void berths.loadEffects(page)}
            />
          </>
        )}
      </Modal>
    </section>
  )
}
