const express = require('express');
const router = express.Router();
const UserRepository = require('../repositories/UserRepository');
const UserDTO = require('../dto/UserDTO');
const { isAuthenticated, isAdmin } = require('../middleware/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Gestión de usuarios del sistema
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "64a7f8c2b3e4d5f6a7b8c9d0"
 *         first_name:
 *           type: string
 *           example: "Juan"
 *         last_name:
 *           type: string
 *           example: "Acosta"
 *         email:
 *           type: string
 *           example: "juan@example.com"
 *         age:
 *           type: number
 *           example: 28
 *         role:
 *           type: string
 *           enum: [user, admin, premium]
 *           example: "user"
 *         cart:
 *           type: string
 *           example: "64a7f8c2b3e4d5f6a7b8c9d1"
 *         fullName:
 *           type: string
 *           example: "Juan Acosta"
 *     UserAdmin:
 *       allOf:
 *         - $ref: '#/components/schemas/User'
 *         - type: object
 *           properties:
 *             lastLogin:
 *               type: string
 *               format: date-time
 *             isLocked:
 *               type: boolean
 *             loginAttempts:
 *               type: number
 *             createdAt:
 *               type: string
 *               format: date-time
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: "error"
 *         message:
 *           type: string
 *           example: "Descripción del error"
 *   securitySchemes:
 *     cookieAuth:
 *       type: apiKey
 *       in: cookie
 *       name: token
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Obtener todos los usuarios
 *     description: Retorna la lista completa de usuarios. Solo accesible por administradores.
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 payload:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 count:
 *                   type: number
 *                   example: 5
 *                 message:
 *                   type: string
 *                   example: "5 usuario(s) encontrado(s)"
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Solo administradores
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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

/**
 * @swagger
 * /api/users/{uid}:
 *   get:
 *     summary: Obtener un usuario por ID
 *     description: El usuario puede ver su propio perfil. Los admins pueden ver cualquier perfil.
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario
 *         example: "64a7f8c2b3e4d5f6a7b8c9d0"
 *     responses:
 *       200:
 *         description: Usuario obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 payload:
 *                   $ref: '#/components/schemas/UserAdmin'
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Sin permisos para ver este usuario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:uid', isAuthenticated, async (req, res) => {
    try {
        const { uid } = req.params;
        if (req.user._id.toString() !== uid && req.user.role !== 'admin') {
            return res.status(403).json({ status: 'error', message: 'No tienes permisos para ver este usuario' });
        }
        const user = await UserRepository.findById(uid);
        if (!user) {
            return res.status(404).json({ status: 'error', message: `Usuario con ID ${uid} no encontrado` });
        }
        const userDTO = req.user.role === 'admin' ? UserDTO.forAdmin(user) : UserDTO.fromUser(user);
        res.json({ status: 'success', payload: userDTO });
    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ status: 'error', message: 'ID de usuario inválido' });
        }
        res.status(500).json({ status: 'error', message: 'Error al obtener usuario' });
    }
});

/**
 * @swagger
 * /api/users/{uid}:
 *   put:
 *     summary: Actualizar datos de un usuario
 *     description: No se puede modificar password, role ni _id por esta ruta.
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario a actualizar
 *         example: "64a7f8c2b3e4d5f6a7b8c9d0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *                 example: "Juan"
 *               last_name:
 *                 type: string
 *                 example: "Acosta"
 *               age:
 *                 type: number
 *                 example: 29
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 payload:
 *                   $ref: '#/components/schemas/User'
 *                 message:
 *                   type: string
 *                   example: "Usuario actualizado exitosamente"
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Sin permisos para actualizar este usuario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:uid', isAuthenticated, async (req, res) => {
    try {
        const { uid } = req.params;
        if (req.user._id.toString() !== uid && req.user.role !== 'admin') {
            return res.status(403).json({ status: 'error', message: 'No tienes permisos para actualizar este usuario' });
        }
        const updatedUser = await UserRepository.update(uid, req.body);
        const userDTO = UserDTO.fromUser(updatedUser);
        res.json({ status: 'success', payload: userDTO, message: 'Usuario actualizado exitosamente' });
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ status: 'error', message: 'ID de usuario inválido' });
        }
        if (error.message.includes('no encontrado')) {
            return res.status(404).json({ status: 'error', message: error.message });
        }
        res.status(500).json({ status: 'error', message: 'Error al actualizar usuario' });
    }
});

/**
 * @swagger
 * /api/users/{uid}/role:
 *   put:
 *     summary: Cambiar el rol de un usuario
 *     description: Solo administradores. Roles disponibles: user, admin, premium.
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario
 *         example: "64a7f8c2b3e4d5f6a7b8c9d0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, admin, premium]
 *                 example: "premium"
 *     responses:
 *       200:
 *         description: Rol actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 payload:
 *                   $ref: '#/components/schemas/UserAdmin'
 *                 message:
 *                   type: string
 *                   example: "Rol actualizado a premium exitosamente"
 *       400:
 *         description: Rol inválido o ausente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Solo administradores
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:uid/role', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { uid } = req.params;
        const { role } = req.body;
        if (!role) {
            return res.status(400).json({ status: 'error', message: 'El campo role es requerido' });
        }
        const updatedUser = await UserRepository.updateRole(uid, role);
        const userDTO = UserDTO.forAdmin(updatedUser);
        res.json({ status: 'success', payload: userDTO, message: `Rol actualizado a ${role} exitosamente` });
    } catch (error) {
        console.error('Error actualizando rol:', error);
        if (error.message.includes('Rol inválido')) {
            return res.status(400).json({ status: 'error', message: error.message });
        }
        res.status(500).json({ status: 'error', message: 'Error al actualizar rol del usuario' });
    }
});

/**
 * @swagger
 * /api/users/{uid}:
 *   delete:
 *     summary: Eliminar un usuario
 *     description: Elimina permanentemente un usuario. Solo administradores.
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario a eliminar
 *         example: "64a7f8c2b3e4d5f6a7b8c9d0"
 *     responses:
 *       200:
 *         description: Usuario eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 payload:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     first_name:
 *                       type: string
 *                     last_name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                 message:
 *                   type: string
 *                   example: "Usuario eliminado exitosamente"
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Solo administradores
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:uid', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { uid } = req.params;
        const deletedUser = await UserRepository.delete(uid);
        res.json({ status: 'success', payload: UserDTO.minimal(deletedUser), message: 'Usuario eliminado exitosamente' });
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ status: 'error', message: 'ID de usuario inválido' });
        }
        if (error.message.includes('no encontrado')) {
            return res.status(404).json({ status: 'error', message: error.message });
        }
        res.status(500).json({ status: 'error', message: 'Error al eliminar usuario' });
    }
});

module.exports = router;