# UI03 — Revisione grafica e operativa dei flussi P09–P16

**UI03 completata e verificata sulla build Electron il 17 novembre 2026.** Base effettiva `c1ee663` su `main`, inizialmente pulito. Implementazione e test nel commit `2e24749`. Schema **v16 invariato**. **M3 rimane aperta**.

Riferimenti: [piano §§3.5 e 7.3](../piano-implementazione-prestazioni.md#35-revisioni-grafiche-e-usabilità-del-frontend), [convenzioni UI02](../ui02/revisione-anagrafiche-e-catalogo.md#convenzioni-per-p09-e-slice-successive), [revisione tecnica e passaggio P16](../p16/ciclo-vita-prestazioni.md#revisione-tecnica-post-p16), [registro](../stato-implementazione-prestazioni.md).

## Osservazione e decisioni

Prima delle modifiche sono stati avviati Electron reale, renderer offline e archivi/preferenze temporanei. Acquisite e ispezionate cinque schermate iniziali a dimensioni native **960×700** e **1440×960** (contenuto Windows rispettivamente 944×661 e 1424×921). Il campione iniziale comprendeva 28 prestazioni su due pagine, una descrizione estesa, note lunghe, una nave in viaggio con visita e ormeggio aperti e tariffa applicabile. Il campione finale aggiunge una prestazione CATALOG e soggetti assegnati al viaggio, con agenzia esplicita su una prestazione FREE.

Problemi osservati: i filtri aperti occupavano tutta l’area di consultazione; elenco e dettaglio si inseguivano nello stesso scorrimento; la descrizione lunga comprimeva categoria, stato e importo fino a spezzare parole e cifre. Operazioni e permanenze avevano poca separazione visiva fra elenco, dettaglio e livelli della struttura. I soggetti mostravano subito identificativi tecnici, mentre l’origine esplicita o ereditata richiedeva di interpretare la fonte.

Correzioni circoscritte al renderer:

- [Prestazioni](../../src/renderer/src/app/services/Services.tsx): filtri con riepilogo del numero attivo, area dei campi limitata e scorribile, comandi di consultazione raggruppati. Risultati e dettaglio hanno scorrimenti indipendenti: affiancati a desktop, sovrapposti alla misura minima. La paginazione resta fuori dallo scorrimento delle righe. Intestazioni stabili, larghezze leggibili per stato e base, giorno separato dall’ora locale con offset. Le descrizioni nell’elenco occupano al massimo tre righe: testo integrale nel dettaglio e nel suggerimento nativo; gli importi restano stringhe esatte. La selezione è esposta con `aria-pressed` e bordo più spesso, oltre al colore.
- [Anteprima prestazione](../../src/renderer/src/app/services/ServicePreview.tsx): valori prima/dopo affiancati e intestati separatamente, contenuti lunghi raggiungibili con scorrimento, messaggi testuali per pronta, bloccata, obsoleta e scaduta. La scadenza segue `expiresAtUtc` del backend e disabilita la conferma; si torna ai dati per generarne una nuova. Il backend resta autorevole. L’eliminazione usa una conferma distruttiva riconoscibile; le azioni finali dei dialoghi riusano `form-actions` UI01.
- [Soggetti effettivi](../../src/renderer/src/app/operations/SubjectValues.tsx): nome e fonte in evidenza, indicazione esplicito/ereditato rispetto al livello consultato, riferimenti di versione e identità espandibili. Applicazione a dettaglio/anteprime di prestazioni, componenti economiche delle operazioni e assegnazioni a viaggio, visita, ormeggio e operazione. Cliente e agenzia restano indipendenti.
- [Operazioni](../../src/renderer/src/app/operations/Operations.tsx): elenco e consultazione delimitati, regioni scorribili raggiungibili da tastiera, selezione e vista attiva esposte semanticamente; permanenze con livelli visivamente distinti. [Dettaglio](../../src/renderer/src/app/operations/OperationDetail.tsx): componenti economiche denominate in italiano e separazione esplicita fra base operativa e futura idoneità alla fatturazione. Assegnazioni e registrazione riusano le azioni finali visibili nello scorrimento del dialogo.
- Errori FREE: importo invalido associato al campo, problemi di validazione restituiti dal backend visibili nell’editor e descrizione/base associati ai rispettivi campi. Focus iniziale sul momento della prestazione o sulle sole note; Escape e ripristino esplicito al comando di origine, senza doppio ripristino Mantine. Durante la scrittura chiusura da Escape/pulsante disabilitata, secondo le convenzioni degli altri flussi.

L’ultima rifinitura distingue il caricamento del dettaglio dalla richiesta di selezione, anche alla misura minima; una risposta ritardata viene esercitata nella prova degli stati. Il selettore del tipo nei filtri non mostra l’obbligo della registrazione CATALOG e consente di rimuovere direttamente il filtro, conservando i comportamenti di selezione e consultazione storica negli editor. Nella consultazione di tutte le navi il nome nave compare anche nella riga dell’elenco. Al minimo, il dettaglio conserva almeno 180 px di altezza nel workspace scorribile; le descrizioni lunghe hanno titolo sintetico e comando **Descrizione completa**, verificato in apertura e chiusura. Il testo integrale resta anche nel titolo accessibile e compare senza sintesi a desktop.

La nuova prova di tastiera ha riprodotto un difetto nell’apertura delle assegnazioni: il dialogo inizialmente mostra il caricamento, quindi il campo marcato per il focus viene montato dopo il primo passaggio della trappola Mantine. `AssignmentEditor` assegna ora il focus alla prima ricerca dopo l’arrivo dei campi, una volta per apertura; le modifiche alla bozza non lo spostano. Le regressioni dei quattro livelli e dell’asincronia vengono ripetute dopo questa correzione.

Nessuna modifica a dominio, backend, contratti, preload, sessioni, migrazioni, dipendenze o confezionamento. Il recupero post-P16 conserva ricerca riuscita prima di consentire la ripetizione, candidati consultabili e paginati, bozza originale e riallineamento dopo consuntivazione/eliminazione già applicata. Le regressioni FREE/CATALOG vengono ripetute sulla build UI03. Le normali protezioni asincrone e il reset del workspace sulla sessione restano quelli esistenti.

## Convenzioni per i task successivi

Mantenere un’area utile all’elenco anche con filtri e feedback aperti, includendoli nel layout residuo di UI02. Usare scorrimenti indipendenti e pagine raggiungibili; non assegnare altezze basate sul numero previsto di notifiche. Le descrizioni sintetiche dell’elenco devono aprire un dettaglio integrale; confronti ed effetti non perdono valori.

Mostrare insieme nome del soggetto, origine esplicita/ereditata e livello della fonte; lasciare consultabili le identità tecniche senza occupare il riepilogo. Conservare locale, fuso, offset e UTC e distinguere i filtri UTC dagli istanti locali operativi. Gli importi base e le simulazioni non attestano idoneità definitiva alla fatturazione.

Riutilizzare Mantine, `SubjectValues`, `PageControls` e le classi locali esistenti. Non è introdotta una nuova astrazione CRUD. P17 e P19 mantengono dipendenze e regole proprie.

Controllate le coppie cromatiche usate: testo principale su bianco **12,43:1**, testo secondario sul fondo chiaro **5,20:1**, bianco sul pulsante primario teal **5,00:1**, intestazioni di tabella **9,19:1**. Focus delimitato, bordo di selezione più spesso, etichette degli stati e attributi dei comandi mantengono riconoscibilità senza affidarsi al solo colore; queste misure non costituiscono un audit completo di accessibilità.

## Schermate e verifiche finali

Interazioni automatizzate Playwright nell’applicazione Electron e ispezioni delle immagini da parte dell’agente; **nessuna sessione manuale umana**. Conservate e ispezionate **13 immagini**, cinque iniziali e otto finali, confrontate alle dimensioni native indicate:

| Percorso                             | Prima                                                  | Dopo                                                               |
| ------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------ |
| Prestazioni, filtri aperti al minimo | [Prima](schermate/prima-prestazioni-filtri-minimo.png) | [Dopo](schermate/dopo-prestazioni-filtri-minimo.png)               |
| Dettaglio al minimo                  | [Prima](schermate/prima-prestazione-minimo.png)        | [Dopo](schermate/dopo-prestazione-minimo.png)                      |
| Elenco e dettaglio desktop           | [Prima](schermate/prima-prestazione-desktop.png)       | [Dopo](schermate/dopo-prestazione-desktop.png)                     |
| Operazione desktop                   | [Prima](schermate/prima-operazione-desktop.png)        | [Dopo](schermate/dopo-operazione-desktop.png)                      |
| Permanenze al minimo                 | [Prima](schermate/prima-permanenze-minimo.png)         | [Dopo](schermate/dopo-permanenze-minimo.png)                       |
| Confronto prima/dopo desktop         | Confronto precedentemente verticale                    | [Anteprima](schermate/dopo-anteprima-desktop.png)                  |
| Eliminazione bloccata al minimo      | Vincoli già autorevoli nel backend                     | [Anteprima bloccata](schermate/dopo-anteprima-bloccata-minimo.png) |
| Tariffa al minimo                    | Layout P09 conservato                                  | [Tariffa](schermate/dopo-tariffa-minimo.png)                       |

Selezione secondo [§7.3](../piano-implementazione-prestazioni.md#73-criteri-comuni-di-completamento): tutti i chiamanti di `SubjectValues` e degli stili operativi/di focus modificati, comprese tariffe e calcolatore. Invariati hook, navigazione generale e componenti delle anagrafiche.

- `npm test`: **296/296 test su 28 file**, SQLite reale nel runtime Electron. Incluse invarianti, migrazioni, FK implicite/composte, rollback, `foreign_key_check` vuoto e `integrity_check=ok` nei casi pertinenti; [prove Prestazioni](../../tests/unit/service-service.test.ts) e [migrazioni](../../tests/unit/services-migration.test.ts). Nessuna nuova migrazione o modifica alla persistenza. Esito riutilizzato dopo i soli interventi renderer. Log `.local/ui03-tests.log`.
- Desktop: **22/22 percorsi distinti verificati**, comprendenti registrazione e consultazione di entrate/uscite/spostamenti, permanenze, assegnazioni ai quattro livelli, tariffe/calcolatore e l’intero ciclo FREE/CATALOG. Riutilizzati 13 esiti non coinvolti dagli ultimi affinamenti; ripetuti **7/7** percorsi di assegnazioni, catalogo e filtri asincroni, risposta persa FREE/CATALOG e ricerca sui soggetti effettivi. Le due nuove prove [UI03](../../tests/e2e/ui03.spec.ts) e [stati](../../tests/e2e/ui03-states.spec.ts), **2/2** anche dopo la sola rifinitura visiva delle descrizioni al minimo, coprono 29 prestazioni paginate, filtri combinati e rimozione del tipo, assenza di risultati, dati lunghi, calcolo CATALOG, errori per campo, FK esterna reale, anteprime pronte/bloccate/obsolete/scadute, caricamento di elenco e dettaglio, bozza conservata, Tab/Shift+Tab, Escape, ritorno al comando e nuova sessione. Log `.local/ui03-regressions.log`, `.local/ui03-final-regressions.log`, `.local/ui03-final-verification.log`; risultati e trace in `test-results/ui03-*`.
- `npm run build` riuscita, distinta dal pacchetto; serie desktop eseguite a build ferma. L’ultima rifinitura modifica soltanto titolo/descrizione e spazio del dettaglio Prestazioni, quindi conserva gli esiti funzionali precedenti e richiede la ripetizione delle due prove UI03. Log `.local/ui03-build-final.log`.
- `npm run check` sul codice finale: TypeScript ed ESLint passati; uscita **1** per i soli cinque documenti legacy Prettier `00`–`04` già registrati. File modificati formattati e controllati separatamente, UTF-8, collegamenti e `git diff --check` verificati. Log `.local/ui03-check-final.log`.

Comandi sulla build pronta:

```powershell
node node_modules/@playwright/test/cli.js test tests/e2e/ui03.spec.ts tests/e2e/ui03-states.spec.ts --output test-results/ui03-final-verification
node node_modules/@playwright/test/cli.js test tests/e2e/assignments.spec.ts tests/e2e/services.spec.ts --grep 'P13|P15 asincrono|P16 asincrono|P16 ricerca|post-P16' --output test-results/ui03-final-regressions
```

Ambiente Windows x64, Node.js 24.21.0, npm 12.2.1. Avvii Electron/Playwright e SQLite eseguiti direttamente nel percorso esterno alla sandbox dell’agente già autorizzato, con archivi e preferenze temporanei, renderer offline e finestre nascoste. ACL, sandbox e isolamento Electron conservati.

Impronte della build conclusiva; manifest `.local/ui03-build-sha256.json`:

| Artefatto                                | SHA256                                                             |
| ---------------------------------------- | ------------------------------------------------------------------ |
| `out/main/index.js`                      | `6eeb6a20bb736b20666fc3347844f4c0d327aaadf86357e2e00a3fa71405759b` |
| `out/preload/index.js`                   | `610c780fdc34d1a0e51990be8b935249c49ae08945527ce3510d161d348ce179` |
| `out/renderer/assets/index-DluJBYNQ.css` | `fdde8f53c66fb7b4bc4ec1a45fc5659311f697864e7bca224950495f523cc338` |
| `out/renderer/assets/index-iyJ_IBYi.js`  | `20ccb1c4e49dfabbc7bb7222938db1a66d2896eeaceeceff78847a7f08509bd2` |

Per il riuso, le build renderer precedenti sono identificate da `765a51f0704b55bb5525b0703315372b6ec822a9c49369dce5a01dc0e655f7ed` (regressioni P09–P16 non coinvolte dagli ultimi affinamenti) e `cf0a7dd3dfbca89d251cae3549fa87fa3a868fc130f565dfb9f72bec08464e2e` (sette ripetizioni dopo le correzioni funzionali). Main e preload coincidono in tutte le serie. La differenza finale è circoscritta alla presentazione delle descrizioni lunghe e all’altezza del dettaglio, verificata nuovamente con le due prove UI03.

## Limiti e passaggio alla chiusura M3

Questa consegna riguarda UI03 sulla build Electron. Per **chiudere M3** servono suite desktop completa, migrazioni cumulative dalle versioni supportate e pacchetto Windows integrato finale con tutta la suite sul medesimo eseguibile, secondo §7.3. Nessun trigger anticipato di pacchetto: invariati runtime, risorse distribuite e dipendenze native.

Restano fuori ambito correzioni strutturali e consuntivazione delle operazioni P17, versioni dei pesi P19, fatture e idoneità economica definitiva. Accessibilità estesa, ulteriori DPI e installazione seguono UI04/P20. Le prove sul Windows disponibile non sostituiscono una sessione manuale umana o una seconda macchina fisica.
