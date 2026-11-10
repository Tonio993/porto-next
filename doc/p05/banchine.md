# P05 — Banchine

Data 11 novembre 2026. Base integrata `592af7e` (P04 e UI01). Implementazione `f966ba8`. Stato completato e verificato anche nel pacchetto Windows. Migrazione `0006_berths.sql`, schema v6.

Riferimenti [piano](../piano-implementazione-prestazioni.md), [registro](../stato-implementazione-prestazioni.md), [P00](../p00/decisioni-iniziali.md), [P04](../p04/versioni-e-ciclo-di-vita.md), [UI01](../ui01/revisione-post-p04.md) e [CU-ANA-10](../legacy/02-requisiti-funzionali-e-casi-uso.md#cu-ana-10--gestire-le-banchine-di-un-porto).

## Percorso e decisioni

In Anagrafiche → Porti, il pannello Banchine del porto selezionato comprende anche le identità disattivate. L'elenco è paginato per progressivo. La selezione mostra nome corrente, stato individuale, selezionabilità effettiva e cronologia paginata. I dialoghi Mantine per creazione, modifica e conferma riprendono le convenzioni UI01, comprese le etichette, gli errori per campo e il ritorno del focus.

La creazione produce una versione iniziale senza decorrenza e richiede un porto attivo. Le decorrenze delle versioni successive si risolvono nel fuso operativo del porto proprietario. La correzione descrittiva conserva la tupla temporale già salvata. La decorrenza iniziale resta assente, la versione iniziale non è eliminabile e gli intervalli hanno inizio incluso e fine esclusa.

La bozza di creazione chiusa è conservata nel porto selezionato finché la vista rimane montata. Cambiare porto o archivio ricrea la vista. Una bozza conserva sessione e revisione acquisite. È possibile aggiornare esplicitamente i dati della creazione e riaprire una versione per ripartire dalla revisione attuale. Elenco, dettaglio, risoluzione ed effetti scartano le risposte obsolete nei rispettivi ambiti. Il passaggio di una versione a corrente aggiorna la consultazione senza scrivere nell'archivio.

## Persistenza e riferimenti

`BerthService`, `BerthRepository` e `BerthApi` sono specifici della tipologia. La migrazione aggiunge identità, versioni, prenotazioni e contatore globale. La FK obbligatoria collega ogni banchina al porto, un trigger SQL rende immutabile l'appartenenza e una FK composta assicura che ogni prenotazione rispetti l'ambito del proprietario. La chiave segue la normalizzazione P00. I nomi storici rimangono riservati fino all'eliminazione dell'intera identità. Il contatore avanza con la creazione nella stessa transazione e sopravvive all'eliminazione.

La selezionabilità è derivata dai due stati correnti. La consultazione usa l'elenco completo. Per i futuri riferimenti, `BerthApi.list` offre `selectableOnly` e `BerthRepository.requireSelectable(portId, id)` verifica entrambi gli stati e l'appartenenza nel backend. Chi introduce una scrittura operativa deve chiamare questo controllo nella propria transazione per i nuovi riferimenti.

L'anteprima di disattivazione P04 elenca le banchine attive che perdono selezionabilità. L'anteprima di eliminazione P04 elenca tutte le banchine del porto come blocchi, incluse le disattivate. La conferma ripete l'analisi. Per porti e banchine, i controlli ispezionano anche le FK esterne, comprese quelle composte, prima della scrittura. Identità, versioni e prenotazioni possedute dalla banchina sono rimosse esplicitamente nella stessa transazione.

Le modifiche di versione, la disattivazione e l'eliminazione usano `PreviewStore` con sessione, revisione, scadenza ed effetti paginati. La conferma della banchina applica l'operazione registrata dal server e consuma l'anteprima dopo il commit. Riattivare una banchina modifica il suo stato individuale anche se il porto è disattivato.

## Verifiche

`npm test` ha superato 100 test su 11 file con SQLite reale nel runtime Electron. Le prove P05 coprono omonimia tra porti, unicità Unicode e prenotazioni storiche, progressivi dopo riapertura, immutabilità, transizioni temporali, selezionabilità, riferimenti senza cascata, rollback delle scritture, migrazione v5 con copia preventiva e conservazione dei dati P04, incluso un porto con versione futura e prenotazione. È verificato anche il rollback della migrazione. La guardia IPC è verificata su tutti i canali Banchine.

La build Electron finale ha superato il percorso `berths.spec.ts`, avviato con un archivio v5. Il percorso verifica copia preventiva, creazione, correzione ed eliminazione di versioni, selezionabilità, anteprime obsolete, focus, cambio archivio e integrità dei riferimenti. Sono passati tutti e sette i percorsi desktop eseguiti sulla build Electron, compresi archivi, creazione porti, ciclo di vita del porto, risposte asincrone, riferimenti temporali e UI01.

La verifica guidata con Playwright a 960 × 700 ha esercitato la creazione, il ritorno del focus, la visualizzazione di un nome lungo e l'anteprima di eliminazione bloccata. Il pannello e la finestra mantengono lo scorrimento orizzontale a zero. Le schermate sono state ispezionate. La verifica grafica è stata condotta dall'agente sulla build Electron.

Il pacchetto Windows x64 in formato directory è stato generato con `node scripts/package.mjs --dir`. Main, preload e asset del renderer nel file ASAR coincidono byte per byte con la build finale. Con `PORTO_PACKAGED_EXE` impostato sull'eseguibile in `dist/win-unpacked`, Playwright ha superato **2 percorsi su 2** in 5,1 minuti. Il percorso Banchine apre e migra un archivio v5 con la copia preventiva. Il secondo percorso verifica il ciclo di vita del porto. La prova desktop è stata eseguita fuori dalla sandbox dell'agente per gli ACL Windows. Il renderer Electron usa `sandbox: true`.

`npm run check` ha superato TypeScript ed ESLint. Prettier globale ha segnalato soltanto i cinque documenti legacy `00`–`04` già registrati.

## Passaggio di consegne

P06 può riusare coordinatore, anteprime, sequenza degli intervalli, risoluzione delle decorrenze secondo il contesto pertinente, guardia IPC e componenti Mantine condivisi. Clienti e agenzie richiedono contratti, archivi di prenotazione e contatori distinti e la sola ragione sociale prevista dalla scheda P06. La selezionabilità delle banchine sarà applicata alle scritture operative quando verranno introdotte. Anche ricalcoli e vincoli di consolidamento dipendono dai moduli operativi e dalle fatture delle slice successive.
