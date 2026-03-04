const User = require('../models/User.model');

class UserRepository {
    async findAll() {
        try {
            return await User.find().populate('cart').select('-password');
        } catch (error) {
            throw new Error(`Error al obtener usuarios: ${error.message}`);
        }
    }

    async findById(userId) {
        try {
            return await User.findById(userId).populate('cart');
        } catch (error) {
            throw new Error(`Error al buscar usuario: ${error.message}`);
        }
    }

    async findByEmail(email) {
        try {
            return await User.findByEmail(email);
        } catch (error) {
            throw new Error(`Error al buscar usuario por email: ${error.message}`);
        }
    }

    async create(userData) {
        try {
            const existingUser = await this.findByEmail(userData.email);
            if (existingUser) {
                throw new Error('El email ya está registrado');
            }

            const newUser = new User(userData);
            return await newUser.save();
        } catch (error) {
            throw new Error(`Error al crear usuario: ${error.message}`);
        }
    }

    async update(userId, updateData) {
        try {
            delete updateData._id;
            delete updateData.password;
            delete updateData.role;
            delete updateData.createdAt;
            delete updateData.updatedAt;

            const updatedUser = await User.findByIdAndUpdate(
                userId,
                updateData,
                { new: true, runValidators: true }
            ).populate('cart');

            if (!updatedUser) {
                throw new Error('Usuario no encontrado');
            }

            return updatedUser;
        } catch (error) {
            throw new Error(`Error al actualizar usuario: ${error.message}`);
        }
    }

    async updatePassword(userId, newHashedPassword) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('Usuario no encontrado');
            }

            user.password = newHashedPassword;
            user.passwordChangedAt = new Date();
            return await user.save();
        } catch (error) {
            throw new Error(`Error al actualizar contraseña: ${error.message}`);
        }
    }

    async updateRole(userId, newRole) {
        try {
            const validRoles = ['user', 'admin', 'premium'];
            if (!validRoles.includes(newRole)) {
                throw new Error('Rol inválido');
            }

            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { role: newRole },
                { new: true }
            ).populate('cart');

            if (!updatedUser) {
                throw new Error('Usuario no encontrado');
            }

            return updatedUser;
        } catch (error) {
            throw new Error(`Error al actualizar rol: ${error.message}`);
        }
    }

    async delete(userId) {
        try {
            const deletedUser = await User.findByIdAndDelete(userId);
            if (!deletedUser) {
                throw new Error('Usuario no encontrado');
            }
            return deletedUser;
        } catch (error) {
            throw new Error(`Error al eliminar usuario: ${error.message}`);
        }
    }

    async unlockAccount(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('Usuario no encontrado');
            }

            return await user.unlockAccount();
        } catch (error) {
            throw new Error(`Error al desbloquear cuenta: ${error.message}`);
        }
    }

    async recordLoginAttempt(userId, success, ip, userAgent) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('Usuario no encontrado');
            }

            return await user.recordLoginAttempt(success, ip, userAgent);
        } catch (error) {
            throw new Error(`Error al registrar intento de login: ${error.message}`);
        }
    }
}

module.exports = new UserRepository();