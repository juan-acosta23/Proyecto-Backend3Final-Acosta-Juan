# ─────────────────────────────────────────────────────────────────────────────
# Etapa 1 — Dependencias (aprovecha la caché de Docker si no cambia package.json)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20.11.0-alpine AS deps

WORKDIR /app

# Copiar manifiestos de dependencias primero
COPY package*.json ./

# Instalar solo dependencias de producción de forma reproducible
RUN npm ci --omit=dev && npm cache clean --force

# ─────────────────────────────────────────────────────────────────────────────
# Etapa 2 — Imagen final de producción
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20.11.0-alpine AS production

# Metadatos de la imagen
LABEL maintainer="Juan Acosta"
LABEL description="Pet E-Commerce API - Proyecto Backend III Coderhouse"
LABEL version="4.1.0"

# Seguridad: no ejecutar como root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copiar dependencias desde la etapa anterior
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fuente (el .dockerignore excluye archivos innecesarios)
COPY . .

# Cambiar propietario al usuario no-root
RUN chown -R appuser:appgroup /app

USER appuser

# Exponer el puerto de la aplicación
EXPOSE 8080

# Variables de entorno con valores por defecto seguros
ENV NODE_ENV=production \
    PORT=8080

# Healthcheck: verifica que el servidor responde correctamente
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:${PORT}/api/status || exit 1

# Comando de inicio
CMD ["node", "app.js"]
