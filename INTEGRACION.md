# Integración Frontend ↔ Backend (ABM Productos)

Este documento explica cómo conectar el frontend (React) con el backend (Spring Boot) para probar el ABM de productos.

## Requisitos

1. **PostgreSQL** en puerto 5433, base de datos `posdb`, usuario `posuser`, contraseña `pospass`
2. **Datos iniciales**: El backend requiere al menos una categoría, una unidad de medida y un proveedor para poder crear productos

## Pasos para probar

### 1. Iniciar el backend

```bash
cd c:\Users\edgar\Desktop\TestDespensa
mvn spring-boot:run
```

El backend quedará en **http://localhost:8081/DespensaProyect**

### 2. Crear tablas y datos maestros (si la BD está vacía)

En la carpeta `database` del backend hay scripts SQL:

- **`schema_abm_productos.sql`** – Solo tablas para el ABM de productos + datos iniciales
- **`schema_completo.sql`** – Todas las tablas del sistema + datos iniciales
- **`migrations/V3_producto_campos_unificados.sql`** – Si ya tienes la tabla producto, ejecuta esta migración para añadir los nuevos campos

Ejecutar desde la raíz del proyecto backend:

```bash
cd c:\Users\edgar\Desktop\TestDespensa
psql -U posuser -d posdb -f database/schema_abm_productos.sql
```

(O usa `schema_completo.sql` si necesitas todas las tablas)

### 3. Configurar la URL del backend en el frontend

En `.env` está configurado:

```
VITE_API_BASE_URL=http://localhost:8081/DespensaProyect
```

Si tu backend usa otro puerto o context path, modifica esta variable.

### 4. Iniciar el frontend

```bash
cd c:\Users\edgar\Documents\proyecto\frontend
npm run dev
```

El frontend quedará en **http://localhost:5173**

### 5. Probar el ABM

1. Ir a **Inventario** → **ABM**
2. **Crear**: Llenar el formulario (categoría, unidad, proveedor obligatorios) y guardar
3. **Editar**: Hacer clic en el ícono de lápiz; se puede modificar todos los campos (PUT)
4. **Eliminar**: Hacer clic en el ícono de papelera

Los cambios se reflejan en la base de datos del backend.

## Endpoints utilizados

| Método | Endpoint | Uso |
|--------|----------|-----|
| GET | /api/products | Listar productos |
| GET | /api/products/{id} | Ver detalle |
| POST | /api/products | Crear producto |
| PUT | /api/products/{id} | Actualizar producto completo |
| PATCH | /api/products/{id} | Actualizar solo precio |
| DELETE | /api/products/{id} | Eliminar |
| GET | /api/categories | Listar categorías |
| GET | /api/subcategorias | Listar subcategorías (?id_categoria=) |
| GET | /api/units | Listar unidades de medida |
| GET | /api/proveedores | Listar proveedores |

## Solución de problemas

- **CORS**: Si ves errores de CORS, el backend ya tiene configuración para `http://localhost:5173`
- **404**: Verifica que el context path sea `/DespensaProyect`; si no, cambia `VITE_API_BASE_URL`
- **Base de datos vacía**: Asegúrate de tener al menos 1 categoría, 1 unidad y 1 proveedor
