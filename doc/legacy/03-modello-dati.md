# 3. Modello dei dati

## 3.1 Scopo del documento

Questo documento traduce l'analisi del dominio e i requisiti funzionali in un modello dei dati coerente, completo e verificabile.

Il modello deve definire:

- entità e responsabilità;
- attributi e relativi significati;
- identificativi tecnici e codici visibili;
- relazioni e cardinalità;
- cicli di vita e regole di eliminazione;
- versioni temporali e intervalli di validità;
- vincoli di unicità e integrità;
- dati autorevoli, snapshot consolidati e dati derivati;
- indici necessari a garantire correttezza e prestazioni;
- copertura dei casi d'uso.

La fase definisce prima il modello logico, mantenendolo indipendente da uno specifico database, ORM o framework. Le successive scelte fisiche e tecnologiche dovranno preservarne il significato.

## 3.2 Fonti e perimetro

Le fonti vincolanti sono:

- `00-roadmap-progetto.md`, per visione, perimetro e ordine delle fasi;
- `01-analisi-dominio.md`, per entità, relazioni, stati e regole;
- `02-requisiti-funzionali-e-casi-uso.md`, per comportamenti, precondizioni, effetti e vincoli applicativi.

Il modello dei dati non deve introdurre nuove regole di dominio in modo implicito. Quando una scelta strutturale non deriva dai documenti precedenti e modifica il comportamento osservabile, deve essere presentata e confermata prima di diventare definitiva.

Non rientrano ancora in questa fase:

- scelta del motore di database;
- scelta dell'ORM o della libreria di accesso ai dati;
- struttura dei moduli applicativi;
- definizione delle API;
- disposizione delle schermate;
- dettagli delle procedure di migrazione e distribuzione.

## 3.3 Metodo di trattazione

### Metodo originario e passaggio alla progettazione evolutiva

I punti 1–5 sono stati sviluppati e confermati con il metodo analitico descritto di seguito. A partire dal punto 6, il progetto adotta uno sviluppo evolutivo per vertical slice: il presente indice rimane una mappa di copertura, ma non costituisce più una sequenza da completare prima della scrittura del codice.

Quando una slice richiede una parte del modello:

1. si recuperano regole e proposte già documentate;
2. si definisce soltanto la struttura necessaria allo scenario corrente;
3. la si verifica mediante implementazione, migrazioni e test;
4. si aggiorna questo documento distinguendo decisioni confermate, corrette e ancora rinviate.

Le sezioni non ancora implementate restano proposte progettuali e non devono essere interpretate come schema fisico definitivo.

Ogni punto viene sviluppato secondo una struttura comune:

1. **Tema e perimetro**, per chiarire gli elementi compresi.
2. **Entità coinvolte**, con responsabilità e fonti di dominio.
3. **Attributi**, specificando significato, obbligatorietà, precisione e modificabilità.
4. **Identificativi e chiavi**, distinguendo identità tecniche e codici visibili.
5. **Relazioni e cardinalità**, comprese proprietà, dipendenze e riferimenti facoltativi.
6. **Ciclo di vita**, con creazione, modifica, disattivazione, consolidamento ed eliminazione.
7. **Vincoli**, inclusi unicità, integrità e condizioni applicative non delegabili alla sola interfaccia.
8. **Aspetti temporali**, quando validità, decorrenza o istante di dominio modificano la struttura.
9. **Dati consolidati e derivati**, indicando la fonte autorevole e la necessità di eventuali snapshot.
10. **Decisioni da confermare**, limitate agli aspetti non già determinati.
11. **Esito del punto**, con copertura e stato.

La modellazione procede dal generale al particolare. I punti trasversali finali verificano e completano quanto definito negli ambiti precedenti senza duplicarne le descrizioni.

## 3.4 Indice dettagliato della fase 3

### Punto 1 – Scopo, perimetro e convenzioni del modello

Il punto comprende:

- livelli di astrazione utilizzati;
- regole di denominazione;
- rappresentazione di entità, attributi e relazioni;
- obbligatorietà, nullabilità e valori predefiniti;
- convenzioni per importi, quantità, date e istanti;
- distinzione tra dati logici e scelte fisiche;
- formato con cui documentare vincoli e decisioni.

### Punto 2 – Identificativi tecnici, codici progressivi e riferimenti stabili

Il punto comprende:

- identità tecnica delle entità;
- codici progressivi visibili o amministrativi;
- immutabilità e riutilizzo degli identificativi;
- riferimenti tra elementi correnti, versionati e consolidati;
- identità di associazioni e componenti dipendenti;
- distinzione tra chiave primaria, chiave di dominio e ordinamento.

### Punto 3 – Anagrafiche e versioni temporali

Il punto comprende:

- struttura comune delle anagrafiche;
- identità e versioni descrittive;
- decorrenze e intervalli;
- stato corrente attivo o disattivato;
- eliminazione in assenza di riferimenti;
- vincoli specifici di nave, cliente, agenzia, porto, banchina e merce;
- appartenenza immutabile della banchina al porto.

### Punto 4 – Navi, viaggi, visite e ormeggi

Il punto comprende:

- relazione tra nave e permanenze;
- gerarchia `nave → viaggio → visita → ormeggio`;
- estremi temporali e stato aperto o chiuso;
- porto della visita e banchina facoltativa dell'ormeggio;
- collegamenti alle operazioni che determinano la struttura;
- persistenza e ricostruzione controllata degli elementi derivati.

### Punto 5 – Operazioni nave e sequenze operative

Il punto comprende:

- entrata, spostamento e uscita;
- dati comuni e specifici per tipologia;
- partenza e arrivo degli spostamenti;
- stato di esecuzione;
- ordine e unicità temporale;
- sequenze consentite;
- componenti economiche autonome degli spostamenti tra porti;
- effetti atomici sulle permanenze.

### Punto 6 – Prestazioni e catalogo delle prestazioni

Il punto comprende:

- tipi di prestazione da catalogo;
- prestazioni registrate;
- prestazioni libere;
- categoria immutabile della prestazione;
- stato di esecuzione e note;
- attribuzione a nave e permanenze;
- fatturabilità e consolidamento;
- collegamento ai dati tariffari ed economici applicati.

### Punto 7 – Movimentazioni merci

Il punto comprende:

- carico e scarico;
- merce, quantità e istante;
- attribuzione a nave, viaggio, visita e ormeggio;
- assenza di valore economico proprio;
- associazioni informative alle fatture;
- consolidamento con l'emissione;
- modifica ed eliminazione consentite.

### Punto 8 – Determinazione di cliente e agenzia

Il punto comprende:

- assegnazioni esplicite ai livelli previsti;
- ereditarietà e priorità;
- coppia effettiva di cliente e agenzia;
- memorizzazione dei riferimenti determinati;
- determinazione autonoma per le componenti degli spostamenti;
- ricalcolo degli elementi non consolidati;
- compatibilità con la fattura e l'incasso.

### Punto 9 – Tariffe, configurazioni, scaglioni e pesi

Il punto comprende:

- sequenza tariffaria autonoma per porto;
- configurazioni complete per tipologia di nave;
- scaglioni ordinari ed extra;
- versioni temporali dei pesi;
- individuazione dei valori applicabili;
- dati di calcolo memorizzati sulla prestazione o componente;
- ricalcolo e protezione degli importi consolidati.

### Punto 10 – Regole economiche e relative versioni

Il punto comprende:

- identità e ambito immutabile della regola;
- versioni temporali complete;
- condizioni, conseguenze, fase e priorità;
- stato attivo o disattivato versionato;
- applicazioni della regola ai calcoli;
- notifiche e azzeramenti;
- risultati memorizzati e ricalcolabili;
- protezione delle fatture consolidate.

### Punto 11 – Fatture, righe e componenti economiche

Il punto comprende:

- identità, numero, suffisso e data;
- coppia cliente e agenzia;
- stati della fattura;
- attività economiche e informazioni prive di importo;
- righe, sconti, regole di fattura e totali;
- associazione autonoma delle componenti di uno spostamento;
- snapshot dei dati emessi;
- ritiro ed eliminazione consentiti.

### Punto 12 – Contabilità, conti, movimenti e giroconti

Il punto comprende:

- conti finanziari e saldi iniziali;
- movimenti in entrata e in uscita;
- giroconti e componenti contabili;
- progressivi giornalieri e codici operativi;
- categorie di spesa;
- voci contabili e associazioni integrali;
- saldi correnti, alla data e previsti;
- disattivazione ed eliminazione consentite.

### Punto 13 – Incassi e quote associate alle fatture

Il punto comprende:

- qualificazione dell'entrata come incasso;
- cliente e agenzia dell'incasso;
- associazione tra incasso e fattura;
- quote positive e relativi residui;
- cardinalità molti-a-molti;
- aggiornamento dello stato di riscossione;
- modifica e rimozione delle quote;
- vincoli sulle fatture associabili.

### Punto 14 – Date, istanti, fusi e riferimenti temporali

Il punto comprende:

- date civili;
- valori locali di dominio;
- `ZoneId`, offset e istante UTC;
- istanti tecnici;
- fuso aziendale e fusi dei porti;
- versioni temporali dei fusi;
- ore inesistenti o ambigue;
- riferimenti temporali utilizzati da vincoli e calcoli.

### Punto 15 – Resoconti, configurazioni e backup

Il punto comprende:

- configurazioni salvate dei resoconti;
- definizioni e risultati non persistiti come fonti primarie;
- configurazioni generali correnti;
- inventario e manifesto dei backup;
- stato delle operazioni di backup e ripristino;
- dati persistenti inclusi nell'archivio;
- informazioni necessarie alla modalità protetta.

### Punto 16 – Cardinalità, vincoli di eliminazione e integrità referenziale

Il punto comprende:

- revisione complessiva delle cardinalità;
- proprietà e dipendenza delle entità;
- riferimenti obbligatori e facoltativi;
- eliminazione, disattivazione e conservazione storica;
- comportamenti in presenza di associazioni;
- vincoli applicabili dal modello e dai servizi di dominio;
- prevenzione di riferimenti orfani.

### Punto 17 – Vincoli di unicità, indici e prestazioni

Il punto comprende:

- chiavi candidate e vincoli univoci;
- unicità correnti, storiche e temporali;
- indici necessari a validazioni e ricerche;
- ordinamenti deterministici;
- indici per intervalli, sequenze e associazioni;
- valutazione dei costi di scrittura;
- assenza di ottimizzazioni premature non giustificate.

### Punto 18 – Dati autorevoli, snapshot consolidati e dati derivati

Il punto comprende:

- identificazione delle fonti autorevoli;
- dati persistiti perché non ricostruibili;
- snapshot necessari alla fattura emessa;
- attribuzioni e calcoli aggiornabili;
- saldi, totali e aggregazioni derivabili;
- cache e proiezioni eventualmente ricostruibili;
- regole di invalidazione e ricalcolo.

### Punto 19 – Diagramma delle entità e delle relazioni

Il punto comprende:

- rappresentazione sintetica delle entità;
- relazioni e cardinalità principali;
- separazione del diagramma in viste leggibili;
- evidenza di identità, versioni e componenti dipendenti;
- legenda delle convenzioni;
- allineamento con il catalogo dettagliato.

### Punto 20 – Verifica di copertura dei 148 casi d'uso

Il punto comprende:

- matrice tra casi d'uso ed entità;
- operazioni di creazione, lettura, modifica ed eliminazione;
- transizioni di stato;
- ricalcoli e operazioni atomiche;
- vincoli temporali;
- dati necessari a notifiche e blocchi;
- identificazione di lacune o strutture non giustificate.

### Punto 21 – Revisione trasversale e chiusura della fase 3

Il punto comprende:

- uniformazione terminologica;
- verifica di attributi, chiavi e cardinalità;
- revisione delle dipendenze e dei cicli di vita;
- controllo di versioni, consolidamento e atomicità;
- eliminazione di duplicazioni;
- riepilogo delle decisioni;
- individuazione degli aspetti rinviati all'architettura;
- chiusura formale della fase.

## 3.5 Ordine e dipendenze

| Punto | Dipendenze principali |
| --- | --- |
| 1. Convenzioni | Definisce il linguaggio comune della fase. |
| 2. Identificativi | Dipende dalle convenzioni e viene utilizzato da tutti gli ambiti. |
| 3. Anagrafiche | Dipende da convenzioni e identificativi. |
| 4. Permanenze | Dipende dalle anagrafiche di nave, porto e banchina. |
| 5. Operazioni nave | Dipende dalle permanenze e ne determina le variazioni. |
| 6. Prestazioni | Dipende da anagrafiche, permanenze e operazioni. |
| 7. Movimentazioni merci | Dipende da anagrafiche e permanenze. |
| 8. Cliente e agenzia | Dipende dai livelli operativi e dalle prestazioni. |
| 9. Tariffe e pesi | Dipende da porti, navi, operazioni e prestazioni. |
| 10. Regole economiche | Dipende dagli elementi tariffati e dai relativi istanti. |
| 11. Fatture | Dipende da soggetti, attività e calcoli economici. |
| 12. Contabilità | Dipende da identificativi, classificazioni e regole monetarie comuni. |
| 13. Incassi | Dipende da fatture e movimenti contabili. |
| 14. Tempi e fusi | È trasversale e consolida la rappresentazione temporale dei punti precedenti. |
| 15. Resoconti e backup | Dipende dall'insieme dei dati persistenti. |
| 16. Integrità referenziale | Verifica e completa relazioni e cicli di vita dei punti 1–15. |
| 17. Unicità e indici | Dipende dal modello strutturale e dai percorsi di accesso definiti. |
| 18. Dati autorevoli e derivati | Verifica trasversalmente persistenza, snapshot e ricalcoli. |
| 19. Diagramma | Rappresenta sinteticamente il modello consolidato. |
| 20. Copertura dei casi d'uso | Dipende dal completamento del modello e del diagramma. |
| 21. Revisione finale | Dipende dal completamento di tutti i punti precedenti. |

## 3.6 Stato dell'analisi

| Punto | Ambito | Stato |
| --- | --- | --- |
| 1 | Scopo, perimetro e convenzioni | Completato |
| 2 | Identificativi tecnici e riferimenti stabili | Completato |
| 3 | Anagrafiche e versioni temporali | Completato |
| 4 | Navi, viaggi, visite e ormeggi | Completato |
| 5 | Operazioni nave e sequenze | Completato |
| 6 | Prestazioni e catalogo | Proposta da verificare nelle slice VS-06–VS-08 |
| 7 | Movimentazioni merci | Rinviato alla slice VS-09 |
| 8 | Cliente e agenzia | Da sviluppare nelle prime slice che ne richiedono l'attribuzione |
| 9 | Tariffe, scaglioni e pesi | Rinviato alla slice VS-07 |
| 10 | Regole economiche | Rinviato alle slice economiche interessate |
| 11 | Fatture e componenti economiche | Rinviato alla slice VS-10 |
| 12 | Contabilità | Rinviato alla slice VS-12 |
| 13 | Incassi e quote | Rinviato alla slice VS-11 |
| 14 | Date, istanti e fusi | Trasversale, da verificare progressivamente |
| 15 | Resoconti, configurazioni e backup | Rinviato alle slice VS-13–VS-14 |
| 16 | Cardinalità ed integrità referenziale | Revisione progressiva e finale |
| 17 | Unicità, indici e prestazioni | Revisione progressiva e finale |
| 18 | Dati autorevoli, consolidati e derivati | Revisione progressiva e finale |
| 19 | Diagramma delle entità e delle relazioni | Aggiornamento progressivo |
| 20 | Copertura dei casi d'uso | Verifica progressiva e finale |
| 21 | Revisione trasversale e chiusura | Prima del rilascio |

## 3.7 Prossima attività e modalità di aggiornamento

L'indice della fase 3 resta confermato come mappa degli argomenti da coprire.

Il **punto 1 – Scopo, perimetro e convenzioni del modello** è completato.

Il **punto 2 – Identificativi tecnici, codici progressivi e riferimenti stabili** è completato.

Il **punto 3 – Anagrafiche e versioni temporali** è completato.

Il **punto 4 – Navi, viaggi, visite e ormeggi** è completato.

Il **punto 5 – Operazioni nave e sequenze operative** è completato.

Il **punto 6 – Prestazioni e catalogo delle prestazioni** contiene una struttura proposta, che verrà verificata e conclusa durante le slice `VS-06`, `VS-07` e `VS-08`.

La prossima attività del progetto non è il punto 7, ma `VS-00 – Walking skeleton`, descritta in `04-sviluppo-evolutivo.md`. Questo documento verrà aggiornato quando il codice renderà necessario confermare o correggere una parte del modello.

## 3.8 Punto 1 – Scopo, perimetro e convenzioni del modello

### 3.8.1 Tema e obiettivo

Il punto definisce il linguaggio comune con cui verrà descritto l'intero modello dei dati. Le convenzioni devono rendere espliciti significato, obbligatorietà, precisione, modificabilità e ruolo di ogni dato, evitando che scelte tecniche premature modifichino le regole di dominio già confermate.

Il risultato di questa fase è un **modello logico autorevole**, indipendente dal database, dall'ORM, dal linguaggio di programmazione e dalla struttura delle API. La fase architetturale definirà la traduzione fisica del modello, ma dovrà conservarne identità, vincoli, relazioni e semantica temporale.

### 3.8.2 Elementi utilizzati nel modello

Il modello distingue le seguenti categorie:

| Categoria | Significato |
| --- | --- |
| Entità | Elemento con identità stabile e ciclo di vita autonomo nel dominio. |
| Componente dipendente | Elemento che esiste soltanto come parte di un'entità proprietaria e ne segue il ciclo di vita. |
| Entità di associazione | Relazione tra entità che possiede dati o regole proprie, come la quota che collega un incasso a una fattura. |
| Versione temporale | Stato completo di un elemento valido a partire da una determinata decorrenza. |
| Oggetto valore | Insieme di valori privo di identità autonoma, definito dal proprio contenuto, come un importo monetario o un momento di dominio. |
| Snapshot consolidato | Copia immutabile dei dati necessari a preservare un fatto storico, in particolare una fattura emessa. |
| Dato derivato o proiezione | Valore ricostruibile da fonti autorevoli; viene memorizzato soltanto quando serve una motivazione esplicita di correttezza o prestazione. |
| Registrazione tecnica | Dato necessario al funzionamento, alla configurazione, alla tracciabilità o al backup, ma non coincidente con un concetto operativo principale. |

Queste categorie non determinano ancora aggregati software, moduli o tabelle. Tali confini verranno definiti nell'architettura applicativa.

### 3.8.3 Regole di denominazione

La documentazione funzionale e di dominio resta in italiano, in modo da essere comprensibile agli utilizzatori e agli esperti del settore. Il codice e gli altri identificatori tecnici usano invece l'inglese, per rendere l'applicazione più accessibile a sviluppatori, librerie e strumenti internazionali.

Si distinguono quindi tre livelli:

| Livello | Lingua e convenzione | Esempio |
| --- | --- | --- |
| Dominio e documentazione | Italiano, con termini al singolare usati in modo coerente. | Movimentazione merci |
| Codice e API | Inglese; `PascalCase` per tipi e `camelCase` per attributi e relazioni. | `CargoMovement`, `invoiceDate` |
| Database | Inglese, secondo la convenzione fisica definita nell'architettura. | `cargo_movement`, `invoice_date` |

Ogni concetto riceve un solo nome funzionale italiano e un solo nome tecnico inglese ufficiale. Alla prima definizione dettagliata vengono riportati entrambi, per esempio **Movimentazione merci (`CargoMovement`)**. Classi, attributi, API, tabelle, colonne, chiavi, vincoli e indici utilizzano i termini tecnici inglesi; le etichette dell'interfaccia restano localizzabili e non costituiscono identificatori tecnici.

Il glossario bilingue viene esteso durante la modellazione e consolidato nella revisione finale. Le prime corrispondenze sono:

| Termine di dominio | Nome tecnico |
| --- | --- |
| Nave | `Vessel` |
| Porto | `Port` |
| Banchina | `Berth` |
| Viaggio | `Voyage` |
| Visita portuale | `PortCall` |
| Operazione nave | `VesselOperation` |
| Movimentazione merci | `CargoMovement` |
| Fattura | `Invoice` |
| Incasso | `CustomerPayment` |

Per concetti potenzialmente ambigui, come prestazione, ormeggio e movimento contabile, il nome tecnico viene stabilito nel relativo punto dopo averne precisato il significato. Sono evitate traduzioni letterali che possano produrre sovrapposizioni o interpretazioni errate.

Valgono inoltre le seguenti regole:

- nomi al singolare, salvo collezioni o convenzioni tecniche che richiedano il plurale;
- nomi affermativi per i valori booleani, evitando nomi generici come `flag`;
- abbreviazioni soltanto quando sono stabilmente riconoscibili nel dominio o nel contesto tecnico, come `IMO`, `VAT`, `UTC` e `IANA`;
- qualificazioni esplicite quando due date, importi o stati hanno significati diversi;
- nessun sinonimo tecnico alternativo per lo stesso concetto.

La scelta definitiva della convenzione fisica per tabelle, colonne, chiavi e indici resta rinviata alla progettazione tecnica, ma utilizzerà il nome inglese fissato dal glossario.

### 3.8.4 Descrizione degli attributi

Per ogni attributo devono essere indicati, quando pertinenti:

- nome e significato;
- tipo logico;
- obbligatorietà;
- dominio dei valori e precisione;
- valore iniziale eventualmente previsto dal dominio;
- modificabilità durante il ciclo di vita;
- rilevanza temporale;
- eventuale consolidamento;
- origine autorevole oppure modalità di derivazione.

Un attributo obbligatorio deve essere valorizzato prima che l'entità raggiunga lo stato nel quale il dato è richiesto. L'interfaccia può guidarne l'inserimento, ma non costituisce l'unico livello di protezione.

Un valore nullo è ammesso soltanto quando il dominio distingue realmente l'assenza del valore, la sua non applicabilità o un estremo temporale aperto. Non si usano stringhe vuote, zero, codici speciali o date fittizie per simulare un valore assente. Una stringa presente viene normalizzata eliminando gli spazi iniziali e finali e deve contenere almeno un carattere significativo.

I valori predefiniti sono ammessi soltanto quando esprimono una regola esplicita del dominio. Non devono nascondere la mancata acquisizione di un dato obbligatorio.

### 3.8.5 Tipi logici comuni

Il modello usa i seguenti tipi logici di base:

| Tipo | Convenzione |
| --- | --- |
| Testo | Stringa normalizzata, con lunghezza massima definita per il singolo attributo quando necessario. |
| Intero | Numero intero esatto, eventualmente soggetto a limiti positivi o non negativi. |
| Decimale esatto | Numero decimale non rappresentato in virgola mobile; precisione e scala dipendono dal significato specifico. |
| Importo monetario | Valore decimale esatto in euro con due cifre decimali. |
| Percentuale | Decimale esatto con limiti e scala stabiliti dalla specifica regola; gli sconti percentuali, ove previsto, sono compresi tra 0 e 100. |
| Quantità merce | Decimale esatto strettamente positivo con al massimo tre cifre decimali. |
| Data civile | Data di calendario priva di ora e fuso. |
| Momento di dominio | Data e ora locale al minuto, `ZoneId` IANA, offset applicato e corrispondente istante UTC. |
| Istante tecnico | Istante UTC con precisione massima al millisecondo. |
| Booleano | Valore vero o falso con significato affermativo esplicito. |
| Stato o tipo chiuso | Valore appartenente a un insieme finito definito dal dominio. |
| Riferimento stabile | Collegamento all'identità di un'altra entità, distinto dai relativi codici visibili. |

Non vengono impiegati numeri in virgola mobile per importi, percentuali, quantità, pesi o valori tariffari. La precisione non già definita viene stabilita nel punto relativo all'elemento interessato, senza imporre una scala globale arbitraria.

### 3.8.6 Importi, calcoli e valuta

Tutti gli importi economici e contabili sono espressi in euro. Nel modello logico `ImportoMonetario` rappresenta congiuntamente valore e valuta, mantenendo `EUR` come invariante di sistema; l'eventuale rappresentazione fisica della valuta non è ancora definita.

Ogni passaggio di un calcolo economico viene arrotondato commercialmente a due cifre decimali e il passaggio successivo utilizza il risultato già arrotondato. I valori tariffari unitari e gli altri fattori di calcolo restano decimali esatti con la precisione definita nel rispettivo ambito.

Un valore calcolato viene qualificato come:

- **corrente e ricalcolabile**, se deriva ancora da dati modificabili;
- **consolidato**, se deve preservare il risultato storico applicato a una fattura emessa.

### 3.8.7 Date, momenti e intervalli

Le date prive di significato orario, come la data di emissione di una fattura, sono rappresentate come date civili.

Gli eventi operativi ed economici legati a un porto sono rappresentati come momenti di dominio e usano il fuso valido per quel porto. Il fuso aziendale viene utilizzato soltanto per operazioni amministrative non riferibili a un porto. Secondi e frazioni di secondo non vengono acquisiti né utilizzati nei calcoli di dominio.

Gli istanti tecnici, come creazione e ultima modifica di una registrazione, sono espressi in UTC e non partecipano alle regole di ordinamento o validità del dominio se non dichiarato esplicitamente.

Gli intervalli specificano sempre se gli estremi sono inclusi o esclusi. Quando il dominio ammette un estremo indefinito, questo viene rappresentato come assenza del valore e non mediante una data convenzionale molto lontana. Nelle sequenze versionate, l'eventuale fine di una versione viene normalmente derivata dall'inizio della versione successiva, salvo diversa esigenza esplicitata nel punto specifico.

### 3.8.8 Insiemi chiusi e cataloghi estendibili

Una classificazione stabilmente finita e controllata dal dominio viene modellata come stato o tipo chiuso, per esempio la tipologia di un'operazione nave.

Un insieme che deve poter essere amministrato, ampliato, disattivato o versionato viene invece modellato come entità di catalogo. Non deve essere trasformato in un tipo chiuso soltanto per semplificare l'implementazione.

### 3.8.9 Relazioni, copie storiche e dati derivati

Le relazioni tra entità usano riferimenti stabili. Un codice progressivo o una descrizione visibile non sostituiscono l'identità tecnica del dato collegato.

La duplicazione di dati è evitata quando il valore può essere letto dalla fonte autorevole. È invece prevista quando occorre preservare uno snapshot consolidato o quando una proiezione ricostruibile è motivata e dispone di una regola di aggiornamento. In questi casi il modello distingue esplicitamente:

- il riferimento alla fonte originaria;
- il valore copiato o calcolato;
- il momento o la versione da cui il valore è stato ottenuto;
- la condizione che lo rende immutabile oppure ricalcolabile.

### 3.8.10 Tracciamento tecnico

Per le entità autorevoli modificabili si registrano:

- `createdAtUtc`, valorizzato alla creazione;
- `updatedAtUtc`, valorizzato alla creazione e aggiornato a ogni modifica persistita.

Questi attributi hanno precisione massima al millisecondo e non sostituiscono le versioni temporali, gli istanti operativi o gli snapshot. Poiché nella prima versione opera un solo utente senza autenticazione, non vengono previsti attributi generali `createdBy` e `updatedBy`; potranno essere introdotti insieme alla gestione degli utenti.

Non viene introdotto un attributo generico di eliminazione logica per tutte le entità. Eliminazione, disattivazione e conservazione storica seguono il ciclo di vita specifico definito dal dominio.

### 3.8.11 Documentazione e applicazione dei vincoli

Ogni vincolo viene descritto indicando:

- elementi coinvolti;
- condizione valida;
- momento in cui deve essere verificato;
- comportamento in caso di violazione;
- livello minimo al quale deve essere garantito.

I livelli di garanzia sono:

1. **strutturale**, per obbligatorietà, riferimenti, unicità e domini direttamente rappresentabili nel sistema di persistenza;
2. **di dominio e transazionale**, per regole che coinvolgono più entità, sequenze, intervalli, stati o operazioni atomiche;
3. **di interfaccia**, per prevenire e spiegare l'errore prima dell'invio dell'operazione.

Il controllo nell'interfaccia non sostituisce mai la validazione autorevole del dominio. La forma tecnica di chiavi, constraint e indici viene definita successivamente.

### 3.8.12 Decisioni già determinate

Il punto recepisce come già confermate le seguenti decisioni:

- separazione tra modello logico e implementazione fisica;
- uso esclusivo di rappresentazioni decimali esatte per i valori numerici sensibili;
- importi in euro e arrotondamento economico a due decimali dopo ogni passaggio;
- quantità merci con al massimo tre cifre decimali;
- precisione al minuto per gli eventi di dominio e al millisecondo per gli istanti tecnici;
- rappresentazione dei momenti di dominio mediante valore locale, fuso IANA, offset e istante UTC;
- uso del fuso del porto per le attività portuali e del fuso aziendale soltanto nei contesti amministrativi non portuali;
- separazione tra dati correnti ricalcolabili e snapshot consolidati.

### 3.8.13 Decisioni confermate nel punto

Sono confermate le seguenti convenzioni:

1. mantenere in italiano la documentazione funzionale e di dominio e usare identificatori tecnici inglesi nel codice, nelle API e nel database, con una corrispondenza univoca definita dal glossario bilingue;
2. ammettere valori nulli soltanto per assenza, non applicabilità o estremi aperti realmente previsti dal dominio, senza valori fittizi o sentinella;
3. modellare la valuta come parte del tipo logico `ImportoMonetario`, con `EUR` fisso nella prima versione e senza richiederla come dato inseribile per ogni importo;
4. distinguere tipi chiusi da cataloghi amministrabili secondo la possibilità reale di estensione, disattivazione o versionamento;
5. registrare `createdAtUtc` e `updatedAtUtc` sulle entità autorevoli modificabili, senza `createdBy` e `updatedBy` nella prima versione;
6. definire la precisione dei decimali non ancora disciplinati nel relativo punto di dominio, evitando una scala globale non motivata.

### 3.8.14 Esito

Le convenzioni sono coerenti con l'analisi del dominio e con i requisiti funzionali. Il punto è **completato** e non presenta decisioni aperte. Il glossario bilingue verrà ampliato nei punti successivi senza modificare le regole qui definite.

## 3.9 Punto 2 – Identificativi tecnici, codici progressivi e riferimenti stabili

### 3.9.1 Tema e obiettivo

Il punto definisce come riconoscere in modo permanente entità, versioni, associazioni e componenti, senza confondere l'identità interna con codici visibili, dati identificativi o valori utilizzati per l'ordinamento.

Gli identificativi devono garantire che una modifica di nome, codice, data, posizione o versione non interrompa le relazioni esistenti e non crei una continuità fittizia tra elementi differenti.

### 3.9.2 Classificazione degli identificatori

Il modello distingue le seguenti categorie:

| Categoria | Funzione | Esempio |
| --- | --- | --- |
| Identità tecnica stabile | Riconosce permanentemente un'entità e viene usata nei riferimenti interni. | Identità di una nave o di un movimento contabile. |
| Codice progressivo stabile | Fornisce un codice amministrativo permanente, distinto dall'identità tecnica. | Codice progressivo di un'anagrafica. |
| Identificativo di dominio | Identifica un documento secondo regole funzionali specifiche. | `1-A/2026` per una fattura. |
| Codice configurabile | Valore gestito dall'operatore, modificabile e talvolta riutilizzabile. | Codice di un conto, di una categoria o di una voce contabile. |
| Identificativo naturale o secondario | Dato reale che contribuisce a riconoscere o deduplicare un elemento. | Codice IMO o ragione sociale. |
| Progressivo di ordinamento | Definisce una posizione modificabile in una sequenza e non l'identità dell'elemento. | Progressivo giornaliero di un movimento contabile. |
| Codice chiuso | Rappresenta un valore appartenente a un insieme finito. | Tipo `entrata`, `uscita` o `spostamento`. |

Le categorie non sono intercambiabili. In particolare, un codice visibile, una chiave naturale o un progressivo di ordinamento non vengono mai usati come riferimento persistente al posto dell'identità tecnica.

### 3.9.3 Identità tecnica stabile

Ogni entità persistente con un ciclo di vita riconoscibile possiede un identificativo tecnico obbligatorio di tipo logico `StableId`.

Lo `StableId` è:

- generato automaticamente dal sistema;
- opaco, quindi privo di significato funzionale e non costruito a partire da altri dati;
- immutabile per l'intera esistenza dell'elemento;
- non riutilizzabile dopo l'eliminazione;
- indipendente da codici, descrizioni, date, versioni e posizioni;
- utilizzabile come riferimento stabile nel codice, nelle API e nella persistenza;
- normalmente non mostrato all'operatore, salvo esigenze diagnostiche o di assistenza.

Lo `StableId` è globalmente univoco nello spazio dei dati prodotti dall'applicazione e può essere generato senza dipendere da una sequenza centralizzata. Questa proprietà agevola copie operative, esportazioni strutturate ed eventuali evoluzioni future. La rappresentazione fisica verrà scelta nell'architettura; `UUIDv7` costituisce il candidato preferenziale, ma non viene ancora imposto dal modello logico.

### 3.9.4 Entità, versioni, associazioni e componenti

L'identità viene attribuita secondo il ruolo dell'elemento:

| Elemento | Identificazione logica |
| --- | --- |
| Entità autonoma | Possiede un proprio `StableId`. |
| Identità anagrafica versionata | Possiede uno `StableId` comune a tutte le versioni. |
| Versione temporale | Possiede un proprio `StableId` e il riferimento obbligatorio all'identità versionata. |
| Associazione con dati o ciclo di vita propri | Possiede un proprio `StableId`, come una quota tra incasso e fattura. |
| Componente dipendente modificabile, ordinabile, consolidabile o referenziabile singolarmente | Possiede un proprio `StableId`, pur rimanendo subordinato al proprietario. |
| Associazione pura senza dati propri | Può essere identificata dalla coppia dei riferimenti, se non deve essere gestita o referenziata autonomamente. |
| Oggetto valore | Non possiede identità e viene confrontato per contenuto. |
| Tipo o stato chiuso | È riconosciuto da un codice stabile definito dal dominio e non riceve uno `StableId`. |

La presenza di uno `StableId` su un componente non gli attribuisce un ciclo di vita autonomo: eliminazione e validità continuano a dipendere dall'entità proprietaria.

Un componente tecnico identificato univocamente dal proprio ruolo all'interno del proprietario può non ricevere un'identità logica separata. Per esempio, le componenti di origine, destinazione ed eventuale costo di un giroconto rimangono riconoscibili mediante l'identità del giroconto e il rispettivo ruolo. Un eventuale identificatore richiesto dalla persistenza non modifica questa semantica.

### 3.9.5 Riferimenti alle identità e alle versioni

Le relazioni ordinarie fanno riferimento allo `StableId` dell'entità. Questo mantiene il collegamento anche quando cambiano codice, denominazione o versione corrente.

Quando occorre preservare il valore temporalmente applicato, il modello distingue:

- `entityId`, che individua la continuità dell'entità;
- `versionId`, che individua la versione effettivamente applicata;
- istante o data di dominio usati per determinare la versione;
- valori copiati nello snapshot, quando il risultato è consolidato.

Un dato corrente e ricalcolabile può aggiornare il proprio riferimento alla versione applicata in seguito a una modifica temporale consentita. Dopo il consolidamento, il riferimento alla versione e i valori utilizzati nel risultato restano immutabili.

Il riferimento alla versione non sostituisce quello all'identità principale quando è necessario riconoscere la continuità dell'elemento. Gli snapshot conservano, quando disponibili, sia i riferimenti alla fonte sia i valori copiati, ma continuano a essere validi anche se la fonte non è più selezionabile.

### 3.9.6 Codici progressivi delle anagrafiche

Ogni anagrafica possiede, oltre allo `StableId`, un codice progressivo stabile comune a tutte le proprie versioni.

Il codice:

- sia un numero intero positivo assegnato automaticamente alla creazione;
- appartenga a una sequenza autonoma per ciascuna tipologia di anagrafica;
- sia immutabile;
- non venga mai riassegnato, neppure dopo l'eliminazione fisica dell'anagrafica;
- ammetta intervalli non utilizzati senza provocare rinumerazioni;
- non contenga informazioni descrittive o gerarchiche;
- possa essere presentato con un prefisso o una formattazione grafica senza modificare il valore memorizzato.

Il codice progressivo non viene usato come chiave esterna. La numerazione di una nuova anagrafica avanza rispetto all'ultimo valore assegnato della propria tipologia e non dipende dal numero di elementi ancora esistenti.

Per le banchine la sequenza è unica per la tipologia `Banchina`, non separata per porto. L'appartenenza al porto rimane una relazione distinta e immutabile.

### 3.9.7 Identificatori e codici con regole specifiche

Le regole già definite nei documenti precedenti vengono ricondotte al seguente schema:

| Elemento | Identificatore o codice | Modificabilità e riutilizzo |
| --- | --- | --- |
| Anagrafica | `StableId` e codice progressivo | Entrambi immutabili e mai riutilizzati; le versioni condividono gli stessi valori. |
| Versione temporale | `StableId` proprio | Immutabile; decorrenza e contenuto possono cambiare soltanto secondo le regole temporali e di consolidamento. |
| Fattura | `StableId` e identificativo anno-progressivo-suffisso | L'identificativo di dominio è modificabile prima della prima emissione; dopo diventa immutabile e rimane riservato. |
| Movimento contabile | `StableId` e progressivo giornaliero | Lo `StableId` è immutabile; il progressivo cambia con inserimenti, eliminazioni, riordini e variazioni della data contabile. |
| Conto finanziario | `StableId` e codice operativo | Il codice è modificabile anche dopo l'utilizzo e quello liberato può essere riutilizzato. |
| Categoria o voce contabile | `StableId` e codice configurabile | Il codice è modificabile; rimane riservato durante la disattivazione e viene liberato dalla modifica o dall'eliminazione consentita. |
| Nave | `StableId`, codice progressivo e codice IMO facoltativo | L'IMO è un identificativo secondario versionabile e rimane riservato alla nave finché l'anagrafica esiste. |
| Tipo chiuso | Codice tecnico stabile | Non modificabile dall'operatore e non sostituibile con un'identità generata. |

Le associazioni persistenti usano sempre lo `StableId`, anche quando il codice configurabile corrente viene modificato o assegnato successivamente a un'altra entità.

### 3.9.8 Creazione, copia, eliminazione e ripristino

La creazione produce sempre nuove identità tecniche per l'entità e per gli eventuali componenti che richiedono identità propria.

La copia di un elemento, come una tariffa utilizzata quale base per una nuova tariffa, duplica i valori ammessi ma genera nuovi `StableId` per tutti gli elementi copiati. La copia non crea continuità tecnica con l'originale; l'eventuale riferimento all'elemento di origine ha valore informativo e deve essere modellato esplicitamente.

L'eliminazione fisica non rende riutilizzabile alcuno `StableId`. I codici visibili vengono liberati o conservati esclusivamente secondo le regole della relativa categoria.

Un ripristino completo da backup conserva gli identificativi originali perché ricostruisce lo stesso insieme di dati. Un'importazione che crea elementi nuovi deve invece generare nuove identità, salvo una futura procedura esplicita di sincronizzazione o fusione dei dati.

### 3.9.9 Chiavi di dominio, unicità e ordinamento

Le combinazioni che identificano univocamente un fatto di dominio rimangono vincoli, ma non sostituiscono lo `StableId`. Esempi sono:

- anno, numero progressivo e suffisso della fattura;
- porto e denominazione normalizzata della banchina;
- data contabile e progressivo giornaliero del movimento;
- coppia incasso-fattura per l'associazione economica, se può esistere una sola quota per coppia;
- proprietario e decorrenza per una versione temporale.

La generazione di identificativi e codici, la verifica dell'unicità e la creazione dell'elemento avvengono nella stessa operazione atomica. In presenza di operazioni concorrenti non possono essere creati duplicati, anche se l'interfaccia aveva mostrato un valore disponibile.

Un ordinamento deve essere sempre deterministico. Quando i criteri funzionali risultano uguali, lo `StableId` può essere utilizzato come ultimo criterio tecnico senza attribuirgli un significato cronologico.

### 3.9.10 Terminologia tecnica bilingue

Il glossario del punto 1 viene esteso come segue:

| Termine di dominio | Nome tecnico |
| --- | --- |
| Identità tecnica stabile | `StableId` |
| Codice progressivo stabile | `StableProgressiveNumber` |
| Identificativo di dominio | `BusinessIdentifier` |
| Codice configurabile | `ConfigurableCode` |
| Identificativo naturale | `NaturalIdentifier` |
| Progressivo di ordinamento | `SequencePosition` |
| Identità dell'entità | `entityId` |
| Identità della versione | `versionId` |

I nomi esatti degli attributi possono essere specializzati nel relativo ambito, per esempio `invoiceNumber`, `dailySequence` o `accountCode`, evitando nomi generici quando il significato può risultare ambiguo.

### 3.9.11 Decisioni già determinate

Sono già confermate dai documenti precedenti:

- la separazione tra identità tecnica, codici visibili e progressivi di ordinamento;
- la stabilità dell'identità tecnica anche quando cambiano i dati descrittivi o i codici modificabili;
- l'identità comune alle versioni della stessa anagrafica o regola;
- il codice progressivo stabile e non riutilizzabile delle anagrafiche;
- le regole specifiche di consolidamento dell'identificativo della fattura;
- la natura modificabile e non identificativa del progressivo giornaliero dei movimenti;
- la modificabilità e il possibile riutilizzo dei codici di conti, categorie e voci contabili;
- l'uso di riferimenti stabili per preservare associazioni e continuità storica.

### 3.9.12 Decisioni confermate nel punto

Sono confermate le seguenti scelte:

1. adottare un tipo logico opaco `StableId`, globalmente univoco e generabile senza una sequenza centralizzata, rinviandone la rappresentazione fisica all'architettura con preferenza per `UUIDv7`;
2. attribuire uno `StableId` anche alle versioni temporali, alle associazioni con dati propri e ai componenti dipendenti modificabili, ordinabili, consolidabili o referenziabili singolarmente;
3. consentire alle associazioni pure senza dati propri e ai componenti riconoscibili univocamente dal ruolo di non possedere un'identità logica autonoma;
4. generare i codici progressivi delle anagrafiche mediante sequenze separate per tipologia, a partire da `1`, ammettendo intervalli inutilizzati e senza riutilizzare valori eliminati;
5. utilizzare per le banchine un'unica sequenza progressiva della tipologia, non una sequenza distinta per ciascun porto;
6. generare nuove identità per le copie e per le importazioni che creano nuovi elementi, conservando invece gli identificativi originali nei ripristini completi da backup;
7. usare sempre lo `StableId` nei riferimenti persistenti, mantenendo codici e chiavi di dominio come dati di ricerca, visualizzazione e vincoli di unicità.

### 3.9.13 Esito

Le regole già definite risultano coerenti con questa classificazione. Il punto è **completato** e non presenta decisioni aperte. La rappresentazione fisica dello `StableId` e delle relative chiavi rimane rinviata alla fase architetturale, mantenendo `UUIDv7` come candidato preferenziale.

## 3.10 Punto 3 – Anagrafiche e versioni temporali

### 3.10.1 Tema e obiettivo

Il punto traduce nel modello logico le anagrafiche di nave, cliente, agenzia, porto, banchina e merce. Ogni anagrafica deve mantenere una continuità stabile mentre i propri dati cambiano nel tempo, consentendo di ricostruire il valore applicabile a qualsiasi attività passata, corrente o futura.

La struttura deve inoltre preservare i valori identificativi già utilizzati, distinguere lo stato corrente dalla validità temporale dei dati e impedire eliminazioni che produrrebbero riferimenti orfani.

### 3.10.2 Struttura logica comune

Il modello concettuale è composto da due livelli astratti:

1. **Anagrafica (`MasterData`)**, che rappresenta l'identità stabile;
2. **Versione anagrafica (`MasterDataVersion`)**, che contiene lo stato descrittivo applicabile in un intervallo temporale.

Le entità astratte definiscono convenzioni comuni, mentre nave, cliente, agenzia, porto, banchina e merce rimangono entità concrete e tipizzate. Il modello non utilizza una struttura generica basata su coppie chiave-valore, campi dinamici o documenti JSON per memorizzare gli attributi anagrafici.

L'eventuale strategia fisica di ereditarietà o separazione delle tabelle viene rinviata all'architettura.

### 3.10.3 Entità anagrafica comune

Ogni identità anagrafica contiene:

| Attributo logico | Tipo | Obbligatorio | Significato |
| --- | --- | --- | --- |
| `id` | `StableId` | Sì | Identità tecnica immutabile comune a tutte le versioni. |
| `progressiveNumber` | `StableProgressiveNumber` | Sì | Codice progressivo stabile della specifica tipologia. |
| `status` | `MasterDataStatus` | Sì | Stato corrente `ACTIVE` oppure `INACTIVE`. |
| `createdAtUtc` | Istante tecnico | Sì | Istante di creazione dell'identità. |
| `updatedAtUtc` | Istante tecnico | Sì | Istante dell'ultima modifica persistita all'identità o al suo stato. |

Lo stato viene inizializzato a `ACTIVE`, appartiene all'identità e non è versionato. Disattivazione e riattivazione hanno effetto immediato e non modificano la sequenza delle versioni.

Non viene memorizzata come dato autorevole una relazione `currentVersionId`: la versione corrente viene determinata rispetto all'istante di riferimento. Un eventuale puntatore o una proiezione introdotti per prestazioni devono essere ricostruibili e non possono diventare una seconda fonte di verità.

### 3.10.4 Versione anagrafica comune

Ogni versione contiene:

| Attributo logico | Tipo | Obbligatorio | Significato |
| --- | --- | --- | --- |
| `id` | `StableId` | Sì | Identità tecnica della singola versione. |
| `masterDataId` | `StableId` | Sì | Riferimento all'identità anagrafica proprietaria. |
| `effectiveFrom` | Momento di dominio | No per la versione iniziale; sì per le successive | Decorrenza inclusa della versione. |
| dati specifici | Tipi definiti per l'anagrafica | Sì secondo l'attributo | Stato descrittivo completo applicabile nell'intervallo. |
| `createdAtUtc` | Istante tecnico | Sì | Istante tecnico di creazione della versione. |
| `updatedAtUtc` | Istante tecnico | Sì | Istante tecnico dell'ultima modifica alla versione. |

La versione iniziale è riconosciuta dall'assenza di `effectiveFrom`; non richiede un indicatore booleano aggiuntivo. Copre ogni istante precedente alla prima versione con decorrenza e non può essere eliminata.

Ogni versione contiene una fotografia completa di tutti gli attributi versionati dell'anagrafica, non soltanto le differenze rispetto alla versione precedente. La fine dell'intervallo non viene memorizzata: coincide con la decorrenza esclusa della versione successiva oppure rimane indefinita per l'ultima versione.

Per una stessa identità non possono esistere due versioni con la medesima decorrenza. La versione applicabile a un istante è:

- la versione con `effectiveFrom` più recente non successiva all'istante;
- la versione iniziale, se nessuna decorrenza è precedente o uguale all'istante.

La versione avente la decorrenza massima non coincide necessariamente con quella corrente, perché può essere futura.

### 3.10.5 Attributi delle anagrafiche concrete

Gli attributi versionati iniziali sono:

| Anagrafica e versione tecnica | Attributi specifici | Vincoli principali |
| --- | --- | --- |
| Nave (`Vessel`, `VesselVersion`) | `registeredName`, `imoNumber`, `vesselTypeId`, `size` | Nome obbligatorio; IMO facoltativo; tipologia obbligatoria; dimensione intera non negativa. |
| Cliente (`Customer`, `CustomerVersion`) | `businessName` | Ragione sociale obbligatoria. |
| Agenzia (`Agency`, `AgencyVersion`) | `businessName` | Ragione sociale obbligatoria. |
| Porto (`Port`, `PortVersion`) | `name`, `locality`, `countryCode` | Tutti obbligatori; il fuso operativo è escluso dalla versione descrittiva. |
| Banchina (`Berth`, `BerthVersion`) | sulla radice `portId`; sulla versione `name` | Porto obbligatorio e immutabile; nome obbligatorio. |
| Merce (`CargoType`, `CargoTypeVersion`) | `name` | Denominazione obbligatoria. |

Non vengono introdotti nella prima versione ulteriori campi descrittivi non richiesti. La loro eventuale aggiunta seguirà la stessa distinzione tra dati identitari, dati versionati e relazioni permanenti.

Il fuso operativo del porto segue una propria sequenza temporale e verrà modellato nel punto 14; non appartiene a `PortVersion` e non cambia insieme ai dati descrittivi del porto.

### 3.10.6 Tipologia della nave

La tipologia della nave determina tariffe e scaglioni e deve poter essere referenziata stabilmente dalle versioni delle navi e dalle configurazioni tariffarie.

`VesselType` è modellato come catalogo tecnico tipizzato, non versionato e non amministrabile dall'operatore nella prima versione. Gli elementi iniziali utilizzano i codici stabili:

- `STANDARD` per nave normale;
- `PASSENGER` per nave passeggeri;
- `ADM` per nave ADM.

Ogni elemento del catalogo possiede uno `StableId`, un codice tecnico immutabile e una denominazione localizzabile. Una futura introduzione di nuove tipologie non modifica le identità delle navi esistenti, ma deve rispettare le regole di completamento delle tariffe definite nel punto 9.

### 3.10.7 Paese del porto

Per evitare varianti testuali della stessa nazione, `countryCode` utilizza il codice `ISO 3166-1 alpha-2`. La denominazione della nazione mostrata all'operatore viene localizzata a partire dal codice e non partecipa direttamente all'unicità.

Il nome e la località del porto restano testi normalizzati. La chiave identificativa del porto è quindi composta da nome normalizzato, località normalizzata e `countryCode`.

### 3.10.8 Prenotazione dei dati identificativi

La sola conservazione delle versioni esistenti non è sufficiente a rispettare le regole di unicità: un valore deve rimanere riservato alla stessa identità anche quando la versione che lo conteneva viene modificata o eliminata.

Il modello introduce quindi il componente dipendente **Prenotazione identificativa (`IdentifierReservation`)**, contenente logicamente:

| Attributo | Significato |
| --- | --- |
| `id` | `StableId` della prenotazione. |
| `ownerId` | Identità anagrafica alla quale il valore è riservato. |
| `identifierKind` | Tipo di dato identificativo prenotato. |
| `scopeId` | Eventuale ambito dell'unicità, come il porto per il nome della banchina. |
| `normalizedKey` | Chiave normalizzata semplice o composta utilizzata nel confronto. |
| `createdAtUtc` | Istante della prima prenotazione. |

L'unicità viene verificata sulla combinazione tra tipo, eventuale ambito e chiave normalizzata. La forma fisica delle chiavi semplici e composte verrà precisata insieme ai vincoli e agli indici, evitando concatenazioni testuali ambigue.

Le prenotazioni vengono gestite come segue:

- alla creazione o modifica di una versione, ogni valore identificativo nuovo genera una prenotazione per l'identità;
- il riutilizzo di un proprio valore storico usa la prenotazione già posseduta;
- la modifica o eliminazione di una versione non elimina le relative prenotazioni;
- la disattivazione non modifica le prenotazioni;
- l'eliminazione fisica dell'intera anagrafica elimina le prenotazioni dipendenti e libera i valori.

I dati prenotati sono:

| Anagrafica | Chiave prenotata | Ambito |
| --- | --- | --- |
| Cliente | ragione sociale normalizzata | Globale tra i clienti. |
| Agenzia | ragione sociale normalizzata | Globale tra le agenzie. |
| Nave | nome di registrazione normalizzato | Globale tra le navi. |
| Nave | codice IMO normalizzato, se presente | Globale tra le navi. |
| Porto | nome, località e paese normalizzati | Globale tra i porti. |
| Banchina | nome normalizzato | Singolo `portId`. |
| Merce | denominazione normalizzata | Globale tra le merci. |

La normalizzazione elimina gli spazi iniziali e finali e applica un confronto senza distinzione tra maiuscole e minuscole. Gli spazi interni e il valore visualizzato non vengono modificati salvo ulteriori regole specifiche.

### 3.10.9 Stato corrente e selezionabilità

Una nuova relazione può essere creata o sostituita soltanto verso un'anagrafica nello stato `ACTIVE`. Il controllo appartiene al dominio e non alla sola interfaccia, perché un vincolo referenziale ordinario garantisce l'esistenza dell'identità ma non la sua selezionabilità.

Un riferimento già esistente verso un'anagrafica successivamente disattivata rimane valido e può essere conservato mentre vengono modificati altri dati. Dopo la rimozione non può essere ripristinato finché l'anagrafica non viene riattivata.

Per una banchina, la selezionabilità effettiva è derivata e richiede contemporaneamente:

- `Berth.status = ACTIVE`;
- `Port.status = ACTIVE`.

Questa proprietà non viene memorizzata come stato autonomo. Disattivare un porto non modifica lo stato delle banchine, ma le rende indisponibili per nuovi riferimenti; la riattivazione del porto rende nuovamente selezionabili soltanto quelle individualmente attive.

### 3.10.10 Relazione tra porto e banchina

`Berth.portId` appartiene alla radice della banchina, non a `BerthVersion`, ed è obbligatorio e immutabile.

La cardinalità è:

- un porto contiene zero o più banchine;
- una banchina appartiene esattamente a un porto.

La creazione di una banchina richiede un porto attivo. Per rappresentare una banchina presso un porto differente occorre creare una nuova identità con un nuovo codice progressivo; la banchina originaria mantiene i propri riferimenti e può essere disattivata.

Un porto non può essere eliminato finché contiene almeno una banchina, anche priva di altri riferimenti. Non sono previste eliminazioni a cascata: le banchine eliminabili devono essere rimosse esplicitamente.

### 3.10.11 Modifica della sequenza temporale

Inserimento, modifica o eliminazione di una versione devono mantenere:

- almeno la versione iniziale;
- decorrenze univoche nella stessa identità;
- intervalli con inizio incluso e fine esclusa;
- una sola versione applicabile per ogni istante;
- assenza di intervalli privi di valori;
- almeno una differenza rispetto alla versione immediatamente precedente per ogni nuova versione.

Una nuova versione può avere decorrenza passata, intermedia, corrente o futura. La versione iniziale può essere corretta nei valori, ma non può ricevere una decorrenza. Una versione successiva può modificare valori e decorrenza oppure essere eliminata.

Se una modifica rende adiacenti due versioni con valori identici, entrambe vengono conservate; un eventuale accorpamento richiede l'eliminazione esplicita della versione ridondante. Il contenuto non costituisce quindi una chiave di unicità.

Prima di ogni variazione il sistema determina l'intervallo interessato, individua gli elementi dipendenti, simula ricalcoli e riattribuzioni e verifica i risultati consolidati. Modifica della sequenza, aggiornamento delle prenotazioni e ricalcoli consentiti avvengono atomicamente.

### 3.10.12 Riferimenti storici e consolidamento

Gli elementi operativi ed economici fanno riferimento all'identità anagrafica e registrano la versione applicata secondo le convenzioni del punto 2. Finché sono ricalcolabili, una variazione temporale consentita può aggiornare `versionId` e risultati derivati.

Una variazione viene bloccata soltanto quando modificherebbe direttamente o indirettamente dati o risultati consolidati. La sola presenza di un elemento consolidato nell'intervallo non costituisce un blocco se il dato e il risultato utilizzati rimangono identici.

La fattura emessa conserva nello snapshot i dati anagrafici riportati nel documento e i relativi riferimenti disponibili. Le consultazioni operative storiche usano invece la versione valida all'istante dell'elemento; i raggruppamenti mantengono l'identità unica salvo una separazione esplicita per versione.

### 3.10.13 Eliminazione fisica

L'eliminazione di un'anagrafica è consentita soltanto se non esiste alcun riferimento persistente diretto o indiretto alla radice o alle sue versioni.

Il controllo comprende elementi operativi, prestazioni, movimentazioni merci, tariffe, fatture, movimenti contabili, snapshot che conservano riferimenti e altre anagrafiche. Gli elementi bloccanti non vengono rimossi automaticamente e non sono previste eliminazioni a cascata.

Quando l'eliminazione è consentita, vengono eliminati atomicamente:

- identità anagrafica;
- tutte le versioni;
- prenotazioni identificative;
- metadati tecnici dipendenti.

Il codice progressivo rimane definitivamente non riutilizzabile. I dati identificativi vengono invece liberati e possono appartenere a una nuova identità senza creare continuità con quella eliminata.

### 3.10.14 Terminologia tecnica bilingue

Il glossario viene esteso come segue:

| Termine di dominio | Nome tecnico |
| --- | --- |
| Anagrafica | `MasterData` |
| Versione anagrafica | `MasterDataVersion` |
| Stato anagrafico | `MasterDataStatus` |
| Nave | `Vessel` |
| Cliente | `Customer` |
| Agenzia | `Agency` |
| Porto | `Port` |
| Banchina | `Berth` |
| Merce | `CargoType` |
| Tipologia nave | `VesselType` |
| Prenotazione identificativa | `IdentifierReservation` |
| Decorrenza | `effectiveFrom` |

### 3.10.15 Decisioni già determinate

Sono già confermate:

- identità tecnica e codice progressivo comuni a tutte le versioni;
- versione iniziale senza limite temporale inferiore e versioni successive con decorrenza;
- fine dell'intervallo derivata dalla versione successiva;
- stato corrente attivo o disattivato non versionato;
- versioni storiche applicabili a eventi passati, correnti e futuri;
- possibilità di inserire, modificare ed eliminare versioni successive nel rispetto del consolidamento;
- conservazione dei valori identificativi per l'intera esistenza dell'anagrafica;
- eliminazione fisica soltanto in assenza di riferimenti;
- relazione obbligatoria, subordinata e immutabile tra banchina e porto;
- esclusione del fuso operativo dalla versione descrittiva del porto.

### 3.10.16 Decisioni confermate nel punto

Sono confermate le seguenti scelte strutturali:

1. adottare i tipi astratti `MasterData` e `MasterDataVersion`, mantenendo entità e attributi concreti tipizzati ed evitando modelli generici EAV o JSON;
2. memorizzare in ogni versione tutti gli attributi versionati, anziché soltanto le differenze rispetto alla versione precedente;
3. rappresentare la versione iniziale mediante `effectiveFrom` assente, senza un indicatore aggiuntivo, e derivare sia la versione corrente sia la fine degli intervalli senza memorizzare un `currentVersionId` autorevole;
4. introdurre `IdentifierReservation` per conservare i valori identificativi utilizzati anche dopo la modifica o l'eliminazione della versione che li conteneva;
5. modellare `VesselType` come catalogo tecnico non versionato e non amministrabile nella prima versione, con codici iniziali `STANDARD`, `PASSENGER` e `ADM`;
6. rappresentare la nazione del porto mediante un codice `ISO 3166-1 alpha-2`, mostrando una denominazione localizzata;
7. derivare la selezionabilità della banchina dagli stati correnti della banchina e del porto, senza memorizzare un ulteriore stato;
8. utilizzare `CargoType` come nome tecnico dell'anagrafica merce, per distinguerla dalle singole quantità di carico movimentate.

### 3.10.17 Esito

Il modello copre le sei anagrafiche, le rispettive versioni, lo stato corrente, le prenotazioni dei valori identificativi e la relazione porto-banchina. Il punto è **completato** e non presenta decisioni aperte.

## 3.11 Punto 4 – Navi, viaggi, visite e ormeggi

### 3.11.1 Tema e obiettivo

Il punto definisce la struttura persistente delle permanenze di una nave nei porti gestiti: una nave compie viaggi, ogni viaggio comprende visite ai porti e ogni visita comprende ormeggi.

Entrata, spostamento e uscita costituiscono gli eventi che aprono, modificano e chiudono questa struttura. Il modello deve consentire di consultare rapidamente le permanenze senza ricostruirle a ogni lettura, mantenendo però le operazioni nave come fonte autorevole e rendendo l'intera struttura verificabile e ricostruibile.

### 3.11.2 Gerarchia e cardinalità

La gerarchia è composta da:

1. **Nave (`Vessel`)**;
2. **Viaggio (`Voyage`)**;
3. **Visita portuale (`PortCall`)**;
4. **Ormeggio (`BerthStay`)**.

Le cardinalità sono:

| Relazione | Cardinalità e significato |
| --- | --- |
| `Vessel` → `Voyage` | Una nave può avere zero o più viaggi; ogni viaggio appartiene esattamente a una nave. |
| `Voyage` → `PortCall` | Un viaggio contiene una o più visite; ogni visita appartiene esattamente a un viaggio. |
| `PortCall` → `BerthStay` | Una visita contiene uno o più ormeggi; ogni ormeggio appartiene esattamente a una visita. |

Un viaggio non può esistere senza la visita iniziale e una visita non può esistere senza il proprio ormeggio iniziale. La creazione degli elementi necessari avviene nella stessa operazione atomica.

### 3.11.3 Fonte autorevole e struttura persistita

Le operazioni nave con stato `PLANNED` oppure `PERFORMED` costituiscono la sequenza autorevole dalla quale vengono determinati viaggi, visite e ormeggi. Un'operazione `MISSED` rimane nella sequenza informativa, ma non apre e non chiude elementi della permanenza.

`Voyage`, `PortCall` e `BerthStay` sono entità persistite derivate. Possiedono una propria identità stabile perché vengono consultate, referenziate da attività e utilizzate nei processi di fatturazione, ma non possono essere create, spostate, chiuse o eliminate direttamente.

La loro modifica avviene soltanto come effetto atomico dell'inserimento, della modifica, del cambio di stato o dell'eliminazione di un'operazione nave. La sequenza completa deve poter essere rielaborata per verificare e, quando consentito, riallineare struttura e attribuzioni.

Non vengono memorizzati come fonti autorevoli:

- puntatori alla visita o all'ormeggio corrente sulla nave o sul viaggio;
- un'entità autonoma per il trasferimento;
- numeri d'ordine modificabili di visite e ormeggi;
- uno stato duplicato `OPEN` o `CLOSED`.

Il contesto corrente si determina dagli elementi aperti; l'intervallo di trasferimento si deriva dagli estremi dello spostamento; l'ordinamento si determina dagli istanti di inizio; lo stato aperto o chiuso si deriva dall'assenza o dalla presenza della chiusura.

### 3.11.4 Identità e collegamenti alle operazioni originarie

Ogni viaggio, visita e ormeggio possiede un proprio `StableId`. Per rendere stabile l'identità anche durante una ricostruzione controllata, ciascun elemento viene ancorato all'operazione che lo ha aperto:

| Elemento | Operazione di apertura |
| --- | --- |
| `Voyage` | Entrata che apre il viaggio. |
| `PortCall` | Entrata per la prima visita oppure arrivo di uno spostamento tra porti. |
| `BerthStay` | Entrata per il primo ormeggio oppure arrivo di uno spostamento. |

`openingOperationId` è obbligatorio e univoco all'interno della singola tipologia di elemento. La stessa entrata può quindi aprire un viaggio, una visita e un ormeggio, mentre uno spostamento può contemporaneamente chiudere un elemento di origine e aprirne uno di destinazione.

`closingOperationId` è facoltativo finché l'elemento è aperto. Quando presente identifica:

- l'uscita che chiude viaggio, ultima visita e ultimo ormeggio;
- lo spostamento che chiude l'ormeggio di origine;
- lo spostamento tra porti che chiude anche la visita di origine.

Durante una ricostruzione viene conservato lo `StableId` se la stessa operazione continua ad aprire lo stesso tipo di elemento, anche quando vengono corretti porto, banchina, istante o appartenenza. Se l'elemento non è più prodotto dalla sequenza, viene rimosso; una sua eventuale futura ricreazione genera una nuova identità, senza riutilizzare quella eliminata.

### 3.11.5 Viaggio (`Voyage`)

Il viaggio rappresenta il percorso operativo complessivo della nave tra un'entrata e la relativa uscita.

| Attributo logico | Tipo | Obbligatorio | Significato e origine |
| --- | --- | --- | --- |
| `id` | `StableId` | Sì | Identità tecnica del viaggio. |
| `vesselId` | Riferimento a `Vessel` | Sì | Nave alla quale appartiene il viaggio. |
| `vesselVersionId` | Riferimento a `VesselVersion` | Sì | Versione della nave applicabile all'inizio del viaggio. |
| `openingOperationId` | Riferimento a `VesselOperation` | Sì | Entrata che apre il viaggio. |
| `closingOperationId` | Riferimento a `VesselOperation` | No | Uscita che chiude il viaggio. |
| `startedAt` | Momento di dominio | Sì | Copia derivata dell'istante dell'entrata. |
| `endedAt` | Momento di dominio | No | Copia derivata dell'istante dell'uscita; assente per il viaggio aperto. |
| `customerId` | Riferimento a `Customer` | No | Cliente eventualmente specificato sul viaggio. |
| `agencyId` | Riferimento a `Agency` | No | Agenzia eventualmente specificata sul viaggio. |
| `createdAtUtc` | Istante tecnico | Sì | Creazione tecnica dell'elemento persistito. |
| `updatedAtUtc` | Istante tecnico | Sì | Ultimo aggiornamento della struttura o delle assegnazioni. |

La semantica temporale e il ricalcolo dei riferimenti specificati a cliente e agenzia verranno completati nel punto 8. Tali valori sono gestibili senza consentire la modifica diretta della struttura del viaggio.

### 3.11.6 Visita portuale (`PortCall`)

La visita rappresenta la permanenza della nave presso un singolo porto all'interno di un viaggio.

| Attributo logico | Tipo | Obbligatorio | Significato e origine |
| --- | --- | --- | --- |
| `id` | `StableId` | Sì | Identità tecnica della visita. |
| `voyageId` | Riferimento a `Voyage` | Sì | Viaggio proprietario. |
| `portId` | Riferimento a `Port` | Sì | Porto della visita. |
| `portVersionId` | Riferimento a `PortVersion` | Sì | Versione del porto applicabile all'inizio della visita. |
| `openingOperationId` | Riferimento a `VesselOperation` | Sì | Entrata o spostamento tra porti che apre la visita. |
| `closingOperationId` | Riferimento a `VesselOperation` | No | Spostamento tra porti o uscita che chiude la visita. |
| `startedAt` | Momento di dominio | Sì | Istante derivato dell'arrivo nel porto. |
| `endedAt` | Momento di dominio | No | Istante derivato della partenza dal porto; assente per la visita aperta. |
| `customerId` | Riferimento a `Customer` | No | Cliente eventualmente specificato sulla visita. |
| `agencyId` | Riferimento a `Agency` | No | Agenzia eventualmente specificata sulla visita. |
| `createdAtUtc` | Istante tecnico | Sì | Creazione tecnica dell'elemento persistito. |
| `updatedAtUtc` | Istante tecnico | Sì | Ultimo aggiornamento della struttura o delle assegnazioni. |

Il porto non è modificabile direttamente sulla visita: una correzione richiede la variazione dell'operazione di entrata o dello spostamento che l'ha aperta.

### 3.11.7 Ormeggio (`BerthStay`)

L'ormeggio rappresenta un intervallo continuativo della visita e, quando conosciuta, la collocazione della nave presso una specifica banchina.

| Attributo logico | Tipo | Obbligatorio | Significato e origine |
| --- | --- | --- | --- |
| `id` | `StableId` | Sì | Identità tecnica dell'ormeggio. |
| `portCallId` | Riferimento a `PortCall` | Sì | Visita proprietaria. |
| `berthId` | Riferimento a `Berth` | No | Banchina della nave; assente quando non specificata. |
| `berthVersionId` | Riferimento a `BerthVersion` | No | Versione della banchina applicabile all'inizio dell'ormeggio; presente se e solo se è presente `berthId`. |
| `openingOperationId` | Riferimento a `VesselOperation` | Sì | Entrata o spostamento che apre l'ormeggio. |
| `closingOperationId` | Riferimento a `VesselOperation` | No | Spostamento o uscita che chiude l'ormeggio. |
| `startedAt` | Momento di dominio | Sì | Istante derivato di inizio dell'ormeggio. |
| `endedAt` | Momento di dominio | No | Istante derivato di fine dell'ormeggio; assente per l'ormeggio aperto. |
| `customerId` | Riferimento a `Customer` | No | Cliente eventualmente specificato sull'ormeggio. |
| `agencyId` | Riferimento a `Agency` | No | Agenzia eventualmente specificata sull'ormeggio. |
| `createdAtUtc` | Istante tecnico | Sì | Creazione tecnica dell'elemento persistito. |
| `updatedAtUtc` | Istante tecnico | Sì | Ultimo aggiornamento della struttura o delle assegnazioni. |

La banchina deve appartenere al porto della visita. L'assenza di `berthId` rappresenta esplicitamente una banchina non specificata e non un errore di acquisizione.

La successiva compilazione di una banchina prima sconosciuta aggiorna lo stesso ormeggio e la relativa versione applicata. Non viene creato un nuovo ormeggio, perché non è avvenuto uno spostamento. Ormeggi consecutivi aperti da operazioni differenti rimangono invece distinti anche quando entrambi non indicano una banchina.

### 3.11.8 Riferimenti alle versioni anagrafiche

Ogni elemento della gerarchia conserva sia l'identità anagrafica sia la versione applicabile al proprio istante di apertura:

- il viaggio conserva `vesselId` e `vesselVersionId` determinati a `startedAt`;
- la visita conserva `portId` e `portVersionId` determinati a `startedAt`;
- l'ormeggio conserva `berthId` e `berthVersionId` determinati a `startedAt`, quando la banchina è specificata.

Questi riferimenti descrivono l'elemento della permanenza e non impongono la stessa versione a tutte le attività comprese nel suo intervallo. Operazioni, prestazioni e movimentazioni determinano le versioni applicabili rispetto ai propri istanti.

Finché i dati sono ricalcolabili, una variazione temporale dell'anagrafica può aggiornare il relativo `versionId`. Dopo il consolidamento dei risultati dipendenti, si applicano i blocchi già definiti.

### 3.11.9 Estremi temporali e stato

`startedAt` è sempre presente. `endedAt` e `closingOperationId` sono entrambi assenti per un elemento aperto ed entrambi presenti per un elemento chiuso. Non viene memorizzato un ulteriore stato: `OPEN` e `CLOSED` sono valori derivati.

Gli estremi operativi sono inclusi:

- il minuto dell'entrata appartiene al nuovo viaggio, alla nuova visita e al nuovo ormeggio;
- il minuto di partenza di uno spostamento appartiene all'ormeggio di origine e, quando il porto cambia, alla visita di origine;
- il minuto di arrivo appartiene al nuovo ormeggio e, quando il porto cambia, alla nuova visita;
- il minuto dell'uscita appartiene all'ultimo ormeggio, all'ultima visita e al viaggio.

Il trasferimento è l'intervallo strettamente compreso tra partenza e arrivo. In tale intervallo non esiste un ormeggio applicabile; quando cambia il porto non esiste neppure una visita applicabile. Lo spostamento rimane l'entità autorevole e non viene duplicato in una distinta entità `Transfer`.

I momenti copiati sulla gerarchia servono alla consultazione e alla ricerca, ma restano dati derivati: devono coincidere con l'estremo pertinente dell'operazione collegata e non possono essere modificati direttamente.

### 3.11.10 Vincoli strutturali e temporali

Devono essere garantiti almeno i seguenti vincoli:

- per una nave può esistere al massimo un viaggio aperto;
- per un viaggio può esistere al massimo una visita aperta;
- per una visita può esistere al massimo un ormeggio aperto;
- le visite dello stesso viaggio sono ordinate, non sovrapposte e contenute nell'intervallo del viaggio;
- gli ormeggi della stessa visita sono ordinati, non sovrapposti e contenuti nell'intervallo della visita;
- la prima visita e il primo ormeggio iniziano insieme al viaggio;
- quando il viaggio è chiuso, l'ultima visita e il relativo ultimo ormeggio terminano insieme al viaggio;
- quando una visita è chiusa da uno spostamento tra porti, il suo ultimo ormeggio termina allo stesso istante;
- la banchina specificata appartiene al porto della visita;
- l'operazione di apertura e quella di chiusura appartengono alla stessa nave della gerarchia;
- l'operazione di apertura ha stato strutturale `PLANNED` oppure `PERFORMED` e il tipo ammesso per l'elemento;
- la chiusura, quando presente, è successiva all'apertura secondo l'istante UTC;
- `startedAt` e `endedAt` coincidono con gli estremi delle rispettive operazioni originarie;
- una stessa operazione non apre due viaggi, due visite o due ormeggi e non chiude due elementi della stessa tipologia.

La verifica degli intervalli e delle sequenze coinvolge più entità e deve essere garantita dal dominio nella stessa transazione che modifica l'operazione e la struttura. I vincoli locali di obbligatorietà, coerenza tra riferimenti e unicità devono essere rafforzati anche al livello strutturale della persistenza quando tecnicamente possibile.

### 3.11.11 Ciclo di vita, ricostruzione e consolidamento

Viaggi, visite e ormeggi non vengono disattivati e non possiedono un comando autonomo di eliminazione. Il loro ciclo di vita segue la sequenza operativa:

- l'entrata crea viaggio, prima visita e primo ormeggio;
- lo spostamento nello stesso porto chiude un ormeggio e ne apre un altro nella stessa visita;
- lo spostamento tra porti chiude ormeggio e visita di origine e apre visita e ormeggio di destinazione nello stesso viaggio;
- l'uscita chiude ormeggio, visita e viaggio;
- il passaggio di un'operazione a `MISSED` elimina i suoi effetti strutturali mediante ricostruzione controllata;
- il ritorno da `MISSED` a uno stato strutturale applica nuovamente gli effetti generando le identità che non esistono più.

Prima di applicare qualsiasi variazione, il sistema costruisce la sequenza risultante, confronta la nuova gerarchia con quella persistita, conserva le identità ancorate alle aperture ancora presenti e individua elementi creati, modificati o rimossi.

La variazione viene bloccata se produce una sequenza non valida, lascia un'attività senza contesto ammesso o modifica direttamente o indirettamente dati, attribuzioni o risultati consolidati. La struttura non possiede un attributo generico `isConsolidated`: la protezione deriva dagli elementi consolidati che la utilizzano e dal confronto degli effetti della variazione.

Quando la variazione è consentita, aggiornamento dell'operazione, ricostruzione della gerarchia e riattribuzione delle attività non consolidate avvengono atomicamente. Un fallimento non deve lasciare una struttura parzialmente aggiornata.

### 3.11.12 Terminologia tecnica bilingue

Il glossario viene esteso come segue:

| Termine di dominio | Nome tecnico |
| --- | --- |
| Viaggio | `Voyage` |
| Visita portuale | `PortCall` |
| Ormeggio | `BerthStay` |
| Operazione di apertura | `openingOperationId` |
| Operazione di chiusura | `closingOperationId` |
| Inizio | `startedAt` |
| Fine | `endedAt` |
| Intervallo di trasferimento | `TransferInterval` |

`BerthStay` viene preferito a una traduzione generica di ormeggio perché identifica chiaramente l'intervallo di permanenza presso una banchina, anche quando la banchina non è ancora specificata.

### 3.11.13 Decisioni già determinate

Sono già confermati dai documenti precedenti:

- la gerarchia `Vessel → Voyage → PortCall → BerthStay`;
- l'apertura del viaggio mediante entrata e la chiusura mediante uscita;
- il mantenimento dello stesso viaggio durante gli spostamenti tra porti;
- la creazione di un nuovo ormeggio dopo ogni spostamento, anche con banchina non specificata;
- la possibilità di integrare la banchina sconosciuta senza creare uno spostamento fittizio;
- la persistenza della struttura e il collegamento alle operazioni originarie;
- l'impossibilità di modificare o eliminare direttamente gli elementi derivati;
- l'inclusione dei minuti di entrata, partenza, arrivo e uscita negli elementi stabiliti;
- l'assenza di un ormeggio durante il trasferimento e, tra porti diversi, anche di una visita;
- la stessa efficacia strutturale degli stati `PLANNED` e `PERFORMED` e l'assenza di effetti strutturali per `MISSED`;
- il ricalcolo atomico e il blocco delle variazioni che modificherebbero dati consolidati;
- la possibilità di specificare separatamente cliente e agenzia su viaggio, visita e ormeggio.

### 3.11.14 Decisioni confermate nel punto

Sono confermate le seguenti decisioni strutturali:

1. modellare viaggio, visita e ormeggio come entità persistite derivate con `StableId`, mantenendo le operazioni nave come unica fonte autorevole della struttura;
2. ancorare l'identità di ciascun elemento all'operazione di apertura e conservarla durante il ricalcolo quando la stessa operazione continua ad aprire lo stesso tipo di elemento;
3. memorizzare sia i riferimenti alle operazioni di apertura e chiusura sia gli estremi `startedAt` ed `endedAt` derivati, senza un attributo separato per lo stato aperto o chiuso;
4. non memorizzare puntatori autorevoli agli elementi correnti, numeri d'ordine o una distinta entità di trasferimento, perché tali dati sono determinabili dalla gerarchia e dagli spostamenti;
5. considerare inclusi gli estremi delle permanenze secondo le regole funzionali e rappresentare il trasferimento come intervallo strettamente compreso tra partenza e arrivo;
6. conservare su viaggio, visita e ormeggio la versione anagrafica applicabile al rispettivo istante di apertura, senza estenderla automaticamente alle attività comprese nell'intervallo;
7. mantenere `berthId` e `berthVersionId` entrambi assenti per una banchina non specificata e aggiornare lo stesso ormeggio quando la banchina viene successivamente integrata;
8. derivare la protezione della struttura dai dati e risultati consolidati che la utilizzano, senza introdurre un indicatore `isConsolidated` sui singoli elementi;
9. rendere la gerarchia interamente ricostruibile dalle operazioni nave e verificabile rispetto a esse, preservando le identità ancora coerenti e applicando ogni aggiornamento atomicamente.

### 3.11.15 Esito

Il modello copre gerarchia, attributi, cardinalità, identità, collegamenti originari, intervalli, versioni anagrafiche, ciclo di vita e protezione dei dati consolidati.

Il punto è **completato** e non presenta decisioni aperte. La prossima attività è il **punto 5 – Operazioni nave e sequenze operative**.

## 3.12 Punto 5 – Operazioni nave e sequenze operative

### 3.12.1 Tema e obiettivo

Il punto modella le operazioni nave che costituiscono la fonte autorevole della struttura delle permanenze:

- entrata;
- spostamento;
- uscita.

Il modello deve rappresentare dati comuni e specifici, estremi temporali, posizione di origine e destinazione, stati di esecuzione, componenti economiche e vincoli di sequenza. Ogni variazione deve produrre in modo atomico una sequenza valida, la relativa gerarchia di viaggi, visite e ormeggi e i risultati economici non consolidati.

### 3.12.2 Entità principale e tipologie chiuse

**Operazione nave (`VesselOperation`)** è un'unica entità logica con una tipologia discriminante. Le tipologie appartengono all'insieme chiuso `VesselOperationType`:

| Codice tecnico | Termine di dominio | Estremi temporali |
| --- | --- | --- |
| `ENTRY` | Entrata | Un solo istante. |
| `MOVEMENT` | Spostamento | Partenza e arrivo. |
| `EXIT` | Uscita | Un solo istante. |

La tipologia è modificabile tra questi tre valori quando l'operazione non è consolidata e la sequenza risultante rimane valida. Non può invece essere trasformata in una prestazione da catalogo o libera: la categoria operativa rimane immutabile.

Entrata, spostamento e uscita non sono entità di catalogo, non possiedono uno stato anagrafico e non possono essere aggiunte, rinominate, disattivate o eliminate dall'operatore. La traduzione fisica mediante tabella unica, tabelle specializzate o altra strategia viene rinviata all'architettura, purché le combinazioni ammesse siano garantite.

### 3.12.3 Attributi comuni di `VesselOperation`

| Attributo logico | Tipo | Obbligatorio | Significato |
| --- | --- | --- | --- |
| `id` | `StableId` | Sì | Identità tecnica dell'operazione registrata. |
| `vesselId` | Riferimento a `Vessel` | Sì | Nave interessata dall'operazione. |
| `operationType` | `VesselOperationType` | Sì | Tipologia `ENTRY`, `MOVEMENT` oppure `EXIT`. |
| `executionStatus` | `ExecutionStatus` | Sì | Stato `PLANNED`, `PERFORMED` oppure `MISSED`. |
| `specifiedCustomerId` | Riferimento a `Customer` | No | Cliente specificato direttamente sull'operazione. |
| `specifiedAgencyId` | Riferimento a `Agency` | No | Agenzia specificata direttamente sull'operazione. |
| `notes` | Testo | No | Annotazioni correnti prive di effetti strutturali o economici. |
| `createdAtUtc` | Istante tecnico | Sì | Istante tecnico di creazione. |
| `updatedAtUtc` | Istante tecnico | Sì | Istante tecnico dell'ultima modifica. |

Cliente e agenzia sono indipendenti e possono essere specificati singolarmente. I riferimenti effettivi, le relative fonti e le versioni applicate alle componenti economiche verranno modellati nel punto 8.

L'identità dell'operazione viene mantenuta quando cambiano nave, tipologia, stato o dati specifici, purché la modifica sia consentita. Un cambio di nave richiede la validazione e la ricostruzione atomica delle sequenze sia della nave originaria sia di quella nuova.

### 3.12.4 Estremo dell'operazione (`VesselOperationEndpoint`)

Gli istanti e i rispettivi contesti vengono rappresentati mediante il componente dipendente **Estremo dell'operazione (`VesselOperationEndpoint`)**.

Il componente è identificato univocamente dalla coppia `operationId + endpointRole` e non possiede un proprio `StableId`, perché non è gestito o referenziato indipendentemente dal relativo ruolo nell'operazione.

I ruoli appartengono all'insieme chiuso `VesselOperationEndpointRole`:

- `OCCURRENCE`, per l'unico estremo di entrata e uscita;
- `DEPARTURE`, per la partenza di uno spostamento;
- `ARRIVAL`, per l'arrivo di uno spostamento.

Ogni estremo contiene:

| Attributo logico | Tipo | Obbligatorio | Significato |
| --- | --- | --- | --- |
| `operationId` | Riferimento a `VesselOperation` | Sì | Operazione proprietaria. |
| `endpointRole` | `VesselOperationEndpointRole` | Sì | Ruolo dell'estremo. |
| `moment` | Momento di dominio | Sì | Valore locale al minuto, fuso IANA, offset e istante UTC. |
| `vesselVersionId` | Riferimento a `VesselVersion` | Sì | Versione della nave applicabile all'istante dell'estremo. |
| `portId` | Riferimento a `Port` | Sì | Porto di origine o destinazione secondo il ruolo. |
| `portVersionId` | Riferimento a `PortVersion` | Sì | Versione del porto applicabile all'istante dell'estremo. |
| `berthId` | Riferimento a `Berth` | No | Banchina di origine o destinazione, se specificata o conosciuta. |
| `berthVersionId` | Riferimento a `BerthVersion` | No | Versione della banchina applicabile; presente se e solo se è presente `berthId`. |

La versione della nave è associata al singolo estremo anziché alla radice dell'operazione. Uno spostamento tra porti può infatti attraversare una decorrenza anagrafica e le due componenti economiche devono poter utilizzare versioni differenti della nave.

### 3.12.5 Struttura ammessa per tipologia

La tipologia determina in modo esclusivo ruoli e provenienza dei dati:

| Tipologia | Estremi richiesti | Porto | Banchina |
| --- | --- | --- | --- |
| `ENTRY` | Un solo `OCCURRENCE` | Porto di arrivo inserito dall'operatore. | Banchina di arrivo facoltativa inserita dall'operatore. |
| `EXIT` | Un solo `OCCURRENCE` | Porto di origine derivato dalla visita corrente. | Banchina di origine derivata dall'ormeggio corrente, eventualmente non specificata. |
| `MOVEMENT` | `DEPARTURE` e `ARRIVAL` | Origine derivata dalla visita corrente; destinazione sempre inserita dall'operatore. | Origine derivata dall'ormeggio corrente; destinazione facoltativa inserita dall'operatore. |

Non sono ammesse combinazioni incomplete o estranee alla tipologia: entrata e uscita non possono possedere partenza o arrivo, mentre uno spostamento non può possedere il solo estremo `OCCURRENCE` né uno soltanto tra partenza e arrivo.

Per lo spostamento il porto di destinazione deve essere indicato anche quando coincide con quello di origine. Questa uguaglianza determina uno spostamento nello stesso porto; la differenza determina uno spostamento tra porti.

### 3.12.6 Origine derivata e destinazione specificata

Il porto e l'eventuale banchina di origine non vengono richiesti all'operatore per uscita e spostamento. Vengono determinati dal contesto aperto all'istante dell'operazione e persistiti sull'estremo come dato storico derivato.

La persistenza dell'origine consente di:

- mostrare il contesto dell'operazione senza dipendere da una ricostruzione a ogni lettura;
- collegare in modo esplicito l'estremo alla versione anagrafica applicata;
- verificare che la gerarchia persistita sia coerente con l'operazione;
- proteggere i dati utilizzati da componenti economiche consolidate.

La fonte autorevole dell'origine rimane comunque la sequenza operativa. Una modifica consentita a un'operazione precedente può rideterminarla e aggiornare gli estremi e i risultati non consolidati.

Per una nuova entrata o destinazione possono essere selezionati soltanto porto e banchina effettivamente selezionabili secondo il punto 3. Un riferimento di origine già derivato può invece essere conservato anche se l'anagrafica viene successivamente disattivata. La banchina, quando presente, deve appartenere al porto dello stesso estremo.

### 3.12.7 Stato e significato temporale

`ExecutionStatus` è condiviso con le altre prestazioni e contiene:

| Stato | Significato dell'istante | Effetto strutturale | Fatturabilità potenziale |
| --- | --- | --- | --- |
| `PLANNED` | Momento pianificato. | Sì. | No. |
| `PERFORMED` | Momento effettivo. | Sì. | Sì. |
| `MISSED` | Momento nel quale l'operazione avrebbe dovuto svolgersi. | No. | Sì. |

Il modello conserva un solo insieme di estremi, il cui significato dipende dallo stato corrente. Non mantiene contemporaneamente valori pianificati ed effettivi e non registra una transizione automatica allo scadere del momento previsto.

La consuntivazione da `PLANNED` a `PERFORMED` consente di confermare o sostituire gli estremi con quelli effettivi. Il passaggio da o verso `MISSED` rimuove o introduce gli effetti strutturali e richiede la ricostruzione completa della sequenza interessata.

### 3.12.8 Ordinamento e unicità temporale

La cronologia di una nave viene ordinata mediante:

- `OCCURRENCE` per entrata e uscita;
- `DEPARTURE` per lo spostamento.

Non viene memorizzato un numero progressivo di sequenza. L'ordine è derivato dagli istanti UTC e lo `StableId` viene utilizzato soltanto come criterio tecnico finale nelle consultazioni, senza significato operativo.

Per la stessa nave nessun estremo di un'operazione può condividere lo stesso minuto UTC con un altro estremo, compresi:

- partenza e arrivo dello stesso spostamento;
- estremi appartenenti a operazioni differenti;
- operazioni `MISSED`;
- due occorrenze risolte dello stesso minuto locale durante un cambio di offset, che rimangono invece ammesse quando corrispondono a minuti UTC distinti.

Prestazioni ordinarie e movimentazioni merci non partecipano a questa unicità e possono coincidere con un estremo secondo le regole di attribuzione già definite.

Per ogni spostamento, l'istante UTC di arrivo deve essere strettamente successivo a quello di partenza. Per uno spostamento nello stesso porto entrambi gli estremi utilizzano il fuso del porto; per uno spostamento tra porti utilizzano rispettivamente i fusi di origine e destinazione.

### 3.12.9 Sequenza strutturale

Le operazioni `PLANNED` e `PERFORMED` formano la sequenza che determina le permanenze. La validazione applica i seguenti stati logici, senza richiedere di persisterli come entità autonome:

| Stato logico della nave | Operazione strutturale ammessa | Stato risultante |
| --- | --- | --- |
| Fuori da un viaggio | `ENTRY` | Nel porto, con viaggio, visita e ormeggio aperti. |
| Nel porto | `MOVEMENT` | In trasferimento tra partenza e arrivo, quindi nuovamente nel porto di destinazione. |
| Nel porto | `EXIT` | Fuori dal viaggio. |
| In trasferimento | Nessuna nuova operazione | Il trasferimento deve raggiungere il proprio arrivo. |

Ne derivano i vincoli:

- dopo un'entrata sono ammessi soltanto spostamento oppure uscita;
- dopo uno spostamento sono ammessi un altro spostamento oppure uscita;
- dopo un'uscita è ammessa soltanto una nuova entrata;
- la sequenza può terminare con un viaggio aperto;
- all'interno dell'intervallo strettamente compreso tra partenza e arrivo non può iniziare alcuna operazione nave;
- l'inserimento retroattivo viene validato rispetto all'intera sequenza e non soltanto alle operazioni immediatamente adiacenti.

### 3.12.10 Operazioni `MISSED`

Le operazioni mancate vengono ordinate e mostrate nella stessa cronologia, partecipano all'unicità temporale e mantengono i propri dati ed effetti economici, ma non modificano lo stato logico della nave.

Devono comunque possedere un contesto coerente:

- un'entrata `MISSED` richiede il porto di arrivo ed è ammessa soltanto quando al proprio istante non esiste un viaggio aperto;
- un'uscita `MISSED` richiede viaggio, visita e ormeggio aperti e utilizza il relativo contesto di origine;
- uno spostamento `MISSED` richiede visita e ormeggio aperti alla partenza, deriva l'origine e richiede la destinazione;
- uscita e spostamento `MISSED` non sono ammessi durante un trasferimento;
- una precedente operazione `MISSED` non fornisce posizione o contesto a un'operazione successiva.

### 3.12.11 Componente economica dell'operazione (`VesselOperationCharge`)

Ogni operazione possiede una o due **componenti economiche (`VesselOperationCharge`)**. La componente ha una propria identità perché può essere calcolata, associata a una fattura, consolidata e consultata autonomamente.

| Attributo logico | Tipo | Obbligatorio | Significato |
| --- | --- | --- | --- |
| `id` | `StableId` | Sì | Identità tecnica autonoma della componente. |
| `operationId` | Riferimento a `VesselOperation` | Sì | Operazione proprietaria. |
| `chargeKind` | `VesselOperationChargeKind` | Sì | Tipo economico `ENTRY`, `EXIT` oppure `MOVEMENT`. |
| `economicEndpointRole` | `VesselOperationEndpointRole` | Sì | Estremo dal quale derivano porto e istante economico. |
| `manualOverrideAmount` | Importo monetario | No | Eventuale importo manuale che sostituisce l'importo tariffario come base economica effettiva della componente. |
| `createdAtUtc` | Istante tecnico | Sì | Istante di creazione della componente. |
| `updatedAtUtc` | Istante tecnico | Sì | Istante dell'ultimo ricalcolo o modifica. |

Per una componente di operazione nave il sistema calcola e conserva sempre l'importo tariffario applicabile. `manualOverrideAmount`, quando presente, è non negativo, appartiene alla singola componente e sostituisce l'importo tariffario come base economica effettiva prima dell'applicazione delle regole dinamiche. Importo tariffario calcolato, eventuale sostituzione manuale e importo base effettivo rimangono distinti e tracciabili; i relativi attributi di calcolo verranno completati nei punti 9 e 10.

Questa regola non si applica alle prestazioni libere: esse non possiedono peso, non eseguono il calcolo tariffario e conservano esclusivamente l'importo manuale indicato dall'operatore. La relativa struttura verrà definita nel punto 6.

Stato, note e riferimenti specificati direttamente a cliente e agenzia appartengono all'operazione e non vengono duplicati sulla componente. Cliente e agenzia effettivi, risultati tariffari, applicazioni delle regole e associazione alla fattura sono invece specifici della componente e verranno aggiunti nei rispettivi punti.

### 3.12.12 Composizione economica per tipologia

La composizione è deterministica:

| Operazione | Componenti generate | Estremo economico |
| --- | --- | --- |
| Entrata | Una componente `ENTRY`. | `OCCURRENCE`. |
| Uscita | Una componente `EXIT`. | `OCCURRENCE`. |
| Spostamento nello stesso porto | Una componente `MOVEMENT`. | `DEPARTURE`. |
| Spostamento tra porti | Una componente `EXIT` e una componente `ENTRY`. | Rispettivamente `DEPARTURE` e `ARRIVAL`. |

Per la stessa operazione può esistere al massimo una componente per ciascun `chargeKind`. Non viene memorizzato un importo totale dell'operazione: per uno spostamento tra porti il totale di consultazione è la somma corrente delle due componenti, mentre una fattura utilizza soltanto quella associata.

Le componenti di uno spostamento tra porti condividono l'operazione, lo stato, le note e gli eventuali soggetti specificati direttamente, ma determinano autonomamente porto, istante economico, versione della nave, soggetti effettivi, tariffa, peso, regole, importi e fattura.

### 3.12.13 Identità e ciclo di vita delle componenti

Durante un ricalcolo viene conservato lo `StableId` della componente quando la stessa operazione continua a produrre la stessa coppia `chargeKind + economicEndpointRole`. Variazioni di porto, istante o importo aggiornano quindi la componente esistente, se consentite.

Una componente `ENTRY` riferita a `OCCURRENCE` e una componente `ENTRY` riferita ad `ARRIVAL` hanno significati economici differenti e non conservano la stessa identità, anche se condividono il medesimo `chargeKind`.

Se la natura dello spostamento cambia:

- passando dallo stesso porto a porti differenti, la componente `MOVEMENT` viene rimossa e vengono create nuove componenti `EXIT` e `ENTRY`;
- passando tra porti differenti allo stesso porto, le componenti `EXIT` e `ENTRY` vengono rimosse e viene creata una nuova componente `MOVEMENT`.

Analogamente, una modifica della tipologia dell'operazione conserva l'identità dell'operazione ma elimina e crea le componenti il cui significato economico non esiste più. Gli `StableId` eliminati non vengono riutilizzati.

La creazione e la rimozione delle componenti aggiornano atomicamente le eventuali associazioni a fatture `in immissione`. Una componente consolidata o una variazione che altererebbe dati comuni utilizzati da essa impediscono la trasformazione.

### 3.12.14 Collegamenti con la struttura delle permanenze

L'operazione non contiene riferimenti autorevoli a viaggio, visita o ormeggio, perché tali elementi sono prodotti dalla sequenza. Il collegamento persistente è mantenuto nel verso opposto mediante `openingOperationId` e `closingOperationId` definiti nel punto 4.

Gli estremi conservano porto e banchina come contesto storico, ma non sostituiscono la gerarchia derivata. La coerenza deve essere verificata in entrambe le direzioni:

- l'entrata apre gli elementi previsti nel porto e nella banchina del proprio `OCCURRENCE`;
- la partenza chiude gli elementi di origine indicati dalla sequenza;
- l'arrivo apre gli elementi di destinazione coerenti con `ARRIVAL`;
- l'uscita chiude il contesto indicato da `OCCURRENCE`;
- un'operazione `MISSED` non può essere referenziata come apertura o chiusura.

L'integrazione della sola banchina di destinazione precedentemente non specificata aggiorna l'estremo e l'ormeggio già aperto dalla stessa operazione. Non genera una nuova operazione, un nuovo ormeggio o l'accorpamento di ormeggi distinti.

### 3.12.15 Modifica, inserimento retroattivo ed eliminazione

Sono variazioni strutturali almeno:

- modifica di nave o tipologia;
- modifica dello stato da o verso `MISSED`;
- modifica di un estremo temporale;
- modifica del porto o della banchina di destinazione;
- inserimento retroattivo;
- eliminazione fisica.

Prima della variazione il sistema:

1. costruisce le sequenze risultanti per tutte le navi interessate;
2. valida estremi, unicità, contesti e alternanza logica;
3. simula permanenze, attribuzioni e componenti economiche;
4. ricalcola i risultati e le fatture `in immissione` interessate;
5. individua qualsiasi dato o risultato consolidato che cambierebbe;
6. presenta conseguenze e blocchi e richiede conferma esplicita.

La variazione consentita viene applicata atomicamente. Non è prevista una bozza multipla che possa lasciare temporaneamente incoerente la sequenza.

L'eliminazione è fisica e rimuove estremi, componenti non consolidate e relative associazioni a fatture `in immissione`; ricostruisce poi la sequenza residua. È impedita quando produce una sequenza non valida, lascia un'attività senza contesto o modifica direttamente o indirettamente dati consolidati.

La modifica delle sole `notes` non è strutturale, non richiede simulazione o ricalcoli ed è consentita anche dopo il consolidamento. Non sostituisce le note già copiate nello snapshot di una fattura emessa.

### 3.12.16 Consolidamento indipendente delle componenti

Non vengono memorizzati `isConsolidated` sull'operazione o sulle componenti. Il consolidamento corrente si determina dall'associazione della singola componente a una fattura emessa, parzialmente saldata o saldata e dai relativi snapshot.

Per uno spostamento tra porti:

- ciascuna componente può appartenere al massimo a una fattura;
- le componenti possono essere fatturate in momenti diversi e in fatture differenti;
- il consolidamento di una componente non consolida automaticamente l'altra;
- rimangono modificabili soltanto i dati esclusivi della componente non consolidata che non modificano struttura, dati comuni o risultati utilizzati dalla componente consolidata;
- le note dell'operazione restano comunque modificabili.

Il ritiro consentito della fattura rimuove il consolidamento prodotto da quel documento e rende nuovamente modificabile la componente, purché non sussistano altri blocchi.

### 3.12.17 Vincoli del modello

Devono essere garantiti almeno i seguenti vincoli:

- esiste una sola tipologia e un solo stato per operazione;
- i ruoli degli estremi corrispondono esattamente alla tipologia;
- ogni estremo possiede nave, porto e relative versioni applicabili al proprio momento;
- `berthId` e `berthVersionId` sono entrambi presenti oppure entrambi assenti;
- la banchina appartiene al porto dello stesso estremo;
- l'arrivo dello spostamento è strettamente successivo alla partenza in UTC;
- per la stessa nave tutti gli estremi occupano minuti UTC distinti;
- uscita e partenza possiedono un contesto di origine valido;
- un'entrata non ricade all'interno di un viaggio aperto;
- nessuna operazione inizia durante un trasferimento;
- una componente appartiene esattamente a un'operazione;
- il numero, il tipo e l'estremo delle componenti corrispondono alla tipologia e ai porti dell'operazione;
- una componente possiede al massimo un'associazione corrente a fattura;
- una modifica non può alterare dati o risultati consolidati, salvo le note escluse dai ricalcoli.

Le combinazioni locali tra tipologia, ruoli e nullabilità devono essere protette anche dalla persistenza quando tecnicamente possibile. Sequenza, contesto, confronto tra fusi, ricostruzione e consolidamento richiedono invece una validazione di dominio transazionale.

### 3.12.18 Terminologia tecnica bilingue

Il glossario viene esteso come segue:

| Termine di dominio | Nome tecnico |
| --- | --- |
| Operazione nave | `VesselOperation` |
| Tipologia operazione nave | `VesselOperationType` |
| Stato di esecuzione | `ExecutionStatus` |
| Estremo dell'operazione | `VesselOperationEndpoint` |
| Ruolo dell'estremo | `VesselOperationEndpointRole` |
| Istante dell'operazione | `moment` |
| Entrata | `ENTRY` |
| Spostamento | `MOVEMENT` |
| Uscita | `EXIT` |
| Prevista | `PLANNED` |
| Effettuata | `PERFORMED` |
| Mancata | `MISSED` |
| Partenza | `DEPARTURE` |
| Arrivo | `ARRIVAL` |
| Componente economica dell'operazione | `VesselOperationCharge` |
| Tipo della componente economica | `VesselOperationChargeKind` |
| Sostituzione manuale dell'importo | `manualOverrideAmount` |

### 3.12.19 Decisioni già determinate

Sono già confermati dai documenti precedenti:

- l'insieme fisso delle tipologie entrata, spostamento e uscita;
- la categoria immutabile di operazione nave e la modificabilità della tipologia interna nei casi consentiti;
- gli stati `PLANNED`, `PERFORMED` e `MISSED`, senza transizioni automatiche;
- la stessa efficacia strutturale di operazioni previste ed effettuate;
- l'assenza di effetti strutturali per le operazioni mancate e i relativi vincoli di contesto;
- l'obbligatorietà del porto di arrivo per l'entrata e del porto di destinazione per lo spostamento;
- la derivazione del porto di origine per uscita e spostamento;
- la banchina di destinazione facoltativa e coerente con il porto;
- la precisione al minuto e l'unicità di tutti gli estremi per nave;
- l'arrivo dello spostamento strettamente successivo alla partenza in UTC;
- le sequenze logiche e la possibilità di lasciare un viaggio aperto;
- la fatturabilità delle operazioni effettuate o mancate e l'esclusione di quelle previste;
- la composizione economica singola o doppia secondo la tipologia e il porto;
- la fatturazione e il consolidamento autonomi delle componenti di uno spostamento tra porti;
- la simulazione e la conferma preventiva di ogni variazione strutturale;
- la modifica delle note anche dopo il consolidamento senza ricalcoli;
- l'eliminazione fisica delle operazioni consentite e l'assenza di una bozza multipla incoerente.

### 3.12.20 Decisioni confermate nel punto

Sono confermate le seguenti decisioni strutturali:

1. rappresentare le tre tipologie mediante un'unica entità logica `VesselOperation` discriminata da `operationType`, rinviando la strategia fisica all'architettura;
2. modellare gli istanti e i relativi contesti mediante componenti `VesselOperationEndpoint`, identificati da operazione e ruolo e privi di uno `StableId` autonomo;
3. associare a ogni estremo la versione della nave, del porto e dell'eventuale banchina applicabile al proprio istante, così da gestire correttamente anche spostamenti tra fusi o decorrenze differenti;
4. persistere sugli estremi anche porto e banchina di origine derivati, mantenendo la sequenza operativa come fonte autorevole e aggiornandoli nei ricalcoli consentiti;
5. conservare un solo insieme di momenti il cui significato dipende dallo stato, senza mantenere parallelamente istanti pianificati ed effettivi;
6. non memorizzare un progressivo di sequenza e ordinare le operazioni mediante gli istanti UTC, applicando l'unicità a tutti gli estremi della stessa nave;
7. modellare ogni componente economica come `VesselOperationCharge` con un proprio `StableId`, un tipo economico e il riferimento al relativo estremo;
8. conservare l'identità della componente finché rimane invariata la coppia `chargeKind + economicEndpointRole` e generarne una nuova quando il passaggio tra spostamento interno ed esterno, o il cambio di tipologia, ne modifica il significato economico;
9. non memorizzare un importo totale sull'operazione, derivandolo dalle componenti correnti;
10. mantenere i collegamenti con viaggio, visita e ormeggio nel verso dagli elementi derivati all'operazione, senza introdurre riferimenti autorevoli circolari sulla radice `VesselOperation`;
11. ricostruire atomicamente entrambe le sequenze quando cambia la nave dell'operazione, conservando lo `StableId` dell'operazione se la variazione è consentita;
12. derivare il consolidamento dalle associazioni e dagli snapshot delle singole componenti, senza attributi `isConsolidated` duplicati;
13. calcolare e conservare sempre l'importo tariffario delle componenti delle operazioni nave e utilizzare l'eventuale `manualOverrideAmount` come base effettiva prima delle regole dinamiche, mantenendo invece per le prestazioni libere il solo importo manuale, senza peso o calcolo tariffario.

### 3.12.21 Esito

Il modello copre identità, tipologie, stati, estremi temporali, contesti portuali, versioni anagrafiche, sequenze, componenti economiche, modifiche e consolidamento.

Il punto è **completato** e non presenta decisioni aperte. La prossima attività è il **punto 6 – Prestazioni e catalogo delle prestazioni**.

## 3.13 Punto 6 – Prestazioni e catalogo delle prestazioni

### 3.13.1 Tema e obiettivo

Il punto modella le prestazioni ordinarie, distinte dalle operazioni nave già definite nel punto 5:

- prestazioni da catalogo, riferite a un tipo configurabile e soggette al calcolo tariffario;
- prestazioni libere, descritte e valorizzate manualmente.

Entrambe appartengono a una nave, possiedono un solo istante e vengono attribuite al viaggio, alla visita e all'ormeggio applicabili. Non modificano la struttura delle permanenze, ma dipendono da essa e non possono esistere senza un contesto operativo completo.

### 3.13.2 Separazione dalle operazioni nave

**Prestazione ordinaria (`ServiceActivity`)** e `VesselOperation` rimangono entità persistenti distinte. Condividono convenzioni come `ExecutionStatus`, note, riferimenti diretti ai soggetti, modificabilità e consolidamento, ma hanno responsabilità differenti:

- `VesselOperation` costruisce la struttura delle permanenze e può produrre più componenti economiche;
- `ServiceActivity` utilizza la struttura esistente e rappresenta direttamente una singola unità economica fatturabile.

Non viene introdotta una radice persistente polimorfica comune. Un'eventuale interfaccia o classe astratta nel codice non deve creare un'identità aggiuntiva, una relazione generica non verificabile o una seconda fonte dei dati condivisi.

### 3.13.3 Categoria e struttura discriminata

Ogni prestazione possiede una categoria appartenente all'insieme chiuso `ServiceCategory`:

| Codice tecnico | Categoria | Dati specifici |
| --- | --- | --- |
| `CATALOG` | Da catalogo | Riferimento obbligatorio a un tipo di prestazione. |
| `FREE` | Libera | Descrizione e importo base manuale obbligatori. |

La categoria è immutabile. Se è stata registrata quella errata, la prestazione deve essere eliminata e ricreata con un nuovo `StableId`, purché l'eliminazione sia consentita.

Il modello logico usa una radice comune `ServiceActivity` e due componenti dipendenti alternativi:

- `CatalogServiceData` per la categoria `CATALOG`;
- `FreeServiceData` per la categoria `FREE`.

I componenti sono identificati da `serviceActivityId`, non possiedono uno `StableId` autonomo e seguono integralmente il ciclo di vita della prestazione. La strategia fisica di rappresentazione viene rinviata all'architettura, ma deve impedire che una prestazione possieda entrambi i componenti oppure quello incompatibile con la categoria.

### 3.13.4 Attributi comuni di `ServiceActivity`

| Attributo logico | Tipo | Obbligatorio | Significato |
| --- | --- | --- | --- |
| `id` | `StableId` | Sì | Identità tecnica della prestazione. |
| `vesselId` | Riferimento a `Vessel` | Sì | Nave alla quale è riferita la prestazione. |
| `vesselVersionId` | Riferimento a `VesselVersion` | Sì | Versione della nave applicabile all'istante della prestazione. |
| `category` | `ServiceCategory` | Sì | Categoria immutabile `CATALOG` oppure `FREE`. |
| `executionStatus` | `ExecutionStatus` | Sì | Stato `PLANNED`, `PERFORMED` oppure `MISSED`. |
| `moment` | Momento di dominio | Sì | Istante pianificato, effettivo o mancato secondo lo stato. |
| `specifiedCustomerId` | Riferimento a `Customer` | No | Cliente specificato direttamente sulla prestazione. |
| `specifiedAgencyId` | Riferimento a `Agency` | No | Agenzia specificata direttamente sulla prestazione. |
| `notes` | Testo | No | Annotazioni correnti prive di effetti su attribuzione e calcoli. |
| `createdAtUtc` | Istante tecnico | Sì | Istante tecnico di creazione. |
| `updatedAtUtc` | Istante tecnico | Sì | Istante tecnico dell'ultima modifica. |

Cliente e agenzia possono essere specificati indipendentemente. Riferimenti effettivi, fonti e versioni applicate verranno aggiunti nel punto 8.

### 3.13.5 Contesto operativo (`ServiceOperationalContext`)

L'attribuzione persistita viene rappresentata dal componente dipendente uno-a-uno **Contesto operativo della prestazione (`ServiceOperationalContext`)**.

| Attributo logico | Tipo | Obbligatorio | Significato |
| --- | --- | --- | --- |
| `serviceActivityId` | Riferimento a `ServiceActivity` | Sì | Prestazione proprietaria e identità del componente. |
| `voyageId` | Riferimento a `Voyage` | Sì | Viaggio applicabile. |
| `portCallId` | Riferimento a `PortCall` | Sì | Visita applicabile. |
| `berthStayId` | Riferimento a `BerthStay` | Sì | Ormeggio applicabile. |
| `portId` | Riferimento a `Port` | Sì | Porto derivato dalla visita. |
| `portVersionId` | Riferimento a `PortVersion` | Sì | Versione del porto applicabile all'istante della prestazione. |
| `berthId` | Riferimento a `Berth` | No | Banchina derivata dall'ormeggio, se specificata. |
| `berthVersionId` | Riferimento a `BerthVersion` | No | Versione della banchina applicabile all'istante; presente se e solo se è presente `berthId`. |

Viaggio, visita e ormeggio vengono conservati direttamente per rendere esplicita l'attribuzione utilizzata da calcoli, fatture, filtri e controlli di consolidamento. Porto e banchina affiancano le relative versioni applicate all'istante della prestazione.

Questi dati sono derivati e ricalcolabili, non una seconda fonte autorevole. Devono essere coerenti con la gerarchia e con `vesselId`; qualsiasi aggiornamento avviene atomicamente con la variazione che lo ha richiesto.

### 3.13.6 Regole di attribuzione temporale

Una prestazione, compresa una prestazione `MISSED`, richiede sempre un viaggio, una visita e un ormeggio validi al proprio `moment`. Non viene conservata come elemento privo di attribuzione.

La determinazione applica i confini temporali già definiti:

- il minuto dell'entrata appartiene agli elementi aperti dall'entrata, che deve essere già registrata;
- il minuto di partenza di uno spostamento appartiene al contesto di origine;
- il minuto di arrivo appartiene al nuovo ormeggio e all'eventuale nuova visita;
- il minuto dell'uscita appartiene all'ultimo contesto della permanenza;
- nei minuti strettamente compresi tra partenza e arrivo non esiste un ormeggio applicabile e la prestazione non può essere registrata;
- più prestazioni possono condividere lo stesso minuto tra loro e con un'operazione nave.

La data può essere passata, corrente o futura. Una prestazione futura è valida quando operazioni nave `PLANNED` o `PERFORMED` determinano già un contesto completo al relativo istante.

Se cambiano nave, momento o sequenza delle operazioni nave, il sistema ridetermina l'intero `ServiceOperationalContext`. La variazione viene impedita se non esiste un nuovo contesto valido o se cambierebbe l'attribuzione di una prestazione consolidata, anche quando l'importo finale resterebbe uguale.

### 3.13.7 Versioni anagrafiche applicate

Le versioni memorizzate sulla prestazione e sul relativo contesto vengono determinate rispetto al suo `moment`:

- `vesselVersionId` descrive la nave all'istante della prestazione;
- `portVersionId` descrive il porto allo stesso istante e può differire dalla versione conservata sulla visita al momento della sua apertura;
- `berthVersionId` descrive la banchina allo stesso istante e può differire dalla versione conservata sull'ormeggio al momento della sua apertura.

Una variazione anagrafica consentita ridetermina i riferimenti e i risultati non consolidati. Gli snapshot della fattura emessa rimangono immutabili.

### 3.13.8 Tipo di prestazione (`ServiceType`)

Il catalogo configurabile è composto da entità **Tipo di prestazione (`ServiceType`)**.

| Attributo logico | Tipo | Obbligatorio | Significato |
| --- | --- | --- | --- |
| `id` | `StableId` | Sì | Identità tecnica stabile del tipo. |
| `description` | Testo | Sì | Descrizione corrente, non versionata. |
| `status` | `ServiceTypeStatus` | Sì | Stato corrente `ACTIVE` oppure `INACTIVE`. |
| `hasEverBeenUsed` | Booleano | Sì | Indicatore monotono dell'avvenuto utilizzo in almeno una prestazione. |
| `createdAtUtc` | Istante tecnico | Sì | Istante tecnico di creazione. |
| `updatedAtUtc` | Istante tecnico | Sì | Istante tecnico dell'ultima modifica. |

`hasEverBeenUsed` nasce `false`, diventa `true` nella stessa transazione che crea la prima prestazione riferita al tipo e non torna mai `false`, neppure dopo l'eliminazione di tutte le prestazioni che lo utilizzavano. Il dato è necessario perché l'eliminazione delle prestazioni cancellerebbe altrimenti la prova dell'utilizzo storico.

Ogni `ServiceType` possiede inoltre una sequenza di versioni del peso. La versione iniziale viene creata atomicamente con il tipo, non ha decorrenza e propone il valore `1`; attributi e vincoli completi verranno definiti nel punto 9.

### 3.13.9 Descrizione, unicità e denominazioni riservate

`description` viene normalizzata eliminando gli spazi iniziali e finali e deve contenere almeno un carattere significativo. L'unicità tra i tipi esistenti viene verificata senza distinzione tra maiuscole e minuscole.

Le denominazioni normalizzate equivalenti a `entrata`, `uscita` e `spostamento` sono riservate alle operazioni nave e non possono essere utilizzate.

La descrizione non è versionata e i valori precedenti non rimangono riservati. La modifica rende quindi disponibile la vecchia descrizione per un altro tipo; l'eliminazione di un tipo mai utilizzato libera quella corrente. Le prestazioni operative mostrano la descrizione corrente del tipo, mentre la fattura emessa conserva quella consolidata nel proprio snapshot.

### 3.13.10 Stato e ciclo di vita del catalogo

Un nuovo tipo nasce `ACTIVE`. La disattivazione:

- lo esclude dalla creazione di nuove prestazioni;
- impedisce di selezionarlo come sostituto su una prestazione esistente;
- non modifica le prestazioni che già lo referenziano;
- non determina ricalcoli, neppure per prestazioni future già registrate.

Un riferimento esistente a un tipo successivamente disattivato può essere mantenuto mentre si modificano gli altri dati. La riattivazione rende nuovamente selezionabile il tipo.

L'eliminazione fisica è consentita soltanto quando `hasEverBeenUsed = false` e non esistono altri riferimenti persistenti esterni, comprese eventuali condizioni di regole economiche. In tal caso vengono eliminati atomicamente anche la versione iniziale e le eventuali versioni successive del peso. Un tipo già utilizzato può esclusivamente essere disattivato.

Il tipo iniziale `rinforzo ormeggio` viene creato come normale `ServiceType`: può essere rinominato, disattivato e, se mai utilizzato, eliminato.

### 3.13.11 Dati della prestazione da catalogo (`CatalogServiceData`)

| Attributo logico | Tipo | Obbligatorio | Significato |
| --- | --- | --- | --- |
| `serviceActivityId` | Riferimento a `ServiceActivity` | Sì | Prestazione proprietaria. |
| `serviceTypeId` | Riferimento a `ServiceType` | Sì | Tipo configurabile applicato. |

La prestazione da catalogo non possiede una descrizione autonoma né un importo base manuale. La descrizione corrente proviene dal tipo; la fattura emessa ne conserva lo snapshot.

Tariffa, configurazione, scaglione, peso e importo base calcolato vengono determinati e persistiti al momento della creazione della prestazione. La relativa struttura di calcolo sarà definita nel punto 9 e le applicazioni delle regole economiche nel punto 10.

La sostituzione di `serviceTypeId` è consentita soltanto verso un tipo `ACTIVE`, richiede il ricalcolo economico e mantiene lo `StableId` della prestazione. Il riferimento corrente a un tipo disattivato può essere conservato.

### 3.13.12 Dati della prestazione libera (`FreeServiceData`)

| Attributo logico | Tipo | Obbligatorio | Significato |
| --- | --- | --- | --- |
| `serviceActivityId` | Riferimento a `ServiceActivity` | Sì | Prestazione proprietaria. |
| `description` | Testo | Sì | Descrizione specifica della prestazione. |
| `manualBaseAmount` | Importo monetario | Sì | Importo base manuale strettamente maggiore di zero. |

La prestazione libera non fa riferimento a `ServiceType`, non possiede un peso e non esegue alcun calcolo tariffario. `manualBaseAmount` costituisce l'unica base economica e cambia soltanto mediante una modifica esplicita consentita.

Le regole economiche dinamiche possono aumentare, ridurre o azzerare il risultato partendo da `manualBaseAmount`; l'importo inserito deve comunque essere strettamente maggiore di zero. Non viene memorizzato alcun importo tariffario teorico o sostituito.

### 3.13.13 Stato e consuntivazione

Le prestazioni utilizzano `ExecutionStatus` con la stessa semantica del punto 5:

| Stato | Significato del momento | Effetto strutturale | Fatturabilità potenziale |
| --- | --- | --- | --- |
| `PLANNED` | Istante pianificato. | Nessuno. | No. |
| `PERFORMED` | Istante effettivo. | Nessuno. | Sì. |
| `MISSED` | Istante nel quale avrebbe dovuto svolgersi. | Nessuno. | Sì. |

Il trascorrere del tempo non modifica automaticamente lo stato. Non vengono conservati parallelamente istanti pianificati ed effettivi.

La consuntivazione da `PLANNED` a `PERFORMED` può correggere il momento e ridetermina contesto, versioni e calcoli. Il passaggio a `MISSED` conserva normalmente il momento pianificato, convalida nuovamente il contesto e applica le regole economiche previste per tale stato.

### 3.13.14 Unità economica e risultati dipendenti

Una `ServiceActivity` rappresenta direttamente una sola unità economica fatturabile. Non viene creato un ulteriore componente equivalente a `VesselOperationCharge`, necessario invece per le operazioni nave che possono produrre due componenti autonome.

La prestazione possiede un solo insieme di risultati economici dipendenti:

- per `CATALOG`, parte dall'importo base tariffario calcolato;
- per `FREE`, parte esclusivamente da `manualBaseAmount`;
- per entrambe, prosegue con le applicazioni delle regole dinamiche e determina l'importo corrente fatturabile.

I risultati tariffari e le applicazioni delle regole vengono modellati rispettivamente nei punti 9 e 10. La fattura farà riferimento allo `StableId` della prestazione e conserverà gli snapshot necessari.

### 3.13.15 Modifica, fattura in immissione ed eliminazione

Finché la prestazione non è consolidata possono essere modificati, secondo la categoria:

- nave, stato, momento, note e riferimenti specificati a cliente o agenzia;
- `serviceTypeId` per `CATALOG`;
- descrizione e `manualBaseAmount` per `FREE`.

Ogni modifica diversa dalle sole note ridetermina attribuzione, versioni, soggetti e risultati interessati. Se la prestazione appartiene a una fattura `in immissione`, il sistema ricalcola atomicamente la fattura quando la prestazione rimane compatibile.

Una modifica che renderebbe la prestazione non fatturabile o incompatibile con la fattura `in immissione` viene impedita; la prestazione deve essere prima rimossa esplicitamente dalla fattura. Non vengono rimosse associazioni come effetto implicito di una modifica.

L'eliminazione è invece un comando esplicito: rimuove fisicamente la prestazione, i componenti dipendenti, i calcoli non consolidati e l'eventuale associazione alla fattura `in immissione`, aggiornandone il totale. Non viene mantenuto uno storico separato della prestazione eliminata.

### 3.13.16 Fatturabilità e consolidamento

Una prestazione è potenzialmente fatturabile quando:

- lo stato è `PERFORMED` oppure `MISSED`;
- possiede un contesto operativo completo;
- cliente e agenzia effettivi sono entrambi determinati;
- possiede risultati economici validi;
- non appartiene già a un'altra fattura.

La fatturabilità non dipende dal fatto che il momento sia passato o futuro né dalla chiusura del viaggio. Le prestazioni `PLANNED` rimangono escluse.

Non viene memorizzato un indicatore `isConsolidated`. Il consolidamento corrente deriva dall'associazione della prestazione a una fattura emessa, parzialmente saldata o saldata e dal relativo snapshot.

L'emissione consolida categoria, tipo o descrizione libera, stato, momento, contesto, versioni anagrafiche, soggetti e risultati economici. Una variazione viene impedita se modificherebbe direttamente o indirettamente uno di tali dati. Le `notes` rimangono modificabili senza ricalcoli e non sostituiscono quelle copiate nello snapshot emesso.

Il ritiro consentito della fattura rimuove il consolidamento prodotto dal documento e rende nuovamente modificabile la prestazione, salvo altri vincoli.

### 3.13.17 Avviso sulle attività ancora previste

L'avviso di fatturazione è una proiezione calcolata e non un'entità persistente.

Quando vengono selezionate attività economiche per una fattura, il sistema individua le operazioni nave e le prestazioni `PLANNED`:

- appartenenti alla stessa nave e allo stesso viaggio di almeno un'attività selezionata;
- aventi un istante non successivo all'attività selezionata più recente nel relativo viaggio.

L'avviso mostra almeno tipo, momento e contesto, ma non modifica lo stato, non impedisce la selezione e non viene conservato come esito permanente. La verifica viene ripetuta prima dell'emissione.

### 3.13.18 Vincoli del modello

Devono essere garantiti almeno i seguenti vincoli:

- ogni prestazione possiede una sola categoria immutabile;
- esiste esattamente un componente tra `CatalogServiceData` e `FreeServiceData`, coerente con la categoria;
- una prestazione `CATALOG` possiede un `serviceTypeId` e non possiede descrizione o importo manuali propri;
- una prestazione `FREE` possiede descrizione non vuota e `manualBaseAmount > 0`, senza tipo, peso o calcolo tariffario;
- la prestazione possiede un solo contesto completo e coerente con nave e momento;
- visita e ormeggio appartengono al viaggio indicato, l'ormeggio appartiene alla visita e il porto e la banchina coincidono con la gerarchia;
- `berthId` e `berthVersionId` sono entrambi presenti oppure entrambi assenti;
- le versioni anagrafiche sono quelle applicabili al momento della prestazione;
- la prestazione non ricade nell'intervallo interno di un trasferimento;
- la descrizione normalizzata dei tipi è univoca tra i tipi esistenti e non coincide con una denominazione riservata;
- `hasEverBeenUsed` può cambiare soltanto da `false` a `true`;
- un tipo `INACTIVE` non può essere scelto per una nuova relazione, ma può rimanere referenziato;
- un tipo può essere eliminato soltanto se non è mai stato utilizzato e non possiede altri riferimenti persistenti esterni;
- una prestazione può appartenere al massimo a una fattura;
- nessuna variazione può modificare dati o risultati consolidati, salvo le note escluse dai calcoli.

I vincoli locali relativi a categorie, componenti, obbligatorietà e valori devono essere protetti anche dalla persistenza quando possibile. Attribuzione temporale, versioni applicabili, compatibilità con la fattura, ricalcolo e consolidamento richiedono validazione di dominio transazionale.

### 3.13.19 Terminologia tecnica bilingue

Il glossario viene esteso come segue:

| Termine di dominio | Nome tecnico |
| --- | --- |
| Prestazione ordinaria | `ServiceActivity` |
| Categoria della prestazione | `ServiceCategory` |
| Prestazione da catalogo | `CATALOG` |
| Prestazione libera | `FREE` |
| Tipo di prestazione | `ServiceType` |
| Stato del tipo | `ServiceTypeStatus` |
| Dati della prestazione da catalogo | `CatalogServiceData` |
| Dati della prestazione libera | `FreeServiceData` |
| Contesto operativo della prestazione | `ServiceOperationalContext` |
| Importo base manuale | `manualBaseAmount` |
| Tipo utilizzato almeno una volta | `hasEverBeenUsed` |

### 3.13.20 Decisioni già determinate

Sono già confermati dai documenti precedenti:

- la separazione tra prestazioni da catalogo e prestazioni libere;
- l'immutabilità della categoria e la necessità di eliminare e ricreare per cambiarla;
- l'insieme comune degli stati e l'assenza di consuntivazione automatica;
- l'obbligatorietà del contesto operativo anche per le prestazioni `MISSED`;
- la persistenza e il ricalcolo controllato dell'attribuzione;
- la possibilità di registrare prestazioni future quando il contesto è determinabile;
- la coincidenza con i confini temporali delle operazioni nave e il divieto durante il trasferimento;
- la descrizione corrente e non versionata del tipo di catalogo;
- lo stato attivo o disattivato e la conservazione dei riferimenti esistenti;
- l'eliminazione del tipo soltanto se non è mai stato utilizzato;
- l'assenza di protezione speciale per il tipo iniziale `rinforzo ormeggio`;
- il peso iniziale strettamente positivo con valore proposto `1`;
- il calcolo tariffario per le prestazioni da catalogo;
- l'uso esclusivo di descrizione e importo base manuale per le prestazioni libere, senza tipo, peso o calcolo tariffario;
- la fatturabilità degli stati `PERFORMED` e `MISSED`, anche per momenti futuri e viaggi aperti;
- la modifica delle note dopo il consolidamento senza ricalcoli;
- l'eliminazione fisica consentita e il ritiro della fattura come rimozione del consolidamento;
- la natura informativa e non bloccante dell'avviso sulle attività precedenti ancora previste.

### 3.13.21 Decisioni proposte da verificare nel codice

Per completare il modello del punto si propongono le seguenti decisioni:

1. modellare `ServiceActivity` separatamente da `VesselOperation`, senza una radice persistente polimorfica comune, pur condividendo tipi e convenzioni trasversali;
2. rappresentare le categorie mediante un'unica radice `ServiceActivity` e componenti discriminati `CatalogServiceData` oppure `FreeServiceData`, rinviando la strategia fisica all'architettura;
3. conservare lo `StableId` della prestazione durante tutte le modifiche consentite, richiedendo eliminazione e nuova identità esclusivamente per cambiare categoria;
4. rappresentare l'attribuzione mediante un componente uno-a-uno `ServiceOperationalContext`, privo di identità autonoma e contenente riferimenti diretti a viaggio, visita, ormeggio, porto, banchina e versioni applicate;
5. determinare le versioni di nave, porto e banchina all'istante della prestazione, senza riutilizzare automaticamente quelle applicate all'apertura della visita o dell'ormeggio;
6. modellare `ServiceType` con descrizione corrente, stato e indicatore monotono `hasEverBeenUsed`, necessario a impedire l'eliminazione anche dopo la rimozione di tutte le prestazioni che lo utilizzavano;
7. non riservare le descrizioni storiche dei tipi: una descrizione liberata da modifica o eliminazione torna utilizzabile, mantenendo riservate soltanto le denominazioni delle operazioni nave;
8. non prevedere descrizione o importo manuale per le prestazioni da catalogo e non prevedere tipo, peso o importo tariffario calcolato per le prestazioni libere;
9. utilizzare direttamente `ServiceActivity` come unità economica fatturabile, senza introdurre un'ulteriore entità equivalente a `VesselOperationCharge`;
10. impedire una modifica che renderebbe la prestazione non fatturabile o incompatibile con una fattura `in immissione`, richiedendone prima la rimozione esplicita invece di eliminare automaticamente l'associazione;
11. derivare il consolidamento dall'associazione e dallo snapshot della fattura, senza un attributo `isConsolidated` sulla prestazione;
12. trattare l'avviso sulle attività precedenti ancora `PLANNED` come proiezione ricalcolata e non persistita.

### 3.13.22 Esito provvisorio

La proposta copre catalogo, categorie, attributi comuni e specifici, attribuzione, versioni anagrafiche, stati, importi, modifiche, fatturabilità e consolidamento.

Il punto resta una **proposta progettuale** fino alla verifica nelle slice `VS-06`, `VS-07` e `VS-08`. Le decisioni verranno confermate, corrette o semplificate sulla base dell'implementazione e dei test; nel frattempo l'attività operativa prosegue con `VS-00 – Walking skeleton`.
