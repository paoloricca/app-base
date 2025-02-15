function verifyUser(req, res) {
    if (req.session.user) {
        return true;
    } else {
        res.redirect('/login');
        return false;
    }
}
module.exports = {
    verifyUser
}