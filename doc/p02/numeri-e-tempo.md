# P02 — Numeri esatti e tempo

Data: 10 novembre 2026. Base integrata: `c17d6f5` (consegna P01). Implementazione P02: commit `4235f71`.

Riferimenti: [piano](../piano-implementazione-prestazioni.md), [decisioni D02–D04](../p00/decisioni-iniziali.md), [contesto P01](../p01/contesto-applicativo.md), [registro](../stato-implementazione-prestazioni.md).

## Numeri e confini

`src/backend/domain/values/numbers.ts` adotta `decimal.js` 10.6.0 con costruttore isolato, precisione 1024 e `ROUND_HALF_UP`. Gli operandi decimali non negativi ammettono al massimo 256 cifre totali, senza esponenti, separatori delle migliaia o conversioni tramite `number`. `decimalText` produce la forma canonica; `positiveDecimal` aggiunge il vincolo strettamente positivo per i futuri pesi.

`Money` rappresenta EUR non negativi con centesimi `bigint`, massimo int64 `9223372036854775807`. `Money.parse` accetta soltanto testo canonico con due decimali e non arrotonda gli input manuali. `multiplyToMoney` e `Money.multiply` arrotondano ciascun passaggio monetario e controllano l'overflow prima della conversione nei centesimi. I vincoli specifici restano ai chiamanti: P14 richiederà una base libera positiva, mentre tariffa e sostituzione operativa possono essere zero.

I DTO adottati da P00 sono in `src/shared/contracts/values.ts`: denaro e fattori viaggiano come stringhe. I centesimi SQLite si scrivono come `bigint` e si leggono mediante `CAST(... AS TEXT)` o letture `bigint` circoscritte, senza cambiare globalmente il driver. `src/renderer/src/api/numeric-input.ts` normalizza esplicitamente gli input italiani e visualizza anche importi grandi con operazioni sulle stringhe. Più di due decimali su un importo manuale vengono respinti. Gli editor economici arriveranno nelle rispettive slice; P02 non introduce il calcolatore tariffario.

## Momenti e conservazione

`src/backend/domain/values/moments.ts` importa esplicitamente `@js-temporal/polyfill` 0.5.1. Le date accettate hanno calendario ISO, anni `0001`–`9999` e formato esatto `YYYY-MM-DDTHH:mm`. Secondi, frazioni, UTC inseriti dal client e date corrette automaticamente vengono respinti.

Il backend valuta `earlier` e `later`, conserva solo le occorrenze che ritornano allo stesso locale e le ordina per UTC. Un gap produce `LOCAL_TIME_NOT_EXISTENT`; un overlap restituisce `CHOICE_REQUIRED` con le occorrenze e richiede una nuova risoluzione con `selectedOffset`. Un offset estraneo produce `INVALID_OFFSET`. I fusi devono essere nomi IANA validi; un offset numerico non li sostituisce.

Il risultato conserva locale originale, `zoneId`, offset completo e UTC ISO con millisecondi. Gli offset storici con secondi restano esatti. `moment-storage.ts` traduce la tupla in colonne SQL e la rilegge verificando la coerenza aritmetica tra locale, offset e UTC, senza risolverla nuovamente secondo le regole IANA correnti. La futura transazione dell'attività salverà anche la sua tupla: P02 non crea attività o tabelle operative fittizie.

## Configurazione per archivio e UI

Schema v3, migrazione `0003_company_time_zone.sql`. Le migrazioni `0001` e `0002` restano invariate. `company_time_zone` contiene una sola configurazione iniziale: fuso proposto `Europe/Rome`, decorrenza `NULL`, conferma inizialmente assente. Nuovi archivi e archivi v1/v2 ricevono la configurazione, conservando ID, revisione e timestamp preesistenti. Apertura e copia validano il fuso; un fallimento durante la migrazione conserva l'originale e la sessione precedente.

L'operatore conferma la proposta o sceglie un altro fuso IANA una sola volta. Il flag `confirmed` distingue la proposta dalla scelta iniziale, senza introdurre variazioni dei fusi. La risoluzione aziendale richiede la conferma. Ripetere la stessa conferma è un no-op; sostituire un fuso confermato viene respinto. La conferma effettiva passa da `coordinator.command`, incrementa una volta la revisione e aggiorna il timestamp nella stessa transazione.

`TimeService` usa il coordinatore P01 e costruisce il repository nella sessione corrente. I tre metodi IPC espongono lettura del fuso, conferma iniziale e risoluzione di un orario aziendale. Le query richiedono la sessione; il comando anche archivio e revisione. Mittente e frame sono controllati prima del servizio. Non si espongono SQL o risolutori delle attività con un `zoneId` arbitrario fornito dal client.

La sezione **Riferimenti temporali** richiede un archivio aperto e offre scelta iniziale e verifica di un orario senza registrare attività. Un'ora ambigua mostra prima e seconda occorrenza con offset. Il risultato mostra locale, fuso, offset e UTC. Cambio sessione e modifica dell'input invalidano i risultati asincroni; una conferma invalida le letture di configurazione precedenti. Il contesto della bozza è catturato alla lettura: un conflitto richiede **Ricarica configurazione**.

`initialPortTimeZone(companyZone, selectedZone)` predispone per P03 un valore autonomo senza decorrenza. Senza scelta propone il fuso aziendale; con scelta valida usa il fuso del nuovo porto. P03 persisterà questo valore nella transazione del porto. Le attività portuali dovranno determinare il fuso dal porto competente: `resolveCompanyMoment` resta limitato ai contesti aziendali.

## Verifiche e consegna

Le prove riutilizzano `NUM-01`–`NUM-05` e `TEM-01`–`TEM-04` di P00 e aggiungono formato, normalizzazione italiana, limiti, overflow e rollback SQLite, tuple storiche, fuso iniziale del porto, migrazioni v1/v2, copia preventiva e isolamento delle sessioni. I test IPC coprono tutti i nuovi canali. La compilazione dei test include gli scenari P00 e l'adattatore numerico UI; il codice applicativo non importa lo spike.

Percorso desktop automatizzato: archivio nuovo, rifiuto di un fuso numerico, conferma Roma, gap del 29 marzo 2026, due occorrenze del 25 ottobre 2026, copia e reset dell'input, richiesta della vecchia sessione respinta e riavvio con rilettura della configurazione. Il processo usa `TZ=America/New_York`, mantenendo i risultati di Roma, e il renderer lavora offline. Resta attivo il percorso di regressione archivi P01.

Gli esiti finali dei comandi e del pacchetto sono nel registro. Il percorso desktop è automatizzato; non costituisce una sessione manuale umana. Attività portuali, persistenza delle loro tuple ed editor economici restano nelle rispettive slice.

Prossimo task: **P03**, creazione e consultazione dei porti usando valori e contratti P02 e la coda P01.
