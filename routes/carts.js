const express = require('express');
const router = express.Router();
const CartRepository = require('../repositories/CartRepository');
const { isAuthenticated } = require('../middleware/auth.middleware');
const PurchaseService = require('../services/PurchaseService');

router.post('/', async (req, res) => {
    try {
        const newCart = await CartRepository.create();

        res.status(201).json({
            status: 'success',
            payload: newCart,
            message: 'Carrito creado exitosamente'
        });
    } catch (error) {
        console.error('Error creando carrito:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error interno del servidor al crear el carrito'
        });
    }
});

router.get('/:cid', async (req, res) => {
    try {
        const { cid } = req.params;

        const cart = await CartRepository.findById(cid);

        if (!cart) {
            return res.status(404).json({
                status: 'error',
                message: `Carrito con ID ${cid} no encontrado`
            });
        }

        res.json({
            status: 'success',
            payload: cart,
            message: cart.products.length > 0
                ? 'Productos del carrito obtenidos exitosamente'
                : 'El carrito está vacío'
        });
    } catch (error) {
        console.error('Error obteniendo carrito:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                status: 'error',
                message: 'ID de carrito inválido'
            });
        }

        res.status(500).json({
            status: 'error',
            message: 'Error interno del servidor al obtener el carrito'
        });
    }
});

router.post('/:cid/product/:pid', isAuthenticated, async (req, res) => {
    try {
        const { cid, pid } = req.params;
        const quantity = parseInt(req.body.quantity) || 1;

        if (req.user.cart.toString() !== cid && req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'No tienes permisos para modificar este carrito'
            });
        }

        if (quantity < 1 || !Number.isInteger(quantity)) {
            return res.status(400).json({
                status: 'error',
                message: 'La cantidad debe ser un número entero mayor a 0'
            });
        }

        const cart = await CartRepository.addProduct(cid, pid, quantity);

        res.json({
            status: 'success',
            payload: cart,
            message: 'Producto agregado al carrito exitosamente'
        });
    } catch (error) {
        console.error('Error agregando producto al carrito:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                status: 'error',
                message: 'ID de carrito o producto inválido'
            });
        }

        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

router.delete('/:cid/products/:pid', isAuthenticated, async (req, res) => {
    try {
        const { cid, pid } = req.params;

        if (req.user.cart.toString() !== cid && req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'No tienes permisos para modificar este carrito'
            });
        }

        const cart = await CartRepository.removeProduct(cid, pid);

        res.json({
            status: 'success',
            payload: cart,
            message: 'Producto eliminado del carrito exitosamente'
        });
    } catch (error) {
        console.error('Error eliminando producto del carrito:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                status: 'error',
                message: 'ID de carrito o producto inválido'
            });
        }

        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

router.put('/:cid', isAuthenticated, async (req, res) => {
    try {
        const { cid } = req.params;
        const { products } = req.body;

        if (req.user.cart.toString() !== cid && req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'No tienes permisos para modificar este carrito'
            });
        }

        if (!Array.isArray(products)) {
            return res.status(400).json({
                status: 'error',
                message: 'El campo products debe ser un array'
            });
        }

        const cart = await CartRepository.updateCart(cid, products);

        res.json({
            status: 'success',
            payload: cart,
            message: 'Carrito actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error actualizando carrito:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                status: 'error',
                message: 'ID de carrito inválido'
            });
        }

        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

router.put('/:cid/products/:pid', isAuthenticated, async (req, res) => {
    try {
        const { cid, pid } = req.params;
        const { quantity } = req.body;

        // Verificar propiedad del carrito
        if (req.user.cart.toString() !== cid && req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'No tienes permisos para modificar este carrito'
            });
        }

        if (quantity === undefined || !Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({
                status: 'error',
                message: 'La cantidad debe ser un número entero mayor a 0'
            });
        }

        const cart = await CartRepository.updateProductQuantity(cid, pid, quantity);

        res.json({
            status: 'success',
            payload: cart,
            message: 'Cantidad de producto actualizada exitosamente'
        });
    } catch (error) {
        console.error('Error actualizando cantidad:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                status: 'error',
                message: 'ID de carrito o producto inválido'
            });
        }

        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

router.delete('/:cid', isAuthenticated, async (req, res) => {
    try {
        const { cid } = req.params;

        if (req.user.cart.toString() !== cid && req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'No tienes permisos para modificar este carrito'
            });
        }

        const cart = await CartRepository.clearCart(cid);

        res.json({
            status: 'success',
            payload: cart,
            message: 'Todos los productos fueron eliminados del carrito'
        });
    } catch (error) {
        console.error('Error vaciando carrito:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                status: 'error',
                message: 'ID de carrito inválido'
            });
        }

        res.status(500).json({
            status: 'error',
            message: 'Error interno del servidor al vaciar el carrito'
        });
    }
});

router.post('/:cid/purchase', isAuthenticated, async (req, res) => {
    try {
        const { cid } = req.params;

        if (req.user.cart.toString() !== cid) {
            return res.status(403).json({
                status: 'error',
                message: 'Solo puedes comprar productos de tu propio carrito'
            });
        }

        const result = await PurchaseService.processPurchase(
            req.user._id,
            req.user.email,
            req.user.first_name
        );

        if (!result.success) {
            return res.status(400).json({
                status: 'error',
                message: result.message,
                productsWithoutStock: result.productsWithoutStock
            });
        }

        res.json({
            status: 'success',
            message: result.message,
            payload: {
                ticket: result.ticket,
                productsWithoutStock: result.productsWithoutStock,
                failedProducts: result.failedProducts
            }
        });
    } catch (error) {
        console.error('Error finalizando compra:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Error interno del servidor al procesar la compra'
        });
    }
});

module.exports = router;