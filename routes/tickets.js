const express = require('express');
const router = express.Router();
const PurchaseService = require('../services/PurchaseService');
const { isAuthenticated, isAdmin } = require('../middleware/auth.middleware');

router.get('/:tid', isAuthenticated, async (req, res) => {
    try {
        const { tid } = req.params;
        const ticket = await PurchaseService.getTicketById(tid);

        if (!ticket) {
            return res.status(404).json({
                status: 'error',
                message: 'Ticket no encontrado'
            });
        }

        if (ticket.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'No tienes permisos para ver este ticket'
            });
        }

        res.json({
            status: 'success',
            payload: ticket
        });
    } catch (error) {
        console.error('Error obteniendo ticket:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error al obtener el ticket'
        });
    }
});

router.get('/user/my-tickets', isAuthenticated, async (req, res) => {
    try {
        const tickets = await PurchaseService.getUserTickets(req.user._id);

        res.json({
            status: 'success',
            payload: tickets,
            message: tickets.length > 0 
                ? `${tickets.length} ticket(s) encontrado(s)` 
                : 'No tienes tickets de compra'
        });
    } catch (error) {
        console.error('Error obteniendo tickets del usuario:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error al obtener tus tickets'
        });
    }
});

router.get('/', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const tickets = await PurchaseService.getAllTickets();

        res.json({
            status: 'success',
            payload: tickets,
            totalTickets: tickets.length
        });
    } catch (error) {
        console.error('Error obteniendo todos los tickets:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error al obtener los tickets'
        });
    }
});

module.exports = router;