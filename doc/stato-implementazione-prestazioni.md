# Stato di implementazione delle prestazioni

Aggiornamento del 16 novembre 2026. Questo file contiene lo stato corrente e la sola consegna attiva. Requisiti e frequenza dei controlli sono nel [piano](piano-implementazione-prestazioni.md), regole di lettura e aggiornamento nella [guida documentale](guida-documentazione.md).

## Stato corrente

- P00–P14, UI01 e UI02 completati. P14 verificato sulla build Electron, schema v15; implementazione nel commit `a554e27`, base `0beb74f`. [Nota P14](p14/prestazione-libera.md).
- M1 chiusa sul pacchetto Windows dello schema v9. **M2 chiusa** sull’integrazione P13, schema v14, secondo il piano §7.3. [Evidenze](p13/verifiche.md#verifiche-m2).
- Revisione tecnica dopo P12 completata. Prossimo task **P15 — Prima prestazione da catalogo**, nella stessa chat. P15–P20 restano da avviare.

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
| P15  | Da avviare | —                            | Scheda nel piano                                                                                             |
| P16  | Da avviare | —                            | Scheda nel piano                                                                                             |
| P17A | Da avviare | —                            | Scheda nel piano                                                                                             |
| P17B | Da avviare | —                            | Scheda nel piano                                                                                             |
| P17C | Da avviare | —                            | Scheda nel piano                                                                                             |
| P17D | Da avviare | —                            | Scheda nel piano                                                                                             |
| P18  | Da avviare | —                            | Scheda nel piano                                                                                             |
| P19  | Da avviare | —                            | Scheda nel piano                                                                                             |
| P20  | Da avviare | —                            | Scheda nel piano                                                                                             |

Stati ordinari: Da avviare, In corso, Implementato/da verificare, Completato, Bloccato con causa concreta. I commit indicano implementazioni, mentre le note distinguono build e pacchetto. Il commit P00 si individua con `git log --diff-filter=A --oneline -- doc/p00/decisioni-iniziali.md`.

## Revisioni UI e milestone

| Attività | Stato       | Chiusura o prossima verifica                                                                                                                          |
| -------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI01     | Completato  | [Convenzioni iniziali](ui01/revisione-post-p04.md).                                                                                                   |
| UI02     | Completato  | [Consolidamento anagrafiche/catalogo](ui02/revisione-anagrafiche-e-catalogo.md).                                                                      |
| UI03     | Da avviare  | Dopo P16, prima della chiusura M3.                                                                                                                    |
| UI04     | Da avviare  | In P20.                                                                                                                                               |
| M1       | Chiusa      | Schema v9, build e pacchetto verificati. [Evidenze](ui02/revisione-anagrafiche-e-catalogo.md#verifiche-ui02-e-m1).                                    |
| M2       | Chiusa      | Schema v14: suite complete su build e medesimo eseguibile Windows, migrazioni cumulative e trasferibilità. [Evidenze](p13/verifiche.md#verifiche-m2). |
| M3       | Pianificata | Dopo P16 e correzioni UI03.                                                                                                                           |
| M4       | Pianificata | Dopo P19.                                                                                                                                             |
| M5       | Pianificata | P20, con UI04 e generazione installer.                                                                                                                |

Le verifiche complete seguono esclusivamente il [piano §7.3](piano-implementazione-prestazioni.md#73-criteri-comuni-di-completamento). La revisione tecnica dopo P12 è completata e documentata nella [nota P12](p12/spostamento-tra-porti.md#revisione-tecnica-dopo-p12); la prossima rimane dopo P16.

## Consegna corrente — P14

**P14 completato e verificato sulla build Electron, schema v15.** Prestazioni FREE attraverso backend, SQLite, IPC/preload e UI: creazione, elenco e dettaglio per nave, contesto completo al proprio istante, importo manuale positivo esatto e soggetti indipendenti con fonti. Nuovi riferimenti integrati nelle variazioni anagrafiche, nelle assegnazioni e nelle anteprime delle operazioni. [Nota operativa](p14/prestazione-libera.md).

**Prove:** 263/263 casi backend/SQLite su 28 file, migrazione v14 popolato→v15 con copia preventiva e rollback; 9 percorsi desktop pertinenti verificati. Riutilizzati gli esiti non coinvolti e ripetute le prove interessate dalle correzioni di anteprima obsoleta e riapertura del dettaglio. TypeScript, ESLint e build passati; soltanto i cinque avvisi Prettier legacy. Due schermate ispezionate, prove automatizzate offline, nessuna sessione manuale umana. [Comandi, copertura e build](p14/verifiche.md).

**Passaggio a P15 — Prima prestazione da catalogo**, nella stessa chat: estendere il flusso di attribuzione con tipo selezionabile, tariffa/peso, risultato e utilizzo storico persistiti atomicamente. [Passaggio operativo](p14/prestazione-libera.md#limiti-e-passaggio-a-p15). M2 rimane chiusa sulla precedente integrazione v14; suite desktop completa, migrazioni cumulative e pacchetto restano pianificati a M3 dopo P16 e UI03.

## Limiti aperti

- Prettier globale segnala storicamente i cinque documenti legacy `00`–`04`; distinguere questi avvisi da nuove regressioni.
- Prove desktop automatizzate e ispezioni dell'agente. M1 e M2 provano trasferibilità fra processi e percorsi sullo stesso Windows, senza seconda macchina fisica. Accessibilità estesa, ulteriori DPI e installazione seguono i checkpoint previsti.
- I dettagli di ambiente, prove e limiti specifici appartengono alle note collegate. I difetti ancora aperti vanno aggiunti qui con impatto concreto.

## Storico

Le consegne precedenti, compresi gli esiti intermedi e i prossimi task dell'epoca, sono conservate nell'[archivio P01–P09/UI/M1](archivio/storico-implementazione-p01-p09.md). Consultare lo storico quando necessario per audit o diagnosi. Per le nuove consegne aggiornare il presente registro e la nota del task secondo la guida documentale.
