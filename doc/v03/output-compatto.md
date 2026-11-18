# Rifinitura dopo V03 — Output compatto

Base `6f22965`, branch `main` inizialmente pulito; schema applicativo v16 invariato. Solo presentazione delle verifiche e documentazione, senza modifiche applicative, SQL, dipendenze, runtime o build. Stato e unica sintesi finale delle prove nella [consegna corrente](../piano-automazione-verifiche.md#consegna-corrente); [manifest della rifinitura](output-compatto-verifiche.json). La [consegna V03 originale](adozione-documentale.md#primo-confronto-osservabile) e il suo [manifest](verifiche.json) restano separati.

## Modalità e contratti

`runSummary(run, {verbose})` e `summary(result, {verbose})` accettano una seconda opzione facoltativa; la chiamata precedente rimane valida e produce ora il riepilogo compatto. `coordinate` e `collect` accettano `verbose` per la sola presentazione. I JSON v1, i log, gli artefatti, i tentativi, la selezione dei test e la precedenza degli esiti/codici non cambiano. I conteggi dei tentativi falliti sono derivati nella vista collector, senza modificare i dati registrati.

Senza problemi, `summary.md` ha quattro righe: profilo/fase ed esito; completezza, copertura e codici; conteggi essenziali; collegamenti ai risultati completi. Il collector mostra sempre salti, flaky, fallimenti attesi, retry e tentativi falliti nei conteggi. Il coordinatore aggrega i conteggi disponibili e segnala anche le fasi passate con fallimenti attesi o retry. Le fasi richieste fallite, bloccate, non eseguite, in corso, incomplete o con avvisi rimangono visibili. Una diagnostica riuscita conserva `coverage: partial` e uscita `2`; completezza del report e copertura del profilo sono informazioni distinte. Un report vuoto, non finale o interrotto rimane incompleto.

Il coordinatore stampa normalmente avvio e conclusione complessivi, più i problemi significativi: massimo otto messaggi di fase distinti, poi un rinvio ai report. Lo stato resta consultabile nei JSON e nei due riepiloghi aggiornati su disco. La modalità dettagliata aggiunge avvio/conclusione delle singole fasi e include anche quelle passate/non richieste nel riepilogo. Il collector mantiene i log del runner su disco e stampa il riepilogo alla conclusione; non introduce streaming dei log.

I riepiloghi compatti mostrano al massimo otto fasi problematiche e otto dettagli distinti; quelli dettagliati tutte le fasi e fino a 32 dettagli distinti. I dettagli vengono puliti dai controlli terminale, abbreviati a 260 caratteri e deduplicati dopo la pulizia. Il numero dei dettagli distinti o delle fasi rimanenti è indicato insieme al rinvio ai report completi. I collegamenti ai report di fase conservano il percorso originale. Non c'è troncamento dei JSON o dei log. La riproduzione PowerShell resta nel collector compatto quando ci sono problemi; è sempre nella vista dettagliata.

```powershell
# Compatto, come impostazione predefinita.
npm.cmd run verify -- documentazione --document README.md
# Riepilogo e progressi dettagliati del coordinatore.
npm.cmd run verify -- documentazione --document README.md --verbose
# Collector dettagliato: --verbose prima del separatore degli argomenti runner.
npm.cmd run test:report -- playwright --phase desktop-build --scope Archivi --verbose -- tests/e2e/archives.spec.ts
# Per esiti già disponibili, leggere summary.verbose.md nella directory della prova.
```

Ogni esecuzione aggiunge `summary.verbose.md`; `summary.md` segue la modalità scelta. Leggere il file dettagliato già presente evita di rieseguire una verifica soltanto per ottenere una vista diversa. Sono preservati il [contratto V01](../v01/risultati-strutturati.md#file-e-contratto-v1) e le [regole V02](../v02/coordinatore-profili.md#piano-dipendenze-e-report). Nessun consolidamento V04, cache o riuso automatico V05.

## Confronto osservabile ripetuto

Il confronto ripete i tre controlli originali sugli stessi 14 Markdown di V03: UTF-8/link/ancore locali, `git diff --check`, Prettier globale. Procedura diretta, coordinatore precedente e coordinatore compatto sono eseguiti sul medesimo nuovo snapshot, senza modifiche fra le esecuzioni; impronte e argomenti sono nel manifest. La versione precedente è estratta da `6f22965` e avviata realmente da `.local/compact-output/`, con i soli due import relativi adattati alla collocazione; la radice del repository resta identica. Non si tratta di una simulazione del testo.

| Output effettivamente letto | Diretta | Coordinatore precedente | Coordinatore compatto |
| --------------------------- | ------: | ----------------------: | --------------------: |
| Progressi, byte UTF-8       |       — |                     310 |                   205 |
| Riepilogo, byte UTF-8       |       — |                     920 |                   243 |
| Totale, byte UTF-8          |     692 |                    1230 |                   448 |
| Totale, righe               |      16 |                      28 |                     6 |

Tutti gli esiti e i codici coincidono: `passed`, profilo richiesto completo, uscita `0`. Si contano stdout/stderr effettivamente restituiti più il riepilogo integrale letto: i log dei processi interni restano su disco. Sono esclusi testo dei comandi, involucri degli strumenti e output delle letture di audit. Ogni percorso coordinatore è stato letto tramite un unico wrapper che restituisce progressi e riepilogo; non si deducono riduzioni delle chiamate dai polling storici. Le impronte precedono l'aggiunta di questa tabella e delle evidenze finali.

Le misure originali V03 (692 contro 1.230 byte) restano nel manifest originale immutato. I 506 byte della simulazione preliminare non sono usati come prova; la misura nuova è osservata, non una stima di token o costi. Non vengono dedotte percentuali di risparmio economico. Il caso documentale riuscito non misura la diagnosi di un fallimento backend/desktop.

## Selezione e riproduzione delle verifiche

Secondo il [piano §7.3](../piano-implementazione-prestazioni.md#73-criteri-comuni-di-completamento), la presentazione condivisa richiede fixture V01/V02 e nuovi casi per successo completo, fallimenti, blocchi, report assenti/incompleti, interruzioni, diagnostica, salti/flaky, fallimenti attesi, retry, deduplicazione e modalità dettagliata. Si confrontano comandi e risultati nelle due modalità e si verifica che le viste non mutino gli input. Le fixture reali mantengono reporter nativi e cronologia dei tentativi.

Eseguire `npm.cmd run test:report:fixtures`, `npm.cmd run check`, backend completo tramite il collector Vitest (stesso launcher di `npm test`) e integrazione collector Playwright con `tests/e2e/archives.spec.ts`. Archivi verifica avvio Electron, copie/sessioni/revisioni e persistenza SQLite con archivio/preferenze temporanei e renderer offline. Nessuna nuova invariante o migrazione applicativa; backend completo include le regressioni SQLite già esistenti. La build valida è riusata solo dopo confronto delle cinque impronte M3 e degli input applicativi; nessuna ricompilazione o confezionamento.

Per fixture che arrestano processi, backend e desktop è usato il percorso esterno autorizzato. Il primo avvio di sole fixture coordinatore nella sandbox è rimasto fermo sul timeout: arrestato esclusivamente l'albero Node identificato, poi suite intera ripetuta all'esterno. Non sono modificati ACL, sandbox o isolamento Electron. Log e report locali rimangono separati, secondo la [politica di conservazione](../guida-documentazione.md#conservazione-delle-evidenze).

## Limiti e passaggio a P17A

Non sono misurati token effettivi, costo economico o velocità di diagnosi backend/desktop; byte, righe e durata non li sostituiscono. Una presentazione più corta non attesta la copertura funzionale. Nessuna nuova sessione manuale umana o campagna completa M3; suite desktop/pacchetto integrate a M4, salvo trigger anticipati del §7.3.

Riprendere [P17A dal passaggio M3](../m3/chiusura.md#limiti-e-passaggio-a-p17a), con `step`, documenti e regressioni espliciti. Leggere normalmente `summary.md` e soltanto i dettagli problematici; aprire `summary.verbose.md` se occorre il quadro completo. Registrare operazioni, chiamate e output realmente letto nel task funzionale. Rivalutare V04–V07 dopo tale utilizzo; la rifinitura non introduce una nuova numerazione.
