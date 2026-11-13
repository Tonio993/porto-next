# Stato di implementazione delle prestazioni

Aggiornamento del 13 novembre 2026. Questo file contiene lo stato corrente e la sola consegna attiva. Requisiti e frequenza dei controlli sono nel [piano](piano-implementazione-prestazioni.md), regole di lettura e aggiornamento nella [guida documentale](guida-documentazione.md).

## Stato corrente

- P00–P11, UI01 e UI02 completati. P11 verificato sulla build Electron, schema v12; implementazione nel commit `8450b39`. [Nota P11](p11/spostamento-interno.md).
- M1 chiusa sul pacchetto Windows dello schema v9. La verifica integrata successiva è M2 dopo P13, secondo il piano §7.3.
- Prossimo task **P12 — Spostamento tra porti**, seguito dalla revisione tecnica prevista. P12–P20 restano da avviare.

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

## Consegna corrente — P11

**P11 completato e verificato sulla build Electron, schema v12.** Disponibili registrazione e consultazione dello spostamento interno, con origine derivata, due estremi distinti, identità di viaggio e visita conservate e componente MOVEMENT alla partenza. La query di contesto distingue origine, trasferimento senza ormeggio e destinazione. Anteprime, impatti anagrafici e ricalcoli includono i nuovi riferimenti atomicamente. [Nota operativa P11](p11/spostamento-interno.md).

**Prove finali:** 205 test backend/SQLite su 23 file e dieci percorsi desktop selezionati verificati; migrazione v11 popolato → v12, copie preventive e rollback anche dopo sostituzione del grafo. Build, TypeScript ed ESLint passati; Prettier segnala soltanto i cinque documenti legacy già noti. Quattro schermate ispezionate dall’agente. La nota conserva sintesi, selezione e riuso degli esiti; l’[allegato](p11/verifiche.md) identifica build e comandi. Prove automatizzate offline, nessuna sessione manuale umana.

Non sono noti difetti di integrità aperti nel perimetro P11. Implementazione nel commit `8450b39`; documentazione ed evidenze nella consegna separata. Il pacchetto v12 e le verifiche integrate complete restano **M2 dopo P13**; P11 non modifica runtime, dipendenze native o meccanismo di caricamento delle risorse.

**Passaggio a P12.** Estendere le componenti autonome EXIT/ENTRY, i fusi dei due porti e la query di contesto con visita assente durante il trasferimento fra porti. Conservare il viaggio e integrare i riferimenti in anteprime e ricalcoli. La [nota P11](p11/spostamento-interno.md#limiti-e-passaggio-a-p12) individua contratti, cardinalità e vincoli da estendere. **Revisione tecnica dopo P12** confermata, prima di P13. P15 deve mantenere l’utilizzo monotono del catalogo nella transazione della prestazione; correzione/eliminazione diretta delle tariffe restano P18, variazioni dei pesi P19.

## Limiti aperti

- Prettier globale segnala storicamente i cinque documenti legacy `00`–`04`; distinguere questi avvisi da nuove regressioni.
- Prove desktop automatizzate e ispezioni dell'agente. M1 prova trasferibilità fra processi e percorsi sullo stesso Windows, senza seconda macchina fisica. Accessibilità estesa, ulteriori DPI e installazione seguono i checkpoint previsti.
- I dettagli di ambiente, prove e limiti specifici appartengono alle note collegate. I difetti ancora aperti vanno aggiunti qui con impatto concreto.

## Storico

Le consegne precedenti, compresi gli esiti intermedi e i prossimi task dell'epoca, sono conservate nell'[archivio P01–P09/UI/M1](archivio/storico-implementazione-p01-p09.md). Consultare lo storico quando necessario per audit o diagnosi. Per le nuove consegne aggiornare il presente registro e la nota del task secondo la guida documentale.
