const express = require('express');
const router = express.Router();
const ProductRepository = require('../repositories/ProductRepository');
const { isAuthenticated, isAdmin } = require('../middleware/auth.middleware');

router.get('/', async (req, res) => {
    try {
        const limit = Math.max(1, parseInt(req.query.limit) || 10);
        const page = Math.max(1, parseInt(req.query.page) || 1);
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
            lean: true,
            paginate: true,
            customLabels: {
                docs: 'payload',
                totalDocs: 'totalDocs',
                limit: 'limit',
                page: 'page',
                totalPages: 'totalPages',
                pagingCounter: 'pagingCounter',
                hasPrevPage: 'hasPrevPage',
                hasNextPage: 'hasNextPage',
                prevPage: 'prevPage',
                nextPage: 'nextPage'
            }
        };

        if (sort === 'asc') {
            options.sort = { price: 1 };
        } else if (sort === 'desc') {
            options.sort = { price: -1 };
        }

        const result = await ProductRepository.findAll(filter, options);

        const buildQueryString = (pageNum) => {
            const params = new URLSearchParams();
            params.append('page', pageNum);
            if (limit !== 10) params.append('limit', limit);
            if (sort) params.append('sort', sort);
            if (query) params.append('query', query);
            if (category) params.append('category', category);
            if (status !== undefined) params.append('status', status);
            return params.toString();
        };

        const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}`;
        const prevLink = result.hasPrevPage ? `${baseUrl}?${buildQueryString(result.prevPage)}` : null;
        const nextLink = result.hasNextPage ? `${baseUrl}?${buildQueryString(result.nextPage)}` : null;

        res.json({
            status: 'success',
            payload: result.payload,
            totalPages: result.totalPages,
            prevPage: result.prevPage,
            nextPage: result.nextPage,
            page: result.page,
            hasPrevPage: result.hasPrevPage,
            hasNextPage: result.hasNextPage,
            prevLink,
            nextLink,
            totalDocs: result.totalDocs
        });
    } catch (error) {
        console.error('Error obteniendo productos:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error interno del servidor al obtener productos',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

router.get('/:pid', async (req, res) => {
    try {
        const { pid } = req.params;

        const product = await ProductRepository.findById(pid);

        if (!product) {
            return res.status(404).json({
                status: 'error',
                message: `Producto con ID ${pid} no encontrado`
            });
        }

        res.json({
            status: 'success',
            payload: product,
            message: 'Producto obtenido exitosamente'
        });
    } catch (error) {
        console.error('Error obteniendo producto:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                status: 'error',
                message: 'ID de producto inválido'
            });
        }

        res.status(500).json({
            status: 'error',
            message: 'Error interno del servidor al obtener el producto'
        });
    }
});

router.post('/', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const io = req.app.get('io');

        const newProduct = await ProductRepository.create(req.body);

        const products = await ProductRepository.findAll({}, { sort: { createdAt: -1 } });
        io.emit('products', products);

        res.status(201).json({
            status: 'success',
            payload: newProduct,
            message: 'Producto creado exitosamente'
        });
    } catch (error) {
        console.error('Error creando producto:', error);

        if (error.message.includes('ValidationError') || error.message.includes('validación')) {
            return res.status(400).json({
                status: 'error',
                message: 'Datos de producto inválidos',
                error: error.message
            });
        }

        if (error.message.includes('código') || error.message.includes('duplicado')) {
            return res.status(400).json({
                status: 'error',
                message: `Ya existe un producto con el código ${req.body.code}`
            });
        }

        res.status(500).json({
            status: 'error',
            message: error.message || 'Error interno del servidor al crear el producto'
        });
    }
});

router.put('/:pid', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { pid } = req.params;
        const io = req.app.get('io');

        delete req.body._id;
        delete req.body.createdAt;
        delete req.body.updatedAt;

        const updatedProduct = await ProductRepository.update(pid, req.body);

        if (!updatedProduct) {
            return res.status(404).json({
                status: 'error',
                message: `Producto con ID ${pid} no encontrado`
            });
        }

        const products = await ProductRepository.findAll({}, { sort: { createdAt: -1 } });
        io.emit('products', products);

        res.json({
            status: 'success',
            payload: updatedProduct,
            message: 'Producto actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error actualizando producto:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                status: 'error',
                message: 'ID de producto inválido'
            });
        }

        if (error.message.includes('validación')) {
            return res.status(400).json({
                status: 'error',
                message: 'Datos de actualización inválidos',
                error: error.message
            });
        }

        if (error.message.includes('código') || error.message.includes('duplicado')) {
            return res.status(400).json({
                status: 'error',
                message: 'El código de producto ya existe'
            });
        }

        res.status(500).json({
            status: 'error',
            message: 'Error interno del servidor al actualizar el producto'
        });
    }
});

router.delete('/:pid', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { pid } = req.params;
        const io = req.app.get('io');

        const deletedProduct = await ProductRepository.delete(pid);

        if (!deletedProduct) {
            return res.status(404).json({
                status: 'error',
                message: `Producto con ID ${pid} no encontrado`
            });
        }

        const products = await ProductRepository.findAll({}, { sort: { createdAt: -1 } });
        io.emit('products', products);

        res.json({
            status: 'success',
            payload: deletedProduct,
            message: 'Producto eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error eliminando producto:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                status: 'error',
                message: 'ID de producto inválido'
            });
        }

        res.status(500).json({
            status: 'error',
            message: 'Error interno del servidor al eliminar el producto'
        });
    }
});

module.exports = router;