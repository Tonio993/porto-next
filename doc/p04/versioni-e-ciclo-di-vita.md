# P04 — Versioni e ciclo di vita del porto

Data: 10 novembre 2026. Base integrata: `ec92739`, dopo l'implementazione P03 `5a6fa8c`. Implementazione P04: commit `0be600d`. Stato: completato e verificato anche nel pacchetto Windows.

Riferimenti: [piano](../piano-implementazione-prestazioni.md), [registro](../stato-implementazione-prestazioni.md), [decisioni P00](../p00/decisioni-iniziali.md), [contesto P01](../p01/contesto-applicativo.md), [valori P02](../p02/numeri-e-tempo.md), [porti P03](../p03/porti.md).

## Percorso disponibile

Anagrafiche → Porti comprende elenco e ricerca storica, dettaglio corrente, cronologia paginata, inserimento e correzione delle versioni, eliminazione delle versioni successive alla prima, disattivazione, riattivazione ed eliminazione fisica consentita del porto.

La cronologia mostra intervalli a inizio incluso e fine esclusa, locale/fuso/offset/UTC della decorrenza e distinzione tra versione storica, corrente e futura. La prima versione mantiene la decorrenza assente: può essere corretta nei dati, ma non ricevere una decorrenza né essere eliminata. Una nuova versione non può coincidere nei dati con la precedente; una correzione può rendere adiacenti versioni identiche, che rimangono distinte. Gli UUID delle versioni corrette sono conservati.

Le decorrenze vengono risolte nel fuso autonomo del porto. Le ore inesistenti sono respinte; quelle ambigue richiedono un'occorrenza. Una correzione dei soli dati descrittivi conserva la tupla temporale già salvata. Il fuso operativo non è modificabile attraverso il form descrittivo.

Le prenotazioni identificative storiche sopravvivono alle correzioni e all'eliminazione delle singole versioni. Il porto può riutilizzare una propria chiave; altre identità non possono appropriarsene. Solo l'eliminazione dell'intero porto libera le chiavi; il contatore rimane intatto e non riutilizza il codice eliminato. Identità, versioni, prenotazioni e fuso sono eliminati esplicitamente nella stessa transazione, senza cancellare riferimenti esterni.

## Anteprime e integrità

`PortLifecycleService` espone metodi specifici di anteprima e conferma per inserimento, correzione ed eliminazione delle versioni, disattivazione ed eliminazione del porto. La riattivazione è un comando diretto. I contratti sono in `src/shared/contracts/ports.ts`; preload e guardia IPC includono tutti i metodi.

Ogni anteprima valida il contesto completo e simula senza scrivere dati, revisioni o timestamp. Restituisce `READY` o `BLOCKED`, riepilogo completo, valori prima/dopo e intervalli modificati, avvisi e blocchi. Gli effetti sono paginati, inizialmente 50: cambiare pagina non limita l'operazione confermata. Il riferimento di un effetto identifica il porto; `versionId` distingue la versione interessata.

`PreviewStore` appartiene alla sessione applicativa: UUIDv4, scadenza a 15 minuti, massimo 32 anteprime con espulsione delle scadute e poi delle più vecchie. I consumatori usano uno spazio di nomi (`ports:…`) per distinguere le operazioni. Il server conserva una copia dell'input già validato e risolto; il renderer conferma soltanto `previewId` e contesto originale. Il cambio sessione svuota lo store.

La conferma verifica operazione, sessione, revisione e scadenza, ripete l'analisi dei vincoli e applica atomicamente i dati. `ArchiveCoordinator.command` consente una callback sincrona dopo il commit, usata per consumare l'anteprima solo quando anche la transazione e l'aggiornamento dei metadati sono riusciti. Una conferma senza cambiamenti consuma l'anteprima senza incrementare la revisione. Non ci sono transazioni aperte tra anteprima e conferma o tentativi automatici di ripetere una scrittura.

`port-references.ts` ispeziona le FK realmente presenti verso identità e versioni, escludendo i componenti posseduti dal porto. Un riferimento esterno impedisce l'eliminazione fisica; un riferimento a una versione interessata richiede un'integrazione applicativa prima della variazione. La disattivazione conserva tutti i riferimenti. Nel prodotto attuale non ci sono ancora banchine, attività operative o fatture: non si creano tabelle dimostrative o flag di consolidamento. Le tabelle collegate usate nelle prove esistono solo nei database temporanei dei test.

## Persistenza

Schema v5, migrazione `0005_port_version_moments.sql`; migrazioni `0001`–`0004` invariate. La migrazione estende `port_versions` con locale, fuso e offset, mantenendo `effective_from` come UTC. Un vincolo SQL richiede che le quattro parti siano tutte assenti per la versione iniziale o tutte presenti per una versione con decorrenza. Si riusano gli indici univoci e parziali P03 e gli adattatori temporali P02.

Gli archivi P03 contengono soltanto versioni iniziali: la migrazione mantiene identità, progressivi, prenotazioni, fusi e metadati esistenti. Il runner conserva copia preventiva e rollback. La lettura delle tuple verifica la coerenza aritmetica senza reinterpretare gli istanti con le regole IANA correnti.

Ogni repository cattura un unico istante di osservazione per la richiesta: versione corrente, cronologia e prossima decorrenza non possono contraddirsi se il confine temporale viene attraversato fra le letture SQL. Il passaggio a corrente resta un dato derivato e non richiede scritture.

## Convenzioni frontend per P05–P07

- `App.tsx` gestisce finestra, messaggi e navigazione. `ArchivePage.tsx` contiene i flussi sui file e resta montata, nascosta nelle altre sezioni, per conservare il comportamento delle bozze della stessa sessione. Il workspace rimane identificato dal token: cambio archivio, chiusura e «Salva con nome» azzerano tutti i componenti.
- `MasterDataPage.tsx` è il punto di navigazione delle anagrafiche. Porti è disponibile; le altre tipologie sono esplicitamente indisponibili. Non è introdotto un router o un motore CRUD.
- `useArchives` distingue operazioni sul file (`busy`, `run`, `update`) e comandi applicativi (`commandBusy`, `execute`). `execute` conserva l'envelope con contesto ed errori e aggiorna i metadati globali dopo il comando, senza modificare i contesti catturati dai form.
- `ResponseScope` e `useApplicationRequest` gestiscono una richiesta sostituibile per ciascuna vista: elenco, dettaglio, form, risoluzione e anteprima hanno controlli indipendenti. Le risposte di altre sessioni, revisioni precedenti, selezioni precedenti o componenti smontati vengono scartate. Chiudere un editor per un altro comando invalida anche la sua risoluzione temporale pendente. Le query non bloccano le operazioni indipendenti della finestra.
- `fieldErrors` mantiene i percorsi degli errori per campo. `MomentChoices` è condiviso dai due casi reali di scelta dell'occorrenza: configurazione temporale e decorrenza della versione.
- `usePorts` possiede richieste, selezione, bozze e anteprime. `PortList`, `PortDetail`, `PortHistory`, `PortDescriptionFields`, `PortVersionForm` e `PortConfirmation` presentano i dati e invocano callback; non risolvono regole di dominio.
- Una bozza cattura il contesto alla sua creazione e non segue automaticamente gli aggiornamenti della revisione. Per correggere un conflitto si ricarica esplicitamente il form di creazione oppure si riapre la versione. Un'anteprima scaduta o obsoleta rimane riconoscibile e non è confermabile.
- Le query restituiscono `nextTransitionAt`: elenco e dettaglio si aggiornano alla decorrenza della prossima versione futura, con controllo periodico e al ritorno del focus. Questo aggiornamento non scrive e non sostituisce bozze o anteprime aperte.

La revisione conclusiva resta circoscritta a questi casi concreti. Nessuna nuova dipendenza, nessun cambiamento CSS globale, nessuna anagrafica successiva implementata.

## Verifiche e consegna

Esiti effettivi nel registro. I test coprono versione corrente al confine, versioni passate/intermedie/future, prenotazioni, tuple storiche, no-op, scadenza e consumo delle anteprime, conferme obsolete o del metodo errato, rollback di correzione ed eliminazione, riferimenti reali e paginazione completa degli effetti. Restano attive le regressioni P00–P03 e i controlli di tutti i canali IPC.

I percorsi desktop aggiunti verificano il ciclo completo P04, il reset di editor e anteprima al cambio sessione, il recupero da un conflitto senza aggiornare la revisione della bozza, una risposta di dettaglio deliberatamente ritardata dopo il cambio selezione, una risoluzione temporale arrivata dopo la chiusura dell'editor e il passaggio futuro → corrente con orologi controllati nei soli processi di test.

Limiti di copertura: `CU-ANA-01`–`09` sono realizzati per il porto nel perimetro corrente. Banchine, altre anagrafiche, attività operative, ricalcoli delle attività e protezioni derivate dalle fatture rimangono nelle slice che li introducono. Quando verranno aggiunti riferimenti ricalcolabili, l'analisi P04 dovrà integrare i relativi casi d'uso prima di consentirne le correzioni.

Prossimo task: **P05**, non avviato. Le banchine dovranno controllare autorevolmente lo stato del porto nelle nuove assegnazioni, mantenere immutabile l'appartenenza, usare il proprio contatore globale e includere i propri riferimenti nelle anteprime e nei vincoli del porto. P06–P07 potranno riusare le convenzioni verificate, mantenendo entità, contratti e repository tipizzati.
