# P09 — Tariffe e calcolatore base

Data: 12 novembre 2026. Base effettiva `3710ecc`, branch `main`, copia iniziale pulita. Implementazione nel commit `1b2f4a5`. P00–P08/UI02 e M1 integrati. Schema v10, migrazione `0010_tariffs.sql`; gli script distribuiti restano invariati. Stato: **completato e verificato sulla build Electron**.

Riferimenti: [piano §§2.4, P09 e 7.3](../piano-implementazione-prestazioni.md), [registro](../stato-implementazione-prestazioni.md), [decisioni P00](../p00/decisioni-iniziali.md), [contratti P00](../p00/contratti.ts), [scenari TAR-01–04](../p00/scenari.mts), [P02](../p02/numeri-e-tempo.md), [P07](../p07/navi.md), [P08](../p08/catalogo-e-pesi-iniziali.md), [UI02](../ui02/revisione-anagrafiche-e-catalogo.md). Legacy pertinente: dominio, tariffe e precisione; requisiti CU-TAR-01/02/05/06/09 e momenti economici; modello, identità delle copie e §3.12.11–12. Il modello legacy rinvia la struttura fisica tariffaria: P09 introduce soltanto le tabelle necessarie, senza anticipare fatture o attività.

## Percorso e decisioni

**Catalogo e tariffe → Tariffe** espone scelta/ricerca del porto, elenco paginato cronologico, intervalli derivati, dettaglio completo, creazione e copia. Il porto scelto è immutabile nella bozza. La copia può provenire anche da un altro porto, duplica soltanto i valori e assegna nuovi UUIDv4 a tariffa, configurazioni e scaglioni; non salva riferimenti alla sorgente. Porti disattivati restano consultabili e utilizzabili come sorgente, ma non ricevono nuove tariffe.

Ogni tariffa contiene esattamente STANDARD, PASSENGER e ADM, ciascuna con almeno uno scaglione ordinario, limiti interi non negativi strettamente crescenti e univoci, ampiezza extra intera positiva e valori decimali non negativi. Limiti e ampiezze arrivano a `9007199254740991`; valori tariffari e pesi rispettano le 256 cifre P00, senza scala frazionaria arbitraria. Limite tecnico di richiesta: massimo 1000 scaglioni per configurazione, respinti senza troncamento; la UI consente di aggiungerli e rimuoverli.

La decorrenza obbligatoria viene risolta nel **fuso del porto**, indipendente dalla conferma del fuso aziendale. Sono conservati locale, IANA, offset completo e UTC. Gap e offset estranei sono respinti; overlap richiede scelta esplicita. Le tariffe sono uniche per porto/UTC, con inizio incluso e fine esclusa determinata dalla tariffa successiva. Inserimenti passati, intermedi e futuri non modificano le decorrenze già salvate. Prima della prima tariffa il calcolatore restituisce `TARIFF_NOT_FOUND`.

Tutte le creazioni passano da anteprima e conferma nel namespace `TARIFF_CREATE`. L’anteprima mostra creazione, eventuale restringimento dell’intervallo precedente e configurazioni complete da salvare. Riusa scadenza, limite, paginazione, controllo sessione/revisione e consumo dopo commit di `PreviewStore`. La conferma ripete analisi e selezionabilità; tutte le configurazioni, scaglioni e metadati vengono scritti nella medesima transazione.

## Calcolo e riuso operativo

[calculateBracket](../../src/backend/domain/tariffs/base-calculator.ts) è puro; usa `decimal.js` con precisione isolata 1024 e le primitive P02. Gli extra sono `(eccedenza + ampiezza - 1) / ampiezza` in `BigInt`; non si divide in floating point. Il limite ordinario è incluso, anche zero. Si sommano esattamente valore ordinario e prodotto degli extra, si arrotonda il **valore tariffario risultante** a due decimali con HALF_UP, poi si applica il peso e si arrotonda la base. Non si arrotondano preventivamente i valori unitari. Entrambi i risultati monetari devono rientrare nell’int64 non negativo, anche quando un peso piccolo riporterebbe la base entro il limite.

Il servizio applicativo sincrono [calculateBase](../../src/backend/application/tariffs/calculate-base.ts) seleziona tariffa, versione nave storica, configurazione, scaglione e peso al momento economico. In P09 esistono soltanto pesi iniziali senza decorrenza; P19 estenderà la risoluzione ai pesi datati. La traccia comprende porto, momento completo, nave/versione, tipo/dimensione, tariffa/configurazione/scaglione, sequenza/versione peso, operandi, extra, risultati e passaggi leggibili. I risultati EUR sono stringhe a due decimali; fattori e valori unitari restano stringhe canoniche.

`TariffApi.simulateBase` è una query di sola lettura: nessuna attività, utilizzo monotono del catalogo, revisione o timestamp viene registrato. Consente consultazione storica anche di entità oggi disattivate. P10 e P15 devono chiamare il calcolatore **dentro la transazione dell’attività**, dopo i controlli di selezionabilità, e persisterne riferimenti e valori monetari come centesimi bigint attraverso gli adattatori P02. Il momento e il porto economici devono derivare dal contesto operativo, senza affidarsi alla simulazione del renderer. P10 mantiene separata la base tariffaria dall’eventuale sostituzione manuale della componente.

## Persistenza, riferimenti e interfaccia

[TariffApi](../../src/shared/contracts/tariffs.ts), [TariffService](../../src/backend/application/tariffs/tariff-service.ts) e [TariffRepository](../../src/backend/infrastructure/database/tariff-repository.ts) sono specifici e tipizzati. Main, guardie IPC e preload completano il percorso; nessun SQL o canale generico esposto al renderer. Validazione runtime di forma/campi inattesi, UUID, pagine, momento, tre configurazioni, interi e decimali nel backend.

`tariffs`, `tariff_configurations` e `tariff_brackets` hanno FK reali, unicità per porto/decorrenza, tariffa/tipo e configurazione/limite, CHECK su interi e decimali canonici TEXT. La completezza dell’aggregato è validata autorevolmente prima della transazione e controllata in lettura. Nessun importo usa REAL. Le tariffe non possiedono stato di attivazione né versioni iniziali senza decorrenza.

L’ispettore FK esistente include subito le tariffe nelle eliminazioni dei porti. Disattivazione e correzioni descrittive conservano le tariffe. [tariff-impacts](../../src/backend/application/tariffs/tariff-impacts.ts) controlla riferimenti esterni reali verso tariffa precedente, configurazioni e scaglioni, comprese FK composte/CASCADE, e li riesamina alla conferma. Non esistono ancora attività di prodotto da ricalcolare: gli eventuali riferimenti esterni sconosciuti bloccano conservativamente l’inserimento interessato. **P10 deve integrare qui l’analisi degli intervalli realmente utilizzati e il ricalcolo atomico delle componenti**, sostituendo il blocco conservativo per le dipendenze conosciute. Nessun motore dinamico o tabella operativa fittizia introdotto.

La UI riusa richieste con ambiti indipendenti, paginazione, messaggi, conferma ed elenco/dettaglio UI02. Le tre configurazioni hanno schede dedicate; la copia conserva il porto della bozza. Bozze e anteprime mantengono la revisione originale, con ricaricamento esplicito dopo conflitto. Cambio input/selezione/editor e smontaggio invalidano le risposte pertinenti. Salva con nome ricrea il workspace sulla nuova sessione. Il passaggio futuro → corrente rilegge senza scritture o modifica della revisione della bozza. Il simulatore segnala i risultati divenuti obsoleti. Focus iniziale, ritorno al comando d’origine e Escape sono verificati nei percorsi desktop.

## Verifiche effettive

- `npm test`: **169 test su 20 file passati**, 10,06 s, runtime Node di Electron e SQLite reale. Comprende TAR-01–04, confini degli scaglioni, zero, extra esatti al limite MAX_SAFE_INTEGER, precisione 256 cifre, arrotondamenti, overflow, configurazioni invalide, copia autonoma fra porti e selezione storica della nave. Verificati rollback dopo scritture parziali e metadati, anteprime riutilizzabili dopo rollback, revisioni/sessioni/namespace, FK reali e guardie su tutti gli otto canali Tariffe.
- Migrazione v9 popolata → v10: confronto di tutte le righe/metadati preesistenti, pesi con decimali estesi e utilizzo monotono conservati, copia preventiva ancora v9 e FK integre. Ostacolo sull’ultima tabella verifica rollback dopo DDL parziale e conservazione della sessione precedente. Aggiornate le attese delle prove precedenti alla nuova versione dello schema.
- `npm run check`: TypeScript ed ESLint passati; Prettier globale segnala soltanto i cinque documenti legacy `00`–`04` preesistenti. File P09 formattati separatamente.
- `npm run build`: riuscita. Main, preload e renderer comprendono la migrazione importata con `?raw`, senza cambiare il meccanismo di caricamento. I percorsi P09 riusano la build finale; gli esiti delle quattro regressioni non coinvolte dalle ultime correzioni locali vengono conservati secondo §7.3.

**Sei percorsi desktop selezionati passati in 9,9 minuti**: `tariffs.spec.ts`, `tariffs-async.spec.ts`, `catalog.spec.ts`, `catalog-async.spec.ts`, `port-lifecycle.spec.ts` e `vessels.spec.ts`. La selezione comprende catalogo/navigazione modificata, conferme, riferimenti ai porti, risoluzione storica Navi, copie, sessioni e revisioni. Hook e coordinatore condivisi non sono stati modificati.

Il percorso funzionale P09 apre e migra v9 conservando revisione e backup; compila le tre configurazioni, verifica gap/overlap nel fuso del porto, bozze e anteprime obsolete, focus, copia da tariffa corrente/futura e inserimento intermedio, assenza di tariffa, esempio `172,50 EUR`, traccia e identificativi, copia da altro porto/fuso, Salva con nome e riapertura. Misura nativa minima 960 × 700 con notifica aperta, almeno 100 pixel utili per le righe e nessun overflow orizzontale; apertura anche a 1440 × 900. Nessun errore JavaScript rilevato. Il percorso asincrono trattiene risposte reali di dettaglio, elenco, risoluzione e calcolo, le rilascia dopo cambio selezione/input/editor/sessione e verifica futuro → corrente con orologi isolati senza scritture o modifica della bozza.

La revisione mantiene visibili le selezioni di porto, nave e tipo durante la ricerca e allinea i nomi degli indici univoci SQL allo schema Drizzle, senza cambiare le regole di unicità. Ricostruita la build dopo queste correzioni circoscritte; ripetizione dei due percorsi P09 sulla build finale: **2 su 2 passati in 3,1 minuti**, senza ulteriori modifiche applicative. Le quattro regressioni restano valide: nessuna modifica successiva ai loro flussi o alle primitive condivise.

Build finale del commit `1b2f4a5`:

- main SHA256 `14f9acd198061d2a3620e53d272f71147bc708541c42a396dcce61f66fab494c`;
- preload SHA256 `fdc9f8bf75fa0c5abc03d4e7be1247bd2def19b9b28079e80b857b86c9a01d97`;
- renderer `index-CXTQJiue.js`, SHA256 `3e0e7be7b34ca3b4fd43cd15ed63502ffc13b51c2938ab28f6722ee114fc62fd`;
- CSS `index-Vj1E9UYy.css`, SHA256 `15f8ce2c4e775da516b8970a556ac7c4173488c9d6d6d54a522220556145bb6b`.

Manifest locali `.local/p09-build-sha256.json` e `.local/p09-regression-build-sha256.json`; log `.local/p09-check-final.log`, `p09-backend-final.log`, `p09-build-final.log`, `p09-desktop-final.log` e `p09-desktop-recheck.log`. Implementazione registrata nel commit `1b2f4a5`; documentazione e schermate in un commit di consegna separato.

Prove automatizzate Playwright, archivi/preferenze temporanei e renderer offline. Nessuna sessione manuale umana dichiarata. **Cinque schermate finali ispezionate** e conservate in [schermate](schermate/): [compilazione minima](schermate/compilazione-minimo.png), [dettaglio minimo con notifica](schermate/dettaglio-minimo.png), [anteprima intermedia](schermate/anteprima-intermedia.png), [calcolo minimo](schermate/calcolo-minimo.png), [dettaglio desktop](schermate/dettaglio-desktop.png). Confermati leggibilità dei valori, scorrimenti, spazio utile dell’elenco e azioni raggiungibili. Il primo tentativo nella sandbox dell’agente ha confermato il blocco ACL Windows già noto: ripetizioni con esecuzione autorizzata, senza modificare ACL o sandbox Electron. I selettori iniziali dei test sono stati corretti per l’asterisco dei campi obbligatori; nessun comportamento applicativo alterato da quelle correzioni. Il test temporale attende la chiusura completa del dialogo prima di fermare i timer.

Non sono noti difetti di integrità aperti nel perimetro P09. Restano gli avvisi documentali legacy preesistenti. Differenze Git, formattazione dei file modificati e collegamenti locali verificati.

## Limiti e passaggio a P10

Correzione/eliminazione diretta delle tariffe restano **P18**; variazioni dei pesi **P19**. Nessuna registrazione operativa, fattura, consolidamento o sostituzione manuale anticipata. Il simulatore non verifica una futura sequenza operativa.

Prossimo task **P10 — Entrata, uscita e permanenze**: integrare P05/P07/P08/P09, determinare porto e momento economico dagli estremi, richiedere tariffa reale anche per MISSED, selezionabilità nella stessa transazione, tracce e importi esatti persistiti, ricalcoli tariffari e nuovi riferimenti nei comandi già disponibili. Il catalogo aggiornerà l’utilizzo monotono con P15.

Secondo §7.3, suite desktop completa, migrazioni cumulative, trasferibilità e pacchetto Windows integrato restano pianificati per **M2 dopo P13**. P09 non cambia dipendenze, runtime, packaging o meccanismo di caricamento delle risorse: nessuna eccezione richiede la prova anticipata del pacchetto. Il pacchetto M1 resta una prova storica dello schema v9. Installer e installazione sono P20.
