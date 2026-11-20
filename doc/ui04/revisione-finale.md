# UI04 — Revisione finale

Revisione dell'interfaccia Electron integrata P17–P19, schema v17, sulla base M4 `6282ccd`/documentazione `b968662`. Stato iniziale e correzioni esaminati nell'applicazione reale con archivi/preferenze temporanei e renderer offline. Le [convenzioni UI03](../ui03/revisione-flussi-operativi.md) restano il riferimento. Esiti conclusivi e identificazione degli artefatti appartengono alla [sola sintesi P20](../p20/revisione-e-rilascio.md).

## Decisioni e correzioni

- Entrando nella modifica di un peso o tornando dall'anteprima, il campo Peso riceve il focus anche se la finestra della cronologia era già aperta: `data-autofocus` da solo non gestiva il cambio del contenuto di un dialogo già montato. La chiusura della cronologia senza bozza riporta al comando originale dopo lo smontaggio. Implementazione in [WeightHistory](../../src/renderer/src/app/weights/WeightHistory.tsx) e [Catalog](../../src/renderer/src/app/Catalog.tsx).
- Alla chiusura con bozza conservata, tariffa e peso restituiscono il focus al pulsante **Riprendi bozza** disponibile. Il comando originale può essere disabilitato finché esiste la bozza. Ref espliciti nei due chiamanti, senza ricerche testuali nel DOM o modifiche alle regole applicative; [TariffMaintenanceEditor](../../src/renderer/src/app/tariffs/TariffMaintenanceEditor.tsx) riceve il riferimento dal suo chiamante.
- L'errore del peso usa l'etichetta **Peso** ed è associato all'input tramite Mantine (`aria-invalid` e descrizione accessibile). Mantenuti l'avviso generale e l'errore sul campo, rimossa la terza ripetizione intermedia. Il backend mantiene la validazione autorevole; il renderer presenta il messaggio restituito e conserva il valore digitato.
- [PortConfirmation](../../src/renderer/src/app/ports/PortConfirmation.tsx) traduce stati, tipologia operativa, tipologia nave e selezionabilità in italiano nei valori prima/dopo. Importi esatti, date, identificativi e payload di conferma restano quelli del contratto.
- Mantenuti gli indicatori testuali e le icone per stato consentito/bloccato/obsoleto/scaduto, bozze e incertezza. Il significato non dipende dal solo colore. Tabelle degli effetti e contenuti lunghi conservano scorrimento locale e azioni accessibili.

## Ispezione e copertura

Le quattro [acquisizioni M4](../m4/chiusura.md#identificazione-e-conservazione) sono state aperte e ispezionate come base: inserimento retroattivo, blocco per orfani, tariffa e cronologia pesi. La revisione estesa aggiunge navigazione generale, anagrafiche/banchine, catalogo, tariffe, operazioni/permanenze e prestazioni, con i campioni lunghi e paginati delle suite UI02/UI03 e gli stati async già esistenti. Gli stessi percorsi sono inclusi nelle campagne sulla build e nell'eseguibile confezionato; copertura e riprese sono tracciate nella nota P20.

Finestre native Windows **960×700** e **1440×960**; contenuti rispettivamente 944×661 e 1424×921 nel Windows disponibile. Verificato anche l'ingrandimento renderer **125% e 150%** nella finestra 1440×960. Questo esercita layout e dimensione effettiva dei caratteri; non equivale a cambiare il DPI di un monitor fisico né a provare un secondo monitor. Le acquisizioni usano `BrowserWindow.capturePage` dopo due frame di rendering, per evitare il ritaglio del viewport osservato con la cattura Playwright a zoom diverso da 1. L'helper M4 usa la stessa API anche sul pacchetto: la precedente chiamata CDP andava in timeout sulla finestra nascosta. Il test verifica che la finestra resti nascosta e l'immagine sia non vuota; nessun cambiamento a timeout, retry o asserzioni funzionali.

Le regressioni verificano navigazione tramite Enter, focus iniziale/restituito, ripresa tramite tastiera e valori conservati, associazione dell'errore, tipologia/stato in italiano, raggiungibilità della conferma alla dimensione minima. Le suite UI02/UI03/M4 e async completano paginazione, testi lunghi, vuoti, caricamenti, errori, anteprime e conflitti. Non si usano asserzioni sulle sole classi CSS.

Il [campione della palette dichiarata](contrasto.json) registra rapporti di luminanza relativa sRGB di 11,57:1 per testo principale, 5,59:1 per descrizioni, 8,28:1 per navigazione attiva e 9,46:1 per navigazione inattiva. Affianca l'ispezione delle schermate reali; non costituisce un audit completo di ogni combinazione o un'attestazione WCAG. Gli avvisi sono stati esaminati anche per testo, icona e significato leggibile senza colore.

## Acquisizioni selezionate

Immagini aperte e ispezionate dall'agente, senza ritocchi. Il prima/dopo del focus e dell'associazione accessibile dell'errore è attestato dalle interazioni e dalle asserzioni, oltre alle immagini statiche. Provenienza, dimensioni e SHA256 sono nell'[indice P20](../p20/allegati/esiti.json).

| Fase             | Acquisizione                                                                | Osservazione                                                     |
| ---------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Prima, base M4   | [Catalogo al 150%](schermate/prima-catalogo-zoom150.png)                    | Gerarchia e comandi del workspace prima delle correzioni.        |
| Dopo, build      | [Errore Peso alla dimensione minima](schermate/dopo-peso-errore-minimo.png) | Etichetta, messaggio presso il campo e azioni leggibili.         |
| Dopo, build      | [Eliminazione operazione](schermate/dopo-anteprima-operazione-minimo.png)   | Tipologia e stato tradotti, effetti e conferma raggiungibile.    |
| Pacchetto finale | [Catalogo al 150%](schermate/pacchetto-catalogo-zoom150.png)                | Navigazione e contenuti nel renderer confezionato.               |
| Pacchetto finale | [Anteprima tariffa](schermate/pacchetto-tariffa-desktop.png)                | Tabelle, indicatori testuali e azioni a 1440×960.                |
| Pacchetto finale | [Errore Peso](schermate/pacchetto-peso-errore-minimo.png)                   | Riscontro a 960×700 del campo e delle azioni dopo le correzioni. |

## Limiti

Ispezioni dell'agente su acquisizioni automatiche e interazioni automatizzate; nessuna sessione manuale umana o verifica con screen reader. DPI hardware aggiuntivi, seconda macchina e prova d'installazione richiedono l'ambiente di destinazione. I limiti non sostituiscono le verifiche eseguibili previste dal piano.
