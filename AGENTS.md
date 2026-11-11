# Istruzioni per lo sviluppo di Porto Next

Queste indicazioni si applicano a tutto il repository. Seguire le istruzioni dell'utente e realizzare il task assegnato fino alla verifica e al passaggio di consegne. Il riferimento per perimetro, dipendenze e controlli è il [piano di implementazione](doc/piano-implementazione-prestazioni.md), in particolare §§2, 3, 7.3 e 7.5.

## Avvio di un task e fonti

1. Controllare branch, `git status`, differenze e commit recenti. Preservare le modifiche preesistenti e identificarne l'impatto sul lavoro richiesto.
2. Leggere la scheda del task nel piano e lo stato corrente nel [registro](doc/stato-implementazione-prestazioni.md). Usare l'ultimo passaggio pertinente, distinguendolo dalle consegne storiche che riportano il prossimo task dell'epoca.
3. Leggere le [decisioni P00](doc/p00/decisioni-iniziali.md), i contratti e gli scenari collegati per le regole coinvolte. Consultare le note delle dipendenze e le sole sezioni legacy pertinenti.
4. Individuare il percorso reale UI → preload → IPC → applicazione → SQLite, i chiamanti delle primitive condivise e i test già disponibili.
5. Scegliere i controlli dello step e la milestone successiva secondo la matrice sotto, ampliando la copertura quando cambia codice condiviso.

I documenti `doc/legacy/` descrivono anche un precedente progetto Java/Angular. Lo stack e l'avanzamento di questo repository si ricavano dal codice e dal registro. Un conflitto funzionale effettivo va documentato nelle decisioni prima di implementare il comportamento controverso. Le normali scelte tecniche si risolvono nel perimetro del task.

Mantenere questo file coerente con il piano quando cambiano le regole operative. Lo stato dei task, i numeri di schema e gli esiti delle prove vanno aggiornati nel registro e nelle note di consegna.

## Ambiente, perimetro e qualità delle modifiche

- Ambiente di riferimento Windows x64, PowerShell, Node.js 24 e npm 11 o successivo. Usare le dipendenze bloccate nel lockfile e gli script di `package.json`.
- Applicazione desktop Electron/React/TypeScript, Mantine, SQLite, better-sqlite3 e Drizzle. Il prodotto deve funzionare offline con risorse locali.
- Procedere per incrementi verticali utilizzabili. Attivare soltanto i comandi completati e rendere riconoscibile l'indisponibilità delle funzioni future.
- Riutilizzare logica e componenti esistenti preservandone il comportamento. Mantenere servizi e repository tipizzati per il dominio. Estrarre primitive condivise quando giustificate dai casi reali.
- Mantenere le modifiche circoscritte. Evitare motori CRUD dinamici, schemi EAV/JSON per le anagrafiche, dipendenze aggiuntive e riscritture architetturali prive di necessità nel task.
- Integrare subito nei comandi esistenti i nuovi riferimenti, vincoli e ricalcoli introdotti dalla slice. Verificare tutti i chiamanti coinvolti dalla modifica di una primitiva condivisa.
- Usare `rg` per ricerche mirate. Conservare gli artefatti diagnostici nelle directory locali ignorate, preferibilmente `.local/`, e i risultati dei test in `test-results/`.
- Effettuare commit quando autorizzati dall'utente, con contenuto coerente e file controllati. In caso di lavoro concorrente usare checkout separati e coordinare migrazioni, contratti, IPC, navigazione e documentazione condivisi.

## Responsabilità e sicurezza Electron

| Area                          | Responsabilità                                                           |
| ----------------------------- | ------------------------------------------------------------------------ |
| `src/backend/domain/`         | Regole pure e valori, senza dipendenze da SQLite, IPC o stato globale.   |
| `src/backend/application/`    | Casi d'uso, validazione autorevole, transazioni e analisi degli effetti. |
| `src/backend/infrastructure/` | Repository, persistenza, migrazioni e preferenze tecniche.               |
| `src/shared/contracts/`       | DTO e API tipizzate condivise.                                           |
| `src/main/` e `src/preload/`  | Avvio, menu, dialoghi, guardie IPC e bridge limitato.                    |
| `src/renderer/src/`           | Presentazione, adattamento degli input e stato delle viste.              |

Il renderer accede ai casi d'uso attraverso metodi specifici del preload. Tenere attivi sandbox, isolamento del contesto, controllo del mittente/frame IPC e protezioni di navigazione. Le regole di dominio e le autorizzazioni del contesto si verificano nel backend anche per invocazioni IPC dirette. Validare forma, campi inattesi e limiti degli input. Gli errori distinguono campo, conflitto e vincolo, con messaggi italiani. SQL e stack restano nei log tecnici.

## Archivio, transazioni e contesto

- `ArchiveCoordinator` possiede sessione attiva e coda condivisa tra comandi funzionali e operazioni sui file. Costruire i repository nella sessione corrente. Le primitive già eseguite nella coda devono evitare di riaccodarsi ricorsivamente.
- Un archivio `.ormeggi` è un database autonomo. Dati funzionali e configurazione aziendale appartengono al file. Le preferenze globali contengono informazioni tecniche, inclusi i percorsi recenti necessari.
- Le query verificano la sessione. I comandi verificano archivio, sessione e revisione all'esecuzione, prima di leggere o scrivere dati del file attivo.
- `sessionId` cambia a ogni attivazione effettiva, compreso «Salva con nome». L'ID dell'archivio copiato può restare identico. Una richiesta della sessione precedente deve essere respinta.
- Le transazioni SQLite sono sincrone. Tenere `await`, dialoghi e attese umane fuori dalla transazione. Scritture funzionali, contatori, prenotazioni e metadati devono riuscire o fallire insieme.
- Il coordinatore incrementa una volta revisione e timestamp per una transazione che cambia dati. Letture, backup, rollback e no-op conservano la revisione. Confrontare le revisioni come interi esatti tramite `BigInt`.
- Mantenere le garanzie esistenti di apertura, chiusura, copia e backup. Per copiare un archivio aperto usare le primitive SQLite già adottate. Preservare l'archivio attivo se l'apertura di un altro file fallisce.

## Anteprime e conferme

Usare il protocollo P00/P04 per i comandi che richiedono l'anteprima degli effetti.

- Il backend valida e simula senza scrivere, restituendo `READY` o `BLOCKED`, riepilogo completo, effetti paginati, avvisi e blocchi.
- `PreviewStore` conserva input validato e operazione nel namespace del caso d'uso, legati a sessione e revisione. Applicare scadenza di 15 minuti e limite di 32 anteprime per sessione secondo P00.
- La conferma invia ID dell'anteprima e contesto originale. Il backend ricontrolla tipo di operazione, scadenza, sessione, revisione e vincoli e applica tutti gli effetti atomicamente.
- Consumare l'anteprima solo dopo il commit. La paginazione degli effetti riguarda la consultazione, mentre la conferma applica l'operazione completa.
- Invalidare le anteprime al cambio sessione e riconoscere quelle obsolete dopo nuove scritture. Un esito incerto di scrittura richiede verifica, evitando ripetizioni automatiche del comando.

## Schema, migrazioni e riferimenti

1. Aggiungere il prossimo SQL numerato in `migrations/`, preservando gli script già distribuiti.
2. Aggiornare lo schema Drizzle in `schema.ts`, registrare il SQL con `?raw` nel runner e incrementare `SCHEMA_VERSION`.
3. Mantenere copia preventiva e migrazione transazionale, identificativo applicativo, controllo delle versioni più recenti e conservazione dei metadati.
4. Rafforzare i vincoli locali con FK, indici e CHECK appropriati. Le versioni iniziali richiedono unicità parziale perché una UNIQUE ordinaria con NULL è insufficiente.
5. Verificare aggiornamento da archivio popolato della versione precedente, dati conservati, copia preventiva e rollback anche dopo scritture parziali della migrazione.

Le eliminazioni analizzano i riferimenti reali prima della scrittura, comprese FK composte o configurate con CASCADE. I componenti posseduti dall'entità si eliminano esplicitamente nella stessa transazione. I riferimenti esterni richiedono il trattamento applicativo previsto. Quando una slice introduce dipendenze ricalcolabili, completarne l'analisi e il ricalcolo nei comandi già disponibili.

## Anagrafiche, catalogo e invarianti di dominio

- Identità tecnica, codice progressivo, versioni descrittive e stato corrente sono distinti. Generare UUIDv4 nel backend. Usare contatori persistenti autonomi per tipologia, mai COUNT/MAX dopo eliminazioni. Il progressivo delle banchine è globale fra i porti.
- Normalizzazione delle chiavi `trim → NFC → toUpperCase() → NFC`. Conservare accenti e spazi interni. Ripulire i valori visualizzati soltanto agli estremi e usare i limiti Unicode P00.
- Prenotare gli identificativi storici fino all'eliminazione dell'intera anagrafica. Per le navi nomi e IMO hanno prenotazioni indipendenti, con IMO facoltativo testuale secondo P07.
- Versione iniziale senza decorrenza, correggibile e non eliminabile. Versioni successive complete con inizio incluso e fine esclusa. Rifiutare nuove versioni identiche alla precedente e conservare separatamente le versioni divenute adiacenti identiche dopo correzione.
- La disattivazione conserva i riferimenti esistenti. I nuovi riferimenti richiedono `requireSelectable` o controllo equivalente nella stessa transazione. La risoluzione storica di una versione rimane distinta dalla selezionabilità corrente.
- Appartenenza della banchina immutabile. Selezionabilità derivata da stato proprio e del porto. La presenza di banchine, anche disattivate, blocca l'eliminazione del porto.
- Clienti e agenzie mantengono identità, contatori, prenotazioni e contratti separati. Campi, tipologie nave e significato della dimensione seguono P00/P07.
- Il catalogo ha una descrizione corrente riutilizzabile dopo rinomina. Un tipo già utilizzato resta protetto dall'eliminazione anche dopo la cancellazione delle prestazioni. Persistire atomicamente la prova monotona di utilizzo. Inizializzare `rinforzo ormeggio` una sola volta e creare tipo e peso iniziale nella stessa transazione.

Per le slice operative applicare il piano §2 e gli scenari pertinenti. `PLANNED` e `PERFORMED` determinano permanenze, `MISSED` segue i vincoli del contesto senza generarle. Gli estremi della stessa nave hanno minuti UTC distinti e l'arrivo dello spostamento è strettamente successivo alla partenza. Le prestazioni richiedono un contesto valido e categorie immutabili `FREE`/`CATALOG`. Cliente e agenzia si risolvono indipendentemente lungo le fonti previste. Integrare immediatamente impatti, riattribuzioni e ricalcoli atomicamente.

Il perimetro attuale è gestione operativa e importo base. Implementare fatture, consolidamento e protezioni correlate quando le rispettive slice introducono associazioni e snapshot reali.

## Numeri esatti e tempo

- Riutilizzare i valori e gli adattatori esistenti in `domain/values/`, persistenza e renderer. DTO economici come stringhe canoniche, denaro in EUR, centesimi int64 esatti e fattori decimali persistiti come testo.
- Usare `decimal.js` e le regole di arrotondamento P00/P02. Evitare conversioni monetarie tramite `Number` o colonne REAL. Interi di dominio e progressivi rimangono entro i limiti esatti previsti dal contratto.
- Rispettare segni e limiti specifici. Peso positivo, prestazione libera con base strettamente positiva, tariffa e sostituzione manuale della componente operativa anche zero. Tenere distinti calcolo teorico, sostituzione manuale e base effettiva.
- Il backend determina il fuso pertinente. Porti e relative banchine usano il fuso del porto, le decorrenze generali il fuso aziendale confermato. Tenere separata la configurazione del fuso dalle versioni descrittive.
- Usare `@js-temporal/polyfill` e gestire ore inesistenti, scelta esplicita dell'occorrenza ambigua e offset estranei. Evitare l'interpretazione di `datetime-local` tramite il fuso implicito del computer.
- Conservare insieme locale, fuso IANA, offset completo e UTC. Le correzioni descrittive mantengono la tupla storica. Ordinamenti e durate confrontano gli istanti UTC.
- Le letture correlate condividono un istante di osservazione. Il passaggio futuro → corrente aggiorna le viste senza scrivere dati o cambiare la revisione delle bozze.

## Frontend e risposte asincrone

Seguire le [convenzioni UI01](doc/ui01/revisione-post-p04.md) e riusare gli hook e i piccoli componenti condivisi esistenti. Le schermate presentano i contratti, mentre il backend risolve dominio, tempo e calcoli.

- Preservare contesto originale delle bozze e ricaricamento esplicito dopo conflitto. Evitare aggiornamenti automatici della revisione che aggirino il controllo di concorrenza.
- Scartare risposte di altre sessioni, revisioni precedenti, selezioni precedenti ed editor chiusi o componenti smontati. Usare gli ambiti indipendenti delle richieste di elenco, dettaglio, risoluzione ed effetti.
- Ricreare il workspace sul token di sessione, compreso «Salva con nome». Distinguere operazioni sui file, comandi applicativi e caricamento delle singole viste.
- Rendere riconoscibili caricamento, stato vuoto, errore, conflitto, versione storica/corrente/futura e anteprima pronta/bloccata/obsoleta. Preservare focus, etichette, navigazione da tastiera e leggibilità alle dimensioni supportate.
- Ispezionare poche schermate delle parti modificate. Le revisioni estese sono UI01 dopo P04, UI02 dopo P08, UI03 dopo P16 e UI04 dentro P20.

## Scelta delle verifiche e frequenza

Applicare il piano §7.3. Durante lo sviluppo eseguire prove mirate. Alla chiusura dello step applicare la matrice alla build finale e registrare i motivi della selezione.

| Modifica o controllo                                        | Verifica nello step                                                                                                                      | Verifica alla milestone                                                   |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Codice applicativo                                          | `npm run check` e suite completa `npm test`.                                                                                             | Controlli sul risultato integrato finale.                                 |
| Persistenza e regole di dominio                             | SQLite reale per invarianti, vincoli, riferimenti, no-op, contatori, revisioni e rollback coinvolti.                                     | Suite backend completa.                                                   |
| Nuova migrazione SQL nel runner esistente                   | Archivio precedente popolato, copia preventiva, conservazione, rollback e apertura migrata nella build Electron.                         | Migrazioni cumulative dalle versioni supportate e trasferibilità.         |
| Percorso UI/IPC nuovo o modificato                          | Test desktop del flusso e regressioni direttamente coinvolte.                                                                            | Intera suite desktop.                                                     |
| Primitive condivise                                         | Test dei chiamanti coinvolti. Ampliare fino alla suite completa quando l'impatto attraversa l'applicazione o la copertura resta incerta. | Verifica integrata completa.                                              |
| Packaging, caricamento risorse, runtime o dipendenze native | Prova anticipata dell'eseguibile confezionato con copertura adeguata all'impatto.                                                        | Pacchetto finale e intera suite sullo stesso eseguibile.                  |
| Grafica e usabilità                                         | Interazioni, focus e schermate essenziali delle parti modificate.                                                                        | Revisione estesa nei checkpoint UI.                                       |
| Soli documenti                                              | Formattazione, collegamenti modificati e differenze Git.                                                                                 | Controlli documentali pertinenti.                                         |
| Installer                                                   | Verifiche coinvolte se cambia la relativa configurazione.                                                                                | Generazione in P20 e registrazione separata della prova di installazione. |

M1 segue P08 e le correzioni UI02, M2 P13, M3 P16 e le correzioni UI03, M4 P19, M5 è P20 con UI04. Chiudere ogni milestone sulla build integrata finale con controlli statici, suite backend e desktop complete, migrazioni cumulative, trasferibilità e pacchetto verificato. Una migrazione ordinaria mantiene la verifica del pacchetto alla milestone successiva. Cambiare il meccanismo di inclusione/caricamento richiede invece la prova anticipata nello step.

Per valutare le regressioni immediate considerare almeno questi impatti.

- Coordinatore, contesto IPC o gestione file coinvolgono apertura, copie, backup, chiusura, sessioni, revisioni e rollback.
- Primitive temporali o numeriche coinvolgono i rispettivi chiamanti, precisione, limiti, fusi diversi e confini temporali.
- Versioni, effetti o ispettore dei riferimenti coinvolgono tutte le anagrafiche utilizzatrici, FK reali, prenotazioni e conferme.
- Hook asincroni e navigazione coinvolgono cambio selezione/editor/sessione, risposte ritardate e viste che condividono la logica.
- Nuovi riferimenti operativi coinvolgono selezionabilità, risoluzione storica, comandi di modifica già disponibili e ricalcoli atomici.

La chiusura dello step richiede le verifiche dello step superate e la registrazione delle prove pianificate alla milestone successiva. Un difetto di integrità va corretto nello step che lo rileva. I controlli estesi già pianificati per una milestone restano associati a quel traguardo.

## Comandi e riuso dei risultati

```powershell
npm run check
npm test
npm run build
```

`npm test` usa il runtime Node di Electron attraverso `scripts/test.mjs`. Preservare questo percorso per i test con il driver SQLite nativo. Per prove backend mirate durante lo sviluppo si può passare il file a `npm test -- tests/unit/<file>.test.ts`.

Per compilare ed eseguire soltanto i percorsi desktop selezionati usare `npm run test:e2e -- tests/e2e/<file>.spec.ts`. Con la stessa build già pronta usare direttamente Playwright.

```powershell
node node_modules/@playwright/test/cli.js test tests/e2e/<file>.spec.ts
```

Alla milestone, sulla build finale stabile, eseguire in sequenza le verifiche complete.

```powershell
node node_modules/@playwright/test/cli.js test
node scripts/package.mjs --dir
node scripts/test-packaged.mjs
```

Gli script `test:e2e` e `test:packaged` includono le rispettive fasi di build. Scegliere il percorso coerente con gli esiti già disponibili, riutilizzando la build verificata. Evitare ricompilazioni concorrenti durante confezionamento e prove. Dopo una correzione ripetere controlli falliti e controlli coinvolti, conservando gli altri esiti ancora validi. Una modifica ai soli test o documenti può riutilizzare il prodotto già compilato se gli artefatti applicativi restano validi.

Usare archivi temporanei, preferenze isolate e renderer offline nei test desktop. La finestra può essere nascosta tramite i meccanismi di test esistenti. Le catture delle finestre nascoste del pacchetto hanno causato blocchi nelle prove precedenti, quindi seguire gli helper che mantengono le asserzioni funzionali e saltano tali catture.

Se gli ACL Windows impediscono l'avvio di Electron nella sandbox dell'agente, seguire il percorso di esecuzione autorizzata descritto nelle note di consegna e documentare il blocco effettivo. Preservare ACL e sandbox di Electron. Conservare log completi localmente, leggere riepiloghi ed errori e riutilizzare schermate già valide.

Prettier globale ha storicamente segnalato i cinque documenti `doc/legacy/00`–`04`. Verificare gli avvisi sullo stato corrente, distinguere quelli preesistenti dalle regressioni e controllare separatamente i file modificati. La segnalazione storica riguarda soltanto quei documenti.

## Consegna e aggiornamento dello stato

- Aggiornare il registro e la nota del task con decisioni, file/contratti principali, migrazioni, build o revisione verificata, comandi ed esiti effettivi.
- Motivare le regressioni selezionate e indicare la milestone destinataria delle verifiche estese. Registrare limiti, difetti aperti e attività bloccate con la causa concreta.
- Distinguere implementato, verificato sulla build e verificato sul pacchetto. Descrivere le interazioni Playwright come prove automatizzate o guidate dall'agente, distinguendole da una sessione manuale umana.
- Aggiornare piano e README quando cambiano capacità disponibili, flussi o istruzioni operative. Mantenere collegamenti locali validi e contenuti coerenti con il codice.
- Indicare il prossimo task e le dipendenze integrate. Le revisioni tecniche dopo P04, P08, P12 e P16 restano previste dal piano, insieme ai checkpoint grafici UI.
- Prima della consegna controllare differenze, formattazione e completezza del percorso richiesto. Riportare sinteticamente risultato, verifiche e limiti, evitando di ripetere log e cronologia già presenti nella nota.
