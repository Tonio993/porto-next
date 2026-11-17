# Istruzioni per lo sviluppo di Porto Next

## Avvio e fonti

Seguire il task dell'utente fino a implementazione, verifica e consegna. Controllare branch, stato Git e differenze, preservando le modifiche preesistenti. Effettuare commit quando autorizzati.

Leggere il [registro corrente](doc/stato-implementazione-prestazioni.md), la scheda del task nel [piano](doc/piano-implementazione-prestazioni.md) e il passaggio operativo della dipendenza pertinente. Individuare contratti, chiamanti e test reali prima di intervenire. La [guida documentale](doc/guida-documentazione.md) indica le sezioni da consultare per argomento e come aggiornare i documenti.

Usare ricerche e letture per sezione. Approfondire decisioni P00, scenari, note e legacy quando coinvolti dal task. Il legacy descrive anche un precedente progetto Java/Angular. Per stato attuale e stack usare registro e codice. Documentare conflitti funzionali effettivi nelle decisioni, risolvendo le normali scelte tecniche nel perimetro richiesto.

## Implementazione

- Ambiente Windows x64, PowerShell, Node.js 24 e npm 11 o successivo. Usare lockfile e script di `package.json`. Prodotto Electron/React/TypeScript, Mantine, SQLite, better-sqlite3 e Drizzle, con risorse locali e funzionamento offline.
- Realizzare incrementi verticali utilizzabili. Riutilizzare logica esistente e primitive condivise giustificate da casi reali. Mantenere specifici e tipizzati contratti, servizi e repository. Attivare solo i comandi completati.
- Dominio puro in `backend/domain`, casi d'uso e validazione autorevole in `application`, persistenza in `infrastructure`, DTO in `shared/contracts`. Il renderer presenta i contratti attraverso API specifiche del preload.
- Preservare sandbox Electron, isolamento, controllo mittente/frame IPC e protezioni di navigazione. Validare input, campi inattesi e limiti anche nelle invocazioni IPC dirette. Mostrare errori italiani per campo/conflitto/vincolo, mantenendo SQL e stack nei log.
- `ArchiveCoordinator` possiede sessione e coda condivisa fra comandi e file. Costruire repository nella sessione corrente. Evitare riaccodamenti ricorsivi. Transazioni sincrone, con dialoghi e `await` fuori dalla transazione.
- Query con sessione, comandi con archivio/sessione/revisione verificati all'esecuzione. Una copia può conservare l'ID archivio, mentre «Salva con nome» cambia sessione. Aggiornare una volta revisione e timestamp per transazione effettiva. Letture, backup, no-op e rollback li conservano.
- Anteprime server legate a operazione, sessione e revisione. Conferma con ID e contesto originali, riesame dei vincoli e scrittura atomica. Consumare dopo commit, applicare tutti gli effetti e gestire scadenza/namespace secondo P00 D04. Verificare l'esito prima di ripetere una scrittura incerta.
- Aggiungere migrazioni numerate preservando quelle distribuite. Aggiornare schema Drizzle, import `?raw` nel runner e `SCHEMA_VERSION`. Mantenere copia preventiva, rollback, metadati e FK/CHECK/indici appropriati.
- Integrare subito nuovi riferimenti e ricalcoli nei comandi già disponibili. Analizzare FK reali, anche composte/CASCADE, ed eliminare esplicitamente i componenti posseduti nella stessa transazione. Distinguere nuovi riferimenti selezionabili da consultazione storica.
- Riutilizzare valori numerici e temporali P02. Denaro e fattori nei DTO come stringhe canoniche, centesimi int64 esatti e decimali TEXT. Usare arrotondamenti e limiti P00, evitando conversioni monetarie tramite `Number`/REAL.
- Risolvere il fuso nel backend secondo il contesto. Gestire gap e scelta esplicita degli overlap. Conservare locale/IANA/offset/UTC e la tupla storica nelle correzioni descrittive. Letture correlate condividono un istante di osservazione.
- Applicare le regole del piano §2 per identità, progressivi, prenotazioni, versioni, catalogo, permanenze e valorizzazione. Riutilizzare i controlli esistenti. Differenze di dominio, come descrizioni correnti del catalogo e identificativi storici anagrafici, richiedono il rispettivo comportamento.
- Nel frontend seguire le convenzioni UI correnti, mantenendo contesto originale delle bozze e ricaricamento esplicito dopo conflitto. Scartare risposte obsolete per sessione/revisione/selezione/editor. Ricreare il workspace sul token di sessione. Preservare focus, tastiera e leggibilità alle dimensioni supportate.
- Usare `rg` per ricerche mirate. Diagnostiche in `.local/`, risultati in `test-results/`. In caso di lavoro concorrente usare checkout separati e coordinare i file condivisi.

## Verifiche

La matrice autorevole è nel [piano §7.3](doc/piano-implementazione-prestazioni.md#73-criteri-comuni-di-completamento). Consultarla per scegliere e motivare la copertura. A chiusura di ogni step implementativo eseguire check, suite backend completa, verifiche SQLite delle invarianti/migrazioni coinvolte e percorsi desktop nuovi o direttamente interessati. Ampliare le regressioni per modifiche condivise.

Suite desktop e pacchetto completi sono associati alle milestone. Cambiamenti a packaging, caricamento risorse, runtime o dipendenze native richiedono la prova anticipata pertinente. Le modifiche solo documentali richiedono formattazione, collegamenti e differenze Git.

Usare `npm test`, che esegue SQLite nel runtime Electron. Riutilizzare build ed esiti ancora validi e ripetere solo controlli falliti o coinvolti dalle correzioni. Evitare ricompilazioni concorrenti con confezionamento/test. I comandi selettivi e completi sono nel piano §7.3.

Usare il [coordinatore e i suoi profili](doc/v02/coordinatore-profili.md#comandi-e-profili), scegliendo esplicitamente documenti e regressioni secondo §7.3. Leggere prima `summary.md`, poi i dettagli delle sole fasi problematiche. La diagnostica resta parziale; il report non determina la chiusura del task.

Test desktop con archivi/preferenze temporanei e renderer offline. Se gli ACL impediscono l'avvio nella sandbox dell'agente, usare il percorso autorizzato documentando il blocco, preservando ACL e sandbox Electron. Seguire gli helper esistenti per le finestre nascoste del pacchetto.

## Consegna e manutenzione documentale

Applicare la [guida documentale](doc/guida-documentazione.md#aggiornamento-a-fine-task). Aggiornare in posto la riga del task e la consegna corrente nel registro, con stato effettivo, schema, prove, limiti e prossimo passo. Conservare decisioni specifiche e punti d'integrazione nella nota del task. Usare collegamenti alle regole comuni e alle evidenze già disponibili.

Il piano descrive requisiti, dipendenze e controlli. Il registro descrive lo stato attuale. Il README descrive uso e avvio. Aggiornare ogni fonte quando cambiano i contenuti di cui è responsabile. Conservare lo storico e gli allegati fuori dal percorso di lettura ordinario.

Registrare una sola sintesi degli esiti finali, motivando selezione e riuso e indicando le verifiche pianificate alla milestone. Distinguere build e pacchetto, prove automatizzate e sessioni manuali umane. Segnalare difetti e limiti concreti. Preservare gli esiti storici anche quando una segnalazione viene risolta; applicare la [politica di conservazione](doc/guida-documentazione.md#conservazione-delle-evidenze).

Mantenere AGENTS breve e stabile, aggiornandolo per cambiamenti delle regole operative. Il dettaglio di dominio, i log e le cronologie appartengono alle fonti collegate.
