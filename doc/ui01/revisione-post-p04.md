# UI01 — Revisione grafica iniziale post P04

Data: 10 novembre 2026. Base: `77ff771`, con modifiche documentali già presenti a piano, registro e nota P04, conservate. Implementazione: `b529c2e`. Stato: completato e verificato sulla build Electron.

Riferimenti: [piano §3.5](../piano-implementazione-prestazioni.md), [registro](../stato-implementazione-prestazioni.md), [P04](../p04/versioni-e-ciclo-di-vita.md), [decisioni P00](../p00/decisioni-iniziali.md), [contesto P01](../p01/contesto-applicativo.md), [tempo P02](../p02/numeri-e-tempo.md), [porti P03](../p03/porti.md).

## Osservazione e decisioni

Prima delle modifiche è stata compilata e avviata l'app Electron reale, con archivio e preferenze temporanei, finestra nascosta e renderer offline. La misura minima dichiarata dal main è 960 × 700; la seconda misura osservata è 1440 × 900. Le dimensioni comprendono la cornice nativa Windows: le schermate rappresentano il contenuto del renderer.

La disposizione iniziale metteva in sequenza elenco, dettaglio, cronologia, editor, anteprima e creazione. Alla misura minima l'anteprima portava la pagina a 3.620 pixel di altezza; anche senza selezione il form era sotto l'elenco. La tabella richiedeva almeno 600 pixel e assegnava una colonna a ciascun dato. Titoli, paragrafi e pulsanti dei porti avevano densità diversa dalle schermate Archivi. Riferimenti temporali ripeteva la descrizione dei comandi sui file.

Si adotta un elenco compatto affiancato alla consultazione, con scorrimenti indipendenti. Ogni elemento espone codice, nome corrente, località, paese e stato; la selezione usa bordo, fondo e testo «Selezionato». Ricerca, creazione e paginazione rimangono ai bordi dell'elenco. Il pannello destro contiene dettaglio corrente e cronologia, mantenendo distinguibili identità e versioni. La selezione resta consultabile anche se un filtro la esclude dai risultati.

Creazione, modifica e conferma usano dialoghi Mantine: le attività collegate si svolgono nello stesso spazio senza cercare il form a fondo pagina. La chiusura della creazione conserva gli input e il contesto della bozza nella stessa sessione. Chiudere l'editor annulla quella modifica. Chiudere l'anteprima torna all'editor, quando presente, conservandone la bozza. I clic sullo sfondo non chiudono i dialoghi. Escape e chiusura sono disponibili quando non è in corso un comando; la chiusura dell'editor invalida anche una risoluzione temporale pendente.

La struttura comune conserva sidebar blu scuro, ancora, accenti verde acqua e font locali Segoe UI/system. Intestazione e margini sono più compatti; il nome dell'archivio è visibile nella barra superiore. La nota sulla conservazione dei file rimane nella pagina Archivi. Descrizioni e testo secondario sono più scuri. Il colore primario Mantine usa la tonalità 8 con le ultime due voci della palette teal scurite a `#087f5b` e `#066448`: testo bianco con contrasto 5:1 sul pulsante e 7,18:1 in hover. Le tonalità iniziali rimangono quelle esistenti. Nessuna risorsa remota, font scaricato o nuova dipendenza.

## Convenzioni per P05–P07

- Mantenere la navigazione principale per sezioni e quella delle tipologie anagrafiche sopra il workspace; dichiarare indisponibili le tipologie ancora non implementate.
- Usare elenco compatto e dettaglio per consultazioni frequenti, dialoghi per inserimento/modifica e conferma. La colonna elenco è 250 pixel al minimo e 280 su desktop. I testi lunghi vanno a capo; non troncare i valori del dettaglio.
- Nel workspace anagrafiche: titolo pagina 28 pixel, titoli pannello 19, titoli versione 15, corpo 14 e testo di supporto 13; metadati compatti dell'elenco 11–12. Pannelli bianchi, bordi discreti, padding 16–20 e distanza 12–16 pixel. Usare gli stili locali e Mantine prima di introdurre nuovi componenti.
- Pulsante pieno per l'azione principale; neutro per azioni secondarie; rosso con etichetta esplicita per eliminazioni. La conferma distruttiva di una versione usa lo stesso rosso dell'eliminazione del porto.
- Distinguere «Storica / Non più in uso», «Corrente / In uso ora» e «Futura / Programmata» con testo e badge oltre al bordo colorato. Conservare locale, fuso, offset e UTC della decorrenza e il significato degli intervalli.
- `StateMessage` è il piccolo componente condiviso per informazioni, esito, attenzione e blocco, con icona e titolo. Le anteprime pronte, bloccate, obsolete e scadute hanno messaggi distinti; conferma disabilitata quando non applicabile. Conservare riepilogo, tutti gli effetti paginati e motivi dei blocchi.
- Mostrare errori nel dialogo che li ha originati, evitando la doppia notifica nella finestra. Errori per campo restano associati agli input; conflitti spiegano come ricaricare o riaprire senza ribasare automaticamente la bozza. Elenco e dettaglio espongono il caricamento; stato vuoto e ricerca senza risultati suggeriscono l'azione successiva.
- Gli input hanno etichette; il primo campo descrittivo riceve focus all'apertura. Mantine mantiene il focus nel dialogo. Dopo la chiusura si torna al comando di origine, con ripiego su «Nuovo porto» se l'elemento è stato eliminato. Nei passaggi editor → anteprima → editor non spostare il focus sulla pagina sottostante. Tabelle degli effetti e pannelli restano scorribili da tastiera.
- Riutilizzare questi componenti solo quando il comportamento coincide. Conservare contratti, repository e regole specifici delle entità; nessun motore CRUD o nuova libreria di routing/stato.

## Comportamenti conservati

Backend, schema v5, migrazioni, IPC e contratti rimangono quelli P00–P04. `usePorts` continua a possedere richieste, selezione, bozze, risoluzione e anteprime; la sola aggiunta al suo risultato di creazione comunica l'esito positivo al dialogo. Le bozze mantengono il contesto originale; ricaricare la bozza di creazione rimane un'azione esplicita. La conferma invia sempre ID dell'anteprima e contesto originale.

Il workspace continua a essere ricreato sul token di sessione, compreso «Salva con nome». `ResponseScope` e `useApplicationRequest` scartano risposte obsolete. Le query continuano a ricaricarsi alla decorrenza di una versione futura, senza scritture e senza sostituire il contesto degli editor. La prova UI01 ha rilevato un difetto preesistente nel secondo clic sul porto già selezionato: cancellava il dettaglio senza avviare una nuova query, perché l'identità della selezione non cambiava. Il clic ripetuto ora conserva il dettaglio e la cronologia; il cambio effettivo mantiene l'invalidazione originale. Nessuna banchina, anagrafica ulteriore o funzione P05 viene introdotta.

## Schermate e verifiche

Le 24 schermate prima/dopo sono in [schermate](schermate/): sette iniziali e diciassette finali, tutte ispezionate dall'agente. Le immagini finali provengono dalla build con la palette definitiva. I viewport acquisiti sono 944 × 661 e 1424 × 861, corrispondenti alle finestre native 960 × 700 e 1440 × 900.

| Percorso                      | Prima                                                          | Dopo                                                                                                                                                                      |
| ----------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Archivi, minimo               | [Avvio](schermate/prima-archivi-minimo.png)                    | [Avvio](schermate/dopo-archivi-minimo.png), [archivio aperto](schermate/dopo-archivio-aperto-minimo.png)                                                                  |
| Riferimenti temporali, minimo | [Configurazione](schermate/prima-tempo-minimo.png)             | [Configurazione](schermate/dopo-tempo-minimo.png)                                                                                                                         |
| Porti vuoti, minimo           | [Pagina completa](schermate/prima-porti-vuoti-minimo.png)      | [Workspace](schermate/dopo-porti-vuoti-minimo.png)                                                                                                                        |
| Porti e dettaglio, minimo     | [Pagina completa](schermate/prima-porti-minimo.png)            | [Dettaglio corrente](schermate/dopo-porti-minimo.png), [seconda pagina](schermate/dopo-pagina2-minimo.png)                                                                |
| Cronologia, minimo            | [Sequenza nella pagina](schermate/prima-porti-minimo.png)      | [Iniziale storica](schermate/dopo-cronologia-storica-minimo.png), [futura](schermate/dopo-cronologia-minimo.png)                                                          |
| Porti, desktop                | [Pagina completa](schermate/prima-porti-desktop.png)           | [Dettaglio](schermate/dopo-porti-desktop.png), [cronologia corrente/futura](schermate/dopo-cronologia-desktop.png), [testo lungo](schermate/dopo-testo-lungo-desktop.png) |
| Creazione e modifica, minimo  | [Editor nella pagina](schermate/prima-editor-minimo.png)       | [Creazione](schermate/dopo-creazione-minimo.png), [editor](schermate/dopo-editor-minimo.png), [errore per campo](schermate/dopo-errore-campo-minimo.png)                  |
| Anteprime, minimo             | [Anteprima nella pagina](schermate/prima-anteprima-minimo.png) | [Pronta](schermate/dopo-anteprima-pronta-minimo.png), [obsoleta](schermate/dopo-anteprima-obsoleta-minimo.png), [bloccata](schermate/dopo-anteprima-bloccata-minimo.png)  |

Le immagini iniziali includono acquisizioni a pagina intera per rendere visibile lo scorrimento originale; quelle finali mostrano il viewport e gli scorrimenti interni. Le acquisizioni dei dialoghi attendono la fine della transizione di apertura, evitando di documentare uno stato intermedio invisibile.

Le interazioni sono automatizzate tramite Playwright su Electron reale. L'ispezione delle immagini è svolta dall'agente. Nessuna sessione manuale umana o certificazione di accessibilità viene dichiarata.

Il percorso aggiunto in `tests/e2e/ui01.spec.ts` usa 28 porti, tre fasi temporali e una denominazione estesa. Controlla paginazione, ricerca con/senza risultati, conservazione della selezione, secondo clic sul selezionato, apertura da tastiera, Tab/Shift+Tab nel dialogo, Escape, ritorno del focus, conservazione della bozza dopo annullamento e anteprima, errore per campo, conflitto di revisione, conferma disabilitata e reset alla chiusura della sessione. Il blocco dell'eliminazione deriva da una vera FK in una tabella creata solo nel database temporaneo del test, senza aggiungere dati o moduli fittizi al prodotto.

Le regressioni P03/P04 mantengono le verifiche di persistenza e copie indipendenti, prenotazioni, progressivi, versione iniziale, inserimento/correzione/eliminazione, disattivazione/riattivazione, contesti originali e «Salva con nome». Il percorso asincrono verifica anche il caricamento visibile mentre una risposta è trattenuta e l'invalidazione della risoluzione dopo la chiusura esplicita del dialogo. I controlli futuro → corrente rimangono senza scritture o cambi di revisione. La prova del ciclo di vita verifica anche il ritorno del focus dopo la conferma.

Il contrasto del pulsante principale viene calcolato dai colori CSS effettivi restituiti da Electron, sia normale sia in hover, con soglia 4,5:1 e risultato allegato al test. Controlli campione della palette locale: testo secondario su bianco 5,59:1, errore per campo su bianco 6,57:1 e testo della selezione sul proprio fondo 6,65:1. Questi controlli non sostituiscono una verifica completa con tecnologie assistive.

Verifiche effettive:

- `npm run test:e2e`: build riuscita e **6 percorsi desktop su 6 passati**, in 5,3 minuti: Archivi 31,5 s; asincronia/confine temporale 31,3 s; ciclo di vita circa 1,8 minuti; creazione/consultazione 52,7 s; riferimenti temporali 31,2 s; UI01 circa un minuto. Nessun errore JavaScript nel percorso UI01. Controllata l'assenza di scorrimento orizzontale della pagina a entrambe le dimensioni, anche con testo lungo.
- `npm test`: **93 test su 10 file passati**, con il runtime Electron e SQLite reale; invariate le protezioni P00–P04 e le migrazioni. Nessun nuovo test unitario su dettagli grafici reversibili: la nuova copertura è sul comportamento desktop.
- `npm run check`: TypeScript ed ESLint passati. Prettier globale rimane non conforme soltanto sui cinque documenti preesistenti `doc/legacy/00`–`04`; formattazione dei file interessati verificata separatamente. I documenti legacy non sono stati modificati.
- Sessione di osservazione iniziale e acquisizioni finali con Playwright, preferenze e archivi temporanei e renderer offline. I percorsi desktop hanno richiesto l'esecuzione fuori dalla sandbox dell'agente per gli ACL Windows della directory Electron; sandbox Electron e ACL invariati.
- Controllo guidato aggiuntivo dei colori CSS nel dialogo Electron: titolo e messaggio d'errore `rgb(161, 38, 34)`, valore e messaggio del campo errato `rgb(180, 35, 24)`, descrizione `rgb(83, 107, 123)`. Confermata l'applicazione effettiva degli stili locali.
- Differenze Git, collegamenti locali dei documenti e immagini controllati; nessuna modifica a backend, main/preload, contratti, migrazioni o dipendenze. Le modifiche iniziali dell'utente sono conservate.

## Limiti e prossimo task

Il perimetro resta struttura comune e Porti. Le misure inferiori a 960 × 700 non sono supportate; la cronologia lunga richiede scorrimento nel pannello di consultazione. UI02 dovrà confrontare le altre anagrafiche e il catalogo con queste convenzioni; UI04 mantiene il controllo finale integrato di accessibilità e pacchetto.

Secondo il piano §7.3 non è stato rigenerato né collaudato il pacchetto Windows in UI01: questo incremento modifica renderer, stili compilati e test, senza risorse da distribuire separatamente, migrazioni o dipendenze native. La build Electron è verificata; la prova del pacchetto P04 rimane una prova storica e non viene attribuita a UI01. Installer, installazione, prove umane con screen reader e ulteriori configurazioni DPI restano fuori dalle verifiche svolte qui.

Il prossimo task funzionale è **P05**, non avviato. Conservare appartenenza immutabile della banchina, contatore globale della tipologia e controlli autorevoli sullo stato del porto; integrare i nuovi riferimenti nelle anteprime P04.
