Il dominio contiene i valori numerici e temporali introdotti da P02 in `values/`:
denaro EUR e fattori decimali esatti, risoluzione esplicita dei momenti e fuso iniziale
autonomo del porto. Queste funzioni non accedono a SQLite, IPC o stato globale.

I casi d'uso e le transazioni restano in `application/`; gli adattatori di persistenza
restano in `infrastructure/`. Le entità operative saranno introdotte dalle slice successive.
