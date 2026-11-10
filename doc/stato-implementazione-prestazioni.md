# Stato di implementazione delle prestazioni

Riferimento: [piano di implementazione](piano-implementazione-prestazioni.md).

Ultimo aggiornamento: 10 novembre 2026, completamento P03.

## Baseline

- Commit di partenza esaminato: `acc012e`.
- Stack presente: Electron, React, TypeScript, SQLite, better-sqlite3 e Drizzle.
- Funzioni presenti: creazione/apertura archivi, recenti, nome dell'archivio, copia, backup e chiusura.
- I documenti in `legacy/` descrivono il dominio e un precedente percorso tecnologico. Le dichiarazioni di implementazione Java/Angular non costituiscono avanzamento di questo repository.
- P00–P03 sono completati. P03 introduce creazione e consultazione dei porti e porta lo schema a v4; i task da P04 in avanti non sono stati avviati.

## Avanzamento

| Task | Stato      | Revisione/commit           | Note                                                                                                       |
| ---- | ---------- | -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| P00  | Completato | Commit di introduzione P00 | [Decisioni](p00/decisioni-iniziali.md), contratti, scenari e spike numerico/temporale.                     |
| P01  | Completato | `f9b3dbb`                  | [Contesto applicativo](p01/contesto-applicativo.md); schema v2, contratti e navigazione verificati.        |
| P02  | Completato | `4235f71`                  | [Numeri e tempo](p02/numeri-e-tempo.md); schema v3 e flussi verificati anche nel pacchetto Windows.        |
| P03  | Completato | `5a6fa8c`                  | [Creazione e consultazione porti](p03/porti.md); schema v4, flusso verificato anche nel pacchetto Windows. |
| P04  | Da avviare | —                          | Versioni e ciclo di vita porto.                                                                            |
| P05  | Da avviare | —                          | Banchine.                                                                                                  |
| P06  | Da avviare | —                          | Clienti e agenzie.                                                                                         |
| P07  | Da avviare | —                          | Navi.                                                                                                      |
| P08  | Da avviare | —                          | Catalogo e pesi iniziali.                                                                                  |
| P09  | Da avviare | —                          | Tariffe complete e calcolo base.                                                                           |
| P10  | Da avviare | —                          | Entrata, uscita e permanenze.                                                                              |
| P11  | Da avviare | —                          | Spostamento interno.                                                                                       |
| P12  | Da avviare | —                          | Spostamento tra porti.                                                                                     |
| P13  | Da avviare | —                          | Soggetti effettivi e fonti.                                                                                |
| P14  | Da avviare | —                          | Prestazione libera.                                                                                        |
| P15  | Da avviare | —                          | Prestazione da catalogo.                                                                                   |
| P16  | Da avviare | —                          | Ciclo di vita e ricerca prestazioni.                                                                       |
| P17A | Da avviare | —                          | Consuntivazione operazioni e replay.                                                                       |
| P17B | Da avviare | —                          | Operazioni retroattive.                                                                                    |
| P17C | Da avviare | —                          | Correzione operazioni.                                                                                     |
| P17D | Da avviare | —                          | Eliminazione operazioni.                                                                                   |
| P18  | Da avviare | —                          | Correzione ed eliminazione tariffe.                                                                        |
| P19  | Da avviare | —                          | Versioni dei pesi.                                                                                         |
| P20  | Da avviare | —                          | Revisione indipendente e rilascio.                                                                         |

Stati utilizzabili: `Da avviare`, `In corso`, `Implementato, da verificare`, `Completato`, `Bloccato` con motivo concreto. Un task parzialmente implementato non viene marcato completato.

Il riferimento P00 è il commit che introduce `doc/p00/decisioni-iniziali.md`, rintracciabile con `git log --diff-filter=A --oneline -- doc/p00/decisioni-iniziali.md`.

## Decisioni e questioni da mantenere visibili

- Perimetro del rilascio: gestione operativa e importi base; regole economiche dinamiche, fatture e contabilità successive.
- I fusi iniziali e la corretta risoluzione dei momenti sono nel rilascio; variazioni/correzioni delle configurazioni dei fusi sono successive.
- L'arrivo degli spostamenti deve essere strettamente successivo alla partenza in UTC, coerentemente con requisiti §2.19 e modello §3.12.8.
- La proposta del modello §3.13 deve essere verificata durante le slice, senza attribuirle anticipatamente lo stato di implementazione confermata.
- Gli ID copiati da «Salva con nome» non identificano la sessione attiva: P01 protegge questo caso mediante il token di sessione.
- P00 adotta UUIDv4, `decimal.js` 10.6.0 e `@js-temporal/polyfill` 0.5.1. P02 adotta le due librerie nelle dipendenze applicative; lo spike resta isolato.
- Contratti contestuali: query con sessione, comandi con sessione/revisione; anteprime lato server valide per 15 minuti e legate al relativo comando.
- Limiti tecnici, normalizzazione e rappresentazioni esatte sono fissati nel documento delle decisioni. I tipi TypeScript richiedono sempre validazione runtime.
- La rappresentazione delle note nelle future ristampe va precisata nel modulo fatture, distinguendo snapshot conservato e testo corrente; non blocca questo rilascio operativo.

## Passaggio precedente — P01

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

## Passaggio precedente — P02

Attività: numeri esatti, risoluzione e conservazione dei momenti, fuso iniziale per archivio. Base integrata `c17d6f5`; implementazione nel commit `4235f71`. Dettagli e istruzioni per P03 in [Numeri e tempo](p02/numeri-e-tempo.md).

Artefatti principali:

- `src/backend/domain/values/numbers.ts`: EUR, centesimi int64 e fattori decimali con arrotondamento commerciale; `decimal.js` 10.6.0 in produzione.
- `moments.ts`, `moment-storage.ts` e `src/shared/contracts/values.ts`: risoluzione backend, scelta degli offset e conservazione della tupla locale/fuso/offset/UTC; `@js-temporal/polyfill` 0.5.1 in produzione.
- `TimeService`, repository, preload e canali IPC specifici, con sessione e revisione controllate dal coordinatore P01.
- Migrazione `0003_company_time_zone.sql`, runner e schema v3; `0001` e `0002` invariati. Configurazione validata prima di attivare un archivio e dentro la transazione di migrazione.
- `TimeSettings.tsx`: scelta iniziale e verifica di orari nella sezione Riferimenti temporali; adattatore degli input numerici italiani, test unitari/SQLite/IPC e percorso desktop dedicato.

Decisioni: il fuso proposto è `Europe/Rome`, da confermare o sostituire una sola volta durante la configurazione iniziale. La decorrenza resta assente; nessuna UI di variazione dei fusi. Il fuso del porto viene predisposto come valore autonomo, da persistere in P03. Gli offset storici possono contenere secondi: lettura e visualizzazione non ricalcolano gli istanti salvati con le nuove regole IANA. Gli importi non transitano da `number`. Nessuna nuova regola funzionale oltre alle decisioni P00.

Verifiche:

- `npm test`: 63 test passati su 6 file nel runtime Electron, con SQLite reale. Compresi `NUM-01`–`NUM-05`, `TEM-01`–`TEM-04`, precisione al limite di 256 cifre, centesimi oltre `2^53`, overflow e rollback, migrazioni v1/v2, copie preventive, fusi storici e richieste di altre sessioni.
- `npm run test:e2e`: build riuscita, 2 percorsi desktop offline passati. Il percorso P02 avvia il processo con `TZ=America/New_York` e conferma gli UTC attesi per Roma, riapertura e indipendenza delle copie.
- `npm run check`: TypeScript ed ESLint passati; Prettier globale segnala soltanto i cinque documenti `doc/legacy/00`–`04`, già non conformi prima di P02. I documenti legacy non sono modificati.
- Pacchetto Windows generato con `node scripts/package.mjs --dir`, dopo la build di `npm run test:packaged`. Ripetizione finale con `node scripts/test-packaged.mjs`: 2 test passati sullo stesso eseguibile, percorso archivi in 32,5 secondi e percorso temporale in 34,5 secondi. Le ultime modifiche riguardavano solo test e documenti: nessuna ricompilazione del pacchetto necessaria.
- Schermata del percorso temporale sulla build ispezionata. I test del pacchetto non acquisiscono screenshot della finestra nascosta, seguendo la convenzione P01: il primo tentativo P02 si era fermato sull'acquisizione diagnostica dopo aver verificato entrambe le occorrenze.

Per il confezionamento è stato necessario l'accesso autorizzato alla rete/cache di electron-builder. I test dell'eseguibile richiedono l'esecuzione fuori dalla sandbox dell'agente per gli ACL Windows della directory generata, come in P01; la sandbox di Electron e gli ACL restano invariati. Non è stata eseguita una sessione manuale umana.

Non sono noti difetti di integrità aperti nel perimetro P02. Resta la sola non conformità di formattazione legacy già presente alla partenza. Documenti modificati, collegamenti locali e differenze Git controllati.

Limiti di perimetro: la verifica degli orari non registra attività; i porti saranno introdotti in P03 e le relative attività nelle slice operative. Gli editor economici, il calcolatore tariffario, le variazioni dei fusi e gli altri task successivi restano indisponibili. La creazione dell'installer e l'installazione non fanno parte di P02.

Prossimo task: **P03**, nuova chat con ragionamento `medium`, partendo dai risultati P00–P02. Leggere il contesto P01 e la nota P02; usare il coordinatore condiviso e creare identità, progressivo, versione iniziale, prenotazione e fuso autonomo del porto nella stessa transazione.

## Ultimo passaggio di consegne — P03

Attività: creazione, ricerca, elenco paginato e dettaglio dei porti. Base integrata `675d429`; implementazione nel commit `5a6fa8c`. Dettagli e istruzioni per P04 in [Creare e consultare un porto](p03/porti.md).

Artefatti principali:

- `PortService`, `PortRepository`, normalizzazione degli identificativi e contratti `ports.ts` con API `create`, `list`, `get`.
- Selettore paese con codici ISO alpha-2 condivisi e denominazioni localizzate; validazione autorevole backend di testi, paese, fuso e query.
- Migrazione `0004_ports.sql`, runner e schema v4: identità, contatore, versioni, prenotazioni e fusi separati, con FK e indici univoci. Migrazioni precedenti invariate.
- Preload, main e guardie IPC; `Ports.tsx` nella sezione Anagrafiche, con errori per campo, conflitti e recupero della revisione aggiornata.
- Test SQLite dei porti, verifica di tutti i nuovi canali IPC e percorso desktop offline dedicato. Aspettative delle regressioni di migrazione v1/v2 aggiornate allo schema corrente.

Decisioni: chiave porto su tre colonne normalizzate obbligatorie; contatore autonomo persistente entro il limite P00; versione descrittiva e fuso iniziale separati. Il fuso aziendale è una proposta: la creazione registra esplicitamente il fuso autonomo del porto senza confermare o modificare quello aziendale. La ricerca usa le prenotazioni e confronti Unicode coerenti con P00. Nessuna nuova dipendenza, nessuna divergenza funzionale dal piano.

Verifiche completate:

- `npm test`: **74 test passati su 7 file**, nel runtime Electron con SQLite reale. Coperti duplicati Unicode e chiavi composte, limiti e progressivi non riutilizzati, errore forzato sull'ultima scrittura con rollback di tutte le parti e dei metadati, vincoli sulle versioni iniziali/FK, copie e backup, contesti obsoleti e migrazione v3. Restano passate le regressioni v1/v2 e numerico-temporali.
- `npm run test:e2e`: build riuscita. Esecuzione finale della suite sulla stessa build tramite `node node_modules/@playwright/test/cli.js test`, fuori dalla sandbox dell'agente: **3 percorsi desktop passati** (archivi 31,7 s, porti 35,5 s, tempo 31,5 s). Il primo tentativo P03 ha richiesto la correzione del selettore del campo obbligatorio Località, la cui etichetta include l'asterisco di Mantine; la ripetizione nella sandbox ha incontrato il blocco ACL Windows all'avvio di Electron ed è stata interrotta.
- `npm run check`: TypeScript ed ESLint passati. Il solo controllo Prettier globale segnala i cinque documenti `doc/legacy/00`–`04`, già non conformi prima di P03 e non modificati. Formattazione dei file P03 verificata separatamente.
- `node scripts/package.mjs --dir`: pacchetto Windows generato con accesso autorizzato alla rete/cache di electron-builder. Il primo tentativo nella sandbox non poteva raggiungere GitHub per il download di Electron.
- `node scripts/test-packaged.mjs`, fuori dalla sandbox dell'agente: **3 percorsi passati** sul pacchetto (archivi circa 60 s, porti 36,4 s, tempo 32,3 s; totale 2,2 minuti). La prova P03 comprende recupero dopo conflitto di revisione, reset della bozza con «Salva con nome», rifiuto della richiesta della sessione precedente, riavvio e indipendenza dell'originale.
- Schermata del percorso P03 sulla build ispezionata; differenze Git, documenti e collegamenti locali controllati. Non è stata eseguita una sessione manuale umana.

Le verifiche desktop richiedono l'esecuzione fuori dalla sandbox dell'agente per gli ACL Windows delle directory Electron. La sandbox di Electron e gli ACL restano invariati. Il pacchetto è stato generato dalla build finale del codice; gli ultimi aggiornamenti riguardano soltanto la documentazione. Non sono noti difetti di integrità aperti nel perimetro P03. Resta la non conformità di formattazione legacy già presente alla partenza.

Limiti: la parte di `CU-ANA-01`–`03` relativa ai porti è disponibile; cronologia, nuove versioni, correzioni, stato ed eliminazione restano P04. Non sono introdotte variazioni dei fusi, banchine o attività operative. La generazione dell'installer e l'installazione non fanno parte di P03.

Prossimo task: **P04**, nella stessa chat P03, ragionamento consigliato `high`. Riutilizzare convenzioni e transazione del primo flusso completo, conservare le prenotazioni storiche e separare sempre le versioni descrittive dalla configurazione del fuso. P04 non è stato avviato.
