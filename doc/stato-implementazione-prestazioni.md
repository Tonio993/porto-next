# Stato di implementazione delle prestazioni

Riferimento: [piano di implementazione](piano-implementazione-prestazioni.md).

Ultimo aggiornamento: 10 novembre 2026, completamento P00.

## Baseline

- Commit di partenza esaminato: `acc012e`.
- Stack presente: Electron, React, TypeScript, SQLite, better-sqlite3 e Drizzle.
- Funzioni presenti: creazione/apertura archivi, recenti, nome dell'archivio, copia, backup e chiusura.
- I documenti in `legacy/` descrivono il dominio e un precedente percorso tecnologico. Le dichiarazioni di implementazione Java/Angular non costituiscono avanzamento di questo repository.
- P00 è completato con specifiche, contratti e spike verificato. Le funzionalità applicative da P01 in avanti non sono state avviate.

## Avanzamento

| Task | Stato      | Revisione/commit           | Note                                                                                   |
| ---- | ---------- | -------------------------- | -------------------------------------------------------------------------------------- |
| P00  | Completato | Commit di introduzione P00 | [Decisioni](p00/decisioni-iniziali.md), contratti, scenari e spike numerico/temporale. |
| P01  | Da avviare | —                          | Contesto applicativo per archivio.                                                     |
| P02  | Da avviare | —                          | Numeri esatti e momenti.                                                               |
| P03  | Da avviare | —                          | Creazione e consultazione porti.                                                       |
| P04  | Da avviare | —                          | Versioni e ciclo di vita porto.                                                        |
| P05  | Da avviare | —                          | Banchine.                                                                              |
| P06  | Da avviare | —                          | Clienti e agenzie.                                                                     |
| P07  | Da avviare | —                          | Navi.                                                                                  |
| P08  | Da avviare | —                          | Catalogo e pesi iniziali.                                                              |
| P09  | Da avviare | —                          | Tariffe complete e calcolo base.                                                       |
| P10  | Da avviare | —                          | Entrata, uscita e permanenze.                                                          |
| P11  | Da avviare | —                          | Spostamento interno.                                                                   |
| P12  | Da avviare | —                          | Spostamento tra porti.                                                                 |
| P13  | Da avviare | —                          | Soggetti effettivi e fonti.                                                            |
| P14  | Da avviare | —                          | Prestazione libera.                                                                    |
| P15  | Da avviare | —                          | Prestazione da catalogo.                                                               |
| P16  | Da avviare | —                          | Ciclo di vita e ricerca prestazioni.                                                   |
| P17A | Da avviare | —                          | Consuntivazione operazioni e replay.                                                   |
| P17B | Da avviare | —                          | Operazioni retroattive.                                                                |
| P17C | Da avviare | —                          | Correzione operazioni.                                                                 |
| P17D | Da avviare | —                          | Eliminazione operazioni.                                                               |
| P18  | Da avviare | —                          | Correzione ed eliminazione tariffe.                                                    |
| P19  | Da avviare | —                          | Versioni dei pesi.                                                                     |
| P20  | Da avviare | —                          | Revisione indipendente e rilascio.                                                     |

Stati utilizzabili: `Da avviare`, `In corso`, `Implementato, da verificare`, `Completato`, `Bloccato` con motivo concreto. Un task parzialmente implementato non viene marcato completato.

Il riferimento P00 è il commit che introduce `doc/p00/decisioni-iniziali.md`, rintracciabile con `git log --diff-filter=A --oneline -- doc/p00/decisioni-iniziali.md`.

## Decisioni e questioni da mantenere visibili

- Perimetro del rilascio: gestione operativa e importi base; regole economiche dinamiche, fatture e contabilità successive.
- I fusi iniziali e la corretta risoluzione dei momenti sono nel rilascio; variazioni/correzioni delle configurazioni dei fusi sono successive.
- L'arrivo degli spostamenti deve essere strettamente successivo alla partenza in UTC, coerentemente con requisiti §2.19 e modello §3.12.8.
- La proposta del modello §3.13 deve essere verificata durante le slice, senza attribuirle anticipatamente lo stato di implementazione confermata.
- Gli ID copiati da «Salva con nome» non identificano la sessione attiva: P01 deve proteggere esplicitamente questo caso.
- P00 adotta UUIDv4, `decimal.js` 10.6.0 e `@js-temporal/polyfill` 0.5.1. Le dipendenze sono isolate nello spike; l'adozione nell'app sarà P02.
- Contratti contestuali: query con sessione, comandi con sessione/revisione; anteprime lato server valide per 15 minuti e legate al relativo comando.
- Limiti tecnici, normalizzazione e rappresentazioni esatte sono fissati nel documento delle decisioni. I tipi TypeScript richiedono sempre validazione runtime.
- La rappresentazione delle note nelle future ristampe va precisata nel modulo fatture, distinguendo snapshot conservato e testo corrente; non blocca questo rilascio operativo.

## Ultimo passaggio di consegne

Attività svolta: P00, definizione di decisioni e contratti, dati di accettazione tipizzati e prova circoscritta delle librerie numeriche/temporali.

Artefatti principali:

- [Decisioni e limiti](p00/decisioni-iniziali.md).
- [Contratti compilabili](p00/contratti.ts) e [scenari tipizzati](p00/scenari.mts).
- [Spike ripetibile](../spikes/p00/README.md), con manifest/lockfile separati.
- Comando `npm run verify:p00` aggiunto al manifest principale; nessuna dipendenza di produzione aggiunta.

Verifica numerica/temporale: 21 prove passate su Node.js di sviluppo e 21 sul Node incluso in Electron. Il controllo TypeScript compila contratti e scenari. Gli scenari di dominio futuro restano specifiche, non funzionalità già testate. Nessuna migrazione introdotta; schema applicativo ancora v1.

Controlli eseguiti: `npm run verify:p00`, `npm run typecheck`, `npm run lint`, Prettier sugli artefatti modificati e controllo delle differenze Git. Le prove dell'app desktop e la build del pacchetto non sono richieste da P00 e non sono state rieseguite.

Prossimo task: **P01**, ragionamento `high`, nuova chat. Leggere prima le sezioni D04–D05 delle decisioni, i contratti e i casi `ARC-*`/`IMP-02`. Realizzare coordinatore, token di sessione, revisione persistente, adozione dei contratti e navigazione minima. Gli adattatori numerici/temporali di produzione restano P02.
