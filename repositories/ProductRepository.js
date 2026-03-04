const Product = require('../models/Product.model');

class ProductRepository {
    async findAll(filter = {}, options = {}) {
        try {
            if (options.paginate) {
                return await Product.paginate(filter, options);
            }
            
            let query = Product.find(filter);
            
            if (options.sort) {
                query = query.sort(options.sort);
            }
            
            if (options.limit) {
                query = query.limit(options.limit);
            }
            
            if (options.lean) {
                query = query.lean();
            }
            
            return await query;
        } catch (error) {
            throw new Error(`Error al obtener productos: ${error.message}`);
        }
    }

    async findById(productId) {
        try {
            return await Product.findById(productId);
        } catch (error) {
            throw new Error(`Error al buscar producto: ${error.message}`);
        }
    }

    async findByCode(code) {
        try {
            return await Product.findByCode(code);
        } catch (error) {
            throw new Error(`Error al buscar producto por código: ${error.message}`);
        }
    }

    async create(productData) {
        try {
            const existingProduct = await this.findByCode(productData.code);
            if (existingProduct) {
                throw new Error(`Ya existe un producto con el código ${productData.code}`);
            }

            const newProduct = new Product(productData);
            return await newProduct.save();
        } catch (error) {
            throw new Error(`Error al crear producto: ${error.message}`);
        }
    }

    async update(productId, updateData) {
        try {
            // No permitir actualizar el _id ni campos de timestamp
            delete updateData._id;
            delete updateData.createdAt;
            delete updateData.updatedAt;

            // Si se está actualizando el código, verificar que no exista
            if (updateData.code) {
                const existingProduct = await this.findByCode(updateData.code);
                if (existingProduct && existingProduct._id.toString() !== productId) {
                    throw new Error('El código de producto ya existe');
                }
            }

            const updatedProduct = await Product.findByIdAndUpdate(
                productId,
                updateData,
                { new: true, runValidators: true }
            );

            if (!updatedProduct) {
                throw new Error('Producto no encontrado');
            }

            return updatedProduct;
        } catch (error) {
            throw new Error(`Error al actualizar producto: ${error.message}`);
        }
    }

    async delete(productId) {
        try {
            const deletedProduct = await Product.findByIdAndDelete(productId);
            if (!deletedProduct) {
                throw new Error('Producto no encontrado');
            }
            return deletedProduct;
        } catch (error) {
            throw new Error(`Error al eliminar producto: ${error.message}`);
        }
    }

    async decrementStock(productId, quantity) {
        try {
            const product = await this.findById(productId);
            if (!product) {
                throw new Error('Producto no encontrado');
            }

            return await product.decrementStock(quantity);
        } catch (error) {
            throw new Error(`Error al decrementar stock: ${error.message}`);
        }
    }

    async incrementStock(productId, quantity) {
        try {
            const product = await this.findById(productId);
            if (!product) {
                throw new Error('Producto no encontrado');
            }

            return await product.incrementStock(quantity);
        } catch (error) {
            throw new Error(`Error al incrementar stock: ${error.message}`);
        }
    }

    async checkStock(productId, quantity) {
        try {
            const product = await this.findById(productId);
            if (!product) {
                return false;
            }

            return product.hasStock(quantity);
        } catch (error) {
            throw new Error(`Error al verificar stock: ${error.message}`);
        }
    }

    async findAvailable() {
        try {
            return await Product.findAvailable();
        } catch (error) {
            throw new Error(`Error al buscar productos disponibles: ${error.message}`);
        }
    }

    async findByCategory(category) {
        try {
            return await Product.findByCategory(category);
        } catch (error) {
            throw new Error(`Error al buscar productos por categoría: ${error.message}`);
        }
    }
}

module.exports = new ProductRepository();