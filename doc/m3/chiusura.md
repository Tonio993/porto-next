# M3 — Prima gestione delle prestazioni

**M3 chiusa il 17 novembre 2026 sulla build integrata UI03 e sul medesimo eseguibile Windows x64, schema v16 invariato.** Base `4132d39`, branch `main` inizialmente pulito; implementazione applicativa UI03 `2e24749`. Test e helper M3 nel commit `fa9b912`. Completate le verifiche richieste dal §7.3. Prossimo task P17A, ancora da avviare.

Riferimenti: [piano §7.3](../piano-implementazione-prestazioni.md#73-criteri-comuni-di-completamento), [passaggio UI03](../ui03/revisione-flussi-operativi.md#limiti-e-passaggio-alla-chiusura-m3), [registro](../stato-implementazione-prestazioni.md).

## Integrazione e riuso

Riusata la build conclusiva UI03: coincidono le quattro impronte già registrate di main, preload, JavaScript e CSS; il manifest M3 include anche HTML. Nessuna modifica a sorgenti applicative, contratti, SQL distribuito, dipendenze o confezionamento. Restano valide le [13 schermate e ispezioni UI03](../ui03/revisione-flussi-operativi.md#schermate-e-verifiche-finali), alle due dimensioni supportate; nessuna nuova campagna grafica. Le suite M3 estendono la copertura selettiva UI03 a tutti i percorsi desktop disponibili. Confezionamento senza ricompilare, in `dist`, mentre le prove della build leggono `out`; suite del pacchetto successiva a quella della build.

La prova cumulativa è stata rinominata da `m1-migrations.spec.ts` a [milestone-migrations.spec.ts](../../tests/e2e/milestone-migrations.spec.ts): copre v1–v15 → v16 e v16 corrente, con archivi popolati, copie preventive, backup, Salva con nome, trasferimento e secondo processo con preferenze vuote. Confronta schema e tutte le righe delle copie, identità, tuple temporali, importi int64 esatti, soggetti, riferimenti e metadati, con integrità e FK. [Matrice e invarianti dettagliate](allegati/copertura.md).

La suite completa ha individuato un’aspettativa superata in [Archivi](../../tests/e2e/archives.spec.ts): cercava ancora il segnaposto delle prestazioni indisponibili. Il test ora verifica la consultazione vuota e i due comandi di registrazione disabilitati senza nave, tornando attraverso la navigazione Archivi. Nessuna correzione applicativa. Gli helper di Prestazioni e UI03 riusano nel pacchetto le immagini della build, come i flussi precedenti: saltano soltanto le acquisizioni delle finestre nascoste, conservando tutte le asserzioni funzionali, visive sul DOM e di focus. Sulla build questo ramo non cambia il percorso, quindi ne conserva gli esiti.

## Verifiche finali

| Controllo                       | Esito                                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                      | **296/296**, 28 file, SQLite nel runtime Electron.                                                                              |
| `npm run check`                 | TypeScript ed ESLint passati; uscita **1** per i soli cinque documenti Prettier legacy `00`–`04`. Nessuna nuova regressione.    |
| Desktop sulla build             | **39/39 percorsi distinti**, sulla build UI03 invariata.                                                                        |
| Windows x64 `--dir`             | Generato dalla medesima build; **5/5** file applicativi estratti dall’ASAR coincidenti, PE x64.                                 |
| Desktop sul medesimo eseguibile | **39/39** percorsi, comprese migrazioni cumulative, copie, trasferimento, riavvio e renderer offline.                           |
| Impronte dopo le suite          | **138/138** file della distribuzione invariati rispetto al manifest precedente ai test; build e sorgenti applicative invariati. |

La suite integrale della build ha concluso **38 test riusciti e l’errore Archivi descritto sopra**. Dopo il riallineamento sono stati ripetuti integralmente Archivi e il cumulativo rafforzato con UUID/letture IPC: **2/2**, conservando gli altri esiti compatibili secondo §7.3. Il ramo della build negli helper delle schermate non cambia. La suite del pacchetto è passata integralmente sullo stesso eseguibile, senza ricompilazioni o sostituzioni. Il backend completo resta valido dopo le sole modifiche ai test desktop e ai documenti. Nessun difetto applicativo o di integrità emerso nel perimetro verificato.

Comandi conclusivi sulla build pronta e sul pacchetto:

```powershell
npm test
npm run check
node node_modules/@playwright/test/cli.js test --output test-results/m3-desktop
node node_modules/@playwright/test/cli.js test tests/e2e/archives.spec.ts tests/e2e/milestone-migrations.spec.ts --output test-results/m3-final-regressions
node scripts/package.mjs --dir
node scripts/test-packaged.mjs
```

Ambiente Windows x64, Node.js 24.21.0, npm 12.2.1, Electron 45.2.3, Electron Builder 26.18.0. Confezionamento distinto dalla build: riusata quella UI03 identificata dalle impronte, senza richiamare gli script che ricompilano. Conservati [manifest build/sorgenti](allegati/build-sha256.json), [pacchetto prima](allegati/package-prima-tests-sha256.json) e [dopo i test](allegati/package-dopo-tests-sha256.json), più [esiti e impronte dei test](allegati/esiti.json). Questi allegati riportano le impronte complete di eseguibile, ASAR, driver SQLite N-API, runtime e risorse locali e il confronto con il contenuto ASAR. Log completi in `.local/m3-*`, risultati e trace in `test-results/`; gli esiti selezionati restano nell’allegato versionato.

| Artefatto                                                                          | SHA256                                                             |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `dist/win-unpacked/Porto Next.exe`                                                 | `dd14159e22f08837ffa99686a613a99fd60f3b734fe8ae7e3ca7c14a38bc0ab9` |
| `dist/win-unpacked/resources/app.asar`                                             | `ef04721a1d7c4ca85fac5e0a168a68d8c258933215aedc75de2f0064ef878707` |
| `resources/app.asar.unpacked/node_modules/better-sqlite3/prebuilds/win32-x64.node` | `e21e5efd71fba66578e95b62554d9028064a80dafd7221bf8a8ef155de8d240a` |

Crashpad ha aggiunto durante la suite un solo file runtime `debug.log` (diagnostiche `TransactNamedPipe 0xE9`, già note nell’ambiente). Nessuno dei 138 file originali è cambiato. Il log è conservato in `.local/m3-packaged-runtime-debug.log` con dimensione e SHA256 nell’allegato degli esiti, e rimosso dalla distribuzione prima del confronto finale riuscito. Nessuna ricompilazione, modifica o sostituzione dell’eseguibile.

## Limiti e passaggio a P17A

Prove automatizzate su un solo Windows x64, con processi, percorsi e preferenze differenti: **nessuna seconda macchina fisica e nessuna sessione manuale umana**. Le ispezioni dell’agente restano quelle UI03. Renderer offline, archivi e preferenze temporanei, helper delle finestre nascoste. Electron/Playwright eseguiti direttamente nel percorso esterno alla sandbox dell’agente già autorizzato, preservando ACL, sandbox e isolamento Electron. Pacchetto `--dir` con icona Electron corrente e senza certificato di firma configurato. Nessun installer generato. Installer e installazione rimangono a P20; accessibilità estesa e ulteriori DPI a UI04/P20.

Passaggio operativo: [P17A — Consuntivare operazioni con replay](../piano-implementazione-prestazioni.md#p17a--consuntivare-operazioni-con-replay). Partire da [validazione della sequenza](../../src/backend/domain/operations/sequence.ts), [OperationService](../../src/backend/application/operations/operation-service.ts), [OperationRepository](../../src/backend/infrastructure/database/operation-repository.ts), [contesto prestazioni](../../src/backend/domain/services/context.ts), soggetti e [ricalcoli condivisi](../../src/backend/application/operations/operation-impacts.ts). Progettare la ricostruzione delle permanenze preservando identità ancorate, riattribuzione FREE/CATALOG e assegnazioni compatibili; anteprima prima/dopo e conferma atomica devono rifiutare prestazioni orfane e contesti obsoleti. Conservare convenzioni UI03 e recupero delle scritture incerte post-P16. Nessuna implementazione P17 o installer in questa consegna; prossima verifica completa a M4, salvo i trigger anticipati del §7.3.
