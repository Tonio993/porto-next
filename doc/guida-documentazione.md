# Lettura e manutenzione della documentazione

Questa guida limita le letture alle informazioni necessarie al task e assegna a ogni documento un contenuto preciso. Le regole di implementazione restano in [AGENTS](../AGENTS.md), quelle funzionali nel [piano](piano-implementazione-prestazioni.md) e nelle [decisioni P00](p00/decisioni-iniziali.md).

## Percorso di lettura

1. Leggere il [registro corrente](stato-implementazione-prestazioni.md), poi la sola scheda del task nel piano e le sezioni pertinenti indicate sotto.
2. Leggere il passaggio operativo della dipendenza immediata e individuare nel codice contratti, servizi, repository e test coinvolti.
3. Approfondire decisioni, scenari o note precedenti quando una regola, un chiamante o una dipendenza lo richiede. Cercare nel legacy i codici di caso d'uso e i paragrafi pertinenti.
4. Consultare il piano §7.3 per selezionare i controlli e motivare le regressioni. Riutilizzare i contenuti già disponibili nella conversazione finché restano attuali.

Usare titoli e ricerche mirate per estrarre sezioni. I collegamenti indicano fonti da consultare secondo l'argomento. Le cronologie delle prove e i manifest servono durante audit, diagnosi e verifica degli artefatti.

| Argomento del task             | Sezioni e riferimenti da consultare                                                 |
| ------------------------------ | ----------------------------------------------------------------------------------- |
| Sessioni, file, IPC, anteprime | Piano §§3.1–3.4, P00 D04 e nota P01/P04 pertinente.                                 |
| Migrazioni e persistenza       | Piano §3.3, runner/schema e prove della versione precedente.                        |
| Numeri e tempo                 | P00 D02/D03, nota P02 e adattatori esistenti.                                       |
| Anagrafiche                    | Piano §2.1, P00 D01 e nota della tipologia coinvolta.                               |
| Catalogo e pesi                | Piano §2.4, nota P08 e successiva nota P19 quando disponibile.                      |
| Tariffe e calcolo              | Piano §2.4, sezioni operative P09 e scenari TAR pertinenti.                         |
| Operazioni e permanenze        | Piano §2.2, nota operativa più recente, contratti e scenari di sequenza pertinenti. |
| Soggetti e prestazioni         | Piano §2.3, P00 R01 e sezioni delle slice applicabili.                              |
| Interfaccia                    | Piano §3.5 e convenzioni dell'ultima revisione UI disponibile.                      |
| Chiusura di milestone          | Piano §§1.3, 6 e 7.3, con le evidenze pertinenti al traguardo.                      |

## Responsabilità dei documenti

| Documento                       | Contenuto da mantenere                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------ |
| AGENTS                          | Regole operative stabili e percorso di lettura.                                                  |
| Piano                           | Requisiti, perimetro, dipendenze, accettazione e matrice autorevole dei controlli.               |
| Registro                        | Stato corrente, righe dei task/UI/milestone, problemi aperti e sola consegna corrente.           |
| Nota del task                   | Decisioni nuove, contratti/punti d'integrazione, verifiche finali, limiti e passaggio operativo. |
| README                          | Avvio, uso, capacità disponibili e comandi, con rinvio al registro per lo stato delle consegne.  |
| Allegati di verifica e archivio | Manifest, diagnostiche e resoconti storici necessari alla tracciabilità.                         |

## Aggiornamento a fine task

- Aggiornare in posto il task e la consegna corrente del registro. Collegare la nota con i dettagli. Mantenere distinta la verifica sulla build da quella sul pacchetto e indicare il traguardo destinatario delle prove ancora pianificate.
- Quando cambia il task corrente, conservare il suo passaggio utile nella nota corrispondente. Lo [storico importato](archivio/storico-implementazione-p01-p09.md) rimane consultabile per le consegne anteriori a questa organizzazione.
- Scrivere nella nota soltanto le decisioni e le integrazioni specifiche. Collegare invarianti, regole numeriche/temporali, protocollo delle anteprime e convenzioni UI già documentati. Descrivere una scelta comune nuova nella sua fonte autorevole.
- Registrare una sintesi degli esiti finali, indicando revisione/build, prove eseguite, copertura, selezione e riuso. Spostare log, impronte complete e analisi diagnostiche negli allegati di verifica quando necessari, collegandoli dalla nota. Conservare nel repository le evidenze necessarie alla riproducibilità e alla chiusura delle milestone.
- Riportare i tentativi falliti quando spiegano un difetto aperto, una correzione rilevante o un limite delle prove. I dettagli dei tentativi risolti restano nei log. Riferire una volta i vincoli ambientali comuni e richiamarli nelle consegne interessate.
- Acquisire poche schermate significative. Collegare acquisizioni già valide e organizzare l'ispezione estesa nei checkpoint UI previsti. La matrice dei test rimane quella del piano §7.3.
- Aggiornare piano e README quando cambiano requisiti, dipendenze o uso. Tenere nel registro conteggi, avanzamento e prossimo task. Nei nuovi prompt indicare task, consegna attesa e attenzioni specifiche, richiamando AGENTS e le sezioni pertinenti.
- Verificare collegamenti, formattazione e differenze documentali. Rileggere le righe di stato e i rimandi modificati per evitare indicazioni discordanti. La sintesi deve conservare precondizioni, invarianti, casi limite, contratti e decisioni necessari al successore.

### Struttura consigliata per una nota

1. **Sintesi operativa** con risultato, schema e stato della verifica.
2. **Decisioni e integrazioni** con le novità e i file/API da usare nel task successivo.
3. **Verifiche finali** con comandi, esiti, build, selezione e prove rinviate alla milestone.
4. **Limiti e prossimo passo** con problemi aperti e punti d'attenzione.

Adattare il dettaglio alla complessità effettiva. Una nota resta completa quando il successore può riconoscere regole nuove, punti d'integrazione e prove disponibili senza ricostruire la cronologia della chat.
