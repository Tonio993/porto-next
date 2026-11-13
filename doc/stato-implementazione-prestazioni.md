# Stato di implementazione delle prestazioni

Aggiornamento del 13 novembre 2026. Questo file contiene lo stato corrente e la sola consegna attiva. Requisiti e frequenza dei controlli sono nel [piano](piano-implementazione-prestazioni.md), regole di lettura e aggiornamento nella [guida documentale](guida-documentazione.md).

## Stato corrente

- P00–P12, UI01 e UI02 completati. P12 verificato sulla build Electron, schema v13; implementazione nel commit `f07c859`. [Nota P12](p12/spostamento-tra-porti.md).
- M1 chiusa sul pacchetto Windows dello schema v9. La verifica integrata successiva è M2 dopo P13, secondo il piano §7.3.
- Revisione tecnica dopo P12 completata. Prossimo task **P13 — Cliente e agenzia effettivi**; P13–P20 restano da avviare.

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
| P11  | Completato | `8450b39`                    | [Spostamento interno](p11/spostamento-interno.md); verificato sulla build Electron.                  |
| P12  | Completato | `f07c859`                    | [Spostamento tra porti](p12/spostamento-tra-porti.md); verificato sulla build Electron.              |
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

Le verifiche complete seguono esclusivamente il [piano §7.3](piano-implementazione-prestazioni.md#73-criteri-comuni-di-completamento). La revisione tecnica dopo P12 è completata e documentata nella [nota P12](p12/spostamento-tra-porti.md#revisione-tecnica-dopo-p12); la prossima rimane dopo P16.

## Consegna corrente — P12

**P12 completato e verificato sulla build Electron, schema v13.** Il comando di spostamento ammette porti differenti e conserva il viaggio; chiude e apre visite e ormeggi ai rispettivi estremi. EXIT alla partenza ed ENTRY all’arrivo mantengono calcoli, riferimenti e sostituzioni manuali autonomi; il totale è derivato. Durante il trasferimento esterno la query di contesto restituisce viaggio presente, visita e ormeggio assenti. [Nota operativa e revisione tecnica P12](p12/spostamento-tra-porti.md).

**Prove finali:** 219 test backend/SQLite verificati su 24 file e dodici percorsi desktop selezionati, con migrazione da v12 popolato, copie preventive e rollback. TypeScript, ESLint e build passati; Prettier segnala soltanto i cinque legacy già noti. Quattro schermate ispezionate dall’agente. La nota contiene la sintesi definitiva, la selezione e il riuso degli esiti; l’[allegato](p12/verifiche.md) identifica build e comandi. Prove automatizzate offline, nessuna sessione manuale umana.

Non sono noti difetti di integrità aperti nel perimetro P12. La revisione tecnica di cardinalità, confini dei livelli, sequenza completa, identità, FK, rollback e protezioni asincrone è conclusa; comprende l’azzeramento dell’offset scelto quando cambia porto nell’editor. Implementazione nel commit `f07c859`, base `b1ca2a3` su `main`; documentazione ed evidenze nella consegna separata. Il pacchetto v13 e le verifiche integrate complete restano **M2 dopo P13**, secondo §7.3: nessuna modifica a runtime, dipendenze native, confezionamento o caricamento risorse.

**Passaggio a P13.** Risolvere separatamente cliente e agenzia per ciascuna componente, usando il contesto del proprio estremo economico: origine per EXIT/DEPARTURE, destinazione per ENTRY/ARRIVAL. Non attribuire una visita fittizia durante il trasferimento esterno. [Limiti e passaggio operativo](p12/spostamento-tra-porti.md#limiti-e-passaggio-a-p13). Correzioni, eliminazioni operative e trasformazioni strutturali restano alle slice P17; la prossima revisione tecnica segue P16. P15 mantiene l’utilizzo monotono del catalogo nella propria transazione; variazioni dei pesi restano P19.

## Limiti aperti

- Prettier globale segnala storicamente i cinque documenti legacy `00`–`04`; distinguere questi avvisi da nuove regressioni.
- Prove desktop automatizzate e ispezioni dell'agente. M1 prova trasferibilità fra processi e percorsi sullo stesso Windows, senza seconda macchina fisica. Accessibilità estesa, ulteriori DPI e installazione seguono i checkpoint previsti.
- I dettagli di ambiente, prove e limiti specifici appartengono alle note collegate. I difetti ancora aperti vanno aggiunti qui con impatto concreto.

## Storico

Le consegne precedenti, compresi gli esiti intermedi e i prossimi task dell'epoca, sono conservate nell'[archivio P01–P09/UI/M1](archivio/storico-implementazione-p01-p09.md). Consultare lo storico quando necessario per audit o diagnosi. Per le nuove consegne aggiornare il presente registro e la nota del task secondo la guida documentale.
