# Consegne storiche P01-P09, UI01-UI02 e M1

Archivio estratto dal registro il 12 novembre 2026. I prossimi task e gli stati citati sotto descrivono il momento delle rispettive consegne. Per il passaggio corrente consultare il [registro](../stato-implementazione-prestazioni.md). Leggere solo le sezioni necessarie alla ricerca storica. Le note dei singoli task conservano decisioni e verifiche dettagliate.

## Passaggio precedente — P01

Attività svolta: P01, coordinamento del ciclo di vita dell’archivio, contratti contestuali e navigazione minima. Base integrata `bb623b9`; implementazione nel commit `f9b3dbb`.

Artefatti principali:

- [Contesto applicativo e istruzioni per i task successivi](../p01/contesto-applicativo.md).
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

Attività: numeri esatti, risoluzione e conservazione dei momenti, fuso iniziale per archivio. Base integrata `c17d6f5`; implementazione nel commit `4235f71`. Dettagli e istruzioni per P03 in [Numeri e tempo](../p02/numeri-e-tempo.md).

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

Attività: creazione, ricerca, elenco paginato e dettaglio dei porti. Base integrata `675d429`; implementazione nel commit `5a6fa8c`. Dettagli e istruzioni per P04 in [Creare e consultare un porto](../p03/porti.md).

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

Attività: versioni e ciclo di vita del porto, con riordino frontend circoscritto. Base integrata `ec92739`; implementazione nel commit `0be600d`. Stato: completato e verificato anche nel pacchetto Windows. Dettagli e convenzioni per P05–P07 in [Versioni e ciclo di vita del porto](../p04/versioni-e-ciclo-di-vita.md).

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

Attività: revisione grafica iniziale di struttura comune e Porti, dopo P04. Base `77ff771`; implementazione `b529c2e`, con le tre modifiche documentali iniziali dell'utente conservate. Stato: **completato e verificato sulla build Electron**. Decisioni, convenzioni per P05–P07, immagini e limiti in [Revisione post P04](../ui01/revisione-post-p04.md).

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

Attività completata dalla base integrata `592af7e` e verificata anche sul pacchetto Windows. La nota documenta le decisioni, il percorso Electron, i contratti e la migrazione v6. [Nota P05](../p05/banchine.md).

- Nuova anagrafica subordinata nel dettaglio del porto. L'elenco comprende le banchine disattivate e indica la selezionabilità effettiva. Anteprime e vincoli P04 includono le banchine persistite.
- `npm test` ha superato **100 test su 11 file** con SQLite reale. Sono verificati migrazione v5 e copia preventiva, rollback della migrazione e dei comandi, progressivi, prenotazioni, appartenenza e blocchi referenziali.
- Percorso P05 superato sulla build Electron finale, con archivio v5, focus e cambio sessione. Passati tutti e sette i percorsi desktop, compresi archivi, porti, risposte asincrone, riferimenti temporali e UI01. Verifica guidata a 960 × 700 con nome lungo e ispezione delle schermate.
- Pacchetto Windows x64 in formato directory generato con `node scripts/package.mjs --dir`. I contenuti di main, preload e renderer coincidono con la build. Sull'eseguibile sono passati **2 percorsi su 2**, Banchine con apertura v5 e ciclo di vita del porto.
- `npm run check` ha superato TypeScript ed ESLint. Prettier globale segnala i cinque documenti legacy `00`–`04` già registrati.

Prossima attività **P06 — Clienti e agenzie**. Applicare le convenzioni di P04, UI01 e P05 alle due anagrafiche, mantenendo le identità e le sequenze separate.

## P06 — Clienti e agenzie

Base rilevata `42275ae`, successiva a `7d182e8` per il solo aggiornamento del README. Copia di lavoro iniziale pulita; aggiornamenti documentali precedenti conservati. Implementazione nel commit `ef6e257`. Decisioni e passaggio di consegne nella [nota P06](../p06/clienti-e-agenzie.md).

- Clienti e Agenzie raggiungibili da Anagrafiche, con ragione sociale, ricerca storica/per codice, elenco paginato, dettaglio, cronologia e ciclo di vita completo. Contratti, servizi, repository, identità, contatori e prenotazioni separati. Nuove versioni nel fuso aziendale confermato; risoluzione autorevole backend e tupla storica conservata.
- Migrazione `0007_customers_agencies.sql`, schema v7. Copia preventiva e conservazione di tutti i dati v6 verificati; rollback completo se fallisce la seconda tipologia. Nessuna migrazione precedente modificata.
- Coordinatore, transazioni, anteprime e guardie IPC esistenti riutilizzati. `requireSelectable` specifici per i futuri riferimenti; disattivazione conservativa ed eliminazione bloccata dalle FK reali. Nessuna assegnazione operativa o fattura anticipata.
- `npm test`: **121 test su 14 file passati**. `npm run check`: TypeScript ed ESLint passati, Prettier segnala soltanto i cinque documenti legacy `00`–`04` preesistenti e non modificati.
- Suite desktop iniziale: **9 percorsi su 9 passati**; **2 prove asincrone P06 su 2 passate**. Dopo gli ultimi ritocchi a paginazione e messaggi, **5 percorsi su 5 passati sulla build finale**, comprendendo i due flussi P06, le due prove asincrone e UI01. Le prove P06 includono v6 → v7, revisioni originali, UTC, FK reali, reset con Salva con nome e persistenza dopo riavvio.
- Pacchetto Windows finale generato con `node scripts/package.mjs --dir`. Tutti e cinque gli artefatti di main, preload e renderer nell’ASAR coincidono con la build. **Tutti gli 11 percorsi verificati sullo stesso eseguibile**: la suite completa ha superato 10 percorsi in 16,2 minuti, fermandosi sullo screenshot iniziale di UI01 nella finestra nascosta. Il solo helper UI01 è stato allineato alla convenzione del pacchetto, escludendo le catture e mantenendo le asserzioni funzionali. La ripetizione mirata di UI01 ha superato **1 percorso su 1** in 1,4 minuti. Nessuna modifica al prodotto o rigenerazione del pacchetto tra queste verifiche.
- **16 schermate finali ispezionate**, otto per tipologia, nella nota P06: archivio vuoto, creazione, cronologia futura, anteprime pronta/obsoleta/bloccata, testo lungo a 960 × 700 e 1440 × 900. I due flussi sono stati ripetuti per le acquisizioni finali: **2 su 2 passati** in 5,2 minuti.

Le prove desktop richiedono l’esecuzione fuori dalla sandbox dell’agente per gli ACL Windows; ACL e sandbox di Electron invariati. Le prove sono guidate tramite Playwright con dati temporanei e renderer offline; nessuna sessione manuale umana dichiarata. Installer e installazione fuori perimetro.

P06 è **completato e verificato**. Non sono noti difetti di integrità aperti nel suo perimetro. Gli ultimi aggiornamenti riguardano soltanto test e documentazione; il pacchetto corrisponde al codice applicativo finale. Resta la formattazione legacy preesistente.

Prossima attività **P07 — Navi**, non avviata. Partire dallo schema v7 e dalle convenzioni P04/UI01/P05/P06, con contratti e repository della nave specifici, prenotazioni storiche di nome/IMO e contatore autonomo. Le future scritture operative verso clienti/agenzie devono invocare i rispettivi controlli di selezionabilità nella stessa transazione e integrare i nuovi riferimenti nelle anteprime e nei ricalcoli.

## P07 — Navi

Base effettiva `093a59b`, implementazione nel commit `856bcbc`; copia di lavoro iniziale pulita e nessun `AGENTS.md` locale. Stato: **completato e verificato sulla build Electron**. Decisioni, file, copertura e schermate nella [nota P07](../p07/navi.md).

- Anagrafiche → Navi: ciclo di vita completo, nome di registrazione, IMO facoltativo testuale, tre tipologie tecniche non amministrabili e dimensione intera non negativa entro il limite P00, senza unità. Contratto, servizio e repository specifici, prenotazioni storiche indipendenti di nome/IMO e contatore autonomo mai riutilizzato.
- Migrazione `0008_vessels.sql`, schema v8. Provati con SQLite reale v7 popolato, conservazione di tutte le righe e metadati, copia preventiva ancora v7 e rollback sull’ultima tabella con sessione precedente conservata. Apertura e migrazione v7 nella build Electron verificate.
- Coordinatore, guardie IPC, anteprime e controlli delle FK reali riutilizzati; risoluzione della versione a un istante UTC e `requireSelectable` pronti per le slice successive. Decorrenze nel fuso aziendale confermato, tuple storiche conservate. Nessuna attività operativa o protezione delle fatture anticipata.
- `npm test`: **137 test su 16 file passati**. `npm run check`: TypeScript ed ESLint passati; Prettier segnala soltanto i cinque documenti legacy già registrati e non modificati. File P07 formattati separatamente; differenze e collegamenti locali controllati.
- `npm run build` riuscito. **Sei percorsi desktop selezionati verificati sulla stessa build finale**: Banchine, ciclo di vita Porti, asincronia Clienti/Agenzie e i due percorsi Navi. Nella prima selezione cinque percorsi sono passati; corretto il solo test di preparazione dell’IMO, la ripetizione mirata del flusso Navi ha superato **1 su 1**. Nessuna ricompilazione tra questi esiti. Coperti copie/sessioni/revisioni, risposte tardive, futuro → corrente senza scritture, riferimenti, focus e riapertura. Tre schermate Navi finali ispezionate.
- Desktop eseguito fuori dalla sandbox dell’agente per il blocco ACL Windows già noto, senza cambiare ACL o sandbox Electron. Prove guidate con dati temporanei e renderer offline; nessuna sessione manuale umana dichiarata.

Non sono noti difetti di integrità aperti nel perimetro P07. Nessuna modifica a dipendenze, runtime, confezionamento o strategia di caricamento delle risorse: secondo §7.3 il pacchetto non viene rigenerato nello step. Le prove P06 del pacchetto restano storiche.

Prossimo task **P08 — Catalogo e pesi iniziali**, seguito da **UI02**. Il catalogo ha descrizioni correnti riutilizzabili dopo rinomina e vincolo monotono di utilizzo; inizializzare `rinforzo ormeggio` una sola volta e creare tipo/peso iniziale atomicamente. Le variazioni successive dei pesi restano P19. Chiudere **M1 sulla build integrata finale dopo le correzioni UI02** con check, suite backend e desktop complete, migrazioni cumulative, trasferibilità, generazione del pacchetto Windows e intera suite sullo stesso eseguibile. Installer e installazione restano P20.

## P08 — Catalogo e pesi iniziali

Base effettiva `75bec7d`, successiva a `3c7f78b` per il solo `AGENTS.md`, tracciato e conservato invariato. Copia iniziale pulita; implementazione nel commit `0e7fc36`. Decisioni, revisione tecnica dopo P08, file e verifiche nella [nota P08](../p08/catalogo-e-pesi-iniziali.md).

- Catalogo e tariffe: gestione completa dei tipi configurabili, descrizione corrente, normalizzazione Unicode e limiti P00, ricerca letterale, filtro di stato, elenco paginato, dettaglio, rinomina, disattivazione, riattivazione ed eliminazione consentita con anteprima. La rinomina libera la descrizione precedente; entrata, uscita e spostamento sono riservati.
- Migrazione `0009_catalog.sql`, schema v9: inizializzazione unica di rinforzo ormeggio e quattro sequenze indipendenti con peso iniziale `1`, senza decorrenza. Tipo, sequenza, peso e metadati sono atomici. Decimali positivi esatti TEXT fino a 256 cifre, vincoli SQLite e indice parziale; nessun uso di REAL.
- `hasEverBeenUsed` monotono e persistente, protetto da trigger contro azzeramento ed eliminazione. `CatalogRepository.markUsed` richiede una transazione già attiva: P15 dovrà chiamarlo nella transazione della prestazione. Eliminazioni protette anche dalle FK reali verso tipo, sequenza e peso; riesame alla conferma, nessun CASCADE applicativo implicito.
- `npm test`: **149 test su 18 file passati**, suite completa nel runtime Electron con SQLite reale. Migrazione v8 popolato, conservazione di tutte le righe e metadati, backup ancora v8 e rollback completo dopo DDL parziale verificati; invariate le migrazioni precedenti.
- `npm run check`: TypeScript ed ESLint passati. Prettier globale segnala soltanto i cinque documenti legacy `00`–`04` preesistenti e non modificati. Formattazione dei file modificati controllata separatamente.
- Build Electron finale verificata: passati i due percorsi catalogo funzionale/asincrono, inclusa apertura e migrazione v8, copia, riavvio e utilizzo monotono. Riusati i due esiti delle regressioni Porti e asincronia Navi, non coinvolti dai ritocchi successivi locali al catalogo. Quattro percorsi selezionati verificati complessivamente; dettagli e impronte della build nella nota. Quattro schermate finali ispezionate e conservate. Prove con file temporanei e renderer offline, senza sessioni manuali umane. Esecuzione desktop autorizzata fuori dalla sandbox dell’agente per gli ACL Windows già noti, senza modificare ACL o sandbox Electron.
- Revisione tecnica §7.2 svolta: riusati coordinatore, primitive numeriche, negozio anteprime, guardie e hook; correzioni circoscritte a DTO di anteprima e identità dei blocchi. Nessuna dipendenza, modifica del runtime, architettura CRUD dinamica o variazione del caricamento delle risorse.

Non sono noti difetti di integrità aperti nel perimetro P08. Rimane la formattazione legacy preesistente; densità dei filtri alla misura minima e altezze con notifiche sono annotate per UI02.

Il prossimo task è **UI02**. **M1 resta aperta** e va chiusa sulla build integrata finale dopo le sue correzioni, con check, suite backend e desktop complete, migrazioni cumulative, trasferibilità, pacchetto Windows e intera suite sullo stesso eseguibile. Il pacchetto non è anticipato in P08 secondo §7.3; le prove storiche non attestano lo schema v9 nel pacchetto. P09 segue il consolidamento con P05/P07/P08 integrati; prestazioni reali e aggiornamento dell’utilizzo arrivano in P15, variazioni dei pesi in P19. Installer e installazione restano P20.

## UI02 — Consolidamento grafico di anagrafiche e catalogo

Base effettiva `57cf2e3`, branch `main`, copia iniziale pulita. Implementazione nel commit `8d420ac`. **Completato e verificato sulla build Electron**. Problemi osservati, convenzioni, prove e limiti nella [nota UI02](../ui02/revisione-anagrafiche-e-catalogo.md). Schema v9 invariato; nessuna modifica a backend, hook asincroni, main/preload, contratti, migrazioni o dipendenze.

- Confrontati Porti, Banchine, Clienti, Agenzie, Navi e Catalogo con dati temporanei realistici, elenchi di 28 elementi, cronologia di 28 versioni su tre pagine, nomi senza spazi e decimale esteso. Finestre native 960 × 700 e 1440 × 900, notifiche aperte, tastiera/focus, stati vuoti, errori e conflitti.
- Workspace adattato allo spazio residuo, righe di selezione e paginazione condivise nei quattro chiamanti equivalenti, filtri catalogo affiancati, ritorno a capo nei dettagli e colonne stabili negli effetti. Eliminato il nome duplicato nel riepilogo Navi; cronologie complete conservate. Nessuna modifica ai contesti originali di bozze/anteprime o al reset di sessione.
- **26 schermate ispezionate dall'agente**, sette iniziali e diciannove finali, con riuso di cinque acquisizioni valide della suite integrata. Prove automatizzate Playwright offline, senza sessioni manuali umane.
- `npm test`: **149 test su 18 file passati**. Esito conservato dopo l'ultima correzione locale di sola presentazione Navi. `npm run check` finale: TypeScript ed ESLint passati; Prettier globale segnala solo i cinque documenti legacy preesistenti `00`–`04`. File modificati formattati separatamente.
- **Tutti i 17 percorsi desktop verificati**: prima esecuzione completa con 15 passati in 19,5 minuti e due arresti, per selettore Banchine e cattura della finestra nascosta Navi. Sulla build aggiornata passati **5 su 5 in 6,9 minuti**, comprendendo Banchine, migrazioni cumulative, UI02 e i due percorsi Navi. Dodici esiti non coinvolti riusati secondo §7.3. Il selettore è allineato al nuovo ordine codice/stato/nome, preservando le asserzioni funzionali.

Le revisioni tecniche dopo P12/P16 e UI03/UI04 restano pianificate. Il prossimo task funzionale è **P09 — Tariffe e calcolatore base**, dopo la chiusura M1; P05/P07/P08 sono integrati. P15 dovrà aggiornare l'utilizzo monotono del catalogo nella transazione della prestazione; le variazioni dei pesi restano P19.

## M1 — Anagrafiche utilizzabili

Stato: **chiusa e verificata anche sul pacchetto Windows**. La chiusura è distinta dal completamento UI02. Evidenze e impronte complete nella [nota UI02/M1](../ui02/revisione-anagrafiche-e-catalogo.md).

- Build finale: main SHA256 `365a246ea4ae480f7d4ce54f73ca68948a4187837996e31378721b3e7d660a2d`, renderer `index-BCkJrz96.js`, CSS `index-DTEK0Ynn.css`. Pacchetto `dist/win-unpacked/Porto Next.exe`, generato dalla stessa build senza ricompilazioni concorrenti; cinque artefatti ASAR confrontati e identici alla build.
- Impronte del pacchetto: eseguibile SHA256 `2d75363e2d4a51a5ea56a55a7420524ae4544bb935aad362821da266c6df03a5`; `resources/app.asar` SHA256 `b5fbf2a3514dc951b507ce50ab69da463e07f207d5df639550ab099f3c2e2e63`. Manifest locali `.local/m1-build-sha256.json` e `.local/m1-package-sha256.json`.
- Migrazioni cumulative v1–v8 → v9 con archivi popolati, confronto di tutte le righe preesistenti, metadati e revisioni conservati, copie preventive ancora nella versione originale, integrità e FK SQLite, quattro pesi iniziali, backup, Salva con nome e riapertura dopo trasferimento. Secondo processo con preferenze vuote verificato; nessuna seconda macchina fisica. I rollback dopo DDL parziale restano coperti dalla suite backend completa.
- `node scripts/package.mjs --dir`: riuscito tramite esecuzione autorizzata dopo il blocco di rete della sandbox sul download Electron. Nessuna modifica ad ACL o sandbox Electron. `node scripts/test-packaged.mjs`: **17 percorsi su 17 passati in 22,6 minuti** sullo stesso eseguibile sopra indicato, con dati temporanei, renderer offline e catture delle finestre nascoste saltate dagli helper. Incluse migrazioni cumulative e trasferimento con preferenze vuote. Eseguibile e ASAR ricontrollati dopo la suite: impronte invariate e contenuti ancora identici alla build. Nessuna ricompilazione o rigenerazione del pacchetto fra i test.

Non sono noti difetti di integrità aperti nel perimetro P00–P08/UI02. Resta la sola non conformità documentale legacy già nota; prove automatizzate e ispezioni dell'agente, senza sessioni manuali umane. Installer e prova d'installazione restano P20. I controlli estesi successivi sono associati a **M2 dopo P13**, insieme ai controlli di ogni slice previsti da §7.3. Prossimo task **P09 — Tariffe e calcolatore base**. Questo era il passaggio a P09 dopo M1; il passaggio corrente segue nella sezione P09.

## P09 — Tariffe e calcolatore base

Base effettiva `3710ecc`, branch `main`, copia iniziale pulita. Implementazione nel commit `1b2f4a5`. Schema v10, migrazione `0010_tariffs.sql`; script distribuiti precedenti invariati. Decisioni, file, copertura e impronte nella [nota P09](../p09/tariffe-e-calcolatore-base.md). Stato: **completato e verificato sulla build Electron**.

- Catalogo e tariffe → Tariffe: creazione completa, copia autonoma anche fra porti, elenco paginato e dettaglio con STANDARD/PASSENGER/ADM, scaglioni ordinari/extra e intervalli storici/correnti/futuri. Anteprima e conferma atomica per tutte le creazioni. Porto immutabile nella bozza; fuso risolto nel backend dal porto, con gap/overlap e tuple storiche.
- Calcolo sincrono riutilizzabile da P10/P15 e simulazione di sola lettura: versione nave storica, configurazione, scaglione, peso, operandi, extra e identificativi. Numeri esatti P02, extra BigInt e arrotondamento del valore tariffario e poi della base. Esempio verificato: tre extra, 115,00 EUR e base 172,50 EUR. Nessuna tariffa prima della prima decorrenza; la simulazione non registra attività o utilizzo del catalogo.
- Tabelle normalizzate con FK reali, CHECK e indici univoci. Integrato il blocco di eliminazione dei porti referenziati. Analisi conservativa delle dipendenze reali rieseguita alla conferma; P10 deve aggiungere analisi per intervallo e ricalcoli atomici delle proprie componenti. Nessuna dipendenza operativa fittizia.
- `npm test`: **169 test su 20 file passati**, suite completa nel runtime Electron con SQLite reale. Migrazione v9 popolata, righe/metadati conservati, backup ancora v9, rollback dopo DDL parziale e sessione precedente conservata. Coperti TAR-01–04, zero, precisione, overflow, configurazioni incomplete, copia indipendente, nave storica, confini temporali, revisioni/sessioni, FK composte/CASCADE e guardie degli otto canali IPC.
- `npm run check`: TypeScript ed ESLint passati; Prettier globale segnala soltanto i cinque documenti legacy `00`–`04` preesistenti. File modificati formattati separatamente. Build Electron riuscita.
- **Sei percorsi desktop selezionati passati**: due P09, due Catalogo, ciclo di vita Porti e Navi. Ultime correzioni locali al simulatore e ai nomi degli indici SQL verificate nuovamente con backend completo; ripetizione dei due percorsi P09 sulla build finale: **2 su 2 passati in 3,1 minuti**. Cinque schermate finali ispezionate e conservate nella nota. Quattro regressioni non coinvolte riusate secondo §7.3. Prove Playwright automatizzate offline, senza sessione manuale umana; esecuzione autorizzata fuori dalla sandbox dell’agente per gli ACL Windows già noti, senza cambiare ACL o sandbox Electron.

Non sono noti difetti di integrità aperti nel perimetro P09. Differenze, formattazione dei file modificati e collegamenti locali verificati.

Correzione/eliminazione diretta delle tariffe restano P18, variazioni dei pesi P19. Limite tecnico: 1000 scaglioni per configurazione, senza troncamento. Nessuna modifica a dipendenze, runtime, packaging o meccanismo di caricamento delle risorse.

Prossimo task **P10 — Entrata, uscita e permanenze**, con P05/P07/P08/P09 integrati. Determinare momento/porto economico dal contesto reale e persistere la traccia nella transazione dell’attività; mantenere distinti calcolo tariffario, sostituzione manuale e base effettiva. Integrare immediatamente i nuovi riferimenti nelle anteprime e nei ricalcoli tariffari e anagrafici. P15 aggiornerà l’utilizzo monotono del catalogo.

**M2 dopo P13** raccoglie check, suite backend e desktop complete, migrazioni cumulative, trasferibilità e pacchetto Windows sulla stessa build integrata finale. Il pacchetto M1 resta verificato storicamente sullo schema v9; P09 non attesta lo schema v10 nel pacchetto. Installer e installazione restano P20.
