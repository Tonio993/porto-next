# P14 — Prima prestazione libera

Implementazione `a554e27`, base `0beb74f`, branch `main` inizialmente pulito. Prove del 13 novembre 2026; commit del 16 novembre 2026. P14 completato e verificato sulla build Electron. Schema **v15**, migrazione `0015_free_services.sql`; script distribuiti v1–v14 invariati. Stato e verifica finali nel [registro](../stato-implementazione-prestazioni.md).

Riferimenti: [P00 D02/D03 e limiti](../p00/decisioni-iniziali.md), scenari CTX-01–07 e requisiti CU-PRE pertinenti; [P14 e regole delle prestazioni](../piano-implementazione-prestazioni.md#23-prestazioni-ordinarie), [passaggio P13](../p13/cliente-e-agenzia-effettivi.md#limiti-e-passaggio-a-p14), [controlli §7.3](../piano-implementazione-prestazioni.md#73-criteri-comuni-di-completamento).

## Decisioni e integrazioni

`ServiceActivity` è separata dalle operazioni nave. Il [contratto](../../src/shared/contracts/services.ts) e `window.services` espongono risoluzione del momento, registrazione FREE, elenco paginato per nave e dettaglio. La registrazione è un comando atomico sul contesto originale; non modifica elementi esistenti e non richiede un'anteprima di impatto. Validazione di forma, campi inattesi, stato, testi, riferimenti e importo rimane autorevole nel backend. La base positiva usa `Money` e centesimi int64; non consulta tariffe, pesi o catalogo.

Il [servizio](../../src/backend/application/services/service-service.ts) ricava i porti candidati dalla cronologia strutturale P13. Risolve il momento locale nel fuso di ciascun candidato, verifica la permanenza e richiede una scelta esplicita se più porti sono ammissibili. Anche l'overlap mantiene la scelta esplicita dell'offset; un porto o un offset scelto non possono forzare un contesto assente. MISSED ordinaria segue gli stessi vincoli delle altre prestazioni. L'ora non cambia automaticamente lo stato.

Il [risolutore di contesto](../../src/backend/domain/services/context.ts) usa gli intervalli della cronologia, con gli estremi inclusi secondo il piano: partenza all'origine, arrivo alla destinazione, nessuna prestazione in trasferimento. Ammette banchina assente e più prestazioni nel medesimo minuto. Il [repository](../../src/backend/infrastructure/database/service-repository.ts) persiste contesto completo, versioni applicabili al proprio istante e tupla locale/IANA/offset/UTC. Le FK composte verificano proprietari delle versioni e gerarchia viaggio/visita/ormeggio; i CHECK rafforzano categoria, stato, importo e completezza dei soggetti.

Il piano applicativo P13 comprende ora le prestazioni: risolve cliente e agenzia indipendentemente, con priorità prestazione → ormeggio → visita → viaggio. Conserva override espliciti, identità/versioni effettive e fonti in `service_activity_subjects`. Le assegnazioni e le variazioni cliente/agenzia includono effetti sulle prestazioni, anche quando cambia soltanto la fonte; i riferimenti storici rimangono validi e le nuove selezioni devono essere ammesse nella transazione.

Le variazioni di nave, porto e banchina includono le versioni delle prestazioni nelle anteprime e nell'applicazione atomica. L'eliminazione di una versione applica gli spostamenti dei riferimenti prima della cancellazione, anche per i chiamanti operativi preesistenti. La nuova operazione nave simula le prestazioni nella cronologia risultante: blocca quelle che perderebbero il contesto e riattribuisce le altre insieme all'operazione. Nessun aggiornamento modifica la base manuale o la tupla temporale della prestazione.

## Interfaccia

In **Prestazioni**, scegliere una nave e usare **Nuova prestazione libera**. L'editor riusa i selettori di soggetti e i controlli temporali esistenti; mostra il porto candidato quando serve disambiguare. Elenco e dettaglio espongono stato, base, momento, contesto e soggetti con fonti. La consultazione rimane scorribile alla misura minima. Riaprire la stessa riga avvia una nuova lettura del dettaglio, invalidando quella precedente. La regressione P13 ha inoltre evidenziato una risposta di anteprima tardiva visibile dopo il cambio revisione: l’editor delle assegnazioni ora nasconde l’anteprima quando la bozza è obsoleta, conservando i valori per il ricaricamento esplicito. Bozze e risposte asincrone seguono le convenzioni correnti: contesto originale, scarto dei risultati obsoleti, ricaricamento esplicito dopo conflitto, ripresa della bozza e ritorno del focus. Un esito di scrittura incerto richiede di controllare la consultazione prima di ripetere la registrazione.

## Verifiche finali

263/263 casi backend/SQLite su 28 file nel runtime Electron; 9 percorsi desktop pertinenti verificati, con riuso degli esiti non coinvolti dalle correzioni. Copertura: migrazione v14 popolato→v15, copia preventiva e rollback, numeri int64, confini e fusi, soggetti/versioni, aggiornamenti atomici, consultazione, bozze e asincronia. TypeScript, ESLint e build passati; il controllo globale Prettier restituisce errore soltanto per i cinque legacy noti. Schermate [editor minimo](schermate/p14-editor-minimo.png) e [dettaglio desktop](schermate/p14-dettaglio-desktop.png) ispezionate dall’agente. Prove automatizzate offline, nessuna sessione manuale umana.

L’[allegato](verifiche.md) conserva comandi, selezione, riuso e impronte della build. Nessun difetto di integrità noto nel perimetro verificato. Suite desktop completa, migrazioni cumulative e pacchetto sono pianificati a M3; nessun trigger anticipato di confezionamento in P14.

## Limiti e passaggio a P15

P15 aggiunge il percorso CATALOG nello stesso flusso di attribuzione: tipo selezionabile, tariffa e peso applicabili, spiegazione del calcolo e `CatalogRepository.markUsed` nella stessa transazione. Estendere la migrazione successiva e le invarianti di categoria senza trasformare una FREE già registrata in CATALOG. Estendere anche impatti tariffari, anagrafici e dei pesi dove previsto.

Modifica, eliminazione, consuntivazione e ricerca completa rimangono P16. Eliminare esplicitamente le righe possedute di `service_activity_subjects` prima della prestazione nella stessa transazione. Gli override diretti sono acquisiti alla creazione; la loro modifica sulla prestazione non è attivata nell'API di assegnazione P13. Revisione tecnica e UI03 seguono P16; suite desktop completa, migrazioni cumulative e pacchetto completo sono pianificati a M3, salvo trigger anticipati del piano. M2 rimane chiusa sulla precedente integrazione v14.
