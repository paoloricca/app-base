# app-base

## Profili owner e collegamenti del workflow

Per aggiornare un database esistente, applicare nell'ordine
[dynamic-forms-record-id-filter.sql](sql/dynamic-forms-record-id-filter.sql),
[workflow-chat.sql](sql/workflow-chat.sql) e
[workflow-owner-profiles.sql](sql/workflow-owner-profiles.sql). Quest'ultimo
deve essere eseguito anche dopo gli altri script che ridefiniscono le
procedure di owner e transizioni. Migra i precedenti owner a profilo singolo,
abilitando inizialmente tutti i collegamenti visibili; non riabilita i
collegamenti successivamente disattivati quando viene rieseguito.

Nel selettore dell'owner, il nome di un profilo seleziona il pannello dei
collegamenti; il relativo interruttore attiva o disattiva il profilo.
L'attivazione abilita tutti i collegamenti visibili. Disattivando «Tutti i
collegamenti» si rimuovono tutte le associazioni e si possono scegliere
singolarmente. Le modifiche ai profili e ai collegamenti sono immediate:
Annulla non le ripristina. Disattivare «Utenti del profilo» rimuove tutte
le associazioni. Le autorizzazioni considerano tutti i profili visibili
associati all'account, non solo il profilo predefinito.

Test mirati: `node --test tests\workflow-owner-profiles-ui.test.js`.
Il test SQL utilizza il database configurato, ma esegue le modifiche in una
transazione annullata: `$env:WORKFLOW_SQL_TEST='1'; node --test
tests\workflow-owner-profiles-sql.test.js`.

## Intervalli di durata del workflow

Eseguire [workflow-timing.sql](sql/workflow-timing.sql) sul database applicativo
prima di usare la configurazione degli intervalli. Le durate sono conteggiate
dalla data di ingresso nello stato corrente; `ValidityType` 0 indica ore e 1
giorni. Disattivando un intervallo i valori sono conservati con
`TimingActive = 0`. Per il massimo occorre selezionare un altro stato visibile
della stessa versione del workflow.

Il controllo del minimo avviene nella transazione di cambio stato delle
occorrenze dynamic-forms. Per elaborare i massimi scaduti eseguire:

```sql
EXEC dbo.SP_PROCESS_WORKFLOW_TIMING @Mode = 'PROCESS', @IDAccount = 1;
```

Il parametro indica l'account di servizio registrato nello storico. La
procedura non e pianificata automaticamente: configurare separatamente
l'esecuzione ogni minuto. I dati esistenti non vengono migrati; eventuali
configurazioni attive prive di unita valida devono essere corrette prima
dell'uso. Errori di configurazione o di elaborazione interrompono la chiamata
e devono essere monitorati dallo scheduler.

Test delle regole di convalida e della transazione:
`node --test tests\workflow-timing.test.js tests\workflow-timing-transition.test.js`.
Per verificare la procedura con tabelle e procedure temporanee isolate sul
database configurato, eseguire in PowerShell:

```powershell
$env:WORKFLOW_SQL_TEST = '1'
node --test tests\workflow-timing-sql.test.js
```

## Chat nella storia del workflow

Eseguire [workflow-chat-notifications.sql](sql/workflow-chat-notifications.sql)
e poi [workflow-chat.sql](sql/workflow-chat.sql), dopo gli script del workflow
e di dynamic-forms. Le migrazioni richiedono le tabelle esistenti
`TEventiStatiMessaggi`, `TEventiStatiAllegati` e
`TEventiStatiMessaggiNotifiche`. La registrazione di messaggio, allegati e
notifiche avviene in un'unica transazione; i messaggi precedenti non generano
notifiche retroattive.
La visualizzazione richiede l'azione `VisualizzaStoria` sul processo e sullo
stato corrente. Il creatore e gli owner possono scrivere; il flag sul nodo
abilita anche gli altri utenti autorizzati a vedere la storia.

Il menu chat mostra le ultime dieci richieste con messaggi non letti e il badge
conta i singoli messaggi accessibili. Aprire una richiesta o la sua storia
segna come letti tutti i messaggi di quella richiesta per l'utente corrente.
Le notifiche non accessibili con i permessi correnti non sono esposte nel menu.
Socket.io utilizza la sessione applicativa Redis e aggiorna le schede aperte;
al ripristino della connessione il menu viene ricaricato dal database. Il
trasporto in tempo reale usa l'adapter Socket.io in memoria: con piu processi
applicativi occorrono un adapter condiviso e session affinity per il polling.
Il reverse proxy deve inoltrare le richieste a `/socket.io/` e, per WebSocket,
supportare l'upgrade della connessione.

Per aprire una notifica nella pagina applicativa e filtrare la richiesta per ID,
eseguire anche [dynamic-forms-record-id-filter.sql](sql/dynamic-forms-record-id-filter.sql)
e, per la pagina legacy degli ordini artwork,
[artwork-order-id-filter.sql](sql/artwork-order-id-filter.sql). Le procedure
mantengono il comportamento precedente quando il filtro ID non e impostato.
La navigazione supporta le pagine dynamic-forms e le pagine legacy di artwork
e assistenza; per altre pagine legacy non configurate viene mostrato un errore
e la notifica rimane non letta.

Gli allegati sono conservati in `files\.workflow-chat` e serviti tramite una
route autorizzata, non direttamente come file statici. Sono ammessi fino a
cinque file per messaggio, massimo 10 MiB ciascuno: PNG, JPEG, GIF, WebP e PDF.
Per preservare gli allegati includere questa cartella nel backup dei file
insieme alle tabelle dei messaggi e degli allegati.

Test mirati: `node --test tests\workflow-chat.test.js tests\workflow-chat-notifications.test.js tests\workflow-chat-notifications-route.test.js tests\workflow-chat-navigation.test.js`.