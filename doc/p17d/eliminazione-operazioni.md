# Eliminazione delle operazioni e aggiornamento delle note — P17D

**Stato corrente — 20 novembre 2026: completato e verificato in M4, schema integrato v17.** [Verifica integrata e passaggio a P20](../m4/chiusura.md). Le sezioni seguenti conservano la consegna originaria e i limiti di verifica allora vigenti, superati dalla campagna M4; esiti e decisioni storiche rimangono invariati.

## Sintesi operativa

**Implementato/da verificare**, schema v16 invariato. Base `main`, `56ef58b`, con modifiche locali P17B/P17C preesistenti preservate; nessuna migrazione o commit. Applicate le regole comuni di [AGENTS](../../AGENTS.md), [piano §2.2–2.3 e P17D](../piano-implementazione-prestazioni.md#p17d--eliminare-operazioni) e [guida documentale](../guida-documentazione.md). La deroga dell’utente limita questa consegna ai soli unit test, come P17B/P17C.

## Decisioni e integrazioni

- `OperationRemoval` espone `previewDelete`, `deletionEffects`, `confirmDelete` e `updateNotes`, tramite `OperationService`, contratti condivisi e preload. La registrazione IPC esistente protegge anche i nuovi canali.
- Il namespace `OPERATION_DELETE` usa il protocollo comune delle anteprime: contesto originale, scadenza, vincoli riesaminati, una revisione per transazione effettiva e consumo dopo commit. Un’anteprima nata bloccata richiede una nuova simulazione anche dopo la rimozione del blocco.
- La simulazione esclude l’operazione e riutilizza `operationReplay`, `replayPersistence` e il piano dei soggetti. Conserva identità e assegnazioni delle aperture sopravvissute; le nuove registrazioni non recuperano le identità eliminate. Riporta rimozione delle componenti, effetti sulle permanenze, riattribuzioni e ricalcoli CATALOG; mantiene basi FREE, tuple temporali e riferimenti storici ammessi.
- La rimozione non cancella prestazioni per risolvere una sequenza o un contesto impossibile, anche per MISSED. L’eliminazione di un movimento può riattribuire i servizi al contesto precedente solo quando la cronologia risultante è valida. Le assegnazioni di un livello rimosso non vengono copiate sul livello sopravvissuto; si risolve nuovamente la priorità indipendente di cliente e agenzia.
- `operationDeletionBlockers` ispeziona le FK reali verso operazione, estremi, componenti e relativi soggetti posseduti, incluse FK composte, PK implicite e CASCADE. Il piano delle permanenze controlla i loro dipendenti. `removeOperation` elimina esplicitamente soggetti delle componenti, componenti, estremi e operazione; il replay e le riattribuzioni avvengono nella stessa transazione con verifica finale dei riferimenti. Errori e rollback conservano dati, metadati e anteprima.
- `updateNotes` accetta soltanto ID e note, valida il limite per caratteri Unicode e aggiorna il solo testo con UPDATE condizionale: niente replay, selezionabilità corrente, nuovi momenti/versioni o ricalcoli. Un valore identico conserva revisione e timestamp, anche al limite della revisione.
- `OperationMaintenanceEditor` aggiunge nel dettaglio **Elimina operazione** con analisi/conferma e **Modifica solo note**. Usa le convenzioni correnti di focus, protezione dalle risposte obsolete e contesto originale della bozza. La chiusura conserva la bozza; il conflitto richiede **Ricarica contesto**, conservando il testo digitato. Un esito incerto richiede lettura persistita prima di riprovare: `operationDeletionOutcome` riconosce l’assenza solo nella stessa sessione/archivio con revisione successiva, mentre le note riutilizzano il confronto P17C. Una lettura fallita non autorizza un’altra scrittura; la bozza incerta non è scartabile dalla UI.

## Verifiche finali

**427 casi unitari coperti con esito valido: 425 passati nel giro completo, più i due casi falliti rieseguiti con successo.** I 36 casi P17D coprono tipi/stati, conservazione e ricreazione delle identità, orfani anche MISSED e confini temporali, riattribuzioni FREE/CATALOG, calcoli e versioni, assegnazioni ereditate/override, FK composte/CASCADE/PK implicite sui componenti e sulle permanenze, vincoli riesaminati, rollback, consumo delle anteprime, scadenza/sessione/revisione, Salva con nome, note Unicode/no-op/limite di revisione e riapertura persistente. Le invarianti SQLite sono provate dentro gli unit test, senza campagne separate. La protezione IPC comune copre anche i nuovi canali.

Tutte le esecuzioni usano solo `tests/unit`, Windows x64, Node 24 e il launcher `scripts/test.mjs` nel runtime Electron come Node, con `--maxWorkers=1`. Usato direttamente il percorso esterno autorizzato per i blocchi ACL documentati, senza un nuovo tentativo sandbox. Il raccoglitore è stato invocato direttamente per Vitest, senza profili step/milestone, build o avvio dell’interfaccia. Letti i riepiloghi compatti e i dettagli dei soli errori. Gli avvisi locali Crashpad/Vite non hanno impedito le esecuzioni.

| Esecuzione locale in `test-results/verification/` | Esito                                                         | Exit code |
| ------------------------------------------------- | ------------------------------------------------------------- | --------- |
| `2026-11-19T11-25-13.664Z-lrIFAT`                 | 28/31; tre errori nella nuova fixture di movimento            | 1         |
| `2026-11-19T11-27-44.965Z-awXyd7`                 | 31/31 dopo correzione fixture                                 | 0         |
| `2026-11-19T11-29-06.525Z-BS2XJ0`                 | Suite completa: 425/427, circa 238 s nel report nativo        | 1         |
| `2026-11-19T11-34-03.476Z-zFhhC0`                 | Ripresa selettiva: 2/2, 51 casi esclusi dal filtro; circa 8 s | 0         |

Comandi riproducibili, nello stesso ordine della tabella:

```powershell
node scripts/verification/collect.mjs vitest --phase backend --scope 'P17D unit mirati' -- tests/unit/operation-deletion.test.ts --maxWorkers=1
node scripts/verification/collect.mjs vitest --phase backend --scope 'P17D unit corretti' -- tests/unit/operation-deletion.test.ts --maxWorkers=1
node scripts/verification/collect.mjs vitest --phase backend --scope 'P17D unit finali' -- tests/unit --maxWorkers=1
node scripts/verification/collect.mjs vitest --phase backend --scope 'P17D soli casi falliti' -- tests/unit/operation-deletion.test.ts tests/unit/values.test.ts --testNamePattern='riattribuisce indipendentemente|il fuso del processo' --maxWorkers=1
```

I primi errori dipendevano dai campi ENTRY rimasti nella fixture MOVEMENT. Il giro completo ha poi rilevato un’altra fixture errata: l’override di una prestazione deve essere passato a `ServiceService`, mentre `AssignmentService` gestisce i livelli strutturali e l’operazione. Corretta solo la fixture. L’altro fallimento era il timeout a 5 s del test preesistente sull’indipendenza dal fuso di processo; lo stesso caso passa nella ripresa, senza cambiare codice, timeout o retry. Riutilizzati i 425 esiti validi, comprese le regressioni P17A–P17C; la suite completa non è stata ripetuta dopo la correzione isolata della fixture. Nessun difetto funzionale P17D rimasto negli unit test, senza attribuire a una causa dimostrata la variabilità temporale.

Ogni directory locale conserva `summary.md`, `results.json`, `native/report.json`, `execution.json` e log, secondo la [politica di conservazione](../guida-documentazione.md#conservazione-delle-evidenze). Sono ignorati da Git e non garantiti dopo un clone. Nessun log integrale duplicato nella documentazione.

## Limiti e passaggio a P18

Per istruzione dell’utente restano rinviati alla **verifica finale delle implementazioni** tutti i controlli non unitari elencati nel [registro](../stato-implementazione-prestazioni.md#consegna-corrente--m4), senza dichiarare UI, build o pacchetto verificati. La suite desktop e il pacchetto completi rimangono al checkpoint M4 secondo il [piano §7.3](../piano-implementazione-prestazioni.md#73-criteri-comuni-di-completamento), compatibilmente con tale rinvio. Nessuna modifica agli ACL, alla sandbox Electron, ai timeout o ai retry dei test; nessuna fixture estranea al task.

Prossimo passo **P18 — Correggere ed eliminare tariffe**. Riusare i piani di impatto e il calcolatore per simulare intervalli e ricalcolare atomicamente componenti operative e CATALOG, senza alterare FREE e sostituzioni manuali esplicite. Integrare le variazioni di dimensione e tipologia nave. Il replay rimane necessario per modifiche operative, non per modifiche tariffarie o note descrittive. P19 seguirà per i pesi; non anticipato da P17D. Le evidenze precedenti restano nelle note [P17B](../p17b/inserimento-operazioni-retroattive.md), [P17C](../p17c/correzione-operazioni.md), P17A e M3.
