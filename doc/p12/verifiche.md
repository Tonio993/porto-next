# Evidenze ripetibili P12

La [nota operativa](spostamento-tra-porti.md#verifiche-finali) conserva la sintesi definitiva, la selezione delle regressioni e il riuso. Questo allegato identifica comandi e artefatti. Base di partenza `b1ca2a3`, implementazione nel commit `f07c859`, schema risultante v13. Windows x64, Node.js 24.21.0, npm 12.2.1, Electron 45.2.3. Nessun pacchetto generato per P12.

## Build verificata

Build di consegna prodotta con npm run build dopo la revisione tecnica, l’azzeramento dell’offset al cambio porto e la correzione del sottotitolo operativo. Nessuna ricompilazione durante ciascuna serie desktop. La nota motiva il riuso degli esiti precedenti alla sola correzione testuale.

| Artefatto                                | SHA256                                                             |
| ---------------------------------------- | ------------------------------------------------------------------ |
| `out/main/index.js`                      | `27c316f9fa8243770b7afdfd9f1ab8d45a109b357d0921091059bd80634e8db2` |
| `out/preload/index.js`                   | `45d64bfe2e10a53dfb403a439672ba300e3b38f32677376796fbbb7afa5e4e2d` |
| `out/renderer/index.html`                | `9e1acdf47df1167f5e5f2e27bc26c3afec0674652fac105d050c52a7730a59e2` |
| `out/renderer/assets/index-DPFPELMY.js`  | `7583b2b0ee96304e9f497c9983345092a1936f36c810ba2cb46ce25e2736c897` |
| `out/renderer/assets/index-D_zojK4g.css` | `ff8bd28d21163cea80ef973250a11132b297c23a9a14cb6c9d9df4b56ae8262f` |

Manifest locale: .local/p12-build-sha256.json. Le impronte identificano la build dell’implementazione registrata nel commit `f07c859`. Main, preload e CSS coincidono con la build della selezione precedente; preload e CSS conservano anche le impronte P11. La precedente build, riutilizzata per dieci percorsi non coinvolti dall’ultima correzione testuale, aveva renderer index-D9OUcyE-.js SHA256 38f1f476f7ce36b19ba8bf81b9ca8ee9f2d42128eec8c927fcd10f5df7856b4c e HTML SHA256 c841db861a83369b6417629cedeafb7afd308075e676b5ac7d5328ed3b851ec6; manifest .local/p12-build-before-copy-sha256.json.

## Comandi

Controlli sul codice finale:

```powershell
npm run check
npm test
npm run build
```

Rafforzamenti dei fixture per tariffa con decorrenza nel trasferimento, correzione simultanea delle due componenti e FK restrittiva: ripetizioni mirate dei file interessati, senza variazioni applicative backend:

```powershell
npm test -- tests/unit/operation-service.test.ts tests/unit/inter-port-migration.test.ts
npm test -- tests/unit/operation-service.test.ts
npm test -- tests/unit/inter-port-migration.test.ts
```

Percorsi desktop selezionati sulla stessa build, senza confezionamento:

```powershell
node node_modules/@playwright/test/cli.js test tests/e2e/inter-port-movements.spec.ts tests/e2e/movements.spec.ts tests/e2e/operations.spec.ts tests/e2e/operations-async.spec.ts tests/e2e/berths.spec.ts tests/e2e/port-lifecycle.spec.ts tests/e2e/tariffs.spec.ts tests/e2e/tariffs-async.spec.ts tests/e2e/vessels.spec.ts tests/e2e/vessels-async.spec.ts
```

Ripetizione sulla build di consegna dei due percorsi funzionali, dopo correzione del sottotitolo e del selettore P11:

```powershell
node node_modules/@playwright/test/cli.js test tests/e2e/inter-port-movements.spec.ts tests/e2e/movements.spec.ts --grep 'P12: v12|P11: v11'
```

Il fixture operationFixture(app, path, 12, true) crea un archivio v12 distribuito con entrata, componente e gerarchia popolate, due porti/fusi, banchine, tariffe e decorrenza nave fra partenza e arrivo. Il dialogo di apertura deve migrare a v13 e creare la copia preventiva. La prova SQLite dedicata esporta anche uno spostamento interno v12 e una componente al massimo int64, confronta tutte le righe e verifica rollback dopo copia con una FK restrittiva esterna e dopo sostituzione della tabella. Le asserzioni di destinazione schema dei test precedenti sono allineate a v13; le versioni di origine dei fixture restano invariate.

Preferenze e archivi temporanei, renderer offline, finestre nascoste secondo gli helper esistenti. Il primo avvio nel sandbox dell’agente fallisce con il blocco ACL Windows documentato in P10/P11 e UI02. Le prove desktop usano il percorso autorizzato da AGENTS senza modificare ACL, sandbox o isolamento Electron. Crashpad può emettere accesso negato nei test backend, senza impedirne l’esecuzione.

Log locali: .local/p12-backend-final-review.log (suite completa), .local/p12-backend-review-retry.log (41 test operativi), .local/p12-migration-review.log (3 migrazioni), .local/p12-check-reviewed.log, .local/p12-build-delivery.log, .local/p12-desktop-final.log (selezione) e .local/p12-desktop-delivery.log (ripetizione). Tentativi diagnostici nei log p12-desktop-target e p12-desktop-target-authorized; risultati Playwright in test-results/. Le schermate essenziali sono nella [nota](spostamento-tra-porti.md#verifiche-finali). Build e pacchetto restano distinti: pacchetto e suite integrate complete sono pianificati a M2 dopo P13.
