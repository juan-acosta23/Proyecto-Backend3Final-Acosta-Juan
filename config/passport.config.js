const passport = require('passport');
const { Strategy: LocalStrategy } = require('passport-local');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const bcrypt = require('bcrypt');
const User = require('../models/User.model');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'your-secret-key-change-this') {
    console.error('ERROR CRÍTICO: JWT_SECRET no está configurado en producción');
    console.error('Configura la variable de entorno JWT_SECRET antes de continuar');
    process.exit(1); 
}

if (process.env.NODE_ENV !== 'production' && JWT_SECRET === 'your-secret-key-change-this') {
    console.warn('ADVERTENCIA: Usando JWT_SECRET por defecto en desarrollo');
    console.warn('Para producción, configura JWT_SECRET en .env');
}

passport.use('login', new LocalStrategy(
    {
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true
    },
    async (req, email, password, done) => {
        try {
            const user = await User.findByEmail(email);

            if (!user) {
                return done(null, false, { message: 'Usuario no encontrado' });
            }

            if (user.isAccountLocked) {
                const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
                return done(null, false, { 
                    message: `Cuenta bloqueada por múltiples intentos fallidos. Intenta nuevamente en ${minutesLeft} minutos.` 
                });
            }

            const isMatch = bcrypt.compareSync(password, user.password);

            const ip = req.ip || req.connection.remoteAddress;
            const userAgent = req.get('user-agent');
            
            await user.recordLoginAttempt(isMatch, ip, userAgent);

if (!isMatch) {
    const attemptsLeft = Math.max(0, 5 - user.loginAttempts);
    
    if (attemptsLeft > 0) {
        return done(null, false, { 
            message: `Contraseña incorrecta. ${attemptsLeft} intentos restantes antes del bloqueo.` 
        });
    } else {
        return done(null, false, { 
            message: 'Cuenta bloqueada por múltiples intentos fallidos. Intenta nuevamente en 30 minutos.' 
        });
    }
}

            return done(null, user);
        } catch (error) {
            return done(error);
        }
    }
));

passport.use('register', new LocalStrategy(
    {
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true
    },
    async (req, email, password, done) => {
        try {
            const { first_name, last_name, age } = req.body;

            if (!first_name || !last_name || !age) {
                return done(null, false, { message: 'Todos los campos son requeridos' });
            }

            const existingUser = await User.findByEmail(email);

            if (existingUser) {
                return done(null, false, { message: 'El email ya está registrado' });
            }

            const hashedPassword = bcrypt.hashSync(password, 10);

            const Cart = require('../models/Cart.model');
            const newCart = new Cart();
            await newCart.save();

            const newUser = new User({
                first_name,
                last_name,
                email,
                age: parseInt(age),
                password: hashedPassword,
                cart: newCart._id,
                role: 'user'
            });

            await newUser.save();

            return done(null, newUser);
        } catch (error) {
            return done(error);
        }
    }
));

passport.use('jwt', new JwtStrategy(
    {
        jwtFromRequest: ExtractJwt.fromExtractors([
            (req) => {
                let token = null;
                if (req && req.cookies) {
                    token = req.cookies['token'];
                }
                return token;
            },
            ExtractJwt.fromAuthHeaderAsBearerToken()
        ]),
        secretOrKey: JWT_SECRET
    },
    async (jwt_payload, done) => {
        try {
            const user = await User.findById(jwt_payload.id).populate('cart');

            if (!user) {
                return done(null, false, { message: 'Usuario no encontrado' });
            }

            return done(null, user);
        } catch (error) {
            return done(error, false);
        }
    }
));

passport.use('current', new JwtStrategy(
    {
        jwtFromRequest: ExtractJwt.fromExtractors([
            (req) => {
                let token = null;
                if (req && req.cookies) {
                    token = req.cookies['token'];
                }
                return token;
            },
            ExtractJwt.fromAuthHeaderAsBearerToken()
        ]),
        secretOrKey: JWT_SECRET
    },
    async (jwt_payload, done) => {
        try {
            const user = await User.findById(jwt_payload.id)
                .populate('cart')
                .select('-password');

            if (!user) {
                return done(null, false, { message: 'Token inválido o usuario no encontrado' });
            }

            return done(null, user);
        } catch (error) {
            return done(error, false);
        }
    }
));

module.exports = passport;