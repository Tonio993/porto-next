# P20 — Revisione e rilascio

## Sintesi operativa

**P20 e UI04 completati; M5 chiusa**, con installazione nell'ambiente di destinazione distinta e ancora da eseguire. Versione **0.1.0**, schema **v17** invariato. Branch `main`, HEAD iniziale `b9686621540d7b6bd424d238955a2fda16d39875`, stato iniziale pulito; verificata l'implementazione M4 `6282ccd`. Implementazione P20 consolidata nel commit `01db2d5` dopo le prove, su successiva richiesta dell'utente.

Il [confronto con il commit](allegati/consolidamento.json) verifica tutti i 254 input: 253 coincidono byte per byte; `0010_tariffs.sql` differisce soltanto per un CRLF preesistente nel worktree, normalizzato a LF da Git, con contenuto SQL e blob invariati rispetto alla base. Le 254 impronte del worktree verificato e i cinque file della build restano invariati. I manifest di campagna conservano lo stato storico prima del commit, inclusi base e assenza di commit al momento della verifica. Nessuna nuova compilazione o ripetizione delle suite: cambiano soltanto i riferimenti documentali della consegna.

[Matrice indipendente e scenari S1–S8](copertura.md), [decisioni e immagini UI04](../ui04/revisione-finale.md), [evidenze M4 preservate](../m4/chiusura.md), [criteri autorevoli](../piano-implementazione-prestazioni.md#73-criteri-comuni-di-completamento). La revisione di contratti, chiamanti, codice e asserzioni non ha individuato difetti aperti di attribuzione, calcolo o integrità. Non attesta ogni combinazione possibile né i moduli esclusi nella matrice.

## Decisioni e integrazioni

Corretti focus iniziale/restituito nei pesi e nelle bozze tariffa/peso, associazione accessibile dell'errore Peso e valori tecnici nelle anteprime. Punti d'integrazione nella nota UI04. Aggiunte quattro regressioni UI04 e un percorso continuo S1 dall'archivio vuoto alle copie riaperte, usando UI e API pubbliche del preload. Nessuna modifica a dominio, backend, IPC, preload o migrazioni.

Sostituita l'icona Electron con l'ancora coerente con la sidebar: `build/icon.ico` contiene sei misure 16/32/48/64/128/256; `build/icon.png` consente l'ispezione. `scripts/generate-icon.ps1` rigenera le risorse con System.Drawing. Nessun font, servizio o dipendenza aggiuntiva. Ispezionata anche l'icona estratta dall'eseguibile finale. Conservata la configurazione NSIS x64 per utente con directory selezionabile. Firma non configurata: artefatti **non firmati**, non attestati per distribuzione pubblica.

## Verifiche finali

Esecuzione per fasi con coordinatore e collector esistenti, secondo la modalità M4 e la copertura M5. SQLite nel runtime Electron e `--maxWorkers=1`. Desktop offline, dati/preferenze temporanei, percorso esterno autorizzato per i blocchi sandbox/ACL documentati, senza modificare ACL, sandbox o isolamento. Nessuna concorrenza fra build, confezionamento e campagne sugli stessi artefatti. Diagnostiche e report parziali non chiudono la milestone.

| Controllo                           | Esito ed evidenza                                                                                                                                                                                                                                                                                        |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Statici e documenti                 | TypeScript node/web, ESLint, Prettier, UTF-8, collegamenti e differenze passati nelle fasi del coordinatore. Dopo la correzione dell'helper M4 ripetuti TypeScript node ed ESLint; verifica documentale finale dopo l'aggiornamento della consegna. Comandi e codici nell'[indice](allegati/esiti.json). |
| Fixture verificatori                | 14/14 raccolta/coordinatore e 6/6 presentazione eseguite separatamente: 20 complessive.                                                                                                                                                                                                                  |
| Backend completo                    | **491/491**, nessun salto o retry: `2026-11-20T11-56-02.764Z-ecidAd`, Vitest/Electron, `tests/unit --maxWorkers=1`.                                                                                                                                                                                      |
| Build finale                        | Passata nel coordinatore `2026-11-20T12-01-26.285Z-coordinator-eSTalD`; [254 input e cinque file del payload](allegati/build.json).                                                                                                                                                                      |
| Desktop sulla build                 | Suite completa `2026-11-20T12-13-27.545Z-jP0DBQ`: 57 casi, 54 passati e tre falliti. Ripresa P16 `2026-11-20T13-37-21.876Z-sscY05`: 4/4 passati. Ripresa helper M4 `2026-11-20T15-13-03.237Z-kkWYo2`: 3/3 passati. Tutti i **57 percorsi distinti** hanno evidenza positiva sulla stessa build.          |
| Desktop sul medesimo pacchetto      | Suite completa `2026-11-20T14-00-27.957Z-6LDrmR`: 57 casi, 54 passati e tre falliti nella cattura CDP delle schermate M4. Ripresa nativa `2026-11-20T15-16-43.592Z-miiZuK`: **3/3** passati. Tutti i **57 percorsi distinti** hanno evidenza positiva sullo stesso eseguibile.                           |
| SQLite, migrazioni e trasferibilità | Migrazioni popolate v1–v16 → v17 e v17 corrente, rollback dopo ALTER, backup preventivo, file futuro intatto, secondo processo: inclusi nelle due suite complete. S1 confronta identità, soggetti, importi e permanenze dopo backup/Salva con nome e riavvio; sessione vecchia respinta.                 |
| Runtime, sicurezza e offline        | Casi archivi/IPC e risorse locali inclusi nelle due suite. S1 su originale/backup/copia: `integrity_check=ok`, `foreign_key_check=[]`, schema 17; SQLite 3.53.4, Electron 45.2.3, Node 24.22.2, better-sqlite3 13.0.3, x64, sia build sia pacchetto. Query e valori originali nell'indice.               |

Ogni percorso desktop ha riferimenti separati a build e pacchetto in `buildCoverage` dell'indice. Il totale indica **copertura distinta aggregata**, non trasforma le prime campagne in esecuzioni interamente positive. Nessun salto, flaky o retry nei report completi o nelle riprese.

### Riprese e anomalie conservate

La campagna completa sulla build ha registrato una chiusura inattesa della pagina nel caso P16 CATALOG, successivi EPERM/teardown e timeout nei due casi collegati. Nello stesso intervallo un'attesa richiesta di 45 secondi è rientrata dopo 1323 secondi; la causa della prima chiusura **non è accertata**. Ripresi i tre casi invariati e la regressione reciproca CATALOG, 4/4 positivi; gli stessi casi passano nel pacchetto. Il recupero non viene attribuito a una correzione di prodotto. Esiti falliti conservati.

Nel pacchetto le sole tre anomalie della campagna completa riguardavano `page.screenshot` sulle finestre nascoste M4. UI04 aveva già acquisizioni native riuscite. Corretto esclusivamente l'helper M4 con `capturePage`, due frame di rendering e controlli su finestra nascosta/immagine non vuota. [Manifest precedente preservato](allegati/build-prima-cattura-nativa.json); aggiornato soltanto l'hash del test nel manifest finale. Nessuna modifica a prodotto, build, timeout, retry o asserzioni funzionali; ripetuti i tre casi coinvolti su build e pacchetto.

Durante la suite completa del pacchetto, richiesta temporanea `ES_CONTINUOUS | ES_SYSTEM_REQUIRED` applicata e rilasciata in `finally`, secondo la [documentazione Microsoft](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-setthreadexecutionstate). Nessuna impostazione permanente modificata; non dimostra la causa della discontinuità precedente né impedisce sospensioni manuali. Istanti ed esito del rilascio nell'indice.

L'avvio iniziale della suite completa nel coordinatore era incompatibile con la durata storica M4 superiore al limite esterno predefinito di 30 minuti. Interrotto l'avvio, verificati owner e figli terminati e rimosso soltanto il lock residuo, poi usato il collector nativo. I cinque passaggi osservati senza report nativo finale non contribuiscono alla copertura; report incompleto preservato. Nessun aumento di timeout o retry.

### Riuso e conservazione

Confronto iniziale M4: **249/249 input**, inclusi **98/98 backend/contratti/migrazioni**, e **5/5 file della build** invariati. Riusate analisi e prove di dominio M4 pertinenti, senza assumerle come dimostrazione di ogni requisito. Le correzioni renderer invalidano i collaudi desktop precedenti per l'artefatto P20: nuove campagne complete su build e pacchetto. La nuova icona richiede il nuovo confezionamento. Backend completo rieseguito; successive modifiche soltanto a renderer e helper, con i 98 input e main/preload invariati.

Nessuna ricompilazione dopo la build finale: ASAR/out corrispondenti per tutti i cinque file, PE x64 e driver nativo identico. Le riprese dell'helper non invalidano il prodotto. Pacchetto M4 preservato in `.local/p20-pacchetto-m4`, **138/138** impronte confrontate; conservati anche installer/blockmap preesistenti. Documenti e allegati storici M4 non modificati.

Log completi, trace e immagini estese restano locali nei percorsi dell'indice; riepiloghi, comandi, codici, manifest, query e immagini selezionate sono versionabili secondo la [politica di conservazione](../guida-documentazione.md#conservazione-delle-evidenze). I percorsi locali non garantiscono la disponibilità dei log dopo un clone.

## Artefatti e distribuzione

Pacchetto finale generato con `node scripts/package.mjs --dir`, senza ricompilare. [Manifest prima](allegati/package-before.json) e [dopo il collaudo](allegati/package-after.json): **138/138 file invariati**, oltre a cinque payload ASAR corrispondenti a out. Eseguibile `dist/win-unpacked/Porto Next.exe`, SHA256 `c64bb8ffd4d2bcd75b9a99a9b173a68303b836d29d0ff6f3fc39a137134d7ce9`, PE x64; FileVersion `0.1.0`, ProductVersion `0.1.0.0`, prodotto/descrizione `Porto Next`, Authenticode `NotSigned`. Mantenere l'intera directory del pacchetto.

Installer **generato e verificato**, senza eseguirlo: `node scripts/package.mjs --win nsis --x64 --prepackaged dist/win-unpacked`, uscita 0. Artefatto `dist/Porto-Next-0.1.0-Setup.exe`, 136.694.144 byte, versione file/prodotto `0.1.0`, prodotto `Porto Next`, Authenticode `NotSigned`. SHA256 `bbdb9f71b9bc5e7068a2b412580978d2196aafebcb6cdc4d2a8ffbfd9125bb73`; blockmap `dist/Porto-Next-0.1.0-Setup.exe.blockmap`, SHA256 `36191f85cf72a29a41547fd3bf98dcd792430aa224405bfe7ad91a29b257eccb`. [Manifest installer](allegati/installer.json), [confronto del payload estratto](allegati/installer-payload.json).

Estratti con 7-Zip il contenitore NSIS e `app-64.7z`: **138/138 file applicativi identici** al pacchetto collaudato, più il solo `resources/elevate.exe`, verificato contro l'helper della cache NSIS usato da electron-builder. La generazione copia questo helper anche in `win-unpacked`: archiviato separatamente dopo il confronto, ripristinando la cartella ai 138 file collaudati. Un primo installer conteneva anche `debug.log` generato da Chromium durante i test: conservati installer/log intermedi localmente e rigenerato il solo NSIS dopo aver archiviato il log. Nessuna modifica a sorgenti, build o risorse applicative; installer finale privo di log runtime. Build, pacchetto, generazione installer e installazione hanno quindi esiti distinti.

## Limiti e prossimo passo

Nessuna installazione sul sistema dell'utente: manca un ambiente di destinazione dedicato. L'installazione rimane un'attività operativa separata ammessa dal piano P20; provarla con dati temporanei nell'ambiente destinato, senza modificare archivi reali. Prima della distribuzione pubblica occorrono firma configurata, rivalutazione dell'audit delle dipendenze e collaudo d'installazione. Nessun certificato disponibile/configurato in questa consegna.

Trasferibilità fra processi, percorsi e preferenze sul medesimo Windows, nessuna seconda macchina fisica. UI04 comprende 960×700, 1440×960 e zoom renderer 125/150%, non variazioni dei DPI hardware. Interazioni automatizzate e ispezioni dell'agente sulle immagini, nessuna sessione manuale umana o prova con screen reader. Altro hardware e accessibilità estesa restano attività nell'ambiente di destinazione. Nessuna estensione ai moduli esclusi nella matrice.
