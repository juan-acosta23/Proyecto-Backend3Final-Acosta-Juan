const express = require('express');
const router = express.Router();
const PetRepository = require('../repositories/PetRepository');
const { isAuthenticated, isAdmin } = require('../middleware/auth.middleware');

router.get('/', async (req, res) => {
    try {
        const { limit, skip, adopted, species } = req.query;

        const options = {};
        if (limit) options.limit = parseInt(limit);
        if (skip) options.skip = parseInt(skip);
        if (adopted !== undefined) options.adopted = adopted === 'true';
        if (species) options.species = species;

        const pets = await PetRepository.findAll(options);
        const total = await PetRepository.countDocuments(options.adopted !== undefined ? { adopted: options.adopted } : {});

        res.json({
            status: 'success',
            payload: pets,
            total,
            count: pets.length,
            filters: options
        });
    } catch (error) {
        console.error('Error obteniendo mascotas:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error al obtener mascotas',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

router.get('/available', async (req, res) => {
    try {
        const pets = await PetRepository.findAvailable();

        res.json({
            status: 'success',
            payload: pets,
            count: pets.length,
            message: pets.length > 0 ? 'Mascotas disponibles para adopción' : 'No hay mascotas disponibles'
        });
    } catch (error) {
        console.error('Error obteniendo mascotas disponibles:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error al obtener mascotas disponibles'
        });
    }
});


router.get('/species/:species', async (req, res) => {
    try {
        const { species } = req.params;
        const pets = await PetRepository.findBySpecies(species);

        res.json({
            status: 'success',
            payload: pets,
            species,
            count: pets.length
        });
    } catch (error) {
        console.error('Error buscando mascotas por especie:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error al buscar mascotas por especie'
        });
    }
});


router.get('/:pid', async (req, res) => {
    try {
        const { pid } = req.params;
        const pet = await PetRepository.findById(pid);

        if (!pet) {
            return res.status(404).json({
                status: 'error',
                message: `Mascota con ID ${pid} no encontrada`
            });
        }

        res.json({
            status: 'success',
            payload: pet
        });
    } catch (error) {
        console.error('Error obteniendo mascota:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                status: 'error',
                message: 'ID de mascota inválido'
            });
        }

        res.status(500).json({
            status: 'error',
            message: 'Error al obtener mascota'
        });
    }
});


router.post('/', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const newPet = await PetRepository.create(req.body);

        res.status(201).json({
            status: 'success',
            payload: newPet,
            message: 'Mascota creada exitosamente'
        });
    } catch (error) {
        console.error('Error creando mascota:', error);

        if (error.message.includes('ValidationError') || error.message.includes('validación')) {
            return res.status(400).json({
                status: 'error',
                message: 'Datos de mascota inválidos',
                error: error.message
            });
        }

        res.status(500).json({
            status: 'error',
            message: 'Error al crear mascota'
        });
    }
});

router.put('/:pid', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { pid } = req.params;
        const updatedPet = await PetRepository.update(pid, req.body);

        res.json({
            status: 'success',
            payload: updatedPet,
            message: 'Mascota actualizada exitosamente'
        });
    } catch (error) {
        console.error('Error actualizando mascota:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                status: 'error',
                message: 'ID de mascota inválido'
            });
        }

        if (error.message.includes('no encontrada')) {
            return res.status(404).json({
                status: 'error',
                message: error.message
            });
        }

        res.status(500).json({
            status: 'error',
            message: 'Error al actualizar mascota'
        });
    }
});

router.post('/:pid/adopt', isAuthenticated, async (req, res) => {
    try {
        const { pid } = req.params;
        const userId = req.user._id;

        const adoptedPet = await PetRepository.adoptPet(pid, userId);

        res.json({
            status: 'success',
            payload: adoptedPet,
            message: `¡Felicidades! Has adoptado a ${adoptedPet.name}`
        });
    } catch (error) {
        console.error('Error adoptando mascota:', error);

        if (error.message.includes('ya ha sido adoptada')) {
            return res.status(400).json({
                status: 'error',
                message: error.message
            });
        }

        if (error.message.includes('no encontrada')) {
            return res.status(404).json({
                status: 'error',
                message: error.message
            });
        }

        res.status(500).json({
            status: 'error',
            message: 'Error al adoptar mascota'
        });
    }
});

router.delete('/:pid', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { pid } = req.params;
        const deletedPet = await PetRepository.delete(pid);

        res.json({
            status: 'success',
            payload: deletedPet,
            message: 'Mascota eliminada exitosamente'
        });
    } catch (error) {
        console.error('Error eliminando mascota:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                status: 'error',
                message: 'ID de mascota inválido'
            });
        }

        if (error.message.includes('no encontrada')) {
            return res.status(404).json({
                status: 'error',
                message: error.message
            });
        }

        res.status(500).json({
            status: 'error',
            message: 'Error al eliminar mascota'
        });
    }
});

module.exports = router;