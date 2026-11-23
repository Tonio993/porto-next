# Stato di implementazione delle prestazioni

Aggiornamento del 23 novembre 2026. Questo file contiene lo stato corrente e la sola consegna attiva. Requisiti e frequenza dei controlli sono nel [piano](piano-implementazione-prestazioni.md), regole di lettura e aggiornamento nella [guida documentale](guida-documentazione.md).

## Stato corrente

- **PR02 implementato, unità proprie verificate; limite nella suite globale; desktop/integrate differiti alla chiusura PR01–PR12**: [nota PR02](pr02/bozze-ed-esiti-incerti.md), schema v17 invariato. PR01 e le sue [evidenze](pr01/feedback-eliminazione.md) preservati. Prossimo passo PR11. Analisi PR00 completata: [piano PR01–PR12](dev/piano-interventi-post-rilascio.md), copertura 21/21 e otto analoghi. Nuovo ciclo; chiusure P20/UI04/M5 preservate.
- P00–P16, P17A e UI01–UI03 completati. UI03 verificata sulla build Electron, schema v16 invariato, implementazione `2e24749`, base `c1ee663`. [Nota UI03](ui03/revisione-flussi-operativi.md). P16 e revisione tecnica post-P16 restano verificati; [nota e revisione](p16/ciclo-vita-prestazioni.md#revisione-tecnica-post-p16).
- M1 chiusa sul pacchetto Windows dello schema v9. **M2 chiusa** sull’integrazione P13, schema v14, secondo il piano §7.3. [Evidenze](p13/verifiche.md#verifiche-m2).
- Revisioni tecniche dopo P12 e P16 completate. **M3 chiusa** sull’integrazione UI03, schema v16; [storico M3](m3/chiusura.md) preservato. **M4 chiusa** sull’integrazione P17A–P19, schema v17, implementazione `6282ccd`; [consegna M4](m4/chiusura.md) preservata. **P20 e UI04 completati, M5 chiusa**, versione 0.1.0/schema v17, con pacchetto e installer Windows verificati. [Consegna P20](p20/revisione-e-rilascio.md). Restano firma e collaudo d’installazione nell’ambiente di destinazione.
- **V01–V03 e rifinitura dell’output compatto completati e verificati**. Riscontro operativo P17A raccolto nel [manifest e nella nota](p17a/consuntivazione-operazioni.md#riscontro-operativo-del-coordinatore), distinguendo chiamate/output letti dai token. V04–V07 da rivalutare secondo la [consegna del piano di automazione](piano-automazione-verifiche.md#consegna-corrente).

## Avanzamento

| Task | Stato                                                                                        | Revisione di implementazione | Nota operativa                                                                                               |
| ---- | -------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| P00  | Completato                                                                                   | Commit di introduzione P00   | [Decisioni](p00/decisioni-iniziali.md)                                                                       |
| P01  | Completato                                                                                   | `f9b3dbb`                    | [Contesto applicativo](p01/contesto-applicativo.md)                                                          |
| P02  | Completato                                                                                   | `4235f71`                    | [Numeri e tempo](p02/numeri-e-tempo.md)                                                                      |
| P03  | Completato                                                                                   | `5a6fa8c`                    | [Creazione e consultazione porti](p03/porti.md)                                                              |
| P04  | Completato                                                                                   | `0be600d`                    | [Versioni e ciclo di vita porto](p04/versioni-e-ciclo-di-vita.md)                                            |
| P05  | Completato                                                                                   | `f966ba8`                    | [Banchine](p05/banchine.md)                                                                                  |
| P06  | Completato                                                                                   | `ef6e257`                    | [Clienti e agenzie](p06/clienti-e-agenzie.md)                                                                |
| P07  | Completato                                                                                   | `856bcbc`                    | [Navi](p07/navi.md)                                                                                          |
| P08  | Completato                                                                                   | `0e7fc36`                    | [Catalogo e pesi iniziali](p08/catalogo-e-pesi-iniziali.md)                                                  |
| P09  | Completato                                                                                   | `1b2f4a5`                    | [Tariffe e calcolatore base](p09/tariffe-e-calcolatore-base.md)                                              |
| P10  | Completato                                                                                   | `3a34501`                    | [Entrata, uscita e permanenze](p10/entrata-uscita-e-permanenze.md); verificato sulla build Electron.         |
| P11  | Completato                                                                                   | `8450b39`                    | [Spostamento interno](p11/spostamento-interno.md); verificato sulla build Electron.                          |
| P12  | Completato                                                                                   | `f07c859`                    | [Spostamento tra porti](p12/spostamento-tra-porti.md); verificato sulla build Electron.                      |
| P13  | Completato                                                                                   | `c2b2ff9`                    | [Cliente e agenzia effettivi](p13/cliente-e-agenzia-effettivi.md); build e pacchetto verificati, schema v14. |
| P14  | Completato                                                                                   | `a554e27`                    | [Prima prestazione libera](p14/prestazione-libera.md); build verificata, schema v15.                         |
| P15  | Completato                                                                                   | `97e4b8e`                    | [Prima prestazione da catalogo](p15/prestazione-catalogo.md); build verificata, schema v16.                  |
| P16  | Completato                                                                                   | `8c5f0e7`                    | [Ciclo di vita e revisione tecnica](p16/ciclo-vita-prestazioni.md); build verificata, schema v16.            |
| P17A | Completato                                                                                   | `292f81a`                    | [Consuntivazione con replay](p17a/consuntivazione-operazioni.md)                                             |
| P17B | Completato                                                                                   | `6282ccd`; verificato in M4  | [Inserimento retroattivo; verifica M4](p17b/inserimento-operazioni-retroattive.md)                           |
| P17C | Completato                                                                                   | `6282ccd`; verificato in M4  | [Correzione operazioni; verifica M4](p17c/correzione-operazioni.md)                                          |
| P17D | Completato                                                                                   | `6282ccd`; verificato in M4  | [Eliminazione operazioni e sole note; verifica M4](p17d/eliminazione-operazioni.md)                          |
| P18  | Completato                                                                                   | `6282ccd`; verificato in M4  | [Correzione ed eliminazione tariffe; verifica M4](p18/correzione-eliminazione-tariffe.md)                    |
| P19  | Completato                                                                                   | `6282ccd`; verificato in M4  | [Versioni dei pesi, schema v17; verifica M4](p19/versioni-dei-pesi.md)                                       |
| P20  | Completato                                                                                   | `01db2d5`; verificato in M5  | [Revisione e rilascio](p20/revisione-e-rilascio.md)                                                          |
| PR01 | Implementato; unità verificate; desktop/integrate differiti                                  | `3531d82`                    | [Feedback dopo eliminazione](pr01/feedback-eliminazione.md)                                                  |
| PR02 | Implementato; unità PR02 verificate; limite nella suite globale; desktop/integrate differiti | `eba1313`                    | [Bozze ed esiti incerti](pr02/bozze-ed-esiti-incerti.md)                                                     |

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

## Consegna corrente — PR02 / Bozze ed esiti incerti

**Implementato; unità PR02 verificate; limite nella suite globale; desktop/integrate differiti.** Base reale e HEAD iniziale `main / 7c664900d2f6a0d522826553fec336e380b4f01b`, working tree iniziale pulito, schema v17 invariato; implementazione `eba1313`, versionata su successiva richiesta esplicita dell’utente. Conferma di scarto con azione esplicita e guardia persistente su comandi/navigazione/selezioni/menu; recuperi specifici conservati e ricevute dei tentativi per i comandi privi di una verifica affidabile. Chiusure di dialoghi e messaggi non rimuovono l’incertezza. [Nota operativa, censimento, copertura e limiti](pr02/bozze-ed-esiti-incerti.md). PR01 resta nella [nota precedente](pr01/feedback-eliminazione.md); fonte originale `doc/dev/punti-issue.md` e analisi PR00 preservate.

**Deroga esplicita dell’utente del 23 novembre 2026 per PR01–PR12:** fra i task soltanto unit test TypeScript tramite npm test/Electron, con nuova copertura per ogni comportamento verificabile a quel livello, mantenendo controlli statici/documentali. Campagne complete, desktop, pacchetto e verifiche integrate differiti al checkpoint finale dopo tutte le modifiche della lista; K1–K3 diventano riesami della copertura. Al finale: check, backend/unitaria completa, SQLite/migrazioni pertinenti e desktop completo sulla build finale e sul medesimo pacchetto, includendo tutti i percorsi accumulati. [Frequenza e checkpoint aggiornati](dev/piano-interventi-post-rilascio.md#verifiche-degli-step-e-checkpoint); nessun esito storico modificato.

**Prossimo passo: PR11**, ordinamento delle permanenze in consultazione. Conferma, tastiera/focus, navigazione, menu File, risposte perse e cambio sessione hanno percorsi desktop preparati ma non eseguiti; campagne complete e pacchetto a K4. PR03 fuori perimetro. P20/UI04 restano completati e M5 chiusa: firma e installazione nell’ambiente di destinazione restano attività separate nella [consegna P20](p20/revisione-e-rilascio.md).

## Limiti aperti

I cinque avvisi Prettier legacy `00`–`04` sono risolti in [V03](v03/adozione-documentale.md); gli esiti storici, compresa la [nota M3](m3/chiusura.md), conservano le uscite effettivamente ottenute.

- Prove desktop automatizzate e ispezioni dell'agente. M1–M5 provano trasferibilità fra processi e percorsi sullo stesso Windows, senza seconda macchina fisica. UI04 verifica zoom renderer 125/150%, non DPI hardware; nessuna sessione manuale umana o prova con screen reader. Accessibilità estesa e altri hardware richiedono l’ambiente di destinazione.
- I dettagli di ambiente, prove e limiti specifici appartengono alle note collegate. I difetti ancora aperti vanno aggiunti qui con impatto concreto.

## Storico

Le consegne precedenti, compresi gli esiti intermedi e i prossimi task dell'epoca, sono conservate nell'[archivio P01–P09/UI/M1](archivio/storico-implementazione-p01-p09.md). Consultare lo storico quando necessario per audit o diagnosi. Per le nuove consegne aggiornare il presente registro e la nota del task secondo la guida documentale.
