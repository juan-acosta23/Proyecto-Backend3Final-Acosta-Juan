const express = require('express');
const router = express.Router();
const UserRepository = require('../repositories/UserRepository');
const UserDTO = require('../dto/UserDTO');
const { isAuthenticated, isAdmin } = require('../middleware/auth.middleware');


router.get('/', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const users = await UserRepository.findAll();

        const usersDTO = UserDTO.fromUsers(users);

        res.json({
            status: 'success',
            payload: usersDTO,
            count: usersDTO.length,
            message: `${usersDTO.length} usuario(s) encontrado(s)`
        });
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error al obtener usuarios',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

router.get('/:uid', isAuthenticated, async (req, res) => {
    try {
        const { uid } = req.params;

        if (req.user._id.toString() !== uid && req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'No tienes permisos para ver este usuario'
            });
        }

        const user = await UserRepository.findById(uid);

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: `Usuario con ID ${uid} no encontrado`
            });
        }

        const userDTO = req.user.role === 'admin' 
            ? UserDTO.forAdmin(user)
            : UserDTO.fromUser(user);

        res.json({
            status: 'success',
            payload: userDTO
        });
    } catch (error) {
        console.error('Error obteniendo usuario:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                status: 'error',
                message: 'ID de usuario inválido'
            });
        }

        res.status(500).json({
            status: 'error',
            message: 'Error al obtener usuario'
        });
    }
});

router.put('/:uid', isAuthenticated, async (req, res) => {
    try {
        const { uid } = req.params;

        if (req.user._id.toString() !== uid && req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'No tienes permisos para actualizar este usuario'
            });
        }

        const updatedUser = await UserRepository.update(uid, req.body);

        const userDTO = UserDTO.fromUser(updatedUser);

        res.json({
            status: 'success',
            payload: userDTO,
            message: 'Usuario actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error actualizando usuario:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                status: 'error',
                message: 'ID de usuario inválido'
            });
        }

        if (error.message.includes('no encontrado')) {
            return res.status(404).json({
                status: 'error',
                message: error.message
            });
        }

        res.status(500).json({
            status: 'error',
            message: 'Error al actualizar usuario'
        });
    }
});


router.put('/:uid/role', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { uid } = req.params;
        const { role } = req.body;

        if (!role) {
            return res.status(400).json({
                status: 'error',
                message: 'El campo role es requerido'
            });
        }

        const updatedUser = await UserRepository.updateRole(uid, role);

        const userDTO = UserDTO.forAdmin(updatedUser);

        res.json({
            status: 'success',
            payload: userDTO,
            message: `Rol actualizado a ${role} exitosamente`
        });
    } catch (error) {
        console.error('Error actualizando rol:', error);

        if (error.message.includes('Rol inválido')) {
            return res.status(400).json({
                status: 'error',
                message: error.message
            });
        }

        res.status(500).json({
            status: 'error',
            message: 'Error al actualizar rol del usuario'
        });
    }
});


router.delete('/:uid', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { uid } = req.params;

        const deletedUser = await UserRepository.delete(uid);

        res.json({
            status: 'success',
            payload: UserDTO.minimal(deletedUser),
            message: 'Usuario eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error eliminando usuario:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                status: 'error',
                message: 'ID de usuario inválido'
            });
        }

        if (error.message.includes('no encontrado')) {
            return res.status(404).json({
                status: 'error',
                message: error.message
            });
        }

        res.status(500).json({
            status: 'error',
            message: 'Error al eliminar usuario'
        });
    }
});

module.exports = router;