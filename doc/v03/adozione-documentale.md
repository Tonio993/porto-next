# V03 — Avvisi e adozione documentale

Questa nota e il manifest conservano la consegna V03 originale. La successiva [rifinitura dell'output compatto](output-compatto.md), base `6f22965`, registra separatamente implementazione e nuovo confronto effettivo; V04–V07 mantengono numeri e ambito.

Base `1002baf`, branch `main` inizialmente pulito, schema applicativo v16 invariato. Stato ed esiti finali nella [consegna corrente](../piano-automazione-verifiche.md#consegna-corrente); [manifest selezionato](verifiche.json) e [riepilogo finale](summary.md). Frequenza e copertura restano nel [piano §7.3](../piano-implementazione-prestazioni.md#73-criteri-comuni-di-completamento).

## Decisioni e adozione

I cinque file `doc/legacy/00`–`04` sono stati formattati con la configurazione Prettier esistente. Nessuna correzione di contenuti, refusi, stack storico o regole funzionali. Il confronto degli AST Markdown rispetto alla base elimina soltanto le coordinate sorgente e normalizza gli spazi nei nodi di prosa; conserva struttura e ordine, livelli e testi dei titoli, elenchi e loro numero iniziale, tabelle/allineamenti, codice e destinazioni dei link. Le formule delimitate da `\[` e `\]` sono confrontate separatamente per token, ignorando soltanto gli spazi, e sostituite da segnaposto ordinati nel confronto AST. Tutti i confronti coincidono. Le impronte prima/dopo e quelle semantiche sono nel manifest; i dettagli diagnostici restano in `.local/v03/`.

La revisione delle differenze ha intercettato l'interpretazione Markdown del `+` iniziale della formula del totale fattura come marcatore di elenco. Il simbolo è conservato sulla riga precedente della formula, senza direttive di esclusione: il solo confronto AST Markdown avrebbe accettato la sostituzione del marcatore con `-`. Il confronto aggiuntivo dei token matematici protegge anche questo significato.

README descrive i quattro profili disponibili e il percorso `summary.md` → dettagli delle sole fasi problematiche; §7.3 li collega alla propria matrice, senza trasferire al coordinatore la scelta delle regressioni o la chiusura della consegna. AGENTS contiene il richiamo operativo stabile. [Conservazione delle evidenze](../guida-documentazione.md#conservazione-delle-evidenze): log, JSON nativi e intermedi locali; riepiloghi/manifest selezionati versionati quando necessari, nessuna cancellazione automatica.

Nessuna modifica a script, configurazioni, esclusioni, lockfile o semantica dei codici di uscita. Il riconoscimento degli avvisi storici in V02 rimane compatibile: non viene usato quando Prettier passa. README, AGENTS, piano e registro descrivono lo stato corrente risolto; M3, V01, manifest e uscite precedenti conservano gli esiti realmente ottenuti. La precedente consegna corrente V02 è stata trasferita nella [nota V02](../v02/coordinatore-profili.md#verifiche-e-passaggio-a-v03), adattando soltanto i rimandi relativi e il contesto temporale.

## Primo confronto osservabile

Confronto controllato, non ricostruzione quantitativa delle vecchie chat: procedura diretta precedente e coordinatore eseguono sullo stesso snapshot documentale i medesimi tre controlli, in sequenza e senza modifiche fra i due percorsi. Perimetro: tutti i Markdown di V03, controllo UTF-8/link/ancore con `documents.mjs`, `git diff --check`, Prettier globale. Gli argomenti e le impronte degli input sono nel manifest. Nessuna campagna applicativa entra nel confronto.

La procedura diretta richiede l'avvio di tre comandi e la valutazione separata delle tre uscite. Il coordinatore richiede un avvio con profilo e documenti, poi la lettura di `summary.md`, che riunisce esiti e codici; in caso di problemi si aggiungono soltanto i dettagli pertinenti. La selezione dei documenti e la revisione del significato delle differenze sono attività comuni, escluse dai conteggi.

| Misura osservata                    | Procedura diretta |             Coordinatore |
| ----------------------------------- | ----------------: | -----------------------: |
| Comandi da avviare                  |                 3 |                        1 |
| Esiti da riunire manualmente        |                 3 | 0 (riepilogo automatico) |
| Letture di summary.md               |                 0 |                        1 |
| Chiamate exec_command               |                 3 |    2 (avvio e riepilogo) |
| Polling write_stdin                 |                 2 |                        1 |
| Chiamate agli strumenti complessive |                 5 |                        3 |
| Output letto, byte UTF-8            |               692 |                     1230 |
| Output letto, righe                 |                16 |                       28 |

Tutte le uscite sono `0`, nessun dettaglio problematico da aprire. In questo piccolo caso riuscito diminuiscono gli avvii e l'aggregazione manuale, mentre aumenta il volume letto includendo il riepilogo: nessun risparmio di output è dimostrato. I polling dipendono dalla sessione e non sono una proprietà dei profili. Lo snapshot misurato precede la compilazione di questa tabella e delle evidenze finali; l'elenco dei documenti è identico a quello della verifica conclusiva.

Il volume misura byte UTF-8 e righe dell'output effettivamente restituito agli strumenti: stdout/stderr dei tre controlli diretti contro progressi del coordinatore più `summary.md` letto integralmente. Non comprende il testo dei comandi, gli involucri delle risposte degli strumenti o i log rimasti su disco. Le chiamate contano `exec_command` per avvio/lettura e gli eventuali polling, non l'involucro `functions.exec`; gli avvii di processo interni al coordinatore non sono chiamate dell'agente. Le operazioni manuali sono azioni richieste all'operatore/agente, non clic umani osservati. Non sono misure del consumo effettivo di token né di tempi di diagnosi; nessuna percentuale di risparmio viene dedotta. Un controllo documentale riuscito non permette ancora di valutare il lavoro su fallimenti backend/desktop: P17A fornirà il riscontro operativo.

## Verifica e riproduzione

Usare il comando già implementato seguente, ripetendo `--document` per l'intero elenco `documents` del manifest:

```powershell
npm.cmd run verify -- documentazione --document AGENTS.md --document README.md --document doc/v03/adozione-documentale.md
```

L'esempio controlla tre documenti; la consegna usa tutti quelli modificati, compresi i cinque legacy e il riepilogo versionato. I report locali del coordinatore contengono piano, argomenti effettivi, codici originali e log delle tre fasi. `summary.md` e il manifest selezionati conservano gli esiti necessari anche dopo un clone privo dei log locali. I collegamenti verificati sono locali: non si certifica la disponibilità dei servizi esterni. Oltre ai controlli automatici sono state rilette le differenze, comprese struttura, link e spaziatura delle tabelle legacy.

Le prove applicative valide M3 e V02 sono riusate perché sorgenti applicativi, SQL, dipendenze e runtime non cambiano. Nessuna campagna backend/desktop/pacchetto o sessione manuale umana aggiuntiva; suite integrate alla milestone M4, salvo trigger anticipati di §7.3.

## Limiti e passaggio a P17A

Riprendere [M3 → P17A](../m3/chiusura.md#limiti-e-passaggio-a-p17a): consuntivazione con replay e conferma atomica. Usare il profilo `step`, motivare i file desktop e i documenti scelti in base ai chiamanti reali e verificare le invarianti introdotte. Leggere prima `summary.md`; approfondire soltanto fasi problematiche, `issues`, conteggi e comando di riproduzione. Una diagnostica resta parziale.

Durante P17A registrare comandi manuali, chiamate agli strumenti e volume effettivamente letto, distinguendoli dai token e senza confrontare perimetri diversi come equivalenti. Rivalutare V04–V07 dopo tale utilizzo. V03 non introduce consolidamento, cache, riuso automatico o ottimizzazioni dei test. Restano i limiti ambientali e operativi del [coordinatore V02](../v02/coordinatore-profili.md#piano-dipendenze-e-report).

## Consegna originaria V03

**V03 completato e verificato il 17 novembre 2026**, base `1002baf`, branch `main` inizialmente pulito; schema applicativo v16 invariato. Correzione della sola formattazione dei cinque legacy `00`–`04`, con struttura Markdown equivalente; adozione dei quattro profili in README, piano §7.3 e AGENTS, conservazione senza cancellazioni automatiche e confronto osservabile su un perimetro documentale comune. [Dettagli e limiti](adozione-documentale.md), [manifest selezionato](verifiche.json), [riepilogo finale](summary.md). La sintesi storica V02 è conservata nella [sua nota](../v02/coordinatore-profili.md#verifiche-e-passaggio-a-v03).

**Verifiche finali:** profilo `documentazione` con `--document` ripetuto per tutti i Markdown modificati; UTF-8, destinazioni/ancore locali, differenze Git e Prettier globale passati. Nessun avviso residuo: Prettier `0`, fase `passed`, coordinatore `0`; invariati script, configurazioni, esclusioni e codici di uscita. Confronto AST dei cinque legacy rispetto alla base e token delle formule invariati, conservando titoli, elenchi, tabelle, codice e URL. Il confronto controllato registra 3→1 comandi da avviare e 5→3 chiamate agli strumenti (polling inclusi), con output letto aumentato da 692 byte/16 righe a 1.230 byte/28 righe; non misura token né dimostra risparmi percentuali. Una sola sintesi delle prove in questa sezione, con misure e fonti nella nota/manifest.

Riusate le prove applicative [M3](../m3/chiusura.md) e [V02](../v02/verifiche.json): nessuna modifica a codice, SQL, dipendenze, runtime o confezionamento; nessuna nuova campagna backend, desktop, pacchetto o sessione manuale umana. Le suite integrate complete restano a **M4**, salvo trigger anticipati del §7.3. Evidenze e uscite storiche preservate, compresi gli avvisi realmente ottenuti prima di V03.

**Passaggio operativo a P17A — Consuntivare operazioni con replay:** riprendere il [passaggio M3](../m3/chiusura.md#limiti-e-passaggio-a-p17a), scegliere e motivare documenti e regressioni secondo §7.3, usare `step` e leggere `summary.md` prima dei dettagli delle sole fasi problematiche. Registrare nel task funzionale operazioni, chiamate e output effettivamente letto come riscontro del flusso. La diagnostica resta parziale e il coordinatore non chiude il task. Rivalutare **V04–V07 dopo P17A**; nessun consolidamento, cache o ottimizzazione anticipata.
