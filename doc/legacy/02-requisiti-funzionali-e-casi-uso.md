# 2. Requisiti funzionali e casi d'uso

## 2.1 Scopo del documento

Questo documento traduce l'analisi del dominio in comportamenti osservabili dell'applicazione.

Per ogni ambito funzionale vengono definiti:

- gli obiettivi dell'operatore;
- le condizioni necessarie per avviare l'operazione;
- il flusso principale;
- le varianti e le condizioni di errore;
- gli effetti prodotti sui dati;
- i vincoli che il sistema deve applicare.

Il documento descrive il comportamento richiesto senza vincolare anticipatamente la disposizione delle schermate, la tecnologia utilizzata o i dettagli tecnici della persistenza.

## 2.2 Attori

### Operatore

L'operatore è l'unico attore umano previsto nella prima versione dell'applicazione. Può utilizzare tutte le funzioni disponibili e non sono previsti autenticazione, utenti distinti o ruoli applicativi.

### Sistema

Il sistema valida i dati, applica le regole di dominio, calcola gli effetti delle operazioni, impedisce le variazioni non consentite e garantisce l'atomicità degli aggiornamenti.

## 2.3 Convenzioni

- I casi d'uso sono identificati mediante un codice stabile nel formato `CU-<AMBITO>-<NUMERO>`.
- Il flusso principale descrive il comportamento atteso quando tutti i dati sono validi.
- Le alternative comprendono sia varianti consentite sia condizioni che impediscono l'operazione.
- Per **fattura consolidata** si intende una fattura nello stato `emessa`, `parzialmente saldata` o `saldata`.
- Un'operazione atomica viene applicata interamente oppure non produce alcuna variazione persistente.
- Le decisioni relative alla sola presentazione grafica vengono rinviate alla progettazione dell'interfaccia.

## 2.4 Metodo di trattazione dei punti

Ogni punto della fase 2 viene sviluppato secondo una struttura comune:

1. **Tema e perimetro**, per chiarire le funzioni comprese e quelle rinviate ad altri punti.
2. **Requisiti funzionali comuni**, per raccogliere una sola volta i comportamenti condivisi dai casi d'uso dell'ambito.
3. **Casi d'uso**, descritti mediante obiettivo, precondizioni, flusso principale, alternative, vincoli e risultato.
4. **Interazioni con altri ambiti**, quando l'operazione produce effetti su elementi trattati in punti differenti.
5. **Esito del punto**, con riepilogo della copertura e indicazione delle eventuali decisioni ancora aperte.

I requisiti già stabiliti dall'analisi del dominio vengono tradotti direttamente in casi d'uso. Le nuove decisioni funzionali che emergono durante la trattazione vengono invece sottoposte a conferma prima di essere considerate definitive.

## 2.5 Indice dettagliato della fase 2

### Punto 1 – Anagrafiche e versioni temporali

**Codice dei casi d'uso:** `CU-ANA`.

Il punto comprende:

- consultazione e ricerca delle anagrafiche;
- visualizzazione del dettaglio corrente e della cronologia;
- creazione di navi, clienti, agenzie, porti, banchine e merci;
- generazione dell'identità tecnica e del codice progressivo stabile;
- validazione dei dati identificativi e del codice IMO;
- inserimento di versioni passate, intermedie, correnti o future;
- modifica dei valori e delle decorrenze;
- eliminazione delle versioni successive a quella iniziale;
- analisi preventiva degli effetti e ricalcolo degli elementi non consolidati;
- disattivazione e riattivazione delle anagrafiche;
- eliminazione fisica in assenza di riferimenti;
- relazione subordinata e immutabile tra porto e banchine.

### Punto 2 – Viaggi, visite e ormeggi

**Codice dei casi d'uso:** `CU-PER`.

Il punto comprende:

- consultazione delle permanenze di una nave;
- struttura gerarchica `nave → viaggio → visita → ormeggio`;
- apertura e chiusura di viaggi, visite e ormeggi;
- persistenza degli elementi derivati dalle operazioni nave;
- gestione di visite e ormeggi ancora aperti;
- visite riferite a un porto e ormeggi con banchina facoltativa;
- ormeggi consecutivi privi di banchina specificata;
- attribuzione temporale delle attività a viaggio, visita e ormeggio;
- gestione degli intervalli di spostamento tra porti;
- ricostruzione controllata in seguito a variazioni delle operazioni;
- protezione delle attribuzioni appartenenti ad attività consolidate;
- consultazione cronologica e rappresentazione dello stato `aperto` o `chiuso`.

### Punto 3 – Operazioni nave

**Codice dei casi d'uso:** `CU-OPN`.

Il punto comprende:

- utilizzo delle tipologie fisse `entrata`, `spostamento` e `uscita`;
- registrazione dei dati comuni, dello stato di esecuzione e delle note;
- precisione temporale al minuto e unicità dell'istante tra operazioni nave;
- registrazione di un'entrata e apertura della permanenza;
- spostamento tra banchine dello stesso porto;
- spostamento tra porti con partenza e arrivo;
- generazione delle componenti economiche `uscita` ed `entrata` per lo spostamento tra porti e loro fatturabilità autonoma;
- registrazione di un'uscita e chiusura della permanenza;
- controllo delle sequenze operative ammesse;
- gestione delle operazioni `previste`, `effettuate` e `mancate`;
- inserimento retroattivo o intermedio nella sequenza;
- modifica ed eliminazione delle operazioni;
- aggiornamento atomico di viaggi, visite e ormeggi;
- blocco delle variazioni incompatibili con attività consolidate.

### Punto 4 – Prestazioni

**Codice dei casi d'uso:** `CU-PRE`.

Il punto comprende:

- consultazione delle prestazioni di una nave e di una permanenza;
- distinzione tra prestazioni da catalogo e prestazioni libere;
- gestione del catalogo espandibile delle prestazioni;
- registrazione di una prestazione da catalogo;
- registrazione di una prestazione libera con descrizione e importo;
- attribuzione temporale a viaggio, visita e ormeggio;
- gestione degli stati `prevista`, `effettuata` e `mancata`;
- modifica dello stato e aggiornamento degli elementi dipendenti;
- modifica ed eliminazione delle prestazioni non consolidate;
- gestione delle note sempre modificabili;
- determinazione della fatturabilità;
- gestione delle prestazioni future e delle prestazioni riferite a permanenze aperte;
- avvisi relativi ad attività precedenti ancora previste.

### Punto 5 – Movimentazioni merci

**Codice dei casi d'uso:** `CU-MER`.

Il punto comprende:

- consultazione delle movimentazioni;
- registrazione di carico e scarico;
- selezione della merce e inserimento di una quantità positiva;
- attribuzione a nave, viaggio, visita e ormeggio;
- applicazione delle versioni anagrafiche valide alla data e all'ora;
- modifica ed eliminazione delle movimentazioni consentite;
- gestione delle movimentazioni durante gli spostamenti tra porti;
- rappresentazione storica della merce;
- aggregazione delle quantità soltanto nell'ambito della stessa merce;
- assenza di totali trasversali tra merci differenti nella prima versione.

### Punto 6 – Determinazione di cliente e agenzia

**Codice dei casi d'uso:** `CU-SOG`.

Il punto comprende:

- assegnazione indipendente di cliente e agenzia;
- valori specificabili ai livelli di viaggio, visita, ormeggio o prestazione previsti dal dominio;
- ordine di priorità utilizzato per determinare i riferimenti effettivi;
- possibilità che uno dei due soggetti sia temporaneamente assente;
- memorizzazione dei riferimenti determinati sulla prestazione;
- determinazione autonoma della coppia `cliente + agenzia` per ciascuna componente economica di uno spostamento tra porti;
- ricalcolo in seguito a modifiche dei livelli di origine;
- conservazione di un valore specificato a un livello più prioritario;
- blocco delle variazioni che modificherebbero attività consolidate;
- requisiti necessari per inserire una prestazione in fattura;
- selezione esplicita di cliente e agenzia sulla fattura prima della composizione;
- filtro delle attività in base alla coppia selezionata sulla fattura;
- possibilità di associare le componenti dello stesso spostamento a fatture differenti;
- uniformità della coppia `cliente + agenzia` all'interno della fattura.

### Punto 7 – Tariffe e pesi

**Codice dei casi d'uso:** `CU-TAR`.

Il punto comprende:

- consultazione della sequenza tariffaria di un porto;
- creazione di una tariffa riferita a un solo porto;
- compilazione della nuova tariffa da zero oppure mediante copia autonoma di una tariffa esistente;
- configurazione completa di tutte le tipologie di nave;
- definizione degli scaglioni ordinari;
- definizione dell'ampiezza dello scaglione extra e della tariffa extra;
- inserimento di tariffe passate, intermedie, correnti o future;
- modifica della decorrenza e dei valori tariffari;
- eliminazione di una tariffa dalla sequenza;
- individuazione di tariffa, configurazione e scaglione applicabili;
- calcolo degli scaglioni extra;
- gestione delle versioni temporali dei pesi delle prestazioni e delle operazioni nave;
- calcolo e memorizzazione di `valore tariffario × peso` alla creazione della prestazione o componente economica;
- simulazione degli impatti, ricalcolo e aggiornamento delle fatture in immissione;
- protezione dei dati e dei risultati consolidati.

### Punto 8 – Regole economiche e fiscali

**Codice dei casi d'uso:** `CU-ECO`.

Il punto comprende:

- consultazione e configurazione delle regole;
- definizione di ambito, fase e priorità di applicazione;
- configurazione delle condizioni e delle conseguenze;
- combinazione delle regole aventi la stessa priorità;
- inserimento, modifica ed eliminazione delle versioni temporali;
- variazione temporale dello stato `attiva` o `disattivata`;
- configurazione nelle regole delle condizioni orarie, comprese quelle utilizzate per le maggiorazioni notturne, e gestione delle festività;
- gestione delle prestazioni mancate;
- applicazione ordinata delle regole e degli arrotondamenti intermedi;
- notifica preventiva delle riduzioni che azzerano un importo;
- applicazione dell'IVA secondo il perimetro iniziale;
- configurazione e applicazione della marca da bollo mediante una regola dinamica di fattura;
- simulazione degli impatti e ricalcolo degli elementi non consolidati;
- blocco delle variazioni dirette o indirette alle fatture consolidate.

### Punto 9 – Fatture

**Codice dei casi d'uso:** `CU-FAT`.

Il punto comprende:

- consultazione e ricerca delle fatture;
- creazione di una fattura nello stato `in immissione`;
- selezione di prestazioni e operazioni nave fatturabili;
- selezione autonoma delle componenti `uscita` ed `entrata` generate da uno spostamento tra porti;
- possibilità di associare le due componenti, anche in momenti diversi, a fatture differenti;
- unicità dell'associazione alla fattura e consolidamento separato per ciascuna componente economica;
- selezione preventiva della coppia `cliente + agenzia` e filtro degli elementi compatibili;
- aggiunta e rimozione delle attività;
- applicazione degli sconti di riga e complessivi;
- precisione, arrotondamenti e utilizzo dell'euro;
- assegnazione e modifica di numero, suffisso e data;
- controllo dei salti nella numerazione;
- notifica delle attività precedenti ancora previste;
- emissione e consolidamento della fattura;
- visualizzazione e ristampa dei dati consolidati;
- modifica delle note dopo l'emissione;
- ritiro consentito della fattura emessa;
- transizioni automatiche in base agli importi saldati;
- eliminazione della fattura in immissione e disassociazione atomica delle attività.

### Punto 10 – Contabilità

**Codice dei casi d'uso:** `CU-CON`.

Il punto comprende:

- gestione dei conti finanziari e dei relativi saldi iniziali;
- consultazione cronologica dei movimenti;
- registrazione di entrate e uscite;
- registrazione dei giroconti e degli eventuali costi;
- modifica ed eliminazione dei movimenti;
- assegnazione e modifica del codice operativo;
- progressivo giornaliero e saldo progressivo;
- calcolo dei saldi alla data;
- gestione delle categorie di spesa gerarchiche;
- gestione delle voci contabili autonome;
- associazione integrale di un movimento a più voci;
- disattivazione, riattivazione ed eliminazione di conti, categorie e voci;
- conservazione dei riferimenti esistenti alle classificazioni disattivate;
- neutralità del capitale trasferito nei resoconti aziendali.

### Punto 11 – Incassi e ripartizione dei pagamenti

**Codice dei casi d'uso:** `CU-INC`.

Il punto comprende:

- identificazione dei movimenti in entrata utilizzabili come incassi;
- attribuzione dell'incasso a cliente e agenzia;
- ricerca delle fatture associabili;
- associazione di uno stesso incasso a più fatture;
- associazione di più incassi alla stessa fattura;
- inserimento di quote strettamente positive;
- proposta di ripartizione progressiva dell'importo disponibile;
- modifica manuale della ripartizione proposta;
- gestione della parte non attribuita;
- controllo del residuo del movimento e delle fatture;
- modifica o rimozione delle quote;
- aggiornamento automatico degli importi saldati e degli stati delle fatture;
- applicazione atomica della ripartizione;
- gestione dei vincoli che impediscono ritiro o modifica della fattura.

### Punto 12 – Date, orari e fusi operativi

**Codice dei casi d'uso:** `CU-TEM`.

Il punto comprende:

- distinzione tra date civili, date e ore di dominio e istanti tecnici;
- configurazione del fuso aziendale;
- configurazione autonoma del fuso operativo dei porti;
- utilizzo dei `ZoneId` IANA;
- conservazione di valore locale, fuso, offset e istante UTC;
- interpretazione distinta di partenza e arrivo negli spostamenti tra porti;
- gestione delle ore inesistenti o ambigue durante i cambi stagionali;
- inserimento delle versioni dei fusi;
- comportamento dei dati già registrati dopo un cambio ordinario;
- correzione di un fuso configurato erroneamente;
- simulazione degli effetti e protezione degli elementi consolidati;
- utilizzo delle date civili per fatture, contabilità, saldi e festività;
- rappresentazione ed esportazione dei riferimenti temporali.

### Punto 13 – Resoconti ed esportazioni

**Codice dei casi d'uso:** `CU-RES`.

Il punto comprende:

- scelta dell'ambito e della granularità;
- selezione controllata di dimensioni, misure e collegamenti;
- definizione di filtri, raggruppamenti e ordinamenti;
- prevenzione delle duplicazioni degli importi;
- calcolo delle misure generali e specifiche del dominio;
- gestione delle durate degli elementi ancora aperti;
- applicazione delle regole contabili dei resoconti;
- scelta del riferimento temporale;
- rappresentazione dei dati storici e consolidati;
- consultazione degli elementi sottostanti;
- utilizzo delle configurazioni predefinite;
- creazione, modifica, duplicazione ed eliminazione delle configurazioni personalizzate;
- esportazione nei formati `CSV` e `XLSX`;
- indicazione dei filtri, del fuso e dell'istante di generazione;
- gestione di cache o proiezioni derivate senza modificarne il significato.

### Punto 14 – Configurazioni generali, backup e ripristino

**Codice dei casi d'uso:** `CU-CFG`.

Il punto comprende:

- consultazione e modifica delle configurazioni generali non trattate negli altri ambiti;
- inizializzazione dell'applicazione e dei valori predefiniti;
- validazione delle configurazioni prima dell'applicazione;
- creazione manuale di un backup completo;
- individuazione e conservazione dei backup disponibili;
- verifica dell'integrità di un backup;
- ripristino controllato dei dati;
- protezione dei dati correnti prima del ripristino;
- gestione degli errori o delle interruzioni durante backup e ripristino;
- conferma dell'esito e verifica della consistenza dei dati ripristinati;
- distinzione tra backup operativo, esportazione tabellare e futura migrazione dei dati.

### Punto 15 – Revisione trasversale e chiusura della fase

**Codice di verifica:** `REV-FUN`.

Il punto comprende:

- verifica della copertura di tutte le regole del dominio;
- controllo della coerenza tra casi d'uso appartenenti ad ambiti differenti;
- uniformazione di attori, stati, termini e strutture descrittive;
- verifica delle precondizioni e dei risultati di ogni caso d'uso;
- controllo delle notifiche, delle conferme e dei messaggi di blocco;
- verifica delle operazioni atomiche e dei ricalcoli indiretti;
- controllo della protezione dei dati consolidati;
- individuazione e rimozione delle duplicazioni informative;
- verifica delle decisioni rinviate alle fasi successive;
- costruzione della matrice di tracciabilità tra dominio e requisiti;
- riepilogo finale dei casi d'uso e chiusura formale della fase 2.

## 2.6 Ordine e dipendenze

I punti vengono trattati nell'ordine indicato. Le dipendenze principali sono:

| Punto | Dipendenze principali |
| --- | --- |
| 1. Anagrafiche | Costituisce la base comune per tutti gli ambiti successivi. |
| 2. Viaggi, visite e ormeggi | Dipende dalle anagrafiche di nave, porto e banchina. |
| 3. Operazioni nave | Dipende dalla struttura delle permanenze e ne determina gli aggiornamenti. |
| 4. Prestazioni | Dipende dalle permanenze e dalle regole di attribuzione temporale. |
| 5. Movimentazioni merci | Dipende da anagrafiche e permanenze. |
| 6. Cliente e agenzia | Dipende dai livelli operativi e dalle prestazioni sui quali vengono specificati. |
| 7. Tariffe e pesi | Dipende da porti, navi, operazioni e tipi di prestazione. |
| 8. Regole economiche | Dipende dagli importi tariffari e dagli istanti economici delle attività. |
| 9. Fatture | Dipende da prestazioni, soggetti e calcoli economici. |
| 10. Contabilità | Introduce i movimenti utilizzati anche per registrare gli incassi. |
| 11. Incassi | Dipende da fatture e movimenti contabili in entrata. |
| 12. Date, orari e fusi | È trasversale ai punti precedenti e ne consolida i comportamenti temporali. |
| 13. Resoconti | Dipende da tutti gli ambiti dai quali espone dati e misure. |
| 14. Configurazioni e backup | Dipende dalla definizione dei dati e delle configurazioni da proteggere. |
| 15. Revisione finale | Dipende dal completamento di tutti i punti precedenti. |

Le regole temporali definite nel dominio si applicano a tutti gli ambiti interessati; il punto 12 ne consolida i casi d'uso specifici di configurazione, cambio e correzione dei fusi.

## 2.7 Stato dell'analisi funzionale

| Punto | Ambito | Stato |
| --- | --- | --- |
| 1 | Anagrafiche e versioni temporali | Completato |
| 2 | Viaggi, visite e ormeggi | Completato |
| 3 | Operazioni nave | Completato |
| 4 | Prestazioni | Completato |
| 5 | Movimentazioni merci | Completato |
| 6 | Determinazione di cliente e agenzia | Completato |
| 7 | Tariffe e pesi | Completato |
| 8 | Regole economiche e fiscali | Completato |
| 9 | Fatture | Completato |
| 10 | Contabilità | Completato |
| 11 | Incassi e ripartizione dei pagamenti | Completato |
| 12 | Date, orari e fusi operativi | Completato |
| 13 | Resoconti ed esportazioni | Completato |
| 14 | Configurazioni generali, backup e ripristino | Completato |
| 15 | Revisione trasversale e chiusura | Completato |

## 2.8 Punto 1 – Anagrafiche e versioni temporali

### Tema

L'ambito comprende la gestione di navi, clienti, agenzie, porti, banchine e merci, incluse le rispettive versioni temporali, lo stato corrente e l'eliminazione fisica.

### Requisiti funzionali comuni

#### Identità e versione applicabile

- Ogni anagrafica mantiene un'identità tecnica e un codice progressivo stabili per tutta la propria esistenza.
- La creazione produce una versione iniziale priva di decorrenza e assegna lo stato `attiva`.
- Le versioni successive possiedono una data e un'ora di decorrenza e formano una sequenza continua, senza sovrapposizioni o intervalli privi di una versione applicabile.
- La versione valida in un istante è quella avente la decorrenza più recente non successiva all'istante considerato; la versione iniziale copre ogni istante precedente alla prima decorrenza.
- Gli intervalli temporali hanno inizio incluso e fine esclusa.

#### Validazione dei dati identificativi

- La creazione e ogni variazione dei dati identificativi devono verificare l'unicità rispetto a tutte le versioni, attuali e storiche, delle identità esistenti.
- Il confronto testuale ignora gli spazi iniziali e finali e non distingue tra lettere maiuscole e minuscole.
- I valori identificativi precedentemente utilizzati rimangono riservati alla stessa identità finché l'intera anagrafica non viene eliminata.
- Il codice IMO della nave può essere assente; quando presente, deve essere univoco tra tutte le versioni di tutte le navi.

#### Analisi preventiva degli effetti

Quando l'inserimento, la modifica o l'eliminazione di una versione può cambiare la versione applicabile ad altri elementi, il sistema deve:

1. individuare l'intervallo temporale interessato;
2. determinare gli elementi operativi ed economici coinvolti, compresi quelli futuri già registrati;
3. simulare attribuzioni, ricostruzioni operative, calcoli e risultati conseguenti;
4. distinguere gli elementi ricalcolabili da quelli consolidati;
5. mostrare gli elementi che verrebbero aggiornati e quelli che impediscono l'operazione;
6. applicare variazione e ricalcoli in una sola operazione atomica.

La variazione viene bloccata soltanto quando modificherebbe direttamente o indirettamente dati o risultati appartenenti a una fattura consolidata. La sola presenza di elementi consolidati nell'intervallo non costituisce un blocco se tutti i dati e i risultati da essi utilizzati rimangono invariati.

#### Conferme e versioni ridondanti

- Una nuova versione deve modificare almeno un valore rispetto alla versione applicabile immediatamente prima della propria decorrenza.
- Se tutti i valori coincidono con quelli della versione precedente, il sistema impedisce il salvataggio perché la nuova versione non rappresenterebbe alcuna variazione.
- Il sistema non accorpa automaticamente versioni adiacenti con valori identici, neppure quando tale situazione deriva dalla modifica di una versione esistente. L'eventuale semplificazione della sequenza richiede l'eliminazione esplicita di una versione secondo le relative regole.
- L'operatore deve fornire una conferma esplicita prima di applicare:
  - l'inserimento o la modifica di una versione temporale;
  - l'eliminazione di una versione o dell'intera anagrafica;
  - la disattivazione di un'anagrafica;
- Prima della conferma, il sistema mostra gli effetti rilevanti dell'operazione; una conferma non può comunque superare un vincolo bloccante.

#### Rappresentazione e selezione

- Nella gestione delle anagrafiche viene utilizzata per impostazione predefinita la versione valida nel momento corrente, mantenendo accessibile l'intera cronologia.
- Gli elementi storici mostrano i dati della versione applicabile alla propria data e ora di riferimento.
- Le anagrafiche disattivate restano consultabili nella gestione, nelle ricerche storiche, nei resoconti e negli elementi che già le referenziano.
- Le funzioni destinate alla creazione o alla sostituzione di un riferimento propongono esclusivamente anagrafiche attive.
- Un riferimento esistente a un'anagrafica disattivata può essere mantenuto mentre si modificano altri dati, ma non può essere nuovamente selezionato dopo la sua rimozione finché l'anagrafica non viene riattivata.

### CU-ANA-01 – Consultare le anagrafiche

**Obiettivo:** individuare e consultare le anagrafiche di una determinata tipologia.

**Precondizioni:** nessuna.

**Flusso principale:**

1. L'operatore seleziona la tipologia di anagrafica.
2. Il sistema mostra le identità esistenti mediante i dati della versione valida nel momento corrente.
3. Per ogni identità il sistema rende riconoscibile lo stato corrente `attiva` o `disattivata`.
4. L'operatore può ricercare o filtrare gli elementi utilizzando i dati disponibili per la tipologia scelta.
5. L'operatore seleziona un elemento per consultarne il dettaglio.

**Alternative e vincoli:**

- Le anagrafiche disattivate devono rimanere raggiungibili dalla funzione di gestione.
- Una ricerca riferita a dati storici deve poter ricondurre il risultato alla relativa identità anche quando il valore ricercato non appartiene alla versione corrente.

**Risultato:** nessun dato viene modificato.

### CU-ANA-02 – Consultare il dettaglio e la cronologia

**Obiettivo:** visualizzare i dati correnti e l'evoluzione temporale di un'anagrafica.

**Precondizioni:** l'anagrafica esiste.

**Flusso principale:**

1. L'operatore apre il dettaglio dell'anagrafica.
2. Il sistema mostra i dati della versione valida nel momento corrente e lo stato corrente dell'identità.
3. Il sistema rende disponibile la sequenza completa delle versioni, ordinata per decorrenza.
4. Per ogni versione vengono mostrati i valori contenuti e il relativo intervallo di validità derivato.
5. L'operatore può selezionare una versione per consultarne il dettaglio.

**Alternative e vincoli:**

- La versione iniziale viene rappresentata come valida senza limite temporale inferiore.
- L'ultima versione viene rappresentata come valida senza limite temporale finale.
- Se esistono versioni future, il sistema distingue la versione corrente da quelle non ancora applicabili.

**Risultato:** nessun dato viene modificato.

### CU-ANA-03 – Creare un'anagrafica

**Obiettivo:** registrare una nuova nave, cliente, agenzia, porto, banchina o merce.

**Precondizioni:**

- l'operatore ha selezionato la tipologia da creare;
- per una banchina, il porto di appartenenza esiste ed è attivo.

**Flusso principale:**

1. L'operatore inserisce i dati richiesti dalla tipologia scelta.
2. Per una banchina, il sistema acquisisce il porto nel cui ambito viene effettuata la creazione.
3. Il sistema normalizza i dati utilizzati per i confronti e verifica obbligatorietà e formato.
4. Il sistema verifica l'unicità dei dati identificativi e degli eventuali identificativi secondari.
5. Il sistema genera una nuova identità tecnica e un nuovo codice progressivo non riutilizzabile.
6. Il sistema crea la versione iniziale priva di decorrenza.
7. Il sistema assegna all'anagrafica lo stato `attiva`.

**Alternative e vincoli:**

- Se manca un dato obbligatorio o un valore non rispetta il formato previsto, il sistema non salva l'anagrafica e indica i campi da correggere.
- Se un dato identificativo è riservato a un'altra identità, il sistema impedisce la creazione e indica il conflitto.
- Una banchina non può essere creata in un porto disattivato.
- Il porto di appartenenza della banchina non potrà essere modificato successivamente.

**Risultato:** esiste una nuova anagrafica attiva con una sola versione iniziale.

### CU-ANA-04 – Inserire una versione anagrafica

**Obiettivo:** introdurre nuovi valori con una specifica decorrenza, senza creare una nuova identità.

**Precondizioni:** l'anagrafica esiste.

**Flusso principale:**

1. L'operatore richiede l'inserimento di una nuova versione.
2. Inserisce i nuovi valori e una data e un'ora di decorrenza.
3. Il sistema verifica dati obbligatori, formati, unicità e assenza di un'altra versione con la stessa decorrenza.
4. Il sistema colloca la versione nella sequenza temporale e determina gli intervalli risultanti.
5. Il sistema esegue l'analisi preventiva degli effetti.
6. Il sistema mostra l'intervallo interessato, gli elementi ricalcolabili e gli eventuali elementi consolidati che impediscono l'operazione.
7. Se l'operazione è consentita, l'operatore la conferma.
8. Il sistema inserisce la versione, ridefinisce gli intervalli e ricalcola gli elementi non consolidati interessati.

**Alternative e vincoli:**

- La decorrenza può essere passata, intermedia, corrente o futura.
- Se la decorrenza coincide con quella di un'altra versione, il sistema richiede un valore differente.
- Se i valori coincidono integralmente con quelli della versione applicabile immediatamente precedente, il sistema impedisce il salvataggio della nuova versione.
- Se verrebbe modificato un dato o risultato consolidato, il sistema impedisce la conferma e non applica variazioni.
- Se la validazione o il ricalcolo falliscono, nessuna parte dell'operazione viene conservata.

**Risultato:** la nuova versione è inserita nella sequenza e tutti gli elementi modificabili interessati risultano coerenti con essa.

### CU-ANA-05 – Modificare una versione anagrafica

**Obiettivo:** correggere i valori o la decorrenza di una versione esistente.

**Precondizioni:** l'anagrafica e la versione esistono.

**Flusso principale:**

1. L'operatore seleziona la versione da modificare.
2. Modifica i valori consentiti.
3. Se la versione non è quella iniziale, può modificarne anche la data e l'ora di decorrenza.
4. Il sistema valida dati, unicità e sequenza temporale risultante.
5. Il sistema esegue l'analisi preventiva degli effetti.
6. Se l'operazione è consentita, l'operatore la conferma.
7. Il sistema aggiorna la versione, ridefinisce gli intervalli interessati e ricalcola gli elementi non consolidati.

**Alternative e vincoli:**

- La versione iniziale può essere corretta nei valori, ma non può ricevere una decorrenza.
- Il porto di appartenenza di una banchina non è un dato versionabile e non può essere modificato.
- La modifica viene bloccata se produrrebbe decorrenze duplicate, intervalli ambigui o variazioni di dati o risultati consolidati.
- Se la modifica rende identiche due versioni adiacenti, entrambe vengono conservate; il sistema non le accorpa automaticamente.
- Se la validazione o il ricalcolo falliscono, la versione conserva integralmente i valori precedenti.

**Risultato:** la sequenza delle versioni e gli elementi modificabili dipendenti risultano coerenti con la modifica.

### CU-ANA-06 – Eliminare una versione anagrafica

**Obiettivo:** annullare una variazione temporale considerandola mai avvenuta.

**Precondizioni:** la versione selezionata è successiva alla versione iniziale.

**Flusso principale:**

1. L'operatore richiede l'eliminazione della versione.
2. Il sistema determina la sequenza temporale risultante e la versione che diventerebbe applicabile nell'intervallo liberato.
3. Il sistema esegue l'analisi preventiva degli effetti.
4. Se l'operazione è consentita, l'operatore la conferma.
5. Il sistema elimina la versione, estende la validità della versione precedente e ricalcola gli elementi non consolidati interessati.

**Alternative e vincoli:**

- La versione iniziale e l'unica versione esistente non possono essere eliminate.
- L'eliminazione viene bloccata se cambierebbe direttamente o indirettamente dati o risultati consolidati.
- Se la validazione o il ricalcolo falliscono, la versione rimane invariata.

**Risultato:** la versione non esiste più e la sequenza temporale rimane continua e non ambigua.

### CU-ANA-07 – Disattivare un'anagrafica

**Obiettivo:** impedire nuovi utilizzi dell'anagrafica conservando i riferimenti esistenti.

**Precondizioni:** l'anagrafica esiste ed è attiva.

**Flusso principale:**

1. L'operatore richiede la disattivazione.
2. Il sistema informa l'operatore che l'anagrafica non sarà più disponibile per la creazione o la sostituzione di riferimenti, mentre quelli esistenti verranno conservati.
3. Per un porto, il sistema indica che anche le banchine contenute verranno nascoste dalle nuove selezioni, senza modificarne lo stato individuale.
4. L'operatore conferma la disattivazione.
5. Il sistema imposta immediatamente lo stato corrente su `disattivata`.
6. Il sistema esclude l'anagrafica dalle funzioni destinate alla creazione o alla sostituzione di riferimenti.

**Alternative e vincoli:**

- La presenza di riferimenti, compresi quelli consolidati, non impedisce la disattivazione.
- I riferimenti esistenti, i dati storici e i risultati già calcolati non vengono modificati.
- La disattivazione di un porto nasconde dalle nuove selezioni anche le banchine che contiene, senza modificarne lo stato individuale.
- La disattivazione di una banchina non modifica lo stato del relativo porto o delle altre banchine.

**Risultato:** l'anagrafica rimane esistente e consultabile, ma non può essere utilizzata per creare nuovi riferimenti.

### CU-ANA-08 – Riattivare un'anagrafica

**Obiettivo:** rendere nuovamente utilizzabile un'anagrafica disattivata.

**Precondizioni:** l'anagrafica esiste ed è disattivata.

**Flusso principale:**

1. L'operatore richiede la riattivazione.
2. Il sistema imposta immediatamente lo stato corrente su `attiva`.
3. Il sistema rende l'anagrafica nuovamente disponibile nelle selezioni pertinenti.

**Alternative e vincoli:**

- La riattivazione non modifica gli elementi esistenti e non ricrea riferimenti precedentemente rimossi.
- La riattivazione di un porto rende nuovamente selezionabili soltanto le banchine contenute che risultano individualmente attive.

**Risultato:** l'anagrafica può essere utilizzata per nuovi riferimenti.

### CU-ANA-09 – Eliminare un'anagrafica

**Obiettivo:** rimuovere fisicamente un'identità anagrafica mai utilizzata o non più referenziata.

**Precondizioni:** l'anagrafica esiste.

**Flusso principale:**

1. L'operatore richiede l'eliminazione dell'intera anagrafica.
2. Il sistema cerca qualsiasi riferimento persistente diretto o indiretto all'identità o alle sue versioni.
3. Se non esistono riferimenti, il sistema informa l'operatore che l'eliminazione sarà fisica e comprenderà tutte le versioni dell'anagrafica.
4. L'operatore conferma l'eliminazione.
5. Il sistema elimina atomicamente identità, versioni e metadati tecnici.
6. Il sistema mantiene definitivamente riservato il codice progressivo eliminato e libera i dati identificativi per eventuali nuove identità.

**Alternative e vincoli:**

- La presenza di un qualsiasi riferimento impedisce l'eliminazione, indipendentemente dallo stato o dalla data dell'elemento collegato.
- Il sistema non elimina né modifica automaticamente gli elementi che impediscono l'operazione.
- Se l'eliminazione è impedita, il sistema mostra gli elementi coinvolti e indica la disattivazione come alternativa.
- Un porto non può essere eliminato finché contiene almeno una banchina o possiede altri riferimenti; non sono previste eliminazioni a cascata.

**Risultato:** se consentito, l'anagrafica e le sue versioni non esistono più; il suo codice progressivo non può essere riutilizzato.

### CU-ANA-10 – Gestire le banchine di un porto

**Obiettivo:** consultare e amministrare le banchine appartenenti a uno specifico porto.

**Precondizioni:** il porto esiste.

**Flusso principale:**

1. L'operatore apre il dettaglio del porto.
2. Il sistema mostra tutte le banchine contenute, comprese quelle disattivate.
3. L'operatore può consultarne dettaglio e versioni.
4. Se il porto è attivo, l'operatore può creare una nuova banchina nell'ambito del porto.
5. L'operatore può modificare, versionare, disattivare, riattivare o eliminare una banchina applicando i corrispondenti casi d'uso anagrafici.

**Alternative e vincoli:**

- Una banchina appartiene a un solo porto e non può essere spostata.
- La rimozione della banchina dall'elenco del porto equivale alla sua eliminazione fisica e richiede l'assenza di riferimenti persistenti.
- Per rappresentare la banchina presso un altro porto devono essere create una nuova identità e una nuova versione iniziale nel porto di destinazione.

**Risultato:** le banchine rimangono coerenti con il porto che le contiene e con i rispettivi riferimenti storici.

### Esito del punto

I casi d'uso di questo ambito coprono:

- consultazione corrente e storica;
- creazione delle identità;
- inserimento, modifica ed eliminazione delle versioni;
- disattivazione e riattivazione;
- eliminazione fisica;
- relazione subordinata tra porto e banchine;
- validazione preventiva degli effetti e protezione dei dati consolidati.

Le regole funzionali dell'ambito sono state confermate. Il punto è pertanto **completato**.

## 2.9 Punto 2 – Viaggi, visite e ormeggi

### Tema e perimetro

Il punto descrive la struttura persistente che rappresenta la permanenza operativa di una nave nei porti gestiti:

- il **viaggio**, relativo al percorso complessivo della nave;
- la **visita**, relativa alla permanenza presso uno specifico porto;
- l'**ormeggio**, relativo a un intervallo continuativo all'interno della visita, con banchina specificata oppure non specificata.

Viaggi, visite e ormeggi vengono determinati dalle operazioni nave con stato `prevista` o `effettuata`. Non costituiscono registrazioni operative autonome e non vengono aperti, chiusi o spostati manualmente. Le operazioni `mancate` non producono effetti sulla struttura.

Il punto riguarda la consultazione, la costruzione e l'aggiornamento di questa struttura. La registrazione e la gestione delle singole operazioni di entrata, spostamento e uscita sono dettagliate nel punto 3.

### Requisiti funzionali comuni

#### Struttura e cardinalità

- Ogni viaggio appartiene a una sola nave e comprende una o più visite.
- Ogni visita appartiene a un solo viaggio, riguarda un solo porto e comprende uno o più ormeggi.
- Ogni ormeggio appartiene a una sola visita e può indicare una banchina appartenente al porto della visita oppure lasciare la banchina non specificata.
- Per la stessa nave può esistere un solo viaggio aperto alla volta.
- All'interno di un viaggio può esistere una sola visita aperta alla volta.
- All'interno di una visita può esistere un solo ormeggio aperto alla volta.
- Visite e ormeggi appartenenti allo stesso contenitore devono essere ordinati temporalmente e non possono sovrapporsi.

#### Stati e intervalli

- Viaggi, visite e ormeggi utilizzano gli stati `aperto` e `chiuso`.
- Un elemento aperto possiede una data e un'ora di inizio, ma non una data e un'ora di fine fittizie.
- Un viaggio, la visita corrente e l'ultimo ormeggio possono rimanere aperti senza un limite temporale prestabilito.
- La durata di un elemento aperto, quando mostrata, viene calcolata fino a un istante di riferimento esplicito ed è indicata come provvisoria.
- L'entrata apre immediatamente il viaggio, la prima visita e il primo ormeggio.
- L'uscita appartiene all'ultima visita e all'ultimo ormeggio e ne determina la chiusura insieme al viaggio.

#### Confini temporali degli spostamenti

- Il minuto di partenza di uno spostamento appartiene all'ormeggio di origine e, quando il porto cambia, anche alla visita di origine.
- Il minuto di arrivo appartiene al nuovo ormeggio e, quando il porto cambia, alla nuova visita.
- Nei minuti strettamente successivi alla partenza e precedenti all'arrivo la nave risulta `in trasferimento` e non appartiene ad alcun ormeggio.
- Quando il porto cambia, durante il trasferimento la nave non appartiene neppure a una visita.
- Durante l'intervallo di trasferimento non possono essere registrate o attribuite prestazioni a catalogo o libere e non possono iniziare altre operazioni nave.

#### Persistenza e modificabilità

- Viaggi, visite, ormeggi e attribuzioni vengono persistiti e non vengono ricostruiti a ogni consultazione.
- Ogni elemento mantiene il collegamento alle operazioni nave che ne hanno determinato apertura, transizioni e chiusura.
- Date, orari, porto e banchina derivati non possono essere modificati direttamente dalle funzioni di gestione delle permanenze.
- La correzione della struttura richiede la modifica, l'inserimento o l'eliminazione delle operazioni nave originarie, secondo le regole del punto 3.
- Viaggi, visite e ormeggi non possono essere eliminati direttamente; la loro eventuale rimozione costituisce un effetto atomico della ricostruzione della sequenza operativa.

#### Protezione dei dati consolidati

- Prima di applicare una variazione strutturale, il sistema simula l'intera sequenza operativa risultante.
- La simulazione individua viaggi, visite, ormeggi, prestazioni e movimentazioni merci che verrebbero creati, modificati, riattribuiti o rimossi.
- La variazione viene bloccata se produce una sequenza non valida, lascia un'attività senza collocazione ammessa o modifica direttamente o indirettamente un dato consolidato.
- La presenza di attività consolidate non costituisce un blocco quando struttura, attribuzioni e dati da esse utilizzati rimangono invariati.
- Validazione, aggiornamento della struttura e riattribuzione degli elementi non consolidati costituiscono un'unica operazione atomica.

### CU-PER-01 – Consultare le permanenze

**Obiettivo:** individuare i viaggi, le visite e gli ormeggi registrati.

**Precondizioni:** nessuna.

**Flusso principale:**

1. L'operatore accede alla consultazione delle permanenze.
2. Il sistema consente di individuare gli elementi almeno per nave, stato, intervallo temporale, porto e banchina.
3. Per ogni viaggio il sistema mostra la nave, l'inizio, l'eventuale fine e lo stato.
4. Per un viaggio aperto il sistema mostra anche la visita e l'ormeggio correnti oppure indica che la nave è in trasferimento.
5. L'operatore seleziona un viaggio per consultarne il dettaglio.

**Alternative e vincoli:**

- Le anagrafiche vengono rappresentate mediante le versioni applicabili agli istanti dei singoli elementi.
- Le banchine non specificate devono essere riconoscibili senza confonderle con dati mancanti per errore.
- Le permanenze chiuse rimangono sempre consultabili.

**Risultato:** nessun dato viene modificato.

### CU-PER-02 – Consultare il dettaglio di un viaggio

**Obiettivo:** ricostruire cronologicamente la permanenza della nave e comprendere l'origine dei relativi intervalli.

**Precondizioni:** il viaggio esiste.

**Flusso principale:**

1. L'operatore apre il dettaglio del viaggio.
2. Il sistema mostra la nave, lo stato, l'intervallo complessivo e gli eventuali riferimenti specificati sul viaggio.
3. Il sistema mostra in ordine cronologico le visite e, all'interno di ciascuna visita, gli ormeggi.
4. Per ogni visita vengono mostrati porto, inizio, fine e stato.
5. Per ogni ormeggio vengono mostrati banchina, inizio, fine e stato.
6. Il sistema mostra le operazioni nave che hanno determinato ciascun confine temporale.
7. Gli intervalli di spostamento vengono rappresentati separatamente dagli intervalli di permanenza.
8. L'operatore può raggiungere il dettaglio delle visite, degli ormeggi e delle operazioni originarie.

**Alternative e vincoli:**

- Se il viaggio è aperto, il sistema distingue chiaramente gli elementi ancora aperti da quelli già chiusi.
- Se la nave è in trasferimento, il dettaglio mostra origine, destinazione, partenza e arrivo previsto o effettivo, senza creare un ormeggio intermedio.
- Ormeggi consecutivi con banchina non specificata rimangono elementi distinti.

**Risultato:** nessun dato viene modificato.

### CU-PER-03 – Aprire un viaggio mediante un'entrata

**Obiettivo:** costruire la struttura iniziale della permanenza in seguito a un'entrata valida.

**Precondizioni:**

- l'operazione di entrata è stata validata;
- lo stato dell'operazione è `prevista` o `effettuata`;
- per la nave non esiste un altro viaggio aperto.

**Flusso principale:**

1. Il sistema crea un nuovo viaggio per la nave.
2. Imposta come inizio del viaggio l'istante dell'entrata.
3. Crea la prima visita nel porto di arrivo.
4. Imposta come inizio della visita lo stesso istante.
5. Crea il primo ormeggio con la banchina indicata dall'entrata oppure con banchina non specificata.
6. Imposta come inizio dell'ormeggio lo stesso istante.
7. Collega viaggio, visita e ormeggio all'operazione di entrata originaria.
8. Salva atomicamente l'operazione e l'intera struttura risultante.

**Alternative e vincoli:**

- Un'entrata `mancata` non apre alcun elemento.
- Se esiste già un viaggio aperto, l'operazione non può produrre una seconda struttura concorrente.
- La banchina, quando specificata, deve appartenere al porto di arrivo.

**Risultato:** esistono un nuovo viaggio, una visita e un ormeggio aperti.

### CU-PER-04 – Aggiornare la permanenza per uno spostamento nello stesso porto

**Obiettivo:** rappresentare il trasferimento della nave tra due ormeggi senza chiudere la visita.

**Precondizioni:**

- esistono un viaggio, una visita e un ormeggio aperti;
- lo spostamento validato ha stato `prevista` o `effettuata`;
- il porto di destinazione coincide con quello della visita corrente.

**Flusso principale:**

1. Il sistema conserva il minuto di partenza nell'intervallo dell'ormeggio di origine e lo chiude a tale istante.
2. Mantiene aperta la visita corrente.
3. Rappresenta la nave come in trasferimento nei minuti strettamente compresi tra partenza e arrivo.
4. All'arrivo crea un nuovo ormeggio nella stessa visita.
5. Assegna al nuovo ormeggio la banchina di destinazione oppure il valore non specificato.
6. Collega la transizione all'operazione di spostamento.
7. Salva atomicamente l'operazione e l'aggiornamento della struttura.

**Alternative e vincoli:**

- Il minuto di arrivo appartiene al nuovo ormeggio.
- La banchina di destinazione, quando presente, deve appartenere al porto della visita.
- Il nuovo ormeggio viene creato anche quando origine e destinazione hanno entrambe la banchina non specificata.

**Risultato:** il viaggio e la visita rimangono aperti; l'ormeggio precedente è chiuso e ne esiste uno nuovo aperto.

### CU-PER-05 – Aggiornare la permanenza per uno spostamento tra porti

**Obiettivo:** trasferire la nave a un nuovo porto mantenendo aperto lo stesso viaggio.

**Precondizioni:**

- esistono un viaggio, una visita e un ormeggio aperti;
- lo spostamento validato ha stato `prevista` o `effettuata`;
- il porto di destinazione è differente da quello della visita corrente.

**Flusso principale:**

1. Il sistema conserva il minuto di partenza nell'ormeggio e nella visita di origine e li chiude a tale istante.
2. Mantiene aperto il viaggio.
3. Rappresenta la nave come in trasferimento nei minuti strettamente compresi tra partenza e arrivo.
4. All'arrivo crea una nuova visita nel porto di destinazione.
5. Crea il primo ormeggio della nuova visita.
6. Assegna all'ormeggio la banchina di destinazione oppure il valore non specificato.
7. Collega la chiusura e le nuove aperture all'operazione di spostamento.
8. Salva atomicamente l'operazione e l'aggiornamento della struttura.

**Alternative e vincoli:**

- Il porto di origine viene derivato dalla visita corrente e non viene reinserito manualmente.
- Il minuto di arrivo appartiene alla nuova visita e al nuovo ormeggio.
- Durante il trasferimento non esistono una visita o un ormeggio applicabili alla nave.

**Risultato:** il viaggio rimane aperto; la visita precedente è chiusa e ne esiste una nuova aperta nel porto di destinazione.

### CU-PER-06 – Chiudere la permanenza mediante un'uscita

**Obiettivo:** concludere il viaggio in seguito a un'uscita valida.

**Precondizioni:**

- esistono un viaggio, una visita e un ormeggio aperti;
- l'operazione di uscita è stata validata;
- lo stato dell'operazione è `prevista` o `effettuata`.

**Flusso principale:**

1. Il sistema assegna il minuto dell'uscita all'ormeggio e alla visita correnti.
2. Chiude l'ormeggio corrente all'istante dell'uscita.
3. Chiude la visita corrente allo stesso istante.
4. Chiude il viaggio allo stesso istante.
5. Collega le chiusure all'operazione di uscita.
6. Salva atomicamente l'operazione e l'aggiornamento della struttura.

**Alternative e vincoli:**

- Un'uscita `mancata` non chiude alcun elemento.
- Una successiva entrata apre sempre un nuovo viaggio distinto.

**Risultato:** viaggio, ultima visita e ultimo ormeggio risultano chiusi.

### CU-PER-07 – Determinare il contesto operativo a un istante

**Obiettivo:** individuare viaggio, visita e ormeggio ai quali attribuire un'attività della nave.

**Precondizioni:** sono disponibili nave, data e ora dell'attività.

**Flusso principale:**

1. Il sistema individua il viaggio della nave applicabile all'istante indicato.
2. Individua la visita applicabile all'interno del viaggio.
3. Individua l'ormeggio applicabile all'interno della visita.
4. Restituisce il contesto operativo completo e lo rende disponibile al caso d'uso che registra o modifica l'attività.
5. Quando l'attività viene salvata, il sistema persiste l'attribuzione determinata.

**Alternative e vincoli:**

- Un'attività coincidente con un'entrata appartiene agli elementi aperti dall'entrata, che deve essere già registrata.
- Un'attività coincidente con la partenza di uno spostamento appartiene al contesto di origine.
- Un'attività coincidente con l'arrivo appartiene al nuovo ormeggio e all'eventuale nuova visita.
- Un'attività coincidente con un'uscita appartiene all'ultimo ormeggio e all'ultima visita.
- Nei minuti strettamente compresi tra partenza e arrivo non esiste un ormeggio applicabile; tra porti differenti non esiste neppure una visita applicabile.
- Se non esiste un contesto completo valido, la prestazione o la movimentazione non può essere registrata.

**Risultato:** l'attività è attribuita univocamente al contesto operativo applicabile oppure l'operazione viene impedita.

### CU-PER-08 – Ricostruire la struttura dopo una variazione operativa

**Obiettivo:** aggiornare in modo controllato viaggi, visite, ormeggi e attribuzioni quando cambia la sequenza delle operazioni nave.

**Precondizioni:** è stata richiesta una variazione strutturale a una o più operazioni nave.

**Flusso principale:**

1. Il sistema costruisce in memoria la sequenza operativa risultante per la nave.
2. Verifica ordine logico, estremi temporali, cardinalità e assenza di sovrapposizioni.
3. Determina viaggi, visite e ormeggi che verrebbero creati, modificati o rimossi.
4. Ridetermina l'attribuzione delle prestazioni e delle movimentazioni merci interessate.
5. Individua eventuali elementi che rimarrebbero privi di un contesto valido.
6. Confronta struttura, attribuzioni e dati risultanti con quelli consolidati.
7. Mostra all'operatore le conseguenze della variazione e gli eventuali elementi che la impediscono.
8. Se l'operazione è consentita e viene confermata nel caso d'uso dell'operazione nave, il sistema applica atomicamente variazione, struttura e riattribuzioni.

**Alternative e vincoli:**

- La variazione viene bloccata se rende incompatibile un'operazione successiva o produce una sovrapposizione.
- La variazione viene bloccata se lascia una prestazione o una movimentazione senza un contesto valido.
- La variazione viene bloccata se modifica direttamente o indirettamente dati o attribuzioni consolidati.
- Se la struttura risultante è equivalente a quella consolidata, la presenza di attività consolidate non impedisce la variazione.
- Se la validazione o l'aggiornamento falliscono, nessuna modifica viene conservata.

**Risultato:** la struttura persistita e le attribuzioni non consolidate risultano allineate alla nuova sequenza operativa.

### Interazioni con gli altri ambiti

- Il punto 3 definisce come vengono registrate, modificate ed eliminate le operazioni nave che originano la struttura.
- I punti 4 e 5 utilizzano il contesto operativo per attribuire prestazioni e movimentazioni merci.
- Il punto 6 definisce la determinazione di cliente e agenzia attraverso viaggio, visita, ormeggio e prestazione.
- I punti 7 e 8 utilizzano porto, nave e istanti operativi per i calcoli tariffari ed economici.
- Il punto 9 consolida struttura e attribuzioni utilizzate dalle attività inserite in fattura.
- Il punto 12 completa l'interpretazione degli istanti mediante i fusi operativi.
- Il punto 13 utilizza viaggi, visite e ormeggi come ambiti e dimensioni dei resoconti.

### Decisioni funzionali confermate

Sono confermati i seguenti comportamenti:

- viaggi, visite e ormeggi sono consultabili, ma non possono essere creati, modificati o eliminati direttamente;
- il dettaglio mostra le operazioni nave che hanno determinato ogni apertura, transizione e chiusura;
- gli intervalli di trasferimento vengono visualizzati separatamente dalle visite e dagli ormeggi;
- gli elementi aperti non ricevono una fine convenzionale; l'eventuale durata mostrata è provvisoria e calcolata fino a un istante di riferimento dichiarato;
- ogni variazione strutturale viene prima simulata e riepilogata, mentre la conferma viene richiesta nel caso d'uso relativo all'operazione nave che la produce.

### Esito del punto

I casi d'uso coprono consultazione, costruzione, attribuzione temporale e ricostruzione controllata di viaggi, visite e ormeggi.

Le regole funzionali dell'ambito sono state confermate. Il punto è pertanto **completato**.

## 2.10 Punto 3 – Operazioni nave

### Tema e perimetro

Il punto descrive la registrazione e la gestione delle operazioni nave che determinano la struttura di viaggi, visite e ormeggi:

- `entrata`;
- `spostamento`;
- `uscita`.

Le tre tipologie sono fisse, non appartengono al catalogo delle prestazioni e non possono essere aggiunte, rinominate, disattivate o eliminate. Le singole operazioni registrate rimangono invece modificabili o eliminabili finché le regole di sequenza e consolidamento lo consentono.

Il punto comprende i dati e i flussi operativi delle singole registrazioni. La costruzione delle permanenze è definita nel punto 2; pesi, tariffe, regole economiche e fatturazione saranno completati nei punti 7, 8 e 9.

### Requisiti funzionali comuni

#### Dati, stati e note

- Ogni operazione appartiene a una sola nave e indica la propria tipologia e lo stato `prevista`, `effettuata` o `mancata`.
- Entrata e uscita utilizzano un solo istante con precisione al minuto.
- Lo spostamento utilizza un istante di partenza e uno di arrivo; l'arrivo non può precedere la partenza.
- La data e l'ora rappresentano l'istante pianificato per un'operazione `prevista`, quello effettivo per un'operazione `effettuata` e quello nel quale l'operazione avrebbe dovuto svolgersi per un'operazione `mancata`.
- Le note sono facoltative, appartengono all'intera operazione e non partecipano a sequenza, attribuzioni o calcoli.
- Le note rimangono modificabili anche dopo la fatturazione e non determinano ricalcoli.
- Le operazioni con stato `prevista` o `effettuata` producono gli stessi effetti sulla struttura operativa; quelle `mancate` non producono effetti.
- Il trascorrere del tempo non modifica automaticamente lo stato: la consuntivazione richiede sempre un intervento esplicito dell'operatore.

#### Sequenza operativa

- Dopo un'entrata valida sono ammessi soltanto uno spostamento oppure un'uscita.
- Dopo uno spostamento valido sono ammessi un altro spostamento oppure un'uscita.
- Dopo un'uscita valida è ammessa soltanto una nuova entrata.
- Un'entrata, anche `mancata`, può essere registrata soltanto se al relativo istante la nave non possiede un viaggio aperto.
- Una sequenza può rimanere incompleta con un viaggio aperto, senza richiedere una data o un'operazione di uscita preventiva.
- Le operazioni `mancate` non partecipano all'alternanza logica della sequenza e non modificano la posizione della nave, ma devono rispettare il contesto operativo richiesto dalla propria tipologia.
- Un'uscita `mancata` richiede una visita e un ormeggio aperti al proprio istante; uno spostamento `mancato` richiede lo stesso contesto all'istante di partenza.
- Il porto di un'uscita `mancata` e quello di origine di uno spostamento `mancato` vengono derivati dalla visita corrente; una precedente operazione `mancata` non può costituire tale contesto.
- Un'uscita o uno spostamento `mancati` non possono essere registrati durante un intervallo di trasferimento nel quale non esiste una posizione portuale corrente.

#### Precisione e univocità temporale

- Secondi e frazioni di secondo non vengono inseriti né utilizzati.
- Per la stessa nave non possono esistere due estremi temporali di operazioni nave nello stesso minuto.
- Per uno spostamento, il vincolo riguarda sia la partenza sia l'arrivo.
- Il vincolo si applica anche alle operazioni `mancate`.
- Operazioni appartenenti a navi differenti possono condividere lo stesso minuto.
- Una prestazione ordinaria può condividere il minuto con un'operazione nave; la relativa attribuzione segue le regole del punto 2.

#### Effetti economici essenziali

- Un'entrata e un'uscita producono una singola componente economica.
- Uno spostamento nello stesso porto produce una singola componente economica di tipo `spostamento`, riferita al porto corrente e all'istante di partenza.
- Uno spostamento tra porti produce due componenti collegate:
  - `uscita`, riferita al porto di origine e all'istante di partenza;
  - `entrata`, riferita al porto di destinazione e all'istante di arrivo.
- Le due componenti di uno spostamento tra porti condividono stato e note e appartengono alla stessa operazione, ma possono essere selezionate e fatturate autonomamente, anche in momenti e fatture differenti.
- Ogni componente può appartenere al massimo a una fattura alla volta e viene consolidata autonomamente quando la fattura che la contiene viene emessa.
- L'importo complessivo dello spostamento tra porti è la somma delle due componenti nelle consultazioni riferite all'intera operazione; ogni fattura considera soltanto l'importo della componente associata. Un eventuale importo manuale può essere specificato separatamente per ciascuna componente.
- Le operazioni `previste` non sono fatturabili; quelle `effettuate` o `mancate` possono esserlo.

#### Validazione e atomicità

- Prima di inserire, modificare, cambiare stato o eliminare un'operazione strutturale, il sistema simula la sequenza operativa risultante applicando il caso d'uso `CU-PER-08`.
- La simulazione comprende la ricostruzione di viaggi, visite e ormeggi, la riattribuzione delle attività e il ricalcolo degli importi non consolidati.
- Il sistema mostra le conseguenze e gli eventuali elementi che impediscono l'operazione.
- L'operatore deve confermare esplicitamente ogni variazione strutturale consentita.
- Operazione, componenti economiche, struttura derivata, attribuzioni e ricalcoli vengono salvati atomicamente.
- Se anche un solo vincolo non viene rispettato, nessuna modifica viene conservata.

### CU-OPN-01 – Consultare le operazioni nave

**Obiettivo:** individuare e consultare le operazioni registrate.

**Precondizioni:** nessuna.

**Flusso principale:**

1. L'operatore accede alla consultazione delle operazioni nave.
2. Il sistema consente di individuare le operazioni almeno per nave, tipologia, stato, intervallo temporale, porto e banchina.
3. Per entrata e uscita mostra il relativo istante; per uno spostamento mostra partenza e arrivo.
4. Per ogni operazione rende visibili stato ed effetti sulla struttura operativa.
5. Le operazioni `mancate` vengono distinte da quelle che partecipano alla sequenza.
6. L'operatore seleziona un'operazione per consultarne dati, note, effetti operativi e componenti economiche.

**Alternative e vincoli:**

- Le operazioni nave non vengono rappresentate come attività appartenenti a viaggio, visita o ormeggio, perché costituiscono gli eventi che li determinano.
- Dal dettaglio deve essere possibile raggiungere gli elementi operativi originati dall'operazione.
- I dati anagrafici vengono mostrati mediante le versioni applicabili agli istanti dell'operazione, salvo i dati consolidati in una fattura.

**Risultato:** nessun dato viene modificato.

### CU-OPN-02 – Registrare un'entrata

**Obiettivo:** registrare l'arrivo della nave e, quando applicabile, aprire una nuova permanenza.

**Precondizioni:** la nave e il porto di arrivo esistono e sono selezionabili per un nuovo riferimento.

**Flusso principale:**

1. L'operatore seleziona la nave e la tipologia `entrata`.
2. Indica stato, data e ora, porto di arrivo, eventuale banchina e note.
3. Il sistema verifica obbligatorietà, coerenza tra porto e banchina e unicità del minuto.
4. Verifica che al relativo istante non esista già un viaggio aperto; se lo stato è `prevista` o `effettuata`, simula la struttura risultante.
5. Determina tariffa, peso, regole e importo applicabili, demandandone i dettagli ai relativi casi d'uso.
6. Mostra effetti operativi ed economici e gli eventuali vincoli bloccanti.
7. L'operatore conferma l'inserimento.
8. Il sistema salva atomicamente l'entrata, la componente economica e, quando applicabile, la struttura aperta secondo `CU-PER-03`.

**Alternative e vincoli:**

- La banchina può rimanere non specificata; quando presente, deve appartenere al porto di arrivo.
- Un'entrata `mancata` rimane registrata ma non apre viaggio, visita o ormeggio.
- Se al relativo istante esiste già un viaggio aperto, l'entrata viene impedita indipendentemente dallo stato.

**Risultato:** l'operazione è registrata; se prevista o effettuata, esiste una nuova permanenza aperta.

### CU-OPN-03 – Registrare uno spostamento nello stesso porto

**Obiettivo:** registrare il trasferimento della nave verso un nuovo ormeggio nella visita corrente.

**Precondizioni:**

- la nave possiede viaggio, visita e ormeggio aperti all'istante di partenza;
- il porto di destinazione coincide con quello di origine derivato dal contesto operativo.

**Flusso principale:**

1. L'operatore seleziona la nave e la tipologia `spostamento`.
2. Indica stato, partenza, arrivo, porto di destinazione, eventuale banchina di destinazione e note.
3. Il sistema deriva il porto di origine dalla visita corrente e lo conserva come dato storico dell'operazione.
4. Verifica che l'arrivo non preceda la partenza, che la banchina appartenga al porto e che gli estremi temporali siano univoci.
5. Se lo stato è `prevista` o `effettuata`, simula la chiusura dell'ormeggio corrente e l'apertura del nuovo ormeggio nella stessa visita.
6. Determina la componente economica di tipo `spostamento` applicabile alla partenza.
7. Mostra effetti operativi ed economici e gli eventuali vincoli bloccanti.
8. L'operatore conferma l'inserimento.
9. Il sistema salva atomicamente operazione, componente economica e aggiornamento definito da `CU-PER-04`.

**Alternative e vincoli:**

- La banchina di destinazione può rimanere non specificata.
- Uno spostamento `mancato` non chiude né apre ormeggi.
- Se all'istante di partenza non esiste una visita corrente, anche perché la nave è in trasferimento, lo spostamento viene impedito indipendentemente dallo stato.
- Anche due ormeggi consecutivi con banchina non specificata rimangono distinti.

**Risultato:** l'operazione è registrata; se prevista o effettuata, la visita rimane aperta con un nuovo ormeggio.

### CU-OPN-04 – Registrare uno spostamento tra porti

**Obiettivo:** registrare il trasferimento della nave verso un porto differente mantenendo aperto lo stesso viaggio.

**Precondizioni:**

- la nave possiede viaggio, visita e ormeggio aperti all'istante di partenza;
- il porto di destinazione è differente da quello di origine derivato dal contesto operativo.

**Flusso principale:**

1. L'operatore seleziona la nave e la tipologia `spostamento`.
2. Indica stato, partenza, arrivo, porto di destinazione, eventuale banchina di destinazione e note.
3. Il sistema deriva e conserva il porto di origine dalla visita corrente.
4. Verifica che l'arrivo non preceda la partenza, che la banchina appartenga al porto di destinazione e che gli estremi temporali siano univoci.
5. Se lo stato è `prevista` o `effettuata`, simula la chiusura di ormeggio e visita correnti e l'apertura della nuova visita e del relativo primo ormeggio.
6. Determina le componenti economiche di uscita alla partenza e di entrata all'arrivo.
7. Mostra effetti operativi ed economici e gli eventuali vincoli bloccanti.
8. L'operatore conferma l'inserimento.
9. Il sistema salva atomicamente operazione, componenti economiche e aggiornamento definito da `CU-PER-05`.

**Alternative e vincoli:**

- Il porto di origine non viene inserito manualmente.
- La banchina di destinazione può rimanere non specificata.
- Le due componenti economiche non possono essere separate strutturalmente dall'operazione, ma possono essere fatturate singolarmente e associate a fatture differenti.
- Uno spostamento `mancato` non chiude né apre visite o ormeggi.
- Se all'istante di partenza non esiste una visita corrente, anche perché la nave è in trasferimento, lo spostamento viene impedito indipendentemente dallo stato.

**Risultato:** l'operazione è registrata; se prevista o effettuata, il viaggio continua nel porto di destinazione.

### CU-OPN-05 – Registrare un'uscita

**Obiettivo:** registrare la partenza della nave e, quando applicabile, chiudere la permanenza.

**Precondizioni:** all'istante dell'uscita esistono viaggio, visita e ormeggio aperti.

**Flusso principale:**

1. L'operatore seleziona la nave e la tipologia `uscita`.
2. Indica stato, data e ora e note.
3. Il sistema verifica obbligatorietà e unicità del minuto.
4. Il sistema deriva il porto dalla visita corrente; se lo stato è `prevista` o `effettuata`, simula la chiusura della permanenza.
5. Determina tariffa, peso, regole e importo applicabili.
6. Mostra effetti operativi ed economici e gli eventuali vincoli bloccanti.
7. L'operatore conferma l'inserimento.
8. Il sistema salva atomicamente uscita, componente economica e, quando applicabile, chiusura definita da `CU-PER-06`.

**Alternative e vincoli:**

- Un'uscita `mancata` rimane registrata ma non chiude alcun elemento.
- Se all'istante dell'uscita manca una permanenza aperta, l'operazione viene impedita indipendentemente dallo stato.

**Risultato:** l'operazione è registrata; se prevista o effettuata, la permanenza risulta chiusa.

### CU-OPN-06 – Consuntivare un'operazione prevista

**Obiettivo:** registrare l'esito effettivo di un'operazione pianificata.

**Precondizioni:** l'operazione esiste, è nello stato `prevista` e non è consolidata.

**Flusso principale – operazione effettuata:**

1. L'operatore richiede la consuntivazione come `effettuata`.
2. Conferma o corregge date, orari e altri dati effettivi.
3. Il sistema simula la sequenza e gli effetti economici risultanti.
4. Mostra strutture, attività e importi che verrebbero aggiornati.
5. L'operatore conferma la consuntivazione.
6. Il sistema applica atomicamente stato, dati effettivi, struttura, attribuzioni e ricalcoli.

**Flusso alternativo – operazione mancata:**

1. L'operatore richiede la consuntivazione come `mancata`.
2. Il sistema conserva date e orari come riferimenti del momento nel quale l'operazione avrebbe dovuto svolgersi.
3. Rimuove dalla simulazione gli effetti operativi dell'operazione e ricostruisce la sequenza risultante.
4. Ricalcola l'importo applicando le regole economiche dello stato `mancata`.
5. Mostra gli effetti e richiede conferma.
6. Se l'operazione è consentita, applica atomicamente stato, struttura, attribuzioni e ricalcoli.

**Alternative e vincoli:**

- Lo stato non cambia automaticamente al raggiungimento dell'istante previsto.
- Se la consuntivazione rende non valida un'operazione successiva, lascia un'attività senza contesto o modifica dati consolidati, viene impedita.

**Risultato:** l'operazione risulta `effettuata` o `mancata` e tutti i dati non consolidati dipendenti sono coerenti con l'esito.

### CU-OPN-07 – Modificare un'operazione nave

**Obiettivo:** correggere dati strutturali o economici di un'operazione non consolidata.

**Precondizioni:** l'operazione esiste e la modifica richiesta non riguarda esclusivamente le note.

**Flusso principale:**

1. L'operatore modifica uno o più dati consentiti, compresi nave, tipologia, stato, istanti, destinazione o banchina.
2. Il sistema valida i dati richiesti dalla tipologia risultante.
3. Simula l'intera sequenza operativa risultante e gli effetti economici.
4. Mostra elementi creati, modificati, riattribuiti o rimossi e gli eventuali blocchi.
5. L'operatore conferma la modifica.
6. Il sistema applica atomicamente operazione, componenti economiche, struttura, attribuzioni e ricalcoli.

**Alternative e vincoli:**

- La modifica viene impedita se cambia dati o risultati di una componente consolidata o di un'altra attività consolidata. Per uno spostamento tra porti resta consentita una variazione riferita esclusivamente alla componente non consolidata, purché lasci invariati i dati comuni e tutti i risultati già consolidati.
- Il passaggio da `mancata` a `prevista` o `effettuata` introduce gli effetti operativi; il passaggio inverso li rimuove.
- La modifica della sola banchina precedentemente non specificata aggiorna l'ormeggio esistente e non crea uno spostamento né accorpa ormeggi distinti.
- Se l'operazione o una sua componente appartiene a una o più fatture nello stato `in immissione`, vengono ricalcolati gli importi e il totale di ciascuna fattura interessata.

**Risultato:** l'operazione e tutti gli elementi modificabili dipendenti risultano coerenti con i nuovi dati.

### CU-OPN-08 – Inserire retroattivamente un'operazione

**Obiettivo:** collocare una nuova operazione tra operazioni già registrate.

**Precondizioni:** sono stati inseriti tutti i dati richiesti dalla tipologia e dallo stato.

**Flusso principale:**

1. Il sistema colloca l'operazione nella sequenza in base ai relativi estremi temporali.
2. Valida l'intera sequenza risultante, non soltanto le operazioni adiacenti.
3. Ricostruisce in simulazione viaggi, visite, ormeggi e attribuzioni interessate.
4. Ricalcola componenti economiche, prestazioni e fatture in immissione coinvolte.
5. Mostra gli effetti e gli eventuali conflitti.
6. L'operatore conferma l'inserimento.
7. Il sistema salva atomicamente operazione e tutti gli aggiornamenti derivati.

**Alternative e vincoli:**

- L'inserimento viene impedito se produce una sequenza non valida, una coincidenza temporale vietata o un'attività priva di contesto.
- L'inserimento viene impedito se modificherebbe dati o risultati consolidati.
- Nella prima versione non è prevista una modalità che consenta di mantenere temporaneamente più modifiche incoerenti in una bozza comune.

**Risultato:** l'operazione è inserita nella posizione cronologica corretta e la struttura persistita è coerente.

### CU-OPN-09 – Eliminare un'operazione nave

**Obiettivo:** rimuovere fisicamente un'operazione non consolidata e tutti gli effetti che ne dipendono.

**Precondizioni:** l'operazione esiste.

**Flusso principale:**

1. L'operatore richiede l'eliminazione.
2. Il sistema simula la sequenza priva dell'operazione.
3. Determina componenti economiche, permanenze e attribuzioni che verrebbero rimosse o modificate.
4. Se l'operazione o le sue componenti appartengono a una o più fatture in immissione, include nella simulazione la rimozione di tutte le associazioni e il ricalcolo di ciascun totale interessato.
5. Mostra gli effetti e gli eventuali elementi bloccanti.
6. L'operatore conferma l'eliminazione fisica.
7. Il sistema elimina atomicamente operazione, componenti economiche e associazioni alle fatture e aggiorna la struttura risultante.

**Alternative e vincoli:**

- L'eliminazione viene impedita se lascia non valida la sequenza o priva un'attività del proprio contesto.
- L'eliminazione viene impedita se modifica direttamente o indirettamente dati o risultati consolidati.
- Se una qualsiasi fase fallisce, l'operazione rimane integralmente registrata.

**Risultato:** l'operazione non esiste più e tutti gli elementi modificabili dipendenti sono coerenti con la sequenza residua.

### CU-OPN-10 – Modificare le note di un'operazione

**Obiettivo:** aggiornare le informazioni descrittive senza modificare struttura o calcoli.

**Precondizioni:** l'operazione esiste.

**Flusso principale:**

1. L'operatore modifica le note.
2. Il sistema salva il nuovo valore senza simulare la sequenza e senza effettuare ricalcoli.

**Alternative e vincoli:**

- Le note possono essere modificate indipendentemente dallo stato dell'operazione e della fattura.
- La modifica non cambia le note consolidate nel documento emesso; le successive visualizzazioni che includono le note mostrano il valore corrente secondo le regole di fatturazione.

**Risultato:** le note correnti risultano aggiornate e nessun altro dato viene modificato.

### Interazioni con gli altri ambiti

- Il punto 2 riceve gli effetti strutturali delle operazioni e ne persiste i risultati.
- I punti 4 e 5 utilizzano la struttura risultante per attribuire prestazioni e movimentazioni merci.
- Il punto 6 ridetermina cliente e agenzia quando cambia il contesto operativo di una prestazione.
- Il punto 7 calcola tariffe e pesi delle operazioni e delle componenti economiche.
- Il punto 8 applica regole economiche, condizioni orarie, festività e trattamento dello stato `mancata`.
- Il punto 9 definisce selezione, fatturazione autonoma e consolidamento separato delle componenti.
- Il punto 12 interpreta partenza e arrivo nei rispettivi fusi operativi.

### Decisioni funzionali confermate

#### Determinazione del porto per le operazioni mancate

Sono confermati i seguenti comportamenti:

- un'entrata `mancata` richiede sempre il porto di arrivo ed è ammessa soltanto quando al relativo istante non esiste un viaggio aperto;
- un'uscita `mancata` richiede una visita e un ormeggio aperti al relativo istante e utilizza il porto derivato dalla visita corrente;
- uno spostamento `mancato` richiede una visita e un ormeggio aperti alla partenza, utilizza come origine il porto derivato dalla visita corrente e richiede il porto di destinazione;
- un'uscita o uno spostamento `mancati` vengono impediti quando ricadono in un intervallo di trasferimento privo di una posizione portuale corrente;
- una precedente operazione `mancata` non stabilisce la posizione della nave e non può fornire il contesto a un'operazione successiva;
- non viene richiesto né gestito un porto economico esplicito distinto dal porto operativo;
- le operazioni `mancate` conservano le proprie componenti economiche, ma non aprono, modificano o chiudono viaggi, visite e ormeggi.

#### Altre decisioni confermate

Sono inoltre confermati i seguenti comportamenti:

- le operazioni `mancate` vengono mostrate nella stessa cronologia, ma sono chiaramente escluse dalla sequenza che costruisce le permanenze;
- ogni inserimento, modifica, consuntivazione o eliminazione con effetti strutturali richiede simulazione, riepilogo e conferma esplicita;
- nella prima versione non è prevista una modifica multipla in bozza che possa rimanere temporaneamente incoerente;
- l'integrazione della sola banchina precedentemente non specificata aggiorna l'ormeggio esistente senza generare uno spostamento;
- uno spostamento tra porti rimane una sola operazione strutturale, ma le sue due componenti economiche possono essere fatturate autonomamente e collegate a fatture differenti;
- le note rimangono l'unico dato modificabile senza ricalcoli dopo il consolidamento.

### Esito del punto

I casi d'uso coprono consultazione, registrazione, consuntivazione, modifica, inserimento retroattivo, eliminazione e aggiornamento delle note delle operazioni nave.

Le regole funzionali dell'ambito e le relative decisioni sono state confermate. Il punto è pertanto **completato**.


## 2.11 Punto 4 – Prestazioni

### Tema e perimetro

Il punto descrive le prestazioni diverse dalle operazioni nave, già trattate nel punto 3:

- prestazioni da catalogo, riferite a un tipo configurabile;
- prestazioni libere, definite direttamente mediante descrizione e importo.

Entrambe le categorie vengono attribuite automaticamente al viaggio, alla visita e all'ormeggio applicabili alla nave nel relativo istante. Non modificano la struttura delle permanenze, ma dipendono da essa e possono essere registrate soltanto quando esiste un contesto operativo completo.

Il punto comprende la gestione essenziale del catalogo e il ciclo di vita delle singole prestazioni. Le versioni temporali dei pesi e il calcolo tariffario saranno dettagliati nel punto 7; le regole economiche nel punto 8; la determinazione di cliente e agenzia nel punto 6; selezione, consolidamento e avvisi in fattura nel punto 9.

### Requisiti funzionali comuni

#### Categorie e dati

- Ogni prestazione ordinaria appartiene a una sola nave ed è classificata come `da catalogo` oppure `libera`.
- La categoria è immutabile dopo la creazione: una prestazione da catalogo non può essere trasformata in una prestazione libera e viceversa.
- Per correggere la categoria è necessario eliminare la prestazione e registrarne una nuova, purché l'eliminazione sia consentita dalle regole di consolidamento.
- Ogni prestazione indica data e ora con precisione al minuto, stato `prevista`, `effettuata` o `mancata` ed eventuali note.
- La data e l'ora rappresentano l'istante pianificato per una prestazione `prevista`, quello effettivo per una prestazione `effettuata` e quello nel quale l'attività avrebbe dovuto svolgersi per una prestazione `mancata`.
- Una prestazione da catalogo deve riferirsi a un tipo di prestazione configurabile.
- Una prestazione libera deve indicare una descrizione non vuota e un importo base manuale strettamente maggiore di zero.
- L'importo base della prestazione libera non dipende da tariffa, scaglioni o peso; rimangono applicabili le eventuali regole economiche definite nel punto 8.
- Le note non partecipano all'attribuzione, alla tariffazione o agli altri calcoli e rimangono modificabili anche dopo il consolidamento.
- Le prestazioni ordinarie non aprono, modificano o chiudono viaggi, visite e ormeggi, indipendentemente dal proprio stato.

#### Catalogo delle prestazioni

- Ogni tipo configurabile possiede un'identità tecnica stabile, una descrizione corrente, lo stato `attivo` o `disattivato` e una sequenza temporale di pesi.
- Il catalogo iniziale comprende il tipo `rinforzo ormeggio`.
- Alla creazione di un tipo viene associato un peso iniziale strettamente maggiore di zero, proposto con valore predefinito `1`.
- La gestione delle versioni successive del peso è demandata al punto 7.
- La descrizione è obbligatoria e deve essere univoca rispetto agli altri tipi configurabili, ignorando spazi iniziali e finali e differenze tra maiuscole e minuscole.
- Le denominazioni `entrata`, `uscita` e `spostamento` sono riservate alle operazioni nave e non possono essere utilizzate nel catalogo.
- Un tipo disattivato non è selezionabile per una nuova prestazione o per sostituire il tipo di una prestazione esistente.
- Le prestazioni che già lo referenziano conservano il collegamento e rimangono consultabili e modificabili negli altri dati.
- La riattivazione rende il tipo nuovamente selezionabile senza modificare le prestazioni esistenti.
- La descrizione del tipo non è storicizzata: prestazioni e resoconti utilizzano la descrizione corrente, mentre le fatture emesse conservano quella consolidata all'emissione.
- Un tipo può essere eliminato fisicamente soltanto se non è mai stato utilizzato da alcuna prestazione; in caso contrario può esclusivamente essere disattivato.
- Anche il tipo iniziale `rinforzo ormeggio` segue le normali regole di modifica, disattivazione ed eliminazione.

#### Attribuzione temporale

- Durante la registrazione viene selezionata la nave; viaggio, visita e ormeggio vengono derivati automaticamente dalla data e dall'ora della prestazione.
- L'attribuzione utilizza la struttura generata dalle operazioni nave `previste` ed `effettuate`; le operazioni `mancate` non determinano alcun contesto.
- Una prestazione ordinaria, anche `mancata`, richiede una visita e un ormeggio validi al relativo istante.
- Una prestazione non può essere registrata prima dell'entrata, dopo l'uscita o in un intervallo nel quale la nave non appartiene a un ormeggio.
- La banchina può essere non specificata senza impedire l'attribuzione all'ormeggio.
- La coincidenza con il minuto di un'operazione nave segue queste regole:
  - con un'entrata, la prestazione appartiene alla nuova visita e al primo ormeggio, purché l'entrata sia già registrata;
  - con la partenza di uno spostamento, appartiene alla visita e all'ormeggio di origine;
  - con l'arrivo di uno spostamento, appartiene al nuovo ormeggio e alla visita applicabile a destinazione;
  - con un'uscita, appartiene all'ultima visita e all'ultimo ormeggio.
- Nei minuti strettamente compresi tra partenza e arrivo di uno spostamento non è possibile registrare una prestazione.
- Più prestazioni ordinarie della stessa nave possono condividere lo stesso minuto tra loro e con un'operazione nave.
- L'attribuzione viene persistita e viene rideterminata quando cambiano la prestazione o la sequenza delle operazioni nave.
- Una variazione strutturale viene impedita se lascerebbe una prestazione senza un viaggio, una visita o un ormeggio validi oppure modificherebbe l'attribuzione di una prestazione consolidata.

#### Stati e consuntivazione

- Il trascorrere del tempo non modifica automaticamente lo stato della prestazione.
- Una prestazione `prevista` può essere consuntivata esplicitamente come `effettuata` oppure `mancata`.
- Nel passaggio a `effettuata`, l'operatore conferma o corregge data, ora e altri dati effettivi.
- Nel passaggio a `mancata`, data e ora conservano il significato dell'istante nel quale la prestazione avrebbe dovuto svolgersi.
- Il cambiamento di stato determina una nuova validazione dell'attribuzione e il ricalcolo degli elementi economici non consolidati.
- Una prestazione `mancata` rimane attribuita al proprio contesto operativo, non modifica la permanenza e può produrre un importo secondo le regole economiche applicabili.

#### Modifica ed eliminazione

- Finché non è consolidata, una prestazione può essere modificata nei dati consentiti oppure eliminata fisicamente; la categoria rimane immutabile.
- Se è necessario passare da una prestazione da catalogo a una libera o viceversa, l'operatore deve eliminare la prestazione originaria e registrarne una nuova nella categoria corretta.
- La sostituzione del tipo di una prestazione da catalogo richiede un nuovo tipo attivo; il tipo disattivato già associato può invece essere mantenuto mentre si modificano altri dati.
- La modifica di nave, data o ora determina una nuova attribuzione operativa.
- La modifica di tipo, stato, data, ora, descrizione o importo determina il ricalcolo dei risultati economici dipendenti.
- Gli importi tariffari vengono rideterminati quando cambiano i dati dai quali dipendono; l'importo base manuale di una prestazione libera cambia soltanto per intervento esplicito dell'operatore.
- Se la prestazione appartiene a una fattura nello stato `in immissione`, modifica o eliminazione aggiornano atomicamente la composizione e il totale della fattura.
- Una modifica viene impedita se non esiste un contesto operativo valido, se rende incoerente un elemento dipendente oppure se cambia direttamente o indirettamente dati o risultati consolidati.
- L'eliminazione è fisica e rimuove anche l'eventuale associazione a una fattura `in immissione`; non viene conservato uno storico separato della prestazione eliminata.

#### Fatturabilità e consolidamento

- Una prestazione `prevista` non è fatturabile.
- Una prestazione `effettuata` o `mancata` è potenzialmente fatturabile anche se la data è futura oppure il relativo viaggio è ancora aperto.
- La fatturabilità richiede inoltre la presenza degli altri dati necessari, compresi cliente e agenzia determinati secondo il punto 6, ed è verificata definitivamente dal punto 9.
- L'emissione della fattura consolida categoria, tipo o descrizione libera, stato, istante, attribuzione operativa, dati economici e importi della prestazione.
- Dopo il consolidamento nessuna variazione può cambiare direttamente o indirettamente tali dati o risultati.
- Le note costituiscono l'unica eccezione e rimangono modificabili senza ricalcoli; il documento emesso conserva comunque il valore consolidato all'emissione.
- Se la fattura viene ritirata validamente e torna nello stato `in immissione`, la prestazione cessa di essere consolidata e torna soggetta alle normali regole di modifica e ricalcolo.

### CU-PRE-01 – Consultare le prestazioni

**Obiettivo:** individuare e consultare le prestazioni ordinarie registrate.

**Precondizioni:** nessuna.

**Flusso principale:**

1. L'operatore accede alla consultazione delle prestazioni.
2. Il sistema consente la ricerca almeno per nave, categoria, tipo di catalogo, stato, intervallo temporale, porto, banchina, viaggio, visita, ormeggio, cliente e agenzia.
3. Per ogni risultato mostra categoria, descrizione, data e ora, stato, contesto operativo e stato di fatturazione.
4. L'operatore seleziona una prestazione.
5. Il sistema mostra dati inseriti, attribuzione persistita, importo base, calcolo economico, fattura eventualmente associata e note.

**Alternative e vincoli:**

- Per una prestazione da catalogo viene mostrata la descrizione corrente del tipo, salvo i dati consolidati nel documento emesso.
- Una prestazione riferita a un tipo disattivato rimane ricercabile e consultabile.
- Deve essere possibile distinguere l'importo base dal risultato delle regole economiche applicate.

**Risultato:** nessun dato viene modificato.

### CU-PRE-02 – Consultare il catalogo delle prestazioni

**Obiettivo:** visualizzare i tipi configurabili disponibili e il relativo stato.

**Precondizioni:** nessuna.

**Flusso principale:**

1. L'operatore apre la gestione del catalogo.
2. Il sistema mostra i tipi attivi e disattivati con descrizione, peso corrente e indicazione dell'eventuale utilizzo.
3. L'operatore può ricercare o filtrare i tipi.
4. Seleziona un tipo per consultarne dettaglio e riferimenti esistenti.

**Alternative e vincoli:**

- Le operazioni nave non vengono mostrate come tipi configurabili del catalogo.
- La cronologia completa dei pesi è consultabile mediante i casi d'uso del punto 7.

**Risultato:** nessun dato viene modificato.

### CU-PRE-03 – Creare un tipo di prestazione

**Obiettivo:** aggiungere un nuovo tipo al catalogo espandibile.

**Precondizioni:** nessuna.

**Flusso principale:**

1. L'operatore richiede la creazione di un tipo.
2. Inserisce la descrizione e conferma oppure modifica il peso iniziale proposto pari a `1`.
3. Il sistema normalizza la descrizione e ne verifica obbligatorietà, unicità e mancata corrispondenza con una denominazione riservata.
4. Verifica che il peso iniziale sia numerico e strettamente maggiore di zero.
5. Genera l'identità tecnica del tipo, crea il peso iniziale privo di decorrenza e assegna lo stato `attivo`.
6. Salva atomicamente tipo e peso iniziale.

**Alternative e vincoli:**

- Se descrizione o peso non sono validi, il sistema impedisce il salvataggio e indica i dati da correggere.
- La creazione del tipo non modifica le prestazioni già registrate.

**Risultato:** il nuovo tipo è attivo e selezionabile per le prestazioni da catalogo.

### CU-PRE-04 – Modificare la descrizione di un tipo

**Obiettivo:** rinominare un tipo configurabile senza cambiarne l'identità.

**Precondizioni:** il tipo esiste.

**Flusso principale:**

1. L'operatore modifica la descrizione corrente.
2. Il sistema applica le regole di normalizzazione, unicità e denominazioni riservate.
3. Mostra che la nuova descrizione verrà utilizzata nelle prestazioni e nei resoconti, ma non sostituirà quella consolidata nelle fatture emesse.
4. L'operatore conferma la modifica.
5. Il sistema aggiorna la descrizione corrente del tipo.

**Alternative e vincoli:**

- La modifica non crea una versione temporale della descrizione e non ricalcola gli importi.
- Se la descrizione non è valida, nessuna modifica viene applicata.

**Risultato:** il tipo conserva la propria identità e utilizza la nuova descrizione corrente.

### CU-PRE-05 – Disattivare o riattivare un tipo

**Obiettivo:** controllare la disponibilità di un tipo per nuove selezioni.

**Precondizioni:** il tipo esiste.

**Flusso principale – disattivazione:**

1. L'operatore richiede la disattivazione.
2. Il sistema mostra le prestazioni esistenti e quelle future che mantengono il riferimento.
3. L'operatore conferma.
4. Il sistema assegna lo stato `disattivato` e rimuove il tipo dalle nuove selezioni.

**Flusso alternativo – riattivazione:**

1. L'operatore richiede la riattivazione.
2. Il sistema assegna lo stato `attivo`.
3. Il tipo torna selezionabile.

**Alternative e vincoli:**

- Il cambio di stato non modifica, elimina o ricalcola le prestazioni esistenti.
- Le prestazioni future già registrate mantengono il tipo anche dopo la disattivazione.

**Risultato:** la selezionabilità corrente del tipo è coerente con il nuovo stato.

### CU-PRE-06 – Eliminare un tipo di prestazione

**Obiettivo:** rimuovere fisicamente un tipo mai utilizzato.

**Precondizioni:** il tipo esiste.

**Flusso principale:**

1. L'operatore richiede l'eliminazione.
2. Il sistema verifica che nessuna prestazione, compresa una futura, abbia mai referenziato il tipo.
3. Mostra che verranno eliminati anche i relativi pesi.
4. L'operatore conferma l'eliminazione fisica.
5. Il sistema elimina atomicamente tipo e sequenza dei pesi.

**Alternative e vincoli:**

- Se il tipo è stato utilizzato almeno una volta, l'eliminazione viene impedita anche quando tutte le prestazioni che lo utilizzavano sono state successivamente eliminate.
- Un tipo utilizzato può essere disattivato.

**Risultato:** il tipo e i relativi pesi non esistono più.

### CU-PRE-07 – Registrare una prestazione da catalogo

**Obiettivo:** registrare una prestazione valorizzata mediante tipo, tariffa e peso.

**Precondizioni:** la nave e almeno un tipo di prestazione attivo sono selezionabili.

**Flusso principale:**

1. L'operatore seleziona la nave e la categoria `da catalogo`.
2. Seleziona un tipo attivo e indica stato, data e ora ed eventuali note.
3. Il sistema individua viaggio, visita e ormeggio applicabili.
4. Determina i dati anagrafici, tariffari ed economici applicabili all'istante della prestazione.
5. Calcola e persiste importo base e risultato economico secondo i punti 7 e 8.
6. Mostra attribuzione e calcolo risultanti.
7. L'operatore conferma la registrazione.
8. Il sistema salva atomicamente prestazione, attribuzione e dati economici.

**Alternative e vincoli:**

- Se non esiste un contesto operativo completo, la registrazione viene impedita.
- Il tipo deve essere attivo al momento della selezione, indipendentemente dalla data della prestazione.
- Una banchina non specificata non impedisce la registrazione.
- La data può essere futura se la struttura operativa necessaria è già determinabile.

**Risultato:** la prestazione da catalogo è registrata e attribuita alla permanenza applicabile.

### CU-PRE-08 – Registrare una prestazione libera

**Obiettivo:** registrare una prestazione non prevista dal catalogo mediante descrizione e importo manuali.

**Precondizioni:** la nave è selezionabile.

**Flusso principale:**

1. L'operatore seleziona la nave e la categoria `libera`.
2. Inserisce descrizione, importo base, stato, data e ora ed eventuali note.
3. Il sistema verifica che la descrizione non sia vuota e che l'importo sia strettamente maggiore di zero.
4. Individua viaggio, visita e ormeggio applicabili.
5. Applica all'importo base manuale le eventuali regole economiche pertinenti e persiste il risultato.
6. Mostra attribuzione e calcolo risultanti.
7. L'operatore conferma la registrazione.
8. Il sistema salva atomicamente prestazione, attribuzione e dati economici.

**Alternative e vincoli:**

- La prestazione libera non richiede né crea un tipo di catalogo.
- Se non esiste un contesto operativo completo, la registrazione viene impedita.
- La data può essere futura se la struttura operativa necessaria è già determinabile.

**Risultato:** la prestazione libera è registrata con il proprio importo base manuale.

### CU-PRE-09 – Consuntivare una prestazione prevista

**Obiettivo:** registrare l'esito di una prestazione pianificata.

**Precondizioni:** la prestazione esiste, è `prevista` e non è consolidata.

**Flusso principale – prestazione effettuata:**

1. L'operatore richiede la consuntivazione come `effettuata`.
2. Conferma o corregge data, ora e dati effettivi.
3. Il sistema ridetermina attribuzione, versioni applicabili e risultati economici.
4. Mostra gli effetti e gli eventuali vincoli bloccanti.
5. L'operatore conferma la consuntivazione.
6. Il sistema applica atomicamente stato, dati, attribuzione e ricalcoli.

**Flusso alternativo – prestazione mancata:**

1. L'operatore richiede la consuntivazione come `mancata`.
2. Il sistema conserva l'istante pianificato e verifica che il relativo contesto operativo sia ancora valido.
3. Applica le regole economiche previste per lo stato `mancata`.
4. Mostra gli effetti e richiede conferma.
5. Il sistema applica atomicamente stato e ricalcoli.

**Alternative e vincoli:**

- Se l'istante effettivo non appartiene a una permanenza valida, la consuntivazione viene impedita.
- Lo stato non cambia automaticamente al raggiungimento della data prevista.

**Risultato:** la prestazione risulta `effettuata` o `mancata` con attribuzione e dati economici coerenti.

### CU-PRE-10 – Modificare una prestazione

**Obiettivo:** correggere i dati di una prestazione non consolidata.

**Precondizioni:** la prestazione esiste e la modifica non riguarda esclusivamente le note.

**Flusso principale:**

1. L'operatore modifica uno o più dati consentiti.
2. Il sistema valida i dati richiesti dalla categoria immutabile della prestazione.
3. Ridetermina il contesto operativo quando cambiano nave, data o ora.
4. Ridetermina versioni, importi e regole applicabili.
5. Se la prestazione appartiene a una fattura `in immissione`, ricalcola il relativo totale.
6. Mostra gli effetti e gli eventuali elementi bloccanti.
7. L'operatore conferma la modifica.
8. Il sistema applica atomicamente prestazione, attribuzione, calcoli e aggiornamento della fattura.

**Alternative e vincoli:**

- La categoria non può essere modificata; se la prestazione non è consolidata, l'operatore può eliminarla e registrarne una nuova nella categoria corretta.
- Un tipo disattivato già associato può essere mantenuto, ma non può essere selezionato come sostituto.
- La modifica viene impedita se manca un contesto operativo valido o se cambierebbe dati o risultati consolidati.

**Risultato:** la prestazione e tutti gli elementi non consolidati dipendenti risultano coerenti con i nuovi dati.

### CU-PRE-11 – Eliminare una prestazione

**Obiettivo:** rimuovere fisicamente una prestazione non consolidata.

**Precondizioni:** la prestazione esiste.

**Flusso principale:**

1. L'operatore richiede l'eliminazione.
2. Il sistema individua l'eventuale fattura `in immissione` e gli elementi economici dipendenti.
3. Mostra gli effetti dell'eliminazione.
4. L'operatore conferma.
5. Il sistema elimina la prestazione, rimuove l'associazione alla fattura e ne aggiorna il totale in un'unica operazione atomica.

**Alternative e vincoli:**

- Se la prestazione è consolidata, l'eliminazione viene impedita.
- Se una qualsiasi fase fallisce, la prestazione e l'eventuale associazione rimangono invariate.

**Risultato:** la prestazione non esiste più e gli elementi non consolidati dipendenti sono aggiornati.

### CU-PRE-12 – Modificare le note di una prestazione

**Obiettivo:** aggiornare le note senza modificare attribuzione o calcoli.

**Precondizioni:** la prestazione esiste.

**Flusso principale:**

1. L'operatore modifica le note.
2. Il sistema salva il nuovo valore senza effettuare ricalcoli.

**Alternative e vincoli:**

- Le note sono modificabili indipendentemente dallo stato della prestazione e della fattura.
- La modifica non sostituisce le note consolidate nel documento già emesso.

**Risultato:** le note correnti sono aggiornate e nessun altro dato viene modificato.

### CU-PRE-13 – Determinare e aggiornare l'attribuzione operativa

**Obiettivo:** mantenere la prestazione collegata al contesto operativo corretto.

**Precondizioni:** sono disponibili nave e istante della prestazione oppure è stata richiesta una variazione alla sequenza operativa.

**Flusso principale:**

1. Il sistema applica `CU-PER-07` per individuare viaggio, visita e ormeggio.
2. Verifica le regole di coincidenza con entrata, spostamento e uscita.
3. Persiste l'attribuzione risultante sulla prestazione.
4. Se l'attribuzione cambia, ridetermina i dati e i calcoli dipendenti.
5. Aggiorna gli elementi non consolidati in modo atomico con la variazione che ha richiesto la riattribuzione.

**Alternative e vincoli:**

- Se non esiste un contesto completo, la registrazione o la modifica della prestazione viene impedita.
- Se la mancanza di contesto deriva dalla modifica di un'operazione nave, viene impedita la modifica strutturale.
- Se cambierebbe l'attribuzione di una prestazione consolidata, la variazione viene impedita anche quando l'importo finale resterebbe invariato.

**Risultato:** la prestazione possiede una sola attribuzione operativa valida oppure la variazione richiesta non viene applicata.

### CU-PRE-14 – Determinare la fatturabilità e segnalare attività previste

**Obiettivo:** stabilire se una prestazione può essere proposta per la fatturazione e segnalare eventuali attività precedenti non consuntivate.

**Precondizioni:** la prestazione esiste e possiede un contesto operativo valido.

**Flusso principale:**

1. Il sistema verifica che lo stato sia `effettuata` oppure `mancata`.
2. Verifica che siano determinati cliente e agenzia e che siano presenti gli altri dati richiesti dal punto 9.
3. Rende la prestazione disponibile alla selezione in fattura anche quando il viaggio è aperto o la data della prestazione è futura.
4. Quando una o più attività vengono selezionate per una fattura, individua le operazioni nave e le prestazioni ordinarie ancora `previste` appartenenti alla stessa nave e allo stesso viaggio e aventi un istante non successivo all'attività selezionata più recente.
5. Mostra un avviso con tipo, data, ora e contesto delle attività individuate.
6. Consente all'operatore di proseguire senza modificare automaticamente lo stato delle attività segnalate.

**Alternative e vincoli:**

- Una prestazione `prevista` non viene proposta per la fatturazione.
- L'avviso non costituisce un blocco e non include attività appartenenti a un viaggio differente.
- Le verifiche definitive di compatibilità con la fattura e la ripetizione dell'avviso prima dell'emissione sono definite nel punto 9.

**Risultato:** la prestazione è esclusa o resa disponibile per la fatturazione; le eventuali attività precedenti ancora previste sono rese esplicite.

### Interazioni con gli altri ambiti

- Il punto 2 fornisce il contesto operativo utilizzato per l'attribuzione.
- Il punto 3 può determinare la riattribuzione delle prestazioni quando cambia la sequenza delle operazioni nave.
- Il punto 6 determina cliente e agenzia effettivi.
- Il punto 7 determina peso, tariffa e importo base delle prestazioni da catalogo.
- Il punto 8 applica regole economiche alle prestazioni da catalogo e libere.
- Il punto 9 completa selezione, composizione, avvisi e consolidamento in fattura.
- Il punto 12 interpreta gli istanti nel fuso operativo applicabile.
- Il punto 13 utilizza prestazioni, categorie, stati e attribuzioni nei resoconti.

### Decisioni funzionali confermate

Sono confermati i seguenti comportamenti:

- l'importo base di una prestazione libera deve essere strettamente maggiore di zero; eventuali riduzioni fino a zero vengono applicate soltanto dalle regole economiche;
- la categoria della prestazione è immutabile; per passare tra `da catalogo` e `libera` occorre eliminare la prestazione e registrarne una nuova, purché l'eliminazione sia consentita;
- la descrizione di un tipo di catalogo non è storicizzata e la sua modifica aggiorna prestazioni e resoconti, ma non i dati consolidati nelle fatture emesse;
- il tipo iniziale `rinforzo ormeggio` non è protetto e può essere modificato, disattivato o eliminato se non è mai stato utilizzato;
- anche una prestazione ordinaria `mancata` richiede un viaggio, una visita e un ormeggio validi al relativo istante;
- una variazione delle operazioni nave viene impedita se lascerebbe una prestazione ordinaria priva di contesto, senza conservarla come elemento non attribuito;
- l'avviso sulle attività ancora `previste` considera operazioni nave e prestazioni ordinarie della stessa nave e dello stesso viaggio, fino all'attività selezionata più recente, ed è soltanto informativo.

### Esito del punto

I casi d'uso coprono gestione del catalogo, registrazione, attribuzione, consuntivazione, modifica, eliminazione, note, fatturabilità e segnalazione delle attività precedenti ancora previste.

Le regole funzionali dell'ambito e le relative decisioni sono state confermate. Il punto è pertanto **completato**.

## 2.12 Punto 5 – Movimentazioni merci

### Tema e perimetro

Il punto descrive la registrazione dei carichi e degli scarichi riferiti alla permanenza di una nave presso un ormeggio.

Le movimentazioni merci hanno finalità operative, informative e di rendicontazione. Non costituiscono prestazioni, non assumono uno stato di esecuzione e non producono effetti tariffari, economici o contabili. Possono tuttavia essere incluse in fattura come informazioni prive di importo e seguono in tal caso il relativo consolidamento.

Il punto comprende registrazione, consultazione, attribuzione temporale, modifica, eliminazione e regole minime di aggregazione. La gestione temporale dell'anagrafica merce è definita nel punto 1; la struttura delle permanenze nei punti 2 e 3; le elaborazioni configurabili nel punto 13.

### Requisiti funzionali comuni

#### Dati della movimentazione

- Ogni movimentazione appartiene a una sola nave e rappresenta un `carico` oppure uno `scarico`.
- Per ogni movimentazione sono obbligatori:
  - nave;
  - data e ora con precisione al minuto;
  - tipo `carico` o `scarico`;
  - merce;
  - quantità.
- Le note sono facoltative e non partecipano ad attribuzioni o aggregazioni.
- La quantità è un valore decimale strettamente maggiore di zero con un massimo di tre cifre decimali.
- Nella prima versione non viene gestita un'unità di misura esplicita; il significato dell'unità utilizzata rimane convenzionale per la singola merce.
- La data e l'ora possono essere passate, correnti o future; la validità dipende dall'esistenza del contesto operativo applicabile all'istante indicato e non dal confronto con il momento corrente.
- Non vengono utilizzati gli stati `prevista`, `effettuata` e `mancata`.
- Più movimentazioni, anche riferite alla stessa nave, merce e tipo, possono condividere lo stesso minuto e rimangono elementi distinti.
- Le movimentazioni non modificano viaggio, visita o ormeggio e non producono importi.

#### Selezione e rappresentazione della merce

- Per registrare una movimentazione o sostituirne la merce è possibile selezionare soltanto un'anagrafica merce attiva.
- Una movimentazione esistente conserva il riferimento a una merce successivamente disattivata.
- Se vengono modificati altri dati, il riferimento esistente alla merce disattivata può essere mantenuto; dopo la sua rimozione non può essere nuovamente selezionato finché la merce non viene riattivata.
- La movimentazione mostra i dati della versione anagrafica della merce applicabile alla propria data e ora.
- Una variazione successiva non retroattiva dell'anagrafica non cambia la rappresentazione storica della movimentazione.
- Una variazione retroattiva può cambiare la versione applicabile e aggiorna i dati storici mostrati secondo le regole del punto 1.
- L'anagrafica completa della merce non può essere eliminata finché è referenziata da almeno una movimentazione.

#### Attribuzione temporale

- Durante la registrazione viene selezionata la nave; viaggio, visita e ormeggio vengono determinati automaticamente dalla data e dall'ora.
- L'attribuzione utilizza la struttura prodotta dalle operazioni nave `previste` ed `effettuate`; le operazioni `mancate` non determinano alcun contesto.
- La movimentazione può essere registrata soltanto se al relativo istante esistono un viaggio, una visita e un ormeggio validi.
- Dopo un'uscita non esiste un contesto valido fino a una nuova entrata; durante uno spostamento non esiste un nuovo ormeggio fino al relativo arrivo.
- La banchina può essere non specificata senza impedire l'attribuzione all'ormeggio.
- La coincidenza con il minuto di un'operazione nave segue queste regole:
  - con un'entrata, la movimentazione appartiene alla nuova visita e al primo ormeggio, purché l'entrata sia già registrata;
  - con la partenza di uno spostamento, appartiene alla visita e all'ormeggio di origine;
  - con l'arrivo di uno spostamento, appartiene al nuovo ormeggio e alla visita applicabile a destinazione;
  - con un'uscita, appartiene all'ultima visita e all'ultimo ormeggio.
- Nei minuti strettamente compresi tra partenza e arrivo di uno spostamento non è possibile registrare una movimentazione.
- L'attribuzione viene persistita e rideterminata quando cambiano nave, data, ora oppure la sequenza delle operazioni nave.
- Se una variazione strutturale sposta la movimentazione in un altro contesto valido, il sistema la riattribuisce e mostra il cambiamento prima della conferma.
- La variazione strutturale viene impedita se lascerebbe la movimentazione senza un viaggio, una visita o un ormeggio validi.

#### Modifica ed eliminazione

- Tutti i dati non consolidati della movimentazione rimangono modificabili, compreso il passaggio tra `carico` e `scarico`, purché il risultato rispetti i vincoli definiti.
- La modifica di nave, data o ora determina una nuova attribuzione operativa.
- La sostituzione della merce richiede un'anagrafica attiva; la merce disattivata già associata può essere mantenuta.
- Prima della conferma il sistema mostra l'eventuale variazione di viaggio, visita, ormeggio o versione anagrafica applicabile.
- Se il nuovo istante non possiede un contesto completo o ricade in un intervallo di trasferimento, la modifica viene impedita anche quando l'istante è futuro.
- Una movimentazione può essere eliminata fisicamente finché non è consolidata.
- L'eliminazione non modifica la merce, la permanenza o altri elementi e non richiede il ricalcolo di importi.

#### Inclusione informativa e consolidamento

- Una movimentazione può essere associata alle fatture compatibili come informazione aggiuntiva priva di importo.
- L'associazione è consentita soltanto mentre la fattura si trova nello stato `in immissione`; le regole definitive di selezione, compatibilità ed eventuale riutilizzo in più documenti sono completate nel punto 9.
- L'inclusione non crea una riga economica e non modifica imponibile, sconti, bollo o totale della fattura.
- Finché tutte le fatture che la includono rimangono `in immissione`, la movimentazione resta modificabile; ogni modifica aggiorna atomicamente i dati delle relative sezioni informative.
- La movimentazione può essere rimossa da una fattura `in immissione` senza essere eliminata e senza modificare le eventuali altre associazioni.
- L'emissione della fattura consolida tipo, merce, quantità, data e ora, attribuzione operativa e dati anagrafici riportati per la movimentazione.
- Dopo il consolidamento la movimentazione non può essere modificata, eliminata o riattribuita direttamente o indirettamente.
- Le note rimangono modificabili anche dopo il consolidamento; la fattura emessa conserva il valore riportato al momento dell'emissione.
- Il ritiro consentito della fattura, che la riporta nello stato `in immissione`, rimuove il consolidamento prodotto da quel documento; la movimentazione torna modificabile quando non rimane inclusa in alcuna fattura consolidata.
- L'eliminazione di una fattura `in immissione` rimuove l'associazione senza eliminare la movimentazione.

#### Aggregazione delle quantità

- Le quantità possono essere sommate, confrontate o aggregate soltanto tra movimentazioni riferite alla stessa identità anagrafica di merce.
- Versioni temporali differenti della stessa merce appartengono alla medesima identità e possono concorrere alla stessa aggregazione; il dettaglio continua a mostrare la versione applicabile a ciascuna movimentazione.
- Carichi e scarichi vengono aggregati separatamente e non viene calcolato automaticamente un saldo netto tra i due tipi.
- Non vengono calcolati totali complessivi tra merci differenti, anche quando i valori numerici sono espressi con la stessa precisione.
- Le regole di filtro, raggruppamento ed esportazione vengono completate nel punto 13.

### CU-MER-01 – Consultare le movimentazioni merci

**Obiettivo:** individuare e consultare i carichi e gli scarichi registrati.

**Precondizioni:** nessuna.

**Flusso principale:**

1. L'operatore accede alla consultazione delle movimentazioni.
2. Il sistema consente la ricerca almeno per nave, tipo, merce, intervallo temporale, porto, banchina, viaggio, visita e ormeggio.
3. Per ogni risultato mostra tipo, merce, quantità, data e ora e contesto operativo.
4. L'operatore seleziona una movimentazione.
5. Il sistema mostra tutti i dati inseriti, le note, l'attribuzione persistita, le versioni anagrafiche applicabili, le fatture informative associate e l'eventuale stato consolidato.

**Alternative e vincoli:**

- Una merce disattivata rimane utilizzabile come criterio di ricerca.
- I dati storici della merce vengono mostrati mediante la versione applicabile all'istante della movimentazione.
- Deve essere possibile raggiungere il dettaglio di nave, viaggio, visita, ormeggio e merce referenziati.

**Risultato:** nessun dato viene modificato.

### CU-MER-02 – Registrare una movimentazione merci

**Obiettivo:** registrare un carico o uno scarico riferito a una permanenza valida della nave.

**Precondizioni:** la nave e almeno una merce attiva sono selezionabili.

**Flusso principale:**

1. L'operatore seleziona la nave.
2. Indica tipo `carico` o `scarico`, merce, quantità, data e ora ed eventuali note.
3. Il sistema verifica obbligatorietà, precisione e positività della quantità.
4. Determina viaggio, visita e ormeggio applicabili, indipendentemente dal fatto che l'istante sia passato, corrente o futuro.
5. Determina la versione anagrafica della merce valida all'istante indicato.
6. Mostra all'operatore attribuzione e dati storici risultanti.
7. L'operatore conferma la registrazione.
8. Il sistema salva atomicamente movimentazione e attribuzione.

**Alternative e vincoli:**

- Se la merce non è attiva al momento della selezione, non può essere utilizzata.
- Se non esiste un contesto operativo completo, la registrazione viene impedita.
- Se l'istante ricade strettamente tra partenza e arrivo di uno spostamento, la registrazione viene impedita.
- Dopo un'uscita, la movimentazione è ammessa soltanto se prima del relativo istante è presente una nuova entrata; durante uno spostamento è ammessa dall'istante di arrivo incluso.
- La presenza di un'altra movimentazione nello stesso minuto non costituisce un conflitto.

**Risultato:** la movimentazione è registrata e attribuita alla permanenza applicabile.

### CU-MER-03 – Determinare e aggiornare l'attribuzione operativa

**Obiettivo:** mantenere la movimentazione collegata al contesto operativo corretto.

**Precondizioni:** sono disponibili nave e istante della movimentazione oppure è stata richiesta una variazione della sequenza operativa.

**Flusso principale:**

1. Il sistema applica `CU-PER-07` per individuare viaggio, visita e ormeggio.
2. Verifica le regole di coincidenza con entrata, spostamento e uscita.
3. Persiste l'attribuzione risultante sulla movimentazione.
4. Se l'attribuzione cambia, mostra il contesto precedente e quello risultante.
5. Applica la riattribuzione atomicamente con la variazione che l'ha determinata.

**Alternative e vincoli:**

- Se non esiste un contesto completo durante la registrazione o la modifica della movimentazione, l'operazione viene impedita.
- Se la mancanza di contesto deriva dalla modifica di un'operazione nave, viene impedita la variazione strutturale.
- Se la variazione cambierebbe l'attribuzione di una movimentazione consolidata, viene impedita anche quando non produrrebbe effetti economici.
- La riattribuzione non produce calcoli tariffari, economici o contabili.

**Risultato:** la movimentazione possiede una sola attribuzione operativa valida oppure la variazione richiesta non viene applicata.

### CU-MER-04 – Modificare una movimentazione merci

**Obiettivo:** correggere i dati di una movimentazione esistente.

**Precondizioni:** la movimentazione esiste; se la modifica non riguarda esclusivamente le note, non è consolidata.

**Flusso principale:**

1. L'operatore modifica uno o più dati, compresi nave, tipo, merce, quantità, data, ora o note.
2. Il sistema valida i dati risultanti.
3. Se cambiano nave, data o ora, ridetermina viaggio, visita e ormeggio.
4. Se cambia la merce o l'istante, ridetermina la versione anagrafica applicabile.
5. Mostra i dati e il contesto precedenti e risultanti.
6. L'operatore conferma la modifica.
7. Il sistema salva atomicamente movimentazione e nuova attribuzione.

**Alternative e vincoli:**

- Il tipo può essere modificato direttamente tra `carico` e `scarico`.
- Una merce disattivata già associata può essere mantenuta, ma non può essere selezionata come sostituto.
- Se l'istante risultante è privo di contesto o interno a un trasferimento, la modifica viene impedita; un istante futuro è invece ammesso quando possiede un contesto valido.
- Se la movimentazione è consolidata, soltanto le note rimangono modificabili e il documento emesso conserva il valore consolidato.

**Risultato:** la movimentazione e la relativa attribuzione risultano coerenti con i nuovi dati.

### CU-MER-05 – Eliminare una movimentazione merci

**Obiettivo:** rimuovere fisicamente una movimentazione registrata.

**Precondizioni:** la movimentazione esiste e non è consolidata.

**Flusso principale:**

1. L'operatore richiede l'eliminazione.
2. Il sistema mostra i dati della movimentazione e il contesto dal quale verrà rimossa.
3. Se la movimentazione appartiene a una o più fatture `in immissione`, il sistema include la rimozione di tutte le relative associazioni informative.
4. L'operatore conferma l'eliminazione fisica.
5. Il sistema elimina atomicamente movimentazione e associazioni alle fatture.

**Alternative e vincoli:**

- L'eliminazione non modifica viaggio, visita, ormeggio o anagrafica merce.
- Se la movimentazione è consolidata, l'eliminazione viene impedita.
- Se il salvataggio fallisce, la movimentazione rimane integralmente registrata.

**Risultato:** la movimentazione non esiste più.

### CU-MER-06 – Includere una movimentazione in fattura

**Obiettivo:** riportare una movimentazione nella fattura come informazione priva di valore economico.

**Precondizioni:** la movimentazione esiste e la fattura si trova nello stato `in immissione`.

**Flusso principale:**

1. L'operatore richiede l'aggiunta di informazioni sulle movimentazioni merci alla fattura.
2. Il sistema propone le movimentazioni compatibili secondo il contesto operativo e le regole del punto 9.
3. L'operatore seleziona una o più movimentazioni.
4. Il sistema mostra tipo, merce, quantità, data e ora e contesto che verranno riportati.
5. L'operatore conferma l'associazione.
6. Il sistema aggiunge le movimentazioni alla sezione informativa senza modificare il totale della fattura.
7. All'emissione, il sistema consolida i dati delle movimentazioni riportati nel documento.

**Alternative e vincoli:**

- La stessa movimentazione non può essere inserita due volte nella medesima fattura.
- La compatibilità e l'eventuale inclusione della stessa movimentazione in fatture differenti vengono definite nel punto 9.
- Una movimentazione può essere rimossa finché la fattura rimane `in immissione` e non viene eliminata insieme all'associazione.
- Dopo l'emissione l'associazione e i dati consolidati non possono essere modificati; l'eventuale ritiro valido applica le regole generali della fattura.
- Nessuna movimentazione informativa partecipa a imponibile, sconti, bollo o totale.

**Risultato:** la fattura contiene le informazioni selezionate oppure, dopo l'emissione, le conserva come dati consolidati.

### CU-MER-07 – Aggregare le quantità movimentate

**Obiettivo:** produrre quantità significative senza sommare valori riferiti a merci differenti.

**Precondizioni:** è disponibile un insieme di movimentazioni compatibile con i filtri scelti.

**Flusso principale:**

1. Il sistema raggruppa le movimentazioni per identità della merce.
2. All'interno di ciascuna merce distingue `carico` e `scarico`.
3. Calcola separatamente le quantità totali caricate e scaricate.
4. Mantiene accessibili le singole movimentazioni e le versioni anagrafiche applicabili.
5. Restituisce i risultati al caso d'uso di consultazione o resoconto che li ha richiesti.

**Alternative e vincoli:**

- Non viene prodotto un totale numerico comprendente merci differenti.
- Non viene calcolato automaticamente un valore netto ottenuto sottraendo gli scarichi dai carichi o viceversa.
- Le versioni differenti della stessa identità merce non separano l'aggregazione, salvo esplicita scelta di rappresentazione prevista dal punto 13.

**Risultato:** sono disponibili totali separati e confrontabili per merce e tipo di movimentazione.

### Interazioni con gli altri ambiti

- Il punto 1 definisce identità, versioni temporali, stato ed eliminazione dell'anagrafica merce.
- Il punto 2 fornisce il contesto operativo utilizzato per l'attribuzione.
- Il punto 3 può determinare la riattribuzione delle movimentazioni quando cambia la sequenza delle operazioni nave.
- Il punto 9 completa selezione, associazione informativa, rimozione e consolidamento delle movimentazioni in fattura.
- Il punto 12 interpreta gli istanti nel fuso operativo applicabile.
- Il punto 13 completa filtri, aggregazioni, rappresentazione storica ed esportazioni.

### Decisioni funzionali confermate

Sono confermati i seguenti comportamenti:

- la quantità è decimale, strettamente maggiore di zero e limitata a tre cifre decimali;
- una movimentazione può essere registrata o modificata con un istante futuro quando a tale istante esistono un viaggio, una visita e un ormeggio validi;
- il tipo può essere corretto direttamente tra `carico` e `scarico`, senza eliminare e ricreare la movimentazione;
- più movimentazioni possono condividere lo stesso minuto anche quando nave, merce e tipo coincidono, senza vincoli di unicità ulteriori;
- una merce deve essere attiva per una nuova selezione, mentre un riferimento esistente a una merce disattivata può essere mantenuto;
- una movimentazione può essere inclusa nella fattura come informazione priva di importo e viene consolidata con l'emissione; prima del consolidamento rimane modificabile ed eliminabile secondo le regole definite;
- le quantità vengono aggregate per identità della merce, mantenendo separati carichi e scarichi e senza calcolare un saldo netto o totali tra merci differenti.

### Esito del punto

I casi d'uso coprono consultazione, registrazione, attribuzione, modifica, eliminazione, inclusione informativa in fattura e aggregazione delle movimentazioni merci.

Le regole funzionali dell'ambito e le relative decisioni sono state confermate. Il punto è pertanto **completato**.

## 2.13 Punto 6 – Determinazione di cliente e agenzia

### Tema e perimetro

Il punto descrive come cliente e agenzia vengono specificati ai diversi livelli operativi e determinati per le attività da fatturare.

I due riferimenti sono indipendenti: il cliente identifica il debitore della fattura, mentre l'agenzia identifica il creditore. Uno dei due può essere specificato a un livello e l'altro ereditato da un livello differente.

Il punto comprende assegnazione, rimozione, priorità, memorizzazione dei valori effettivi, ricalcolo, trattamento delle operazioni nave e compatibilità con la fattura. Le regole complete di selezione e composizione della fattura saranno dettagliate nel punto 9.

### Requisiti funzionali comuni

#### Livelli di assegnazione

- Cliente e agenzia possono essere specificati indipendentemente su:
  - viaggio;
  - visita;
  - ormeggio;
  - prestazione, comprese le operazioni nave.
- Le assegnazioni a viaggio, visita e ormeggio sono attributi gestibili dei relativi elementi derivati e non consentono di modificarne direttamente struttura, estremi temporali o appartenenza.
- I valori sono facoltativi a ogni livello; una prestazione può essere registrata anche quando uno o entrambi non sono ancora determinabili.
- Un valore assente a un livello non rappresenta un'esclusione esplicita, ma determina la ricerca del primo valore disponibile al livello meno specifico successivo.
- La rimozione di un valore specificato ripristina quindi l'ereditarietà dal livello superiore.
- Per una nuova assegnazione o sostituzione può essere selezionato soltanto un cliente o un'agenzia attivi nel momento della selezione, indipendentemente dalla data dell'elemento operativo.
- Un riferimento esistente a un soggetto successivamente disattivato può essere mantenuto mentre vengono modificati altri dati; dopo la rimozione non può essere selezionato nuovamente finché il soggetto non viene riattivato.
- Cliente e agenzia vengono validati e ricalcolati separatamente: la presenza o la modifica di uno non condiziona l'altro.

#### Ordine di priorità

- Per le prestazioni ordinarie, il sistema determina separatamente cliente e agenzia applicando questo ordine:
  1. valore specificato direttamente sulla prestazione;
  2. valore specificato sull'ormeggio attribuito;
  3. valore specificato sulla visita attribuita;
  4. valore specificato sul viaggio attribuito.
- Il primo valore presente interrompe la ricerca soltanto per il soggetto considerato.
- Cliente e agenzia effettivi vengono persistiti sulla prestazione insieme al livello dal quale ciascun valore deriva.
- La consultazione distingue i valori specificati direttamente da quelli effettivi ereditati e rende visibile la fonte di ciascuno.
- Una modifica a un livello superiore non sostituisce un valore specificato a un livello più prioritario.

#### Operazioni nave

- I riferimenti specificati direttamente su un'operazione nave hanno priorità su qualsiasi contesto operativo e si applicano a tutte le sue componenti economiche.
- In assenza di un valore diretto, i riferimenti vengono determinati in base al contesto pertinente alla componente:
  - l'entrata utilizza primo ormeggio, visita e viaggio aperti dall'operazione;
  - l'uscita utilizza ormeggio, visita e viaggio chiusi dall'operazione;
  - lo spostamento nello stesso porto utilizza ormeggio di origine, visita e viaggio alla partenza;
  - la componente `uscita` di uno spostamento tra porti utilizza ormeggio, visita e viaggio di origine alla partenza;
  - la componente `entrata` dello stesso spostamento utilizza nuovo ormeggio, nuova visita e viaggio mantenuto aperto all'arrivo.
- Cliente e agenzia vengono determinati separatamente anche per ciascuna componente economica.
- Uno spostamento tra porti può essere registrato anche quando le due componenti non possiedono ancora soggetti completi o determinano coppie differenti.
- Ciascuna componente è fatturabile autonomamente quando determina la propria coppia completa `cliente + agenzia`, indipendentemente dalla completezza o dalla coppia determinata dall'altra componente.
- Le due componenti possono essere associate in momenti diversi a fatture differenti; ciascuna fattura deve essere compatibile con la coppia effettiva della sola componente che contiene.
- Un valore specificato direttamente sull'operazione si applica a entrambe le componenti per il soggetto considerato, senza imporre che le rispettive coppie effettive coincidano.
- Le operazioni `mancate` applicano le stesse regole di determinazione, utilizzando il contesto richiesto per il relativo porto economico; non modificano le assegnazioni dei livelli operativi.

#### Movimentazioni merci informative

- Le movimentazioni merci non consentono un cliente o un'agenzia specificati direttamente.
- Per stabilire la compatibilità con una fattura, cliente e agenzia vengono determinati dal relativo ormeggio, quindi dalla visita e infine dal viaggio.
- Entrambi i riferimenti devono essere presenti e coincidere con quelli della fattura nella quale la movimentazione viene inclusa come informazione.
- I valori vengono verificati quando la movimentazione viene associata alla fattura e nuovamente prima dell'emissione.
- L'emissione consolida la compatibilità e i dati informativi riportati; una successiva variazione che cambierebbe direttamente o indirettamente tale compatibilità viene impedita.

#### Ricalcolo dei riferimenti effettivi

- I riferimenti effettivi vengono rideterminati quando cambia:
  - un valore specificato direttamente sulla prestazione;
  - il cliente o l'agenzia di viaggio, visita oppure ormeggio;
  - l'attribuzione operativa della prestazione;
  - la sequenza delle operazioni nave dalla quale dipendono contesto o componenti economiche.
- Il sistema individua tutte le prestazioni, le componenti economiche delle operazioni nave e le fatture `in immissione` interessate.
- Per ogni elemento confronta valori e fonti precedenti con quelli risultanti.
- La coppia selezionata sulla fattura non viene aggiornata automaticamente in base ai nuovi riferimenti delle attività.
- Se la variazione renderebbe anche una sola attività o movimentazione incompatibile con la coppia della relativa fattura `in immissione`, viene impedita e il sistema indica gli elementi incompatibili.
- Ricalcolo dei riferimenti, aggiornamento degli importi dipendenti e verifica delle fatture `in immissione` avvengono atomicamente.
- Una variazione viene impedita se cambierebbe cliente, agenzia, fonte o qualsiasi risultato dipendente di una prestazione, componente economica o movimentazione consolidata.
- La sola presenza di elementi consolidati non costituisce un blocco quando tutti i relativi valori, fonti e risultati rimangono invariati.

#### Fatturabilità e coppia comune

- Una prestazione, un'operazione a componente singola o una componente economica può essere registrata senza cliente, senza agenzia oppure senza entrambi.
- Per essere inserito in fattura, l'elemento economico selezionato deve determinare entrambi i riferimenti.
- Le componenti `uscita` ed `entrata` di uno spostamento tra porti sono valutate e associate separatamente; la fatturazione di una non richiede la presenza in fattura dell'altra.
- Cliente e agenzia vengono selezionati esplicitamente sulla fattura prima dell'aggiunta delle attività.
- Entrambi devono essere attivi nel momento della selezione o della sostituzione sulla fattura.
- Tutte le attività economiche della fattura devono possedere la stessa coppia effettiva `cliente + agenzia`.
- La fattura memorizza la coppia selezionata e propone soltanto attività con entrambi i riferimenti coincidenti.
- Le movimentazioni merci informative devono determinare la stessa coppia della fattura e possono essere aggiunte soltanto dopo la selezione esplicita di cliente e agenzia; non concorrono a definire la coppia.
- La rimozione dell'ultima attività economica conserva la coppia selezionata e le eventuali movimentazioni informative compatibili; la bozza non può essere emessa finché rimane priva di righe economiche.
- La coppia può essere sostituita in una fattura `in immissione` soltanto quando tutti gli elementi già associati sono compatibili con il nuovo cliente e la nuova agenzia.
- La disattivazione successiva di cliente o agenzia non invalida una prestazione o una fattura esistente e non modifica i dati consolidati.

### CU-SOG-01 – Consultare assegnazioni e riferimenti effettivi

**Obiettivo:** comprendere quali cliente e agenzia si applicano a un elemento e da quale livello derivano.

**Precondizioni:** l'elemento operativo o la prestazione esiste.

**Flusso principale:**

1. L'operatore apre il dettaglio di viaggio, visita, ormeggio, prestazione oppure operazione nave.
2. Il sistema mostra separatamente cliente e agenzia specificati direttamente sull'elemento.
3. Per una prestazione mostra cliente e agenzia effettivi persistiti.
4. Per ciascun valore effettivo indica la fonte: prestazione, ormeggio, visita o viaggio.
5. Per un'operazione con più componenti mostra separatamente soggetti e fonti di ciascuna componente.
6. Rende raggiungibili i dettagli dei soggetti e dei livelli dai quali derivano.

**Alternative e vincoli:**

- Se un riferimento non è determinabile, il sistema lo mostra esplicitamente come assente.
- Un riferimento a un soggetto disattivato rimane consultabile.
- I dati anagrafici vengono mostrati secondo le versioni temporali applicabili e le regole di consolidamento.

**Risultato:** nessun dato viene modificato.

### CU-SOG-02 – Assegnare cliente o agenzia a un livello operativo

**Obiettivo:** specificare o rimuovere un riferimento su viaggio, visita oppure ormeggio.

**Precondizioni:** il livello operativo esiste.

**Flusso principale:**

1. L'operatore apre le assegnazioni del viaggio, della visita o dell'ormeggio.
2. Inserisce, sostituisce o rimuove cliente e agenzia in modo indipendente.
3. Il sistema verifica che ogni nuovo riferimento selezionato sia attivo.
4. Individua le prestazioni, le operazioni, le movimentazioni informative e le fatture dipendenti.
5. Simula i riferimenti effettivi, le fonti e i risultati conseguenti.
6. Mostra valori precedenti e risultanti, elementi aggiornabili e vincoli bloccanti.
7. L'operatore conferma la variazione.
8. Il sistema applica atomicamente assegnazioni, riferimenti effettivi, calcoli e aggiornamenti delle fatture `in immissione`.

**Alternative e vincoli:**

- La rimozione di un riferimento determina l'ereditarietà dall'eventuale livello superiore.
- Un soggetto disattivato già associato può essere mantenuto ma non selezionato come nuovo valore.
- La variazione viene impedita se genera coppie non uniformi in una fattura `in immissione` o cambia dati consolidati.
- Una variazione che non cambia i valori e le fonti utilizzati dagli elementi consolidati rimane consentita.

**Risultato:** il livello contiene le nuove assegnazioni e tutti gli elementi non consolidati dipendenti sono coerenti.

### CU-SOG-03 – Specificare cliente o agenzia su una prestazione

**Obiettivo:** sostituire uno o entrambi i valori ereditati per una singola attività.

**Precondizioni:** la prestazione o l'operazione nave esiste e non è consolidata per i dati da modificare.

**Flusso principale:**

1. L'operatore inserisce, sostituisce o rimuove cliente e agenzia direttamente sulla prestazione.
2. Il sistema verifica che ogni nuovo soggetto selezionato sia attivo.
3. Ridetermina separatamente cliente e agenzia effettivi e le rispettive fonti.
4. Per un'operazione nave ridetermina tutte le componenti economiche.
5. Simula i risultati economici e tutte le eventuali fatture `in immissione` interessate.
6. Mostra gli effetti e gli eventuali blocchi.
7. L'operatore conferma la variazione.
8. Il sistema salva atomicamente riferimenti diretti, valori effettivi, calcoli e fatture aggiornate.

**Alternative e vincoli:**

- La rimozione di un riferimento diretto ripristina l'ereditarietà dal contesto operativo.
- È consentito specificare o rimuovere soltanto uno dei due soggetti.
- Per uno spostamento tra porti, il valore diretto si applica a entrambe le componenti.
- La modifica viene impedita se altera valori o fonti di una componente consolidata oppure rende non uniforme una delle fatture `in immissione` interessate.

**Risultato:** la prestazione possiede valori diretti ed effettivi coerenti con le priorità.

### CU-SOG-04 – Determinare i soggetti di una prestazione ordinaria

**Obiettivo:** calcolare cliente e agenzia effettivi applicando la gerarchia delle assegnazioni.

**Precondizioni:** la prestazione possiede un'attribuzione operativa valida.

**Flusso principale:**

1. Per il cliente, il sistema cerca nell'ordine prestazione, ormeggio, visita e viaggio.
2. Memorizza il primo cliente presente e il relativo livello di origine.
3. Ripete autonomamente la ricerca per l'agenzia.
4. Memorizza la prima agenzia presente e il relativo livello di origine.
5. Restituisce i due riferimenti al caso d'uso che ha richiesto registrazione, modifica, ricalcolo o fatturazione.

**Alternative e vincoli:**

- Cliente e agenzia possono provenire da livelli differenti.
- L'assenza di un riferimento a tutti i livelli produce un valore effettivo assente e non impedisce il salvataggio della prestazione.
- Un valore diretto mantiene la priorità anche quando cambiano i livelli superiori.

**Risultato:** i riferimenti effettivi e le rispettive fonti sono persistiti sulla prestazione.

### CU-SOG-05 – Determinare i soggetti di un'operazione nave

**Obiettivo:** calcolare cliente e agenzia per le componenti economiche di un'operazione.

**Precondizioni:** l'operazione esiste e possiede il contesto richiesto dalla propria tipologia.

**Flusso principale:**

1. Il sistema individua le componenti economiche dell'operazione.
2. Per ciascuna componente determina il contesto di origine o destinazione applicabile.
3. Applica separatamente a cliente e agenzia la priorità del valore diretto sull'operazione e, in sua assenza, di ormeggio, visita e viaggio.
4. Memorizza per ogni componente i valori effettivi e le relative fonti.
5. Per ciascuna componente verifica autonomamente se la coppia è completa.
6. Rende disponibile per ciascuna componente l'esito per calcolo economico e fatturazione.

**Alternative e vincoli:**

- L'assenza o la differenza dei soggetti non impedisce la registrazione dell'operazione.
- Una componente con coppia incompleta non è fatturabile finché non vengono determinati entrambi i soggetti, senza impedire la fatturazione dell'altra componente se completa.
- La differenza tra le coppie delle due componenti non costituisce un'incompatibilità: ciascuna può essere associata a una fattura coerente con i propri riferimenti.
- Le operazioni `mancate` non costruiscono un nuovo contesto, ma utilizzano quello richiesto dalle regole del punto 3.

**Risultato:** ogni componente possiede soggetti e fonti determinati oppure esplicitamente assenti; la fatturabilità è stabilita senza modificare la struttura operativa.

### CU-SOG-06 – Ricalcolare i soggetti dopo una variazione

**Obiettivo:** riallineare le attività non consolidate quando cambiano assegnazioni o contesto operativo.

**Precondizioni:** è stata richiesta una variazione che può influire sui riferimenti effettivi.

**Flusso principale:**

1. Il sistema individua l'intervallo e gli elementi dipendenti.
2. Ridetermina cliente e agenzia, le fonti e le coppie delle componenti economiche.
3. Ricalcola gli elementi economici dipendenti.
4. Verifica la compatibilità delle fatture `in immissione`.
5. Verifica che nessun dato consolidato cambi direttamente o indirettamente.
6. Mostra elementi aggiornati, fatture riallineate ed eventuali blocchi.
7. L'operatore conferma la variazione originaria.
8. Il sistema applica atomicamente variazione, riferimenti, calcoli e aggiornamenti delle fatture.

**Alternative e vincoli:**

- La coppia selezionata sulla fattura non viene modificata automaticamente, neppure quando tutte le attività convergerebbero sulla stessa nuova coppia.
- Se una o più attività diventerebbero incompatibili con la fattura, la variazione viene impedita senza rimuovere automaticamente alcun elemento.
- Se cambia un valore o una fonte consolidati, l'intera variazione viene impedita.

**Risultato:** tutti gli elementi non consolidati sono coerenti oppure nessuna variazione viene applicata.

### CU-SOG-07 – Verificare la coppia per la fatturazione

**Obiettivo:** garantire che la fattura contenga attività riferite a un solo cliente e a una sola agenzia.

**Precondizioni:** una fattura è in creazione o nello stato `in immissione`.

**Flusso principale:**

1. L'operatore seleziona cliente e agenzia della fattura.
2. Il sistema verifica che entrambi siano attivi e assegna la coppia alla fattura.
3. Propone soltanto attività economiche che possiedono entrambi i riferimenti coincidenti con la coppia selezionata.
4. Per ogni attività scelta ripete il confronto sui riferimenti effettivi.
5. Consente l'associazione soltanto in caso di corrispondenza completa.
6. Prima dell'emissione ripete il controllo su tutte le attività e le movimentazioni informative associate.

**Alternative e vincoli:**

- Un'attività priva di cliente o agenzia non può essere inserita.
- Ciascuna componente di uno spostamento tra porti può essere inserita autonomamente se la propria coppia completa coincide con quella della fattura.
- La componente già associata a una fattura non è selezionabile per un'altra; l'associazione o la rimozione di una componente non modifica quella dell'altra.
- Una fattura `in immissione` può rimanere temporaneamente priva di attività economiche e contenere movimentazioni informative compatibili, ma non può essere emessa in tale condizione.
- Se viene rimossa l'ultima attività economica, cliente e agenzia restano selezionati e la fattura non può essere emessa finché non ne viene aggiunta almeno una compatibile.
- La sostituzione della coppia viene impedita se almeno un elemento già associato è incompatibile.

**Risultato:** la fattura utilizza una sola coppia completa `cliente + agenzia`.

### CU-SOG-08 – Verificare una movimentazione informativa

**Obiettivo:** stabilire se una movimentazione merci può essere riportata in una fattura.

**Precondizioni:** la movimentazione possiede un'attribuzione operativa valida e la fattura possiede una coppia completa.

**Flusso principale:**

1. Il sistema determina il cliente dall'ormeggio, dalla visita o dal viaggio, prendendo il primo valore presente.
2. Determina autonomamente l'agenzia applicando lo stesso ordine.
3. Confronta entrambi i riferimenti con quelli della fattura.
4. Se coincidono, rende la movimentazione selezionabile come informazione.
5. Prima dell'emissione ripete il controllo e consolida i dati riportati.

**Alternative e vincoli:**

- La movimentazione non può specificare direttamente cliente o agenzia.
- Se uno dei riferimenti manca o la coppia è differente, la movimentazione non può essere associata.
- L'associazione non modifica la coppia o il totale della fattura.

**Risultato:** la movimentazione è esclusa oppure risulta compatibile con la fattura senza produrre effetti economici.

### Interazioni con gli altri ambiti

- Il punto 1 definisce selezionabilità, versioni ed eliminazione di clienti e agenzie.
- I punti 2 e 3 forniscono livelli operativi, attribuzioni e contesti delle componenti economiche.
- Il punto 4 memorizza i riferimenti effettivi sulle prestazioni e ne utilizza la presenza per la fatturabilità.
- Il punto 5 utilizza i riferimenti del contesto per le movimentazioni informative.
- I punti 7 e 8 ricalcolano importi e regole che dipendono da cliente o agenzia.
- Il punto 9 completa creazione, composizione, modifica e consolidamento della fattura.
- Il punto 13 utilizza soggetti effettivi e fonti nei resoconti.

### Decisioni funzionali confermate

Sono confermati i seguenti comportamenti:

- l'assenza di un valore a un livello significa sempre ereditarietà; non è previsto un valore esplicito che interrompa la ricerca lasciando cliente o agenzia assenti;
- oltre ai riferimenti effettivi, sulla prestazione viene memorizzato il livello dal quale derivano cliente e agenzia;
- per le operazioni nave vengono utilizzati il contesto aperto dall'entrata, quello chiuso dall'uscita e i contesti di origine o destinazione delle componenti dello spostamento;
- cliente e agenzia specificati direttamente su uno spostamento tra porti si applicano a entrambe le componenti per il soggetto considerato; le coppie risultanti possono differire e ciascuna componente resta fatturabile autonomamente quando la propria coppia è completa;
- le componenti `uscita` ed `entrata` di uno spostamento tra porti possono essere associate in momenti diversi a fatture differenti, senza perdere il legame strutturale con l'unica operazione di origine;
- cliente e agenzia vengono selezionati esplicitamente sulla fattura prima delle attività; la coppia non viene aggiornata automaticamente e qualsiasi variazione che renda incompatibile un elemento associato viene bloccata senza rimozioni automatiche;
- le movimentazioni merci non possiedono valori diretti: per l'inclusione informativa ereditano cliente e agenzia da ormeggio, visita e viaggio e devono coincidere con la fattura;
- una fattura può essere conservata `in immissione` senza attività economiche dopo la selezione esplicita di cliente e agenzia, anche mantenendo movimentazioni informative compatibili, ma non può essere emessa finché non contiene almeno un'attività economica.

### Esito del punto

I casi d'uso coprono assegnazione, ereditarietà, determinazione, ricalcolo, trattamento delle operazioni nave, compatibilità delle movimentazioni informative e uniformità della fattura.

Le regole funzionali dell'ambito e le relative decisioni sono state confermate. Il punto è pertanto **completato**.

## 2.14 Punto 7 – Tariffe e pesi

### Tema e perimetro

Il punto descrive la gestione delle tariffe applicabili nei singoli porti, delle configurazioni complete per tipologia di nave e delle sequenze temporali dei pesi associate ai tipi di prestazione e alle operazioni nave.

Il sistema utilizza tariffa, configurazione, scaglione e peso per determinare l'importo base di ogni prestazione tariffata o componente economica. Le prestazioni libere restano escluse perché utilizzano l'importo inserito direttamente dall'operatore.

Il punto comprende consultazione, creazione, modifica ed eliminazione delle tariffe; gestione degli scaglioni ordinari ed extra; versioni dei pesi; individuazione dei valori applicabili; calcolo dell'importo base; simulazione degli impatti e ricalcolo degli elementi non consolidati. Le regole economiche successive e gli aspetti fiscali sono trattati nel punto 8, mentre sconti, composizione ed emissione della fattura sono completati nel punto 9.

### Requisiti funzionali comuni

#### Sequenza tariffaria del porto

- Ogni tariffa appartiene obbligatoriamente a un solo porto, selezionato all'inizio della creazione e non modificabile successivamente.
- Ogni tariffa possiede una data e un'ora di decorrenza con precisione al minuto.
- Per lo stesso porto non possono esistere due tariffe con la medesima decorrenza; tariffe di porti differenti possono invece iniziare nello stesso minuto.
- Le tariffe di ogni porto formano una sequenza ordinata nella quale:
  - la decorrenza è inclusa;
  - la fine, non memorizzata direttamente, coincide con la decorrenza esclusa della tariffa successiva;
  - l'ultima tariffa rimane applicabile senza limite temporale finale;
  - prima della prima tariffa non esiste alcun valore applicabile.
- Possono essere inserite tariffe con decorrenza passata, intermedia, corrente o futura.
- La creazione di una tariffa intermedia restringe l'intervallo della tariffa precedente senza modificare le decorrenze già presenti.
- Le tariffe non possiedono uno stato `attiva` o `disattivata`: la loro applicabilità dipende esclusivamente dal porto e dall'intervallo temporale.
- Una prestazione tariffata non può essere registrata se nel relativo porto e istante economico non esiste una tariffa completa applicabile.

#### Configurazione completa per tipologia di nave

- Ogni tariffa contiene esattamente una configurazione per ciascuna tipologia di nave prevista dal sistema.
- Nella configurazione iniziale devono essere presenti almeno `nave normale`, `nave passeggeri` e `nave ADM`.
- La tariffa non può essere salvata se una tipologia è assente o compare più di una volta.
- La nuova tariffa deve ripetere tutte le configurazioni, anche quando alcune non cambiano rispetto alla tariffa precedente.
- L'operatore può compilare da zero la struttura completa oppure copiarla da qualsiasi tariffa esistente, anche riferita a un porto differente.
- La copia costituisce soltanto una base iniziale modificabile: la nuova tariffa mantiene il porto selezionato per la creazione e non conserva dipendenze dalla tariffa sorgente.
- Ogni configurazione condivide porto, decorrenza e intervallo della tariffa che la contiene, ma può definire scaglioni e valori differenti dalle altre tipologie.
- L'introduzione di una nuova tipologia di nave richiede il completamento delle tariffe necessarie prima che la tipologia possa essere utilizzata per attività tariffate.

#### Scaglioni ordinari ed extra

- Ogni configurazione contiene almeno uno scaglione ordinario.
- Ogni scaglione ordinario specifica:
  - un limite massimo intero non negativo e incluso;
  - un valore tariffario non negativo.
- Gli scaglioni sono ordinati per limite massimo crescente e non possono avere limiti duplicati.
- Il primo scaglione parte dalla dimensione `0`; ciascuno dei successivi inizia dal valore intero immediatamente successivo al limite precedente.
- La dimensione della nave, i limiti e l'ampiezza dello scaglione extra sono numeri interi e, nella prima versione, non espongono un'unità di misura.
- Ogni configurazione specifica inoltre:
  - un'ampiezza dello scaglione extra intera e strettamente maggiore di zero;
  - una tariffa extra non negativa.
- Scaglioni, ampiezza extra e tariffa extra non hanno validità autonoma: per cambiarli da un determinato istante deve essere creata una nuova tariffa completa oppure modificata una tariffa esistente applicando i controlli retroattivi.

#### Sequenze temporali dei pesi

- Ogni tipo di prestazione a catalogo e ciascuna operazione nave fissa — `entrata`, `uscita` e `spostamento` — possiedono una sequenza temporale autonoma di pesi.
- Il peso è numerico e strettamente maggiore di zero.
- La versione iniziale ha valore predefinito `1`, non possiede decorrenza ed è applicabile senza limite temporale inferiore.
- Ogni versione successiva indica una data e un'ora di decorrenza, inclusa, e sostituisce la precedente fino alla decorrenza esclusa dell'eventuale versione seguente.
- Due versioni dello stesso tipo non possono condividere la medesima decorrenza e per ogni istante deve esistere un solo peso applicabile, senza sovrapposizioni o intervalli scoperti.
- Possono essere inserite versioni passate, intermedie, correnti o future.
- La versione iniziale può essere modificata ma non eliminata; l'eliminazione di una versione successiva estende automaticamente la validità della precedente.
- Le prestazioni libere non hanno un peso e non partecipano a queste sequenze.

#### Individuazione dei valori applicabili

- Il sistema determina i dati tariffari applicando la sequenza:
  `porto e istante economico → tariffa → tipologia di nave → configurazione → dimensione → scaglione → peso`.
- Per le prestazioni ordinarie si utilizzano il porto dell'ormeggio attribuito e la data e l'ora della prestazione.
- Per le operazioni nave:
  - l'entrata utilizza porto di destinazione e istante di entrata;
  - l'uscita utilizza porto di origine e istante di uscita;
  - lo spostamento interno utilizza porto corrente e istante di partenza;
  - la componente `uscita` di uno spostamento tra porti utilizza porto di origine e istante di partenza;
  - la componente `entrata` dello stesso spostamento utilizza porto di destinazione e istante di arrivo.
- Le due componenti dello spostamento tra porti vengono calcolate e memorizzate autonomamente e possono quindi utilizzare tariffe, configurazioni, scaglioni e pesi differenti.
- La tariffa applicabile è quella avente la decorrenza più recente non successiva all'istante economico.
- La tipologia e la dimensione della nave sono quelle valide per l'attività secondo le regole anagrafiche e di consolidamento.
- Se la dimensione non supera l'ultimo limite ordinario, viene scelto il primo scaglione il cui limite massimo è maggiore o uguale alla dimensione.

#### Calcolo dello scaglione extra e dell'importo base

- Se la dimensione supera l'ultimo limite ordinario, il sistema calcola l'eccedenza rispetto a tale limite.
- Il numero di scaglioni extra è il rapporto tra eccedenza e ampiezza extra, arrotondato per eccesso; ogni scaglione iniziato viene conteggiato per intero.
- Il valore tariffario risultante è:
  `valore dell'ultimo scaglione + numero scaglioni extra × tariffa extra`.
- L'importo base dell'attività è:
  `valore tariffario × peso applicabile`.
- Il prodotto costituisce il primo passaggio monetario del calcolo e viene arrotondato a due cifre decimali secondo le regole comuni; il punto 8 utilizza tale risultato per le regole economiche e il punto 9 per gli sconti e il calcolo della fattura.
- Tariffa e peso non contengono importi precalcolati per le future attività. Quando viene creata una prestazione o una componente economica, il sistema calcola e memorizza su di essa almeno tariffa, configurazione, scaglione ordinario o numero di scaglioni extra, valore tariffario, versione del peso e importo base risultante.

#### Modifica, eliminazione e ricalcolo

- Una tariffa esistente può essere modificata nella decorrenza e nei valori delle configurazioni, ma non nel porto.
- La modifica diretta corregge la tariffa nel proprio intervallo; per introdurre un cambiamento da un nuovo istante preservando il periodo precedente viene creata una nuova tariffa completa.
- Una tariffa può essere eliminata in qualsiasi posizione della sequenza, purché tutti i vincoli risultanti siano rispettati.
- L'eliminazione estende la tariffa precedente fino alla decorrenza della successiva; se viene eliminata la prima tariffa, il periodo antecedente alla nuova prima decorrenza rimane privo di tariffa.
- Inserimento, modifica o eliminazione di una tariffa o di una versione del peso richiedono una simulazione preventiva degli intervalli e di tutte le attività interessate, comprese quelle future.
- La simulazione mostra almeno valori precedenti e risultanti, intervalli ridefiniti, attività e componenti economiche da ricalcolare, fatture `in immissione` interessate ed elementi consolidati bloccanti.
- Le attività non fatturate e quelle presenti soltanto in fatture `in immissione` vengono ricalcolate; gli eventuali totali delle fatture vengono aggiornati atomicamente.
- Per uno spostamento tra porti il ricalcolo e il consolidamento restano distinti per componente. Se le componenti appartengono a fatture `in immissione` differenti, vengono aggiornate entrambe le fatture interessate.
- Una variazione viene impedita se lascia un'attività tariffata senza tariffa, rende invalida una configurazione oppure modifica direttamente o indirettamente dati o risultati di un'attività o componente consolidata.
- La sola presenza di elementi consolidati nell'intervallo non impedisce la variazione quando tariffa, configurazione, scaglione, peso, importo e ogni altro risultato utilizzato rimangono invariati.
- Validazione, aggiornamento delle sequenze, ricalcoli e aggiornamento delle fatture costituiscono un'unica operazione atomica.

### CU-TAR-01 – Consultare le tariffe di un porto

**Obiettivo:** conoscere la sequenza tariffaria e le configurazioni applicabili nel tempo.

**Precondizioni:** il porto esiste.

**Flusso principale:**

1. L'operatore seleziona un porto.
2. Il sistema mostra le tariffe ordinate per decorrenza.
3. Per ciascuna tariffa mostra l'intervallo derivato, distinguendo l'assenza di limite finale.
4. L'operatore apre una tariffa.
5. Il sistema mostra tutte le tipologie di nave e, per ciascuna, scaglioni ordinari, ampiezza extra e tariffa extra.
6. Rende disponibili le attività che utilizzano la tariffa e i relativi dati di calcolo.

**Alternative e vincoli:**

- Se il porto non possiede tariffe, il sistema segnala che nessun periodo è coperto.
- Gli intervalli sono sempre calcolati dalle decorrenze e non modificabili direttamente.

**Risultato:** nessun dato viene modificato.

### CU-TAR-02 – Creare una tariffa

**Obiettivo:** introdurre una configurazione tariffaria completa per un porto da uno specifico istante.

**Precondizioni:** il porto esiste.

**Flusso principale:**

1. L'operatore seleziona il porto, che diventa immutabile per la nuova tariffa.
2. Inserisce data e ora di decorrenza.
3. Sceglie se partire dalla struttura completa vuota oppure copiare una tariffa esistente.
4. In caso di copia seleziona la tariffa sorgente; il sistema ne riporta le configurazioni mantenendo il porto scelto per la nuova tariffa.
5. L'operatore completa o modifica scaglioni ordinari, ampiezza extra e tariffa extra per ogni tipologia di nave.
6. Il sistema verifica completezza, unicità delle tipologie, ordinamento degli scaglioni e validità dei valori.
7. Simula l'inserimento nella sequenza e individua attività, componenti e fatture interessate.
8. Mostra gli intervalli precedenti e risultanti e gli eventuali blocchi.
9. L'operatore conferma.
10. Il sistema crea la tariffa e applica atomicamente tutti i ricalcoli consentiti.

**Alternative e vincoli:**

- La creazione da zero predispone tutte le sezioni obbligatorie senza valorizzarne automaticamente scaglioni e valori.
- Può essere copiata qualsiasi tariffa esistente; la copia costituisce soltanto un valore iniziale modificabile e non crea dipendenze tra le due tariffe.
- Una decorrenza già utilizzata dallo stesso porto impedisce il salvataggio.
- La tariffa può essere inserita prima, dopo o tra tariffe esistenti.
- Se la variazione modificherebbe risultati consolidati, nessun elemento viene salvato.

**Risultato:** la nuova tariffa occupa il corretto intervallo della sequenza del porto.

### CU-TAR-03 – Modificare una tariffa

**Obiettivo:** correggere decorrenza, scaglioni o valori di una tariffa esistente.

**Precondizioni:** la tariffa esiste.

**Flusso principale:**

1. L'operatore modifica la decorrenza oppure una o più configurazioni.
2. Il sistema valida nuovamente l'intera tariffa completa.
3. Ricostruisce gli intervalli della tariffa modificata e di quelle adiacenti.
4. Ridetermina tariffa, configurazione, scaglione, peso e importo delle attività interessate.
5. Mostra differenze, ricalcoli e vincoli bloccanti.
6. L'operatore conferma.
7. Il sistema applica atomicamente tariffa, intervalli, attività e fatture `in immissione`.

**Alternative e vincoli:**

- Il porto non può essere modificato; per un altro porto deve essere creata una nuova tariffa.
- Il sistema impedisce decorrenze duplicate, configurazioni incomplete, scaglioni non validi o attività prive di tariffa.
- La variazione viene bloccata soltanto quando cambia dati o risultati consolidati, non per la sola presenza di fatture emesse nell'intervallo.

**Risultato:** la tariffa e tutti gli elementi non consolidati dipendenti sono coerenti con i nuovi valori.

### CU-TAR-04 – Eliminare una tariffa

**Obiettivo:** rimuovere una tariffa non necessaria ricostruendo la sequenza residua.

**Precondizioni:** la tariffa esiste.

**Flusso principale:**

1. L'operatore richiede l'eliminazione.
2. Il sistema simula la sequenza senza la tariffa.
3. Estende la tariffa precedente oppure determina il nuovo periodo iniziale privo di copertura.
4. Individua tutte le attività e le fatture che cambierebbero calcolo.
5. Mostra gli effetti e gli eventuali blocchi.
6. L'operatore conferma.
7. Il sistema elimina la tariffa e applica atomicamente i ricalcoli consentiti.

**Alternative e vincoli:**

- Può essere eliminata la prima, un'intermedia o l'ultima tariffa.
- L'eliminazione viene impedita se lascia un'attività non consolidata senza tariffa applicabile.
- L'eliminazione viene impedita se cambia dati o risultati di un'attività o componente consolidata.

**Risultato:** la tariffa non esiste più e la sequenza residua è coerente.

### CU-TAR-05 – Individuare tariffa, configurazione e scaglione

**Obiettivo:** determinare il valore tariffario ordinario applicabile a un'attività.

**Precondizioni:** l'attività possiede nave, porto e istante economico validi.

**Flusso principale:**

1. Il sistema determina porto e istante economico in base alla tipologia dell'attività o della componente.
2. Seleziona la tariffa con decorrenza più recente non successiva all'istante.
3. Seleziona la configurazione corrispondente alla tipologia della nave.
4. Acquisisce la dimensione applicabile della nave.
5. Seleziona il primo scaglione ordinario il cui limite massimo include la dimensione.
6. Restituisce tariffa, configurazione, scaglione e valore tariffario.

**Alternative e vincoli:**

- Se non esiste una tariffa applicabile, la registrazione o il ricalcolo dell'attività viene impedito.
- Se la configurazione della tipologia è assente, la tariffa è incompleta e non può essere utilizzata.
- Se la dimensione supera l'ultimo limite ordinario, il calcolo prosegue con `CU-TAR-06`.
- Le componenti `uscita` ed `entrata` di uno spostamento tra porti vengono valutate separatamente.

**Risultato:** il sistema dispone del valore tariffario ordinario oppure dei dati necessari al calcolo extra.

### CU-TAR-06 – Calcolare gli scaglioni extra

**Obiettivo:** determinare il valore tariffario quando la dimensione supera l'ultimo scaglione ordinario.

**Precondizioni:** tariffa e configurazione sono state individuate e la dimensione supera l'ultimo limite ordinario.

**Flusso principale:**

1. Il sistema calcola l'eccedenza rispetto all'ultimo limite ordinario.
2. Divide l'eccedenza per l'ampiezza dello scaglione extra.
3. Arrotonda per eccesso il numero di scaglioni extra.
4. Moltiplica tale numero per la tariffa extra.
5. Somma il risultato al valore dell'ultimo scaglione ordinario.
6. Memorizza numero di scaglioni extra e valore tariffario risultante.

**Alternative e vincoli:**

- L'ampiezza extra deve essere strettamente maggiore di zero.
- Ogni scaglione anche soltanto iniziato viene conteggiato per intero.
- Non è previsto un limite massimo al numero di scaglioni extra, salvo i limiti tecnici di validazione numerica.

**Risultato:** è disponibile il valore tariffario da moltiplicare per il peso.

### CU-TAR-07 – Consultare la sequenza dei pesi

**Obiettivo:** conoscere i pesi applicabili nel tempo a un tipo di attività.

**Precondizioni:** il tipo di prestazione o di operazione nave esiste.

**Flusso principale:**

1. L'operatore seleziona il tipo.
2. Il sistema mostra la versione iniziale e le versioni successive ordinate per decorrenza.
3. Per ciascuna versione mostra valore e intervallo derivato.
4. Rende visibili le prestazioni e le componenti che utilizzano ciascun peso.

**Alternative e vincoli:**

- Per la versione iniziale viene mostrata l'assenza di limite temporale inferiore.
- Per l'ultima versione viene mostrata l'assenza di limite finale.
- Le prestazioni libere non espongono una sequenza di pesi.

**Risultato:** nessun dato viene modificato.

### CU-TAR-08 – Gestire una versione del peso

**Obiettivo:** inserire, modificare o eliminare un peso preservando la coerenza temporale e i dati consolidati.

**Precondizioni:** il tipo di prestazione o di operazione nave esiste.

**Flusso principale:**

1. L'operatore sceglie se modificare la versione iniziale, inserire una nuova versione oppure intervenire su una versione successiva.
2. Inserisce un peso strettamente maggiore di zero e, quando richiesta, la decorrenza.
3. Il sistema ricostruisce gli intervalli risultanti.
4. Individua prestazioni, componenti economiche e fatture interessate.
5. Simula i nuovi importi e mostra differenze ed eventuali blocchi.
6. L'operatore conferma.
7. Il sistema applica atomicamente la variazione e i ricalcoli consentiti.

**Alternative e vincoli:**

- La versione iniziale non possiede decorrenza e non può essere eliminata.
- Le versioni successive possono avere decorrenza passata, intermedia, corrente o futura.
- Una decorrenza duplicata per lo stesso tipo viene impedita.
- L'eliminazione di una versione successiva estende la precedente fino alla versione seguente o senza limite finale.
- La variazione viene impedita se modifica il peso o qualsiasi risultato di un elemento consolidato.

**Risultato:** la sequenza dei pesi resta completa, non sovrapposta e priva di intervalli scoperti.

### CU-TAR-09 – Calcolare l'importo base di un'attività

**Obiettivo:** determinare e memorizzare, alla creazione dell'attività, l'importo sul quale opereranno le regole economiche successive.

**Precondizioni:** è in corso la creazione di una prestazione o componente economica tariffata che possiede tutti i dati necessari e dispone di tariffa e peso applicabili.

**Flusso principale:**

1. Durante la creazione della prestazione o della componente economica, il sistema esegue `CU-TAR-05` ed eventualmente `CU-TAR-06`.
2. Individua il peso valido per il tipo e l'istante economico dell'attività.
3. Moltiplica valore tariffario e peso.
4. Arrotonda il prodotto a due cifre decimali secondo le regole comuni.
5. Memorizza riferimenti e valori intermedi utilizzati.
6. Rende l'importo base disponibile ai successivi calcoli dei punti 8 e 9.

**Alternative e vincoli:**

- Per uno spostamento interno viene utilizzato il peso di `spostamento` alla partenza.
- Per uno spostamento tra porti, la componente `uscita` usa tariffa e peso di uscita alla partenza e la componente `entrata` usa tariffa e peso di entrata all'arrivo.
- Le due componenti vengono calcolate e consolidate separatamente, anche quando saranno associate a fatture differenti.
- Una prestazione libera mantiene l'importo manuale e non esegue questo caso d'uso.

**Risultato:** l'attività o la componente economica possiede un importo base riproducibile e tracciabile.

### CU-TAR-10 – Ricalcolare gli elementi dipendenti

**Obiettivo:** riallineare attività e fatture modificabili dopo una variazione tariffaria o del peso.

**Precondizioni:** una variazione ha superato la simulazione preventiva.

**Flusso principale:**

1. Il sistema individua esattamente gli intervalli, i tipi di nave e i tipi di attività interessati.
2. Ridetermina tariffa, configurazione, scaglione, valore tariffario, peso e importo base per ogni elemento non consolidato.
3. Ricalcola i passaggi economici dipendenti secondo il punto 8.
4. Aggiorna ciascuna fattura `in immissione` interessata secondo il punto 9.
5. Verifica nuovamente che nessun dato o risultato consolidato cambi.
6. Applica variazione e aggiornamenti in un'unica operazione atomica.

**Alternative e vincoli:**

- Se una componente di uno spostamento tra porti è consolidata e l'altra non lo è, viene ricalcolata soltanto quella non consolidata, purché i dati comuni e i risultati consolidati rimangano invariati.
- Se le componenti non consolidate appartengono a fatture differenti, ogni fattura viene aggiornata autonomamente.
- Se un solo controllo finale fallisce, nessuna modifica viene conservata.

**Risultato:** tutti gli elementi modificabili risultano allineati oppure l'intera variazione viene annullata.

### Interazioni con gli altri ambiti

- Il punto 1 fornisce porto, tipologia e dimensione storica della nave e disciplina la selezionabilità delle anagrafiche.
- I punti 2 e 3 determinano porto e istanti economici delle operazioni e delle relative componenti.
- Il punto 4 definisce i tipi di prestazione a catalogo ai quali appartengono le sequenze dei pesi.
- Il punto 6 determina cliente e agenzia, senza modificare la scelta tariffaria salvo gli effetti di eventuali regole economiche dipendenti trattate nel punto 8.
- Il punto 8 utilizza l'importo base tariffario e applica regole economiche, arrotondamenti successivi e aspetti fiscali.
- Il punto 9 applica gli sconti, aggiorna le fatture `in immissione` e consolida separatamente le componenti economiche incluse nelle fatture emesse.
- Il punto 12 definisce l'interpretazione delle decorrenze e degli istanti nei fusi operativi dei porti.
- Il punto 13 espone tariffe, scaglioni, pesi e passaggi di calcolo nei resoconti.

### Decisioni funzionali confermate

Sono confermati i seguenti comportamenti:

- in creazione, il porto viene scelto prima della compilazione e rimane immutabile; la tariffa salvata contiene sempre tutte le tipologie di nave;
- una tariffa nuova può essere compilata da zero oppure inizializzata copiando qualsiasi tariffa esistente, senza creare dipendenze dalla sorgente;
- la prima tariffa di un porto non viene estesa all'indietro e prima della sua decorrenza non è possibile registrare un'attività tariffata;
- le tariffe non hanno uno stato attivo o disattivo;
- la versione iniziale del peso, predefinita a `1` e senza decorrenza, può essere modificata ma non eliminata;
- l'importo `valore tariffario × peso` non viene precalcolato o memorizzato sulla configurazione, ma viene calcolato, arrotondato a due decimali e salvato sulla prestazione o componente economica al momento della sua creazione;
- le componenti `uscita` ed `entrata` di uno spostamento tra porti individuano e consolidano autonomamente tariffa, scaglione, peso e importo base;
- una variazione tariffaria o del peso è bloccata soltanto quando modifica dati o risultati consolidati; in caso contrario ricalcola atomicamente attività e fatture `in immissione` interessate.

### Esito del punto

I casi d'uso coprono sequenze tariffarie per porto, configurazioni complete, scaglioni ordinari ed extra, versioni temporali dei pesi, calcolo dell'importo base, simulazione degli impatti e ricalcolo degli elementi non consolidati.

Le regole funzionali dell'ambito e le relative decisioni sono state confermate. Il punto è pertanto **completato**.

## 2.15 Punto 8 – Regole economiche e fiscali

### Tema e perimetro

Il punto descrive le regole configurabili che modificano gli importi base determinati dal punto 7 e le regole fiscali previste nella prima versione dell'applicazione.

Le regole possono operare sulla singola prestazione oppure sull'intera fattura, prima o dopo gli sconti, mediante maggiorazioni o riduzioni percentuali o assolute. Condizioni, conseguenze, stato e ordine di applicazione possono variare nel tempo senza modificare i calcoli già consolidati.

Il punto comprende configurazione e versioni delle regole, valutazione delle condizioni, priorità, condizioni orarie, festività, trattamento delle prestazioni mancate, notifiche degli azzeramenti, IVA inclusa, marca da bollo, ricalcoli e consolidamento. Condizioni orarie e bollo sono integrati nel sistema delle regole dinamiche. La configurazione degli sconti manuali e la composizione definitiva della fattura sono trattate nel punto 9.

### Requisiti funzionali comuni

#### Identità, ambito e versioni della regola

- Ogni regola possiede un'identità tecnica stabile e un ambito immutabile:
  - `singola prestazione`;
  - `intera fattura`.
- Per cambiare ambito deve essere creata una nuova regola; quella esistente rimane disponibile per i calcoli storici.
- Ogni regola possiede una versione iniziale priva di decorrenza ed eventuali versioni successive.
- La versione iniziale è valida senza limite temporale inferiore e non può essere eliminata separatamente dalla regola.
- Ogni versione contiene l'intera configurazione applicabile nel proprio intervallo:
  - condizioni;
  - stato `attiva` o `disattivata`;
  - maggiorazione oppure riduzione;
  - valore percentuale oppure importo assoluto;
  - valore da applicare;
  - fase `prima degli sconti` oppure `dopo gli sconti`;
  - priorità.
- Una versione disattivata mantiene la continuità temporale della regola ma non produce effetti economici.
- Una regola destinata a entrare in vigore soltanto in futuro può avere una versione iniziale disattivata e una successiva versione attiva.

#### Decorrenze e date di riferimento

- Le versioni successive delle regole sulla singola prestazione utilizzano una decorrenza composta da data e ora con precisione al minuto.
- Le versioni successive delle regole sull'intera fattura utilizzano una decorrenza giornaliera.
- Gli intervalli hanno inizio incluso e fine esclusa; la fine è derivata dalla versione seguente e non viene memorizzata direttamente.
- Due versioni della stessa regola non possono condividere la medesima decorrenza.
- Possono essere inserite versioni passate, intermedie, correnti o future.
- Per le regole sulla singola prestazione, la versione viene individuata mediante l'istante economico dell'attività:
  - data e ora della prestazione a catalogo o libera;
  - istante di entrata o uscita per le relative operazioni;
  - partenza per lo spostamento interno;
  - partenza per la componente `uscita` e arrivo per la componente `entrata` dello spostamento tra porti.
- Per le regole sull'intera fattura viene utilizzata la data indicata nella fattura, non l'istante effettivo di emissione.
- Una fattura retrodatata o futura applica le versioni valide alla propria data.
- La modifica della data di una fattura `in immissione` ridetermina tutte le versioni delle regole riferite all'intera fattura.

#### Condizioni di applicazione

- Le condizioni possono dipendere dai dati coerenti con l'ambito della regola, compresi:
  - stato `effettuata` o `mancata`;
  - data e ora economica;
  - appartenenza dell'ora locale a uno o più intervalli configurati nella regola;
  - ricorrenza di una festività;
  - tipo di prestazione o operazione nave;
  - porto;
  - tipologia o dimensione della nave;
  - tariffa applicata;
  - caratteristiche complessive della fattura.
- Tutte le condizioni differenti configurate nella stessa versione devono essere soddisfatte contemporaneamente.
- Quando una singola condizione ammette più valori, è sufficiente che ne coincida almeno uno.
- Una versione priva di condizioni è applicabile a tutti gli elementi del proprio ambito e intervallo temporale, se attiva.
- Le condizioni relative a prestazione, nave, porto, tariffa, intervalli orari e festività vengono valutate utilizzando i dati validi allo stesso istante economico impiegato per selezionare la versione.
- Una regola sulla singola prestazione non può dipendere da caratteristiche che esistono soltanto dopo la futura composizione della fattura.
- Le condizioni riferite alle caratteristiche complessive della fattura vengono valutate dopo averne determinato composizione e risultati dei passaggi precedenti.

#### Conseguenze e priorità

- La priorità è un numero intero strettamente positivo; possono esistere intervalli non utilizzati tra priorità successive.
- Le regole vengono elaborate in ordine crescente di priorità, separatamente per:
  - ambito;
  - fase `prima degli sconti` o `dopo gli sconti`.
- Il valore configurato per una maggiorazione o una riduzione deve essere non negativo.
- Più regole possono condividere la stessa priorità soltanto quando utilizzano lo stesso tipo di valore, percentuale oppure assoluto.
- Regole percentuali e assolute non possono condividere la stessa combinazione di ambito, fase e priorità nello stesso intervallo temporale.
- Le regole percentuali della stessa priorità vengono combinate sommando algebricamente le percentuali e applicando una sola volta il risultato all'importo corrente.
- Le regole assolute della stessa priorità vengono combinate sommando algebricamente gli importi e applicando una sola volta il risultato.
- Le maggiorazioni hanno segno positivo e le riduzioni segno negativo.
- Il risultato di ogni gruppo di priorità viene arrotondato a due cifre decimali e diventa la base del gruppo successivo.
- Una riduzione non può produrre un importo negativo: quando supera l'importo corrente viene limitata a tale importo e il risultato è zero.
- Non è previsto un ordinamento manuale tra regole appartenenti alla stessa priorità, poiché vengono aggregate in un unico passaggio.

#### Ordine complessivo del calcolo

- Per ciascuna prestazione o componente economica il sistema applica nell'ordine:
  1. importo base `valore tariffario × peso`, già arrotondato secondo il punto 7, oppure importo manuale della prestazione libera;
  2. gruppi di regole sulla prestazione configurati `prima degli sconti`;
  3. sconto assoluto e sconto percentuale della riga, secondo il punto 9;
  4. gruppi di regole sulla prestazione configurati `dopo gli sconti`.
- Per una prestazione non ancora inserita in fattura, gli sconti di riga sono considerati assenti; le regole `dopo gli sconti` vengono quindi applicate all'importo prodotto dalla fase precedente.
- Quando la prestazione viene inserita in fattura oppure cambiano i suoi sconti, l'intera sequenza della riga viene ricalcolata.
- Dopo la somma degli importi definitivi e già arrotondati delle righe, il sistema applica alla fattura:
  1. gruppi di regole sull'intera fattura configurati `prima degli sconti`;
  2. sconto assoluto e sconto percentuale complessivi, secondo il punto 9;
  3. gruppi di regole sull'intera fattura configurati `dopo gli sconti`, comprendendo alla relativa priorità l'eventuale regola dinamica del bollo.
- Le regole successive agli sconti non modificano la base sulla quale gli sconti sono stati calcolati.
- Ogni passaggio monetario utilizza valori decimali esatti, viene arrotondato a due cifre decimali con arrotondamento commerciale e fornisce la base già arrotondata al passaggio seguente.

#### Condizioni orarie e festività

- Non esiste una configurazione autonoma delle fasce notturne.
- Una condizione oraria viene definita direttamente nella versione della regola mediante uno o più intervalli.
- Ogni intervallo utilizza un orario iniziale incluso e un orario finale escluso.
- Un intervallo può attraversare la mezzanotte; orario iniziale e finale non possono coincidere.
- Più intervalli della stessa condizione costituiscono valori alternativi combinati con `OR`; la coincidenza con più intervalli non moltiplica l'applicazione della regola.
- La condizione utilizza l'ora locale dell'istante economico nel fuso del porto applicabile.
- Ad esempio, una maggiorazione notturna viene configurata con la condizione `orario compreso tra X e Y` e la conseguenza `maggiorazione percentuale Z`.
- Intervalli orari e conseguenza cambiano nel tempo mediante le versioni della stessa regola e condividono quindi il medesimo intervallo di validità.
- Le festività sono definite mediante date civili accompagnate da una descrizione.
- Per la stessa data può esistere una sola festività.
- Possono essere inserite, modificate o eliminate festività passate, correnti o future.
- Intervalli orari e festività costituiscono condizioni: non producono autonomamente maggiorazioni o riduzioni senza una regola economica attiva che li utilizzi.

#### Prestazioni mancate

- Lo stato `mancata` può essere utilizzato come condizione di una regola economica.
- Una regola può riguardare soltanto prestazioni mancate, soltanto prestazioni effettuate oppure entrambi gli stati.
- Il trattamento può consistere in maggiorazioni o riduzioni percentuali o assolute, compresa una riduzione che azzera l'importo.
- In assenza di una regola specifica applicabile allo stato `mancata`, l'attività mantiene il normale importo base e applica le altre regole compatibili come se non esistesse un trattamento speciale.
- Il passaggio tra `effettuata` e `mancata` ridetermina condizioni, regole e importi finché l'attività non è consolidata.

#### Notifica degli azzeramenti

- Quando una regola o un gruppo di regole riduce a zero l'importo corrente di una prestazione o fattura, il sistema mostra una notifica prima di completare l'operazione che applica il calcolo.
- La notifica indica almeno elemento interessato, importo precedente, ambito, fase, priorità, identità e versione delle regole responsabili.
- L'azzeramento è un risultato valido e non costituisce un errore.
- Non è consentito rimuovere, ignorare o disattivare la regola soltanto per il singolo elemento.
- Se il processo è annullabile, l'operatore può interromperlo integralmente; in caso contrario il risultato viene applicato senza possibilità di deroga puntuale.
- Nelle variazioni di configurazione, l'anteprima evidenzia tutti gli elementi non consolidati che verrebbero azzerati prima della conferma complessiva.
- Il dettaglio di calcolo conserva importo precedente, gruppo applicato, regole e versioni, riduzione e risultato pari a zero.

#### IVA e marca da bollo

- Nella prima versione tutti gli importi delle prestazioni sono già comprensivi dell'eventuale IVA applicabile.
- Il sistema non calcola né aggiunge una componente IVA separata alla fattura.
- La marca da bollo utilizza lo stesso sistema delle altre regole dinamiche e non viene applicata mediante un passaggio di calcolo separato.
- La regola identificata come bollo possiede:
  - ambito `intera fattura`;
  - fase `dopo gli sconti`;
  - conseguenza costituita da una maggiorazione assoluta;
  - versione selezionata mediante la data della fattura.
- Le versioni del bollo possono modificare stato, soglia, importo, condizioni di applicazione o esclusione e priorità.
- Se la versione è disattivata o le condizioni non sono soddisfatte, il bollo non viene applicato.
- La regola del bollo viene elaborata una sola volta dal motore dinamico e non entra nella base scontabile.
- In ogni intervallo temporale può essere attiva una sola regola identificata come bollo.
- Per garantirne l'applicazione finale, la priorità del bollo deve essere esclusiva e successiva a ogni altro gruppo attivo di regole sull'intera fattura nella fase `dopo gli sconti`.
- Il bollo aumenta l'importo dovuto all'azienda.

#### Modifica, eliminazione, ricalcolo e consolidamento

- La versione iniziale può essere modificata ma non può ricevere una decorrenza.
- Le versioni successive possono essere modificate nei valori e nella decorrenza oppure eliminate.
- L'eliminazione di una versione successiva estende automaticamente la validità della precedente.
- L'intera regola può essere eliminata fisicamente soltanto se non è mai stata applicata a un calcolo persistito e non è referenziata da altre configurazioni.
- Una regola già utilizzata viene conservata e può essere resa non applicabile mediante una nuova versione disattivata.
- Creazione, modifica o eliminazione di regole, versioni o festività richiedono sempre una simulazione preventiva; gli intervalli orari sono compresi nelle condizioni versionate della regola.
- La simulazione considera anche attività e fatture future già registrate e valida congiuntamente tutte le regole negli intervalli interessati.
- Prima della conferma mostra intervalli, configurazioni coinvolte, elementi da ricalcolare, azzeramenti risultanti ed elementi consolidati bloccanti.
- Prestazioni non fatturate, componenti economiche non consolidate e fatture `in immissione` vengono ricalcolate e aggiornate.
- Per uno spostamento tra porti, le componenti `uscita` ed `entrata` selezionano, applicano e consolidano autonomamente versioni e risultati; se appartengono a fatture `in immissione` differenti, vengono aggiornate entrambe.
- Una variazione viene impedita quando cambia, direttamente o indirettamente, qualsiasi dato o risultato di una fattura emessa, compresi regole applicate o escluse, condizioni orarie, festività, priorità, conseguenze, valori, arrotondamenti, sconti, bollo, righe o totale.
- Il mantenimento dello stesso totale finale non rende valida una modifica che cambia dati o risultati intermedi consolidati.
- La sola presenza di elementi consolidati nell'intervallo non impedisce la variazione quando tutti i relativi dati e risultati rimangono identici.
- Validazione, variazione delle configurazioni, ricalcoli e aggiornamento delle fatture `in immissione` costituiscono un'unica operazione atomica.

### CU-ECO-01 – Consultare regole e versioni

**Obiettivo:** conoscere la configurazione corrente e storica delle regole economiche e fiscali.

**Precondizioni:** nessuna.

**Flusso principale:**

1. L'operatore consulta l'elenco delle regole.
2. Il sistema mostra per ciascuna identità almeno ambito e stato della versione corrente.
3. L'operatore apre una regola.
4. Il sistema mostra le versioni ordinate, i relativi intervalli, le condizioni e le conseguenze complete.
5. Mostra separatamente fase, priorità, tipo di valore e stato di ogni versione.
6. Rende consultabili gli elementi e i calcoli persistiti che utilizzano ciascuna versione.

**Alternative e vincoli:**

- Le versioni disattivate rimangono visibili nella cronologia.
- Per la versione iniziale viene mostrata l'assenza di limite inferiore.
- Per l'ultima versione viene mostrata l'assenza di limite finale.

**Risultato:** nessun dato viene modificato.

### CU-ECO-02 – Creare una regola

**Obiettivo:** introdurre una nuova identità di regola con la relativa configurazione iniziale.

**Precondizioni:** nessuna.

**Flusso principale:**

1. L'operatore sceglie l'ambito immutabile della regola.
2. Configura la versione iniziale senza decorrenza.
3. Inserisce stato, condizioni, conseguenza, fase e priorità.
4. Il sistema valida valori, compatibilità delle condizioni con l'ambito e coerenza temporale delle priorità.
5. Simula l'applicazione agli elementi già registrati, compresi quelli futuri.
6. Mostra ricalcoli, azzeramenti ed eventuali blocchi.
7. L'operatore conferma.
8. Il sistema crea regola e versione iniziale e applica atomicamente i ricalcoli consentiti.

**Alternative e vincoli:**

- La versione iniziale può essere attiva o disattivata.
- Una regola in vigore soltanto dal futuro viene creata inizialmente disattivata e completata con `CU-ECO-03`.
- Se la configurazione viola le priorità o modifica risultati consolidati, nessun elemento viene salvato.

**Risultato:** esiste una nuova regola con identità e ambito stabili.

### CU-ECO-03 – Inserire una versione temporale

**Obiettivo:** modificare nel tempo condizioni, conseguenza o stato di una regola.

**Precondizioni:** la regola esiste.

**Flusso principale:**

1. L'operatore inserisce la decorrenza con la precisione prevista dall'ambito.
2. Il sistema propone la configurazione della versione precedente come base modificabile.
3. L'operatore modifica condizioni, stato, direzione, tipo o valore della conseguenza, fase oppure priorità.
4. Il sistema ricostruisce gli intervalli e valida tutte le regole contemporaneamente applicabili.
5. Simula condizioni, gruppi di priorità, importi e fatture risultanti.
6. Mostra differenze, azzeramenti ed eventuali blocchi.
7. L'operatore conferma.
8. Il sistema inserisce la versione e applica atomicamente i ricalcoli consentiti.

**Alternative e vincoli:**

- Possono essere inserite versioni passate, intermedie, correnti o future.
- Una decorrenza duplicata per la stessa regola viene impedita.
- L'ambito non è modificabile nelle versioni.

**Risultato:** la sequenza della regola rimane continua e possiede una sola versione applicabile per riferimento temporale.

### CU-ECO-04 – Modificare o eliminare regole e versioni

**Obiettivo:** correggere una configurazione esistente oppure rimuovere elementi mai utilizzati o non più necessari.

**Precondizioni:** la regola o la versione esiste.

**Flusso principale:**

1. L'operatore modifica una versione oppure richiede l'eliminazione.
2. Il sistema ricostruisce gli intervalli e tutte le combinazioni di priorità interessate.
3. Simula l'applicazione delle regole e i ricalcoli conseguenti.
4. Mostra effetti, azzeramenti e vincoli bloccanti.
5. L'operatore conferma.
6. Il sistema applica atomicamente configurazione, intervalli e ricalcoli.

**Alternative e vincoli:**

- La versione iniziale può essere modificata ma non eliminata separatamente e non può ricevere una decorrenza.
- L'eliminazione di una versione successiva estende la precedente.
- L'intera regola può essere eliminata soltanto se non è mai stata applicata né referenziata.
- Una regola utilizzata deve essere disattivata temporalmente anziché eliminata.
- Ogni variazione che cambia dati o risultati consolidati viene impedita.

**Risultato:** la configurazione è aggiornata coerentemente oppure nessuna modifica viene applicata.

### CU-ECO-05 – Configurare una regola con condizioni orarie

**Obiettivo:** applicare una conseguenza economica quando l'ora locale della prestazione ricade negli intervalli configurati nella regola.

**Precondizioni:** la regola ha ambito `singola prestazione`.

**Flusso principale:**

1. L'operatore crea o modifica una versione della regola.
2. Aggiunge una condizione di tipo `orario compreso nell'intervallo`.
3. Definisce uno o più intervalli mediante orario iniziale e finale.
4. Configura la conseguenza, ad esempio una maggiorazione percentuale `Z`.
5. Il sistema valida i confini e gli eventuali attraversamenti della mezzanotte.
6. Simula le attività per le quali la condizione risulterebbe soddisfatta e i relativi importi.
7. Mostra ricalcoli, azzeramenti ed eventuali blocchi dovuti a dati consolidati.
8. L'operatore conferma.
9. Il sistema salva la versione della regola e i ricalcoli consentiti in modo atomico.

**Alternative e vincoli:**

- L'orario iniziale è incluso e quello finale è escluso.
- Un intervallo può attraversare la mezzanotte ma non può avere orari iniziale e finale coincidenti.
- Più intervalli della stessa condizione sono alternativi e non moltiplicano l'applicazione della regola.
- La condizione viene valutata nell'ora locale del fuso del porto applicabile.
- Non viene creata o consultata una configurazione globale delle fasce notturne.

**Risultato:** intervalli orari e conseguenza economica appartengono alla medesima versione temporale della regola dinamica.

### CU-ECO-06 – Gestire il calendario delle festività

**Obiettivo:** definire le date utilizzabili dalle condizioni di tipo festivo.

**Precondizioni:** nessuna.

**Flusso principale:**

1. L'operatore consulta il calendario.
2. Inserisce, modifica o elimina una festività indicando data e descrizione.
3. Il sistema impedisce duplicati sulla stessa data.
4. Individua le attività registrate nella data interessata.
5. Simula le regole che diventerebbero applicabili o non applicabili.
6. Mostra ricalcoli e blocchi.
7. L'operatore conferma.
8. Il sistema aggiorna calendario e risultati in modo atomico.

**Alternative e vincoli:**

- Sono ammesse date passate, correnti e future.
- La modifica della data equivale, ai fini dell'impatto, alla rimozione della festività originaria e all'inserimento di quella nuova.
- Le festività non applicano autonomamente effetti economici.

**Risultato:** il calendario non contiene date duplicate e i dati modificabili sono allineati.

### CU-ECO-07 – Determinare le regole applicabili

**Obiettivo:** individuare versioni e condizioni applicabili a una prestazione o fattura.

**Precondizioni:** l'elemento possiede il riferimento temporale e i dati richiesti dal proprio ambito.

**Flusso principale:**

1. Il sistema seleziona la versione di ogni regola in base ad ambito e riferimento temporale.
2. Esclude le versioni disattivate.
3. Valuta tutte le condizioni della versione sui dati applicabili.
4. Se tutte risultano soddisfatte, include la regola nel gruppo determinato da ambito, fase e priorità.
5. Registra identità, versione, condizioni valutate ed esito.

**Alternative e vincoli:**

- Una versione attiva priva di condizioni è sempre applicabile nel proprio ambito e intervallo.
- La mancata soddisfazione anche di una sola condizione esclude la regola dal calcolo, conservandone l'esito nel dettaglio quando necessario alla tracciabilità.
- Le componenti di uno spostamento tra porti vengono valutate autonomamente ai rispettivi istanti economici.

**Risultato:** sono disponibili gruppi di regole applicabili coerenti con ambito, fase e priorità.

### CU-ECO-08 – Applicare le regole a una prestazione

**Obiettivo:** calcolare l'importo economico di una prestazione o componente rispettando fasi, priorità e arrotondamenti.

**Precondizioni:** l'importo base è stato determinato e le versioni applicabili sono state individuate.

**Flusso principale:**

1. Il sistema parte dall'importo base arrotondato.
2. Applica in ordine crescente i gruppi `prima degli sconti`.
3. Arrotonda il risultato dopo ogni priorità.
4. Applica gli eventuali sconti di riga definiti dal punto 9.
5. Applica in ordine crescente i gruppi `dopo gli sconti`.
6. Arrotonda ogni risultato e memorizza l'intera sequenza di calcolo.

**Alternative e vincoli:**

- Se la prestazione non appartiene a una fattura, gli sconti sono assenti.
- Le componenti `uscita` ed `entrata` di uno spostamento tra porti producono calcoli indipendenti.
- Una riduzione eccedente viene limitata a zero e attiva `CU-ECO-11`.

**Risultato:** la prestazione possiede un importo calcolato e un dettaglio riproducibile dei passaggi applicati.

### CU-ECO-09 – Applicare le regole alla fattura e il trattamento fiscale

**Obiettivo:** calcolare gli effetti economici e fiscali riferiti all'intero documento.

**Precondizioni:** la fattura è `in immissione`, possiede una data e contiene almeno un'attività economica.

**Flusso principale:**

1. Il sistema somma gli importi definitivi e già arrotondati delle righe.
2. Determina mediante la data della fattura le versioni delle regole di ambito `intera fattura`.
3. Applica i gruppi `prima degli sconti`.
4. Applica gli eventuali sconti complessivi definiti dal punto 9.
5. Determina i gruppi `dopo gli sconti`, valutando nel relativo gruppo anche stato, soglia e altre condizioni della versione della regola dinamica del bollo.
6. Applica i gruppi in ordine di priorità; se il bollo è applicabile, il motore ne applica la maggiorazione assoluta alla priorità finale configurata senza eseguire un calcolo separato.
7. Non aggiunge alcuna componente IVA separata.
8. Memorizza regole, condizioni, arrotondamenti, bollo e totale risultante.

**Alternative e vincoli:**

- Se il bollo è disattivato o le condizioni non sono soddisfatte, il relativo importo è zero.
- Il bollo non viene scontato e la priorità della relativa regola dinamica deve risultare esclusiva e successiva a ogni altro gruppo di regole di fattura.
- Il sistema impedisce configurazioni temporali nelle quali risultino attive più regole identificate come bollo.
- Una riduzione che azzera il totale attiva `CU-ECO-11`.

**Risultato:** la fattura possiede un totale economico e fiscale riproducibile.

### CU-ECO-10 – Trattare una prestazione mancata

**Obiettivo:** determinare l'importo di un'attività nello stato `mancata` mediante regole configurabili.

**Precondizioni:** la prestazione o operazione nave si trova nello stato `mancata`.

**Flusso principale:**

1. Il sistema determina l'importo base secondo il punto 7.
2. Seleziona le versioni delle regole valide all'istante economico.
3. Valuta le condizioni riferite allo stato `mancata` e le altre condizioni configurate.
4. Applica i gruppi risultanti secondo `CU-ECO-08`.
5. Memorizza regole e importo risultante.

**Alternative e vincoli:**

- In assenza di un trattamento specifico per lo stato `mancata`, rimane applicabile l'importo base con le eventuali altre regole compatibili.
- Una riduzione del `100%` o equivalente può azzerare l'importo e produce la notifica prevista.
- Il cambio di stato viene impedito se modificherebbe un elemento consolidato.

**Risultato:** l'attività mancata possiede un importo determinato senza utilizzare percentuali fisse nel codice applicativo.

### CU-ECO-11 – Notificare una riduzione che azzera l'importo

**Obiettivo:** informare l'operatore prima che venga completato un calcolo con risultato pari a zero.

**Precondizioni:** una regola o un gruppo di regole ha ridotto a zero l'importo corrente.

**Flusso principale:**

1. Il sistema sospende il completamento dell'operazione annullabile in corso.
2. Mostra elemento, importo precedente, fase, priorità, regole e versioni responsabili.
3. L'operatore sceglie se interrompere l'intera operazione oppure proseguire.
4. Se prosegue, il sistema applica integralmente il risultato pari a zero.
5. Memorizza nel dettaglio di calcolo tutti i dati dell'azzeramento.

**Alternative e vincoli:**

- Non viene offerta la possibilità di escludere soltanto la regola responsabile.
- Durante una variazione di configurazione, la notifica fa parte dell'anteprima complessiva e la conferma riguarda l'intera variazione.
- Nei processi non annullabili, la notifica viene comunque mostrata prima del completamento e il calcolo prosegue senza possibilità di deroga.

**Risultato:** l'azzeramento è applicato o l'operazione complessiva è annullata senza eccezioni puntuali alle regole.

### CU-ECO-12 – Simulare e applicare i ricalcoli

**Obiettivo:** aggiornare gli elementi non consolidati dopo una variazione della configurazione economica.

**Precondizioni:** è stata richiesta una creazione, modifica o eliminazione riguardante regole, versioni o festività.

**Flusso principale:**

1. Il sistema determina tutti gli intervalli e gli elementi direttamente o indirettamente interessati.
2. Valida congiuntamente versioni, condizioni e gruppi di priorità.
3. Confronta ogni dato e risultato delle fatture consolidate con quelli che risulterebbero dalla variazione.
4. Ricalcola in simulazione prestazioni, componenti e fatture `in immissione`.
5. Mostra differenze, azzeramenti, aggiornamenti e blocchi.
6. L'operatore conferma la variazione.
7. Il sistema applica atomicamente configurazione e ricalcoli.

**Alternative e vincoli:**

- Lo stesso totale finale non rende valida una modifica che cambia passaggi intermedi consolidati.
- Se una sola fattura emessa cambierebbe direttamente o indirettamente, l'intera variazione viene impedita.
- Se nessun dato consolidato cambia, la presenza di fatture emesse nell'intervallo non costituisce un blocco.
- Se una fase fallisce, nessuna modifica viene conservata.

**Risultato:** tutti gli elementi modificabili sono coerenti oppure la configurazione rimane integralmente invariata.

### Interazioni con gli altri ambiti

- Il punto 1 fornisce versioni anagrafiche di nave e porto utilizzabili nelle condizioni.
- I punti 2 e 3 determinano contesto e istanti economici delle operazioni e delle relative componenti.
- Il punto 4 fornisce tipo, stato e importo manuale delle prestazioni libere.
- Il punto 6 determina cliente e agenzia delle attività e delle fatture; il loro eventuale utilizzo come condizioni richiederebbe una specifica estensione della configurazione.
- Il punto 7 fornisce tariffa, peso e importo base.
- Il punto 9 definisce sconti, composizione, data, emissione e consolidamento della fattura.
- Il punto 12 interpreta istanti, decorrenze, condizioni orarie e date civili nei rispettivi fusi.
- Il punto 13 espone regole, versioni, condizioni, passaggi e arrotondamenti nei resoconti.

### Decisioni funzionali confermate

La proposta introduce o rende espliciti i seguenti comportamenti:

- condizioni differenti della stessa versione vengono combinate con operatore logico `AND`, mentre più valori della stessa condizione vengono combinati con `OR`; l'assenza di condizioni rende la versione sempre applicabile nel proprio ambito;
- le condizioni utilizzabili vengono limitate ai dati disponibili nell'ambito della regola, evitando che una regola sulla prestazione dipenda dalla futura composizione di una fattura;
- fase, priorità, tipo di valore, direzione, valore, condizioni e stato possono cambiare tra versioni, mentre l'ambito resta immutabile;
- i valori configurati sono non negativi e le riduzioni vengono limitate a zero, senza produrre importi negativi;
- per una prestazione non ancora fatturata gli sconti sono considerati assenti e le regole `dopo gli sconti` vengono applicate al risultato della fase precedente;
- non esiste una configurazione autonoma delle fasce notturne: ogni intervallo orario è una condizione della regola dinamica, utilizza inizio incluso e fine esclusa, può attraversare la mezzanotte e non ammette estremi coincidenti;
- una maggiorazione notturna viene espressa, ad esempio, dalla condizione `orario compreso tra X e Y` e dalla conseguenza `maggiorazione percentuale Z`, entrambe appartenenti alla stessa versione della regola;
- in assenza di una regola specifica per lo stato `mancata`, l'attività utilizza il normale importo base e le altre regole compatibili;
- la notifica di un azzeramento non permette di escludere la regola per il singolo elemento, ma consente soltanto di interrompere l'intera operazione quando questa è annullabile;
- gli importi sono già comprensivi dell'eventuale IVA e la fattura non aggiunge una componente IVA separata;
- il bollo è una regola dinamica di ambito `intera fattura` e non un passaggio separato; in ogni intervallo può esserne attiva una sola e la relativa priorità esclusiva deve mantenerla successiva a ogni altra regola di fattura `dopo gli sconti`;
- qualsiasi variazione viene bloccata se cambia anche un solo dato o risultato intermedio consolidato, pure quando il totale finale rimane invariato.

### Esito del punto

I casi d'uso coprono identità e versioni delle regole, condizioni, conseguenze, priorità, calcolo per prestazione e fattura, condizioni orarie, festività, prestazioni mancate, notifiche degli azzeramenti, IVA, bollo e ricalcoli controllati.

Le regole funzionali dell'ambito e le relative decisioni sono state confermate. Il punto è pertanto **completato**.


## 2.16 Punto 9 – Fatture

### Tema e perimetro

Il punto descrive la gestione della fattura dalla preparazione nello stato `in immissione` fino all'emissione, al consolidamento, all'eventuale ritiro e all'eliminazione consentita.

La fattura raccoglie attività economiche riferite a una sola coppia `cliente + agenzia`. Può comprendere prestazioni, operazioni nave con una sola componente economica e singole componenti `uscita` o `entrata` degli spostamenti tra porti. Può inoltre riportare movimentazioni merci come informazioni prive di importo.

Il punto comprende composizione, sconti manuali, ricalcoli, data e identificativo, avvisi precedenti all'emissione, consolidamento, consultazione dei dati emessi, note, ritiro, stati determinati dagli incassi ed eliminazione. La registrazione dei movimenti contabili è trattata nel punto 10 e la ripartizione degli incassi nel punto 11.

### Requisiti funzionali comuni

#### Identità, stato e contenuto

- Ogni fattura possiede un'identità tecnica stabile distinta dal proprio identificativo operativo.
- Gli stati previsti sono:
  - `in immissione`;
  - `emessa`;
  - `parzialmente saldata`;
  - `saldata`.
- La creazione assegna sempre lo stato `in immissione`.
- Una fattura può comprendere attività appartenenti a navi, viaggi, visite e ormeggi differenti.
- Tutte le attività economiche della stessa fattura devono condividere il medesimo cliente e la medesima agenzia effettivi.
- Cliente e agenzia vengono selezionati esplicitamente sulla fattura prima della composizione e non sono determinati dalla prima attività associata.
- Entrambi devono essere attivi nel momento della selezione o della sostituzione; una disattivazione successiva non invalida il riferimento già presente nella bozza.
- Finché la fattura è `in immissione`, la coppia può essere sostituita soltanto se tutte le attività economiche e le movimentazioni informative già associate risultano compatibili con i nuovi soggetti.
- Una fattura può contenere:
  - una o più attività economiche;
  - zero o più movimentazioni merci informative.
- Le movimentazioni merci non possono definire la coppia della fattura, ma possono rimanere in una bozza priva di righe economiche; non consentono da sole l'emissione.
- La fattura può contenere note facoltative, prive di effetti economici e modificabili in ogni stato.
- Nella prima versione tutti gli importi sono espressi esclusivamente in euro.

#### Fatturabilità e compatibilità delle attività

- Sono selezionabili come righe economiche:
  - prestazioni a catalogo;
  - prestazioni libere;
  - operazioni di `entrata`, `uscita` e spostamento interno;
  - singole componenti `uscita` ed `entrata` di uno spostamento tra porti.
- L'attività di origine deve trovarsi nello stato `effettuata` oppure `mancata`; lo stato `prevista` non è fatturabile.
- La fatturabilità non dipende dal fatto che la data dell'attività sia passata, corrente o futura.
- Viaggio, visita o ormeggio possono essere ancora aperti.
- Cliente e agenzia effettivi devono essere entrambi presenti e coincidere con quelli della fattura.
- Le attività selezionabili vengono filtrate utilizzando cliente e agenzia già presenti sulla fattura e devono coincidere con entrambi i riferimenti.
- Ogni prestazione, operazione a componente singola o componente economica può appartenere al massimo a una fattura alla volta, compresa una fattura ancora `in immissione`.
- Un elemento già associato alla fattura corrente rimane visibile come parte della composizione ma non viene proposto come nuovamente selezionabile.
- Prima dell'associazione il sistema ricalcola, quando necessario, dati effettivi e risultati non consolidati e verifica che l'attività possieda un calcolo economico valido.

#### Componenti degli spostamenti tra porti

- Le componenti `uscita` ed `entrata` sono righe economiche autonome ai fini della fatturazione.
- Ciascuna componente utilizza cliente, agenzia, porto, istante, tariffa, peso, regole economiche e importo determinati per il proprio estremo dello spostamento.
- Le componenti possono essere:
  - inserite nella stessa fattura;
  - inserite in momenti diversi in fatture differenti;
  - riferite a coppie `cliente + agenzia` differenti, quando i rispettivi dati effettivi differiscono.
- L'associazione, la rimozione, lo sconto e il consolidamento di una componente non modificano automaticamente l'associazione, lo sconto o il consolidamento dell'altra.
- I dati comuni dell'operazione vengono protetti soltanto quando una loro variazione modificherebbe dati o risultati di una componente consolidata.

#### Movimentazioni merci informative

- Una movimentazione può essere aggiunta soltanto a una fattura `in immissione` con coppia `cliente + agenzia` già determinata.
- Cliente e agenzia ereditati dalla movimentazione devono coincidere con quelli della fattura.
- La movimentazione compare in una sezione informativa distinta e non produce una riga economica.
- La sua inclusione non modifica importi, sconti, regole economiche, bollo o totale.
- La stessa movimentazione non può comparire due volte nella medesima fattura.
- La stessa movimentazione può comparire in più fatture compatibili, comprese fatture già emesse.
- La rimozione dell'associazione informativa non elimina la movimentazione e non modifica le eventuali associazioni ad altre fatture.
- Finché non appartiene ad alcuna fattura consolidata, la movimentazione rimane modificabile e le modifiche aggiornano tutte le fatture `in immissione` che la riportano.
- L'emissione della prima fattura che la include consolida i dati strutturali della movimentazione; le altre associazioni rimangono valide.

#### Sconti e sequenza di calcolo

- Per ogni riga economica vengono conservati almeno:
  - importo originario determinato dai punti 7 e 8 prima degli sconti manuali;
  - sconto assoluto;
  - sconto percentuale;
  - regole economiche applicate prima e dopo gli sconti;
  - arrotondamenti intermedi;
  - importo definitivo della riga.
- Sulla stessa riga possono essere presenti contemporaneamente uno sconto assoluto e uno percentuale.
- Lo sconto assoluto viene applicato per primo; quello percentuale viene calcolato sul residuo già arrotondato.
- Dopo gli sconti di riga vengono applicate le regole dinamiche di ambito `singola prestazione` configurate `dopo gli sconti`.
- Gli importi definitivi e già arrotondati delle righe vengono sommati per determinare la base della fattura.
- Sull'intera fattura possono essere presenti contemporaneamente uno sconto assoluto e uno percentuale complessivi.
- Anche sulla fattura lo sconto assoluto precede quello percentuale.
- Prima e dopo gli sconti complessivi vengono applicate le rispettive regole dinamiche di ambito `intera fattura`, compresa l'eventuale regola del bollo alla propria priorità finale.
- Uno sconto assoluto deve essere compreso tra zero e l'importo al quale si applica; uno sconto percentuale deve essere compreso tra `0` e `100`.
- Nessuno sconto può produrre un importo negativo.
- Un totale pari a zero è valido; quando deriva da una riduzione regolata si applica la notifica preventiva del punto 8.
- La modifica di composizione, sconti, data o dati dipendenti ricalcola l'intera sequenza interessata mentre la fattura è `in immissione`.
- Se il ricalcolo rende uno sconto assoluto memorizzato superiore alla nuova base, la variazione che ha originato l'incompatibilità viene impedita e il sistema richiede di correggere lo sconto; non è applicata alcuna riduzione automatica.
- Ogni passaggio monetario utilizza valori decimali esatti, arrotondamento commerciale a due cifre decimali e il risultato già arrotondato come base del passaggio successivo.

#### Data e identificativo

- L'identificativo è composto da:
  - numero progressivo strettamente positivo;
  - suffisso opzionale normalizzato in maiuscolo;
  - anno derivato automaticamente dalla data della fattura.
- I formati sono `1/2026` oppure `1-A/2026`.
- L'unicità riguarda la combinazione `anno + progressivo + suffisso`; l'assenza del suffisso costituisce un valore distinto.
- Il suffisso non crea una serie di numerazione autonoma.
- Data, numero e suffisso possono essere assegnati durante l'immissione e sono obbligatori al momento dell'emissione, salvo il suffisso che rimane facoltativo.
- La data può essere passata, corrente o futura e non deve rispettare l'ordine cronologico dei progressivi.
- Prima della prima emissione, il cambio di anno della data aggiorna l'anno dell'identificativo, libera la combinazione precedente e assegna una proposta valida nel nuovo anno, conservando il suffisso.
- Numero e suffisso possono essere modificati soltanto prima della prima emissione.
- Dopo la prima emissione l'identificativo completo rimane immutabile anche in seguito al ritiro.
- Dopo il ritiro la data può essere modificata soltanto all'interno dello stesso anno dell'identificativo.
- Un identificativo consolidato dalla prima emissione non viene liberato dal ritiro o dalla successiva eliminazione della fattura.
- Il progressivo successivo atteso è pari al massimo progressivo numerico già emesso nello stesso anno, ignorando i suffissi, incrementato di uno; in assenza di fatture emesse è pari a `1`.
- Le combinazioni riservate dalle fatture `in immissione` non avanzano il valore atteso.
- Se il progressivo non è indicato, il sistema propone il primo valore disponibile a partire da quello atteso; l'operatore può selezionare manualmente un progressivo inferiore ancora libero.
- Prima dell'emissione il sistema segnala un progressivo superiore a quello successivo atteso per l'anno e richiede conferma, senza impedire definitivamente l'operazione.
- L'emissione del progressivo superiore aggiorna il massimo dell'anno, quindi il medesimo salto non viene segnalato nuovamente per i progressivi successivi.

#### Emissione e consolidamento

- L'emissione è consentita soltanto da `in immissione`.
- La fattura deve possedere almeno una riga economica, una coppia completa e uniforme, data e identificativo validi.
- Prima dell'emissione il sistema ripete tutte le verifiche di fatturabilità, compatibilità, unicità delle associazioni e coerenza dei calcoli.
- Per ogni attività economica verifica se nello stesso viaggio esistono attività temporalmente precedenti ancora `previste`.
- Le attività precedenti vengono segnalate indicando almeno viaggio, tipo, data e ora e porto; l'operatore può interrompere oppure proseguire mediante conferma esplicita.
- Eventuali notifiche di azzeramento e salti di numerazione vengono mostrate prima della conferma finale.
- L'emissione applica atomicamente gli ultimi ricalcoli e consolida:
  - identificativo, data e istante effettivo di emissione;
  - cliente e agenzia e i dati anagrafici riportati;
  - composizione economica e informativa;
  - dati strutturali delle attività e delle componenti incluse;
  - versioni di tariffe, pesi e regole utilizzate;
  - condizioni, conseguenze, sconti, arrotondamenti e importi intermedi;
  - bollo e totale finale.
- Per uno spostamento tra porti viene consolidata soltanto la componente inclusa e i dati comuni che ne influenzano il risultato.
- Per una movimentazione viene consolidato il contenuto riportato nel documento; se la stessa movimentazione appartiene ad altri documenti, il consolidamento rimane determinato dall'insieme delle fatture emesse che la includono.
- Per ogni fattura emessa almeno una volta vengono conservati l'istante della prima emissione e quello dell'emissione corrente o più recente; una nuova emissione aggiorna quest'ultimo senza creare uno storico completo delle emissioni.
- Dopo l'emissione lo stato è `emessa` finché non vengono associate quote di incasso.
- Ogni errore durante validazione, ricalcolo o consolidamento annulla l'intera emissione.

#### Consultazione, note e ristampa

- Una fattura consolidata mostra sempre i dati strutturali, anagrafici ed economici consolidati con l'emissione corrente.
- Versioni anagrafiche, tariffe, pesi o regole divenuti successivamente applicabili non modificano il documento emesso.
- Le note della fattura, delle attività e delle movimentazioni rimangono modificabili anche dopo l'emissione.
- Le consultazioni e le ristampe che includono le note ne mostrano il valore corrente, senza alterare gli altri dati consolidati.
- Il dettaglio mostra almeno totale, importo saldato, residuo e stato corrente della fattura.
- Le associazioni agli incassi sono consultabili ma non vengono imputate alle singole righe economiche.
- Una fattura ritirata non possiede un documento emesso corrente da visualizzare o ristampare; rimangono consultabili gli istanti della prima emissione e dell'emissione più recente, senza uno storico completo dei documenti emessi.

#### Ritiro, nuova emissione e stati di riscossione

- Il ritiro è un passaggio manuale da `emessa` a `in immissione` e non introduce uno stato aggiuntivo.
- Può essere ritirata soltanto una fattura priva di qualsiasi quota di movimento associata.
- Le fatture `parzialmente saldata` e `saldata` non possono essere ritirate.
- Il ritiro conserva l'identità tecnica e l'identificativo consolidato, ma rimuove il consolidamento corrente prodotto dalla fattura.
- Attività e movimentazioni cessano di essere consolidate da quella fattura, salvo che rimangano protette da un'altra fattura emessa o, per i dati comuni di uno spostamento, dalla relativa altra componente consolidata.
- Dopo il ritiro, composizione, sconti e data entro lo stesso anno tornano modificabili e vengono ricalcolati con le versioni attualmente applicabili.
- Una successiva emissione utilizza lo stesso identificativo e consolida la nuova composizione e i nuovi risultati.
- Il ritiro conserva l'istante della prima emissione e quello dell'emissione più recente; la successiva emissione aggiorna quest'ultimo.
- Gli stati `emessa`, `parzialmente saldata` e `saldata` vengono determinati automaticamente dall'importo complessivamente attribuito dagli incassi:
  - saldo pari a zero: `emessa`;
  - saldo maggiore di zero e inferiore al totale: `parzialmente saldata`;
  - saldo pari al totale: `saldata`.
- Una fattura emessa con totale pari a zero rimane `emessa`, con importo saldato e residuo entrambi pari a zero; non riceve quote di incasso e non diventa `saldata`, poiché tale stato richiede un incasso positivo.
- La riduzione del saldo attribuito a zero riporta automaticamente la fattura a `emessa`; il successivo ritiro rimane manuale.

#### Eliminazione

- Una fattura può essere eliminata fisicamente soltanto nello stato `in immissione`.
- Una fattura già emessa deve essere prima ritirata, quando consentito.
- L'eliminazione rimuove atomicamente tutte le associazioni economiche e informative senza eliminare le attività o le movimentazioni.
- Le attività economiche disassociate tornano disponibili per altre fatture e cessano di essere consolidate da quella eliminata, salvo altri vincoli persistenti.
- L'eliminazione di una fattura mai emessa libera l'eventuale combinazione di numero, suffisso e anno riservata dalla bozza.
- L'eliminazione di una fattura già emessa e poi ritirata non libera l'identificativo consolidato dalla prima emissione.
- Non viene conservato uno storico autonomo della fattura eliminata.

### CU-FAT-01 – Consultare e ricercare le fatture

**Obiettivo:** individuare fatture e consultarne composizione, calcoli, consolidamento e stato di riscossione.

**Precondizioni:** nessuna.

**Flusso principale:**

1. L'operatore apre l'elenco delle fatture.
2. Il sistema mostra almeno identificativo, data, cliente, agenzia, stato, totale, importo saldato e residuo.
3. L'operatore applica filtri o ordinamenti.
4. Il sistema restituisce le fatture corrispondenti.
5. L'operatore apre il dettaglio.
6. Il sistema mostra righe economiche, movimentazioni informative, sconti, regole, bollo, arrotondamenti, totale e associazioni agli incassi.
7. Per una fattura emessa distingue i dati consolidati dalle note correnti.

**Alternative e vincoli:**

- I filtri comprendono almeno identificativo, anno, intervallo di date, stato, cliente, agenzia, nave e porto.
- La ricerca può comprendere fatture `in immissione` prive di identificativo definitivo.
- Le componenti degli spostamenti tra porti vengono mostrate come righe autonome, mantenendo il collegamento all'operazione comune.

**Risultato:** nessun dato viene modificato.

### CU-FAT-02 – Creare una fattura in immissione

**Obiettivo:** creare una nuova bozza di fattura.

**Precondizioni:** nessuna.

**Flusso principale:**

1. L'operatore avvia la creazione.
2. Il sistema crea un'identità tecnica e assegna lo stato `in immissione`.
3. L'operatore seleziona cliente e agenzia della fattura.
4. Il sistema verifica che entrambi siano attivi e salva la coppia selezionata.
5. L'operatore può indicare data, numero, suffisso e note.
6. Se data e numero sono presenti, il sistema costruisce e riserva la combinazione dell'identificativo.
7. Il sistema rende selezionabili soltanto attività economiche e movimentazioni informative aventi la stessa coppia effettiva della fattura.
8. L'operatore può aggiungere uno o più elementi compatibili.
9. Il sistema calcola righe e totale della bozza.

**Alternative e vincoli:**

- La bozza può essere salvata temporaneamente senza identificativo definitivo e senza attività economiche.
- Può contenere movimentazioni informative compatibili anche prima dell'aggiunta della prima riga economica, ma non può essere emessa in tale condizione.
- Un cliente o un'agenzia disattivati non possono essere selezionati per una nuova fattura o come sostituti di quelli correnti.
- In una bozza esistente la coppia può essere sostituita: il sistema verifica l'attività dei nuovi soggetti e la compatibilità di tutti gli elementi associati e applica la sostituzione soltanto se nessun elemento diventa incompatibile.

**Risultato:** esiste una fattura `in immissione` con la composizione iniziale consentita.

### CU-FAT-03 – Aggiungere o rimuovere attività economiche

**Obiettivo:** modificare la composizione economica di una fattura in immissione.

**Precondizioni:** la fattura si trova nello stato `in immissione`.

**Flusso principale:**

1. L'operatore richiede le attività fatturabili.
2. Il sistema propone soltanto elementi `effettuati` o `mancati`, non associati ad altre fatture e compatibili con cliente e agenzia.
3. L'operatore seleziona una o più attività.
4. Il sistema verifica nuovamente stato, associazione univoca, soggetti e validità economica.
5. Aggiunge atomicamente le righe selezionate.
6. Ricalcola sconti, regole di fattura, bollo e totale.
7. Per rimuovere una riga, l'operatore seleziona l'attività già associata.
8. Il sistema rimuove la sola associazione, rende nuovamente disponibile l'attività e ricalcola la fattura.

**Alternative e vincoli:**

- Le attività possono appartenere a navi, viaggi, visite e ormeggi differenti.
- Un'attività futura è selezionabile se già `effettuata` o `mancata`.
- Un'attività `prevista`, priva di calcolo valido o con coppia incompatibile viene esclusa.
- Se durante il salvataggio una delle attività non è più disponibile, nessuna delle associazioni richieste viene applicata.
- La rimozione elimina gli sconti manuali e il dettaglio di riga appartenenti alla fattura, senza modificare l'importo proprio dell'attività; un successivo reinserimento crea una nuova riga inizialmente priva di sconti manuali.
- Se viene rimossa l'ultima riga economica, la fattura conserva cliente, agenzia e le eventuali movimentazioni informative compatibili, ma non può essere emessa finché non viene aggiunta una nuova riga.

**Risultato:** composizione e calcoli della bozza sono coerenti oppure rimangono invariati.

### CU-FAT-04 – Gestire le componenti di uno spostamento tra porti

**Obiettivo:** fatturare autonomamente l'uscita e l'entrata generate dallo stesso spostamento.

**Precondizioni:** esiste uno spostamento tra porti con almeno una componente fatturabile.

**Flusso principale:**

1. Il sistema presenta separatamente le componenti `uscita` ed `entrata`.
2. Per ciascuna mostra porto, istante, soggetti, importo e fattura eventualmente associata.
3. L'operatore seleziona una componente disponibile.
4. Il sistema verifica compatibilità con la fattura corrente.
5. Aggiunge esclusivamente la componente selezionata e ricalcola la fattura.
6. L'altra componente rimane disponibile e può essere fatturata successivamente.

**Alternative e vincoli:**

- Le due componenti possono essere inserite nella stessa fattura se entrambe compatibili.
- Possono appartenere a fatture differenti e a coppie `cliente + agenzia` differenti.
- Una componente già associata non è selezionabile per un'altra fattura.
- La rimozione di una componente non rimuove né modifica l'altra.
- L'emissione consolida soltanto la componente inclusa e i dati comuni dai quali essa dipende.

**Risultato:** ciascuna componente mantiene un'associazione e un consolidamento autonomi.

### CU-FAT-05 – Gestire le movimentazioni merci informative

**Obiettivo:** riportare in fattura informazioni sulle movimentazioni senza modificarne il valore economico.

**Precondizioni:** la fattura è `in immissione`, possiede una coppia completa e la movimentazione esiste.

**Flusso principale:**

1. L'operatore apre la selezione delle movimentazioni.
2. Il sistema propone quelle con attribuzione valida e coppia `cliente + agenzia` compatibile.
3. L'operatore seleziona una o più movimentazioni.
4. Il sistema verifica che non siano già presenti nella stessa fattura.
5. Aggiunge le informazioni in una sezione distinta.
6. Mantiene invariati righe economiche, sconti, bollo e totale.
7. Per rimuovere un'informazione, l'operatore seleziona la movimentazione associata.
8. Il sistema rimuove soltanto l'associazione alla fattura corrente.

**Alternative e vincoli:**

- Una movimentazione può essere riportata in più fatture compatibili, ma una sola volta in ciascuna.
- Quando almeno una fattura che la include viene emessa, i dati strutturali della movimentazione diventano consolidati anche se compare in altre fatture ancora `in immissione`.
- Il ritiro di una fattura rimuove soltanto il consolidamento prodotto da quel documento; la movimentazione resta consolidata se compare in un'altra fattura emessa.
- Una fattura composta esclusivamente da movimentazioni informative non può essere emessa.

**Risultato:** la sezione informativa è aggiornata senza effetti economici.

### CU-FAT-06 – Applicare gli sconti alle righe

**Obiettivo:** definire gli sconti manuali di una singola attività economica.

**Precondizioni:** la fattura è `in immissione` e contiene la riga.

**Flusso principale:**

1. L'operatore apre il dettaglio economico della riga.
2. Inserisce o modifica lo sconto assoluto e quello percentuale.
3. Il sistema valida i limiti rispetto all'importo prodotto dai passaggi precedenti.
4. Applica lo sconto assoluto e arrotonda il residuo.
5. Applica lo sconto percentuale sul residuo e arrotonda.
6. Applica le regole dinamiche della riga configurate `dopo gli sconti`.
7. Ricalcola i passaggi dell'intera fattura e mostra il nuovo totale.
8. L'operatore conferma e il sistema salva atomicamente sconti e risultati.

**Alternative e vincoli:**

- Entrambi gli sconti possono essere assenti o pari a zero.
- Lo sconto assoluto non può superare la base corrente e quello percentuale non può superare `100`.
- Gli sconti di `uscita` ed `entrata` di uno spostamento tra porti sono indipendenti.
- Le movimentazioni merci non ammettono sconti.
- Un risultato pari a zero è valido; le notifiche prodotte dalle regole dinamiche seguono il punto 8.

**Risultato:** la riga e il totale della fattura possiedono un calcolo aggiornato e riproducibile.

### CU-FAT-07 – Applicare gli sconti complessivi e ricalcolare la fattura

**Obiettivo:** modificare gli sconti dell'intero documento e ottenere il totale aggiornato.

**Precondizioni:** la fattura è `in immissione` e contiene almeno una riga economica.

**Flusso principale:**

1. Il sistema somma gli importi definitivi e arrotondati delle righe.
2. Applica le regole di fattura `prima degli sconti`.
3. L'operatore inserisce o modifica sconto assoluto e percentuale complessivi.
4. Il sistema applica nell'ordine i due sconti con i relativi arrotondamenti.
5. Applica le regole di fattura `dopo gli sconti`, compresa l'eventuale regola dinamica del bollo.
6. Mostra base, sconti, gruppi di regole, arrotondamenti e totale.
7. L'operatore conferma.
8. Il sistema salva atomicamente valori e dettaglio di calcolo.

**Alternative e vincoli:**

- Gli sconti complessivi possono coesistere con quelli delle righe.
- I limiti impediscono risultati negativi.
- La modifica della data o della composizione ridetermina versioni, condizioni e risultati prima di riapplicare gli sconti memorizzati.
- Se uno sconto memorizzato non è più valido rispetto alla nuova base, la variazione originaria viene impedita e il sistema richiede la correzione dello sconto.

**Risultato:** il totale della fattura è coerente con composizione, sconti e regole applicabili.

### CU-FAT-08 – Assegnare o modificare data e identificativo

**Obiettivo:** definire i dati identificativi necessari all'emissione.

**Precondizioni:** la fattura è `in immissione`.

**Flusso principale:**

1. L'operatore inserisce o modifica la data civile della fattura.
2. Il sistema determina l'anno dell'identificativo.
3. Se la fattura non è mai stata emessa, propone un progressivo disponibile per l'anno.
4. L'operatore conferma o modifica il progressivo e indica l'eventuale suffisso.
5. Il sistema normalizza il suffisso in maiuscolo.
6. Verifica l'unicità della combinazione e la riserva alla fattura.
7. Ridetermina le versioni delle regole di fattura applicabili alla data e ricalcola il totale.

**Alternative e vincoli:**

- Prima della prima emissione, il cambio di anno libera la combinazione precedente e genera una proposta nel nuovo anno.
- La proposta automatica utilizza il primo progressivo disponibile a partire da quello successivo atteso; un progressivo inferiore ancora libero può essere selezionato manualmente.
- Dopo la prima emissione, progressivo e suffisso sono immutabili e la data deve rimanere nello stesso anno.
- Un identificativo consolidato non può essere assegnato a un'altra fattura anche se quella originaria è stata ritirata o eliminata.
- Il suffisso vuoto e ogni suffisso valorizzato rappresentano combinazioni differenti dello stesso progressivo.

**Risultato:** data e identificativo sono coerenti e il calcolo usa le versioni valide alla data indicata.

### CU-FAT-09 – Verificare la fattura prima dell'emissione

**Obiettivo:** individuare errori bloccanti e avvisi confermabili prima del consolidamento.

**Precondizioni:** la fattura è `in immissione` e l'operatore ne richiede l'emissione.

**Flusso principale:**

1. Il sistema verifica presenza e validità di data e identificativo.
2. Verifica la presenza di almeno una riga economica.
3. Controlla coppia `cliente + agenzia`, fatturabilità e associazione univoca di ogni attività.
4. Verifica la compatibilità delle movimentazioni informative.
5. Ricalcola e valida importi, sconti, regole, arrotondamenti, bollo e totale.
6. Controlla l'assenza di variazioni concorrenti e di dati consolidati incompatibili.
7. Individua eventuali attività temporalmente precedenti ancora `previste` nello stesso viaggio delle attività fatturate.
8. Verifica l'eventuale salto del progressivo e gli azzeramenti da notificare.
9. Mostra in modo distinto errori bloccanti e avvisi confermabili.

**Alternative e vincoli:**

- Se il progressivo non è ancora assegnato, il sistema propone e riserva un valore disponibile prima di completare la verifica; l'operatore può confermarlo o modificarlo.
- Un errore bloccante impedisce di proseguire e non modifica la fattura.
- Attività precedenti `previste`, salto di numerazione e azzeramenti validi non costituiscono blocchi automatici.
- Gli avvisi indicano gli elementi interessati e richiedono una conferma complessiva esplicita.
- Nessun avviso permette di escludere puntualmente una regola dinamica applicabile.

**Risultato:** la fattura è pronta per l'emissione oppure rimane modificabile con l'elenco dei problemi da risolvere.

### CU-FAT-10 – Emettere o riemettere una fattura

**Obiettivo:** consolidare il documento e renderlo non modificabile nei dati strutturali ed economici.

**Precondizioni:** `CU-FAT-09` è concluso senza errori e gli avvisi sono stati confermati.

**Flusso principale:**

1. Il sistema blocca logicamente la fattura e gli elementi interessati per la durata dell'operazione.
2. Ripete i controlli sensibili a variazioni concorrenti.
3. Applica gli ultimi ricalcoli.
4. Acquisisce l'istante tecnico effettivo di emissione.
5. Consolida dati, versioni e risultati previsti dai requisiti comuni.
6. Porta la fattura nello stato `emessa`.
7. Rende non modificabili composizione, identificativo e dati economici.
8. Produce la rappresentazione del documento emesso.

**Alternative e vincoli:**

- Una nuova emissione successiva a un ritiro mantiene l'identificativo originario e consolida i dati correnti della bozza.
- La data di una fattura riemessa deve rimanere nello stesso anno dell'identificativo.
- Se qualsiasi controllo o persistenza fallisce, la fattura rimane `in immissione` e nessun elemento viene consolidato parzialmente.
- Un totale pari a zero non impedisce l'emissione dopo le notifiche previste.

**Risultato:** la fattura è `emessa` e possiede un insieme completo e riproducibile di dati consolidati.

### CU-FAT-11 – Visualizzare o ristampare una fattura emessa

**Obiettivo:** riprodurre il documento senza sostituire i dati consolidati con valori successivi.

**Precondizioni:** la fattura è stata emessa almeno una volta e possiede un consolidamento corrente.

**Flusso principale:**

1. L'operatore apre il documento emesso.
2. Il sistema utilizza composizione, anagrafiche, versioni, importi e arrotondamenti consolidati.
3. Integra le note nel loro valore corrente quando previste nella rappresentazione.
4. Mostra stato di riscossione, importo saldato e residuo correnti separatamente dai dati economici consolidati.
5. L'operatore richiede la stampa o l'esportazione.
6. Il sistema genera una rappresentazione coerente con gli stessi dati.

**Alternative e vincoli:**

- I dati correnti delle anagrafiche non sostituiscono quelli consolidati nel documento.
- Le associazioni agli incassi non modificano righe, sconti o totale originario della fattura.
- Una fattura ritirata non possiede un documento emesso corrente da ristampare finché non viene nuovamente emessa; rimangono consultabili l'istante della prima emissione e quello dell'emissione più recente, ma non viene conservato uno storico completo dei documenti emessi.

**Risultato:** viene prodotta una visualizzazione o ristampa coerente e non modificante.

### CU-FAT-12 – Modificare le note

**Obiettivo:** aggiornare informazioni descrittive senza incidere sui dati consolidati.

**Precondizioni:** la fattura o uno degli elementi associati esiste.

**Flusso principale:**

1. L'operatore modifica le note consentite della fattura, di un'attività o di una movimentazione.
2. Il sistema salva il nuovo valore.
3. Non esegue ricalcoli economici o ricostruzioni operative.
4. Le successive consultazioni e ristampe che includono le note mostrano il valore corrente.

**Alternative e vincoli:**

- La modifica è consentita in tutti gli stati della fattura.
- Le note non modificano composizione, importi, attribuzioni o stato.

**Risultato:** le note correnti sono aggiornate e gli altri dati rimangono invariati.

### CU-FAT-13 – Ritirare e preparare una nuova emissione

**Obiettivo:** riportare una fattura emessa e non saldata nello stato modificabile.

**Precondizioni:** la fattura è `emessa` e non possiede quote di movimenti associate.

**Flusso principale:**

1. L'operatore richiede il ritiro.
2. Il sistema verifica nuovamente stato e assenza di associazioni agli incassi.
3. Mostra gli effetti su attività, componenti e movimentazioni consolidate.
4. L'operatore conferma.
5. Il sistema rimuove atomicamente il consolidamento corrente prodotto dalla fattura.
6. Porta la fattura nello stato `in immissione`.
7. Mantiene identità tecnica e identificativo.
8. Ridetermina versioni, dati e risultati applicabili alla bozza.

**Alternative e vincoli:**

- Qualsiasi quota associata impedisce il ritiro, anche se non copre interamente la fattura.
- Un vincolo prodotto da un'altra fattura consolidata continua a proteggere gli elementi condivisi.
- Progressivo e suffisso rimangono immutabili; la data è modificabile soltanto nello stesso anno.
- Rimangono conservati gli istanti della prima emissione e dell'emissione più recente; la nuova emissione aggiorna quest'ultimo senza aggiungere una cronologia completa.
- La nuova emissione avviene mediante `CU-FAT-09` e `CU-FAT-10`.

**Risultato:** la fattura torna modificabile oppure rimane emessa senza variazioni.

### CU-FAT-14 – Aggiornare lo stato in base agli incassi

**Obiettivo:** allineare automaticamente stato, importo saldato e residuo alle quote associate.

**Precondizioni:** il punto 11 ha inserito, modificato o rimosso almeno una quota di incasso.

**Flusso principale:**

1. Il sistema somma le quote associate alla fattura.
2. Verifica che il totale attribuito non superi l'importo dovuto.
3. Calcola il residuo.
4. Determina automaticamente lo stato risultante.
5. Aggiorna atomicamente fattura e associazioni coinvolte.

**Alternative e vincoli:**

- Lo stato di riscossione non è modificabile manualmente.
- La rimozione di tutte le quote riporta la fattura a `emessa`, non a `in immissione`.
- Una fattura con totale pari a zero rimane `emessa` anche con residuo pari a zero e non riceve quote di incasso.
- I pagamenti si riferiscono all'intera fattura e non determinano quali righe siano state saldate.
- Un aggiornamento non valido delle quote viene respinto integralmente.

**Risultato:** stato, saldato e residuo rappresentano esattamente le quote correnti.

### CU-FAT-15 – Eliminare una fattura

**Obiettivo:** rimuovere fisicamente una fattura eliminabile e liberarne gli elementi associati.

**Precondizioni:** la fattura si trova nello stato `in immissione`.

**Flusso principale:**

1. L'operatore richiede l'eliminazione.
2. Il sistema mostra attività economiche, componenti e movimentazioni che verranno disassociate.
3. Indica se l'identificativo verrà liberato oppure resterà riservato perché già consolidato da una precedente emissione.
4. L'operatore conferma.
5. Il sistema rimuove atomicamente associazioni e fattura.
6. Rende nuovamente disponibili gli elementi economici non protetti da altri consolidamenti.

**Alternative e vincoli:**

- Una fattura `emessa`, `parzialmente saldata` o `saldata` non può essere eliminata direttamente.
- Una fattura `emessa` deve essere prima ritirata, se il ritiro è consentito.
- L'eliminazione non elimina le prestazioni, le operazioni, le componenti o le movimentazioni associate.
- Se una fase fallisce, la fattura e tutte le associazioni rimangono invariate.

**Risultato:** la fattura non esiste più e gli elementi disassociati conservano la propria identità.

### Interazioni con gli altri ambiti

- Il punto 1 fornisce e consolida i dati anagrafici riportati nel documento.
- I punti 2 e 3 determinano contesto, componenti economiche e vincoli operativi delle attività.
- Il punto 4 fornisce prestazioni, stati, note e fatturabilità.
- Il punto 5 fornisce le movimentazioni merci utilizzabili come informazioni.
- Il punto 6 determina la coppia `cliente + agenzia` e la compatibilità della composizione.
- Il punto 7 fornisce importi base, tariffe, scaglioni e pesi.
- Il punto 8 applica regole dinamiche, condizioni, priorità, bollo e notifiche degli azzeramenti.
- I punti 10 e 11 registrano incassi e quote che determinano saldato, residuo e stato della fattura.
- Il punto 12 interpreta data civile della fattura e istanti tecnici di emissione.
- Il punto 13 utilizza righe, importi, soggetti, stati e pagamenti nei resoconti e nelle esportazioni.

### Decisioni funzionali confermate

Sono confermati i seguenti comportamenti:

- la stessa movimentazione merci può essere riportata in più fatture compatibili, anche emesse; la prima emissione ne consolida i dati strutturali e le altre associazioni rimangono valide;
- il `progressivo successivo atteso` è il progressivo numerico successivo al massimo progressivo già emesso nello stesso anno, ignorando i suffissi; le bozze riservano le combinazioni ma non avanzano tale valore;
- quando il progressivo non è stato inserito, il sistema propone il primo valore disponibile a partire da quello atteso; un valore inferiore ancora libero può comunque essere scelto manualmente;
- la conferma di un salto evita di riproporre lo stesso salto per i progressivi successivi, poiché la fattura emessa aggiorna il massimo progressivo dell'anno;
- dopo un ritiro vengono conservati almeno l'istante della prima emissione e quello dell'emissione corrente o più recente, senza introdurre uno storico completo di tutte le emissioni; durante il ritiro il documento precedente non è considerato il documento emesso corrente;
- un totale pari a zero non impedisce l'emissione, purché siano state mostrate le notifiche informative previste dalle regole dinamiche;
- una fattura emessa con totale pari a zero rimane nello stato `emessa`, con saldato e residuo entrambi pari a zero, poiché non esiste alcuna quota positiva da attribuire e lo stato `saldata` richiede un incasso;
- quando una modifica della composizione o dei calcoli rende uno sconto manuale esistente superiore alla nuova base, il sistema impedisce la variazione originaria e richiede di correggere prima lo sconto, senza ridurlo automaticamente.

### Esito del punto

I casi d'uso coprono creazione, composizione economica e informativa, componenti degli spostamenti tra porti, sconti, calcoli, identificativo, data, verifiche, emissione, consultazione, note, ritiro, stati di riscossione ed eliminazione.

Le regole funzionali dell'ambito e le relative decisioni sono state confermate. Il punto è pertanto **completato**.


## 2.17 Punto 10 – Contabilità

### Tema e perimetro

Il punto disciplina la contabilità interna dell'azienda: conti finanziari, movimenti in entrata e in uscita, giroconti, categorie di spesa, voci contabili, ordinamento giornaliero e calcolo dei saldi.

La gestione comprende movimenti passati, correnti e futuri, modifiche ed eliminazioni, effetti sui saldi e conservazione dei riferimenti a conti o classificazioni successivamente disattivati. La ripartizione degli incassi tra le fatture e i relativi vincoli di pagamento sono trattati nel punto 11; in questo punto vengono definiti soltanto i dati contabili dell'incasso e le dipendenze necessarie a proteggerne la coerenza.

### Requisiti funzionali comuni

#### Identità, tipologie e dati comuni dei movimenti

- Ogni movimento possiede un'identità tecnica stabile, distinta dalla propria posizione nell'ordinamento contabile.
- Le tipologie previste sono:
  - `entrata`;
  - `uscita`;
  - `giroconto`.
- Il passaggio diretto tra le tre tipologie non è consentito; una tipologia errata richiede l'eliminazione del movimento e la registrazione di uno nuovo.
- Ogni movimento indica almeno importo e data contabile; può inoltre contenere una descrizione o nota secondo i vincoli della propria tipologia.
- L'importo deve essere strettamente maggiore di zero.
- Nella prima versione tutti gli importi contabili sono espressi in euro, utilizzano valori decimali esatti e sono registrati con due cifre decimali.
- La data contabile è una data civile priva di orario e può essere passata, corrente o futura.
- Il sistema non impedisce la registrazione quando il movimento porta un conto o una voce ad avere saldo negativo.
- Inserimento, modifica ed eliminazione aggiornano atomicamente conti, voci, categorie, progressivi e ogni altro riferimento interessato.

#### Ordinamento e progressivo giornaliero

- I movimenti sono ordinati mediante:
  1. data contabile;
  2. progressivo giornaliero.
- Il progressivo è unico nella giornata tra tutti i movimenti e non è separato per conto o tipologia.
- Per ogni data forma una sequenza consecutiva che parte da `1` e non presenta intervalli.
- Un nuovo movimento viene collocato in fondo alla giornata, salvo che l'operatore scelga una posizione differente.
- L'inserimento o il trasferimento in una posizione occupata sposta in avanti i movimenti successivi; l'eliminazione o lo spostamento fuori dalla giornata compatta la sequenza.
- Il riordinamento nella stessa data aggiorna soltanto progressivi e saldi intermedi; non cambia il saldo di fine giornata, il saldo previsto o i totali economici.
- Il giroconto occupa una sola posizione e viene rappresentato come un'unica operazione, anche se produce effetti su più conti.

#### Conti finanziari e saldi

- Ogni conto possiede:
  - identità tecnica stabile;
  - codice operativo univoco;
  - denominazione;
  - tipologia;
  - saldo iniziale, pari a zero quando non indicato;
  - stato `attivo` o `disattivato`;
  - eventuale descrizione o nota.
- Le tipologie iniziali sono `conto corrente bancario`, `cassa`, `conto postale` e `altro`; hanno funzione classificatoria e non modificano i calcoli.
- Il codice operativo è confrontato ignorando spazi iniziali e finali e differenze tra maiuscole e minuscole.
- Codice, denominazione, tipologia e descrizione possono essere modificati anche dopo l'utilizzo del conto e non sono storicizzati; movimenti e resoconti mostrano sempre i valori correnti.
- La modifica del codice libera il valore precedente senza cambiare l'identità o i riferimenti del conto.
- Il saldo iniziale può essere positivo, nullo o negativo, non possiede una decorrenza e costituisce la base di qualsiasi calcolo temporale.
- La modifica del saldo iniziale ricalcola anche i periodi precedenti e richiede una conferma informata.
- Il saldo alla data comprende il saldo iniziale e tutti gli effetti con data contabile minore o uguale alla data selezionata.
- Il saldo previsto comprende tutti i movimenti registrati, inclusi quelli futuri.
- Per ogni movimento sono ricostruibili i saldi immediatamente precedenti e successivi sui conti interessati.

#### Movimenti in entrata

- Un'entrata incrementa il saldo di un unico conto finanziario.
- Deve essere qualificata come:
  - `incasso`;
  - `altra entrata`.
- Un incasso deve indicare cliente e agenzia anche se non è ancora attribuito ad alcuna fattura.
- La ripartizione integrale o parziale dell'incasso tra fatture è regolata dal punto 11.
- Un'altra entrata non richiede cliente o agenzia, non può essere associata a fatture e deve contenere una descrizione che ne specifichi la natura.
- Ogni entrata può essere associata facoltativamente e per intero a una o più voci contabili.
- Il passaggio tra `incasso` e `altra entrata` è consentito perché non cambia la tipologia contabile principale:
  - da incasso ad altra entrata soltanto in assenza di quote attribuite a fatture;
  - da altra entrata a incasso soltanto indicando cliente e agenzia.
- Quando esistono quote attribuite a fatture, importo, cliente, agenzia e possibilità di eliminazione restano soggetti ai vincoli del punto 11.

#### Movimenti in uscita

- Un'uscita riduce il saldo di un unico conto finanziario.
- Deve indicare una categoria di spesa utilizzabile.
- Può essere associata facoltativamente e per intero a una o più voci contabili.
- Non può essere associata a fatture come pagamento.

#### Giroconti

- Un giroconto trasferisce capitale tra due conti differenti e costituisce un'unica operazione contabile.
- Per una nuova registrazione, conto di origine e conto di destinazione devono essere entrambi attivi.
- Il conto di origine viene addebitato e quello di destinazione viene accreditato dello stesso capitale trasferito.
- Il giroconto può includere un costo strettamente positivo attribuito:
  - al conto di origine, che viene addebitato di `capitale + costo`;
  - al conto di destinazione, che viene accreditato di `capitale - costo`.
- Se attribuito alla destinazione, il costo deve essere inferiore al capitale trasferito.
- Il costo richiede una categoria di spesa e può essere associato per intero a una o più voci contabili.
- Capitale trasferito, costo e relative classificazioni rimangono distinti: soltanto il costo costituisce una spesa e concorre alle categorie e alle voci.
- Il giroconto è neutrale per la disponibilità complessiva in assenza di costi; in presenza di un costo, la disponibilità diminuisce del relativo importo.
- Le componenti tecniche non possono essere modificate, ordinate o eliminate separatamente.
- Nella consultazione vengono mostrati separatamente saldo precedente e successivo di ciascun conto interessato, pur mantenendo una sola riga nell'elenco generale.

#### Categorie di spesa

- Ogni categoria possiede identità tecnica, codice univoco, denominazione, eventuale categoria padre e stato `attiva` o `disattivata`.
- La gerarchia non ha una profondità massima, ma non può contenere cicli.
- Una categoria padre e una categoria foglia possono entrambe essere associate direttamente a un'uscita o al costo di un giroconto.
- Una categoria è utilizzabile soltanto se essa e tutte le proprie categorie antenate sono attive.
- La disattivazione di una categoria rende inutilizzabile l'intero sottoalbero senza modificare lo stato proprio delle discendenti e senza rimuovere le associazioni esistenti.
- La riattivazione rende nuovamente utilizzabili soltanto le categorie attive la cui intera catena di antenati è attiva.
- Una categoria può essere spostata sotto un'altra categoria o trasformata in radice; l'operazione ricalcola utilizzabilità e aggregazioni storiche dopo una conferma informata.
- I resoconti di una categoria comprendono movimenti direttamente associati e movimenti di tutte le discendenti.
- Codice, denominazione e posizione non sono storicizzati: anche i resoconti di periodi precedenti usano la struttura corrente.

#### Voci contabili

- Ogni voce possiede identità tecnica, codice univoco, denominazione, eventuale descrizione, saldo iniziale e stato `attiva` o `disattivata`.
- Le voci sono indipendenti da conti, categorie, clienti e agenzie.
- Un'entrata o un'uscita può essere associata per il proprio intero importo a zero o più voci; per un giroconto è associabile soltanto l'intero costo.
- La stessa voce non può essere associata due volte allo stesso movimento.
- Se un movimento è associato a più voci, l'intero importo associabile concorre separatamente al saldo di ciascuna.
- Le voci non vengono aggregate tra loro e non viene calcolato un saldo complessivo trasversale.
- Il saldo alla data e quello previsto seguono le stesse regole temporali dei conti, considerando soltanto i movimenti associati e, per i giroconti, soltanto i costi.
- Codice, denominazione, descrizione e saldo iniziale non sono storicizzati; le modifiche aggiornano anche i resoconti relativi a periodi precedenti.

#### Disattivazione, eliminazione e classificazioni esistenti

- Conti, categorie e voci disattivati non sono selezionabili per nuove associazioni, ma rimangono visibili e validi sui movimenti esistenti.
- La modifica di un movimento può conservare un conto o una classificazione divenuti disattivati; qualsiasi sostituzione o nuova associazione richiede un elemento utilizzabile al momento dell'operazione.
- Un'associazione verso una categoria o voce disattivata può essere rimossa, ma non ricreata finché l'elemento non viene riattivato.
- Un conto, una categoria o una voce non possono essere eliminati finché possiedono movimenti o altri riferimenti associati.
- Dopo la rimozione di tutte le associazioni, un conto può essere eliminato se privo di altri riferimenti, una categoria se priva di discendenti e una voce se priva di altri riferimenti.
- L'eliminazione libera il codice configurabile, che può essere riutilizzato da una nuova identità della stessa tipologia.
- La disattivazione di un conto non rimuove i movimenti futuri già registrati e segnala all'operatore la loro presenza.

### CU-CON-01 – Consultare i movimenti contabili

**Obiettivo:** ricercare i movimenti e comprenderne effetti, classificazioni e collegamenti.

**Precondizioni:** nessuna.

**Flusso principale:**

1. L'operatore apre l'elenco dei movimenti.
2. Il sistema ordina per data contabile e progressivo giornaliero.
3. Mostra almeno tipologia, data, progressivo, conto o conti interessati, importo, descrizione e classificazioni.
4. L'operatore applica filtri e ordinamenti di visualizzazione.
5. Apre il dettaglio di un movimento.
6. Il sistema mostra dati, effetti sui conti, voci, categoria, eventuali riferimenti all'incasso e saldi precedenti e successivi.

**Alternative e vincoli:**

- I filtri comprendono almeno data, tipologia, conto, categoria, voce, cliente e agenzia quando applicabili.
- L'ordinamento scelto per la visualizzazione non modifica il progressivo contabile.
- Un giroconto compare come singola operazione con effetti distinti sui conti coinvolti.

**Risultato:** nessun dato viene modificato.

### CU-CON-02 – Consultare il saldo di un conto

**Obiettivo:** ricostruire saldo alla data, saldo previsto e andamento di un conto.

**Precondizioni:** il conto esiste.

**Flusso principale:**

1. L'operatore seleziona il conto e una data civile.
2. Il sistema parte dal saldo iniziale.
3. Applica tutti i movimenti fino alla data selezionata inclusa.
4. Mostra saldo alla data e movimenti considerati.
5. Calcola separatamente il saldo previsto includendo tutti i movimenti futuri registrati.

**Alternative e vincoli:**

- La data può essere passata, corrente o futura.
- Il conto può essere disattivato e il saldo può essere negativo.
- Nel dettaglio del conto i progressivi giornalieri possono non essere consecutivi perché sono globali.

**Risultato:** viene prodotta una ricostruzione coerente senza modificare i dati.

### CU-CON-03 – Creare un conto finanziario

**Obiettivo:** registrare una nuova disponibilità finanziaria aziendale.

**Precondizioni:** nessuna.

**Flusso principale:**

1. L'operatore indica codice operativo, denominazione, tipologia, saldo iniziale ed eventuale descrizione.
2. Il sistema normalizza il codice per la verifica.
3. Verifica che non sia utilizzato da un altro conto attivo o disattivato.
4. Crea una nuova identità tecnica nello stato `attivo`.

**Alternative e vincoli:**

- Il saldo iniziale assente viene considerato pari a zero.
- Il saldo iniziale può essere negativo.
- Un codice liberato dall'eliminazione o dalla modifica di un altro conto può essere riutilizzato senza creare continuità tra le identità.

**Risultato:** esiste un nuovo conto attivo e selezionabile.

### CU-CON-04 – Modificare un conto finanziario

**Obiettivo:** aggiornare dati descrittivi, codice operativo o saldo iniziale.

**Precondizioni:** il conto esiste.

**Flusso principale:**

1. L'operatore modifica uno o più dati.
2. Il sistema verifica l'eventuale nuovo codice operativo.
3. Se cambia il saldo iniziale, mostra gli effetti sui saldi e sui resoconti precedenti.
4. L'operatore conferma quando richiesto.
5. Il sistema aggiorna il conto e ricalcola atomicamente i risultati interessati.

**Alternative e vincoli:**

- Il codice operativo resta modificabile anche dopo l'inserimento di movimenti.
- Il codice precedente viene liberato soltanto al completamento dell'aggiornamento.
- I movimenti conservano il riferimento alla stessa identità e mostrano i nuovi dati correnti.

**Risultato:** il conto e i risultati derivati sono coerenti con i nuovi valori.

### CU-CON-05 – Disattivare, riattivare o eliminare un conto

**Obiettivo:** gestire il ciclo di vita di un conto finanziario.

**Precondizioni:** il conto esiste.

**Flusso principale:**

1. L'operatore seleziona l'operazione richiesta.
2. Il sistema analizza movimenti, riferimenti e movimenti futuri.
3. Mostra vincoli ed effetti.
4. L'operatore conferma.
5. Il sistema applica l'operazione consentita.

**Alternative e vincoli:**

- La disattivazione è consentita anche con saldo diverso da zero e movimenti futuri, che vengono segnalati ma conservati.
- La riattivazione rende il conto nuovamente selezionabile.
- L'eliminazione è consentita soltanto se il conto non possiede movimenti o altri riferimenti associati.
- La rimozione di tutte le associazioni rende il conto eliminabile, anche se era stato utilizzato in precedenza.

**Risultato:** stato o esistenza del conto rispettano i vincoli senza perdere lo storico valido.

### CU-CON-06 – Registrare un movimento in entrata

**Obiettivo:** registrare un incasso oppure un'altra entrata.

**Precondizioni:** esiste almeno un conto attivo.

**Flusso principale:**

1. L'operatore seleziona `entrata`, conto, data e importo.
2. Qualifica il movimento come `incasso` o `altra entrata`.
3. Per un incasso indica cliente e agenzia; per un'altra entrata inserisce la descrizione obbligatoria.
4. Se desiderato, seleziona una o più voci attive.
5. Indica la posizione giornaliera oppure accetta quella finale proposta.
6. Il sistema valida e registra atomicamente il movimento.
7. Aggiorna progressivi e saldi interessati.

**Alternative e vincoli:**

- L'incasso può essere creato senza attribuirlo immediatamente a una fattura.
- L'altra entrata non richiede cliente o agenzia e non ammette associazioni a fatture.
- La parte relativa alle quote di pagamento è gestita dal punto 11.

**Risultato:** esiste un'entrata coerente che incrementa il saldo del conto e delle eventuali voci.

### CU-CON-07 – Registrare un movimento in uscita

**Obiettivo:** registrare una spesa sostenuta dall'azienda.

**Precondizioni:** esistono un conto attivo e almeno una categoria utilizzabile.

**Flusso principale:**

1. L'operatore seleziona `uscita`, conto, data e importo.
2. Seleziona una categoria di spesa utilizzabile.
3. Inserisce eventuale descrizione o nota.
4. Se desiderato, associa una o più voci attive.
5. Indica la posizione giornaliera oppure accetta quella finale proposta.
6. Il sistema registra il movimento e aggiorna progressivi, saldo del conto, categorie e voci.

**Alternative e vincoli:**

- È selezionabile anche una categoria padre, purché utilizzabile.
- Il saldo insufficiente o negativo non impedisce la registrazione.
- L'uscita non può essere attribuita a fatture.

**Risultato:** esiste un'uscita coerente e classificata.

### CU-CON-08 – Registrare un giroconto

**Obiettivo:** trasferire capitale tra due conti con un eventuale costo.

**Precondizioni:** esistono almeno due conti attivi distinti.

**Flusso principale:**

1. L'operatore seleziona conto di origine, conto di destinazione, capitale e data.
2. Se previsto, indica costo e conto al quale attribuirlo.
3. Per il costo seleziona una categoria e, facoltativamente, una o più voci.
4. Indica la posizione giornaliera oppure accetta quella finale proposta.
5. Il sistema verifica conti, importi e classificazioni.
6. Registra un'unica operazione con le componenti tecniche collegate.
7. Aggiorna atomicamente progressivi, saldi, categoria e voci.

**Alternative e vincoli:**

- Senza costo, categoria e voci non sono previste.
- Con costo sulla destinazione, il costo deve essere inferiore al capitale.
- Il capitale non può essere classificato né associato a fatture.
- L'operazione è consentita anche se l'addebito rende negativo il saldo di origine.

**Risultato:** il trasferimento è registrato come una sola operazione e il solo costo riduce la disponibilità complessiva.

### CU-CON-09 – Modificare un movimento contabile

**Obiettivo:** correggere i dati di un movimento esistente mantenendone l'identità.

**Precondizioni:** il movimento esiste.

**Flusso principale:**

1. L'operatore apre il movimento e modifica i dati consentiti.
2. Il sistema verifica conti, classificazioni, voci e dipendenze.
3. Calcola gli effetti su progressivi, saldi e aggregazioni.
4. Applica atomicamente movimento e aggiornamenti derivati.

**Alternative e vincoli:**

- Entrata, uscita e giroconto non sono trasformabili tra loro.
- La qualificazione di un'entrata può cambiare tra incasso e altra entrata rispettando i vincoli previsti.
- Un conto o una classificazione disattivati possono essere mantenuti, ma una nuova selezione deve essere utilizzabile.
- Per il giroconto ogni modifica riguarda l'intera operazione.
- I vincoli prodotti dalle quote attribuite alle fatture sono verificati secondo il punto 11.

**Risultato:** il movimento è aggiornato integralmente oppure rimane invariato.

### CU-CON-10 – Cambiare data o posizione di un movimento

**Obiettivo:** modificare l'ordine contabile senza alterare l'identità del movimento.

**Precondizioni:** il movimento esiste.

**Flusso principale:**

1. L'operatore modifica la data contabile o il progressivo desiderato.
2. Il sistema rimuove il movimento dalla posizione originaria.
3. Compatta la sequenza di origine.
4. Inserisce il movimento nella nuova posizione e sposta quelli successivi.
5. Ricalcola i saldi intermedi interessati.
6. Salva atomicamente l'intera variazione.

**Alternative e vincoli:**

- Se viene cambiata la data senza scegliere la posizione, il movimento viene collocato in fondo alla nuova giornata.
- Il giroconto si sposta come unica operazione.
- Un riordino nella stessa data non modifica il saldo finale della giornata.

**Risultato:** le sequenze coinvolte rimangono consecutive e i saldi intermedi sono coerenti.

### CU-CON-11 – Eliminare un movimento contabile

**Obiettivo:** rimuovere un movimento eliminabile e tutti i suoi effetti.

**Precondizioni:** il movimento esiste e non presenta dipendenze bloccanti.

**Flusso principale:**

1. L'operatore richiede l'eliminazione.
2. Il sistema mostra conti, saldi, voci, categorie e altri elementi interessati.
3. Verifica l'assenza di quote attribuite a fatture o di altri vincoli.
4. L'operatore conferma.
5. Il sistema elimina il movimento e compatta il progressivo giornaliero.
6. Aggiorna atomicamente tutti i saldi e le aggregazioni.

**Alternative e vincoli:**

- Un incasso con quote associate non può essere eliminato prima della loro rimozione.
- Un giroconto viene eliminato integralmente con tutte le proprie componenti.
- L'eliminazione dell'ultimo movimento associato può rendere eliminabili conti, categorie o voci, purché non rimangano altri riferimenti e siano rispettati i rispettivi vincoli strutturali.

**Risultato:** il movimento non esiste più e ogni risultato derivato è coerente.

### CU-CON-12 – Creare o modificare una categoria di spesa

**Obiettivo:** configurare la classificazione gerarchica delle spese.

**Precondizioni:** nessuna per una radice; l'eventuale categoria padre deve esistere.

**Flusso principale:**

1. L'operatore inserisce o modifica codice, denominazione e categoria padre.
2. Il sistema verifica unicità del codice e assenza di cicli.
3. Per una nuova categoria crea un'identità attiva.
4. Per una modifica conserva identità e associazioni.
5. Aggiorna la rappresentazione corrente nei movimenti e nei resoconti.

**Alternative e vincoli:**

- Il codice può essere modificato anche dopo l'utilizzo e quello precedente viene liberato.
- Il codice rimane riservato mentre la categoria è disattivata.
- Una categoria può essere associabile direttamente anche se possiede discendenti.

**Risultato:** la categoria esiste con dati e posizione coerenti.

### CU-CON-13 – Spostare una categoria nella gerarchia

**Obiettivo:** modificare la struttura delle categorie senza perdere le associazioni.

**Precondizioni:** la categoria esiste.

**Flusso principale:**

1. L'operatore seleziona una nuova categoria padre oppure la posizione radice.
2. Il sistema verifica che non si generino cicli.
3. Determina le variazioni di utilizzabilità del sottoalbero.
4. Mostra posizione precedente, nuova posizione ed effetti sulle aggregazioni storiche.
5. L'operatore conferma.
6. Il sistema sposta la categoria e ricalcola atomicamente utilizzabilità e resoconti.

**Alternative e vincoli:**

- Lo spostamento sotto un ramo disattivato può rendere inutilizzabili categorie attive.
- Gli stati propri delle categorie del sottoalbero non vengono modificati.
- Le associazioni dirette ai movimenti rimangono invariate.

**Risultato:** la gerarchia corrente e tutte le aggregazioni sono coerenti.

### CU-CON-14 – Disattivare, riattivare o eliminare una categoria

**Obiettivo:** gestire la disponibilità e il ciclo di vita di una categoria.

**Precondizioni:** la categoria esiste.

**Flusso principale:**

1. L'operatore seleziona l'operazione.
2. Il sistema analizza sottoalbero, utilizzi e categorie antenate.
3. Mostra le categorie che diventeranno utilizzabili o inutilizzabili.
4. L'operatore conferma.
5. Il sistema applica atomicamente stato o eliminazione.

**Alternative e vincoli:**

- La disattivazione non cambia lo stato delle discendenti e non rimuove associazioni esistenti.
- La riattivazione non rende utilizzabile la categoria finché un'antenata resta disattivata.
- L'eliminazione è consentita soltanto per una categoria priva di movimenti o costi associati e di categorie discendenti.

**Risultato:** disponibilità e gerarchia rispettano gli stati correnti.

### CU-CON-15 – Creare, modificare o gestire lo stato di una voce

**Obiettivo:** configurare una vista contabile autonoma.

**Precondizioni:** nessuna per la creazione; la voce deve esistere per le altre operazioni.

**Flusso principale:**

1. L'operatore indica o modifica codice, denominazione, descrizione e saldo iniziale.
2. Il sistema verifica l'unicità del codice.
3. Se cambia il saldo iniziale, mostra gli effetti sui periodi precedenti e richiede conferma.
4. L'operatore può inoltre disattivare o riattivare la voce.
5. Il sistema applica l'operazione e ricalcola i saldi interessati.

**Alternative e vincoli:**

- Una voce disattivata conserva associazioni e saldi ma non è selezionabile per nuove associazioni.
- Una voce priva di movimenti, costi di giroconto e altri riferimenti può essere eliminata, anche se era stata utilizzata in precedenza.
- La modifica del codice libera quello precedente senza cambiare l'identità.

**Risultato:** la voce e i relativi saldi sono coerenti con la configurazione corrente.

### CU-CON-16 – Associare movimenti alle voci e consultarne i saldi

**Obiettivo:** attribuire movimenti a una o più viste contabili autonome.

**Precondizioni:** esistono il movimento e almeno una voce utilizzabile.

**Flusso principale:**

1. L'operatore apre le associazioni del movimento.
2. Il sistema propone le voci attive non ancora associate.
3. L'operatore aggiunge o rimuove una o più voci.
4. Il sistema attribuisce a ciascuna l'intero importo associabile.
5. Aggiorna atomicamente i saldi delle voci interessate.
6. Nella consultazione di una voce, calcola saldo alla data e saldo previsto sui soli movimenti associati.

**Alternative e vincoli:**

- Per un giroconto è associabile soltanto l'intero costo; senza costo non è possibile associare voci.
- Un'associazione esistente verso una voce disattivata può essere mantenuta o rimossa, ma non ricreata.
- Lo stesso movimento associato a più voci concorre integralmente a ciascuna.
- Le voci possono essere confrontate separatamente, ma non sommate in un saldo complessivo.

**Risultato:** associazioni e saldi delle singole voci sono aggiornati senza duplicare i movimenti reali.

### Interazioni con gli altri ambiti

- Il punto 1 fornisce cliente e agenzia degli incassi e le regole di selezione delle anagrafiche attive.
- Il punto 9 fornisce fatture, stati, totale e residuo necessari alla successiva attribuzione dei pagamenti.
- Il punto 11 disciplina quote, compatibilità tra incasso e fatture e aggiornamento degli stati di riscossione.
- Il punto 12 disciplina date civili e istanti tecnici di inserimento o modifica.
- Il punto 13 utilizza conti, movimenti, categorie, voci e saldi nei resoconti e nelle esportazioni.
- Il punto 14 disciplina backup, ripristino e configurazioni generali che possono comprendere i dati iniziali della contabilità.

### Decisioni funzionali confermate

Sono confermati i seguenti comportamenti:

- la data contabile non contiene un orario; l'ordine interno della giornata è determinato da un unico progressivo globale condiviso da tutti i movimenti;
- l'operatore può inserire o spostare un movimento in qualsiasi posizione valida della giornata; in assenza di una scelta esplicita viene utilizzata l'ultima posizione;
- un giroconto compare come una sola operazione nell'elenco generale, ma mostra saldo precedente e successivo separatamente per ogni conto interessato;
- tutti gli importi contabili della prima versione sono in euro, con valori decimali esatti e due cifre decimali;
- un movimento può produrre un saldo negativo senza blocchi per disponibilità insufficiente;
- entrata, uscita e giroconto non sono trasformabili tra loro, mentre la qualificazione di un'entrata può cambiare tra `incasso` e `altra entrata` quando sono rispettati i relativi vincoli;
- conti, categorie e voci possono essere eliminati quando non possiedono più movimenti o altri riferimenti associati; le categorie devono inoltre essere prive di discendenti;
- codici, denominazioni, tipologie, descrizioni, saldi iniziali di conti e voci e gerarchia delle categorie non sono versionati: i resoconti, anche storici, utilizzano sempre la configurazione corrente.

### Esito del punto

I casi d'uso coprono conti finanziari, movimenti in entrata e in uscita, giroconti, ordinamento giornaliero, saldi, categorie gerarchiche, voci contabili, modifiche, disattivazioni ed eliminazioni.

Le regole funzionali dell'ambito e le relative decisioni sono state confermate. Il punto è pertanto **completato**.


## 2.18 Punto 11 – Incassi e ripartizione dei pagamenti

### Tema e perimetro

Il punto disciplina l'attribuzione degli incassi alle fatture mediante quote di pagamento. Uno stesso incasso può concorrere al saldo di più fatture e una fattura può essere saldata mediante più incassi.

La registrazione contabile dell'entrata, il conto finanziario, la data e l'importo dell'incasso appartengono al punto 10. Il presente punto comprende invece ricerca delle fatture associabili, proposta e modifica della ripartizione, importo non attribuito, vincoli sulle quote, aggiornamento dello stato delle fatture e protezione delle associazioni durante le modifiche.

### Requisiti funzionali comuni

#### Incassi utilizzabili

- Può essere utilizzato come pagamento soltanto un movimento contabile di tipo `entrata` qualificato come `incasso`.
- L'incasso deve indicare cliente e agenzia, che identificano l'insieme delle fatture compatibili.
- Un'`altra entrata`, un'uscita e un giroconto non possono essere associati a fatture.
- L'incasso può essere registrato e rimanere privo di attribuzioni, anche per un tempo indefinito.
- L'importo attribuito è la somma delle quote associate alle fatture.
- L'importo disponibile è pari all'importo dell'incasso meno l'importo già attribuito.
- L'incasso è:
  - `non attribuito`, quando la somma delle quote è zero;
  - `parzialmente attribuito`, quando la somma è positiva ma inferiore all'importo;
  - `interamente attribuito`, quando la somma coincide con l'importo.
- Queste condizioni descrivono la ripartizione e non costituiscono stati contabili aggiuntivi del movimento.

#### Fatture associabili

- Possono essere associate soltanto fatture:
  - già emesse;
  - riferite alla stessa agenzia e allo stesso cliente ai quali è attribuito l’incasso;
  - non ancora interamente saldate.
- La corrispondenza di cliente e agenzia utilizza le identità stabili dei soggetti, non soltanto i relativi dati descrittivi correnti.
- La successiva disattivazione del cliente o dell'agenzia non invalida un incasso o una fattura esistenti e non impedisce l'associazione quando le identità coincidono.
- Una fattura `in immissione` o `saldata` non è selezionabile per una nuova associazione; una fattura `parzialmente saldata` rimane associabile per il proprio residuo.
- Una fattura emessa con totale pari a zero non può ricevere quote, anche se il proprio stato rimane `emessa`.
- Non viene imposto un ordine temporale tra data contabile dell'incasso e data della fattura: un incasso precedente può essere attribuito a una fattura emessa successivamente.

#### Quote e cardinalità

- Ogni associazione tra incasso e fattura contiene una quota monetaria strettamente positiva.
- Per la stessa coppia `incasso + fattura` esiste una sola associazione; una variazione dell'importo aggiorna la quota esistente e non crea righe duplicate.
- La somma delle quote di un incasso non può superarne l'importo.
- La somma delle quote attribuite a una fattura non può superarne il totale.
- Una nuova quota non può superare contemporaneamente:
  - l'importo ancora disponibile dell'incasso;
  - il residuo corrente della fattura.
- Durante la modifica di una quota, i limiti vengono calcolati considerando il valore finale della stessa associazione, senza conteggiare due volte la quota precedente.
- Le quote utilizzano valori decimali esatti in euro e due cifre decimali.
- Non è prevista una quota pari a zero: per azzerare un'associazione occorre rimuoverla.
- Le quote si riferiscono alla fattura nel suo complesso e non vengono ripartite tra le singole righe economiche.

#### Proposta di ripartizione progressiva

- Per associare più fatture, il sistema presenta un elenco ordinato delle fatture selezionate.
- L'ordinamento iniziale utilizza data della fattura crescente e, a parità di data, identificativo crescente.
- Prima del calcolo l'operatore può modificare liberamente l'ordine delle fatture selezionate.
- Il sistema utilizza l'importo ancora disponibile dell'incasso e propone la ripartizione nell'ordine corrente:
  1. assegna alla prima fattura il minore tra il suo residuo e l'importo disponibile;
  2. sottrae la quota proposta dall'importo disponibile;
  3. continua con la fattura successiva;
  4. termina quando l'importo è esaurito o non rimangono fatture.
- La proposta riguarda soltanto le nuove fatture selezionate e non modifica quote già esistenti.
- La parte eventualmente restante rimane non attribuita e può essere utilizzata successivamente.
- La proposta non viene salvata finché l'operatore non la conferma.

#### Modifica manuale e ricalcolo

- Prima della conferma, l'operatore può modificare manualmente qualsiasi quota proposta, aggiungere o rimuovere fatture e cambiare l'ordine.
- Dopo ogni modifica, il sistema ricalcola importo attribuito, importo disponibile, saldato e residuo delle fatture coinvolte.
- La modifica manuale di una quota non ridistribuisce automaticamente la differenza sulle fatture successive.
- L'operatore può richiedere esplicitamente una nuova proposta per le sole fatture non ancora associate, utilizzando l'importo disponibile aggiornato.
- Una ripartizione può essere salvata anche se lascia una parte dell'incasso non attribuita o una o più fatture parzialmente saldate.

#### Aggiornamento delle fatture

- L'inserimento, la modifica o la rimozione di una quota aggiorna automaticamente l'importo saldato, il residuo e lo stato della fattura.
- Una fattura passa:
  - da `emessa` a `parzialmente saldata` quando riceve quote positive inferiori al totale;
  - a `saldata` quando la somma delle quote coincide con il totale;
  - da `saldata` a `parzialmente saldata` se una quota viene ridotta o rimossa lasciando un saldo positivo;
  - a `emessa` se tutte le quote vengono rimosse e l'importo saldato torna a zero.
- Una fattura già `saldata` non è selezionabile per una nuova associazione, ma le quote esistenti che la riguardano possono essere modificate o rimosse.
- La rimozione dell'ultima quota non riporta automaticamente la fattura `in immissione`: l'eventuale ritiro rimane un'operazione manuale del punto 9.
- La presenza di almeno una quota impedisce il ritiro e la modifica strutturale della fattura.

#### Modifica ed eliminazione dell'incasso

- Un incasso con quote esistenti può essere modificato mantenendo le associazioni quando il risultato resta compatibile.
- L'importo dell'incasso non può essere ridotto sotto la somma delle quote correnti.
- Cliente e agenzia possono essere modificati soltanto se tutte le fatture associate rimangono compatibili con la nuova coppia.
- In presenza di associazioni incompatibili, il sistema non le rimuove automaticamente: devono essere eliminate prima della modifica dei soggetti.
- Il passaggio da `incasso` ad `altra entrata` è consentito soltanto dopo la rimozione di tutte le quote.
- La modifica del conto, della data contabile, della descrizione, delle note o delle voci contabili non modifica la ripartizione, purché siano rispettati gli altri vincoli contabili.
- L'incasso può essere eliminato soltanto quando non possiede quote associate.

#### Atomicità e concorrenza

- La conferma di una ripartizione applica atomicamente tutte le quote e tutti gli aggiornamenti delle fatture coinvolte.
- Prima del salvataggio il sistema verifica nuovamente importo disponibile dell'incasso, residui delle fatture, stati e compatibilità dei soggetti.
- Se anche una sola quota non è più valida, nessuna parte della ripartizione viene applicata.
- Il sistema segnala le variazioni concorrenti e richiede di aggiornare la proposta prima di riprovare.
- Anche modifica e rimozione simultanea di più quote seguono la stessa regola atomica.

### CU-INC-01 – Consultare un incasso e la sua ripartizione

**Obiettivo:** conoscere utilizzo e disponibilità di un incasso.

**Precondizioni:** l'incasso esiste.

**Flusso principale:**

1. L'operatore apre il dettaglio dell'incasso.
2. Il sistema mostra importo totale, attribuito e disponibile.
3. Mostra cliente, agenzia e tutte le fatture associate con relativa quota.
4. Per ciascuna fattura mostra identificativo, totale, saldato, residuo e stato correnti.
5. Distingue la condizione non attribuita, parzialmente attribuita o interamente attribuita.

**Alternative e vincoli:**

- L'incasso può non avere alcuna fattura associata.
- Le quote vengono mostrate come associazioni alla fattura complessiva, senza imputazione alle righe.
- Le fatture associate rimangono consultabili anche dopo variazioni di stato; i soggetti successivamente disattivati rimangono visibili.

**Risultato:** nessun dato viene modificato.

### CU-INC-02 – Ricercare le fatture associabili

**Obiettivo:** individuare le fatture alle quali può essere attribuito l'incasso.

**Precondizioni:** l'incasso indica cliente e agenzia e possiede un importo disponibile positivo.

**Flusso principale:**

1. L'operatore richiede le fatture associabili.
2. Il sistema filtra le fatture utilizzando cliente e agenzia dell'incasso.
3. Esclude fatture `in immissione`, interamente saldate o con totale pari a zero; mantiene quelle parzialmente saldate per il relativo residuo.
4. Mostra almeno identificativo, data, totale, saldato e residuo.
5. L'operatore applica ulteriori filtri e seleziona una o più fatture.

**Alternative e vincoli:**

- Una fattura già associata allo stesso incasso viene mostrata tra le attribuzioni correnti, non come nuova associazione.
- La data della fattura può essere precedente o successiva alla data contabile dell'incasso.
- La disattivazione successiva di cliente o agenzia non impedisce la selezione basata sulle identità coincidenti.

**Risultato:** esiste un insieme ordinabile di fatture compatibili selezionate.

### CU-INC-03 – Generare una proposta di ripartizione

**Obiettivo:** distribuire automaticamente l'importo disponibile tra più fatture.

**Precondizioni:** sono state selezionate una o più fatture associabili.

**Flusso principale:**

1. Il sistema ordina inizialmente le fatture per data e identificativo crescenti.
2. L'operatore conferma o modifica l'ordine.
3. Il sistema determina l'importo disponibile dell'incasso.
4. Copre progressivamente il residuo di ciascuna fattura nell'ordine scelto.
5. Mostra per ogni fattura la quota proposta e il residuo risultante.
6. Mostra l'eventuale parte dell'incasso che rimarrebbe non attribuita.

**Alternative e vincoli:**

- Se l'importo si esaurisce, le fatture successive ricevono una quota assente e non vengono associate.
- Se tutti i residui vengono coperti, l'importo restante rimane disponibile.
- Le quote già esistenti non vengono modificate dalla proposta.

**Risultato:** esiste una proposta non ancora persistita.

### CU-INC-04 – Modificare e confermare una ripartizione

**Obiettivo:** adattare manualmente la proposta e applicare le quote.

**Precondizioni:** esiste una proposta di ripartizione.

**Flusso principale:**

1. L'operatore modifica le quote, l'ordine o le fatture selezionate.
2. Il sistema ricalcola importo attribuito e disponibile.
3. Ricalcola saldato, residuo e stato risultante di ogni fattura.
4. L'operatore conferma la ripartizione.
5. Il sistema ripete tutte le validazioni correnti.
6. Salva atomicamente quote e aggiornamenti delle fatture.

**Alternative e vincoli:**

- Una quota nulla determina la mancata creazione dell'associazione; per una quota esistente equivale a una richiesta di rimozione esplicita.
- Una quota negativa, eccedente il disponibile o superiore al residuo viene respinta.
- La riduzione manuale di una quota aumenta l'importo non attribuito senza modificare automaticamente le quote successive.
- Se una fattura è cambiata nel frattempo, nessuna quota viene salvata.

**Risultato:** la ripartizione completa è applicata oppure tutti i dati rimangono invariati.

### CU-INC-05 – Aggiungere successivamente nuove attribuzioni

**Obiettivo:** utilizzare una parte dell'incasso rimasta non attribuita.

**Precondizioni:** l'incasso possiede un importo disponibile positivo.

**Flusso principale:**

1. L'operatore apre una ripartizione esistente o un incasso non attribuito.
2. Ricerca nuove fatture associabili mediante `CU-INC-02`.
3. Seleziona e ordina le fatture.
4. Il sistema propone quote utilizzando soltanto l'importo ancora disponibile.
5. L'operatore conferma mediante `CU-INC-04`.

**Alternative e vincoli:**

- Le attribuzioni già esistenti rimangono invariate.
- L'operatore può aggiungere anche una sola fattura e indicare direttamente la quota.
- L'incasso può continuare a conservare una parte non attribuita dopo l'operazione.

**Risultato:** nuove quote vengono aggiunte senza ricalcolare quelle precedenti.

### CU-INC-06 – Modificare o rimuovere quote esistenti

**Obiettivo:** correggere una ripartizione già registrata.

**Precondizioni:** l'incasso possiede almeno una quota associata.

**Flusso principale:**

1. L'operatore modifica una o più quote oppure ne richiede la rimozione.
2. Il sistema calcola il nuovo importo attribuito e disponibile.
3. Calcola i nuovi saldi e stati delle fatture coinvolte.
4. Verifica tutte le quote finali.
5. L'operatore conferma.
6. Il sistema applica atomicamente le modifiche.

**Alternative e vincoli:**

- Una fattura attualmente `saldata` può tornare `parzialmente saldata` o `emessa`.
- La rimozione dell'ultima quota rende nuovamente ritirabile una fattura `emessa`, ma non ne esegue il ritiro.
- L'importo liberato torna disponibile sullo stesso incasso e non viene redistribuito automaticamente.
- Una quota può essere spostata verso un'altra fattura soltanto come rimozione e nuova associazione nella medesima operazione atomica.

**Risultato:** quote, disponibilità dell'incasso e stati delle fatture sono coerenti.

### CU-INC-07 – Modificare un incasso con quote associate

**Obiettivo:** aggiornare il movimento contabile senza invalidarne la ripartizione.

**Precondizioni:** l'incasso possiede almeno una quota.

**Flusso principale:**

1. L'operatore modifica uno o più dati dell'incasso.
2. Il sistema confronta il nuovo importo con la somma delle quote.
3. Verifica la compatibilità di cliente e agenzia con tutte le fatture associate.
4. Verifica gli altri vincoli contabili del punto 10.
5. Salva la modifica soltanto se tutte le associazioni restano valide.

**Alternative e vincoli:**

- Un importo inferiore alla somma attribuita viene respinto.
- L'aumento dell'importo incrementa la parte disponibile senza creare nuove quote.
- Una coppia incompatibile viene respinta; il sistema non elimina automaticamente le associazioni.
- Il passaggio ad `altra entrata` e l'eliminazione richiedono prima la rimozione di tutte le quote.
- Conto, data, descrizione, note e voci possono cambiare senza modificare le quote.

**Risultato:** l'incasso viene aggiornato oppure rimane invariato con l'indicazione dei vincoli da risolvere.

### CU-INC-08 – Aggiornare automaticamente lo stato delle fatture

**Obiettivo:** mantenere coerenti stato, saldato e residuo dopo ogni variazione delle quote.

**Precondizioni:** una ripartizione viene inserita, modificata o rimossa.

**Flusso principale:**

1. Il sistema somma tutte le quote correnti di ciascuna fattura coinvolta.
2. Calcola importo saldato e residuo.
3. Determina lo stato risultante secondo il punto 9.
4. Aggiorna fatture e quote nella stessa operazione atomica.
5. Mostra all'operatore le transizioni applicate.

**Alternative e vincoli:**

- Una fattura a totale zero non riceve quote e rimane `emessa`.
- Il ritorno a importo saldato zero produce lo stato `emessa`, non `in immissione`.
- Lo stato non può essere modificato manualmente per correggere una ripartizione.

**Risultato:** ogni fattura rappresenta esattamente la somma delle quote correnti.

### Interazioni con gli altri ambiti

- Il punto 1 fornisce le identità e i dati correnti di cliente e agenzia.
- Il punto 9 definisce fatture associabili, residuo, stati e vincoli di ritiro.
- Il punto 10 fornisce gli incassi, i relativi dati contabili e i vincoli di modifica o eliminazione.
- Il punto 12 distingue la data civile dell'incasso dagli istanti tecnici delle operazioni di ripartizione.
- Il punto 13 utilizza importi attribuiti, non attribuiti, residui e stati nei resoconti e nelle esportazioni.

### Decisioni funzionali confermate

Sono confermati i seguenti comportamenti:

- per ogni coppia `incasso + fattura` esiste una sola associazione, la cui quota viene modificata senza creare duplicati;
- l'ordine iniziale della proposta è per data della fattura e identificativo crescenti, ma l'operatore può riordinare le fatture prima del calcolo;
- non esiste un vincolo cronologico tra data contabile dell'incasso e data della fattura associata;
- quando vengono aggiunte nuove fatture, la proposta utilizza soltanto l'importo non attribuito e non modifica le quote già registrate;
- la modifica manuale di una quota non ridistribuisce automaticamente la differenza sulle fatture successive;
- la parte non attribuita può rimanere sull'incasso senza scadenza e senza produrre uno stato contabile aggiuntivo;
- una fattura `saldata` non accetta nuove associazioni, ma le quote esistenti possono essere ridotte o rimosse;
- una fattura a totale zero non può ricevere quote;
- la disattivazione successiva di cliente o agenzia non impedisce associazioni compatibili, determinate mediante le identità stabili;
- la rimozione dell'ultima quota riporta la fattura a `emessa` e la rende eventualmente ritirabile, ma non avvia automaticamente il ritiro;
- ogni ripartizione multipla viene validata e salvata atomicamente; una variazione concorrente rende invalida l'intera operazione.

### Esito del punto

I casi d'uso coprono consultazione dell'incasso, ricerca delle fatture, proposta progressiva, modifica manuale, aggiunta successiva, modifica e rimozione delle quote, modifica dell'incasso e aggiornamento automatico delle fatture.

Le regole funzionali dell'ambito e le relative decisioni sono state confermate. Il punto è pertanto **completato**.


## 2.19 Punto 12 – Date, orari e fusi operativi

### Tema e perimetro

Il punto definisce la semantica dei valori temporali e il modo in cui l'applicazione interpreta, conserva, confronta e rappresenta date e orari. Distingue date civili, momenti operativi o economici e istanti tecnici, evitando dipendenze implicite dal fuso del sistema operativo o del database.

Comprende il fuso aziendale con funzione amministrativa e i fusi operativi autonomi dei porti, oltre alle versioni temporali dei fusi, ai cambi ordinari, alle correzioni di configurazioni errate, all'ora legale e solare, agli spostamenti tra porti e all'esportazione dei riferimenti temporali.

### Requisiti funzionali comuni

#### Tipologie di valori temporali

- I valori temporali appartengono a una delle seguenti categorie:
  - **data civile**, priva di orario e fuso;
  - **momento di dominio**, composto da data e ora locale con precisione al minuto e riferito a un fuso;
  - **istante tecnico**, generato automaticamente e conservato in UTC con precisione fino al millisecondo.
- Sono date civili almeno:
  - data della fattura;
  - data contabile dei movimenti;
  - data scelta per il calcolo dei saldi;
  - decorrenza giornaliera delle regole sull'intera fattura;
  - data di una festività.
- Una data civile non viene trasformata in una mezzanotte, non riceve un offset e non viene convertita in UTC.
- Sono momenti di dominio almeno operazioni nave, prestazioni, movimentazioni merci, partenza e arrivo degli spostamenti e decorrenze di tariffe, pesi, regole sulla singola prestazione e versioni anagrafiche.
- Secondi e frazioni di secondo non vengono inseriti né utilizzati nei confronti dei momenti di dominio.
- Gli istanti tecnici comprendono almeno creazione, ultima modifica, emissione effettiva e generazione delle esportazioni; non determinano i risultati di dominio salvo indicazione espressa.

#### Fuso aziendale e fusi dei porti

- Il fuso aziendale è identificato da un `ZoneId` IANA e il valore iniziale predefinito è `Europe/Rome`.
- Il fuso aziendale ha una funzione amministrativa, di visualizzazione e di aggregazione e non determina gli orari delle attività portuali.
- Il fuso aziendale determina:
  - data e anno correnti dell'applicazione;
  - interpretazione dei momenti non riferibili a un porto;
  - rappresentazione amministrativa degli istanti tecnici;
  - quando previsto dal resoconto, la giornata comune utilizzata per aggregazioni tra più porti.
- Ogni porto possiede un fuso IANA autonomo, inizialmente copiato dal fuso aziendale applicabile quando il porto viene creato.
- Le successive modifiche del fuso aziendale non modificano automaticamente il fuso dei porti esistenti.
- Il fuso del porto è la fonte temporale operativa e interpreta operazioni nave, prestazioni, movimentazioni merci, tariffe, condizioni orarie, festività e regole economiche riferite a quel porto.
- Per un'entrata il fuso deriva dal porto selezionato; per un'uscita deriva dal porto corrente della nave.
- Uno spostamento tra banchine utilizza il fuso del porto corrente per entrambi gli estremi; uno spostamento tra porti utilizza rispettivamente il fuso del porto di origine e quello del porto di destinazione.
- Se il porto competente non è derivabile, il sistema lo richiede all'operatore o impedisce il salvataggio; non applica mai implicitamente il fuso aziendale a un'attività portuale.
- La visualizzazione o l'aggregazione nel fuso aziendale non modifica i riferimenti temporali conservati per l'attività portuale.
- Il fuso del sistema operativo, della sessione applicativa o del database non viene utilizzato implicitamente.

#### Risoluzione e conservazione dei momenti di dominio

- Per ogni momento preciso vengono conservati stabilmente:
  - data e ora locale inserite;
  - `ZoneId` utilizzato;
  - offset applicato;
  - istante UTC risultante.
- L'istante UTC è il riferimento canonico per ordinamento, durata, sovrapposizioni e confronti tra momenti precisi.
- Valore locale, fuso e offset conservano il significato originario dell'inserimento e permettono di riprodurne la rappresentazione.
- Un aggiornamento delle regole internazionali IANA non reinterpreta gli elementi già registrati; i nuovi inserimenti utilizzano invece le regole disponibili al momento della risoluzione.
- Le interfacce operative mostrano normalmente il valore locale nel fuso conservato; fuso e offset vengono mostrati quando necessari a evitare ambiguità.
- Nella prima versione non è previsto un fuso personale o di sessione scelto dall'operatore.

#### Spostamenti tra porti

- La partenza viene inserita e interpretata nel fuso del porto di origine.
- L'arrivo viene inserito e interpretato nel fuso del porto di destinazione.
- I due valori locali possono quindi utilizzare fusi e offset differenti.
- Durata e ordine dello spostamento vengono verificati confrontando gli istanti UTC risolti.
- Lo spostamento è valido soltanto se l'istante UTC di arrivo è strettamente successivo a quello di partenza, anche quando i valori locali sembrano uguali o ordinati diversamente.

#### Ore inesistenti o ambigue

- Le regole di ora solare e legale appartengono al `ZoneId` IANA applicabile.
- Un'ora locale inesistente a causa dell'avanzamento dell'orologio viene respinta; il sistema mostra l'intervallo non valido e richiede un altro orario.
- Quando un'ora locale ricorre due volte, il sistema presenta le due occorrenze con il relativo offset e richiede una scelta esplicita.
- La scelta viene conservata mediante offset e istante UTC e non viene reinterpretata in seguito.
- L'unicità temporale delle operazioni nave viene verificata sul minuto dell'istante UTC risolto; le due occorrenze dello stesso minuto locale sono quindi momenti distinti.
- Anche i salti o le sovrapposizioni locali prodotti dal passaggio tra due versioni configurate di un fuso seguono le stesse regole di rifiuto o selezione esplicita.

#### Versioni dei fusi e cambi ordinari

- Il fuso aziendale e il fuso di ciascun porto possiedono una versione iniziale priva di limite temporale inferiore.
- Ogni versione successiva contiene:
  - un `ZoneId` IANA valido;
  - una decorrenza espressa come istante univoco completo di offset.
- Gli intervalli hanno inizio incluso e fine esclusa; la fine di una versione è derivata dalla decorrenza della successiva.
- Due versioni della stessa sequenza non possono condividere la medesima decorrenza.
- Possono essere inserite versioni passate, correnti, intermedie o future.
- Il sistema propone la decorrenza nel fuso precedentemente applicabile, ma la registra soltanto dopo che data, ora e offset identificano un istante univoco.
- Per risolvere un nuovo momento di dominio, il sistema utilizza la versione del fuso il cui intervallo contiene l'istante risultante.
- Un cambio ordinario determina il fuso utilizzato per le nuove risoluzioni, senza reinterpretare elementi già registrati, compresi quelli aventi una data futura.
- Una nuova versione retroattiva si applica quindi ai nuovi inserimenti riferiti al proprio intervallo, ma non cambia gli elementi preesistenti.

#### Modifica delle versioni dei fusi

- Una versione futura che non è mai stata utilizzata per risolvere alcun elemento può essere modificata o eliminata secondo le normali regole di sequenza.
- La versione iniziale non può essere eliminata.
- Una versione già utilizzata non può essere modificata o eliminata direttamente; deve essere trattata mediante la procedura di correzione del fuso.
- Prima della modifica o eliminazione di una versione futura non utilizzata, il sistema mostra l'intervallo risultante e verifica eventuali sovrapposizioni o duplicazioni di decorrenza.

#### Modifica di un elemento temporale

- La modifica di dati non temporali conserva valore locale, fuso, offset e istante UTC originari.
- La modifica della data o dell'ora locale, del porto o di un altro dato che determina il fuso avvia una nuova risoluzione mediante la versione applicabile al nuovo valore.
- La nuova risoluzione sostituisce atomicamente tutti e quattro i componenti temporali.
- La modifica viene bloccata se produce un'ora inesistente, non risolve un'ambiguità, viola la sequenza operativa o altera elementi consolidati.
- Un elemento consolidato conserva sempre il riferimento temporale utilizzato nel documento emesso.

#### Correzione di un fuso configurato erroneamente

- La correzione è distinta dall'inserimento di una nuova versione ordinaria.
- L'operatore seleziona la versione errata, il `ZoneId` corretto e l'intervallo da correggere.
- La simulazione conserva data e ora locale di ciascun elemento e ridetermina fuso, offset e istante UTC.
- Prima della conferma il sistema mostra:
  - configurazione precedente e corretta;
  - intervallo interessato;
  - elementi che cambiano istante, ordine, attribuzione o risultato economico;
  - elementi consolidati che impediscono l'operazione.
- Possono essere aggiornati soltanto elementi non consolidati o appartenenti esclusivamente a fatture `in immissione`.
- La correzione viene bloccata se modificherebbe dati o risultati di fatture `emesse`, `parzialmente saldate` o `saldate`.
- Configurazione, riferimenti temporali, ricostruzioni e ricalcoli vengono aggiornati atomicamente.

#### Date civili e istanti tecnici

- Il cambio del fuso aziendale può modificare il momento in cui l'applicazione considera iniziata una nuova giornata, ma non cambia le date civili già registrate.
- L'anno dell'identificativo della fattura continua a derivare dalla data civile della fattura.
- I saldi alla data utilizzano direttamente la data contabile, senza conversioni.
- Le versioni delle regole sull'intera fattura utilizzano la data civile della fattura e non l'istante tecnico di emissione.
- Gli istanti tecnici vengono generati dal sistema, memorizzati in UTC e visualizzati nel fuso aziendale applicabile alla consultazione.
- Il cambio del fuso aziendale può quindi cambiare la rappresentazione locale di un istante tecnico, senza modificarne il valore UTC.

#### Esportazione e interoperabilità

- L'esportazione di una data civile utilizza il solo formato di data, senza offset o indicazione UTC.
- Per un momento di dominio vengono esportati separatamente almeno:
  - valore locale;
  - `ZoneId`;
  - offset;
  - istante UTC.
- Gli istanti tecnici vengono esportati in UTC con la precisione disponibile.
- L'esportazione non sostituisce il fuso conservato con quello del dispositivo o della sessione che la genera.

### CU-TEM-01 – Registrare e utilizzare una data civile

**Obiettivo:** conservare una data priva di interpretazioni legate al fuso.

**Precondizioni:** l'ambito richiede una data civile.

**Flusso principale:**

1. L'operatore inserisce la data.
2. Il sistema valida il calendario senza applicare un fuso.
3. Conserva anno, mese e giorno come valore civile.
4. Utilizza direttamente il valore per fatture, contabilità, saldi, regole giornaliere o festività.

**Alternative e vincoli:**

- La data non viene convertita in UTC.
- Un cambio del fuso aziendale non modifica il valore.
- L'esportazione non aggiunge un orario fittizio.

**Risultato:** la data mantiene lo stesso significato civile in ogni ambiente.

### CU-TEM-02 – Registrare un momento operativo o economico

**Obiettivo:** trasformare un valore locale in un momento preciso e riproducibile.

**Precondizioni:** sono disponibili il contesto e la versione del fuso applicabile; per un'attività portuale è disponibile o derivabile il porto competente.

**Flusso principale:**

1. L'operatore inserisce data e ora locale con precisione al minuto.
2. Il sistema determina il fuso del porto competente oppure, esclusivamente per un momento non riferibile a un porto, il fuso aziendale.
3. Verifica validità e univocità dell'ora locale.
4. Determina offset e istante UTC.
5. Valida sequenze, sovrapposizioni e altri vincoli di dominio.
6. Salva atomicamente valore locale, `ZoneId`, offset e istante UTC.

**Alternative e vincoli:**

- Secondi e frazioni non sono accettati come dati di dominio.
- Un'ora inesistente o ambigua segue `CU-TEM-04`.
- Se il porto competente per un'attività portuale non è derivabile, il sistema lo richiede o impedisce il salvataggio senza utilizzare il fuso aziendale come ripiego.
- Il fuso del sistema operativo o del database non partecipa alla risoluzione.

**Risultato:** il momento può essere ordinato globalmente e riprodotto localmente.

### CU-TEM-03 – Risolvere uno spostamento tra porti

**Obiettivo:** interpretare correttamente partenza e arrivo appartenenti a fusi differenti.

**Precondizioni:** esistono porto di origine, porto di destinazione e relative versioni dei fusi.

**Flusso principale:**

1. L'operatore inserisce la partenza nel contesto del porto di origine.
2. Il sistema ne determina offset e istante UTC.
3. L'operatore inserisce l'arrivo nel contesto del porto di destinazione.
4. Il sistema ne determina offset e istante UTC.
5. Confronta i due istanti UTC e calcola la durata.
6. Salva separatamente i riferimenti temporali dei due estremi.

**Alternative e vincoli:**

- L'arrivo locale può apparire precedente alla partenza locale e risultare comunque successivo in UTC.
- Un arrivo UTC non successivo alla partenza viene respinto.
- Ognuno dei due estremi può richiedere la risoluzione di un'ora ambigua.

**Risultato:** lo spostamento possiede estremi coerenti e una durata non ambigua.

### CU-TEM-04 – Gestire un'ora inesistente o ambigua

**Obiettivo:** impedire interpretazioni automatiche non affidabili durante cambi di offset.

**Precondizioni:** il valore locale ricade in un intervallo anomalo del fuso applicabile.

**Flusso principale:**

1. Il sistema interroga le regole del `ZoneId` applicabile.
2. Se non esiste alcun offset valido, segnala l'ora inesistente e richiede un nuovo valore.
3. Se esistono due offset validi, mostra entrambe le occorrenze.
4. L'operatore seleziona la prima o la seconda.
5. Il sistema conserva offset e istante UTC corrispondenti.

**Alternative e vincoli:**

- Il sistema non sposta automaticamente un'ora inesistente a quella successiva.
- Il sistema non sceglie automaticamente una delle due occorrenze ambigue.
- L'unicità delle operazioni viene verificata dopo la scelta, sull'istante UTC.

**Risultato:** il momento è valido e rappresenta una sola occorrenza precisa.

### CU-TEM-05 – Configurare il fuso iniziale

**Obiettivo:** assegnare il fuso aziendale o il fuso autonomo di un nuovo porto.

**Precondizioni:** configurazione iniziale dell'applicazione oppure creazione di un porto.

**Flusso principale:**

1. Il sistema propone `Europe/Rome` per l'azienda oppure il fuso aziendale corrente per il porto.
2. L'operatore conferma o seleziona un altro `ZoneId` IANA valido.
3. Il sistema crea la versione iniziale priva di decorrenza.
4. Il fuso diventa disponibile per la risoluzione dei momenti di dominio.

**Alternative e vincoli:**

- Un offset fisso non sostituisce il `ZoneId` IANA.
- Il fuso del porto rimane autonomo dopo la creazione.
- La versione iniziale non può essere eliminata.

**Risultato:** esiste una sequenza temporale del fuso completa verso il passato.

### CU-TEM-06 – Inserire una versione ordinaria del fuso

**Obiettivo:** cambiare il fuso applicabile ai nuovi inserimenti da un istante definito.

**Precondizioni:** esiste la sequenza del fuso aziendale o del porto.

**Flusso principale:**

1. L'operatore seleziona il nuovo `ZoneId` IANA.
2. Inserisce la decorrenza con data, ora e offset univoci.
3. Il sistema verifica `ZoneId`, decorrenza e assenza di duplicati.
4. Mostra gli intervalli risultanti della sequenza.
5. L'operatore conferma.
6. Il sistema inserisce la versione senza reinterpretare gli elementi esistenti.

**Alternative e vincoli:**

- La versione può essere passata, intermedia, corrente o futura.
- Gli elementi futuri già registrati conservano il riferimento originario.
- I nuovi inserimenti retrodatati utilizzano la versione applicabile al relativo intervallo.

**Risultato:** le nuove risoluzioni utilizzano la sequenza aggiornata.

### CU-TEM-07 – Modificare o eliminare una versione futura non utilizzata

**Obiettivo:** correggere una configurazione futura prima che abbia prodotto riferimenti persistenti.

**Precondizioni:** la versione è futura, non è quella iniziale e non è mai stata utilizzata.

**Flusso principale:**

1. L'operatore modifica `ZoneId` o decorrenza oppure richiede l'eliminazione.
2. Il sistema verifica che nessun elemento sia stato risolto mediante la versione.
3. Simula la nuova sequenza e controlla le decorrenze.
4. L'operatore conferma.
5. Il sistema applica atomicamente la variazione.

**Alternative e vincoli:**

- Se la versione è stata utilizzata, l'operazione diretta viene impedita e viene proposta `CU-TEM-09`.
- La versione iniziale non è eliminabile.

**Risultato:** la sequenza viene aggiornata senza reinterpretare dati.

### CU-TEM-08 – Modificare i dati temporali di un elemento

**Obiettivo:** aggiornare consapevolmente il momento di dominio di un elemento esistente.

**Precondizioni:** l'elemento è modificabile secondo le regole del proprio ambito.

**Flusso principale:**

1. L'operatore modifica data, ora, porto o altro dato che determina il fuso.
2. Il sistema individua la versione applicabile al nuovo valore.
3. Risolve nuovamente offset e istante UTC.
4. Ricalcola attribuzioni, sequenze e risultati dipendenti.
5. Mostra gli effetti e richiede le conferme previste dall'ambito.
6. Salva atomicamente la variazione.

**Alternative e vincoli:**

- La modifica di soli dati non temporali non reinterpreta il momento.
- Un elemento consolidato o un risultato emesso incompatibile impediscono la modifica.
- Ore inesistenti e ambigue seguono `CU-TEM-04`.

**Risultato:** l'elemento usa un nuovo riferimento temporale completo oppure rimane invariato.

### CU-TEM-09 – Simulare e applicare la correzione di un fuso errato

**Obiettivo:** reinterpretare controllatamente elementi registrati con una configurazione sbagliata.

**Precondizioni:** è stata individuata una versione errata e il relativo intervallo.

**Flusso principale:**

1. L'operatore indica il `ZoneId` corretto e l'intervallo interessato.
2. Il sistema conserva per ogni elemento data e ora locale.
3. Simula nuovi offset e istanti UTC.
4. Ricostruisce ordine, attribuzioni e calcoli dipendenti.
5. Elenca elementi modificabili ed elementi consolidati bloccanti.
6. Se non esistono blocchi, l'operatore conferma.
7. Il sistema applica atomicamente configurazione, riferimenti e ricalcoli.

**Alternative e vincoli:**

- Se esiste anche un solo elemento consolidato incompatibile, nessuna modifica viene applicata.
- Gli elementi appartenenti esclusivamente a fatture `in immissione` possono essere ricalcolati.
- Un'ora divenuta inesistente o ambigua deve essere risolta prima della conferma finale.

**Risultato:** il fuso errato e tutti gli elementi consentiti risultano coerenti oppure restano invariati.

### CU-TEM-10 – Consultare ed esportare i riferimenti temporali

**Obiettivo:** rendere verificabile il significato dei valori temporali conservati.

**Precondizioni:** esiste almeno un elemento con dati temporali.

**Flusso principale:**

1. L'operatore consulta un elemento.
2. Il sistema mostra la data civile oppure il valore locale del momento di dominio.
3. Quando rilevante, mostra `ZoneId`, offset e istante UTC.
4. L'operatore richiede un'esportazione.
5. Il sistema produce i campi previsti per la categoria temporale.

**Alternative e vincoli:**

- Le date civili vengono esportate senza orario o offset.
- I momenti di dominio riportano valore locale, `ZoneId`, offset e UTC.
- Gli istanti tecnici vengono esportati in UTC.
- Nessun valore viene reinterpretato mediante il fuso del dispositivo che genera l'esportazione.

**Risultato:** consultazione ed esportazione conservano la semantica temporale originaria.

### Interazioni con gli altri ambiti

- Il punto 1 utilizza il fuso del porto per le decorrenze riferibili a quel porto e il fuso aziendale soltanto per quelle prive di un contesto portuale.
- I punti 2–6 utilizzano gli istanti UTC risolti per sequenze, permanenze e attribuzioni operative.
- Il punto 7 utilizza il fuso del porto per le decorrenze delle tariffe e i momenti economici.
- Il punto 8 utilizza giorno, festività e ora locale del porto per condizioni e versioni delle regole.
- Il punto 9 mantiene distinta la data civile della fattura dall'istante tecnico di emissione.
- I punti 10 e 11 utilizzano date contabili civili e istanti tecnici delle operazioni.
- Il punto 13 conserva fusi e riferimenti temporali nei resoconti e nelle esportazioni.
- Il punto 14 protegge configurazioni e dati temporali mediante backup e ripristino coerenti.

### Decisioni funzionali confermate

- Il fuso del porto è la fonte temporale operativa per tutte le attività riferibili a quel porto.
- Il fuso aziendale rimane disponibile per finalità amministrative, visualizzazione degli istanti tecnici, momenti non portuali e aggregazioni che richiedono una giornata aziendale comune.
- Il fuso aziendale non sostituisce mai implicitamente quello del porto: l'assenza di un porto necessario comporta la richiesta del dato o il blocco del salvataggio.
- Gli estremi di uno spostamento tra porti vengono interpretati separatamente nei fusi dei rispettivi porti e confrontati mediante i relativi istanti UTC.
- Il fuso del porto resta una configurazione temporale autonoma collegata al porto; il fuso aziendale costituisce soltanto il valore iniziale proposto alla creazione.
- la versione iniziale di ogni fuso non ha limite temporale inferiore e non può essere eliminata;
- la decorrenza di una versione successiva è un istante univoco completo di offset; l'interfaccia lo propone nel fuso precedentemente applicabile;
- un cambio ordinario non reinterpreta alcun elemento già registrato, compresi gli elementi futuri; una versione retroattiva vale soltanto per le nuove risoluzioni;
- la modifica di un dato temporale o del porto ricalcola fuso, offset e UTC mediante la versione applicabile, mentre la modifica di dati non temporali conserva il riferimento originario;
- una versione futura mai utilizzata può essere modificata o eliminata direttamente; una versione già utilizzata richiede la procedura di correzione;
- gli aggiornamenti delle regole IANA non modificano i riferimenti già persistiti, ma vengono utilizzati per le nuove risoluzioni;
- nella prima versione dell'applicazione non esiste un fuso personale o di sessione: i momenti di dominio sono mostrati nel proprio fuso conservato e gli istanti tecnici nel fuso aziendale;
- le ore inesistenti vengono respinte e quelle ambigue richiedono sempre la scelta esplicita dell'offset, anche quando l'anomalia deriva da un cambio configurato del fuso;
- la correzione di un fuso errato conserva il valore locale, ricalcola offset e UTC ed è impedita se modifica elementi consolidati;
- l'esportazione dei momenti di dominio contiene separatamente valore locale, `ZoneId`, offset e istante UTC, mentre le date civili rimangono prive di fuso.

### Esito del punto

I casi d'uso coprono date civili, momenti di dominio, spostamenti tra porti, ore inesistenti o ambigue, configurazione e versioni dei fusi, modifiche temporali, correzioni controllate, consultazione ed esportazione.

Le regole funzionali dell'ambito e tutte le relative decisioni sono state confermate. Il punto è pertanto **completato**.

## 2.20 Punto 13 – Resoconti ed esportazioni

### Tema e perimetro

Il punto definisce la costruzione, l'esecuzione, la consultazione e l'esportazione dei resoconti. L'obiettivo è consentire analisi operative, economiche e contabili flessibili senza esporre query libere e senza alterare la semantica dei dati o duplicare importi attraverso collegamenti non compatibili.

Comprende la scelta dell'ambito e della granularità, dimensioni e misure, filtri e ordinamenti, riferimenti temporali, dati storici e consolidati, configurazioni predefinite o personalizzate, consultazione degli elementi sottostanti, esportazione `CSV` e `XLSX` e impiego controllato di eventuali dati derivati.

### Requisiti funzionali comuni

#### Natura e coerenza del resoconto

- I resoconti sono esclusivamente consultivi e non modificano gli elementi dai quali derivano.
- Ogni esecuzione utilizza una vista coerente dei dati: uno stesso risultato non può combinare valori precedenti e successivi a modifiche applicate durante il calcolo.
- Il risultato viene calcolato nuovamente a ogni esecuzione sulla base dei dati disponibili in quel momento e non costituisce uno storico autonomo.
- L'istante tecnico di generazione viene mostrato nel risultato e conservato nell'esportazione.
- Un'esportazione costituisce invece una rappresentazione stabile del risultato prodotto in quello specifico istante.

#### Ambito e granularità

- Ogni configurazione possiede un solo ambito principale e una granularità esplicita, che definisce il significato di ogni riga.
- Gli ambiti inizialmente disponibili sono:
  - viaggi e permanenze;
  - attività;
  - movimentazioni merci;
  - fatturazione;
  - incassi e crediti;
  - conti finanziari;
  - spese;
  - voci contabili;
  - calcoli economici.
- Per ogni ambito sono disponibili soltanto le granularità previste dal dominio, come viaggio, visita, ormeggio, prestazione, fattura, riga di fattura, quota di incasso o movimento.
- L'aggiunta di una colonna, di un filtro o di una misura non modifica implicitamente l'ambito o la granularità.
- Per cambiare ambito o granularità il sistema richiede una scelta esplicita e rivalida l'intera configurazione.

#### Dimensioni, collegamenti e misure

- L'applicazione espone un catalogo controllato di dimensioni, misure, filtri e collegamenti compatibili con l'ambito selezionato.
- L'operatore non può inserire query, frammenti SQL o formule arbitrarie.
- Ogni dimensione specifica:
  - il dato rappresentato;
  - il livello di dettaglio al quale può essere utilizzata;
  - gli operatori di filtro disponibili;
  - le modalità di raggruppamento e ordinamento consentite.
- Ogni misura specifica:
  - il valore elementare dal quale deriva;
  - le funzioni ammesse, come conteggio, somma, media, minimo o massimo;
  - le granularità con le quali mantiene il proprio significato.
- Le misure specifiche comprendono, quando applicabili, quantità di merce, importi originari e netti, maggiorazioni, sconti, fatturato, incassato, residui, entrate, uscite, saldi, costi dei giroconti e durate operative.
- Le quantità di merci differenti non possono produrre un totale comune finché non è gestita un'unità di misura esplicita.

#### Prevenzione delle duplicazioni

- Prima dell'esecuzione il sistema valida tutti i collegamenti richiesti e impedisce quelli che moltiplicherebbero le righe o conterebbero più volte lo stesso valore.
- In particolare:
  - il totale di una fattura non può essere sommato nuovamente insieme alle relative righe;
  - l'importo complessivo di un incasso non viene ripetuto per ciascuna quota attribuita;
  - le quote attribuite e la parte non attribuita vengono rappresentate separatamente;
  - i movimenti appartenenti a più voci contabili non generano totali trasversali tra le voci;
  - i livelli padre e figlio delle categorie di spesa non duplicano lo stesso movimento nel totale complessivo.
- Un collegamento incompatibile può essere reso disponibile soltanto come consultazione separata degli elementi sottostanti.
- La configurazione non può essere eseguita finché contiene una combinazione semanticamente non valida.

#### Filtri, raggruppamenti e ordinamenti

- I filtri disponibili dipendono dal tipo del campo e comprendono, quando applicabili, uguaglianza, esclusione, selezione multipla, intervallo, presenza o assenza, ricerca testuale e stato attivo o disattivato.
- Più filtri sullo stesso campo e su campi differenti possono essere combinati secondo le modalità offerte dall'interfaccia, senza espressioni logiche arbitrarie.
- Le dimensioni selezionate possono essere utilizzate come colonne semplici o come livelli di raggruppamento ordinati.
- I subtotali vengono calcolati per i livelli di raggruppamento configurati e il totale generale considera l'intero risultato filtrato.
- Ogni configurazione può definire più ordinamenti con priorità esplicita.
- L'ordinamento finale è sempre deterministico e utilizza, quando necessario, l'identificativo stabile come ultimo criterio tecnico.

#### Riferimenti temporali

- Quando un ambito possiede più date possibili, la configurazione indica esplicitamente quella utilizzata per filtri e raggruppamenti.
- Sono disponibili almeno:
  - data civile o istante effettivo di emissione per le fatture;
  - partenza o arrivo per gli spostamenti;
  - data contabile per incassi e altri movimenti;
  - istante economico per le attività;
  - data civile selezionata per i saldi.
- Un intervallo espresso mediante date civili comprende entrambe le date indicate.
- Un intervallo espresso mediante momenti precisi utilizza un estremo iniziale incluso e un estremo finale escluso.
- Per le attività, il calendario operativo utilizza il giorno locale del porto; per le viste amministrative consolidate può essere selezionato il calendario comune determinato dal fuso aziendale.
- Gli elementi con data futura sono esclusi per impostazione predefinita, salvo attivazione esplicita del relativo filtro.

#### Durate di elementi aperti

- Per un viaggio, una visita o un ormeggio chiuso, la durata deriva dai relativi estremi registrati.
- Per un elemento ancora aperto, la configurazione utilizza un istante di riferimento esplicito.
- Il valore predefinito è l'istante corrente al momento dell'esecuzione, ma la configurazione può indicare un riferimento differente.
- Risultato ed esportazione mostrano l'istante effettivamente utilizzato, affinché la durata sia riproducibile.

#### Dati storici e consolidati

- Le dimensioni anagrafiche utilizzano l'identità stabile dell'entità e non creano soggetti distinti a seguito di una variazione descrittiva.
- Le righe di dettaglio mostrano i valori anagrafici storicamente applicabili alla data e all'ora dell'elemento.
- Una configurazione può separare esplicitamente le versioni temporali della stessa anagrafica.
- Quando un'unica riga aggrega elementi appartenenti a versioni anagrafiche differenti, il sistema mantiene l'identità stabile e rende riconoscibile la presenza di variazioni storiche.
- Le fatture emesse utilizzano sempre i valori consolidati al momento dell'emissione.
- Conti, categorie di spesa e voci contabili utilizzano il valore corrente, poiché non possiedono versioni temporali.

#### Visualizzazione dei risultati

- Il risultato mostra colonne, raggruppamenti, subtotali, totale generale e numero complessivo delle righe secondo la configurazione.
- Paginazione e dimensione della pagina non modificano aggregazioni, totali o ordinamento logico.
- Da ogni riga aggregata è possibile consultare gli elementi elementari che la compongono mantenendo gli stessi filtri e il medesimo riferimento temporale.
- La consultazione dal resoconto è in sola lettura; l'eventuale passaggio alla funzione ordinaria dell'elemento rispetta le regole di modifica del relativo ambito.
- Un risultato privo di righe mostra comunque configurazione, filtri applicati e totale nullo quando semanticamente previsto.

#### Configurazioni predefinite e personalizzate

- L'applicazione fornisce configurazioni predefinite pronte all'uso.
- Le configurazioni predefinite non possono essere modificate o eliminate direttamente; possono essere duplicate per produrre una configurazione personalizzata.
- Durante l'esecuzione l'operatore può variare parametri come periodo, porto, cliente o agenzia senza sovrascrivere la definizione predefinita.
- Per conservare i parametri variati o qualsiasi modifica strutturale deve duplicare la configurazione e salvare la copia personalizzata.
- Ogni configurazione personalizzata conserva nome, ambito, granularità, riferimento temporale, colonne, misure, filtri, raggruppamenti, ordinamenti e impostazioni di visualizzazione.
- Il nome di una configurazione personalizzata deve essere univoco nell'applicazione.
- Le configurazioni personalizzate possono essere create, duplicate, rinominate, modificate ed eliminate.
- Non essendo previsti utenti nella prima versione, tutte le configurazioni sono globali e disponibili a ogni operatore.
- Il salvataggio conserva la definizione del resoconto, non il risultato prodotto dall'ultima esecuzione.

#### Compatibilità delle configurazioni

- Ogni configurazione viene validata prima del salvataggio e prima di ogni esecuzione.
- Se un'evoluzione del modello rende una configurazione incompatibile, il sistema la conserva ma la contrassegna come non valida.
- Il sistema indica dimensioni, misure, filtri o collegamenti non più disponibili.
- Una configurazione incompatibile non viene reinterpretata automaticamente e non può essere eseguita finché non viene corretta.
- L'operatore può duplicarla, correggerla oppure eliminarla; le configurazioni predefinite vengono aggiornate insieme all'applicazione.

#### Esportazione

- Sono disponibili i formati `CSV` e `XLSX`; la stampa delle fatture rimane una funzione distinta e non costituisce un resoconto tabellare.
- L'esportazione comprende l'intero risultato filtrato, indipendentemente dalla pagina visualizzata.
- L'operatore sceglie esplicitamente se esportare:
  - il risultato aggregato così come configurato;
  - gli elementi di dettaglio sottostanti.
- L'ordine delle righe e delle colonne coincide con quello della configurazione eseguita.
- Le celle numeriche, monetarie e temporali mantengono il proprio tipo e la precisione di dominio; la formattazione visiva non altera il valore esportato.
- Ogni esportazione comprende metadati relativi almeno a configurazione, ambito, granularità, filtri, riferimento temporale, fuso o calendario utilizzato, istante di generazione e riferimento impiegato per le durate aperte.
- Un'esportazione priva di risultati contiene comunque intestazioni e metadati.

#### Prestazioni e dati derivati

- Nella prima versione i risultati vengono calcolati dai dati elementari persistiti.
- Paginazione, ordinamento e aggregazioni devono essere eseguiti senza caricare obbligatoriamente in memoria l'intero insieme dei dati.
- Eventuali cache, viste o proiezioni aggregate introdotte successivamente rimangono dati derivati ricostruibili.
- Una proiezione non aggiornata non può essere presentata come risultato definitivo; il sistema deve aggiornarla oppure calcolare il risultato dai dati elementari.
- L'introduzione di un'ottimizzazione non può cambiare il risultato funzionale della stessa configurazione applicata agli stessi dati.

### CU-RES-01 – Creare la struttura di un resoconto

**Obiettivo:** definire una configurazione semanticamente valida.

**Precondizioni:** sono disponibili il catalogo degli ambiti e i relativi campi.

**Flusso principale:**

1. L'operatore sceglie ambito e granularità.
2. Il sistema propone dimensioni, misure e collegamenti compatibili.
3. L'operatore seleziona colonne e misure.
4. Definisce eventuali raggruppamenti e subtotali.
5. Il sistema valida la configurazione e mostra un'anteprima della struttura.

**Alternative e vincoli:**

- Il cambio di ambito o granularità richiede la rivalidazione di tutti gli elementi già scelti.
- Una combinazione che duplicherebbe righe o importi viene respinta con l'indicazione del conflitto.
- Nessun campo non esposto dal catalogo controllato può essere aggiunto.

**Risultato:** esiste una struttura eseguibile oppure la configurazione rimane incompleta con errori espliciti.

### CU-RES-02 – Configurare filtri e riferimenti temporali

**Obiettivo:** delimitare in modo riproducibile i dati da analizzare.

**Precondizioni:** esiste una struttura valida del resoconto.

**Flusso principale:**

1. L'operatore seleziona il riferimento temporale applicabile all'ambito.
2. Inserisce l'intervallo e gli altri filtri.
3. Sceglie, quando previsto, calendario operativo del porto o calendario aziendale comune.
4. Decide se includere gli elementi futuri.
5. Definisce gli ordinamenti con la relativa priorità.
6. Il sistema valida valori e combinazioni.

**Alternative e vincoli:**

- Le date civili e i momenti precisi seguono semantiche di intervallo differenti.
- Un filtro su un dato anagrafico temporale viene valutato rispetto alla versione applicabile all'elemento.
- Un filtro non compatibile con l'ambito non viene proposto.

**Risultato:** la configurazione identifica un insieme di dati deterministico.

### CU-RES-03 – Eseguire e consultare un resoconto

**Obiettivo:** produrre risultati coerenti dai dati correnti.

**Precondizioni:** la configurazione è valida.

**Flusso principale:**

1. L'operatore richiede l'esecuzione.
2. Il sistema acquisisce una vista coerente dei dati.
3. Applica filtri, collegamenti e riferimento temporale.
4. Calcola righe, misure, subtotali e totale generale.
5. Applica l'ordinamento deterministico.
6. Mostra risultato, filtri, istante di generazione e numero complessivo delle righe.

**Alternative e vincoli:**

- Il risultato può essere vuoto.
- La paginazione non modifica i totali.
- Se la configurazione non è più valida, l'esecuzione viene impedita e segue `CU-RES-08`.

**Risultato:** il resoconto mostra un risultato coerente riferito a uno specifico istante di generazione.

### CU-RES-04 – Calcolare le durate degli elementi aperti

**Obiettivo:** rendere deterministiche le durate prive di un estremo finale.

**Precondizioni:** il resoconto comprende durate di viaggi, visite o ormeggi.

**Flusso principale:**

1. Il sistema individua gli elementi ancora aperti.
2. Propone come riferimento l'istante corrente.
3. L'operatore può indicare un istante differente.
4. Il sistema calcola le durate mediante gli istanti UTC.
5. Mostra il riferimento utilizzato insieme al risultato.

**Alternative e vincoli:**

- Un riferimento precedente all'inizio dell'elemento viene respinto.
- Una nuova esecuzione con riferimento corrente può produrre durate differenti.
- L'esportazione conserva il riferimento effettivo.

**Risultato:** ogni durata è accompagnata dall'informazione necessaria a riprodurla.

### CU-RES-05 – Consultare gli elementi sottostanti

**Obiettivo:** verificare la composizione di una riga o di un totale aggregato.

**Precondizioni:** il risultato contiene almeno una riga aggregata o un totale.

**Flusso principale:**

1. L'operatore seleziona la riga, il subtotale o il totale.
2. Il sistema eredita filtri, riferimento temporale e vincoli della configurazione.
3. Determina gli elementi elementari che hanno contribuito al valore.
4. Mostra il dettaglio in sola lettura senza duplicazioni.
5. L'operatore può aprire la normale funzione di consultazione di un elemento.

**Alternative e vincoli:**

- Il dettaglio non aggiunge elementi esclusi dal risultato aggregato.
- La possibilità di modificare l'elemento non dipende dal resoconto, ma dalle regole del relativo ambito.
- I collegamenti non aggregabili possono essere mostrati in una vista separata.

**Risultato:** la provenienza del valore aggregato è verificabile.

### CU-RES-06 – Salvare una configurazione personalizzata

**Obiettivo:** rendere riutilizzabile la definizione di un resoconto.

**Precondizioni:** la configurazione è valida.

**Flusso principale:**

1. L'operatore richiede il salvataggio.
2. Inserisce un nome univoco.
3. Il sistema valida nuovamente la configurazione.
4. Salva struttura, filtri e impostazioni, escludendo il risultato corrente.
5. La configurazione diventa disponibile globalmente.

**Alternative e vincoli:**

- Un nome duplicato viene respinto oppure richiede l'esplicita modifica della configurazione esistente.
- Il salvataggio non crea uno snapshot dei dati.

**Risultato:** la configurazione può essere rieseguita sui dati disponibili in futuro.

### CU-RES-07 – Gestire configurazioni predefinite e personalizzate

**Obiettivo:** organizzare le configurazioni disponibili senza alterare quelle fornite dal sistema.

**Precondizioni:** esiste almeno una configurazione.

**Flusso principale:**

1. L'operatore consulta l'elenco delle configurazioni.
2. Seleziona una configurazione personalizzata.
3. La rinomina, duplica, modifica o elimina.
4. Il sistema verifica nome e validità della configurazione risultante.
5. Applica l'operazione richiesta.

**Alternative e vincoli:**

- Una configurazione predefinita può essere eseguita o duplicata, ma non modificata o eliminata.
- I parametri di esecuzione di una configurazione predefinita possono essere variati temporaneamente senza modificare la configurazione salvata.
- L'eliminazione di una configurazione personalizzata non elimina dati né esportazioni già prodotte.
- Non esistono configurazioni private nella prima versione.

**Risultato:** l'elenco globale delle configurazioni viene aggiornato.

### CU-RES-08 – Correggere una configurazione incompatibile

**Obiettivo:** impedire l'esecuzione silenziosa di una definizione divenuta semanticamente non valida.

**Precondizioni:** una configurazione salvata contiene elementi non più disponibili o compatibili.

**Flusso principale:**

1. Il sistema contrassegna la configurazione come non valida.
2. Elenca campi, misure, filtri o collegamenti incompatibili.
3. L'operatore duplica o modifica la configurazione.
4. Rimuove o sostituisce esplicitamente gli elementi indicati.
5. Il sistema rivalida e salva la configurazione corretta.

**Alternative e vincoli:**

- Il sistema non sostituisce automaticamente un campo con uno simile.
- L'operatore può eliminare una configurazione personalizzata incompatibile.
- Le configurazioni predefinite vengono corrette mediante aggiornamento dell'applicazione.

**Risultato:** la configurazione torna eseguibile oppure rimane conservata come non valida.

### CU-RES-09 – Esportare il risultato configurato

**Obiettivo:** produrre una rappresentazione tabellare completa del risultato aggregato.

**Precondizioni:** il resoconto è stato eseguito.

**Flusso principale:**

1. L'operatore seleziona `CSV` o `XLSX`.
2. Conferma l'esportazione del risultato configurato.
3. Il sistema esegue nuovamente la configurazione su una vista coerente dei dati disponibili al momento dell'esportazione.
4. Produce tutte le righe filtrate nell'ordine configurato, indipendentemente dalla pagina corrente.
5. Aggiunge intestazioni e metadati.
6. Salva il file nella destinazione scelta dall'operatore.

**Alternative e vincoli:**

- Un risultato vuoto produce comunque intestazioni e metadati.
- Valori numerici e temporali non vengono convertiti in semplici testi quando il formato consente tipi nativi.
- Se i dati sono cambiati dopo l'esecuzione visualizzata, il file può differire dalla schermata precedente; l'istante di generazione identifica la nuova esecuzione utilizzata.

**Risultato:** il file rappresenta in modo verificabile il risultato completo esportato.

### CU-RES-10 – Esportare il dettaglio sottostante

**Obiettivo:** esportare gli elementi elementari che compongono il risultato senza confonderli con le righe aggregate.

**Precondizioni:** il resoconto è stato eseguito e possiede un dettaglio consultabile.

**Flusso principale:**

1. L'operatore sceglie l'esportazione del dettaglio.
2. Il sistema applica gli stessi filtri e lo stesso riferimento temporale del resoconto.
3. Determina le colonne elementari compatibili con l'ambito.
4. Produce tutte le righe di dettaglio con ordinamento deterministico.
5. Aggiunge i metadati che identificano la configurazione di origine.

**Alternative e vincoli:**

- Le righe aggregate e quelle di dettaglio non vengono mescolate nello stesso insieme tabellare.
- I collegamenti che produrrebbero duplicazioni restano esclusi o vengono esportati in insiemi separati.
- L'esportazione non modifica gli elementi inclusi.

**Risultato:** il dettaglio esportato permette di verificare la composizione del resoconto.

### Interazioni con gli altri ambiti

- I punti 1–6 forniscono identità anagrafiche, sequenze operative, attività e movimentazioni merci.
- I punti 7 e 8 forniscono importi calcolati, tariffe, pesi, regole e sconti applicati.
- Il punto 9 fornisce fatture, righe, stati e valori consolidati.
- I punti 10 e 11 forniscono movimenti, saldi, classificazioni, incassi, quote e residui.
- Il punto 12 determina la semantica di date, istanti e fusi utilizzata da filtri, raggruppamenti ed esportazioni.
- Il punto 14 protegge configurazioni ed eventuali dati derivati mediante backup e ripristino.

### Decisioni funzionali confermate

Sono confermati i seguenti comportamenti:

1. Il sistema include inizialmente configurazioni predefinite per permanenze e attività per porto, movimentazioni merci, fatturato, crediti e incassi, movimenti e saldi dei conti, spese per categoria, consultazione di una singola voce contabile e dettaglio dei calcoli economici.
2. Le configurazioni predefinite sono immutabili, ma i relativi parametri possono essere variati durante la singola esecuzione senza sovrascriverle; per conservare variazioni o modifiche strutturali devono essere duplicate. Le configurazioni personalizzate sono globali e hanno un nome univoco.
3. I risultati non vengono salvati: ogni esecuzione legge una vista coerente dei dati correnti. Soltanto il file esportato rappresenta uno snapshot stabile.
4. Gli elementi futuri sono esclusi per impostazione predefinita e possono essere inclusi mediante un filtro esplicito.
5. Gli intervalli di date civili comprendono entrambi gli estremi; gli intervalli di momenti precisi hanno inizio incluso e fine esclusa.
6. Le attività utilizzano per impostazione predefinita il calendario locale del porto; nei resoconti tra più porti può essere selezionato il calendario aziendale comune.
7. Le righe di dettaglio mostrano i valori anagrafici storici. Un raggruppamento per identità stabile che comprende più versioni usa un'unica riga con codice e denominazione corrente, segnala la presenza di variazioni e può essere separato per versione su richiesta.
8. Le durate aperte utilizzano per impostazione predefinita l'istante corrente dell'esecuzione; è possibile fissare un riferimento differente, sempre mostrato ed esportato.
9. La consultazione degli elementi sottostanti parte in sola lettura; l'eventuale modifica avviene soltanto aprendo la funzione ordinaria dell'elemento.
10. L'esportazione comprende sempre l'intero risultato filtrato e richiede di scegliere tra risultato aggregato e dettaglio. Nella prima versione sono previsti `CSV` e `XLSX`, non un formato PDF generico.
11. Il file `XLSX` contiene almeno i fogli `Dati` e `Metadati`; l'esportazione `CSV` produce un archivio contenente `dati.csv` e `metadati.csv`, così da mantenere il file dei dati puramente tabellare.
12. Una configurazione incompatibile viene conservata ma disabilitata finché non viene corretta esplicitamente; non vengono applicate sostituzioni automatiche.
13. Nella prima versione non sono previste cache o proiezioni persistenti dei resoconti. Se introdotte successivamente, devono essere ricostruibili e non possono produrre risultati differenti dai dati elementari.
14. Ogni esportazione riesegue la configurazione sui dati correnti e registra il proprio istante di generazione; non dipende dalla pagina visualizzata né conserva implicitamente una precedente esecuzione in memoria.

### Esito del punto

I casi d'uso coprono costruzione ed esecuzione dei resoconti, filtri e riferimenti temporali, durate aperte, dettaglio degli aggregati, configurazioni salvabili, incompatibilità ed esportazioni aggregate o analitiche.

Le regole funzionali dell'ambito e tutte le relative decisioni sono state confermate. Il punto è pertanto **completato**.


## 2.21 Punto 14 – Configurazioni generali, backup e ripristino

### Tema e perimetro

Il punto definisce l'inizializzazione dell'applicazione, le configurazioni tecniche trasversali e la protezione completa dei dati mediante backup e ripristino. L'obiettivo è mantenere l'applicazione portabile e utilizzabile senza connessione, riducendo il rischio di perdita o corruzione dei dati e impedendo ripristini parziali o incompatibili.

Il backup è distinto dalle esportazioni del punto 13: rappresenta l'intero stato persistente necessario a riaprire l'applicazione, mentre `CSV` e `XLSX` sono documenti di consultazione e non possono essere reimportati per ricostruire il sistema.

### Requisiti funzionali comuni

#### Inizializzazione e directory dei dati

- L'applicazione utilizza una sola directory attiva dei dati, contenente il database e le configurazioni persistenti necessarie al funzionamento.
- Nell'installazione portabile viene proposta una directory relativa alla posizione dell'applicazione, in modo che lo spostamento dell'intera cartella mantenga validi i riferimenti interni.
- Al primo avvio l'operatore può confermare la directory proposta oppure sceglierne un'altra.
- Prima dell'inizializzazione il sistema verifica almeno:
  - esistenza o possibilità di creazione della directory;
  - permessi di lettura e scrittura;
  - spazio disponibile sufficiente;
  - assenza di un archivio dati già presente che verrebbe sovrascritto;
  - possibilità di acquisire l'utilizzo esclusivo richiesto dal database locale.
- La creazione del database, dello schema e dei valori iniziali avviene in un'area temporanea e diventa attiva soltanto dopo il completamento di tutte le verifiche.
- Se viene individuato un archivio esistente, il sistema non lo sovrascrive e tenta invece di riconoscerlo, verificarlo e aprirlo.
- Un archivio corrotto o incompatibile non viene sostituito automaticamente con un database vuoto.
- Dopo l'inizializzazione, il cambio della directory attiva dei dati non costituisce una semplice modifica di configurazione: richiede il trasferimento dell'intera installazione portabile oppure un backup e un ripristino controllato nella nuova posizione.

#### Configurazioni generali

- Le configurazioni generali comprendono soltanto impostazioni tecniche o di comportamento non già governate da uno specifico ambito, tra cui:
  - directory predefinita dei backup automatici;
  - attivazione e politica dei backup automatici;
  - numero massimo di backup automatici conservati;
  - directory iniziale proposta per le esportazioni;
  - preferenze di visualizzazione prive di effetti economici, contabili o storici.
- Le configurazioni che possiedono una semantica di dominio continuano a essere gestite nelle rispettive funzioni. In particolare, fusi, festività, tariffe, pesi, regole economiche, anagrafiche e classificazioni non possono essere modificati mediante una generica impostazione tecnica.
- Le configurazioni generali sono globali, poiché nella prima versione non sono previsti utenti o profili personali.
- Ogni modifica viene validata prima dell'applicazione e salvata atomicamente.
- Se una modifica non è valida o non può essere persistita, tutte le configurazioni mantengono i valori precedenti.
- Le configurazioni generali non possiedono versioni temporali né uno storico dettagliato; conservano gli istanti tecnici di creazione e ultima modifica.

#### Contenuto del backup

- Ogni backup completo contiene tutto ciò che è necessario per ripristinare lo stato persistente dell'applicazione:
  - database completo;
  - configurazioni generali;
  - configurazioni personalizzate dei resoconti;
  - versioni e dati di dominio;
  - eventuali file persistenti gestiti dall'applicazione che non siano ricostruibili dal database;
  - manifesto tecnico e informazioni di compatibilità.
- Non vengono inclusi:
  - eseguibili e librerie dell'applicazione;
  - altri backup;
  - esportazioni `CSV`, `XLSX` o documenti salvati esternamente;
  - file temporanei;
  - cache e proiezioni integralmente ricostruibili;
  - log non necessari al ripristino.
- Il manifesto del backup contiene almeno:
  - identificativo univoco;
  - tipo `manuale`, `automatico` o `pre-ripristino`;
  - istante UTC e rappresentazione nel fuso aziendale della creazione;
  - versione dell'applicazione;
  - versione dello schema dei dati;
  - dimensione e inventario dei componenti inclusi;
  - impronte di integrità dei contenuti.
- Il backup è un archivio unico con formato ed estensione dedicati, non modificabile mediante normali strumenti tabellari.

#### Coerenza e pubblicazione del backup

- Il backup deve rappresentare una vista coerente dei dati, anche se la creazione viene richiesta mentre l'applicazione è aperta.
- Durante l'acquisizione dello stato, il sistema impedisce temporaneamente nuove modifiche; le normali consultazioni possono continuare quando il motore dati lo consente senza compromettere la coerenza.
- L'archivio viene prima costruito in un file temporaneo.
- Prima di renderlo disponibile, il sistema verifica manifesto, impronte, leggibilità e consistenza del database contenuto.
- Soltanto un archivio verificato viene pubblicato atomicamente con il nome definitivo e registrato come backup valido.
- Un errore o un'interruzione non deve lasciare un file parziale presentato come utilizzabile.
- La riuscita del backup non può essere dichiarata finché la scrittura e la verifica finale non sono completate.

#### Backup manuali, automatici e di sicurezza

- L'operatore può creare in qualsiasi momento un backup manuale scegliendo la destinazione.
- I backup automatici utilizzano una directory configurata e vengono eseguiti al massimo una volta al giorno, dopo la verifica iniziale del database e prima della prima modifica ai dati, purché lo stato sia cambiato rispetto all'ultimo backup riuscito.
- Se l'applicazione non viene avviata, non è richiesto un servizio esterno che esegua backup in background.
- Prima di sostituire i dati correnti mediante un ripristino, il sistema crea obbligatoriamente un backup di sicurezza di tipo `pre-ripristino`.
- I backup automatici sono soggetti alla politica di conservazione configurata.
- I backup manuali e quelli `pre-ripristino` non vengono eliminati automaticamente.
- La directory predefinita può trovarsi accanto ai dati per garantire la portabilità, ma il sistema segnala quando dati e backup risiedono sullo stesso volume e raccomanda una destinazione esterna.
- L'indisponibilità della directory dei backup automatici non impedisce le normali registrazioni, ma produce un avviso persistente fino al ripristino di una protezione valida.
- L'impossibilità di creare il backup `pre-ripristino` impedisce invece il ripristino dei dati.

#### Inventario e verifica dei backup

- L'applicazione elenca i backup presenti nella directory configurata e permette di selezionare anche un archivio da un'altra posizione.
- Per ciascun archivio mostra almeno tipo, data e ora, versione dell'applicazione e dello schema, dimensione e stato di verifica.
- Gli stati comprendono almeno:
  - `valido`;
  - `non ancora verificato`;
  - `non valido`;
  - `incompatibile con questa versione`.
- La verifica può essere richiesta senza modificare i dati correnti.
- La verifica controlla almeno manifesto, impronte dei file, leggibilità del database, vincoli strutturali e coerenza minima dei riferimenti.
- Un backup non valido rimane visibile e non viene eliminato automaticamente.
- L'esito indica gli errori rilevati senza tentare correzioni sul file originale.

#### Compatibilità

- Un backup prodotto dalla stessa versione dell'applicazione e dello schema è direttamente ripristinabile se supera la verifica.
- Un backup con schema precedente può essere ripristinato soltanto quando l'applicazione corrente possiede tutte le migrazioni necessarie.
- Le migrazioni vengono applicate esclusivamente alla copia temporanea destinata al ripristino, senza modificare il backup originale.
- Un backup prodotto da una versione dei dati più recente dell'applicazione corrente viene segnalato come incompatibile e non può essere ripristinato.
- Non sono previsti downgrade automatici dello schema.
- Un aggiornamento dell'applicazione non deve reinterpretare o modificare i dati consolidati oltre alle trasformazioni strutturali esplicitamente previste dalla migrazione.

#### Ripristino completo

- Il ripristino sostituisce l'intero stato persistente dell'applicazione e non esegue fusioni, importazioni parziali o selezioni di singole entità.
- Prima della conferma il sistema:
  - verifica integralmente il backup scelto;
  - controlla la compatibilità;
  - mostra origine, data, versione e contenuto generale dell'archivio;
  - avvisa che lo stato attivo verrà sostituito;
  - crea e verifica il backup `pre-ripristino` quando esistono dati correnti;
  - richiede una conferma esplicita.
- Il ripristino viene eseguito in modalità esclusiva, impedendo consultazioni e modifiche concorrenti.
- I contenuti vengono estratti in un'area temporanea, eventualmente migrati e verificati prima di sostituire l'archivio attivo.
- La sostituzione finale avviene atomicamente quando il filesystem e il database lo consentono.
- Dopo la sostituzione il sistema verifica nuovamente integrità strutturale, riferimenti e versione dello schema.
- L'applicazione viene riavviata oppure riapre completamente il contesto dati prima di consentire nuove operazioni.
- Il sistema mostra l'esito del ripristino e il riferimento al backup di sicurezza creato.

#### Gestione degli errori e recupero

- Se il ripristino fallisce prima della sostituzione finale, i dati correnti rimangono invariati.
- Se viene rilevato un errore dopo la sostituzione, il sistema tenta il ritorno atomico allo stato precedente utilizzando il backup `pre-ripristino`.
- Finché integrità e coerenza non sono confermate, l'applicazione non consente modifiche ai dati.
- Un'interruzione imprevista viene rilevata all'avvio successivo mediante gli indicatori della procedura in corso.
- Il sistema completa il ritorno allo stato precedente oppure propone il recupero controllato, senza inizializzare automaticamente un archivio vuoto.
- Ogni operazione conserva almeno istante di inizio e fine, tipo di backup, esito e descrizione dell'eventuale errore tecnico utile alla diagnosi.

#### Avvio e integrità dei dati attivi

- A ogni avvio vengono controllati almeno versione dello schema, disponibilità del database e assenza di una procedura di ripristino incompleta.
- Una verifica rapida di integrità precede la creazione del backup automatico.
- Se il database attivo non supera i controlli minimi, l'applicazione entra in modalità protetta:
  - impedisce nuove modifiche;
  - conserva i file esistenti;
  - mostra il problema rilevato;
  - consente di verificare e scegliere un backup valido da ripristinare.
- Il sistema non copia automaticamente un archivio riconosciuto come corrotto all'interno della rotazione ordinaria dei backup automatici.

#### Conservazione ed eliminazione

- La politica automatica conserva inizialmente gli ultimi `30` backup automatici validi.
- La pulizia automatica viene eseguita soltanto dopo la creazione riuscita e verificata di un nuovo backup.
- La pulizia riguarda esclusivamente backup automatici riconosciuti e presenti nella directory configurata.
- Backup manuali, backup `pre-ripristino`, file non riconosciuti e backup non validi non vengono eliminati automaticamente.
- L'operatore può eliminare esplicitamente un backup dall'inventario dopo una conferma che ne indica tipo, data e percorso.
- L'eliminazione del file non modifica i dati attivi e non può essere annullata dall'applicazione.

#### Riservatezza del backup

- Il backup contiene dati aziendali, economici e potenzialmente personali e deve essere trattato come dato riservato.
- Nella prima versione il formato garantisce integrità e riconoscibilità, ma non applica cifratura integrata.
- L'interfaccia informa l'operatore che la protezione da accessi non autorizzati dipende dalla cartella, dal dispositivo o dal volume sul quale il backup viene conservato.
- L'eventuale cifratura con password costituisce un'evoluzione futura e dovrà prevedere procedure che evitino la perdita irreversibile dei dati per smarrimento della chiave.

#### Distinzione da esportazione e migrazione

- Il backup è completo, destinato al ripristino dell'applicazione e non è progettato per essere modificato manualmente.
- Le esportazioni `CSV` e `XLSX` sono parziali, leggibili e destinate a consultazione o interoperabilità; non costituiscono backup e non possono essere ripristinate.
- La copia della sola directory del database mentre l'applicazione è in uso non è considerata un backup valido.
- L'importazione selettiva, l'unione tra archivi differenti e la migrazione verso altri sistemi non fanno parte della prima versione.
- Il trasferimento dei dati verso un'altra installazione compatibile avviene mediante backup completo e ripristino.

### CU-CFG-01 – Inizializzare l'applicazione

**Obiettivo:** creare o riconoscere un archivio dati valido senza sovrascrivere dati esistenti.

**Precondizioni:** l'applicazione viene avviata senza una directory attiva già valida.

**Flusso principale:**

1. Il sistema propone la directory portabile predefinita.
2. L'operatore la conferma oppure sceglie un'altra posizione.
3. Il sistema verifica directory, permessi, spazio e contenuti esistenti.
4. Se la posizione è vuota, crea in un'area temporanea database, schema e valori iniziali.
5. Verifica il nuovo archivio e lo rende attivo atomicamente.
6. Inizializza le configurazioni generali e i valori predefiniti definiti dagli altri ambiti.

**Alternative e vincoli:**

- Se viene riconosciuto un archivio esistente valido, il sistema lo apre senza inizializzarlo nuovamente.
- Se l'archivio è corrotto o incompatibile, l'operazione viene bloccata e vengono proposte verifica o ripristino.
- Nessun file esistente non riconosciuto viene sovrascritto automaticamente.

**Risultato:** l'applicazione possiede una directory attiva valida oppure rimane in modalità protetta.

### CU-CFG-02 – Consultare e modificare le configurazioni generali

**Obiettivo:** aggiornare impostazioni trasversali prive di una gestione di dominio dedicata.

**Precondizioni:** l'applicazione è inizializzata.

**Flusso principale:**

1. L'operatore apre le configurazioni generali.
2. Il sistema mostra valori correnti, valori predefiniti e descrizione degli effetti.
3. L'operatore modifica una o più impostazioni.
4. Il sistema valida l'intero insieme risultante.
5. Mostra eventuali avvisi, compresa la collocazione dei backup sullo stesso volume dei dati.
6. L'operatore conferma e il sistema salva atomicamente.

**Alternative e vincoli:**

- Un'impostazione appartenente a un altro ambito apre o indica la relativa funzione e non è modificabile genericamente.
- Un percorso non disponibile o non scrivibile viene respinto.
- In caso di errore nessuna modifica parziale viene conservata.

**Risultato:** tutte le configurazioni risultano valide oppure mantengono i valori precedenti.

### CU-CFG-03 – Creare un backup manuale

**Obiettivo:** produrre su richiesta una copia completa, coerente e verificata.

**Precondizioni:** il database attivo supera i controlli minimi di integrità.

**Flusso principale:**

1. L'operatore richiede un backup manuale e sceglie la destinazione.
2. Il sistema verifica spazio e possibilità di scrittura.
3. Acquisisce una vista coerente impedendo temporaneamente nuove modifiche.
4. Costruisce l'archivio temporaneo e il manifesto.
5. Verifica impronte, leggibilità e consistenza.
6. Pubblica atomicamente il file definitivo.
7. Mostra posizione, dimensione, istante ed esito.

**Alternative e vincoli:**

- Un errore elimina o isola il file temporaneo senza presentarlo come backup valido.
- La destinazione sullo stesso volume dei dati produce un avviso ma non impedisce il backup.
- Il backup non include altri backup o esportazioni.

**Risultato:** esiste un nuovo backup manuale valido oppure nessun nuovo archivio viene dichiarato utilizzabile.

### CU-CFG-04 – Creare e conservare un backup automatico

**Obiettivo:** mantenere una protezione periodica senza richiedere un servizio esterno.

**Precondizioni:** backup automatici attivi, directory disponibile e dati modificati dopo l'ultimo backup valido.

**Flusso principale:**

1. Dopo l'avvio il sistema verifica il database attivo.
2. Prima della prima modifica della giornata controlla l'ultimo backup automatico riuscito.
3. Se necessario, crea e verifica un nuovo backup nella directory configurata.
4. Soltanto dopo il successo applica la politica di conservazione.
5. Mantiene gli ultimi `30` backup automatici validi.
6. Consente quindi la modifica richiesta dall'operatore.

**Alternative e vincoli:**

- Se non vi sono modifiche rispetto all'ultimo backup, non crea una copia duplicata.
- Se la directory non è disponibile, mostra un avviso persistente ma non impedisce la modifica ordinaria.
- Backup manuali e `pre-ripristino` sono esclusi dalla pulizia automatica.

**Risultato:** la rotazione automatica viene aggiornata oppure il sistema segnala che la protezione non è disponibile.

### CU-CFG-05 – Individuare e verificare un backup

**Obiettivo:** conoscere l'utilizzabilità di un archivio senza modificare i dati correnti.

**Precondizioni:** è disponibile un file candidato.

**Flusso principale:**

1. L'operatore consulta l'inventario o seleziona un file esterno.
2. Il sistema legge il manifesto senza eseguire il ripristino.
3. Controlla impronte, contenuti, database e versione dello schema.
4. Determina validità e compatibilità.
5. Mostra tipo, data, origine, dimensione, versioni ed eventuali errori.

**Alternative e vincoli:**

- Un file non riconosciuto viene classificato come non valido.
- Un backup di una versione più recente viene classificato come incompatibile.
- La verifica non modifica né elimina il file.

**Risultato:** il backup possiede uno stato verificato e motivato.

### CU-CFG-06 – Ripristinare un backup completo

**Obiettivo:** sostituire in sicurezza lo stato attivo con quello contenuto in un backup valido.

**Precondizioni:** il backup è valido e compatibile; non sono in corso altre operazioni.

**Flusso principale:**

1. L'operatore seleziona il backup e richiede il ripristino.
2. Il sistema lo verifica integralmente e mostra il riepilogo.
3. Crea e verifica un backup `pre-ripristino` dello stato corrente.
4. L'operatore conferma esplicitamente la sostituzione completa.
5. Il sistema entra in modalità esclusiva.
6. Estrae, migra quando necessario e verifica i dati in un'area temporanea.
7. Sostituisce atomicamente l'archivio attivo.
8. Verifica lo stato ripristinato e riavvia o riapre il contesto dati.
9. Mostra l'esito e il riferimento al backup di sicurezza.

**Alternative e vincoli:**

- Se l'installazione è nuova e priva di dati, il backup `pre-ripristino` non è necessario.
- Se non è possibile creare il backup di sicurezza, il ripristino viene impedito.
- Non è possibile scegliere singole entità o fondere i dati con quelli correnti.
- Un backup più recente dell'applicazione non può essere ripristinato.

**Risultato:** lo stato completo viene ripristinato oppure i dati precedenti rimangono disponibili.

### CU-CFG-07 – Gestire un errore o un'interruzione del ripristino

**Obiettivo:** evitare uno stato parzialmente sostituito o non verificato.

**Precondizioni:** il ripristino non è terminato correttamente oppure l'applicazione rileva una procedura incompleta.

**Flusso principale:**

1. Il sistema determina la fase raggiunta dalla procedura.
2. Se la sostituzione non era iniziata, conserva lo stato corrente.
3. Se la sostituzione era avvenuta, verifica il nuovo stato.
4. In caso di errore ripristina lo stato precedente mediante il backup di sicurezza.
5. Verifica nuovamente l'archivio attivo.
6. Registra e mostra l'esito del recupero.

**Alternative e vincoli:**

- Fino alla verifica conclusiva, le modifiche ai dati sono impedite.
- Se il recupero automatico non è possibile, l'applicazione rimane in modalità protetta e richiede la scelta di un backup valido.
- Non viene mai creato automaticamente un database vuoto per nascondere l'errore.

**Risultato:** viene riattivato uno stato verificato oppure l'applicazione resta protetta senza modificare ulteriormente i file.

### CU-CFG-08 – Eliminare un backup

**Obiettivo:** rimuovere consapevolmente un archivio non più necessario.

**Precondizioni:** il backup è presente nell'inventario e non è utilizzato da una procedura in corso.

**Flusso principale:**

1. L'operatore seleziona il backup.
2. Il sistema mostra tipo, data, dimensione e posizione.
3. Evidenzia se si tratta di un backup manuale o `pre-ripristino`.
4. L'operatore conferma.
5. Il sistema elimina il file e aggiorna l'inventario.

**Alternative e vincoli:**

- L'eliminazione non modifica il database attivo.
- Un errore di filesystem lascia il backup nell'inventario con il relativo messaggio.
- L'applicazione non offre un ripristino del file eliminato.

**Risultato:** il backup viene rimosso oppure rimane invariato.

### CU-CFG-09 – Ripristinare su una nuova installazione

**Obiettivo:** trasferire l'intero archivio verso un'altra installazione compatibile.

**Precondizioni:** la nuova installazione non contiene dati oppure l'operatore accetta di sostituirli.

**Flusso principale:**

1. L'operatore avvia l'applicazione e sceglie il ripristino da backup.
2. Seleziona la directory dati e il file di backup.
3. Il sistema verifica spazio, integrità e compatibilità.
4. Prepara i dati in un'area temporanea.
5. Applica le eventuali migrazioni supportate.
6. Pubblica e verifica il nuovo archivio attivo.
7. Avvia normalmente l'applicazione sui dati ripristinati.

**Alternative e vincoli:**

- Le esportazioni tabellari non possono essere selezionate come backup.
- La versione ricevente non può essere precedente a quella richiesta dal backup.
- Le configurazioni dei percorsi locali vengono rivalidate e possono richiedere una nuova destinazione.

**Risultato:** la nuova installazione contiene lo stesso stato persistente compatibile del sistema di origine.

### CU-CFG-10 – Avviare l'applicazione in modalità protetta

**Obiettivo:** impedire nuove scritture quando lo stato attivo non è affidabile.

**Precondizioni:** il controllo iniziale rileva corruzione, incompatibilità o ripristino incompleto.

**Flusso principale:**

1. Il sistema conserva i file esistenti senza sovrascriverli.
2. Disabilita le funzioni che modificano i dati.
3. Mostra la causa e le informazioni diagnostiche disponibili.
4. Permette di consultare l'inventario e verificare backup.
5. L'operatore seleziona un backup valido oppure chiude l'applicazione per un intervento tecnico.

**Alternative e vincoli:**

- Un database incompatibile non viene migrato se manca una sequenza di migrazione supportata.
- Un archivio corrotto non entra nella rotazione automatica dei backup.
- La modalità ordinaria viene riattivata soltanto dopo una verifica riuscita.

**Risultato:** nessuna nuova modifica viene applicata a uno stato non affidabile.

### Interazioni con gli altri ambiti

- I valori iniziali delle anagrafiche, dei tipi, delle categorie e delle configurazioni predefinite vengono creati durante l'inizializzazione secondo le regole dei rispettivi punti.
- I fusi aziendale e portuali rimangono governati dal punto 12 e vengono soltanto inclusi nel backup.
- Le configurazioni dei resoconti del punto 13 sono incluse nel backup e vengono ripristinate insieme ai dati.
- Fatture e altri elementi consolidati vengono copiati e ripristinati senza ricalcolo o reinterpretazione.
- Eventuali migrazioni tecniche devono rispettare immutabilità, identità stabili e riferimenti temporali definiti nei punti precedenti.
- Il punto 15 verifica che tutti i dati e le configurazioni persistenti risultino coperti dal backup.

### Decisioni funzionali confermate

Sono confermati i seguenti comportamenti:

1. L'installazione portabile propone una directory dati relativa alla cartella dell'applicazione; al primo avvio può esserne scelta un'altra, mentre una successiva ricollocazione richiede il trasferimento completo o backup e ripristino.
2. Il backup è completo e comprende database, configurazioni e file persistenti gestiti dall'applicazione; esclude eseguibili, altri backup, esportazioni, log, file temporanei e dati ricostruibili.
3. Il sistema crea al massimo un backup automatico al giorno, prima della prima modifica e soltanto se i dati sono cambiati dall'ultimo backup riuscito. Non è previsto un servizio in background quando l'applicazione è chiusa.
4. La directory dei backup automatici è configurabile. La collocazione sullo stesso volume dei dati produce un avviso ma non impedisce il funzionamento; l'indisponibilità della directory non blocca le registrazioni ordinarie.
5. Vengono conservati automaticamente gli ultimi `30` backup automatici validi. Backup manuali, `pre-ripristino`, non validi o non riconosciuti non vengono eliminati dalla rotazione.
6. Ogni backup è un archivio unico con manifesto, versione dello schema e impronte di integrità; viene pubblicato soltanto dopo la verifica completa.
7. Nella prima versione i backup non sono cifrati. Il sistema segnala che devono essere conservati su cartelle o dispositivi adeguatamente protetti.
8. Il ripristino sostituisce l'intero stato persistente: non sono previsti ripristino parziale, fusione tra archivi o importazione da `CSV` e `XLSX`.
9. Prima di sostituire dati esistenti è obbligatorio creare e verificare un backup `pre-ripristino`; se l'operazione non riesce, il ripristino viene impedito.
10. Un backup precedente può essere aggiornato mediante le migrazioni disponibili; un backup prodotto da uno schema più recente non può essere ripristinato da un'applicazione più vecchia e non sono previsti downgrade.
11. Il ripristino viene preparato e verificato in un'area temporanea, applicato atomicamente e seguito dal riavvio o dalla completa riapertura del contesto dati. Un errore conserva o ripristina lo stato precedente.
12. Le configurazioni generali sono globali, correnti e non storicizzate; qualsiasi configurazione con effetti temporali, economici o contabili rimane gestita dal proprio ambito.
13. I backup manuali e `pre-ripristino` possono essere eliminati soltanto mediante richiesta esplicita e confermata; un backup non valido non viene cancellato automaticamente.
14. Se il database attivo non supera i controlli minimi all'avvio, l'applicazione impedisce nuove scritture e offre soltanto diagnosi, verifica e ripristino controllato.
15. Backup, esportazione tabellare e futura migrazione selettiva sono funzioni distinte; nella prima versione il trasferimento completo tra installazioni avviene esclusivamente mediante backup e ripristino.

### Esito del punto

I casi d'uso coprono inizializzazione, configurazioni generali, backup manuali e automatici, inventario e verifica, ripristino completo, recupero dagli errori, eliminazione, trasferimento verso una nuova installazione e modalità protetta.

Le regole funzionali dell'ambito e tutte le relative decisioni sono state confermate. Il punto è pertanto **completato**.

## 2.22 Punto 15 – Revisione trasversale e chiusura della fase 2

### Tema e perimetro

Il punto conclude la fase 2 mediante una revisione complessiva dell'analisi funzionale. La verifica riguarda copertura del dominio, continuità dei casi d'uso, terminologia, stati, dipendenze, protezione dei dati consolidati, operazioni atomiche, messaggi all'operatore e decisioni ancora aperte.

La revisione non introduce nuovi comportamenti di dominio: rende esplicita la coerenza tra le decisioni già confermate e individua gli elementi che appartengono alle successive fasi di progettazione.

### REV-FUN-01 – Verificare struttura e copertura

La struttura del documento risulta completa:

- i punti da 1 a 14 possiedono tema, requisiti comuni, casi d'uso, interazioni, decisioni confermate ed esito;
- tutti i punti precedenti risultano completati;
- ogni caso d'uso possiede un codice univoco e appartiene a una serie continua;
- non risultano codici duplicati, salti di numerazione o casi d'uso privi di ambito;
- i requisiti del modello di dominio sono rappresentati da almeno un ambito funzionale oppure da una regola trasversale esplicita;
- la revisione comprende complessivamente `148` casi d'uso.

| Ambito | Sezione | Serie | Casi d'uso | Principale copertura di dominio |
| --- | --- | --- | ---: | --- |
| Anagrafiche e versioni | 2.8 | `CU-ANA` | 10 | Identità, codici, versioni, stato corrente, porto e banchina |
| Viaggi, visite e ormeggi | 2.9 | `CU-PER` | 8 | Struttura della permanenza e ricostruzione temporale |
| Operazioni nave | 2.10 | `CU-OPN` | 10 | Entrata, spostamento, uscita, sequenze e componenti economiche |
| Prestazioni | 2.11 | `CU-PRE` | 14 | Catalogo, prestazioni libere, stati e fatturabilità |
| Movimentazioni merci | 2.12 | `CU-MER` | 7 | Carico, scarico, quantità, contesto e consolidamento informativo |
| Cliente e agenzia | 2.13 | `CU-SOG` | 8 | Assegnazione, ereditarietà, coppia effettiva e compatibilità |
| Tariffe e pesi | 2.14 | `CU-TAR` | 10 | Tariffe per porto, scaglioni, pesi e importo base |
| Regole economiche e fiscali | 2.15 | `CU-ECO` | 12 | Versioni delle regole, condizioni, conseguenze, IVA e bollo |
| Fatture | 2.16 | `CU-FAT` | 15 | Composizione, sconti, emissione, consolidamento e ritiro |
| Contabilità | 2.17 | `CU-CON` | 16 | Conti, movimenti, giroconti, categorie, voci e saldi |
| Incassi | 2.18 | `CU-INC` | 8 | Ripartizione, residui e stati di riscossione |
| Date, orari e fusi | 2.19 | `CU-TEM` | 10 | Date civili, istanti, fusi, ora legale e correzioni |
| Resoconti ed esportazioni | 2.20 | `CU-RES` | 10 | Configurazione, misure, tracciabilità ed esportazione |
| Configurazioni e backup | 2.21 | `CU-CFG` | 10 | Inizializzazione, backup, ripristino e modalità protetta |
| **Totale** |  |  | **148** |  |

### REV-FUN-02 – Verificare terminologia, attori e stati

La terminologia viene utilizzata con un significato stabile:

- `operatore` è l'unico attore umano della prima versione; cliente, agenzia e nave sono entità del dominio e non utenti applicativi;
- `entrata`, `spostamento` e `uscita` sono le tre tipologie delle operazioni nave; il termine `movimento` senza altra qualificazione indica invece un movimento contabile;
- `prestazione` indica un'attività economica da catalogo o libera; `movimentazione merci` indica un dato operativo di carico o scarico privo di importo proprio;
- `aperto` e `chiuso` descrivono viaggi, visite e ormeggi;
- `prevista`, `effettuata` e `mancata` descrivono l'esecuzione di operazioni nave e prestazioni;
- `in immissione`, `emessa`, `parzialmente saldata` e `saldata` descrivono il ciclo della fattura;
- `attivo` e `disattivato` descrivono la selezionabilità corrente delle anagrafiche e delle classificazioni, mentre per le regole economiche lo stato appartiene alla versione temporalmente applicabile;
- `consolidato` identifica un dato o un risultato protetto perché incluso, anche soltanto a fini informativi, in una fattura emessa, parzialmente saldata o saldata.

I codici tecnici stabili, i progressivi visibili, i numeri di fattura e i codici operativi rimangono concetti distinti. In particolare, il codice operativo di un movimento contabile resta modificabile anche dopo la registrazione, mentre la sua identità tecnica non cambia.

### REV-FUN-03 – Verificare le invarianti tra ambiti

Le seguenti invarianti risultano coerenti in tutti i punti interessati:

| Invariante | Ambiti coinvolti | Esito della verifica |
| --- | --- | --- |
| Protezione della fattura consolidata | Anagrafiche, operazioni, prestazioni, merci, soggetti, tariffe, regole, fatture, tempi | Nessuna modifica può alterare direttamente o indirettamente dati o risultati conservati in una fattura consolidata. |
| Componenti di uno spostamento tra porti | Operazioni, soggetti, tariffe, fatture, tempi | `Uscita` ed `entrata` sono calcolate, consolidate e fatturate autonomamente; possono appartenere a fatture differenti e in momenti diversi. |
| Coppia cliente e agenzia della fattura | Soggetti, fatture, merci, incassi | La coppia viene scelta prima della composizione; sono selezionabili soltanto elementi compatibili e gli incassi devono condividere la stessa coppia. |
| Attribuzione temporale | Permanenze, operazioni, prestazioni, merci, tempi | Porto, viaggio, visita e ormeggio vengono derivati dalla sequenza valida; ogni modifica ricostruisce atomicamente le attribuzioni non consolidate. |
| Calcolo economico | Tariffe, regole, fatture | Tariffa e peso producono l'importo base alla creazione dell'attività; regole e sconti applicano la sequenza e gli arrotondamenti stabiliti. |
| Versioni temporali | Anagrafiche, pesi, regole e fusi | Le versioni hanno decorrenze ordinate, intervalli non sovrapposti e simulazione preventiva quando possono influire su dati esistenti. |
| Distinzione dei fusi | Operazioni, tariffe, regole, resoconti, backup | Il fuso del porto governa le attività portuali; il fuso aziendale ha funzione amministrativa e non viene usato come ripiego implicito. |
| Coerenza contabile | Contabilità, incassi, fatture, resoconti | Movimenti, quote, saldi e stati di riscossione vengono aggiornati insieme e senza duplicare gli importi nei totali. |
| Continuità dei dati | Tutti gli ambiti persistenti | Backup e ripristino conservano identità, versioni e valori consolidati senza ricalcolarli o reinterpretarli. |

### REV-FUN-04 – Verificare atomicità, avvisi e blocchi

Le operazioni che modificano più elementi costituiscono un'unica transazione funzionale. In particolare, l'applicazione deve applicare interamente oppure annullare:

- la ricostruzione di viaggi, visite, ormeggi e attribuzioni dopo una modifica operativa;
- il ricalcolo conseguente a versioni anagrafiche, tariffe, pesi, regole economiche o fusi;
- la composizione, l'emissione, il ritiro e l'eliminazione consentita di una fattura;
- la registrazione o modifica di movimenti, giroconti, associazioni contabili e relativi saldi;
- la ripartizione di un incasso e l'aggiornamento degli importi saldati e degli stati delle fatture;
- la pubblicazione di un backup e la sostituzione completa dello stato durante un ripristino.

Prima della conferma, il sistema mostra gli effetti rilevanti delle operazioni retroattive o distruttive. Un vincolo violato produce un messaggio che identifica almeno l'elemento bloccante e la ragione del blocco; nessuna modifica parziale deve rimanere persistente.

Gli avvisi non sostituiscono i blocchi. Restano semplici notifiche, tra gli altri, l'esistenza di attività precedenti ancora previste, la presenza di salti nella numerazione, l'uso dello stesso volume per dati e backup e l'applicazione obbligatoria di uno sconto da regola che porta l'importo a zero. Quest'ultimo viene segnalato prima dell'applicazione, ma non può essere rimosso manualmente.

### REV-FUN-05 – Verificare decisioni residue e rinvii

Non risultano decisioni funzionali aperte per i punti da 1 a 14. Le scelte confermate sono incorporate nei requisiti comuni, nei casi d'uso e nei relativi esiti.

Rimangono intenzionalmente fuori dalla fase 2:

- disposizione delle schermate, flussi di navigazione e dettagli dell'interazione grafica;
- modello fisico dei dati, architettura applicativa e tecnologie di persistenza;
- autenticazione, utenti distinti e ruoli applicativi;
- formato PDF generico per i resoconti;
- importazione selettiva, fusione tra archivi e migrazione parziale dei dati;
- fuso personale o di sessione.

Questi elementi non rappresentano lacune del modello funzionale: sono decisioni di progettazione successive oppure funzionalità esplicitamente escluse dalla prima versione. Qualsiasi futura introduzione dovrà rispettare identità stabili, validità temporale, atomicità e protezione dei dati consolidati definite in questa fase.

### Correzioni editoriali applicate durante la revisione

- La tipologia dell'operazione nave è stata uniformata a `spostamento`, riservando `movimento` all'ambito contabile.
- I rinvii interni ai punti già completati sono stati trasformati da formulazioni future a riferimenti correnti.
- Lo stato del punto 15 è stato aggiornato a `Completato` e la chiusura è stata resa verificabile mediante riepilogo numerico e matrice di tracciabilità.

### Esito del punto e chiusura della fase 2

La revisione conferma che il documento:

- copre il modello di dominio necessario alla prima versione;
- contiene casi d'uso completi, numerati e coerenti tra gli ambiti;
- applica in modo uniforme stati, vincoli temporali, consolidamento e atomicità;
- non presenta decisioni funzionali ancora da confermare;
- separa chiaramente i requisiti funzionali dalle successive decisioni di interfaccia e implementazione.

Il punto 15 è pertanto **completato**. Con il completamento di tutti i punti da 1 a 15, la **fase 2 – Requisiti funzionali e casi d'uso è formalmente chiusa** e può essere utilizzata come base per la fase successiva di progettazione.


