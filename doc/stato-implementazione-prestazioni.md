# Stato di implementazione delle prestazioni

Aggiornamento del 12 novembre 2026. Questo file contiene lo stato corrente e la sola consegna attiva. Requisiti e frequenza dei controlli sono nel [piano](piano-implementazione-prestazioni.md), regole di lettura e aggiornamento nella [guida documentale](guida-documentazione.md).

## Stato corrente

- P00–P10, UI01 e UI02 completati. P10 verificato sulla build Electron, implementazione nel commit `3a34501`, schema v11. [Nota P10](p10/entrata-uscita-e-permanenze.md).
- M1 chiusa sul pacchetto Windows dello schema v9. La verifica integrata successiva è M2 dopo P13, secondo il piano §7.3.
- Prossimo task **P11 — Spostamento interno**. P11–P20 restano da avviare.

## Avanzamento

| Task | Stato      | Revisione di implementazione | Nota operativa                                                                                       |
| ---- | ---------- | ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| P00  | Completato | Commit di introduzione P00   | [Decisioni](p00/decisioni-iniziali.md)                                                               |
| P01  | Completato | `f9b3dbb`                    | [Contesto applicativo](p01/contesto-applicativo.md)                                                  |
| P02  | Completato | `4235f71`                    | [Numeri e tempo](p02/numeri-e-tempo.md)                                                              |
| P03  | Completato | `5a6fa8c`                    | [Creazione e consultazione porti](p03/porti.md)                                                      |
| P04  | Completato | `0be600d`                    | [Versioni e ciclo di vita porto](p04/versioni-e-ciclo-di-vita.md)                                    |
| P05  | Completato | `f966ba8`                    | [Banchine](p05/banchine.md)                                                                          |
| P06  | Completato | `ef6e257`                    | [Clienti e agenzie](p06/clienti-e-agenzie.md)                                                        |
| P07  | Completato | `856bcbc`                    | [Navi](p07/navi.md)                                                                                  |
| P08  | Completato | `0e7fc36`                    | [Catalogo e pesi iniziali](p08/catalogo-e-pesi-iniziali.md)                                          |
| P09  | Completato | `1b2f4a5`                    | [Tariffe e calcolatore base](p09/tariffe-e-calcolatore-base.md)                                      |
| P10  | Completato | `3a34501`                    | [Entrata, uscita e permanenze](p10/entrata-uscita-e-permanenze.md); verificato sulla build Electron. |
| P11  | Da avviare | —                            | Scheda nel piano                                                                                     |
| P12  | Da avviare | —                            | Scheda nel piano                                                                                     |
| P13  | Da avviare | —                            | Scheda nel piano                                                                                     |
| P14  | Da avviare | —                            | Scheda nel piano                                                                                     |
| P15  | Da avviare | —                            | Scheda nel piano                                                                                     |
| P16  | Da avviare | —                            | Scheda nel piano                                                                                     |
| P17A | Da avviare | —                            | Scheda nel piano                                                                                     |
| P17B | Da avviare | —                            | Scheda nel piano                                                                                     |
| P17C | Da avviare | —                            | Scheda nel piano                                                                                     |
| P17D | Da avviare | —                            | Scheda nel piano                                                                                     |
| P18  | Da avviare | —                            | Scheda nel piano                                                                                     |
| P19  | Da avviare | —                            | Scheda nel piano                                                                                     |
| P20  | Da avviare | —                            | Scheda nel piano                                                                                     |

Stati ordinari: Da avviare, In corso, Implementato/da verificare, Completato, Bloccato con causa concreta. I commit indicano implementazioni, mentre le note distinguono build e pacchetto. Il commit P00 si individua con `git log --diff-filter=A --oneline -- doc/p00/decisioni-iniziali.md`.

## Revisioni UI e milestone

| Attività | Stato       | Chiusura o prossima verifica                                                                                       |
| -------- | ----------- | ------------------------------------------------------------------------------------------------------------------ |
| UI01     | Completato  | [Convenzioni iniziali](ui01/revisione-post-p04.md).                                                                |
| UI02     | Completato  | [Consolidamento anagrafiche/catalogo](ui02/revisione-anagrafiche-e-catalogo.md).                                   |
| UI03     | Da avviare  | Dopo P16, prima della chiusura M3.                                                                                 |
| UI04     | Da avviare  | In P20.                                                                                                            |
| M1       | Chiusa      | Schema v9, build e pacchetto verificati. [Evidenze](ui02/revisione-anagrafiche-e-catalogo.md#verifiche-ui02-e-m1). |
| M2       | Pianificata | Dopo P13, sulla build integrata finale.                                                                            |
| M3       | Pianificata | Dopo P16 e correzioni UI03.                                                                                        |
| M4       | Pianificata | Dopo P19.                                                                                                          |
| M5       | Pianificata | P20, con UI04 e generazione installer.                                                                             |

Le verifiche complete seguono esclusivamente il [piano §7.3](piano-implementazione-prestazioni.md#73-criteri-comuni-di-completamento). Le revisioni tecniche successive sono dopo P12 e P16.

## Consegna corrente — P10

**Da conservare per P11.** Operazioni e permanenze hanno identità proprie e aperture ancorate alle operazioni. Le componenti persistono traccia tariffaria e riferimenti reali, mantenendo distinti valore teorico, sostituzione manuale e base effettiva. Le modifiche tariffarie e anagrafiche integrano analisi di intervallo e ricalcoli atomici. Per API, sequenza, disambiguazione temporale e chiamanti leggere le sezioni pertinenti della [nota P10](p10/entrata-uscita-e-permanenze.md).

**P10 completato e verificato sulla build Electron.** `npm test`: 189 test su 22 file passati. Verificati otto percorsi desktop: due P10 sulla build finale e sei regressioni direttamente coinvolte di Banchine, Porti, Tariffe e Navi, riusate dopo il solo ritocco locale al DTO P10. Migrazione v10 popolato → v11, conservazione dei dati, copia preventiva e rollback verificati, inclusa apertura migrata nella build. TypeScript ed ESLint passati; Prettier segnala soltanto i cinque documenti legacy già noti. Quattro schermate ispezionate dall'agente. Prove Playwright automatizzate offline, senza sessione manuale umana; dettagli, build, motivazione della selezione e riuso nella [nota P10](p10/entrata-uscita-e-permanenze.md).

Non sono noti difetti di integrità aperti nel perimetro P10. Implementazione nel commit `3a34501`, documentazione e schermate nella consegna separata. Il pacchetto v11 e le verifiche integrate complete restano pianificati per **M2 dopo P13**, secondo §7.3; P10 non cambia runtime, dipendenze o meccanismo di caricamento delle risorse.

**Attenzioni successive.** P11 aggiunge lo spostamento interno con due estremi distinti e una componente economica alla partenza. P15 deve aggiornare l'utilizzo monotono del catalogo nella transazione della prestazione. Correzione/eliminazione diretta delle tariffe restano P18, variazioni dei pesi P19.

## Limiti aperti

- Prettier globale segnala storicamente i cinque documenti legacy `00`–`04`; distinguere questi avvisi da nuove regressioni.
- Prove desktop automatizzate e ispezioni dell'agente. M1 prova trasferibilità fra processi e percorsi sullo stesso Windows, senza seconda macchina fisica. Accessibilità estesa, ulteriori DPI e installazione seguono i checkpoint previsti.
- I dettagli di ambiente, prove e limiti specifici appartengono alle note collegate. I difetti ancora aperti vanno aggiunti qui con impatto concreto.

## Storico

Le consegne precedenti, compresi gli esiti intermedi e i prossimi task dell'epoca, sono conservate nell'[archivio P01–P09/UI/M1](archivio/storico-implementazione-p01-p09.md). Consultare lo storico quando necessario per audit o diagnosi. Per le nuove consegne aggiornare il presente registro e la nota del task secondo la guida documentale.
