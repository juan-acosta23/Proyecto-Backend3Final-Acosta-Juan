require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const handlebars = require('express-handlebars');
const path = require('path');
const cookieParser = require('cookie-parser');
const passport = require('./config/passport.config');
const { apiLimiter } = require('./middleware/rateLimiter.middleware');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const database = require('./config/database');
const Product = require('./models/Product.model');
const Cart = require('./models/Cart.model');
const User = require('./models/User.model');
const Pet = require('./models/Pet.model');
const PasswordReset = require('./models/PasswordReset.model');

const productsRouter = require('./routes/products');
const cartsRouter = require('./routes/carts');
const viewsRouter = require('./routes/views');
const sessionsRouter = require('./routes/sessions');
const ticketsRouter = require('./routes/tickets');
const mocksRouter = require('./routes/mocks');
const petsRouter = require('./routes/pets');
const usersRouter = require('./routes/users');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const PORT = process.env.PORT || 8080;

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

let twilioClient = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
    const twilio = require('twilio');
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    console.log('✓ Twilio configurado correctamente');
} else {
    console.warn('⚠ Twilio no está configurado. Funcionalidad de SMS deshabilitada.');
}

const hbs = handlebars.create({
    helpers: {
        eq: function(a, b) {
            return a === b;
        },
        gt: function(a, b) {
            return a > b;
        },
        lt: function(a, b) {
            return a < b;
        },
        multiply: function(a, b) {
            return (a * b).toFixed(2);
        },
        json: function(context) {
            return JSON.stringify(context);
        },
        formatDate: function(date) {
            return new Date(date).toLocaleString('es-AR');
        },
        formatMoney: function(amount) {
            return `$${parseFloat(amount).toFixed(2)}`;
        }
    },
    runtimeOptions: {
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: true
    }
});

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', apiLimiter);
app.use(passport.initialize());
app.set('io', io);

// Swagger Documentation
try {
    const usersDoc = YAML.load(path.join(__dirname, 'docs/users.yaml'));
    const swaggerDocument = {
        openapi: '3.0.0',
        info: {
            title: 'Pet E-Commerce API - Juan Acosta',
            version: '4.1.0',
            description: 'API REST para e-commerce de productos para mascotas con sistema de adopción integrado. Proyecto Backend III - Coderhouse.'
        },
        servers: [
            { url: `http://localhost:${process.env.PORT || 8080}`, description: 'Servidor local' }
        ],
        paths: { ...usersDoc.paths },
        components: { ...usersDoc.components }
    };
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    console.log('✓ Swagger disponible en /api/docs');
} catch (err) {
    console.warn('⚠ No se pudo cargar la documentación Swagger:', err.message);
}

// Routers
app.use('/api/products', productsRouter);
app.use('/api/carts', cartsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/mocks', mocksRouter);  // ← Nuevo router de mocks
app.use('/api/pets', petsRouter);    // ← Nuevo router de pets
app.use('/api/users', usersRouter);  // ← Nuevo router de users
app.use('/', viewsRouter);

app.post('/sms', async (req, res) => {
    try {
        if (!twilioClient) {
            return res.status(503).json({
                status: 'error',
                message: 'Servicio de SMS no disponible. Twilio no está configurado.'
            });
        }

        const { to, message } = req.body;

        if (!to || !message) {
            return res.status(400).json({
                status: 'error',
                message: 'Los campos "to" (teléfono) y "message" (mensaje) son requeridos'
            });
        }

        if (!to.startsWith('+')) {
            return res.status(400).json({
                status: 'error',
                message: 'El número de teléfono debe incluir el código de país (ejemplo: +5491112345678)'
            });
        }

        const result = await twilioClient.messages.create({ 
            body: message,
            from: TWILIO_PHONE_NUMBER,
            to: to
        });

        console.log('✓ SMS enviado exitosamente:', result.sid);

        res.json({ 
            status: 'success', 
            message: 'SMS enviado exitosamente',
            payload: {
                sid: result.sid,
                to: result.to,
                status: result.status
            }
        });

    } catch (error) {
        console.error('✗ Error enviando SMS:', error);
        
        res.status(500).json({
            status: 'error',
            message: 'Error al enviar SMS',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor'
        });
    }
});

app.get('/api/status', async (req, res) => {
    try {
        const productsCount = await Product.countDocuments();
        const cartsCount = await Cart.countDocuments();
        const usersCount = await User.countDocuments();
        const petsCount = await Pet.countDocuments();
        const dbHealth = await database.healthCheck();

        res.json({
            status: 'success',
            payload: {
                server: 'running',
                database: dbHealth.status,
                timestamp: new Date().toISOString(),
                version: '4.1.0',
                features: {
                    authentication: 'JWT + Passport',
                    authorization: 'Role-based (admin, user, premium)',
                    patterns: 'Repository, DTO, Service',
                    passwordRecovery: 'Email with 1-hour expiration',
                    purchases: 'Ticket system with stock validation',
                    realtime: 'Socket.io for products',
                    mocking: 'Data generation for testing (Backend 3)'
                },
                statistics: {
                    productsCount,
                    cartsCount,
                    usersCount,
                    petsCount
                },
                endpoints: {
                    authentication: {
                        register: 'POST /api/sessions/register',
                        login: 'POST /api/sessions/login',
                        current: 'GET /api/sessions/current (returns DTO)',
                        logout: 'POST /api/sessions/logout',
                        forgotPassword: 'POST /api/sessions/forgot-password',
                        resetPassword: 'POST /api/sessions/reset-password',
                        profile: 'GET /api/sessions/profile'
                    },
                    products: {
                        list: 'GET /api/products',
                        getById: 'GET /api/products/:pid',
                        create: 'POST /api/products (admin only)',
                        update: 'PUT /api/products/:pid (admin only)',
                        delete: 'DELETE /api/products/:pid (admin only)'
                    },
                    carts: {
                        create: 'POST /api/carts',
                        getById: 'GET /api/carts/:cid',
                        addProduct: 'POST /api/carts/:cid/product/:pid (user only)',
                        updateQuantity: 'PUT /api/carts/:cid/products/:pid (user only)',
                        removeProduct: 'DELETE /api/carts/:cid/products/:pid (user only)',
                        clear: 'DELETE /api/carts/:cid (user only)',
                        purchase: 'POST /api/carts/:cid/purchase (user only)'
                    },
                    tickets: {
                        getById: 'GET /api/tickets/:tid (owner/admin)',
                        myTickets: 'GET /api/tickets/user/my-tickets (user)',
                        all: 'GET /api/tickets (admin only)'
                    },
                    mocking: {
                        mockingpets: 'GET /api/mocks/mockingpets',
                        mockingusers: 'GET /api/mocks/mockingusers',
                        generateData: 'POST /api/mocks/generateData (admin only)',
                        clear: 'DELETE /api/mocks/clear (admin only)'
                    },
                    pets: {
                        list: 'GET /api/pets',
                        getById: 'GET /api/pets/:pid',
                        available: 'GET /api/pets/available',
                        bySpecies: 'GET /api/pets/species/:species',
                        create: 'POST /api/pets (admin only)',
                        update: 'PUT /api/pets/:pid (admin only)',
                        adopt: 'POST /api/pets/:pid/adopt (user)',
                        delete: 'DELETE /api/pets/:pid (admin only)'
                    },
                    users: {
                        list: 'GET /api/users (admin only)',
                        getById: 'GET /api/users/:uid',
                        update: 'PUT /api/users/:uid',
                        updateRole: 'PUT /api/users/:uid/role (admin only)',
                        delete: 'DELETE /api/users/:uid (admin only)'
                    },
                    views: {
                        products: '/products',
                        productDetail: '/products/:pid',
                        cart: '/carts/:cid',
                        login: '/login',
                        register: '/register',
                        forgotPassword: '/forgot-password',
                        resetPassword: '/reset-password',
                        profile: '/profile',
                        myTickets: '/my-tickets',
                        realtime: '/realtimeproducts (admin only)'
                    }
                }
            },
            message: `Servidor funcionando correctamente. ${productsCount} productos, ${cartsCount} carritos, ${usersCount} usuarios y ${petsCount} mascotas.`
        });
    } catch (error) {
        console.error('Error en /api/status:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error verificando estado del servidor'
        });
    }
});

// WebSocket
io.on('connection', async (socket) => {
    console.log('Nuevo cliente conectado:', socket.id);

    try {
        const products = await Product.find().sort({ createdAt: -1 }).lean();
        socket.emit('products', products);
    } catch (error) {
        console.error('Error enviando productos iniciales:', error);
    }

    socket.on('addProduct', async (productData) => {
        try {
            const newProduct = new Product(productData);
            await newProduct.save();

            const products = await Product.find().sort({ createdAt: -1 }).lean();
            io.emit('products', products);

            socket.emit('productAdded', {
                success: true,
                message: 'Producto agregado exitosamente',
                product: newProduct
            });
        } catch (error) {
            const errorMessage = error.name === 'ValidationError'
                ? Object.values(error.errors).map(err => err.message).join(', ')
                : error.message || 'Error al agregar producto';

            socket.emit('productError', {
                success: false,
                message: errorMessage
            });
        }
    });

    socket.on('deleteProduct', async (productId) => {
        try {
            const deletedProduct = await Product.findByIdAndDelete(productId);

            if (!deletedProduct) {
                socket.emit('productError', {
                    success: false,
                    message: 'Producto no encontrado'
                });
                return;
            }

            const products = await Product.find().sort({ createdAt: -1 }).lean();
            io.emit('products', products);

            socket.emit('productDeleted', {
                success: true,
                message: 'Producto eliminado exitosamente',
                product: deletedProduct
            });
        } catch (error) {
            socket.emit('productError', {
                success: false,
                message: error.message || 'Error al eliminar producto'
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});

app.use('*', (req, res) => {
    res.status(404).json({
        status: 'error',
        message: `Ruta ${req.originalUrl} no encontrada`,
        availableEndpoints: '/api/status'
    });
});

app.use((error, req, res, next) => {
    console.error('Error no manejado:', error);
    res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

const SAMPLE_PRODUCTS = [
    {
        title: "Alimento Premium para Perros 15kg",
        description: "Alimento balanceado de alta calidad para perros adultos de todas las razas.",
        code: "FOOD-DOG-PREMIUM-15",
        price: 30.000,
        status: true,
        stock: 50,
        category: "Alimentos",
        thumbnails: ["dog-food-premium.jpg"]
    },
    {
        title: "Rascador para Gatos Grande",
        description: "Torre rascador de 120cm con plataformas y juguetes colgantes.",
        code: "TOY-CAT-SCRATCHER-L",
        price: 150.000,
        status: true,
        stock: 25,
        category: "Accesorios",
        thumbnails: ["cat-scratcher-tower.jpg"]
    },
    {
        title: "Correa Retráctil 5 metros",
        description: "Correa extensible resistente para perros hasta 50kg con sistema de freno.",
        code: "ACC-LEASH-RETRACT-5M",
        price: 20.000,
        status: true,
        stock: 40,
        category: "Paseo",
        thumbnails: ["retractable-leash.jpg"]
    },
    {
        title: "Cama Ortopédica para Mascotas",
        description: "Cama de espuma memory foam, ideal para mascotas mayores o con problemas articulares.",
        code: "BED-ORTHO-LARGE",
        price: 50.000,
        status: true,
        stock: 30,
        category: "Descanso",
        thumbnails: ["orthopedic-pet-bed.jpg"]
    },
    {
        title: "Kit de Aseo Completo",
        description: "Set con cepillos, cortauñas, champú y toallas para el cuidado de mascotas.",
        code: "GROOMING-KIT-COMPLETE",
        price: 35.000,
        status: true,
        stock: 45,
        category: "Higiene",
        thumbnails: ["grooming-kit.jpg"]
    }
];

async function initializeSampleData() {
    try {
        const productsCount = await Product.countDocuments();
        if (productsCount === 0) {
            await Product.insertMany(SAMPLE_PRODUCTS);
            console.log('✓ Productos de ejemplo cargados');
        }

        const usersCount = await User.countDocuments();
        if (usersCount === 0) {
            const bcrypt = require('bcrypt');
            const adminCart = new Cart();
            await adminCart.save();

            const adminUser = new User({
                first_name: 'Admin',
                last_name: 'System',
                email: 'admin@ecommerce.com',
                age: 30,
                password: bcrypt.hashSync('admin123', 10),
                cart: adminCart._id,
                role: 'admin',
                pets: []
            });
            await adminUser.save();

            const userCart = new Cart();
            await userCart.save();

            const normalUser = new User({
                first_name: 'Juan',
                last_name: 'Pérez',
                email: 'user@ecommerce.com',
                age: 25,
                password: bcrypt.hashSync('user123', 10),
                cart: userCart._id,
                role: 'user',
                pets: []
            });
            await normalUser.save();

            console.log('✓ Usuarios de ejemplo creados:');
            console.log('  • Admin: admin@ecommerce.com / admin123');
            console.log('  • User: user@ecommerce.com / user123');
        }

        setInterval(async () => {
            try {
                const result = await PasswordReset.cleanExpired();
                if (result.deletedCount > 0) {
                    console.log(`✓ ${result.deletedCount} token(s) expirado(s) eliminado(s)`);
                }
            } catch (error) {
                console.error('Error limpiando tokens:', error.message);
            }
        }, 60 * 60 * 1000);

    } catch (error) {
        console.error('Error inicializando datos:', error.message);
    }
}

async function startServer() {
    try {
        await database.connect();
        await initializeSampleData();

        httpServer.listen(PORT, () => {
            console.log('\n' + '='.repeat(70));
            console.log(`  Servidor ejecutándose en http://localhost:${PORT}`);
            console.log('='.repeat(70));
            console.log('\n CARACTERÍSTICAS IMPLEMENTADAS:');
            console.log('   ✓ Patrón Repository para acceso a datos');
            console.log('   ✓ DTO para seguridad de información sensible');
            console.log('   ✓ Sistema de recuperación de contraseña con email');
            console.log('   ✓ Autorización basada en roles (Admin/User)');
            console.log('   ✓ Sistema de compras con Tickets');
            console.log('   ✓ Verificación de stock y compras parciales');
            console.log('   ✓ Mocking de datos para testing (Backend 3)');
            console.log('   ✓ Sistema de mascotas (Pets) con adopciones');
            console.log('\n ENDPOINTS DE MOCKING (Backend 3):');
            console.log(`   • GET  /api/mocks/mockingpets      - Generar mascotas mock`);
            console.log(`   • GET  /api/mocks/mockingusers     - Generar usuarios mock`);
            console.log(`   • POST /api/mocks/generateData     - Insertar datos en BD (admin)`);
            console.log(`   • DELETE /api/mocks/clear          - Limpiar datos mock (admin)`);
            console.log('\n ENDPOINTS DE MASCOTAS:');
            console.log(`   • GET  /api/pets                   - Listar todas las mascotas`);
            console.log(`   • GET  /api/pets/available         - Mascotas disponibles`);
            console.log(`   • GET  /api/pets/species/:species  - Por especie`);
            console.log(`   • POST /api/pets/:pid/adopt        - Adoptar mascota`);
            console.log('\n ENDPOINTS DE USUARIOS:');
            console.log(`   • GET  /api/users                  - Listar usuarios (admin)`);
            console.log(`   • GET  /api/users/:uid             - Usuario por ID`);
            console.log('\n AUTENTICACIÓN:');
            console.log(`   • Register:        POST /api/sessions/register`);
            console.log(`   • Login:           POST /api/sessions/login`);
            console.log(`   • Current (DTO):   GET /api/sessions/current`);
            console.log(`   • Logout:          POST /api/sessions/logout`);
            console.log(`   • Forgot Password: POST /api/sessions/forgot-password`);
            console.log(`   • Reset Password:  POST /api/sessions/reset-password`);
            console.log('\n' + '='.repeat(70) + '\n');
        });
    } catch (error) {
        console.error(' Error fatal iniciando servidor:', error.message);
        process.exit(1);
    }
}

startServer();