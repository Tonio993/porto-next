# Stato di implementazione delle prestazioni

Aggiornamento del 18 novembre 2026. Questo file contiene lo stato corrente e la sola consegna attiva. Requisiti e frequenza dei controlli sono nel [piano](piano-implementazione-prestazioni.md), regole di lettura e aggiornamento nella [guida documentale](guida-documentazione.md).

## Stato corrente

- P00–P16, P17A e UI01–UI03 completati. UI03 verificata sulla build Electron, schema v16 invariato, implementazione `2e24749`, base `c1ee663`. [Nota UI03](ui03/revisione-flussi-operativi.md). P16 e revisione tecnica post-P16 restano verificati; [nota e revisione](p16/ciclo-vita-prestazioni.md#revisione-tecnica-post-p16).
- M1 chiusa sul pacchetto Windows dello schema v9. **M2 chiusa** sull’integrazione P13, schema v14, secondo il piano §7.3. [Evidenze](p13/verifiche.md#verifiche-m2).
- Revisioni tecniche dopo P12 e P16 completate. **M3 chiusa** sull’integrazione UI03, schema v16: backend completo, 39/39 percorsi desktop su build e 39/39 sul medesimo eseguibile Windows x64; migrazioni cumulative e trasferibilità verificate. [Nota M3](m3/chiusura.md). **P17A — Consuntivare operazioni con replay completato sulla build**, schema v16 invariato. Prossimo passo funzionale: **P17B — Inserire operazioni retroattive**; P17B–P20 restano da avviare.
- **V01–V03 e rifinitura dell’output compatto completati e verificati**. Riscontro operativo P17A raccolto nel [manifest e nella nota](p17a/consuntivazione-operazioni.md#riscontro-operativo-del-coordinatore), distinguendo chiamate/output letti dai token. V04–V07 da rivalutare secondo la [consegna del piano di automazione](piano-automazione-verifiche.md#consegna-corrente).

## Avanzamento

| Task | Stato      | Revisione di implementazione | Nota operativa                                                                                               |
| ---- | ---------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| P00  | Completato | Commit di introduzione P00   | [Decisioni](p00/decisioni-iniziali.md)                                                                       |
| P01  | Completato | `f9b3dbb`                    | [Contesto applicativo](p01/contesto-applicativo.md)                                                          |
| P02  | Completato | `4235f71`                    | [Numeri e tempo](p02/numeri-e-tempo.md)                                                                      |
| P03  | Completato | `5a6fa8c`                    | [Creazione e consultazione porti](p03/porti.md)                                                              |
| P04  | Completato | `0be600d`                    | [Versioni e ciclo di vita porto](p04/versioni-e-ciclo-di-vita.md)                                            |
| P05  | Completato | `f966ba8`                    | [Banchine](p05/banchine.md)                                                                                  |
| P06  | Completato | `ef6e257`                    | [Clienti e agenzie](p06/clienti-e-agenzie.md)                                                                |
| P07  | Completato | `856bcbc`                    | [Navi](p07/navi.md)                                                                                          |
| P08  | Completato | `0e7fc36`                    | [Catalogo e pesi iniziali](p08/catalogo-e-pesi-iniziali.md)                                                  |
| P09  | Completato | `1b2f4a5`                    | [Tariffe e calcolatore base](p09/tariffe-e-calcolatore-base.md)                                              |
| P10  | Completato | `3a34501`                    | [Entrata, uscita e permanenze](p10/entrata-uscita-e-permanenze.md); verificato sulla build Electron.         |
| P11  | Completato | `8450b39`                    | [Spostamento interno](p11/spostamento-interno.md); verificato sulla build Electron.                          |
| P12  | Completato | `f07c859`                    | [Spostamento tra porti](p12/spostamento-tra-porti.md); verificato sulla build Electron.                      |
| P13  | Completato | `c2b2ff9`                    | [Cliente e agenzia effettivi](p13/cliente-e-agenzia-effettivi.md); build e pacchetto verificati, schema v14. |
| P14  | Completato | `a554e27`                    | [Prima prestazione libera](p14/prestazione-libera.md); build verificata, schema v15.                         |
| P15  | Completato | `97e4b8e`                    | [Prima prestazione da catalogo](p15/prestazione-catalogo.md); build verificata, schema v16.                  |
| P16  | Completato | `8c5f0e7`                    | [Ciclo di vita e revisione tecnica](p16/ciclo-vita-prestazioni.md); build verificata, schema v16.            |
| P17A | Completato | `292f81a`                    | [Consuntivazione con replay](p17a/consuntivazione-operazioni.md)                                             |
| P17B | Da avviare | —                            | Scheda nel piano                                                                                             |
| P17C | Da avviare | —                            | Scheda nel piano                                                                                             |
| P17D | Da avviare | —                            | Scheda nel piano                                                                                             |
| P18  | Da avviare | —                            | Scheda nel piano                                                                                             |
| P19  | Da avviare | —                            | Scheda nel piano                                                                                             |
| P20  | Da avviare | —                            | Scheda nel piano                                                                                             |

Stati ordinari: Da avviare, In corso, Implementato/da verificare, Completato, Bloccato con causa concreta. I commit indicano implementazioni, mentre le note distinguono build e pacchetto. Il commit P00 si individua con `git log --diff-filter=A --oneline -- doc/p00/decisioni-iniziali.md`.

## Revisioni UI e milestone

| Attività | Stato       | Chiusura o prossima verifica                                                                                                                                 |
| -------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| UI01     | Completato  | [Convenzioni iniziali](ui01/revisione-post-p04.md).                                                                                                          |
| UI02     | Completato  | [Consolidamento anagrafiche/catalogo](ui02/revisione-anagrafiche-e-catalogo.md).                                                                             |
| UI03     | Completato  | [Revisione dei flussi P09–P16](ui03/revisione-flussi-operativi.md), verificata sulla build Electron, schema v16.                                             |
| UI04     | Da avviare  | In P20.                                                                                                                                                      |
| M1       | Chiusa      | Schema v9, build e pacchetto verificati. [Evidenze](ui02/revisione-anagrafiche-e-catalogo.md#verifiche-ui02-e-m1).                                           |
| M2       | Chiusa      | Schema v14: suite complete su build e medesimo eseguibile Windows, migrazioni cumulative e trasferibilità. [Evidenze](p13/verifiche.md#verifiche-m2).        |
| M3       | Chiusa      | Schema v16, integrazione UI03: suite complete su build e medesimo pacchetto Windows x64, migrazioni v1–v15 e trasferibilità v16. [Evidenze](m3/chiusura.md). |
| M4       | Pianificata | Dopo P19.                                                                                                                                                    |
| M5       | Pianificata | P20, con UI04 e generazione installer.                                                                                                                       |

Le verifiche complete seguono esclusivamente il [piano §7.3](piano-implementazione-prestazioni.md#73-criteri-comuni-di-completamento). Le revisioni tecniche dopo P12 e P16 sono completate e documentate nelle rispettive note [P12](p12/spostamento-tra-porti.md#revisione-tecnica-dopo-p12) e [P16](p16/ciclo-vita-prestazioni.md#revisione-tecnica-post-p16).

## Consegna corrente — P17A

**P17A completato e verificato sulla build Electron, schema v16 invariato.** Base `de23f71`, branch `main` inizialmente pulito; implementazione e test nel commit `292f81a`. Disponibile la consuntivazione delle operazioni previste come effettuate o mancate, con dati effettivi, replay completo, identità ancorate, assegnazioni, riattribuzione FREE/CATALOG e ricalcoli atomici. Anteprima prima/dopo e blocchi, protocollo P00 D04, bozze conservate, ricaricamento esplicito e recupero delle conferme incerte. Le correzioni generali e le eliminazioni restano P17B–D.

**Verifiche concluse secondo §7.3:** check, backend completo con SQLite Electron e un worker esplicito, invarianti/rollback/riapertura P17A e percorsi desktop nuovi o direttamente interessati. La sola sintesi finale, i motivi di selezione/riuso e i limiti dei report sono nella [nota P17A](p17a/consuntivazione-operazioni.md#verifiche-finali), con [manifest](p17a/verifiche.json) ed evidenze selezionate. Il primo step resta incompleto per la fase desktop; gli esiti individuali riusciti sono distinti dai completamenti successivi. Nessuna promozione automatica del report a chiusura del task. Consegna precedente M3 conservata nella [nota e negli allegati M3](m3/chiusura.md).

**Passaggio operativo a P17B — Inserire operazioni retroattive:** riusare replay, attribuzioni e piano di persistenza, separando l’inserimento dei record dell’operazione dalla vecchia applicazione incrementale delle permanenze. Usare namespace specifico e ID server stabili fra anteprima/applicazione; preservare componenti posseduti, riferimenti reali, rifiuto degli orfani e recupero degli esiti incerti. [Punti d’integrazione e limiti](p17a/consuntivazione-operazioni.md#limiti-e-passaggio-a-p17b). Prove estese desktop/pacchetto a **M4**, salvo trigger anticipati; nessuna sessione manuale umana o seconda macchina fisica.

## Limiti aperti

I cinque avvisi Prettier legacy `00`–`04` sono risolti in [V03](v03/adozione-documentale.md); gli esiti storici, compresa la [nota M3](m3/chiusura.md), conservano le uscite effettivamente ottenute.

- Prove desktop automatizzate e ispezioni dell'agente. M1–M3 provano trasferibilità fra processi e percorsi sullo stesso Windows, senza seconda macchina fisica. Accessibilità estesa, ulteriori DPI e installazione seguono i checkpoint previsti.
- I dettagli di ambiente, prove e limiti specifici appartengono alle note collegate. I difetti ancora aperti vanno aggiunti qui con impatto concreto.

## Storico

Le consegne precedenti, compresi gli esiti intermedi e i prossimi task dell'epoca, sono conservate nell'[archivio P01–P09/UI/M1](archivio/storico-implementazione-p01-p09.md). Consultare lo storico quando necessario per audit o diagnosi. Per le nuove consegne aggiornare il presente registro e la nota del task secondo la guida documentale.
