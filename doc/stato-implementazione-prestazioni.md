# Stato di implementazione delle prestazioni

Aggiornamento del 12 novembre 2026. Questo file contiene lo stato corrente e la sola consegna attiva. Requisiti e frequenza dei controlli sono nel [piano](piano-implementazione-prestazioni.md), regole di lettura e aggiornamento nella [guida documentale](guida-documentazione.md).

## Stato corrente

- P00–P09, UI01 e UI02 completati. Schema corrente integrato v10. [Ultima consegna P09](p09/tariffe-e-calcolatore-base.md).
- M1 chiusa sul pacchetto Windows dello schema v9. La verifica integrata successiva è M2 dopo P13, secondo il piano §7.3.
- Prossimo task **P10 — Entrata, uscita e permanenze**. P10–P20 restano da avviare.

## Avanzamento

| Task | Stato      | Revisione di implementazione | Nota operativa                                                    |
| ---- | ---------- | ---------------------------- | ----------------------------------------------------------------- |
| P00  | Completato | Commit di introduzione P00   | [Decisioni](p00/decisioni-iniziali.md)                            |
| P01  | Completato | `f9b3dbb`                    | [Contesto applicativo](p01/contesto-applicativo.md)               |
| P02  | Completato | `4235f71`                    | [Numeri e tempo](p02/numeri-e-tempo.md)                           |
| P03  | Completato | `5a6fa8c`                    | [Creazione e consultazione porti](p03/porti.md)                   |
| P04  | Completato | `0be600d`                    | [Versioni e ciclo di vita porto](p04/versioni-e-ciclo-di-vita.md) |
| P05  | Completato | `f966ba8`                    | [Banchine](p05/banchine.md)                                       |
| P06  | Completato | `ef6e257`                    | [Clienti e agenzie](p06/clienti-e-agenzie.md)                     |
| P07  | Completato | `856bcbc`                    | [Navi](p07/navi.md)                                               |
| P08  | Completato | `0e7fc36`                    | [Catalogo e pesi iniziali](p08/catalogo-e-pesi-iniziali.md)       |
| P09  | Completato | `1b2f4a5`                    | [Tariffe e calcolatore base](p09/tariffe-e-calcolatore-base.md)   |
| P10  | Da avviare | —                            | Scheda nel piano                                                  |
| P11  | Da avviare | —                            | Scheda nel piano                                                  |
| P12  | Da avviare | —                            | Scheda nel piano                                                  |
| P13  | Da avviare | —                            | Scheda nel piano                                                  |
| P14  | Da avviare | —                            | Scheda nel piano                                                  |
| P15  | Da avviare | —                            | Scheda nel piano                                                  |
| P16  | Da avviare | —                            | Scheda nel piano                                                  |
| P17A | Da avviare | —                            | Scheda nel piano                                                  |
| P17B | Da avviare | —                            | Scheda nel piano                                                  |
| P17C | Da avviare | —                            | Scheda nel piano                                                  |
| P17D | Da avviare | —                            | Scheda nel piano                                                  |
| P18  | Da avviare | —                            | Scheda nel piano                                                  |
| P19  | Da avviare | —                            | Scheda nel piano                                                  |
| P20  | Da avviare | —                            | Scheda nel piano                                                  |

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

## Consegna corrente — P09

Tariffe e calcolatore base sono verificati sulla build Electron con schema v10. La [nota P09](p09/tariffe-e-calcolatore-base.md) conserva decisioni, API e prove finali: 169 test backend e sei percorsi desktop selezionati. Le verifiche complete del pacchetto sono pianificate per M2 dopo P13.

**Da conservare per P10.** Determinare porto e momento economici dal contesto reale e chiamare il calcolatore sincrono nella transazione della registrazione, dopo i controlli di selezionabilità. Persistire traccia e riferimenti, distinguendo base tariffaria, sostituzione manuale e base effettiva. Integrare subito analisi per intervallo e ricalcoli atomici delle nuove componenti nei comandi tariffari e anagrafici già disponibili.

**Attenzioni successive.** P15 aggiorna la prova monotona di utilizzo del catalogo nella transazione della prestazione. Correzione/eliminazione diretta delle tariffe restano P18, variazioni dei pesi P19.

## Limiti aperti

- Prettier globale segnala storicamente i cinque documenti legacy `00`–`04`; distinguere questi avvisi da nuove regressioni.
- Prove desktop automatizzate e ispezioni dell'agente. M1 prova trasferibilità fra processi e percorsi sullo stesso Windows, senza seconda macchina fisica. Accessibilità estesa, ulteriori DPI e installazione seguono i checkpoint previsti.
- I dettagli di ambiente, prove e limiti specifici appartengono alle note collegate. I difetti ancora aperti vanno aggiunti qui con impatto concreto.

## Storico

Le consegne precedenti, compresi gli esiti intermedi e i prossimi task dell'epoca, sono conservate nell'[archivio P01–P09/UI/M1](archivio/storico-implementazione-p01-p09.md). Consultare lo storico quando necessario per audit o diagnosi. Per le nuove consegne aggiornare il presente registro e la nota del task secondo la guida documentale.
