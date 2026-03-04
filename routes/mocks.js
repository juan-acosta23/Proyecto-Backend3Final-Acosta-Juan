const express = require('express');
const router = express.Router();
const MockingService = require('../utils/mocking');
const UserRepository = require('../repositories/UserRepository');
const PetRepository = require('../repositories/PetRepository');
const { isAuthenticated, isAdmin } = require('../middleware/auth.middleware');

router.get('/mockingpets', (req, res) => {
    try {
        const count = parseInt(req.query.count) || 100;
        
        if (count < 1 || count > 1000) {
            return res.status(400).json({
                status: 'error',
                message: 'El parámetro count debe estar entre 1 y 1000'
            });
        }

        const mockPets = MockingService.generatePets(count);

        res.json({
            status: 'success',
            payload: mockPets,
            message: `${count} mascotas mock generadas exitosamente`,
            count: mockPets.length
        });
    } catch (error) {
        console.error('Error en /mockingpets:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error al generar mascotas mock',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

router.get('/mockingusers', (req, res) => {
    try {
        const mockUsers = MockingService.generateUsers(50);

        res.json({
            status: 'success',
            payload: mockUsers,
            message: '50 usuarios mock generados exitosamente',
            count: mockUsers.length,
            info: {
                defaultPassword: 'coder123 (encriptado)',
                possibleRoles: ['user', 'admin'],
                petsArray: 'vacío por defecto'
            }
        });
    } catch (error) {
        console.error('Error en /mockingusers:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error al generar usuarios mock',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

router.post('/generateData', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { users, pets } = req.body;

        if (users === undefined && pets === undefined) {
            return res.status(400).json({
                status: 'error',
                message: 'Debes proporcionar al menos uno de los parámetros: users o pets'
            });
        }

        const usersCount = parseInt(users) || 0;
        const petsCount = parseInt(pets) || 0;

        if (usersCount < 0 || petsCount < 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Los parámetros users y pets deben ser números positivos'
            });
        }

        if (usersCount > 1000 || petsCount > 1000) {
            return res.status(400).json({
                status: 'error',
                message: 'El máximo permitido es 1000 registros por tipo'
            });
        }

        const results = {
            users: { count: 0, success: false },
            pets: { count: 0, success: false }
        };

        if (usersCount > 0) {
            const mockUsers = MockingService.generateUsers(usersCount);
            
            let insertedUsers = 0;
            for (const userData of mockUsers) {
                try {
                    const existingUser = await UserRepository.findByEmail(userData.email);
                    if (!existingUser) {
                        const Cart = require('../models/Cart.model');
                        const newCart = new Cart();
                        await newCart.save();
                        
                        userData.cart = newCart._id;
                        await UserRepository.create(userData);
                        insertedUsers++;
                    }
                } catch (error) {
                    console.error(`Error insertando usuario: ${error.message}`);
                }
            }
            
            results.users.count = insertedUsers;
            results.users.success = insertedUsers > 0;
        }

        if (petsCount > 0) {
            const mockPets = MockingService.generatePets(petsCount);
            const insertedPets = await PetRepository.createMany(mockPets);
            results.pets.count = insertedPets.length;
            results.pets.success = insertedPets.length > 0;
        }

        const totalUsers = await UserRepository.findAll();
        const totalPets = await PetRepository.countDocuments();

        res.status(201).json({
            status: 'success',
            message: 'Datos generados e insertados exitosamente',
            payload: {
                generated: results,
                currentTotals: {
                    users: totalUsers.length,
                    pets: totalPets
                }
            },
            info: {
                usersGenerated: results.users.count,
                petsGenerated: results.pets.count,
                verification: {
                    users: 'GET /api/users',
                    pets: 'GET /api/pets'
                }
            }
        });
    } catch (error) {
        console.error('Error en /generateData:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error al generar e insertar datos',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});


if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    router.post('/generateData-public', async (req, res) => {
        try {
            const { users, pets } = req.body;

            if (users === undefined && pets === undefined) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Debes proporcionar al menos uno de los parámetros: users o pets'
                });
            }

            const usersCount = parseInt(users) || 0;
            const petsCount = parseInt(pets) || 0;

            if (usersCount < 0 || petsCount < 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Los parámetros users y pets deben ser números positivos'
                });
            }

            if (usersCount > 1000 || petsCount > 1000) {
                return res.status(400).json({
                    status: 'error',
                    message: 'El máximo permitido es 1000 registros por tipo'
                });
            }

            const results = {
                users: { count: 0, success: false },
                pets: { count: 0, success: false }
            };

            if (usersCount > 0) {
                const mockUsers = MockingService.generateUsers(usersCount);
                
                let insertedUsers = 0;
                for (const userData of mockUsers) {
                    try {
                        const existingUser = await UserRepository.findByEmail(userData.email);
                        if (!existingUser) {
                            const Cart = require('../models/Cart.model');
                            const newCart = new Cart();
                            await newCart.save();
                            
                            userData.cart = newCart._id;
                            await UserRepository.create(userData);
                            insertedUsers++;
                        }
                    } catch (error) {
                        console.error(`Error insertando usuario: ${error.message}`);
                    }
                }
                
                results.users.count = insertedUsers;
                results.users.success = insertedUsers > 0;
            }

            if (petsCount > 0) {
                const mockPets = MockingService.generatePets(petsCount);
                const insertedPets = await PetRepository.createMany(mockPets);
                results.pets.count = insertedPets.length;
                results.pets.success = insertedPets.length > 0;
            }

            const totalUsers = await UserRepository.findAll();
            const totalPets = await PetRepository.countDocuments();

            res.status(201).json({
                status: 'success',
                message: 'Datos generados e insertados exitosamente (modo desarrollo)',
                payload: {
                    generated: results,
                    currentTotals: {
                        users: totalUsers.length,
                        pets: totalPets
                    }
                },
                info: {
                    usersGenerated: results.users.count,
                    petsGenerated: results.pets.count,
                    verification: {
                        users: 'GET /api/users',
                        pets: 'GET /api/pets'
                    }
                },
                warning: 'Este endpoint solo está disponible en modo desarrollo'
            });
        } catch (error) {
            console.error('Error en /generateData-public:', error);
            res.status(500).json({
                status: 'error',
                message: 'Error al generar e insertar datos',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });
}

router.delete('/clear', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const User = require('../models/User.model');
        const Pet = require('../models/Pet.model');

        const bcrypt = require('bcrypt');
        const allUsers = await User.find();
        let deletedUsers = 0;

        for (const user of allUsers) {
            const isMockUser = bcrypt.compareSync('coder123', user.password);
            if (isMockUser) {
                await User.findByIdAndDelete(user._id);
                deletedUsers++;
            }
        }

        const deletedPets = await Pet.deleteMany({ owner: null, adopted: false });

        res.json({
            status: 'success',
            message: 'Datos de prueba eliminados',
            payload: {
                usersDeleted: deletedUsers,
                petsDeleted: deletedPets.deletedCount
            }
        });
    } catch (error) {
        console.error('Error en /clear:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error al limpiar datos de prueba',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;