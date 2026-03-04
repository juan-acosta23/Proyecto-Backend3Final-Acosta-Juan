const passport = require('passport');
const isAuthenticated = (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (err, user, info) => {
        if (err) {
            return res.status(500).json({
                status: 'error',
                message: 'Error en la autenticación'
            });
        }

        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'No autorizado - Token inválido o expirado'
            });
        }

        req.user = user;
        next();
    })(req, res, next);
};

const isAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            status: 'error',
            message: 'No autorizado - Debes estar autenticado'
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            status: 'error',
            message: 'Acceso denegado - Solo administradores'
        });
    }

    next();
};

const isPremium = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            status: 'error',
            message: 'No autorizado - Debes estar autenticado'
        });
    }

    if (req.user.role !== 'premium' && req.user.role !== 'admin') {
        return res.status(403).json({
            status: 'error',
            message: 'Acceso denegado - Solo usuarios premium o administradores'
        });
    }

    next();
};

const isOwner = (resourceUserId) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                status: 'error',
                message: 'No autorizado - Debes estar autenticado'
            });
        }

        if (req.user.role === 'admin') {
            return next();
        }

        if (req.user._id.toString() !== resourceUserId.toString()) {
            return res.status(403).json({
                status: 'error',
                message: 'Acceso denegado - No eres el propietario de este recurso'
            });
        }

        next();
    };
};

const hasRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                status: 'error',
                message: 'No autorizado - Debes estar autenticado'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                status: 'error',
                message: `Acceso denegado - Se requiere uno de los siguientes roles: ${roles.join(', ')}`
            });
        }

        next();
    };
};

module.exports = {
    isAuthenticated,
    isAdmin,
    isPremium,
    isOwner,
    hasRole
};