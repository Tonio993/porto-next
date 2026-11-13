# Stato di implementazione delle prestazioni

Aggiornamento del 13 novembre 2026. Questo file contiene lo stato corrente e la sola consegna attiva. Requisiti e frequenza dei controlli sono nel [piano](piano-implementazione-prestazioni.md), regole di lettura e aggiornamento nella [guida documentale](guida-documentazione.md).

## Stato corrente

- P00–P13, UI01 e UI02 completati. P13 verificato sulla build Electron e nel pacchetto Windows, schema v14; implementazione nel commit `c2b2ff9`, base `d99e18b`. [Nota P13](p13/cliente-e-agenzia-effettivi.md).
- M1 chiusa sul pacchetto Windows dello schema v9. **M2 chiusa** sull’integrazione P13, schema v14, secondo il piano §7.3. [Evidenze](p13/verifiche.md#verifiche-m2).
- Revisione tecnica dopo P12 completata. Prossimo task **P14 — Prima prestazione libera**; P14–P20 restano da avviare.

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
| P14  | Da avviare | —                            | Scheda nel piano                                                                                             |
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

## Consegna corrente — P13

**P13 completato e verificato sulla build Electron, schema v14.** Assegnazioni indipendenti su viaggio, visita, ormeggio e operazione; valori effettivi, versioni applicabili e fonti persistiti per componente. Priorità operazione → ormeggio → visita → viaggio; rimozione degli override ripristina l’ereditarietà. Le componenti esterne usano origine e destinazione autonomamente; MISSED non crea permanenze fittizie. [Nota operativa](p13/cliente-e-agenzia-effettivi.md).

**Prove P13:** 236/236 casi backend/SQLite su 26 file, migrazione v13 popolato→v14 con copia preventiva e rollback, due percorsi desktop funzionale e asincrono sulla build integrata. TypeScript, ESLint e build passati; Prettier segnala soltanto i cinque legacy noti. Due schermate ispezionate alle dimensioni minima e desktop. Prove automatizzate offline, nessuna sessione manuale umana. Dettagli e identificazione della build nell’[allegato](p13/verifiche.md).

**M2 chiusa, distinta dal completamento P13:** tutti i 27 percorsi desktop verificati sulla build integrata e tutti i 27 sul medesimo eseguibile Windows x64, con migrazioni cumulative v1–v13→v14 e trasferibilità. Riutilizzati i 26 esiti validi di ciascuna serie completa e ripetuto integralmente P13 dopo correzioni ai soli helper di test. Build, risorse confezionate, eseguibile, ASAR e driver nativo identificati nell’[allegato](p13/verifiche.md#verifiche-m2), con impronte ricontrollate e invariate a fine prove. Nessuna modifica a runtime, dipendenze native o configurazione di confezionamento; nessuna ricompilazione durante le serie finali. Nessun difetto di integrità noto nel perimetro verificato. Prossima verifica integrata completa: M3 dopo P16 e UI03.

**Passaggio a P14 — Prima prestazione libera.** Il [passaggio operativo](p13/cliente-e-agenzia-effettivi.md#limiti-e-passaggio-a-p14) indica come estendere risoluzione e impatti alle prestazioni ordinarie, mantenendo il contesto completo al proprio istante e i limiti del trasferimento. Nuovi riferimenti da integrare subito nelle anteprime e nei comandi esistenti. Fatture e correzioni strutturali restano fuori da P13; prossima revisione tecnica dopo P16 e UI03 prima della chiusura M3.

## Limiti aperti

- Prettier globale segnala storicamente i cinque documenti legacy `00`–`04`; distinguere questi avvisi da nuove regressioni.
- Prove desktop automatizzate e ispezioni dell'agente. M1 e M2 provano trasferibilità fra processi e percorsi sullo stesso Windows, senza seconda macchina fisica. Accessibilità estesa, ulteriori DPI e installazione seguono i checkpoint previsti.
- I dettagli di ambiente, prove e limiti specifici appartengono alle note collegate. I difetti ancora aperti vanno aggiunti qui con impatto concreto.

## Storico

Le consegne precedenti, compresi gli esiti intermedi e i prossimi task dell'epoca, sono conservate nell'[archivio P01–P09/UI/M1](archivio/storico-implementazione-p01-p09.md). Consultare lo storico quando necessario per audit o diagnosi. Per le nuove consegne aggiornare il presente registro e la nota del task secondo la guida documentale.
