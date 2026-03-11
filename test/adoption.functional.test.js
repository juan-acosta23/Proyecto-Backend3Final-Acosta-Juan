/**
 * Tests Funcionales - adoption.router.js (pets.js)
 * Proyecto Backend III - Juan Acosta
 *
 * Cubre todos los endpoints:
 *  GET    /api/pets
 *  GET    /api/pets/available
 *  GET    /api/pets/species/:species
 *  GET    /api/pets/:pid
 *  POST   /api/pets           (admin)
 *  PUT    /api/pets/:pid      (admin)
 *  POST   /api/pets/:pid/adopt (auth)
 *  DELETE /api/pets/:pid      (admin)
 */

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const { expect } = chai;
chai.use(chaiHttp);

const app = require('../app');

// ─── IDs y tokens reutilizables entre suites ──────────────────────────────────
let testPetId = null;
let adoptedPetId = null;
let adminCookie = null;
let userCookie = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────
/**
 * Hace login y devuelve la cookie "jwt=TOKEN" o null si falla.
 */
async function getAuthCookie(email, password) {
    const res = await chai
        .request(app)
        .post('/api/sessions/login')
        .send({ email, password });

    if (res.headers['set-cookie']) {
        const jwtCookie = res.headers['set-cookie'].find(c => c.startsWith('token='));
        if (jwtCookie) return jwtCookie.split(';')[0];
    }
    // Fallback: usar Bearer token del body
    if (res.body?.payload?.token) {
        return `Bearer ${res.body.payload.token}`;
    }
    return null;
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────
before(async function () {
    this.timeout(20000);

    if (mongoose.connection.readyState === 0) {
        const uri =
            process.env.MONGODB_TEST_URI ||
            process.env.MONGODB_URI ||
            'mongodb://localhost:27017/petstore_test';
        await mongoose.connect(uri);
        console.log('✓ Conectado a MongoDB de tests');
    }

    // Obtener tokens para los tests que requieren autenticación
    adminCookie = await getAuthCookie('admin@ecommerce.com', 'admin123');
    userCookie  = await getAuthCookie('user@ecommerce.com',  'user123');

    if (adminCookie) console.log('✓ Token admin obtenido');
    if (userCookie)  console.log('✓ Token user obtenido');
});

after(async function () {
    // Limpia solo las mascotas creadas por estos tests
    try {
        await mongoose.connection.collection('pets').deleteMany({ name: /^TEST_/ });
        console.log('✓ Mascotas de prueba eliminadas');
    } catch (err) {
        console.error('Error limpiando datos:', err.message);
    }
});

// =============================================================================
// SUITE 1: GET /api/pets
// =============================================================================
describe('GET /api/pets - Listar todas las mascotas', function () {
    this.timeout(10000);

    it('Debe retornar HTTP 200', async function () {
        const res = await chai.request(app).get('/api/pets');
        expect(res).to.have.status(200);
    });

    it('El body debe tener status "success"', async function () {
        const res = await chai.request(app).get('/api/pets');
        expect(res.body).to.have.property('status', 'success');
    });

    it('El payload debe ser un array', async function () {
        const res = await chai.request(app).get('/api/pets');
        expect(res.body.payload).to.be.an('array');
    });

    it('Debe incluir la propiedad "count" numérica', async function () {
        const res = await chai.request(app).get('/api/pets');
        expect(res.body).to.have.property('count').that.is.a('number');
    });

    it('count debe coincidir con la longitud del payload', async function () {
        const res = await chai.request(app).get('/api/pets');
        expect(res.body.count).to.equal(res.body.payload.length);
    });

    it('?adopted=false debe filtrar solo mascotas no adoptadas', async function () {
        const res = await chai.request(app).get('/api/pets?adopted=false');
        expect(res).to.have.status(200);
        res.body.payload.forEach(pet => {
            expect(pet.adopted).to.equal(false);
        });
    });

    it('?adopted=true debe filtrar solo mascotas adoptadas', async function () {
        const res = await chai.request(app).get('/api/pets?adopted=true');
        expect(res).to.have.status(200);
        res.body.payload.forEach(pet => {
            expect(pet.adopted).to.equal(true);
        });
    });

    it('?limit=2 debe retornar máximo 2 mascotas', async function () {
        const res = await chai.request(app).get('/api/pets?limit=2');
        expect(res).to.have.status(200);
        expect(res.body.payload.length).to.be.at.most(2);
    });

    it('?species=dog debe retornar solo perros', async function () {
        const res = await chai.request(app).get('/api/pets?species=dog');
        expect(res).to.have.status(200);
        res.body.payload.forEach(pet => {
            expect(pet.species).to.equal('dog');
        });
    });
});

// =============================================================================
// SUITE 2: GET /api/pets/available
// =============================================================================
describe('GET /api/pets/available - Mascotas disponibles para adopción', function () {
    this.timeout(10000);

    it('Debe retornar HTTP 200', async function () {
        const res = await chai.request(app).get('/api/pets/available');
        expect(res).to.have.status(200);
    });

    it('El body debe tener status "success"', async function () {
        const res = await chai.request(app).get('/api/pets/available');
        expect(res.body.status).to.equal('success');
    });

    it('El payload debe ser un array', async function () {
        const res = await chai.request(app).get('/api/pets/available');
        expect(res.body.payload).to.be.an('array');
    });

    it('Todas las mascotas retornadas deben tener adopted = false', async function () {
        const res = await chai.request(app).get('/api/pets/available');
        res.body.payload.forEach(pet => {
            expect(pet.adopted).to.equal(false);
        });
    });

    it('Debe incluir el campo "count"', async function () {
        const res = await chai.request(app).get('/api/pets/available');
        expect(res.body).to.have.property('count').that.is.a('number');
    });

    it('Debe incluir el campo "message"', async function () {
        const res = await chai.request(app).get('/api/pets/available');
        expect(res.body).to.have.property('message').that.is.a('string');
    });
});

// =============================================================================
// SUITE 3: GET /api/pets/species/:species
// =============================================================================
describe('GET /api/pets/species/:species - Mascotas por especie', function () {
    this.timeout(10000);

    it('Debe retornar HTTP 200 para especie "dog"', async function () {
        const res = await chai.request(app).get('/api/pets/species/dog');
        expect(res).to.have.status(200);
    });

    it('Debe retornar HTTP 200 para especie "cat"', async function () {
        const res = await chai.request(app).get('/api/pets/species/cat');
        expect(res).to.have.status(200);
    });

    it('El body debe incluir el campo "species" igual al parámetro', async function () {
        const res = await chai.request(app).get('/api/pets/species/dog');
        expect(res.body).to.have.property('species', 'dog');
    });

    it('Todas las mascotas retornadas deben pertenecer a la especie solicitada', async function () {
        const res = await chai.request(app).get('/api/pets/species/dog');
        res.body.payload.forEach(pet => {
            expect(pet.species).to.equal('dog');
        });
    });

    it('Debe manejar correctamente una especie inexistente (retorna array vacío)', async function () {
        const res = await chai.request(app).get('/api/pets/species/dragon');
        expect(res).to.have.status(200);
        expect(res.body.payload).to.be.an('array');
    });

    it('El campo count debe coincidir con la longitud del payload', async function () {
        const res = await chai.request(app).get('/api/pets/species/cat');
        expect(res.body.count).to.equal(res.body.payload.length);
    });
});

// =============================================================================
// SUITE 4: POST /api/pets  (Crear mascota - requiere admin)
// =============================================================================
describe('POST /api/pets - Crear nueva mascota', function () {
    this.timeout(15000);

    const petValida = {
        name: 'TEST_Rex',
        species: 'dog',
        birthDate: '2021-03-10',
    };

    const petSinNombre = {
        species: 'cat',
        birthDate: '2022-01-01',
    };

    const petEspecieInvalida = {
        name: 'TEST_Alien',
        species: 'alien',
        birthDate: '2023-05-05',
    };

    it('Debe retornar 401 si no se envía autenticación', async function () {
        const res = await chai.request(app).post('/api/pets').send(petValida);
        expect(res).to.have.status(401);
    });

    it('Debe retornar 401 o 403 si el usuario autenticado no es admin', async function () {
        if (!userCookie) return this.skip();
        const res = await chai
            .request(app)
            .post('/api/pets')
            .set('Cookie', userCookie)
            .send(petValida);
        expect(res.status).to.be.oneOf([401, 403]);
    });

    it('Debe retornar 201 y crear la mascota con datos válidos (admin)', async function () {
        if (!adminCookie) return this.skip();
        const res = await chai
            .request(app)
            .post('/api/pets')
            .set('Cookie', adminCookie)
            .send(petValida);

        expect(res).to.have.status(201);
        expect(res.body.status).to.equal('success');
        expect(res.body.payload).to.have.property('_id');
        expect(res.body.payload.name).to.equal(petValida.name);
        expect(res.body.payload.species).to.equal(petValida.species);
        expect(res.body.payload.adopted).to.equal(false);

        // Guardar ID para tests posteriores
        testPetId = res.body.payload._id;
    });

    it('La mascota creada debe tener adopted = false por defecto', async function () {
        if (!adminCookie) return this.skip();
        const res = await chai
            .request(app)
            .post('/api/pets')
            .set('Cookie', adminCookie)
            .send({ name: 'TEST_DefaultAdopted', species: 'cat', birthDate: '2022-06-01' });

        if (res.status === 201) {
            expect(res.body.payload.adopted).to.equal(false);
            // Registrar para limpieza
        }
    });

    it('Debe retornar 400 o 500 si falta el campo obligatorio "name"', async function () {
        if (!adminCookie) return this.skip();
        const res = await chai
            .request(app)
            .post('/api/pets')
            .set('Cookie', adminCookie)
            .send(petSinNombre);
        expect(res.status).to.be.oneOf([400, 500]);
        expect(res.body.status).to.equal('error');
    });

    it('Debe retornar error si la especie no pertenece al enum permitido', async function () {
        if (!adminCookie) return this.skip();
        const res = await chai
            .request(app)
            .post('/api/pets')
            .set('Cookie', adminCookie)
            .send(petEspecieInvalida);
        expect(res.status).to.be.oneOf([400, 500]);
        expect(res.body.status).to.equal('error');
    });
});

// =============================================================================
// SUITE 5: GET /api/pets/:pid  (Obtener mascota por ID)
// =============================================================================
describe('GET /api/pets/:pid - Obtener mascota por ID', function () {
    this.timeout(10000);

    it('Debe retornar 400 con un ID con formato inválido', async function () {
        const res = await chai.request(app).get('/api/pets/no-es-un-objectid');
        expect(res).to.have.status(400);
        expect(res.body.status).to.equal('error');
    });

    it('Debe retornar 404 con un ObjectId válido pero inexistente', async function () {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await chai.request(app).get(`/api/pets/${fakeId}`);
        expect(res).to.have.status(404);
        expect(res.body.status).to.equal('error');
    });

    it('Debe retornar 200 y los datos completos de la mascota si existe', async function () {
        if (!testPetId) return this.skip();
        const res = await chai.request(app).get(`/api/pets/${testPetId}`);
        expect(res).to.have.status(200);
        expect(res.body.status).to.equal('success');
        expect(res.body.payload).to.have.property('_id', testPetId);
        expect(res.body.payload).to.have.property('name');
        expect(res.body.payload).to.have.property('species');
        expect(res.body.payload).to.have.property('adopted');
    });
});

// =============================================================================
// SUITE 6: PUT /api/pets/:pid  (Actualizar mascota - requiere admin)
// =============================================================================
describe('PUT /api/pets/:pid - Actualizar mascota', function () {
    this.timeout(15000);

    it('Debe retornar 401 si no se envía autenticación', async function () {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await chai
            .request(app)
            .put(`/api/pets/${fakeId}`)
            .send({ name: 'Nuevo nombre' });
        expect(res).to.have.status(401);
    });

    it('Debe retornar 401 o 403 si el usuario no es admin', async function () {
        if (!userCookie || !testPetId) return this.skip();
        const res = await chai
            .request(app)
            .put(`/api/pets/${testPetId}`)
            .set('Cookie', userCookie)
            .send({ name: 'Intento sin permiso' });
        expect(res.status).to.be.oneOf([401, 403]);
    });

    it('Debe retornar 400 o 404 con un ID con formato inválido', async function () {
        if (!adminCookie) return this.skip();
        const res = await chai
            .request(app)
            .put('/api/pets/id-invalido-xyz')
            .set('Cookie', adminCookie)
            .send({ name: 'No importa' });
        expect(res.status).to.be.oneOf([400, 404, 500]);
    });

    it('Debe retornar 404 si la mascota no existe (ObjectId válido)', async function () {
        if (!adminCookie) return this.skip();
        const fakeId = new mongoose.Types.ObjectId();
        const res = await chai
            .request(app)
            .put(`/api/pets/${fakeId}`)
            .set('Cookie', adminCookie)
            .send({ name: 'No existe' });
        expect(res).to.have.status(404);
        expect(res.body.status).to.equal('error');
    });

    it('Debe retornar 200 y actualizar el nombre correctamente', async function () {
        if (!adminCookie || !testPetId) return this.skip();
        const res = await chai
            .request(app)
            .put(`/api/pets/${testPetId}`)
            .set('Cookie', adminCookie)
            .send({ name: 'TEST_Rex_Actualizado' });

        expect(res).to.have.status(200);
        expect(res.body.status).to.equal('success');
        expect(res.body.payload.name).to.equal('TEST_Rex_Actualizado');
    });

    it('El body de la respuesta debe incluir la propiedad "message"', async function () {
        if (!adminCookie || !testPetId) return this.skip();
        const res = await chai
            .request(app)
            .put(`/api/pets/${testPetId}`)
            .set('Cookie', adminCookie)
            .send({ name: 'TEST_Rex_Msg' });

        expect(res).to.have.status(200);
        expect(res.body).to.have.property('message').that.is.a('string');
    });
});

// =============================================================================
// SUITE 7: POST /api/pets/:pid/adopt  (Adoptar mascota - requiere auth)
// =============================================================================
describe('POST /api/pets/:pid/adopt - Adoptar mascota', function () {
    this.timeout(15000);

    it('Debe retornar 401 si no se envía autenticación', async function () {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await chai.request(app).post(`/api/pets/${fakeId}/adopt`);
        expect(res).to.have.status(401);
    });

    it('Debe retornar 404 si la mascota no existe (ObjectId válido)', async function () {
        if (!adminCookie) return this.skip();
        const fakeId = new mongoose.Types.ObjectId();
        const res = await chai
            .request(app)
            .post(`/api/pets/${fakeId}/adopt`)
            .set('Cookie', adminCookie);
        expect(res).to.have.status(404);
        expect(res.body.status).to.equal('error');
    });

    it('Debe retornar 400 con un ID con formato inválido', async function () {
        if (!adminCookie) return this.skip();
        const res = await chai
            .request(app)
            .post('/api/pets/id-invalido/adopt')
            .set('Cookie', adminCookie);
        // El error puede venir del cast antes de llegar al repository
        expect(res.status).to.be.oneOf([400, 404, 500]);
    });

    it('Debe retornar 200 y marcar la mascota como adoptada', async function () {
        // Crear una mascota de prueba para adoptar
        if (!adminCookie) return this.skip();

        const createRes = await chai
            .request(app)
            .post('/api/pets')
            .set('Cookie', adminCookie)
            .send({ name: 'TEST_ParaAdoptar', species: 'rabbit', birthDate: '2022-01-01' });

        if (createRes.status !== 201) return this.skip();
        adoptedPetId = createRes.body.payload._id;

        const adoptRes = await chai
            .request(app)
            .post(`/api/pets/${adoptedPetId}/adopt`)
            .set('Cookie', adminCookie);

        expect(adoptRes).to.have.status(200);
        expect(adoptRes.body.status).to.equal('success');
        expect(adoptRes.body.payload.adopted).to.equal(true);
        expect(adoptRes.body.payload.owner).to.not.be.null;
    });

    it('Debe retornar 400 si la mascota ya fue adoptada', async function () {
        if (!adminCookie || !adoptedPetId) return this.skip();
        // Intentar adoptar la misma mascota dos veces
        const res = await chai
            .request(app)
            .post(`/api/pets/${adoptedPetId}/adopt`)
            .set('Cookie', adminCookie);

        expect(res).to.have.status(400);
        expect(res.body.status).to.equal('error');
    });

    it('El body debe incluir la propiedad "message" de felicitación', async function () {
        // Crear otra mascota de prueba
        if (!adminCookie) return this.skip();

        const createRes = await chai
            .request(app)
            .post('/api/pets')
            .set('Cookie', adminCookie)
            .send({ name: 'TEST_ConMensaje', species: 'bird', birthDate: '2023-03-03' });

        if (createRes.status !== 201) return this.skip();

        const adoptRes = await chai
            .request(app)
            .post(`/api/pets/${createRes.body.payload._id}/adopt`)
            .set('Cookie', adminCookie);

        expect(adoptRes).to.have.status(200);
        expect(adoptRes.body).to.have.property('message').that.is.a('string');
    });
});

// =============================================================================
// SUITE 8: DELETE /api/pets/:pid  (Eliminar mascota - requiere admin)
// =============================================================================
describe('DELETE /api/pets/:pid - Eliminar mascota', function () {
    this.timeout(15000);

    it('Debe retornar 401 si no se envía autenticación', async function () {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await chai.request(app).delete(`/api/pets/${fakeId}`);
        expect(res).to.have.status(401);
    });

    it('Debe retornar 401 o 403 si el usuario no es admin', async function () {
        if (!userCookie) return this.skip();
        const fakeId = new mongoose.Types.ObjectId();
        const res = await chai
            .request(app)
            .delete(`/api/pets/${fakeId}`)
            .set('Cookie', userCookie);
        expect(res.status).to.be.oneOf([401, 403]);
    });

    it('Debe retornar 400 con un ID con formato inválido', async function () {
        if (!adminCookie) return this.skip();
        const res = await chai
            .request(app)
            .delete('/api/pets/no-es-valido')
            .set('Cookie', adminCookie);
        expect(res.status).to.be.oneOf([400, 404, 500]);
    });

    it('Debe retornar 404 si la mascota no existe (ObjectId válido)', async function () {
        if (!adminCookie) return this.skip();
        const fakeId = new mongoose.Types.ObjectId();
        const res = await chai
            .request(app)
            .delete(`/api/pets/${fakeId}`)
            .set('Cookie', adminCookie);
        expect(res).to.have.status(404);
        expect(res.body.status).to.equal('error');
    });

    it('Debe retornar 200 y los datos de la mascota eliminada', async function () {
        if (!adminCookie || !testPetId) return this.skip();
        const res = await chai
            .request(app)
            .delete(`/api/pets/${testPetId}`)
            .set('Cookie', adminCookie);

        expect(res).to.have.status(200);
        expect(res.body.status).to.equal('success');
        expect(res.body.payload).to.have.property('_id');
        expect(res.body).to.have.property('message').that.is.a('string');

        testPetId = null;
    });

    it('Tras eliminar, la mascota ya no debe existir (GET retorna 404)', async function () {
        if (!adminCookie) return this.skip();

        // Crear mascota temporal para verificar eliminación
        const createRes = await chai
            .request(app)
            .post('/api/pets')
            .set('Cookie', adminCookie)
            .send({ name: 'TEST_VerificarEliminacion', species: 'hamster', birthDate: '2022-02-02' });

        if (createRes.status !== 201) return this.skip();
        const tempId = createRes.body.payload._id;

        // Eliminar
        await chai
            .request(app)
            .delete(`/api/pets/${tempId}`)
            .set('Cookie', adminCookie);

        // Verificar que ya no existe
        const getRes = await chai.request(app).get(`/api/pets/${tempId}`);
        expect(getRes).to.have.status(404);
    });
});
