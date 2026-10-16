SET XACT_ABORT ON;

DECLARE @ProcessId INT;
SELECT @ProcessId = IDProcesso
FROM dbo.TProcessi
WHERE PageUrl = 'Configuration/frmSystemUsers';

IF (SELECT COUNT(*) FROM dbo.TProcessi WHERE PageUrl = 'Configuration/frmSystemUsers') <> 1
    THROW 50001, 'The system users process must match exactly one record.', 1;

IF (SELECT COUNT(*) FROM dbo.TProcessiAzioni WHERE Codice IN ('Inserimento', 'Modifica', 'Cancellazione')) <> 3
    THROW 50002, 'One or more system users actions were not found.', 1;

IF NOT EXISTS (
    SELECT 1
    FROM dbo.TProcessiAzioni
    WHERE Codice = 'Inserimento' AND IsPrimary = 1
)
    THROW 50003, 'The Inserimento action must be marked as primary.', 1;

DECLARE @Actions TABLE (
    Codice VARCHAR(30) NOT NULL,
    Text_IT VARCHAR(MAX) NOT NULL,
    Text_GB VARCHAR(MAX) NOT NULL,
    Text_ES NVARCHAR(MAX) NOT NULL,
    Text_CN NVARCHAR(MAX) NOT NULL
);

INSERT INTO @Actions (Codice, Text_IT, Text_GB, Text_ES, Text_CN)
VALUES
    ('Inserimento', 'Inserimento', 'Insert', N'Insertar', N'插入'),
    ('Modifica', 'Modifica', 'Edit', N'Editar', N'编辑'),
    ('Cancellazione', 'Elimina', 'Delete', N'Eliminar', N'删除'),
    ('Account', 'Account', 'Account', N'Cuenta', N'账户');

BEGIN TRANSACTION;

DECLARE @AccountActionId INT;
SELECT @AccountActionId = ISNULL(MAX(IDProcessoAzione), 0) + 1
FROM dbo.TProcessiAzioni WITH (TABLOCKX, HOLDLOCK);

IF NOT EXISTS (SELECT 1 FROM dbo.TProcessiAzioni WHERE Codice = 'Account')
BEGIN
    INSERT INTO dbo.TProcessiAzioni
        (IDProcessoAzione, Codice, Descrizione, IsPrimary, IsAutomatic, IsConfirm)
    VALUES (@AccountActionId, 'Account', 'Account', 0, 0, 0);
END;

IF (SELECT COUNT(*) FROM dbo.TProcessiAzioni WHERE Codice = 'Account') <> 1
    THROW 50004, 'The Account action must match exactly one record.', 1;

UPDATE processAction
SET Text_IT = action.Text_IT,
    Text_GB = action.Text_GB,
    Text_ES = action.Text_ES,
    Text_CN = action.Text_CN
FROM dbo.TProcessiAzioniCustom processAction
INNER JOIN dbo.TProcessiAzioni processPermission
    ON processPermission.IDProcessoAzione = processAction.IDProcessoAzione
INNER JOIN @Actions action
    ON action.Codice = processPermission.Codice
WHERE processAction.IDProcesso = @ProcessId;

INSERT INTO dbo.TProcessiAzioniCustom
    (IDProcesso, IDProcessoAzione, Text_IT, Text_GB, Text_ES, Text_CN)
SELECT @ProcessId, processPermission.IDProcessoAzione,
    action.Text_IT, action.Text_GB, action.Text_ES, action.Text_CN
FROM @Actions action
INNER JOIN dbo.TProcessiAzioni processPermission
    ON processPermission.Codice = action.Codice
WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.TProcessiAzioniCustom processAction
    WHERE processAction.IDProcesso = @ProcessId
        AND processAction.IDProcessoAzione = processPermission.IDProcessoAzione
);

COMMIT TRANSACTION;
