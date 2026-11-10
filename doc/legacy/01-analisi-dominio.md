# 1. Analisi del dominio

## 1.1 Introduzione al dominio

Il sistema gestisce le attività operative, economiche e contabili di un'azienda di ormeggiatori.

L'attività principale dell'azienda consiste nell'erogazione di servizi portuali a supporto delle navi durante le operazioni di arrivo, partenza o movimentazione all'interno del porto.

Il sistema deve permettere di tracciare:

- le operazioni effettuate;
- le navi coinvolte;
- le agenzie e i clienti associati;
- le prestazioni erogate;
- il calcolo degli importi secondo le tariffe definite;
- la fatturazione dei servizi;
- la gestione degli incassi e della contabilità.

## 1.2 Attori coinvolti

### Operatore

Persona che utilizza il gestionale per inserire, modificare e consultare i dati aziendali.

Nella prima versione del sistema non è previsto un modello di autenticazione o gestione dei ruoli, in quanto l'applicazione è progettata per un utilizzo locale da parte di un singolo operatore.

---

### Agenzia

Soggetto che rappresenta il riferimento operativo e commerciale per le attività svolte dall'azienda di ormeggiatori.

Ogni fattura deve essere associata obbligatoriamente ad una specifica agenzia.

L'agenzia rappresenta il soggetto al quale viene attribuito il credito della fattura e quindi il riferimento per la gestione della riscossione.

L'agenzia costituisce un'entità autonoma rispetto al cliente e possiede un proprio dominio applicativo.

---

### Cliente

Soggetto al quale viene attribuito il costo della fattura e nei confronti del quale viene registrato il debito economico.

Cliente e agenzia rappresentano entità distinte e non possono coincidere.

Il cliente costituisce un'entità autonoma rispetto all'agenzia e possiede un proprio dominio applicativo.

---

### Nave

Imbarcazione coinvolta nelle attività operative dell'azienda.

Attualmente il sistema necessita solamente delle informazioni identificative della nave, senza gestire ulteriori soggetti correlati come armatore, proprietario o compagnia navale.

Una stessa nave può essere coinvolta in più attività nel tempo.

---

### Perimetro degli attori

Per le funzionalità previste nella prima versione dell'applicazione non sono previsti ulteriori soggetti coinvolti.

In particolare, il sistema non gestirà inizialmente:

- armatori o proprietari delle navi;
- compagnie navali;
- fornitori;
- personale operativo;
- autorità portuali;
- terminal o altre strutture portuali.

## 1.3 Processi principali

L'applicazione supporta i principali processi operativi, economici e amministrativi necessari alla gestione dell'attività dell'azienda di ormeggiatori.

I processi principali individuati sono i seguenti.

### Gestione anagrafiche

Comprende la gestione delle informazioni di base utilizzate dal sistema e necessarie allo svolgimento delle attività operative e amministrative.

Le anagrafiche gestite includono:

- Agenzie
- Clienti
- Navi
- Porti
- Banchine
- Merci

---

### Gestione attività operative

Comprende la registrazione dei viaggi delle navi nell'ambito dei porti gestiti dall'azienda, delle relative visite e dei singoli ormeggi, oltre alle prestazioni effettuate e alle eventuali movimentazioni di merci.

Le informazioni registrate costituiscono la base per i successivi processi di tariffazione e fatturazione.

---

### Gestione tariffaria

Comprende la definizione e la gestione delle tariffe utilizzate per determinare gli importi delle prestazioni svolte.

---

### Gestione fatturazione

Comprende la generazione delle fatture derivanti dalle attività operative, il calcolo degli importi, l'applicazione di eventuali sconti e la gestione dello stato delle fatture.

---

### Gestione contabilità

Comprende la gestione dei conti finanziari aziendali, la registrazione degli incassi e delle spese, l'associazione dei movimenti ai relativi conti e la consultazione della situazione economica dell'azienda.

## 1.4 Concetti fondamentali

Il dominio dell'applicazione è composto da concetti anagrafici, operativi, tariffari, amministrativi e contabili che collaborano tra loro per rappresentare l'attività dell'azienda.

Le entità anagrafiche descrivono i soggetti e gli elementi riutilizzabili nel tempo. Il dominio operativo rappresenta invece il percorso delle navi nell'ambito dei porti gestiti dall'azienda, le permanenze nei singoli porti e le attività svolte durante tali periodi.

Il dominio tariffario e di fatturazione determina il valore economico delle attività e ne consente l'addebito ai clienti. Il dominio contabile registra infine gli incassi, le spese e le variazioni delle disponibilità finanziarie dell'azienda.

I concetti fondamentali sono organizzati nelle seguenti aree.

### Entità anagrafiche

Le entità anagrafiche rappresentano le informazioni di base utilizzate dai diversi processi dell'applicazione.

Sono gestite indipendentemente dalle singole attività operative e possono essere riutilizzate nel tempo.

---

#### Nave

La nave rappresenta l'imbarcazione coinvolta nelle attività operative gestite dall'azienda.

È un'entità anagrafica riutilizzabile nel tempo e può essere associata a più viaggi differenti.

Ogni viaggio riguarda una sola nave, mentre una nave può effettuare più viaggi, visite e ormeggi nel corso del tempo.

Alla nave sono associate le informazioni necessarie alla sua identificazione e alla tariffazione delle attività svolte.

La dimensione della nave è rappresentata mediante un numero intero non negativo. Nella prima versione del sistema non viene associata a un'unità di misura esplicita, poiché il significato della dimensione può variare in base alla tipologia di nave.

In una fase successiva potrà essere introdotta, per ciascuna tipologia di nave, la possibilità di configurare una specifica unità di misura. Tale evoluzione dovrà mantenere coerenti la dimensione anagrafica delle navi e i limiti degli scaglioni tariffari relativi alla stessa tipologia.

In particolare, la tipologia e la dimensione della nave contribuiscono a determinare:

- la tariffa applicabile;
- lo scaglione dimensionale di riferimento;
- il costo delle prestazioni e delle operazioni nave.

Le tipologie di nave previste inizialmente sono:

- nave normale;
- nave passeggeri;
- nave ADM.

Il sistema non gestisce inizialmente soggetti ulteriori collegati alla nave, come armatore, proprietario o compagnia navale.

---

#### Cliente

Il cliente rappresenta il soggetto al quale vengono addebitati i costi delle prestazioni e delle operazioni nave svolte dall'azienda.

Costituisce un'entità anagrafica autonoma e distinta dall'agenzia. Al cliente viene attribuito il debito derivante dalla fattura.

Uno stesso cliente può essere associato nel tempo a più viaggi, visite, ormeggi, attività e fatture, anche riferiti a navi differenti.

---

#### Agenzia

L'agenzia rappresenta il soggetto al quale viene attribuito il credito derivante dalle attività svolte dall'azienda.

Costituisce un'entità anagrafica autonoma e distinta dal cliente.

Ogni fattura deve essere associata obbligatoriamente a una specifica agenzia.

Una stessa agenzia può essere associata nel tempo a più viaggi, visite, ormeggi, attività e fatture, anche riferiti a clienti e navi differenti.

---

#### Porto

Il porto rappresenta l'area portuale nella quale si svolgono le attività operative gestite dall'azienda.

Costituisce un'entità anagrafica riutilizzabile e definisce le proprie banchine, che ne costituiscono sottosezioni operative. Le tariffe sono definite distintamente per porto.

Ogni porto possiede inoltre un fuso operativo identificato mediante un nome IANA, utilizzato per interpretare le date e le ore delle attività che vi si svolgono. Alla creazione viene proposto il fuso aziendale corrente; dopo il salvataggio il fuso del porto segue una propria sequenza temporale autonoma secondo le regole definite nella sezione dedicata.

Ogni visita è associata a uno specifico porto e ne rappresenta il periodo di permanenza della nave nell'ambito di un viaggio.

---

#### Banchina

La banchina rappresenta una specifica area di attracco appartenente a un porto.

Costituisce un elemento anagrafico subordinato al porto: viene creata nell'ambito del porto che la contiene e non può essere trasferita a un porto differente.

Un ormeggio può essere associato a una specifica banchina, che identifica la posizione della nave nel porto. La banchina può rimanere non specificata quando l'informazione non è disponibile o non è applicabile.

---

#### Merce

La merce rappresenta la tipologia di bene caricato o scaricato durante l'ormeggio di una nave.

Costituisce un'entità anagrafica riutilizzabile, utilizzata per classificare le movimentazioni merci registrate nel corso delle visite.

Una stessa merce può essere associata a più movimentazioni, riferite a ormeggi, visite e navi differenti.

La merce descrive la natura del bene movimentato, mentre la relativa quantità e la distinzione tra carico e scarico appartengono alla singola movimentazione.

Nella fase iniziale del progetto, la merce ha finalità informative e di rendicontazione e non produce effetti economici sulla tariffazione, sulla fatturazione o sulla contabilità. Le movimentazioni che la utilizzano possono tuttavia essere riportate in fattura come informazioni prive di importo.

### Dominio operativo

Il dominio operativo descrive il percorso della nave nell'ambito dei porti gestiti dall'azienda, la sua permanenza nei singoli porti, la sua collocazione presso le banchine e le attività svolte dall'azienda.

#### Viaggio

Il viaggio rappresenta il percorso operativo complessivo di una nave nell'ambito dei porti gestiti dall'azienda.

Ogni viaggio riguarda una sola nave e comprende una o più visite. La prima visita viene aperta dall'operazione di entrata; eventuali visite successive vengono aperte dai movimenti verso un porto differente.

Il viaggio può rimanere aperto, insieme alla visita corrente e all'ultimo ormeggio, finché non viene registrata l'operazione di uscita.

L'uscita chiude la visita e il viaggio. Una successiva entrata apre sempre un nuovo viaggio distinto.

---

#### Visita

La visita rappresenta il periodo durante il quale una nave permane presso uno specifico porto nell'ambito di un viaggio.

Ogni visita appartiene a un solo viaggio, riguarda un solo porto e ha inizio con l'arrivo della nave nel porto e termina con la sua partenza.

Durante la visita la nave può effettuare uno o più ormeggi. Ciascun ormeggio può riferirsi a una specifica banchina del porto oppure avere la banchina non specificata.

La visita costituisce il contenitore logico degli ormeggi effettuati dalla nave.

Alla visita possono essere associati un cliente e un'agenzia di riferimento. Questi valori sono opzionali e, quando presenti, rappresentano i riferimenti predefiniti per tutti gli ormeggi e le prestazioni appartenenti alla visita.

---

#### Ormeggio

L'ormeggio rappresenta un intervallo continuativo della permanenza della nave nel porto interessato dalla visita e, quando disponibile, ne identifica la collocazione presso una specifica banchina.

Ogni ormeggio appartiene a una sola visita.

Un ormeggio ha una data e un'ora di inizio e una data e un'ora di fine, determinate dalle operazioni nave che lo delimitano.

A un ormeggio sono associate le informazioni operative relative alla specifica collocazione della nave, tra cui:

* banchina, eventualmente non specificata;
* prestazioni attribuite in base all'istante di esecuzione;
* movimentazioni di merci;
* eventuali riferimenti specifici a cliente e agenzia.

Il cliente e l'agenzia associati all'ormeggio sono opzionali. Quando presenti, sostituiscono i corrispondenti riferimenti definiti sulla visita per tutte le attività dell'ormeggio.

In assenza di valori specifici sull'ormeggio, vengono utilizzati il cliente e l'agenzia della visita.

---

#### Operazione nave

Le operazioni nave rappresentano una tipologia particolare di prestazione dalla quale vengono determinati viaggi, visite e ormeggi. Non vengono attribuite a tali elementi come attività ordinarie, perché ne costituiscono gli eventi originari.

Le tipologie di operazione nave appartengono a un insieme fisso previsto dal sistema e non dipendono dal catalogo dei tipi di prestazione. Le tipologie non possono essere aggiunte, rinominate o eliminate; le singole operazioni registrate rimangono invece modificabili o eliminabili secondo le regole operative e di consolidamento.

Le operazioni previste dal sistema sono:

* **Entrata**;
* **Uscita**;
* **Spostamento**.

Le operazioni nave con stato **prevista** o **effettuata** modificano la struttura operativa del dominio, determinando l'apertura, la chiusura o la transizione tra ormeggi. Le operazioni con stato **mancata** rimangono rilevanti come prestazioni, ma non producono effetti operativi.

L'operazione di entrata deve indicare obbligatoriamente il porto di arrivo e determina l'apertura di un nuovo viaggio, della relativa visita e del primo ormeggio.

L'operazione di uscita determina la chiusura dell'ormeggio corrente, della visita e del viaggio.

L'operazione di spostamento indica sempre una data e ora di partenza e una data e ora di arrivo. L'arrivo non può precedere la partenza. Gli effetti operativi ed economici dipendono dalla destinazione:

* se il porto di destinazione coincide con quello della visita corrente, alla partenza viene chiuso l'ormeggio corrente e all'arrivo ne viene aperto uno nuovo nella stessa visita; economicamente viene generata una sola componente di tipo **spostamento**, tariffata nel porto corrente in base alla data di partenza;
* se il porto di destinazione è differente, alla partenza vengono chiusi l'ormeggio e la visita correnti e all'arrivo vengono aperti una nuova visita e il relativo primo ormeggio nel porto di destinazione, senza chiudere il viaggio; economicamente l'operazione è composta da un'**uscita** tariffata nel porto di partenza in base alla data di partenza e da un'**entrata** tariffata nel porto di destinazione in base alla data di arrivo.

Durante l'intervallo compreso tra partenza e arrivo la nave risulta in trasferimento e non è associata ad alcun ormeggio. Nel trasferimento tra porti non è richiesto l'inserimento del porto di partenza, che viene derivato dalla visita corrente e consolidato come dato storico dell'operazione.

Il porto di destinazione dello spostamento è sempre obbligatorio, anche quando coincide con quello della visita corrente. In entrambi i casi la banchina di destinazione può essere indicata oppure rimanere non specificata. Quando è indicata, deve appartenere al porto di destinazione.

Entrata e uscita indicano un singolo istante con precisione al minuto: l'istante pianificato se previste, quello effettivo se effettuate e quello nel quale avrebbero dovuto svolgersi se mancate. Lo spostamento indica invece gli istanti di partenza e di arrivo con la stessa precisione. Per le operazioni previste o effettuate, tali istanti determinano i limiti temporali delle visite e degli ormeggi interessati.

Le visite e gli ormeggi determinati dalle operazioni nave vengono persistiti. Non sono quindi ricostruiti a ogni consultazione, ma vengono aggiornati in modo controllato quando un'operazione viene modificata, eliminata o inserita retroattivamente.

Le operazioni nave dipendono dal piano tariffario applicabile. Possono essere fatturate quando sono effettuate oppure mancate, secondo le relative regole tariffarie; finché sono previste non possono essere inserite in fattura.

---

#### Prestazione

La prestazione rappresenta un'attività richiesta all'azienda nell'ambito di un viaggio, indipendentemente dal fatto che sia stata effettivamente eseguita.

Le prestazioni si distinguono in:

* **operazioni nave**, costituite dalle attività fisse di entrata, spostamento e uscita;
* **prestazioni a catalogo**, che fanno riferimento a un tipo di prestazione configurabile e seguono le regole del piano tariffario;
* **prestazioni libere**, definite direttamente mediante una descrizione e un importo.

Per inserire una prestazione viene selezionata la nave. La visita e l'ormeggio vengono attribuiti automaticamente in base alla data e all'ora indicate, utilizzando la struttura operativa costruita dalle operazioni nave previste ed effettuate. Una prestazione ordinaria può essere registrata soltanto all'interno dell'intervallo temporale di una visita, dopo la relativa entrata e non oltre l'uscita.

Ogni prestazione indica il tipo, la data e l'ora, lo stato di esecuzione e può contenere note facoltative. Gli stati ammessi sono **prevista**, **effettuata** e **mancata**.

Le prestazioni a catalogo e le prestazioni libere non modificano la durata o la posizione dell'ormeggio. Soltanto le operazioni nave previste o effettuate producono effetti su viaggi, visite e ormeggi.

Il tipo di prestazione descrive una tipologia di servizio configurabile soggetta alle relative regole tariffarie. Ogni prestazione a catalogo deve fare riferimento a un tipo di prestazione, che definisce anche il peso applicato come moltiplicatore del valore tariffario. Le variazioni del peso sono storicizzate e hanno una specifica data e ora di decorrenza.

Il catalogo iniziale dei tipi di prestazione comprende esclusivamente il **rinforzo ormeggio**. L'operatore può estendere, modificare o disattivare i tipi di prestazione configurabili in funzione delle esigenze operative.

Entrata, spostamento e uscita non costituiscono tipi di prestazione configurabili e non appartengono al catalogo, pur essendo prestazioni.

Per esigenze particolari è possibile registrare una prestazione libera. Questa non fa riferimento a un tipo di prestazione e non segue le normali regole tariffarie; descrizione e importo vengono indicati direttamente sulla singola attività e possono variare per ogni registrazione.

Operazioni nave, prestazioni a catalogo e prestazioni libere condividono le regole comuni relative a data e ora, stato, note, tracciabilità, fatturazione e consolidamento. Le operazioni nave applicano inoltre le regole necessarie a determinare viaggi, visite e ormeggi.

Alla singola prestazione possono essere associati un cliente e un'agenzia specifici. Quando presenti, questi riferimenti prevalgono su quelli definiti per l'ormeggio o la visita attribuiti. Cliente e agenzia vengono determinati separatamente, consentendo di ridefinire uno solo dei due.

La registrazione di una prestazione è indipendente dalla sua fatturazione e può avvenire anche prima della generazione della relativa fattura.

---

#### Movimentazione merci

La movimentazione merci rappresenta un'informazione aggiuntiva associata all'ormeggio di una nave.

Consente di registrare le merci scaricate all'arrivo della nave oppure caricate prima della sua partenza.

Ogni movimentazione specifica almeno:

- la tipologia di merce;
- la quantità movimentata;
- il tipo di operazione, distinguendo tra carico e scarico.

Nella fase iniziale del progetto, le movimentazioni merci hanno finalità esclusivamente informative e non producono effetti sulle prestazioni, sulle tariffe, sugli importi di fattura o sulla contabilità. Possono essere incluse in fattura come informazioni aggiuntive e seguono in tal caso le relative regole di consolidamento.

Le informazioni relative alle movimentazioni merci e alle prestazioni possono essere utilizzate per la produzione di resoconti e report sulle attività svolte durante le visite e gli ormeggi delle navi.

### Dominio tariffario e fatturazione

Il dominio tariffario e di fatturazione comprende i concetti utilizzati per determinare il valore economico delle attività svolte e per addebitarne il costo ai soggetti interessati.

#### Tariffa

La tariffa rappresenta l'insieme delle regole economiche utilizzate per determinare il costo delle prestazioni e delle operazioni nave applicabili in uno specifico porto.

Ogni tariffa è associata a:

- un porto;
- una data e un'ora di inizio validità;
- una configurazione completa per ogni tipologia di nave prevista dal sistema.

Per ciascuna tipologia di nave, la relativa configurazione comprende un insieme ordinato di scaglioni dimensionali, uno scaglione extra e una tariffa extra. Le configurazioni delle diverse tipologie appartengono alla stessa tariffa e ne condividono il porto e l'intervallo temporale, ma possono utilizzare scaglioni e valori differenti.

La fine della validità non viene specificata direttamente. Per ogni porto, una tariffa è applicabile dalla propria decorrenza inclusa fino alla decorrenza esclusa della tariffa successiva. Se non esistono tariffe successive, rimane applicabile senza limite temporale finale.

Per lo stesso porto non possono esistere due tariffe con la stessa data e ora di decorrenza. Nello stesso periodo possono invece esistere tariffe differenti per porti differenti. Ogni nuova tariffa deve ripetere le configurazioni di tutte le tipologie di nave, comprese quelle i cui valori non cambiano rispetto alla tariffa precedente.

Per ciascuno scaglione della configurazione relativa a una tipologia di nave vengono definiti:

- un limite dimensionale massimo;
- un unico valore tariffario di riferimento.

Per ogni scaglione viene indicato soltanto il limite massimo, incluso. Il primo scaglione parte da `0`; ciascuno dei successivi inizia dal valore immediatamente successivo al limite massimo precedente. Gli scaglioni sono ordinati per limite massimo crescente e non possono avere limiti duplicati.

I limiti degli scaglioni e l'ampiezza dello scaglione extra sono espressi mediante numeri interi e, nella prima versione del sistema, non prevedono un'unità di misura esplicita. Il loro significato deve essere coerente con quello della dimensione associata alle navi della tipologia alla quale si riferisce la configurazione.

Il valore dello scaglione non rappresenta direttamente il costo di una specifica attività. Ogni tipo di prestazione o operazione nave è associato a un peso storicizzato, utilizzato come moltiplicatore del valore tariffario applicabile.

Lo **scaglione extra** di ciascuna configurazione definisce l'incremento dimensionale applicabile quando la nave supera il limite massimo dell'ultimo scaglione ordinario previsto per la relativa tipologia.

La **tariffa extra** definisce l'aumento del valore tariffario per ogni scaglione extra iniziato. Quando la dimensione supera l'ultimo limite ordinario, il numero di scaglioni extra viene arrotondato per eccesso e ciascuno viene conteggiato per intero.

Le configurazioni e i relativi scaglioni appartengono alla tariffa e ne condividono il periodo di validità derivato dalla sua data di inizio e dall'eventuale tariffa successiva dello stesso porto.

Le prestazioni libere sono escluse dalla tariffazione ordinaria e prevedono un importo specificato direttamente dall'operatore.

---

#### Fattura

La fattura rappresenta il documento economico attraverso il quale vengono addebitati a un cliente i costi delle prestazioni e delle operazioni nave svolte dall'azienda.

Ogni fattura è associata obbligatoriamente a:

- un cliente, al quale viene attribuito il debito;
- un'agenzia, alla quale viene attribuito il credito.

Per essere emessa, la fattura deve inoltre comprendere una o più prestazioni, operazioni nave con una sola componente economica oppure singole componenti economiche fatturabili di uno spostamento tra porti.

Cliente e agenzia vengono selezionati esplicitamente sulla fattura prima di comporne le righe. Le attività economiche e le movimentazioni informative selezionabili vengono quindi limitate agli elementi che presentano la stessa coppia effettiva `cliente + agenzia`.

Durante lo stato `in immissione` la fattura può rimanere temporaneamente priva di righe economiche, conservando cliente e agenzia selezionati; l'emissione richiede comunque almeno un'attività economica.

La fattura può inoltre includere una o più movimentazioni merci come informazioni aggiuntive. Tali movimentazioni non costituiscono righe economiche e non modificano imponibile, sconti, bollo o totale.

Una fattura può comprendere attività appartenenti a ormeggi, visite, viaggi e navi differenti.

Le attività raccolte nella stessa fattura devono essere riferite al medesimo cliente e alla medesima agenzia effettivi.

Uno stesso ormeggio o una stessa visita possono essere oggetto di più fatture separate.

Per ogni attività fatturata viene conservato l'importo applicato, che può derivare:

- dal sistema tariffario;
- da un importo specificato direttamente per una prestazione extra.

La fattura può attraversare differenti stati durante il proprio ciclo di vita:

- **In immissione**;
- **Emessa**;
- **Parzialmente saldata**;
- **Saldata**.

Gli stati di riscossione dipendono dai movimenti contabili in entrata associati alla fattura.

La fatturazione rimane distinta dalla registrazione delle attività operative. Una prestazione, un'operazione nave o una sua componente economica può quindi essere registrata anche se non è ancora stata inclusa in una fattura.

Le componenti `uscita` ed `entrata` generate da uno spostamento tra porti sono selezionabili e fatturabili autonomamente. Possono essere associate in momenti diversi a fatture differenti, anche riferite a coppie `cliente + agenzia` diverse, purché ciascuna componente sia compatibile con la fattura che la contiene. Ogni componente può appartenere al massimo a una fattura alla volta.

Una movimentazione merci può essere associata informativamente a una o più fatture compatibili, ma non più di una volta nella stessa fattura. L'emissione della prima fattura che la include consolida i dati strutturali della movimentazione riportati nel documento, pur senza attribuire loro un importo. Le altre associazioni, comprese quelle verso fatture ancora `in immissione`, rimangono valide.

Una fattura può essere eliminata fisicamente soltanto mentre si trova nello stato **In immissione**. L'eliminazione rimuove anche tutte le associazioni tra la fattura e le prestazioni, le operazioni nave a componente singola, le singole componenti economiche degli spostamenti tra porti e le movimentazioni merci che la compongono. Gli elementi disassociati non vengono eliminati e tornano disponibili per essere inseriti in un'altra fattura.

### Dominio contabile

Il dominio contabile comprende i concetti utilizzati per registrare gli incassi, le spese e i trasferimenti di capitale tra le disponibilità finanziarie dell'azienda.

#### Conto finanziario

Il conto finanziario rappresenta una disponibilità economica reale dell'azienda sulla quale vengono registrati i movimenti contabili.

I conti sono gestiti in modo uniforme e possono rappresentare, ad esempio:

- un conto corrente bancario;
- una cassa;
- un conto postale;
- un'altra disponibilità finanziaria dell'azienda.

Ogni conto possiede un saldo iniziale privo di una data di decorrenza. Il sistema consente di calcolare il saldo del conto alla data selezionata e il saldo previsto sulla base dei movimenti contabili che lo interessano.

Un conto può essere disattivato quando non viene più utilizzato per nuove operazioni. La disattivazione non elimina il conto né i movimenti già registrati.

---

#### Voce

La voce rappresenta una posizione contabile utilizzata per raggruppare e monitorare determinati movimenti in entrata e in uscita.

È indipendente dai conti finanziari e non rappresenta una disponibilità economica reale, ma uno strumento di controllo interno della contabilità.

Alla stessa voce possono essere associati per intero movimenti effettuati su conti finanziari differenti. Uno stesso movimento può essere associato per intero a più voci.

Ogni voce può possedere un saldo iniziale, al quale non è associata una data di decorrenza. Il saldo della voce deriva dal saldo iniziale e dall'importo integrale dei movimenti contabili associati.

La voce consente di ricostruire un andamento contabile indipendente dai saldi dei singoli conti finanziari.

Rimane distinta dalla categoria di spesa, che classifica esclusivamente la natura dei movimenti in uscita e degli eventuali costi dei giroconti.

---

#### Movimento contabile

Il movimento contabile rappresenta una variazione del saldo di uno o più conti finanziari dell'azienda e può concorrere anche al saldo di una o più voci contabili.

I movimenti contabili si distinguono in:

- movimenti in entrata;
- movimenti in uscita;
- giroconti.

##### Movimento in entrata

Il movimento in entrata incrementa il saldo del conto associato e può rappresentare un incasso oppure un'entrata di altra natura.

L'incasso è una somma ricevuta da un cliente tramite una determinata agenzia e può essere attribuito, integralmente o parzialmente, a una o più fatture. Un'altra entrata rappresenta invece una somma che non costituisce il pagamento di una fattura, come un rimborso, un interesse attivo o un apporto di capitale.

Una fattura può essere saldata attraverso più movimenti in entrata e uno stesso movimento può essere ripartito tra più fatture.

Quando un movimento è associato a più fatture, a ciascuna viene attribuita una specifica quota dell'importo incassato. Tali quote concorrono a determinare lo stato di riscossione delle fatture.

##### Movimento in uscita

Il movimento in uscita riduce il saldo del conto associato e rappresenta una spesa sostenuta dall'azienda.

La spesa può essere classificata mediante una categoria organizzata secondo una struttura gerarchica.

##### Giroconto

Il giroconto rappresenta il trasferimento di capitale tra due conti finanziari dell'azienda.

Riduce il saldo del conto di origine e incrementa quello del conto di destinazione. In assenza di costi di trasferimento non modifica la disponibilità finanziaria complessiva dell'azienda; quando sono presenti costi, questa si riduce del relativo importo.

I movimenti costituiscono lo storico delle variazioni dei conti e delle eventuali voci associate, consentendone la ricostruzione nel tempo.

---

#### Categoria di spesa

La categoria di spesa rappresenta la classificazione utilizzata per organizzare i movimenti contabili in uscita e gli eventuali costi dei giroconti in base alla natura della spesa sostenuta.

Le categorie sono organizzate secondo una struttura gerarchica flessibile, nella quale una categoria può contenere una o più sottocategorie.

Ad esempio:

- **A - Carburante**
  - **A1 - Gasolio**
- **B - Manutenzione**
  - **B1 - Ormeggi**

L'applicazione fornisce un insieme iniziale di categorie di spesa, che l'operatore può modificare, integrare o estendere in base alle esigenze dell'azienda.

Ogni movimento in uscita deve essere associato alla categoria che ne descrive la finalità.

## 1.5 Regole di dominio

Questa sezione raccoglie le regole e i vincoli necessari a garantire la coerenza dei dati e dei processi, indipendentemente dalle future scelte tecniche o di interfaccia.

### Principi trasversali di validazione e consolidamento

- Una fattura è **consolidata** quando si trova nello stato `emessa`, `parzialmente saldata` o `saldata`.
- Una prestazione o un'operazione nave con una sola componente economica è consolidata quando appartiene a una fattura consolidata.
- Per uno spostamento tra porti, ciascuna componente economica è consolidata autonomamente quando appartiene a una fattura consolidata. L'altra componente può rimanere non fatturata oppure essere associata a una fattura differente.
- I dati comuni dello spostamento tra porti sono protetti quando una loro variazione modificherebbe direttamente o indirettamente una componente già consolidata; la presenza di una componente consolidata non impedisce invece le variazioni che riguardano esclusivamente l'altra componente e lasciano invariati i dati e i risultati consolidati.
- Una movimentazione merci è consolidata quando è inclusa come informazione in una fattura consolidata.
- Nessuna variazione può modificare direttamente o indirettamente dati o risultati consolidati, compresi attribuzioni operative, versioni applicate, valori intermedi, arrotondamenti e importi finali.
- La presenza di elementi consolidati non impedisce una variazione che lascia invariati tutti i dati e i risultati da essi utilizzati.
- Quando una variazione richiede controlli, ricalcoli o aggiornamenti derivati, validazione e applicazione costituiscono un'unica operazione atomica; se anche un solo vincolo non è rispettato, nessuna modifica viene conservata.
- Il ritiro consentito di una fattura nello stato `emessa` la riporta nello stato `in immissione`: gli elementi e le singole componenti economiche associati cessano di essere consolidati da quella fattura e tornano soggetti alle normali variazioni, fatti salvi i vincoli prodotti dall'eventuale consolidamento dell'altra componente dello stesso spostamento; restano inoltre validi l'identificativo e gli altri vincoli derivanti dalla prima emissione.
- Le note costituiscono l'eccezione esplicitamente modificabile dopo il consolidamento: non partecipano a calcoli, attribuzioni o risultati economici.
- Le sezioni specifiche precisano i dati confrontati, gli effetti ricalcolati e gli ulteriori vincoli applicabili a ciascuna operazione.

### Regole anagrafiche

#### Principi generali

- Ogni anagrafica possiede un'identità tecnica e un codice progressivo univoci, stabili nel tempo e comuni a tutte le versioni; le modalità di generazione e visualizzazione del codice appartengono alla progettazione applicativa.
- Le modifiche ai dati anagrafici sono storicizzate mediante versioni con data e ora di decorrenza, senza creare una nuova identità.
- Lo stato corrente `attiva` o `disattivata` non è storicizzato e determina esclusivamente la possibilità di creare nuovi riferimenti.
- Un'anagrafica disattivata rimane visibile nei riferimenti esistenti, nelle ricerche storiche e nella gestione delle anagrafiche.
- L'eliminazione fisica è consentita soltanto in assenza di riferimenti persistenti; ciclo di vita, versioni e controlli sono dettagliati nella sezione dedicata alla storicizzazione temporale.

#### Unicità dei dati identificativi nelle versioni anagrafiche

- Per ogni tipologia di anagrafica devono essere definiti i dati identificativi utilizzati per prevenire i duplicati.
- I dati identificativi definiti per ciascuna tipologia di anagrafica devono essere univoci tra identità anagrafiche differenti.

I dati identitari sono definiti come segue:

- per i **clienti**, la ragione sociale;
- per le **agenzie**, la ragione sociale;
- per le **navi**, il nome di registrazione;
- per i **porti**, la combinazione di nome, località e nazione;
- per le **banchine**, la combinazione tra porto di appartenenza e nome;
- per le **merci**, la denominazione.

La verifica dell'unicità considera:

- la versione iniziale;
- tutte le versioni successive;
- le anagrafiche attive;
- le anagrafiche disattivate.

Si applicano inoltre le seguenti regole:

- Un dato identificativo utilizzato da una versione rimane riservato alla relativa identità anagrafica anche quando una versione successiva utilizza un valore differente.
- La modifica di un dato identificativo non libera il valore precedente.
- La disattivazione dell'anagrafica non libera alcuno dei dati identificativi presenti nelle sue versioni.
- La stessa identità anagrafica può riutilizzare in una versione successiva un proprio valore precedente.
- Un dato identificativo viene liberato soltanto con l'eliminazione fisica dell'intera anagrafica.
- Dopo l'eliminazione, il valore può essere utilizzato da una nuova anagrafica, che riceve un'identità tecnica e un codice progressivo differenti.
- La verifica dell'unicità viene eseguita durante la creazione di un'anagrafica, l'inserimento di una versione e la modifica dei valori di una versione.
- Il confronto dei dati testuali identificativi ignora gli spazi iniziali e finali e non distingue tra lettere maiuscole e minuscole.

Per le navi, il codice IMO costituisce un identificativo secondario e:

- può essere assente;
- quando presente, deve essere univoco tra tutte le versioni di tutte le navi esistenti;
- rimane riservato alla nave che lo ha utilizzato finché l'intera anagrafica non viene eliminata.

Per le banchine, l'unicità considera la combinazione tra l'identità tecnica del porto che le contiene e il nome della banchina.

#### Struttura dei porti e delle banchine

- Il porto definisce e contiene le proprie banchine.
- La banchina costituisce un elemento anagrafico subordinato al porto e non può essere collegata liberamente a porti differenti.
- Ogni banchina:
  - appartiene obbligatoriamente a un solo porto;
  - viene creata nell'ambito del porto di appartenenza;
  - mantiene lo stesso porto per tutta la propria esistenza.
- L'appartenenza al porto:
  - non possiede validità temporale;
  - non appartiene alle versioni anagrafiche della banchina;
  - non può essere modificata;
  - non può essere rimossa senza eliminare l'intera banchina.
- Le versioni temporali della banchina possono modificarne i dati, come il nome o eventuali informazioni descrittive, ma non il porto che la contiene.
- Non è possibile spostare una banchina da un porto a un altro.
- Se occorre rappresentare una banchina presso un porto differente:
  - deve essere creata una nuova banchina nel porto di destinazione;
  - la nuova banchina riceve una nuova identità tecnica e un nuovo codice progressivo;
  - la banchina originaria conserva tutti i riferimenti esistenti e può essere disattivata quando non deve più essere selezionabile.
- La nuova banchina non mantiene alcuna continuità tecnica con quella originaria, anche quando possiede lo stesso nome o rappresenta materialmente la stessa area.
- La creazione di una banchina è consentita soltanto all'interno di un porto attivo.
- La disattivazione del porto:
  - non modifica lo stato proprio delle banchine;
  - nasconde il porto e tutte le banchine contenute da ogni menu di selezione destinato alla creazione di nuovi riferimenti;
  - conserva tutti i riferimenti già esistenti al porto e alle sue banchine.
- La riattivazione del porto rende nuovamente selezionabili le banchine contenute che possiedono lo stato `attiva`; le banchine individualmente disattivate rimangono nascoste.
- La disattivazione o la riattivazione di una singola banchina non modifica lo stato del porto né quello delle altre banchine.
- Gli elementi già associati a una banchina rimangono validi e continuano a utilizzare i dati della versione applicabile alla propria data.
- Ogni ormeggio con banchina specificata deve appartenere allo stesso porto della visita.
- L'unicità del nome della banchina viene verificata nell'ambito del porto che la contiene e considera tutte le versioni, attuali e storiche, delle banchine appartenenti allo stesso porto.
- Un nome utilizzato da una banchina rimane riservato alla relativa identità finché la banchina non viene eliminata fisicamente.
- Lo stesso nome può essere utilizzato da banchine appartenenti a porti differenti.
- Una banchina non può essere separata dal porto per aggirare i vincoli di eliminazione.
- La rimozione di una banchina dall'elenco del porto equivale all'eliminazione fisica della banchina ed è consentita soltanto quando essa non possiede riferimenti persistenti.
- Un porto non può essere eliminato finché contiene almeno una banchina, anche se disattivata o mai utilizzata.
- Non sono previste eliminazioni a cascata: le banchine eliminabili devono essere rimosse esplicitamente prima di eliminare il porto.

### Regole operative

#### Viaggi, visite e ormeggi

- Ogni viaggio riguarda una sola nave e rappresenta il suo percorso operativo nell’ambito dei porti gestiti dall’azienda.
- Ogni viaggio comprende una o più visite: la prima è aperta dall'entrata, mentre le successive sono aperte dagli spostamenti verso porti differenti.
- Ogni visita appartiene a un solo viaggio, riguarda un solo porto e comprende uno o più ormeggi.
- Ogni ormeggio appartiene a una sola visita e rappresenta un intervallo continuativo della permanenza della nave nel porto, con una banchina specifica oppure non specificata.
- Per una stessa nave può esistere un solo viaggio aperto alla volta.
- All'interno di un viaggio può esistere una sola visita aperta alla volta e, all'interno di una visita, un solo ormeggio aperto alla volta.
- Le visite appartenenti allo stesso viaggio e gli ormeggi appartenenti alla stessa visita devono rispettare un ordine temporale coerente e non possono sovrapporsi.
- Ai confini temporali, il minuto di partenza di uno spostamento appartiene all'ormeggio che termina, mentre il minuto di arrivo appartiene al nuovo ormeggio. L'istante di un'uscita appartiene all'ultima visita e all'ultimo ormeggio; l'entrata apre invece immediatamente la visita e il primo ormeggio.
- Lo spostamento all'interno dello stesso porto chiude l'ormeggio corrente alla partenza e ne apre uno nuovo all'arrivo, senza concludere la visita.
- Lo spostamento verso un porto differente chiude l'ormeggio e la visita correnti alla partenza e apre una nuova visita con il relativo primo ormeggio all'arrivo nel porto di destinazione, mantenendo aperto lo stesso viaggio.
- Durante uno spostamento, tra la partenza e l'arrivo, la nave risulta in trasferimento e non appartiene ad alcun ormeggio.
- Nei minuti successivi alla partenza e precedenti all'arrivo non è possibile registrare o assegnare alcuna prestazione a catalogo o libera alla nave.
- Durante tale intervallo non possono iniziare altre operazioni nave: l'unica attività operativa in corso è lo spostamento stesso.
- Il viaggio, la visita e l'ultimo ormeggio possono rimanere aperti senza un limite temporale prestabilito finché non viene registrata un'uscita valida.
- L'uscita chiude l'ormeggio corrente, la visita e il viaggio.
- Una successiva entrata apre un nuovo viaggio distinto.

#### Operazioni nave

- Le operazioni nave sono **entrata**, **spostamento** e **uscita** e costituiscono un insieme fisso non configurabile.
- Non vengono attribuite a viaggi, visite e ormeggi come attività ordinarie, poiché sono gli eventi dai quali tali elementi vengono costruiti.
- Le operazioni con stato `prevista` o `effettuata` producono gli stessi effetti sulla struttura operativa; quelle con stato `mancata` non producono effetti.
- L'entrata richiede obbligatoriamente il porto di arrivo e apre un nuovo viaggio, una visita e il relativo primo ormeggio.
- Lo spostamento richiede una visita e un ormeggio aperti e deve indicare data e ora di partenza, data e ora di arrivo e porto di destinazione; l'arrivo non può precedere la partenza.
- Il porto di partenza non viene inserito manualmente: è derivato dalla visita corrente e consolidato come dato storico dell'operazione.
- Lo spostamento produce effetti differenti in base al porto di destinazione:
  - se il porto non cambia, chiude l'ormeggio corrente alla partenza e ne apre uno nuovo all'arrivo nella stessa visita; genera una sola componente economica di tipo `spostamento`;
  - se il porto cambia, chiude l'ormeggio e la visita correnti alla partenza e apre una nuova visita con il relativo primo ormeggio all'arrivo, senza chiudere il viaggio; genera due componenti economiche collegate, `uscita` dal porto di partenza ed `entrata` nel porto di destinazione.
- Le componenti economiche dello spostamento tra porti appartengono alla stessa operazione e condividono stato e note, ma le rispettive associazioni alle fatture sono indipendenti.
- Ciascuna componente può essere fatturata autonomamente e al massimo una volta: è quindi possibile fatturare la sola `uscita` o la sola `entrata` e associare successivamente l'altra componente a una fattura differente.
- L'importo complessivo dello spostamento tra porti è la somma delle due componenti ed è utilizzato nelle consultazioni riferite all'intera operazione; ogni fattura considera invece soltanto l'importo della componente associata. Un eventuale importo manuale può essere specificato separatamente per ciascuna componente.
- Il consolidamento avviene separatamente per componente. La fatturazione di una componente non consolida automaticamente l'altra, ma impedisce qualsiasi modifica dei dati comuni dell'operazione che altererebbe dati o risultati già consolidati.
- La banchina di destinazione può essere non specificata; se viene indicata, deve appartenere al porto di destinazione.
- L'uscita richiede un viaggio, una visita e un ormeggio aperti e ne determina la chiusura.
- Più ormeggi consecutivi con banchina non specificata restano distinti e non vengono accorpati.
- La sequenza delle operazioni deve rispettare le regole logiche del viaggio e deve determinare univocamente visite e ormeggi.
- L'integrazione successiva di una banchina precedentemente sconosciuta aggiorna l'ormeggio esistente; un effettivo trasferimento richiede invece un'operazione di spostamento.

##### Sequenza delle operazioni

- Dopo un'entrata valida sono ammessi soltanto uno spostamento oppure un'uscita.
- Dopo uno spostamento valido sono ammessi un altro spostamento oppure un'uscita.
- Dopo un'uscita valida è ammessa soltanto una nuova entrata, che apre un nuovo viaggio.
- Un'entrata, anche con stato `mancata`, può essere registrata soltanto se al relativo istante non esiste un viaggio aperto per la nave; il porto di arrivo è sempre obbligatorio.
- Le operazioni con stato `mancata` vengono ignorate nella determinazione dell'alternanza operativa e non modificano la posizione della nave, fermi restando i vincoli di contesto indicati di seguito.
- Una sequenza operativa può rimanere incompleta con un viaggio aperto, composto dall'entrata e da eventuali spostamenti, senza che sia ancora presente l'uscita.

##### Precisione e univocità temporale

- La precisione temporale delle operazioni nave e delle altre prestazioni è il minuto; secondi e frazioni di secondo non vengono gestiti.
- Per una stessa nave non possono esistere due estremi temporali di operazioni nave nello stesso minuto, indipendentemente dal tipo e dallo stato, compreso lo stato `mancata`; per lo spostamento il vincolo si applica sia alla partenza sia all'arrivo.
- Operazioni relative a navi differenti possono condividere lo stesso minuto.
- Più prestazioni ordinarie possono condividere lo stesso minuto tra loro e con un'operazione nave.
- In caso di coincidenza tra una prestazione e un'operazione nave si applicano le regole di attribuzione temporale definite per entrata, spostamento e uscita.

##### Operazioni mancate

- Le operazioni nave con stato `mancata` non partecipano all'alternanza logica della sequenza, ma devono essere coerenti con il contesto operativo esistente al proprio istante.
- Un'entrata `mancata` richiede sempre il porto di arrivo ed è ammessa soltanto quando, al relativo istante, non esiste un viaggio aperto.
- Un'uscita `mancata` richiede una visita e un ormeggio aperti al relativo istante; il porto viene derivato dalla visita corrente e non viene inserito manualmente.
- Uno spostamento `mancato` richiede una visita e un ormeggio aperti all'istante di partenza; il porto di origine viene derivato dalla visita corrente, mentre il porto di destinazione deve essere indicato.
- Un'uscita o uno spostamento `mancati` non possono essere registrati in un istante strettamente compreso nell'intervallo di trasferimento prodotto da un altro spostamento, poiché in tale intervallo non esiste una posizione portuale corrente.
- Una precedente operazione `mancata` non determina la posizione della nave e non può quindi costituire il contesto dal quale derivare il porto di un'operazione successiva.
- Le operazioni `mancate` non aprono, modificano o chiudono viaggi, visite e ormeggi e non influenzano l'attribuzione temporale delle prestazioni.
- Rimane applicabile anche alle operazioni mancate il vincolo che impedisce due operazioni nave della stessa nave nello stesso minuto.

##### Effetti delle variazioni sulla sequenza operativa

- Alle operazioni nave si applicano le regole comuni di modifica, eliminazione e consuntivazione definite per tutte le prestazioni.
- Poiché le operazioni nave con stato `prevista` o `effettuata` determinano la struttura di viaggi, visite e ormeggi, ogni variazione strutturale richiede inoltre la simulazione e la validazione preventiva dell'intera sequenza operativa risultante.
- Sono strutturali le variazioni relative a nave, tipo di operazione, stato, data e ora, date e orari di partenza o arrivo di uno spostamento, porto di destinazione e banchina di destinazione.
- Il passaggio di un'operazione da `mancata` a `prevista` o `effettuata` applica i relativi effetti operativi; il passaggio da `prevista` o `effettuata` a `mancata` li rimuove.
- Se i dati effettivi differiscono da quelli previsti, la sequenza viene ricostruita utilizzando i dati effettivi.
- Quando la sequenza risultante è valida, il sistema aggiorna i viaggi, le visite e gli ormeggi coinvolti e riattribuisce le altre prestazioni interessate.
- La variazione viene impedita se rende incompatibile un'operazione successiva, produce una coincidenza temporale vietata, lascia una prestazione senza collocazione valida oppure modifica dati o risultati di una prestazione o componente economica consolidata dall'emissione di una fattura.
- Se la validazione fallisce, nessuna modifica viene applicata e il sistema indica le operazioni o le prestazioni che causano il conflitto.
- La modifica della sola banchina aggiorna l'informazione associata all'ormeggio, ma non unisce né elimina gli ormeggi generati dalle operazioni.

##### Inserimento retroattivo

- È possibile inserire un'operazione nave tra operazioni già registrate; la sua posizione è determinata dalla data e dall'ora.
- Il salvataggio è consentito soltanto se l'intera sequenza risultante rispetta le regole operative e temporali definite.
- L'inserimento determina il ricalcolo controllato di viaggi, visite, ormeggi e attribuzioni delle prestazioni interessate.
- L'inserimento è impedito se il ricalcolo modificherebbe dati consolidati dalla fatturazione.
- Come evoluzione futura potrà essere prevista una modalità di modifica multipla in bozza, nella quale inserire, modificare o eliminare più operazioni prima della conferma.
- In tale modalità lo stato può essere temporaneamente incoerente soltanto nella bozza; il salvataggio finale deve essere atomico ed è consentito esclusivamente quando la sequenza completa è valida e non altera dati consolidati.

##### Persistenza e aggiornamento dei dati derivati

- Le visite, gli ormeggi, le attribuzioni delle prestazioni e gli altri dati derivati vengono persistiti e non sono ricostruiti a ogni consultazione.
- La modifica dello stato, della data o dell'ora, l'eliminazione o l'inserimento retroattivo di un'operazione nave determina il ricalcolo controllato dei dati derivati interessati.
- Prima di applicare la variazione, il sistema deve verificare gli effetti su visite, ormeggi, prestazioni e attività collegate.
- Se la variazione renderebbe necessario ricalcolare o riattribuire un'attività o una componente economica consolidata dall'emissione di una fattura, deve essere impedita.

#### Prestazioni

##### Categorie e dati comuni

- Le prestazioni comprendono operazioni nave, prestazioni a catalogo e prestazioni libere.
- La categoria assegnata a una prestazione è immutabile dopo la creazione: una prestazione a catalogo non può essere trasformata in una prestazione libera e viceversa. Quando la sostituzione è necessaria, la prestazione deve essere eliminata e registrata nuovamente nella categoria corretta, purché l'eliminazione sia consentita.
- Ogni prestazione indica il tipo, la data e l'ora, lo stato di esecuzione e può contenere note facoltative.
- Il campo delle note è previsto senza distinzioni per tutti e tre i tipi di prestazione:
  - operazione nave;
  - prestazione a catalogo;
  - prestazione libera.
- Lo stato può essere `prevista`, `effettuata` o `mancata`. La data e l'ora rappresentano rispettivamente l'istante pianificato, quello effettivo o quello nel quale l'attività avrebbe dovuto svolgersi.
- Le note sono associate alla singola prestazione, non incidono sulla tariffazione né sugli effetti operativi e rimangono modificabili in qualsiasi momento, anche dopo la fatturazione.
- Le prestazioni a catalogo fanno riferimento a un **TipoPrestazione** configurabile. Il catalogo iniziale comprende il **rinforzo ormeggio**.
- Ogni tipo di prestazione definisce una descrizione e una sequenza temporale di pesi numerici strettamente maggiori di zero.
- Le prestazioni libere indicano direttamente descrizione e importo e non dipendono da catalogo, tariffa, scaglioni o peso.

##### Tipi di prestazione e versioni del peso

- Le operazioni nave costituiscono tre tipi fissi e non configurabili:
  - `entrata`;
  - `uscita`;
  - `spostamento`.
- I tipi delle operazioni nave non appartengono al catalogo e non possono essere aggiunti, rinominati, disattivati o eliminati.
- Ciascuno dei tre tipi fissi possiede una propria sequenza temporale di pesi.
- Per uno spostamento interno allo stesso porto viene applicato il peso di `spostamento` valido alla data e all'ora di partenza.
- Uno spostamento tra porti utilizza:
  - il peso di `uscita` valido alla data e all'ora di partenza per la componente economica relativa al porto di origine;
  - il peso di `entrata` valido alla data e all'ora di arrivo per la componente economica relativa al porto di destinazione.
- Le prestazioni a catalogo fanno riferimento a tipi configurabili. Ogni tipo configurabile possiede:
  - un'identità tecnica stabile;
  - una descrizione corrente;
  - un unico stato corrente, `attivo` o `disattivato`;
  - una propria sequenza temporale di pesi.
- Il catalogo iniziale dei tipi configurabili comprende esclusivamente il `rinforzo ormeggio`.
- La descrizione del tipo configurabile non è storicizzata. Nei resoconti viene utilizzata la descrizione corrente, mentre le fatture emesse conservano la descrizione consolidata nel documento al momento dell'emissione.
- La disattivazione nasconde il tipo da tutti i menu destinati alla selezione per nuove prestazioni, ma conserva il tipo nelle prestazioni già registrate e nelle relative consultazioni.
- Una prestazione esistente può mantenere il riferimento a un tipo successivamente disattivato. Se il tipo viene sostituito, il nuovo tipo deve essere attivo.
- La riattivazione rende il tipo nuovamente selezionabile senza modificare le prestazioni esistenti.
- Un tipo configurabile può essere eliminato fisicamente soltanto se non è mai stato utilizzato da alcuna prestazione.
- Non possono esistere due tipi configurabili con la stessa descrizione, ignorando gli spazi iniziali e finali e le differenze tra lettere maiuscole e minuscole.
- Le denominazioni `entrata`, `uscita` e `spostamento` sono riservate e non possono essere utilizzate come descrizione di un tipo configurabile, applicando lo stesso criterio di confronto.
- Il peso deve essere numerico e strettamente maggiore di zero. Il valore iniziale predefinito è `1`.
- La prima versione del peso non possiede decorrenza ed è applicabile senza limite temporale inferiore fino alla prima variazione.
- Ogni versione successiva del peso indica una data e un'ora di decorrenza e sostituisce la versione precedente da tale istante.
- Due versioni del peso appartenenti allo stesso tipo non possono condividere la medesima decorrenza.
- Gli intervalli hanno inizio incluso e fine esclusa: l'inserimento di una versione rende quella precedente applicabile fino alla nuova decorrenza esclusa e quella nuova applicabile dalla propria decorrenza inclusa fino alla successiva.
- Per ogni istante esiste un solo peso applicabile, senza sovrapposizioni o intervalli privi di valore.
- Alla prestazione o alla componente economica dell'operazione nave viene applicato il peso valido alla relativa data e ora di tariffazione.
- Possono essere inserite versioni del peso con decorrenza passata, intermedia, corrente o futura.
- Prima di inserire, modificare o eliminare una versione, il sistema individua e mostra:
  - l'intervallo temporale interessato;
  - le prestazioni e le componenti economiche che verrebbero ricalcolate;
  - gli eventuali elementi consolidati che impediscono l'operazione.
- Le prestazioni non fatturate e quelle appartenenti esclusivamente a fatture nello stato `in immissione` vengono ricalcolate utilizzando la nuova sequenza temporale dei pesi; vengono aggiornati anche i relativi totali di fattura.
- Una variazione retroattiva o futura è consentita soltanto se non cambia il peso, l'importo o qualsiasi altro risultato consolidato di una prestazione appartenente a una fattura nello stato `emessa`, `parzialmente saldata` o `saldata`.
- La sola presenza nell'intervallo interessato di una prestazione consolidata non impedisce la variazione quando il peso e tutti i risultati già consolidati rimangono invariati.
- Controllo, variazione della sequenza temporale, ricalcoli e aggiornamento delle fatture `in immissione` avvengono atomicamente. Se anche un solo elemento consolidato verrebbe modificato, nessuna variazione viene applicata.
- Le prestazioni libere non possiedono un tipo di catalogo né un peso e continuano a utilizzare l'importo inserito manualmente.

##### Gestione comune

- Le regole di stato, consuntivazione, modifica, eliminazione e fatturazione si applicano uniformemente alle operazioni nave, alle prestazioni a catalogo e alle prestazioni libere.
- Una prestazione `prevista` può essere consuntivata come `effettuata` oppure `mancata`.
- La consuntivazione deve essere effettuata esplicitamente dall'operatore: il trascorrere del tempo non modifica automaticamente lo stato della prestazione.
- Nel passaggio a `effettuata`, l'operatore conferma o corregge date, orari e dati effettivi.
- Nel passaggio a `mancata`, i dati temporali conservano il significato di date e orari nei quali l'attività era prevista; la prestazione rimane registrata e fatturabile secondo le regole economiche applicabili.
- Le prestazioni `mancate` non producono effetti sulla struttura di viaggi, visite e ormeggi.
- Gli importi calcolati automaticamente vengono rideterminati quando cambiano i dati dai quali dipendono; gli importi definiti manualmente rimangono invariati.
- Una prestazione può essere modificata nei dati consentiti, eliminata fisicamente o cambiare stato finché non è consolidata e purché la variazione non coinvolga altre attività consolidate; la categoria rimane comunque immutabile.
- Se la prestazione appartiene a una fattura nello stato `in immissione`, l'eliminazione rimuove l'associazione e ricalcola atomicamente composizione e totale della fattura.
- Prima di applicare la variazione, il sistema verifica tutti gli effetti operativi, di attribuzione e tariffari. Se la situazione risultante non è valida, nessuna modifica viene applicata e il sistema indica gli elementi in conflitto.
- Le note costituiscono l'unica eccezione: possono essere modificate in qualsiasi momento, anche dopo la fatturazione, senza produrre ricalcoli o variazioni operative.

##### Differenze per categoria

- Le operazioni nave con stato `prevista` o `effettuata` modificano la struttura di viaggi, visite e ormeggi; le regole aggiuntive di ricostruzione e validazione della sequenza sono definite nella relativa sezione.
- Le prestazioni a catalogo e le prestazioni libere non modificano tale struttura. Quando ne cambiano i dati temporali, il sistema ridetermina soltanto la relativa attribuzione operativa.
- La variazione di una prestazione a catalogo o libera viene impedita se il nuovo istante non appartiene a una visita e a un ormeggio validi oppure ricade nell'intervallo di uno spostamento.
- Per una prestazione a catalogo vengono ricalcolati gli importi determinati automaticamente in base al tipo di prestazione e alla tariffa applicabile.
- Per una prestazione libera, descrizione e importo rimangono dati inseriti manualmente e possono essere modificati finché la prestazione non appartiene a una fattura nello stato `emessa`, `parzialmente saldata` o `saldata`.

##### Attribuzione temporale

- Durante l'inserimento di una prestazione ordinaria viene selezionata la nave; visita e ormeggio sono determinati automaticamente in base alla data e all'ora.
- L'attribuzione utilizza visite e ormeggi costruiti indifferentemente da operazioni nave previste o effettuate.
- Una prestazione ordinaria può essere registrata soltanto all'interno dell'intervallo temporale di una visita: non può precedere l'entrata né essere successiva all'uscita.
- L'ormeggio può avere la banchina non specificata senza impedire l'attribuzione della prestazione.
- Una prestazione coincidente con il minuto di partenza di uno spostamento viene attribuita all'ormeggio di origine e alla relativa visita.
- Una prestazione coincidente con il minuto di arrivo viene attribuita al nuovo ormeggio e alla visita di destinazione; negli spostamenti interni al porto quest'ultima coincide con la visita già aperta.
- Nei minuti compresi strettamente tra partenza e arrivo la nave non appartiene ad alcun ormeggio e non è possibile registrare né assegnarle prestazioni a catalogo o libere.
- In caso di coincidenza con un'uscita, la prestazione viene attribuita all'ultimo ormeggio della visita.
- Una prestazione coincidente con un'entrata viene attribuita alla visita e al primo ormeggio aperti dall'entrata, che deve essere già stata registrata.
- Più prestazioni della stessa nave possono condividere lo stesso minuto.
- L'attribuzione viene persistita e aggiornata automaticamente quando cambiano operazioni nave, visite o ormeggi, purché non coinvolga attività consolidate dall'emissione di una fattura.

##### Fatturabilità secondo lo stato

- Una prestazione `prevista` non può essere inserita in fattura.
- Le prestazioni `effettuate` e `mancate` sono fatturabili; per quelle mancate si applicano le regole del piano tariffario.
- La fatturabilità dipende dallo stato ed è indipendente dal fatto che la data e l'ora della prestazione siano passate o future.
- In fase di fatturazione si applica l'avviso per le attività precedenti ancora `previste` definito nella sezione dedicata all'emissione della fattura.

#### Movimentazioni delle merci

##### Registrazione e attribuzione

- Una movimentazione merci rappresenta un carico o uno scarico registrato durante la permanenza della nave presso un ormeggio.
- Per ogni movimentazione vengono indicati:
  - nave;
  - data e ora;
  - tipo di operazione, distinguendo tra `carico` e `scarico`;
  - merce;
  - quantità;
  - eventuali note.
- La quantità deve essere strettamente maggiore di zero.
- Nella prima versione non viene gestita un'unità di misura esplicita: le quantità possono essere sommate o confrontate soltanto tra movimentazioni riferite alla stessa merce e non producono totali trasversali tra merci differenti.
- La visita e l'ormeggio vengono determinati automaticamente in base alla nave e alla data e all'ora indicate, applicando le stesse regole temporali previste per le prestazioni ordinarie.
- La movimentazione può essere registrata soltanto se, nell'istante indicato, esistono una visita e un ormeggio validi.
- L'istante può essere passato, corrente o futuro; la sua validità dipende esclusivamente dall'esistenza del contesto operativo applicabile.
- Dopo un'uscita non può essere registrata una movimentazione finché una nuova entrata non apre un altro viaggio. Durante uno spostamento non può essere registrata prima dell'arrivo che apre il nuovo ormeggio.
- Non può essere registrata nei minuti compresi strettamente tra la partenza e l'arrivo di uno spostamento.
- Una movimentazione coincidente con:
  - un'entrata appartiene alla nuova visita e al primo ormeggio;
  - la partenza di uno spostamento appartiene all'ormeggio di origine;
  - l'arrivo di uno spostamento appartiene al nuovo ormeggio e, per uno spostamento tra porti, alla nuova visita;
  - un'uscita appartiene all'ultimo ormeggio della visita.
- Le movimentazioni merci non assumono gli stati `prevista`, `effettuata` e `mancata`.
- Non modificano viaggi, visite o ormeggi e non producono effetti tariffari, economici o contabili.
- Possono essere incluse in una o più fatture compatibili come informazioni prive di importo; la stessa movimentazione può comparire una sola volta nella medesima fattura.
- Finché non sono consolidate, possono essere modificate o eliminate; se appartengono a una o più fatture `in immissione`, l'aggiornamento o l'eliminazione mantiene coerenti anche le relative sezioni informative.
- L'emissione della prima fattura che la include consolida tipo, merce, quantità, istante, attribuzione operativa e dati anagrafici riportati per la movimentazione; le altre associazioni, comprese quelle verso fatture ancora `in immissione`, rimangono valide.
- Una movimentazione consolidata non può essere modificata o eliminata e non può essere riattribuita indirettamente mediante una variazione delle operazioni nave o delle anagrafiche. Le note rimangono modificabili, mentre il documento emesso conserva il valore consolidato.
- Il ritiro consentito della fattura rimuove il consolidamento prodotto da quel documento; la movimentazione torna modificabile quando non rimane inclusa in alcuna fattura consolidata. La rimozione da una fattura `in immissione` elimina la sola associazione senza eliminare la movimentazione.
- Se una modifica alla sequenza delle operazioni nave ne cambia l'attribuzione temporale, la movimentazione viene riattribuita automaticamente.
- La modifica della sequenza viene impedita se lascerebbe la movimentazione senza una visita e un ormeggio validi oppure se cambierebbe l'attribuzione o i dati di una movimentazione consolidata.

#### Determinazione di cliente e agenzia

- Cliente e agenzia sono riferimenti indipendenti e possono essere assegnati contemporaneamente a ogni livello del modello.
- Cliente e agenzia vengono determinati separatamente, applicando per ciascuno il seguente ordine di priorità:
  1. valore specificato direttamente sulla prestazione;
  2. valore specificato sull'ormeggio;
  3. valore specificato sulla visita;
  4. valore specificato sul viaggio.
- È possibile specificare direttamente anche soltanto uno dei due riferimenti a un determinato livello; l'altro continua a essere determinato autonomamente secondo il proprio ordine di priorità.
- Il cliente e l'agenzia effettivamente determinati vengono memorizzati sulla prestazione.
- Finché la prestazione non appartiene a una fattura nello stato `emessa`, `parzialmente saldata` o `saldata`, i riferimenti memorizzati vengono ricalcolati quando una modifica rilevante interessa:
  - i dati o l'attribuzione della prestazione;
  - l'ormeggio, la visita o il viaggio associati;
  - il cliente o l'agenzia specificati su uno di tali livelli.
- Il ricalcolo rispetta sempre l'ordine di priorità: un riferimento specificato direttamente sulla prestazione non viene sostituito da una modifica a un livello superiore.
- Se la prestazione o un'altra prestazione coinvolta dal ricalcolo è consolidata dall'emissione di una fattura, la modifica che richiederebbe di rideterminarne cliente o agenzia viene impedita.
- Una prestazione può essere registrata anche se cliente o agenzia non sono ancora determinabili, ma può essere inserita in fattura soltanto quando entrambi sono presenti.
- Cliente e agenzia vengono selezionati esplicitamente sulla fattura e devono essere attivi nel momento della selezione o della sostituzione.
- Dopo la selezione, possono essere inserite soltanto prestazioni, operazioni o componenti economiche aventi la stessa coppia effettiva `cliente + agenzia` della fattura.
- La coppia selezionata sulla fattura non viene determinata né modificata automaticamente dalle attività associate.
- Finché la fattura è `in immissione`, cliente e agenzia possono essere sostituiti soltanto quando tutte le attività economiche e le movimentazioni informative già associate risultano compatibili con la nuova coppia; in caso contrario la sostituzione viene impedita e vengono indicati gli elementi incompatibili.
- Una variazione dei dati operativi o delle assegnazioni viene impedita quando renderebbe un'attività o una movimentazione incompatibile con la coppia selezionata su una fattura `in immissione`; la coppia della fattura non viene riallineata automaticamente.
- La rimozione dell'ultima attività economica non cancella cliente e agenzia e non richiede la rimozione delle movimentazioni informative compatibili già presenti; la fattura rimane una bozza non emettibile finché non viene aggiunta almeno una nuova attività economica compatibile.

### Regole tariffarie

#### Ciclo di vita delle tariffe

- Ogni tariffa appartiene obbligatoriamente a un solo porto.
- Il porto viene selezionato all'inizio della creazione della tariffa e non può essere modificato successivamente.
- Per definire una tariffa riferita a un porto differente deve essere creata una nuova tariffa.
- Ogni tariffa comprende:
  - il porto;
  - la data e l'ora di inizio validità;
  - una configurazione tariffaria per ogni tipologia di nave prevista dal sistema.
- Nella configurazione iniziale devono essere presenti almeno le sezioni relative a:
  - nave normale;
  - nave passeggeri;
  - nave ADM.
- La tariffa non può essere salvata se manca la configurazione relativa anche a una sola tipologia di nave prevista dal sistema.
- Per ogni tipologia di nave, la relativa configurazione comprende:
  - gli scaglioni ordinari;
  - l'ampiezza dello scaglione extra;
  - la tariffa extra.
- La stessa tipologia di nave non può comparire più di una volta all'interno della medesima tariffa.
- Le configurazioni delle diverse tipologie appartengono alla stessa tariffa e ne condividono porto, decorrenza e intervallo temporale di applicabilità.
- Ogni configurazione può possedere scaglioni, valori tariffari, ampiezza dello scaglione extra e tariffa extra differenti dalle altre tipologie.
- Ogni tariffa, compresa la prima relativa al porto, possiede obbligatoriamente una data e un'ora di inizio validità.
- Prima della decorrenza della prima tariffa di un porto non esiste alcuna tariffa applicabile.
- Una prestazione tariffata non può essere registrata se, alla relativa data e ora, non esiste per il porto una tariffa completa e applicabile.
- Possono essere inserite nuove tariffe con decorrenza passata, intermedia, corrente o futura.
- Per lo stesso porto, due tariffe non possono condividere la medesima data e ora di decorrenza.
- Le tariffe di ciascun porto sono ordinate cronologicamente in base alla decorrenza.
- L'inserimento di una tariffa ridefinisce automaticamente gli intervalli:
  - la tariffa precedente rimane applicabile fino alla nuova decorrenza esclusa;
  - la nuova tariffa è applicabile dalla propria decorrenza inclusa fino alla decorrenza esclusa dell'eventuale tariffa successiva;
  - in assenza di una tariffa successiva, rimane valida senza limite finale.
- Non viene memorizzata una data di fine validità.
- L'inserimento di una tariffa intermedia non modifica le decorrenze già presenti, ma restringe l'intervallo della tariffa precedente e determina quello della nuova tariffa.
- La nuova tariffa deve contenere le configurazioni di tutte le tipologie di nave, comprese quelle i cui valori non cambiano rispetto alla tariffa precedente.
- L'operatore può creare una nuova tariffa compilando da zero la struttura completa oppure copiando le configurazioni di una tariffa esistente, anche riferita a un porto differente.
- La copia costituisce soltanto una base iniziale modificabile: la nuova tariffa mantiene il porto selezionato per la creazione e il salvataggio produce un insieme completo e autonomo, privo di dipendenze dalla tariffa sorgente.
- Ogni configurazione deve contenere almeno uno scaglione ordinario.
- Gli scaglioni ordinari di ciascuna tipologia:
  - utilizzano limiti massimi interi non negativi;
  - sono ordinati per limite massimo crescente;
  - non possono avere limiti massimi duplicati;
  - possiedono valori tariffari non negativi.
- Per ciascuna tipologia, l'ampiezza dello scaglione extra deve essere un numero intero strettamente maggiore di zero e la tariffa extra deve essere un importo non negativo.
- Scaglioni ordinari, scaglione extra e tariffa extra non possiedono periodi di validità autonomi, ma condividono la validità della tariffa che li contiene.
- Per introdurre nuovi valori da un determinato istante senza modificare il periodo precedente deve essere inserita una nuova tariffa completa per il porto.
- Una tariffa esistente può essere modificata intervenendo su:
  - data e ora di decorrenza;
  - limiti e valori degli scaglioni di una o più tipologie;
  - ampiezza dello scaglione extra di una o più tipologie;
  - tariffa extra di una o più tipologie.
- La modifica di una configurazione interna costituisce una modifica dell'intera tariffa, pur producendo ricalcoli soltanto per le tipologie e gli intervalli effettivamente interessati.
- La modifica della decorrenza può cambiare gli intervalli della tariffa modificata e delle tariffe adiacenti dello stesso porto.
- Una modifica non può produrre decorrenze duplicate, violare l'ordinamento temporale, rendere incompleta la tariffa, lasciare senza tariffa un'attività che richiede un calcolo tariffario o rendere non validi gli scaglioni e i valori extra.
- Una tariffa può essere eliminata anche quando non è l'ultima della sequenza.
- L'eliminazione determina:
  - l'estensione della tariffa precedente fino alla decorrenza della tariffa successiva;
  - oppure, se viene eliminata la prima tariffa, l'assenza di una tariffa applicabile prima della nuova prima decorrenza.
- L'eliminazione viene bloccata se lascia un'attività non consolidata priva di una tariffa applicabile.
- Prima dell'inserimento, della modifica o dell'eliminazione, il sistema individua tutti gli elementi ai quali cambierebbero la tariffa, la configurazione per tipologia, lo scaglione o il risultato del calcolo, compresi gli elementi futuri già registrati.
- Prima della conferma vengono mostrati:
  - gli intervalli temporali interessati;
  - le tariffe i cui intervalli verranno ridefiniti;
  - le tipologie di nave interessate;
  - le prestazioni e le componenti economiche che verranno ricalcolate;
  - gli eventuali elementi consolidati che impediscono l'operazione.
- Le prestazioni non fatturate e quelle appartenenti esclusivamente a fatture nello stato `in immissione` vengono ricalcolate utilizzando la nuova sequenza tariffaria.
- I ricalcoli aggiornano:
  - la tariffa applicata;
  - la configurazione relativa alla tipologia della nave;
  - lo scaglione ordinario o extra;
  - il valore tariffario;
  - l'importo della prestazione;
  - i totali delle eventuali fatture nello stato `in immissione`.
- L'operazione è consentita in presenza di prestazioni appartenenti a fatture nello stato `emessa`, `parzialmente saldata` o `saldata` soltanto quando rimangono invariati la tariffa applicata, la configurazione della tipologia, lo scaglione, il valore tariffario, l'importo e ogni altro dato o risultato consolidato.
- La sola presenza di elementi consolidati nell'intervallo interessato non impedisce l'operazione quando tutti i dati e i risultati già consolidati rimangono identici.
- Se anche un solo elemento consolidato verrebbe modificato, l'intera operazione viene bloccata.
- Controlli, variazione della sequenza tariffaria, ridefinizione degli intervalli, ricalcoli e aggiornamento delle fatture `in immissione` avvengono atomicamente.
- Le tariffe non possiedono uno stato di attivazione o disattivazione: la loro applicabilità dipende esclusivamente dal porto e dal relativo intervallo temporale.
- L'eventuale introduzione di una nuova tipologia di nave richiede che le tariffe applicabili alle relative attività vengano prima completate con la corrispondente configurazione. La nuova tipologia non può essere utilizzata per attività tariffate finché non esiste, per il porto e la data interessati, una tariffa che la comprenda.

#### Individuazione della tariffa e dello scaglione

- La dimensione e il tipo della nave sono dati anagrafici.
- La dimensione è un numero intero non negativo e, nella prima versione del sistema, non prevede un'unità di misura esplicita.
- Il significato della dimensione può dipendere dalla tipologia di nave; di conseguenza, dimensione della nave, limiti degli scaglioni e ampiezza dello scaglione extra devono essere interpretati in modo coerente nell'ambito della stessa tipologia.
- Il porto e la data e l'ora della prestazione individuano la tariffa valida; la tipologia della nave individua successivamente la configurazione interna da utilizzare.
- Il porto rilevante è quello della visita e dell'ormeggio ai quali la prestazione è attribuita. Per un'entrata si usa il porto di destinazione e per un'uscita il porto della visita corrente. Uno spostamento interno è tariffato nel porto corrente usando la data di partenza; uno spostamento tra porti comprende invece una componente di uscita tariffata nel porto di partenza alla data di partenza e una componente di entrata tariffata nel porto di destinazione alla data di arrivo.
- La tariffa applicabile è quella con la data di inizio più recente che non sia successiva alla data della prestazione.
- Individuata la tariffa, la tipologia della nave seleziona una sola configurazione interna.
- La dimensione della nave individua il primo scaglione della configurazione il cui limite massimo è maggiore o uguale a essa.
- Durante il calcolo si applica quindi la sequenza: `porto e data/ora → tariffa → tipologia di nave → configurazione → dimensione → scaglione`.

#### Scaglioni extra

- Ogni configurazione relativa a una tipologia di nave definisce autonomamente l'ampiezza dello **scaglione extra** e la **tariffa extra**.
- Se la dimensione della nave supera il limite massimo ordinario, il valore di base è quello dell'ultimo scaglione ordinario.
- Il numero di scaglioni extra è calcolato dividendo l'eccedenza per l'ampiezza dello scaglione extra e arrotondando per eccesso.
- Ogni scaglione extra iniziato viene conteggiato per intero.
- Il valore tariffario è dato dal valore dell'ultimo scaglione più il prodotto tra numero di scaglioni extra e tariffa extra.

La formula applicata oltre l'ultimo scaglione è:

\[
\text{Valore tariffario} =
\text{Valore ultimo scaglione}
+
\left\lceil
\frac{\text{Dimensione nave} - \text{Limite massimo ordinario}}
{\text{Ampiezza scaglione extra}}
\right\rceil
\times \text{Tariffa extra}
\]

Ad esempio, con ultimo limite ordinario pari a `1.600`, dimensione della nave pari a `2.100`, scaglione extra pari a `200` e tariffa extra pari a `500 €`, vengono conteggiati tre scaglioni extra e il valore tariffario aumenta di `1.500 €`.

#### Calcolo dell'importo

- Il valore dello scaglione ordinario o extra viene moltiplicato per il peso del tipo di prestazione o dell'operazione nave valido alla relativa data e ora di tariffazione.
- L'importo di una prestazione tariffata è quindi `valore tariffario × peso`.
- Le prestazioni libere utilizzano invece l'importo indicato direttamente sulla singola prestazione.
- Tariffe e pesi non memorizzano preventivamente l'importo delle singole attività. L'importo viene calcolato e memorizzato sulla prestazione o sulla componente economica soltanto al momento della relativa creazione.
- Finché la prestazione o la singola componente economica non appartiene a una fattura nello stato `emessa`, `parzialmente saldata` o `saldata`, il relativo importo viene ricalcolato automaticamente quando cambia un dato rilevante della prestazione, della nave, del tipo di prestazione, dell'operazione nave, del peso o della tariffa.

#### Consolidamento dei dati di calcolo

- L'inserimento in una fattura nello stato `in immissione` non consolida la prestazione o la componente economica né i relativi dati di calcolo; l'emissione consolida invece gli elementi selezionati, le versioni e i risultati utilizzati. Per uno spostamento tra porti il consolidamento riguarda soltanto la componente inclusa nella fattura.
- Il vincolo comprende, tra gli altri, porto, tipo e dimensione della nave, data e ora, tipo e peso della prestazione, tariffa, scaglioni ordinari, scaglione extra e tariffa extra.
- La modifica della decorrenza di una tariffa è consentita quando non cambia la tariffa associata ad alcuna attività consolidata, anche se modifica i periodi di validità delle tariffe adiacenti.
- Se una modifica interessa esclusivamente prestazioni non consolidate, comprese quelle inserite in fatture nello stato `in immissione`, queste vengono ricalcolate automaticamente e i relativi totali di fattura vengono aggiornati.
- Quando un valore deve cambiare senza alterare il passato, la variazione viene introdotta tramite una nuova versione con specifica decorrenza temporale.
- Le modifiche che non incidono sul calcolo o sulla ricostruzione delle attività consolidate possono rimanere consentite.
- Le note non fanno parte dei dati strutturali ed economici consolidati e possono essere aggiornate anche dopo la fatturazione.

### Regole di fatturazione

- Una prestazione, un'operazione nave a componente singola o una componente economica di uno spostamento tra porti può essere inserita in fattura soltanto se l'attività di origine si trova nello stato `effettuata` o `mancata`.
- La prestazione può essere fatturata anche quando il viaggio, la visita o l'ormeggio associati sono ancora aperti.
- La fatturabilità è indipendente dalla data e dall'ora della prestazione: anche una prestazione futura è fatturabile se si trova nello stato `effettuata` o `mancata`.
- Finché la fattura è nello stato `in immissione`, i dati strutturali ed economici delle attività associate possono essere modificati e gli importi e i totali vengono ricalcolati; le note restano sempre modificabili.
- L'emissione rende immutabili i dati strutturali delle prestazioni o componenti incluse, i relativi importi e la loro attribuzione a visita e ormeggio.
- Non sono consentite modifiche a operazioni nave o dati collegati quando cambierebbero visite, ormeggi, attribuzioni o importi appartenenti a fatture nello stato `emessa`, `parzialmente saldata` o `saldata`. Per uno spostamento tra porti il vincolo si applica ai dati della componente consolidata e ai dati comuni che ne influenzano i risultati, senza estendersi automaticamente ai dati esclusivi dell'altra componente.
- Le operazioni nave registrate successivamente possono completare un viaggio aperto purché non modifichino l'attribuzione delle prestazioni consolidate dall'emissione di una fattura.
- Prestazioni aggiunte successivamente allo stesso viaggio possono essere incluse in fatture differenti.
- Prima dell'emissione, per ogni attività selezionata il sistema verifica se nello stesso viaggio esistono attività temporalmente precedenti ancora nello stato `prevista`.
- Se presenti, mostra una notifica informativa con almeno viaggio, tipo di attività, data e ora e porto.
- La notifica non modifica gli stati e consente di interrompere l'emissione oppure di procedere dopo una conferma esplicita; non costituisce un blocco definitivo alla fatturazione.

#### Composizione e sconti della fattura

- L'importo originario di ogni prestazione viene conservato e non viene modificato dagli sconti applicati in fattura.
- Su ciascuna prestazione inserita in fattura possono essere applicati contemporaneamente:
  - uno sconto assoluto;
  - uno sconto percentuale.
- Lo sconto assoluto viene applicato per primo; lo sconto percentuale viene calcolato sull'importo residuo dopo lo sconto assoluto.
- Indicando con `I` l'importo originario, con `S` lo sconto assoluto e con `P` lo sconto percentuale, l'importo risultante della prestazione è:

  \[
  (I - S) \times \left(1 - \frac{P}{100}\right)
  \]

- Sulla fattura possono essere applicati contemporaneamente uno sconto assoluto e uno sconto percentuale complessivi, dopo aver calcolato gli importi risultanti delle singole prestazioni.
- Anche a livello di fattura, lo sconto assoluto viene applicato per primo e quello percentuale viene calcolato sul residuo.
- Gli sconti sulle singole prestazioni e gli sconti complessivi della fattura possono essere applicati contemporaneamente.
- Lo sconto assoluto non può superare l'importo al quale viene applicato e lo sconto percentuale deve essere compreso tra `0` e `100`; nessuno sconto può produrre un importo negativo.
- Se una modifica della composizione o dei calcoli riduce la base al di sotto di uno sconto assoluto già configurato, la modifica che ha originato l'incompatibilità viene impedita e il sistema richiede di correggere lo sconto; lo sconto non viene ridotto automaticamente.
- Per ogni riga di fattura vengono conservati l'importo originario, gli sconti applicati e l'importo risultante.
- Finché la fattura è nello stato `in immissione`, gli sconti possono essere modificati e i totali vengono ricalcolati.
- Un totale pari a zero è valido e non impedisce l'emissione, dopo la presentazione delle eventuali notifiche informative previste dalle regole dinamiche.
- Il passaggio allo stato `emessa` consolida gli importi originari, gli sconti applicati e gli importi risultanti.

#### Precisione e arrotondamento degli importi

- Tutti gli importi monetari vengono calcolati mediante valori decimali esatti, senza utilizzare rappresentazioni in virgola mobile.
- Ogni passaggio che produce un importo monetario viene arrotondato a due cifre decimali e il passaggio successivo utilizza il risultato già arrotondato.
- Le regole economiche appartenenti alla stessa priorità vengono prima combinate secondo le regole definite e costituiscono un unico passaggio di calcolo; il risultato del gruppo viene quindi arrotondato prima di essere utilizzato dalla priorità successiva.
- L'importo definitivo di ciascuna riga deriva dall'applicazione ordinata dei passaggi già arrotondati relativi alla prestazione.
- Il totale delle prestazioni è ottenuto sommando gli importi definitivi già arrotondati delle singole righe.
- Anche ogni passaggio economico o fiscale applicato all'intera fattura viene arrotondato a due cifre decimali prima del passaggio successivo.
- Quando un importo deve essere ridotto a due cifre decimali, viene utilizzato l'arrotondamento commerciale:
  - una terza cifra decimale pari o superiore a `5` determina l'arrotondamento del centesimo per eccesso;
  - una terza cifra decimale inferiore a `5` determina l'arrotondamento per difetto.
- Gli importi definitivi e gli arrotondamenti vengono consolidati con l'emissione della fattura.

#### Valuta degli importi

- Nella prima versione il sistema utilizza esclusivamente l'euro (`EUR`) come valuta contabile.
- Tutti gli importi sono espressi in euro, compresi:
  - tariffe e prestazioni;
  - fatture;
  - movimenti contabili;
  - saldi iniziali;
  - saldi dei conti finanziari e delle voci contabili;
  - costi dei giroconti.
- La valuta non è selezionabile dall'operatore per la singola registrazione.
- Nella prima versione non sono gestiti:
  - conti finanziari o operazioni in valuta estera;
  - tassi di cambio;
  - conversioni monetarie;
  - differenze derivanti dal cambio.
- L'eventuale supporto futuro per più valute sarà progettato separatamente, introducendo le relative regole di conversione e contabilizzazione.

#### Regole economiche e fiscali

- Ogni regola economica o fiscale indica esplicitamente:
  - il proprio ambito di applicazione;
  - la propria fase di applicazione, `prima degli sconti` oppure `dopo gli sconti`.
- Gli ambiti di applicazione previsti sono:
  - `singola prestazione`, quando dipende dalle caratteristiche dell'attività, come l'orario nel quale si svolge o la ricorrenza di una festività;
  - `intera fattura`, quando dipende dalle caratteristiche complessive del documento, come l'applicazione della marca da bollo.
- Per ciascuna prestazione, il sistema applica nell'ordine:
  1. la tariffa e il peso della prestazione, con arrotondamento del risultato;
  2. ciascun gruppo di priorità delle regole configurate `prima degli sconti`, con arrotondamento dopo ogni gruppo;
  3. lo sconto assoluto della prestazione, con arrotondamento del residuo;
  4. lo sconto percentuale della prestazione, calcolato sul residuo, con arrotondamento del risultato;
  5. ciascun gruppo di priorità delle regole configurate `dopo gli sconti`, con arrotondamento dopo ogni gruppo.
- Dopo aver sommato gli importi definitivi delle righe, il sistema applica alla fattura nell'ordine:
  1. ciascun gruppo di priorità delle regole configurate `prima degli sconti`, con arrotondamento dopo ogni gruppo;
  2. lo sconto assoluto complessivo, con arrotondamento del residuo;
  3. lo sconto percentuale complessivo, calcolato sul residuo, con arrotondamento del risultato;
  4. ciascun gruppo di priorità delle regole configurate `dopo gli sconti`, con arrotondamento dopo ogni gruppo.
- Le regole configurate `dopo gli sconti` non modificano la base sulla quale gli sconti sono stati calcolati.

##### Configurazione e priorità delle regole economiche

- La versione temporalmente applicabile di ogni regola economica definisce:
  - le condizioni che ne determinano l'applicabilità;
  - se produce una maggiorazione oppure una riduzione;
  - se utilizza un valore percentuale oppure un importo assoluto;
  - l'ambito e la fase di applicazione;
  - una priorità di applicazione.
- Le condizioni di applicazione possono dipendere, tra gli altri elementi:
  - dallo stato `effettuata` o `mancata` della prestazione;
  - dalla data e dall'ora della prestazione;
  - dall'appartenenza dell'ora locale della prestazione a un intervallo configurato direttamente nella regola;
  - dallo svolgimento in un giorno festivo;
  - dal tipo di prestazione;
  - dalla tariffa applicabile;
  - dalle caratteristiche complessive della fattura.
- Non esiste una configurazione autonoma e globale delle fasce notturne: gli intervalli orari sono condizioni delle regole dinamiche e producono effetti economici soltanto attraverso la conseguenza della regola che li contiene.
- Ad esempio, una maggiorazione notturna viene rappresentata da una regola la cui condizione richiede che l'ora della prestazione sia compresa tra `X` e `Y` e la cui conseguenza aumenta l'importo della percentuale `Z`.
- Il calendario delle festività rimane configurabile e viene utilizzato dalle condizioni delle regole che dipendono da un giorno festivo.
- Il trattamento economico delle prestazioni `mancate` non è fisso, ma viene determinato mediante regole configurabili.
- Le regole vengono elaborate in ordine crescente di priorità, separatamente per:
  - ambito di applicazione: prestazione o fattura;
  - fase di applicazione: prima o dopo gli sconti.
- La priorità è obbligatoria ed è espressa mediante un numero intero positivo; sono ammessi intervalli non utilizzati tra due priorità successive.
- Più regole possono condividere la stessa priorità soltanto se utilizzano lo stesso tipo di valore:
  - percentuale;
  - importo assoluto.
- Regole percentuali e regole a importo assoluto non possono condividere la stessa priorità, poiché il loro ordine di applicazione influenzerebbe il risultato.
- Per le regole percentuali aventi la stessa priorità:
  - le percentuali vengono sommate algebricamente;
  - le maggiorazioni hanno segno positivo e le riduzioni segno negativo;
  - la percentuale complessiva viene applicata una sola volta all'importo corrente.
- Per le regole a importo assoluto aventi la stessa priorità:
  - gli importi vengono sommati algebricamente;
  - le maggiorazioni hanno segno positivo e le riduzioni segno negativo;
  - l'importo complessivo viene applicato una sola volta all'importo corrente.
- Il risultato prodotto dal gruppo di regole appartenenti a una priorità viene arrotondato a due cifre decimali e costituisce la base di calcolo per la priorità successiva.
- Nessuna regola o combinazione di riduzioni può produrre un importo negativo: quando la riduzione complessiva eccede l'importo corrente, viene limitata a tale importo e il risultato è pari a zero.

##### Storicizzazione delle regole economiche

- Ogni regola economica possiede:
  - un'identità tecnica stabile;
  - una versione iniziale;
  - eventuali versioni successive con decorrenza temporale.
- La versione iniziale:
  - contiene la configurazione originaria della regola;
  - non possiede data e ora di decorrenza;
  - è valida senza limite temporale inferiore;
  - rimane applicabile fino alla decorrenza dell'eventuale prima versione successiva.
- Ogni versione successiva:
  - possiede obbligatoriamente una decorrenza, espressa mediante data e ora per le regole sulla singola prestazione e mediante data per le regole sull'intera fattura;
  - sostituisce la versione precedente dalla propria decorrenza;
  - rimane valida fino alla decorrenza dell'eventuale versione successiva;
  - in assenza di una versione successiva, rimane valida senza limite temporale finale.
- La data di fine validità non viene memorizzata direttamente, ma viene determinata dalla decorrenza della versione successiva.
- Per ogni istante deve esistere una sola versione applicabile della stessa regola, senza sovrapposizioni o intervalli privi di configurazione.
- Due versioni successive della stessa regola non possono condividere la medesima decorrenza, secondo la precisione temporale prevista dal relativo ambito.
- Possono essere inserite versioni con decorrenza passata, intermedia, corrente o futura.
- L'inserimento di una versione ridefinisce automaticamente gli intervalli:
  - la versione precedente rimane applicabile fino alla nuova decorrenza esclusa;
  - la nuova versione è applicabile dalla propria decorrenza inclusa fino alla decorrenza esclusa dell'eventuale versione successiva.
- Una versione futura viene applicata anche agli elementi futuri già registrati che ricadono nel relativo intervallo.

Ogni versione contiene tutti i dati che determinano il comportamento economico della regola. Una nuova versione può modificare una o più condizioni, la conseguenza economica prodotta oppure entrambe.

- Ogni regola possiede un ambito immutabile, `singola prestazione` oppure `intera fattura`, necessario a determinare senza ambiguità la data di riferimento utilizzata per selezionare la versione applicabile.
- L'ambito appartiene all'identità stabile della regola e non alle singole versioni.
- Per cambiare l'ambito deve essere creata una nuova regola, conservando quella precedente per i calcoli storici.

- Le condizioni storicizzate possono dipendere, tra gli altri elementi:
  - dallo stato `effettuata` o `mancata`;
  - dalla data e dall'ora della prestazione;
  - dall'appartenenza dell'ora locale della prestazione a uno o più intervalli configurati nella regola;
  - dal giorno festivo;
  - dal tipo di prestazione o di operazione nave;
  - dal porto;
  - dalla tipologia o dalla dimensione della nave;
  - dalla tariffa applicata;
  - dalle caratteristiche complessive della fattura.
- La conseguenza economica storicizzata comprende:
  - maggiorazione oppure riduzione;
  - valore percentuale oppure importo assoluto;
  - valore da applicare;
  - fase `prima degli sconti` oppure `dopo gli sconti`;
  - priorità.
- Anche lo stato `attiva` o `disattivata` appartiene alla versione e può quindi cambiare nel tempo insieme alle condizioni e alla conseguenza.
- Una versione nello stato `disattivata` conserva la continuità temporale della regola, ma non produce alcun effetto economico nel proprio intervallo.
- Per rendere applicabile una nuova regola soltanto da una data futura è possibile crearla con la versione iniziale nello stato `disattivata` e inserire una versione futura nello stato `attiva`.
- La disattivazione da un determinato istante viene rappresentata mediante una nuova versione nello stato `disattivata`.
- La riattivazione viene rappresentata mediante una successiva versione nello stato `attiva`.

##### Date di riferimento delle regole economiche

- Per le regole con ambito `singola prestazione`, la versione applicabile viene determinata utilizzando la data e l'ora economica dell'attività, con precisione al minuto.
- La versione che inizia esattamente nel minuto dell'attività è considerata applicabile.
- Per una prestazione a catalogo viene utilizzata la data e l'ora della prestazione.
- Per una prestazione libera viene utilizzata la data e l'ora della prestazione, anche se il relativo importo base è inserito manualmente.
- Per un'operazione di entrata viene utilizzata la data e l'ora dell'entrata.
- Per un'operazione di uscita viene utilizzata la data e l'ora dell'uscita.
- Per uno spostamento interno allo stesso porto viene utilizzata la data e l'ora di partenza, che rappresenta anche l'istante di tariffazione della relativa componente economica.
- Per uno spostamento tra porti:
  - la componente economica di uscita utilizza la data e l'ora di partenza;
  - la componente economica di entrata utilizza la data e l'ora di arrivo.
- Le due componenti di uno spostamento tra porti possono utilizzare versioni differenti della stessa regola quando tra partenza e arrivo ricade una nuova decorrenza.
- Le condizioni relative a stato della prestazione, porto, tipologia e dimensione della nave, tariffa, tipo di attività, intervalli orari e festività vengono valutate utilizzando i dati applicabili allo stesso istante economico.
- Per un intervallo orario che attraversa la mezzanotte viene considerata la data e l'ora effettiva dell'attività nel fuso del porto applicabile.
- La condizione di festività utilizza il giorno di calendario nel quale ricade l'istante economico dell'attività.
- Per una regola con ambito `intera fattura`, compresa la marca da bollo, la versione applicabile viene determinata utilizzando la data della fattura.
- La data e l'ora effettive di emissione non partecipano alla selezione della versione.
- Le decorrenze delle versioni delle regole riferite all'intera fattura hanno precisione giornaliera.
- Una versione con decorrenza in una determinata data si applica a tutte le fatture aventi quella data o una data successiva, fino alla decorrenza della versione seguente.
- Una fattura retrodatata utilizza le versioni valide alla data indicata nel documento, anche quando viene creata o emessa successivamente.
- Una fattura con data futura utilizza le versioni valide in tale data, anche quando viene preparata o emessa anticipatamente.
- Le condizioni dipendenti dalle caratteristiche complessive del documento vengono valutate dopo avere determinato la versione applicabile della regola, la composizione della fattura e gli importi risultanti dai passaggi precedenti.
- Finché una fattura si trova nello stato `in immissione`, la modifica della data ridetermina tutte le versioni delle regole con ambito `intera fattura` e ricalcola condizioni, maggiorazioni, riduzioni, priorità, arrotondamenti, bollo e totale finale.
- La stessa regola si applica a una fattura ritirata e riportata nello stato `in immissione`, quando il ritiro e la modifica della data sono consentiti dalle relative regole.
- La data di una fattura non può essere modificata mentre questa si trova nello stato `emessa`, `parzialmente saldata` o `saldata`.
- Una modifica alla configurazione delle regole non aggiorna mai automaticamente la data di una fattura.
- Al momento dell'emissione vengono consolidati la data di riferimento utilizzata, l'identità e la versione di ciascuna regola applicata, le condizioni valutate, le conseguenze applicate, gli importi e gli arrotondamenti derivati.
- Ogni variazione della configurazione segue i controlli, i ricalcoli e i vincoli di consolidamento definiti nella sezione dedicata al ricalcolo delle regole economiche.

##### Coerenza temporale delle priorità

- I vincoli relativi alle priorità devono essere rispettati in ogni intervallo temporale.
- Per ciascuna combinazione di ambito, fase e priorità, tutte le versioni di regole contemporaneamente attive devono utilizzare lo stesso tipo di valore:
  - percentuale;
  - importo assoluto.
- Una nuova versione non può creare un intervallo nel quale regole percentuali e regole a importo assoluto condividano la stessa combinazione di ambito, fase e priorità.
- L'inserimento, la modifica o l'eliminazione di una versione richiede la validazione congiunta di tutte le altre regole applicabili negli intervalli interessati.
- Le regole applicabili aventi la stessa priorità vengono aggregate algebricamente e applicate come un unico passaggio di calcolo.
- Per un gruppo percentuale, le percentuali vengono sommate algebricamente; una riduzione complessiva pari o superiore al `100%` azzera l'importo corrente senza renderlo negativo.
- Per un gruppo a importo assoluto, gli importi vengono sommati algebricamente; una riduzione complessiva pari o superiore all'importo corrente viene limitata a tale importo e lo azzera.
- Il risultato di ciascun gruppo viene arrotondato a due cifre decimali prima di diventare la base del gruppo di priorità successivo.
- La fase, la priorità, il tipo di valore, la direzione della variazione e il valore applicato appartengono alla versione della regola e possono cambiare nel tempo; l'ambito rimane invece immutabile per l'intera identità della regola.
- Una modifica temporale può spostare una regola tra fasi o priorità oppure cambiarne il tipo di valore soltanto se la configurazione rimane coerente in tutti gli intervalli interessati e non altera direttamente o indirettamente alcuna fattura già emessa.

##### Notifica delle riduzioni che azzerano un importo

- Quando una regola o un gruppo di regole produce una riduzione che porta a zero l'importo corrente di una prestazione o dell'intera fattura, il sistema deve mostrare una notifica informativa prima di completarne l'applicazione.
- La notifica indica almeno:
  - la prestazione o la fattura interessata;
  - l'importo corrente prima della riduzione;
  - la fase e la priorità del gruppo applicato;
  - l'identità e la versione delle regole che hanno determinato l'azzeramento.
- L'azzeramento costituisce un risultato valido del calcolo e viene applicato integralmente dopo la notifica.
- La notifica non costituisce un errore, non richiede una deroga e non consente di escludere, rimuovere, disattivare o modificare per il singolo elemento lo sconto o la riduzione prodotti dalla regola.
- L'operatore può interrompere l'operazione complessiva prima del suo completamento, quando il relativo processo lo consente, ma non può confermare il calcolo eliminando soltanto la regola che ha prodotto l'azzeramento.
- Lo stesso comportamento si applica sia durante l'inserimento o la modifica di prestazioni e fatture in immissione, sia durante i ricalcoli automatici degli elementi non consolidati.
- Prima di confermare una modifica alla configurazione delle regole, l'anteprima del ricalcolo deve evidenziare tutti gli elementi non consolidati il cui importo verrebbe azzerato; la modifica non può offrire esclusioni puntuali per evitare l'applicazione della regola.
- Le fatture già emesse non vengono modificate e continuano a essere protette dalle regole di validazione previste per ogni variazione temporale.
- Per ogni azzeramento vengono conservati nel dettaglio di calcolo il valore precedente, il gruppo applicato, le regole e le relative versioni, la riduzione risultante e l'importo finale pari a zero.

##### Trattamento temporale delle prestazioni mancate

- Il trattamento economico delle prestazioni e delle operazioni nave nello stato `mancata` viene definito mediante regole economiche configurabili.
- Le condizioni di una versione possono limitarne l'applicazione:
  - alle sole prestazioni `mancate`;
  - alle sole prestazioni `effettuate`;
  - a entrambi gli stati.
- Una regola riferita alle prestazioni mancate può applicare una maggiorazione o una riduzione, percentuale o assoluta, compresa una riduzione del `100%` quando l'attività non deve produrre alcun addebito.
- La percentuale o l'importo applicato alle prestazioni mancate può cambiare nel tempo mediante nuove versioni della regola.
- In assenza di una regola specifica applicabile allo stato `mancata`, la prestazione utilizza lo stesso importo base previsto per una prestazione `effettuata`, determinato mediante tariffa e peso.
- Il passaggio tra gli stati `effettuata` e `mancata` ridetermina le versioni delle regole applicabili e ricalcola l'importo finché la prestazione non è consolidata.

##### Condizioni orarie e festività

- Una condizione oraria appartiene direttamente alla versione della regola economica e specifica almeno un orario iniziale e un orario finale.
- L'orario iniziale è incluso e quello finale è escluso.
- Un intervallo può attraversare la mezzanotte; gli orari iniziale e finale non possono coincidere.
- Più intervalli alternativi configurati nella stessa condizione vengono valutati con operatore logico `OR` e non moltiplicano l'applicazione della regola quando più intervalli risultano soddisfatti.
- La condizione viene valutata utilizzando l'ora locale dell'istante economico della prestazione o della componente dell'operazione nave, nel fuso del porto applicabile.
- Il concetto di fascia `notturna` non possiede una configurazione autonoma: può essere espresso mediante il nome e gli intervalli della regola che applica la relativa conseguenza.
- Una modifica futura degli intervalli o della conseguenza viene rappresentata mediante una nuova versione della stessa regola; intervalli e conseguenza seguono quindi sempre la medesima validità temporale.
- Le festività vengono definite mediante un calendario configurabile di date; ogni festività indica almeno la data e una descrizione.
- Per la stessa data non possono esistere festività duplicate.
- Possono essere inserite festività passate, correnti o future.
- L'inserimento, la modifica o l'eliminazione di una festività può cambiare l'applicabilità delle regole economiche alle prestazioni registrate in quella data ed è soggetto agli stessi controlli di ricalcolo e consolidamento.

##### Modifica ed eliminazione delle versioni economiche

- La versione iniziale può essere modificata nei propri valori, ma non può ricevere una decorrenza.
- Le versioni successive possono essere modificate nei propri valori e nella propria decorrenza.
- La modifica della decorrenza ridefinisce automaticamente gli intervalli della versione modificata e di quelle adiacenti.
- La modifica può cambiare gli elementi ai quali la regola è applicabile, la conseguenza prodotta, l'ordine di elaborazione e le altre regole con le quali viene aggregata.
- Prima della modifica il sistema simula tutti gli effetti prodotti sull'intero intervallo interessato.
- L'eliminazione di una versione successiva estende la validità della versione precedente fino alla decorrenza dell'eventuale versione seguente.
- La versione iniziale non può essere eliminata separatamente dall'intera regola.
- L'intera regola può essere eliminata fisicamente soltanto se non è mai stata applicata a un calcolo persistito e non è referenziata da altre configurazioni.
- Una regola già utilizzata viene conservata e può essere resa non applicabile mediante una versione nello stato `disattivata`.

##### Ricalcolo e consolidamento delle regole economiche

- Qualsiasi creazione, inserimento, modifica o eliminazione riguardante una regola economica, una sua versione o una festività richiede sempre la validazione preventiva degli effetti sulle fatture già emesse.
- Il sistema individua tutti gli elementi ai quali cambierebbero direttamente o indirettamente le condizioni, le regole applicabili, la sequenza di calcolo o il risultato economico.
- Il controllo comprende anche prestazioni e fatture future già registrate.
- La validazione confronta, per ciascuna prestazione e fattura già emessa, almeno:
  - l'identità e la versione di ogni regola applicata;
  - le regole risultate applicabili o non applicabili;
  - le condizioni risultate soddisfatte;
  - le condizioni orarie e le festività considerate;
  - la conseguenza e il valore applicati da ciascuna regola;
  - l'ambito, la fase e la priorità di applicazione;
  - gli importi e gli arrotondamenti intermedi;
  - gli sconti, il bollo, gli importi delle righe e il totale della fattura.
- Prima della conferma vengono mostrati:
  - gli intervalli o le date interessati;
  - le regole e le configurazioni coinvolte;
  - le prestazioni e le fatture che verranno ricalcolate;
  - gli elementi consolidati che impediscono l'operazione.
- Le prestazioni non fatturate e quelle appartenenti esclusivamente a fatture nello stato `in immissione` vengono ricalcolate.
- Le fatture nello stato `in immissione` vengono ricalcolate quando cambia una regola applicabile all'intera fattura.
- Il ricalcolo aggiorna e persiste:
  - l'identità e la versione delle regole applicate;
  - le condizioni risultate soddisfatte;
  - le conseguenze economiche applicate;
  - i valori utilizzati;
  - gli arrotondamenti intermedi;
  - l'importo finale della prestazione o della fattura.
- Con l'emissione della fattura vengono consolidati:
  - le identità e le versioni delle regole applicate;
  - le condizioni risultate soddisfatte;
  - le condizioni orarie e le festività considerate;
  - le conseguenze e i valori applicati;
  - gli arrotondamenti;
  - il bollo;
  - gli importi finali.
- Una variazione è consentita soltanto quando, per tutte le fatture già emesse interessate, rimangono invariati tutti i dati e i risultati consolidati.
- Il mantenimento dello stesso totale finale non è sufficiente: l'operazione viene bloccata anche quando varia un dato intermedio, una regola applicata, una condizione soddisfatta, una conseguenza, un arrotondamento, una riga o qualsiasi altro elemento consolidato, anche se variazioni differenti si compensano economicamente.
- Le fatture già emesse non vengono mai modificate, ricalcolate, riallineate o aggiornate per adeguarle alla nuova configurazione delle regole.
- Il vincolo comprende sia gli effetti diretti sia quelli indiretti, inclusi quelli prodotti dalla variazione dell'ordine delle priorità, dalla diversa aggregazione delle regole, dalla modifica di una condizione oraria o dal cambiamento del calendario delle festività.
- La sola presenza di una fattura emessa nell'intervallo interessato non impedisce l'operazione quando tutti i dati e i risultati consolidati rimangono identici.
- Se anche un solo elemento consolidato verrebbe modificato, l'intera operazione viene bloccata.
- Validazione delle fatture emesse, variazione delle versioni, ridefinizione degli intervalli, ricalcoli degli elementi non consolidati e aggiornamento delle fatture nello stato `in immissione` avvengono atomicamente.
- Se la validazione fallisce o si verifica un errore durante una qualsiasi fase, nessuna variazione viene applicata né alle regole né agli elementi non consolidati.

##### IVA

- L'importo della prestazione è già comprensivo dell'eventuale IVA applicabile.
- Nel calcolo della fattura non viene aggiunta separatamente un'ulteriore componente IVA.
- Una futura evoluzione potrà permettere di specificare se l'importo comprende già l'IVA oppure deve essere considerato al netto dell'IVA.

##### Marca da bollo

- La marca da bollo è gestita dallo stesso sistema delle altre regole dinamiche e non costituisce un passaggio di calcolo separato o codificato in modo fisso.
- Viene rappresentata mediante una regola identificata come bollo, con ambito `intera fattura`, fase `dopo gli sconti` e conseguenza costituita da una maggiorazione assoluta.
- La versione iniziale della regola del bollo è priva di decorrenza.
- Le versioni successive possono modificare temporalmente lo stato `attiva` o `disattivata`, la soglia, l'importo, le condizioni di applicazione o esclusione e la priorità.
- La versione applicabile viene determinata utilizzando la data della fattura.
- Se la versione applicabile è disattivata oppure le relative condizioni non sono soddisfatte, il bollo non viene aggiunto.
- Una modifica futura della soglia o dell'importo del bollo viene registrata mediante una nuova versione con la relativa decorrenza.
- La regola del bollo è configurata nella fase `dopo gli sconti`, così il relativo importo non rientra nella base scontabile.
- In ogni intervallo temporale può essere attiva una sola regola identificata come bollo.
- La sua priorità deve essere esclusiva e successiva a quella di ogni altra regola applicabile alla fattura, affinché venga calcolata una sola volta sul risultato finale escluso il bollo.
- Il bollo aumenta l'importo dovuto all'azienda.

La regola dinamica del bollo viene applicata una sola volta al totale ottenuto dopo tutte le altre regole e gli sconti:

\[
\text{Totale fattura} =
\text{Totale dopo tutte le regole e gli sconti, escluso il bollo}
+ \text{Bollo}
\]

#### Identificazione e numerazione della fattura

- L'identificativo della fattura è composto da:
  - un numero progressivo;
  - un suffisso opzionale, separato dal progressivo mediante `-`;
  - l'anno della fattura, separato mediante `/`.
- Il formato dell'identificativo è pertanto:
  - `1/2026`, in assenza del suffisso;
  - `1-A/2026`, in presenza del suffisso.
- Il suffisso viene normalizzato in maiuscolo; valori che differiscono soltanto per maiuscole e minuscole identificano quindi la stessa combinazione.
- L'anno riportato nell'identificativo non viene inserito manualmente, ma viene determinato e aggiornato automaticamente in base alla data della fattura.
- Il numero progressivo può essere assegnato già quando la fattura si trova nello stato `in immissione`.
- L'unicità dell'identificativo è determinata dalla combinazione di anno di fatturazione, numero progressivo e suffisso.
- Nello stesso anno possono esistere contemporaneamente fatture come `1/2026`, `1-A/2026` e `1-B/2026`.
- L'assenza del suffisso costituisce una combinazione distinta da qualsiasi suffisso valorizzato.
- Il suffisso non identifica una serie di numerazione autonoma, ma una variante del medesimo numero progressivo.
- Finché rimane assegnato alla fattura, l'identificativo è riservato e non può essere utilizzato da un'altra fattura.
- Quando il numero o il suffisso di una fattura `in immissione` viene modificato, la combinazione precedentemente occupata torna disponibile per altre fatture.
- Il numero e il suffisso possono essere modificati soltanto prima della prima emissione.
- Una volta emessa la fattura, l'intero identificativo diventa immutabile, anche se la fattura viene successivamente riportata nello stato `in immissione`.
- Il ritiro o l'eliminazione della fattura non rende nuovamente disponibile un identificativo già consolidato con la prima emissione.
- Per ciascun anno, il progressivo successivo atteso è pari al massimo progressivo numerico già emesso nello stesso anno, ignorando i suffissi, incrementato di uno; se non esistono fatture emesse per l'anno, il valore atteso è `1`.
- Le combinazioni riservate dalle fatture `in immissione` non avanzano il progressivo successivo atteso.
- Se il progressivo non viene indicato, il sistema propone il primo valore disponibile a partire da quello atteso; l'operatore può comunque selezionare manualmente un progressivo inferiore ancora libero.
- Prima di emettere una fattura con un progressivo superiore a quello successivo atteso per l'anno, il sistema avvisa l'operatore che la numerazione presenta un salto e richiede conferma per procedere.
- La presenza dell'avviso non impedisce l'emissione: dopo la conferma dell'operatore, il progressivo indicato può essere utilizzato.
- L'emissione di un progressivo superiore aggiorna il massimo dell'anno; il medesimo salto non viene quindi segnalato nuovamente per i progressivi successivi.
- I progressivi inferiori già liberati da una modifica rimangono disponibili e possono essere assegnati ad altre fatture.
- Al momento dell'emissione vengono consolidati:
  - identificativo della fattura;
  - data della fattura;
  - data e ora di emissione;
  - composizione, importi, sconti, bollo e totale.
- Per ogni fattura emessa almeno una volta vengono conservati l'istante della prima emissione e quello dell'emissione corrente o più recente. Ogni nuova emissione aggiorna il secondo valore, senza creare uno storico completo delle emissioni precedenti.
- Se una fattura `emessa` viene riportata nello stato `in immissione`, quando consentito, conserva il proprio identificativo.

#### Data della fattura

- La data può essere assegnata e modificata mentre la fattura si trova nello stato `in immissione` ed è obbligatoria per procedere con l'emissione.
- La data della fattura può essere precedente o successiva alla data corrente, sia durante l'immissione sia al momento dell'emissione.
- Non viene imposto un vincolo cronologico tra le date delle fatture e l'ordine dei relativi progressivi.
- L'anno della data deve sempre coincidere con l'anno riportato automaticamente nell'identificativo.
- Prima della prima emissione, se la data viene modificata passando a un anno differente, il sistema:
  - aggiorna automaticamente l'anno riportato nell'identificativo;
  - ricalcola il numero progressivo in base alla numerazione disponibile nel nuovo anno;
  - mantiene l'eventuale suffisso opzionale, salvo che venga modificato dall'operatore;
  - rende nuovamente disponibile la combinazione precedentemente occupata.
- Dopo la prima emissione, una modifica della data che comporterebbe il passaggio a un altro anno non è consentita, poiché richiederebbe la modifica dell'identificativo ormai consolidato.
- La data della fattura e la data e l'ora effettive di emissione rappresentano informazioni distinte.
- Se una fattura emessa viene riportata nello stato `in immissione`, la data può essere modificata soltanto mantenendola nello stesso anno dell'identificativo consolidato.

#### Stati e modificabilità della fattura

- Le prestazioni, le operazioni nave a componente singola, le singole componenti economiche degli spostamenti tra porti e le movimentazioni merci informative possono essere aggiunte o rimosse esclusivamente quando la fattura è nello stato `in immissione`.
- Il passaggio allo stato `emessa` consolida la composizione e il totale della fattura.
- Una fattura `emessa` non consente l'aggiunta o la rimozione delle attività o delle movimentazioni informative associate.
- Il ritiro della fattura consiste nel passaggio manuale dallo stato `emessa` allo stato `in immissione` e non introduce uno stato ulteriore.
- Durante il ritiro non esiste un documento emesso corrente; rimangono consultabili gli istanti della prima emissione e dell'emissione più recente, ma non viene conservato uno storico completo dei documenti emessi in precedenza.
- Una fattura `emessa` può essere ritirata soltanto se non presenta movimenti associati.
- La presenza di qualsiasi movimento associato impedisce il ritiro e quindi ogni modifica della composizione.
- Dopo il ritiro, la fattura torna modificabile secondo le normali regole dello stato `in immissione` e le prestazioni, le operazioni nave a componente singola, le singole componenti economiche o le movimentazioni informative associate possono essere rimosse.
- Quando la rimozione di un'attività o di una componente economica è consentita, il totale della fattura viene ricalcolato e l'elemento torna modificabile e disponibile per la stessa fattura o per un'altra. La rimozione di una componente di uno spostamento tra porti non modifica l'eventuale associazione dell'altra componente. La rimozione di una movimentazione aggiorna soltanto la sezione informativa e non cambia il totale.
- Se viene rimossa l'ultima attività economica, la fattura conserva cliente, agenzia e le eventuali movimentazioni informative compatibili, ma non può essere emessa finché non viene aggiunta almeno una nuova attività economica.

#### Saldo e transizioni automatiche

- I movimenti saldano la fattura nel suo complesso e non vengono imputati alle singole prestazioni.
- Lo stato della fattura dipende dall'importo complessivamente saldato mediante le quote dei movimenti associati:
  - `emessa`, quando il saldo è pari a zero;
  - `parzialmente saldata`, quando il saldo è maggiore di zero ma inferiore al totale della fattura;
  - `saldata`, quando il saldo copre interamente il totale della fattura.
- Una fattura emessa con totale pari a zero costituisce un caso specifico: rimane nello stato `emessa`, con importo saldato e residuo entrambi pari a zero, non riceve quote di incasso e non passa allo stato `saldata`, che richiede un incasso positivo.
- Se tutte le associazioni ai movimenti vengono eliminate o modificate e il saldo torna a zero, la fattura ritorna automaticamente nello stato `emessa`.
- L'eventuale ritiro successivo da `emessa` a `in immissione` è manuale e non avviene automaticamente.
- Non è necessario determinare quale prestazione sia coperta da un movimento, poiché ogni quota di pagamento si riferisce alla fattura nel suo complesso.

#### Eliminazione della fattura

- Una fattura può essere eliminata soltanto quando si trova nello stato `in immissione`.
- Una fattura già emessa deve quindi essere prima ritirata.
- Le fatture in qualsiasi altro stato non possono essere eliminate.
- Non è richiesto conservare uno storico delle fatture eliminate.
- L'eliminazione rimuove atomicamente la fattura e tutte le associazioni alle prestazioni, alle operazioni nave a componente singola, alle singole componenti economiche degli spostamenti tra porti e alle movimentazioni merci che la compongono.
- Gli elementi disassociati non vengono eliminati: tornano modificabili e disponibili per la stessa fattura o per un'altra, secondo le rispettive regole.

### Regole contabili

#### Gestione dei movimenti contabili

- I movimenti contabili si distinguono in:
  - entrate;
  - uscite;
  - giroconti.
- Ogni movimento contabile specifica almeno:
  - tipologia di movimento;
  - importo;
  - data contabile;
  - eventuale descrizione o nota.
- L'importo deve essere strettamente maggiore di zero.
- La data contabile può essere precedente o successiva alla data corrente.
- Il passaggio diretto tra entrata, uscita e giroconto non è consentito. Per correggere la tipologia occorre eliminare l'operazione e registrarne una nuova.
- La modifica di un movimento aggiorna automaticamente tutti i saldi interessati.
- Ogni inserimento, modifica o eliminazione deve essere atomico e lasciare coerenti:
  - i saldi dei conti;
  - i saldi delle eventuali voci;
  - le associazioni dei movimenti alle voci;
  - le quote attribuite alle fatture;
  - gli stati di riscossione delle fatture.

#### Identificazione e ordinamento dei movimenti contabili

- Ogni movimento contabile possiede un identificativo tecnico univoco, stabile e non modificabile, utilizzato per le relazioni interne e indipendente dalla sua posizione nell'ordinamento.
- Nella prima fase del progetto, l'ordinamento cronologico dei movimenti utilizza esclusivamente:
  1. la data contabile del movimento;
  2. un progressivo giornaliero che ne indica la posizione tra i movimenti aventi la stessa data.
- Il progressivo:
  - è univoco soltanto all'interno della relativa data contabile;
  - parte da `1` per ogni giornata;
  - forma sempre, insieme agli altri progressivi della stessa giornata, una sequenza consecutiva e priva di intervalli;
  - non costituisce un identificativo stabile del movimento;
  - può cambiare in seguito a inserimenti, eliminazioni, spostamenti o modifiche della data contabile.
- Quando un nuovo movimento viene inserito in una posizione già occupata, il progressivo di quel movimento e di tutti quelli successivi della stessa giornata viene incrementato di uno.
- Quando un movimento viene eliminato, tutti i movimenti successivi della stessa giornata riducono il proprio progressivo di uno.
- Il riordinamento di un movimento all'interno della stessa giornata aggiorna il suo progressivo e quelli compresi tra la posizione precedente e quella nuova, mantenendo la sequenza consecutiva.
- La modifica della data contabile di un movimento:
  - lo rimuove dall'ordinamento della giornata di origine, compattandone i progressivi;
  - lo inserisce nell'ordinamento della giornata di destinazione, aggiornando i progressivi dei movimenti successivi.
- Se non viene indicata esplicitamente una posizione, un nuovo movimento o un movimento trasferito a un'altra data viene collocato dopo l'ultimo movimento già presente nella giornata.
- Tutti gli aggiornamenti dei progressivi prodotti dalla stessa operazione devono essere applicati atomicamente.
- Il giroconto costituisce una singola operazione ai fini dell'identificazione e dell'ordinamento:
  - possiede un solo identificativo tecnico dell'operazione;
  - occupa una sola posizione nella sequenza giornaliera;
  - le sue componenti tecniche non ricevono progressivi giornalieri autonomi e non sono ordinabili separatamente.

#### Progressivo giornaliero e saldo progressivo

- Il progressivo giornaliero determina l'ordine con cui gli effetti dei movimenti aventi la stessa data contabile vengono applicati nella ricostruzione del saldo.
- Per ogni movimento possono essere determinati:
  - il saldo immediatamente precedente;
  - il saldo immediatamente successivo alla sua applicazione.
- Il saldo precedente a un movimento comprende:
  - il saldo iniziale del conto;
  - tutti i movimenti con data contabile precedente;
  - i movimenti della stessa giornata aventi progressivo inferiore.
- Il saldo successivo comprende anche l'effetto del movimento considerato.
- Il progressivo è unico nella giornata tra tutti i movimenti contabili e non è separato per conto. Nel dettaglio di un singolo conto possono quindi comparire progressivi non consecutivi, poiché le posizioni mancanti appartengono a movimenti relativi ad altri conti.
- Il riordinamento dei movimenti nella stessa giornata:
  - può modificare i saldi intermedi mostrati dopo i singoli movimenti;
  - non modifica il saldo complessivo alla fine della giornata;
  - non modifica il saldo previsto;
  - non modifica i totali economici o contabili.
- Il saldo alla data continua a comprendere tutti i movimenti della giornata selezionata, indipendentemente dal loro progressivo.
- L'ordinamento crescente o decrescente scelto per la visualizzazione non modifica il significato del progressivo né il calcolo dei saldi, ma rappresenta soltanto il verso con cui i movimenti vengono mostrati.
- Il giroconto occupa un'unica posizione giornaliera e produce contestualmente, in quella posizione:
  - l'addebito sul conto di origine;
  - l'accredito sul conto di destinazione;
  - l'eventuale costo sul conto al quale è attribuito.
- Ogni modifica dell'ordine giornaliero aggiorna atomicamente i saldi intermedi interessati.

##### Entrata

- Un movimento in entrata incrementa il saldo del conto finanziario interessato.
- Deve indicare obbligatoriamente il conto finanziario interessato.
- Un movimento in entrata deve essere qualificato come:
  - `incasso`;
  - `altra entrata`.
- L'`incasso` rappresenta una somma ricevuta da un cliente tramite una determinata agenzia, anche quando non è ancora attribuita ad alcuna fattura.
- Un incasso:
  - deve indicare obbligatoriamente l'agenzia e il cliente ai quali è attribuito;
  - può essere associato a una o più fatture come pagamento, secondo le regole definite nella sezione dedicata;
  - può rimanere completamente o parzialmente non attribuito.
- L'`altra entrata` rappresenta una somma acquisita che non costituisce il pagamento di una fattura, come un rimborso, un interesse attivo o un apporto di capitale.
- Un'altra entrata:
  - non richiede l'indicazione di un'agenzia o di un cliente;
  - non può essere associata a fatture;
  - deve contenere una descrizione che ne specifichi la natura.
- Può essere associato facoltativamente e per intero a una o più voci contabili.
- Nella prima versione non sono previste categorie specifiche per i movimenti in entrata; la loro eventuale classificazione avviene mediante le voci contabili.
- Se presenta quote associate a fatture:
  - il suo importo non può diventare inferiore alla somma delle quote attribuite;
  - agenzia e cliente non possono essere modificati con valori incompatibili con le fatture associate;
  - le associazioni incompatibili devono essere rimosse prima di modificare agenzia o cliente.
- La modifica da `incasso` ad `altra entrata` è consentita soltanto quando non esistono quote associate a fatture.
- La modifica da `altra entrata` a `incasso` richiede l'indicazione di agenzia e cliente.
- La modifica della qualificazione aggiorna atomicamente i saldi e tutte le associazioni interessate.
- Non può essere eliminato finché tutte le associazioni alle fatture non vengono rimosse.

##### Uscita

- Un movimento in uscita riduce il saldo del conto finanziario interessato.
- Deve indicare obbligatoriamente:
  - il conto finanziario interessato;
  - la categoria di spesa che ne descrive la finalità.
- Può essere associato facoltativamente e per intero a una o più voci contabili.
- Non può essere associato a una fattura come pagamento.

##### Giroconto

- Il giroconto rappresenta il trasferimento di capitale tra due conti finanziari dell'azienda.
- Costituisce un'unica operazione contabile composta da due componenti collegate:
  - un'uscita dal conto di origine;
  - un'entrata nel conto di destinazione.
- Deve indicare obbligatoriamente:
  - il conto di origine;
  - il conto di destinazione;
  - l'importo del capitale trasferito;
  - un'unica data contabile.
- Il conto di origine e il conto di destinazione devono essere differenti.
- Al momento della registrazione del giroconto, entrambi i conti devono essere attivi, indipendentemente dalla data contabile.
- Un giroconto esistente può essere modificato mantenendo un conto successivamente disattivato; se uno dei conti viene sostituito, il nuovo conto selezionato deve essere attivo.
- Il giroconto può includere facoltativamente un costo di trasferimento.
- Quando viene indicato un costo di trasferimento, deve essere specificato il conto al quale viene attribuito:
  - se attribuito al conto di origine, il conto di origine viene addebitato dell'importo trasferito più il costo e il conto di destinazione viene accreditato dell'intero importo trasferito;
  - se attribuito al conto di destinazione, il conto di origine viene addebitato dell'importo trasferito e il conto di destinazione viene accreditato dell'importo trasferito al netto del costo.
- Il costo di trasferimento deve essere strettamente maggiore di zero; se non sono previsti costi, il relativo valore rimane assente.
- Quando il costo è attribuito al conto di destinazione, deve essere inferiore all'importo trasferito, affinché l'accredito risultante sia strettamente positivo.
- In assenza di costi, l'addebito sul conto di origine e l'accredito sul conto di destinazione coincidono con l'importo trasferito e la disponibilità finanziaria complessiva dell'azienda rimane invariata.
- In presenza di costi, la disponibilità finanziaria complessiva dell'azienda si riduce dell'importo del costo, indipendentemente dal conto al quale è attribuito.
- Il capitale trasferito non può essere associato a categorie di spesa o voci contabili, poiché rappresenta esclusivamente uno spostamento tra conti aziendali.
- Quando è presente un costo di trasferimento:
  - deve essere indicata obbligatoriamente una categoria di spesa;
  - il costo può essere associato facoltativamente e per intero a una o più voci contabili;
  - la categoria e le eventuali voci associate si riferiscono esclusivamente al costo e non al capitale trasferito.
- Nei resoconti economici il capitale trasferito rimane neutrale, mentre il solo costo viene considerato come uscita e concorre alla categoria e alle eventuali voci associate.
- Il giroconto può essere registrato anche quando l'addebito porta il conto di origine ad avere un saldo negativo.
- Le due componenti condividono la data contabile e l'eventuale descrizione o nota comune.
- Le componenti del giroconto non possono essere associate a fatture, agenzie o clienti; le associazioni alla categoria di spesa e alle voci contabili riguardano esclusivamente l'eventuale costo secondo le regole definite sopra.
- Le due componenti non possono essere modificate o eliminate separatamente: ogni variazione deve riguardare l'intero giroconto ed essere applicata atomicamente.
- La modifica o eliminazione del costo, delle relative classificazioni, dell'importo trasferito, del conto al quale il costo è attribuito, della data o dei conti coinvolti aggiorna atomicamente entrambe le componenti, i saldi e tutte le classificazioni interessate.
- L'eliminazione del giroconto rimuove entrambe le componenti nella stessa operazione.

#### Associazione dei movimenti alle fatture

- Soltanto i movimenti contabili in entrata qualificati come `incasso` possono essere associati alle fatture come pagamenti.
- Una fattura può essere saldata mediante più movimenti in entrata e uno stesso movimento può essere associato a una o più fatture.
- Per ogni associazione viene indicata la quota del movimento destinata al saldo della fattura.
- Per ogni coppia `incasso + fattura` può esistere una sola associazione; le variazioni aggiornano la quota esistente senza creare duplicati.
- Ogni quota deve essere strettamente maggiore di zero.
- Le quote utilizzano valori decimali esatti in euro e due cifre decimali; una quota pari a zero non viene conservata e richiede la rimozione dell'associazione.
- La somma delle quote associate non può superare l'importo complessivo del movimento.
- Un movimento può rimanere:
  - completamente non attribuito;
  - parzialmente attribuito;
  - interamente attribuito.
- La parte non attribuita del movimento rimane registrata contabilmente e può essere associata successivamente ad altre fatture.
- Una quota non può superare l'importo ancora da saldare della fattura; non sono quindi ammessi pagamenti eccedenti rispetto al totale dovuto.
- Possono essere associate soltanto fatture:
  - già emesse;
  - riferite alla stessa agenzia e allo stesso cliente ai quali è attribuito l’incasso;
  - non ancora interamente saldate.
- Una fattura `parzialmente saldata` rimane associabile per il proprio residuo; una fattura `in immissione`, `saldata` o con totale pari a zero non può ricevere nuove quote.
- La compatibilità di cliente e agenzia viene determinata mediante le identità stabili; la loro successiva disattivazione non invalida le associazioni esistenti e non impedisce nuove associazioni compatibili.
- Non è previsto un vincolo cronologico tra la data contabile dell'incasso e la data della fattura associata.
- Durante l'associazione di più fatture, il sistema propone automaticamente una ripartizione progressiva:
  1. copre il residuo della prima fattura;
  2. assegna l'eventuale importo restante alla fattura successiva;
  3. continua fino all'esaurimento dell'importo disponibile o delle fatture selezionate.
- L'ordine iniziale della proposta segue data della fattura e identificativo crescenti; l'operatore può riordinare le fatture prima del calcolo.
- La proposta utilizza soltanto l'importo non attribuito e riguarda le nuove fatture selezionate, senza modificare le quote già registrate.
- La ripartizione proposta può essere modificata manualmente, purché rispetti tutti i vincoli.
- La modifica manuale di una quota non redistribuisce automaticamente la differenza sulle fatture successive; l'importo liberato rimane non attribuito.
- La parte non attribuita può rimanere sull'incasso senza limite temporale e senza introdurre uno stato contabile aggiuntivo del movimento.
- L'inserimento, la modifica o la rimozione di una quota aggiorna automaticamente l'importo saldato e lo stato delle fatture coinvolte.
- Una fattura `saldata` non accetta nuove associazioni, ma le quote esistenti possono essere ridotte o rimosse; la rimozione dell'ultima quota riporta la fattura a `emessa` senza avviarne automaticamente il ritiro.
- L'associazione del movimento riguarda la fattura nel suo complesso e non richiede una ripartizione tra le singole prestazioni che la compongono.
- L'inserimento, la modifica o la rimozione simultanea di più quote deve essere atomica: prima del salvataggio vengono verificati nuovamente disponibilità dell'incasso, residui, stati e compatibilità; se una quota non è valida o è intervenuta una variazione concorrente, nessuna modifica viene applicata.

#### Categorie di spesa

- Ogni movimento in uscita deve essere associato obbligatoriamente a una categoria di spesa.
- Anche l'eventuale costo di un giroconto deve essere associato obbligatoriamente a una categoria di spesa; il capitale trasferito rimane escluso dalla classificazione.
- Ogni categoria specifica almeno:
  - un codice univoco;
  - una denominazione;
  - un'eventuale categoria padre;
  - lo stato `attiva` oppure `disattivata`.
- Le categorie possono essere organizzate su più livelli gerarchici, senza una profondità massima prestabilita.
- Una categoria non può:
  - essere padre di sé stessa;
  - avere come padre una propria discendente;
  - generare in qualsiasi modo una dipendenza circolare.
- Sia le categorie prive di sottocategorie sia quelle che ne contengono possono essere associate direttamente a un movimento.
- I movimenti associati direttamente a una categoria padre rimangono distinti da quelli attribuiti alle relative sottocategorie.
- Nei resoconti, il totale di una categoria comprende:
  - i movimenti associati direttamente alla categoria;
  - i movimenti associati a tutte le sue categorie discendenti.
- Una categoria associata ad almeno un movimento o costo di giroconto non può essere eliminata, ma soltanto disattivata.
- Una categoria priva di movimenti e costi di giroconto associati può essere eliminata soltanto se non possiede sottocategorie.
- Una categoria disattivata:
  - non può essere selezionata per nuovi movimenti;
  - rimane associata e visibile nei movimenti già registrati;
  - continua a essere considerata nei resoconti storici.
- La disattivazione di una categoria padre rende indisponibili per le nuove registrazioni anche tutte le categorie discendenti.
- Una categoria discendente può essere utilizzata soltanto se essa e tutte le sue categorie antenate sono attive.
- Ogni categoria possiede un proprio stato `attiva` o `disattivata`, indipendente dallo stato delle categorie antenate e discendenti.
- La disattivazione di una categoria:
  - non modifica lo stato delle categorie discendenti;
  - rende comunque indisponibile per nuove associazioni l'intero sottoalbero;
  - conserva tutte le associazioni già esistenti.
- Una categoria attiva posta sotto una categoria disattivata conserva il proprio stato, ma non è utilizzabile finché almeno una delle sue categorie antenate rimane disattivata.
- La riattivazione di una categoria:
  - non riattiva automaticamente le categorie discendenti che possiedono lo stato `disattivata`;
  - rende nuovamente utilizzabili soltanto le categorie discendenti che sono già attive e non hanno altre categorie antenate disattivate;
  - non modifica le associazioni già esistenti.
- Una categoria disattivata può essere riattivata anche se una sua categoria antenata è disattivata; in tal caso conserva lo stato `attiva`, ma rimane inutilizzabile fino alla riattivazione dell'intera catena di antenati.
- Prima di confermare la riattivazione, il sistema indica quali categorie del sottoalbero torneranno effettivamente disponibili.
- Codice e denominazione possono essere modificati senza cambiare l'identità della categoria né le associazioni esistenti.
- Una categoria, attiva o disattivata, può essere:
  - spostata sotto una categoria padre differente, attiva oppure disattivata;
  - trasformata in categoria radice.
- Lo spostamento è consentito soltanto se non genera dipendenze circolari.
- Lo spostamento non modifica lo stato proprio della categoria trasferita né quello delle sue categorie discendenti.
- Dopo lo spostamento, l'utilizzabilità dell'intero sottoalbero viene ricalcolata considerando la nuova catena di categorie antenate:
  - una categoria è utilizzabile soltanto se essa e tutte le sue categorie antenate sono attive;
  - lo spostamento sotto una categoria disattivata può rendere indisponibili categorie precedentemente utilizzabili;
  - lo spostamento fuori da un ramo disattivato può rendere disponibili categorie già attive;
  - le categorie esplicitamente disattivate rimangono comunque indisponibili.
- Lo spostamento non modifica né elimina le associazioni già esistenti tra categorie e movimenti.
- Le categorie non possiedono una validità temporale e non vengono conservate versioni storicamente applicabili del loro codice, della denominazione o della posizione gerarchica.
- Le associazioni dei movimenti rimangono collegate all'identità stabile della categoria, mentre i resoconti utilizzano sempre il codice, la denominazione e la struttura gerarchica correnti.
- La modifica del codice o della denominazione aggiorna quindi anche la rappresentazione della categoria nei resoconti riferiti a periodi precedenti.
- Lo spostamento di una categoria nella gerarchia ricalcola anche le aggregazioni relative ai periodi precedenti:
  - i movimenti direttamente associati alla categoria rimangono invariati;
  - i relativi importi concorrono ai totali della nuova catena di categorie antenate;
  - non concorrono più ai totali della precedente catena.
- Prima di confermare lo spostamento, il sistema mostra all'operatore:
  - la posizione gerarchica precedente e quella nuova;
  - le categorie del sottoalbero che diventeranno utilizzabili o inutilizzabili;
  - l'avviso che verranno ricalcolate anche le aggregazioni dei periodi precedenti.
- Lo spostamento, il ricalcolo dell'utilizzabilità e l'aggiornamento delle aggregazioni avvengono atomicamente.

#### Voci contabili

- Ogni voce contabile specifica almeno:
  - un codice univoco;
  - una denominazione;
  - un'eventuale descrizione;
  - lo stato `attiva` oppure `disattivata`;
  - un eventuale saldo iniziale, considerato pari a zero quando non indicato.
- Al saldo iniziale della voce non viene attribuita una data di decorrenza e non sono introdotti vincoli sulla data dei movimenti associabili.
- La voce contabile costituisce uno strumento di controllo interno e rimane indipendente:
  - dai conti finanziari;
  - dalle categorie di spesa;
  - da agenzie e clienti.
- Ogni movimento in entrata o in uscita può essere associato facoltativamente a una o più voci contabili; per un giroconto può essere associato esclusivamente l'eventuale costo di trasferimento.
- Ogni associazione riguarda sempre l'intero importo associabile: l'intero movimento per un'entrata o un'uscita e l'intero costo per un giroconto. Non è possibile attribuirne a una voce soltanto una quota.
- La stessa voce non può essere associata più di una volta allo stesso movimento.
- Un movimento può non essere associato ad alcuna voce oppure essere associato per intero a una o più voci.
- Alla stessa voce possono essere associati per intero movimenti:
  - appartenenti a conti finanziari differenti;
  - sia in entrata sia in uscita;
  - appartenenti a categorie di spesa differenti.
- Il capitale trasferito e le componenti tecniche del giroconto non possono essere associati a voci contabili; può esserlo soltanto l'eventuale costo di trasferimento.
- Il saldo della voce è determinato dal saldo iniziale e dall'importo integrale dei movimenti associati:
  - i movimenti in entrata incrementano il saldo del loro intero importo;
  - i movimenti in uscita lo riducono del loro intero importo;
  - i costi dei giroconti lo riducono del loro intero importo.
- Quando un movimento o il costo di un giroconto è associato a più voci, il relativo intero importo associabile concorre al saldo di ciascuna di esse.
- Il saldo di una voce può assumere anche valori negativi.
- L'inserimento, la modifica o la rimozione di un'associazione tra un movimento o un costo di giroconto e una voce, nonché la modifica del relativo importo associabile, aggiorna atomicamente tutti i saldi interessati.

##### Saldo delle voci contabili

- Il saldo iniziale della voce può essere positivo, pari a zero oppure negativo e costituisce la base del calcolo per qualsiasi data selezionata.
- Il **saldo alla data** è calcolato sommando al saldo iniziale gli effetti di tutti i movimenti associati alla voce aventi data contabile minore o uguale alla data selezionata:
  - le entrate incrementano il saldo del loro intero importo;
  - le uscite lo riducono del loro intero importo;
  - gli eventuali costi dei giroconti lo riducono del loro intero importo;
  - il capitale trasferito mediante giroconto non produce alcun effetto.
- Il saldo alla data comprende tutti i movimenti registrati nella giornata selezionata, indipendentemente dal loro progressivo giornaliero.
- La data utilizzata per il calcolo viene scelta esplicitamente dall'operatore e può essere passata, coincidere con la data corrente oppure essere futura.
- Il **saldo previsto** è calcolato sommando al saldo iniziale gli effetti di tutti i movimenti già registrati e associati alla voce, senza limitarli rispetto a una data; comprende quindi anche i movimenti con data contabile futura.
- Per il calcolo rileva esclusivamente la data contabile del movimento; le date tecniche di inserimento o modifica non producono effetti sul saldo.
- La disattivazione della voce non modifica il saldo alla data o il saldo previsto e non esclude i movimenti già associati.
- L'inserimento, la modifica o l'eliminazione di un movimento o di un'associazione aggiorna atomicamente i saldi di tutte le voci interessate.
- La modifica della data contabile può cambiare i saldi alla data dei periodi interessati, ma non modifica l'inclusione del movimento nel saldo previsto.
- La modifica del saldo iniziale aggiorna il saldo alla data, il saldo previsto e tutti i resoconti della voce, compresi quelli relativi a periodi precedenti.
- Quando uno stesso movimento è associato a più voci, il suo intero importo concorre separatamente al saldo di ciascuna.

- Una voce associata ad almeno un movimento o costo di giroconto non può essere eliminata, ma soltanto disattivata.
- Una voce priva di movimenti, costi di giroconto e altri riferimenti può essere eliminata.
- Una voce disattivata:
  - non può essere selezionata per nuove associazioni;
  - rimane associata e visibile nei movimenti già registrati;
  - continua a essere considerata nei resoconti storici;
  - può essere riattivata.
- Codice, denominazione e descrizione possono essere modificati senza alterare l'identità della voce o le associazioni esistenti.
- Le voci contabili non possiedono una validità temporale e non vengono conservate versioni storicamente applicabili del loro codice, della denominazione, della descrizione o del saldo iniziale.
- Le associazioni dei movimenti rimangono collegate all'identità stabile della voce, mentre i resoconti, anche quando riferiti a periodi precedenti, utilizzano sempre il codice, la denominazione, la descrizione e il saldo iniziale correnti.
- La modifica del codice, della denominazione o della descrizione aggiorna quindi anche la rappresentazione della voce nei resoconti relativi a periodi precedenti.
- La modifica del saldo iniziale ricalcola il saldo della voce e tutti i risultati derivati, compresi quelli relativi ai periodi precedenti.
- Prima di modificare il saldo iniziale, il sistema informa l'operatore degli effetti sui saldi e sui resoconti relativi ai periodi precedenti e ne richiede la conferma.
- La disattivazione non modifica le associazioni esistenti e non esclude la voce dai resoconti, indipendentemente dal periodo selezionato.

##### Visualizzazione delle voci contabili

- Ogni voce contabile rappresenta una visualizzazione autonoma e specifica delle entrate, delle uscite e degli eventuali costi di giroconto che le sono stati attribuiti.
- Saldo iniziale, saldo alla data, saldo previsto, andamento e resoconti sono determinati separatamente per ciascuna voce.
- Le voci contabili non possono essere aggregate tra loro: i relativi movimenti, saldi e risultati non possono essere sommati, accorpati o utilizzati per determinare un totale trasversale.
- Non viene calcolato neppure un totale trasversale basato sui movimenti distinti, poiché tale risultato costituirebbe una vista differente da quelle definite dalle singole voci.
- Quando uno stesso movimento è associato a più voci, compare integralmente nella visualizzazione di ciascuna di esse, senza che ciò determini la creazione di un resoconto aggregato tra le voci coinvolte.
- All'interno della singola voce possono essere applicati filtri, raggruppamenti e aggregazioni ai movimenti attribuiti, purché il risultato continui a rappresentare esclusivamente quella voce.
- Più voci possono essere consultate o confrontate separatamente, ma non viene mostrata alcuna somma o saldo complessivo delle voci selezionate.

#### Eliminazione e riutilizzo dei codici di categorie e voci contabili

- Il codice configurabile deve essere univoco separatamente tra:
  - tutte le categorie di spesa esistenti;
  - tutte le voci contabili esistenti.
- La verifica dell'unicità considera i codici privi degli spazi iniziali e finali e senza distinzione tra lettere maiuscole e minuscole.
- L'unicità comprende anche gli elementi disattivati: il codice di una categoria o di una voce disattivata rimane riservato alla relativa identità.
- Una categoria può essere eliminata fisicamente soltanto quando non è associata a movimenti o costi di giroconto e non possiede categorie discendenti.
- Una voce può essere eliminata fisicamente soltanto quando non è associata a movimenti o costi di giroconto e non possiede altri riferimenti.
- L'eliminazione fisica libera il codice configurabile dell'elemento, che può essere assegnato a una nuova categoria o voce della medesima tipologia.
- Quando il codice configurabile di una categoria o di una voce viene modificato:
  - l'identità tecnica dell'elemento e tutte le associazioni esistenti rimangono invariate;
  - il codice precedente viene liberato e può essere assegnato a un altro elemento della medesima tipologia.
- Il riutilizzo di un codice non crea alcuna continuità tra l'elemento precedente e quello nuovo, che mantengono identità tecniche distinte.
- I resoconti utilizzano sempre il codice corrente dell'elemento associato. Di conseguenza:
  - i movimenti dell'elemento originario vengono rappresentati con il suo nuovo codice;
  - il nuovo elemento al quale viene assegnato il codice liberato comprende soltanto le proprie associazioni.
- Gli identificativi tecnici stabili permettono di distinguere le diverse identità alle quali lo stesso codice è stato assegnato nel tempo.

#### Modifica di movimenti con classificazioni disattivate

- La disattivazione di una categoria o di una voce contabile non invalida le associazioni già esistenti.
- Un movimento già associato a una categoria o a una voce successivamente disattivata può essere modificato mantenendo invariata tale associazione.
- Possono quindi essere modificati, nel rispetto degli altri vincoli:
  - l'importo;
  - la data contabile;
  - il conto finanziario;
  - la descrizione o la nota;
  - le quote attribuite alle fatture;
  - le altre associazioni indipendenti.
- La modifica dell'importo aggiorna normalmente i saldi e i resoconti, anche quando il movimento conserva una categoria o una voce disattivata.
- Un'associazione verso una categoria o una voce disattivata può essere rimossa.
- Quando una classificazione viene aggiunta o sostituita:
  - la nuova categoria deve essere attiva e avere tutte le categorie antenate attive;
  - la nuova voce contabile deve essere attiva;
  - una classificazione disattivata precedentemente rimossa non può essere selezionata nuovamente finché non viene riattivata.
- Per un movimento associato a più voci, le associazioni già esistenti verso voci disattivate possono essere conservate mentre vengono aggiunte o rimosse altre voci.
- L'attività della categoria o della voce viene valutata nel momento in cui l'associazione viene creata o sostituita, indipendentemente dalla data contabile del movimento.
- Tutte le variazioni vengono applicate atomicamente insieme agli aggiornamenti dei saldi e dei resoconti interessati.

#### Gestione dei conti finanziari

- Ogni conto possiede un'identità tecnica stabile, distinta dal codice operativo mostrato e gestito dall'operatore.
- Ogni conto finanziario specifica almeno:
  - un codice operativo univoco;
  - una denominazione;
  - una tipologia;
  - un eventuale saldo iniziale;
  - lo stato `attivo` oppure `disattivato`;
  - un'eventuale descrizione o nota.
- Le tipologie inizialmente previste sono:
  - conto corrente bancario;
  - cassa;
  - conto postale;
  - altro.
- La tipologia ha funzione classificatoria e non modifica le regole di calcolo del saldo.
- Due conti esistenti non possono condividere lo stesso codice operativo; il confronto ignora gli spazi iniziali e finali e non distingue tra lettere maiuscole e minuscole.
- Il codice operativo può essere modificato anche dopo che il conto è stato utilizzato da uno o più movimenti.
- La modifica del codice:
  - non cambia l'identità tecnica del conto;
  - conserva tutti i movimenti e gli altri riferimenti esistenti;
  - libera il codice precedente, che può essere assegnato a un altro conto;
  - aggiorna la rappresentazione del conto nei dettagli e nei resoconti, compresi quelli relativi a periodi precedenti.
- Il riutilizzo di un codice precedentemente liberato non crea alcuna continuità tra i conti coinvolti, che rimangono distinti mediante le rispettive identità tecniche.
- Denominazione, tipologia e descrizione possono essere modificate senza cambiare l'identità del conto.
- Codice operativo, denominazione, tipologia e descrizione non sono storicizzati: i dettagli e i resoconti utilizzano sempre i valori correnti del conto.
- Il saldo iniziale può essere modificato senza cambiare l'identità del conto; la modifica ricalcola tutti i saldi e i risultati derivati, compresi quelli relativi a periodi precedenti.
- Prima di modificare il saldo iniziale, il sistema informa l'operatore degli effetti sui saldi e sui resoconti relativi ai periodi precedenti e ne richiede la conferma.
- Un conto associato ad almeno un movimento o a qualsiasi altro riferimento persistente non può essere eliminato, ma soltanto disattivato.
- Quando tutti i movimenti e gli altri riferimenti associati sono stati rimossi, il conto può essere eliminato fisicamente; l'eliminazione libera il relativo codice operativo.
- Un conto disattivato:
  - non può essere selezionato per nuovi movimenti;
  - conserva tutti i movimenti già registrati;
  - continua a concorrere ai saldi e ai resoconti;
  - può essere riattivato;
  - può mantenere un saldo diverso da zero.
- La disattivazione non elimina né modifica eventuali movimenti con data contabile futura già registrati, ma il sistema avvisa l'operatore della loro presenza.
- Un movimento esistente può essere modificato mantenendo il conto disattivato già associato, purché il conto non venga sostituito con un altro conto disattivato.
- Quando un conto viene selezionato per la registrazione di un movimento oppure sostituisce il conto associato a un movimento esistente, deve essere attivo in quel momento; lo stato del conto non dipende dalla data contabile del movimento.
- La disattivazione o la modifica dei dati del conto non altera le categorie di spesa, le voci contabili, le quote associate alle fatture o le altre classificazioni dei movimenti esistenti.
- Tutte le variazioni che incidono sui valori contabili aggiornano atomicamente il saldo del conto, i saldi delle voci e le aggregazioni delle categorie interessate.

#### Saldo dei conti finanziari

- Ogni conto finanziario possiede un saldo iniziale, che può essere positivo, pari a zero oppure negativo.
- Al saldo iniziale non viene attribuita alcuna data di decorrenza: esso costituisce la base del saldo del conto per qualsiasi data selezionata.
- Il **saldo alla data** è calcolato sommando al saldo iniziale gli effetti di tutti i movimenti aventi data contabile minore o uguale alla data selezionata:
  - le entrate incrementano il saldo;
  - le uscite lo riducono;
  - i giroconti producono gli effetti definiti sui conti di origine e di destinazione;
  - gli eventuali costi di trasferimento riducono il saldo del conto al quale sono attribuiti.
- Nel saldo alla data sono quindi compresi anche tutti i movimenti registrati nella data selezionata.
- La data utilizzata per il calcolo viene scelta esplicitamente dall'operatore e può essere passata, coincidere con la data corrente oppure essere futura.
- Il **saldo previsto** è calcolato sommando al saldo iniziale gli effetti di tutti i movimenti già registrati, senza limitarli rispetto a una data; comprende quindi anche i movimenti con data contabile futura.
- Per ogni movimento rileva esclusivamente la data contabile; la data di inserimento o modifica non influenza il calcolo.
- Il saldo di un conto può assumere valori negativi. La registrazione di un movimento non viene impedita per insufficienza del saldo.
- L'inserimento, la modifica o l'eliminazione di un movimento aggiorna atomicamente i saldi di tutti i conti interessati.
- La modifica della data contabile di un movimento modifica i saldi alla data per i periodi interessati, senza alterarne l'inclusione nel saldo previsto.
- La modifica del saldo iniziale aggiorna il saldo alla data, il saldo previsto e tutti i resoconti del conto.

### Date, orari e fusi operativi

#### Distinzione tra date civili, orari di dominio e istanti tecnici

- Le informazioni temporali vengono distinte in:
  - date civili prive di orario e di fuso;
  - date e ore di dominio che rappresentano un momento operativo o economico;
  - istanti tecnici generati automaticamente dal sistema.
- Sono date civili prive di fuso almeno:
  - la data della fattura;
  - la data contabile dei movimenti;
  - le date utilizzate per il calcolo dei saldi;
  - le decorrenze giornaliere delle regole riferite all'intera fattura;
  - le date del calendario delle festività.
- Una data civile non rappresenta la mezzanotte di un determinato fuso e non viene convertita in UTC.
- Sono date e ore di dominio almeno:
  - gli istanti delle operazioni nave e delle prestazioni;
  - gli istanti di partenza e di arrivo degli spostamenti;
  - gli istanti delle movimentazioni merci;
  - le decorrenze delle tariffe;
  - le decorrenze delle regole economiche riferite alle singole prestazioni;
  - le decorrenze delle versioni anagrafiche.
- Le date e le ore operative ed economiche hanno precisione al minuto; secondi e frazioni di secondo non vengono inseriti né utilizzati nei relativi confronti.
- Gli istanti tecnici, come creazione, ultima modifica ed emissione effettiva, vengono conservati in UTC e possono avere precisione fino al millisecondo; non partecipano ai calcoli di dominio salvo quando una regola li richiama espressamente.

#### Fuso aziendale e fusi dei porti

- L'applicazione possiede un fuso aziendale di riferimento, identificato mediante un `ZoneId` IANA e inizialmente impostato a `Europe/Rome`.
- Il fuso aziendale ha una funzione amministrativa, di visualizzazione e di aggregazione; non costituisce il fuso operativo delle attività portuali.
- Ogni porto possiede un proprio fuso operativo IANA, inizialmente valorizzato con il fuso aziendale applicabile al momento della creazione del porto.
- Il fuso operativo rimane collegato al porto ma possiede una propria sequenza temporale autonoma; non cambia automaticamente quando viene modificato il fuso aziendale o un altro dato anagrafico del porto.
- Il sistema non utilizza implicitamente il fuso del sistema operativo, dell'ambiente di esecuzione o della sessione del database per interpretare i dati di dominio.
- Il fuso aziendale viene utilizzato per:
  - determinare la data corrente mostrata dall'applicazione;
  - interpretare le decorrenze temporali non riferibili a uno specifico porto, comprese quelle delle versioni anagrafiche generali;
  - visualizzare gli istanti tecnici nelle funzioni amministrative generali;
  - definire, quando richiesto dal relativo resoconto, una giornata comune per aggregazioni amministrative tra più porti.
- Il fuso del porto costituisce invece la fonte temporale operativa e viene utilizzato per:
  - interpretare operazioni nave, prestazioni e movimentazioni merci svolte nel porto;
  - interpretare la decorrenza delle relative tariffe;
  - determinare giorno di calendario, festività e ora locale utilizzata dalle condizioni orarie delle regole;
  - valutare le regole economiche della singola prestazione rispetto all'ora locale dell'attività.
- Quando un momento di dominio è riferibile a un porto, il sistema non utilizza mai il fuso aziendale come valore sostitutivo. Se il porto competente non può essere derivato, deve essere richiesto all'operatore oppure il salvataggio deve essere impedito.
- In particolare:
  - per un'entrata, il fuso deriva dal porto che deve essere selezionato quando la nave non possiede una posizione corrente;
  - per un'uscita, il fuso deriva dal porto nel quale si trova la nave;
  - per uno spostamento tra banchine dello stesso porto, entrambi gli estremi utilizzano il fuso di quel porto;
  - per uno spostamento tra porti, la partenza utilizza il fuso del porto di origine e l'arrivo quello del porto di destinazione.
- Durata, ordine e confronti tra momenti appartenenti anche a porti differenti utilizzano i corrispondenti istanti UTC.
- Un'eventuale rappresentazione o aggregazione nel fuso aziendale non modifica il valore locale, il fuso, l'offset o l'istante UTC conservati per l'operazione portuale.

#### Rappresentazione degli istanti di dominio

- Per ogni data e ora di dominio che rappresenta un momento preciso vengono conservati:
  - la data e l'ora locale inserite;
  - il `ZoneId` utilizzato;
  - l'offset applicabile in quel momento;
  - il corrispondente istante UTC.
- L'istante UTC costituisce il riferimento canonico per ordinamento, durata e confronto tra momenti precisi.
- Il valore locale, il fuso e l'offset conservati permettono di riprodurre il significato originario dell'inserimento e non vengono rideterminati automaticamente in seguito a cambiamenti della configurazione o delle regole internazionali dei fusi.
- Gli aggiornamenti delle regole IANA vengono utilizzati per risolvere i nuovi inserimenti, ma non reinterpretano i riferimenti temporali già conservati.
- Le interfacce operative mostrano normalmente la data e l'ora locale, rendendo visibili anche fuso o offset quando necessari a evitare ambiguità.
- Nella prima versione dell'applicazione non è previsto un fuso personale o di sessione: i momenti di dominio vengono mostrati nel proprio fuso conservato e gli istanti tecnici nel fuso aziendale applicabile alla consultazione.
- Le esportazioni dei momenti precisi riportano separatamente valore locale, `ZoneId`, offset e istante UTC; le date civili vengono invece esportate come sole date.

#### Ora solare e ora legale

- Il passaggio tra ora solare e ora legale viene determinato mediante le regole del `ZoneId` applicabile.
- Un'ora locale inesistente a causa dell'avanzamento dell'orologio non può essere registrata; il sistema richiede l'indicazione di un orario valido.
- Quando un'ora locale ricorre due volte durante il ritorno all'ora solare, l'operatore deve scegliere esplicitamente la prima o la seconda occorrenza.
- La scelta viene conservata mediante l'offset e l'istante UTC e non viene reinterpretata successivamente.
- Due estremi di operazioni nave aventi lo stesso minuto locale nelle due diverse occorrenze dell'ora ambigua rappresentano momenti distinti; il vincolo di unicità temporale viene verificato sul minuto dell'istante UTC risolto.
- Eventuali salti o sovrapposizioni dell'ora locale prodotti dalla decorrenza di una nuova versione configurata del fuso seguono le stesse regole: le ore inesistenti vengono respinte e quelle ambigue richiedono la scelta esplicita dell'offset.

#### Versioni dei fusi e cambi ordinari

- Il fuso aziendale e il fuso di ciascun porto possiedono una versione iniziale priva di limite temporale inferiore e possono essere modificati mediante versioni successive con decorrenza temporale.
- La versione iniziale garantisce che esista sempre un fuso applicabile e non può essere eliminata.
- Ogni nuova versione specifica un `ZoneId` IANA e una decorrenza rappresentata mediante un momento univoco completo di offset.
- L'interfaccia propone la decorrenza nel fuso precedentemente applicabile, ma la registra soltanto dopo che data, ora e offset identificano un istante univoco.
- Le versioni definiscono quale fuso utilizzare per risolvere i nuovi inserimenti, senza modificare gli elementi già registrati.
- Quando viene registrato un nuovo elemento, il sistema individua la versione del fuso applicabile, risolve il valore locale e conserva stabilmente valore locale, fuso, offset e istante UTC.
- Un elemento già registrato, compreso un elemento con data futura, conserva i valori temporali originariamente risolti anche quando viene successivamente introdotta una nuova versione del fuso.
- Il cambio ordinario del fuso produce quindi effetti soltanto sui nuovi inserimenti e non avvia ricalcoli o reinterpretazioni dello storico.
- Una versione inserita retroattivamente viene utilizzata per i nuovi inserimenti ricadenti nel relativo intervallo, senza modificare quelli preesistenti.
- Gli intervalli delle versioni sono considerati con inizio incluso e fine esclusa; una versione diventa applicabile esattamente dalla propria decorrenza.

#### Modifica delle versioni e degli elementi temporali

- Una versione futura che non è mai stata utilizzata per risolvere alcun elemento può essere modificata o eliminata direttamente, nel rispetto della continuità e dell'univocità della sequenza.
- Una versione già utilizzata, anche soltanto da elementi futuri, non può essere modificata o eliminata direttamente e richiede la procedura di correzione del fuso.
- La modifica di dati non temporali di un elemento conserva valore locale, `ZoneId`, offset e istante UTC originari.
- La modifica della data, dell'ora, del porto o di un altro dato che determina il fuso avvia invece una nuova risoluzione mediante la versione applicabile e sostituisce atomicamente tutti i riferimenti temporali.
- La nuova risoluzione è soggetta ai vincoli di sequenza, consolidamento e immutabilità delle fatture già emesse.

#### Correzione di un fuso errato

- La correzione di un fuso configurato erroneamente costituisce un'operazione distinta dal cambio ordinario.
- La correzione conserva, per gli elementi interessati, la data e l'ora locale inserite e ridetermina fuso, offset e istante UTC.
- Prima della conferma, il sistema mostra almeno:
  - la configurazione precedente e quella corretta;
  - l'intervallo temporale interessato;
  - tutti gli elementi che cambierebbero istante, ordinamento, attribuzione o risultato economico;
  - gli eventuali elementi consolidati che impediscono l'operazione.
- La correzione può aggiornare soltanto elementi non consolidati e quelli appartenenti esclusivamente a fatture nello stato `in immissione`.
- La correzione viene bloccata se modificherebbe direttamente o indirettamente qualsiasi dato o risultato appartenente a una fattura nello stato `emessa`, `parzialmente saldata` o `saldata`.
- Il controllo, la variazione della configurazione, la reinterpretazione degli elementi consentiti e tutti i ricalcoli conseguenti vengono applicati atomicamente.
- Se la correzione non è consentita, nessuna modifica parziale viene applicata e il sistema indica gli elementi che la impediscono.

#### Uso delle date civili

- La data corrente, il cambio di giornata e l'anno corrente dell'applicazione vengono determinati mediante il fuso aziendale applicabile.
- La data della fattura e la data contabile mantengono il proprio valore civile anche quando il fuso aziendale viene modificato.
- Il saldo alla data comprende i movimenti aventi data contabile minore o uguale alla data selezionata, senza conversioni di fuso.
- L'anno dell'identificativo della fattura continua a derivare esclusivamente dalla data civile della fattura.
- Le regole riferite all'intera fattura vengono selezionate mediante la data civile della fattura e non mediante l'istante effettivo di emissione.

### Tracciabilità e storicizzazione temporale

- Ogni elemento persistente conserva almeno:
  - la data e l'ora effettive di creazione;
  - la data e l'ora dell'ultima modifica.
- Queste informazioni:
  - vengono generate automaticamente dal sistema;
  - non sono modificabili dall'operatore;
  - sono indipendenti dalle date aventi significato nel dominio, come la data contabile, la data della fattura o la decorrenza di una tariffa;
  - non partecipano ai calcoli economici o contabili.
- Gli istanti tecnici vengono conservati in UTC e visualizzati secondo il fuso aziendale applicabile, senza dipendere dal fuso configurato nel sistema operativo.
- Nella prima versione non viene registrato l'autore della modifica, poiché non sono previsti autenticazione, utenti o ruoli.
- Non viene mantenuto uno storico dettagliato delle modifiche per le entità operative, economiche o contabili, comprese:
  - viaggi, visite e ormeggi;
  - prestazioni e operazioni nave;
  - fatture;
  - movimenti;
  - categorie di spesa e voci contabili.
- Non vengono storicizzate autonomamente le modifiche automatiche prodotte dal sistema, come ricalcoli, aggiornamenti di stato o ricostruzioni della sequenza operativa.
- Le modifiche temporali ai dati vengono storicizzate esclusivamente per le entità anagrafiche:
  - navi;
  - clienti;
  - agenzie;
  - porti;
  - banchine;
  - merci.
- Il fuso operativo del porto è una configurazione temporale autonoma e non appartiene alle versioni anagrafiche descrittive del porto.
- Ogni anagrafica mantiene un'identità tecnica stabile, comune a tutte le proprie versioni temporali.
- La versione iniziale contiene i valori originari dell'anagrafica e non possiede una data e un'ora di decorrenza.
- La versione iniziale è applicabile senza limite temporale inferiore e rimane valida fino alla decorrenza dell'eventuale prima versione successiva.
- Ogni versione successiva specifica i nuovi valori applicabili e la data e l'ora dalle quali essi sostituiscono quelli della versione precedente.
- La versione applicabile a un'attività è quella valida alla data e all'ora rilevanti per l'attività stessa.
- Quando un dato anagrafico partecipa a un calcolo o alla ricostruzione di un'attività, il sistema utilizza il valore valido nel momento al quale il calcolo o l'attività si riferiscono.
- In particolare, la tipologia e la dimensione della nave vengono determinate in base alla versione anagrafica valida alla data e all'ora della prestazione o della componente economica considerata.
- Ad esempio, se la dimensione di una nave è pari a `1.000` fino alla decorrenza `X` e diventa pari a `2.000` dalla decorrenza `X`, le attività precedenti a `X` utilizzano la dimensione `1.000`, mentre quelle coincidenti con `X` o successive utilizzano la dimensione `2.000`.
- Le variazioni descrittive o identificative vengono conservate nella sequenza temporale dell'anagrafica anche quando non partecipano a regole economiche od operative.

#### Rappresentazione dei dati anagrafici storici

- Viaggi, visite, ormeggi, prestazioni e movimentazioni mostrano i dati della versione anagrafica valida alla propria data e ora di riferimento.
- Una versione con decorrenza successiva non modifica la rappresentazione degli elementi precedenti. Le eventuali variazioni retroattive seguono invece le regole di ricalcolo e consolidamento previste per l'inserimento, la modifica e l'eliminazione delle versioni.
- Le consultazioni e i resoconti riferiti a un periodo passato utilizzano le versioni anagrafiche valide nel periodo analizzato e non la versione corrente al momento della consultazione.
- Se, nel periodo analizzato, la stessa identità anagrafica è rappresentata da più versioni:
  - può comparire con denominazioni o dati differenti nei singoli elementi o intervalli temporali;
  - rimane un'unica identità ai fini dei raggruppamenti;
  - viene distinta per versione soltanto quando l'operatore sceglie esplicitamente tale modalità di rappresentazione.
- Nella gestione delle anagrafiche viene mostrata per impostazione predefinita la versione valida nel momento corrente, mantenendo accessibile l'intera cronologia delle versioni.
- Nel dettaglio di un elemento storico viene mostrata la versione anagrafica applicabile alla data e all'ora dell'elemento. L'interfaccia può inoltre segnalare che esiste una versione corrente differente, senza sostituirla a quella storica.

Per le fatture si applicano inoltre le seguenti regole:

- Finché la fattura si trova nello stato `in immissione`, i dati anagrafici seguono le normali regole temporali e vengono aggiornati o ricalcolati quando cambia una versione applicabile.
- Al momento dell'emissione vengono consolidati:
  - per il cliente e l'agenzia, i dati della versione valida alla data e all'ora effettive di emissione;
  - per nave, porto, banchina e merce, i dati delle versioni valide alla data e all'ora della prestazione o dell'altro elemento fatturato al quale si riferiscono;
  - per le prestazioni, i dati strutturali ed economici utilizzati nella fattura;
  - tutti i dati anagrafici effettivamente riportati nel documento.
- Ogni ristampa o successiva visualizzazione della fattura riproduce i dati strutturali, anagrafici ed economici consolidati al momento dell'emissione, anche quando nel frattempo sono diventate applicabili versioni differenti.
- Le note, espressamente escluse dal consolidamento, vengono invece mostrate nel loro valore corrente quando sono incluse nella visualizzazione o nella ristampa.
- Rimane vietata qualsiasi variazione delle versioni anagrafiche che modificherebbe dati o risultati utilizzati da una fattura nello stato `emessa`, `parzialmente saldata` o `saldata`.
- Se una fattura emessa viene riportata nello stato `in immissione`, quando consentito, i dati anagrafici cessano di essere consolidati e vengono nuovamente determinati secondo le versioni applicabili; una successiva emissione consolida i dati risultanti in quel momento.

Le categorie di spesa, le voci contabili e i conti finanziari non possiedono versioni temporali e sono esclusi da questa logica. Nei relativi dettagli e resoconti continuano a essere rappresentati mediante i dati correnti, secondo le rispettive regole.

#### Attivazione e disattivazione delle anagrafiche

- Ogni anagrafica possiede un unico stato corrente:
  - `attiva`;
  - `disattivata`.
- Lo stato appartiene all'intera identità anagrafica e non alle singole versioni temporali.
- La creazione di un'anagrafica assegna inizialmente lo stato `attiva`.
- Disattivazione e riattivazione:
  - producono effetto immediato;
  - non possiedono una decorrenza;
  - non generano versioni anagrafiche;
  - non modificano gli intervalli temporali dei dati anagrafici.
- Un'anagrafica disattivata viene nascosta da qualsiasi menu, elenco o funzione di selezione utilizzata per:
  - creare un nuovo riferimento;
  - aggiungere un'associazione;
  - sostituire un riferimento esistente.
- L'anagrafica disattivata non deve comparire nel menu neppure come opzione non selezionabile.
- L'esclusione dai menu dipende esclusivamente dallo stato corrente e si applica indipendentemente dalla data passata, corrente o futura dell'elemento da registrare.
- I controlli applicativi devono impedire l'attribuzione di un'anagrafica disattivata anche quando l'operazione non proviene direttamente da un menu dell'interfaccia.
- La disattivazione conserva tutti i riferimenti già esistenti.
- Gli elementi già associati all'anagrafica:
  - mantengono il riferimento;
  - continuano a mostrarne i dati;
  - rimangono consultabili;
  - non vengono modificati, ricalcolati o invalidati.
- Quando un'anagrafica disattivata costituisce il valore già attribuito a un elemento:
  - il valore rimane visibile nel dettaglio dell'elemento;
  - può essere conservato durante la modifica degli altri dati;
  - non viene incluso tra le opzioni disponibili se l'operatore decide di sostituirlo.
- Il riferimento può essere rimosso quando le regole dell'elemento lo consentono. Dopo la rimozione, l'anagrafica disattivata non può essere nuovamente selezionata finché non viene riattivata.
- L'anagrafica disattivata rimane visibile:
  - nella gestione delle anagrafiche;
  - nelle ricerche e consultazioni storiche;
  - nei resoconti;
  - negli elementi che già la referenziano.
- La disattivazione non è impedita dalla presenza di elementi collegati a fatture già emesse, poiché non ne modifica riferimenti, dati o risultati consolidati.
- La riattivazione rende immediatamente l'anagrafica nuovamente visibile e selezionabile nei menu pertinenti.
- La riattivazione non modifica gli elementi esistenti e non ricrea associazioni precedentemente rimosse.
- Il cambio di stato aggiorna soltanto lo stato corrente e la data e l'ora tecnica dell'ultima modifica.
- Non viene conservata una sequenza temporale degli stati precedenti.
- L'eliminazione fisica rimane distinta dalla disattivazione ed è consentita soltanto in assenza di qualsiasi riferimento persistente.

#### Inserimento delle versioni anagrafiche

- La creazione di un'anagrafica produce una nuova identità tecnica stabile e la relativa versione iniziale priva di decorrenza.
- Dopo la creazione possono essere inserite ulteriori versioni con decorrenza:
  - passata, per registrare retroattivamente una variazione;
  - compresa tra due versioni esistenti;
  - successiva a tutte le versioni esistenti;
  - futura, per pianificare una variazione non ancora applicabile.
- Due versioni successive della stessa anagrafica non possono condividere la medesima data e ora di decorrenza.
- L'inserimento di una versione ridefinisce automaticamente gli intervalli di validità:
  - la versione precedente rimane applicabile fino alla nuova decorrenza esclusa;
  - la nuova versione è applicabile dalla propria decorrenza inclusa fino alla decorrenza esclusa dell'eventuale versione successiva;
  - in assenza di una versione successiva, rimane valida senza limite finale.
- La versione iniziale garantisce che, per qualsiasi istante precedente alla prima variazione, esista sempre una versione applicabile.
- Per ogni istante deve risultare applicabile una sola versione dell'anagrafica, senza sovrapposizioni o intervalli privi di valori.
- Prima dell'inserimento, il sistema individua tutti gli elementi operativi ed economici ai quali la nuova versione diventerebbe applicabile, compresi quelli con data futura già registrati.
- L'inserimento è consentito soltanto se non comporta alcun cambiamento, diretto o indiretto, a elementi collegati a una fattura già emessa.
- Il vincolo comprende qualsiasi modifica dei dati o dei risultati consolidati, inclusi:
  - l'importo calcolato di una prestazione;
  - la tariffa o lo scaglione applicabile;
  - il cliente o l'agenzia determinati;
  - i dati anagrafici utilizzati;
  - le associazioni o le ricostruzioni operative dipendenti dall'anagrafica.
- La presenza, nell'intervallo interessato, di elementi collegati a fatture già emesse non impedisce di per sé l'inserimento, se la nuova versione produce per essi gli stessi dati e gli stessi risultati già consolidati.
- Gli elementi non fatturati o collegati esclusivamente a fatture nello stato `in immissione` vengono ricalcolati utilizzando la nuova sequenza temporale.
- Una versione con decorrenza futura non modifica gli elementi precedenti alla propria decorrenza, ma viene applicata agli eventuali elementi futuri già registrati che ricadono nel relativo intervallo.
- Prima della conferma, il sistema mostra:
  - l'intervallo temporale interessato;
  - gli elementi che verranno ricalcolati;
  - gli eventuali elementi collegati a fatture già emesse che impediscono l'operazione.
- Il controllo, l'inserimento della versione, la ridefinizione degli intervalli e tutti i ricalcoli conseguenti avvengono atomicamente.
- Se anche un solo elemento consolidato verrebbe modificato, nessuna variazione viene applicata.

#### Modifica delle versioni anagrafiche

- Una versione anagrafica già registrata può essere modificata nei valori che contiene.
- La data e l'ora di decorrenza possono essere modificate esclusivamente per le versioni successive a quella iniziale, che non possiede una decorrenza.
- La modifica della decorrenza ridefinisce automaticamente gli intervalli di validità della versione modificata e delle versioni adiacenti, senza creare sovrapposizioni o intervalli ambigui.
- Prima di applicare la modifica, il sistema determina quali elementi operativi ed economici verrebbero interessati, utilizzando per ciascuno la relativa data e ora di riferimento.
- La modifica è consentita soltanto se non comporta alcun cambiamento a elementi collegati a una fattura già emessa.
- Il vincolo comprende qualsiasi variazione dei dati o dei risultati consolidati, inclusi:
  - l'importo calcolato di una prestazione;
  - la tariffa o lo scaglione applicabile;
  - i dati anagrafici utilizzati dall'elemento;
  - le associazioni o le ricostruzioni operative dipendenti dall'anagrafica.
- La modifica viene bloccata anche quando interessa indirettamente un elemento fatturato, ad esempio spostando la decorrenza di una versione e rendendo applicabile una versione differente alla data della prestazione.
- La modifica è invece consentita quando:
  - interessa esclusivamente elementi non associati a fatture;
  - interessa elementi associati soltanto a fatture ancora nello stato `in immissione`;
  - coinvolge temporalmente elementi collegati a fatture emesse, ma non modifica alcun dato o risultato da essi utilizzato.
- Gli elementi non ancora consolidati interessati dalla variazione vengono ricalcolati utilizzando la nuova sequenza temporale delle versioni anagrafiche.
- Il controllo, la modifica delle versioni e il ricalcolo degli elementi interessati avvengono atomicamente.
- Se la modifica non è consentita, il sistema indica quali elementi collegati a fatture emesse impediscono l'operazione, senza applicare modifiche parziali.
- Tariffe, pesi dei tipi di prestazione e regole economiche continuano a possedere proprie versioni con decorrenza temporale, poiché la loro validità nel tempo costituisce una regola di dominio e non uno storico tecnico delle modifiche.

#### Eliminazione delle versioni anagrafiche

- Una versione anagrafica successiva a quella iniziale può essere eliminata.
- L'eliminazione equivale a considerare mai avvenuta la variazione rappresentata dalla versione.
- Non possono essere eliminate:
  - la versione iniziale dell'anagrafica;
  - l'unica versione esistente.
- La versione iniziale può essere corretta nei valori applicando le normali regole di modifica, ma non può ricevere una decorrenza. L'eliminazione dell'intera anagrafica rimane un'operazione distinta.
- Eliminando una versione:
  - la versione precedente estende la propria validità fino alla decorrenza dell'eventuale versione successiva;
  - se non esiste una versione successiva, la versione precedente torna valida senza limite finale;
  - non devono risultare sovrapposizioni o intervalli temporali privi di una versione applicabile.
- Prima dell'eliminazione, il sistema determina tutti gli elementi operativi ed economici ai quali diventerebbe applicabile una versione differente.
- L'eliminazione è consentita soltanto se non comporta alcun cambiamento, diretto o indiretto, a elementi collegati a una fattura già emessa.
- Il vincolo si applica anche quando l'eliminazione modificherebbe:
  - un importo calcolato;
  - una tariffa o uno scaglione applicabile;
  - un dato anagrafico utilizzato;
  - un'associazione o una ricostruzione operativa dipendente dall'anagrafica.
- La presenza, nell'intervallo interessato, di elementi collegati a fatture già emesse non impedisce di per sé l'eliminazione, se la versione che diventerebbe applicabile produce gli stessi dati e gli stessi risultati consolidati.
- Gli elementi non fatturati o collegati esclusivamente a fatture nello stato `in immissione` vengono ricalcolati utilizzando la sequenza temporale risultante.
- Il controllo, l'eliminazione della versione, la ridefinizione degli intervalli e gli eventuali ricalcoli avvengono atomicamente.
- Se l'eliminazione viene bloccata, il sistema indica gli elementi collegati a fatture già emesse che sarebbero modificati.

#### Eliminazione delle anagrafiche

- Un'intera anagrafica può essere eliminata fisicamente soltanto quando non è più referenziata da alcun elemento persistente del dominio.
- Il controllo considera tutte le versioni temporali dell'anagrafica e qualsiasi riferimento diretto o indiretto proveniente da:
  - elementi operativi;
  - prestazioni e movimentazioni merci;
  - tariffe;
  - fatture;
  - movimenti contabili;
  - altre entità anagrafiche.
- La presenza di qualsiasi riferimento impedisce l'eliminazione, indipendentemente:
  - dallo stato dell'anagrafica;
  - dalla data del riferimento;
  - dal fatto che l'elemento collegato sia consolidato oppure ancora modificabile.
- In particolare, un riferimento proveniente da un elemento collegato a una fattura già emessa impedisce sempre l'eliminazione.
- Gli eventuali riferimenti appartenenti a elementi non consolidati non vengono rimossi automaticamente. L'operatore deve prima modificare o eliminare tali elementi, quando consentito dalle rispettive regole, e successivamente richiedere nuovamente l'eliminazione dell'anagrafica.
- Non sono previste eliminazioni a cascata. In particolare:
  - un porto non può essere eliminato finché possiede banchine, tariffe, visite o altri riferimenti;
  - una banchina non può essere eliminata finché è referenziata da ormeggi o operazioni;
  - una nave non può essere eliminata finché è referenziata da attività operative;
  - un cliente o un'agenzia non può essere eliminato finché è assegnato a elementi operativi, prestazioni, fatture o incassi;
  - una merce non può essere eliminata finché è utilizzata da una movimentazione.
- Quando l'eliminazione è consentita, vengono rimossi atomicamente:
  - l'identità anagrafica;
  - tutte le sue versioni temporali;
  - i relativi metadati tecnici.
- Poiché l'anagrafica eliminata non possiede riferimenti, l'operazione non determina ricalcoli, riattribuzioni o modifiche ad altri elementi.
- Il codice progressivo stabile dell'anagrafica eliminata non viene riutilizzato per una nuova identità.
- I dati identificativi liberati dall'eliminazione, come ragione sociale, nome di registrazione, denominazione o codice IMO, possono invece essere utilizzati per una nuova anagrafica, che riceve un nuovo codice progressivo e non mantiene alcuna continuità con quella eliminata.
- Se l'eliminazione non è consentita, il sistema indica gli elementi che la impediscono e propone la disattivazione come alternativa.
- La disattivazione rimane l'unica possibilità quando l'anagrafica deve essere conservata per riferimenti esistenti; è reversibile e non elimina l'identità né le versioni temporali.

### Resoconti dinamici

#### Dati elementari e semantica

- Il modello conserva le informazioni elementari necessarie a ricostruire dinamicamente i risultati e la relativa semantica, comprese almeno:
  - le date e gli istanti rilevanti;
  - gli importi originari, intermedi e definitivi;
  - i soggetti e le entità coinvolti;
  - le classificazioni applicate;
  - il tipo e lo stato delle operazioni;
  - le tariffe, gli scaglioni, le regole economiche e gli sconti effettivamente applicati;
  - gli identificativi stabili delle entità interessate.
- I resoconti sono esclusivamente consultivi e non possono modificare gli elementi dai quali derivano.
- Ogni esecuzione utilizza una vista coerente dei dati disponibili nel relativo istante di generazione e non può combinare valori appartenenti a momenti diversi di un aggiornamento.
- I risultati vengono ricalcolati a ogni esecuzione e non sono conservati come storico autonomo; soltanto i file esportati costituiscono rappresentazioni stabili dell'esecuzione che li ha generati.
- Campi, relazioni, misure e funzioni disponibili vengono esposti e controllati dall'applicazione.
- L'operatore non può inserire direttamente query, frammenti SQL o espressioni di calcolo arbitrarie.

#### Ambiti e granularità

- Ogni resoconto utilizza un solo ambito principale e una granularità esplicita, che determinano il significato di ciascuna riga.
- Gli ambiti inizialmente previsti sono:
  - `viaggi e permanenze`, con granularità per viaggio, visita oppure ormeggio;
  - `attività`, con granularità per prestazione oppure operazione nave;
  - `movimentazioni merci`, con granularità per singolo carico o scarico;
  - `fatturazione`, con granularità per fattura oppure riga di fattura;
  - `incassi e crediti`, con granularità per quota attribuita a una fattura oppure parte non attribuita di un incasso;
  - `conti finanziari`, con granularità per movimento o componente contabile di un giroconto;
  - `spese`, con granularità per movimento in uscita oppure costo di un giroconto;
  - `voci contabili`, con granularità per movimento associato a una specifica voce;
  - `calcoli economici`, con granularità per tariffa, scaglione, regola o passaggio di calcolo applicato.
- L'aggiunta di una colonna, di un filtro o di una misura non può cambiare implicitamente l'ambito o la granularità del resoconto.
- Una configurazione può utilizzare soltanto dimensioni e misure semanticamente compatibili con il proprio ambito e la propria granularità.

#### Collegamenti controllati tra ambiti

- I collegamenti tra elementi appartenenti ad ambiti differenti sono disponibili soltanto quando l'applicazione può preservarli senza moltiplicare le righe o duplicare gli importi.
- Sono previsti almeno i seguenti collegamenti controllati:
  - attività verso viaggio, visita, ormeggio, nave, porto, banchina, cliente e agenzia;
  - attività verso fattura e riga di fattura;
  - fattura verso quote incassate e relativi movimenti;
  - movimento verso conto, categoria di spesa e voci contabili;
  - importo calcolato verso tariffa, scaglione, regole e sconti applicati.
- Il sistema impedisce le combinazioni che conterebbero più volte lo stesso valore.
- In particolare:
  - il totale di una fattura non può essere sommato al totale delle righe che la compongono;
  - l'importo di un movimento non viene duplicato quando è ripartito tra più fatture;
  - le quote attribuite alle fatture e la parte non attribuita dell'incasso vengono rappresentate separatamente;
  - le voci contabili non possono essere aggregate tra loro.
- Quando un collegamento non è compatibile con la granularità scelta, può essere mostrato soltanto mediante una consultazione separata degli elementi sottostanti.

#### Dimensioni, filtri e ordinamenti

- Le dimensioni disponibili, quando compatibili con l'ambito, comprendono almeno:
  - giorno, settimana, mese, trimestre e anno;
  - porto e banchina;
  - nave, tipologia e dimensione della nave;
  - viaggio, visita e ormeggio;
  - tipo e stato della prestazione o dell'operazione;
  - cliente e agenzia;
  - tariffa, scaglione e regola economica;
  - fattura e relativo stato;
  - conto e tipologia di conto;
  - categoria di spesa e livello gerarchico;
  - singola voce contabile;
  - merce e tipo di movimentazione.
- I filtri disponibili dipendono dal tipo del campo e possono comprendere:
  - uguaglianza ed esclusione;
  - selezione multipla;
  - intervalli numerici, monetari o temporali;
  - presenza o assenza del valore;
  - ricerca testuale controllata;
  - stato attivo o disattivato.
- Ogni resoconto può definire più criteri di ordinamento con priorità esplicita.
- L'ordinamento deve essere deterministico anche quando più righe condividono tutti i valori selezionati, utilizzando infine un identificativo stabile come criterio tecnico.

#### Misure

- Le misure generali disponibili, quando semanticamente applicabili, comprendono:
  - conteggio;
  - conteggio distinto;
  - somma;
  - media;
  - minimo;
  - massimo.
- Le misure specifiche del dominio possono comprendere:
  - quantità di merce;
  - importo originario;
  - maggiorazioni e riduzioni;
  - sconti manuali e sconti derivanti da regole;
  - importo netto;
  - totale fatturato;
  - importo incassato e residuo;
  - entrate, uscite e saldo;
  - costi dei giroconti;
  - durata di viaggi, visite e ormeggi quando determinabile.
- Le quantità delle merci possono essere aggregate soltanto nell'ambito della stessa merce; nella prima versione non viene prodotto un totale tra merci differenti, poiché non è gestita un'unità di misura esplicita.
- Per un viaggio, una visita o un ormeggio ancora aperti, la durata viene calcolata fino a un istante di riferimento esplicito della configurazione, inizialmente coincidente con l'istante corrente.
- L'istante di riferimento utilizzato per le durate aperte viene mostrato nel resoconto e conservato nell'esportazione.
- Ogni misura specifica la propria granularità e non può essere applicata a righe che ne altererebbero il significato.
- I totali e le aggregazioni si riferiscono all'intero risultato filtrato, non soltanto alla pagina visualizzata.

#### Regole contabili dei resoconti

- Nei resoconti aziendali il capitale trasferito mediante giroconto rimane neutrale.
- Nei resoconti del singolo conto vengono invece mostrati l'addebito e l'accredito prodotti dal trasferimento.
- L'eventuale costo del giroconto viene considerato una spesa e partecipa alle relative categorie e voci.
- Il totale di una categoria di spesa comprende i movimenti associati direttamente alla categoria e quelli appartenenti alle categorie discendenti.
- Quando vengono mostrati contemporaneamente più livelli della gerarchia, lo stesso importo non può concorrere sia al totale del padre sia a un ulteriore totale complessivo dei figli.
- Ogni resoconto relativo alle voci contabili riguarda una singola voce.
- Più voci possono essere consultate o confrontate separatamente, ma non possono produrre un totale o un saldo trasversale.
- Quando lo stesso movimento appartiene a più voci, viene mostrato integralmente nella vista autonoma di ciascuna voce senza generare un'aggregazione comune.

#### Riferimenti temporali

- Ogni configurazione deve indicare il riferimento temporale utilizzato quando l'ambito offre più date o istanti possibili.
- Sono previsti almeno i seguenti riferimenti:
  - per le fatture, data civile del documento oppure istante effettivo di emissione;
  - per gli spostamenti, partenza oppure arrivo;
  - per gli incassi e gli altri movimenti, data contabile;
  - per le attività, istante economico;
  - per i saldi, data civile selezionata.
- Un intervallo espresso mediante date civili comprende sia la data iniziale sia quella finale.
- Un intervallo espresso mediante momenti precisi considera l'estremo iniziale incluso e quello finale escluso.
- I raggruppamenti delle attività utilizzano il giorno locale del porto determinato secondo le regole dei fusi operativi.
- Nei resoconti operativi comprendenti più porti può essere selezionato esplicitamente il calendario aziendale comune; in assenza di tale scelta ciascuna attività mantiene il giorno locale del proprio porto.
- I raggruppamenti amministrativi utilizzano le date civili e il fuso aziendale secondo la semantica del relativo campo.
- Gli elementi con data futura sono esclusi per impostazione predefinita e vengono inclusi soltanto mediante un filtro esplicito.

#### Rappresentazione dei dati storici

- Le entità anagrafiche vengono raggruppate per identità stabile anche quando, nel periodo analizzato, sono rappresentate da più versioni.
- Le righe di dettaglio mostrano l'etichetta e gli altri dati anagrafici storicamente applicabili alla data e all'ora del relativo elemento.
- Quando una riga aggregata comprende più versioni della stessa identità, mostra il codice stabile e la denominazione corrente e segnala la presenza di variazioni storiche.
- L'operatore può scegliere esplicitamente di separare le versioni della stessa anagrafica come dimensione del resoconto; in tal caso ciascuna versione utilizza la propria denominazione storica.
- Conti finanziari, categorie di spesa e voci contabili utilizzano i valori correnti, poiché non possiedono versioni temporali.
- Le fatture emesse utilizzano sempre i dati consolidati con l'emissione.

#### Configurazioni salvabili

- L'applicazione fornisce inizialmente configurazioni predefinite per:
  - permanenze e attività per porto;
  - movimentazioni merci;
  - fatturato;
  - crediti e incassi;
  - movimenti e saldi dei conti;
  - spese per categoria;
  - consultazione di una singola voce contabile;
  - dettaglio dei calcoli economici.
- Le configurazioni predefinite non possono essere rinominate, modificate o eliminate.
- L'operatore può variare i parametri di esecuzione di una configurazione predefinita, come periodo, porto, cliente o agenzia, senza modificarne la definizione salvata.
- Per conservare variazioni strutturali, filtri o parametri differenti deve duplicare la configurazione predefinita e creare una configurazione personalizzata.
- Ogni configurazione personalizzata conserva almeno:
  - un nome univoco;
  - l'ambito e la granularità;
  - il riferimento temporale;
  - le colonne e le misure;
  - i filtri;
  - i raggruppamenti;
  - gli ordinamenti;
  - le impostazioni di visualizzazione.
- Le configurazioni personalizzate possono essere duplicate, rinominate, modificate ed eliminate.
- Il nome di ogni configurazione personalizzata deve essere univoco nell'applicazione.
- Poiché nella prima versione non sono previsti utenti, tutte le configurazioni personalizzate sono disponibili globalmente nell'applicazione.
- Se una configurazione diventa incompatibile con il modello, viene conservata ma segnalata come non valida, non viene reinterpretata automaticamente e non può essere eseguita.
- Il sistema indica gli elementi incompatibili della configurazione, consentendo all'operatore di duplicarla, correggerla o eliminarla.

#### Consultazione ed esportazione

- Da ogni riga aggregata deve essere possibile consultare separatamente e in sola lettura gli elementi elementari che la compongono, mantenendo i medesimi filtri.
- L'eventuale modifica di un elemento richiede l'apertura della relativa funzione ordinaria ed è soggetta alle regole del proprio ambito.
- La paginazione e la sola visualizzazione non modificano totali, aggregazioni o ordinamento logico del risultato.
- Sono previste esportazioni tabellari nei formati `CSV` e `XLSX`; nella prima versione non è previsto un formato PDF generico per i resoconti.
- L'esportazione esegue nuovamente la configurazione su una vista coerente dei dati correnti e registra il proprio istante tecnico di generazione; può quindi differire da una precedente visualizzazione se nel frattempo i dati sono cambiati.
- L'esportazione comprende l'intero risultato filtrato, indipendentemente dalla pagina visualizzata, e richiede di scegliere esplicitamente tra risultato aggregato e dettaglio sottostante.
- Il file `XLSX` contiene almeno i fogli `Dati` e `Metadati`.
- L'esportazione `CSV` produce un archivio contenente `dati.csv` e `metadati.csv`, mantenendo il file dei dati esclusivamente tabellare.
- Ogni esportazione riporta o accompagna con metadati almeno:
  - il nome e l'ambito della configurazione;
  - i filtri applicati;
  - il riferimento temporale;
  - il fuso utilizzato quando rilevante;
  - l'istante tecnico di generazione.
- Date, istanti e valori monetari vengono esportati secondo la rispettiva precisione di dominio; la sola formattazione grafica non deve modificare il valore esportato.
- Se il risultato è vuoto, l'esportazione contiene comunque intestazioni e metadati.

#### Prestazioni e dati derivati

- Nella prima versione i risultati vengono calcolati dai dati elementari persistiti e non sono previste cache o proiezioni aggregate persistenti.
- Totali e risultati aggregati non vengono memorizzati come fonti primarie quando possono essere ricostruiti in modo affidabile.
- Eventuali indici, cache, viste dedicate o aggregazioni persistenti possono essere introdotti successivamente soltanto quando i volumi e le misurazioni delle prestazioni ne dimostrano la necessità.
- Ogni ottimizzazione costituisce un dato derivato e:
  - non può modificare il risultato semantico del resoconto;
  - deve poter essere ricostruita integralmente dai dati elementari;
  - deve essere invalidata o aggiornata quando cambiano i dati di origine;
  - non può sostituire i dati elementari come fonte autorevole.
- Quando un risultato utilizza una proiezione aggiornata in modo differito, il sistema ne indica lo stato di aggiornamento e non presenta come definitivo un dato non ancora allineato.

### Configurazioni generali, backup e ripristino

#### Inizializzazione e configurazioni tecniche

- L'applicazione utilizza una sola directory attiva contenente il database e le configurazioni persistenti necessarie al funzionamento.
- Nell'installazione portabile viene proposta una directory relativa alla cartella dell'applicazione, così lo spostamento dell'intera installazione mantiene validi i riferimenti interni.
- Al primo avvio l'operatore può scegliere una posizione differente, previa verifica di permessi, spazio disponibile e assenza di dati che verrebbero sovrascritti.
- Database, schema e valori iniziali vengono preparati e verificati in un'area temporanea prima di rendere attiva una nuova directory dati.
- Un archivio esistente viene riconosciuto e verificato senza essere sovrascritto; un archivio corrotto o incompatibile non viene sostituito automaticamente con un database vuoto.
- Dopo l'inizializzazione, la ricollocazione della directory dati richiede il trasferimento dell'intera installazione oppure un backup e un ripristino controllato nella nuova posizione.
- Le configurazioni generali comprendono soltanto impostazioni tecniche prive di una gestione di dominio dedicata, tra cui directory e politica dei backup automatici, numero di copie conservate, directory proposta per le esportazioni e preferenze di visualizzazione senza effetti economici o storici.
- Fusi, festività, tariffe, pesi, regole economiche, anagrafiche e classificazioni rimangono gestiti nelle rispettive funzioni e non possono essere modificati mediante un'impostazione tecnica generica.
- Le configurazioni generali sono globali, correnti e prive di versioni temporali o storico dettagliato; ogni modifica viene validata e applicata atomicamente.

#### Contenuto e formato del backup

- Il backup è una copia completa dello stato persistente e comprende:
  - database;
  - configurazioni generali;
  - configurazioni personalizzate dei resoconti;
  - identità, versioni e dati di dominio;
  - eventuali file persistenti gestiti dall'applicazione e non ricostruibili dal database;
  - manifesto tecnico e informazioni di compatibilità.
- Non comprende eseguibili, librerie, altri backup, esportazioni, file temporanei, cache o proiezioni ricostruibili e log non necessari al ripristino.
- Il backup è un archivio unico con formato ed estensione dedicati.
- Il manifesto contiene almeno identificativo, tipo, istante di creazione, versione dell'applicazione e dello schema, inventario dei componenti, dimensione e impronte di integrità.
- Gli istanti riportano sia il valore UTC sia la rappresentazione nel fuso aziendale applicabile.
- Nella prima versione il backup non è cifrato; l'operatore viene informato che cartella, dispositivo o volume di destinazione devono essere protetti da accessi non autorizzati.

#### Creazione e conservazione

- Ogni backup rappresenta una vista coerente dei dati; durante l'acquisizione dello stato vengono temporaneamente impedite nuove modifiche.
- L'archivio viene costruito in un file temporaneo e pubblicato atomicamente soltanto dopo avere verificato manifesto, impronte, leggibilità e consistenza del database contenuto.
- Un errore o un'interruzione non lascia un file parziale presentato come backup valido.
- L'operatore può creare in qualsiasi momento un backup manuale scegliendo la destinazione.
- Se i dati sono cambiati dopo l'ultimo backup riuscito, il sistema crea al massimo un backup automatico al giorno, dopo il controllo iniziale del database e prima della prima modifica della giornata.
- Non viene utilizzato un servizio esterno quando l'applicazione è chiusa.
- La directory dei backup automatici è configurabile; se si trova sullo stesso volume dei dati il sistema mostra un avviso e raccomanda una destinazione esterna.
- L'indisponibilità della directory automatica produce un avviso persistente ma non impedisce le registrazioni ordinarie.
- La politica iniziale conserva gli ultimi `30` backup automatici validi e applica la pulizia soltanto dopo la creazione verificata di una nuova copia.
- Backup manuali, backup `pre-ripristino`, file non riconosciuti e backup non validi non vengono eliminati automaticamente.
- L'operatore può eliminare esplicitamente un backup dopo una conferma che ne mostra tipo, data e percorso; l'applicazione non offre il recupero del file eliminato.

#### Inventario, integrità e compatibilità

- L'applicazione elenca i backup presenti nella directory configurata e consente di selezionare archivi da altre posizioni.
- Per ciascun archivio mostra almeno tipo, data e ora, versione dell'applicazione e dello schema, dimensione e stato di verifica.
- Gli stati distinguono almeno backup `valido`, `non ancora verificato`, `non valido` e `incompatibile con questa versione`.
- La verifica non modifica il file e controlla manifesto, impronte, leggibilità del database, vincoli strutturali e coerenza minima dei riferimenti.
- Un backup non valido rimane disponibile per la diagnosi e non viene corretto o eliminato automaticamente.
- Un backup con schema precedente può essere ripristinato soltanto quando l'applicazione corrente possiede tutte le migrazioni necessarie.
- Le migrazioni vengono applicate a una copia temporanea e non modificano il backup originale.
- Un backup prodotto da uno schema più recente dell'applicazione corrente non può essere ripristinato e non sono previsti downgrade automatici.

#### Ripristino completo e protezione dello stato corrente

- Il ripristino sostituisce l'intero stato persistente; non sono previsti ripristino parziale, fusione tra archivi o importazione selettiva di entità.
- Prima di sostituire dati esistenti il sistema deve:
  - verificare integralmente compatibilità e integrità del backup scelto;
  - mostrare origine, data, versione e contenuto generale;
  - creare e verificare obbligatoriamente un backup di sicurezza di tipo `pre-ripristino`;
  - richiedere una conferma esplicita.
- Se non è possibile creare il backup `pre-ripristino`, la sostituzione viene impedita; una nuova installazione priva di dati non richiede tale copia.
- Il ripristino avviene in modalità esclusiva e prepara, migra e verifica i dati in un'area temporanea prima della sostituzione atomica dell'archivio attivo.
- Fatture e altri elementi consolidati vengono ripristinati nei valori conservati dal backup, senza ricalcoli, riallineamenti o reinterpretazioni.
- Dopo la sostituzione vengono verificati schema, integrità strutturale e riferimenti; l'applicazione viene riavviata oppure riapre completamente il contesto dati prima di consentire nuove operazioni.
- Se l'errore avviene prima della sostituzione, lo stato corrente rimane invariato; se viene rilevato dopo, il sistema utilizza il backup `pre-ripristino` per ripristinare lo stato precedente.
- Un'interruzione viene rilevata all'avvio successivo e non determina mai l'inizializzazione automatica di un database vuoto.

#### Modalità protetta e trasferimento

- A ogni avvio il sistema controlla disponibilità del database, versione dello schema e assenza di procedure di ripristino incomplete.
- Se i controlli minimi non vengono superati, l'applicazione entra in modalità protetta, conserva i file esistenti e impedisce nuove scritture.
- In modalità protetta sono disponibili diagnosi, inventario dei backup, verifica e ripristino controllato; l'operatività ordinaria riprende soltanto dopo una verifica riuscita.
- Un archivio riconosciuto come corrotto non viene inserito nella rotazione dei backup automatici.
- Il trasferimento completo verso un'altra installazione compatibile utilizza backup e ripristino; i percorsi locali vengono rivalidati nell'ambiente di destinazione.
- Le esportazioni `CSV` e `XLSX` sono documenti parziali di consultazione o interoperabilità, non costituiscono backup e non possono essere utilizzate per ripristinare l'applicazione.
- La copia della sola directory del database mentre l'applicazione è in uso non è considerata un backup valido.
- Migrazione selettiva, unione tra archivi e importazione da altri sistemi non fanno parte della prima versione.

### Riepilogo finale del modello di dominio

#### Terminologia degli stati

- `aperto` e `chiuso` descrivono il ciclo operativo di viaggi, visite e ormeggi.
- `prevista`, `effettuata` e `mancata` descrivono lo stato di esecuzione delle prestazioni e delle operazioni nave.
- `in immissione`, `emessa`, `parzialmente saldata` e `saldata` descrivono il ciclo di vita della fattura.
- `attivo` o `attiva` e `disattivato` o `disattivata` descrivono la selezionabilità delle anagrafiche e l'applicabilità delle regole o configurazioni, secondo il genere dell'elemento. Lo stato è corrente per le anagrafiche e può variare temporalmente per le regole economiche.
- La disattivazione non equivale alla chiusura di un intervallo operativo né all'eliminazione fisica dell'elemento.

#### Entità e relazioni principali

| Dominio | Entità e relazioni |
| --- | --- |
| Anagrafico | Una nave può avere più viaggi. Un porto contiene più banchine e l'appartenenza della banchina al porto è immutabile. Cliente e agenzia sono soggetti distinti. Una merce può essere utilizzata da più movimentazioni. |
| Operativo | La struttura è `nave → viaggio → visita → ormeggio`. Ogni visita riguarda un porto e ogni ormeggio appartiene a una visita. Le operazioni nave costruiscono e modificano questa struttura; le altre prestazioni e le movimentazioni merci vi vengono attribuite temporalmente. |
| Tariffario | Ogni tariffa appartiene a un solo porto e contiene una configurazione completa per ogni tipologia di nave. Ogni configurazione contiene scaglioni ordinari, scaglione extra e tariffa extra. Ogni tipo di prestazione o operazione nave possiede la propria sequenza temporale di pesi. |
| Economico | Tariffa, scaglione, peso e regole economiche determinano l'importo della prestazione. Ogni regola possiede versioni temporali. Una fattura contiene una o più attività economiche e ogni prestazione o componente economica può appartenere al massimo a una fattura alla volta. Le componenti `uscita` ed `entrata` di uno spostamento tra porti sono fatturabili separatamente e l'operazione può quindi essere collegata a due fatture differenti. La fattura può inoltre riportare movimentazioni merci come informazioni prive di importo. Tutte le attività economiche presenti nella singola fattura condividono la stessa coppia cliente e agenzia. |
| Contabile | Un conto contiene più movimenti. Un giroconto collega due conti e può produrre un costo. Un'uscita e il costo di un giroconto appartengono a una categoria di spesa. Un movimento può essere associato per intero a più voci contabili, mantenute autonome. |
| Pagamenti | Un incasso può essere ripartito tra più fatture e una fattura può ricevere più incassi. La relazione è rappresentata da quote positive; la parte non attribuita rimane disponibile. Fattura e incasso devono condividere cliente e agenzia. |
| Temporale | Le identità anagrafiche, i pesi, le regole economiche e i fusi possiedono le rispettive sequenze temporali. Le tariffe formano una sequenza completa per porto. Gli istanti di dominio conservano valore locale, fuso, offset e istante UTC. |
| Resoconti | Una configurazione salvata definisce ambito, granularità, riferimento temporale, dimensioni, misure, filtri, raggruppamenti e ordinamenti. I risultati derivano dai dati elementari e rispettano le regole semantiche del dominio. |
| Configurazione e continuità | Le configurazioni tecniche sono globali e correnti. Il backup conserva l'intero stato persistente e il ripristino lo sostituisce atomicamente, proteggendo preventivamente i dati correnti. Esportazioni e backup rimangono funzioni distinte. |

#### Chiusura dell'analisi

- Le entità, le relazioni, gli stati e i vincoli necessari alla prima versione dell'applicazione sono definiti nel presente documento.
- Le evoluzioni esplicitamente indicate come future non fanno parte del perimetro iniziale e dovranno rispettare i vincoli di consolidamento e compatibilità qui stabiliti.
- Le successive fasi possono quindi utilizzare questa analisi come riferimento per modello dei dati, casi d'uso, architettura applicativa e progettazione dell'interfaccia.
