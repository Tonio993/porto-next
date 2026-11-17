# Automazione delle verifiche e riduzione del contesto

Piano operativo del 17 novembre 2026, base `72cda3c`, M3 chiusa e schema applicativo v16. Ogni Vxx è un’attività distinta da assegnare a una chat; questo documento contiene schede e avanzamento, mentre i prompt vengono preparati alla partenza del singolo task.

## Obiettivo e fonti

Ridurre letture dei log, chiamate ripetitive agli strumenti e preparazione manuale delle evidenze, conservando la copertura richiesta. La durata dei processi non misura il consumo di token: confrontare volume effettivamente letto in chat, chiamate agli strumenti, interventi manuali e tempi di diagnosi. Quantificare il risparmio soltanto dopo un confronto osservato.

La frequenza dei controlli resta quella del [piano §7.3](piano-implementazione-prestazioni.md#73-criteri-comuni-di-completamento); esecuzione e consegna seguono [AGENTS](../AGENTS.md) e [guida documentale](guida-documentazione.md). [M3](m3/chiusura.md) offre esiti e manifest reali da consultare per esempi, senza rileggere tutti gli allegati a ogni task. Gli script locali M3 sono diagnostiche storiche: estrarre soltanto comportamenti riutilizzabili, senza trasformarli direttamente in un nuovo insieme di dipendenze operative.

## Sequenza e avanzamento

Eseguire V01 → V02 → V03 prima di riprendere **P17A**. Usare poi il primo task funzionale come riscontro operativo e rivalutare V04–V07: sono pianificati, non prerequisiti per proseguire lo sviluppo. Costi e benefici sono valutazioni relative, non stime temporali o percentuali di risparmio.

| ID  | Attività                                 | Beneficio                  | Costo       | Dipendenze | Stato       | Consegna                                             |
| --- | ---------------------------------------- | -------------------------- | ----------- | ---------- | ----------- | ---------------------------------------------------- |
| V01 | Risultati strutturati e report sintetico | Molto alto                 | Medio-basso | Nessuna    | Completato  | [Formato v1 e comandi](v01/risultati-strutturati.md) |
| V02 | Coordinatore e profili                   | Molto alto                 | Medio       | V01        | Da avviare  | —                                                    |
| V03 | Avvisi e adozione documentale            | Alto                       | Basso       | V02        | Da avviare  | —                                                    |
| V04 | Ripetizioni mirate e consolidamento      | Alto                       | Medio       | V01–V02    | Pianificato | —                                                    |
| V05 | Riuso verificabile di build ed esiti     | Alto per esecuzioni lunghe | Alto        | V02, V04   | Pianificato | —                                                    |
| V06 | Diagnostica e acquisizioni desktop       | Medio-alto                 | Medio       | V01–V02    | Pianificato | —                                                    |
| V07 | Ottimizzazione della durata              | Da misurare                | Medio-alto  | Misure V02 | Opzionale   | —                                                    |

Stati: Da avviare, Pianificato, In corso, Implementato/da verificare, Completato, Bloccato con causa concreta; Opzionale per V07 finché non approvato. **Prossima attività: V02.** Per ogni consegna aggiornare in posto la riga e la sezione finale di questo documento, con riferimento all’implementazione, esiti e limiti effettivi.

Per iniziare un Vxx leggere obiettivo, sequenza, scheda corrente e regole comuni; consultare le altre schede quando servono per una dipendenza.

## V01 — Risultati strutturati e report sintetico

**Ambito:** integrare i reporter JSON nativi di Vitest e Playwright e normalizzarne i risultati. Preservare i comandi esistenti e l’avvio SQLite nel runtime Electron attraverso `scripts/test.mjs`. Iniziare da una modalità esplicita di raccolta/report, senza orchestrare tutte le fasi o introdurre cache automatiche.

**Consegna:** un riepilogo Markdown breve e un JSON completo per esecuzione. Registrare runner, fase, comando/argomenti, ambiente, ambito richiesto, codice di uscita, casi e tentativi, conteggi, durata, errori e percorsi degli artefatti. Usare l’identità fornita dal runner e il contesto di progetto/file/titolo/parametri, senza dedurre l’identità dal solo numero di riga. Il riepilogo espone fallimenti, saltati, ripetizioni e controlli incompleti; mostra il primo errore utile e il comando di riproduzione, collegando stack e log completi.

**Accettazione:** conteggi coerenti con i risultati nativi, nessun numero di test fissato nel codice, nessuna estrazione ordinaria tramite regex dell’output console. Crash, errori di setup, report assenti/non validi/parziali e incoerenze fra report ed esito del processo impediscono una falsa chiusura positiva. Conservare il fallimento iniziale anche quando un tentativo successivo passa. I salti non sono successi. Gli avvisi legacy restano distinguibili dagli errori, preservando il codice di uscita originale.

**Prove:** fixture isolate per successo, asserzione fallita, errore di setup, interruzione/report incompleto, test saltato e tentativo successivo; integrazione reale con backend ed Electron/Playwright secondo §7.3. Non lasciare casi intenzionalmente falliti nelle suite applicative. Documentare comandi realmente disponibili e formato minimo, così V02 può consumarlo.

## V02 — Coordinatore e profili

**Ambito:** introdurre un piccolo coordinatore Node `.mjs`, usando i reporter V01 e gli avvii esistenti. Profili: documentazione; step con backend completo e desktop selezionato esplicitamente; milestone con controlli integrati, suite desktop completa e pacchetto; diagnostica per indagini mirate, senza presentarla come verifica completa.

**Consegna:** una invocazione avvia la sequenza appropriata e produce esiti separati per TypeScript, ESLint, formattazione, backend, build, desktop e pacchetto. Gestire progressi sintetici, timeout, errori di avvio, interruzioni e fasi non eseguite. Separare compilazione e confezionamento e impedire sovrapposizioni sugli artefatti in uso. Usare argomenti strutturati, file UTF-8 e finestre nascoste; l’ambiente di esecuzione è quello autorizzato dall’operatore/agente, senza disattivare protezioni.

**Accettazione:** ogni profilo rispetta §7.3; un controllo mancante o bloccato resta visibile. Il coordinatore non decide autonomamente nuove esclusioni di test, non modifica gli archivi dell’utente e non dichiara completati task o milestone. Il riuso automatico complesso è rinviato a V05.

## V03 — Avvisi e adozione documentale

**Ambito:** correggere esclusivamente la formattazione dei cinque legacy già segnalati, controllando invariabilità del contenuto e collegamenti. Aggiornare le indicazioni correnti sugli avvisi risolti, conservando la veridicità delle evidenze storiche.

**Consegna:** README con comandi effettivi e report; piano §7.3 collegato ai profili senza duplicarne la matrice; richiamo breve in AGENTS alla lettura del riepilogo e all’approfondimento degli errori. Definire conservazione locale e selezione delle evidenze versionate. Eseguire un primo confronto osservabile delle operazioni manuali e dell’output letto rispetto alla procedura precedente.

**Accettazione:** nessuna regola discordante e nessun comando documentato prima di essere disponibile; controlli documentali e profili interessati verificati. La formattazione globale deve distinguere eventuali nuove regressioni dalle segnalazioni effettivamente eliminate. L’adozione V01–V03 è pronta per il riscontro durante P17A.

## V04 — Ripetizioni mirate e consolidamento

**Ambito:** conservare esecuzioni immutabili, ripetere casi falliti e aggiungere esplicitamente le regressioni coinvolte dalle correzioni. Tenere distinti build, pacchetto, progetti e configurazioni. Il comando per ripetere i falliti non determina da solo tutta la copertura necessaria dopo una modifica.

**Consegna e accettazione:** riepilogo consolidato con origine di ogni esito, inventario atteso per l’ambito e storico dei tentativi. Non sostituire un’intera suite con l’ultimo comando selettivo, né promuovere test mancanti/saltati a passati. Finché V05 non dimostra la compatibilità, il riuso fra esecuzioni richiede una motivazione esplicita verificabile. Collaudare fallimento seguito da correzione, copertura incompleta e separazione fra risultati della build e del pacchetto.

## V05 — Riuso verificabile

**Ambito:** definire validità per fase attraverso impronte di sorgenti pertinenti, test, configurazioni, dipendenze, runtime e artefatti. Il solo commit Git è insufficiente con modifiche locali. Considerare gli input ambientali e temporali rilevanti e rilevare cambiamenti durante le esecuzioni.

**Consegna e accettazione:** collegamento fra input e build prodotta, risultati e artefatto verificato. Modifiche documentali non invalidano automaticamente le prove applicative; modifiche ai test non obbligano automaticamente a ricompilare l’app, ma fanno rivalutare gli esiti interessati. Compatibilità non dimostrata richiede nuova verifica. Provare sia riusi validi sia invalidazioni necessarie, preservando il requisito del medesimo eseguibile alla milestone.

## V06 — Diagnostica e acquisizioni desktop

**Ambito:** consolidare gli helper realmente duplicati, mantenendo archivi/preferenze temporanei, renderer offline, finestre nascoste e trace pertinenti. Acquisizioni e diagnostiche appartengono prima alla singola esecuzione; la promozione in documentazione è esplicita.

**Consegna e accettazione:** ogni fallimento ha evidenze individuabili e cleanup verificato; nessuna rigenerazione involontaria delle immagini storiche. Conservare tutte le asserzioni funzionali anche quando si riusano immagini. L’ispezione delle schermate e la qualità dei flussi restano valutazioni dell’agente o dell’operatore. V06 può essere anticipato dopo V02 se i problemi diagnostici si ripetono.

## V07 — Durata e parallelismo

**Ambito:** analizzare dati reali per caso, setup ripetuti, scenari troppo estesi e instabilità. Separare flussi indipendenti quando migliora diagnosi e ripetizione. Valutare parallelismo desktop limitato soltanto dopo aver verificato isolamento e contesa di processi Electron, archivi, preferenze e artefatti.

**Consegna e accettazione:** confronto prima/dopo di durata, affidabilità e lavoro diagnostico, senza ridurre copertura o indebolire asserzioni. Non aumentare timeout o retry per nascondere problemi. L’esito può motivare il mantenimento della configurazione corrente se il beneficio non è dimostrato.

## Regole comuni di consegna

- Struttura proposta: risultati in `test-results/verification/<run-id>/`, con `summary.md`, `results.json`, metadati, log e artefatti collegati. I nomi diventano contratti solo quando implementati e documentati. Dettagli e log non devono essere incollati normalmente in chat; il riepilogo resta breve anche quando i risultati completi crescono.
- Preservare i codici di uscita originali e distinguere successo, fallimento, esito incompleto, blocco ambientale, fase non richiesta e avviso noto. Nessuna soppressione generica di errori; risultati mancanti richiedono indagine. Non associare una nuova esecuzione a report residui di quella precedente.
- Applicare §7.3 alle modifiche reali di ciascun Vxx. Usare prove mirate durante lo sviluppo e fixture isolate per gli errori del coordinatore; ampliare i controlli secondo i chiamanti modificati. Non ripetere automaticamente le intere campagne M3 per ogni modifica documentale o reporter.
- Per i processi con blocchi della sandbox già documentati usare direttamente il percorso esterno autorizzato, preservando ACL, sandbox e isolamento Electron. Lo script non introduce elevazioni autonome. La scelta dei test pertinenti, l’analisi dei difetti e le ispezioni grafiche non sono delegate al solo codice del report.
- Conservare le evidenze M3; versionare riepiloghi e allegati selezionati necessari alla riproducibilità, mantenendo log completi e risultati intermedi nelle directory previste. Aggiornare questo piano in posto, con una sola sintesi finale per consegna e collegamenti ai dettagli; modificare la guida e AGENTS solo quando cambiano le rispettive regole operative.

## Consegna corrente

**V01 completato e verificato il 17 novembre 2026**, base `017cdf6`, branch `main` inizialmente pulito; schema applicativo v16 invariato. Disponibili `test:report` e `test:report:fixtures`: una esecuzione Vitest o Playwright produce `summary.md`, `results.json` v1, metadati, JSON nativi, log completi e artefatti isolati. SQLite passa sempre da `scripts/test.mjs` nel runtime Electron; i comandi precedenti sono preservati. [Contratto, identità, esiti e integrazione](v01/risultati-strutturati.md), [manifest delle prove](v01/verifiche.json).

**Verifiche finali:** 4/4 prove della raccolta con fixture isolate per successo, asserzione fallita, setup, interruzione, report assente/malformato/incompleto, salti/todo, fallimenti attesi, retry, parametri, più progetti e ripetizioni; backend completo **296/296**, incluse invarianti e migrazioni SQLite; integrazione desktop **Archivi 1/1** su Electron, offline e con archivi/preferenze temporanei; comando preesistente `npm test` verificato anche senza raccolta su Archivi **12/12**. `npm run check`: TypeScript ed ESLint passati, uscita 1 soltanto per i cinque Prettier legacy `00`–`04`, invariati e rinviati a V03. File modificati formattati, UTF-8, collegamenti e differenze Git verificati. Riusata la build M3 con tutte le cinque impronte coincidenti al manifest: nessuna modifica applicativa, di schema, runtime o confezionamento; suite desktop e pacchetto completi restano al prossimo traguardo del §7.3. Prove automatizzate su Windows x64 nel percorso esterno autorizzato, con ACL, sandbox e isolamento Electron conservati; nessuna nuova sessione manuale umana.

Un tentativo backend intermedio ha registrato **295/296** per timeout di 5 secondi nella prova che avvia tre processi Electron per confrontare i fusi, durante l’esecuzione concorrente delle fixture. La suite completa successiva, eseguita in sequenza, passa **296/296** senza modificare test, timeout o retry. Il manifest conserva entrambe le esecuzioni e i loro codici originali; nessun consolidamento o promozione automatica degli esiti. Le ultime modifiche di sola presentazione del riepilogo sono coperte dalle fixture finali; esiti e conteggi backend/desktop sono ricontrollati sui medesimi JSON nativi con il normalizzatore finale.

**Passaggio operativo a V02 — Coordinatore e profili:** consumare `formatVersion: 1` e le API di `scripts/verification/collect.mjs` e `results.mjs`, distinguendo `process.exitCode`, uscita della raccolta, `outcome`, lacune, salti e flaky. Registrare separatamente le fasi richieste/non eseguite/bloccate e coordinare build, test e pacchetto secondo §7.3. Non interpretare un solo zero come completamento del task. L’arresto forzato del collector o un disco non scrivibile possono lasciare soltanto metadati/log iniziali: V02 deve riconoscerli come incompleti. Nessun coordinatore, profilo, cache o consolidamento fra esecuzioni introdotto in V01; politica di conservazione generale e avvisi legacy restano V03, consolidamento V04 e riuso automatico V05.
