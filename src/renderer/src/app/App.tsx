import { useEffect, useState, type FormEvent } from 'react'
import { ActionIcon, Badge, Button, Modal, TextInput, Tooltip } from '@mantine/core'
import {
  IconAnchor,
  IconArrowRight,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconCopy,
  IconDatabase,
  IconDeviceDesktop,
  IconDownload,
  IconFileDatabase,
  IconFolderOpen,
  IconInfoCircle,
  IconLock,
  IconPlus,
  IconX,
} from '@tabler/icons-react'
import { useArchives } from '../api/use-archives'

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))

export function App() {
  const archives = useArchives()
  // Remount forms, selections and future previews at every actual activation.
  return (
    <ArchiveWorkspace key={archives.state.context?.sessionId ?? 'closed'} archives={archives} />
  )
}

function ArchiveWorkspace({ archives }: { archives: ReturnType<typeof useArchives> }) {
  const { state, busy, error, notice, setError, setNotice, run, update } = archives
  const [section, setSection] = useState('Archivi')
  const [createOpened, setCreateOpened] = useState(false)
  const [aboutOpened, setAboutOpened] = useState(false)
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
    <div className="desktop-shell" aria-busy={busy}>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <IconAnchor size={27} stroke={1.65} />
          </span>
          <div>
            porto<span className="brand-next">next</span>
            <small>GESTIONE ORMEGGIATORI</small>
          </div>
        </div>
        <div className="sidebar-section-label">SPAZIO DI LAVORO</div>
        <button
          className="nav-item"
          aria-current={section === 'Archivi' ? 'page' : undefined}
          onClick={() => setSection('Archivi')}
        >
          <IconDatabase size={19} />
          Archivi
          <IconChevronRight size={15} />
        </button>
        {['Anagrafiche', 'Catalogo e tariffe', 'Operazioni nave', 'Prestazioni'].map((label) => (
          <button
            key={label}
            className="nav-item"
            disabled={!active || busy}
            aria-current={section === label ? 'page' : undefined}
            onClick={() => setSection(label)}
          >
            {label}
          </button>
        ))}
        <div className="sidebar-local">
          <span className="status-dot" />
          Applicazione locale
          <p>
            I tuoi archivi restano
            <br />
            sul tuo computer.
          </p>
        </div>
        <button className="about-button" onClick={() => setAboutOpened(true)}>
          <IconInfoCircle size={18} />
          Informazioni<span>0.1.0</span>
        </button>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            Spazio di lavoro<span className="breadcrumb-separator">/</span>
            <strong>{section}</strong>
          </div>
          <span className="local-label">
            <IconDeviceDesktop size={16} />
            Modalità locale
          </span>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <p className="eyebrow">IL TUO SPAZIO DI LAVORO</p>
              <h1>
                {section !== 'Archivi'
                  ? section
                  : active
                    ? 'Il tuo archivio'
                    : 'Benvenuto a bordo.'}
              </h1>
              <p className="page-description">
                {active
                  ? 'Gestisci il file aperto e le sue copie, tutto dal tuo computer.'
                  : 'Crea un archivio o aprine uno esistente per iniziare.'}
              </p>
            </div>
            <div className="heading-icon">
              <IconAnchor size={31} stroke={1.4} />
            </div>
          </div>

          {error && (
            <div role="alert" className="message error">
              <IconInfoCircle size={20} />
              <span>{error}</span>
              <ActionIcon
                aria-label="Chiudi messaggio di errore"
                variant="subtle"
                color="red"
                onClick={() => setError(null)}
              >
                <IconX size={17} />
              </ActionIcon>
            </div>
          )}
          {notice && (
            <div role="status" className="message success">
              <IconCheck size={20} />
              <span>{notice}</span>
              <ActionIcon
                aria-label="Chiudi messaggio"
                variant="subtle"
                onClick={() => setNotice(null)}
              >
                <IconX size={17} />
              </ActionIcon>
            </div>
          )}

          {section !== 'Archivi' ? (
            <section className="archive-panel">
              <h2>Sezione in preparazione</h2>
              <p>Le funzioni di {section.toLowerCase()} non sono ancora disponibili.</p>
              <Button variant="light" onClick={() => setSection('Archivi')}>
                Torna all’archivio
              </Button>
            </section>
          ) : !active ? (
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

          <div className="privacy-note">
            <IconLock size={18} stroke={1.6} />
            <div>
              <strong>Un file, un archivio. Sempre a tua disposizione.</strong>
              <p>
                Ogni archivio è indipendente. Puoi chiuderlo, conservarlo e riaprirlo quando ti
                serve.
              </p>
            </div>
          </div>
        </main>
        <footer>
          <span>
            <span className="status-dot" />
            {busy ? 'Operazione in corso…' : active ? 'Archivio aperto' : 'Pronto per iniziare'}
          </span>
          <Tooltip label="Non è necessaria una connessione Internet">
            <span>
              <IconDeviceDesktop size={14} />
              Dati locali
            </span>
          </Tooltip>
        </footer>
      </div>

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
      <Modal
        opened={aboutOpened}
        onClose={() => setAboutOpened(false)}
        title="Informazioni su Porto Next"
        centered
      >
        <div className="about-content">
          <IconAnchor size={38} stroke={1.5} />
          <h2>Porto Next</h2>
          <p>Versione 0.1.0</p>
          <p>Applicazione desktop per la gestione di una società di ormeggiatori.</p>
          <p>
            Questa prima versione permette di creare, aprire e conservare archivi locali
            indipendenti.
          </p>
        </div>
      </Modal>
    </div>
  )
}
