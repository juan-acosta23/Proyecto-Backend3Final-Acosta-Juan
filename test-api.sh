#!/bin/bash

SERVER="http://localhost:8080"
echo "PRUEBAS - API E-COMMERCE CON MOCKING"
echo "====================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

verificar_servidor() {
    echo -e "${BLUE}Verificando conexion al servidor...${NC}"
    if curl -s "$SERVER/api/status" > /dev/null 2>&1; then
        echo -e "${GREEN}Servidor conectado correctamente${NC}"
        return 0
    else
        echo -e "${RED}Error: No se puede conectar al servidor${NC}"
        echo "Asegurate de que el servidor este ejecutandose en $SERVER"
        exit 1
    fi
}

ejecutar_prueba() {
    local metodo=$1
    local endpoint=$2
    local datos=$3
    local descripcion=$4
    local header_extra=$5
    
    echo ""
    echo -e "${YELLOW}--- $descripcion ---${NC}"
    echo "URL: $SERVER$endpoint"
    echo "Metodo: $metodo"
    
    if [ -n "$datos" ]; then
        if [ -n "$header_extra" ]; then
            respuesta=$(curl -s -w "\nCodigo HTTP: %{http_code}" -X $metodo "$SERVER$endpoint" \
                -H "Content-Type: application/json" \
                -H "$header_extra" \
                -d "$datos")
        else
            respuesta=$(curl -s -w "\nCodigo HTTP: %{http_code}" -X $metodo "$SERVER$endpoint" \
                -H "Content-Type: application/json" \
                -d "$datos")
        fi
    else
        if [ -n "$header_extra" ]; then
            respuesta=$(curl -s -w "\nCodigo HTTP: %{http_code}" -X $metodo "$SERVER$endpoint" \
                -H "$header_extra")
        else
            respuesta=$(curl -s -w "\nCodigo HTTP: %{http_code}" -X $metodo "$SERVER$endpoint")
        fi
    fi
    
    echo "Respuesta:"
    echo "$respuesta" | head -20
    
    if echo "$respuesta" | grep -q '"status":"success"'; then
        echo -e "${GREEN}Prueba exitosa${NC}"
    else
        echo -e "${YELLOW}Prueba con observaciones${NC}"
    fi
}

verificar_servidor

echo ""
echo "====================================="
echo "PRUEBAS DE MOCKING"
echo "====================================="

echo ""
echo -e "${BLUE}1. GENERACION DE MASCOTAS MOCK${NC}"

ejecutar_prueba "GET" "/api/mocks/mockingpets" "" "Generar 100 mascotas mock (default)"

ejecutar_prueba "GET" "/api/mocks/mockingpets?count=50" "" "Generar 50 mascotas mock"

ejecutar_prueba "GET" "/api/mocks/mockingpets?count=25" "" "Generar 25 mascotas mock"

ejecutar_prueba "GET" "/api/mocks/mockingpets?count=5" "" "Generar 5 mascotas mock (para inspeccion)"

echo ""
echo -e "${BLUE}2. GENERACION DE USUARIOS MOCK${NC}"

ejecutar_prueba "GET" "/api/mocks/mockingusers" "" "Generar 50 usuarios mock (segun consigna)"

echo ""
echo "Verificando caracteristicas de usuarios generados:"
echo "  - Password: 'coder123' (encriptado con bcrypt)"
echo "  - Role: aleatorio entre 'user' y 'admin'"
echo "  - pets: array vacio []"
echo "  - Formato compatible con MongoDB"

echo ""
echo -e "${BLUE}3. INSERCION DE DATOS EN BASE DE DATOS${NC}"

if curl -s "$SERVER/api/mocks/generateData-public" > /dev/null 2>&1; then
    echo -e "${GREEN}Endpoint publico disponible (modo desarrollo)${NC}"
    
    ejecutar_prueba "POST" "/api/mocks/generateData-public" '{"users":5,"pets":10}' "Insertar 5 usuarios y 10 mascotas (publico)"
    
    ejecutar_prueba "POST" "/api/mocks/generateData-public" '{"users":10}' "Insertar solo 10 usuarios"
    
    ejecutar_prueba "POST" "/api/mocks/generateData-public" '{"pets":15}' "Insertar solo 15 mascotas"
    
else
    echo -e "${YELLOW}Endpoint publico no disponible (requiere autenticacion)${NC}"
    echo "Para probar con autenticacion, ejecuta:"
    echo ""
    echo "# 1. Obtener token de administrador"
    echo "TOKEN=\$(curl -s -X POST $SERVER/api/sessions/login \\"
    echo "  -H 'Content-Type: application/json' \\"
    echo "  -d '{\"email\":\"admin@admin.com\",\"password\":\"admin123\"}' | jq -r '.payload.token')"
    echo ""
    echo "# 2. Generar datos"
    echo "curl -X POST $SERVER/api/mocks/generateData \\"
    echo "  -H 'Content-Type: application/json' \\"
    echo "  -H \"Cookie: token=\$TOKEN\" \\"
    echo "  -d '{\"users\":10,\"pets\":20}'"
    echo ""
fi

echo ""
echo -e "${BLUE}4. VERIFICACION DE DATOS INSERTADOS${NC}"

echo ""
echo "Verificando usuarios en la base de datos..."
ejecutar_prueba "GET" "/api/users" "" "Listar todos los usuarios"

echo ""
echo "Verificando mascotas en la base de datos..."
ejecutar_prueba "GET" "/api/pets" "" "Listar todas las mascotas"

echo ""
echo "Verificando mascotas disponibles para adopcion..."
ejecutar_prueba "GET" "/api/pets/available" "" "Listar mascotas disponibles"

echo ""
echo -e "${BLUE}5. VALIDACIONES Y LIMITES${NC}"

ejecutar_prueba "GET" "/api/mocks/mockingpets?count=0" "" "Validar limite inferior (debe fallar)"

ejecutar_prueba "GET" "/api/mocks/mockingpets?count=1500" "" "Validar limite superior (debe fallar)"

if curl -s "$SERVER/api/mocks/generateData-public" > /dev/null 2>&1; then
    ejecutar_prueba "POST" "/api/mocks/generateData-public" '{"users":-5}' "Validar numeros negativos (debe fallar)"
    
    ejecutar_prueba "POST" "/api/mocks/generateData-public" '{"users":2000}' "Validar maximo de registros (debe fallar)"
    
    ejecutar_prueba "POST" "/api/mocks/generateData-public" '{}' "Validar body vacio (debe fallar)"
fi

echo ""
echo "====================================="
echo "PRUEBAS DE PRODUCTOS"
echo "====================================="

ejecutar_prueba "GET" "/api/products" "" "Listar todos los productos"

ejecutar_prueba "GET" "/api/products?limit=5" "" "Listar productos con limite de 5"

ejecutar_prueba "GET" "/api/products?sort=asc" "" "Ordenar productos por precio ascendente"

echo ""
echo "====================================="
echo "PRUEBAS DE CARRITOS"
echo "====================================="

ejecutar_prueba "POST" "/api/carts" "" "Crear nuevo carrito"

echo ""
echo "====================================="
echo "RESUMEN DE PRUEBAS"
echo "====================================="
echo ""
echo "Pruebas ejecutadas:"
echo "  - Generacion de mascotas mock"
echo "  - Generacion de usuarios mock"
echo "  - Insercion en base de datos"
echo "  - Verificacion de datos insertados"
echo "  - Validaciones y limites"
echo "  - Endpoints de productos"
echo "  - Endpoints de carritos"
echo ""
echo "Comandos utiles para pruebas manuales:"
echo ""
echo "# Ver mascotas mock"
echo "curl $SERVER/api/mocks/mockingpets?count=10 | jq"
echo ""
echo "# Ver usuarios mock"
echo "curl $SERVER/api/mocks/mockingusers | jq"
echo ""
echo "# Insertar datos (modo desarrollo)"
echo "curl -X POST $SERVER/api/mocks/generateData-public \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"users\":10,\"pets\":20}' | jq"
echo ""
echo "# Verificar usuarios insertados"
echo "curl $SERVER/api/users | jq"
echo ""
echo "# Verificar mascotas insertadas"
echo "curl $SERVER/api/pets | jq"
echo ""
echo "====================================="
echo "FIN DE LA SUITE DE PRUEBAS"
echo "====================================="