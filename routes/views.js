const express = require('express');
const router = express.Router();
const Product = require('../models/Product.model');
const Cart = require('../models/Cart.model');
const PurchaseService = require('../services/PurchaseService');
const passport = require('passport');

const isAuthenticatedView = (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (err, user, info) => {
        if (err || !user) {
            return res.redirect('/login');
        }
        req.user = user;
        next();
    })(req, res, next);
};

router.get('/', (req, res) => {
    res.redirect('/products');
});

router.get('/login', (req, res) => {
    res.render('login', {
        title: 'Iniciar Sesión'
    });
});

router.get('/register', (req, res) => {
    res.render('register', {
        title: 'Crear Cuenta'
    });
});

router.get('/forgot-password', (req, res) => {
    res.render('forgot-password', {
        title: 'Recuperar Contraseña'
    });
});

router.get('/reset-password', (req, res) => {
    res.render('reset-password', {
        title: 'Restablecer Contraseña'
    });
});

router.get('/profile', isAuthenticatedView, async (req, res) => {
    try {
        res.render('profile', {
            title: 'Mi Perfil',
            user: req.user
        });
    } catch (error) {
        console.error('Error cargando perfil:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error al cargar el perfil'
        });
    }
});

router.get('/my-tickets', isAuthenticatedView, async (req, res) => {
    try {
        const tickets = await PurchaseService.getUserTickets(req.user._id);

        res.render('my-tickets', {
            title: 'Mis Compras',
            tickets,
            hasTickets: tickets.length > 0,
            user: req.user
        });
    } catch (error) {
        console.error('Error cargando tickets:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error al cargar tus compras'
        });
    }
});

router.get('/products', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const page = parseInt(req.query.page) || 1;
        const sort = req.query.sort;
        const query = req.query.query;
        const category = req.query.category;
        const status = req.query.status;

        const filter = {};
        
        if (category) {
            filter.category = category.trim();
        }

        if (status !== undefined) {
            filter.status = status === 'true' || status === '1' || status === 'yes';
        }

        if (query && !category && status === undefined) {
            const queryLower = query.trim().toLowerCase();
            
            if (queryLower === 'true' || queryLower === 'false' || queryLower === 'disponible' || queryLower === 'no disponible') {
                filter.status = queryLower === 'true' || queryLower === 'disponible';
            } else {
                filter.category = query.trim();
            }
        }

        const options = {
            page,
            limit,
            lean: true
        };

        if (sort === 'asc') {
            options.sort = { price: 1 };
        } else if (sort === 'desc') {
            options.sort = { price: -1 };
        }

        const result = await Product.paginate(filter, options);

        const buildQueryParams = (pageNum) => {
            const params = new URLSearchParams();
            params.append('page', pageNum);
            if (limit !== 10) params.append('limit', limit);
            if (sort) params.append('sort', sort);
            if (query) params.append('query', query);
            if (category) params.append('category', category);
            if (status !== undefined) params.append('status', status);
            return params.toString();
        };

        const prevLink = result.hasPrevPage ? `/products?${buildQueryParams(result.prevPage)}` : null;
        const nextLink = result.hasNextPage ? `/products?${buildQueryParams(result.nextPage)}` : null;

        const categories = await Product.distinct('category');

        let user = null;
        passport.authenticate('jwt', { session: false }, (err, authenticatedUser) => {
            if (authenticatedUser) {
                user = authenticatedUser;
            }
        })(req, res, () => {});

        res.render('products', {
            title: 'Productos',
            products: result.docs,
            hasProducts: result.docs.length > 0,
            page: result.page,
            totalPages: result.totalPages,
            hasPrevPage: result.hasPrevPage,
            hasNextPage: result.hasNextPage,
            prevPage: result.prevPage,
            nextPage: result.nextPage,
            prevLink,
            nextLink,
            categories,
            currentCategory: category || '',
            currentSort: sort || '',
            currentStatus: status || '',
            currentQuery: query || '',
            limit,
            user: user
        });
    } catch (error) {
        console.error('Error cargando vista de productos:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error al cargar los productos'
        });
    }
});

router.get('/products/:pid', async (req, res) => {
    try {
        const { pid } = req.params;
        const product = await Product.findById(pid).lean();

        if (!product) {
            return res.status(404).render('error', {
                title: 'Producto no encontrado',
                message: `El producto con ID ${pid} no existe`
            });
        }

        res.render('productDetail', {
            title: product.title,
            product
        });
    } catch (error) {
        console.error('Error cargando detalle del producto:', error);

        if (error.name === 'CastError') {
            return res.status(400).render('error', {
                title: 'ID inválido',
                message: 'El ID del producto no es válido'
            });
        }

        res.status(500).render('error', {
            title: 'Error',
            message: 'Error al cargar el detalle del producto'
        });
    }
});

router.get('/carts/:cid', async (req, res) => {
    try {
        const { cid } = req.params;

        const cart = await Cart.findById(cid).populate('products.product').lean();

        if (!cart) {
            return res.status(404).render('error', {
                title: 'Carrito no encontrado',
                message: `El carrito con ID ${cid} no existe`
            });
        }

        const productsWithSubtotal = cart.products
            .filter(item => item.product)
            .map(item => ({
                ...item.product,
                _id: item.product._id,
                quantity: item.quantity,
                subtotal: (item.product.price * item.quantity).toFixed(2)
            }));

        const total = productsWithSubtotal.reduce(
            (sum, p) => sum + parseFloat(p.subtotal),
            0
        ).toFixed(2);

        res.render('cart', {
            title: `Carrito`,
            cartId: cid,
            products: productsWithSubtotal,
            hasProducts: productsWithSubtotal.length > 0,
            total
        });
    } catch (error) {
        console.error('Error cargando vista del carrito:', error);

        if (error.name === 'CastError') {
            return res.status(400).render('error', {
                title: 'ID inválido',
                message: 'El ID del carrito no es válido'
            });
        }

        res.status(500).render('error', {
            title: 'Error',
            message: 'Error al cargar el carrito'
        });
    }
});

router.get('/realtimeproducts', isAuthenticatedView, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).render('error', {
                title: 'Acceso denegado',
                message: 'Solo los administradores pueden acceder a esta página'
            });
        }

        const products = await Product.find().sort({ createdAt: -1 }).lean();

        res.render('realTimeProducts', {
            title: 'Productos en Tiempo Real',
            products: products,
            hasProducts: products.length > 0,
            user: req.user
        });
    } catch (error) {
        console.error('Error cargando vista realTimeProducts:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error al cargar los productos'
        });
    }
});

module.exports = router;