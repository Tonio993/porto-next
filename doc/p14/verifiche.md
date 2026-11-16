# Evidenze P14

Implementazione `a554e27`, base `0beb74f`, schema v15. Prove del 13 novembre 2026. Windows x64 e runtime Electron del progetto, dipendenze e confezionamento invariati. La [nota operativa](prestazione-libera.md#verifiche-finali) conserva la sintesi finale.

## Comandi e copertura

- `npm run check`: TypeScript ed ESLint passati; formattazione globale con i soli cinque legacy già registrati. Log `.local/p14-check-final.log`.
- `npm test`: 263 casi passati su 28 file nel runtime Electron, log `.local/p14-tests-full.log`. I 25 casi P14 sono stati ripetuti dopo l'estensione delle prove di eliminazione delle versioni, tutti passati; gli altri esiti restano validi. Log `.local/p14-tests-final-targeted.log`.
- Le due prove di migrazione esportano dati operativi reali nel DDL v14 distribuito, confrontano tutte le righe e la copia preventiva, verificano int64, tuple, identità e revisione. Un indice in conflitto forza il rollback dopo la creazione delle nuove tabelle: archivio e sessione precedente sono conservati. Le prove del servizio verificano inoltre FK/CHECK, scritture atomiche, rollback dopo INSERT e riattribuzione, anteprima riutilizzabile dopo errore e consumo dopo commit.
- `npm run build`: build finale pronta, log `.local/p14-build-final.log`. Nessuna compilazione durante le serie desktop.

Comandi desktop sulla build pronta:

```powershell
node node_modules/@playwright/test/cli.js test tests/e2e/services.spec.ts tests/e2e/assignments.spec.ts tests/e2e/operations.spec.ts tests/e2e/movements.spec.ts tests/e2e/inter-port-movements.spec.ts
node node_modules/@playwright/test/cli.js test tests/e2e/services.spec.ts tests/e2e/assignments.spec.ts --output test-results/p14-final
node node_modules/@playwright/test/cli.js test tests/e2e/services.spec.ts --output test-results/p14-services-final
node node_modules/@playwright/test/cli.js test tests/e2e/services.spec.ts --grep 'P14 funzionale' --output test-results/p14-functional-final
```

La prima serie conserva cinque esiti validi su entrata/uscita e spostamenti interni/esterni, funzionali e asincroni. La ripetizione riguarda entrambi i percorsi di assegnazione e quelli nuovi di prestazione dopo la correzione dell'anteprima obsoleta e dello scorrimento della nuova vista. I test P14 correggono inoltre i selettori dei Select Mantine. Log `.local/p14-desktop.log`, `.local/p14-desktop-final.log`, `.local/p14-services-final.log` e `.local/p14-functional-final.log`. Entrambi i percorsi P13 sono passati nella seconda serie. Il percorso asincrono P14 è passato dopo la correzione dei selettori dei campi obbligatori; il funzionale ha evidenziato e poi verificato la correzione della riapertura della stessa riga. L’ultima modifica riguarda soltanto la selezione del dettaglio nella nuova vista: gli altri esiti restano validi. Risultato finale: 9/9 percorsi pertinenti, con riuso dei cinque operativi, dei due P13 e dell’asincrono P14.

I casi backend P14 coprono confini di entrata/partenza/arrivo/uscita, trasferimenti, disambiguazione tra porti, gap/overlap, stati, soggetti indipendenti e override, importo int64, testi invalidi, assenza di tariffazione propria, aggiornamenti delle versioni e cancellazione delle versioni applicate. Le regressioni desktop sono selezionate perché condividono cronologia, impatti e assegnazioni estesi dal task.

Avvii desktop eseguiti direttamente attraverso il percorso autorizzato fuori dalla sandbox dell'agente, su richiesta dell'utente, senza ripetere il blocco ACL documentato in [P13](../p13/verifiche.md#ambiente-e-ispezione). ACL, sandbox e isolamento Electron preservati. Archivi e preferenze temporanei, renderer offline e finestre nascoste. Nessuna sessione manuale umana.

## Identificazione della build

Main e preload coincidono con la prima build della serie: le correzioni riguardano il renderer delle assegnazioni e la nuova pagina Prestazioni. Dopo le prove P13 e quella asincrona P14, l’ultima build cambia soltanto la selezione del dettaglio delle prestazioni, verificata dalla ripetizione funzionale. I percorsi riutilizzati non coinvolgono le rispettive modifiche successive. Manifest locali `.local/p14-first-build-sha256.json` e `.local/p14-final-build-sha256.json`.

| Artefatto                                | SHA256                                                             |
| ---------------------------------------- | ------------------------------------------------------------------ |
| `out/main/index.js`                      | `19cf77f578e2cc5706f90eaf5a2bd2cfdda200c882953f626c87e63b3efed336` |
| `out/preload/index.js`                   | `a0cfbacbe5e7b4eb1ed031b3aebe29113cdf4ac2b592393fdb3691742ddd0428` |
| `out/renderer/index.html`                | `280353f3591f6fde1f358bda836159912604c5c4f7a4232ca47bc8f84cdeabb9` |
| `out/renderer/assets/index-B-FyslAn.js`  | `a3d531d11eda866817c23ed2b3360561e5d363a3d29630d672fc56c2cc44bb44` |
| `out/renderer/assets/index-BbhoCpPl.css` | `ee67612e89661146e4404c0e8318606fa815016f4a8d06c097450f90fca7addb` |

Pacchetto, suite desktop completa e migrazioni cumulative restano pianificati a M3 dopo P16 e UI03. Il pacchetto M2 continua a identificare la precedente integrazione v14.| Artefatto | SHA256 |
| --- | --- |
| `out/main/index.js` | `19cf77f578e2cc5706f90eaf5a2bd2cfdda200c882953f626c87e63b3efed336` |
| `out/preload/index.js` | `a0cfbacbe5e7b4eb1ed031b3aebe29113cdf4ac2b592393fdb3691742ddd0428` |
| `out/renderer/index.html` | `9fa84826c47d47eec1d4cfc73cf151a3623749368ab69dd9eb5a94b09944fb26` |
| `out/renderer/assets/index-BbhoCpPl.css` | `ee67612e89661146e4404c0e8318606fa815016f4a8d06c097450f90fca7addb` |
| `out/renderer/assets/index-Bi2-LMmd.js` | `2168ffe82c89950de9fff385076c22a33012b739811f425e78ae71be31262ae3` |

Pacchetto, suite desktop completa e migrazioni cumulative restano pianificati a M3 dopo P16 e UI03. Il pacchetto M2 continua a identificare la precedente integrazione v14.
