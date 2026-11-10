# Porto Next

Scheletro di un gestionale desktop per una società di ormeggiatori. Include la gestione tecnica degli archivi; le logiche di business sono ancora da implementare.

## Tecnologie

- Electron, React e TypeScript.
- Mantine per i componenti dell’interfaccia; risorse e font di sistema disponibili offline.
- SQLite con better-sqlite3 13 e Drizzle ORM.
- electron-vite per sviluppo e compilazione; electron-builder per la distribuzione Windows x64.
- Vitest per i test del backend; Playwright per la verifica della finestra Electron.

## Requisiti e avvio

Per sviluppare: Node.js 24 LTS, npm 11 o successivo e Windows x64. Le dipendenze sono bloccate in `package-lock.json`.

```powershell
npm ci
npm run dev
```

La prima installazione richiede Internet per scaricare i pacchetti e il runtime Electron. L’applicazione compilata funziona localmente senza server o connessioni esterne e include il runtime: l’utente finale non deve installare Node.js.

better-sqlite3 13 include il binario N-API per Windows x64. La ricompilazione automatica di electron-builder è disattivata intenzionalmente: non serve installare Visual Studio per questo progetto. Se si aggiungono altri moduli nativi, occorre rivedere questa scelta. Gli script di distribuzione usano 7-Zip di sistema quando installato nella posizione standard; altrimenti electron-builder scarica il proprio strumento. ? possibile specificare un altro eseguibile con la variabile `ELECTRON_BUILDER_7ZIP_PATH`.

## Funzionalità dello scheletro

- Nuovo archivio: scelta di nome e posizione del file `.ormeggi`.
- Apertura di un archivio esistente o di un archivio recente.
- Un archivio attivo alla volta; nessuna riapertura automatica all’avvio.
- Modifica del nome visualizzato, con persistenza immediata. È un metadato tecnico di prova; non rinomina il file.
- Salva con nome: crea una copia completa e passa a utilizzare la copia.
- Backup: crea una copia completa, mantenendo aperto l’originale.
- Chiusura e successiva riapertura, anche da un’altra installazione compatibile.
- Verifica dell’identificativo applicativo, versione dello schema e integrità SQLite.

Creazione, salvataggio con nome e backup richiedono un percorso libero. I file esistenti non vengono sovrascritti, anche se il dialogo nativo permette di selezionarli. L’annullamento del dialogo mantiene lo stato corrente. Se l’apertura di un altro file fallisce, l’archivio attivo rimane utilizzabile.

## Archivi e salvataggio

Ogni `.ormeggi` è un database SQLite autonomo, con lo stesso schema applicativo e dati indipendenti. Le modifiche confermate vengono scritte direttamente sul file; non esiste un ulteriore comando “Salva”. Le copie mantengono l’identificativo interno dell’archivio d’origine, ma le modifiche successive sono indipendenti.

Il file è conservato nella posizione scelta dall’utente. In `app.getPath('userData')` restano solamente preferenze, percorsi recenti e log. Non salvare percorsi o dati di un archivio nelle preferenze globali, oltre alle informazioni strettamente necessarie per l’elenco dei recenti.

È configurato `journal_mode=DELETE`, con `synchronous=FULL` e vincoli esterni attivi. SQLite può creare un journal ausiliario durante le transazioni o lasciarlo dopo un’interruzione anomala per il recupero: non cancellarlo manualmente. Dopo una chiusura regolare, il solo file `.ormeggi` è trasferibile. Per una copia mentre l’app è aperta usare il comando di backup, basato sull’API SQLite.

Gli archivi vanno utilizzati su disco locale. La prima versione non gestisce condivisione in rete, sincronizzazione tra postazioni, cifratura, autenticazione o allegati. Eventuali allegati che debbano viaggiare nel singolo file dovranno essere memorizzati nel database.

## Struttura

```text
src/
  main/                   Avvio Electron, menu, dialoghi e handler IPC
  preload/                API limitata esposta all’interfaccia
  renderer/src/
    app/                  Interfaccia React e schermate
    api/                  Accesso ai contratti del preload
  backend/
    application/archives/ Gestione del ciclo di vita degli archivi
    domain/               Spazio per il futuro dominio
    infrastructure/
      database/           Connessione, schema e migrazioni
      preferences/        Elenco dei file recenti
  shared/                 Contratti IPC ed errori
migrations/               SQL versionato, incluso nella build
scripts/                  Esecuzione dei test nel runtime Electron
tests/unit/               Persistenza, copie, errori e recenti
tests/e2e/                Flusso completo nella finestra desktop
```

Il renderer non può accedere a Node.js, al filesystem o a SQLite. Il preload espone metodi specifici attraverso `contextBridge`; gli handler verificano il mittente e gli input. Sandbox e isolamento del contesto sono attivi. Navigazione esterna, nuove finestre e permessi non necessari sono disabilitati. La build di produzione imposta una Content Security Policy senza connessioni di rete.

`ArchiveCoordinator` possiede la sessione attiva e la coda condivisa da gestione file e casi d’uso. `ArchiveService` espone la gestione degli archivi; le primitive di `ArchiveFileOperations` non si riaccodano. Una nuova sessione diventa attiva solo dopo i controlli e riceve un token distinto anche con «Salva con nome». Le scritture incrementano una revisione persistente e aggiornano i metadati nella stessa transazione; backup e operazioni senza scritture la conservano. Il processo principale resta il coordinatore delle operazioni brevi; elaborazioni pesanti future andranno spostate in un worker o utility process.

## Evoluzione dello schema

1. Aggiungere un nuovo file SQL numerato in `migrations/` senza modificare migrazioni già distribuite.
2. Aggiornare lo schema Drizzle in `schema.ts`.
3. Registrare il nuovo SQL in `src/backend/infrastructure/database/migrations.ts` e incrementare `SCHEMA_VERSION`.
4. Aggiungere un test di migrazione a partire da un archivio della versione precedente.

I file SQL sono importati nella build con `?raw`: non dipendono dalla directory di lavoro del computer di destinazione. `application_id` identifica il formato Porto Next; `user_version` identifica la versione dello schema. Un archivio più recente dell’app viene rifiutato. Per le future migrazioni, il servizio crea una copia prima dell’aggiornamento e applica gli script in transazione.

## Piano funzionale e specifica P00

Il [piano delle prestazioni](doc/piano-implementazione-prestazioni.md) organizza i task successivi. P00 ha prodotto le [decisioni iniziali](doc/p00/decisioni-iniziali.md), i contratti e gli esempi. P01 introduce il [contesto applicativo dell’archivio](doc/p01/contesto-applicativo.md), la revisione nello schema v2 e la navigazione minima. Il [registro](doc/stato-implementazione-prestazioni.md) indica lo stato effettivo; le sezioni funzionali restano in preparazione.

Lo spike P00 usa dipendenze di sviluppo isolate e verifica numeri/fusi senza introdurre funzionalità applicative. Dopo `npm ci`, prepararlo ed eseguirlo con:

```powershell
npm --prefix spikes/p00 ci --ignore-scripts
npm run verify:p00
```

Le [istruzioni dello spike](spikes/p00/README.md) distinguono le prove eseguite dagli scenari delle funzionalità future.

## Verifiche e distribuzione

```powershell
npm run check
npm test
npm run test:e2e
npm run pack
npm run test:packaged
npm run dist:win
```

- `check`: TypeScript, ESLint e formattazione.
- `test`: test del backend nel runtime Node di Electron, con database temporanei reali.
- `test:e2e`: build e test su Electron con dialoghi nativi simulati; la finestra di test resta nascosta. Verifica anche il funzionamento offline e la persistenza dopo il riavvio. Non occorre scaricare un browser Playwright separato.
- `pack`: applicazione non installata in `dist/win-unpacked/`.
- `test:packaged`: esegue lo stesso test end-to-end sul pacchetto Windows, con dati temporanei isolati.
- `dist:win`: installer NSIS in `dist/`.

Il test end-to-end sulla build non confezionata salva schermate in `test-results/`. La verifica del pacchetto esegue le stesse operazioni senza catturare schermate della finestra nascosta. I test usano cartelle temporanee e preferenze isolate; non toccano gli archivi dell’utente. Le variabili `PORTO_TEST_USER_DATA` e `PORTO_TEST_HIDDEN` sono riservate alle verifiche locali.

L’installer di sviluppo non ha firma digitale. Per distribuire il prodotto al pubblico bisognerà configurare la firma e provare l’installazione sul sistema di destinazione.

La verifica npm delle dipendenze distribuite non riporta vulnerabilit?. L?audit completo segnala avvisi moderati relativi a `minimatch` negli strumenti di sviluppo e confezionamento; restano da rivalutare con gli aggiornamenti dei rispettivi pacchetti.
