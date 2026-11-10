# Spike P00: numeri e momenti

Esperimento circoscritto alla scelta di `decimal.js` e `@js-temporal/polyfill`. Non contiene servizi applicativi, migrazioni o funzionalità dell'interfaccia.

## Installazione e verifica

Dalla radice del progetto, con Node.js 24:

```powershell
npm ci
npm --prefix spikes/p00 ci --ignore-scripts
npm run verify:p00
```

Le dipendenze di questo esperimento hanno un manifest e un lockfile separati. Dopo l'installazione, la verifica funziona offline. Per eseguire soltanto le prove con Node di sviluppo:

```powershell
npm --prefix spikes/p00 run verify
```

`verify:p00` controlla con TypeScript i [contratti](../../doc/p00/contratti.ts) e gli [esempi](../../doc/p00/scenari.mts), quindi ripete le prove con Node di sviluppo e con il runtime Node incluso in Electron. L'esecuzione Electron usa `ELECTRON_RUN_AS_NODE=1` e non apre finestre. Le prove con fusi diversi usano processi figli e non cambiano il fuso del computer.

## Cosa dimostra

- Decimal clone con precisione esplicita, prodotto esatto, arrotondamento `ROUND_HALF_UP`, extra calcolati come interi e limite dei centesimi int64.
- Risoluzione di momenti locali, gap, due occorrenze di un'ora ambigua, offset non valido, calendario non valido, fuso non valido e confronti UTC tra porti.
- Indipendenza delle risoluzioni dal fuso del processo.

Gli array `decimalCases`, `bracketCases`, `timeCases` e `transferTimeCases` alimentano le prove aritmetiche e temporali. `contextCases`, `assignmentCases`, `sessionCases` e `futureScenarios` sono esempi di accettazione per i task successivi: P00 ne verifica la compilabilità ma **non esegue le funzionalità di dominio che descrivono**.

Gli operandi `amount` dei casi `NUM-*` sono valori decimali unitari o intermedi, prima dell'arrotondamento monetario. Non rappresentano input `manualBaseAmount` di una prestazione libera, che nel contratto ammettono soltanto centesimi.

## Esito e adozione

Le versioni esatte sono nel lockfile; [le decisioni P00](../../doc/p00/decisioni-iniziali.md) registrano l'esito. P02 potrà adottare esplicitamente queste librerie nell'applicazione, aggiungendole alle dipendenze di produzione e implementando gli adattatori di dominio. Il codice dello spike non viene importato da `src/` né distribuito con l'applicazione.
