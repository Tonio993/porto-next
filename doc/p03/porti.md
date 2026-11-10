# P03 — Creare e consultare un porto

Data: 10 novembre 2026. Base integrata: `675d429` (consegna P02). Implementazione P03: commit `5a6fa8c`.

Riferimenti: [piano](../piano-implementazione-prestazioni.md), [decisioni D01–D05](../p00/decisioni-iniziali.md), [contesto P01](../p01/contesto-applicativo.md), [valori P02](../p02/numeri-e-tempo.md), [registro](../stato-implementazione-prestazioni.md).

## Percorso applicativo

La sezione **Anagrafiche** offre creazione, ricerca, elenco paginato e dettaglio dei porti dell'archivio aperto. Nome e località sono obbligatori; il paese si seleziona da un elenco ISO alpha-2 con denominazioni italiane. Il fuso IANA iniziale viene proposto dalla configurazione aziendale e può essere sostituito prima del salvataggio. Un porto nasce attivo, con una versione descrittiva iniziale senza decorrenza.

`src/shared/contracts/ports.ts` definisce i metodi specifici `create`, `list`, `get`, i DTO e i canali IPC. Il preload espone `window.ports`; il main controlla mittente e frame prima di invocare `PortService`. Nessun accesso SQL è disponibile al renderer.

I casi d'uso passano dal coordinatore P01: query con sessione, creazione con archivio/sessione/revisione. I repository vengono costruiti dentro la sessione corrente. La transazione sincrona del coordinatore contiene contatore, identità, versione iniziale, prenotazione e configurazione temporale; aggiorna revisione e timestamp una sola volta. Un fallimento annulla tutte le scritture.

La bozza conserva il proprio contesto: un conflitto richiede **Ricarica dati**, che recupera il contesto effettivo senza cancellare gli input. Cambio archivio e «Salva con nome» ricreano il workspace e scartano bozza, ricerca e selezione. Le risposte asincrone vengono controllate per sessione, revisione e ordine della richiesta.

## Persistenza e decisioni

Schema v4, nuova migrazione `0004_ports.sql`; `0001`–`0003` restano invariate. Il runner la include nella build e riusa copia preventiva e migrazione transazionale degli archivi precedenti.

| Tabella                        | Responsabilità                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------------- |
| `ports`                        | UUIDv4, progressivo positivo univoco, stato corrente.                                         |
| `port_code_counter`            | Ultimo progressivo assegnato, indipendente dalle righe esistenti.                             |
| `port_versions`                | UUIDv4 e dati descrittivi completi, con indice parziale per l'unica versione iniziale.        |
| `port_identifier_reservations` | Proprietario con FK, tre colonne della chiave normalizzata e timestamp di prima prenotazione. |
| `port_time_zones`              | Sequenza autonoma del fuso, inizialmente una sola versione senza decorrenza.                  |

Le FK non cancellano automaticamente dati dipendenti. Il progressivo resta entro `Number.MAX_SAFE_INTEGER`; l'esaurimento viene respinto senza rinumerazioni. Nessun nuovo pacchetto è richiesto.

Le stringhe visualizzate subiscono solo `trim`; le chiavi applicano `trim → NFC → toUpperCase() → NFC`, conservando accenti e spazi interni. L'unicità globale del porto è protetta da un indice sulle tre colonne nome/località/paese, tutte obbligatorie. Un duplicato produce `DUPLICATE_IDENTIFIER` con riferimento al porto in conflitto. Nomi e località hanno il limite P00 di 200 punti di codice Unicode; il backend verifica anche paese, fuso e assenza di campi inattesi.

Il paese viene salvato come codice maiuscolo; l'elenco condiviso dei codici supporta validazione backend e selettore UI. Le denominazioni localizzate non partecipano alla chiave. La ricerca usa la stessa normalizzazione, tratta `%` e `_` letteralmente e consulta le prenotazioni. Le pagine iniziano da 1, con 25 elementi nella UI e massimo 100 nel contratto. L'ordine è per progressivo; elenco e dettaglio risolvono la versione applicabile all'istante corrente del backend.

La creazione richiede una scelta esplicita del fuso del porto, inizialmente proposta dalla configurazione aziendale anche quando ancora non confermata. Non conferma implicitamente il fuso aziendale e non ne conserva una dipendenza dinamica: il valore del porto è autonomo. Questo applica la distinzione di P02 tra proposta iniziale e configurazione propria del porto. Non vengono introdotti comandi di variazione dei fusi.

## Verifiche

Gli esiti finali sono nel registro. I test SQLite coprono normalizzazione Unicode, chiavi composte e separatori, limiti, progressivi non riutilizzati, vincoli sulle versioni iniziali e sulle FK, rollback dopo un errore nell'ultima scrittura, ricerca e paginazione, copie e backup, richieste obsolete e migrazione v3 con conservazione dei metadati. Restano attive le regressioni di migrazione v1/v2.

Il percorso desktop dedicato usa dati temporanei e renderer offline: crea porti, rifiuta fusi non validi e duplicati, ammette lo stesso nome in altra località, ricerca e apre il dettaglio, recupera un conflitto di revisione, scarta la bozza al cambio sessione e verifica persistenza dopo riavvio e indipendenza della copia. I test IPC verificano tutti i canali dei porti con mittenti estranei, frame secondari e finestra assente.

## Limiti e passaggio a P04

P03 copre la parte di consultazione e creazione dei porti di `CU-ANA-01`–`03` e la scelta iniziale del fuso: non dichiara completati tutti i casi d'uso anagrafici o temporali. Banchine, soggetti, navi e funzioni operative restano nelle rispettive slice.

Il prossimo task è **P04**, versioni e ciclo di vita del porto. Riutilizzare contatore e prenotazioni; non liberare le vecchie chiavi correggendo una versione e non modificare il fuso insieme ai dati descrittivi. Aggiungere cronologia, anteprime dove richieste, stato ed eliminazione consentita. I futuri riferimenti a un porto dovranno introdurre i propri vincoli reali e aggiornare l'analisi degli impatti.
