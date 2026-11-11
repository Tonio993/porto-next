# P07 — Navi

Data: 11 novembre 2026. Base effettiva `093a59b`; implementazione nel commit `856bcbc`. Copia di lavoro iniziale pulita, nessun `AGENTS.md` locale rilevato. Stato: **completato e verificato sulla build Electron**. Schema v8, migrazione `0008_vessels.sql`; migrazioni distribuite invariate.

Riferimenti: [piano e §7.3](../piano-implementazione-prestazioni.md), [registro](../stato-implementazione-prestazioni.md), [P00](../p00/decisioni-iniziali.md), [contratti P00](../p00/contratti.ts), [scenari P00](../p00/scenari.mts), [P02](../p02/numeri-e-tempo.md), [P04](../p04/versioni-e-ciclo-di-vita.md), [P06](../p06/clienti-e-agenzie.md), [UI01](../ui01/revisione-post-p04.md). Requisiti legacy: dominio §1.5 e Nave, requisiti §2.8 / CU-ANA-01–09, modello §§3.9–3.10.

## Percorso e decisioni

Navi è raggiungibile da Anagrafiche. Offre creazione, ricerca per codice o nome/IMO storico, elenco paginato, dettaglio corrente, cronologia paginata, nuove versioni complete, correzione/eliminazione consentita delle versioni, disattivazione, riattivazione ed eliminazione consentita dell’identità. Le conferme mostrano anteprima, effetti paginati e blocchi.

| Dato                  | Regola                                                                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Nome di registrazione | Obbligatorio, massimo 200 punti Unicode dopo trim.                                                                                      |
| IMO                   | Testo facoltativo, massimo 64 punti Unicode; nessun formato o checksum aggiuntivo. Vuoto dopo trim diventa `null`.                      |
| Tipologia             | Codici tecnici stabili `STANDARD`, `PASSENGER`, `ADM`, inizializzati una sola volta dalla migrazione, senza comandi di amministrazione. |
| Dimensione            | Intero esatto `0`–`9007199254740991`, persistito come INTEGER e trasportato come number sicuro, senza unità di misura.                  |

I codici tecnici sono le chiavi stabili del catalogo `vessel_types`, coerentemente con P00 D01 e la distinzione tra tipi chiusi e identità anagrafiche. Le denominazioni italiane risiedono nel contratto condiviso. Il form richiede la scelta della tipologia e l’inserimento della dimensione; non assegna valori obbligatori silenziosamente.

Le chiavi identificative seguono trim → NFC → maiuscole Unicode → NFC. Nome e IMO hanno prenotazioni indipendenti con unicità `(kind, normalized_value)`. L’assenza di IMO non genera alcuna prenotazione. Le prenotazioni sopravvivono a correzioni, eliminazione delle versioni e disattivazione; si liberano soltanto eliminando l’identità. Il contatore autonomo persistente non arretra dopo l’eliminazione. Identità, versioni e prenotazioni ricevono UUIDv4 dal backend.

La versione iniziale non ha decorrenza; rimane correggibile e non eliminabile. Versioni passate, intermedie e future hanno inizio incluso/fine esclusa. Si confrontano tutti e quattro i dati per rifiutare una nuova versione identica alla precedente; le correzioni non accorpano versioni adiacenti. Le decorrenze usano il fuso aziendale confermato secondo P02/P06, con gestione di gap e overlap e conservazione della tupla locale/fuso/offset/UTC. Le correzioni descrittive conservano la tupla storica senza reinterpretarla con le regole IANA correnti.

`VesselRepository.versionAt(id, instant)` e `VesselApi.versionAt` risolvono i dati pertinenti all’istante richiesto, anche per una nave attualmente disattivata. L’istante è UTC ISO canonico con millisecondi negli anni 0001–9999. Per creare nuovi riferimenti le slice successive dovranno chiamare separatamente `requireSelectable(id)` nella stessa transazione. La risoluzione storica non sostituisce il controllo di selezionabilità.

## Integrazione e confini

Contratto [vessels.ts](../../src/shared/contracts/vessels.ts), [VesselService](../../src/backend/application/vessels/vessel-service.ts) e [VesselRepository](../../src/backend/infrastructure/database/vessel-repository.ts) sono specifici e tipizzati. Main, IPC e preload completano il percorso Electron → applicazione → SQLite. La migrazione è importata con `?raw` attraverso il runner esistente, senza cambiare la strategia di caricamento o confezionamento.

Sono riusati coordinatore, transazioni, sessioni/revisioni, namespace di anteprima dedicato, consumo dopo commit, guardie IPC, primitive temporali, sequenze e analisi delle FK reali. `versionEffects` accetta anche campi numerici e li espone come testo negli effetti, conservando lo zero; gli altri chiamanti mantengono lo stesso comportamento. La conferma condivisa aggiunge soltanto le etichette dei dati Navi. I nuovi riferimenti interni verso identità, versioni e tipologie sono FK reali; l’ispettore considera automaticamente eventuali riferimenti esterni verso Navi, comprese FK con CASCADE. Nessun riferimento operativo di prodotto viene anticipato.

La disattivazione conserva i riferimenti esistenti. Correzioni che cambierebbero dati/versioni referenziati ed eliminazioni sono bloccate dall’analisi conservativa già adottata in P04/P06; l’inserimento controlla anche gli intervalli delle versioni vicine. La conferma ripete l’analisi nella transazione. Le slice operative dovranno integrare intervalli, dipendenze e ricalcoli reali prima di consentire modifiche sui nuovi dati dipendenti. Non sono introdotti viaggi, prestazioni, tariffe, fatture o consolidamenti fittizi.

La UI riusa elenco/dettaglio con scorrimenti indipendenti, dialoghi Mantine, `StateMessage`, `VersionCard`, campi decorrenza e conferma UI01. Mostra tutti i dati della versione in dettaglio e cronologia. Mantiene focus, contesti originali di bozze/anteprime, ricaricamento esplicito dopo conflitto, invalidazione indipendente delle risposte e reset al cambio sessione, compreso Salva con nome. Il trascorrere della decorrenza aggiorna le letture senza scritture e senza cambiare il contesto della bozza.

## Verifiche effettive

- `npm test`: **137 test su 16 file passati**, nel runtime Electron con SQLite reale (suite finale: 8,48 s). Le nuove prove verificano IMO assente e testuale con zeri iniziali, normalizzazione Unicode, tre tipologie, limiti di testo/dimensione/progressivi, ricerca letterale e storica, pagine, contatore non riutilizzato, selezionabilità, no-op, versioni passate/intermedie/future, confini temporali e risoluzione UTC, gap/overlap, fuso aziendale scelto e tuple storiche con secondi nell’offset. È coperto anche lo scenario P00 `ANA-05`.
- Le prove di integrità verificano rollback di creazione e di entrambe le prenotazioni se fallisce l’IMO, correzione ed eliminazione, contatore e metadati invariati, anteprima riutilizzabile dopo rollback, isolamento dei namespace, revisioni/sessioni obsolete, FK reali verso identità/versioni anche con CASCADE, variazione degli intervalli vicini e riesame dei riferimenti alla conferma. Le guardie controllano tutti i dieci canali Navi.
- Migrazione **v7 → v8** provata su SQLite reale popolato con porti, banchine, clienti, agenzie, versioni, prenotazioni, stati, contatori, metadati e fuso scelto: confronto di tutte le righe preesistenti, copia preventiva ancora v7, inizializzazione delle tre tipologie e primo progressivo Navi a 1. Un fallimento sull’ultima tabella annulla tutta la migrazione e conserva dati, schema v7 e sessione precedente. Restano passate le regressioni delle migrazioni precedenti.
- `npm run check`: TypeScript ed ESLint passati. Prettier globale segnala soltanto i cinque documenti preesistenti `doc/legacy/00`–`04`, non modificati. Formattazione dei file modificati e aggiunti verificata separatamente, insieme a differenze Git e collegamenti locali.
- `npm run build`: riuscito dopo l’ultima correzione applicativa. Le verifiche desktop finali riusano questa build senza ricompilazioni concorrenti.

I test dedicati sono `vessel-service.test.ts`, `vessels-migration.test.ts`, le guardie IPC in `archive-controller.test.ts` e i percorsi `vessels.spec.ts` / `vessels-async.spec.ts`. **Tutti i sei percorsi desktop selezionati sono verificati sulla stessa build finale**. La selezione iniziale ha superato cinque percorsi: Banchine, ciclo di vita Porti, asincronia Clienti, asincronia Agenzie e asincronia Navi. Il percorso funzionale Navi si è fermato sulla ricerca dell’IMO per una fixture che compilava i nuovi dati prima di annullare l’editor; è stato corretto il solo test, aggiungendo asserzioni sui valori effettivamente persistiti e sull’IMO storico dopo riapertura. La ripetizione mirata di `vessels.spec.ts` ha superato **1 percorso su 1**, senza rigenerare la build o ripetere i cinque esiti validi.

Il percorso funzionale Navi apre e migra un archivio v7 con clienti/agenzie preesistenti e copia preventiva, poi verifica creazione, IMO testuale, selezione della tipologia, dimensione iniziale/futura conservate, duplicati Unicode, fuso non confermato, gap/overlap, UTC, cronologia e correzione/eliminazione, prenotazioni storiche di nome e IMO, pagine, disattivazione/riattivazione, FK reali bloccanti, focus, revisioni originali di bozze e anteprime, Salva con nome, rifiuto della sessione precedente, reset e persistenza dopo riavvio. Verifica assenza di scorrimento orizzontale a 960 × 700 e apertura a 1440 × 900; nessun errore JavaScript rilevato. Il percorso asincrono Navi trattiene risposte di dettaglio, risoluzione e lista, le rilascia dopo cambio selezione/editor/sessione e verifica futuro → corrente con orologi isolati, senza scritture o modifica della bozza aperta.

La selezione delle regressioni desktop comprende Banchine (apertura di un archivio precedente e nuovo schema), ciclo di vita Porti (effetti e conferma condivisi) e asincronia Clienti/Agenzie (navigazione e sessioni). I test backend completi verificano tutti i chiamanti delle primitive condivise e le migrazioni precedenti. La suite desktop completa rimane pianificata per M1 secondo §7.3.

Il primo avvio desktop nella sandbox dell’agente è stato impedito dagli ACL Windows della directory Electron, come negli step precedenti. Le ripetizioni usano esecuzione autorizzata fuori dalla sandbox dell’agente, senza cambiare ACL o `sandbox: true` di Electron. Il primo percorso funzionale ha richiesto l’allineamento del testo atteso per il duplicato; nella revisione è stata resa esplicita la costruzione del payload descrittivo dell’editor. La build è stata rigenerata dopo quest’ultima correzione. Nessuna sessione manuale umana dichiarata.

## Schermate e limiti

Tre schermate Navi della ripetizione finale, ispezionate dall’agente e conservate in [schermate](schermate/): [creazione](schermate/creazione.png), [cronologia corrente/futura](schermate/cronologia-futura.png), [eliminazione bloccata da FK reale](schermate/anteprima-bloccata.png). Confermati campi leggibili, dimensione e IMO distinti tra versioni, badge temporali e conferma bloccata. Le catture attendono la fine della transizione del dialogo. La schermata Porti prodotta dalla regressione è stata consultata come confronto, senza duplicare gli artefatti storici.

Non sono noti difetti di integrità aperti nel perimetro P07. Resta la formattazione legacy preesistente. Le verifiche sono guidate tramite Playwright in Electron reale, con dati temporanei e renderer offline; nessuna prova manuale umana o certificazione completa di accessibilità. Liste e cronologie lunghe, ulteriori DPI e verifiche grafiche estese rimangono UI02–UI04.

## Passaggio a P08, UI02 e M1

P08 deve implementare catalogo e pesi iniziali: inizializzare `rinforzo ormeggio` una sola volta, creare tipo e peso iniziale atomicamente (peso proposto `1`, strettamente positivo), mantenere descrizioni correnti riutilizzabili dopo rinomina, stati e vincolo monotono di utilizzo. Le variazioni successive dei pesi restano P19. Non estendere le prenotazioni storiche delle anagrafiche al catalogo.

Dopo P08 eseguire **UI02**, consolidando anagrafiche e catalogo con dati realistici, liste e cronologie lunghe, stati vuoti, errori, focus e dimensioni supportate. Chiudere **M1 sulla build integrata finale**, comprese le correzioni UI02: `npm run check`, `npm test`, suite desktop completa, migrazioni cumulative delle versioni supportate, trasferibilità, generazione del pacchetto e suite completa sullo stesso eseguibile.

P07 non modifica dipendenze, runtime Electron, configurazione del pacchetto o modalità di inclusione/caricamento delle risorse; non scattano le eccezioni di §7.3. Non viene rigenerato il pacchetto Windows nello step; gli esiti P06 rimangono storici. M1 dovrà produrre il nuovo eseguibile integrato. Installer e installazione restano P20.
