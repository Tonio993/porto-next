# P01 — Contesto applicativo dell’archivio

Data: 10 novembre 2026. Base integrata: `bb623b9` (P00). Implementazione P01: commit `f9b3dbb`.

Riferimenti: [piano](../piano-implementazione-prestazioni.md), [decisioni D04–D05](../p00/decisioni-iniziali.md), [registro](../stato-implementazione-prestazioni.md).

## Struttura e accesso per i task successivi

- `ArchiveCoordinator` possiede la sessione attiva e l’unica coda applicativa. Cambi file, copie e comandi usano questa coda.
- Ogni attivazione costruisce un nuovo `ArchiveApplicationSession` con UUIDv4 e connessione. I futuri repository e servizi legati al database vanno costruiti in questo scope, senza conservarli oltre il cambio sessione. La connessione precedente viene chiusa; nessuna cache funzionale globale è introdotta.
- `ArchiveFileOperations` contiene le primitive di gestione file, senza una propria coda. `ArchiveService` le espone ai chiamanti del backend. La composizione in `src/main/index.ts` costruisce e inietta l’istanza condivisa, accessibile anche ai nuovi casi d’uso. Il controller esegue dialoghi e primitive mediante `withFiles`, senza richiamare dalla coda i metodi della facade che accodano altro lavoro.
- `ArchiveController` gestisce dialoghi, recenti, log e pubblicazione dello stato. Non possiede più una seconda coda. Non costruire altri coordinatori per i nuovi casi d’uso: usare quello della stessa istanza applicativa di `ArchiveService`.

I nuovi casi d’uso backend utilizzano `coordinator.query(request, handler)` e `coordinator.command(request, handler)`. Gli handler ricevono lo scope corrente e i dati tipizzati; validano i dati specifici del caso d’uso nel backend. Sono sincroni, anche nei tipi TypeScript. Non aprono dialoghi, non eseguono `await` e non rientrano nella coda. Questi metodi sono interni al backend: il bridge continua a esporre soltanto operazioni applicative specifiche.

`command` apre una transazione SQLite e controlla il contesto prima di invocare l’handler. Confronta il contatore SQLite delle modifiche prima e dopo l’operazione: se ci sono scritture, incrementa una volta la revisione e aggiorna `updated_at` nella stessa transazione. Gli handler non amministrano autonomamente questi metadati. Il comando di rinomina evita esplicitamente una scrittura quando il nome ripulito coincide con quello già salvato.

Un errore o il superamento del limite int64 annullano dati, revisione e timestamp. I contatori interni SQLite possono avanzare anche per una transazione annullata: ogni comando misura soltanto la differenza nel proprio intervallo, senza usarli come revisione persistente.

## Contratti e protezioni

Gli envelope comuni sono in `src/shared/contracts/application.ts`: contesto, query/comandi, risultato ed errori con campi e conflitti. I DTO delle funzionalità future restano nella specifica P00 finché la rispettiva slice non li adotta.

- Il controllo runtime verifica forma, UUID e revisione canonica entro int64. Le query verificano la sessione; i comandi anche archivio e revisione. Il token viene verificato prima di leggere i metadati della nuova sessione.
- Senza archivio: `NO_ARCHIVE`. Sessione o archivio diversi: `ARCHIVE_SESSION_CHANGED`. Revisione diversa: `REVISION_CONFLICT`.
- Un errore di sessione non restituisce contesto o dati del file nuovo. I controlli IPC continuano a respingere altri mittenti e frame secondari.
- `ArchiveState` conserva `active` e `recent` e aggiunge `context`. I vecchi nomi e campi dell’API restano disponibili. Le azioni sul file corrente accettano un envelope contestuale; la UI lo invia sempre. Le chiamate legacy e il menu catturano il bersaglio prima dell’attesa.
- La sessione cambia con apertura di un altro file, riapertura dopo chiusura e «Salva con nome». Quest’ultimo conserva ID e revisione dei dati. Backup, annullamento dei dialoghi e apertura del file già attivo non cambiano sessione.
- React scarta risposte di altre sessioni o con revisioni precedenti. Gli eventi di attivazione impediscono a una risposta tardiva di ripristinare una sessione precedente. Una bozza conserva il contesto da cui è nata anche se arrivano aggiornamenti della stessa sessione: il nome può essere ricaricato esplicitamente dopo un conflitto. Il workspace viene ricreato alla variazione del token, eliminando form e selezioni; i risultati asincroni riferiti al vecchio workspace vengono scartati.

La navigazione comprende Archivi, Anagrafiche, Catalogo e tariffe, Operazioni nave e Prestazioni. Le sezioni funzionali richiedono un archivio aperto e dichiarano esplicitamente l’indisponibilità delle funzioni ancora da realizzare.

## Persistenza

Schema v2, migrazione `0002_archive_revision.sql`: aggiunge `archive_metadata.revision`, intero SQLite non negativo con default `0`. `0001_archive.sql` rimane invariata. Drizzle descrive la colonna fisica; le letture applicative usano `CAST(revision AS TEXT)` e i confronti usano `BigInt`, senza cambiare globalmente i tipi letti da better-sqlite3.

L’apertura v1 valida i metadati, crea una copia preventiva e migra in transazione, comprendendo la validazione dei metadati risultanti. Un fallimento annulla anche l’aggiornamento dello schema e lascia attiva la sessione precedente. La copia preventiva conserva schema v1 e dati; l’API di backup SQLite può cambiare contatori interni del file, quindi non se ne richiede l’identità binaria.

## Verifiche e limiti

Le prove di `archive-coordinator.test.ts` coprono `ARC-01`–`ARC-04`, la guardia di revisione di `IMP-02`, revisioni oltre `2^53`, limite int64, rollback, migrazione v1 e serializzazione di copia/scritture/cambio file. I test del controller coprono i chiamanti contestuali e legacy, i dialoghi annullati e il confine IPC. Restano attive le regressioni originali degli archivi.

`IMP-02` verifica che un contesto usato per calcolare effetti venga respinto dopo una scrittura. Non introduce un motore di anteprime o un caso d’uso funzionale: conservazione, scadenza e consumo delle anteprime saranno adottati dalle slice che ne hanno bisogno.

Il test desktop estende il percorso originale con navigazione, revisione, rifiuto di contesti obsoleti, invarianza del backup e reset della bozza con «Salva con nome». Il percorso è automatizzato con finestra nascosta; la schermata prodotta è stata ispezionata. Un ulteriore percorso guidato sul pacchetto verifica la migrazione di un v1 e la copia dal menu nativo mentre è aperta Prestazioni: controlla il ritorno ad Archivi e il reset della bozza, usando Playwright e dati temporanei isolati. Non è stata eseguita una sessione manuale umana.

Gli esiti finali dei comandi e del confezionamento sono riportati nel registro. Nessuna dipendenza di produzione aggiunta; decimali, momenti e fusi rimangono P02.
