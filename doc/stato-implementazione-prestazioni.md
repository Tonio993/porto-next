# Stato di implementazione delle prestazioni

Aggiornamento del 24 novembre 2026. Questo file contiene lo stato corrente e la sola consegna attiva. Requisiti e frequenza dei controlli sono nel [piano](piano-implementazione-prestazioni.md), regole di lettura e aggiornamento nella [guida documentale](guida-documentazione.md).

## Stato corrente

- **PR06 implementato e versionato; 57 nuove unità e completa definitiva 855/855; primo esito cleanup conservato; desktop/integrate a K4.** [Nota corrente e riesame K2](pr06/fusi-offline-e-date.md). Schema v17 invariato. Dataset offline IANA 2026f public domain, selettori azienda/paese, validazione IPC e formatter distinti per storico/UTC/input/data civile; permanenze con tuple originali dal backend. Preservati PR01/PR02/PR03/PR04/PR05/PR11. Prossimo passo PR07. [Piano PR01–PR12](dev/piano-interventi-post-rilascio.md), copertura 21/21 e otto analoghi, chiusure P20/UI04/M5 ed evidenze storiche conservati.
- P00–P16, P17A e UI01–UI03 completati. UI03 verificata sulla build Electron, schema v16 invariato, implementazione `2e24749`, base `c1ee663`. [Nota UI03](ui03/revisione-flussi-operativi.md). P16 e revisione tecnica post-P16 restano verificati; [nota e revisione](p16/ciclo-vita-prestazioni.md#revisione-tecnica-post-p16).
- M1 chiusa sul pacchetto Windows dello schema v9. **M2 chiusa** sull’integrazione P13, schema v14, secondo il piano §7.3. [Evidenze](p13/verifiche.md#verifiche-m2).
- Revisioni tecniche dopo P12 e P16 completate. **M3 chiusa** sull’integrazione UI03, schema v16; [storico M3](m3/chiusura.md) preservato. **M4 chiusa** sull’integrazione P17A–P19, schema v17, implementazione `6282ccd`; [consegna M4](m4/chiusura.md) preservata. **P20 e UI04 completati, M5 chiusa**, versione 0.1.0/schema v17, con pacchetto e installer Windows verificati. [Consegna P20](p20/revisione-e-rilascio.md). Restano firma e collaudo d’installazione nell’ambiente di destinazione.
- **V01–V03 e rifinitura dell’output compatto completati e verificati**. Riscontro operativo P17A raccolto nel [manifest e nella nota](p17a/consuntivazione-operazioni.md#riscontro-operativo-del-coordinatore), distinguendo chiamate/output letti dai token. V04–V07 da rivalutare secondo la [consegna del piano di automazione](piano-automazione-verifiche.md#consegna-corrente).

## Avanzamento

| Task | Stato                                                                                          | Revisione di implementazione | Nota operativa                                                                                               |
| ---- | ---------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| P00  | Completato                                                                                     | Commit di introduzione P00   | [Decisioni](p00/decisioni-iniziali.md)                                                                       |
| P01  | Completato                                                                                     | `f9b3dbb`                    | [Contesto applicativo](p01/contesto-applicativo.md)                                                          |
| P02  | Completato                                                                                     | `4235f71`                    | [Numeri e tempo](p02/numeri-e-tempo.md)                                                                      |
| P03  | Completato                                                                                     | `5a6fa8c`                    | [Creazione e consultazione porti](p03/porti.md)                                                              |
| P04  | Completato                                                                                     | `0be600d`                    | [Versioni e ciclo di vita porto](p04/versioni-e-ciclo-di-vita.md)                                            |
| P05  | Completato                                                                                     | `f966ba8`                    | [Banchine](p05/banchine.md)                                                                                  |
| P06  | Completato                                                                                     | `ef6e257`                    | [Clienti e agenzie](p06/clienti-e-agenzie.md)                                                                |
| P07  | Completato                                                                                     | `856bcbc`                    | [Navi](p07/navi.md)                                                                                          |
| P08  | Completato                                                                                     | `0e7fc36`                    | [Catalogo e pesi iniziali](p08/catalogo-e-pesi-iniziali.md)                                                  |
| P09  | Completato                                                                                     | `1b2f4a5`                    | [Tariffe e calcolatore base](p09/tariffe-e-calcolatore-base.md)                                              |
| P10  | Completato                                                                                     | `3a34501`                    | [Entrata, uscita e permanenze](p10/entrata-uscita-e-permanenze.md); verificato sulla build Electron.         |
| P11  | Completato                                                                                     | `8450b39`                    | [Spostamento interno](p11/spostamento-interno.md); verificato sulla build Electron.                          |
| P12  | Completato                                                                                     | `f07c859`                    | [Spostamento tra porti](p12/spostamento-tra-porti.md); verificato sulla build Electron.                      |
| P13  | Completato                                                                                     | `c2b2ff9`                    | [Cliente e agenzia effettivi](p13/cliente-e-agenzia-effettivi.md); build e pacchetto verificati, schema v14. |
| P14  | Completato                                                                                     | `a554e27`                    | [Prima prestazione libera](p14/prestazione-libera.md); build verificata, schema v15.                         |
| P15  | Completato                                                                                     | `97e4b8e`                    | [Prima prestazione da catalogo](p15/prestazione-catalogo.md); build verificata, schema v16.                  |
| P16  | Completato                                                                                     | `8c5f0e7`                    | [Ciclo di vita e revisione tecnica](p16/ciclo-vita-prestazioni.md); build verificata, schema v16.            |
| P17A | Completato                                                                                     | `292f81a`                    | [Consuntivazione con replay](p17a/consuntivazione-operazioni.md)                                             |
| P17B | Completato                                                                                     | `6282ccd`; verificato in M4  | [Inserimento retroattivo; verifica M4](p17b/inserimento-operazioni-retroattive.md)                           |
| P17C | Completato                                                                                     | `6282ccd`; verificato in M4  | [Correzione operazioni; verifica M4](p17c/correzione-operazioni.md)                                          |
| P17D | Completato                                                                                     | `6282ccd`; verificato in M4  | [Eliminazione operazioni e sole note; verifica M4](p17d/eliminazione-operazioni.md)                          |
| P18  | Completato                                                                                     | `6282ccd`; verificato in M4  | [Correzione ed eliminazione tariffe; verifica M4](p18/correzione-eliminazione-tariffe.md)                    |
| P19  | Completato                                                                                     | `6282ccd`; verificato in M4  | [Versioni dei pesi, schema v17; verifica M4](p19/versioni-dei-pesi.md)                                       |
| P20  | Completato                                                                                     | `01db2d5`; verificato in M5  | [Revisione e rilascio](p20/revisione-e-rilascio.md)                                                          |
| PR01 | Implementato; unità verificate; desktop/integrate differiti                                    | `3531d82`                    | [Feedback dopo eliminazione](pr01/feedback-eliminazione.md)                                                  |
| PR02 | Implementato; unità PR02 verificate; limite nella suite globale; desktop/integrate differiti   | `eba1313`                    | [Bozze ed esiti incerti](pr02/bozze-ed-esiti-incerti.md)                                                     |
| PR11 | Implementato; unità PR11 verificate; limite nella suite globale; desktop/integrate differiti   | `6d4572b`                    | [Permanenze recenti](pr11/permanenze-recenti.md)                                                             |
| PR03 | Implementato; 46 unità nuove verificate; limite globale ereditato; desktop/integrate differiti | `f6db0d9`                    | [Stato consultazione e K1](pr03/stato-consultazione.md)                                                      |
| PR04 | Implementato; 65 unità nuove, completa 675/675; desktop/integrate differiti a K4               | `bd6f39c`                    | [Notazione numerica](pr04/notazione-numerica.md)                                                             |
| PR05 | Implementato; 123 nuove unità, completa 798/798; desktop/integrate differiti a K4              | `ce45f77`                    | [Selettori paginati](pr05/selettori-paginati.md)                                                             |
| PR06 | Implementato; 57 nuove unità e completa definitiva 855/855; desktop/integrate a K4             | `3cc509a`                    | [Fusi offline e date, K2](pr06/fusi-offline-e-date.md)                                                       |

Stati ordinari: Da avviare, In corso, Implementato/da verificare, Completato, Bloccato con causa concreta. I commit indicano implementazioni, mentre le note distinguono build e pacchetto. Il commit P00 si individua con `git log --diff-filter=A --oneline -- doc/p00/decisioni-iniziali.md`.

## Revisioni UI e milestone

| Attività | Stato      | Chiusura o prossima verifica                                                                                                                                 |
| -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| UI01     | Completato | [Convenzioni iniziali](ui01/revisione-post-p04.md).                                                                                                          |
| UI02     | Completato | [Consolidamento anagrafiche/catalogo](ui02/revisione-anagrafiche-e-catalogo.md).                                                                             |
| UI03     | Completato | [Revisione dei flussi P09–P16](ui03/revisione-flussi-operativi.md), verificata sulla build Electron, schema v16.                                             |
| UI04     | Completato | [Revisione finale](ui04/revisione-finale.md), build e pacchetto, dimensioni e zoom verificati con limiti dichiarati.                                         |
| M1       | Chiusa     | Schema v9, build e pacchetto verificati. [Evidenze](ui02/revisione-anagrafiche-e-catalogo.md#verifiche-ui02-e-m1).                                           |
| M2       | Chiusa     | Schema v14: suite complete su build e medesimo eseguibile Windows, migrazioni cumulative e trasferibilità. [Evidenze](p13/verifiche.md#verifiche-m2).        |
| M3       | Chiusa     | Schema v16, integrazione UI03: suite complete su build e medesimo pacchetto Windows x64, migrazioni v1–v15 e trasferibilità v16. [Evidenze](m3/chiusura.md). |
| M4       | Chiusa     | Schema v17, integrazione P17A–P19, backend/build/pacchetto, migrazioni e trasferibilità verificati. [Nota M4](m4/chiusura.md).                               |
| M5       | Chiusa     | P20/UI04, schema v17, build e medesimo pacchetto, installer NSIS generato e payload confrontato; installazione distinta da eseguire.                         |

La matrice delle verifiche è nel [piano §7.3](piano-implementazione-prestazioni.md#73-criteri-comuni-di-completamento). Il precedente limite dei soli unit test per P17B–P19 è superato dalla richiesta M4 del 19 novembre; le consegne originarie restano nelle rispettive note. Le revisioni tecniche dopo P12 e P16 sono completate e documentate nelle rispettive note [P12](p12/spostamento-tra-porti.md#revisione-tecnica-dopo-p12) e [P16](p16/ciclo-vita-prestazioni.md#revisione-tecnica-post-p16).

## Consegna corrente — PR06 / Fusi offline e date

**Implementato e versionato su successiva richiesta esplicita dell’utente, commit `3cc509a`; schema v17 invariato.** Base reale main / 40ef3b4df6d8421c41cb5addd9be5a1cab13eeaa, stato iniziale pulito. Mappa IANA 2026f public domain con fonti/hash/generazione locale; PagedPicker statico per azienda e paese del nuovo porto, vincoli anche IPC diretto e riferimenti storici conservati. Date strutturate con locale/offset salvati, IANA nel dettaglio, UTC tecnico esplicito; tuple di apertura/chiusura delle permanenze proiettate dal backend. [Censimento, regole, esiti effettivi, riesame K2 e scenari K4](pr06/fusi-offline-e-date.md), [manifest](pr06/verifiche.json).

**Verifiche:** 57 nuove unità passate; completa definitiva npm test/Electron **855/855 su 49 file**, npm/Electron **0/0**. Ripetuta dopo la correzione della compatibilità ISO dei metadati, con nuove asserzioni e selezione mirata 69/69. Primo esito **854/855**, conservato: **ENOTEMPTY nel cleanup afterEach** del test prestazioni «nuova operazione blocca prestazioni orfane e riattribuisce quelle successive atomicamente». Diagnosi del solo caso **1/1 selezionato passa**, senza sostituire il primo esito o dimostrare risolta la causa. TypeScript/ESLint passati; check **1** per la sola formattazione preesistente di punti-issue.md, intatto e senza esclusioni. Le complete storiche PR05 798/798 e PR04 675/675, nonché i limiti PR02/PR11/PR03, restano distinti.

**K2 svolto come riesame della copertura PR04/PR05/PR06**, senza campagna integrata. Deroga esplicita PR01–PR12: solo unità e controlli statici/documentali intermedi; desktop, build, pacchetto e integrate a K4, inclusa la risorsa offline. Tre nuovi percorsi desktop PR06 e dodici precedenti aggiornati, non eseguiti; unità senza DOM non attestano Chromium/focus/tastiera o caricamento del pacchetto. K1 e chiusure P20/UI04/M5 preservati.

**Prossimo passo PR07**, nomi/etichette/riferimenti. Riutilizzare formatter specifici e tuple strutturate, conservare contesto delle bozze e notazione PR04. I testi aggregati e JSON temporali opachi richiedono proiezioni PR08, documentate nella nota; nessuna reinterpretazione euristica. Firma/installazione nell'ambiente di destinazione restano separate nella [consegna P20](p20/revisione-e-rilascio.md).

## Limiti aperti

I cinque avvisi Prettier legacy `00`–`04` sono risolti in [V03](v03/adozione-documentale.md); gli esiti storici, compresa la [nota M3](m3/chiusura.md), conservano le uscite effettivamente ottenute.

- Prove desktop automatizzate e ispezioni dell'agente. M1–M5 provano trasferibilità fra processi e percorsi sullo stesso Windows, senza seconda macchina fisica. UI04 verifica zoom renderer 125/150%, non DPI hardware; nessuna sessione manuale umana o prova con screen reader. Accessibilità estesa e altri hardware richiedono l’ambiente di destinazione.
- PR06: prima completa 854/855 per ENOTEMPTY nel cleanup temporaneo di service-service; diagnosi selettiva 1/1 e completa definitiva 855/855 dopo la correzione ISO dei metadati. Causa della pulizia non dimostrata, da riesaminare a K4 senza alterare retry/timeout. [Evidenze](pr06/fusi-offline-e-date.md#verifiche-finali).
- I dettagli di ambiente, prove e limiti specifici appartengono alle note collegate. I difetti ancora aperti vanno aggiunti qui con impatto concreto.

## Storico

Le consegne precedenti, compresi gli esiti intermedi e i prossimi task dell'epoca, sono conservate nell'[archivio P01–P09/UI/M1](archivio/storico-implementazione-p01-p09.md). Consultare lo storico quando necessario per audit o diagnosi. Per le nuove consegne aggiornare il presente registro e la nota del task secondo la guida documentale.
