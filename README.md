# Porto Next

Gestionale desktop locale per una società di ormeggiatori, con archivi indipendenti, anagrafiche storiche, catalogo, tariffe, operazioni nave e prestazioni libere o da catalogo. Per stato delle consegne, schema e prossimo task consultare il [registro](doc/stato-implementazione-prestazioni.md).

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

## Gestione degli archivi

- Nuovo archivio: scelta di nome e posizione del file `.ormeggi`.
- Apertura di un archivio esistente o di un archivio recente.
- Un archivio attivo alla volta; nessuna riapertura automatica all’avvio.
- Modifica del nome visualizzato, con persistenza immediata. È un metadato tecnico di prova; non rinomina il file.
- Salva con nome: crea una copia completa e passa a utilizzare la copia.
- Backup: crea una copia completa, mantenendo aperto l’originale.
- Chiusura e successiva riapertura, anche da un’altra installazione compatibile.
- Verifica dell’identificativo applicativo, versione dello schema e integrità SQLite.

Creazione, salvataggio con nome e backup richiedono un percorso libero. I file esistenti non vengono sovrascritti, anche se il dialogo nativo permette di selezionarli. L’annullamento del dialogo mantiene lo stato corrente. Se l’apertura di un altro file fallisce, l’archivio attivo rimane utilizzabile.

## Operazioni nave

In **Operazioni nave**, scegli una nave e registra un’entrata, un’uscita o uno spostamento. Controlla l’anteprima degli effetti e conferma: l’entrata apre viaggio, visita e ormeggio; l’uscita li chiude; lo spostamento chiude l’ormeggio di origine e apre quello di destinazione. Se cambia porto, chiude e apre anche la visita, conservando il viaggio. La banchina è facoltativa. Le operazioni previste ed effettuate producono la struttura; quelle mancate richiedono un contesto valido e una tariffa ma non aprono né chiudono permanenze. Lo stato non cambia con il trascorrere del tempo.

Per lo spostamento indica partenza, arrivo e porto/banchina di destinazione; l’origine viene derivata dalla cronologia. I due momenti usano i rispettivi fusi; l’arrivo deve essere successivo alla partenza in UTC. Nella vista **Permanenze**, la consultazione del contesto a un istante UTC attribuisce la partenza all’origine e l’arrivo alla destinazione; durante il trasferimento non esiste un ormeggio applicabile e, fra porti diversi, manca anche la visita.

Il backend determina fuso, porto e momento economico dal contesto. Lo spostamento interno genera una sola componente MOVEMENT alla partenza; quello tra porti genera EXIT alla partenza ed ENTRY all’arrivo, con calcoli e sostituzioni manuali indipendenti. Il totale visualizzato è la somma corrente delle due basi effettive. La consultazione mostra base calcolata, eventuale sostituzione manuale in creazione (anche zero), base effettiva e traccia. Una tariffa intermedia o una variazione delle versioni anagrafiche include nell'anteprima gli effetti sulle attività e li applica atomicamente. Consuntivazione e correzioni operative non sono ancora disponibili.

Usa **Assegna soggetti** nel dettaglio dell’operazione o nella vista **Permanenze** per gestire cliente e agenzia di viaggio, visita e ormeggio. I due soggetti sono indipendenti: ciascuno eredita dal primo valore presente nell’ordine operazione → ormeggio → visita → viaggio. Rimuovere un valore esplicito ripristina l’ereditarietà. Controlla i soggetti effettivi e le fonti nell’anteprima, quindi conferma per aggiornare atomicamente tutte le componenti interessate. Le componenti di uno spostamento tra porti possono avere coppie diverse; i soggetti assenti sono ammessi. I riferimenti già assegnati restano validi dopo la disattivazione, ma non possono essere selezionati nuovamente. Dopo un conflitto, **Ricarica assegnazioni** recupera esplicitamente i valori registrati. [Dettagli e passaggio operativo P13](doc/p13/cliente-e-agenzia-effettivi.md).

In **Prestazioni**, seleziona una nave e usa **Nuova prestazione libera** oppure **Nuova prestazione da catalogo**. Per una libera inserisci descrizione e base EUR positiva; per una prestazione da catalogo scegli un tipo attivo: descrizione corrente, tariffa, scaglione, peso e base sono determinati dal backend. Il dettaglio espone la spiegazione del calcolo e i riferimenti applicati. Una base tariffaria può essere zero; lo stato Mancata non azzera l’importo. Note, cliente e agenzia sono facoltativi.

**Verifica momento e contesto** determina il porto competente e propone le scelte necessarie per porto o orario ambiguo. Entrambe le categorie richiedono una permanenza valida anche se mancate e non possono cadere durante un trasferimento. La libera non richiede una tariffa propria; il catalogo la richiede nel porto e all’istante attribuiti. Il dettaglio mostra contesto e soggetti effettivi con fonti; **Riprendi bozza** conserva i dati dopo la chiusura dell’editor. Dopo un conflitto usa **Ricarica bozza**. Modifica, eliminazione, consuntivazione e ricerca completa seguiranno in P16.

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
    application/          Casi d'uso per archivi, tempo, anagrafiche e anteprime
    domain/               Valori numerici e temporali, sequenze delle versioni
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

## Documentazione

Il [piano](doc/piano-implementazione-prestazioni.md) definisce requisiti, dipendenze e controlli. Il [registro](doc/stato-implementazione-prestazioni.md) riporta lo stato corrente e collega le note dei task. Per sviluppo e manutenzione seguire [AGENTS](AGENTS.md) e la [guida documentale](doc/guida-documentazione.md), consultando le fonti per argomento.

In **Anagrafiche → Porti** sono disponibili ricerca, elenco, dettaglio, cronologia, versioni, disattivazione, riattivazione ed eliminazione consentita. Il dettaglio comprende le banchine del porto, con il proprio ciclo di vita. Un porto con banchine o tariffe è protetto dall'eliminazione. La selezionabilità della banchina dipende sia dal suo stato sia da quello del porto. Le operazioni che richiedono una conferma espongono un'anteprima degli effetti.

**Anagrafiche → Clienti / Agenzie** espone due anagrafiche indipendenti, con la sola ragione sociale. Ricerca storica e per codice, elenco paginato, dettaglio, cronologia e ciclo di vita seguono le stesse convenzioni. Una ragione sociale può appartenere a entrambe le tipologie; dentro ciascuna rimane prenotata fino all’eliminazione dell’identità. I progressivi non vengono riutilizzati. Prima di introdurre una versione con decorrenza occorre confermare il fuso aziendale in **Riferimenti temporali**; ore ambigue e inesistenti sono gestite dal backend. La versione iniziale rimane senza decorrenza.

**Anagrafiche → Navi** gestisce nome di registrazione, IMO facoltativo e testuale, tipologia e dimensione intera non negativa, senza unità di misura. Le tre tipologie tecniche sono Nave normale (`STANDARD`), Nave passeggeri (`PASSENGER`) e Nave ADM (`ADM`), non amministrabili. Ricerca per nome/IMO storico o codice, pagine, dettaglio e cronologia seguono le convenzioni comuni. Nomi e IMO rimangono prenotati fino all’eliminazione consentita dell’identità; il progressivo autonomo non viene riutilizzato. Le versioni datate usano il fuso aziendale confermato. Il backend espone anche la versione applicabile a un istante UTC per le slice successive.

**Catalogo e tariffe → Tipi di prestazione e pesi** offre creazione, ricerca per descrizione corrente, elenco paginato, dettaglio, rinomina, disattivazione, riattivazione ed eliminazione consentita. La descrizione liberata da una rinomina torna disponibile. `entrata`, `uscita` e `spostamento` sono riservati alle operazioni fisse. Il peso iniziale è proposto a `1`, deve essere positivo e conserva tutti i decimali ammessi, anche inseriti con virgola. `rinforzo ormeggio` viene inizializzato una sola volta e non ricompare dopo un’eliminazione legittima. Ogni tipo e operazione fissa ha una sequenza autonoma, inizialmente senza decorrenza. Un tipo utilizzato resta protetto dall’eliminazione. Le variazioni successive dei pesi rimangono P19.

**Catalogo e tariffe → Tariffe** permette di creare, copiare e consultare tariffe complete per porto, con decorrenza nel fuso del porto e configurazioni STANDARD, PASSENGER e ADM. La copia può provenire da un altro porto e produce dati indipendenti. Inserimenti passati, intermedi e futuri mostrano l’anteprima degli intervalli prima della conferma. Il calcolatore seleziona la versione storica della nave e restituisce scaglione, extra, peso, importo base e riferimenti applicati. Prima della prima decorrenza non esiste una tariffa; valori zero sono ammessi. La simulazione non registra attività. Correzione ed eliminazione diretta delle tariffe sono previste in P18.

Con un archivio aperto, **Riferimenti temporali** permette di confermare il fuso aziendale iniziale (proposto `Europe/Rome`) e verificare un orario locale, scegliendo l'occorrenza durante il cambio dell'ora. La verifica non registra attività. Dopo la conferma il fuso non è modificabile in questo rilascio; la configurazione resta nel file, anche nelle copie e nei backup.

Lo spike P00 usa dipendenze di sviluppo isolate e verifica numeri/fusi senza introdurre funzionalità applicative. Dopo `npm ci`, prepararlo ed eseguirlo con:

```powershell
npm --prefix spikes/p00 ci --ignore-scripts
npm run verify:p00
```

Le [istruzioni dello spike](spikes/p00/README.md) distinguono le prove eseguite dagli scenari delle funzionalità future.

## Verifiche e distribuzione

Per frequenza, selezione dei test e riuso della build applicare il [piano §7.3](doc/piano-implementazione-prestazioni.md#73-criteri-comuni-di-completamento). I comandi seguenti coprono i diversi controlli e si scelgono secondo lo step o la milestone da verificare.

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
- `test:packaged`: esegue l'intera suite desktop sul pacchetto Windows, con dati temporanei isolati.
- `dist:win`: installer NSIS in `dist/`.

Il test end-to-end sulla build non confezionata salva schermate in `test-results/`. La verifica del pacchetto esegue le stesse operazioni senza catturare schermate della finestra nascosta. I test usano cartelle temporanee e preferenze isolate; non toccano gli archivi dell’utente. Le variabili `PORTO_TEST_USER_DATA` e `PORTO_TEST_HIDDEN` sono riservate alle verifiche locali.

L’installer di sviluppo non ha firma digitale. Per distribuire il prodotto al pubblico bisognerà configurare la firma e provare l’installazione sul sistema di destinazione.

La verifica npm delle dipendenze distribuite non riporta vulnerabilit?. L?audit completo segnala avvisi moderati relativi a `minimatch` negli strumenti di sviluppo e confezionamento; restano da rivalutare con gli aggiornamenti dei rispettivi pacchetti.
