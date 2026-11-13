# P13 — Cliente e agenzia effettivi

Data: 13 novembre 2026. Base effettiva `d99e18b`, branch `main`, copia iniziale pulita; P12 completato, schema v13. Implementazione nel commit `c2b2ff9`; documentazione ed evidenze nella consegna separata. Schema risultante **v14**, migrazione `0014_effective_subjects.sql`; script distribuiti v1–v13 invariati.

Stato: **P13 completato e verificato sulla build Electron; M2 chiusa sulla stessa integrazione e sul pacchetto Windows x64**. Le due chiusure sono registrate separatamente nel [registro](../stato-implementazione-prestazioni.md). Comandi, identificazione degli artefatti ed evidenze dettagliate nell’[allegato di verifica](verifiche.md).

Riferimenti: [piano §2.3 e P13](../piano-implementazione-prestazioni.md#p13--cliente-e-agenzia-effettivi), [matrice §7.3](../piano-implementazione-prestazioni.md#73-criteri-comuni-di-completamento), [passaggio P12](../p12/spostamento-tra-porti.md#limiti-e-passaggio-a-p13), [P00 R01.5](../p00/decisioni-iniziali.md#r01--perimetro-e-regole-confermate), [scenari SOG e CTX](../p00/scenari.mts), [UI02](../ui02/revisione-anagrafiche-e-catalogo.md#convenzioni-per-p09-e-slice-successive). Consultati anche requisiti §2.13/CU-SOG-01–06 e modello §3.12.10–14 nei documenti legacy. Nessun conflitto funzionale nuovo.

## Decisioni e integrazioni

### Assegnazioni e soggetti persistiti

Il [risolutore puro](../../src/backend/domain/operations/subjects.ts) cerca separatamente cliente e agenzia con priorità `VESSEL_OPERATION → BERTH_STAY → PORT_CALL → VOYAGE`. Null significa ereditarietà. Una modifica di un soggetto non azzera, copia o impone l’altro; un valore effettivo assente resta valido.

Viaggi, visite, ormeggi e operazioni conservano i soli ID espliciti `customer_id` e `agency_id`. La tabella posseduta `operation_charge_subjects` conserva per ogni componente le due identità effettive, versioni e fonti indipendenti, compreso l’ID del livello di provenienza. Le FK composte verificano il proprietario della versione; CHECK verificano completezza delle tuple e livelli ammessi. Le descrizioni sono lette dalle versioni applicate, con la stessa semantica delle altre anagrafiche storiche. La versione è quella valida all’istante economico della componente; il valore riepilogato nell’editor di una permanenza si riferisce al suo inizio.

La migrazione aggiunge colonne e indici senza ricostruire il grafo operativo; per ogni componente precedente crea una riga con soggetti assenti. Conserva importi int64, calcoli, identità, tuple temporali e metadati. Runner `?raw`, `SCHEMA_VERSION` e schema Drizzle sono aggiornati insieme.

### Contesto economico e MISSED

La [cronologia pura per i soggetti](../../src/backend/domain/operations/subject-context.ts) simula le permanenze con le identità già ancorate alle aperture. Permette di determinare i soggetti delle nuove operazioni prima della scrittura e di individuare gli effetti sulle componenti MISSED esistenti quando si inserisce una nuova permanenza compatibile.

Entrata strutturale usa i livelli appena aperti; uscita usa quelli chiusi. Spostamento interno e EXIT/DEPARTURE esterna usano l’origine; ENTRY/ARRIVAL esterna usa la destinazione. Gli override diretti dell’operazione valgono per entrambe le componenti, soltanto per il soggetto specificato. Le coppie ereditate possono differire.

Un’entrata MISSED non ha permanenze da cui ereditare: usa gli eventuali override diretti. Uscita e partenza MISSED usano l’origine realmente richiesta. Per un arrivo MISSED si cercano livelli realmente presenti nel **porto economico**, all’istante di arrivo e nello **stesso viaggio dell’origine**; in loro assenza rimane il solo viaggio richiesto alla partenza. Non si usa l’ormeggio di origine come destinazione e non si crea una visita fittizia, nemmeno quando l’arrivo economico è successivo all’uscita strutturale. La query operativa durante un trasferimento esterno continua a restituire viaggio presente, visita e ormeggio assenti.

### Comandi, anteprime e anagrafiche

La [API specifica](../../src/shared/contracts/assignments.ts) espone `get`, `preview`, `previewEffects` e `confirm` attraverso `window.assignments`, preload e guardie IPC esistenti. Il [servizio](../../src/backend/application/operations/assignment-service.ts) ammette solo i quattro livelli e valida forma, ID e campi inattesi anche nelle invocazioni dirette. Le anteprime usano il namespace `SUBJECT_ASSIGNMENT` e il protocollo P00 D04, con contesto originale, pagina degli effetti, riesame in conferma e consumo dopo commit.

La selezionabilità viene verificata nella transazione per ogni nuovo riferimento o sostituzione. Un ID identico a quello già assegnato sullo stesso livello rimane mantenibile se disattivato, anche quando cambia l’altro soggetto. Dopo rimozione torna una nuova selezione e richiede riattivazione.

Il [piano applicativo dei soggetti](../../src/backend/application/operations/subject-resolution.ts) simula senza scritture assegnazioni, nuove operazioni e sequenze di versioni anagrafiche. Confronta identità, fonte, versione e descrizione; applica tutti gli aggiornamenti necessari nella transazione coordinata. Non modifica basi, override monetari o tuple operative. No-op e rollback conservano revisione e timestamp; una transazione effettiva li aggiorna una volta.

CustomerService e AgencyService includono nelle proprie anteprime gli effetti sulle componenti. Inserimenti e correzioni salvano prima la versione; l’eliminazione sposta prima i riferimenti ricalcolabili e poi elimina la versione. Le prenotazioni storiche restano quelle P06. L’eliminazione dell’identità considera le FK reali dei quattro livelli e delle componenti, anche quando un’assegnazione è mascherata da un override. Le FK esterne non gestite continuano a bloccare le modifiche.

### Interfaccia

In **Operazioni nave**, il dettaglio espone l’assegnazione diretta; **Permanenze** espone i comandi di viaggio, visita e ormeggio. L’editor mostra valori espliciti, riepiloghi effettivi e fonti; le operazioni mostrano ogni componente separatamente. La ricerca pagina i soggetti selezionabili e mantiene visibile un riferimento storico già assegnato. Il pulsante di rimozione ha etichetta accessibile ed è raggiungibile da tastiera.

Bozza e anteprima conservano il contesto originale. Chiudere conserva la bozza; **Riprendi assegnazione** la riapre. Dopo conflitto si richiede **Ricarica assegnazioni**. Le risposte tardive vengono scartate per richiesta, editor, revisione o sessione; Salva con nome ricrea il workspace. Escape e ritorno del focus seguono UI02. L’assegnazione non permette modifiche strutturali delle permanenze.

## Verifiche finali

**P13:** 236/236 casi backend/SQLite su 26 file nel runtime Electron, migrazione v13 popolato→v14 con copia e rollback, due percorsi desktop funzionale e asincrono verificati sulla build integrata. TypeScript, ESLint e build passati; Prettier conserva solo i cinque avvisi legacy noti. Due schermate ispezionate alle dimensioni native minima e desktop. Il percorso funzionale è stato ripetuto dopo una correzione del solo cleanup del test; la build è invariata.

**M2 chiusa:** tutti i 27 percorsi desktop verificati sulla build integrata e tutti i 27 sul medesimo eseguibile Windows x64. Ogni serie riusa i 26 esiti validi dell’esecuzione completa e la ripetizione integrale P13 dopo una correzione del solo helper: cleanup sulla build, acquisizione delle schermate della finestra nascosta nel pacchetto. Migrazioni cumulative v1–v13→v14, trasferibilità e riapertura con nuove preferenze verificate in entrambe le distribuzioni. Main, preload e risorse estratti da ASAR coincidono con la build; impronte di build, eseguibile, ASAR e driver nativo invariate a fine prove. Nessuna ricompilazione fra le serie o durante il confezionamento.

L’[allegato](verifiche.md) conserva dettagli, impronte, copertura e riuso degli esiti secondo §7.3. Non sono noti difetti di integrità aperti nel perimetro verificato. Prove automatizzate offline, nessuna sessione manuale umana. La prossima verifica integrata completa è M3 dopo P16 e UI03.

## Limiti e passaggio a P14

**P14 — Prima prestazione libera** parte da schema v14 e dai contratti operativi `charges[]`. Aggiungere il percorso FREE mantenendo separate `ServiceActivity` e `VesselOperation`: descrizione propria, base manuale strettamente positiva, nessuna tariffa richiesta dalla prestazione libera. Le tariffe necessarie alle operazioni strutturali rimangono obbligatorie.

Riutilizzare la risoluzione indipendente estendendone il livello diretto alla prestazione ordinaria, con contesto completo al proprio istante, versioni applicabili e persistenza atomica. La cronologia per i soggetti MISSED delle operazioni non autorizza una prestazione ordinaria senza viaggio, visita o ormeggio: seguire i confini della query operativa e vietare il trasferimento. Risolvere prima il porto competente e poi il momento locale; un porto scelto non può forzare una permanenza inesistente.

Integrare subito le prestazioni nelle anteprime e nei blocchi/ricalcoli dei comandi già disponibili, comprese assegnazioni, clienti, agenzie, navi, porti e banchine. Estendere il piano applicativo dei soggetti con effetti sulle nuove attività. La tabella `operation_charge_subjects` è posseduta dalla componente: le future eliminazioni P17 dovranno cancellarne esplicitamente le righe prima delle componenti nella stessa transazione, senza CASCADE impliciti.

Fatture, regole economiche dipendenti dai soggetti, consuntivazione e trasformazioni strutturali restano fuori dal perimetro P13. La prossima revisione tecnica è dopo P16; UI03 accompagna la chiusura M3. Le prove sono automatizzate e offline con ispezione dell’agente, senza sessione manuale umana. La trasferibilità è verificata fra processi, preferenze e percorsi dello stesso Windows; non è una prova su una seconda macchina fisica.
