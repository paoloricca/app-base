const express = require('express');
var exception = require('../model/exception');
const sql = require('mssql/msnodesqlv8');
const config = require('../utils/config')
var connection = require('../config.db');
const processActionTranslations = {
    Lettura: { IT: 'Visualizza', GB: 'View', ES: 'Ver', CN: '查看' },
    Inserimento: { IT: 'Inserisci', GB: 'Create', ES: 'Crear', CN: '新增' },
    Modifica: { IT: 'Modifica', GB: 'Edit', ES: 'Editar', CN: '编辑' },
    Cancellazione: { IT: 'Elimina', GB: 'Delete', ES: 'Eliminar', CN: '删除' },
    AggiungiFornitore: { IT: 'Aggiungi fornitore', GB: 'Add supplier', ES: 'Añadir proveedor', CN: '添加供应商' },
    InvitaFornitori: { IT: 'Invita fornitori', GB: 'Invite suppliers', ES: 'Invitar proveedores', CN: '邀请供应商' },
    ModificaInvito: { IT: 'Modifica invito', GB: 'Edit invitation', ES: 'Editar invitación', CN: '编辑邀请' },
    InvitaFornitore: { IT: 'Invita fornitore', GB: 'Invite supplier', ES: 'Invitar proveedor', CN: '邀请供应商' },
    Anteprima: { IT: 'Anteprima', GB: 'Preview', ES: 'Vista previa', CN: '预览' },
    RegistraFornitore: { IT: 'Imposta come registrato', GB: 'Mark as registered', ES: 'Marcar como registrado', CN: '标记为已注册' },
    AttivaDisattiva: { IT: 'Gestione abilitazione', GB: 'Manage activation', ES: 'Gestionar habilitación', CN: '管理启用状态' },
    ValutaInvito: { IT: 'Valuta invito', GB: 'Evaluate invitation', ES: 'Evaluar invitación', CN: '评估邀请' },
    ComputaInvito: { IT: 'Calcola qualificazione', GB: 'Compute qualification', ES: 'Calcular cualificación', CN: '计算资格' },
    AnteprimaPDF: { IT: 'Esporta PDF', GB: 'Export PDF', ES: 'Exportar PDF', CN: '导出 PDF' },
    AccettaFornitore: { IT: 'Invita automaticamente fornitore', GB: 'Automatically invite supplier', ES: 'Invitar proveedor automáticamente', CN: '自动邀请供应商' },
    ApprovaAnagrafica: { IT: 'Convalida anagrafica', GB: 'Approve registry', ES: 'Validar registro', CN: '核准资料' },
    DisapprovaAnagrafica: { IT: 'Annulla anagrafica', GB: 'Reject registry', ES: 'Rechazar registro', CN: '取消资料' },
    ComputaPerformance: { IT: 'Calcola performance', GB: 'Calculate performance', ES: 'Calcular rendimiento', CN: '计算绩效' },
    InvitaPerformance: { IT: 'Nuovo processo di valutazione', GB: 'New evaluation process', ES: 'Nuevo proceso de evaluación', CN: '新建评估流程' },
    CommutaQualificazione: { IT: 'Commuta qualificazione', GB: 'Toggle qualification', ES: 'Cambiar cualificación', CN: '切换资格状态' },
    QualificaAutomaticamente: { IT: 'Qualifica automaticamente', GB: 'Qualify automatically', ES: 'Calificar automáticamente', CN: '自动认证' },
    ValutaEvento: { IT: 'Valuta evento', GB: 'Evaluate event', ES: 'Evaluar evento', CN: '评估事件' },
    NuovoEvento: { IT: 'Nuovo evento', GB: 'New event', ES: 'Nuevo evento', CN: '新建事件' },
    Partecipa: { IT: 'Partecipa', GB: 'Participate', ES: 'Participar', CN: '参与' },
    Pubblica: { IT: 'Pubblica evento', GB: 'Publish event', ES: 'Publicar evento', CN: '发布事件' },
    Proroga: { IT: 'Proroga evento', GB: 'Extend event', ES: 'Prorrogar evento', CN: '延长事件' },
    Notifica: { IT: 'Notifica', GB: 'Notify', ES: 'Notificar', CN: '通知' },
    VisualizzaStoria: { IT: 'Visualizza storia', GB: 'View history', ES: 'Ver historial', CN: '查看历史' },
    Account: { IT: 'Account', GB: 'Account', ES: 'Cuenta', CN: '账户' }
};

function GetProcessi(myRequest) {
    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIdProcesso = myRequest.IdProcesso;
    var myLanguageContext = myRequest.LanguageContext;
    var myOffsetRows = myRequest.OffsetRows;
    var myNextRows = myRequest.NextRows;

    const customPromise = new Promise((resolve, reject) => {
        try {
            sql.connect(connection, function (err) {
                if (err) {
                    reject(JSON.stringify(
                        new exception(sender, err.message, err.name, err.stack))
                    );
                } else {
                    var request = new sql.Request();

                    request.input('IdProcesso', sql.Int, parseInt(myIdProcesso));
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.output('Status', sql.NVarChar(2))

                    request.execute("SP_GET_PROCESSI", function (err, response) {
                        if (err) {
                            reject(
                                JSON.stringify(new exception(sender, err.message, err.name, err.stack))
                            );
                        } else {
                            var myResponse = JSON.stringify(response);

                            if (JSON.parse(myResponse).recordset.length > 0) {

                                var resultData = JSON.parse(myResponse).recordset;

                                resolve(JSON.stringify(resultData));

                            } else {
                                resolve(JSON.stringify(""));
                            }
                        }
                    });


                }
            })
        }
        catch (err) {
            reject(JSON.stringify(
                new exception(sender, err.message, err.name, err.stack))
            );
        }
    });
    return customPromise
}
function GetProcessiManagement(myRequest) {
    const sender = arguments.callee.name;
    const languageColumns = {
        IT: 'Text_IT',
        GB: 'Text_GB',
        ES: 'Text_ES',
        CN: 'Text_CN'
    };
    const descriptionColumn = languageColumns[myRequest.LanguageContext];
    const parentId = myRequest.IdProcesso == null || myRequest.IdProcesso === ''
        ? null
        : Number(myRequest.IdProcesso);

    if (!descriptionColumn) {
        return Promise.reject(JSON.stringify(
            new exception(sender, 'Unsupported language context', 'ValidationError', '')
        ));
    }

    if (parentId !== null && (!Number.isInteger(parentId) || parentId <= 0)) {
        return Promise.reject(JSON.stringify(
            new exception(sender, 'Invalid parent process ID', 'ValidationError', '')
        ));
    }

    return new Promise((resolve, reject) => {
        try {
            sql.connect(connection, function (err) {
                if (err) {
                    reject(JSON.stringify(
                        new exception(sender, err.message, err.name, err.stack))
                    );
                    return;
                }

                const request = new sql.Request();
                request.input('IdProcessoParent', sql.Int, parentId);
                request.query(
                    `SELECT P.IDProcesso AS IDProc, P.IDProcessoParent,
                            COALESCE(NULLIF(C.[${descriptionColumn}], N''),
                                     NULLIF(C.Text_IT, N''), NULLIF(C.Text_GB, N''),
                                     P.Descrizione) AS Description,
                            COALESCE(NULLIF(PC.[${descriptionColumn}], N''),
                                     NULLIF(PC.Text_IT, N''), NULLIF(PC.Text_GB, N''),
                                     PP.Descrizione) AS ParentDescription,
                            P.HasWorkflow
                     FROM dbo.TProcessi AS P
                     LEFT JOIN dbo.TProcessiCulture AS C ON C.IDProcesso = P.IDProcesso
                     LEFT JOIN dbo.TProcessi AS PP ON PP.IDProcesso = P.IDProcessoParent
                     LEFT JOIN dbo.TProcessiCulture AS PC ON PC.IDProcesso = PP.IDProcesso
                     WHERE (@IdProcessoParent IS NULL AND P.IDProcessoParent IS NULL)
                        OR P.IDProcessoParent = @IdProcessoParent
                     ORDER BY P.Ordine, P.IDProcesso`,
                    function (queryError, result) {
                        if (queryError) {
                            reject(JSON.stringify(
                                new exception(sender, queryError.message, queryError.name, queryError.stack))
                            );
                            return;
                        }

                        resolve(JSON.stringify(result.recordset));
                    }
                );
            });
        } catch (err) {
            reject(JSON.stringify(
                new exception(sender, err.message, err.name, err.stack))
            );
        }
    });
}
function GetProcessiManagementDetails(myRequest) {
    const sender = arguments.callee.name;
    const processId = Number(myRequest.IdProcesso);

    if (!Number.isInteger(processId) || processId <= 0) {
        return Promise.reject(JSON.stringify(
            new exception(sender, 'Invalid process ID', 'ValidationError', '')
        ));
    }

    return new Promise((resolve, reject) => {
        try {
            sql.connect(connection, function (err) {
                if (err) {
                    reject(JSON.stringify(
                        new exception(sender, err.message, err.name, err.stack))
                    );
                    return;
                }

                const request = new sql.Request();
                request.input('IdProcesso', sql.Int, processId);
                request.query(
                    `SELECT P.IDProcesso, P.IDProcessoParent, P.Descrizione,
                            P.PageUrl, P.PageUrlVendor, P.Parameters, P.ImageUrl,
                            P.Ordine, P.IsPublic, P.IsMenu, P.IsSystemConfiguration,
                            P.IsChannel, P.IsVendor, P.IsProcess, P.HasWorkflow,
                            P.LinkedObject, P.ObjectName, P.ObjectPk, P.ObjectFk,
                            C.Text_IT, C.Text_GB, C.Text_ES, C.Text_CN
                     FROM dbo.TProcessi AS P
                     LEFT JOIN dbo.TProcessiCulture AS C ON C.IDProcesso = P.IDProcesso
                     WHERE P.IDProcesso = @IdProcesso`,
                    function (queryError, result) {
                        if (queryError) {
                            reject(JSON.stringify(
                                new exception(sender, queryError.message, queryError.name, queryError.stack))
                            );
                            return;
                        }

                        if (!result.recordset.length) {
                            reject(JSON.stringify(
                                new exception(sender, 'Process was not found', 'ValidationError', '')
                            ));
                            return;
                        }

                        resolve(JSON.stringify(result.recordset[0]));
                    }
                );
            });
        } catch (err) {
            reject(JSON.stringify(
                new exception(sender, err.message, err.name, err.stack))
            );
        }
    });
}
function GetProcessiParentOptions(myRequest) {
    const sender = arguments.callee.name;
    const processId = Number(myRequest.IdProcesso);
    const languageColumns = {
        IT: 'Text_IT',
        GB: 'Text_GB',
        ES: 'Text_ES',
        CN: 'Text_CN'
    };
    const descriptionColumn = languageColumns[myRequest.LanguageContext];

    if (!Number.isInteger(processId) || processId <= 0 || !descriptionColumn) {
        return Promise.reject(JSON.stringify(
            new exception(sender, 'Invalid process ID or language context', 'ValidationError', '')
        ));
    }

    return new Promise((resolve, reject) => {
        try {
            sql.connect(connection, function (err) {
                if (err) {
                    reject(JSON.stringify(
                        new exception(sender, err.message, err.name, err.stack))
                    );
                    return;
                }

                const request = new sql.Request();
                request.input('IdProcesso', sql.Int, processId);
                request.query(
                    `IF NOT EXISTS (SELECT 1 FROM dbo.TProcessi WHERE IDProcesso = @IdProcesso)
                         THROW 50001, 'Process was not found.', 1;

                     ;WITH Descendants AS (
                         SELECT IDProcesso
                         FROM dbo.TProcessi
                         WHERE IDProcesso = @IdProcesso
                         UNION ALL
                         SELECT P.IDProcesso
                         FROM dbo.TProcessi AS P
                         INNER JOIN Descendants AS D ON P.IDProcessoParent = D.IDProcesso
                     )
                     SELECT P.IDProcesso, P.IDProcessoParent,
                            COALESCE(NULLIF(C.[${descriptionColumn}], N''),
                                     NULLIF(C.Text_IT, N''), NULLIF(C.Text_GB, N''),
                                     P.Descrizione) AS Description,
                            COALESCE(NULLIF(PC.[${descriptionColumn}], N''),
                                     NULLIF(PC.Text_IT, N''), NULLIF(PC.Text_GB, N''),
                                     PP.Descrizione) AS ParentDescription
                     FROM dbo.TProcessi AS P
                     LEFT JOIN dbo.TProcessiCulture AS C ON C.IDProcesso = P.IDProcesso
                     LEFT JOIN dbo.TProcessi AS PP ON PP.IDProcesso = P.IDProcessoParent
                     LEFT JOIN dbo.TProcessiCulture AS PC ON PC.IDProcesso = PP.IDProcesso
                     WHERE NOT EXISTS (
                         SELECT 1 FROM Descendants AS D WHERE D.IDProcesso = P.IDProcesso
                     )
                     ORDER BY P.IDProcesso
                     OPTION (MAXRECURSION 32767);`,
                    function (queryError, result) {
                        if (queryError) {
                            reject(JSON.stringify(
                                new exception(sender, queryError.message, queryError.name, queryError.stack))
                            );
                            return;
                        }

                        resolve(JSON.stringify(result.recordset));
                    }
                );
            });
        } catch (err) {
            reject(JSON.stringify(
                new exception(sender, err.message, err.name, err.stack))
            );
        }
    });
}
function UpdateProcessiManagement(myRequest) {
    const sender = arguments.callee.name;
    const processId = Number(myRequest.IdProcesso);
    const process = myRequest.Process;
    const bitFields = [
        'IsPublic', 'IsMenu', 'IsSystemConfiguration', 'IsChannel',
        'IsVendor', 'IsProcess', 'HasWorkflow'
    ];
    const textFields = {
        PageUrl: 50,
        PageUrlVendor: 50,
        Parameters: 255,
        ImageUrl: 100000
    };

    if (!Number.isInteger(processId) || processId <= 0 ||
        !process || typeof process !== 'object' ||
        !process.Descriptions || typeof process.Descriptions !== 'object') {
        return Promise.reject(JSON.stringify(
            new exception(sender, 'Invalid process data', 'ValidationError', '')
        ));
    }

    const parentId = process.IDProcessoParent == null || process.IDProcessoParent === ''
        ? null
        : Number(process.IDProcessoParent);
    const order = process.Ordine == null || process.Ordine === ''
        ? null
        : Number(process.Ordine);
    if ((parentId !== null && (!Number.isInteger(parentId) || parentId <= 0)) ||
        (order !== null && !Number.isInteger(order))) {
        return Promise.reject(JSON.stringify(
            new exception(sender, 'Invalid parent process or order', 'ValidationError', '')
        ));
    }

    const descriptions = {};
    for (const language of ['IT', 'GB', 'ES', 'CN']) {
        const value = process.Descriptions[language];
        if (typeof value !== 'string' || value.length > 50) {
            return Promise.reject(JSON.stringify(
                new exception(sender, 'Descriptions must be strings of at most 50 characters', 'ValidationError', '')
            ));
        }
        descriptions[language] = value.trim();
    }
    if (!descriptions.IT || descriptions.IT.length > 30) {
        return Promise.reject(JSON.stringify(
            new exception(sender, 'The Italian description is required and must be at most 30 characters', 'ValidationError', '')
        ));
    }

    const fields = {};
    for (const [field, maxLength] of Object.entries(textFields)) {
        const value = process[field];
        if (value !== null && value !== undefined && typeof value !== 'string') {
            return Promise.reject(JSON.stringify(
                new exception(sender, field + ' must be a string or null', 'ValidationError', '')
            ));
        }
        fields[field] = value == null || value === '' ? null : value;
        if (fields[field] !== null && fields[field].length > maxLength) {
            return Promise.reject(JSON.stringify(
                new exception(sender, field + ' exceeds its maximum length of ' + maxLength + ' characters', 'ValidationError', '')
            ));
        }
    }

    for (const field of ['LinkedObject', 'ObjectName', 'ObjectPk', 'ObjectFk']) {
        const value = process[field];
        if (value !== null && value !== undefined && typeof value !== 'string') {
            return Promise.reject(JSON.stringify(
                new exception(sender, field + ' must be a string or null', 'ValidationError', '')
            ));
        }
        fields[field] = value == null || value === '' ? null : value;
    }

    for (const field of bitFields) {
        if (typeof process[field] !== 'boolean') {
            return Promise.reject(JSON.stringify(
                new exception(sender, field + ' must be a boolean', 'ValidationError', '')
            ));
        }
    }

    return new Promise((resolve, reject) => {
        try {
            sql.connect(connection, function (err) {
                if (err) {
                    reject(JSON.stringify(
                        new exception(sender, err.message, err.name, err.stack))
                    );
                    return;
                }

                const request = new sql.Request();
                request.input('IdProcesso', sql.Int, processId);
                request.input('IdProcessoParent', sql.Int, parentId);
                request.input('Descrizione', sql.VarChar(30), descriptions.IT);
                request.input('PageUrl', sql.VarChar(50), fields.PageUrl);
                request.input('PageUrlVendor', sql.VarChar(50), fields.PageUrlVendor);
                request.input('Parameters', sql.VarChar(255), fields.Parameters);
                request.input('ImageUrl', sql.VarChar(sql.MAX), fields.ImageUrl);
                request.input('Ordine', sql.Int, order);
                request.input('IsPublic', sql.Bit, process.IsPublic);
                request.input('IsMenu', sql.Bit, process.IsMenu);
                request.input('IsSystemConfiguration', sql.Bit, process.IsSystemConfiguration);
                request.input('IsChannel', sql.Bit, process.IsChannel);
                request.input('IsVendor', sql.Bit, process.IsVendor);
                request.input('IsProcess', sql.Bit, process.IsProcess);
                request.input('HasWorkflow', sql.Bit, process.HasWorkflow);
                request.input('LinkedObject', sql.VarChar(sql.MAX), fields.LinkedObject);
                request.input('ObjectName', sql.VarChar(sql.MAX), fields.ObjectName);
                request.input('ObjectPk', sql.VarChar(sql.MAX), fields.ObjectPk);
                request.input('ObjectFk', sql.VarChar(sql.MAX), fields.ObjectFk);
                request.input('Text_IT', sql.NVarChar(50), descriptions.IT);
                request.input('Text_GB', sql.NVarChar(50), descriptions.GB || null);
                request.input('Text_ES', sql.NVarChar(50), descriptions.ES || null);
                request.input('Text_CN', sql.NVarChar(50), descriptions.CN || null);

                request.query(
                    `SET XACT_ABORT ON;
                     BEGIN TRANSACTION;

                     IF NOT EXISTS (SELECT 1 FROM dbo.TProcessi WITH (UPDLOCK, HOLDLOCK) WHERE IDProcesso = @IdProcesso)
                         THROW 50001, 'Process was not found.', 1;
                     IF @IdProcessoParent IS NOT NULL AND
                        NOT EXISTS (SELECT 1 FROM dbo.TProcessi WHERE IDProcesso = @IdProcessoParent)
                         THROW 50002, 'Parent process was not found.', 1;

                     DECLARE @InvalidParent BIT = 0;
                     ;WITH Descendants AS (
                         SELECT IDProcesso
                         FROM dbo.TProcessi
                         WHERE IDProcesso = @IdProcesso
                         UNION ALL
                         SELECT P.IDProcesso
                         FROM dbo.TProcessi AS P
                         INNER JOIN Descendants AS D ON P.IDProcessoParent = D.IDProcesso
                     )
                     SELECT @InvalidParent = CASE WHEN EXISTS (
                         SELECT 1 FROM Descendants WHERE IDProcesso = @IdProcessoParent
                     ) THEN 1 ELSE 0 END
                     OPTION (MAXRECURSION 32767);

                     IF @InvalidParent = 1
                         THROW 50003, 'A process cannot be moved under itself or one of its descendants.', 1;

                     UPDATE dbo.TProcessi
                     SET IDProcessoParent = @IdProcessoParent,
                         Descrizione = @Descrizione,
                         PageUrl = @PageUrl,
                         PageUrlVendor = @PageUrlVendor,
                         Parameters = @Parameters,
                         ImageUrl = @ImageUrl,
                         Ordine = @Ordine,
                         IsPublic = @IsPublic,
                         IsMenu = @IsMenu,
                         IsSystemConfiguration = @IsSystemConfiguration,
                         IsChannel = @IsChannel,
                         IsVendor = @IsVendor,
                         IsProcess = @IsProcess,
                         HasWorkflow = @HasWorkflow,
                         LinkedObject = @LinkedObject,
                         ObjectName = @ObjectName,
                         ObjectPk = @ObjectPk,
                         ObjectFk = @ObjectFk
                     WHERE IDProcesso = @IdProcesso;

                     IF EXISTS (
                         SELECT 1 FROM dbo.TProcessiCulture WITH (UPDLOCK, HOLDLOCK)
                         WHERE IDProcesso = @IdProcesso
                     )
                     BEGIN
                         UPDATE dbo.TProcessiCulture
                         SET Text_IT = @Text_IT,
                             Text_GB = @Text_GB,
                             Text_ES = @Text_ES,
                             Text_CN = @Text_CN
                         WHERE IDProcesso = @IdProcesso;
                     END
                     ELSE
                     BEGIN
                         INSERT INTO dbo.TProcessiCulture (IDProcesso, Text_IT, Text_GB, Text_ES, Text_CN)
                         VALUES (@IdProcesso, @Text_IT, @Text_GB, @Text_ES, @Text_CN);
                     END;

                     COMMIT TRANSACTION;`,
                    function (queryError) {
                        if (queryError) {
                            reject(JSON.stringify(
                                new exception(sender, queryError.message, queryError.name, queryError.stack))
                            );
                            return;
                        }

                        resolve(JSON.stringify({ IDProcesso: processId }));
                    }
                );
            });
        } catch (err) {
            reject(JSON.stringify(
                new exception(sender, err.message, err.name, err.stack))
            );
        }
    });
}
function CreateProcessiManagement(myRequest) {
    const sender = arguments.callee.name;
    const process = myRequest.Process;
    const bitFields = [
        'IsPublic', 'IsMenu', 'IsSystemConfiguration', 'IsChannel',
        'IsVendor', 'IsProcess', 'HasWorkflow'
    ];
    const textFields = {
        PageUrl: 50,
        PageUrlVendor: 50,
        Parameters: 255,
        ImageUrl: 100000
    };

    if (!process || typeof process !== 'object' ||
        !process.Descriptions || typeof process.Descriptions !== 'object') {
        return Promise.reject(JSON.stringify(
            new exception(sender, 'Invalid process data', 'ValidationError', '')
        ));
    }

    const parentId = Number(process.IDProcessoParent);
    const order = process.Ordine == null || process.Ordine === ''
        ? null
        : Number(process.Ordine);
    if (!Number.isInteger(parentId) || parentId <= 0 ||
        (order !== null && !Number.isInteger(order))) {
        return Promise.reject(JSON.stringify(
            new exception(sender, 'A valid parent process and order are required', 'ValidationError', '')
        ));
    }

    const descriptions = {};
    for (const language of ['IT', 'GB', 'ES', 'CN']) {
        const value = process.Descriptions[language];
        if (typeof value !== 'string' || value.length > 50) {
            return Promise.reject(JSON.stringify(
                new exception(sender, 'Descriptions must be strings of at most 50 characters', 'ValidationError', '')
            ));
        }
        descriptions[language] = value.trim();
    }
    if (!descriptions.IT || descriptions.IT.length > 30) {
        return Promise.reject(JSON.stringify(
            new exception(sender, 'The Italian description is required and must be at most 30 characters', 'ValidationError', '')
        ));
    }

    const fields = {};
    for (const [field, maxLength] of Object.entries(textFields)) {
        const value = process[field];
        if (value !== null && value !== undefined && typeof value !== 'string') {
            return Promise.reject(JSON.stringify(
                new exception(sender, field + ' must be a string or null', 'ValidationError', '')
            ));
        }
        fields[field] = value == null || value === '' ? null : value;
        if (fields[field] !== null && fields[field].length > maxLength) {
            return Promise.reject(JSON.stringify(
                new exception(sender, field + ' exceeds its maximum length of ' + maxLength + ' characters', 'ValidationError', '')
            ));
        }
    }

    for (const field of ['LinkedObject', 'ObjectName', 'ObjectPk', 'ObjectFk']) {
        const value = process[field];
        if (value !== null && value !== undefined && typeof value !== 'string') {
            return Promise.reject(JSON.stringify(
                new exception(sender, field + ' must be a string or null', 'ValidationError', '')
            ));
        }
        fields[field] = value == null || value === '' ? null : value;
    }

    for (const field of bitFields) {
        if (typeof process[field] !== 'boolean') {
            return Promise.reject(JSON.stringify(
                new exception(sender, field + ' must be a boolean', 'ValidationError', '')
            ));
        }
    }

    return new Promise((resolve, reject) => {
        try {
            sql.connect(connection, function (err) {
                if (err) {
                    reject(JSON.stringify(
                        new exception(sender, err.message, err.name, err.stack))
                    );
                    return;
                }

                const request = new sql.Request();
                request.input('IdProcessoParent', sql.Int, parentId);
                request.input('Descrizione', sql.VarChar(30), descriptions.IT);
                request.input('PageUrl', sql.VarChar(50), fields.PageUrl);
                request.input('PageUrlVendor', sql.VarChar(50), fields.PageUrlVendor);
                request.input('Parameters', sql.VarChar(255), fields.Parameters);
                request.input('ImageUrl', sql.VarChar(sql.MAX), fields.ImageUrl);
                request.input('Ordine', sql.Int, order);
                request.input('IsPublic', sql.Bit, process.IsPublic);
                request.input('IsMenu', sql.Bit, process.IsMenu);
                request.input('IsSystemConfiguration', sql.Bit, process.IsSystemConfiguration);
                request.input('IsChannel', sql.Bit, process.IsChannel);
                request.input('IsVendor', sql.Bit, process.IsVendor);
                request.input('IsProcess', sql.Bit, process.IsProcess);
                request.input('HasWorkflow', sql.Bit, process.HasWorkflow);
                request.input('LinkedObject', sql.VarChar(sql.MAX), fields.LinkedObject);
                request.input('ObjectName', sql.VarChar(sql.MAX), fields.ObjectName);
                request.input('ObjectPk', sql.VarChar(sql.MAX), fields.ObjectPk);
                request.input('ObjectFk', sql.VarChar(sql.MAX), fields.ObjectFk);
                request.input('Text_IT', sql.NVarChar(50), descriptions.IT);
                request.input('Text_GB', sql.NVarChar(50), descriptions.GB || null);
                request.input('Text_ES', sql.NVarChar(50), descriptions.ES || null);
                request.input('Text_CN', sql.NVarChar(50), descriptions.CN || null);

                request.query(
                    `SET XACT_ABORT ON;
                     BEGIN TRANSACTION;

                     IF NOT EXISTS (
                         SELECT 1 FROM dbo.TProcessi WITH (UPDLOCK, HOLDLOCK)
                         WHERE IDProcesso = @IdProcessoParent
                     )
                         THROW 50002, 'Parent process was not found.', 1;

                     INSERT INTO dbo.TProcessi (
                         IDProcessoParent, Descrizione, PageUrl, PageUrlVendor,
                         Parameters, ImageUrl, Ordine, IsPublic, IsMenu,
                         IsSystemConfiguration, IsChannel, IsVendor, IsProcess,
                         HasWorkflow, LinkedObject, ObjectName, ObjectPk, ObjectFk
                     )
                     VALUES (
                         @IdProcessoParent, @Descrizione, @PageUrl, @PageUrlVendor,
                         @Parameters, @ImageUrl, @Ordine, @IsPublic, @IsMenu,
                         @IsSystemConfiguration, @IsChannel, @IsVendor, @IsProcess,
                         @HasWorkflow, @LinkedObject, @ObjectName, @ObjectPk, @ObjectFk
                     );

                     DECLARE @IdProcesso INT = SCOPE_IDENTITY();
                     INSERT INTO dbo.TProcessiCulture (IDProcesso, Text_IT, Text_GB, Text_ES, Text_CN)
                     VALUES (@IdProcesso, @Text_IT, @Text_GB, @Text_ES, @Text_CN);

                     COMMIT TRANSACTION;
                     SELECT @IdProcesso AS IDProcesso;`,
                    function (queryError, result) {
                        if (queryError) {
                            reject(JSON.stringify(
                                new exception(sender, queryError.message, queryError.name, queryError.stack))
                            );
                            return;
                        }

                        resolve(JSON.stringify(result.recordset[0]));
                    }
                );
            });
        } catch (err) {
            reject(JSON.stringify(
                new exception(sender, err.message, err.name, err.stack))
            );
        }
    });
}
function DeleteProcessiManagement(myRequest) {
    const sender = arguments.callee.name;
    const processId = Number(myRequest.IdProcesso);

    if (!Number.isInteger(processId) || processId <= 0) {
        return Promise.reject(JSON.stringify(
            new exception(sender, 'Invalid process ID', 'ValidationError', '')
        ));
    }

    return new Promise((resolve, reject) => {
        try {
            sql.connect(connection, function (err) {
                if (err) {
                    reject(JSON.stringify(
                        new exception(sender, err.message, err.name, err.stack))
                    );
                    return;
                }

                const request = new sql.Request();
                request.input('IdProcesso', sql.Int, processId);
                request.query(
                    `SET XACT_ABORT ON;
                     BEGIN TRY
                         BEGIN TRANSACTION;

                         IF NOT EXISTS (
                             SELECT 1 FROM dbo.TProcessi WITH (UPDLOCK, HOLDLOCK)
                             WHERE IDProcesso = @IdProcesso
                         )
                             THROW 50001, 'Process was not found.', 1;

                         DELETE FROM dbo.TProcessiAzioniCustom
                         WHERE IDProcesso = @IdProcesso;
                         DELETE FROM dbo.TProcessiCulture
                         WHERE IDProcesso = @IdProcesso;
                         DELETE FROM dbo.TProcessiHelp
                         WHERE IDProcesso = @IdProcesso;
                         DELETE FROM dbo.TProcessi
                         WHERE IDProcesso = @IdProcesso;

                         COMMIT TRANSACTION;
                         SELECT CAST(NULL AS INT) AS ErrorNumber,
                                CAST(NULL AS NVARCHAR(4000)) AS ErrorMessage;
                     END TRY
                     BEGIN CATCH
                         IF XACT_STATE() <> 0
                             ROLLBACK TRANSACTION;

                         SELECT ERROR_NUMBER() AS ErrorNumber,
                                ERROR_MESSAGE() AS ErrorMessage;
                     END CATCH;`,
                    function (queryError, result) {
                        if (queryError) {
                            reject(JSON.stringify(
                                new exception(sender, queryError.message, queryError.name, queryError.stack))
                            );
                            return;
                        }

                        const databaseError = result.recordset && result.recordset[0];
                        if (databaseError && databaseError.ErrorNumber != null) {
                            const error = databaseError.ErrorNumber === 547
                                ? new exception(
                                    sender,
                                    'The process is referenced by other system records.',
                                    'ProcessHasReferences',
                                    ''
                                )
                                : new exception(
                                    sender,
                                    databaseError.ErrorMessage,
                                    'DatabaseError',
                                    ''
                                );
                            if (databaseError.ErrorNumber === 547) {
                                error.code = 'PROCESS_HAS_REFERENCES';
                            }
                            reject(JSON.stringify(error));
                            return;
                        }

                        resolve(JSON.stringify({ IDProcesso: processId }));
                    }
                );
            });
        } catch (err) {
            reject(JSON.stringify(
                new exception(sender, err.message, err.name, err.stack))
            );
        }
    });
}
function GetProcessiCustomActions(myRequest) {
    const sender = arguments.callee.name;
    const language = myRequest.LanguageContext;
    const processId = Number(myRequest.IdProcesso);

    if (!['IT', 'GB', 'ES', 'CN'].includes(language)) {
        return Promise.reject(JSON.stringify(
            new exception(sender, 'Unsupported language context', 'ValidationError', '')
        ));
    }

    if (!Number.isInteger(processId) || processId <= 0) {
        return Promise.reject(JSON.stringify(
            new exception(sender, 'Invalid process ID', 'ValidationError', '')
        ));
    }

    return new Promise((resolve, reject) => {
        try {
            sql.connect(connection, function (err) {
                if (err) {
                    reject(JSON.stringify(
                        new exception(sender, err.message, err.name, err.stack))
                    );
                    return;
                }

                const request = new sql.Request();
                request.input('IdProcesso', sql.Int, processId);
                request.query(
                    `IF NOT EXISTS (SELECT 1 FROM dbo.TProcessi WHERE IDProcesso = @IdProcesso)
                         THROW 50001, 'Process was not found.', 1;

                     SELECT A.IDProcessoAzione, A.Codice, A.Descrizione,
                            C.IDProcesso AS MappedProcessId,
                            C.Text_IT, C.Text_GB, C.Text_ES, C.Text_CN
                     FROM dbo.TProcessiAzioni AS A
                     LEFT JOIN dbo.TProcessiAzioniCustom AS C
                       ON C.IDProcesso = @IdProcesso
                      AND C.IDProcessoAzione = A.IDProcessoAzione
                     ORDER BY A.IDProcessoAzione`,
                    function (queryError, result) {
                        if (queryError) {
                            reject(JSON.stringify(
                                new exception(sender, queryError.message, queryError.name, queryError.stack))
                            );
                            return;
                        }

                        const actions = result.recordset.map(action => {
                            const translations = processActionTranslations[action.Codice] || {};
                            const description =
                                (action['Text_' + language] && action['Text_' + language].trim()) ||
                                translations[language] ||
                                action.Descrizione ||
                                action.Codice;

                            return {
                                IDProcessoAzione: action.IDProcessoAzione,
                                Codice: action.Codice,
                                Description: description,
                                IsMapped: action.MappedProcessId !== null,
                                Translations: {
                                    IT: action.Text_IT || translations.IT || '',
                                    GB: action.Text_GB || translations.GB || '',
                                    ES: action.Text_ES || translations.ES || '',
                                    CN: action.Text_CN || translations.CN || ''
                                }
                            };
                        });

                        resolve(JSON.stringify(actions));
                    }
                );
            });
        } catch (err) {
            reject(JSON.stringify(
                new exception(sender, err.message, err.name, err.stack))
            );
        }
    });
}
function SetProcessiCustomActionMapping(myRequest) {
    const sender = arguments.callee.name;
    const processId = Number(myRequest.IdProcesso);
    const actionId = Number(myRequest.IdProcessoAzione);
    const isMapped = myRequest.IsMapped;

    if (!Number.isInteger(processId) || processId <= 0 ||
        !Number.isInteger(actionId) || actionId <= 0 ||
        typeof isMapped !== 'boolean') {
        return Promise.reject(JSON.stringify(
            new exception(sender, 'Invalid process action mapping data', 'ValidationError', '')
        ));
    }

    return new Promise((resolve, reject) => {
        try {
            sql.connect(connection, function (err) {
                if (err) {
                    reject(JSON.stringify(
                        new exception(sender, err.message, err.name, err.stack))
                    );
                    return;
                }

                const lookup = new sql.Request();
                lookup.input('IdProcessoAzione', sql.Int, actionId);
                lookup.query(
                    'SELECT Codice FROM dbo.TProcessiAzioni WHERE IDProcessoAzione = @IdProcessoAzione',
                    function (lookupError, result) {
                        if (lookupError) {
                            reject(JSON.stringify(
                                new exception(sender, lookupError.message, lookupError.name, lookupError.stack))
                            );
                            return;
                        }

                        if (!result.recordset.length) {
                            reject(JSON.stringify(
                                new exception(sender, 'Process action was not found', 'ValidationError', '')
                            ));
                            return;
                        }

                        const actionCode = result.recordset[0].Codice;
                        const translations = processActionTranslations[actionCode];
                        if (isMapped && !translations) {
                            reject(JSON.stringify(
                                new exception(sender, 'Translations are not configured for this process action', 'ValidationError', '')
                            ));
                            return;
                        }

                        const request = new sql.Request();
                        request.input('IdProcesso', sql.Int, processId);
                        request.input('IdProcessoAzione', sql.Int, actionId);
                        request.input('IsMapped', sql.Bit, isMapped);
                        request.input('Text_IT', sql.VarChar(500), translations ? translations.IT : null);
                        request.input('Text_GB', sql.VarChar(500), translations ? translations.GB : null);
                        request.input('Text_ES', sql.NVarChar(500), translations ? translations.ES : null);
                        request.input('Text_CN', sql.NVarChar(500), translations ? translations.CN : null);

                        request.query(
                            `SET XACT_ABORT ON;
                             BEGIN TRANSACTION;

                             IF NOT EXISTS (SELECT 1 FROM dbo.TProcessi WHERE IDProcesso = @IdProcesso)
                                 THROW 50001, 'Process was not found.', 1;
                             IF NOT EXISTS (SELECT 1 FROM dbo.TProcessiAzioni WHERE IDProcessoAzione = @IdProcessoAzione)
                                 THROW 50002, 'Process action was not found.', 1;

                             IF @IsMapped = 1
                             BEGIN
                                 IF NOT EXISTS (
                                     SELECT 1
                                     FROM dbo.TProcessiAzioniCustom WITH (UPDLOCK, HOLDLOCK)
                                     WHERE IDProcesso = @IdProcesso
                                       AND IDProcessoAzione = @IdProcessoAzione
                                 )
                                 BEGIN
                                     INSERT INTO dbo.TProcessiAzioniCustom
                                         (IDProcesso, IDProcessoAzione, Text_IT, Text_GB, Text_ES, Text_CN)
                                     VALUES
                                         (@IdProcesso, @IdProcessoAzione, @Text_IT, @Text_GB, @Text_ES, @Text_CN);
                                 END;
                             END
                             ELSE
                             BEGIN
                                 DELETE FROM dbo.TProcessiAzioniCulture
                                 WHERE IDProcesso = @IdProcesso
                                   AND IDProcessoAzione = @IdProcessoAzione;

                                 DELETE FROM dbo.TProcessiAzioniCustom
                                 WHERE IDProcesso = @IdProcesso
                                   AND IDProcessoAzione = @IdProcessoAzione;
                             END;

                             COMMIT TRANSACTION;`,
                            function (queryError) {
                                if (queryError) {
                                    reject(JSON.stringify(
                                        new exception(sender, queryError.message, queryError.name, queryError.stack))
                                    );
                                    return;
                                }

                                resolve(JSON.stringify({ IsMapped: isMapped }));
                            }
                        );
                    }
                );
            });
        } catch (err) {
            reject(JSON.stringify(
                new exception(sender, err.message, err.name, err.stack))
            );
        }
    });
}
function UpdateProcessiCustomActionTranslations(myRequest) {
    const sender = arguments.callee.name;
    const processId = Number(myRequest.IdProcesso);
    const actionId = Number(myRequest.IdProcessoAzione);
    const translations = myRequest.Translations;
    const languages = ['IT', 'GB', 'ES', 'CN'];

    if (!Number.isInteger(processId) || processId <= 0 ||
        !Number.isInteger(actionId) || actionId <= 0 ||
        !translations || typeof translations !== 'object' ||
        languages.some(language =>
            typeof translations[language] !== 'string' ||
            translations[language].trim().length === 0 ||
            translations[language].length > 500
        )) {
        return Promise.reject(JSON.stringify(
            new exception(sender, 'Invalid process action translations', 'ValidationError', '')
        ));
    }

    return new Promise((resolve, reject) => {
        try {
            sql.connect(connection, function (err) {
                if (err) {
                    reject(JSON.stringify(
                        new exception(sender, err.message, err.name, err.stack))
                    );
                    return;
                }

                const request = new sql.Request();
                request.input('IdProcesso', sql.Int, processId);
                request.input('IdProcessoAzione', sql.Int, actionId);
                request.input('Text_IT', sql.VarChar(500), translations.IT);
                request.input('Text_GB', sql.VarChar(500), translations.GB);
                request.input('Text_ES', sql.NVarChar(500), translations.ES);
                request.input('Text_CN', sql.NVarChar(500), translations.CN);
                request.query(
                    `UPDATE dbo.TProcessiAzioniCustom
                     SET Text_IT = @Text_IT,
                         Text_GB = @Text_GB,
                         Text_ES = @Text_ES,
                         Text_CN = @Text_CN
                     WHERE IDProcesso = @IdProcesso
                       AND IDProcessoAzione = @IdProcessoAzione;
                     IF @@ROWCOUNT = 0
                         THROW 50003, 'Mapped process action was not found.', 1;`,
                    function (queryError) {
                        if (queryError) {
                            reject(JSON.stringify(
                                new exception(sender, queryError.message, queryError.name, queryError.stack))
                            );
                            return;
                        }

                        resolve(JSON.stringify({ Translations: translations }));
                    }
                );
            });
        } catch (err) {
            reject(JSON.stringify(
                new exception(sender, err.message, err.name, err.stack))
            );
        }
    });
}
function GetMenu(myRequest) {
    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myLanguageContext = myRequest.LanguageContext;

    const customPromise = new Promise((resolve, reject) => {
        try {
            sql.connect(connection, function (err) {
                if (err) {
                    reject(JSON.stringify(
                        new exception(sender, err.message, err.name, err.stack))
                    );
                } else {
                    var request = new sql.Request();

                    request.input('IdAttore', sql.Int, parseInt(myIdAttore));
                    request.input('IdAccount', sql.Int, parseInt(myIdAccount));
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_GET_MENU", function (err, response) {
                        if (err) {
                            reject(
                                JSON.stringify(new exception(sender, err.message, err.name, err.stack))
                            );
                        } else {
                            var myResponse = JSON.stringify(response);

                            if (JSON.parse(myResponse).recordset.length > 0) {

                                var resultData = JSON.parse(myResponse).recordset;

                                resolve(JSON.stringify(resultData));

                            } else {
                                resolve(JSON.stringify(""));
                            }
                        }
                    });


                }
            })
        }
        catch (err) {
            reject(JSON.stringify(
                new exception(sender, err.message, err.name, err.stack))
            );
        }
    });
    return customPromise
}
function GetMenuChild(myRequest) {

    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIdProcesso = myRequest.IdProcesso;
    var myLanguageContext = myRequest.LanguageContext;

    const customPromise = new Promise((resolve, reject) => {
        try {
            sql.connect(connection, function (err) {
                if (err) {
                    reject(JSON.stringify(
                        new exception(sender, err.message, err.name, err.stack))
                    );
                } else {
                    var request = new sql.Request();

                    request.input('IdAttore', sql.Int, parseInt(myIdAttore));
                    request.input('IdAccount', sql.Int, parseInt(myIdAccount));
                    request.input('IdProcessoParent', sql.Int, parseInt(myIdProcesso));
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_GET_MENU_CHILD", function (err, response) {
                        if (err) {
                            reject(
                                JSON.stringify(new exception(sender, err.message, err.name, err.stack))
                            );
                        } else {
                            var myResponse = JSON.stringify(response);

                            if (JSON.parse(myResponse).recordset.length > 0) {

                                var resultData = JSON.parse(myResponse).recordset;

                                resolve(JSON.stringify(resultData));

                            } else {
                                resolve(JSON.stringify(""));
                            }
                        }
                    });


                }
            })
        }
        catch (err) {
            reject(JSON.stringify(
                new exception(sender, err.message, err.name, err.stack))
            );
        }
    });
    return customPromise
}

module.exports = {
    GetProcessi,
    GetProcessiManagement,
    GetProcessiManagementDetails,
    GetProcessiParentOptions,
    UpdateProcessiManagement,
    CreateProcessiManagement,
    DeleteProcessiManagement,
    GetProcessiCustomActions,
    SetProcessiCustomActionMapping,
    UpdateProcessiCustomActionTranslations,
    GetMenu,
    GetMenuChild
}
