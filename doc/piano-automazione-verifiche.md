# Automazione delle verifiche e riduzione del contesto

Piano operativo del 17 novembre 2026, base `72cda3c`, M3 chiusa e schema applicativo v16. Ogni Vxx è un’attività distinta da assegnare a una chat; questo documento contiene schede e avanzamento, mentre i prompt vengono preparati alla partenza del singolo task.

## Obiettivo e fonti

Ridurre letture dei log, chiamate ripetitive agli strumenti e preparazione manuale delle evidenze, conservando la copertura richiesta. La durata dei processi non misura il consumo di token: confrontare volume effettivamente letto in chat, chiamate agli strumenti, interventi manuali e tempi di diagnosi. Quantificare il risparmio soltanto dopo un confronto osservato.

La frequenza dei controlli resta quella del [piano §7.3](piano-implementazione-prestazioni.md#73-criteri-comuni-di-completamento); esecuzione e consegna seguono [AGENTS](../AGENTS.md) e [guida documentale](guida-documentazione.md). [M3](m3/chiusura.md) offre esiti e manifest reali da consultare per esempi, senza rileggere tutti gli allegati a ogni task. Gli script locali M3 sono diagnostiche storiche: estrarre soltanto comportamenti riutilizzabili, senza trasformarli direttamente in un nuovo insieme di dipendenze operative.

## Sequenza e avanzamento

Eseguire V01 → V02 → V03 prima di riprendere **P17A**. Usare poi il primo task funzionale come riscontro operativo e rivalutare V04–V07: sono pianificati, non prerequisiti per proseguire lo sviluppo. Costi e benefici sono valutazioni relative, non stime temporali o percentuali di risparmio.

| ID  | Attività                                 | Beneficio                  | Costo       | Dipendenze | Stato       | Consegna                                                 |
| --- | ---------------------------------------- | -------------------------- | ----------- | ---------- | ----------- | -------------------------------------------------------- |
| V01 | Risultati strutturati e report sintetico | Molto alto                 | Medio-basso | Nessuna    | Completato  | [Formato v1 e comandi](v01/risultati-strutturati.md)     |
| V02 | Coordinatore e profili                   | Molto alto                 | Medio       | V01        | Completato  | [Profili, comandi e report](v02/coordinatore-profili.md) |
| V03 | Avvisi e adozione documentale            | Alto                       | Basso       | V02        | Completato  | [Adozione e confronto](v03/adozione-documentale.md)      |
| V04 | Ripetizioni mirate e consolidamento      | Alto                       | Medio       | V01–V02    | Pianificato | —                                                        |
| V05 | Riuso verificabile di build ed esiti     | Alto per esecuzioni lunghe | Alto        | V02, V04   | Pianificato | —                                                        |
| V06 | Diagnostica e acquisizioni desktop       | Medio-alto                 | Medio       | V01–V02    | Pianificato | —                                                        |
| V07 | Ottimizzazione della durata              | Da misurare                | Medio-alto  | Misure V02 | Opzionale   | —                                                        |

Stati: Da avviare, Pianificato, In corso, Implementato/da verificare, Completato, Bloccato con causa concreta; Opzionale per V07 finché non approvato. **Prossima attività: P17A**, con riscontro operativo del nuovo flusso; rivalutare V04–V07 dopo tale utilizzo. Per ogni consegna aggiornare in posto la riga e la sezione finale di questo documento, con riferimento all’implementazione, esiti e limiti effettivi.

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

**Stato:** completato e verificato. Disponibile `npm.cmd run verify -- <profilo>`; [comandi effettivi, dipendenze, stati e limiti](v02/coordinatore-profili.md), [manifest delle prove](v02/verifiche.json). Sintesi conservata nella nota V02; nessuna modifica alla matrice §7.3.

## V03 — Avvisi e adozione documentale

**Ambito:** correggere esclusivamente la formattazione dei cinque legacy già segnalati, controllando invariabilità del contenuto e collegamenti. Aggiornare le indicazioni correnti sugli avvisi risolti, conservando la veridicità delle evidenze storiche.

**Consegna:** README con comandi effettivi e report; piano §7.3 collegato ai profili senza duplicarne la matrice; richiamo breve in AGENTS alla lettura del riepilogo e all’approfondimento degli errori. Definire conservazione locale e selezione delle evidenze versionate. Eseguire un primo confronto osservabile delle operazioni manuali e dell’output letto rispetto alla procedura precedente.

**Accettazione:** nessuna regola discordante e nessun comando documentato prima di essere disponibile; controlli documentali e profili interessati verificati. La formattazione globale deve distinguere eventuali nuove regressioni dalle segnalazioni effettivamente eliminate. L’adozione V01–V03 è pronta per il riscontro durante P17A.

**Stato:** completato e verificato; [adozione e confronto originali](v03/adozione-documentale.md), [manifest originale](v03/verifiche.json). Completata anche la [rifinitura della presentazione](v03/output-compatto.md), con confronto e prove separati. Sintesi nella consegna corrente.

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

- Struttura disponibile: risultati in `test-results/verification/<run-id>/`, con `summary.md`, `plan.json`, `results.json`, metadati, log e artefatti collegati, secondo il [contratto V02](v02/coordinatore-profili.md#piano-dipendenze-e-report). Dettagli e log non devono essere incollati normalmente in chat; il riepilogo resta breve anche quando i risultati completi crescono.
- Preservare i codici di uscita originali e distinguere successo, fallimento, esito incompleto, blocco ambientale, fase non richiesta e avviso noto. Nessuna soppressione generica di errori; risultati mancanti richiedono indagine. Non associare una nuova esecuzione a report residui di quella precedente.
- Applicare §7.3 alle modifiche reali di ciascun Vxx. Usare prove mirate durante lo sviluppo e fixture isolate per gli errori del coordinatore; ampliare i controlli secondo i chiamanti modificati. Non ripetere automaticamente le intere campagne M3 per ogni modifica documentale o reporter.
- Per i processi con blocchi della sandbox già documentati usare direttamente il percorso esterno autorizzato, preservando ACL, sandbox e isolamento Electron. Lo script non introduce elevazioni autonome. La scelta dei test pertinenti, l’analisi dei difetti e le ispezioni grafiche non sono delegate al solo codice del report.
- Applicare la [politica di conservazione](guida-documentazione.md#conservazione-delle-evidenze): log, JSON nativi e intermedi locali; riepiloghi e manifest selezionati versionati quando necessari alla riproducibilità. Preservare M3 e le esecuzioni precedenti, senza cancellazioni automatiche. Aggiornare questo piano in posto, con una sola sintesi finale per consegna e collegamenti ai dettagli; modificare la guida e AGENTS solo quando cambiano le rispettive regole operative.

## Consegna corrente

**Rifinitura dell’output dopo V03 completata e verificata il 17 novembre 2026**, base `6f22965`, branch `main` inizialmente pulito; schema applicativo v16 invariato. Coordinatore e collector mostrano normalmente esito globale e soli problemi, preservando contesto, completezza, copertura, codici e conteggi. Disponibili `--verbose` e `summary.verbose.md`; JSON v1, log, tentativi, selezione ed esiti rimangono compatibili. [Modalità, confronto e limiti](v03/output-compatto.md), [manifest separato](v03/output-compatto-verifiche.json). La [consegna originaria V03](v03/adozione-documentale.md#consegna-originaria-v03) e le misure originali restano conservate; nessuna rinumerazione V04–V07.

**Verifiche finali:** fixture V01/V02 e presentazione **20/20**, con ripetizione **10/10** delle fixture coordinatore dopo l’ultima correzione dei progressi omessi e **6/6** della presentazione dopo la precisazione dell’etichetta dei casi con retry; check completo, controlli documentali e differenze Git passati. Backend completo **296/296** con SQLite Electron, tutti i test e un worker esplicitamente scelto; nessun salto, flaky o retry. I due tentativi precedenti con parallelismo predefinito hanno registrato rispettivamente 14 e 11 fallimenti per timeout: report e codici originali conservati, nessuna modifica a test, timeout, retry o configurazioni. Il parallelismo predefinito resta un limite osservato in questo ambiente, non viene nascosta dalla vista compatta. Collector desktop dettagliato **Archivi 1/1** sulla build valida riusata, offline e con archivi/preferenze temporanei. Profili, blocchi, interruzioni, report incompleti, diagnostica e limiti/deduplicazione collaudati nelle fixture; le viste conservano comandi, risultati e input. Confronto reale su snapshot identico e stesso perimetro: procedura diretta **692 byte/16 righe**, coordinatore precedente **1230 byte/28 righe**, compatto **448 byte/6 righe**, inclusi progressi e riepilogo letto integralmente. Le misure V03 originali rimangono separate; nessuna misura di token o risparmio economico.

Riusata la build: **5/5** impronte M3 coincidenti; **152/154** input coincidenti, con le sole differenze storiche di launcher e alias npm identiche alla base V03 verificata. Nessuna modifica applicativa, SQL, di runtime, dipendenze o confezionamento; nessuna nuova campagna completa M3, confezionamento o sessione manuale umana. Prove con processi nel percorso esterno autorizzato, preservando ACL e sandbox Electron. Il primo avvio di fixture coordinatore in sandbox è stato arrestato sul solo albero identificato dopo il blocco della prova timeout, poi ripetuto all’esterno. Suite desktop/pacchetto integrate a **M4**, salvo trigger anticipati del §7.3; fonti e motivi di selezione/riuso nel manifest. Il riepilogo non determina la chiusura del task.

**Riscontro P17A e prossima valutazione:** P17A ha usato `step`, documenti/regressioni espliciti, lettura prioritaria di `summary.md` e approfondimenti delle fasi problematiche. [Inventario e campione di chiamate/output letti](p17a/consuntivazione-operazioni.md#riscontro-operativo-del-coordinatore), [manifest selezionato](p17a/verifiche.json). Sono documentati report desktop incompleto e riuso manuale degli esiti individuali, completamenti selettivi, build inclusa per dipendenza nella diagnostica, limite di fase e pulizia temporanea EPERM poi superata. Il campione testuale non copre l’intero task e non misura token o costi. **Rivalutare ora V04–V07** su questo utilizzo, mantenendo la diagnostica parziale e senza introdurre qui consolidamento, cache o ottimizzazioni automatiche. Prossimo passo funzionale: **P17B**; suite desktop/pacchetto integrate a M4 salvo trigger §7.3.
