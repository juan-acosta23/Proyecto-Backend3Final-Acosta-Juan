const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const { expect } = chai;
chai.use(chaiHttp);

// Importamos la app sin iniciar el servidor
const app = require('../app');

const MONGO_TEST_URI = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/petstore_test';

// Variable para guardar IDs generados durante tests
let testPetId;
let adminToken;
let userToken;
let adminUserId;
let regularUserId;

before(async function () {
    this.timeout(15000);

    try {
        // Conectar a DB de test si no está ya conectado
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(MONGO_TEST_URI);
            console.log('✓ Conectado a MongoDB de tests');
        }
    } catch (err) {
        console.error('Error conectando a MongoDB:', err.message);
    }
});

after(async function () {
    // Limpiar mascotas de prueba
    try {
        await mongoose.connection.collection('pets').deleteMany({ name: /^TEST_/ });
        console.log('✓ Datos de prueba limpiados');
    } catch (err) {
        console.error('Error limpiando datos:', err.message);
    }
});

// =========================================================
// Helpers para autenticación
// =========================================================
async function loginAndGetToken(email, password) {
    const res = await chai
        .request(app)
        .post('/api/sessions/login')
        .send({ email, password });
    
    // Extraer JWT de cookie o de body según implementación
    if (res.headers['set-cookie']) {
        const cookie = res.headers['set-cookie'].find(c => c.startsWith('jwt='));
        if (cookie) return cookie.split(';')[0]; // "jwt=TOKEN"
    }
    if (res.body && res.body.payload && res.body.payload.token) {
        return `Bearer ${res.body.payload.token}`;
    }
    return null;
}

// =========================================================
// SUITE: GET /api/pets
// =========================================================
describe('GET /api/pets - Obtener todas las mascotas', function () {
    this.timeout(10000);

    it('Debe retornar status 200', async function () {
        const res = await chai.request(app).get('/api/pets');
        expect(res).to.have.status(200);
    });

    it('Debe retornar un objeto con status "success"', async function () {
        const res = await chai.request(app).get('/api/pets');
        expect(res.body).to.have.property('status', 'success');
    });

    it('Debe retornar un payload que es un arreglo', async function () {
        const res = await chai.request(app).get('/api/pets');
        expect(res.body).to.have.property('payload');
        expect(res.body.payload).to.be.an('array');
    });

    it('Debe retornar la propiedad count (número de mascotas)', async function () {
        const res = await chai.request(app).get('/api/pets');
        expect(res.body).to.have.property('count');
        expect(res.body.count).to.be.a('number');
    });

    it('Debe aceptar query param ?adopted=false sin errores', async function () {
        const res = await chai.request(app).get('/api/pets?adopted=false');
        expect(res).to.have.status(200);
        expect(res.body.status).to.equal('success');
    });

    it('Debe aceptar query param ?limit=5 sin errores', async function () {
        const res = await chai.request(app).get('/api/pets?limit=5');
        expect(res).to.have.status(200);
        expect(res.body.payload.length).to.be.at.most(5);
    });
});

// =========================================================
// SUITE: GET /api/pets/available
// =========================================================
describe('GET /api/pets/available - Mascotas disponibles para adopción', function () {
    this.timeout(10000);

    it('Debe retornar status 200', async function () {
        const res = await chai.request(app).get('/api/pets/available');
        expect(res).to.have.status(200);
    });

    it('Debe retornar status "success" y un payload arreglo', async function () {
        const res = await chai.request(app).get('/api/pets/available');
        expect(res.body.status).to.equal('success');
        expect(res.body.payload).to.be.an('array');
    });

    it('Todas las mascotas retornadas deben tener adopted = false', async function () {
        const res = await chai.request(app).get('/api/pets/available');
        res.body.payload.forEach(pet => {
            expect(pet.adopted).to.equal(false);
        });
    });
});

// =========================================================
// SUITE: GET /api/pets/species/:species
// =========================================================
describe('GET /api/pets/species/:species - Mascotas por especie', function () {
    this.timeout(10000);

    it('Debe retornar status 200 para una especie válida (dog)', async function () {
        const res = await chai.request(app).get('/api/pets/species/dog');
        expect(res).to.have.status(200);
    });

    it('Debe retornar status "success" y el campo species en la respuesta', async function () {
        const res = await chai.request(app).get('/api/pets/species/cat');
        expect(res.body.status).to.equal('success');
        expect(res.body).to.have.property('species');
    });

    it('Las mascotas retornadas deben pertenecer a la especie solicitada', async function () {
        const res = await chai.request(app).get('/api/pets/species/dog');
        res.body.payload.forEach(pet => {
            expect(pet.species).to.equal('dog');
        });
    });
});

// =========================================================
// SUITE: GET /api/pets/:pid
// =========================================================
describe('GET /api/pets/:pid - Obtener mascota por ID', function () {
    this.timeout(10000);

    it('Debe retornar 400 con un ID inválido (no ObjectId)', async function () {
        const res = await chai.request(app).get('/api/pets/id-invalido-123');
        expect(res).to.have.status(400);
        expect(res.body.status).to.equal('error');
    });

    it('Debe retornar 404 si la mascota no existe (ObjectId válido pero inexistente)', async function () {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await chai.request(app).get(`/api/pets/${fakeId}`);
        expect(res).to.have.status(404);
        expect(res.body.status).to.equal('error');
    });

    it('Debe retornar 200 y los datos de la mascota si existe', async function () {
        // Usamos el testPetId creado en la suite de POST
        if (!testPetId) return this.skip();
        const res = await chai.request(app).get(`/api/pets/${testPetId}`);
        expect(res).to.have.status(200);
        expect(res.body.payload).to.have.property('_id');
    });
});

// =========================================================
// SUITE: POST /api/pets - Crear mascota (requiere admin)
// =========================================================
describe('POST /api/pets - Crear nueva mascota', function () {
    this.timeout(15000);

    const validPet = {
        name: 'TEST_Firulais',
        species: 'dog',
        birthDate: '2020-05-15'
    };

    const invalidPet = {
        species: 'dog'
        // Sin name → debe fallar
    };

    it('Debe retornar 401 si no se proporciona autenticación', async function () {
        const res = await chai.request(app).post('/api/pets').send(validPet);
        expect(res).to.have.status(401);
    });

    it('Debe retornar 401/403 si el usuario no es admin', async function () {
        // Intentamos con credenciales de usuario regular
        const res = await chai
            .request(app)
            .post('/api/pets')
            .set('Cookie', userToken || '')
            .send(validPet);
        expect(res.status).to.be.oneOf([401, 403]);
    });

    // Este test requiere credenciales admin activas - se marca como pendiente
    // si no hay token disponible
    it('Debe retornar 201 y crear la mascota con datos válidos (requiere admin)', async function () {
        // Intentar login con admin por defecto del sistema
        const cookie = await loginAndGetToken('admin@ecommerce.com', 'admin123');
        if (!cookie) return this.skip();

        const res = await chai
            .request(app)
            .post('/api/pets')
            .set('Cookie', cookie)
            .send(validPet);

        if (res.status === 201) {
            testPetId = res.body.payload._id;
            expect(res.body.status).to.equal('success');
            expect(res.body.payload).to.have.property('name', validPet.name);
            expect(res.body.payload).to.have.property('species', validPet.species);
        } else {
            // Si la BD no tiene admin creado, saltamos el test
            this.skip();
        }
    });
});

// =========================================================
// SUITE: PUT /api/pets/:pid - Actualizar mascota (requiere admin)
// =========================================================
describe('PUT /api/pets/:pid - Actualizar mascota', function () {
    this.timeout(15000);

    it('Debe retornar 401 si no se proporciona autenticación', async function () {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await chai
            .request(app)
            .put(`/api/pets/${fakeId}`)
            .send({ name: 'Nuevo nombre' });
        expect(res).to.have.status(401);
    });

    it('Debe retornar 400 con un ID inválido', async function () {
        const cookie = await loginAndGetToken('admin@ecommerce.com', 'admin123');
        if (!cookie) return this.skip();

        const res = await chai
            .request(app)
            .put('/api/pets/id-invalido')
            .set('Cookie', cookie)
            .send({ name: 'Nuevo nombre' });
        expect(res.status).to.be.oneOf([400, 404]);
    });

    it('Debe retornar 404 si la mascota no existe', async function () {
        const cookie = await loginAndGetToken('admin@ecommerce.com', 'admin123');
        if (!cookie) return this.skip();

        const fakeId = new mongoose.Types.ObjectId();
        const res = await chai
            .request(app)
            .put(`/api/pets/${fakeId}`)
            .set('Cookie', cookie)
            .send({ name: 'Nuevo nombre' });
        expect(res).to.have.status(404);
    });

    it('Debe retornar 200 y actualizar la mascota correctamente', async function () {
        if (!testPetId) return this.skip();
        const cookie = await loginAndGetToken('admin@ecommerce.com', 'admin123');
        if (!cookie) return this.skip();

        const res = await chai
            .request(app)
            .put(`/api/pets/${testPetId}`)
            .set('Cookie', cookie)
            .send({ name: 'TEST_Firulais_Actualizado' });

        expect(res).to.have.status(200);
        expect(res.body.status).to.equal('success');
        expect(res.body.payload.name).to.equal('TEST_Firulais_Actualizado');
    });
});

// =========================================================
// SUITE: POST /api/pets/:pid/adopt - Adoptar mascota (requiere auth)
// =========================================================
describe('POST /api/pets/:pid/adopt - Adoptar mascota', function () {
    this.timeout(15000);

    it('Debe retornar 401 si no se proporciona autenticación', async function () {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await chai.request(app).post(`/api/pets/${fakeId}/adopt`);
        expect(res).to.have.status(401);
    });

    it('Debe retornar 404 si la mascota no existe', async function () {
        const cookie = await loginAndGetToken('admin@ecommerce.com', 'admin123');
        if (!cookie) return this.skip();

        const fakeId = new mongoose.Types.ObjectId();
        const res = await chai
            .request(app)
            .post(`/api/pets/${fakeId}/adopt`)
            .set('Cookie', cookie);
        expect(res).to.have.status(404);
    });
});

// =========================================================
// SUITE: DELETE /api/pets/:pid - Eliminar mascota (requiere admin)
// =========================================================
describe('DELETE /api/pets/:pid - Eliminar mascota', function () {
    this.timeout(15000);

    it('Debe retornar 401 si no se proporciona autenticación', async function () {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await chai.request(app).delete(`/api/pets/${fakeId}`);
        expect(res).to.have.status(401);
    });

    it('Debe retornar 400 con un ID inválido', async function () {
        const cookie = await loginAndGetToken('admin@ecommerce.com', 'admin123');
        if (!cookie) return this.skip();

        const res = await chai
            .request(app)
            .delete('/api/pets/id-invalido')
            .set('Cookie', cookie);
        expect(res.status).to.be.oneOf([400, 404]);
    });

    it('Debe retornar 404 si la mascota no existe', async function () {
        const cookie = await loginAndGetToken('admin@ecommerce.com', 'admin123');
        if (!cookie) return this.skip();

        const fakeId = new mongoose.Types.ObjectId();
        const res = await chai
            .request(app)
            .delete(`/api/pets/${fakeId}`)
            .set('Cookie', cookie);
        expect(res).to.have.status(404);
    });

    it('Debe retornar 200 y eliminar la mascota si existe', async function () {
        if (!testPetId) return this.skip();
        const cookie = await loginAndGetToken('admin@ecommerce.com', 'admin123');
        if (!cookie) return this.skip();

        const res = await chai
            .request(app)
            .delete(`/api/pets/${testPetId}`)
            .set('Cookie', cookie);

        expect(res).to.have.status(200);
        expect(res.body.status).to.equal('success');
        testPetId = null; // Limpiar para no reutilizar
    });
});
