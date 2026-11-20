# M4 — Correzioni e ricalcoli

## Sintesi operativa

**M4 chiusa il 20 novembre 2026, schema v17. P17B–P19 completati e verificati nell’integrazione P17A–P19.** Branch main, HEAD base `56ef58b729bab7626de2385e59a421ab841c96fd`, campagna svolta sulle modifiche locali preesistenti, preservate. Implementazione e test consolidati nel commit `6282ccd` dopo la verifica, su richiesta dell’utente. La richiesta M4 supera il precedente limite dei soli unit test. Fonti: [piano §7.3](../piano-implementazione-prestazioni.md#73-criteri-comuni-di-completamento), [passaggio P19](../p19/versioni-dei-pesi.md#limiti-e-passaggio-a-p20), [guida documentale](../guida-documentazione.md) e [M3](../m3/chiusura.md), il cui storico rimane invariato.

## Copertura richiesta e prove

| Requisiti / scenari                                                                          | Backend e SQLite                                                           | UI sulla build e sul pacchetto                                                                                                                |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| P17B–P17D, S1–S4: replay, identità, assegnazioni indipendenti, trasformazioni, orfani MISSED | operation-insertion/correction/deletion/completion, servizi e assegnazioni | Nuovo m4-maintenance, operation-completion, operations, movements, inter-port-movements, assignments, services                                |
| P18, S2/S5: tariffe, prima copertura, nave, FREE, override zero                              | tariff-maintenance, tariff-service, vessel-service                         | Nuovo m4-maintenance, tariffs, vessels, operations, services                                                                                  |
| P19, S2/S5/S6: pesi autonomi, iniziale, confini, estremi, precisione                         | weight-service, values, calcolatore e regressioni condivise                | Nuovo m4-maintenance, catalog, time, inter-port-movements                                                                                     |
| S7: anteprime, scadenza, conflitti, rollback, metadati, consumo post-commit                  | suite manutenzione, preview-store, archive-coordinator, response-scope     | Nuovo m4-maintenance: bozze, risposta superata, conflitti e risposte perse dopo commit; suite async esistenti e cambio sessione               |
| S8: cumulativo v1–v16 → v17, corrente popolato, dipendenti CASCADE, copie, file futuri       | suite migrazioni e rollback P19                                            | milestone-migrations esteso a v17, rollback dopo ALTER, rifiuto futuro senza alterazioni, backup, Salva con nome, secondo processo e percorso |
| Sicurezza e offline                                                                          | guardie IPC, validazione diretta, campi inattesi, limiti                   | Intera suite Electron con renderer offline, risorse locali, archivi/preferenze temporanei, sandbox invariata                                  |

Le verifiche numeriche, le combinazioni esaustive degli stati, le FK esterne e le scadenze deterministiche appartengono al backend; i nuovi test desktop esercitano i comandi visibili e verificano i dati persistiti. Le suite M3 sono regressioni, non sostituiscono i percorsi M4 aggiunti. Ispezioni rappresentative dell’agente alle dimensioni supportate; revisione estesa UI04 in P20.

## Correzioni e integrazioni della campagna

- Corretto il tipo della conferma tariffaria con overload distinti per aggiornamento/eliminazione, mantenendo il risultato specifico e il vincolo sincrono del coordinatore. Inclusi nel progetto Node i quattro helper degli esiti incerti, corretti due tipi dei test e rimossa una funzione inutilizzata; nessuna asserzione di conservazione rimossa.
- In Operations la risoluzione temporale è una lettura annullabile: cambio destinazione e chiusura invalidano le risposte precedenti. Scritture e conferme rimangono protette. Alla chiusura con bozza conservata il focus torna a **Riprendi bozza** quando il comando iniziale è disabilitato.
- PortConfirmation distingue il blocco della conferma da quello di **Chiudi anteprima** mediante `cancelDisabled`, opzionale con default compatibile. I cinque nuovi editor mantengono il blocco durante richieste/scritture o esito incerto, consentendo di chiudere l’anteprima obsoleta e ricaricare esplicitamente il contesto. Le regressioni coprono conflitti dopo l’anteprima in operazioni, tariffe e pesi, valori conservati alla chiusura e conferma ancora disabilitata finché obsoleta.
- Le fixture aspettano schema/copia preventiva v17. Il cumulativo confronta tutte le righe e colonne precedenti: soltanto `effective_from` iniziale viene confrontato con il campo rinominato `legacy_initial_from`; il nuovo campo è verificato nullo nelle migrazioni. Estesi v16 popolato, v17 datato, dipendente esterno composito CASCADE, rollback dopo ALTER e rifiuto futuro senza variazioni dei byte o della sessione attiva.
- Le regressioni P10–P12 scartano esplicitamente la bozza quando serve una nuova compilazione e verificano i comandi obsoleti disabilitati. Le nuove fixture ricaricano il renderer dopo il setup via API e selezionano il nome corrente della nave; selettori dei campi obbligatori e degli errori sono allineati al DOM reale. Il test assegnazioni acquisisce in `testInfo.outputPath`: le due immagini storiche P13 sono state conservate identiche alla base Git, con copie delle acquisizioni nuove nei risultati locali.

## Verifiche finali

| Ambito                    | Esito conclusivo                                                                                                                                                                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Check                     | TypeScript node/web, ESLint e Prettier globale passati. Dopo la sola modifica all’output delle schermate P13: typecheck Node e lint interessato ripetuti. UTF-8, link locali e differenze anche dei nuovi file verificati alla consegna. |
| Raccoglitori/coordinatore | 20/20 fixture passate; profilo documentazione con tutti i Markdown modificati espliciti.                                                                                                                                                 |
| Backend e SQLite Electron | 491/491, nessun salto o retry, `--maxWorkers=1`.                                                                                                                                                                                         |
| Desktop build             | 52 percorsi distinti coperti: 29 esiti indipendenti riusati dalla campagna integrale e 23 percorsi/regressioni sulla build finale. Tutti i nove nuovi casi M4 passati.                                                                   |
| Pacchetto Windows x64     | Intera suite 52/52 sul medesimo eseguibile, nessun salto, flaky o retry. Generato con `--dir` dalla build finale senza ricompilare.                                                                                                      |
| Artefatti                 | 5/5 file del payload ASAR coincidono con out; PE x64. 138/138 file distribuiti immutati dopo la suite; nessun file aggiunto al payload. Eventuali debug.log runtime sono identificati separatamente nel manifest.                        |
| Grafica                   | Quattro acquisizioni rappresentative ispezionate dall’agente; focus e tastiera automatizzati. Finestre 960×700 e 1440×960, contenuti lunghi scorrevoli e comandi leggibili. Nessuna sessione manuale umana.                              |

**Riuso motivato.** Dopo la suite backend completa rimangono identici 98/98 input backend/contratti/migrazioni e i bundle main/preload. Le correzioni successive interessano esclusivamente renderer e test desktop: riusati backend, fixture del coordinatore e percorsi indipendenti, ripetuti tutti quelli coinvolti. La suite completa sul pacchetto verifica di nuovo l’intera integrazione finale. Le fasi native documentate hanno consentito worker singolo e riprese selettive con copertura equivalente al profilo milestone; nessuna opzione di riuso o nuovo sistema di orchestrazione. Le build sono state ricostruite soltanto dopo correzioni al prodotto; nessuna campagna o confezionamento concorrente sugli stessi artefatti.

**Riprese ed esiti originali.** Le prime verifiche statiche hanno rilevato i tipi/lint corretti sopra. La prima suite desktop ha rilevato blocco del focus e della risoluzione annullabile; le riprese hanno corretto le fixture e individuato il blocco reale della chiusura dell’anteprima obsoleta. Una ripresa ha avuto timeout di avvio/teardown ed EPERM durante una discontinuità temporale osservata nell’ambiente; lo stesso percorso è poi passato invariato. Nessun aumento di timeout/retry, esclusione di casi o errore trasformato in avviso. Gli esiti falliti rimangono nei log e nell’indice selezionato.

La selezione `2026-11-19T16-40-53.008Z-eqI8Wx` è rimasta interrotta: 21 esiti positivi nel log su 23 casi previsti, nessun report nativo finale o codice conclusivo. Non è usata nel conteggio finale; il 20 novembre è stata ripetuta integralmente senza ricompilare, dopo verifica delle impronte.

Directory sotto `test-results/verification/`; comandi/argomenti esatti, codici, conteggi e singoli casi nell’[indice selezionato](allegati/esiti.json):

| Esecuzione                        | Ambito                                              | Casi                                   | Uscita processo / raccolta |
| --------------------------------- | --------------------------------------------------- | -------------------------------------- | -------------------------- |
| `2026-11-19T14-38-43.426Z-7xt4ME` | M4 integrazione finale completa                     | 491/491; falliti 0, saltati 0, retry 0 | 0 / 0                      |
| `2026-11-19T14-47-30.964Z-TpXD1x` | M4 build integrata suite desktop completa           | 40/52; falliti 12, saltati 0, retry 0  | 1 / 1                      |
| `2026-11-19T15-42-24.522Z-tmgSbu` | M4 ripresa correzioni e regressioni renderer finale | 14/23; falliti 9, saltati 0, retry 0   | 1 / 1                      |
| `2026-11-19T16-24-09.478Z-kexDtb` | M4 ripresa fixture e asincronia finali              | 11/12; falliti 1, saltati 0, retry 0   | 1 / 1                      |
| `2026-11-20T08-49-54.833Z-qSTb9E` | M4 ripresa completa finale dopo interruzione        | 23/23; falliti 0, saltati 0, retry 0   | 0 / 0                      |
| `2026-11-20T09-25-53.213Z-MDuJka` | M4 pacchetto Windows suite desktop completa         | 52/52; falliti 0, saltati 0, retry 0   | 0 / 0                      |

Comandi principali riproducibili; le selezioni delle riprese sono conservate nell’indice:

```powershell
npm.cmd run check
npm.cmd run test:report:fixtures
node scripts/verification/collect.mjs vitest --phase backend --scope 'M4 integrazione finale completa' -- tests/unit --maxWorkers=1
node node_modules/electron-vite/bin/electron-vite.js build
node scripts/verification/collect.mjs playwright --phase desktop --scope 'M4 build integrata suite desktop completa'
node scripts/package.mjs --dir
$env:PORTO_PACKAGED_EXE = (Resolve-Path 'dist/win-unpacked/Porto Next.exe').Path
node scripts/verification/collect.mjs playwright --phase packaged-desktop --scope 'M4 pacchetto Windows suite desktop completa'
```

Windows x64, Node 24.21.0/npm 12.2.1, Electron 45.2.3 con Node 24.22.2, better-sqlite3 13.0.3 e SQLite 3.53.4 verificato con query reale. Percorso esterno autorizzato per i blocchi sandbox/ACL già documentati, finestre nascoste, preferenze/archivi temporanei e renderer offline. Nessuna modifica ad ACL, sandbox Electron o isolamento.

### Identificazione e conservazione

Il commit `6282ccd` conserva esattamente i 249 sorgenti/configurazioni identificati dal manifest finale. Il consolidamento successivo alla campagna non modifica il prodotto né gli esiti: base Git, flag delle modifiche locali e assenza di commit nei manifest restano dati storici del momento delle prove. Aggiornati soltanto i riferimenti correnti nella documentazione; riusate le verifiche M4, con nuovi controlli documentali per il consolidamento.

[Manifest build e input finali](allegati/build.json), [base prima delle correzioni](allegati/build-prima-correzioni.json), [build intermedia](allegati/build-dopo-correzioni-operazioni.json), [pacchetto prima](allegati/package-before.json) e [dopo](allegati/package-after.json). Log integrali, JSON nativi e trace rimangono locali; l’indice versionato conserva dati sufficienti a valutare e riprodurre la consegna senza quei log, secondo la [politica di conservazione](../guida-documentazione.md#conservazione-delle-evidenze).

| Artefatto                                                                                            | SHA256                                                             |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `dist/win-unpacked/Porto Next.exe`                                                                   | `1f802bf2d70746a30a918ab1fed1c323e296918d60d7cd6f5b587ffd66a49567` |
| `dist/win-unpacked/resources/app.asar`                                                               | `4858ba5bd610cc7417a871fbfb4e1a205ff3601faae434570ef420563f2ad0e7` |
| `dist/win-unpacked/resources/app.asar.unpacked/node_modules/better-sqlite3/prebuilds/win32-x64.node` | `e21e5efd71fba66578e95b62554d9028064a80dafd7221bf8a8ef155de8d240a` |

Schermate selezionate: [inserimento retroattivo alla misura minima](allegati/schermate/inserimento-retroattivo-minimo.png), [correzione bloccata dagli orfani](allegati/schermate/correzione-orfani-minimo.png), [tariffa](allegati/schermate/tariffa-ricalcoli-desktop.png), [cronologia pesi](allegati/schermate/pesi-cronologia-desktop.png). Le ispezioni dell’agente attestano questi stati rappresentativi; UI04 estesa rimane distinta.

## Limiti e passaggio a P20

Nessun difetto bloccante noto nel perimetro verificato. Trasferibilità provata tra processi, percorsi e preferenze differenti sul medesimo Windows; nessuna seconda macchina fisica. Nessuna sessione manuale umana, installer o installazione sul sistema di destinazione. Il pacchetto di verifica mantiene la configurazione corrente: icona Electron predefinita e nessun certificato di firma configurato; gli adempimenti di rilascio appartengono a P20.

**Prossimo passo: P20 — Revisione e rilascio**, con UI04 e M5. Riusare come base le quattro acquisizioni M4, gli esiti funzionali/migrazioni/copie/offline e gli artefatti identificati, finché gli input rimangono invariati. Ripetere le prove invalidate dalle modifiche UI04 secondo §7.3; generazione installer e verifica dell’installazione restano da eseguire in P20. M4 non chiude M5.
