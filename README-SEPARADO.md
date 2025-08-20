# Sistema de Pruebas Técnicas 3IT - Arquitectura Separada

## Estructura del Proyecto

```
project/
├── backend/           # Servidor Express + SQLite
│   ├── server/        # Código del servidor
│   ├── package.json   # Dependencias backend
│   └── node_modules/  # Módulos backend
├── frontend/          # Cliente Vue 3 + TypeScript
│   ├── src/           # Código del frontend
│   ├── public/        # Assets estáticos
│   ├── package.json   # Dependencias frontend
│   └── node_modules/  # Módulos frontend
└── start-dev.bat      # Script de inicio
```

## Inicio Rápido

### Opción 1: Script Automático (Recomendado)
```batch
# Doble click en: start-dev.bat
# Seleccionar opción 1 para Backend + Frontend
```

### Opción 2: Manual (Dos terminales)
```batch
# Terminal 1 - Backend:
start-backend.bat

# Terminal 2 - Frontend:
start-frontend.bat
```

### Opción 3: Desarrollo Individual
```batch
# Solo Backend:
cd backend
npm run dev

# Solo Frontend:
cd frontend
npm run dev
```

## URLs de Acceso
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000

## Ventajas de esta Arquitectura
- **Separación completa**: Backend y frontend independientes
- **Fácil integración**: Backend puede integrarse en otros proyectos
- **Desarrollo paralelo**: Equipos pueden trabajar independientemente
- **Deployment flexible**: Cada parte puede desplegarse por separado
- **Dependencias aisladas**: Sin conflictos entre librerías

## Integración Futura
El backend en `/backend/` es completamente independiente y puede:
- Copiarse a otros proyectos
- Ejecutarse como microservicio
- Desplegarse en contenedores Docker
- Integrarse con diferentes frontends

## Migración Completada
✅ Backend separado con sus dependencias  
✅ Frontend separado con sus dependencias  
✅ Scripts de inicio automático para Windows  
✅ Configuración de proxy API mantenida  
✅ Base de datos SQLite preservada


## # Matar todos los procesos node
taskkill /IM node.exe /F

# Verificar que puerto 4000 esté libre
netstat -ano | findstr :4000
# No debe devolver resultados

# Entonces reiniciar
npm run dev