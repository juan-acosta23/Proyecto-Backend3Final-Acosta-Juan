const CartRepository = require('../repositories/CartRepository');
const ProductRepository = require('../repositories/ProductRepository');
const TicketRepository = require('../repositories/TicketRepository');
const EmailService = require('./EmailService');

class PurchaseService {
    async processPurchase(userId, userEmail, userName) {
        try {
            const userWithCart = await require('../models/User.model').findById(userId).populate({
                path: 'cart',
                populate: {
                    path: 'products.product'
                }
            });

            if (!userWithCart || !userWithCart.cart) {
                throw new Error('Carrito no encontrado');
            }

            const cart = userWithCart.cart;

            if (!cart.products || cart.products.length === 0) {
                throw new Error('El carrito está vacío');
            }

            const productsWithStock = [];
            const productsWithoutStock = [];

            for (const item of cart.products) {
                const product = item.product;
                
                if (!product) {
                    continue;
                }

                if (product.status && product.stock >= item.quantity) {
                    productsWithStock.push({
                        product,
                        quantity: item.quantity
                    });
                } else {
                    productsWithoutStock.push({
                        productId: product._id,
                        title: product.title,
                        requestedQuantity: item.quantity,
                        availableStock: product.stock
                    });
                }
            }

            if (productsWithStock.length === 0) {
                return {
                    success: false,
                    message: 'Ningún producto tiene stock suficiente',
                    productsWithoutStock
                };
            }

            const ticketProducts = [];
            const failedProducts = [];

            for (const item of productsWithStock) {
                try {
                    await ProductRepository.decrementStock(item.product._id, item.quantity);
                    
                    ticketProducts.push({
                        product: item.product._id,
                        quantity: item.quantity,
                        price: item.product.price,
                        subtotal: item.product.price * item.quantity
                    });

                    await CartRepository.removeProduct(cart._id, item.product._id);
                } catch (error) {
                    console.error(`Error procesando producto ${item.product._id}:`, error);
                    failedProducts.push({
                        productId: item.product._id,
                        title: item.product.title,
                        error: error.message
                    });
                }
            }

            if (ticketProducts.length > 0) {
                const ticket = await TicketRepository.create({
                    purchaser: userEmail,
                    products: ticketProducts,
                    user: userId,
                    status: productsWithoutStock.length > 0 ? 'partial' : 'completed'
                });

                try {
                    const populatedTicket = await TicketRepository.findById(ticket._id);
                    await EmailService.sendPurchaseConfirmation(userEmail, populatedTicket, userName);
                } catch (emailError) {
                    console.error('Error enviando email de confirmación:', emailError);
                }

                return {
                    success: true,
                    ticket,
                    message: productsWithoutStock.length > 0 
                        ? 'Compra parcial completada. Algunos productos no tenían stock suficiente.'
                        : 'Compra completada exitosamente',
                    productsWithoutStock: productsWithoutStock.length > 0 ? productsWithoutStock : undefined,
                    failedProducts: failedProducts.length > 0 ? failedProducts : undefined
                };
            }

            return {
                success: false,
                message: 'No se pudo procesar ningún producto',
                failedProducts
            };

        } catch (error) {
            console.error('Error en processPurchase:', error);
            throw new Error(`Error procesando la compra: ${error.message}`);
        }
    }

    async getTicketById(ticketId) {
        try {
            return await TicketRepository.findById(ticketId);
        } catch (error) {
            throw new Error(`Error obteniendo ticket: ${error.message}`);
        }
    }

    async getUserTickets(userId) {
        try {
            return await TicketRepository.findByUser(userId);
        } catch (error) {
            throw new Error(`Error obteniendo tickets del usuario: ${error.message}`);
        }
    }

    async getAllTickets() {
        try {
            return await TicketRepository.findAll();
        } catch (error) {
            throw new Error(`Error obteniendo todos los tickets: ${error.message}`);
        }
    }
}

module.exports = new PurchaseService();