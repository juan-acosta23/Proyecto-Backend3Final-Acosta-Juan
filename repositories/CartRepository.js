const Cart = require('../models/Cart.model');

class CartRepository {
    async create() {
        try {
            const newCart = new Cart();
            return await newCart.save();
        } catch (error) {
            throw new Error(`Error al crear carrito: ${error.message}`);
        }
    }

    async findById(cartId) {
        try {
            const cart = await Cart.findById(cartId).populate('products.product');
            return cart;
        } catch (error) {
            throw new Error(`Error al buscar carrito: ${error.message}`);
        }
    }

    async addProduct(cartId, productId, quantity = 1) {
        try {
            const cart = await Cart.findById(cartId);
            if (!cart) {
                throw new Error('Carrito no encontrado');
            }

            await cart.addProduct(productId, quantity);
            return await this.findById(cartId);
        } catch (error) {
            throw new Error(`Error al agregar producto al carrito: ${error.message}`);
        }
    }

    async removeProduct(cartId, productId) {
        try {
            const cart = await Cart.findById(cartId);
            if (!cart) {
                throw new Error('Carrito no encontrado');
            }

            await cart.removeProduct(productId);
            return await this.findById(cartId);
        } catch (error) {
            throw new Error(`Error al eliminar producto del carrito: ${error.message}`);
        }
    }

    async updateProductQuantity(cartId, productId, quantity) {
        try {
            const cart = await Cart.findById(cartId);
            if (!cart) {
                throw new Error('Carrito no encontrado');
            }

            await cart.updateProductQuantity(productId, quantity);
            return await this.findById(cartId);
        } catch (error) {
            throw new Error(`Error al actualizar cantidad: ${error.message}`);
        }
    }

    async updateCart(cartId, productsArray) {
        try {
            const cart = await Cart.findById(cartId);
            if (!cart) {
                throw new Error('Carrito no encontrado');
            }

            await cart.updateCart(productsArray);
            return await this.findById(cartId);
        } catch (error) {
            throw new Error(`Error al actualizar carrito: ${error.message}`);
        }
    }

    async clearCart(cartId) {
        try {
            const cart = await Cart.findById(cartId);
            if (!cart) {
                throw new Error('Carrito no encontrado');
            }

            await cart.clearCart();
            return cart;
        } catch (error) {
            throw new Error(`Error al vaciar carrito: ${error.message}`);
        }
    }

    async delete(cartId) {
        try {
            return await Cart.findByIdAndDelete(cartId);
        } catch (error) {
            throw new Error(`Error al eliminar carrito: ${error.message}`);
        }
    }
}

module.exports = new CartRepository();