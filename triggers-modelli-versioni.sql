CREATE OR ALTER TRIGGER dbo.TR_TModelliClassi_UpdateDataIstanza
ON dbo.TModelliClassi
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    ;WITH ChangedVersions AS (
        SELECT IDVersione
        FROM inserted
        WHERE IDVersione IS NOT NULL
        UNION
        SELECT IDVersione
        FROM deleted
        WHERE IDVersione IS NOT NULL
    )
    UPDATE versions
    SET DataIstanza = GETDATE()
    FROM dbo.TModelliVersioni AS versions
    INNER JOIN ChangedVersions AS changed
        ON changed.IDVersione = versions.IDVersione;
END;
GO

CREATE OR ALTER TRIGGER dbo.TR_TModelliClassiAttributi_UpdateDataIstanza
ON dbo.TModelliClassiAttributi
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    ;WITH ChangedClasses AS (
        SELECT IDClasse FROM inserted
        UNION
        SELECT IDClasse FROM deleted
    ),
    ChangedVersions AS (
        SELECT DISTINCT IDVersione
        FROM dbo.TModelliClassi AS classes
        INNER JOIN ChangedClasses AS changed
            ON changed.IDClasse = classes.IDClasse
        WHERE classes.IDVersione IS NOT NULL
    )
    UPDATE versions
    SET DataIstanza = GETDATE()
    FROM dbo.TModelliVersioni AS versions
    INNER JOIN ChangedVersions AS changed
        ON changed.IDVersione = versions.IDVersione;
END;
GO