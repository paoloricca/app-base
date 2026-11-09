const express = require('express');
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sql = require('mssql/msnodesqlv8');
const connection = require('../config.db');
const sessionUtil = require('../utils/session');
const { identifyFile } = require('../utils/workflow-chat-file');
const realtime = require('../utils/workflow-chat-realtime');

const router = express.Router();
const storage = path.join(__dirname, '..', 'files', '.workflow-chat');
const maxFileSize = 10 * 1024 * 1024;

function positive(value) {
    const n = Number(value);
    if (!Number.isSafeInteger(n) || n < 1 || n > 2147483647) {
        throw new Error('Identificativo non valido.');
    }
    return n;
}

function context(req) {
    return {
        process: positive(req.params.process),
        record: positive(req.params.record),
        account: positive(req.session.user.IdAccount),
        actor: positive(req.session.user.IdAttore),
        profile: positive(req.session.user.IDProfiloUtenteDefault)
    };
}

function inputs(request, c) {
    return request.input('IDProcesso', sql.Int, c.process)
        .input('IDRecord', sql.Int, c.record)
        .input('IDAccount', sql.Int, c.account)
        .input('IDAttore', sql.Int, c.actor)
        .input('IDProfilo', sql.Int, c.profile);
}

async function getContext(transaction, c) {
    const result = await inputs(new sql.Request(transaction), c)
        .output('IDStato', sql.Int)
        .output('Version', sql.Int)
        .output('CanWrite', sql.Bit)
        .execute('SP_WORKFLOW_CHAT_CONTEXT');
    return result.output;
}

async function readInTransaction(c, action) {
    const pool = await sql.connect(connection);
    const transaction = new sql.Transaction(pool);
    let aborted = false;
    transaction.on('rollback', function (wasAborted) { aborted = wasAborted; });
    await transaction.begin();
    try {
        const state = await getContext(transaction, c);
        const result = await action(transaction, state);
        await transaction.commit();
        return result;
    } catch (error) {
        if (!aborted) {
            try { await transaction.rollback(); }
            catch (rollbackError) {
                throw new Error(error.message + ' (rollback: ' + rollbackError.message + ')');
            }
        }
        throw error;
    }
}

function fail(res, error) {
    console.error('[workflow-chat]', error);
    res.status(400).json({ status: 'ERR', error: { message: error.message } });
}

function publish(account, event, payload) {
    realtime.publish(account, event, payload)
        .catch(error => console.error('[workflow-chat] realtime', error));
}

router.get('/workflow-chat-notifications', async (req, res) => {
    if (!sessionUtil.verifyUser(req, res)) return;
    try {
        const account = positive(req.session.user.IdAccount);
        const actor = positive(req.session.user.IdAttore);
        const profile = positive(req.session.user.IDProfiloUtenteDefault);
        const language = req.session.user.LanguageContext;
        if (!['IT', 'GB', 'ES', 'CN'].includes(language)) throw new Error('Lingua non valida.');
        const pool = await sql.connect(connection);
        const result = await new sql.Request(pool).input('Account', sql.Int, account).query(`
            WITH Unread AS (
                SELECT P.IDProcesso, S.IDRecord, M.TestoMessaggio, M.DataInvio,
                       CASE WHEN EXISTS (SELECT 1 FROM dbo.TProcessiWorkflowRecord PR
                           WHERE PR.IDProcesso = P.IDProcesso AND PR.IDRecord = S.IDRecord)
                           THEN 1 ELSE 0 END AS IsDynamic,
                       CONCAT(L.Nome, ' ', L.Cognome) AS Mittente,
                       COUNT(*) OVER (PARTITION BY P.IDProcesso, S.IDRecord) AS UnreadCount,
                       ROW_NUMBER() OVER (PARTITION BY P.IDProcesso, S.IDRecord
                           ORDER BY M.DataInvio DESC, M.IDMessaggio DESC) AS RowNum
                FROM dbo.TEventiStatiMessaggiNotifiche N
                JOIN dbo.TWorkflowChatMessageProcess P ON P.IDMessaggio = N.IDMessaggio
                JOIN dbo.TEventiStatiMessaggi M ON M.IDMessaggio = N.IDMessaggio
                JOIN dbo.TEventiStati S ON S.IDEventoStato = M.IDEventoStato
                LEFT JOIN dbo.VW_LOGIN L ON L.IDAccount = M.IDMittente
                WHERE N.IDDestinatario = @Account AND N.IsLetto = 0
                  AND M.IsDeleted = 0 AND S.IsVisible = 1
            )
            SELECT IDProcesso, IDRecord, TestoMessaggio, DataInvio, Mittente, UnreadCount, IsDynamic
            FROM Unread WHERE RowNum = 1 ORDER BY DataInvio DESC;`);
        const visible = [];
        for (const row of result.recordset) {
            const c = { process: row.IDProcesso, record: row.IDRecord, account, actor, profile };
            try {
                const stateName = await readInTransaction(c, async (transaction, state) => {
                    const current = await new sql.Request(transaction)
                        .input('State', sql.Int, state.IDStato).input('Language', sql.VarChar(2), language)
                        .query(`SELECT CASE @Language WHEN 'GB' THEN N.Text_GB WHEN 'ES' THEN N.Text_ES
                            WHEN 'CN' THEN N.Text_CN ELSE N.Text_IT END AS Stato
                            FROM dbo.TEventiStati S JOIN dbo.TEventiTransizioni N
                            ON N.IDEventoTransizione = S.IDEventoTransizione WHERE S.IDEventoStato = @State`);
                    if (!current.recordset.length) throw new Error('Stato workflow non trovato.');
                    return current.recordset[0].Stato;
                });
                visible.push({ ...row, Stato: stateName });
            } catch (error) {
                if (error.code === 'EREQUEST' && /Non autorizzato|Occorrenza non trovata o non autorizzata/.test(error.message)) {
                    console.warn('[workflow-chat] Notifica non accessibile', row.IDProcesso, row.IDRecord);
                    continue;
                }
                throw error;
            }
        }
        res.set('Cache-Control', 'no-store');
        res.json({ status: 'OK', count: visible.reduce((sum, item) => sum + item.UnreadCount, 0), items: visible.slice(0, 10) });
    } catch (error) { fail(res, error); }
});

router.post('/workflow-chat-notifications/read-all', async (req, res) => {
    if (!sessionUtil.verifyUser(req, res)) return;
    try {
        const account = positive(req.session.user.IdAccount);
        const pool = await sql.connect(connection);
        await new sql.Request(pool).input('IDAccount', sql.Int, account)
            .execute('SP_READ_WORKFLOW_CHAT_NOTIFICATIONS');
        publish(account, 'chat_notifications_read', {});
        res.json({ status: 'OK' });
    } catch (error) { fail(res, error); }
});

router.get('/workflow-chat/:process/:record', async (req, res) => {
    if (!sessionUtil.verifyUser(req, res)) return;
    try {
        const c = context(req);
        const language = req.session.user.LanguageContext;
        if (!['IT', 'GB', 'ES', 'CN'].includes(language)) throw new Error('Lingua non valida.');
        const data = await readInTransaction(c, async (transaction, state) => {
            const history = await new sql.Request(transaction)
                .input('IdAttore', sql.Int, c.actor).input('IdAccount', sql.Int, c.account)
                .input('IdRecord', sql.Int, c.record).input('IdProcesso', sql.Int, c.process)
                .input('LanguageContext', sql.VarChar(2), language)
                .output('Status', sql.VarChar(500)).execute('SP_GET_WORKFLOW_HISTORY');
            if (history.output.Status !== 'OK') throw new Error(history.output.Status || 'Errore nella storia.');
            const messages = await new sql.Request(transaction)
                .input('Record', sql.Int, c.record).input('Version', sql.Int, state.Version)
                .query(`SELECT M.IDMessaggio, M.IDEventoStato, M.IDMittente, M.TestoMessaggio, M.DataInvio,
                               CONCAT(L.Nome, ' ', L.Cognome) AS Mittente
                        FROM dbo.TEventiStatiMessaggi M
                        JOIN dbo.TEventiStati S ON S.IDEventoStato = M.IDEventoStato
                        JOIN dbo.TEventiTransizioni N ON N.IDEventoTransizione = S.IDEventoTransizione
                        LEFT JOIN dbo.VW_LOGIN L ON L.IDAccount = M.IDMittente
                        WHERE S.IDRecord = @Record AND N.IDVersioneWorkflow = @Version
                          AND S.IsVisible = 1 AND M.IsDeleted = 0
                        ORDER BY M.DataInvio, M.IDMessaggio;
                        SELECT A.IDAllegato, A.IDMessaggio, A.NomeFileOriginale, A.MimeType, A.DimensioneBytes
                        FROM dbo.TEventiStatiAllegati A
                        JOIN dbo.TEventiStatiMessaggi M ON M.IDMessaggio = A.IDMessaggio
                        JOIN dbo.TEventiStati S ON S.IDEventoStato = M.IDEventoStato
                        JOIN dbo.TEventiTransizioni N ON N.IDEventoTransizione = S.IDEventoTransizione
                        WHERE S.IDRecord = @Record AND N.IDVersioneWorkflow = @Version
                          AND S.IsVisible = 1 AND M.IsDeleted = 0 ORDER BY A.IDAllegato;`);
            await new sql.Request(transaction).input('IDAccount', sql.Int, c.account)
                .input('IDProcesso', sql.Int, c.process).input('IDRecord', sql.Int, c.record)
                .execute('SP_READ_WORKFLOW_CHAT_NOTIFICATIONS');
            return { history: history.recordset || [], messages: messages.recordsets[0],
                attachments: messages.recordsets[1], currentState: state.IDStato, canWrite: state.CanWrite };
        });
        publish(c.account, 'chat_notifications_read', { process: c.process, record: c.record });
        res.json({ status: 'OK', data });
    } catch (error) { fail(res, error); }
});

function parseUpload(req) {
    return new Promise((resolve, reject) => {
        const form = new formidable.IncomingForm({
            multiples: true, maxFiles: 5, maxFileSize, maxTotalFileSize: 5 * maxFileSize,
            maxFields: 4, maxFieldsSize: 100000
        });
        form.parse(req, (error, fields, files) => {
            if (error) return reject(error);
            resolve({ fields, files: Object.values(files).flat() });
        });
    });
}

router.post('/workflow-chat/:process/:record', async (req, res) => {
    if (!sessionUtil.verifyUser(req, res)) return;
    let files = [];
    let saveAttempted = false;
    const savedPaths = [];
    try {
        const c = context(req);
        const upload = await parseUpload(req);
        files = upload.files;
        const expected = positive(upload.fields.state && upload.fields.state[0]);
        const text = String((upload.fields.text && upload.fields.text[0]) || '').trim();
        if (text.length > 10000) throw new Error('Messaggio troppo lungo.');
        if (!text && files.length === 0) throw new Error('Inserire un messaggio o un allegato.');
        await fs.promises.mkdir(storage, { recursive: true });
        const attachments = [];
        for (const file of files) {
            const mime = await identifyFile(file, maxFileSize);
            const name = crypto.randomBytes(24).toString('hex');
            const target = path.join(storage, name);
            await fs.promises.copyFile(file.filepath, target, fs.constants.COPYFILE_EXCL);
            savedPaths.push(target);
            attachments.push({ OriginalName: path.basename(file.originalFilename || 'allegato').slice(0, 255),
                StorageName: name, MimeType: mime, Size: file.size });
        }
        const pool = await sql.connect(connection);
        saveAttempted = true;
        const result = await inputs(new sql.Request(pool), c)
            .input('ExpectedState', sql.Int, expected).input('Text', sql.NVarChar(sql.MAX), text)
            .input('Attachments', sql.NVarChar(sql.MAX), JSON.stringify(attachments))
            .execute('SP_POST_WORKFLOW_CHAT_MESSAGE');
        savedPaths.length = 0;
        const accounts = new Set(result.recordset.map(row => row.IDDestinatario));
        accounts.add(c.account);
        accounts.forEach(account => publish(account, 'new_chat_notification', {}));
        res.json({ status: 'OK' });
    } catch (error) {
        if (saveAttempted && error.code !== 'EREQUEST') {
            console.error('[workflow-chat] Esito SQL incerto: allegati conservati per verifica.', savedPaths);
            savedPaths.length = 0;
        }
        fail(res, error);
    }
    finally {
        for (const file of files) {
            try { await fs.promises.unlink(file.filepath); } catch (error) { console.error('[workflow-chat] cleanup', error); }
        }
        for (const file of savedPaths) {
            try { await fs.promises.unlink(file); } catch (error) { console.error('[workflow-chat] cleanup', error); }
        }
    }
});

router.get('/workflow-chat/:process/:record/attachment/:attachment', async (req, res) => {
    if (!sessionUtil.verifyUser(req, res)) return;
    try {
        const c = context(req);
        const id = positive(req.params.attachment);
        const file = await readInTransaction(c, async (transaction, state) => {
            const result = await new sql.Request(transaction).input('ID', sql.Int, id)
                .input('Record', sql.Int, c.record).input('Version', sql.Int, state.Version)
                .query(`SELECT A.NomeFileOriginale, A.NomeFileStorage, A.MimeType
                        FROM dbo.TEventiStatiAllegati A
                        JOIN dbo.TEventiStatiMessaggi M ON M.IDMessaggio = A.IDMessaggio
                        JOIN dbo.TEventiStati S ON S.IDEventoStato = M.IDEventoStato
                        JOIN dbo.TEventiTransizioni N ON N.IDEventoTransizione = S.IDEventoTransizione
                        WHERE A.IDAllegato = @ID AND S.IDRecord = @Record AND N.IDVersioneWorkflow = @Version
                          AND S.IsVisible = 1 AND M.IsDeleted = 0`);
            if (result.recordset.length !== 1) throw new Error('Allegato non disponibile.');
            return result.recordset[0];
        });
        if (!/^[a-f0-9]{48}$/.test(file.NomeFileStorage)) throw new Error('Allegato non valido.');
        res.set('X-Content-Type-Options', 'nosniff');
        res.set('Cache-Control', 'private, no-store');
        if (req.query.download === '1' || !file.MimeType.startsWith('image/')) {
            return res.download(path.join(storage, file.NomeFileStorage), file.NomeFileOriginale);
        }
        res.type(file.MimeType).sendFile(path.join(storage, file.NomeFileStorage));
    } catch (error) { fail(res, error); }
});

module.exports = router;
