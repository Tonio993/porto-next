# UI02 — Consolidamento grafico di anagrafiche e catalogo

Data: 11 novembre 2026. Base effettiva `57cf2e3`, branch `main`, copia iniziale pulita. Implementazione nel commit `8d420ac`. Schema v9 invariato. **UI02 completato**; **M1 chiusa e verificata anche sul pacchetto Windows**. Build e pacchetto verificati sono identificati dalle impronte sotto riportate.

Riferimenti: [piano §§3.5 e 7.3](../piano-implementazione-prestazioni.md), [registro](../stato-implementazione-prestazioni.md), [decisioni P00](../p00/decisioni-iniziali.md), [UI01](../ui01/revisione-post-p04.md), [Porti e anteprime P04](../p04/versioni-e-ciclo-di-vita.md), [Banchine P05](../p05/banchine.md), [Clienti e agenzie P06](../p06/clienti-e-agenzie.md), [Navi P07](../p07/navi.md), [Catalogo P08](../p08/catalogo-e-pesi-iniziali.md).

## Osservazione e correzioni

Confronto in Electron reale, renderer offline, preferenze e archivi temporanei. Finestre native Windows 960 × 700 e 1440 × 900, contenuto rispettivamente 944 × 661 e 1424 × 861. I dati comprendono 28 porti, 28 banchine dello stesso porto, 28 clienti, 28 agenzie, 28 navi e 28 tipi aggiuntivi al catalogo iniziale. La cronologia cliente contiene 28 versioni su tre pagine, con descrizioni storiche, corrente e futura. Nome lungo vicino al limite P00, sequenze senza spazi e peso esatto di 241 cifre complessive sono usati per sollecitare il layout.

Problemi osservati nelle sette schermate iniziali:

- Clienti, Agenzie e Navi avevano righe Mantine diverse da Porti e Catalogo, con denominazione, progressivo e stato nella stessa frase. I nomi senza spazi allargavano il dettaglio e producevano una barra orizzontale interna.
- Le paginazioni ripetute occupavano due righe alla misura minima; le intestazioni degli elenchi avevano altezze diverse. Il catalogo impilava ricerca e stato sotto titolo e creazione, lasciando poche righe consultabili.
- L'altezza del workspace dipendeva da una sottrazione fissa al viewport. Le notifiche aperte sottraevano spazio senza entrare nel calcolo e potevano spingere i comandi verso il fondo della pagina.
- La tabella condivisa degli effetti aveva larghezza minima e colonne determinate dal contenuto; valori estesi rendevano oneroso il confronto prima/dopo.

Correzioni circoscritte al renderer:

- Il contenitore delle due sezioni occupa lo spazio residuo fra intestazione e footer con Flexbox. Titoli, navigazione e feedback partecipano al layout; elenco e dettaglio mantengono scorrimenti indipendenti. Ritmo compatto per intestazioni, notifiche e ricerca, senza ridurre la tipografia di consultazione.
- [MasterDataListEntry](../../src/renderer/src/app/MasterDataListEntry.tsx) applica a Banchine, Clienti, Agenzie e Navi la riga già usata da Porti e Catalogo: codice/stato, denominazione in evidenza, selezione esplicita, bordo e fondo coerenti. È un pulsante nativo con `aria-pressed`; il testo rimane completo e va a capo.
- [PageControls](../../src/renderer/src/app/PageControls.tsx) sostituisce quattro copie equivalenti. Mantiene etichette, limiti, caricamento e callback originali; pulsanti compatti e indicatore trovano posto su una riga negli elenchi alla misura minima. Il componente è usato anche dalle cronologie degli stessi chiamanti.
- Catalogo: creazione accanto al titolo, ricerca e stato affiancati con etichette visibili; navigazione con spaziatura comune e pagine separate dalle righe. Restano selezione fuori filtro, descrizione corrente e pesi iniziali, senza introdurre versioni del catalogo.
- I dettagli delle tre anagrafiche aggiungono ritorno a capo anche per sequenze senza spazi. Le tabelle degli effetti usano larghezza disponibile, colonne stabili, celle allineate in alto e ritorno a capo; intestazione fissa e area scorribile da tastiera conservate. Nessun troncamento dei valori o modifica della paginazione degli effetti.

L'ispezione desktop finale ha inoltre rilevato il nome nave duplicato fra titolo e riepilogo. Nel dettaglio compare ora una sola volta; il riepilogo espone IMO, tipologia e dimensione. Le descrizioni delle versioni conservano il nome completo. Questa ultima correzione è locale a Navi e viene verificata con i due percorsi Navi e UI02, conservando gli esiti non coinvolti secondo §7.3.

Il percorso reale resta schermata → hook/API del renderer → preload specifico → guardie IPC → servizio applicativo → repository SQLite. Nessuna modifica a backend, hook asincroni, main/preload, contratti, migrazioni, dipendenze o risorse remote. Bozze e anteprime conservano il contesto originale e richiedono ricaricamento esplicito dopo conflitto. Restano reset sul token di sessione, invalidazione indipendente delle risposte e risoluzione temporale backend.

## Convenzioni per P09 e slice successive

Mantenere elenco e consultazione separati, azione di creazione riconoscibile e pagine raggiungibili senza scorrere l'elenco. Usare le righe e la paginazione condivise quando dati e comportamento coincidono. I filtri devono lasciare spazio alla consultazione anche con feedback aperto; misurare la finestra nativa minima prima di aumentare le barre superiori. Non introdurre altezze dipendenti dal numero previsto di notifiche.

Conservare le differenze funzionali: Banchine nel porto proprietario; ricerche storiche delle anagrafiche; filtro di stato e descrizione corrente del catalogo; IMO e dimensione nave; decorrenze e cronologie nelle sole entità versionate. Le funzionalità future rimangono riconoscibilmente indisponibili. Nei dialoghi riusare etichette, focus iniziale, Escape, ritorno al comando di origine e azioni di conferma UI01. Valori estesi negli effetti devono essere confrontabili senza perdere dati; lo scorrimento verticale rimane necessario per contenuti lunghi.

## Schermate

**26 immagini ispezionate dall'agente** in [schermate](schermate/): sette iniziali dalla build P08 e diciannove finali dalla build UI02, comprese cinque acquisizioni valide riutilizzate dai percorsi esistenti. Le acquisizioni intermedie sono sostituite da quelle del risultato finale. Interazioni automatizzate con Playwright; nessuna sessione manuale umana.

| Percorso         | Prima                                                 | Dopo, minimo                                               | Dopo, desktop                                   |
| ---------------- | ----------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------- |
| Porti            | [Porti](schermate/prima-porti-minimo.png)             | [Porti con notifica](schermate/dopo-porti-minimo.png)      | [Porti](schermate/dopo-porti-desktop.png)       |
| Banchine         | [Banchine](schermate/prima-banchine-minimo.png)       | [Banchine](schermate/dopo-banchine-minimo.png)             | [Banchine](schermate/dopo-banchine-desktop.png) |
| Clienti          | [Clienti](schermate/prima-clienti-minimo.png)         | [Clienti](schermate/dopo-clienti-minimo.png)               | [Clienti](schermate/dopo-clienti-desktop.png)   |
| Agenzie          | [Agenzie](schermate/prima-agenzie-minimo.png)         | [Agenzie](schermate/dopo-agenzie-minimo.png)               | [Agenzie](schermate/dopo-agenzie-desktop.png)   |
| Navi             | [Navi](schermate/prima-navi-minimo.png)               | [Navi](schermate/dopo-navi-minimo.png)                     | [Navi](schermate/dopo-navi-desktop.png)         |
| Cronologia lunga | [Terza pagina](schermate/prima-cronologia-minimo.png) | [Terza pagina](schermate/dopo-cronologia-minimo.png)       | Coperta anche dalla consultazione cliente       |
| Catalogo         | [Catalogo](schermate/prima-catalogo-minimo.png)       | [Filtri e peso esteso](schermate/dopo-catalogo-minimo.png) | [Catalogo](schermate/dopo-catalogo-desktop.png) |
| Effetti estesi   | Convenzioni UI01/P08                                  | [Confronto prima/dopo](schermate/dopo-effetti-minimo.png)  | Stesso componente condiviso                     |

Acquisizioni valide riutilizzate dalla suite finale: [creazione catalogo](schermate/dopo-creazione.png), [eliminazione bloccata](schermate/dopo-eliminazione-bloccata.png), [clienti vuoti](schermate/dopo-clienti-vuoti.png) e [anteprima obsoleta](schermate/dopo-anteprima-obsoleta.png). Queste ultime due usano anche la misura nativa predefinita 1280 × 850. I flussi completi esercitano errori per campo, conflitti, stati vuoti e caricamento; UI02 mantiene le convenzioni UI01 per questi stati.

Anche l'[errore per campo nel dialogo](schermate/dopo-errore-campo.png) proviene dal percorso UI01 ripetuto sulla build integrata, alla misura minima.

## Verifiche UI02 e M1

Selezione: modifiche a struttura comune, righe, paginazione e conferma coinvolgono tutte le anagrafiche e il catalogo. Si esegue l'intera suite desktop, richiesta anche da M1, insieme a check e backend completi. Nessuna migrazione nuova; la milestone verifica cumulativamente tutte le versioni distribuite v1–v8 e il trasferimento dello schema corrente.

- `npm run build`: riuscito sulla build applicativa finale. Main SHA256 `365a246ea4ae480f7d4ce54f73ca68948a4187837996e31378721b3e7d660a2d`; preload `ed797312367ab4e175826119e41ad4b57a69fcd349026f624e1f4b8ea22f253b`. Renderer `index-BCkJrz96.js` SHA256 `ce908fdc1441b88d3153ff2d014b90ad62397505a2ceb34e4361681d3105f66e`; CSS `index-DTEK0Ynn.css` SHA256 `e3819d6968aa95b11cd48b17a67bf616095978dea36ddaa364430c3f801dbcfa`. Manifest completo locale `.local/m1-build-sha256.json`. Ambiente Windows x64, Node.js 24.21.0, npm 12.2.1, Electron 45.2.3.
- `npm test`: **149 test su 18 file passati**, 4,50 s, nel runtime Electron con SQLite reale. Inclusi invarianti, revisioni, no-op, contatori, prenotazioni, rollback, FK reali, migrazioni e copie dei task P00–P08.
- `npm run check`: TypeScript ed ESLint passati; Prettier globale segnala esclusivamente i cinque documenti legacy `00`–`04`, preesistenti e lasciati invariati. Formattazione dei file modificati verificata separatamente.
- `ui02.spec.ts`: percorso mirato passato prima della suite completa. Verifica entrambe le dimensioni native, ricerca senza risultati, pagine degli elenchi e della cronologia lunga, selezione, creazione da tastiera, focus/Escape, notifica aperta, filtro catalogo e selezione conservata, peso esteso e tabella effetti da tastiera. Almeno 100 pixel utili per le righe e assenza di overflow della pagina controllati nel percorso con notifica.
- `m1-migrations.spec.ts`: v1–v8 popolati aperti e migrati a v9 con confronto di tutte le righe preesistenti, metadati e revisioni conservati, integrità/FK verificate. Copia preventiva ancora nella versione di origine, quattro pesi inizializzati, backup v9, Salva con nome con nuova sessione, trasferimento del solo file e riapertura. Le prove backend esistenti mantengono rollback dopo DDL parziale e sessione precedente conservata.

**Desktop: tutti i 17 percorsi verificati.** L'esecuzione completa ha prodotto 15 esiti positivi in 19,5 minuti e due arresti: un selettore Banchine legato al vecchio ordine nome/stato e un timeout di cattura della finestra nascosta in Navi. Corretto il solo selettore Banchine; nessuna asserzione funzionale rimossa. L'ispezione successiva ha motivato la correzione locale del riepilogo Navi. Sulla build aggiornata sono passati **5 percorsi su 5 in 6,9 minuti**: Banchine, migrazioni cumulative, UI02 e i due percorsi Navi. I dodici esiti non coinvolti rimangono validi secondo §7.3; nessuna modifica a backend o CSS dopo la suite completa. I test finali includono dettaglio Banchine nelle due misure, assenza di overflow interno e trasferimento a un secondo processo con preferenze vuote. Il precedente esito dei 149 test backend rimane valido: l'ultima correzione modifica soltanto la presentazione Navi.

Comandi desktop: `node node_modules/@playwright/test/cli.js test`, poi `node node_modules/@playwright/test/cli.js test tests/e2e/berths.spec.ts tests/e2e/m1-migrations.spec.ts tests/e2e/ui02.spec.ts tests/e2e/vessels-async.spec.ts tests/e2e/vessels.spec.ts`. Le acquisizioni UI02 sono esportate con `PORTO_UI02_SCREENSHOTS=1`; normalmente restano in `test-results/`. Check ripetuto sulla revisione applicativa finale, con TypeScript/ESLint passati e la sola segnalazione legacy.

**Pacchetto Windows generato** con `node scripts/package.mjs --dir`, riusando la build finale senza ricompilarla. I cinque artefatti main/preload/renderer estratti dall'ASAR coincidono byte per byte con la build. Eseguibile `dist/win-unpacked/Porto Next.exe`, SHA256 `2d75363e2d4a51a5ea56a55a7420524ae4544bb935aad362821da266c6df03a5`; `resources/app.asar`, SHA256 `b5fbf2a3514dc951b507ce50ab69da463e07f207d5df639550ab099f3c2e2e63`. Manifest `.local/m1-package-sha256.json`.

Il primo confezionamento nella sandbox è fallito con `connect EACCES` sul download del runtime. La ripetizione autorizzata ha scaricato Electron 45.2.3 e completato il pacchetto x64. Nessuna modifica alle dipendenze o alla configurazione di distribuzione; nessun installer generato. Il controllo diagnostico dell'ASAR usa percorsi normalizzati Windows.

`node scripts/test-packaged.mjs`: **17 percorsi su 17 passati in 22,6 minuti**, intera suite desktop sul solo eseguibile sopra identificato. Inclusi migrazioni cumulative v1–v8 → v9, conservazione dei dati, copie, backup, riapertura e trasferibilità con preferenze vuote. Gli helper saltano le catture delle finestre nascoste, mantenendo le asserzioni funzionali, i dati temporanei e il renderer offline. Dopo la suite, eseguibile e ASAR conservano le impronte registrate e i cinque artefatti inclusi coincidono ancora con la build. Nessuna ricompilazione o rigenerazione fra i test. **M1 è chiusa sul risultato integrato finale**, con la sola non conformità di formattazione legacy preesistente.

Log completi `.local/ui02-*.log`, `.local/m1-*.log`; artefatti Playwright in `test-results/`. Il primo avvio nella sandbox dell'agente è fallito per gli ACL Windows già documentati. Le prove desktop richiedono esecuzione autorizzata fuori da tale sandbox, preservando ACL, isolamento e sandbox Electron. Le diagnostiche crashpad di accesso negato non hanno impedito il passaggio dei test backend.

Chiusura documentale: formattazione dei file modificati, differenze Git e **115 collegamenti locali** nei quattro documenti aggiornati controllati, senza riferimenti mancanti. README, piano e registro riportano lo stato corrente separando UI02 da M1 e dalle consegne storiche.

## Limiti e passaggio di consegne

Nessun cambiamento funzionale oltre P00–P08. Le liste e le cronologie estese richiedono scorrimento nei propri pannelli; i testi senza spazi vanno a capo senza essere abbreviati. Nessuna certificazione completa di accessibilità, sessione umana con screen reader o verifica di ulteriori DPI. La trasferibilità è provata fra percorsi e processi con preferenze isolate sullo stesso Windows; non è stata usata una seconda macchina fisica. Installer e prova di installazione restano P20. Restano le revisioni tecniche dopo P12/P16 e i checkpoint grafici UI03/UI04.

Non sono noti difetti di integrità aperti nel perimetro verificato. Il prossimo task funzionale è **P09 — Tariffe e calcolatore base**, con P05/P07/P08 integrati e schema v9. Tariffe e variazioni successive dei pesi sono ancora indisponibili; queste ultime restano P19. P15 dovrà aggiornare l'utilizzo monotono del catalogo nella stessa transazione della prestazione. Le verifiche estese successive restano associate a **M2 dopo P13**; ogni slice esegue nel proprio step i controlli e le regressioni pertinenti secondo §7.3.
