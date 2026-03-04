const Pet = require('../models/Pet.model');

class PetRepository {
    async findAll(options = {}) {
        try {
            const { limit, skip, adopted, species } = options;
            
            let query = {};
            if (adopted !== undefined) {
                query.adopted = adopted;
            }
            if (species) {
                query.species = species.toLowerCase();
            }
            
            let findQuery = Pet.find(query).populate('owner', '-password');
            
            if (limit) {
                findQuery = findQuery.limit(limit);
            }
            if (skip) {
                findQuery = findQuery.skip(skip);
            }
            
            return await findQuery;
        } catch (error) {
            throw new Error(`Error al obtener mascotas: ${error.message}`);
        }
    }

    async findById(petId) {
        try {
            return await Pet.findById(petId).populate('owner', '-password');
        } catch (error) {
            throw new Error(`Error al buscar mascota: ${error.message}`);
        }
    }

    async create(petData) {
        try {
            const newPet = new Pet(petData);
            return await newPet.save();
        } catch (error) {
            throw new Error(`Error al crear mascota: ${error.message}`);
        }
    }

    async createMany(petsArray) {
        try {
            return await Pet.insertMany(petsArray);
        } catch (error) {
            throw new Error(`Error al crear múltiples mascotas: ${error.message}`);
        }
    }

    async update(petId, updateData) {
        try {
            delete updateData._id;
            delete updateData.createdAt;
            delete updateData.updatedAt;

            const updatedPet = await Pet.findByIdAndUpdate(
                petId,
                updateData,
                { new: true, runValidators: true }
            ).populate('owner', '-password');

            if (!updatedPet) {
                throw new Error('Mascota no encontrada');
            }

            return updatedPet;
        } catch (error) {
            throw new Error(`Error al actualizar mascota: ${error.message}`);
        }
    }

    async delete(petId) {
        try {
            const deletedPet = await Pet.findByIdAndDelete(petId);
            if (!deletedPet) {
                throw new Error('Mascota no encontrada');
            }
            return deletedPet;
        } catch (error) {
            throw new Error(`Error al eliminar mascota: ${error.message}`);
        }
    }

    async findAvailable() {
        try {
            return await Pet.findAvailable();
        } catch (error) {
            throw new Error(`Error al buscar mascotas disponibles: ${error.message}`);
        }
    }

    async findBySpecies(species) {
        try {
            return await Pet.findBySpecies(species);
        } catch (error) {
            throw new Error(`Error al buscar mascotas por especie: ${error.message}`);
        }
    }

    async adoptPet(petId, userId) {
        try {
            const pet = await Pet.findById(petId);
            if (!pet) {
                throw new Error('Mascota no encontrada');
            }
            
            return await pet.adopt(userId);
        } catch (error) {
            throw new Error(`Error al adoptar mascota: ${error.message}`);
        }
    }

    async countDocuments(filter = {}) {
        try {
            return await Pet.countDocuments(filter);
        } catch (error) {
            throw new Error(`Error al contar mascotas: ${error.message}`);
        }
    }
}

module.exports = new PetRepository();