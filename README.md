# app-base

## Campi calcolati

Per aggiornare il database applicativo:

1. Applicare [forms-calculated-fields.sql](sql/forms-calculated-fields.sql),
   dopo la procedura esistente `SP_POST_ATTRIBUTE`. Aggiunge
   `IDAttributoCalcolato`, il relativo vincolo e indice, e la procedura
   transazionale `SP_POST_ATTRIBUTE_CALCULATED`. `IDAttributo` continua a
   identificare il campo sorgente.
2. Applicare [forms-calculated-records.sql](sql/forms-calculated-records.sql)
   dopo gli script dynamic-forms. Aggiorna le due procedure di lettura dei
   record di sezione, senza crearne durante la visualizzazione.
3. Applicare [forms-version.sql](sql/forms-version.sql) e
   [forms-version-delete.sql](sql/forms-version-delete.sql) per copiare e
   rimuovere correttamente le condizioni insieme alle versioni.

Le condizioni precedenti prive di `IDAttributoCalcolato` non possono essere
associate automaticamente a un campo calcolato e vanno verificate prima
dell'uso. Le formule partono da zero, applicano le operazioni nell'ordine
registrato e sommano i valori delle sezioni ripetute. I valori vuoti valgono
zero; una divisione per zero viene segnalata e blocca il salvataggio.
Gli interi sono arrotondati all'intero piu vicino; decimali e valute usano le
cifre decimali configurate sul campo. I risultati numerici sono derivati durante la
visualizzazione e non sono scritti come valori modificabili del record. Un
campo utilizzato come sorgente non puo essere nascosto o convertito in un tipo
non numerico finche resta collegato a una formula.
Le cifre decimali sono configurabili anche per i campi decimali e valuta non
calcolati; per i campi calcolati sono obbligatorie. Per abilitare questa
modifica su un database gia aggiornato, rieseguire
[forms-calculated-fields.sql](sql/forms-calculated-fields.sql).
Nel riepilogo di dynamic-forms i campi calcolati vengono ricalcolati alla
lettura delle righe, inclusi i valori delle sezioni ripetute; gli errori di
calcolo sono indicati nella relativa cella. Questa integrazione non richiede
ulteriori modifiche al database rispetto agli script sopra indicati.

I campi Testo calcolati concatenano le sorgenti configurate, includendo
l'account creatore e i progressivi del processo. Il valore proposto prima
del salvataggio e provvisorio; il server lo assegna al primo salvataggio della
sezione e lo conserva successivamente. Il conteggio considera le istanze di
tutte le versioni del modello, anche quelle non visibili, ordinate per ID.
Il modello deve appartenere a un solo processo: se e condiviso, il calcolo
viene bloccato per evitare di attribuire progressivi a un processo errato.
Il salvataggio dei valori della sezione e del testo calcolato e transazionale;
gli eventuali allegati sono gestiti separatamente. La generazione usa un
blocco sulla tabella delle istanze e puo rallentare salvataggi concorrenti.

Test mirati: `node --test tests\calculated-fields.test.js
tests\calculated-fields-ui.test.js tests\calculated-fields-route.test.js
tests\calculated-fields-summary.test.js tests\calculated-text.test.js
tests\decimal-attribute-template.test.js`.
Per verificare le procedure su un database LocalDB temporaneo:
`$env:CALCULATED_SQL_TEST='1'; node --test tests\calculated-fields-sql.test.js`.

## Condizioni delle origini dati

La configurazione richiede la tabella esistente
`dbo.TModelliClassiOriginiDatiCondizioni`. Le condizioni confrontano le colonne
dell'origine con i valori correnti dei campi visibili della stessa versione del
form; sono combinate con AND e la ricerca richiede che tali valori siano compilati.
Per i campi lista il confronto usa la descrizione visualizzata della voce
selezionata, senza modificare il codice memorizzato nel form.
Il confronto definitivo avviene nell'applicazione prima del limite di 200 righe
corrispondenti. Quando la query lo consente, le condizioni sono combinate con
AND in un prefiltro SQL parametrizzato: i quattro operatori su testo ASCII e
interi e i valori booleani su colonne `bit` vengono anticipati. Per valori non
ASCII e altri tipi il prefiltro esclude solo i valori NULL; il confronto completo
resta nell'applicazione. Le query non compatibili mantengono la lettura originale:
per origini particolarmente estese possono essere necessarie ulteriori
ottimizzazioni della query.

## Visibilita dei campi del workflow

Applicare [workflow-field-visibility.sql](sql/workflow-field-visibility.sql)
dopo gli script delle procedure dynamic-forms. L'editor di workflow usa la
migrazione per restituire i campi modificabili nell'azione «Modifica» e per
rifiutare lato database il salvataggio dei campi non autorizzati. Se per
l'azione e lo stato correnti non e configurato alcun campo, resta valido il
comportamento precedente: tutti i campi sono modificabili.

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

## Visibilità dei valori lista nei form

Applicare [forms-attribute-values-profili.sql](sql/forms-attribute-values-profili.sql)
sul database applicativo per installare le procedure di lettura e
aggiornamento delle associazioni tra valori lista e profili utente. Durante la
compilazione del form, un valore senza associazioni resta visibile a tutti;
quando sono configurati profili, il valore è mostrato solo agli account
associati a uno dei profili selezionati.

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

## Dashboard operativa workflow

Per abilitare la dashboard dei processi con attività assegnate all'utente,
eseguire [workflow-dashboard.sql](sql/workflow-dashboard.sql) dopo gli script
di dynamic-forms e [workflow-owner-profiles.sql](sql/workflow-owner-profiles.sql).
La dashboard mostra una card aggregata per processo e considera assegnabili
solo le richieste il cui stato corrente autorizza l'account tramite
`FN_WORKFLOW_NODE_ACCOUNTS`. Se non ci sono richieste, mostra lo screensaver
riutilizzabile del workflow. Per aprire direttamente
la richiesta selezionata dalla dashboard, applicare anche
[dynamic-forms-record-id-filter.sql](sql/dynamic-forms-record-id-filter.sql).
La permanenza misura il tempo nello stato corrente e la reazione il tempo tra
l'ingresso nello stato precedente e quello corrente. I riepiloghi per stato
sommano entrambi i valori; i filtri nell'header limitano l'elenco al codice di
stato selezionato. Le direzioni mostrate sono quelle autorizzate per l'Owner
in sessione e aprono il popup workflow con la direzione selezionata.

## Chat nella storia del workflow

Eseguire [workflow-chat-notifications.sql](sql/workflow-chat-notifications.sql),
poi [workflow-chat.sql](sql/workflow-chat.sql) e infine
[workflow-apply-message.sql](sql/workflow-apply-message.sql), dopo gli script
del workflow e di dynamic-forms. Le migrazioni richiedono le tabelle esistenti
`TEventiStatiMessaggi`, `TEventiStatiAllegati` e
`TEventiStatiMessaggiNotifiche`. La registrazione di messaggio, allegati e
notifiche avviene in un'unica transazione; i messaggi precedenti non generano
notifiche retroattive. Nota e allegati inseriti nel popup «Imposta Workflow»
sono registrati sul nuovo stato da `SP_POST_WORKFLOW_APPLY_MESSAGE`; non vengono
scritti in `AvailableNote`. Gli allegati sono disponibili solo per le
transizioni che prevedono la nota; selezionando una transizione senza nota
gli allegati eventualmente selezionati vengono rimossi e il cambio stato non
crea messaggi o notifiche. Il server rifiuta note o allegati inviati per tali
transizioni nel flusso del popup.
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