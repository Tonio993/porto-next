# Evidenze P13 e chiusura M2

La [nota operativa](cliente-e-agenzia-effettivi.md#verifiche-finali) conserva la sintesi definitiva. Questo allegato identifica comandi, copertura e artefatti. Base `d99e18b`, `main` inizialmente pulito, implementazione nel commit `c2b2ff9`; schema v14. Windows x64, Node.js 24.21.0, npm 12.2.1, Electron 45.2.3. Nessuna modifica a dipendenze native, runtime o configurazione di confezionamento.

## Identificazione della build

Build integrata dell’implementazione registrata nel commit `c2b2ff9`, generata con `npm run build` dopo le correzioni di accessibilità e validazione dei livelli. Manifest locale `.local/p13-build-final-sha256.json`; nessuna ricompilazione durante le serie desktop o il confezionamento.

| Artefatto                                | SHA256                                                             |
| ---------------------------------------- | ------------------------------------------------------------------ |
| `out/main/index.js`                      | `6d6f044552bee0326e8b99e09dee0276ddf5055b42c1bc1ce4445fbf2adae75d` |
| `out/preload/index.js`                   | `5db0ca77699c80b2400c9a5ebac325f95a2f5b5b1290c8256eaa9306b1eefce8` |
| `out/renderer/index.html`                | `5ba6618f6a9e55bea7cdaf506b788f0606d6d7514576ffd9a9e68fa0164d058d` |
| `out/renderer/assets/index-BGE5Bzcd.js`  | `a406e5260f797e70a5949acfb164652668b653799d55d9ced4b4b0b088a28d51` |
| `out/renderer/assets/index-D_zojK4g.css` | `ff8bd28d21163cea80ef973250a11132b297c23a9a14cb6c9d9df4b56ae8262f` |

## Controlli P13

```powershell
npm run check
npm test
npm test -- tests/unit/assignment-service.test.ts
npm run build
```

TypeScript ed ESLint passati. Prettier globale termina con i soli avvisi sui cinque documenti legacy `00`–`04`; i file correnti sono formattati separatamente. **Suite backend completa: 236/236 casi su 26 file**, eseguita nel runtime Electron sull’integrazione finale. Include 14 casi del servizio di assegnazione e tre dedicati alla migrazione v13→v14. Log definitivo `.local/m2-backend-full.log`; nessuna modifica applicativa successiva alla build.

La copertura comprende priorità dei quattro livelli, indipendenza, rimozione degli override, valori mancanti, cambio della sola fonte, coppie distinte nelle componenti, override comune, versione applicabile a ogni estremo, MISSED senza struttura, arrivo MISSED successivo all’uscita e arrivo con una destinazione realmente esistente nello stesso viaggio. Nuove permanenze compatibili aggiornano anche i soggetti delle componenti MISSED già presenti.

Verificati mantenimento individuale dei riferimenti disattivati, rifiuto della nuova selezione e della riselezione dopo rimozione, controllo nuovamente nella transazione di conferma, blocco di eliminazione per assegnazioni mascherate, inserimento/correzione/eliminazione delle versioni di cliente e agenzia, rollback di soggetti/versioni/prenotazioni/metadati, retry della stessa anteprima dopo rollback, no-op e persistenza. Campi inattesi, livello di tipo errato, ID inesistente, namespace, consumo, conflitto di revisione e cambio sessione sono esercitati insieme ai controlli comuni del coordinatore e dello store.

`effective-subjects-migration.test.ts` esporta dati operativi reali nel DDL v13 distribuito e confronta ogni riga precedente dopo migrazione. Conserva int64 al limite, tuple, calcoli e gerarchia; verifica inizializzazione null, copia preventiva, integrità e FK. Un indice preesistente interrompe la migrazione dopo ALTER e creazione della tabella: file, schema e sessione precedente restano invariati. SQLite respinge versione di un altro proprietario e tuple/fonti incomplete. I test precedenti mantengono le versioni di origine dei fixture e confrontano le nuove colonne additive senza alterare gli script distribuiti.

Il caso tariffario che esegue 53 registrazioni e il ricalcolo completo ha superato occasionalmente il precedente limite di 5 secondi, pur passando nell’esecuzione isolata. Entrambe le prove batch oltre 50 effetti, tariffaria e di assegnazione, hanno ora un limite locale di 20 secondi, senza riduzione delle asserzioni o aumento del timeout globale. La suite completa finale passa con entrambi i casi.

Log locali: `.local/p13-check-delivery.log`, `.local/m2-backend-full.log`, `.local/p13-backend-assignment-final.log`, `.local/p13-build-final.log`. I tentativi di sviluppo e le ripetizioni diagnostiche restano nei log locali, non costituiscono gli esiti della milestone.

## Verifiche M2

**M2 chiusa sulla build identificata sopra e sullo stesso eseguibile Windows x64.** Verificati tutti i 27 percorsi desktop della build e tutti i 27 del pacchetto, oltre ai 236 casi backend e alle migrazioni cumulative. Comandi effettivi:

```powershell
node node_modules/@playwright/test/cli.js test
node node_modules/@playwright/test/cli.js test tests/e2e/assignments.spec.ts --grep 'P13: quattro' --output test-results/p13-retry
node scripts/package.mjs --dir
$env:PORTO_PACKAGED_EXE = (Resolve-Path -LiteralPath 'dist/win-unpacked/Porto Next.exe').Path
node node_modules/@playwright/test/cli.js test --output test-results/m2-packaged
node node_modules/@playwright/test/cli.js test tests/e2e/assignments.spec.ts --grep 'P13: quattro' --output test-results/m2-packaged-retry
```

Log finali: `.local/m2-desktop-full.log`, `.local/p13-desktop-final-retry.log`, `.local/m2-package.log`, `.local/m2-packaged-full.log`, `.local/m2-packaged-p13-retry.log`. Tutte le prove del pacchetto usano `dist/win-unpacked/Porto Next.exe`; il confezionamento usa la build pronta, senza richiamare `npm run pack` o ricompilare. L’invocazione della suite confezionata è equivalente al runner di `scripts/test-packaged.mjs`, con la sola directory dei risultati separata. Serie build e pacchetto usano processi, preferenze, archivi e risultati distinti; il confezionamento scrive soltanto in `dist` e non sostituisce la build in esecuzione.

**Riuso degli esiti:** entrambe le invocazioni complete hanno 26 test passati e un errore dell’helper P13. Sulla build, il percorso aveva già concluso tutte le asserzioni prima di interrogare il processo chiuso nel cleanup; corretto il solo cleanup e ripetuto integralmente il percorso, passato. Nel pacchetto, l’acquisizione di una schermata della finestra nascosta superava 12 secondi: allineato il test agli helper esistenti, riusando le immagini della build ed eseguendo tutte le asserzioni funzionali anche sul pacchetto; ripetizione integrale passata. I 26 esiti non coinvolti di ciascuna serie restano validi secondo §7.3. Le serie complete durano rispettivamente 35,6 e 38,7 minuti; le due ripetizioni circa due minuti ciascuna. Nessuna modifica applicativa, ricompilazione o sostituzione dell’eseguibile dopo le prove.

### Pacchetto Windows x64

Generazione `--dir` completata con Electron Builder 26.18.0. Verificato formato PE x64 e confronto SHA256 di tutti i file applicativi estratti da ASAR con la build identificata sopra: main, preload, HTML, JavaScript e CSS coincidono. Driver N-API distribuito per Windows x64; nessuna ricompilazione delle dipendenze native. Manifest locale `.local/m2-package-sha256.json`, copia precedente ai test `.local/m2-package-before-tests-sha256.json`.

| Artefatto                                                                          | SHA256                                                             |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `dist/win-unpacked/Porto Next.exe`                                                 | `583ba612368b1d7b75a11efe891cf447897d9ab97de8cbaac98cd5f4a1425007` |
| `dist/win-unpacked/resources/app.asar`                                             | `d9693a38b869a0d883dc761ac30e941595f826de53d1fac068e378a241ba1bb4` |
| `resources/app.asar.unpacked/node_modules/better-sqlite3/prebuilds/win32-x64.node` | `e21e5efd71fba66578e95b62554d9028064a80dafd7221bf8a8ef155de8d240a` |

Impronte ricontrollate dopo entrambe le suite e confrontate con il manifest precedente ai test: coincidono eseguibile, ASAR, driver nativo e tutti i file applicativi. Verifica finale in `.local/m2-package-manifest-final.log`.

### Copertura delle suite complete

Il percorso cumulativo in `m1-migrations.spec.ts`, ora dedicato a M2, apre **tutte le versioni v1–v13**. I fixture conservano anagrafiche, contatori, metadati e prenotazioni; da v10 comprendono tariffe, da v11 operazione/componente/permanenze e importo int64 massimo. Snapshot con interi canonici confrontano file migrato, copia preventiva, backup, Salva con nome e trasferimento di percorso. Un secondo processo con preferenze vuote riapre il v13 trasferito. Le prove di migrazione P11/P12/P13 e i desktop operativi aggiungono spostamenti, rollback e apertura via dialogo di archivi popolati.

`assignments.spec.ts` attraversa i quattro livelli tramite UI, mostra coppie diverse, rimuove override, verifica Escape/focus, migra v13 e confronta i soggetti dopo backup e Salva con nome. Trasferisce il file assegnato a un nuovo percorso e lo riapre in un processo con nuove preferenze. Il secondo percorso trattiene risposte reali di lettura e anteprima: chiusura/cambio editor e cambio revisione scartano le risposte; ricaricamento esplicito e cambio sessione verificano le bozze. Le altre suite mantengono tutte le regressioni desktop precedenti.

## Ambiente e ispezione

Preferenze e archivi temporanei, renderer offline e finestre nascoste. Il primo avvio nel sandbox dell’agente incontra il blocco ACL Electron già documentato: le prove desktop usano il percorso autorizzato da AGENTS, preservando ACL, sandbox e isolamento Electron. Crashpad può emettere accesso negato nel backend senza impedirne i test. Una prima prova UI ha rilevato che il clear button Mantine era `aria-hidden` e fuori dalla tabulazione: ora è etichettato, accessibile e raggiungibile da tastiera.

Ispezionate dall’agente [componente ENTRY alla misura minima](schermate/p13-componenti-minimo.png) e [assegnazioni a misura desktop](schermate/p13-assegnazioni-desktop.png), con finestre native rispettivamente 960 × 700 e 1440 × 900. Valori espliciti assenti, valori effettivi e fonti sono leggibili; scorrimenti e ritorno del focus verificati. Una prima esecuzione completa del percorso P13 ha concluso le asserzioni e poi fallito nel cleanup del test interrogando il processo già chiuso: corretto soltanto l’helper, senza modifica della build; ripetizione completa del percorso nella stessa build.

Chiusura documentale: registro e nota P13 aggiornati in posto, README aggiornato per l’uso delle assegnazioni, collegamenti locali e ancoraggi verificati e differenze Git controllate. Nessun difetto di integrità noto nel perimetro verificato. Nessuna sessione manuale umana. Installer e installazione restano a P20; seconda macchina fisica e accessibilità/DPI estesi restano ai checkpoint previsti. Prossima verifica integrata completa: M3 dopo P16 e UI03.
