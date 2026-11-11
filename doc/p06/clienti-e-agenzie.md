# P06 — Clienti e agenzie

Commit di implementazione: `ef6e257`.

Data: 11 novembre 2026. Stato: **completato e verificato anche nel pacchetto Windows**. Base effettiva `42275ae`, che include `7d182e8` e l’aggiornamento successivo del README. La copia di lavoro iniziale era pulita; nessun `AGENTS.md` locale rilevato. Gli aggiornamenti documentali precedenti sono preservati. Schema v7, migrazione `0007_customers_agencies.sql`.

Riferimenti: [piano](../piano-implementazione-prestazioni.md), [registro](../stato-implementazione-prestazioni.md), [P00](../p00/decisioni-iniziali.md), [P02](../p02/numeri-e-tempo.md), [P04](../p04/versioni-e-ciclo-di-vita.md), [P05](../p05/banchine.md), [UI01](../ui01/revisione-post-p04.md); legacy requisiti §2.8 / CU-ANA-01–09 e modello §§3.9–3.10.

## Percorso e decisioni

In Anagrafiche sono raggiungibili Clienti e Agenzie. Ciascuna vista offre ricerca per ragione sociale storica o codice, elenco paginato, dettaglio corrente, cronologia paginata, creazione, inserimento/correzione/eliminazione consentita di versioni, disattivazione, riattivazione ed eliminazione consentita dell’identità. L’unico dato descrittivo è `businessName`.

`CustomerApi` / `AgencyApi`, `CustomerService` / `AgencyService` e `CustomerRepository` / `AgencyRepository` rimangono specifici e tipizzati. Identità, versioni, contatori e prenotazioni sono persistiti in tabelle distinte con FK reali e unicità separata. La stessa ragione sociale è consentita nelle due tipologie. Nessun soggetto universale, campo fiscale o modello CRUD dinamico.

| Strato       | File principali                                                                                                                                                                                                                                |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contratti    | [customers.ts](../../src/shared/contracts/customers.ts), [agencies.ts](../../src/shared/contracts/agencies.ts)                                                                                                                                 |
| Applicazione | [CustomerService](../../src/backend/application/customers/customer-service.ts), [AgencyService](../../src/backend/application/agencies/agency-service.ts), [fuso delle decorrenze](../../src/backend/application/time/company-version-zone.ts) |
| Persistenza  | [CustomerRepository](../../src/backend/infrastructure/database/customer-repository.ts), [AgencyRepository](../../src/backend/infrastructure/database/agency-repository.ts), [migrazione v7](../../migrations/0007_customers_agencies.sql)      |
| Electron     | [main](../../src/main/index.ts), [registrazione IPC](../../src/main/ipc/register.ts), [preload](../../src/preload/index.ts)                                                                                                                    |
| Interfaccia  | [Clienti](../../src/renderer/src/app/customers/Customers.tsx), [Agenzie](../../src/renderer/src/app/agencies/Agencies.tsx), [navigazione](../../src/renderer/src/app/MasterDataPage.tsx), hook `use-customers` / `use-agencies`                |

Normalizzazione P00: trim → NFC → maiuscole Unicode indipendenti dalla lingua → NFC. Valore visualizzato ripulito solo agli estremi, limite di 200 punti di codice. Ricerca con `instr` sulla chiave normalizzata, senza interpretare `%` e `_` come wildcard. Le prenotazioni sopravvivono alle correzioni e all’eliminazione delle versioni; vengono liberate soltanto eliminando l’identità. I contatori persistenti separati non arretrano dopo un’eliminazione.

La versione iniziale non ha decorrenza ed è correggibile, ma non eliminabile. Le versioni successive hanno intervalli a inizio incluso e fine esclusa, anche nel passato e nel futuro. Il backend riusa `versionSequence`, `insertVersion` e `versionEffects`; quest’ultima riceve ora un selettore descrittivo tipizzato anche per la ragione sociale. Non vengono accorpate versioni adiacenti identiche. Letture correlate condividono un istante di osservazione; il raggiungimento di una decorrenza aggiorna le viste senza scritture o aggiornamenti della revisione delle bozze.

Le decorrenze generali usano il fuso aziendale esplicitamente confermato. `companyVersionZone` impedisce l’uso della sola proposta iniziale; il messaggio indirizza a Riferimenti temporali. Creazione e correzione della versione iniziale rimangono possibili senza configurare il fuso. Il renderer invia solo locale e offset scelto. Il backend risolve gap e overlap con le primitive P02; la scelta dell’occorrenza è esplicita. Locale, fuso IANA, offset completo e UTC sono salvati insieme. Una correzione solo descrittiva conserva la tupla storica, senza rileggerla secondo nuove regole IANA.

## Transazioni, UI e riferimenti

Comandi e query attraversano preload, guardia IPC e coordinatore condiviso. Le anteprime hanno namespace separati, sessione, revisione, scadenza ed effetti paginati. La conferma riceve soltanto ID e contesto originali e ripete l’analisi nella transazione; il consumo avviene dopo il commit. Fallimenti e no-op conservano revisione e metadati secondo P01/P04.

Le viste riusano struttura elenco/dettaglio affiancata, scorrimenti indipendenti, dialoghi Mantine, `StateMessage`, `VersionCard`, `VersionMomentFields` e conferma UI01. Focus contenuto nel dialogo e restituito al comando di origine, con ripiego sulla creazione dopo l’eliminazione. Le bozze conservano il contesto originale nella vista montata; il ricaricamento della creazione è esplicito. Cambio tipologia smonta la vista; cambio sessione, anche Salva con nome, ricrea l’intero workspace. `useApplicationRequest` invalida risposte di elenco, dettaglio, risoluzione ed effetti nei rispettivi ambiti.

`CustomerRepository.requireSelectable(id)` e `AgencyRepository.requireSelectable(id)` sono i controlli backend per i futuri nuovi riferimenti. Chi introduce una scrittura operativa dovrà chiamare il controllo specifico nella stessa transazione, distinguendo un nuovo riferimento da uno già presente. `list.selectableOnly` filtra le selezioni; la gestione mostra anche i disattivati. La disattivazione non modifica i riferimenti esistenti. La cancellazione analizza FK reali verso identità e versioni, anche composte e con CASCADE, tramite l’ispettore già usato in P04/P05; nessun riferimento bloccante viene cancellato automaticamente.

## Verifiche effettive

- `npm test`: **121 test su 14 file passati**, nel runtime Electron con SQLite reale. Incluse le regressioni P00–P05 e le guardie di tutti i canali Clienti/Agenzie. Le prove dedicate verificano separazione delle tipologie, duplicati Unicode, ricerca storica e letterale, limiti di testo/paginazione/progressivi, versione iniziale, passato/intermedio/futuro, conflitti di decorrenza e revisione, no-op, conservazione di versioni adiacenti identiche, prenotazioni dopo correzione/eliminazione, riapertura e sessioni precedenti.
- Prove temporali su entrambe le tipologie: configurazione non confermata, scelta `America/New_York` distinta dalla proposta, gap/overlap di Roma, errore di ora ambigua senza scelta, persistenza separata delle due occorrenze, rifiuto di offset estranei e fuso imposto dal chiamante, UTC atteso, confine futuro → corrente senza scritture e correzione descrittiva di una tupla storica coerente con secondi nell’offset.
- Rollback su creazione, prenotazione, correzione ed eliminazione; contatore e revisione invariati, anteprima riutilizzabile dopo rollback. FK reali verso identità/versioni, incluso CASCADE: disattivazione conserva la relazione, `requireSelectable` rifiuta nuovi utilizzi e l’eliminazione rimane bloccata.
- Migrazione da un archivio v6 popolato: confronto di tutte le righe preesistenti, inclusi metadati, porto con versione futura, banchina disattivata, prenotazioni, contatori e fuso aziendale scelto. Copia preventiva ancora v6 e sequenze Clienti/Agenzie entrambe iniziate da 1. Fallimento sulla seconda tipologia: rollback completo di schema e dati, v6 e sessione precedente conservati.
- `npm run check`: TypeScript ed ESLint passati; Prettier globale segnala soltanto `doc/legacy/00`–`04`, preesistenti e non modificati. Le temporanee segnalazioni sui file in lavorazione e sugli artefatti diagnostici sono state corrette o ricondotte alle directory ignorate. Nessuna regressione di formattazione del codice consegnato.
- `npm run test:e2e`: **9 percorsi su 9 passati** in 12,3 minuti sulla build con le anagrafiche complete. Compresi P06 separati per Clienti/Agenzie, migrazione da v6, creazione, duplicati, configurazione temporale iniziale, gap/overlap, futuro, correzione/eliminazione, ricerca di nomi eliminati dalle versioni, pagine, stati, revisioni originali di bozze/anteprime, reset con Salva con nome e persistenza nell’originale dopo riavvio.
- `subjects-async.spec.ts`: **2 percorsi su 2 passati** sulla build, uno per tipologia. Risposte IPC trattenute dopo l’esecuzione: cambio selezione, chiusura/riapertura dell’editor e cambio archivio. Il dettaglio, il nuovo editor e il nuovo elenco non vengono sostituiti dai risultati tardivi.
- Dopo i ritocchi a paginazione, sottotitolo e conferma condivisa: **5 percorsi su 5 passati sulla build finale** in 7,8 minuti, comprendendo P06, asincronia P06 e regressione UI01. I due percorsi P06 sono poi stati ripetuti con l’attesa corretta delle transizioni di apertura/chiusura per le acquisizioni: **2 su 2 passati** in 5,2 minuti, nessun errore JavaScript. Il backend e il pacchetto sono rimasti invariati durante gli ultimi aggiustamenti al solo helper di cattura.

Il pacchetto Windows x64 in formato directory è stato generato dalla build finale con `node scripts/package.mjs --dir`. Tutti e cinque gli artefatti `out/` — main, preload, HTML, CSS e JavaScript del renderer — estratti dall’ASAR coincidono byte per byte con la build. **Tutti gli 11 percorsi sono verificati sullo stesso eseguibile**: `node scripts/test-packaged.mjs` ha superato 10 percorsi in 16,2 minuti; UI01 si è fermato sulla cattura iniziale della finestra nascosta, prima delle verifiche funzionali. Corretto il solo helper per saltare le catture nel pacchetto, mantenendo tutte le asserzioni funzionali e le attese dei dialoghi, la ripetizione mirata ha superato **1 percorso su 1** in 1,4 minuti con `PORTO_PACKAGED_EXE` sullo stesso eseguibile.

Il primo confezionamento è stato invalidato da una ricompilazione contemporanea del renderer; non viene considerato una consegna verificata. Il pacchetto è stato poi rigenerato dopo gli ultimi ritocchi visivi, da output stabile e senza ricompilazioni concorrenti. Le prove iniziali di P06 hanno anche corretto richieste di preparazione dei dati che usavano un contesto di comando per una query: il contratto backend ristretto è rimasto invariato. Le schermate finali attendono esplicitamente l’opacità completa del dialogo, come UI01, e portano la versione futura nell’area visibile prima dell’acquisizione.

L’avvio desktop richiede l’esecuzione fuori dalla sandbox dell’agente per il blocco ACL Windows già documentato; ACL e `sandbox: true` di Electron restano invariati. Le prove sono guidate con Playwright, renderer offline e dati temporanei. Nessuna sessione manuale umana dichiarata.

## Schermate ispezionate

**16 schermate finali ispezionate dall’agente**, otto per tipologia. Elenco/dettaglio con ragione sociale lunga acquisiti alle dimensioni native 960 × 700 e 1440 × 900; nessuno scorrimento orizzontale della pagina alla dimensione minima. I controlli desktop verificano autofocus, ritorno del focus dopo creazione/modifica/eliminazione, bozze, pagine, disattivazione/riattivazione e conferma bloccata.

| Stato                             | Clienti                                             | Agenzie                                             |
| --------------------------------- | --------------------------------------------------- | --------------------------------------------------- |
| Elenco vuoto                      | [Clienti](schermate/clienti-vuoto.png)              | [Agenzie](schermate/agenzie-vuoto.png)              |
| Creazione                         | [Clienti](schermate/clienti-creazione.png)          | [Agenzie](schermate/agenzie-creazione.png)          |
| Cronologia con versione futura    | [Clienti](schermate/clienti-cronologia-futura.png)  | [Agenzie](schermate/agenzie-cronologia-futura.png)  |
| Anteprima pronta                  | [Clienti](schermate/clienti-anteprima.png)          | [Agenzie](schermate/agenzie-anteprima.png)          |
| Anteprima obsoleta                | [Clienti](schermate/clienti-anteprima-obsoleta.png) | [Agenzie](schermate/agenzie-anteprima-obsoleta.png) |
| Eliminazione bloccata da FK reale | [Clienti](schermate/clienti-anteprima-bloccata.png) | [Agenzie](schermate/agenzie-anteprima-bloccata.png) |
| Nome lungo, dimensione minima     | [Clienti](schermate/clienti-minimo.png)             | [Agenzie](schermate/agenzie-minimo.png)             |
| Nome lungo, desktop               | [Clienti](schermate/clienti-desktop.png)            | [Agenzie](schermate/agenzie-desktop.png)            |

## Limiti e passaggio a P07

P07 può riprendere convenzioni P04/UI01/P05/P06 mantenendo repository e contratti della nave specifici. Le decorrenze descrittive generali richiedono il fuso aziendale confermato; i momenti operativi dei porti continuano a usare i rispettivi fusi. Conservare separati identità e versioni, prenotazioni di nome/IMO e contatore della nave. Aggiungere la migrazione successiva a v7 senza modificare gli script distribuiti.

P06 non introduce assegnazioni operative, ereditarietà dei soggetti, ricalcoli delle prestazioni o consolidamento di fatture. Non esistono riferimenti operativi di prodotto alle nuove anagrafiche: i blocchi sono provati con FK reali in tabelle dei soli archivi temporanei. Le future slice dovranno integrare analisi di intervallo e ricalcoli prima di consentire variazioni su nuovi dati dipendenti. Nessuna protezione delle fatture è dichiarata implementata. Variazioni dei fusi, installer e installazione restano fuori da P06.

Alla dimensione minima la pagina può richiedere scorrimento verticale con un messaggio globale visibile; elenco e dettaglio mantengono i propri scorrimenti. Ulteriori DPI e prove umane con tecnologie assistive restano alle revisioni UI02–UI04; non viene dichiarata una certificazione completa di accessibilità.
