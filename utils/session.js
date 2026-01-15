function verifyUser(req, res) {
    if (req.session.user) {
        if (req.session.user.ActivePassword == 0) {
            res.render('password-edit', {
                user: req.session.user,
                LanguageContext: req.session.user.LanguageContext,
                error: null
            });
        } else {
            return true;
        }        
    } else {
        res.redirect('/login');
        return false;
    }
}
module.exports = {
    verifyUser
}