# 🐾 Pet E-Commerce API

**Proyecto Final — Backend III | Coderhouse**  
**Autor:** Juan Acosta

API REST completa para e-commerce de productos para mascotas con sistema de adopción integrado. Construida con **Node.js**, **Express**, **MongoDB** y documentada con **Swagger**.

---

## 🐳 Imagen Docker en Docker Hub

La imagen del proyecto está disponible públicamente en Docker Hub:

> **📦 `docker pull juanacosta/pet-ecommerce-api:latest`**
>
> 🔗 **[https://hub.docker.com/r/juanacosta/pet-ecommerce-api](https://hub.docker.com/r/juanacosta/pet-ecommerce-api)**

---

## 🚀 Ejecutar con Docker

### Opción 1 — Desde Docker Hub (recomendado)

```bash
docker pull juanacosta/pet-ecommerce-api:latest

docker run -d \
  --name pet-api \
  -p 8080:8080 \
  -e MONGODB_URI="mongodb+srv://<usuario>:<password>@cluster.mongodb.net/petstore" \
  -e JWT_SECRET="tu_jwt_secret_muy_seguro" \
  -e NODE_ENV="production" \
  juanacosta/pet-ecommerce-api:latest
```

La API estará disponible en: **`http://localhost:8080`**

### Opción 2 — Construir la imagen localmente

```bash
# Clonar el repositorio
git clone <url-del-repositorio>
cd Proyecto-Backend3-Acosta-Juan-main

# Construir la imagen (multi-stage build)
docker build -t pet-ecommerce-api .

# Ejecutar con archivo .env
docker run -d \
  --name pet-api \
  -p 8080:8080 \
  --env-file .env \
  pet-ecommerce-api
```

### Comandos Docker útiles

```bash
# Ver logs en tiempo real
docker logs pet-api -f

# Detener el contenedor
docker stop pet-api

# Eliminar el contenedor
docker rm pet-api

# Estado del healthcheck
docker inspect --format='{{.State.Health.Status}}' pet-api
```

---

## ⚙️ Variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
PORT=8080
NODE_ENV=production
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/petstore
JWT_SECRET=un_secreto_muy_largo_y_seguro
EMAIL_USER=tu_email@gmail.com
EMAIL_PASSWORD=tu_app_password_gmail
```

---

## 📚 Documentación Swagger

Una vez iniciado, la documentación interactiva está en:

```
http://localhost:8080/api/docs
```

---

## 🧪 Tests funcionales

```bash
npm install
npm test
```

Suites incluidas:
- **`adoption.functional.test.js`** — 8 suites / 30+ casos cubriendo todos los endpoints de `/api/pets`
- **`pets.functional.test.js`** — Suite complementaria

---

## 📡 Endpoints principales

### Autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/sessions/register` | Registrar usuario |
| POST | `/api/sessions/login` | Iniciar sesión (JWT cookie) |
| GET  | `/api/sessions/current` | Usuario actual (DTO) |
| POST | `/api/sessions/logout` | Cerrar sesión |
| POST | `/api/sessions/forgot-password` | Recuperar contraseña |
| POST | `/api/sessions/reset-password` | Restablecer contraseña |

### Usuarios

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET    | `/api/users` | Admin | Listar usuarios |
| GET    | `/api/users/:uid` | Auth | Ver usuario |
| PUT    | `/api/users/:uid` | Auth/Admin | Actualizar |
| PUT    | `/api/users/:uid/role` | Admin | Cambiar rol |
| DELETE | `/api/users/:uid` | Admin | Eliminar |

### Mascotas / Adopciones

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET    | `/api/pets` | — | Listar mascotas |
| GET    | `/api/pets/available` | — | Disponibles para adopción |
| GET    | `/api/pets/species/:species` | — | Por especie |
| GET    | `/api/pets/:pid` | — | Por ID |
| POST   | `/api/pets` | Admin | Crear mascota |
| PUT    | `/api/pets/:pid` | Admin | Actualizar |
| POST   | `/api/pets/:pid/adopt` | Auth | **Adoptar mascota** |
| DELETE | `/api/pets/:pid` | Admin | Eliminar |

---

## 🏗️ Arquitectura

```
├── app.js               # Entrada
├── config/              # DB + Passport
├── routes/              # Routers Express
├── repositories/        # Patrón Repository
├── models/              # Schemas Mongoose
├── dto/                 # Data Transfer Objects
├── services/            # Email, Purchase
├── middleware/          # Auth, RateLimiter
├── docs/                # Swagger YAML
└── test/                # Tests funcionales
```

---

## 🔑 Credenciales por defecto (solo desarrollo)

| Email | Password | Rol |
|-------|----------|-----|
| `admin@ecommerce.com` | `admin123` | admin |
| `user@ecommerce.com` | `user123` | user |

> ⚠️ Cambiar en entornos de producción.

---

## 📄 Licencia

MIT — Juan Acosta, 2024 | Coderhouse Backend III
