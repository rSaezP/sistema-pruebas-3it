# Bug: Error 404 al Reenviar Invitaciones

**Fecha**: 2025-09-25  
**Severidad**: Alta  
**Estado**: Activo  
**Relacionado**: bug-candidatos-fantasma.md

## Descripción del Problema

Al intentar reenviar invitaciones de pruebas técnicas, el sistema devuelve **404 Not Found** porque el frontend envía candidatos que no existen en la base de datos.

## Error Técnico

```
POST http://localhost:4000/api/email/send-invitation 404 (Not Found)
resendInvitation @ Candidates.vue:604
```

## Flujo del Error

### Frontend Request:
```javascript
POST /api/email/send-invitation
{
  "candidateId": "95",    // ❌ No existe en BD
  "testId": "15",         // ✅ Existe
  "sessionToken": "dc91a0db-d065-413b-a50e-edbb485901e1"
}
```

### Backend Response:
```javascript
404 Not Found
{
  "error": "Candidato con ID 95 no encontrado en la base de datos",
  "candidateExists": false,
  "testExists": true,
  "availableCandidates": [
    { "id": 89, "name": "Test 100 Correcto" },
    { "id": 88, "name": "Prueba Evaluacion" },
    // ...
  ]
}
```

## Código Involucrado

### Frontend (Candidates.vue:590-625)
```javascript
const resendInvitation = async (candidateId: string | number) => {
  try {
    // ✅ Agregado: logs de debug
    console.log('🔍 FRONTEND DEBUG - candidateId recibido:', candidateId);
    
    // ✅ Agregado: recarga forzada de datos
    await fetchCandidates();
    
    const candidate = candidates.value.find(c => c.id === candidateId);
    if (!candidate) {
      toast.error(`El candidato con ID ${candidateId} ya no existe. Lista actualizada.`);
      return;
    }
    
    // ❌ PROBLEMA: Aún así se envían candidatos fantasma
    const response = await fetch('http://localhost:4000/api/email/send-invitation', {
      method: 'POST',
      body: JSON.stringify({
        candidateId: candidateId,           // ❌ ID inexistente
        testId: candidate.testId,
        sessionToken: candidate.sessionToken
      })
    });
  }
}
```

### Backend (email.js:202-250)
```javascript
router.post('/send-invitation', async (req, res) => {
  const { candidateId, testId, sessionToken } = req.body;
  
  const candidateIdInt = parseInt(candidateId);
  const testIdInt = parseInt(testId);
  
  // ✅ Busca correctamente en BD
  const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateIdInt);
  const test = db.prepare('SELECT * FROM tests WHERE id = ?').get(testIdInt);
  
  if (!candidate || !test) {
    // ✅ Mejorado: mensaje más descriptivo
    const errorMsg = !candidate ? 
      `Candidato con ID ${candidateIdInt} no encontrado en la base de datos` : 
      `Prueba con ID ${testIdInt} no encontrada`;
    return res.status(404).json({ 
      error: errorMsg,
      candidateExists: !!candidate,
      testExists: !!test,
      availableCandidates: !candidate ? db.prepare('SELECT id, name FROM candidates ORDER BY id DESC LIMIT 5').all() : null
    });
  }
  
  // ... resto del código de envío de email
});
```

## Intentos de Solución

### ❌ Solución 1: Fix función undefined
**Problema**: `loadCandidates is not defined`
**Fix**: Cambió por `fetchCandidates()`
**Resultado**: Error se mantiene

### ❌ Solución 2: Mejorar mensajes error backend
**Problema**: Error 404 genérico
**Fix**: Mensajes descriptivos + datos de debug
**Resultado**: Mejor visibilidad pero error persiste

### ❌ Solución 3: Recarga forzada frontend
**Problema**: Datos desactualizados
**Fix**: `await fetchCandidates()` antes de reenviar
**Resultado**: **NO FUNCIONA** - sigue enviando IDs fantasma

## Estado de Candidatos

### En Base de Datos (Real):
```sql
SELECT id, name, email FROM candidates ORDER BY id;
```
```
| id | name                | email              |
|----|--------------------|--------------------|
| 85 | Test Semana        | semana@test.com    |
| 86 | Test Ayer          | ayer@test.com      |
| 87 | Test Mes Pasado    | mespasado@test.com |
| 88 | Prueba Evaluacion  | prueba-eval@test.com |
| 89 | Test 100 Correcto  | test-100@test.com  |
```

### En Frontend (Problemático):
- Muestra candidatos con IDs: **93, 95** ❌
- Estos IDs **NO EXISTEN** en la base de datos
- Al hacer click "Reenviar" se envía el ID fantasma

## Hipótesis del Problema

### 1. Cache Frontend Corrupto
- `candidates.value` contiene datos obsoletos
- `fetchCandidates()` no actualiza correctamente
- Estado Vue no se refresca

### 2. Múltiples Fuentes de Datos
- Datos vienen de localStorage
- Datos vienen de sessionStorage  
- Datos vienen de API
- **Conflicto entre fuentes**

### 3. Race Condition
- UI se renderiza antes que datos se actualicen
- Click rápido en "Reenviar" usa datos viejos
- `await fetchCandidates()` no es suficiente

## Debugging Requerido

### En Frontend:
```javascript
// Verificar fuente de datos
console.log('localStorage candidates:', localStorage.getItem('candidates'));
console.log('sessionStorage candidates:', sessionStorage.getItem('candidates'));
console.log('Vue state candidates:', candidates.value);

// Verificar función fetchCandidates
const antes = [...candidates.value];
await fetchCandidates();
const despues = [...candidates.value];
console.log('Antes:', antes.map(c => c.id));
console.log('Después:', despues.map(c => c.id));
console.log('¿Cambió?', JSON.stringify(antes) !== JSON.stringify(despues));
```

### En Backend:
```javascript
// Verificar endpoint GET /api/candidates
curl http://localhost:4000/api/candidates | jq '.[] | {id, name}'
```

## Pasos Reproducir

1. Abrir panel de candidatos
2. Observar candidatos mostrados (contiene IDs fantasma)
3. Click "Reenviar invitación" en cualquier candidato
4. Ver error 404 en consola de navegador
5. Ver logs backend confirmando que candidato no existe

## Impacto en Sistema

- **Funcionalidad crítica rota**: No se pueden reenviar invitaciones
- **Experiencia usuario degradada**: Botones que no funcionan
- **Pérdida confianza**: Datos inconsistentes
- **Operación manual requerida**: Admin debe usar IDs correctos

## Next Steps

1. [ ] **URGENTE**: Investigar función `fetchCandidates()` línea por línea
2. [ ] Verificar si response del API `/api/candidates` está correcto
3. [ ] Revisar estado Vue - ¿se actualiza el array realmente?
4. [ ] Implementar logging extensivo en frontend
5. [ ] Considerar hard refresh automático como workaround
6. [ ] Evaluar migrar a state management centralizado