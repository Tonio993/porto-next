# P10 - Artefatti di verifica

Data: 12 novembre 2026. Allegato alla [nota operativa](entrata-uscita-e-permanenze.md).

Build finale del codice applicativo registrato nel commit `3a34501`, dalla base applicativa `2e2179f`:

- main SHA256 `bc76de29975ebc02501c5076a71a7fc1b64440bb88beb7d9ba58ba6b86e540b2`;
- preload SHA256 `290ff625e0a0a09e6c4ce198376aded472853ecfb4a1448180db2b18f7cb1773`;
- renderer `index-Do8oWrm5.js`, SHA256 `4b4e8d3974b116415bb0676e9ded00942fc327a9dce717ef249d2555150febc5`;
- CSS `index-D_zojK4g.css`, SHA256 `ff8bd28d21163cea80ef973250a11132b297c23a9a14cb6c9d9df4b56ae8262f`.

Manifest `.local/p10-build-sha256.json` e `.local/p10-regression-build-sha256.json`. Log finali `.local/p10-backend-final.log`, `p10-migration-final.log`, `p10-check-final.log`, `p10-build-final.log`, `p10-desktop-final.log` e `p10-desktop-recheck.log`. Le impronte distinguono la build delle regressioni dal ritocco locale finale al DTO P10; preload, renderer e CSS sono identici. Impronte ricontrollate dopo le prove; nessuna ulteriore modifica applicativa.

## Comandi e riuso

```powershell
npm test
npm test -- tests/unit/operations-migration.test.ts
npm run check
npm run build
node node_modules/@playwright/test/cli.js test tests/e2e/operations.spec.ts tests/e2e/tariffs.spec.ts tests/e2e/tariffs-async.spec.ts tests/e2e/vessels.spec.ts tests/e2e/vessels-async.spec.ts tests/e2e/berths.spec.ts tests/e2e/port-lifecycle.spec.ts
node node_modules/@playwright/test/cli.js test tests/e2e/operations.spec.ts tests/e2e/operations-async.spec.ts
```

La selezione delle regressioni ha passato sei percorsi in 13,1 minuti; il fixture del percorso P10 usava un ID tariffa non UUID ed era stato respinto dalle guardie. Corretto il solo fixture. Sulla build finale, dopo il ritocco locale al DTO P10, i due percorsi P10 sono passati in 4,1 minuti. Le sei regressioni non coinvolte sono state conservate secondo il piano, senza ricompilazioni durante le prove. I dettagli dei tentativi risolti restano nei log locali.
