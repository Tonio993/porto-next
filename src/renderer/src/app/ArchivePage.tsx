import { useEffect, useState, type FormEvent } from 'react'
import { Badge, Button, Modal, TextInput } from '@mantine/core'
import {
  IconArrowRight,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconCopy,
  IconDownload,
  IconFileDatabase,
  IconFolderOpen,
  IconPlus,
} from '@tabler/icons-react'
import type { useArchives } from '../api/use-archives'

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))

export function ArchivePage({ archives }: { archives: ReturnType<typeof useArchives> }) {
  const { state, busy, setError, setNotice, run, update } = archives
  const [createOpened, setCreateOpened] = useState(false)
  const [newName, setNewName] = useState('')
  const [name, setName] = useState(state.active?.name ?? '')
  const [nameContext, setNameContext] = useState(state.context)
  const [nameDirty, setNameDirty] = useState(false)
  const active = state.active
  const request = state.context ? { context: state.context, payload: null } : undefined

  useEffect(() => {
    if (!nameDirty) {
      setName(active?.name ?? '')
      setNameContext(state.context)
    }
  }, [active?.name, state.context, nameDirty])

  async function create(event: FormEvent) {
    event.preventDefault()
    const next = await update(() => window.archives.create(newName))
    if (next) {
      setCreateOpened(false)
      setNewName('')
    }
  }

  async function rename(event: FormEvent) {
    event.preventDefault()
    if (!nameContext) return
    const renameRequest = { context: nameContext, payload: { name } }
    const next = await update(() => window.archives.rename(renameRequest))
    if (next) {
      setNameDirty(false)
      setNotice('Nome dell’archivio aggiornato.')
    }
  }

  async function backup() {
    const result = await run(() => window.archives.backup(request))
    if (result?.path) setNotice(`Copia di backup creata: ${result.path}`)
  }

  return (
    <>
      {!active ? (
        <>
          <div className="action-grid">
            <section className="action-card create-card">
              <span className="card-icon teal">
                <IconPlus size={26} stroke={1.8} />
              </span>
              <h2>Un nuovo inizio</h2>
              <p>Crea un archivio indipendente e scegli dove conservarlo.</p>
              <Button
                disabled={busy}
                onClick={() => setCreateOpened(true)}
                rightSection={<IconArrowRight size={17} />}
              >
                Nuovo archivio
              </Button>
            </section>
            <section className="action-card">
              <span className="card-icon blue">
                <IconFolderOpen size={26} stroke={1.7} />
              </span>
              <h2>Riprendi il lavoro</h2>
              <p>Apri un file .ormeggi già presente sul tuo computer.</p>
              <Button
                disabled={busy}
                variant="default"
                onClick={() => void update(() => window.archives.open())}
                rightSection={<IconArrowRight size={17} />}
              >
                Apri archivio
              </Button>
            </section>
          </div>
          <section className="recent-section">
            <div className="section-heading">
              <h2>Archivi recenti</h2>
              <span>
                {state.recent.length === 0
                  ? 'Nessun archivio'
                  : `${state.recent.length} ${state.recent.length === 1 ? 'archivio' : 'archivi'}`}
              </span>
            </div>
            {state.recent.length === 0 ? (
              <div className="empty-recent">
                <span>
                  <IconClock size={25} stroke={1.4} />
                </span>
                <div>
                  <h3>Il prossimo accesso sarà più veloce</h3>
                  <p>Gli archivi che apri compariranno qui, pronti per essere riutilizzati.</p>
                </div>
              </div>
            ) : (
              <div className="recent-list">
                {state.recent.map((item) => (
                  <button
                    className="recent-item"
                    key={item.path}
                    disabled={busy}
                    onClick={() => void update(() => window.archives.openRecent(item.path))}
                  >
                    <span className="recent-file-icon">
                      <IconFileDatabase size={23} stroke={1.5} />
                    </span>
                    <span className="recent-file">
                      <strong>{item.name}</strong>
                      <span title={item.path}>{item.path}</span>
                    </span>
                    <span className="recent-date">{formatDate(item.lastOpenedAt)}</span>
                    <IconChevronRight size={18} />
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="archive-panel">
          <div className="archive-title-row">
            <span className="card-icon teal">
              <IconFileDatabase size={28} stroke={1.6} />
            </span>
            <div>
              <span className="eyebrow">ARCHIVIO APERTO</span>
              <h2 data-testid="archive-name">{active.name}</h2>
            </div>
            <Badge variant="light" color="teal" leftSection={<IconCheck size={12} />}>
              Salvato sul computer
            </Badge>
          </div>
          <div className="archive-path">
            <span>Posizione del file</span>
            <p data-testid="archive-path">{active.path}</p>
          </div>
          <div className="archive-meta">
            <div>
              <span>Creato il</span>
              <strong>{formatDate(active.createdAt)}</strong>
            </div>
            <div>
              <span>Ultima modifica</span>
              <strong>{formatDate(active.updatedAt)}</strong>
            </div>
            <div>
              <span>Versione archivio</span>
              <strong>{active.schemaVersion}</strong>
            </div>
          </div>
          <form className="rename-form" onSubmit={(event) => void rename(event)}>
            <TextInput
              label="Nome dell’archivio"
              description="Il nome visualizzato nell’app. Il nome del file rimane invariato."
              value={name}
              onChange={(event) => {
                if (!nameDirty) setNameContext(state.context)
                setName(event.currentTarget.value)
                setNameDirty(event.currentTarget.value !== active.name)
              }}
              maxLength={120}
              disabled={busy}
              required
            />
            <Button
              type="submit"
              variant="light"
              disabled={busy || !name.trim() || name.trim() === active.name}
            >
              Aggiorna nome
            </Button>
            {nameDirty && nameContext?.revision !== state.context?.revision && (
              <Button
                variant="subtle"
                disabled={busy}
                onClick={() => {
                  setName(active.name)
                  setNameContext(state.context)
                  setNameDirty(false)
                  setError(null)
                }}
              >
                Ricarica nome
              </Button>
            )}
          </form>
          <div className="archive-actions">
            <Button
              disabled={busy}
              leftSection={<IconCopy size={17} />}
              onClick={() => void update(() => window.archives.saveAs(request))}
            >
              Salva con nome
            </Button>
            <Button
              disabled={busy}
              variant="default"
              leftSection={<IconDownload size={17} />}
              onClick={() => void backup()}
            >
              Crea copia di backup
            </Button>
            <Button
              disabled={busy}
              variant="subtle"
              color="gray"
              onClick={() => void update(() => window.archives.close(request))}
            >
              Chiudi archivio
            </Button>
          </div>
          <p className="archive-help">
            “Salva con nome” apre la nuova copia. Il backup conserva una copia e lascia aperto
            questo archivio.
          </p>
        </section>
      )}
      <Modal
        opened={createOpened}
        onClose={() => {
          if (!busy) setCreateOpened(false)
        }}
        title="Crea un nuovo archivio"
        centered
        closeButtonProps={{ disabled: busy }}
      >
        <form onSubmit={(event) => void create(event)}>
          <p className="modal-description">
            Dai un nome all’archivio. Nel passaggio successivo scegli dove salvare il file.
          </p>
          <TextInput
            label="Nome dell’archivio"
            placeholder="Es. Archivio società"
            value={newName}
            onChange={(event) => setNewName(event.currentTarget.value)}
            maxLength={120}
            required
            autoFocus
            disabled={busy}
          />
          <div className="modal-actions">
            <Button variant="default" disabled={busy} onClick={() => setCreateOpened(false)}>
              Annulla
            </Button>
            <Button type="submit" loading={busy} disabled={!newName.trim()}>
              Scegli posizione
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
