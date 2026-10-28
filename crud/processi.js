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
                            P.HasWorkflow
                     FROM dbo.TProcessi AS P
                     LEFT JOIN dbo.TProcessiCulture AS C ON C.IDProcesso = P.IDProcesso
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
    GetProcessiCustomActions,
    SetProcessiCustomActionMapping,
    UpdateProcessiCustomActionTranslations,
    GetMenu,
    GetMenuChild
}
