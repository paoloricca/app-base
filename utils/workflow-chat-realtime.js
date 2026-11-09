let io;

function initialize(server, sessionMiddleware) {
    const { Server } = require('socket.io');
    io = new Server(server, {
        allowRequest: (req, callback) => {
            try {
                const origin = req.headers.origin;
                callback(null, !origin || new URL(origin).host === req.headers.host);
            } catch (error) {
                callback(null, false);
            }
        }
    });
    io.engine.use(sessionMiddleware);
    io.use((socket, next) => {
        const user = socket.request.session && socket.request.session.user;
        if (!user || user.ActivePassword == 0 || !Number.isSafeInteger(Number(user.IdAccount)) ||
            Number(user.IdAccount) <= 0) return next(new Error('Unauthorized'));
        next();
    });
    io.on('connection', socket => socket.join('user_' + Number(socket.request.session.user.IdAccount)));
}

async function publish(account, event, payload) {
    if (!io) throw new Error('Socket.io non inizializzato.');
    const sockets = await io.in('user_' + Number(account)).fetchSockets();
    await Promise.all(sockets.map(socket => new Promise(resolve => {
        socket.request.session.reload(error => {
            if (error || !socket.request.session.user ||
                Number(socket.request.session.user.IdAccount) !== Number(account) ||
                socket.request.session.user.ActivePassword == 0) {
                socket.disconnect(true);
            } else {
                socket.emit(event, payload);
            }
            resolve();
        });
    })));
}

async function disconnectSession(sessionId, account) {
    if (!io) return;
    const sockets = await io.in('user_' + Number(account)).fetchSockets();
    sockets.filter(socket => socket.request.sessionID === sessionId)
        .forEach(socket => socket.disconnect(true));
}

module.exports = { initialize, publish, disconnectSession };
