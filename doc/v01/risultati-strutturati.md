# V01 — Risultati strutturati e report sintetico

Modalità esplicita di raccolta di **una esecuzione di test**, formato `formatVersion: 1`. Schema applicativo v16 invariato. Esiti della consegna V01 nel [manifest selezionato](verifiche.json); avanzamento e prossima attività nella [consegna corrente del piano](../piano-automazione-verifiche.md#consegna-corrente). Frequenza e copertura restano quelle del [piano §7.3](../piano-implementazione-prestazioni.md#73-criteri-comuni-di-completamento).

## Comandi disponibili

Da PowerShell, nella radice del repository:

```powershell
# Backend completo: stesso launcher di npm test, SQLite nel runtime Electron.
node scripts/verification/collect.mjs vitest --phase backend --scope 'backend completo'

# Desktop sulla build già pronta; compilare prima se la build non è valida.
node scripts/verification/collect.mjs playwright --phase desktop-build --scope 'Archivi' -- tests/e2e/archives.spec.ts

# Fixture isolate del sistema di raccolta.
npm run test:report:fixtures

# Alias npm del primo comando; .cmd preserva -- e gli argomenti in PowerShell.
npm.cmd run test:report -- vitest --phase backend --scope 'backend completo'
```

`runner`, `--phase` e `--scope` sono obbligatori. Dopo `--` si passano gli argomenti nativi, per esempio file, `--config`, `--project`, filtri dei titoli e retry espliciti. Fase e ambito sono etichette dell’operatore: non selezionano test né attestano la completezza di un task. Il collector non compila e non confeziona. I comandi precedenti `npm test`, `test:e2e` e `test:packaged` conservano il comportamento originario.

Reporter, destinazione dei report e output Playwright sono riservati alla raccolta; watch, UI e list non sono modalità di verifica supportate. Gli argomenti vengono passati come array, senza shell. Non sono introdotti retry, esclusioni, timeout o elevazioni automatici. Per eseguire test sul pacchetto si può impostare esplicitamente `PORTO_PACKAGED_EXE`, come negli helper esistenti; tale percorso viene registrato nell’ambiente. La riproduzione richiede lo stesso cwd e le variabili indicate in `environment.variables`.

## File e contratto v1

Ogni chiamata crea una directory nuova `test-results/verification/<data-UTC>-<suffisso>/`. Non usa report residui e non modifica altre esecuzioni.

| File                       | Contenuto                                                                                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `summary.md`               | Esito, conteggi, durata, codice originale e codice della raccolta, comando PowerShell, collegamenti e massimo otto problemi; errori abbreviati a 260 caratteri. |
| `results.json`             | Risultato normalizzato completo descritto sotto.                                                                                                                |
| `execution.json`           | Identità dell’esecuzione, comando, argomenti, ambiente e risultato del processo; scritto anche prima dell’avvio.                                                |
| `stdout.log`, `stderr.log` | Output integrale del processo, senza parsing per dedurre casi o conteggi.                                                                                       |
| `native/report.json`       | JSON del reporter nativo Vitest o Playwright, conservato senza riscritture.                                                                                     |
| `native/context.json`      | Contesto aggiuntivo del runner con versione e marcatore di completamento.                                                                                       |
| `native/process.json`      | Solo Vitest: eseguibile Electron, argomenti effettivi, `ELECTRON_RUN_AS_NODE`, uscita, segnale ed eventuale errore del launcher.                                |
| `artifacts/`               | Output Playwright della sola esecuzione: schermate, trace, allegati e metadati del runner secondo le opzioni effettive.                                         |

Campi del JSON normalizzato:

| Campo                                                | Contratto                                                                                                                                                                                                                                                           |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `formatVersion`, `runId`, `runner`, `phase`, `scope` | Versione intera `1`, identità locale dell’esecuzione, runner `vitest`/`playwright`, fase e ambito richiesto.                                                                                                                                                        |
| `requestedArgs`, `command`, `reproduction`           | Argomenti originali del runner, eseguibile/array degli argomenti effettivi e invocazione PowerShell riproducibile.                                                                                                                                                  |
| `environment`                                        | Cwd, sistema/architettura, Node, versioni runner/Electron, runtime del runner e valori selezionati `CI`, `TZ`, `NODE_ENV`, `PORTO_PACKAGED_EXE` se presenti; non è un dump delle credenziali d’ambiente.                                                            |
| `startedAt`, `endedAt`, `durationMs`                 | Istanti ISO UTC e durata complessiva, inclusi avvio e raccolta. Le durate dei casi/tentativi sono quelle dei runner, in millisecondi.                                                                                                                               |
| `process`                                            | `exitCode` originale, `signal`, `error`, `interrupted`; per Vitest anche `runtime` con l’esito originale Electron. Un segnale non viene trasformato in un successo.                                                                                                 |
| `outcome`, `exitCode`                                | Esito della raccolta e uscita del collector, distinti dall’uscita del processo. Vedere le regole sotto.                                                                                                                                                             |
| `counts`, `nativeCounts`                             | Totale casi normalizzati, conteggi per stato, tentativi e casi con retry; contatori dichiarati dal JSON nativo mantenuti separatamente. Nessun totale è fissato nel codice.                                                                                         |
| `cases`                                              | Identità hash SHA-256, `runnerId`, progetto/file/gerarchia dei titoli, posizione quando disponibile, contesto parametrico, stato nativo e normalizzato, stato atteso, durata, errori e tutti i tentativi. `detailsPointer` individua il caso dentro `results.json`. |
| `cases[].attempts`                                   | Stato, indice retry e ripetizione, istante, durata ed errori completi. Playwright conserva inoltre i campi nativi, inclusi stack, passi, stdout/stderr e allegati con percorsi o corpo inline.                                                                      |
| `errors`, `issues`                                   | Errori globali/setup del runner e problemi di validità/coerenza della raccolta. Gli errori dei singoli casi rimangono anche nei casi e nei tentativi.                                                                                                               |
| `artifacts`, `availableReports`, `diagnostics`       | Percorsi relativi alla directory, report effettivamente presenti ed estratto iniziale limitato di stderr per diagnosticare report mancanti; i log completi restano su disco.                                                                                        |

Le API pubbliche in [collect.mjs](../../scripts/verification/collect.mjs) sono `collect({runner, phase, scope, args, signal})`, che restituisce `{directory, result}`, e il primitivo `execute` per il processo. [results.mjs](../../scripts/verification/results.mjs) espone `normalize`, `finalize` e `summary`. Le opzioni di iniezione `command`/`cwd` servono alle fixture isolate; la CLI espone solo i due runner e le etichette richieste.

## Identità, tentativi ed esiti

La modalità aggiunge i reporter JSON nativi via CLI, senza cambiare le configurazioni ordinarie. Le opzioni usate seguono i contratti di [Vitest JSON](https://vitest.dev/guide/reporters.html#json-reporter) e [Playwright JSON](https://playwright.dev/docs/test-reporters#json-reporter). Il reporter di contesto Vitest usa le API pubbliche dei moduli/casi e `attempts()`: il JSON nativo da solo non espone ID, progetto e cronologia dei tentativi. Registra anche errori di suite e non gestiti, non sempre presenti nel JSON nativo. Si abilita `includeTaskLocation` soltanto durante la raccolta.

Playwright inventaria i test in `onBegin`, con ID effettivo, progetto, titolo espanso e `repeatEachIndex`; confronta poi i casi con il JSON nativo. Questo evita di usare come identità di tutti i contesti lo `spec.id` rimasto dopo l’accorpamento del JSON nativo. Il collegamento usa progetto/file/gerarchia dei titoli e ordine delle ripetizioni del runner; sono collaudati più progetti e `repeatEach`. Per i parametri si mantengono i titoli espansi e i metadati disponibili; non si inventano argomenti originali che il runner non espone. La posizione aiuta la diagnosi e non è l’unica identità.

Gli stati dei casi sono `passed`, `failed`, `skipped`, `incomplete`, `flaky`, `expected-failure`. Todo e salti restano saltati; un fallimento atteso non incrementa i passati ordinari. Vitest può marcare saltati i corpi impediti da un `beforeAll` fallito: l’errore di suite e il fallimento globale sono conservati. Retry riusciti sono `flaky`, con il primo fallimento e i tentativi successivi. `counts.retried` conta i casi con indice retry positivo; `counts.attempts` include anche le ripetizioni esplicite.

`outcome` è `passed`, `failed`, `incomplete`, `flaky` o `passed-with-skips`. Incomplete prevale su failed quando manca una prova coerente. Controlli su inventario, stati, conteggi, tentativi, fine del runner e processo impediscono una chiusura positiva con JSON assente, malformato, troncato o contraddittorio, zero casi, setup fallito o interruzione. I contatori descrivono i casi effettivamente recuperati: `issues` e `nativeCounts` mostrano le lacune. L’inventario non dimostra la copertura funzionale esterna all’ambito richiesto.

Il collector preserva ogni uscita non zero del processo. Se il processo restituisce zero ma il report è incompleto/incoerente, restituisce `2`, mantenendo lo zero originale in `process.exitCode`. In caso di segnale o avvio senza codice restituisce `2`. Gli esiti coerenti flaky o con salti conservano lo zero del runner, ma hanno esito e conteggi distinti da `passed`: V02 dovrà valutarli esplicitamente. Gli avvisi nei log non vengono soppressi né reinterpretati come errori di test. In particolare, V01 non normalizza `check` e non corregge gli avvisi Prettier legacy.

## Limiti e passaggio a V02

Consumare `formatVersion: 1`, leggere prima `summary.md`, poi `issues`, `errors`, `detailsPointer` e report/log collegati. Coordinare in V02 le singole fasi e registrare separatamente quelle non richieste, non eseguite o bloccate. Non trattare il solo codice zero come copertura completa: controllare anche `outcome` e i conteggi di saltati/flaky/incompleti. Le fixture intenzionalmente fallite sono generate sotto `test-results/verification-fixtures/`; la suite Node che le verifica deve riuscire.

SIGINT/SIGTERM intercettabili producono un risultato incompleto dopo l’arresto del solo albero avviato, con `taskkill /T /F` nascosto su Windows. L’uccisione forzata del collector, lo spegnimento o l’impossibilità di scrivere su disco possono impedire il riepilogo finale: restano metadati iniziali e log disponibili, da riconoscere come incompleti. Nessuna prova Windows autorizza automaticamente altre piattaforme.

Non vengono introdotti coordinatore, profili, consolidamento fra esecuzioni, ripetizioni automatiche, cache o impronte automatiche di validità. I report restano locali nelle directory già ignorate; il manifest versionato seleziona soltanto le evidenze della consegna. La politica generale di conservazione e l’adozione documentale sono V03, il consolidamento V04 e il riuso verificabile V05. Suite desktop e pacchetto completi seguono la prossima milestone secondo §7.3; V01 non cambia runtime, dipendenze native, packaging, schema o interfaccia.
