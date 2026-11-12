# P10 — Entrata, uscita e permanenze

Data: 12 novembre 2026. Base effettiva `2e2179f`, branch `main`, copia iniziale pulita. P09, UI02 e M1 integrati. Implementazione nel commit `3a34501`, successivo alla riorganizzazione documentale `ad19b3f`; documentazione e schermate nella consegna separata. Schema v11, migrazione `0011_operations.sql`; migrazioni distribuite precedenti invariate.

Stato: **completato e verificato sulla build Electron**. Il pacchetto dello schema v11 resta alla milestone M2 dopo P13.

Riferimenti: [piano §§2.2, 2.4, P10 e 7.3](../piano-implementazione-prestazioni.md), [registro](../stato-implementazione-prestazioni.md), [decisioni P00](../p00/decisioni-iniziali.md), [contratti](../p00/contratti.ts), [scenari](../p00/scenari.mts), [P02](../p02/numeri-e-tempo.md), [P04](../p04/versioni-e-ciclo-di-vita.md), [P05](../p05/banchine.md), [P07](../p07/navi.md), [P08](../p08/catalogo-e-pesi-iniziali.md), [P09](../p09/tariffe-e-calcolatore-base.md) e [UI02](../ui02/revisione-anagrafiche-e-catalogo.md). Legacy pertinente: dominio, permanenze e operazioni; requisiti CU-PER e CU-OPN-01/02/04 e sequenze; modello §§3.11–3.12. Nessun conflitto funzionale rilevato.

## Percorso disponibile e decisioni

**Operazioni nave** permette di scegliere una nave, registrare entrata e uscita, consultare le operazioni con le rispettive componenti e passare alle permanenze derivate. La consultazione è paginata per nave; i collegamenti dalle permanenze aprono l'operazione di apertura o chiusura. Porto, banchina e nave sono mostrati secondo le versioni applicate, con tuple temporali, note, calcolo e riferimenti consultabili.

La sequenza completa della nave viene validata in UTC prima della registrazione e nuovamente alla conferma. Un'entrata `PLANNED` o `PERFORMED` apre viaggio, prima visita e primo ormeggio; un'uscita strutturale li chiude insieme. `MISSED` richiede lo stesso contesto della propria tipologia, partecipa alle collisioni del minuto UTC e conserva una componente economica, ma non apre né chiude permanenze. Una mancata entrata non fornisce un'origine all'uscita successiva. Il tempo non cambia gli stati.

La banchina può mancare. Una nuova entrata richiede nave selezionabile, porto attivo e, quando presente, banchina selezionabile appartenente al porto. L'uscita richiede una nave selezionabile e deriva porto e banchina dalla cronologia; conserva l'origine già referenziata anche se porto o banchina sono stati disattivati. I controlli avvengono nella transazione del comando, anche per chiamate IPC dirette.

La disposizione fisica verifica la scelta V02 di P00: `vessel_operations`, `operation_endpoints` e `operation_charges` distinti, più `voyages`, `port_calls` e `berth_stays`. L'estremo P10 ha ruolo `OCCURRENCE`. Ogni elemento derivato ha un UUIDv4 proprio e un'apertura univoca ancorata all'operazione. Gli UUID proposti nell'anteprima sono quelli persistiti alla conferma. La chiusura aggiorna gli elementi esistenti; una nuova entrata dopo l'uscita crea nuove identità. Non esistono CRUD autonomi delle permanenze, puntatori correnti sulla nave, stati OPEN/CLOSED duplicati o un'entità Transfer.

Ogni inserimento passa da anteprima e conferma nel namespace `OPERATION_CREATE`. Il backend conserva l'operazione validata, le identità proposte e la tupla risolta; gli effetti comprendono operazione, componente e aperture/chiusure. Si riusano limite, scadenza, contesto, paginazione e consumo dopo commit di `PreviewStore`. Le violazioni di input, sequenza, selezionabilità, contesto, tempo o tariffa restituiscono errori applicativi italiani; i blocchi delle modifiche anagrafiche e tariffarie mantengono il protocollo READY/BLOCKED esistente.

## Tempo ed economia

L'entrata usa il fuso del porto di arrivo. Per l'uscita il backend risolve i porti candidati della cronologia e ammette soltanto quelli con un contesto aperto all'istante UTC risultante. `interpretationPortId` disambigua fra candidati reali; non forza un'origine. Ore inesistenti e offset estranei sono respinti; l'overlap richiede una scelta esplicita anche quando soltanto una delle occorrenze ha contesto valido. Locale, IANA, offset completo e UTC vengono conservati e riletti senza reinterpretazione con le regole IANA correnti.

Il comando chiama il calcolatore sincrono P09 dopo i controlli di selezionabilità, nella propria transazione SQLite. La tariffa è obbligatoria anche per `MISSED` e con sostituzione manuale zero. Una componente persiste versione nave, tariffa/configurazione/scaglione, sequenza/versione peso, dimensione, limiti, valori ordinari/extra, numero extra, peso e passaggi della traccia. I riferimenti sono FK reali; gli operandi decimali restano TEXT. La sola lista dei passaggi leggibili usa JSON: non è uno schema dinamico delle anagrafiche o dei calcoli.

Valore tariffario, base calcolata, sostituzione manuale facoltativa e base effettiva rimangono distinti. Il denaro usa centesimi SQLite int64 esatti, scritti come BigInt e riletti mediante CAST AS TEXT, con DTO canonici P02. Non si usa Number per gli importi. La sostituzione è non negativa e può essere zero; non elimina la traccia teorica. La base effettiva è vincolata a `coalesce(sostituzione, base calcolata)` e non viene presentata come totale finale di fattura.

## Dipendenze integrate

L'analisi tariffaria seleziona le componenti reali con porto pertinente e momento nell'intervallo `[nuova decorrenza, decorrenza successiva)`. Simula senza scrivere, espone tutti i cambiamenti e ricalcola tutte le componenti alla conferma nella medesima transazione della tariffa. Le componenti mantengono identità e sostituzione manuale, inclusi zero e `MISSED`. Gli effetti sono paginati; la pagina visualizzata non limita la conferma. Le FK esterne sconosciute restano blocchi conservativi.

Inserimento, correzione ed eliminazione delle versioni di Navi, Porti e Banchine analizzano la sequenza descrittiva proposta. Le anteprime includono le versioni applicate a operazioni e aperture delle permanenze; le variazioni della nave includono anche la traccia e gli importi dipendenti. La conferma aggiorna tutto atomicamente, comprese le FK differite quando una versione viene eliminata. I riferimenti d'identità impediscono l'eliminazione delle anagrafiche utilizzate. La disattivazione conserva le attività. Un no-op non riscrive componenti né cambia revisione.

File principali: [contratto](../../src/shared/contracts/operations.ts), [sequenza pura](../../src/backend/domain/operations/sequence.ts), [servizio](../../src/backend/application/operations/operation-service.ts), [impatti](../../src/backend/application/operations/operation-impacts.ts), [repository](../../src/backend/infrastructure/database/operation-repository.ts), [migrazione](../../migrations/0011_operations.sql), [schermata](../../src/renderer/src/app/operations/Operations.tsx). Main, guardie IPC, preload ed `env.d.ts` includono i sette metodi specifici. Coordinatore, primitive numeriche/temporali, hook asincroni, dipendenze e caricamento delle risorse restano invariati.

## Interfaccia

Elenco e dettaglio affiancati, permanenze scorribili, dialoghi Mantine, etichette, caricamenti, stati vuoti, errori, focus iniziale, Escape e ritorno al comando seguono UI02. I selettori sono paginati e mantengono visibile la scelta durante le ricerche. Una bozza chiusa può essere ripresa nella stessa vista. Le bozze e le anteprime conservano la revisione originale; il conflitto richiede ricaricamento esplicito. Elenco, dettaglio, permanenze, risoluzione ed effetti hanno ambiti indipendenti e scartano risposte tardive. Il workspace viene ricreato sul token di sessione, anche con Salva con nome.

Spostamenti, assegnazioni dei soggetti e correzioni strutturali sono dichiarati non disponibili. Non vengono anticipati i comandi di P11/P12/P13/P17 o protezioni fittizie delle fatture.

## Verifiche

`npm test`: **189 test su 22 file passati**, runtime Node di Electron e SQLite reale. Coperti sequenza completa e operazioni successive incompatibili, entrata → uscita → nuova entrata, banchina facoltativa/appartenenza, `MISSED`, collisioni UTC anche fra fusi, selezionabilità, tariffa assente, override zero e limite int64, gap/overlap/offset e disambiguazione fra porti, intervalli tariffari inclusi/esclusi, identità stabili, versioni anagrafiche, no-op, paginazione di 53 componenti e conferma completa, rollback dopo scritture parziali e durante l'aggiornamento dei metadati, consumo dell'anteprima dopo commit, scadenza, namespace, revisioni/sessioni e riapertura. Verificati tutti i nuovi canali IPC contro altri mittenti/frame e finestra assente.

Migrazione v10 popolato → v11: confronto di tutte le righe e dei metadati preesistenti, copia preventiva ancora v10, FK integre e rollback dopo DDL parziale sull'ultima tabella, conservando la sessione attiva precedente. Le aspettative delle prove precedenti sono allineate alla versione corrente; i fixture storici mantengono la versione di partenza.

Il primo avvio desktop nella sandbox dell'agente ha confermato il blocco ACL Windows già registrato. Prove successive attraverso l'esecuzione autorizzata, senza modifiche ad ACL o sandbox Electron. Dati e preferenze temporanei, renderer offline; prove Playwright automatizzate, nessuna sessione manuale umana dichiarata.

`npm run check`: TypeScript ed ESLint passati; Prettier globale segnala soltanto i cinque documenti legacy `00`–`04`, preesistenti e non modificati. File modificati formattati separatamente. `npm run build` finale riuscita.

**Sei regressioni desktop passate**, riusate secondo §7.3: Banchine, ciclo di vita Porti, Tariffe funzionale e asincrono, Navi funzionale e asincrono. La selezione copre i tre servizi anagrafici modificati, il calcolatore condiviso e i flussi di anteprima/conferma e navigazione direttamente coinvolti. Coordinatore e hook asincroni condivisi non sono stati modificati.

**Due percorsi P10 su due passati sulla build finale in 4,1 minuti**, per **otto percorsi desktop selezionati verificati complessivamente**. Il percorso funzionale apre e migra v10 conservando revisione e backup; verifica tariffa assente, gap, stati, banchina specificata e assente, override zero, collisioni UTC, entrata → uscita → nuova entrata e identità delle permanenze; crea una tariffa intermedia dall'interfaccia con tre componenti reali da ricalcolare, quindi verifica Salva con nome, rigetto della vecchia sessione e persistenza dopo riavvio. Il percorso asincrono trattiene risposte reali di dettaglio, elenco, permanenze e risoluzione; le rilascia dopo cambi di selezione, chiusura editor o sessione e verifica bozza e anteprima obsolete, ricaricamento esplicito, scelta dell'occorrenza e reset di sessione. Sono verificati Escape e ritorno del focus al comando di origine; nessun errore JavaScript rilevato nel flusso funzionale.

L'ultimo cambiamento applicativo è circoscritto al DTO delle anteprime P10: anche la paginazione restituisce soltanto i campi dichiarati, senza l'input interno di `PreviewStore`. Nessun cambiamento successivo nei chiamanti delle sei regressioni o nei loro percorsi; i relativi esiti rimangono validi.

**Quattro schermate finali ispezionate dall'agente**, conservate in [schermate](schermate/): [anteprima con calcolo teorico e override zero](schermate/anteprima-minimo.png), [permanenze](schermate/permanenze-minimo.png), [elenco e dettaglio alla misura minima](schermate/dettaglio-minimo.png) e [dettaglio desktop](schermate/dettaglio-desktop.png). Finestre native 960 × 700 e 1440 × 900, scorrimenti separati, testo leggibile e azioni raggiungibili; nessuna revisione grafica estesa anticipata rispetto a UI03. Gli helper saltano le catture nel pacchetto, conservando le asserzioni funzionali.

Impronte della build finale, comandi ripetibili, manifest e log sono nell’[allegato di verifica](verifiche.md). I controlli documentali finali preservano la riorganizzazione corrente di AGENTS, guida e archivio storico.

## Limiti e passaggio a P11

Il perimetro P10 espone creazione e consultazione. Filtri e ricerca operativa trasversale verranno estesi con le slice di consultazione; non esistono modifica/eliminazione operativa, consuntivazione, spostamenti o assegnazioni di cliente e agenzia. I contratti P00 restano il riferimento logico; P10 concretizza solo entrata/uscita con `moment` e campi di destinazione diretti, senza soggetti anticipati.

Non sono noti difetti di integrità aperti nel perimetro P10. Resta la sola non conformità documentale legacy già registrata. Differenze Git, formattazione dei file modificati e collegamenti locali controllati.

Prossimo task **P11 — Spostamento interno**: origine dalla cronologia, destinazione selezionabile, partenza e arrivo distinti in UTC, chiusura/apertura degli ormeggi nella stessa visita, componente MOVEMENT alla partenza e query di contesto ai confini/durante il trasferimento. Estendere tipi, schema e validatore attuali preservando le identità di viaggio e visita e integrando i nuovi riferimenti negli impatti. P12 aggiungerà il cambio porto e manterrà la revisione tecnica prevista; P13 completerà i soggetti effettivi.

**M2 dopo P13** mantiene controlli statici e suite backend/desktop complete sulla build integrata finale, migrazioni cumulative, trasferibilità, pacchetto Windows e intera suite sullo stesso eseguibile. P10 usa una migrazione ordinaria nel runner esistente: nessuna eccezione di packaging anticipato si applica. Il pacchetto M1 resta verificato storicamente sullo schema v9, senza attestare v11. UI03 segue P16; UI04, installer e installazione restano P20.
