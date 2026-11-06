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

function workflowProtectedNodeSql(nodeAlias) {
    const nodeTexts = ['Code_IT', 'Code_GB', 'Code_ES', 'Code_CN', 'Text_IT', 'Text_GB', 'Text_ES', 'Text_CN'];
    const startLabels = "('INIZIO', 'START', 'INICIO', N'开始')";
    const endLabels = "('FINE', 'END', 'FIN', N'结束')";
    const hasLabel = function (labels) {
        return nodeTexts.map(function (field) {
            return `UPPER(LTRIM(RTRIM(ISNULL(${nodeAlias}.${field}, '')))) IN ${labels}`;
        }).join(' OR ');
    };

    return `(
        ISNULL(${nodeAlias}.IsStartNode, 0) = 1
        OR ${hasLabel(startLabels)}
        OR ${hasLabel(endLabels)}
    )`;
}

function workflowVersionIsHealthySql(versionAlias) {
    const nodeConditions = `
        Node.IDVersioneWorkflow = ${versionAlias}.IDVersioneWorkflow
        AND Node.IsVisible = 1
        AND NOT ${workflowProtectedNodeSql('Node')}
    `;
    const hasConnection = `
        EXISTS (
            SELECT 1
            FROM dbo.TEventiTransizioniDirezioni AS Direction
            INNER JOIN dbo.TEventiTransizioni AS ConnectedNode
                ON ConnectedNode.IDEventoTransizione = Direction.IDTransizioneEnd
            WHERE Direction.IDTransizioneStart = Node.IDEventoTransizione
                AND Direction.IDTransizioneEnd <> Node.IDEventoTransizione
                AND Direction.IsVisible = 1
                AND ConnectedNode.IsVisible = 1
                AND ConnectedNode.IDVersioneWorkflow = Node.IDVersioneWorkflow
        )
        OR EXISTS (
            SELECT 1
            FROM dbo.TEventiTransizioniDirezioni AS Direction
            INNER JOIN dbo.TEventiTransizioni AS ConnectedNode
                ON ConnectedNode.IDEventoTransizione = Direction.IDTransizioneStart
            WHERE Direction.IDTransizioneEnd = Node.IDEventoTransizione
                AND Direction.IDTransizioneStart <> Node.IDEventoTransizione
                AND Direction.IsVisible = 1
                AND ConnectedNode.IsVisible = 1
                AND ConnectedNode.IDVersioneWorkflow = Node.IDVersioneWorkflow
        )
    `;
    const hasOwner = `
        EXISTS (
            SELECT 1
            FROM dbo.TEventiTransizioniOwner AS NodeOwner
            WHERE NodeOwner.IDEventoTransizione = Node.IDEventoTransizione
                AND (
                    NULLIF(LTRIM(RTRIM(NodeOwner.IsCreator)), '') IS NOT NULL
                    OR NULLIF(LTRIM(RTRIM(NodeOwner.IsAdminOwnerSelectedNode)), '') IS NOT NULL
                    OR NULLIF(LTRIM(RTRIM(NodeOwner.IsAdminOfCreator)), '') IS NOT NULL
                    OR NULLIF(LTRIM(RTRIM(NodeOwner.IsOwnerSelectedNode)), '') IS NOT NULL
                    OR NULLIF(LTRIM(RTRIM(NodeOwner.IsCreatorSelectedNode)), '') IS NOT NULL
                    OR NULLIF(LTRIM(RTRIM(NodeOwner.IsSelectedProfile)), '') IS NOT NULL
                    OR NULLIF(LTRIM(RTRIM(NodeOwner.IsUsersFromAdminProfileCreator)), '') IS NOT NULL
                )
        )
    `;
    const hasAuthorization = `
        EXISTS (
            SELECT 1
            FROM dbo.TEventiTransizioniAzioni AS StateAction
            WHERE StateAction.IDEventoTransizione = Node.IDEventoTransizione
                AND StateAction.IDProcesso IS NOT NULL
        )
    `;

    return `CASE WHEN EXISTS (
        SELECT 1
        FROM dbo.TEventiTransizioni AS Node
        WHERE ${nodeConditions}
    ) AND NOT EXISTS (
        SELECT 1
        FROM dbo.TEventiTransizioni AS Node
        WHERE ${nodeConditions}
            AND NOT ((${hasConnection}) AND (${hasOwner}) AND (${hasAuthorization}))
    ) THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END`;
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
            CASE WHEN EXISTS (SELECT 1 FROM dbo.TWorkflowVersioni AS V WHERE V.IDWorkflow = TWorkflow.IDWorkflow)
                AND NOT EXISTS (
                    SELECT 1 FROM dbo.TWorkflowVersioni AS V
                    WHERE V.IDWorkflow = TWorkflow.IDWorkflow
                        AND (${workflowVersionIsHealthySql('V')}) = 0
                ) THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END AS IsValid,
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
            ${workflowVersionIsHealthySql('Version')} AS IsValid
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
                INNER JOIN dbo.TEventiTransizioni AS ConnectedNode
                    ON ConnectedNode.IDEventoTransizione = Direction.IDTransizioneEnd
                WHERE Direction.IDTransizioneStart = Node.IDEventoTransizione
                    AND Direction.IDTransizioneEnd <> Node.IDEventoTransizione
                    AND Direction.IsVisible = 1
                    AND ConnectedNode.IsVisible = 1
                    AND ConnectedNode.IDVersioneWorkflow = @IDVersioneWorkflow
            ) OR EXISTS (
                SELECT 1
                FROM dbo.TEventiTransizioniDirezioni AS Direction
                INNER JOIN dbo.TEventiTransizioni AS ConnectedNode
                    ON ConnectedNode.IDEventoTransizione = Direction.IDTransizioneStart
                WHERE Direction.IDTransizioneEnd = Node.IDEventoTransizione
                    AND Direction.IDTransizioneStart <> Node.IDEventoTransizione
                    AND Direction.IsVisible = 1
                    AND ConnectedNode.IsVisible = 1
                    AND ConnectedNode.IDVersioneWorkflow = @IDVersioneWorkflow
            ) THEN 1 ELSE 0 END AS BIT) AS HasConnection,
            CAST(CASE WHEN EXISTS (
                SELECT 1
                FROM dbo.TEventiTransizioniAzioni AS StateAction
                WHERE StateAction.IDEventoTransizione = Node.IDEventoTransizione
                    AND StateAction.IDProcesso IS NOT NULL
            ) THEN 1 ELSE 0 END AS BIT) AS HasAuthorization,
            CAST(CASE WHEN EXISTS (
                SELECT 1 FROM dbo.TEventiTransizioniTiming AS Timing
                WHERE Timing.IDEventoTransizione = Node.IDEventoTransizione
                    AND Timing.TimingType IN (0, 1) AND Timing.TimingActive = 1
            ) THEN 1 ELSE 0 END AS BIT) AS HasTiming,
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
        WHERE Node.IDVersioneWorkflow = @IDVersioneWorkflow
            AND Node.IsVisible = 1;

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
            AND EndNode.IDVersioneWorkflow = @IDVersioneWorkflow
            AND StartNode.IsVisible = 1
            AND EndNode.IsVisible = 1
            AND Direction.IsVisible = 1;
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

function getNodeTiming(versionId, actorId, nodeId, language) {
    return execute(`
        IF NOT EXISTS (
            SELECT 1 FROM dbo.TEventiTransizioni AS N
            INNER JOIN dbo.TWorkflowVersioni AS V ON V.IDVersioneWorkflow = N.IDVersioneWorkflow
            INNER JOIN dbo.TWorkflow AS W ON W.IDWorkflow = V.IDWorkflow
            WHERE N.IDEventoTransizione = @Node AND N.IDVersioneWorkflow = @Version
                AND W.IDAttore = @Actor AND N.IsVisible = 1
        ) THROW 50001, 'Workflow node not found.', 1;
        IF EXISTS (
            SELECT 1 FROM dbo.TEventiTransizioniTiming
            WHERE IDEventoTransizione = @Node AND TimingType IN (0, 1)
            GROUP BY TimingType HAVING COUNT(*) > 1
        ) THROW 50001, 'Configurazioni intervallo duplicate per il nodo.', 1;
        SELECT T.TimingType, T.TimingActive, T.ValidityType, T.ValidityTime,
            T.JumpToTransition, CASE @Language
                WHEN 'IT' THEN N.Text_IT WHEN 'GB' THEN N.Text_GB
                WHEN 'ES' THEN N.Text_ES WHEN 'CN' THEN N.Text_CN END AS TargetDescription
        FROM dbo.TEventiTransizioniTiming AS T
        LEFT JOIN dbo.TEventiTransizioni AS N ON N.IDEventoTransizione = T.JumpToTransition
        WHERE T.IDEventoTransizione = @Node AND T.TimingType IN (0, 1);
    `, {
        Version: intInput(versionId), Actor: intInput(actorId), Node: intInput(nodeId),
        Language: { type: sql.NVarChar(2), value: language }
    }).then(function (result) { return result.recordset; });
}

function saveNodeTiming(versionId, actorId, nodeId, intervals) {
    const min = intervals[0], max = intervals[1];
    return execute(`
        SET XACT_ABORT ON;
        BEGIN TRY
            BEGIN TRANSACTION;
            IF NOT EXISTS (
                SELECT 1 FROM dbo.TEventiTransizioni AS N WITH (UPDLOCK, HOLDLOCK)
                INNER JOIN dbo.TWorkflowVersioni AS V ON V.IDVersioneWorkflow = N.IDVersioneWorkflow
                INNER JOIN dbo.TWorkflow AS W ON W.IDWorkflow = V.IDWorkflow
                WHERE N.IDEventoTransizione = @Node AND N.IDVersioneWorkflow = @Version
                    AND W.IDAttore = @Actor AND N.IsVisible = 1
            ) THROW 50001, 'Workflow node not found.', 1;
            IF @MaxActive = 1 AND NOT EXISTS (
                SELECT 1 FROM dbo.TEventiTransizioni WITH (UPDLOCK, HOLDLOCK)
                WHERE IDEventoTransizione = @Target AND IDVersioneWorkflow = @Version
                    AND IsVisible = 1 AND IDEventoTransizione <> @Node
            ) THROW 50001, 'Stato automatico non valido.', 1;
            IF EXISTS (
                SELECT 1 FROM dbo.TEventiTransizioniTiming WITH (UPDLOCK, HOLDLOCK)
                WHERE IDEventoTransizione = @Node AND TimingType IN (0, 1)
                GROUP BY TimingType HAVING COUNT(*) > 1
            ) THROW 50001, 'Configurazioni intervallo duplicate per il nodo.', 1;

            UPDATE dbo.TEventiTransizioniTiming
            SET TimingActive = @MinActive,
                ValidityType = CASE WHEN @MinActive = 1 THEN @MinType ELSE ValidityType END,
                ValidityTime = CASE WHEN @MinActive = 1 THEN @MinTime ELSE ValidityTime END
            WHERE IDEventoTransizione = @Node AND TimingType = 0;
            IF @@ROWCOUNT = 0 AND @MinActive = 1
                INSERT dbo.TEventiTransizioniTiming (IDEventoTransizione, TimingType, TimingActive, ValidityType, ValidityTime)
                VALUES (@Node, 0, 1, @MinType, @MinTime);

            UPDATE dbo.TEventiTransizioniTiming
            SET TimingActive = @MaxActive,
                ValidityType = CASE WHEN @MaxActive = 1 THEN @MaxType ELSE ValidityType END,
                ValidityTime = CASE WHEN @MaxActive = 1 THEN @MaxTime ELSE ValidityTime END,
                JumpToTransition = CASE WHEN @MaxActive = 1 THEN @Target ELSE JumpToTransition END
            WHERE IDEventoTransizione = @Node AND TimingType = 1;
            IF @@ROWCOUNT = 0 AND @MaxActive = 1
                INSERT dbo.TEventiTransizioniTiming (IDEventoTransizione, TimingType, TimingActive, ValidityType, ValidityTime, JumpToTransition)
                VALUES (@Node, 1, 1, @MaxType, @MaxTime, @Target);
            COMMIT TRANSACTION;
        END TRY
        BEGIN CATCH
            IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
            THROW;
        END CATCH;
    `, {
        Version: intInput(versionId), Actor: intInput(actorId), Node: intInput(nodeId),
        MinActive: bitInput(min.active), MinType: intInput(min.validityType), MinTime: intInput(min.validityTime),
        MaxActive: bitInput(max.active), MaxType: intInput(max.validityType), MaxTime: intInput(max.validityTime),
        Target: intInput(max.target)
    }).then(function () { return true; });
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
            AND Node.IsVisible = 1
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
        SET XACT_ABORT ON;
        BEGIN TRY
            BEGIN TRANSACTION;
            IF NOT EXISTS (
                SELECT 1 FROM dbo.TEventiTransizioni AS N WITH (UPDLOCK, HOLDLOCK)
                INNER JOIN dbo.TWorkflowVersioni AS V ON V.IDVersioneWorkflow = N.IDVersioneWorkflow
                INNER JOIN dbo.TWorkflow AS W ON W.IDWorkflow = V.IDWorkflow
                WHERE N.IDEventoTransizione = @IDEventoTransizione
                    AND N.IDVersioneWorkflow = @IDVersioneWorkflow AND W.IDAttore = @IDAttore
            ) THROW 50001, 'Workflow node not found.', 1;
            IF EXISTS (
                SELECT 1 FROM dbo.TEventiTransizioniTiming WITH (UPDLOCK, HOLDLOCK)
                WHERE JumpToTransition = @IDEventoTransizione
                    AND IDEventoTransizione <> @IDEventoTransizione
            ) THROW 50001, 'Lo stato e usato come destinazione di un intervallo durata.', 1;
            DELETE dbo.TEventiTransizioniTiming WHERE IDEventoTransizione = @IDEventoTransizione;
            EXEC dbo.SP_DELETE_WORKFLOW_VERSION_NODE
                @IDVersioneWorkflow = @IDVersioneWorkflow,
                @IDAttore = @IDAttore,
                @IDEventoTransizione = @IDEventoTransizione;
            COMMIT TRANSACTION;
        END TRY
        BEGIN CATCH
            IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
            THROW;
        END CATCH;
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
            DECLARE @Nodes TABLE (IDEventoTransizione INT PRIMARY KEY);
            INSERT INTO @Nodes
            SELECT IDEventoTransizione FROM dbo.TEventiTransizioni
            WHERE IDVersioneWorkflow = @IDVersioneWorkflow;
            DECLARE @Directions TABLE (IDEventoDirezione INT PRIMARY KEY);
            INSERT INTO @Directions
            SELECT IDEventoDirezione FROM dbo.TEventiTransizioniDirezioni
            WHERE IDTransizioneStart IN (SELECT IDEventoTransizione FROM @Nodes)
                OR IDTransizioneEnd IN (SELECT IDEventoTransizione FROM @Nodes);
            DELETE FROM dbo.TEventiTransizioniAzioniFilter
            WHERE IDEventoTransizione IN (SELECT IDEventoTransizione FROM @Nodes)
                OR IDEventoAzione IN (SELECT IDEventoAzione FROM dbo.TEventiTransizioniAzioni
                    WHERE IDEventoTransizione IN (SELECT IDEventoTransizione FROM @Nodes));
            DELETE FROM dbo.TEventiTransizioniFilter
            WHERE IDEventoTransizione IN (SELECT IDEventoTransizione FROM @Nodes)
                OR IDEventoDirezione IN (SELECT IDEventoDirezione FROM @Directions);
            DELETE FROM dbo.TEventiTransizioniAzioni WHERE IDEventoTransizione IN (SELECT IDEventoTransizione FROM @Nodes);
            DELETE FROM dbo.TEventiTransizioniVendor WHERE IDEventoTransizione IN (SELECT IDEventoTransizione FROM @Nodes);
            DELETE FROM dbo.TEventiTransizioniTiming WHERE IDEventoTransizione IN (SELECT IDEventoTransizione FROM @Nodes);
            DELETE FROM dbo.TEventiTransizioniOwner WHERE IDEventoTransizione IN (SELECT IDEventoTransizione FROM @Nodes);
            DELETE FROM dbo.TEventiStati WHERE IDEventoTransizione IN (SELECT IDEventoTransizione FROM @Nodes);
            DELETE FROM dbo.TEventiTransizioniDirezioni WHERE IDEventoDirezione IN (SELECT IDEventoDirezione FROM @Directions);
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
    getRecords,
    getVersions,
    getVersionEditorDetails,
    getVersionGraph,
    getVersionGraphStates,
    getNodeTiming,
    saveNodeTiming,
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
