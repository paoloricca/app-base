const sql = require('mssql/msnodesqlv8');
const connection = require('../config.db');

async function execute(node, actor, profile, group, language, operation, enabled, direction) {
    const pool = await sql.connect(connection);
    const transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
        const request = new sql.Request(transaction);
        request.input('Node', sql.Int, node);
        request.input('Actor', sql.Int, actor);
        request.input('Profile', sql.Int, profile || null);
        request.input('Group', sql.Int, group || null);
        request.input('Language', sql.VarChar(2), language);
        request.input('Operation', sql.VarChar(16), operation);
        request.input('Enabled', sql.Bit, enabled == null ? null : enabled);
        request.input('Direction', sql.Int, direction || null);
        const result = await request.query(`
            SET NOCOUNT ON;
            IF NOT EXISTS (SELECT 1 FROM dbo.TEventiTransizioni WITH (UPDLOCK, HOLDLOCK)
                WHERE IDEventoTransizione = @Node AND IDAttore = @Actor)
                THROW 51000, 'Nodo workflow non trovato.', 1;
            IF @Operation <> 'clear' AND @Profile IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM dbo.TProfiliUtente
                WHERE IDOwner = @Actor AND IDGruppoOperativo = @Group
                  AND IDProfiloUtente = @Profile AND IsVisible = 1)
                THROW 51001, 'Profilo utente non trovato.', 1;

            IF @Operation = 'clear'
            BEGIN
                DELETE P FROM dbo.TEventiTransizioniDirezioniProfili P
                JOIN dbo.TEventiTransizioniDirezioni D ON D.IDEventoDirezione = P.IDEventoDirezione
                WHERE D.IDTransizioneStart = @Node AND P.IDOwner = @Actor;
                DELETE FROM dbo.TEventiTransizioniOwnerProfili
                WHERE IDEventoTransizione = @Node AND IDOwner = @Actor;
                UPDATE dbo.TEventiTransizioniOwner SET IsSelectedProfile = NULL
                WHERE IDEventoTransizione = @Node;
            END;
            IF @Operation = 'profile'
            BEGIN
                IF @Enabled = 1
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM dbo.TEventiTransizioniOwner WHERE IDEventoTransizione = @Node)
                        INSERT dbo.TEventiTransizioniOwner (IDEventoTransizione) VALUES (@Node);
                    UPDATE dbo.TEventiTransizioniOwner
                    SET IsCreator = NULL, IsAdminOfCreator = NULL, IsUsersFromAdminProfileCreator = NULL,
                        IsAdminOwnerSelectedNode = NULL, IsOwnerSelectedNode = NULL,
                        IsCreatorSelectedNode = NULL, IsSelectedProfile = @Profile, IsVendor = NULL
                    WHERE IDEventoTransizione = @Node;
                    IF NOT EXISTS (SELECT 1 FROM dbo.TEventiTransizioniOwnerProfili
                        WHERE IDEventoTransizione = @Node AND IDOwner = @Actor
                          AND IDGruppoOperativo = @Group AND IDProfiloUtente = @Profile)
                        INSERT dbo.TEventiTransizioniOwnerProfili
                            (IDEventoTransizione, IDOwner, IDGruppoOperativo, IDProfiloUtente)
                        VALUES (@Node, @Actor, @Group, @Profile);
                    INSERT dbo.TEventiTransizioniDirezioniProfili
                        (IDEventoDirezione, IDOwner, IDGruppoOperativo, IDProfiloUtente)
                    SELECT D.IDEventoDirezione, @Actor, @Group, @Profile
                    FROM dbo.TEventiTransizioniDirezioni D
                    WHERE D.IDTransizioneStart = @Node AND D.IsVisible = 1
                      AND NOT EXISTS (SELECT 1 FROM dbo.TEventiTransizioniDirezioniProfili P
                          WHERE P.IDEventoDirezione = D.IDEventoDirezione AND P.IDOwner = @Actor
                            AND P.IDGruppoOperativo = @Group AND P.IDProfiloUtente = @Profile);
                END
                ELSE
                BEGIN
                    DELETE P FROM dbo.TEventiTransizioniDirezioniProfili P
                    JOIN dbo.TEventiTransizioniDirezioni D ON D.IDEventoDirezione = P.IDEventoDirezione
                    WHERE D.IDTransizioneStart = @Node AND P.IDOwner = @Actor
                      AND P.IDGruppoOperativo = @Group AND P.IDProfiloUtente = @Profile;
                    DELETE FROM dbo.TEventiTransizioniOwnerProfili
                    WHERE IDEventoTransizione = @Node AND IDOwner = @Actor
                      AND IDGruppoOperativo = @Group AND IDProfiloUtente = @Profile;
                    UPDATE dbo.TEventiTransizioniOwner SET IsSelectedProfile = (
                        SELECT MIN(IDProfiloUtente) FROM dbo.TEventiTransizioniOwnerProfili
                        WHERE IDEventoTransizione = @Node AND IDOwner = @Actor)
                    WHERE IDEventoTransizione = @Node;
                END;
            END;
            IF @Operation IN ('all', 'direction')
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM dbo.TEventiTransizioniOwnerProfili
                    WHERE IDEventoTransizione = @Node AND IDOwner = @Actor
                      AND IDGruppoOperativo = @Group AND IDProfiloUtente = @Profile)
                    THROW 51002, 'Il profilo non e attivo sul nodo.', 1;
                IF @Operation = 'direction' AND NOT EXISTS (
                    SELECT 1 FROM dbo.TEventiTransizioniDirezioni
                    WHERE IDEventoDirezione = @Direction AND IDTransizioneStart = @Node AND IsVisible = 1)
                    THROW 51003, 'Collegamento non trovato.', 1;
                IF @Enabled = 0
                    DELETE P FROM dbo.TEventiTransizioniDirezioniProfili P
                    JOIN dbo.TEventiTransizioniDirezioni D ON D.IDEventoDirezione = P.IDEventoDirezione
                    WHERE D.IDTransizioneStart = @Node AND P.IDOwner = @Actor
                      AND P.IDGruppoOperativo = @Group AND P.IDProfiloUtente = @Profile
                      AND (@Operation = 'all' OR D.IDEventoDirezione = @Direction);
                ELSE
                    INSERT dbo.TEventiTransizioniDirezioniProfili
                        (IDEventoDirezione, IDOwner, IDGruppoOperativo, IDProfiloUtente)
                    SELECT D.IDEventoDirezione, @Actor, @Group, @Profile
                    FROM dbo.TEventiTransizioniDirezioni D
                    WHERE D.IDTransizioneStart = @Node AND D.IsVisible = 1
                      AND (@Operation = 'all' OR D.IDEventoDirezione = @Direction)
                      AND NOT EXISTS (SELECT 1 FROM dbo.TEventiTransizioniDirezioniProfili P
                          WHERE P.IDEventoDirezione = D.IDEventoDirezione AND P.IDOwner = @Actor
                            AND P.IDGruppoOperativo = @Group AND P.IDProfiloUtente = @Profile);
            END;
            SELECT OP.IDProfiloUtente, OP.IDGruppoOperativo,
                COALESCE(CASE @Language WHEN 'GB' THEN G.Text_GB ELSE G.Text_IT END, N'')
                    + N' - ' +
                COALESCE(CASE @Language WHEN 'GB' THEN P.Text_GB ELSE P.Text_IT END, N'')
                    AS OwnerDescription
            FROM dbo.TEventiTransizioniOwnerProfili OP
            JOIN dbo.TProfiliUtente P ON P.IDOwner = OP.IDOwner
                AND P.IDGruppoOperativo = OP.IDGruppoOperativo
                AND P.IDProfiloUtente = OP.IDProfiloUtente
            JOIN dbo.TGruppiOperativi G ON G.IDOwner = OP.IDOwner
                AND G.IDGruppoOperativo = OP.IDGruppoOperativo
            WHERE OP.IDEventoTransizione = @Node AND OP.IDOwner = @Actor
            ORDER BY G.Text_IT, P.Text_IT, OP.IDGruppoOperativo, OP.IDProfiloUtente;
            SELECT D.IDEventoDirezione,
                CASE @Language WHEN 'GB' THEN D.Text_GB WHEN 'ES' THEN D.Text_ES
                    WHEN 'CN' THEN D.Text_CN ELSE D.Text_IT END AS Description,
                CASE WHEN EXISTS (SELECT 1 FROM dbo.TEventiTransizioniDirezioniProfili P
                    WHERE P.IDEventoDirezione = D.IDEventoDirezione AND P.IDOwner = @Actor
                      AND P.IDGruppoOperativo = @Group AND P.IDProfiloUtente = @Profile)
                    THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END AS Enabled
            FROM dbo.TEventiTransizioniDirezioni D
            WHERE D.IDTransizioneStart = @Node AND D.IsVisible = 1 ORDER BY D.IDEventoDirezione;
        `);
        await transaction.commit();
        return { profiles: result.recordsets[0], links: result.recordsets[1] };
    } catch (error) {
        try {
            await transaction.rollback();
        } catch (rollbackError) {
            error.message += ' (rollback: ' + rollbackError.message + ')';
        }
        throw error;
    }
}

module.exports = { execute };
