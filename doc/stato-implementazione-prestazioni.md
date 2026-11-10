# Stato di implementazione delle prestazioni

Riferimento: [piano di implementazione](piano-implementazione-prestazioni.md).

Ultimo aggiornamento: 11 novembre 2026, P05 — Banchine.

## Baseline

- Commit di partenza esaminato: `acc012e`.
- Stack presente: Electron, React, TypeScript, SQLite, better-sqlite3 e Drizzle.
- Funzioni presenti: creazione/apertura archivi, recenti, nome dell'archivio, copia, backup e chiusura.
- I documenti in `legacy/` descrivono il dominio e un precedente percorso tecnologico. Le dichiarazioni di implementazione Java/Angular non costituiscono avanzamento di questo repository.
- P00–P04 sono completati. P05 introduce le banchine nel dettaglio del porto e porta lo schema a v6. I task da P06 in avanti restano da avviare.
- UI01 del piano §3.5 è completato e verificato sulla build Electron: [revisione, convenzioni e schermate](ui01/revisione-post-p04.md). UI02–UI04 restano da avviare. Il prossimo task funzionale è P06.

## Avanzamento

| Task | Stato      | Revisione/commit           | Note                                                                                                                            |
| ---- | ---------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| P00  | Completato | Commit di introduzione P00 | [Decisioni](p00/decisioni-iniziali.md), contratti, scenari e spike numerico/temporale.                                          |
| P01  | Completato | `f9b3dbb`                  | [Contesto applicativo](p01/contesto-applicativo.md); schema v2, contratti e navigazione verificati.                             |
| P02  | Completato | `4235f71`                  | [Numeri e tempo](p02/numeri-e-tempo.md); schema v3 e flussi verificati anche nel pacchetto Windows.                             |
| P03  | Completato | `5a6fa8c`                  | [Creazione e consultazione porti](p03/porti.md); schema v4, flusso verificato anche nel pacchetto Windows.                      |
| P04  | Completato | `0be600d`                  | [Versioni e ciclo di vita porto](p04/versioni-e-ciclo-di-vita.md); schema v5 e percorsi verificati anche nel pacchetto Windows. |
| P05  | Completato | `f966ba8`                  | [Banchine](p05/banchine.md), schema v6 e verifica sul pacchetto Windows.                                                        |
| P06  | Da avviare | —                          | Clienti e agenzie.                                                                                                              |
| P07  | Da avviare | —                          | Navi.                                                                                                                           |
| P08  | Da avviare | —                          | Catalogo e pesi iniziali.                                                                                                       |
| P09  | Da avviare | —                          | Tariffe complete e calcolo base.                                                                                                |
| P10  | Da avviare | —                          | Entrata, uscita e permanenze.                                                                                                   |
| P11  | Da avviare | —                          | Spostamento interno.                                                                                                            |
| P12  | Da avviare | —                          | Spostamento tra porti.                                                                                                          |
| P13  | Da avviare | —                          | Soggetti effettivi e fonti.                                                                                                     |
| P14  | Da avviare | —                          | Prestazione libera.                                                                                                             |
| P15  | Da avviare | —                          | Prestazione da catalogo.                                                                                                        |
| P16  | Da avviare | —                          | Ciclo di vita e ricerca prestazioni.                                                                                            |
| P17A | Da avviare | —                          | Consuntivazione operazioni e replay.                                                                                            |
| P17B | Da avviare | —                          | Operazioni retroattive.                                                                                                         |
| P17C | Da avviare | —                          | Correzione operazioni.                                                                                                          |
| P17D | Da avviare | —                          | Eliminazione operazioni.                                                                                                        |
| P18  | Da avviare | —                          | Correzione ed eliminazione tariffe.                                                                                             |
| P19  | Da avviare | —                          | Versioni dei pesi.                                                                                                              |
| P20  | Da avviare | —                          | Revisione indipendente e rilascio.                                                                                              |

Stati utilizzabili: `Da avviare`, `In corso`, `Implementato, da verificare`, `Completato`, `Bloccato` con motivo concreto. Un task parzialmente implementato non viene marcato completato.

Il riferimento P00 è il commit che introduce `doc/p00/decisioni-iniziali.md`, rintracciabile con `git log --diff-filter=A --oneline -- doc/p00/decisioni-iniziali.md`.

## Revisioni grafiche pianificate

Riferimento: piano §3.5. Queste attività hanno stato separato dai task funzionali già completati; la loro pianificazione non costituisce una verifica grafica dell'applicazione.

| ID   | Stato      | Collocazione                    | Risultato e passaggio di consegne                                                                                               |
| ---- | ---------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| UI01 | Completato | Dopo P04, prima di P05–P07.     | [Revisione e convenzioni](ui01/revisione-post-p04.md), 24 schermate ispezionate, 6 percorsi desktop passati sulla build finale. |
| UI02 | Da avviare | Alla chiusura di M1, P00–P08.   | Consolidamento di anagrafiche e catalogo con dati realistici, liste lunghe e stati vuoti.                                       |
| UI03 | Da avviare | Alla chiusura di M3, P09–P16.   | Revisione dei flussi operativi, ricerca, contesto, soggetti, importi ed errori.                                                 |
| UI04 | Da avviare | Dentro P20, prima del rilascio. | Controllo finale di leggibilità, accessibilità e dimensioni supportate, anche sul pacchetto Windows.                            |

UI01 ha completato osservazione dell'app Electron, implementazione delle correzioni grafiche e di usabilità, verifica dei percorsi P03–P04 e documentazione. Sessione/revisione, bozze, anteprime e invalidazione delle risposte sono preservate. Le revisioni successive seguono i criteri del piano e non sostituiscono i controlli tecnici già previsti.

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

## Passaggio precedente — P03

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

## Passaggio precedente — P04

Attività: versioni e ciclo di vita del porto, con riordino frontend circoscritto. Base integrata `ec92739`; implementazione nel commit `0be600d`. Stato: completato e verificato anche nel pacchetto Windows. Dettagli e convenzioni per P05–P07 in [Versioni e ciclo di vita del porto](p04/versioni-e-ciclo-di-vita.md).

Artefatti principali:

- `PortLifecycleService`, dominio della sequenza temporale, repository esteso e analisi delle FK realmente presenti. Cronologia, versioni, stato ed eliminazione con conservazione delle prenotazioni storiche e del contatore.
- `PreviewStore` nello scope di sessione, callback dopo commit nel coordinatore e API specifiche nel contratto/preload/IPC. Anteprime server con scadenza, limite, paginazione, metodo e contesto verificati.
- Migrazione `0005_port_version_moments.sql`, schema v5 e runner; locale, fuso, offset e UTC delle decorrenze conservati insieme. Migrazioni precedenti invariate; nessuna nuova dipendenza.
- `App` separata da `ArchivePage`; navigazione anagrafiche in `MasterDataPage`. `usePorts` separato da elenco, dettaglio, form descrittivo, cronologia, editor e conferma.
- `ResponseScope`, `useApplicationRequest`, errori per campo e scelta delle occorrenze riusati nei casi reali. Operazioni sui file, comandi applicativi e caricamenti delle query distinti; envelope contestuali conservati. Nessun motore CRUD, nuova libreria di stato/routing o modifica CSS globale.
- Test di ciclo di vita SQLite, store delle anteprime, risposte asincrone e due nuovi percorsi desktop; regressioni P00–P03 mantenute.

Decisioni: decorrenze nel fuso del porto con tupla storica conservata nelle correzioni descrittive; istante di osservazione unico per le letture correlate. Le versioni future diventano correnti mediante aggiornamento delle viste, senza scritture o aggiornamento automatico della revisione delle bozze. Anteprime consumate solo dopo commit; no-op senza incremento di revisione. I riferimenti esterni reali sono esposti come blocchi prima di un'eliminazione o di una correzione di versione che richiederebbe integrazione applicativa; nessun dato operativo o consolidamento fittizio.

Verifiche effettuate:

- `npm test`: **93 test passati su 10 file** nel runtime Electron con SQLite reale. Coperti intervalli e versioni passate/intermedie/future, osservazione coerente al confine durante la lettura, versione iniziale, prenotazioni, tuple storiche, progressivi, conferme e no-op, scadenza/consumo/capienza delle anteprime, richieste obsolete, blocchi da FK, rollback dopo prenotazione e dopo eliminazione dei componenti, paginazione completa degli effetti e migrazione v4 → v5. Le regressioni v1/v2/v3 e i controlli IPC rimangono passati.
- `npm run test:e2e`: **5 percorsi desktop passati** sulla build con il riordino frontend e la correzione dell'invalidazione dell'editor: archivi 42,5 s, risposte asincrone/confine temporale 23,3 s, ciclo di vita circa 1,1 minuti, creazione/consultazione 35,7 s e riferimenti temporali 31,5 s; totale 3,3 minuti. Il successivo aggiustamento dell'istante unico di osservazione è coperto dal test SQLite dedicato e dalla nuova build `npm run build`; la prova finale del pacchetto usa quest'ultima build.
- Il percorso asincrono ritarda deliberatamente una risposta dopo il cambio selezione e una risoluzione temporale dopo la chiusura dell'editor. Verifica anche futuro → corrente con orologi controllati soltanto nei processi di test, senza modifiche a revisione o dati.
- `npm run check`: TypeScript ed ESLint passati. Il solo Prettier globale segnala i cinque documenti `doc/legacy/00`–`04`, preesistenti e non modificati. Formattazione dei file interessati verificata separatamente.
- Schermata della cronologia sulla build ispezionata; documenti, collegamenti locali e differenze Git controllati. Percorsi guidati tramite Playwright, con dati temporanei e renderer offline; nessuna sessione manuale umana.

Confezionamento Windows e test sull'eseguibile completati: `node scripts/package.mjs --dir` ha generato il pacchetto dalla build finale; `node scripts/test-packaged.mjs` ha superato **5 percorsi su 5** sullo stesso eseguibile (archivi circa 1,1 minuti, risposte asincrone/confine 23,4 s, ciclo di vita circa 1,1 minuti, creazione/consultazione 34,5 s, tempo 32,4 s; totale 3,8 minuti). Il confezionamento è stato ripetuto dopo le correzioni emerse nella revisione per includere il codice effettivamente consegnato. Le ultime modifiche riguardano soltanto i documenti, quindi non richiedono una nuova build.

Le verifiche desktop vengono eseguite fuori dalla sandbox dell'agente per gli ACL Windows delle directory Electron, come nei task precedenti. Il confezionamento usa l'accesso autorizzato alla rete/cache di electron-builder. La sandbox di Electron e gli ACL restano invariati. La sola non conformità statica preesistente è la formattazione legacy. Non sono noti difetti di integrità aperti nel perimetro P04.

Limiti: la copertura di `CU-ANA-01`–`09` riguarda il porto e i riferimenti del perimetro attuale. Banchine, altre anagrafiche, attività operative, ricalcoli delle attività e protezioni derivanti dalle fatture restano nelle rispettive slice. Quando verranno introdotti nuovi riferimenti ricalcolabili occorrerà integrarli nell'analisi già disponibile prima di consentirne le correzioni. Nessuna variazione del fuso è esposta nel form descrittivo.

Prossima attività: **UI01 — Revisione grafica iniziale post P04**, non avviata; seguire il piano §3.5 e produrre la nota di revisione con convenzioni visive, schermate ispezionate e verifiche effettive. P04 rimane completato. Dopo UI01 procedere con **P05**, non avviato: riutilizzare le convenzioni funzionali P04 e quelle visive UI01 mantenendo tipizzati contratti e repository; controllare lo stato del porto nelle nuove assegnazioni delle banchine, conservare l'appartenenza immutabile e usare un contatore globale della tipologia banchina. La generazione dell'installer e l'installazione non fanno parte di P04.

## Ultimo passaggio di consegne — UI01

Attività: revisione grafica iniziale di struttura comune e Porti, dopo P04. Base `77ff771`; implementazione `b529c2e`, con le tre modifiche documentali iniziali dell'utente conservate. Stato: **completato e verificato sulla build Electron**. Decisioni, convenzioni per P05–P07, immagini e limiti in [Revisione post P04](ui01/revisione-post-p04.md).

Risultato: elenco e dettaglio affiancati con scorrimenti indipendenti; ricerca, selezione e pagine sempre disponibili nell'elenco. Creazione, editor e anteprima diventano dialoghi Mantine, con focus contenuto e ritorno al comando di origine. Cornice comune più compatta, archivio visibile nell'intestazione, tipografia e contrasto migliorati, stati temporali e di anteprima con testo oltre al colore. `StateMessage` è condiviso dai casi reali di errore, conflitto e anteprima. Corretto il difetto preesistente del secondo clic sul selezionato che svuotava il dettaglio.

File principali: `App`, `MasterDataPage`, `Ports`, componenti `ports/`, `TimeSettings`, tema e stili locali; due aggiustamenti circoscritti a `usePorts` per selezione ripetuta ed esito positivo della creazione. Nuovo percorso `tests/e2e/ui01.spec.ts`; adattati i tre percorsi Porti preservando le asserzioni funzionali e aggiungendo caricamento e focus. Backend, main/preload, contratti, schema v5, migrazioni e dipendenze invariati. Non è introdotto un motore CRUD né avviato P05.

Verifiche effettive:

- `npm run test:e2e`: build riuscita, **6 percorsi su 6 passati** in 5,3 minuti sulla build finale, con renderer offline e dati temporanei. Archivi 31,5 s; asincronia/confine temporale 31,3 s; ciclo di vita circa 1,8 minuti; creazione/consultazione 52,7 s; tempo 31,2 s; UI01 circa un minuto.
- Il percorso UI01 copre finestre native 960 × 700 e 1440 × 900, archivio vuoto, 28 porti su due pagine, ricerca con/senza risultati, testo lungo, dettaglio e tre fasi della cronologia, creazione e modifica, anteprime pronta/bloccata/obsoleta, errore per campo, tastiera/focus, bozza conservata nella stessa sessione e scartata alla chiusura. Il blocco è prodotto da un riferimento SQLite reale nel solo archivio temporaneo. Le regressioni verificano copie, reset con «Salva con nome», revisioni, risposte tardive e futuro → corrente senza scritture.
- Contrasto del pulsante verificato dai colori CSS effettivi in Electron: almeno 4,5:1, circa 5:1 normale e 7,18:1 in hover. Ulteriore lettura dei colori di messaggi, campo errato e descrizioni conferma l'applicazione degli stili locali.
- `npm test`: **93 test passati su 10 file**, nel runtime Electron con SQLite reale. `npm run check`: TypeScript ed ESLint passati; Prettier globale segnala soltanto i cinque documenti legacy preesistenti `00`–`04`. Formattazione dei file interessati, differenze Git e collegamenti locali controllati separatamente.
- **24 schermate ispezionate dall'agente**, sette prima e diciassette dopo. Interazioni guidate tramite Playwright in Electron reale; **nessuna sessione manuale umana** o certificazione completa di accessibilità. Avvio desktop fuori dalla sandbox dell'agente per gli ACL Windows, senza modificarli né disattivare la sandbox Electron.

Il pacchetto Windows non è rigenerato in UI01, secondo il piano §7.3: nessuna modifica a risorse distribuite separatamente, migrazioni o dipendenze native; verificata la build Electron. La prova sul pacchetto P04 resta storica. Limiti: cronologia lunga ancora scorribile nel proprio pannello, ulteriori configurazioni DPI e prove umane con tecnologie assistive non eseguite. Non sono noti difetti di integrità aperti nel perimetro UI01; resta la sola non conformità statica legacy già presente.

Il passaggio di consegne da UI01 a **P05 — Banchine** chiedeva di riutilizzare convenzioni funzionali P04 e visive UI01; preservare appartenenza immutabile, contatore globale della tipologia e controlli autorevoli sullo stato del porto nelle nuove assegnazioni. Integrare immediatamente i nuovi riferimenti nelle anteprime e nei vincoli del porto. P06–P07 seguiranno gli stessi criteri mantenendo contratti e repository tipizzati.

## P05 — Banchine

Attività completata dalla base integrata `592af7e` e verificata anche sul pacchetto Windows. La nota documenta le decisioni, il percorso Electron, i contratti e la migrazione v6. [Nota P05](p05/banchine.md).

- Nuova anagrafica subordinata nel dettaglio del porto. L'elenco comprende le banchine disattivate e indica la selezionabilità effettiva. Anteprime e vincoli P04 includono le banchine persistite.
- `npm test` ha superato **100 test su 11 file** con SQLite reale. Sono verificati migrazione v5 e copia preventiva, rollback della migrazione e dei comandi, progressivi, prenotazioni, appartenenza e blocchi referenziali.
- Percorso P05 superato sulla build Electron finale, con archivio v5, focus e cambio sessione. Passati tutti e sette i percorsi desktop, compresi archivi, porti, risposte asincrone, riferimenti temporali e UI01. Verifica guidata a 960 × 700 con nome lungo e ispezione delle schermate.
- Pacchetto Windows x64 in formato directory generato con `node scripts/package.mjs --dir`. I contenuti di main, preload e renderer coincidono con la build. Sull'eseguibile sono passati **2 percorsi su 2**, Banchine con apertura v5 e ciclo di vita del porto.
- `npm run check` ha superato TypeScript ed ESLint. Prettier globale segnala i cinque documenti legacy `00`–`04` già registrati.

Prossima attività **P06 — Clienti e agenzie**. Applicare le convenzioni di P04, UI01 e P05 alle due anagrafiche, mantenendo le identità e le sequenze separate.
