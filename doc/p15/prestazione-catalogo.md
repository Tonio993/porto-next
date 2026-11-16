# P15 — Prima prestazione da catalogo

P15 completato e verificato sulla build Electron il 16 novembre 2026. Implementazione nel commit `97e4b8e`, base `21dbcf3`, branch `main` inizialmente pulito. Schema **v16**, migrazione `0016_catalog_services.sql`; migrazioni distribuite v1–v15 invariate. Stato e consegna corrente nel [registro](../stato-implementazione-prestazioni.md).

## Decisioni e integrazioni

Il [contratto](../../src/shared/contracts/services.ts) distingue FREE e CATALOG attraverso una unione discriminata. `window.services.createCatalog` richiede `serviceTypeId` e gli stessi dati temporali, stato, note e soggetti di P14; rifiuta descrizione, base manuale e campi inattesi anche da IPC diretto. La categoria non è modificabile ed è protetta anche da un trigger SQLite. Non sono attivati comandi di ciclo di vita P16.

Il [servizio](../../src/backend/application/services/service-service.ts) condivide fra le categorie validazione, risoluzione del porto, gap/overlap, attribuzione alla permanenza e soggetti indipendenti. Riusa i [confini P14](../p14/prestazione-libera.md#decisioni-e-integrazioni) e il calcolatore sincrono [P09](../p09/tariffe-e-calcolatore-base.md#calcolo-e-riuso-operativo), chiamato nella transazione con porto e momento derivati dal contesto. Anche MISSED richiede tipo selezionabile, permanenza e tariffa applicabile; conserva il risultato tariffario. Zero è ammesso per CATALOG e resta vietato per FREE.

Il [repository](../../src/backend/infrastructure/database/service-repository.ts) conserva la base in centesimi int64 e l'intera traccia `BaseCalculationDto` in JSON, con importi e fattori come stringhe canoniche. I riferimenti relazionali a tipo, tariffa, configurazione, scaglione, sequenza e versione del peso hanno FK, anche composte per proprietario. I CHECK legano traccia, base e contesto e distinguono le forme delle due categorie. Il confronto della base usa soltanto operazioni intere SQLite, anche al massimo int64. Le CATALOG non persistono una descrizione autonoma: elenco e dettaglio leggono la descrizione corrente del tipo, anche disattivato.

Attività, riferimenti, risultati, soggetti e `CatalogRepository.markUsed` sono salvati nella stessa transazione del coordinatore. Un errore dopo INSERT, utilizzo o ricalcolo annulla anche metadati e revisione; il tipo non riceve un utilizzo storico spurio. L'utilizzo resta monotono dopo l'eliminazione dei riferimenti. Non esiste un nuovo canale per modificarlo.

`tariffOperationImpacts` include le CATALOG nell'intervallo della tariffa inserita, con effetti nelle anteprime e applicazione atomica. `masterOperationImpacts` ricalcola con la sequenza nave simulata e aggiorna i riferimenti porto/banchina. `subjectPlan` riattribuisce le prestazioni quando una nuova operazione cambia permanenza e porto, aggiornando anche il calcolo tariffario; assegnazioni e versioni cliente/agenzia conservano priorità e override indipendenti. Il [ricalcolo specifico](../../src/backend/application/services/service-calculation.ts) conserva sempre le basi manuali FREE. I riferimenti noti partecipano ai controlli FK già disponibili; quelli esterni sconosciuti restano bloccanti.

La migrazione ricostruisce la tabella delle prestazioni e ripristina esplicitamente i soggetti posseduti, conservando ogni dato v15. Il runner e il meccanismo `?raw` restano quelli esistenti. Gli aggiornamenti alle aspettative di schema/backup nei test precedenti riflettono esclusivamente la nuova versione corrente.

## Interfaccia

In **Prestazioni** è disponibile **Nuova prestazione da catalogo**, accanto al percorso libero. Il selettore cerca e pagina i tipi attivi, conservando la selezione fra ricerche e pagine. L'editor non espone descrizione o importo manuale. La registrazione calcola la base e apre il dettaglio con tariffa, scaglione, extra, peso, arrotondamenti e riferimenti applicati. Elenco e dettaglio distinguono le categorie. Bozze, conflitti, focus e risposte obsolete riusano le convenzioni [P14](../p14/prestazione-libera.md#interfaccia).

## Verifiche finali

Controlli scelti secondo la [matrice §7.3](../piano-implementazione-prestazioni.md#73-criteri-comuni-di-completamento):

- `npm run check`: TypeScript ed ESLint passati; soltanto i cinque avvisi Prettier legacy già noti. Documenti modificati formattati, collegamenti locali e UTF-8 controllati; `git diff --check` senza errori. Log `.local/p15-check-delivery.log`.
- `npm test`: **281 casi verificati su 28 file**, nel runtime Electron con SQLite reale. La suite completa finale ha passato 280 casi; il solo test P02 che avvia processi Electron per confrontare i fusi ha superato il limite di 5 secondi. Ripetuto isolatamente, il file passa 17/17 senza modifiche al codice. Riutilizzati gli altri esiti. Log `.local/p15-tests-full-final.log` e `.local/p15-values-retry.log`.
- Copertura specifica: selezionabilità, descrizione corrente dopo rinomina, consultazione storica, tariffa assente, zero e massimo int64, arrotondamenti, categoria immutabile, FK/CHECK e guardie dei cinque canali IPC. Provati rollback dopo utilizzo e ricalcolo, variazioni/eliminazioni delle versioni nave/porto/banchina e cliente/agenzia, tariffe intermedie, nuove operazioni e assegnazioni, conservazione delle FREE e delle tuple temporali. Gap/overlap, disambiguazione e confini riusano P14 e hanno anche casi CATALOG diretti.
- Migrazione **v15 popolato→v16**: conservati FREE con base int64 massima, soggetti effettivi e override, operazioni, identità, tuple e metadati. Confrontate tutte le righe e la copia preventiva. Un conflitto di indice dopo la ricostruzione forza il rollback completo, conservando file e sessione attiva. `foreign_key_check` vuoto e `integrity_check=ok` nelle prove pertinenti. Apertura e riapertura dell'archivio migrato verificate anche nella build Electron.
- `npm run build` completata; **13/13 percorsi desktop pertinenti verificati**. Riutilizzati nove esiti di assegnazioni, catalogo, entrata/uscita, spostamenti interni/esterni e tariffe. Sulla build finale ripetuti tutti e quattro i percorsi Prestazioni, funzionali e asincroni, dopo il rafforzamento del CHECK monetario, l'aggiornamento del testo introduttivo e la correzione delle richieste/selettori nei test nuovi. Log `.local/p15-desktop-final.log`, `.local/p15-build-verified.log` e `.local/p15-services-verified.log`.

Comandi desktop sulla build pronta:

```powershell
node node_modules/@playwright/test/cli.js test tests/e2e/services.spec.ts tests/e2e/assignments.spec.ts tests/e2e/operations.spec.ts tests/e2e/movements.spec.ts tests/e2e/inter-port-movements.spec.ts tests/e2e/tariffs.spec.ts tests/e2e/catalog.spec.ts --output test-results/p15-final
node node_modules/@playwright/test/cli.js test tests/e2e/services.spec.ts --output test-results/p15-services-verified
```

La selezione segue i chiamanti dei nuovi riferimenti: ricalcoli tariffari/anagrafici, cronologia e attribuzione, soggetti e ciclo di vita del catalogo. Le regressioni riutilizzate non coinvolgono le ultime variazioni, limitate al CHECK della traccia CATALOG e al testo della pagina Prestazioni; il backend finale è coperto dalla suite SQLite e il percorso di migrazione/registrazione dalla ripetizione desktop. Preload e CSS coincidono fra le build. Nessuna ricompilazione durante le serie desktop definitive.

Due schermate finali ispezionate dall'agente: [editor minimo](schermate/p15-editor-minimo.png) a 960×700 e [dettaglio con spiegazione](schermate/p15-dettaglio-desktop.png) a 1440×960. Verificati scorrimento fino all'ultimo passaggio del calcolo, ritorno del focus, ripresa della bozza e selezione conservata fra ricerche. Archivi/preferenze temporanei, renderer offline e finestre nascoste; nessuna sessione manuale umana. Avvii Electron effettuati direttamente fuori dalla sandbox dell'agente, come autorizzato per il [blocco ambientale già documentato](../p13/verifiche.md#ambiente-e-ispezione), senza cambiare ACL, sandbox o isolamento Electron. Le schermate storiche rigenerate dalla regressione P13 sono state ripristinate.

Identificazione della build finale; manifest completo locale `.local/p15-final-build-sha256.json`:

| Artefatto                               | SHA256                                                             |
| --------------------------------------- | ------------------------------------------------------------------ |
| `out/main/index.js`                     | `c683d49234b88740c5a0857146f5697e7d3b4a7ced6f37b00be376b7738c3fa6` |
| `out/preload/index.js`                  | `faa8ee8693ef676b814061f1d5fad17dea2d6d1c0b345dd21ad2241a0745a884` |
| `out/renderer/assets/index-BOUYwop0.js` | `8444bf9a33a995581e3d7bacc7f5cd38222355c9580579311b1473e0dad4c9e7` |

Nessun difetto di integrità noto nel perimetro verificato. Questa consegna riguarda la build, non un nuovo pacchetto Windows. Suite desktop completa, migrazioni cumulative e pacchetto integrato restano a M3 dopo P16/UI03; installer e installazione restano P20.

## Limiti e passaggio a P16

P16 può usare `ServiceRepository.get/all/list`, `recalculateService` e il piano dei soggetti, conservando la categoria e il contesto originale della bozza. Per una modifica CATALOG consentire il mantenimento del tipo disattivato già associato, distinto dalla nuova selezione; non riusare indiscriminatamente il controllo di creazione. La descrizione rimane corrente, mentre le versioni anagrafiche seguono il proprio istante storico.

Per selezionare un tipo diverso usare `requireSelectable` e chiamare `markUsed` per il nuovo tipo nella stessa transazione. Il solo mantenimento di un tipo disattivato già associato usa `get` e non richiama `markUsed`, che verifica intenzionalmente la selezionabilità.

Per eliminare una prestazione, cancellare esplicitamente prima `service_activity_subjects` nella stessa transazione; risultati e riferimenti economici sono colonne dell'attività. Non azzerare `has_ever_been_used`. Ricalcolare solo quando cambiano dati pertinenti: le sole note devono conservare traccia, contesto e basi. Prima di cambiare momento, tipo o stato verificare i vincoli del piano e l'eventuale anteprima; non introdurre un passaggio FREE↔CATALOG.

Modifica, eliminazione, consuntivazione esplicita e ricerca completa restano P16; variazioni dei pesi restano P19. Dopo P16 seguono revisione tecnica e UI03. Suite desktop completa, migrazioni cumulative e pacchetto finale sono pianificati a M3; nessun trigger anticipato di confezionamento è introdotto da P15. M2 resta chiusa sull'integrazione v14.
