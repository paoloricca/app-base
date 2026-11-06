# app-base

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