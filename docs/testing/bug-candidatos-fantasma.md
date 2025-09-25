# Bug: Candidatos Fantasma en Frontend

**Fecha**: 2025-09-25  
**Severidad**: Alta  
**Estado**: Activo  

## Descripción del Problema

El frontend muestra candidatos con IDs que **no existen en la base de datos**, causando errores 404 al intentar reenviar invitaciones.

## Síntomas Observados

1. Frontend muestra candidatos con IDs 93, 95 que no existen en BD
2. Al intentar reenviar invitación: `POST /api/email/send-invitation` devuelve **404**
3. Backend logs muestran:
   ```
   🔍 DEBUG RESEND - Datos recibidos: { candidateId: '95', testId: '15', sessionToken: 'dc91a...' }
   🔍 DEBUG RESEND - Encontrado: { candidateFound: false, testFound: true }
   🔍 DEBUG - Candidatos existentes en DB: [
     { id: 89, name: 'Test 100 Correcto' },
     { id: 88, name: 'Prueba Evaluacion' },
     // Solo existen IDs 85-89
   ]
   ```

## Contexto

- Ocurrió después de crear estructura MVC (carpetas controllers/, models/, config/, middlewares/)
- Usuario eliminó candidatos manualmente de la BD
- Frontend conserva datos obsoletos/cached

## Causa Raíz

**Desincronización entre frontend y backend**:
- Frontend mantiene datos en `candidates.value` (estado Vue)
- No se actualiza automáticamente cuando datos cambian en BD
- Función `fetchCandidates()` no se ejecuta cuando es necesario

## Análisis Técnico

### Flujo problemático:
1. Usuario ve candidato ID 95 en la interfaz
2. Click "Reenviar" → `resendInvitation(95)`
3. Frontend encuentra candidato en `candidates.value` ✅
4. Envía request al backend con candidateId: 95
5. Backend busca candidato ID 95 → **No existe** ❌
6. Backend devuelve 404

### Archivos involucrados:
- `frontend/src/views/admin/Candidates.vue:599` (línea del error 404)
- `backend/server/routes/email.js:202` (endpoint send-invitation)
- `backend/server/routes/candidates.js:40-104` (obtener candidatos)

## Impacto

- **Funcionalidad rota**: No se pueden reenviar invitaciones
- **Experiencia de usuario**: Confusión al ver candidatos inexistentes
- **Integridad de datos**: Frontend muestra información falsa

## Soluciones Implementadas (No funcionaron)

### 1. Fix función undefined ✅
```javascript
// Cambió loadCandidates() → fetchCandidates()
await fetchCandidates(); // Línea 617
```

### 2. Mejorar mensajes de error backend ✅
```javascript
const errorMsg = !candidate ? 
  `Candidato con ID ${candidateIdInt} no encontrado en la base de datos` : 
  `Prueba con ID ${testIdInt} no encontrada`;
```

### 3. Recarga forzada frontend ❌
```javascript
// SIEMPRE recargar datos antes de reenviar
await fetchCandidates();
const candidate = candidates.value.find(c => c.id === candidateId);
```

## Soluciones Pendientes

### 1. Limpiar cache completo
- Cerrar navegador completamente
- Limpiar localStorage: `Application → Storage → Clear storage`
- Reiniciar frontend

### 2. Verificar origen datos
- ¿De dónde viene el array `candidates.value`?
- ¿Hay cache en memoria, localStorage o sessionStorage?
- ¿La función `fetchCandidates()` realmente actualiza los datos?

### 3. Debugging profundo
Logs agregados en frontend:
```javascript
console.log('🔍 FRONTEND DEBUG - candidateId recibido:', candidateId);
console.log('🔍 FRONTEND DEBUG - Lista actual:', candidates.value.map(c => ({ id: c.id, name: c.name })));
```

## Pasos para Reproducir

1. Tener candidatos en la BD (ej. IDs 85-89)
2. El frontend muestra candidatos con IDs diferentes (93, 95)
3. Click en "Reenviar invitación" de cualquier candidato fantasma
4. Observar error 404 en consola

## Datos de Debug

### Backend (correcto):
- Candidatos existentes: IDs 85, 86, 87, 88, 89
- Endpoint `/api/email/send-invitation` funciona correctamente

### Frontend (problemático):
- Muestra candidatos con IDs 93, 95 (inexistentes)
- Estado `candidates.value` desactualizado
- No actualiza datos automáticamente

## Próximos Pasos

1. [ ] Investigar función `fetchCandidates()` - ¿realmente actualiza datos?
2. [ ] Verificar si hay múltiples fuentes de datos en frontend
3. [ ] Implementar revalidación automática periódica
4. [ ] Considerar usar state management (Vuex/Pinia) para datos globales
5. [ ] Agregar validación de existencia antes de mostrar acciones

## Workaround Temporal

**Para administradores**:
1. Refrescar página completa (F5)
2. Limpiar cache del navegador
3. Usar solo candidatos con IDs 85-89 que existen realmente

**Para desarrolladores**:
1. Verificar datos con `GET /api/candidates` directamente
2. Comparar respuesta API vs frontend estado
3. Forzar recarga de datos antes de acciones críticas