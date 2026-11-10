# 4. Sviluppo evolutivo

## 4.1 Scopo

Questo documento guida la realizzazione pratica del gestionale mediante vertical slice. Non anticipa il progetto completo: mantiene il backlog di massima, descrive la slice corrente e registra gli effetti concreti su modello, architettura, interfaccia e test.

Le fonti funzionali restano:

- `01-analisi-dominio.md` per concetti e regole;
- `02-requisiti-funzionali-e-casi-uso.md` per comportamenti osservabili;
- `03-modello-dati.md` per le decisioni strutturali già consolidate.

## 4.2 Metodo di lavoro

Per ogni slice:

1. si sceglie uno scenario reale e sufficientemente piccolo;
2. si definiscono risultato osservabile ed esempi di accettazione;
3. si progetta soltanto la parte necessaria;
4. si implementa il flusso completo attraverso i livelli coinvolti;
5. si verificano regole, persistenza e comportamento visibile;
6. si esegue il refactoring necessario;
7. si aggiornano solamente le decisioni progettuali effettivamente confermate dal codice.

Una necessità tecnica incerta può essere esplorata con uno spike limitato. Il codice dello spike viene eliminato oppure trasformato esplicitamente in codice di produzione dopo la verifica.

## 4.3 Criteri di preparazione

Una slice può iniziare quando sono disponibili:

- un attore e un risultato utile;
- almeno uno scenario principale concreto;
- le principali condizioni di errore comprese nel perimetro;
- un confine esplicito tra ciò che verrà realizzato e ciò che resta fuori;
- dati e dipendenze minime necessarie.

Non è necessario completare preventivamente l'intero modello dell'ambito.

## 4.4 Definizione di completamento

Una slice è completata quando:

- il comportamento è utilizzabile attraverso l'interfaccia prevista;
- dominio, applicazione e persistenza rispettano le responsabilità concordate;
- il database può essere creato o aggiornato mediante migrazioni ripetibili;
- le regole rilevanti dispongono di test automatici;
- la persistenza dispone dei test di integrazione pertinenti;
- il percorso visibile è stato verificato manualmente;
- build e test partono da un ambiente pulito mediante comandi documentati;
- non rimangono errori noti che rendano inaffidabile il comportamento della slice;
- modello, glossario e decisioni tecniche sono aggiornati soltanto dove necessario;
- l'applicazione rimane avviabile al termine del lavoro.

## 4.5 Principi di progettazione durante il codice

- Il codice usa identificatori inglesi; documentazione funzionale e interfaccia restano in italiano.
- Le regole di dominio non vengono collocate nell'interfaccia o nei dettagli di persistenza.
- Le dipendenze puntano verso il dominio; framework e database restano sostituibili nei limiti giustificati dal progetto.
- Non si introducono astrazioni per esigenze solamente ipotetiche.
- La duplicazione locale è tollerata finché il concetto comune non è dimostrato da casi concreti.
- Le invarianti importanti vengono rese visibili nel modello e protette da test.
- Le decisioni difficili da cambiare vengono registrate in forma breve con contesto e conseguenze.
- Ogni gruppo di tre o quattro slice include una revisione trasversale e un refactoring mirato.

## 4.6 Decisione architetturale iniziale

### Stack adottato

| Livello | Tecnologia | Motivazione |
| --- | --- | --- |
| Interfaccia | Angular 22, TypeScript 6 | Interfaccia web riutilizzabile in una futura distribuzione client-server. |
| Contratto | HTTP JSON, descritto mediante OpenAPI statico | Stesso confine applicativo in esecuzione locale e remota, senza dipendenze di documentazione caricate a runtime. |
| Backend | Java 25 LTS, Spring Boot 4.1 e Spring MVC | Stack familiare, supporto AOT corrente e possibilità di conservare invariati dominio e casi d'uso nel passaggio distribuito. |
| Accesso ai dati | Spring JDBC | Accesso esplicito e dipendenze ridotte; JPA e Hibernate non sono necessari per la prima slice. |
| Persistenza | SQLite con driver Xerial | Archivio locale singolo, trasferibile e utilizzabile senza installare un server database. |
| Migrazioni | Flyway | Creazione e aggiornamento ripetibili dello schema. |
| Test | JUnit e AssertJ; Vitest per Angular | Test rapidi delle regole, della persistenza e del contratto frontend. |

Angular non accede direttamente al database o alle funzioni native del sistema operativo. Tutte le operazioni applicative attraversano l'API Java. Il backend locale viene associato esclusivamente all'indirizzo di loopback; il futuro contenitore desktop sarà responsabile dell'avvio, dell'attesa della readiness e dell'arresto del processo.

Nella distribuzione locale, il backend può servire anche gli asset Angular compilati, evitando CORS e un secondo server. Nella futura distribuzione client-server gli stessi asset potranno essere pubblicati separatamente e utilizzare un backend remoto. Autenticazione, autorizzazione, concorrenza multiutente e indisponibilità della rete rimangono evoluzioni esplicite e non sono considerate automaticamente risolte dalla scelta di Angular.

La struttura iniziale è contenuta in `application/` e comprende:

- `frontend/` per Angular;
- `backend/` per API, applicazione, dominio e persistenza;
- `api/openapi.yaml` come contratto iniziale;
- `scripts/` per build e misurazione dello startup.

### Confini adottati

- I componenti Angular dipendono da servizi frontend che utilizzano URL relativi sotto `/api`.
- Le API utilizzano DTO distinti dagli oggetti persistiti.
- Le regole e le transazioni appartengono al backend.
- La persistenza implementa porte definite dal livello applicativo.
- Le future integrazioni desktop devono essere nascoste dietro adattatori e non diffuse nei componenti Angular.
- Il contenitore desktop non contiene logica di dominio.

## 4.7 Strategia per il tempo di avvio del backend

### Definizione della misura

Il backend è considerato avviato quando:

1. il contesto applicativo è stato creato;
2. il database è accessibile;
3. tutte le migrazioni necessarie sono concluse;
4. l'endpoint `/api/system/status` può dichiarare lo stato `READY`.

Il repository contiene un benchmark esterno al processo. La misura parte con la creazione del processo Java e termina all'evento applicativo di readiness, emesso quando anche l'endpoint di stato è disponibile; comprende quindi JVM, Spring, server HTTP, driver SQLite e migrazioni. Il tempo riportato internamente da Spring viene mantenuto come dato diagnostico, ma non sostituisce la misura percepita dal launcher.

Il budget iniziale da verificare sul computer Windows di destinazione è:

- mediana non superiore a 1,5 secondi negli avvii ordinari;
- avvio a freddo non superiore a 3 secondi;
- assenza di ritardo aggiuntivo significativo sulla prima operazione dell'utente.

I valori sono obiettivi provvisori: verranno confermati mediante il benchmark, che esegue dieci avvii per modalità e riporta mediana, minimo e massimo. Il primo avvio usa un database nuovo; i successivi riutilizzano lo stesso archivio. Una sessione separata sulla macchina reale distinguerà inoltre avvio a freddo e riavvio con cache del sistema operativo.

### Tecniche analizzate

| Tecnica | Valutazione | Decisione iniziale |
| --- | --- | --- |
| Riduzione delle dipendenze e della scansione | Riduce il lavoro reale eseguito all'avvio e mantiene diagnosi immediate. | Adottata: niente JPA/Hibernate, Actuator o generatori OpenAPI a runtime nella prima slice. |
| Lazy initialization di Spring | Accorcia l'avvio apparente, ma sposta inizializzazioni e possibili errori sulla prima richiesta. | Non adottata; `spring.main.lazy-initialization` resta disabilitata. |
| JAR estratto | Evita parte del costo di caricamento dei JAR annidati ed è richiesto dalle cache della JVM. | Previsto per il runtime distribuito, non per lo sviluppo. |
| AOT cache della JVM | Java 25 può riutilizzare classi e dati raccolti durante una training run. È vincolata alla stessa build e versione Java. | Candidato principale per il pacchetto locale. Build e benchmark dedicati sono inclusi. |
| Spring AOT sulla JVM | Genera in build parte dell'inizializzazione e può essere combinato con la cache della JVM; limita configurazioni dinamiche di bean e profili. | Incluso nel runtime ottimizzato e da verificare con i test completi. |
| GraalVM native image | Offre il potenziale startup più rapido e un eseguibile autonomo, ma aumenta tempi e complessità della build e richiede output specifici per piattaforma. | Piano di riserva se il runtime JVM ottimizzato non rispetta il budget. |
| Processo mantenuto in background | Può azzerare quasi del tutto l'attesa ai successivi avvii dell'interfaccia, ma consuma risorse, complica aggiornamento e gestione degli arresti e non migliora il primo avvio. | Non adottato nella prima versione; l'applicazione e il backend condividono lo stesso ciclo di vita. |
| Avvio anticipato con schermata di attesa | Migliora il tempo percepito ma non riduce il costo reale. | Da introdurre con il contenitore desktop, usando l'endpoint di readiness. |

Il driver SQLite scelto dichiara supporto alla native image. Se questa strada diventerà necessaria, la libreria nativa SQLite verrà estratta durante la build e collocata accanto all'eseguibile, evitando l'estrazione nella cartella temporanea a ogni avvio.

### Regole di controllo nel tempo

- Il benchmark viene ripetuto quando una slice aggiunge un framework, una migrazione consistente o inizializzazioni di startup.
- Le ottimizzazioni vengono confrontate con la build JVM ordinaria usando lo stesso database iniziale.
- Nessun lavoro non necessario viene inserito in `@PostConstruct`, listener sincroni o runner di avvio.
- Il database non viene caricato interamente in memoria per nascondere i tempi di accesso.
- La native image non diventa obbligatoria finché una misura ripetibile non ne dimostra la necessità.

### Riferimenti tecnici della decisione

- [Spring Boot – Efficient deployments](https://docs.spring.io/spring-boot/reference/packaging/efficient.html)
- [Spring Boot – AOT cache](https://docs.spring.io/spring-boot/reference/packaging/aot-cache.html)
- [Spring Boot – Ahead-of-time processing sulla JVM](https://docs.spring.io/spring-boot/reference/packaging/aot.html)
- [Spring Boot – GraalVM native images](https://docs.spring.io/spring-boot/reference/packaging/native-image/index.html)
- [SQLite JDBC](https://github.com/xerial/sqlite-jdbc)

## 4.8 Backlog iniziale

Il backlog indica una direzione, non un contratto immutabile. Ogni voce verrà divisa ulteriormente prima dell'avvio se non risulta completabile come incremento piccolo.

| Ordine | Slice | Risultato principale | Stato |
| --- | --- | --- | --- |
| VS-00 | Walking skeleton | Applicazione avviabile, database locale e primo flusso persistito | In corso |
| VS-01 | Anagrafiche operative minime | Gestione degli elementi necessari a registrare le operazioni | Da preparare |
| VS-02 | Entrata della nave | Apertura coerente di viaggio, visita e ormeggio | Da preparare |
| VS-03 | Spostamento nello stesso porto | Chiusura e apertura degli ormeggi coinvolti | Da preparare |
| VS-04 | Spostamento tra porti | Chiusura e apertura delle visite con intervallo di trasferimento | Da preparare |
| VS-05 | Uscita della nave | Chiusura coerente della permanenza e del viaggio | Da preparare |
| VS-06 | Prestazione da catalogo | Registrazione e attribuzione al contesto operativo | Da preparare |
| VS-07 | Tariffa e calcolo | Configurazione tariffaria e calcolo verificabile dell'importo | Da preparare |
| VS-08 | Prestazione libera | Registrazione con descrizione e solo importo manuale | Da preparare |
| VS-09 | Movimentazione merci | Registrazione di carico o scarico nel contesto corretto | Da preparare |
| VS-10 | Prima fattura | Composizione, emissione e consolidamento | Da preparare |
| VS-11 | Incasso | Registrazione e associazione delle quote alle fatture | Da preparare |
| VS-12 | Contabilità | Conti, movimenti, classificazioni e saldi | Da preparare |
| VS-13 | Consultazione ed esportazione | Primo resoconto configurabile ed esportabile | Da preparare |
| VS-14 | Continuità operativa | Backup, verifica e ripristino dell'archivio | Da preparare |
| VS-15 | Distribuzione | Pacchetto installabile e aggiornamento controllato | Da preparare |

## 4.9 Slice corrente – VS-00 Walking skeleton

### Obiettivo

Dimostrare che la struttura tecnica minima consente di sviluppare, verificare e distribuire un flusso completo senza dipendenza da Internet.

### Scenario principale

L'operatore avvia l'applicazione, registra un porto e lo ritrova nell'elenco anche dopo la chiusura e il riavvio.

### Perimetro

La slice comprende:

- progetto compilabile e avviabile;
- finestra principale minimale;
- database locale inizializzato tramite una prima migrazione;
- struttura minima di dominio, applicazione, persistenza e interfaccia;
- creazione di un porto con i soli dati necessari allo scenario;
- consultazione dell'elenco dei porti;
- persistenza verificata dopo il riavvio;
- test automatici minimi e istruzioni di build ed esecuzione.

Non comprende ancora:

- modifica, disattivazione o versionamento successivo del porto;
- banchine e altre anagrafiche;
- operazioni nave;
- aspetto grafico definitivo;
- packaging finale per tutti i sistemi operativi.

### Criteri di accettazione iniziali

1. Al primo avvio il database viene creato e migrato automaticamente.
2. L'operatore può inserire un porto valido dall'interfaccia.
3. Il porto appena creato compare nell'elenco.
4. Dopo il riavvio il porto è ancora presente.
5. Un inserimento non valido mostra un errore comprensibile e non modifica il database.
6. Build e test sono eseguibili con comandi documentati e ripetibili.

### Implementazione iniziale

È stata creata la struttura eseguibile della slice con:

- schermata Angular per registrare e consultare i porti;
- API `GET` e `POST /api/ports`;
- endpoint di readiness `/api/system/status`;
- servizio applicativo transazionale;
- generazione degli identificativi `UUIDv7`;
- radice `Port` e versione iniziale `PortVersion`;
- schema SQLite creato mediante migrazione Flyway;
- test unitari del caso d'uso, test di persistenza e test del client HTTP Angular;
- script di build, benchmark JVM e preparazione del runtime AOT.
- verifica end-to-end PowerShell che crea un porto tramite HTTP, riavvia il backend sullo stesso database e confronta le tre modalità di avvio.

Il vincolo identificativo della prima slice è applicato alle versioni del porto. L'entità generale `IdentifierReservation`, necessaria quando verranno introdotte modifiche ed eliminazioni di versioni, resta rinviata alla slice delle anagrafiche complete.

### Verifiche ancora necessarie per chiudere la slice

- eseguire build e test con JDK 25, Maven e dipendenze npm disponibili;
- avviare frontend e backend e verificare manualmente il flusso;
- chiudere e riavviare l'applicazione verificando la persistenza;
- raccogliere il primo benchmark JVM e AOT sulla macchina di destinazione;
- generare e conservare il lockfile npm dopo la prima installazione riuscita;
- scegliere il contenitore desktop soltanto dopo la verifica del flusso locale nel browser.

La verifica principale su Windows è automatizzata da `scripts/verify-vs00.ps1`. La slice potrà essere chiusa quando lo script terminerà senza errori e i risultati del benchmark saranno stati confrontati con il budget provvisorio; l'esecuzione con `-SkipAot` non è sufficiente per la chiusura.

## 4.10 Stato

- Metodo evolutivo: adottato.
- Backlog iniziale: creato.
- Slice attiva: `VS-00`.
- Stack tecnico: adottato e strutturato nel codice.
- Stato della slice: implementazione iniziale presente; build integrata e benchmark ancora da eseguire nell'ambiente completo.
