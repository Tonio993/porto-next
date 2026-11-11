import { useState } from 'react'
import { ActionIcon, Button, Modal, Tooltip } from '@mantine/core'
import {
  IconAnchor,
  IconCheck,
  IconChevronRight,
  IconDatabase,
  IconDeviceDesktop,
  IconInfoCircle,
  IconLock,
  IconX,
} from '@tabler/icons-react'
import { useArchives } from '../api/use-archives'
import { TimeSettings } from './TimeSettings'
import { MasterDataPage } from './MasterDataPage'
import { ArchivePage } from './ArchivePage'

export function App() {
  const archives = useArchives()
  // Remount forms, selections and future previews at every actual activation.
  return (
    <ArchiveWorkspace key={archives.state.context?.sessionId ?? 'closed'} archives={archives} />
  )
}

function ArchiveWorkspace({ archives }: { archives: ReturnType<typeof useArchives> }) {
  const { state, busy, error, notice, setError, setNotice } = archives
  const [section, setSection] = useState('Archivi')
  const [aboutOpened, setAboutOpened] = useState(false)
  const [feedbackInDialog, setFeedbackInDialog] = useState(false)
  const active = state.active

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
        <nav aria-label="Navigazione principale">
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
          {[
            'Anagrafiche',
            'Catalogo e tariffe',
            'Operazioni nave',
            'Prestazioni',
            'Riferimenti temporali',
          ].map((label) => (
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
        </nav>
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
            {active?.name ?? 'Modalità locale'}
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
                  ? section === 'Riferimenti temporali'
                    ? 'Configura il fuso aziendale e verifica gli orari locali.'
                    : section === 'Anagrafiche'
                      ? 'Prepara e consulta le anagrafiche del tuo archivio.'
                      : 'Gestisci il file aperto e le sue copie, tutto dal tuo computer.'
                  : 'Crea un archivio o aprine uno esistente per iniziare.'}
              </p>
            </div>
            <div className="heading-icon">
              <IconAnchor size={31} stroke={1.4} />
            </div>
          </div>

          {error && !feedbackInDialog && (
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
          {notice && !feedbackInDialog && (
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

          {section === 'Riferimenti temporali' && state.context ? (
            <TimeSettings archives={archives} />
          ) : section === 'Anagrafiche' && state.context ? (
            <MasterDataPage archives={archives} onDialogChange={setFeedbackInDialog} />
          ) : section !== 'Archivi' ? (
            <section className="archive-panel">
              <h2>Sezione in preparazione</h2>
              <p>Le funzioni di {section.toLowerCase()} non sono ancora disponibili.</p>
              <Button variant="light" onClick={() => setSection('Archivi')}>
                Torna all’archivio
              </Button>
            </section>
          ) : null}
          <div hidden={section !== 'Archivi'}>
            <ArchivePage archives={archives} />
          </div>

          {section === 'Archivi' && (
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
          )}
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
