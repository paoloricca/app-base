const crypto = require('crypto');
const sql = require('mssql/msnodesqlv8');
const connection = require('../config.db');

function createError(code) {
    const error = new Error(code);
    error.code = code;
    return error;
}

function parseId(value) {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) {
        throw createError('INVALID_INPUT');
    }
    return id;
}

function parseDate(value) {
    if (value === undefined || value === null || value === '') {
        return null;
    }
    const dateParts = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
    if (dateParts) {
        const day = Number(dateParts[1]);
        const month = Number(dateParts[2]);
        const year = Number(dateParts[3]);
        const date = new Date(year, month - 1, day);
        if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
            throw createError('INVALID_BIRTH_DATE');
        }
        return date;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw createError('INVALID_BIRTH_DATE');
    }
    return date;
}

function parseNullableBit(value) {
    if (value === undefined || value === null || value === '' || value === 'null') {
        return null;
    }
    if (value === true || value === 1 || value === 'true' || value === '1' || value === 'on') {
        return true;
    }
    if (value === false || value === 0 || value === 'false' || value === '0' || value === 'off') {
        return false;
    }
    throw createError('INVALID_INPUT');
}

function readPersonaFields(body) {
    const nome = typeof body.Nome === 'string' ? body.Nome.trim() : '';
    const cognome = typeof body.Cognome === 'string' ? body.Cognome.trim() : '';
    const codiceFiscale = typeof body.CodiceFiscale === 'string' ? body.CodiceFiscale.trim() : '';
    const sesso = typeof body.Sesso === 'string' ? body.Sesso.trim() : '';

    if (!nome || nome.length > 50 || !cognome || cognome.length > 50 ||
        codiceFiscale.length > 16 || sesso.length > 10) {
        throw createError('INVALID_PERSON_FIELDS');
    }

    return {
        Nome: nome,
        Cognome: cognome,
        DataNascita: parseDate(body.DataNascita),
        CodiceFiscale: codiceFiscale || null,
        Sesso: sesso || null,
        IsPublic: parseNullableBit(body.IsPublic)
    };
}

function parseSessionAccountId(value) {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) {
        throw createError('INVALID_SESSION_ACCOUNT');
    }
    return id;
}

function parseSessionProfileId(value) {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) {
        throw createError('INVALID_SESSION_PROFILE');
    }
    return id;
}

function parseSessionActorId(value) {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) {
        throw createError('INVALID_SESSION_ACTOR');
    }
    return id;
}

function readAccountFields(body) {
    const email = typeof body.Email === 'string' ? body.Email.trim() : '';
    if (email.length > 50 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw createError('INVALID_EMAIL');
    }
    const isPublic = parseNullableBit(body.IsPublic);
    const isVisible = parseNullableBit(body.IsVisible);
    if (isPublic === null || isVisible === null) {
        throw createError('INVALID_INPUT');
    }
    return { email, isPublic, isVisible };
}

function generateAccountPassword() {
    const characterSets = [
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'abcdefghijklmnopqrstuvwxyz',
        '0123456789',
        '!@#$%^&*()-_=+'
    ];
    const allCharacters = characterSets.join('');
    const characters = characterSets.map((set) => set[crypto.randomInt(set.length)]);
    while (characters.length < 15) {
        characters.push(allCharacters[crypto.randomInt(allCharacters.length)]);
    }
    for (let index = characters.length - 1; index > 0; index -= 1) {
        const swapIndex = crypto.randomInt(index + 1);
        [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
    }
    return characters.join('');
}

function bindPersonaFields(request, fields, idIstanziatore) {
    request.input('Nome', sql.VarChar(50), fields.Nome);
    request.input('Cognome', sql.VarChar(50), fields.Cognome);
    request.input('DataNascita', sql.DateTime, fields.DataNascita);
    request.input('CodiceFiscale', sql.VarChar(16), fields.CodiceFiscale);
    request.input('Sesso', sql.Char(10), fields.Sesso);
    request.input('IsPublic', sql.Bit, fields.IsPublic);
    if (idIstanziatore !== undefined && idIstanziatore !== null) {
        request.input('IDIstanziatore', sql.Int, idIstanziatore);
    }
}

async function GetPersone(options) {
    const pageIndex = Number(options.pageIndex);
    const pageSize = Number(options.pageSize);
    if (!Number.isSafeInteger(pageIndex) || pageIndex < 1 ||
        !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100 ||
        (pageIndex - 1) * pageSize > 2147483647) {
        throw createError('INVALID_INPUT');
    }

    const nome = typeof options.nome === 'string' ? options.nome.trim() : '';
    const cognome = typeof options.cognome === 'string' ? options.cognome.trim() : '';
    if (nome.length > 50 || cognome.length > 50) {
        throw createError('INVALID_INPUT');
    }
    const isPublic = parseNullableBit(options.isPublic);

    await sql.connect(connection);
    const request = new sql.Request();
    request.input('Nome', sql.VarChar(50), nome);
    request.input('Cognome', sql.VarChar(50), cognome);
    request.input('IsPublic', sql.Bit, isPublic);
    request.input('OffsetRows', sql.Int, (pageIndex - 1) * pageSize);
    request.input('NextRows', sql.Int, pageSize);

    const where = `WHERE (@Nome = '' OR p.Nome LIKE '%' + @Nome + '%')
        AND (@Cognome = '' OR p.Cognome LIKE '%' + @Cognome + '%')
        AND (@IsPublic IS NULL OR p.IsPublic = @IsPublic)`;
    const result = await request.query(`
        SELECT COUNT_BIG(*) AS TotalRecord
        FROM dbo.TPersone p
        ${where};

        SELECT p.IDPersona, p.Nome, p.Cognome, p.DataNascita, p.CodiceFiscale,
            p.Sesso, p.IsPublic, p.DataIstanza, p.IDIstanziatore
        FROM dbo.TPersone p
        ${where}
        ORDER BY p.IDPersona DESC
        OFFSET @OffsetRows ROWS FETCH NEXT @NextRows ROWS ONLY;
    `);

    return {
        resultdata: result.recordsets[1],
        TotalRecord: Number(result.recordsets[0][0].TotalRecord)
    };
}

async function GetPersona(value) {
    const id = parseId(value);
    await sql.connect(connection);
    const request = new sql.Request();
    request.input('IDPersona', sql.Int, id);
    const result = await request.query(`
        SELECT IDPersona, Nome, Cognome, DataNascita, CodiceFiscale,
            Sesso, IsPublic, DataIstanza, IDIstanziatore
        FROM dbo.TPersone
        WHERE IDPersona = @IDPersona
    `);
    if (result.recordset.length === 0) {
        throw createError('PERSON_NOT_FOUND');
    }
    return result.recordset[0];
}

async function GetGestioneUtentiPermissions(value) {
    const profileId = parseSessionProfileId(value);
    await sql.connect(connection);

    const processRequest = new sql.Request();
    processRequest.input('PageUrl', sql.VarChar(50), 'Configuration/frmSystemUsers');
    const processResult = await processRequest.query(`
        SELECT IDProcesso
        FROM dbo.TProcessi
        WHERE PageUrl = @PageUrl
    `);
    if (processResult.recordset.length !== 1) {
        throw createError('USER_MANAGEMENT_PROCESS_NOT_FOUND');
    }

    const request = new sql.Request();
    request.input('IDProfiloUtente', sql.Int, profileId);
    request.input('IDProcesso', sql.Int, processResult.recordset[0].IDProcesso);
    const result = await request.query(`
        SELECT a.Codice AS ActionName, a.IsPrimary,
            CAST(CASE WHEN permission.IDProcesso IS NULL THEN 0 ELSE 1 END AS bit) AS IsAllowed
        FROM dbo.TProcessiAzioniCustom processAction
        INNER JOIN dbo.TProcessiAzioni a
            ON a.IDProcessoAzione = processAction.IDProcessoAzione
        LEFT JOIN dbo.TProfiliUtenteAbilitazioni permission
            ON permission.IDProcesso = processAction.IDProcesso
            AND permission.IDProcessoAzione = processAction.IDProcessoAzione
            AND permission.IDProfiloUtente = @IDProfiloUtente
        WHERE processAction.IDProcesso = @IDProcesso
    `);

    return result.recordset.reduce((permissions, action) => {
        if (action.ActionName === 'Inserimento' && action.IsPrimary) {
            permissions.canInsert = action.IsAllowed;
        } else if (action.ActionName === 'Modifica') {
            permissions.canEdit = action.IsAllowed;
        } else if (action.ActionName === 'Cancellazione') {
            permissions.canDelete = action.IsAllowed;
        } else if (action.ActionName === 'Account') {
            permissions.canAccount = action.IsAllowed;
        }
        return permissions;
    }, { canInsert: false, canEdit: false, canDelete: false, canAccount: false });
}

async function GetPersonaAccount(value) {
    const id = parseId(value);
    await sql.connect(connection);
    const request = new sql.Request();
    request.input('IDPersona', sql.Int, id);
    const result = await request.query(`
        SELECT a.IDAccount, a.Username AS Email, a.Password,
            a.IsPublic, a.IsVisible
        FROM dbo.TAttoriContratti contract
        INNER JOIN dbo.TAccount a ON a.IDContratto = contract.IDContratto
        WHERE contract.IDPersona = @IDPersona
    `);
    if (result.recordset.length > 1) {
        throw createError('MULTIPLE_PERSON_ACCOUNTS');
    }
    if (result.recordset.length === 0) {
        return { exists: false };
    }
    const account = result.recordset[0];
    return {
        exists: true,
        email: account.Email,
        password: account.Password || '',
        isPublic: account.IsPublic === true,
        isVisible: account.IsVisible === true
    };
}

async function SavePersonaAccount(value, body, idAttore) {
    const id = parseId(value);
    const actorId = parseSessionActorId(idAttore);
    const fields = readAccountFields(body);
    const isPublic = fields.isVisible && fields.isPublic;
    await sql.connect(connection);

    const transaction = new sql.Transaction();
    await transaction.begin();
    try {
        const personRequest = new sql.Request(transaction);
        personRequest.input('IDPersona', sql.Int, id);
        const personResult = await personRequest.query(`
            SELECT IDPersona
            FROM dbo.TPersone
            WHERE IDPersona = @IDPersona
        `);
        if (personResult.recordset.length === 0) {
            throw createError('PERSON_NOT_FOUND');
        }

        const accountRequest = new sql.Request(transaction);
        accountRequest.input('IDPersona', sql.Int, id);
        const accountResult = await accountRequest.query(`
            SELECT a.IDAccount, a.Password
            FROM dbo.TAttoriContratti contract WITH (UPDLOCK, HOLDLOCK)
            INNER JOIN dbo.TAccount a WITH (UPDLOCK, HOLDLOCK)
                ON a.IDContratto = contract.IDContratto
            WHERE contract.IDPersona = @IDPersona
        `);
        if (accountResult.recordset.length > 1) {
            throw createError('MULTIPLE_PERSON_ACCOUNTS');
        }

        let accountId;
        let savedPassword;
        let created = false;
        if (accountResult.recordset.length === 1) {
            accountId = accountResult.recordset[0].IDAccount;
            savedPassword = accountResult.recordset[0].Password || '';
            const updateRequest = new sql.Request(transaction);
            updateRequest.input('IDAccount', sql.Int, accountId);
            updateRequest.input('IDPersona', sql.Int, id);
            updateRequest.input('Email', sql.VarChar(50), fields.email);
            updateRequest.input('IsPublic', sql.Bit, isPublic);
            updateRequest.input('IsVisible', sql.Bit, fields.isVisible);
            await updateRequest.query(`
                UPDATE account
                SET Username = @Email, IsPublic = @IsPublic, IsVisible = @IsVisible
                FROM dbo.TAccount account
                WHERE account.IDAccount = @IDAccount;

                UPDATE contract
                SET Email = @Email, IsVisible = @IsVisible
                FROM dbo.TAttoriContratti contract
                INNER JOIN dbo.TAccount account ON account.IDContratto = contract.IDContratto
                WHERE account.IDAccount = @IDAccount AND contract.IDPersona = @IDPersona;
            `);
        } else {
            created = true;
            const password = generateAccountPassword();
            const contractRequest = new sql.Request(transaction);
            contractRequest.input('IDAttore', sql.Int, actorId);
            contractRequest.input('IDPersona', sql.Int, id);
            contractRequest.input('Email', sql.VarChar(50), fields.email);
            contractRequest.input('IsVisible', sql.Bit, fields.isVisible);
            const contractResult = await contractRequest.query(`
                INSERT INTO dbo.TAttoriContratti
                    (IDAttore, IDPersona, Email, IsVisible, DataIstanza)
                OUTPUT INSERTED.IDContratto
                VALUES (@IDAttore, @IDPersona, @Email, @IsVisible, GETDATE())
            `);
            const contractId = contractResult.recordset[0].IDContratto;

            const insertRequest = new sql.Request(transaction);
            insertRequest.input('IDContratto', sql.Int, contractId);
            insertRequest.input('Username', sql.VarChar(50), fields.email);
            insertRequest.input('Password', sql.VarChar(15), password);
            insertRequest.input('IsPublic', sql.Bit, isPublic);
            insertRequest.input('IsVisible', sql.Bit, fields.isVisible);
            const insertResult = await insertRequest.query(`
                INSERT INTO dbo.TAccount
                    (IDContratto, Username, Password, IsPublic, IsVisible, DataIstanza)
                OUTPUT INSERTED.IDAccount
                VALUES
                    (@IDContratto, @Username, @Password, @IsPublic, @IsVisible, GETDATE())
            `);
            accountId = insertResult.recordset[0].IDAccount;
            savedPassword = password;

            const logRequest = new sql.Request(transaction);
            logRequest.input('IDAccount', sql.Int, accountId);
            logRequest.input('Email', sql.NVarChar(200), fields.email);
            logRequest.input('Password', sql.NVarChar(100), password);
            await logRequest.query(`
                INSERT INTO dbo.TAccountLog (IDAccount, Email, Password, DataRegistrazione)
                VALUES (@IDAccount, @Email, @Password, CONVERT(date, GETDATE()))
            `);
        }

        if (!fields.isVisible) {
            const visibilityRequest = new sql.Request(transaction);
            visibilityRequest.input('IDPersona', sql.Int, id);
            await visibilityRequest.query(`
                UPDATE dbo.TPersone
                SET IsPublic = 0
                WHERE IDPersona = @IDPersona
            `);
        }

        await transaction.commit();
        return {
            exists: true,
            email: fields.email,
            password: savedPassword,
            isPublic,
            isVisible: fields.isVisible,
            created
        };
    } catch (error) {
        await transaction.rollback();
        if (error.number === 2601 || error.number === 2627) {
            throw createError('DUPLICATE_ACCOUNT_EMAIL');
        }
        throw error;
    }
}

async function CreatePersona(body, idIstanziatore) {
    const fields = readPersonaFields(body);
    const creatorId = parseSessionAccountId(idIstanziatore);
    await sql.connect(connection);
    const request = new sql.Request();
    bindPersonaFields(request, fields, creatorId);
    const result = await request.query(`
        INSERT INTO dbo.TPersone
            (Nome, Cognome, DataNascita, CodiceFiscale, Sesso,
                IsPublic, DataIstanza, IDIstanziatore)
        OUTPUT INSERTED.IDPersona
        VALUES
            (@Nome, @Cognome, @DataNascita, @CodiceFiscale, @Sesso,
                @IsPublic, GETDATE(), @IDIstanziatore)
    `);
    return result.recordset[0].IDPersona;
}

async function UpdatePersona(value, body) {
    const id = parseId(value);
    const fields = readPersonaFields(body);
    await sql.connect(connection);
    const request = new sql.Request();
    request.input('IDPersona', sql.Int, id);
    bindPersonaFields(request, fields, null);
    const result = await request.query(`
        UPDATE dbo.TPersone
        SET Nome = @Nome, Cognome = @Cognome, DataNascita = @DataNascita,
            CodiceFiscale = @CodiceFiscale, Sesso = @Sesso, IsPublic = @IsPublic
        WHERE IDPersona = @IDPersona
    `);
    if (result.rowsAffected[0] === 0) {
        throw createError('PERSON_NOT_FOUND');
    }
}

async function DeletePersona(value) {
    const id = parseId(value);
    await sql.connect(connection);
    const request = new sql.Request();
    request.input('IDPersona', sql.Int, id);
    try {
        const result = await request.query(
            'DELETE FROM dbo.TPersone WHERE IDPersona = @IDPersona'
        );
        if (result.rowsAffected[0] === 0) {
            throw createError('PERSON_NOT_FOUND');
        }
    } catch (error) {
        if (error.number === 547) {
            throw createError('PERSON_REFERENCED');
        }
        throw error;
    }
}

function mapDatabaseError(error) {
    if (error.number === 2601 || error.number === 2627) {
        return createError('DUPLICATE_PERSON');
    }
    if (error.number === 547) {
        return createError('INVALID_REFERENCE');
    }
    return error;
}

module.exports = {
    GetPersone,
    GetPersona,
    GetGestioneUtentiPermissions,
    GetPersonaAccount,
    SavePersonaAccount,
    CreatePersona,
    UpdatePersona,
    DeletePersona,
    mapDatabaseError
};
