const Ticket = require('../models/Ticket.model');

class TicketRepository {
    async create(ticketData) {
        try {
            const code = await Ticket.generateUniqueCode();
            if (ticketData.products && ticketData.products.length > 0) {
                ticketData.products = ticketData.products.map(item => ({
                    ...item,
                    subtotal: item.subtotal || (item.price * item.quantity)
                }));
            }

            const newTicket = new Ticket({
                ...ticketData,
                code,
                purchase_datetime: new Date()
            });

            return await newTicket.save();
        } catch (error) {
            throw new Error(`Error al crear ticket: ${error.message}`);
        }
    }

    async findById(ticketId) {
        try {
            return await Ticket.findById(ticketId)
                .populate('user', '-password')
                .populate('products.product');
        } catch (error) {
            throw new Error(`Error al buscar ticket: ${error.message}`);
        }
    }

    async findByCode(code) {
        try {
            return await Ticket.findOne({ code })
                .populate('user', '-password')
                .populate('products.product');
        } catch (error) {
            throw new Error(`Error al buscar ticket por código: ${error.message}`);
        }
    }

    async findByUser(userId) {
        try {
            return await Ticket.find({ user: userId })
                .populate('products.product')
                .sort({ purchase_datetime: -1 });
        } catch (error) {
            throw new Error(`Error al buscar tickets del usuario: ${error.message}`);
        }
    }

    async findByPurchaser(email) {
        try {
            return await Ticket.find({ purchaser: email })
                .populate('products.product')
                .populate('user', '-password')
                .sort({ purchase_datetime: -1 });
        } catch (error) {
            throw new Error(`Error al buscar tickets por purchaser: ${error.message}`);
        }
    }

    async findAll(options = {}) {
        try {
            const {
                limit = 100,
                skip = 0,
                status,
                startDate,
                endDate
            } = options;

            let query = {};

            if (status) {
                query.status = status;
            }

            if (startDate || endDate) {
                query.purchase_datetime = {};
                if (startDate) {
                    query.purchase_datetime.$gte = new Date(startDate);
                }
                if (endDate) {
                    query.purchase_datetime.$lte = new Date(endDate);
                }
            }

            return await Ticket.find(query)
                .populate('user', '-password')
                .populate('products.product')
                .sort({ purchase_datetime: -1 })
                .limit(limit)
                .skip(skip);
        } catch (error) {
            throw new Error(`Error al obtener tickets: ${error.message}`);
        }
    }

    async updateStatus(ticketId, newStatus) {
        try {
            const validStatuses = ['pending', 'completed', 'partial', 'cancelled'];
            if (!validStatuses.includes(newStatus)) {
                throw new Error('Estado inválido');
            }

            const updatedTicket = await Ticket.findByIdAndUpdate(
                ticketId,
                { status: newStatus },
                { new: true }
            ).populate('user', '-password').populate('products.product');

            if (!updatedTicket) {
                throw new Error('Ticket no encontrado');
            }

            return updatedTicket;
        } catch (error) {
            throw new Error(`Error al actualizar estado del ticket: ${error.message}`);
        }
    }

    async getTotalSales(startDate, endDate) {
        try {
            const match = { status: 'completed' };
            
            if (startDate || endDate) {
                match.purchase_datetime = {};
                if (startDate) match.purchase_datetime.$gte = new Date(startDate);
                if (endDate) match.purchase_datetime.$lte = new Date(endDate);
            }

            const result = await Ticket.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: null,
                        totalSales: { $sum: '$amount' },
                        ticketCount: { $sum: 1 }
                    }
                }
            ]);

            return result.length > 0 ? result[0] : { totalSales: 0, ticketCount: 0 };
        } catch (error) {
            throw new Error(`Error al calcular ventas totales: ${error.message}`);
        }
    }

    async delete(ticketId) {
        try {
            const deletedTicket = await Ticket.findByIdAndDelete(ticketId);
            if (!deletedTicket) {
                throw new Error('Ticket no encontrado');
            }
            return deletedTicket;
        } catch (error) {
            throw new Error(`Error al eliminar ticket: ${error.message}`);
        }
    }
}

module.exports = new TicketRepository();