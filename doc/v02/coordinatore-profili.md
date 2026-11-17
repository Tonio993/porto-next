# V02 — Coordinatore e profili

Coordinatore locale Node `.mjs` sulla base `5140cc8`, schema applicativo v16 invariato. Frequenza e copertura autorevoli restano nel [piano §7.3](../piano-implementazione-prestazioni.md#73-criteri-comuni-di-completamento). Stato e sintesi delle prove nella [consegna V02 conservata sotto](#verifiche-e-passaggio-a-v03); il [contratto V01](../v01/risultati-strutturati.md) rimane valido.

## Comandi e profili

Da PowerShell nella radice del repository, con Node 24:

```powershell
# Documenti espliciti: UTF-8, destinazioni e ancore Markdown locali, diff e Prettier globale.
node scripts/verification/coordinator.mjs documentazione --document doc/v02/coordinatore-profili.md --document doc/piano-automazione-verifiche.md

# Step: selezione desktop obbligatoria; ripetere --desktop e --document per più file.
node scripts/verification/coordinator.mjs step --document doc/v02/coordinatore-profili.md --desktop tests/e2e/archives.spec.ts

# Milestone: tutte le suite, prima sulla build poi sul medesimo pacchetto.
node scripts/verification/coordinator.mjs milestone --document doc/v02/coordinatore-profili.md

# Diagnostica: copertura sempre parziale, anche quando le fasi passano.
node scripts/verification/coordinator.mjs diagnostica --phase backend --backend tests/unit/archive-service.test.ts
node scripts/verification/coordinator.mjs diagnostica --phase desktop --desktop tests/e2e/archives.spec.ts

# Alias npm: .cmd preserva gli argomenti PowerShell.
npm.cmd run verify -- documentazione --document doc/v02/coordinatore-profili.md
npm.cmd run test:report:fixtures
```

| Profilo          | Fasi richieste                                                                                                                                                                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `documentazione` | Documenti espliciti, `git diff --check`, Prettier globale.                                                                                                                                                                                                 |
| `step`           | Documenti, diff, TypeScript node e web separati, ESLint, Prettier, fixture V01/V02, backend completo, build, file desktop scelti esplicitamente.                                                                                                           |
| `milestone`      | Controlli dello step, desktop completo incluse migrazioni cumulative, confezionamento Windows `--dir` senza ricompilare, suite desktop completa sul medesimo eseguibile. Nessun installer.                                                                 |
| `diagnostica`    | Fasi esplicite con `--phase`; le dipendenze si aggiungono sempre. `--backend` seleziona file unitari soltanto qui; senza selezione il backend è completo. Desktop senza selezione esegue la suite completa, conservando l'etichetta di copertura parziale. |

I file desktop/unitari sono argomenti strutturati, senza opzioni runner libere che possano ridurre implicitamente le suite. Non vengono introdotti retry, esclusioni, cache, consolidamento o riusi automatici. I comandi precedenti restano disponibili; `test:report:fixtures` esegue ora i file Node in sequenza, come il coordinatore. Le fixture precedono il backend: il fallimento delle fixture lo blocca, evitando esiti senza un sistema di raccolta verificato e la concorrenza che aveva provocato il timeout V01 sui fusi.

## Piano, dipendenze e report

[coordinator.mjs](../../scripts/verification/coordinator.mjs) espone `createPlan`, `coordinate`, `readCollector` e `runSummary`. Le iniezioni `cwd`, `runCollect`, `runExecute` e `progress` servono alle fixture isolate. `collect` conserva le API V01 e aggiunge `env`, `outputRoot` e `onDirectory`: ambiente effettivo registrato, output annidato nella fase, notifica del tentativo prima dell'avvio del processo.

Ogni invocazione valida crea una directory nuova `test-results/verification/<data-UTC>-coordinator-<suffisso>/`:

- `plan.json`: profilo, ambito, timeout, fasi richieste e non richieste, dipendenze, comandi e argomenti previsti;
- `results.json`: `formatVersion: 1`, `kind: coordinator`, piano delle fasi con stato effettivo, istanti, durata, errori, contesto e percorsi dei dettagli;
- `summary.md`: riepilogo breve, aggiornato prima dell'avvio e dopo ciascuna fase, con collegamenti ai dettagli;
- `<fase>/execution.json`, `stdout.log`, `stderr.log`: comando, ambiente pertinente, risultato e output integrale per i controlli di processo;
- `<fase>/collection/<tentativo>/`: report V01 completi per backend e desktop. `collectorDirectory` viene salvato prima dell'avvio del runner, anche se manca successivamente `results.json`.

La build dipende da entrambi i TypeScript; il desktop dipende dalla build; il confezionamento dipende dalla build; i test del pacchetto dipendono dal confezionamento. Nessuna fase dipendente parte dopo un prerequisito fallito, incompleto, interrotto o bloccato: `out` e `dist` residui non diventano artefatti appena prodotti. Le fasi indipendenti proseguono per raccogliere gli altri esiti. Compilazione con electron-vite e confezionamento con `scripts/package.mjs --dir` sono fasi distinte; non si invocano gli alias che ricompilano. Le migrazioni cumulative sono parte della suite desktop completa; il profilo milestone controlla anche la presenza di `milestone-migrations.spec.ts` nei due report.

Un lock esclusivo `.local/verification.lock` protegge l'intera invocazione, compresi lettori e produttori degli artefatti: una seconda invocazione produce un report con fasi `blocked`, senza avviarle. Il lock riporta PID e directory proprietaria; non viene rimosso automaticamente dopo un crash. Prima di rimuovere un lock residuo controllare che il proprietario e i suoi processi siano terminati. Il protocollo protegge le invocazioni del coordinatore: i comandi nativi preesistenti, conservati, devono essere eseguiti separatamente e non possono essere coordinati se avviati esternamente senza questo protocollo.

Gli avvii sono senza shell, con `windowsHide: true`. Backend sempre tramite `scripts/test.mjs` ed Electron; desktop con archivi/preferenze temporanei e renderer offline degli helper correnti. L'ambiente ripulisce `ELECTRON_RUN_AS_NODE`, le variabili interne di raccolta e `PORTO_PACKAGED_EXE`; solo `packaged-desktop` riceve `dist/win-unpacked/Porto Next.exe`. Nessuna elevazione autonoma o modifica di ACL/sandbox: l'operatore sceglie il percorso autorizzato.

## Esiti e arresti

Gli stati di fase sono `not-requested`, `not-executed`, `running`, `blocked`, `passed`, `failed`, `incomplete`, `known-warning`. `completed` indica che il coordinatore ha scritto la conclusione dell'invocazione, non che tutte le verifiche siano riuscite. Se viene ucciso senza poter concludere, restano `completed: false` e gli ultimi stati salvati. Anche un tentativo V01 con soli metadati/log e senza risultato finale è incompleto.

Per V01 si leggono la versione, `process.exitCode`, `exitCode` del collector, `outcome`, `issues`, errori e conteggi coerenti. Zero con salti/flaky resta visibile e rende la fase incompleta ai fini del profilo. Nessun conteggio atteso è fissato nel codice. Lo stato del collector e i suoi codici originali rimangono nei dettagli della fase, separati dall'uscita del coordinatore.

L'uscita complessiva è `0` solo se tutte le fasi richieste sono passate senza lacune e il profilo non è diagnostico; `1` per un fallimento senza incompletezze; `2` per incompletezze/blocchi, soli avvisi noti o copertura diagnostica. Incompletezze prevalgono sui fallimenti; i singoli fallimenti restano registrati. Un report positivo non attesta automaticamente la chiusura di task o milestone.

Prettier viene eseguito normalmente con `--check .`: output e codice originali restano intatti. Solo in caso di uscita `1`, una diagnosi aggiuntiva attraverso le API Prettier separa le cinque segnalazioni legacy note dalle altre differenze. `known-warning` richiede differenze esclusivamente nei cinque percorsi registrati; errori di parsing, altre uscite e nuove differenze rimangono errori. V03 ha corretto la formattazione dei cinque file: senza differenze Prettier restituisce `0` e la fase è `passed`. La diagnosi compatibile con gli esiti precedenti rimane disponibile; nessuna esclusione o semantica di uscita è cambiata. [Adozione V03](../v03/adozione-documentale.md).

Il timeout predefinito è 30 minuti per fase, modificabile esplicitamente con `--timeout-ms`; non cambia timeout o retry dei test. SIGINT/SIGTERM annullano la fase corrente e impediscono l'avvio delle successive; il timeout lascia invece eseguire gli altri controlli indipendenti. L'arresto usa il primitivo V01 sul solo albero avviato. In entrambi i casi viene scritto il riepilogo finale quando il processo può ancora scrivere su disco.

## Verifiche e passaggio a V03

Consegna storica V02 e passaggio registrati alla sua chiusura, conservati dopo l’adozione V03:

**V02 completato e verificato il 17 novembre 2026**, base `5140cc8`, branch `main` inizialmente pulito; schema applicativo v16 invariato. Disponibile `verify` con i profili `documentazione`, `step`, `milestone`, `diagnostica`: piano registrato prima dell'avvio, risultati per fase e riepilogo aggiornato con collegamenti ai dettagli. TypeScript, ESLint, formattazione, fixture, backend, build, desktop, confezionamento e desktop del pacchetto restano separati. I report V01 v1 e i comandi precedenti sono preservati. [Contratto, comandi e limiti V02](#comandi-e-profili), [manifest selezionato](verifiche.json); [esiti storici V01](../v01/verifiche.json).

**Verifiche finali:** profilo `step` reale con documenti espliciti e `--desktop tests/e2e/archives.spec.ts`: TypeScript node/web, ESLint, UTF-8, collegamenti e differenze Git passati; **13/13 fixture** (4 V01 e 9 V02), poi backend completo **296/296** con SQLite Electron e migrazioni, build e desktop **Archivi 1/1**, offline e con archivi/preferenze temporanei. Nessun salto, flaky o retry nelle integrazioni reali. Profili, dipendenze, avvii falliti, timeout, interruzioni, artefatti residui, report parziali/mancanti e lock verificati con fixture isolate. Una seconda invocazione reale durante lo step è stata bloccata senza avviare verifiche, con report incompleto e uscita coordinatore `2`, come atteso. Controlli finali documentali sul testo aggiornato tramite il profilo `documentazione`; diagnostica riconoscibile come parziale anche con processo riuscito. Prettier mantiene i cinque soli avvisi legacy `00`–`04`, zero regressioni nuove, log e uscita originale `1`: stato `known-warning`, uscita coordinatore `2`. Le fasi separate equivalgono ai controlli di `npm run check`; nessuno zero è usato da solo come prova di completezza.

La build è stata prodotta per collaudare la sequenza reale del coordinatore: **5/5** impronte del payload coincidono con M3; **138/138** file del pacchetto M3 sono invariati. Gli input applicativi, SQL, runtime e dipendenze native non cambiano; le sole differenze rispetto agli input M3 sono il launcher di raccolta V01 e gli alias npm. Riusate le prove complete M3 e le ispezioni UI03; nessuna nuova campagna M3 o confezionamento. Le ultime correzioni al limite massimo del timer Node e al riepilogo dopo errore di rilascio lock sono coperte da una ripetizione **9/9** delle fixture V02 e da ESLint; riusate le integrazioni reali perché comandi, ambienti, dipendenze e artefatti non cambiano. Profili milestone/pacchetto verificati con fixture; suite complete alla prossima milestone **M4**, salvo trigger anticipati del §7.3. Prove automatizzate Windows x64 nel percorso esterno autorizzato, senza modificare ACL, sandbox o isolamento Electron; nessuna nuova sessione manuale umana. Il lock protegge le invocazioni del coordinatore, mentre i comandi nativi esterni richiedono esecuzione separata. Dopo arresti forzati il lock residuo richiede il controllo del proprietario; errori di scrittura possono impedire i report finali.

**Passaggio operativo a V03 — Avvisi e adozione documentale:** correggere esclusivamente la formattazione dei cinque legacy, conservando contenuto, link ed evidenze storiche; aggiornare README, piano §7.3 e richiamo AGENTS con i comandi ora disponibili, senza duplicare la matrice. Definire conservazione locale e selezione delle evidenze versionate e svolgere il primo confronto osservabile delle operazioni manuali e dell'output letto. Usare `summary.md` e approfondire soltanto fasi problematiche, `issues`, conteggi e log collegati. Il coordinatore non chiude task/milestone e non seleziona autonomamente regressioni. Nessun consolidamento V04 o riuso automatico V05; completare V03 prima di P17A.
