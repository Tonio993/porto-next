# Visione e roadmap del progetto

## 1. Scopo del documento

Questo documento costituisce il punto di ingresso al progetto della nuova applicazione gestionale destinata a un'azienda di ormeggiatori.

Riunisce in un solo elaborato:

- la visione del prodotto;
- gli obiettivi e il perimetro generale;
- i principi che guidano le decisioni successive;
- le fasi di progettazione e realizzazione;
- lo stato di avanzamento;
- i risultati attesi e i criteri di completamento;
- le dipendenze e la prossima attività.

La parte dedicata alla visione è relativamente stabile e viene aggiornata soltanto in caso di variazioni sostanziali del perimetro. La parte operativa della roadmap viene invece aggiornata quando una fase viene avviata, completata o modificata.

Il documento non sostituisce l'analisi del dominio, i requisiti funzionali o gli elaborati tecnici successivi: ne definisce il contesto comune e ne organizza la progressione.

## 2. Visione del prodotto

### 2.1 Contesto

Il progetto prevede la riscrittura completa dell'applicazione utilizzata per gestire le attività operative, economiche e contabili di un'azienda di ormeggiatori.

L'attività richiede di seguire nel tempo le navi presenti nei porti gestiti, registrare operazioni e prestazioni, determinare correttamente gli importi, emettere le fatture, attribuire gli incassi e rappresentare la situazione contabile.

Questi ambiti sono collegati: una modifica operativa può influire sull'attribuzione di una prestazione, sul calcolo economico e sulla composizione di una fattura. Allo stesso tempo, i documenti emessi e i dati storici devono rimanere protetti da variazioni successive.

La nuova applicazione deve quindi trattare il gestionale come un sistema unitario, evitando che le singole funzioni producano dati incoerenti o risultati non ricostruibili.

### 2.2 Prodotto atteso

La soluzione è un'applicazione desktop portabile, utilizzabile principalmente in locale e senza una dipendenza obbligatoria da Internet.

L'applicazione deve consentire all'operatore di gestire l'intero ciclo di lavoro:

1. mantenere le anagrafiche;
2. registrare la sequenza operativa delle navi;
3. attribuire prestazioni e movimentazioni merci al corretto contesto;
4. calcolare gli importi mediante tariffe, pesi e regole economiche;
5. comporre, emettere e conservare le fatture;
6. registrare movimenti contabili e ripartire gli incassi;
7. consultare ed esportare dati e resoconti;
8. proteggere e trasferire l'archivio mediante backup e ripristino.

Il sistema deve privilegiare correttezza, comprensibilità e conservazione della storia rispetto a semplificazioni che renderebbero ambigui i dati o i calcoli.

### 2.3 Obiettivi principali

- **Gestione unificata:** raccogliere in una sola applicazione i processi operativi, tariffari, amministrativi e contabili, mantenendo esplicite le relazioni tra le informazioni.
- **Coerenza dei dati:** impedire sequenze invalide, riferimenti incompatibili, calcoli incompleti e aggiornamenti parziali.
- **Ricostruzione storica:** rendere verificabili dati, versioni e regole applicabili nel momento in cui un'attività è stata registrata o un documento è stato emesso.
- **Protezione dei risultati consolidati:** evitare che modifiche successive alterino direttamente o indirettamente fatture emesse e altri dati consolidati.
- **Operatività locale e portabilità:** consentire l'utilizzo senza connessione e il trasferimento controllato dell'intero archivio.
- **Manutenibilità ed evoluzione:** separare le responsabilità applicative e permettere l'introduzione di nuove funzioni senza compromettere i dati esistenti.

### 2.4 Perimetro funzionale di alto livello

| Ambito | Funzioni comprese |
| --- | --- |
| Anagrafiche | Navi, clienti, agenzie, porti, banchine, merci e classificazioni necessarie agli altri processi; identità stabili e variazioni temporali dove previste. |
| Attività operative | Viaggi, visite, ormeggi, entrate, spostamenti, uscite, prestazioni da catalogo e libere, movimentazioni merci e relativi stati. |
| Tariffe e calcoli | Tariffe per porto, tipologie e dimensioni delle navi, scaglioni ordinari ed extra, pesi, regole economiche e fiscali, sconti e arrotondamenti. |
| Fatturazione | Selezione di cliente e agenzia, composizione, informazioni sulle merci, emissione, consolidamento, riscossione, ritiro consentito e ristampa. |
| Contabilità e incassi | Conti, movimenti, giroconti, costi, categorie di spesa, voci contabili, ripartizione degli incassi, residui e saldi. |
| Consultazione e continuità | Resoconti configurabili, esportazioni tabellari, configurazioni generali, backup completo, ripristino e modalità protetta. |

Le regole di dettaglio appartengono a `01-analisi-dominio.md` e `02-requisiti-funzionali-e-casi-uso.md`.

### 2.5 Utenti e contesto d'uso

Nella prima versione è previsto un unico tipo di utilizzatore umano: l'operatore del gestionale.

L'applicazione è pensata per un utilizzo locale e controllato. Non sono inizialmente necessari autenticazione, utenti distinti o ruoli applicativi.

Cliente, agenzia, nave e gli altri soggetti rappresentati non sono utenti dell'applicazione, ma entità del dominio amministrate dall'operatore.

### 2.6 Principi guida

- **Identità stabile:** gli elementi persistenti devono essere riconoscibili indipendentemente dalle descrizioni visibili e dalle relative variazioni.
- **Validità temporale:** quando il dominio lo richiede, i cambiamenti devono essere rappresentati mediante versioni con decorrenza, senza riscrivere impropriamente la storia.
- **Fonte autorevole esplicita:** ogni dato derivato deve poter essere ricondotto agli elementi che lo determinano.
- **Consolidamento:** l'emissione di una fattura protegge dati e risultati riportati nel documento da modifiche dirette o indirette.
- **Validazione preventiva:** le operazioni retroattive, strutturali o potenzialmente distruttive devono mostrare gli effetti prima dell'applicazione.
- **Atomicità:** un aggiornamento che interessa più dati viene applicato integralmente oppure lascia invariato lo stato precedente.
- **Terminologia uniforme:** stati operativi, stati della fattura, selezionabilità e validità temporale devono rimanere concetti distinti.
- **Separazione delle responsabilità:** dominio, applicazione, persistenza e interfaccia devono avere ruoli riconoscibili.
- **Progettazione evolutiva:** modello, architettura e interfaccia vengono approfonditi attraverso funzionalità complete e verificabili, evitando di anticipare dettagli non ancora richiesti dal codice.
- **Evoluzione controllata:** nuove funzioni e migrazioni non devono reinterpretare silenziosamente i dati esistenti.

### 2.7 Requisiti non funzionali di alto livello

- **Utilizzabilità:** precondizioni, dati obbligatori, effetti, avvisi e blocchi devono essere comprensibili all'operatore.
- **Affidabilità:** il sistema deve prevenire stati parziali e proteggere i dati durante operazioni trasversali, backup e ripristini.
- **Prestazioni:** le operazioni ordinarie devono essere adeguate all'uso desktop; le ottimizzazioni non devono modificare il significato dei risultati.
- **Portabilità:** applicazione e archivio devono poter essere trasferiti mediante procedure documentate.
- **Manutenibilità:** la struttura tecnica deve favorire test, diagnosi degli errori e sostituzione controllata dei componenti.
- **Riservatezza:** dati e backup devono poter essere conservati in cartelle o dispositivi adeguatamente protetti.
- **Avvio locale:** il backend deve diventare utilizzabile in un tempo compatibile con l'avvio di un'applicazione desktop; il tempo di readiness viene misurato fin dal walking skeleton.

### 2.8 Vincoli e scelte iniziali

- L'applicazione è destinata principalmente all'esecuzione desktop locale.
- Il funzionamento ordinario non richiede una connessione Internet.
- I dati autorevoli sono conservati in un archivio locale controllato dall'applicazione.
- La prima versione non prevede autenticazione, utenti distinti o ruoli.
- Le date civili, gli istanti operativi e gli istanti tecnici mantengono semantiche differenti.
- Il fuso del porto governa le attività portuali; il fuso aziendale conserva una funzione amministrativa e di rappresentazione comune.
- Le fatture emesse e gli altri risultati consolidati non vengono ricalcolati retroattivamente.
- Backup, esportazioni e future procedure di migrazione costituiscono funzioni distinte.
- Le scelte tecnologiche iniziali vengono definite nel walking skeleton e rivalutate soltanto sulla base di esigenze concrete emerse dalle slice.
- L'interfaccia utilizza tecnologie web e comunica con il backend mediante un contratto HTTP, così da poter essere riutilizzata in una futura distribuzione client-server.

Non fanno parte del perimetro iniziale:

- dipendenza obbligatoria da servizi cloud o connessioni esterne;
- portali autonomi destinati a clienti o agenzie;
- importazione selettiva o fusione automatica tra archivi indipendenti;
- definizione anticipata della disposizione delle schermate;
- scelta, nel documento di visione, di framework, database o tecnologie specifiche.

### 2.9 Criteri generali di successo

Il progetto soddisfa la visione quando:

- l'operatore può completare il ciclo operativo, economico e contabile previsto;
- i dati storici possono essere interpretati secondo le versioni applicabili;
- le fatture emesse conservano valori e riferimenti verificabili;
- gli aggiornamenti trasversali non lasciano dati parziali o incoerenti;
- l'archivio può essere sottoposto a backup, verificato, ripristinato e trasferito;
- resoconti ed esportazioni producono risultati riconducibili ai dati elementari;
- nuove funzioni possono essere aggiunte senza riscrivere le regole consolidate;
- l'applicazione rimane comprensibile nel contesto operativo quotidiano.

## 3. Stato generale del progetto

| Fase | Tema | Stato | Risultato principale |
| --- | --- | --- | --- |
| 0 | Visione e perimetro iniziale | Completata | Obiettivi, confini e principi raccolti nel presente documento |
| 1 | Analisi del dominio | Completata | Modello concettuale, relazioni e regole di dominio |
| 2 | Requisiti funzionali e casi d'uso | Completata | 148 casi d'uso e revisione trasversale conclusiva |
| 3 | Modello dei dati | Evolutiva | Fondamenti e primi ambiti definiti; completamento guidato dalle slice |
| 4 | Architettura applicativa | Avviata | Angular, API Java locale, SQLite e strategia misurabile per l'avvio |
| 5 | Esperienza utente e flussi dell'interfaccia | Evolutiva | Interazioni progettate insieme alla slice che le utilizza |
| 6 | Prototipi tecnici e validazione dei rischi | Integrata | Rischi affrontati nella prima slice utile o con spike limitati |
| 7 | Implementazione per vertical slice | Avviata | Backlog ordinato di funzionalità complete e verificabili |
| 8 | Strategia di test e qualità | Integrata | Test e criteri di accettazione inclusi nella definizione di completamento |
| 9 | Migrazione, distribuzione e rilascio | Da avviare | Importazione dati, installazione e manutenzione |

## 4. Fasi completate

### 4.1 Fase 0 – Visione e perimetro iniziale

**Stato:** completata.

La visione, gli obiettivi, il perimetro, i principi guida e i criteri generali di successo sono consolidati nella sezione 2 del presente documento.

**Risultato:** contesto sufficiente per guidare l'analisi del dominio e le successive decisioni progettuali.

### 4.2 Fase 1 – Analisi del dominio

**Stato:** completata.

Il documento `01-analisi-dominio.md` definisce:

- attori e processi principali;
- anagrafiche e versioni temporali;
- viaggi, visite, ormeggi e operazioni nave;
- prestazioni e movimentazioni merci;
- determinazione di cliente e agenzia;
- tariffe, scaglioni, pesi e calcoli;
- regole economiche e fiscali;
- fatture, sconti, arrotondamenti e consolidamento;
- incassi, contabilità e saldi;
- date, orari e fusi;
- resoconti, esportazioni, configurazioni, backup e ripristino;
- principi trasversali di validazione, ricalcolo e atomicità.

La revisione conclusiva ha uniformato la terminologia, accorpato i principi comuni e verificato coerenza e leggibilità.

**Risultato:** riferimento autorevole per requisiti, modello dei dati e progettazione.

### 4.3 Fase 2 – Requisiti funzionali e casi d'uso

**Stato:** completata.

Il documento `02-requisiti-funzionali-e-casi-uso.md` traduce il dominio in comportamenti osservabili e comprende:

- requisiti comuni per ciascun ambito;
- 148 casi d'uso con codici univoci e serie continue;
- precondizioni, flussi principali, alternative, vincoli e risultati;
- interazioni tra ambiti;
- operazioni atomiche, avvisi e condizioni di blocco;
- matrice di tracciabilità;
- revisione trasversale `REV-FUN`;
- distinzione tra decisioni concluse e aspetti rinviati alla progettazione.

**Risultato:** copertura funzionale completa della prima versione e base verificata per il modello dei dati.

## 5. Percorso evolutivo di realizzazione

Il progetto non procede più completando integralmente ogni elaborato prima di iniziare il successivo. Dominio e casi d'uso già consolidati costituiscono la base; modello dei dati, architettura, interfaccia e test evolvono attraverso **vertical slice** funzionanti.

Ogni slice deve produrre un comportamento utilizzabile dall'operatore, attraversando quando necessario interfaccia, applicazione, dominio e persistenza. Prima della chiusura vengono eseguiti i test pertinenti, applicato il refactoring necessario e aggiornate soltanto le decisioni progettuali realmente coinvolte.

Il documento operativo è `04-sviluppo-evolutivo.md`. Le sezioni seguenti descrivono ambiti di lavoro concorrenti, non più passaggi rigidamente sequenziali.

### 5.1 Fase 3 – Modello dei dati

**Stato:** evolutivo; punti 1–5 completati, punto 6 conservato come proposta da verificare durante le slice interessate.

**Obiettivo:** tradurre il modello concettuale e i casi d'uso in una struttura persistente coerente e verificabile.

Le attività, svolte quando richieste dalle slice, comprendono:

- definizione di entità, attributi, identificativi e relazioni;
- scelta delle cardinalità e delle regole di eliminazione;
- rappresentazione delle versioni temporali e dei relativi intervalli;
- rappresentazione dei dati consolidati con l'emissione delle fatture;
- modellazione delle sequenze operative;
- modellazione di tariffe, scaglioni, pesi e regole economiche;
- modellazione delle quote che collegano incassi e fatture;
- definizione di chiavi, vincoli di unicità e integrità referenziale;
- individuazione degli indici necessari;
- distinzione tra dati autorevoli e dati derivati;
- preparazione di un diagramma delle entità e delle relazioni.

**Documento atteso:** `03-modello-dati.md`.

**Criterio di completamento:** per ogni slice chiusa, i dati necessari sono rappresentati senza perdita di significato, i vincoli rilevanti sono verificati e il documento riflette il modello effettivamente implementato. La revisione complessiva verrà svolta prima del rilascio.

### 5.2 Fase 4 – Architettura applicativa

**Stato:** avviata mediante walking skeleton.

**Obiettivo:** definire la struttura tecnica dell'applicazione e le responsabilità dei componenti.

Le decisioni principali riguarderanno:

- tecnologia dell'applicazione desktop;
- database locale e modalità di accesso;
- separazione tra dominio, applicazione, persistenza e interfaccia;
- organizzazione dei moduli funzionali;
- transazioni e operazioni atomiche;
- configurazioni e fusi orari;
- generazione ed esportazione di documenti e resoconti;
- backup, ripristino, errori e diagnostica;
- aggiornamento e distribuzione;
- possibilità di evoluzione senza compromettere i dati esistenti.

**Documentazione attesa:** decisioni essenziali registrate in `04-sviluppo-evolutivo.md`; decisioni architetturali di lunga durata potranno essere separate in brevi ADR.

**Decisione iniziale:** frontend Angular separato, backend Java/Spring Boot accessibile mediante API HTTP e persistenza SQLite. In locale i componenti vengono distribuiti insieme; in una futura versione client-server il frontend conserva lo stesso confine e indirizza le richieste al backend remoto.

**Criterio di completamento iniziale:** l'applicazione si avvia, presenta una prima interfaccia, inizializza il database locale, esegue un caso d'uso completo e dispone di build, test e benchmark di startup ripetibili. L'architettura continuerà poi a evolvere per necessità concrete.

### 5.3 Fase 5 – Esperienza utente e flussi dell'interfaccia

**Stato:** evolutivo; da affrontare all'interno di ogni slice.

**Obiettivo:** rendere le funzioni comprensibili, efficienti e difficili da utilizzare in modo errato.

Devono essere progettati almeno:

- struttura della navigazione;
- schermate di elenco, dettaglio e modifica;
- ricerche, filtri e selezioni;
- registrazione cronologica delle attività della nave;
- creazione delle tariffe;
- configurazione delle regole economiche;
- composizione ed emissione delle fatture;
- registrazione e ripartizione degli incassi;
- gestione contabile;
- costruzione e salvataggio dei resoconti;
- notifiche, conferme, errori e blocchi;
- visualizzazione dei dati storici e consolidati.

**Documentazione attesa:** criteri di accettazione e, soltanto quando utili, wireframe relativi alla slice corrente.

**Criterio di completamento:** ogni slice chiusa dispone di un percorso comprensibile, comprese le condizioni di errore e le conferme che le appartengono.

### 5.4 Fase 6 – Prototipi tecnici e validazione dei rischi

**Stato:** integrata nello sviluppo.

**Obiettivo:** verificare mediante prototipi limitati le soluzioni con il maggiore rischio tecnico o logico.

Le verifiche prioritarie riguardano:

1. ricostruzione atomica di viaggi, visite e ormeggi;
2. inserimento retroattivo di operazioni nella sequenza;
3. selezione delle versioni applicabili in un determinato istante;
4. calcolo tariffario ed economico con arrotondamenti intermedi;
5. consolidamento e blocco delle modifiche indirette;
6. gestione di date civili, fusi IANA, offset e istanti UTC;
7. backup e ripristino del database locale;
8. produzione di fatture ed esportazioni indipendenti dalla piattaforma.

**Risultati attesi:** spike eliminabili quando l'incertezza non può essere risolta direttamente in una slice; decisioni documentate e conferma della fattibilità.

**Criterio di completamento:** ogni rischio viene verificato prima che la funzionalità da esso dipendente renda costosa una modifica della soluzione.

### 5.5 Fase 7 – Implementazione per vertical slice

**Stato:** avviata.

**Obiettivo:** costruire il prodotto mediante incrementi piccoli, completi e verificabili, aggiornando il progetto sulla base del codice e dei test.

Ordine iniziale di massima:

1. walking skeleton con un primo dato persistito;
2. anagrafiche minime necessarie alle operazioni;
3. entrata della nave e apertura delle permanenze;
4. spostamenti e uscita;
5. prestazioni, tariffe e calcolo economico;
6. movimentazioni merci;
7. fatturazione e consolidamento;
8. incassi e contabilità;
9. resoconti, esportazioni, backup e rilascio.

L'ordine può cambiare quando una slice fa emergere una dipendenza o un rischio. Per ogni incremento vengono indicati scenario, risultato osservabile, perimetro, test e criterio di accettazione.

**Documento operativo:** `04-sviluppo-evolutivo.md`.

**Criterio di completamento:** ogni slice soddisfa la definizione di completamento e lascia l'applicazione avviabile, verificabile e coerente.

### 5.6 Fase 8 – Strategia di test e qualità

**Stato:** integrata dalla prima slice.

**Obiettivo:** garantire la correttezza delle regole e prevenire regressioni sui dati consolidati.

La strategia deve comprendere:

- test unitari delle regole di dominio;
- test delle sequenze operative;
- test degli intervalli temporali e delle versioni;
- test parametrizzati dei calcoli e degli arrotondamenti;
- test delle transazioni e dei rollback;
- test di integrazione con il database;
- test di persistenza dei dati consolidati;
- test relativi a ora legale, ora solare e cambi di fuso;
- test dei flussi principali dell'interfaccia;
- test di esportazioni, backup e ripristini;
- test di migrazione.

**Documentazione attesa:** strategia minima nel documento operativo, ampliata quando una slice introduce nuovi tipi di rischio o di verifica.

**Criterio di completamento:** nessuna slice viene chiusa senza i test automatici pertinenti e la verifica manuale del comportamento visibile; prima del rilascio viene eseguita una revisione complessiva della copertura.

### 5.7 Fase 9 – Migrazione, distribuzione e rilascio

**Stato:** da progettare prima del completamento dello sviluppo.

**Obiettivo:** rendere possibile l'adozione dell'applicazione senza perdita di dati e con procedure ripetibili.

Le attività comprendono:

- analisi e mappatura delle fonti esistenti;
- pulizia e normalizzazione dei dati;
- gestione delle informazioni mancanti o incoerenti;
- importazione ripetibile e verificabile;
- confronto tra dati originari e migrati;
- definizione del pacchetto di installazione;
- inizializzazione e aggiornamento del database;
- gestione delle versioni applicative;
- backup preliminare e piano di ripristino;
- collaudo e passaggio alla nuova applicazione;
- documentazione operativa essenziale.

**Documenti attesi:** `08-piano-migrazione.md` e `09-piano-rilascio.md`.

**Criterio di completamento:** installazione, migrazione, verifica e ripristino possono essere eseguiti mediante procedure documentate e ripetibili.

## 6. Dipendenze e regole di avanzamento

- I casi d'uso dipendono dall'analisi del dominio conclusa.
- Dominio e casi d'uso già consolidati guidano le slice e non devono essere riscritti nel backlog.
- Una slice approfondisce solo la parte di modello, architettura e interfaccia necessaria al proprio comportamento.
- Una decisione difficile da modificare viene verificata nel codice o con uno spike prima di essere adottata stabilmente.
- Test e migrazioni del database fanno parte della slice e non sono attività rinviate a una fase finale.
- Il refactoring avviene durante lo sviluppo e al termine di brevi gruppi di slice.
- Migrazione, backup e rilascio vengono anticipati abbastanza da evitare che il formato persistente diventi un vincolo non verificato.

## 7. Attività in corso

È stato adottato il metodo di **sviluppo evolutivo per vertical slice**. L'analisi sequenziale del modello dati è sospesa: i punti 1–5 restano consolidati, mentre il punto 6 e i successivi verranno confermati o corretti quando saranno richiesti da una slice.

L'attività corrente è **VS-00 – Walking skeleton**. Lo stack minimo è stato scelto e ne è stata creata la struttura iniziale in `application/`: Angular per l'interfaccia, Spring Boot per le API e SQLite con migrazioni Flyway per la persistenza. Il primo flusso riguarda creazione e consultazione di un porto.

La verifica della slice comprende anche il tempo di avvio del backend. Uno script end-to-end per Windows compila l'applicazione, esercita le API, verifica la persistenza dopo il riavvio e confronta JAR ordinario, JAR estratto e runtime preparato mediante Spring AOT e AOT cache di Java 25. La native image verrà valutata soltanto se le misure sul computer di destinazione non rispettano il budget concordato.

Il backlog, la definizione di completamento e lo stato delle slice sono mantenuti in `04-sviluppo-evolutivo.md`.

## 8. Relazione tra i documenti

- `00-roadmap-progetto.md` contiene visione, stato e percorso del progetto.
- `01-analisi-dominio.md` definisce concetti, relazioni, stati e regole.
- `02-requisiti-funzionali-e-casi-uso.md` descrive comportamenti osservabili e flussi.
- `03-modello-dati.md` raccoglie il modello consolidato e viene aggiornato quando una slice ne verifica concretamente una parte.
- `04-sviluppo-evolutivo.md` è il documento operativo per backlog, slice corrente, criteri di completamento e decisioni emerse dal codice.

In caso di contrasto, una decisione più dettagliata e confermata può precisare una formulazione generale, ma non deve modificare implicitamente obiettivi o perimetro. Una variazione sostanziale richiede l'aggiornamento esplicito della roadmap e dei documenti interessati.
