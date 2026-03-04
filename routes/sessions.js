const express = require('express');
const router = express.Router();
const passport = require('../config/passport.config');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { authLimiter, registerLimiter } = require('../middleware/rateLimiter.middleware');
const UserRepository = require('../repositories/UserRepository');
const UserDTO = require('../dto/UserDTO');
const PasswordReset = require('../models/PasswordReset.model');
const EmailService = require('../services/EmailService');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const JWT_EXPIRATION = '24h';

router.post('/register', registerLimiter, (req, res, next) => {
    passport.authenticate('register', { session: false }, (err, user, info) => {
        if (err) {
            return res.status(500).json({
                status: 'error',
                message: 'Error interno del servidor',
                error: err.message
            });
        }

        if (!user) {
            return res.status(400).json({
                status: 'error',
                message: info.message || 'Error en el registro'
            });
        }

        const token = jwt.sign(
            { 
                id: user._id,
                email: user.email,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRATION }
        );

        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000
        });

        const userDTO = UserDTO.fromUser(user);

        res.status(201).json({
            status: 'success',
            message: 'Usuario registrado exitosamente',
            payload: {
                user: userDTO,
                token
            }
        });
    })(req, res, next);
});

router.post('/login', authLimiter, (req, res, next) => {
    passport.authenticate('login', { session: false }, (err, user, info) => {
        if (err) {
            return res.status(500).json({
                status: 'error',
                message: 'Error interno del servidor',
                error: err.message
            });
        }

        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: info.message || 'Credenciales inválidas'
            });
        }

        const token = jwt.sign(
            { 
                id: user._id,
                email: user.email,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRATION }
        );

        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000
        });

        const userDTO = UserDTO.fromUser(user);

        res.json({
            status: 'success',
            message: 'Login exitoso',
            payload: {
                user: userDTO,
                token
            }
        });
    })(req, res, next);
});

router.get('/current', passport.authenticate('current', { session: false }), (req, res) => {
    const userDTO = UserDTO.fromUser(req.user);
    
    res.json({
        status: 'success',
        message: 'Usuario autenticado',
        payload: {
            user: userDTO
        }
    });
});

router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({
        status: 'success',
        message: 'Sesión cerrada exitosamente'
    });
});

router.get('/profile', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const userDTO = UserDTO.fromUser(req.user);
        res.json({
            status: 'success',
            payload: {
                user: userDTO
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Error obteniendo perfil del usuario'
        });
    }
});

router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                status: 'error',
                message: 'El email es requerido'
            });
        }

        const user = await UserRepository.findByEmail(email);

        const successMessage = 'Si el email existe, recibirás un correo con instrucciones para restablecer tu contraseña';

        if (!user) {
            return res.json({
                status: 'success',
                message: successMessage
            });
        }

        const resetToken = await PasswordReset.createResetToken(user._id);

        await EmailService.sendPasswordResetEmail(
            user.email,
            resetToken.token,
            user.first_name
        );

        res.json({
            status: 'success',
            message: successMessage
        });

    } catch (error) {
        console.error('Error en forgot-password:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error procesando la solicitud'
        });
    }
});

router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                status: 'error',
                message: 'Token y nueva contraseña son requeridos'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                status: 'error',
                message: 'La contraseña debe tener al menos 6 caracteres'
            });
        }

        const resetToken = await PasswordReset.findOne({ token }).populate('user');

        if (!resetToken || !resetToken.isValid()) {
            return res.status(400).json({
                status: 'error',
                message: 'Token inválido o expirado'
            });
        }

        const user = resetToken.user;

        const isSamePassword = bcrypt.compareSync(newPassword, user.password);

        if (isSamePassword) {
            return res.status(400).json({
                status: 'error',
                message: 'No puedes usar la misma contraseña anterior'
            });
        }

        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        await UserRepository.updatePassword(user._id, hashedPassword);

        await resetToken.markAsUsed();

        res.json({
            status: 'success',
            message: 'Contraseña actualizada exitosamente'
        });

    } catch (error) {
        console.error('Error en reset-password:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error restableciendo la contraseña'
        });
    }
});

router.post('/unlock/:userId', 
    passport.authenticate('jwt', { session: false }),
    async (req, res) => {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    status: 'error',
                    message: 'Solo administradores pueden desbloquear cuentas'
                });
            }

            await UserRepository.unlockAccount(req.params.userId);

            res.json({
                status: 'success',
                message: 'Cuenta desbloqueada exitosamente'
            });
        } catch (error) {
            res.status(500).json({
                status: 'error',
                message: 'Error al desbloquear cuenta'
            });
        }
    }
);

router.get('/login-history/:userId?',
    passport.authenticate('jwt', { session: false }),
    async (req, res) => {
        try {
            const userId = req.params.userId || req.user._id;

            if (userId !== req.user._id.toString() && req.user.role !== 'admin') {
                return res.status(403).json({
                    status: 'error',
                    message: 'No tienes permisos para ver este historial'
                });
            }

            const user = await UserRepository.findById(userId);

            if (!user) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Usuario no encontrado'
                });
            }

            res.json({
                status: 'success',
                payload: {
                    email: user.email,
                    lastLogin: user.lastLogin,
                    loginAttempts: user.loginAttempts,
                    history: user.loginHistory
                }
            });
        } catch (error) {
            res.status(500).json({
                status: 'error',
                message: 'Error al obtener historial'
            });
        }
    }
);

module.exports = router;