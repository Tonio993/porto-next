# Piano di implementazione: anagrafiche e gestione delle prestazioni

Data: 10 novembre 2026. Baseline esaminata: `acc012e`.

Questo piano prepara il primo rilascio funzionale di Porto Next. Organizza il lavoro in task assegnabili a un agente, con dipendenze, risultati verificabili e indicazioni per le chat. La pianificazione non avvia l'implementazione delle funzionalità.

P00 è completato: [decisioni iniziali](p00/decisioni-iniziali.md), [contratti](p00/contratti.ts) ed [esempi riutilizzabili](p00/scenari.mts). P01, [P02](p02/numeri-e-tempo.md), [P03](p03/porti.md) e [P04](p04/versioni-e-ciclo-di-vita.md) sono completati; lo stato delle funzionalità resta nel [registro di avanzamento](stato-implementazione-prestazioni.md).

## 1. Fonti e decisioni di perimetro

Sono stati esaminati i cinque documenti di `doc/legacy`, approfondendo le parti necessarie a questo incremento:

| Documento                                                              | Utilizzo nel piano                                                                           |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [Visione e roadmap](legacy/00-roadmap-progetto.md)                     | Obiettivo desktop locale, integrità dell'archivio, visione del ciclo operativo.              |
| [Analisi del dominio](legacy/01-analisi-dominio.md)                    | Anagrafiche, permanenze, operazioni, prestazioni, soggetti, tariffe e semantica temporale.   |
| [Requisiti e casi d'uso](legacy/02-requisiti-funzionali-e-casi-uso.md) | Scenari osservabili e criteri di accettazione, identificati dai codici `CU-*`.               |
| [Modello dei dati](legacy/03-modello-dati.md)                          | Identità, versioni, prenotazioni dei nomi, struttura operativa e proposta delle prestazioni. |
| [Sviluppo evolutivo](legacy/04-sviluppo-evolutivo.md)                  | Incrementi verticali, verifiche a ogni incremento e revisioni periodiche.                    |

Le scelte tecnologiche e le dichiarazioni di avanzamento del legacy descrivono un altro progetto: Angular, Java, Spring, HTTP e Flyway. Qui rimangono **Electron, React, TypeScript, IPC, SQLite, better-sqlite3 e Drizzle**. Nel repository attuale esiste la gestione degli archivi; il flusso di creazione dei porti descritto nel vecchio walking skeleton deve ancora essere realizzato.

Le regole funzionali confermate dei documenti 01 e 02 costituiscono la base. Il modello 03 distingue decisioni confermate nei punti 1–5 e proposte da verificare dal punto 6: il relativo schema fisico va verificato durante le slice. Un conflitto funzionale effettivo va registrato nel documento delle decisioni prima di implementare il comportamento controverso; una normale scelta tecnica può essere risolta dall'agente nel perimetro concordato.

### 1.1 Risultato del primo rilascio

L'operatore, partendo da un archivio vuoto, deve poter:

1. definire porti, banchine, clienti, agenzie e navi;
2. gestire dati storici, stato corrente e riferimenti delle anagrafiche;
3. configurare catalogo, pesi e tariffe necessari al calcolo base;
4. registrare entrata, spostamento e uscita della nave;
5. registrare prestazioni libere e da catalogo nel contesto operativo corretto;
6. determinarne separatamente cliente e agenzia, distinguendo valori espliciti ed ereditati;
7. consuntivare, correggere, eliminare e ricercare le attività consentite;
8. consultare importo base e spiegazione del calcolo;
9. chiudere, riaprire e copiare l'archivio ritrovando tutti i dati.

Il rilascio comprende la **gestione operativa e la valorizzazione base**. L'importo base non viene presentato come importo finale di fattura.

### 1.2 Funzioni successive

Restano per incrementi successivi:

- regole economiche dinamiche, maggiorazioni, riduzioni e trattamento fiscale;
- fatture, sconti, emissione, snapshot consolidati e incassi;
- contabilità, merci e movimentazioni merci, resoconti configurabili;
- modifica delle sequenze dei fusi e correzione di fusi già utilizzati;
- sincronizzazione, utenti multipli e importazione di dati dal vecchio gestionale.

La risoluzione corretta di fusi e ora legale è invece necessaria fin dal primo inserimento operativo. Il fuso aziendale iniziale è `Europe/Rome`; il fuso iniziale di ciascun porto viene proposto da quello aziendale e può essere scelto durante la creazione del porto. La gestione delle successive variazioni dei fusi resta esplicitamente fuori da questo rilascio. Non va confusa con la modifica delle versioni descrittive di un porto.

Finché il modulo fatture non esiste, non esistono attività consolidate dall'applicazione. Non si aggiunge un booleano persistente `isConsolidated` né si dichiara implementata la protezione delle fatture. La futura protezione dovrà derivare da associazioni e snapshot reali.

### 1.3 Traguardi verificabili

| Traguardo                             | Task conclusi | Risultato                                                                             |
| ------------------------------------- | ------------- | ------------------------------------------------------------------------------------- |
| M1 — Anagrafiche utilizzabili         | P00–P08       | Si prepara un archivio con gli elementi fondamentali e il catalogo.                   |
| M2 — Contesto operativo               | P09–P13       | La nave ha una cronologia valida, importi base delle operazioni e soggetti effettivi. |
| M3 — Prima gestione delle prestazioni | P14–P16       | Prestazioni libere e da catalogo utilizzabili, consuntivabili e ricercabili.          |
| M4 — Correzioni e ricalcoli           | P17A–P19      | Variazioni operative ed economiche aggiornano coerentemente i dati dipendenti.        |
| M5 — Rilascio verificato              | P20           | Flusso completo e archivio trasferibile verificati anche nell'eseguibile.             |

M3 è il primo traguardo dimostrabile della gestione delle prestazioni. M4 completa le correzioni previste dal perimetro; M5 chiude il rilascio. Durante gli incrementi intermedi, i comandi ancora incompleti devono risultare esplicitamente indisponibili.

## 2. Regole da preservare

### 2.1 Elementi fondamentali

| Elemento                            | Dati iniziali                                                  | Regole essenziali                                                                                                  |
| ----------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Cliente — `Customer`                | Ragione sociale.                                               | Dominio distinto dall'agenzia; identità e codice stabili, dati versionati.                                         |
| Agenzia — `Agency`                  | Ragione sociale.                                               | Identità e riferimenti propri; nessuna unificazione implicita con il cliente.                                      |
| Nave — `Vessel`                     | Nome di registrazione, IMO facoltativo, tipologia, dimensione. | Tipologie iniziali `STANDARD`, `PASSENGER`, `ADM`; dimensione intera non negativa, senza unità di misura aggiunta. |
| Porto — `Port`                      | Nome, località, paese ISO alpha-2.                             | Fuso operativo autonomo, separato dalle versioni descrittive.                                                      |
| Banchina — `Berth`                  | Porto proprietario e nome.                                     | Appartenenza immutabile al porto; banchina facoltativa sulle permanenze.                                           |
| Tipo di prestazione — `ServiceType` | Descrizione corrente, stato, peso iniziale.                    | Catalogo iniziale con `rinforzo ormeggio`; descrizione non versionata.                                             |
| Tariffa — `Tariff`                  | Porto, decorrenza, configurazioni per tutte le tipologie nave. | Scaglioni ordinari ed extra; applicabilità temporale, senza stato attivo/disattivato.                              |

Non si anticipano campi fiscali, armatori, personale o unità di misura assenti dalle specifiche iniziali. L'IMO rimane un identificativo testuale facoltativo; eventuali ulteriori vincoli di formato devono avere una decisione esplicita.

Per le cinque anagrafiche operative:

- identità tecnica distinta dal codice progressivo visibile;
- progressivo autonomo per tipologia, mai riutilizzato; quello delle banchine è unico tra tutti i porti;
- versione iniziale con decorrenza assente, applicabile senza limite inferiore;
- versioni successive complete, con intervalli a inizio incluso e fine esclusa;
- stato corrente attivo/disattivato distinto dalle versioni;
- nuovi riferimenti soltanto verso elementi selezionabili; quelli disattivati già referenziati restano validi;
- prenotazione dei dati identificativi storici fino all'eliminazione dell'intera anagrafica, anche se una versione viene corretta o eliminata;
- eliminazione fisica soltanto senza riferimenti, senza cancellare automaticamente gli elementi bloccanti;
- niente accorpamento automatico di versioni ridondanti e niente versioni nuove identiche alla precedente.

Fonti: dominio §1.5; requisiti §2.8; modello §§3.9–3.10.

### 2.2 Operazioni nave e permanenze

Le operazioni `ENTRY`, `MOVEMENT`, `EXIT` generano `Voyage → PortCall → BerthStay`. Viaggi, visite e ormeggi sono persistiti e hanno identità stabili, ma struttura e date non vengono amministrate come CRUD indipendenti. Su questi elementi si possono gestire le assegnazioni di cliente e agenzia.

`PLANNED` e `PERFORMED` producono la struttura; `MISSED` non la produce, ma richiede il contesto previsto per la propria operazione e partecipa ai vincoli di unicità temporale. Il trascorrere del tempo non cambia lo stato.

| Evento                | Effetto                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| Entrata               | Apre viaggio, prima visita e primo ormeggio.                                                      |
| Spostamento interno   | Chiude un ormeggio e ne apre un altro nella stessa visita.                                        |
| Spostamento tra porti | Chiude ormeggio e visita di origine; apre visita e ormeggio di destinazione nello stesso viaggio. |
| Uscita                | Chiude ormeggio, visita e viaggio.                                                                |

La ricostruzione conserva le identità ancorate alle operazioni di apertura ancora presenti e conserva le assegnazioni esplicite compatibili. Un elemento rimosso e successivamente ricreato riceve una nuova identità.

L'arrivo di uno spostamento deve essere **strettamente successivo alla partenza in UTC**. Il passaggio del dominio che dice «non può precedere» viene precisato dai requisiti §2.19 e dal modello §3.12.8: gli estremi della stessa nave, anche dello stesso spostamento e anche `MISSED`, non possono condividere il minuto UTC.

Fonti: requisiti §§2.9–2.10, §2.19; modello §§3.11–3.12.

### 2.3 Prestazioni ordinarie

`ServiceActivity` è distinta da `VesselOperation`. Le categorie immutabili sono:

- `FREE`: descrizione propria e importo base manuale **strettamente positivo**; nessun tipo di catalogo, peso o calcolo tariffario;
- `CATALOG`: tipo configurabile, tariffa e peso applicabili; nessuna descrizione autonoma o sostituzione manuale dell'importo base.

Per entrambe si conservano nave, momento, stato, note, contesto operativo, versioni applicate e soggetti effettivi. Le versioni sono quelle valide **all'istante della prestazione**, non necessariamente quelle dell'apertura della visita o dell'ormeggio.

| Istante della prestazione              | Attribuzione                                  |
| -------------------------------------- | --------------------------------------------- |
| Minuto dell'entrata                    | Prima visita e primo ormeggio appena aperti.  |
| Minuto di partenza                     | Visita e ormeggio di origine.                 |
| Tra partenza e arrivo, estremi esclusi | Inserimento e riattribuzione vietati.         |
| Minuto di arrivo                       | Ormeggio ed eventuale visita di destinazione. |
| Minuto dell'uscita                     | Ultima visita e ultimo ormeggio.              |
| Prima dell'entrata o dopo l'uscita     | Inserimento e riattribuzione vietati.         |

La banchina non specificata è valida. Più prestazioni ordinarie possono condividere il minuto. Anche una prestazione `MISSED` deve avere un contesto completo. Una variazione non può lasciare prestazioni orfane.

Cliente e agenzia sono risolti **separatamente**, con priorità:

`prestazione → ormeggio → visita → viaggio`.

Si conservano identità effettiva e fonte per ciascun soggetto. Assenza di un valore significa ereditarietà, non esclusione. Entrambi possono mancare durante la registrazione; non si impongono prematuramente i requisiti della fatturazione.

Fonti: requisiti §§2.11 e 2.13; proposta di modello §3.13.

### 2.4 Catalogo ed economia base

- `entrata`, `uscita`, `spostamento` sono denominazioni riservate e tipi operativi fissi, non tipi configurabili del catalogo.
- Il tipo iniziale `rinforzo ormeggio` segue le normali regole; non viene ricreato a ogni apertura se l'operatore lo ha eliminato legittimamente.
- Un tipo configurabile utilizzato almeno una volta non è eliminabile neppure dopo la cancellazione di tutte le sue prestazioni. La prova dell'utilizzo deve essere persistita atomicamente.
- Una descrizione di catalogo liberata da una rinomina può essere riutilizzata; questo comportamento è diverso dalle prenotazioni storiche delle anagrafiche.
- Il peso è strettamente positivo; la versione iniziale, proposta a `1`, non ha decorrenza. I pesi delle operazioni fisse e dei tipi configurabili hanno sequenze autonome.
- Una tariffa contiene tutte e tre le configurazioni nave. Prima della prima decorrenza non esiste una tariffa applicabile.
- L'assenza di tariffa impedisce una registrazione tariffata. Il contesto operativo non va costruito mediante operazioni con tariffa fittizia o importo automaticamente impostato a zero.
- Gli scaglioni ordinari hanno limite massimo incluso; gli extra si contano arrotondando per eccesso. Il peso si applica al valore tariffario risultante.
- Le operazioni generano una componente economica, oppure due per lo spostamento tra porti. Le due componenti conservano autonomamente porto, momento, versione nave, soggetti e calcolo.
- La sostituzione manuale della base delle **componenti di operazione nave**, prevista dal modello §3.12.11, è distinta dal calcolo tariffario, che resta conservato; può essere zero. Non viene estesa alle prestazioni da catalogo.
- Gli importi usano decimali esatti, EUR e arrotondamento commerciale a due decimali dopo ciascun passaggio monetario. DTO e persistenza non introducono approssimazioni tramite `number` binari.
- `MISSED` non azzera automaticamente l'importo. In questo rilascio si espone la base; le regole economiche dinamiche saranno un incremento successivo.

Fonti: requisiti §§2.11, 2.14 e 2.15; dominio, precisione e arrotondamento; modello §3.12.

## 3. Impostazione tecnica sul repository esistente

### 3.1 Accesso all'archivio attivo

Attualmente `ArchiveService` possiede privatamente una sessione SQLite e una coda per le operazioni sui file. I nuovi servizi devono condividere il coordinamento del ciclo di vita dell'archivio:

1. un solo proprietario della sessione attiva;
2. una serializzazione coerente di comandi di dominio, cambio archivio, copie e chiusura, evitando code annidate che si attendano reciprocamente;
3. servizi e repository costruiti per la sessione corrente, eliminati quando cambia;
4. controllo di un identificativo della **sessione aperta**, anche sulle richieste arrivate in ritardo;
5. invalidazione di viste, selezioni, anteprime e risultati asincroni durante il cambio archivio;
6. aggiornamento del timestamp di modifica dell'archivio anche per le scritture funzionali.

L'ID contenuto nel file non basta: «Salva con nome» conserva l'ID dell'archivio e delle righe, ma apre una copia indipendente. Serve un nuovo token di sessione anche in questo caso. Nessun dato funzionale viene conservato nelle preferenze globali dell'utente.

### 3.2 Contratti e responsabilità

- Dominio puro in `src/backend/domain/`, casi d'uso e transazioni in `application/`, SQL/Drizzle in `infrastructure/`.
- Contratti tipizzati in `src/shared/contracts/`, con validazione runtime autorevole nel backend e errori distinguibili per campo, conflitto o vincolo.
- Il bridge espone operazioni applicative specifiche; non espone SQL, percorsi arbitrari o IPC generico. L'API degli archivi esistente resta compatibile.
- Le schermate React consumano i contratti tramite adattatori; non contengono risoluzione delle permanenze o regole economiche.
- Si aggiungono navigazione e sezioni nell'archivio aperto; senza archivio attivo le funzioni operative restano indisponibili.
- Si riusano piccoli componenti di elenco, form, cronologia e anteprima dopo il primo caso reale. Nessun motore CRUD generico o schema EAV/JSON per le anagrafiche.

### 3.3 Migrazioni e proposte fisiche

La migrazione `0001_archive.sql` già distribuita rimane immutata. Le nuove migrazioni sono registrate in ordine nel runner e incluse nella build; ogni slice introduce soltanto lo schema necessario. Gli archivi v1 vengono aggiornati conservando i metadati, con copia preventiva e rollback in caso di errore.

Scelte iniziali da dettagliare in P00–P04:

- tabelle tipizzate per identità e versioni delle anagrafiche, con convenzioni comuni;
- contatori persistenti separati per tipologia, evitando `MAX(codice)` dopo un'eliminazione;
- prenotazioni identificative con chiavi normalizzate e vincoli per ambito;
- indici parziali per garantire una sola versione iniziale: una `UNIQUE` ordinaria con `NULL` non basta;
- unicità delle prenotazioni globali protetta anche quando l'ambito è assente; niente concatenazioni ambigue di nome, località e paese;
- normalizzazione testuale coerente nel backend e nelle chiavi salvate, anche per testi non ASCII; non affidarsi implicitamente al solo `NOCASE` SQLite;
- una rappresentazione discriminata delle prestazioni con vincoli che impediscano combinazioni `FREE`/`CATALOG` incoerenti;
- estremi delle operazioni indicizzati per nave e minuto UTC, con coerenza rispetto all'operazione proprietaria;
- importi finali rappresentabili in centesimi esatti e fattori tariffari/pesi in formato decimale canonico; conversioni esplicite nei DTO;
- momento di dominio composto da valore locale, fuso IANA, offset e istante UTC, distinto dagli istanti tecnici.

UUIDv7 è una preferenza del vecchio modello, non un vincolo funzionale imposto. P00 registra la scelta degli identificativi di dominio senza cambiare inutilmente quelli dell'archivio già esistente.

### 3.4 Anteprima, conferma e ricalcolo

Le variazioni con effetti dipendenti seguono: richiesta → simulazione → esposizione degli effetti → conferma → nuova validazione → applicazione atomica.

La transazione SQLite non rimane aperta mentre l'operatore legge l'anteprima. Alla conferma si verifica sessione e revisione dei dati: un'anteprima divenuta obsoleta viene rifiutata e rigenerata. Il contatore di revisione delle scritture è distinto dalla versione dello schema.

L'analisi espone oggetti creati, modificati o rimossi, attribuzioni, fonti dei soggetti e importi prima/dopo. Il livello applicativo compone funzioni esplicite di validazione e ricalcolo; non serve introdurre un event bus o una piattaforma di workflow.

**Ogni slice che introduce nuovi riferimenti deve integrare immediatamente i controlli e i ricalcoli nei comandi già disponibili.** Per esempio, quando P10 introduce visite ed estremi, una modifica anagrafica deve già aggiornarne le versioni applicate; P14 e P15 estendono lo stesso controllo alle prestazioni. I test trasversali finali verificano questi comportamenti, non sostituiscono la loro implementazione progressiva.

## 4. Task, dipendenze e chat

Ogni riga è un task separato, con un risultato verificabile e almeno un commit coerente quando l'utente autorizza i commit. P17 è articolato in quattro task per limitare il lavoro sulla ricostruzione operativa.

`medium` è indicato per applicazioni di schemi già verificati; `high` per decisioni, invarianti temporali, transazioni e verifiche trasversali. Le indicazioni sulle chat sono raccomandazioni organizzative del piano. Il supporto effettivo dei livelli dipende dal modello selezionato.

| ID   | Incremento                                                     | Dipendenze minime       | Nuova chat consigliata         | Ragionamento |
| ---- | -------------------------------------------------------------- | ----------------------- | ------------------------------ | ------------ |
| P00  | Specifica eseguibile del rilascio e decisioni iniziali         | Piano e baseline        | Può proseguire in questa chat  | `high`       |
| P01  | Contesto applicativo per archivio e contratti comuni           | P00                     | Sì                             | `high`       |
| P02  | Valori numerici esatti, momenti e fusi iniziali                | P01                     | Sì                             | `high`       |
| P03  | Primo flusso verticale: creare e consultare porti              | P02                     | Sì                             | `medium`     |
| P04  | Versioni e ciclo di vita del porto                             | P03                     | No, continuare P03             | `high`       |
| P05  | Banchine nel porto, con versioni e ciclo di vita               | P04                     | Sì                             | `medium`     |
| P06  | Clienti e agenzie, con versioni e ciclo di vita                | P04                     | Sì                             | `medium`     |
| P07  | Navi e classificazioni iniziali                                | P04                     | Sì                             | `high`       |
| P08  | Catalogo e pesi iniziali                                       | P02                     | Sì                             | `medium`     |
| P09  | Tariffe iniziali complete e calcolo base                       | P03, P07, P08           | Sì                             | `high`       |
| P10  | Entrata, uscita e permanenze persistite                        | P05, P07, P09           | Sì                             | `high`       |
| P11  | Spostamento nello stesso porto                                 | P10                     | No, continuare P10             | `high`       |
| P12  | Spostamento tra porti e componenti autonome                    | P11                     | Sì                             | `high`       |
| P13  | Assegnazione ed ereditarietà di cliente e agenzia              | P06, P12                | Sì                             | `high`       |
| P14  | Registrazione e consultazione di prestazioni libere            | P13                     | Sì                             | `high`       |
| P15  | Registrazione e consultazione da catalogo                      | P14, P08, P09           | No, continuare P14             | `high`       |
| P16  | Consuntivazione, modifiche, eliminazione e ricerca prestazioni | P15                     | Sì                             | `high`       |
| P17A | Consuntivazione operazioni e primo replay con anteprima        | P16                     | Sì                             | `high`       |
| P17B | Inserimento retroattivo di operazioni                          | P17A                    | No, continuare P17A            | `high`       |
| P17C | Correzione delle operazioni esistenti                          | P17B                    | Sì                             | `high`       |
| P17D | Eliminazione di operazioni                                     | P17C                    | No, continuare P17C            | `high`       |
| P18  | Correzione ed eliminazione di tariffe utilizzate               | P17D                    | Sì                             | `high`       |
| P19  | Variazioni temporali dei pesi e ricalcoli                      | P18                     | No, continuare P18             | `high`       |
| P20  | Verifica indipendente e rilascio                               | Tutti i task precedenti | Sì, con revisione indipendente | `high`       |

La sequenza della tabella è l'ordine raccomandato in esecuzione singola. Le dipendenze permettono anche lavoro parallelo controllato, descritto nella sezione 7.

### P00 — Specifica eseguibile e decisioni

**Stato:** completato. Esito e prove nello [specifico documento di decisioni](p00/decisioni-iniziali.md).

**Consegna:** un documento breve di decisioni e un insieme di esempi di accettazione riutilizzabili, senza completare in anticipo l'intero modello del gestionale.

- Registrare il perimetro base/fiscale, il glossario, i campi minimi e le scelte fisiche ancora aperte.
- Confermare la lettura coerente dell'arrivo strettamente successivo alla partenza.
- Scegliere strumenti per decimali esatti e risoluzione dei momenti con verifica di ore inesistenti/ambigue. L'eventuale spike deve restare circoscritto a questi rischi.
- Definire DTO discriminati, errori, identificativo di sessione, revisione e formato dell'anteprima.
- Registrare criteri di precisione e limiti tecnici senza inventare nuove regole funzionali.

**Accettazione:** per ogni ambiguità sono distinguibili regola già definita, scelta tecnica risolta e questione funzionale ancora aperta. I task successivi possono partire senza reinterpretare i documenti legacy.

### P01 — Contesto applicativo dell'archivio

**Consegna:** un accesso applicativo all'archivio corrente usabile dai nuovi casi d'uso, e una navigazione minima per le sezioni funzionali.

- Separare il coordinamento applicativo dalla sola gestione dei dialoghi degli archivi.
- Serializzare cambi di file e scritture di dominio; proteggere le richieste con il token di sessione.
- Introdurre revisioni e convenzioni degli errori; mantenere i controlli sul mittente IPC.
- Preparare l'invalidazione dello stato React al cambio archivio.

**Accettazione:** una richiesta rimasta in coda per l'archivio A non legge né modifica B. La protezione vale anche dopo «Salva con nome», benché l'ID interno coincida. Gli attuali flussi di backup, apertura e chiusura continuano a funzionare.

### P02 — Numeri e tempo

**Stato:** completato. Contratti, adattatori, configurazione per archivio e verifiche sono descritti in [Numeri e tempo](p02/numeri-e-tempo.md) e nel registro.

**Consegna:** tipi di dominio e adattatori verificati per denaro, fattori decimali, momenti e configurazione temporale iniziale per archivio.

- Usare EUR e arrotondamento commerciale; passare valori decimali tramite rappresentazioni esatte.
- Conservare insieme locale, fuso, offset e UTC. Non interpretare `datetime-local` tramite il fuso implicito del computer.
- Risolvere e validare i momenti nel backend, offrendo alla UI le occorrenze selezionabili quando necessario.
- Inizializzare il fuso aziendale per archivio e predisporre il fuso indipendente del porto.

**Accettazione:** `0,01 × 0,5` produce una base arrotondata di `0,01`; un'ora locale inesistente è respinta, una ambigua richiede scelta. Cambiare il fuso del computer non cambia i risultati.

### P03 — Creare e consultare un porto

**Stato:** completato. Percorso, schema e verifiche in [Creare e consultare un porto](p03/porti.md) e nel registro.

**Consegna:** primo percorso completo UI → IPC → caso d'uso → SQLite → rilettura.

- Creare identità, progressivo, versione iniziale, prenotazione della chiave e fuso iniziale in un'unica transazione.
- Gestire nome, località, paese e scelta del fuso iniziale.
- Mostrare elenco e dettaglio con codice progressivo e versione applicabile.
- Introdurre i piccoli componenti UI e le convenzioni di repository necessari al caso reale.

**Accettazione:** creazione e riavvio conservano il porto. Un duplicato normalizzato non viene salvato; lo stesso nome in un'altra località/paese segue la chiave composta prevista. Nessun dato viene trasferito a un altro file aperto.

### P04 — Versioni e ciclo di vita del porto

**Stato:** completato. Funzioni, riordino frontend, convenzioni e verifiche in [Versioni e ciclo di vita del porto](p04/versioni-e-ciclo-di-vita.md) e nel registro.

**Consegna:** cronologia, inserimento/correzione/eliminazione di versioni, disattivazione, riattivazione ed eliminazione del porto consentita.

- Implementare le convenzioni temporali e di prenotazione indicate nella sezione 2.
- Mostrare e confermare gli effetti dei comandi che lo richiedono.
- Preparare l'analisi applicativa degli impatti sui riferimenti, inizialmente limitata agli elementi realmente presenti.
- Non modificare il fuso correggendo i dati descrittivi del porto.

**Accettazione:** la versione futura non diventa corrente in anticipo; la versione iniziale non si elimina. Un vecchio nome rimane riservato anche dopo la correzione della versione. Un porto eliminato non rende riutilizzabile il suo progressivo.

### P05 — Banchine

**Consegna:** gestione delle banchine all'interno del dettaglio del porto, riusando le convenzioni verificate in P04.

- Applicare nome univoco per identità del porto e progressivo globale della tipologia banchina.
- Rendere immutabile l'appartenenza al porto.
- Derivare la selezionabilità dallo stato proprio e da quello del porto.
- Gestire versioni, stato ed eliminazione senza cascade del porto.

**Accettazione:** due porti possono avere una banchina omonima. Disattivare un porto nasconde le sue banchine dalle nuove selezioni senza cambiarne gli stati. Il porto non si elimina finché contiene una banchina.

### P06 — Clienti e agenzie

**Consegna:** due anagrafiche tipizzate con ricerca, dettaglio, versioni e gestione del ciclo di vita.

- Usare la sola ragione sociale come dato iniziale previsto.
- Mantenere separati identità, contatori, prenotazioni e contratti delle due tipologie.
- Applicare la conservazione dei riferimenti esistenti quando un soggetto viene disattivato.

**Accettazione:** rinomina e versione futura mantengono l'identità; i duplicati sono respinti nel rispettivo ambito. Nessuna nuova assegnazione può aggirare via IPC la disattivazione. Non si introducono automaticamente dati fiscali o un soggetto universale con ruoli multipli.

### P07 — Navi

**Consegna:** gestione completa della nave secondo le convenzioni anagrafiche.

- Inizializzare il catalogo tecnico delle tre tipologie nave, non amministrabile dall'operatore.
- Gestire nome, IMO facoltativo, tipologia e dimensione intera non negativa.
- Prenotare nomi e IMO storici per l'identità; usare l'IMO come testo.
- Preparare la risoluzione della versione della nave a un momento dato.

**Accettazione:** cambiare dimensione con decorrenza preserva il valore precedente; un IMO storico non è assegnabile a un'altra nave. Gli elementi successivamente introdotti devono utilizzare la versione pertinente al proprio istante.

### P08 — Catalogo e pesi iniziali

**Consegna:** gestione dei tipi configurabili e prima versione del peso per catalogo e tipi operativi fissi.

- Creare `rinforzo ormeggio` una sola volta durante l'inizializzazione prevista dalla migrazione.
- Creare tipo e peso iniziale atomicamente, con valore proposto `1` e vincolo `> 0`.
- Implementare rinomina, stato, selezionabilità ed eliminazione secondo l'utilizzo storico.
- Preparare il dato monotono di utilizzo, che P15 aggiornerà nella transazione di registrazione.

**Accettazione:** descrizioni duplicate o riservate sono respinte. La vecchia descrizione di un tipo rinominato torna disponibile. Un tipo iniziale eliminato legittimamente non ricompare alla riapertura. L'editor delle variazioni successive dei pesi sarà attivato in P19.

### P09 — Tariffe e calcolatore base

**Consegna:** creazione, copia, elenco e dettaglio delle tariffe complete, con calcolo base verificabile.

- Acquisire porto, decorrenza e configurazioni per tutte le tipologie, con scaglioni ed extra.
- Scegliere tariffa/versione nave/scaglione/peso al momento economico.
- Restituire la traccia del calcolo e conservarne i riferimenti quando saranno create le attività.
- Supportare anche la creazione di tariffe intermedie con anteprima e ricalcolo delle attività introdotte nei task successivi.

**Accettazione:** con ultimo limite `1600`, valore `100 EUR`, dimensione `2100`, ampiezza extra `200`, extra `5 EUR` e peso `1,5`, risultano tre extra, valore tariffario `115 EUR` e base `172,50 EUR`. Una tariffa incompleta e una registrazione tariffata antecedente alla prima tariffa sono respinte. Correzione ed eliminazione diretta delle tariffe verranno esposte in P18.

### P10 — Entrata, uscita e permanenze

**Consegna:** registrare e consultare entrate/uscite e la gerarchia persistita da esse prodotta.

- Creare gli estremi con versioni anagrafiche e momenti risolti.
- Generare una componente economica per operazione, calcolarne sempre la base tariffaria e tenere distinta l'eventuale sostituzione manuale consentita.
- Gestire gli stati in creazione, compresi i vincoli delle operazioni `MISSED`.
- Mostrare viaggio, visita e ormeggio con banchina facoltativa, senza consentire il CRUD diretto della struttura.
- Collegare subito questi nuovi riferimenti alle validazioni delle anagrafiche e ai ricalcoli tariffari già esposti.

**Accettazione:** doppia entrata, uscita senza contesto e collisioni del minuto UTC sono respinte; una mancata entrata non apre un viaggio. Una nuova entrata dopo l'uscita crea un altro viaggio. In questa slice i comandi di correzione strutturale restano indisponibili.

### P11 — Spostamento interno

**Consegna:** registrare uno spostamento nello stesso porto con partenza e arrivo distinti.

- Derivare l'origine, richiedere la destinazione e verificare la banchina.
- Chiudere e aprire gli ormeggi nella stessa visita, conservando il viaggio.
- Calcolare la sola componente `MOVEMENT` alla partenza.
- Implementare la query di contesto ai confini e nell'intervallo di trasferimento.

**Accettazione:** partenza attribuita all'origine, arrivo alla destinazione, nessun ormeggio durante il trasferimento. Due ormeggi con banchina non specificata restano distinti. Un arrivo coincidente con la partenza è respinto.

### P12 — Spostamento tra porti

**Consegna:** passaggio tra porti nello stesso viaggio, con due componenti economiche autonome.

- Risolvere partenza e arrivo nei rispettivi fusi e confrontare gli istanti UTC.
- Chiudere visita e ormeggio di origine; aprire quelli di destinazione.
- Calcolare `EXIT` alla partenza e `ENTRY` all'arrivo, anche con tariffe o versioni nave differenti.
- Conservare identità e dati distinti per le componenti; il totale visualizzato è derivato.

**Accettazione:** fusi diversi non alterano l'ordine reale; un trasferimento non chiude il viaggio. Modificando dati descrittivi compatibili, riferimenti e calcoli non restano obsoleti. Non si crea un'entità autonoma `Transfer`.

### P13 — Cliente e agenzia effettivi

**Consegna:** gestione delle assegnazioni su viaggio, visita, ormeggio e operazione; risoluzione dei valori e delle fonti.

- Implementare una funzione pura di priorità per ciascun soggetto.
- Esibire valori espliciti ed ereditati senza copiare i predefiniti nei campi espliciti.
- Applicare alle componenti delle operazioni il contesto corretto: ingresso, uscita, origine alla partenza o destinazione all'arrivo.
- Ricalcolare atomicamente le componenti interessate da una variazione delle assegnazioni.

**Accettazione:** cliente del viaggio e agenzia della visita possono combinarsi; un override di uno non altera l'altro. Rimuovere l'override ripristina l'ereditarietà. Uno spostamento tra porti può avere coppie effettive diverse nelle due componenti. Soggetti mancanti non impediscono la registrazione.

### P14 — Prima prestazione libera

**Consegna:** creare, elencare e consultare una prestazione libera da un percorso UI completo.

- Acquisire nave, momento, stato, descrizione, importo base, note e override facoltativi dei soggetti.
- Derivare e salvare contesto, versioni e soggetti effettivi nella stessa transazione.
- Risolvere il porto competente prima di interpretare l'ora: quando il contesto temporale è ambiguo, proporre i contesti candidati o chiedere il porto per disambiguare, poi verificare l'attribuzione. Il porto scelto non permette di forzare una permanenza inesistente.
- Integrare immediatamente le prestazioni nei controlli dei comandi già disponibili.

**Accettazione:** anche `MISSED` richiede un contesto; banchina assente e soggetti incompleti sono ammessi. Zero, importo negativo, descrizione vuota e istante in trasferimento sono respinti. Nessuna tariffa è richiesta per la prestazione libera stessa; quelle necessarie alle operazioni che ne costruiscono il contesto restano obbligatorie.

### P15 — Prima prestazione da catalogo

**Consegna:** creare e consultare una prestazione tariffata nel medesimo flusso di attribuzione di P14.

- Richiedere un tipo selezionabile e calcolare tariffa, scaglione, peso e base.
- Persistere contesto, risultati e utilizzo storico del tipo atomicamente.
- Usare la descrizione corrente del tipo e mostrare una spiegazione del calcolo.
- Integrare i nuovi risultati nei comandi di variazione anagrafica e tariffaria già disponibili.

**Accettazione:** un tipo disattivato non è selezionabile; un riferimento già presente rimane consultabile. Il salvataggio fallito non lascia calcoli o contesti parziali. Non si può inserire un importo manuale al posto del risultato tariffario.

### P16 — Ciclo di vita delle prestazioni ordinarie

**Consegna:** consuntivazione, modifica, eliminazione, modifica delle sole note e ricerca completa nel perimetro.

- Consuntivare esplicitamente `PLANNED → PERFORMED/MISSED`, con anteprima quando cambiano dati o risultati.
- Rideterminare contesto, versioni, soggetti e calcoli per le modifiche pertinenti.
- Conservare la categoria e consentire il mantenimento di un tipo disattivato già associato.
- Eliminare fisicamente senza azzerare l'utilizzo storico del tipo.
- Filtrare per nave, categoria/tipo, stato, periodo, porto/banchina, viaggio/visita/ormeggio e soggetti effettivi.

**Accettazione:** una variazione priva di contesto viene respinta; cambiare categoria richiede eliminazione e nuova registrazione. Le sole note non provocano ricalcoli. Lo stato non cambia al trascorrere del tempo. La UI distingue importo base e disponibilità operativa dalla futura idoneità definitiva alla fatturazione.

### P17A — Consuntivare operazioni con replay

**Consegna:** primo comando strutturale con simulazione della sequenza, confronto e applicazione atomica.

- Consuntivare operazioni previste come effettuate o mancate.
- Ricostruire le permanenze interessate, preservare le identità ancorate e riattribuire le prestazioni.
- Rideterminare versioni, soggetti e componenti economiche; mostrare effetti prima/dopo.

**Accettazione:** una consuntivazione che lascerebbe una prestazione orfana viene respinta integralmente; un'anteprima obsoleta non viene applicata. Una conferma valida aggiorna tutti i dipendenti e conserva le assegnazioni compatibili.

### P17B — Inserire operazioni retroattive

**Consegna:** inserimento in una cronologia esistente usando la pipeline verificata in P17A.

**Accettazione:** la verifica riguarda tutta la sequenza risultante, anche le operazioni mancate, e non soltanto due vicini temporali. Inserimento, nuove permanenze, riattribuzioni e ricalcoli sono atomici; collisioni e prestazioni rimaste senza contesto impediscono il comando. Le operazioni non coinvolte mantengono identità e dati.

### P17C — Correggere operazioni esistenti

**Consegna:** variazione di momento, nave, stato, tipologia o destinazione mediante anteprima e replay.

**Accettazione:** cambiare nave valida entrambe le sequenze nella stessa transazione. Una trasformazione tra spostamento interno ed esterno conserva l'operazione, ma ricrea soltanto le componenti economiche il cui significato è cambiato. Le componenti ancora equivalenti mantengono l'identità. Una banchina inizialmente sconosciuta può essere completata senza simulare un trasferimento mai avvenuto.

### P17D — Eliminare operazioni

**Consegna:** eliminazione esplicita di un'operazione con analisi degli effetti sulla cronologia e sulle attività collegate.

**Accettazione:** il comando non elimina automaticamente prestazioni dipendenti per aggirare un errore di contesto. Una rimozione valida aggiorna permanenze e componenti; una rimozione non valida lascia tutto invariato. Le note rimangono aggiornabili mediante un comando senza replay.

### P18 — Correggere ed eliminare tariffe

**Consegna:** completamento del ciclo di vita delle tariffe dopo la presenza di attività realmente dipendenti.

- Modificare dati o decorrenza ed eliminare tariffe in qualsiasi posizione della sequenza.
- Simulare intervalli, attività e componenti interessate; ricalcolare senza toccare basi libere o sostituzioni manuali esplicite.
- Integrare nello stesso controllo gli effetti di variazioni della dimensione e della tipologia nave sulle attività introdotte.

**Accettazione:** eliminare o posticipare la prima tariffa è respinto se lascia attività tariffate senza tariffa. Gli importi teorici delle componenti con sostituzione manuale vengono aggiornati, mantenendo distinta la base manuale. Ogni ricalcolo aggiorna insieme riferimenti e risultati.

### P19 — Versioni dei pesi

**Consegna:** cronologia e gestione delle versioni dei pesi per catalogo e operazioni fisse.

- Inserire versioni passate, intermedie o future; correggere ed eliminare quelle consentite.
- Mantenere una versione iniziale senza decorrenza e un solo peso applicabile a ciascun istante.
- Mostrare le attività e le componenti interessate e applicare i ricalcoli nella stessa transazione.

**Accettazione:** il peso valido al confine è quello della nuova versione; la versione iniziale non si elimina. Le basi libere non cambiano; uno spostamento tra porti usa i pesi pertinenti ai due estremi. Una creazione di tipo non può lasciare il catalogo senza peso iniziale.

### P20 — Revisione e rilascio

**Consegna:** verifica indipendente del perimetro, aggiornamento della documentazione e pacchetto Windows.

- Eseguire gli scenari della sezione 6 e verificare la copertura dei casi d'uso.
- Verificare migrazioni, rollback, cambio archivio, copie, riavvio e funzionamento offline.
- Verificare anche l'eseguibile confezionato; il solo backend o il browser di sviluppo non chiudono il rilascio.
- Registrare limitazioni residue, risultati dei controlli e passi successivi.

**Accettazione:** tutti i criteri del perimetro sono soddisfatti oppure una funzione risulta esplicitamente rinviata con motivazione e impatto. Un difetto che compromette attribuzione, calcolo o integrità dell'archivio impedisce la chiusura. L'installer viene generato; l'installazione sul computer dell'utente rimane un'azione distinta.

## 5. Copertura dei casi d'uso

| Ambito legacy                                                     | Copertura prevista                                      | Limite esplicito                                                                                           |
| ----------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `CU-ANA-01…10`                                                    | P03–P07, integrati dai task che aggiungono riferimenti. | Cinque anagrafiche operative; merce rinviata.                                                              |
| `CU-PER-01…08`                                                    | P10–P12, P17A–P17D.                                     | Protezioni legate a fatture rinviate al relativo modulo.                                                   |
| `CU-OPN-01…10`                                                    | P10–P13, P17A–P17D.                                     | Valorizzazione base e override consentito; regole dinamiche/fatture successive.                            |
| `CU-PRE-01…13`                                                    | P08, P14–P16.                                           | Consultazione economica della base; parti legate a regole e fatture non ancora implementate.               |
| `CU-PRE-14`                                                       | Esporre stato e completezza operativa/soggetti.         | Selezione in fattura, avviso e controllo definitivo rinviati.                                              |
| `CU-SOG-01…06`                                                    | P13–P17D.                                               | Compatibilità con fatture e movimentazioni informative rinviata.                                           |
| `CU-TAR-01…10`                                                    | P08–P09, P18–P19 e integrazione nelle attività.         | Ricalcolo di totali di fattura e protezione del consolidamento rinviati.                                   |
| `CU-TEM-02…05`, parte di `08` e `10`                              | P02 e task operativi.                                   | Fusi iniziali, risoluzione/conservazione e visualizzazione; esportazioni e variazioni dei fusi successive. |
| `CU-TEM-06`, `07`, `09`                                           | Incremento successivo.                                  | Niente modifica diretta di fusi già utilizzati.                                                            |
| `CU-ECO-*`, `CU-FAT-*`, `CU-MER-*`, contabilità/incassi/resoconti | Incrementi successivi.                                  | Il presente rilascio non dichiara copertura completa di questi ambiti.                                     |

Le parti dei casi d'uso che dipendono da moduli rinviati restano **parzialmente coperte**, anche quando la parte operativa è completata. Il registro di avanzamento deve riportarlo senza trasformare il completamento di una slice nella conferma dell'intero legacy.

## 6. Scenari di accettazione trasversali

### S1 — Dall'archivio vuoto alla prestazione

Creare un archivio, un cliente, un'agenzia, una nave, due porti con banchine, una tariffa completa per ciascun porto e un tipo di catalogo. Registrare entrata, prestazione libera, prestazione da catalogo, spostamento e uscita. Riaprire il file e confrontare identità, contesti, soggetti e importi.

### S2 — Confini temporali

Entrata alle 08:00, partenza alle 10:00, arrivo alle 11:00, uscita alle 12:00. Verificare attribuzione all'origine alle 10:00, rifiuto alle 10:30, attribuzione alla destinazione alle 11:00, accettazione alle 12:00 e rifiuto alle 12:01. Ripetere con banchina assente e con operazioni previste. Consentire più prestazioni nello stesso minuto e respingere due estremi operativi coincidenti.

### S3 — Ereditarietà indipendente

Cliente C sul viaggio, agenzia A sulla visita, cliente D sull'ormeggio, agenzia B sulla prestazione: risultano cliente D e agenzia B. Rimuovendo l'override della prestazione torna A; rimuovendo il cliente dell'ormeggio torna C. Verificare anche le due componenti di uno spostamento tra porti con coppie diverse.

### S4 — Anagrafiche storiche e stato

Introdurre una nuova dimensione nave con decorrenza; attività prima e dopo usano versioni e importi pertinenti. Spostare o eliminare una versione aggiorna tutti i riferimenti ricalcolabili. Un vecchio nome e un vecchio IMO restano riservati. Disattivare un soggetto conserva i riferimenti esistenti, ma impedisce nuove selezioni. Eliminare un porto con banchine è vietato.

### S5 — Catalogo e importi

Utilizzare un tipo, eliminare la prestazione e verificare che il tipo non diventi eliminabile. Rinominarlo e verificare la descrizione corrente; riaprire un archivio dopo aver eliminato il tipo iniziale mai utilizzato e verificarne l'assenza. Verificare peso positivo, libero `> 0`, tariffa zero consentita, override operativo zero consentito e nessun azzeramento automatico per `MISSED`.

### S6 — Fusi e ora legale

Nel fuso `Europe/Rome`, il 29 marzo 2026 alle 02:30 è inesistente e il 25 ottobre 2026 alle 02:30 è ambiguo: rifiutare il primo e richiedere l'occorrenza del secondo. Verificare che le due occorrenze abbiano UTC distinti e che il fuso del computer non influenzi il risultato. Ripetere gli spostamenti tra porti con fusi diversi.

### S7 — Atomicità e anteprime

Inserire o modificare un'operazione in modo da rendere invalida una prestazione esistente: l'intero comando viene respinto. Provocare un errore durante un ricalcolo e verificare l'assenza di aggiornamenti parziali. Tra anteprima e conferma eseguire un'altra scrittura: richiedere una nuova anteprima.

### S8 — File indipendenti e migrazioni

Aggiornare un archivio v1; simulare una migrazione fallita e conservare l'originale utilizzabile. Aprire un archivio futuro e rifiutarlo senza alterarlo. Usare due file con dati distinti e lo stesso ID interno ottenuti da una copia: nessuna selezione, scrittura o risposta tardiva può passare da uno all'altro. Verificare backup e «Salva con nome» con tutte le nuove tabelle, anche nell'eseguibile e senza rete.

## 7. Regole pratiche per gli agenti

### 7.1 Quando aprire una nuova chat

Aprire una nuova chat ai confini indicati nella tabella, dopo aver completato e documentato il task precedente. Riutilizzare la stessa chat per le coppie indicate, perché condividono un modello appena verificato. Se una correzione è ancora aperta, completarla prima di cambiare contesto; se il contesto è diventato poco affidabile, salvare lo stato e ripartire leggendo gli artefatti.

Una nuova chat deve ricostruire il contesto dai file e dai commit, non da un riassunto a memoria. La [documentazione OpenAI sui livelli di ragionamento](https://developers.openai.com/api/docs/guides/deployment-checklist) distingue il lavoro ordinario dai problemi che richiedono più ragionamento. Le assegnazioni `medium`/`high` di questo piano sono valutazioni progettuali; `xhigh` può essere valutato per un problema temporale o transazionale rimasto irrisolto, con un obiettivo di verifica concreto. Non è necessario impostarlo per tutti i task.

### 7.2 Esecuzione e parallelismo

La scelta iniziale consigliata è un agente implementatore per task, in sequenza. Dopo P04, P05, P06 e P07 possono procedere in worktree separati su contratti già fissati; P08 è indipendente dopo P02. Un agente che realizza P09 parte dalla versione integrata che contiene tutte le proprie dipendenze.

Non lavorare in parallelo sulla stessa directory con writer diversi. Un integratore coordina modifiche a runner e numeri delle migrazioni, schema condiviso, preload, registrazione IPC, shell React, dipendenze e registro di avanzamento. Le migrazioni già integrate non vengono rinumerate o riscritte: si assegna un nuovo numero prima del merge.

P10–P19 condividono sequenza, attribuzioni e ricalcoli: è preferibile integrarli in ordine. Dopo P04, P08, P12 e P16 effettuare una breve revisione trasversale di duplicazioni, contratti e invarianti. La revisione deve produrre correzioni circoscritte, non una riscrittura architetturale.

### 7.3 Criteri comuni di completamento

Un task implementativo è concluso quando:

1. il percorso previsto è utilizzabile nella UI e gli errori sono comprensibili;
2. le regole autorevoli sono nel backend e la persistenza rafforza i vincoli locali;
3. migrazioni, valori iniziali e riapertura dell'archivio sono verificati;
4. i test pertinenti dimostrano le invarianti, senza limitarsi a rispecchiare l'implementazione;
5. i riferimenti introdotti sono inclusi nei comandi di modifica già disponibili;
6. i controlli previsti passano e non restano difetti di integrità noti;
7. limiti, decisioni e stato del task sono registrati;
8. l'applicazione rimane avviabile.

Usare `npm run check` e `npm test` per le modifiche implementative; aggiungere test di integrazione SQLite per persistenza/rollback e un test desktop sul flusso appena introdotto. Eseguire il percorso manuale pertinente. Riservare la verifica completa del pacchetto ai traguardi o alle modifiche che incidono su risorse, migrazioni e dipendenze native. Una modifica soltanto documentale richiede controlli dei documenti, non la ricompilazione dell'applicazione.

### 7.4 Prompt di avvio riutilizzabile

```text
Implementa soltanto il task Pxx di doc/piano-implementazione-prestazioni.md.
Leggi le sezioni globali del piano, la scheda Pxx e i riferimenti legacy pertinenti.
Leggi doc/stato-implementazione-prestazioni.md e verifica codice, branch e stato Git.
Parti dai risultati integrati delle dipendenze indicate; preserva i file dell'utente.
Mantieni lo stack Electron/React/TypeScript/SQLite e il funzionamento per archivio locale.
Realizza il percorso completo previsto, aggiungi le verifiche pertinenti e aggiorna il registro.
Non anticipare funzioni dei task successivi. Registra eventuali conflitti funzionali espliciti.
Nel passaggio di consegne indica file modificati, decisioni, verifiche, limiti e prossimo task.
```

Per una revisione usare invece: «Revisiona il risultato integrato dei task … rispetto al piano e agli scenari pertinenti. Riporta problemi con evidenze e impatto; applica solo le correzioni comprese nel task assegnato».

### 7.5 Passaggio di consegne

Aggiornare [il registro di avanzamento](stato-implementazione-prestazioni.md) con:

- task e stato reale, distinguendo implementato da verificato;
- commit o revisione di riferimento e migrazioni introdotte;
- file e contratti principali;
- decisioni adottate e divergenze motivate dalle proposte;
- comandi eseguiti ed esiti, incluse verifiche manuali o ancora da svolgere;
- difetti aperti e loro impatto;
- prossimo task e dipendenze effettivamente integrate.

Il prossimo passo è **P05**, in una nuova chat con ragionamento consigliato `medium`, usando le decisioni P00, il [contesto applicativo P01](p01/contesto-applicativo.md), i [valori P02](p02/numeri-e-tempo.md), il [percorso P03](p03/porti.md) e le [convenzioni e il ciclo di vita P04](p04/versioni-e-ciclo-di-vita.md).
