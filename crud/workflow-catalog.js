const sql = require('mssql/msnodesqlv8');
const exception = require('../model/exception');
const connection = require('../config.db');

function execute(queryText, inputs) {
    const sender = 'workflow-catalog';

    return new Promise((resolve, reject) => {
        sql.connect(connection, function (connectionError, pool) {
            if (connectionError) {
                reject(new exception(sender, connectionError.message, connectionError.name, connectionError.stack));
                return;
            }

            const request = new sql.Request(pool);
            Object.keys(inputs || {}).forEach(function (name) {
                const input = inputs[name];
                request.input(name, input.type, input.value);
            });
            request.query(queryText, function (queryError, result) {
                if (queryError) {
                    reject(new exception(sender, queryError.message, queryError.name, queryError.stack));
                    return;
                }
                resolve(result);
            });
        });
    });
}

function intInput(value) {
    return { type: sql.Int, value: value };
}

function bitInput(value) {
    return { type: sql.Bit, value: value };
}

function textInput(value) {
    return { type: sql.NVarChar(sql.MAX), value: value };
}

function getBreadcrumb(languageContext) {
    return execute(`
        WITH ProcessHierarchy AS (
            SELECT IDProcesso, IDProcessoParent, Descrizione, 0 AS Depth
            FROM dbo.TProcessi
            WHERE PageUrl = 'workflow'
            UNION ALL
            SELECT parent.IDProcesso, parent.IDProcessoParent, parent.Descrizione, child.Depth + 1
            FROM dbo.TProcessi AS parent
            INNER JOIN ProcessHierarchy AS child ON child.IDProcessoParent = parent.IDProcesso
        )
        SELECT COALESCE(
            NULLIF(CASE @LanguageContext
                WHEN 'IT' THEN Culture.Text_IT
                WHEN 'GB' THEN Culture.Text_GB
                WHEN 'ES' THEN Culture.Text_ES
                WHEN 'CN' THEN Culture.Text_CN
            END, ''),
            NULLIF(Culture.Text_IT, ''),
            NULLIF(Culture.Text_GB, ''),
            NULLIF(Culture.Text_ES, ''),
            NULLIF(Culture.Text_CN, ''),
            Process.Descrizione
        ) AS Description
        FROM ProcessHierarchy AS Hierarchy
        INNER JOIN dbo.TProcessi AS Process ON Process.IDProcesso = Hierarchy.IDProcesso
        LEFT JOIN dbo.TProcessiCulture AS Culture ON Culture.IDProcesso = Process.IDProcesso
        ORDER BY Hierarchy.Depth DESC
        OPTION (MAXRECURSION 100);
    `, {
        LanguageContext: { type: sql.NVarChar(2), value: languageContext }
    }).then(function (result) {
        if (!result.recordset.length) {
            throw new Error('The Workflow page is not configured in TProcessi.');
        }
        return result.recordset.map(function (row) {
            return row.Description;
        }).join(' / ');
    });
}

function getRecords(IdAttore, pageIndex, pageSize, search, visibility, languageContext) {
    const offset = (pageIndex - 1) * pageSize;
    const searchTerm = search ? '%' + search.replace(/[%_[\]]/g, '[$&]') + '%' : null;

    return execute(`
        SELECT COUNT(1) AS TotalRecord
        FROM dbo.TWorkflow
        WHERE IDAttore = @IDAttore
            AND (@Search IS NULL OR Description_IT LIKE @Search OR Description_GB LIKE @Search
            OR Description_ES LIKE @Search OR Description_CN LIKE @Search OR Description_DE LIKE @Search)
            AND (@Visibility IS NULL OR IsVisible = @Visibility);

        SELECT IDWorkflow, IDAttore, Description_IT, Description_GB, Description_ES,
            Description_CN, Description_DE, DataIstanza, IsVisible,
            COALESCE(
                NULLIF(CASE @LanguageContext
                    WHEN 'IT' THEN Description_IT
                    WHEN 'GB' THEN Description_GB
                    WHEN 'ES' THEN Description_ES
                    WHEN 'CN' THEN Description_CN
                    ELSE Description_GB
                END, ''),
                NULLIF(Description_IT, ''),
                NULLIF(Description_GB, ''),
                NULLIF(Description_ES, ''),
                NULLIF(Description_CN, ''),
                NULLIF(Description_DE, '')
            ) AS Description
        FROM dbo.TWorkflow
        WHERE IDAttore = @IDAttore
            AND (@Search IS NULL OR Description_IT LIKE @Search OR Description_GB LIKE @Search
            OR Description_ES LIKE @Search OR Description_CN LIKE @Search OR Description_DE LIKE @Search)
            AND (@Visibility IS NULL OR IsVisible = @Visibility)
        ORDER BY IDWorkflow DESC
        OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
    `, {
        IDAttore: intInput(IdAttore),
        Search: { type: sql.NVarChar(4000), value: searchTerm },
        Visibility: bitInput(visibility),
        LanguageContext: { type: sql.NVarChar(2), value: languageContext },
        Offset: intInput(offset),
        PageSize: intInput(pageSize)
    }).then(function (result) {
        return {
            rows: result.recordsets[1] || [],
            totalRecord: result.recordsets[0][0].TotalRecord
        };
    });
}

function getVersions(IdWorkflow) {
    return execute(`
        SELECT Version.IDVersioneWorkflow, Version.IDWorkflow, Version.Numero,
            Version.DataIstanza AS DataRegistrazione,
            Version.DataVersione AS DataUltimaModifica,
            Version.IsVisible,
            CASE WHEN EXISTS (
                SELECT 1
                FROM dbo.TEventiTransizioni AS StartNode
                INNER JOIN dbo.TEventiTransizioniDirezioni AS Direction
                    ON Direction.IDTransizioneStart = StartNode.IDEventoTransizione
                INNER JOIN dbo.TEventiTransizioni AS ConnectedNode
                    ON ConnectedNode.IDEventoTransizione = Direction.IDTransizioneEnd
                    AND ConnectedNode.IDVersioneWorkflow = Version.IDVersioneWorkflow
                WHERE StartNode.IDVersioneWorkflow = Version.IDVersioneWorkflow
                    AND StartNode.IsStartNode = 1
                    AND StartNode.IsVisible = 1
                    AND ConnectedNode.IsVisible = 1
                    AND ConnectedNode.IDEventoTransizione <> StartNode.IDEventoTransizione
                    AND Direction.IsVisible = 1
            ) AND EXISTS (
                SELECT 1
                FROM dbo.TEventiTransizioni AS ConnectedNode
                INNER JOIN dbo.TEventiTransizioniDirezioni AS Direction
                    ON Direction.IDTransizioneStart = ConnectedNode.IDEventoTransizione
                INNER JOIN dbo.TEventiTransizioni AS EndNode
                    ON EndNode.IDEventoTransizione = Direction.IDTransizioneEnd
                    AND EndNode.IDVersioneWorkflow = Version.IDVersioneWorkflow
                WHERE ConnectedNode.IDVersioneWorkflow = Version.IDVersioneWorkflow
                    AND ConnectedNode.IsVisible = 1
                    AND EndNode.IsVisible = 1
                    AND ConnectedNode.IDEventoTransizione <> EndNode.IDEventoTransizione
                    AND Direction.IsVisible = 1
                    AND (
                        UPPER(LTRIM(RTRIM(ISNULL(EndNode.Code_IT, '')))) IN ('FINE', 'END')
                        OR UPPER(LTRIM(RTRIM(ISNULL(EndNode.Code_GB, '')))) IN ('FINE', 'END')
                        OR UPPER(LTRIM(RTRIM(ISNULL(EndNode.Code_ES, '')))) IN ('FINE', 'END', 'FIN')
                        OR LTRIM(RTRIM(ISNULL(EndNode.Code_CN, ''))) IN (N'FINE', N'END', N'结束')
                        OR UPPER(LTRIM(RTRIM(ISNULL(EndNode.Text_IT, '')))) IN ('FINE', 'END')
                        OR UPPER(LTRIM(RTRIM(ISNULL(EndNode.Text_GB, '')))) IN ('FINE', 'END')
                        OR UPPER(LTRIM(RTRIM(ISNULL(EndNode.Text_ES, '')))) IN ('FINE', 'END', 'FIN')
                        OR LTRIM(RTRIM(ISNULL(EndNode.Text_CN, ''))) IN (N'FINE', N'END', N'结束')
                    )
            ) THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END AS IsValid
        FROM dbo.TWorkflowVersioni AS Version
        WHERE Version.IDWorkflow = @IDWorkflow
        ORDER BY Version.Numero DESC, Version.IDVersioneWorkflow DESC;
    `, { IDWorkflow: intInput(IdWorkflow) }).then(function (result) {
        return result.recordset;
    });
}

function getVersionEditorDetails(IDVersioneWorkflow, IDAttore, languageContext) {
    return execute(`
        SELECT Version.IDVersioneWorkflow, Version.Numero,
            (SELECT TOP (1) Node.IDProcesso
             FROM dbo.TEventiTransizioni AS Node
             WHERE Node.IDVersioneWorkflow = Version.IDVersioneWorkflow
             ORDER BY Node.IDEventoTransizione) AS IDProcesso,
            COALESCE(
                NULLIF(CASE @LanguageContext
                    WHEN 'IT' THEN Workflow.Description_IT
                    WHEN 'GB' THEN Workflow.Description_GB
                    WHEN 'ES' THEN Workflow.Description_ES
                    WHEN 'CN' THEN Workflow.Description_CN
                    ELSE Workflow.Description_GB
                END, ''),
                NULLIF(Workflow.Description_IT, ''),
                NULLIF(Workflow.Description_GB, ''),
                NULLIF(Workflow.Description_ES, ''),
                NULLIF(Workflow.Description_CN, ''),
                NULLIF(Workflow.Description_DE, '')
            ) AS Description
        FROM dbo.TWorkflowVersioni AS Version
        INNER JOIN dbo.TWorkflow AS Workflow ON Workflow.IDWorkflow = Version.IDWorkflow
        WHERE Version.IDVersioneWorkflow = @IDVersioneWorkflow
            AND Workflow.IDAttore = @IDAttore;
    `, {
        IDVersioneWorkflow: intInput(IDVersioneWorkflow),
        IDAttore: intInput(IDAttore),
        LanguageContext: { type: sql.NVarChar(2), value: languageContext }
    }).then(function (result) {
        return result.recordset[0] || null;
    });
}

function getVersionGraph(IDVersioneWorkflow, IDAttore, LanguageContext) {
    return execute(`
        SET NOCOUNT ON;

        IF NOT EXISTS (
            SELECT 1
            FROM dbo.TWorkflowVersioni AS Version
            INNER JOIN dbo.TWorkflow AS Workflow ON Workflow.IDWorkflow = Version.IDWorkflow
            WHERE Version.IDVersioneWorkflow = @IDVersioneWorkflow
                AND Workflow.IDAttore = @IDAttore
        )
            THROW 50001, 'Workflow version not found.', 1;

        SELECT Node.*,
            Node.IDEventoTransizione AS id,
            Node.XPos AS x,
            Node.YPos AS y,
            CAST(CASE WHEN EXISTS (
                SELECT 1
                FROM dbo.TEventiTransizioniDirezioni AS Direction
                WHERE Direction.IDTransizioneStart = Node.IDEventoTransizione
                    AND Direction.IDTransizioneEnd <> Node.IDEventoTransizione
            ) OR EXISTS (
                SELECT 1
                FROM dbo.TEventiTransizioniDirezioni AS Direction
                WHERE Direction.IDTransizioneEnd = Node.IDEventoTransizione
                    AND Direction.IDTransizioneStart <> Node.IDEventoTransizione
            ) THEN 1 ELSE 0 END AS BIT) AS HasConnection,
            CAST(CASE WHEN EXISTS (
                SELECT 1
                FROM dbo.TEventiTransizioniAzioni AS StateAction
                WHERE StateAction.IDEventoTransizione = Node.IDEventoTransizione
                    AND StateAction.IDProcesso IS NOT NULL
            ) THEN 1 ELSE 0 END AS BIT) AS HasAuthorization,
            CASE @LanguageContext
                WHEN 'IT' THEN Node.Text_IT
                WHEN 'GB' THEN Node.Text_GB
                WHEN 'ES' THEN Node.Text_ES
                WHEN 'CN' THEN Node.Text_CN
            END AS [desc],
            CASE @LanguageContext
                WHEN 'IT' THEN Node.Code_IT
                WHEN 'GB' THEN Node.Code_GB
                WHEN 'ES' THEN Node.Code_ES
                WHEN 'CN' THEN Node.Code_CN
            END AS label
        FROM dbo.TEventiTransizioni AS Node
        WHERE Node.IDVersioneWorkflow = @IDVersioneWorkflow;

        SELECT Direction.*,
            Direction.IDTransizioneStart AS [from],
            Direction.IDTransizioneEnd AS [to],
            CASE @LanguageContext
                WHEN 'IT' THEN Direction.Text_IT
                WHEN 'GB' THEN Direction.Text_GB
                WHEN 'ES' THEN Direction.Text_ES
                WHEN 'CN' THEN Direction.Text_CN
            END AS [event]
        FROM dbo.TEventiTransizioniDirezioni AS Direction
        INNER JOIN dbo.TEventiTransizioni AS StartNode
            ON StartNode.IDEventoTransizione = Direction.IDTransizioneStart
        INNER JOIN dbo.TEventiTransizioni AS EndNode
            ON EndNode.IDEventoTransizione = Direction.IDTransizioneEnd
        WHERE StartNode.IDVersioneWorkflow = @IDVersioneWorkflow
            AND EndNode.IDVersioneWorkflow = @IDVersioneWorkflow;
    `, {
        IDVersioneWorkflow: intInput(IDVersioneWorkflow),
        IDAttore: intInput(IDAttore),
        LanguageContext: { type: sql.NVarChar(2), value: LanguageContext }
    }).then(function (result) {
        return {
            states: result.recordsets[0] || [],
            transitions: result.recordsets[1] || []
        };
    });
}

function getVersionGraphStates(IDVersioneWorkflow, IDAttore, LanguageContext) {
    return execute(`
        IF NOT EXISTS (
            SELECT 1
            FROM dbo.TWorkflowVersioni AS Version
            INNER JOIN dbo.TWorkflow AS Workflow ON Workflow.IDWorkflow = Version.IDWorkflow
            WHERE Version.IDVersioneWorkflow = @IDVersioneWorkflow
                AND Workflow.IDAttore = @IDAttore
        )
            THROW 50001, 'Workflow version not found.', 1;

        SELECT Node.IDEventoTransizione AS IdEventoTransizione,
            CASE @LanguageContext
                WHEN 'IT' THEN Node.Text_IT
                WHEN 'GB' THEN Node.Text_GB
                WHEN 'ES' THEN Node.Text_ES
                WHEN 'CN' THEN Node.Text_CN
            END AS Descrizione,
            COALESCE(NULLIF(LTRIM(RTRIM(Node.HexColor)), ''), '#3498db') AS HexColor
        FROM dbo.TEventiTransizioni AS Node
        WHERE Node.IDVersioneWorkflow = @IDVersioneWorkflow
        ORDER BY Node.IDEventoTransizione;
    `, {
        IDVersioneWorkflow: intInput(IDVersioneWorkflow),
        IDAttore: intInput(IDAttore),
        LanguageContext: { type: sql.NVarChar(2), value: LanguageContext }
    }).then(function (result) {
        return result.recordset || [];
    });
}

function createVersionGraphNode(IDVersioneWorkflow, IDAttore) {
    return execute(`
        EXEC dbo.SP_POST_WORKFLOW_VERSION_NODE
            @IDVersioneWorkflow = @IDVersioneWorkflow,
            @IDAttore = @IDAttore;
    `, {
        IDVersioneWorkflow: intInput(IDVersioneWorkflow),
        IDAttore: intInput(IDAttore)
    }).then(function () {
        return true;
    });
}

function createVersionGraphTransition(IDVersioneWorkflow, IDAttore, startNodeId, endNodeId) {
    return execute(`
        EXEC dbo.SP_POST_WORKFLOW_VERSION_TRANSITION
            @IDVersioneWorkflow = @IDVersioneWorkflow,
            @IDAttore = @IDAttore,
            @StartNodeId = @StartNodeId,
            @EndNodeId = @EndNodeId;
    `, {
        IDVersioneWorkflow: intInput(IDVersioneWorkflow),
        IDAttore: intInput(IDAttore),
        StartNodeId: intInput(startNodeId),
        EndNodeId: intInput(endNodeId)
    }).then(function () {
        return true;
    });
}

function updateVersionGraphNode(IDVersioneWorkflow, IDAttore, IDEventoTransizione, codes, descriptions) {
    return execute(`
        EXEC dbo.SP_PUT_WORKFLOW_VERSION_NODE
            @IDVersioneWorkflow = @IDVersioneWorkflow,
            @IDAttore = @IDAttore,
            @IDEventoTransizione = @IDEventoTransizione,
            @Code_IT = @Code_IT,
            @Code_GB = @Code_GB,
            @Code_ES = @Code_ES,
            @Code_CN = @Code_CN,
            @Text_IT = @Text_IT,
            @Text_GB = @Text_GB,
            @Text_ES = @Text_ES,
            @Text_CN = @Text_CN;
    `, graphTranslationInputs(IDVersioneWorkflow, IDAttore, codes, descriptions, {
        IDEventoTransizione: intInput(IDEventoTransizione)
    })).then(function () {
        return true;
    });
}

function updateVersionGraphTransition(IDVersioneWorkflow, IDAttore, IDEventoDirezione, codes, descriptions) {
    return execute(`
        EXEC dbo.SP_PUT_WORKFLOW_VERSION_TRANSITION
            @IDVersioneWorkflow = @IDVersioneWorkflow,
            @IDAttore = @IDAttore,
            @IDEventoDirezione = @IDEventoDirezione,
            @Code_IT = @Code_IT,
            @Code_GB = @Code_GB,
            @Code_ES = @Code_ES,
            @Code_CN = @Code_CN,
            @Text_IT = @Text_IT,
            @Text_GB = @Text_GB,
            @Text_ES = @Text_ES,
            @Text_CN = @Text_CN;
    `, graphTranslationInputs(IDVersioneWorkflow, IDAttore, codes, descriptions, {
        IDEventoDirezione: intInput(IDEventoDirezione)
    })).then(function () {
        return true;
    });
}

function graphTranslationInputs(IDVersioneWorkflow, IDAttore, codes, descriptions, identifiers) {
    return Object.assign({
        IDVersioneWorkflow: intInput(IDVersioneWorkflow),
        IDAttore: intInput(IDAttore),
        Code_IT: textInput(codes.IT),
        Code_GB: textInput(codes.GB),
        Code_ES: textInput(codes.ES),
        Code_CN: textInput(codes.CN),
        Text_IT: textInput(descriptions.IT),
        Text_GB: textInput(descriptions.GB),
        Text_ES: textInput(descriptions.ES),
        Text_CN: textInput(descriptions.CN)
    }, identifiers);
}

function updateVersionGraphNodePosition(IDVersioneWorkflow, IDAttore, IDEventoTransizione, x, y) {
    return execute(`
        EXEC dbo.SP_PUT_WORKFLOW_VERSION_NODE_POSITION
            @IDVersioneWorkflow = @IDVersioneWorkflow,
            @IDAttore = @IDAttore,
            @IDEventoTransizione = @IDEventoTransizione,
            @XPos = @XPos,
            @YPos = @YPos;
    `, {
        IDVersioneWorkflow: intInput(IDVersioneWorkflow),
        IDAttore: intInput(IDAttore),
        IDEventoTransizione: intInput(IDEventoTransizione),
        XPos: textInput(String(x)),
        YPos: textInput(String(y))
    }).then(function () {
        return true;
    });
}

function deleteVersionGraphNode(IDVersioneWorkflow, IDAttore, IDEventoTransizione) {
    return execute(`
        EXEC dbo.SP_DELETE_WORKFLOW_VERSION_NODE
            @IDVersioneWorkflow = @IDVersioneWorkflow,
            @IDAttore = @IDAttore,
            @IDEventoTransizione = @IDEventoTransizione;
    `, {
        IDVersioneWorkflow: intInput(IDVersioneWorkflow),
        IDAttore: intInput(IDAttore),
        IDEventoTransizione: intInput(IDEventoTransizione)
    }).then(function () {
        return true;
    });
}

function deleteVersionGraphTransition(IDVersioneWorkflow, IDAttore, IDEventoDirezione) {
    return execute(`
        EXEC dbo.SP_DELETE_WORKFLOW_VERSION_TRANSITION
            @IDVersioneWorkflow = @IDVersioneWorkflow,
            @IDAttore = @IDAttore,
            @IDEventoDirezione = @IDEventoDirezione;
    `, {
        IDVersioneWorkflow: intInput(IDVersioneWorkflow),
        IDAttore: intInput(IDAttore),
        IDEventoDirezione: intInput(IDEventoDirezione)
    }).then(function () {
        return true;
    });
}

function createWorkflow(IdAttore, descriptions, isVisible) {
    return execute(`
        INSERT INTO dbo.TWorkflow (
            IDAttore, Description_IT, Description_GB, Description_ES, Description_CN, Description_DE,
            DataIstanza, DataWorkflow, IsVisible
        )
        OUTPUT INSERTED.IDWorkflow
        VALUES (
            @IDAttore, @Description_IT, @Description_GB, @Description_ES, @Description_CN, @Description_DE,
            GETDATE(), GETDATE(), @IsVisible
        );
    `, {
        IDAttore: intInput(IdAttore),
        Description_IT: textInput(descriptions.IT),
        Description_GB: textInput(descriptions.GB),
        Description_ES: textInput(descriptions.ES),
        Description_CN: textInput(descriptions.CN),
        Description_DE: textInput(descriptions.DE),
        IsVisible: bitInput(isVisible)
    }).then(function (result) {
        return result.recordset[0].IDWorkflow;
    });
}

function updateWorkflow(IdWorkflow, descriptions, isVisible) {
    return execute(`
        UPDATE dbo.TWorkflow
        SET Description_IT = @Description_IT,
            Description_GB = @Description_GB,
            Description_ES = @Description_ES,
            Description_CN = @Description_CN,
            Description_DE = @Description_DE,
            IsVisible = @IsVisible
        WHERE IDWorkflow = @IDWorkflow;
        IF @@ROWCOUNT = 0 THROW 50001, 'Workflow record not found.', 1;
    `, {
        IDWorkflow: intInput(IdWorkflow),
        Description_IT: textInput(descriptions.IT),
        Description_GB: textInput(descriptions.GB),
        Description_ES: textInput(descriptions.ES),
        Description_CN: textInput(descriptions.CN),
        Description_DE: textInput(descriptions.DE),
        IsVisible: bitInput(isVisible)
    }).then(function () {
        return true;
    });
}

function deleteWorkflow(IdWorkflow) {
    return execute(`
        SET XACT_ABORT ON;
        BEGIN TRY
            BEGIN TRANSACTION;
            DELETE Direction
            FROM dbo.TEventiTransizioniDirezioni AS Direction
            INNER JOIN dbo.TEventiTransizioni AS Node
                ON Node.IDEventoTransizione = Direction.IDTransizioneStart
                OR Node.IDEventoTransizione = Direction.IDTransizioneEnd
            INNER JOIN dbo.TWorkflowVersioni AS Version
                ON Version.IDVersioneWorkflow = Node.IDVersioneWorkflow
            WHERE Version.IDWorkflow = @IDWorkflow;
            DELETE Node
            FROM dbo.TEventiTransizioni AS Node
            INNER JOIN dbo.TWorkflowVersioni AS Version
                ON Version.IDVersioneWorkflow = Node.IDVersioneWorkflow
            WHERE Version.IDWorkflow = @IDWorkflow;
            DELETE FROM dbo.TWorkflowVersioni WHERE IDWorkflow = @IDWorkflow;
            DELETE FROM dbo.TWorkflow WHERE IDWorkflow = @IDWorkflow;
            IF @@ROWCOUNT = 0 THROW 50001, 'Workflow record not found.', 1;
            COMMIT TRANSACTION;
        END TRY
        BEGIN CATCH
            IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
            THROW;
        END CATCH;
    `, { IDWorkflow: intInput(IdWorkflow) }).then(function () {
        return true;
    });
}

function createVersion(IdWorkflow) {
    return execute(`
        EXEC dbo.SP_POST_WORKFLOW_VERSION @IDWorkflow = @IDWorkflow;
    `, { IDWorkflow: intInput(IdWorkflow) }).then(function (result) {
        return result.recordset[0].IDVersioneWorkflow;
    });
}

function setVersionVisibility(IDVersioneWorkflow, isVisible) {
    return execute(`
        UPDATE dbo.TWorkflowVersioni
        SET IsVisible = @IsVisible
        WHERE IDVersioneWorkflow = @IDVersioneWorkflow;
        IF @@ROWCOUNT = 0 THROW 50001, 'Workflow version not found.', 1;
    `, {
        IDVersioneWorkflow: intInput(IDVersioneWorkflow),
        IsVisible: bitInput(isVisible)
    }).then(function () {
        return true;
    });
}

function deleteVersion(IDVersioneWorkflow) {
    return execute(`
        SET XACT_ABORT ON;
        BEGIN TRY
            BEGIN TRANSACTION;
            DELETE Direction
            FROM dbo.TEventiTransizioniDirezioni AS Direction
            INNER JOIN dbo.TEventiTransizioni AS Node
                ON Node.IDEventoTransizione = Direction.IDTransizioneStart
                OR Node.IDEventoTransizione = Direction.IDTransizioneEnd
            WHERE Node.IDVersioneWorkflow = @IDVersioneWorkflow;
            DELETE FROM dbo.TEventiTransizioni
            WHERE IDVersioneWorkflow = @IDVersioneWorkflow;
            DELETE FROM dbo.TWorkflowVersioni
            WHERE IDVersioneWorkflow = @IDVersioneWorkflow;
            IF @@ROWCOUNT = 0 THROW 50001, 'Workflow version not found.', 1;
            COMMIT TRANSACTION;
        END TRY
        BEGIN CATCH
            IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
            THROW;
        END CATCH;
    `, { IDVersioneWorkflow: intInput(IDVersioneWorkflow) }).then(function () {
        return true;
    });
}

module.exports = {
    getBreadcrumb,
    getRecords,
    getVersions,
    getVersionEditorDetails,
    getVersionGraph,
    getVersionGraphStates,
    createVersionGraphNode,
    createVersionGraphTransition,
    updateVersionGraphNode,
    updateVersionGraphTransition,
    updateVersionGraphNodePosition,
    deleteVersionGraphNode,
    deleteVersionGraphTransition,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    createVersion,
    setVersionVisibility,
    deleteVersion
};
