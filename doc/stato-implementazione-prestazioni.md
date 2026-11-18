# Stato di implementazione delle prestazioni

Aggiornamento del 17 novembre 2026. Questo file contiene lo stato corrente e la sola consegna attiva. Requisiti e frequenza dei controlli sono nel [piano](piano-implementazione-prestazioni.md), regole di lettura e aggiornamento nella [guida documentale](guida-documentazione.md).

## Stato corrente

- P00–P16 e UI01–UI03 completati. UI03 verificata sulla build Electron, schema v16 invariato, implementazione `2e24749`, base `c1ee663`. [Nota UI03](ui03/revisione-flussi-operativi.md). P16 e revisione tecnica post-P16 restano verificati; [nota e revisione](p16/ciclo-vita-prestazioni.md#revisione-tecnica-post-p16).
- M1 chiusa sul pacchetto Windows dello schema v9. **M2 chiusa** sull’integrazione P13, schema v14, secondo il piano §7.3. [Evidenze](p13/verifiche.md#verifiche-m2).
- Revisioni tecniche dopo P12 e P16 completate. **M3 chiusa** sull’integrazione UI03, schema v16: backend completo, 39/39 percorsi desktop su build e 39/39 sul medesimo eseguibile Windows x64; migrazioni cumulative e trasferibilità verificate. [Nota M3](m3/chiusura.md). Prossimo passo funzionale: **P17A — Consuntivare operazioni con replay**. P17–P20 restano da avviare.
- Preparazione tecnica prima di P17A: **V01–V03 e rifinitura dell’output compatto completati e verificati**; prossimo passo **P17A**, usando il coordinatore come riscontro operativo. Risultati, prove e passaggio operativo nella [consegna corrente del piano di automazione](piano-automazione-verifiche.md#consegna-corrente). V04–V07 saranno rivalutati dopo il primo utilizzo.

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
| P17A | Da avviare | —                            | Scheda nel piano                                                                                             |
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

## Consegna corrente — M3

**M3 chiusa e verificata sulla build integrata UI03 e sul medesimo eseguibile Windows x64, schema v16 invariato.** Base `4132d39`, branch `main` inizialmente pulito; test M3 nel commit `fa9b912`. Riusata la build conclusiva UI03 e le sue 13 schermate, con impronte coincidenti; nessuna modifica applicativa o nuova migrazione. Estesa e rinominata la prova cumulativa a tutte le origini v1–v15 e al v16 corrente, con dati rappresentativi, UUID, letture IPC FREE/CATALOG, importi esatti, soggetti, riferimenti, metadati, integrità, FK, copie preventive, backup e Salva con nome. Tutte le copie trasferite sono riaperte in un secondo processo con percorso e preferenze differenti sullo stesso Windows.

**Verifiche concluse:** backend **296/296**; **39/39 percorsi desktop distinti sulla build**, con riuso dei 38 esiti riusciti della suite completa e ripetizione integrale di Archivi aggiornato e cumulativo rafforzato (**2/2**); **39/39 sul medesimo eseguibile confezionato**. TypeScript ed ESLint passati; check con sola uscita 1 per i cinque avvisi Prettier legacy `00`–`04`. File modificati formattati, UTF-8, collegamenti e differenze Git verificati. Confrontati i cinque file applicativi estratti dall’ASAR e ricontrollati invariati i 138 file della distribuzione prima/dopo i test. Nessun difetto applicativo o di integrità emerso nel perimetro verificato. [Nota M3, copertura e manifest](m3/chiusura.md).

**Passaggio operativo a P17A — Consuntivare operazioni con replay**, ancora da avviare dopo V01–V03: usare il nuovo flusso di verifica secondo il [passaggio V03](piano-automazione-verifiche.md#consegna-corrente). Per il dominio: simulazione della sequenza, confronto e conferma atomica con permanenze, prestazioni, soggetti e componenti economiche coerenti. Punti d’integrazione e limiti nella [nota M3](m3/chiusura.md#limiti-e-passaggio-a-p17a). Nessuna sessione manuale umana o seconda macchina fisica; prova automatizzata fra processi e percorsi sul Windows disponibile. Installer e installazione restano a P20, accessibilità estesa e ulteriori DPI a UI04/P20. Prossima suite integrata completa a M4, salvo trigger anticipati del piano §7.3.

## Limiti aperti

I cinque avvisi Prettier legacy `00`–`04` sono risolti in [V03](v03/adozione-documentale.md); gli esiti storici, inclusa la consegna M3 sopra, conservano le uscite effettivamente ottenute.

- Prove desktop automatizzate e ispezioni dell'agente. M1–M3 provano trasferibilità fra processi e percorsi sullo stesso Windows, senza seconda macchina fisica. Accessibilità estesa, ulteriori DPI e installazione seguono i checkpoint previsti.
- I dettagli di ambiente, prove e limiti specifici appartengono alle note collegate. I difetti ancora aperti vanno aggiunti qui con impatto concreto.

## Storico

Le consegne precedenti, compresi gli esiti intermedi e i prossimi task dell'epoca, sono conservate nell'[archivio P01–P09/UI/M1](archivio/storico-implementazione-p01-p09.md). Consultare lo storico quando necessario per audit o diagnosi. Per le nuove consegne aggiornare il presente registro e la nota del task secondo la guida documentale.
