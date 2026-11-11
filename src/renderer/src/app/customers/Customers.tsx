import { useEffect, useRef, useState } from 'react'
import { Badge, Button, Group, Modal, Stack, TextInput } from '@mantine/core'
import type { PageDto } from '../../../../shared/contracts/master-data'
import type { useArchives } from '../../api/use-archives'
import { useCustomers } from '../../api/use-customers'
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

export function Customers({
  archives,
  onDialogChange,
}: {
  archives: ReturnType<typeof useArchives>
  onDialogChange: (open: boolean) => void
}) {
  const customers = useCustomers(archives)
  const [creating, setCreating] = useState(false)
  const [restorePending, setRestorePending] = useState(false)
  const trigger = useRef<HTMLElement | null>(null)
  const section = useRef<HTMLElement>(null)
  const createButton = useRef<HTMLButtonElement>(null)
  const { busy, editor, preview, history, page } = customers
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
    customers.clearErrors()
    setCreating(false)
  }

  const message = customers.error && (
    <StateMessage kind="error" title="Operazione cliente non riuscita">
      {customers.error}
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
      aria-labelledby="customers-heading"
      tabIndex={-1}
    >
      <div className="ports-workspace">
        <section className="archive-panel port-list" role="group" aria-label="Elenco clienti">
          <Group justify="space-between">
            <h2 id="customers-heading">Clienti</h2>
            <Button
              ref={createButton}
              disabled={busy}
              onClick={() =>
                openDialog(() => {
                  customers.openCreate()
                  setCreating(true)
                })
              }
            >
              Nuovo cliente
            </Button>
          </Group>
          {!opened && message}
          <TextInput
            label="Cerca ragione sociale o codice"
            value={customers.search}
            onChange={(event) => customers.setSearch(event.currentTarget.value)}
          />
          <Stack className="port-list-results" gap="xs" aria-busy={customers.loadingList}>
            {customers.loadingList && <p role="status">Caricamento clienti…</p>}
            {customers.listError && (
              <StateMessage kind="error" title="Elenco clienti">
                {customers.listError}
              </StateMessage>
            )}
            {page && !page.total && (
              <p className="panel-description">
                Nessun elemento trovato. Crea un cliente o modifica la ricerca.
              </p>
            )}
            {page?.items.map((customer) => (
              <Button
                key={customer.id}
                className="customer-list-entry"
                variant={customers.selection === customer.id ? 'light' : 'default'}
                aria-pressed={customers.selection === customer.id}
                disabled={busy}
                onClick={() => customers.select(customer.id)}
              >
                {customer.code} · {customer.version.businessName} ·{' '}
                {customer.status === 'ACTIVE' ? 'Attivo' : 'Disattivato'}
              </Button>
            ))}
          </Stack>
          {page && (
            <PageControls
              page={page}
              disabled={busy || customers.loadingList}
              onPage={customers.setPage}
            />
          )}
        </section>
        <div className="port-inspector" tabIndex={0} aria-label="Consultazione cliente">
          {!history && !customers.loadingDetail && (
            <p>Seleziona un cliente per consultare dettaglio e cronologia.</p>
          )}
          {customers.loadingDetail && <p role="status">Caricamento dettaglio cliente…</p>}
          {customers.detailError && (
            <StateMessage kind="error" title="Dettaglio cliente">
              {customers.detailError}
            </StateMessage>
          )}
          {history && (
            <Stack
              gap="sm"
              role="region"
              aria-label="Dettaglio cliente"
              aria-busy={customers.loadingDetail}
            >
              <h3>
                Cliente {history.customer.code} · {history.customer.version.businessName}
              </h3>
              <Group gap="xs">
                <Badge
                  variant="outline"
                  color={history.customer.status === 'ACTIVE' ? 'teal' : 'gray'}
                >
                  {history.customer.status === 'ACTIVE' ? 'Attivo' : 'Disattivato'}
                </Badge>
                <span>
                  {history.customer.selectable
                    ? 'Selezionabile per nuovi riferimenti'
                    : 'Non selezionabile per nuovi riferimenti'}
                </span>
              </Group>
              <Group gap="xs">
                <Button disabled={busy} onClick={() => openDialog(() => customers.edit())}>
                  Nuova versione cliente
                </Button>
                {history.customer.status === 'ACTIVE' ? (
                  <Button
                    variant="default"
                    disabled={busy}
                    onClick={() =>
                      openDialog(() => void customers.previewChange('DEACTIVATE_CUSTOMER'))
                    }
                  >
                    Disattiva cliente
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    disabled={busy}
                    onClick={() => void customers.reactivate()}
                  >
                    Riattiva cliente
                  </Button>
                )}
                <Button
                  variant="subtle"
                  color="red"
                  disabled={busy}
                  onClick={() => openDialog(() => void customers.previewChange('DELETE_CUSTOMER'))}
                >
                  Elimina cliente
                </Button>
              </Group>
              <Stack gap="xs" role="group" aria-label="Cronologia cliente">
                <h3>Cronologia cliente</h3>
                <p className="panel-description">Inizio incluso, fine esclusa.</p>
                {history.versions.items.map((version) => (
                  <VersionCard
                    key={version.id}
                    version={version}
                    description={version.businessName}
                    disabled={busy}
                    onEdit={() => openDialog(() => customers.edit(version))}
                    onDelete={() =>
                      openDialog(() => void customers.previewChange('DELETE_VERSION', version.id))
                    }
                  />
                ))}
                <PageControls
                  page={history.versions}
                  disabled={busy || customers.loadingDetail}
                  onPage={customers.setHistoryPage}
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
        title="Nuovo cliente"
        size="lg"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void customers.create().then((created) => {
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
              value={customers.businessName}
              error={customers.fields.businessName}
              onChange={(event) => customers.setBusinessName(event.currentTarget.value)}
            />
            {customers.createContext?.revision !== customers.revision && (
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
                onClick={() => void customers.reloadCreate()}
              >
                Ricarica dati
              </Button>
              <Button type="submit" disabled={busy || !customers.createContext}>
                Crea cliente
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        {...modalProps}
        opened={!!editor && !preview}
        onClose={() => !busy && customers.changeEditor(null)}
        title={editor?.versionId ? 'Correggi versione cliente' : 'Nuova versione cliente'}
        size="lg"
      >
        {editor && (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void customers.previewVersion()
            }}
          >
            <Stack>
              {message}
              <TextInput
                label="Ragione sociale"
                data-autofocus
                required
                disabled={busy || customers.loadingMoment}
                value={editor.businessName}
                error={customers.fields.businessName}
                onChange={(event) =>
                  customers.changeEditor({ ...editor, businessName: event.currentTarget.value })
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
                fields={customers.fields}
                disabled={busy || customers.loadingMoment}
                onResolve={() => void customers.resolveVersion()}
                resolution={customers.resolution}
                onChange={(moment) => customers.changeEditor({ ...editor, moment })}
              />
              {editor.context.revision !== customers.revision && (
                <StateMessage kind="warning" title="Bozza precedente ai dati attuali">
                  Riapri la versione per ripartire dai dati aggiornati.
                </StateMessage>
              )}
              <Group className="form-actions">
                <Button
                  variant="subtle"
                  disabled={busy}
                  onClick={() => customers.changeEditor(null)}
                >
                  Annulla modifica
                </Button>
                <Button type="submit" disabled={busy || customers.loadingMoment}>
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
        onClose={() => !busy && customers.cancelPreview()}
        title="Anteprima cliente e conferma"
        size="xl"
      >
        {preview && (
          <>
            {message}
            <PortConfirmation
              key={preview.previewId}
              preview={preview}
              disabled={busy || customers.loadingEffects}
              revision={customers.revision}
              onConfirm={() => void customers.confirm()}
              onCancel={customers.cancelPreview}
              onPage={(page) => void customers.loadEffects(page)}
            />
          </>
        )}
      </Modal>
    </section>
  )
}
