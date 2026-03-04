const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        status: 'error',
        message: 'Demasiados intentos de inicio de sesión. Intenta nuevamente en 15 minutos.'
    },
    standardHeaders: true, 
    legacyHeaders: false,
    skipSuccessfulRequests: false, 
    handler: (req, res) => {
        res.status(429).json({
            status: 'error',
            message: 'Demasiados intentos. Por favor espera 15 minutos e intenta nuevamente.',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, 
    max: 3,
    message: {
        status: 'error',
        message: 'Demasiados registros desde esta IP. Intenta nuevamente en 1 hora.'
    },
    skipSuccessfulRequests: true, 
    handler: (req, res) => {
        res.status(429).json({
            status: 'error',
            message: 'Límite de registros alcanzado. Por favor espera 1 hora.',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100,
    message: {
        status: 'error',
        message: 'Demasiadas solicitudes desde esta IP.'
    }
});

const strictLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10, 
    message: {
        status: 'error',
        message: 'Límite de operaciones alcanzado. Intenta nuevamente en 1 hora.'
    }
});

module.exports = {
    authLimiter,
    registerLimiter,
    apiLimiter,
    strictLimiter
};