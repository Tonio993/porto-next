# Stato di implementazione delle prestazioni

Riferimento: [piano di implementazione](piano-implementazione-prestazioni.md).

Ultimo aggiornamento: 10 novembre 2026, completamento P01.

## Baseline

- Commit di partenza esaminato: `acc012e`.
- Stack presente: Electron, React, TypeScript, SQLite, better-sqlite3 e Drizzle.
- Funzioni presenti: creazione/apertura archivi, recenti, nome dell'archivio, copia, backup e chiusura.
- I documenti in `legacy/` descrivono il dominio e un precedente percorso tecnologico. Le dichiarazioni di implementazione Java/Angular non costituiscono avanzamento di questo repository.
- P00 è completato. P01 introduce il contesto applicativo e porta lo schema a v2; i task da P02 in avanti non sono stati avviati.

## Avanzamento

| Task | Stato      | Revisione/commit           | Note                                                                                                |
| ---- | ---------- | -------------------------- | --------------------------------------------------------------------------------------------------- |
| P00  | Completato | Commit di introduzione P00 | [Decisioni](p00/decisioni-iniziali.md), contratti, scenari e spike numerico/temporale.              |
| P01  | Completato | `f9b3dbb`                  | [Contesto applicativo](p01/contesto-applicativo.md); schema v2, contratti e navigazione verificati. |
| P02  | Da avviare | —                          | Numeri esatti e momenti.                                                                            |
| P03  | Da avviare | —                          | Creazione e consultazione porti.                                                                    |
| P04  | Da avviare | —                          | Versioni e ciclo di vita porto.                                                                     |
| P05  | Da avviare | —                          | Banchine.                                                                                           |
| P06  | Da avviare | —                          | Clienti e agenzie.                                                                                  |
| P07  | Da avviare | —                          | Navi.                                                                                               |
| P08  | Da avviare | —                          | Catalogo e pesi iniziali.                                                                           |
| P09  | Da avviare | —                          | Tariffe complete e calcolo base.                                                                    |
| P10  | Da avviare | —                          | Entrata, uscita e permanenze.                                                                       |
| P11  | Da avviare | —                          | Spostamento interno.                                                                                |
| P12  | Da avviare | —                          | Spostamento tra porti.                                                                              |
| P13  | Da avviare | —                          | Soggetti effettivi e fonti.                                                                         |
| P14  | Da avviare | —                          | Prestazione libera.                                                                                 |
| P15  | Da avviare | —                          | Prestazione da catalogo.                                                                            |
| P16  | Da avviare | —                          | Ciclo di vita e ricerca prestazioni.                                                                |
| P17A | Da avviare | —                          | Consuntivazione operazioni e replay.                                                                |
| P17B | Da avviare | —                          | Operazioni retroattive.                                                                             |
| P17C | Da avviare | —                          | Correzione operazioni.                                                                              |
| P17D | Da avviare | —                          | Eliminazione operazioni.                                                                            |
| P18  | Da avviare | —                          | Correzione ed eliminazione tariffe.                                                                 |
| P19  | Da avviare | —                          | Versioni dei pesi.                                                                                  |
| P20  | Da avviare | —                          | Revisione indipendente e rilascio.                                                                  |

Stati utilizzabili: `Da avviare`, `In corso`, `Implementato, da verificare`, `Completato`, `Bloccato` con motivo concreto. Un task parzialmente implementato non viene marcato completato.

Il riferimento P00 è il commit che introduce `doc/p00/decisioni-iniziali.md`, rintracciabile con `git log --diff-filter=A --oneline -- doc/p00/decisioni-iniziali.md`.

## Decisioni e questioni da mantenere visibili

- Perimetro del rilascio: gestione operativa e importi base; regole economiche dinamiche, fatture e contabilità successive.
- I fusi iniziali e la corretta risoluzione dei momenti sono nel rilascio; variazioni/correzioni delle configurazioni dei fusi sono successive.
- L'arrivo degli spostamenti deve essere strettamente successivo alla partenza in UTC, coerentemente con requisiti §2.19 e modello §3.12.8.
- La proposta del modello §3.13 deve essere verificata durante le slice, senza attribuirle anticipatamente lo stato di implementazione confermata.
- Gli ID copiati da «Salva con nome» non identificano la sessione attiva: P01 protegge questo caso mediante il token di sessione.
- P00 adotta UUIDv4, `decimal.js` 10.6.0 e `@js-temporal/polyfill` 0.5.1. Le dipendenze sono isolate nello spike; l'adozione nell'app sarà P02.
- Contratti contestuali: query con sessione, comandi con sessione/revisione; anteprime lato server valide per 15 minuti e legate al relativo comando.
- Limiti tecnici, normalizzazione e rappresentazioni esatte sono fissati nel documento delle decisioni. I tipi TypeScript richiedono sempre validazione runtime.
- La rappresentazione delle note nelle future ristampe va precisata nel modulo fatture, distinguendo snapshot conservato e testo corrente; non blocca questo rilascio operativo.

## Ultimo passaggio di consegne

Attività svolta: P01, coordinamento del ciclo di vita dell’archivio, contratti contestuali e navigazione minima. Base integrata `bb623b9`; implementazione nel commit `f9b3dbb`.

Artefatti principali:

- [Contesto applicativo e istruzioni per i task successivi](p01/contesto-applicativo.md).
- `archive-coordinator.ts`, `archive-files.ts`, facade `archive-service.ts` e validazione runtime del contesto.
- `src/shared/contracts/application.ts`, estensione compatibile del bridge archivi, controller e guardia IPC.
- Invalidazione e ordinamento delle risposte React; workspace ricreato per sessione; sezioni funzionali in preparazione.
- Migrazione `0002_archive_revision.sql`, runner e schema v2. Migrazione `0001` invariata; nessuna nuova dipendenza.
- Test di coordinatore/controller e ampliamento del percorso desktop originale.

Decisioni: un’unica coda condivisa, primitive interne che non si riaccodano, transazioni sincrone, lettura testuale delle revisioni int64. «Salva con nome» cambia token e conserva ID/revisione; backup e no-op non incrementano la revisione. Nessuna divergenza funzionale da P00.

Verifiche completate:

- `npm test`: 37 test passati su 4 file, con SQLite reale nei test di persistenza. Coperti `ARC-01`–`ARC-04`, la guardia di revisione di `IMP-02`, richieste accodate, copie, rollback, revisioni oltre `2^53` e migrazione v1.
- `npm run test:e2e`: build riuscita e percorso desktop offline passato, compreso riavvio, navigazione e reset della bozza dopo la copia.
- `npm run check`: TypeScript ed ESLint passati; il solo Prettier globale segnala i cinque documenti `doc/legacy/00`–`04`, già non conformi prima di P01. Documenti legacy non modificati per questa attività.
- Schermata della build desktop ispezionata; ulteriore percorso guidato sul pacchetto descritto sotto. Non è stata eseguita una sessione manuale umana.

Confezionamento Windows completato tramite `npm run test:packaged`, dopo aver consentito l’accesso alla rete/cache necessario a electron-builder. La prima prova sul pacchetto ha esaurito il limite complessivo di 60 secondi senza fallimenti delle asserzioni già eseguite. Lo scenario ampliato usa ora 90 secondi sulla build e 180 sul pacchetto, con un limite di 10 secondi per singola azione. La ripetizione sullo stesso pacchetto con `node scripts/test-packaged.mjs` è passata: 1 test, 33,6 secondi complessivi. Non è stato necessario ricompilare il pacchetto per questa modifica ai soli test.

Il test del pacchetto è stato eseguito fuori dalla sandbox dell’agente: l’avvio al suo interno è bloccato dagli ACL Windows della directory generata. La sandbox di Electron resta attiva; nessuna modifica agli ACL o alla configurazione di packaging. Il log diagnostico locale è `.local/p01-package-debug.log` (non versionato).

Verifica guidata aggiuntiva sul pacchetto: apertura di un v1 reale, schema aggiornato a v2 con copia preventiva, ID e timestamp originali conservati, revisione iniziale `0`; «Salva con nome» dal menu nativo mentre è aperta Prestazioni torna ad Archivi e scarta la bozza, conservando ID/revisione e cambiando token. Controlli condotti tramite Playwright con finestra nascosta e dati temporanei isolati; script locale `.local/p01-guided.cjs` (non versionato).

Ulteriori controlli: `npx tsc --noEmit -p doc/p00/tsconfig.json` passato; formattazione degli artefatti P01 e differenze Git controllate. Non sono noti difetti di integrità aperti nel perimetro P01. Rimane la sola non conformità di formattazione legacy già presente alla partenza.

Limiti: le nuove sezioni dichiarano l’indisponibilità delle funzioni future. Gli envelope e le guardie sono pronti; non è implementato un motore delle anteprime. Gli adattatori numerici/temporali e il fuso iniziale restano P02.

Prossimo task: **P02**, ragionamento `high`, nuova chat. Leggere le decisioni D02–D04, i contratti P00 e la nota P01; utilizzare il coordinatore già presente per ogni accesso all’archivio.
