# Evidenze ripetibili P11

La [nota operativa](spostamento-interno.md#verifiche-finali) contiene la sola sintesi degli esiti, la selezione delle regressioni e i limiti. Qui sono conservati comandi e identità degli artefatti. Base `7495b42`, implementazione P11 nel commit `8450b39`; schema v12. Ambiente Windows x64, Node.js 24.21.0, npm 12.2.1, Electron 45.2.3. Nessun pacchetto P11 generato.

## Build verificata

`npm run build`, dopo gli ultimi ritocchi locali di presentazione. Nessuna modifica applicativa o ricompilazione durante le successive prove desktop.

| Artefatto                                | SHA256                                                             |
| ---------------------------------------- | ------------------------------------------------------------------ |
| `out/main/index.js`                      | `fc307759c519d7e6a8edf1bdadc55184481952bf2060df3ebfd24e3384bb2395` |
| `out/preload/index.js`                   | `45d64bfe2e10a53dfb403a439672ba300e3b38f32677376796fbbb7afa5e4e2d` |
| `out/renderer/index.html`                | `46b02a37d308dc740e46b1816a20a0ef56ff52017b9801aef5f2114baff933af` |
| `out/renderer/assets/index-BC5uOxlk.js`  | `85f566bc4bbe19cdb0ea2212a028e7c6ebee22cf780a2f96ba346adc532e47fb` |
| `out/renderer/assets/index-D_zojK4g.css` | `ff8bd28d21163cea80ef973250a11132b297c23a9a14cb6c9d9df4b56ae8262f` |

Manifest locale `.local/p11-build-sha256.json`. Le impronte identificano la build del codice registrato nel commit `8450b39`. Il pacchetto M1 conserva la propria verifica storica sullo schema v9.

## Comandi

Controlli statici e suite completa nel runtime Electron:

```powershell
npm run check
npm test
```

Prove mirate durante l’implementazione:

```powershell
npm test -- tests/unit/operation-service.test.ts tests/unit/movements-migration.test.ts
```

Build e percorsi desktop selezionati, in sequenza e riusando la build:

```powershell
npm run build
node node_modules/@playwright/test/cli.js test tests/e2e/movements.spec.ts tests/e2e/operations.spec.ts tests/e2e/operations-async.spec.ts tests/e2e/berths.spec.ts tests/e2e/port-lifecycle.spec.ts tests/e2e/tariffs.spec.ts tests/e2e/tariffs-async.spec.ts tests/e2e/vessels.spec.ts tests/e2e/vessels-async.spec.ts
```

Per ripetere il solo percorso funzionale P11 sulla stessa build:

```powershell
node node_modules/@playwright/test/cli.js test tests/e2e/movements.spec.ts --grep "P11: v11"
```

Il fixture `operationFixture(app, path, 11)` crea un archivio nel DDL v11 distribuito, con entrata P10, componente e gerarchia popolate. L’apertura attraverso il dialogo Electron deve migrare a v12 e conservare la copia preventiva. Il percorso P11 controlla poi entrambe le estremità e la tariffa che cambia durante il trasferimento. `movements-migration.test.ts` confronta tutte le righe, inclusi gli int64, con il v11 popolato e verifica il rollback della migrazione parziale e la sessione attiva precedente.

Preferenze e archivi temporanei, renderer offline, finestre nascoste secondo gli helper esistenti. Nel sandbox dell’agente l’avvio Electron è impedito dal blocco ACL Windows già documentato in P10/UI02; le esecuzioni desktop richiedono il percorso autorizzato, senza modifiche ad ACL o sandbox Electron. Il runtime dei test backend può emettere la diagnostica crashpad di accesso negato senza impedire i test SQLite.

Log locali: `.local/p11-backend-final.log`, `.local/p11-check-final.log`, `.local/p11-build-final.log`, `.local/p11-desktop-final.log`; ripetizione finale `.local/p11-desktop-retry.log`; dettagli Playwright in `test-results/`. I tentativi intermedi e le correzioni dei selettori/fixture restano nei log locali. Le schermate essenziali sono conservate in [schermate](schermate/).
