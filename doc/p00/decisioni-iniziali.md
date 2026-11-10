# P00 — Decisioni iniziali e specifica eseguibile

Data: 10 novembre 2026. Baseline applicativa: `acc012e`. Stato: completato per il perimetro P00.

Riferimenti: [piano](../piano-implementazione-prestazioni.md), [registro](../stato-implementazione-prestazioni.md), [contratti TypeScript](contratti.ts), [scenari riutilizzabili](scenari.mts), [spike](../../spikes/p00/README.md).

Le decisioni con prefisso **D** sono scelte tecniche adottate per questo rilascio. Le regole con prefisso **R** derivano dai requisiti. Le scelte con prefisso **V** restano da verificare nelle rispettive slice, senza impedire l'avvio di P01. Gli esempi compilabili non costituiscono funzionalità già disponibili nell'applicazione.

## R01 — Perimetro e regole confermate

Il primo rilascio gestisce anagrafiche, contesto operativo, prestazioni e importi base. L'interfaccia userà «Importo base», distinguendolo dal futuro risultato economico e fiscale della fattura. Regole dinamiche, fatture, consolidamento, merci, contabilità e variazioni delle configurazioni dei fusi restano negli incrementi successivi già indicati nel piano.

| Regola | Decisione funzionale recepita                                                                                                                              | Fonte legacy                                                                                       |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| R01.1  | Arrivo di uno spostamento strettamente successivo alla partenza in UTC; niente estremi della stessa nave nello stesso minuto UTC, anche `MISSED`.          | Requisiti §2.19; modello §3.12.8. La formula generale «non precede» è precisata da questi vincoli. |
| R01.2  | `PLANNED` e `PERFORMED` determinano permanenze; `MISSED` non le determina. Gli stati cambiano esplicitamente.                                              | Requisiti §§2.9–2.11.                                                                              |
| R01.3  | `FREE` e `CATALOG` sono categorie immutabili; una prestazione ordinaria richiede sempre un contesto completo.                                              | Requisiti §2.11.                                                                                   |
| R01.4  | FREE: descrizione e base manuale `> 0`; CATALOG: tipo, tariffa e peso, senza base manuale propria. Tariffa zero e override operativo zero sono consentiti. | Requisiti §§2.11, 2.14; modello §3.12.11.                                                          |
| R01.5  | Cliente e agenzia indipendenti; priorità prestazione/operazione → ormeggio → visita → viaggio. Un soggetto assente non impedisce la registrazione.         | Requisiti §2.13.                                                                                   |
| R01.6  | Versione iniziale senza decorrenza; nuove versioni complete; prenotazioni identificative conservate fino all'eliminazione dell'identità.                   | Requisiti §2.8; modello §§3.9–3.10.                                                                |
| R01.7  | Il tipo di catalogo già usato non torna eliminabile cancellando le prestazioni; la sua descrizione corrente non è versionata.                              | Requisiti §2.11.                                                                                   |

## D01 — Glossario, campi e identità

| Termine                        | Identificatore tecnico            | Dati acquisiti inizialmente                                                                            |
| ------------------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Cliente                        | `Customer`                        | `businessName`.                                                                                        |
| Agenzia                        | `Agency`                          | `businessName`, con identità e ambito di unicità distinti dal cliente.                                 |
| Nave                           | `Vessel`                          | `registeredName`, `imoNumber` facoltativo e testuale, `vesselTypeId`, `size`.                          |
| Porto                          | `Port`                            | `name`, `locality`, `countryCode`; `initialZoneId` solo alla creazione, separato dai dati descrittivi. |
| Banchina                       | `Berth`                           | `portId` immutabile e `name`.                                                                          |
| Tipo configurabile             | `ServiceType`                     | `description`, `initialWeight`; lo stato nasce attivo.                                                 |
| Prestazione ordinaria          | `ServiceActivity`                 | Nave, momento, categoria, stato, soggetti espliciti, note e dati specifici della categoria.            |
| Operazione nave                | `VesselOperation`                 | Nave, tipologia, estremi richiesti, destinazione quando prevista, stato, soggetti espliciti e note.    |
| Permanenze                     | `Voyage`, `PortCall`, `BerthStay` | Derivate dalle operazioni; struttura non acquisita come CRUD indipendente.                             |
| Componente economica operativa | `VesselOperationCharge`           | Derivata dal tipo di operazione, con risultati e sostituzione manuale separati.                        |

Gli ID di nuove entità, versioni, sessioni e anteprime saranno **UUIDv4**, generati nel backend con `crypto.randomUUID()`. Sono opachi, immutabili e non riutilizzati. Il candidato UUIDv7 del modello non è obbligatorio e non giustifica una dipendenza aggiuntiva o una migrazione degli ID esistenti. L'ordine funzionale deriva dai momenti, mai dagli UUID.

I progressivi anagrafici sono interi positivi di contatori persistenti separati per tipologia; la sequenza banchine è globale tra i porti. Non si calcolano con `COUNT` o `MAX` dopo le eliminazioni. Tipo nave, codici chiusi e identità anagrafiche rimangono concetti distinti.

Le stringhe visualizzate vengono ripulite soltanto dagli spazi iniziali/finali. Per la chiave di confronto si usa `trim → NFC → toUpperCase() → NFC`, con trasformazione Unicode indipendente dalla lingua del computer. Accenti e spazi interni non vengono rimossi. Le chiavi vengono persistite e confrontate con vincoli univoci; l'aggiornamento delle convenzioni richiederà una migrazione esplicita, senza affidarsi al solo `NOCASE` di SQLite. I nomi del catalogo liberati non seguono la prenotazione storica delle anagrafiche.

## D02 — Numeri esatti e limiti tecnici

Si adotta **`decimal.js` 10.6.0** per fattori e aritmetica decimale. P00 la installa solo nello spike; P02 la aggiungerà alle dipendenze dell'app e realizzerà gli adattatori. Si usa un costruttore dedicato tramite `Decimal.clone`, senza modificare le impostazioni globali di altre librerie. [API della libreria](https://mikemcl.github.io/decimal.js/)

- I DTO economici contengono stringhe, non `number` o `BigInt` trasportati implicitamente.
- `MoneyText` è un valore in EUR con punto e due decimali, per esempio `"172.50"`. Gli input italiani vengono normalizzati esplicitamente dalla UI; il backend accetta il formato canonico. Un importo manuale con decimali ulteriori viene rifiutato, non arrotondato silenziosamente.
- `DecimalText` usa notazione decimale senza esponente o separatori di migliaia. La serializzazione canonica toglie zeri iniziali superflui e zeri frazionari finali; `"1"` è un peso valido. Il vincolo di segno dipende dal campo: peso positivo, valore tariffario non negativo.
- Non si impone una scala frazionaria globale a tariffe e pesi. Il limite tecnico è **256 cifre totali per operando**, contando anche gli zeri: evita input illimitati senza troncare valori validi.
- La precisione interna iniziale di **1024 cifre significative** copre somme e prodotti della formula base entro questi limiti; l'esperimento verifica anche un prodotto con operandi di 256 cifre. L'aggiunta di altre formule richiede di riesaminare il budget, non di accettare arrotondamenti intermedi impliciti.
- Gli extra vengono conteggiati con divisione intera `BigInt`, evitando errori del rapporto binario e overflow della somma tra interi `number`. Il risultato monetario si arrotonda con `ROUND_HALF_UP` a due decimali soltanto al passaggio monetario richiesto.
- Gli importi finali vengono conservati come centesimi interi SQLite int64, letti/scritti tramite conversioni esatte. Per una base non negativa il massimo tecnico è `"92233720368547758.07"`; un risultato superiore causa `AMOUNT_OUT_OF_RANGE` e rollback. Nessun passaggio intermedio usa `Number(importo)`.
- Tariffe unitarie e pesi restano testo decimale canonico nella persistenza, non `REAL`. La traccia distingue tariffa teorica, sostituzione manuale della componente e base effettiva.

| Valore                                               | Limite tecnico iniziale                                                            | Comportamento oltre il limite                                        |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Nome, ragione sociale, località, descrizione di tipo | 200 punti di codice Unicode dopo `trim`.                                           | `VALIDATION_ERROR`, senza troncamento.                               |
| IMO testuale                                         | 64 punti di codice; nessun checksum obbligatorio introdotto implicitamente.        | `VALIDATION_ERROR`.                                                  |
| Descrizione libera                                   | 1000 punti di codice.                                                              | `VALIDATION_ERROR`.                                                  |
| Note                                                 | 10000 punti di codice; assenza rappresentata con `null`.                           | `VALIDATION_ERROR`.                                                  |
| Dimensioni, limiti, ampiezze e progressivi visibili  | Interi esatti entro `Number.MAX_SAFE_INTEGER`; segno secondo il campo.             | `LIMIT_EXCEEDED`, senza rinumerazione.                               |
| Revisione persistente                                | Intero non negativo entro int64; DTO come stringa intera.                          | `LIMIT_EXCEEDED`, senza riavvolgimento.                              |
| Elenchi e dettagli paginati                          | Pagine da 1; 25 elementi predefiniti; massimo 100. Anteprima iniziale: 50 effetti. | Pagina non valida respinta; riepiloghi sempre sull'insieme completo. |
| Date nel contratto iniziale                          | Calendario ISO, anni `0001`–`9999`.                                                | Errore esplicito di formato/calendario.                              |

Questi sono limiti della prima implementazione, non nuovi significati di dominio; possono essere ampliati con una modifica verificata. L'attuale limite di 120 caratteri del nome dell'archivio resta invariato. I campi sconosciuti vengono respinti per evitare di ignorare attributi incompatibili con la categoria.

## D03 — Momenti e fusi

Si adotta **`@js-temporal/polyfill` 0.5.1**, importata esplicitamente nel backend anche se un runtime espone Temporal nativo. L'esperimento verifica le API effettivamente disponibili e l'uso di fusi nominativi. Il polyfill si appoggia alle informazioni temporali locali del runtime; non richiede un servizio Internet per risolvere gli orari. [Implementazione](https://github.com/js-temporal/temporal-polyfill), [API `PlainDateTime`](https://tc39.es/proposal-temporal/docs/plaindatetime.html), [API `ZonedDateTime`](https://tc39.es/proposal-temporal/docs/zoneddatetime.html).

| Dato               | Contratto                                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| Input di momento   | `localDateTime: "YYYY-MM-DDTHH:mm"`, `selectedOffset: string                                         | null`. Non si acquisiscono secondi o UTC inseriti dal client. |
| Momento risolto    | Locale originale, `zoneId` IANA, offset completo e `utc` ISO con millisecondi. Sono salvati insieme. |
| Istante tecnico    | UTC con precisione massima al millisecondo, generato dal backend.                                    |
| Data civile futura | `YYYY-MM-DD`; nessuna mezzanotte o conversione di fuso implicita.                                    |

Il backend determina il fuso dal porto competente; il fuso aziendale iniziale `Europe/Rome` serve ai contesti amministrativi e alle decorrenze generali. Il client non può imporre liberamente un `zoneId` alle attività. `interpretationPortId` disambigua soltanto i contesti candidati già ammessi dalla cronologia: non forza porto, viaggio o ormeggio.

La risoluzione considera le varianti Temporal `earlier` e `later`, conservando soltanto quelle che ritornano allo stesso valore locale: zero candidati significa ora inesistente; uno significa momento univoco; più di uno richiede scelta esplicita dell'occorrenza. Un offset estraneo viene rifiutato. Non si usa il default `compatible` per decidere al posto dell'operatore.

Ordinamento e durata confrontano gli istanti UTC; il vincolo sugli estremi usa il loro minuto UTC risolto. Il momento conservato non viene troncato o reinterpretato durante visualizzazione o modifica delle sole note. Se un aggiornamento IANA cambia nuove risoluzioni, gli elementi già salvati mantengono locale, fuso, offset e UTC originali. Le configurazioni dei fusi nascono con una versione iniziale; la UI di questo rilascio non ne espone variazioni successive.

## D04 — Sessione, revisione, comandi e anteprime

Il nuovo contratto contestuale è descritto in [contratti.ts](contratti.ts). Le stringhe nominali documentano il formato, ma non sostituiscono la validazione runtime del backend.

### Sessione e serializzazione

`ArchiveContextDto = { archiveId, sessionId, revision }`.

- `archiveId` è il metadato già presente nel file; una copia può conservarlo.
- `sessionId` è un UUIDv4 in memoria, nuovo a ogni attivazione effettiva. Cambia aprendo un altro file, riaprendo dopo la chiusura e con «Salva con nome». Annullare un dialogo o richiedere il file già attivo non lo cambia.
- `revision` è una stringa intera canonica che corrisponde al contatore persistito nell'archivio. Una transazione che cambia dati, comprese note o nome archivio, lo incrementa una sola volta e aggiorna il timestamp. Rollback, letture, backup e no-op senza scritture non lo incrementano. «Salva con nome» conserva la revisione dei dati, ma cambia sessione.

Revisioni e centesimi int64 si leggono senza perdita, per esempio tramite `CAST(... AS TEXT)` nelle query pertinenti o letture `BigInt` circoscritte. Non si cambia globalmente la modalità di lettura degli interi del database esistente: metadati come `singleton` e versione schema conservano i tipi già attesi. P01 deve verificare revisioni oltre `2^53`; i confronti numerici delle stringhe usano `BigInt`, non l'ordine lessicografico.

P01 introdurrà un coordinatore applicativo proprietario di sessione e coda. Gestione file e comandi funzionali passeranno dallo stesso coordinatore; le primitive eseguite nella coda non rientreranno ricorsivamente nella coda stessa. Il coordinatore costruirà i servizi della sessione e li scarterà al cambio file. Le transazioni SQLite saranno sincrone: nessun `await`, dialogo o conferma umana dentro una transazione.

Una query invia almeno la sessione; un comando invia il contesto completo. Il controllo avviene **all'esecuzione**, prima di accedere ai dati. Ordine: validazione del mittente e della forma, presenza dell'archivio, sessione, archivio dichiarato, revisione, vincoli della richiesta. Senza archivio si risponde `NO_ARCHIVE`; con altra sessione `ARCHIVE_SESSION_CHANGED`; con revisione superata `REVISION_CONFLICT`. Non si legge il file nuovo per completare una richiesta del vecchio file.

La risposta include il contesto cui si riferisce. Su `NO_ARCHIVE` o sessione errata il contesto della risposta è `null`, senza dati di un altro archivio. Il renderer scarta risposte di altre sessioni e risultati più vecchi della revisione già applicata; svuota form, selezioni e anteprime quando cambia sessione.

### Compatibilità dell'API archivi

I nomi delle operazioni e i campi attuali di `ArchiveInfo`/`ArchiveState` restano disponibili. P01 aggiunge lo stato contestuale e aggiorna i chiamanti della UI: tutte le azioni riferite al file corrente inviano il contesto del form o della vista che le ha originate. Bootstrap e scelta di un nuovo file rimangono operazioni esplicite di gestione file.

Gli eventuali adattatori legacy e il menu nativo catturano il bersaglio al momento dell'invocazione, prima di dialoghi o attese, e lo verificano quando eseguono l'azione. Non si presume che il vecchio metodo senza contesto possa riconoscere da solo una vista obsoleta: la UI aggiornata usa sempre il percorso contestuale. Questo è un contratto interno al pacchetto desktop, non un'API pubblica versionata per client esterni.

### Anteprima e conferma

1. Un metodo applicativo specifico riceve input e contesto, valida e simula senza scrivere.
2. Restituisce `READY` oppure `BLOCKED`, riepilogo completo, effetti paginati, avvisi ed elementi bloccanti.
3. Il server conserva in memoria input validato e piano associati a `previewId`, sessione e revisione. Scadenza: 15 minuti; massimo 32 anteprime per sessione, eliminando quelle scadute e poi le più vecchie.
4. La conferma invia soltanto `previewId` e contesto atteso: il client non può cambiare gli effetti o confermare soltanto la pagina visibile.
5. Il backend verifica sessione, revisione, scadenza, stato e corrispondenza dell'operazione con il metodo di conferma; riesegue la validazione e applica tutti gli aggiornamenti in una sola transazione.
6. Un errore lascia dati e revisione invariati. Una conferma riuscita consuma l'anteprima; non si ripete automaticamente una scrittura con esito incerto.

Nessuna transazione resta aperta tra anteprima e conferma. Il cambio file invalida le anteprime. Una nuova scrittura rende le precedenti obsolete: una revisione cambiata produce `REVISION_CONFLICT`; una conferma assente/scaduta/consumata produce `PREVIEW_EXPIRED`; una proposta bloccata non è applicabile.

I metodi sono specifici del caso d'uso, per esempio `services.previewCreate`, `services.confirmCreate`, `services.updateNotes`. Le note usano un comando proprio senza riattribuzione o ricalcolo. `ApplicationErrorDto` distingue codice, messaggio italiano, errori per campo ed entità in conflitto; stack e SQL rimangono nei log locali.

## D05 — Scelte fisiche minime e decisioni ancora da verificare

| Scelta                                                                                                                                                             | Stato P00                                                                                    | Adozione                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Tabelle tipizzate per identità/versioni; FK reali, contatori per tipo e prenotazioni tipizzate per proprietario. Nessun EAV o riferimento polimorfico privo di FK. | Adottata come convenzione.                                                                   | P03–P07 scelgono soltanto colonne e indici necessari al proprio flusso.             |
| Una sola versione iniziale per identità e decorrenze uniche.                                                                                                       | Adottata: indice parziale per `effective_from IS NULL` e indice sulle decorrenze successive. | P03–P04.                                                                            |
| Chiave porto come colonne normalizzate nome/località/paese; banchina scoped sul porto; prenotazioni storiche persistenti.                                          | Adottata; niente concatenazione con separatori ambigui.                                      | P03–P07.                                                                            |
| Prima nuova migrazione per aggiungere una revisione non negativa ai metadati, default `0`, preservando gli archivi v1.                                             | Adottata come obiettivo, SQL ancora da implementare.                                         | P01; non modificare `0001_archive.sql`.                                             |
| `ServiceActivity` distinta da `VesselOperation`, con dati FREE/CATALOG esclusivi e contesto obbligatorio.                                                          | V01: struttura logica adottata, layout fisico da verificare con i vincoli reali.             | P14–P15. Una tabella discriminata con `CHECK` è il candidato iniziale.              |
| Estremi delle operazioni separati e componenti economiche con identità propria.                                                                                    | V02: schema da verificare con integrità e ricostruzione.                                     | P10–P12; unicità per nave/minuto e coerenza dell'estremo con la propria operazione. |
| Componenti e permanenze mantengono l'identità quando rimane lo stesso significato di apertura/componente.                                                          | Regola recepita, algoritmo V03 da verificare.                                                | P17A–P17D, mediante casi di ricostruzione.                                          |

Le migrazioni avanzano una alla volta con le slice. P00 non crea tabelle funzionali, non prenota tutta la numerazione futura e non installa le librerie dello spike nelle dipendenze distribuite.

## 6. Registro delle ambiguità

| ID  | Tema                                                                                                                                                              | Esito                                                                                                                                                                                                                                      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A01 | «Non precede» contro estremi univoci e arrivo strettamente successivo.                                                                                            | Risolto con R01.1; requisiti §2.19 e modello §3.12.8 forniscono la precisazione.                                                                                                                                                           |
| A02 | Scala non fissata per pesi e valori tariffari.                                                                                                                    | Risolto tecnicamente con decimali esatti, limite di dimensione e precisione verificata; nessun taglio a 2/3/6 decimali dei fattori.                                                                                                        |
| A03 | File copiati con lo stesso ID.                                                                                                                                    | Risolto con sessione distinta e revisione persistente, D04.                                                                                                                                                                                |
| A04 | UUIDv7 candidato nel vecchio modello.                                                                                                                             | Scelta tecnica UUIDv4, D01; il significato di dominio resta invariato.                                                                                                                                                                     |
| A05 | Ristampa delle note: requisiti delle prestazioni citano il valore copiato nel documento, le sezioni di fatturazione prevedono anche note correnti nelle ristampe. | Questione da precisare prima del modulo fatture: requisiti §2.11 e §§2.16/CU-FAT-11…12, dominio sulla rappresentazione storica. Non blocca P01–P20: qui le note correnti sono modificabili senza ricalcoli e nessuna fattura viene emessa. |

Non rimangono ambiguità funzionali bloccanti per P01. Le scelte V01–V03 sono verifiche implementative previste nelle rispettive slice, non richieste di completare tutto il modello prima di scrivere codice.

## 7. Evidenze e passaggio a P01

Comando ripetibile dopo l'installazione descritta nello [spike](../../spikes/p00/README.md):

```powershell
npm run verify:p00
```

Il comando compila contratti ed esempi e verifica **21 prove per runtime**, sia con Node.js di sviluppo sia con il Node incluso in Electron. Sono verificati prodotti esatti, arrotondamenti, formula aritmetica degli extra, limite int64, ore inesistenti/ambigue, offset e date non validi, confronti UTC e indipendenza dal fuso del processo.

Gli esempi `contextCases`, `assignmentCases`, `sessionCases` e `futureScenarios` descrivono gli esiti attesi delle slice future: non si dichiarano test applicativi superati. Lo spike non accede a database o UI e non viene distribuito. Le dipendenze sono fissate nel suo lockfile separato.

P01 può partire in una nuova chat, ragionamento `high`, leggendo questo documento, i contratti e i casi `ARC-*`/`IMP-02`. La sua consegna è il coordinamento dell'archivio con token, revisione, contratti e navigazione minima; l'adozione dei due adattatori numerici e temporali resta P02.
