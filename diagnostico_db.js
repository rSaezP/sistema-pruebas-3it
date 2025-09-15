/**
 * Script de diagnóstico para el problema de puntuación en Windows
 * Ejecutar con: node diagnostico_db.js
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 DIAGNÓSTICO DE BASE DE DATOS - Windows/SQLite3');
console.log('='.repeat(60));

try {
  // Conectar a la base de datos
  const dbPath = path.join(__dirname, 'backend/server/database/pruebas_3it.db');
  console.log('📍 Ruta DB:', dbPath);
  
  const db = new Database(dbPath);
  console.log('✅ Conexión establecida');
  
  // 1. Verificar versión de SQLite
  const version = db.pragma('user_version');
  console.log('📊 Versión SQLite:', db.prepare("SELECT sqlite_version()").get());
  
  // 2. Verificar tablas
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('📋 Tablas disponibles:', tables.map(t => t.name));
  
  // 3. Verificar estructura de respuestas
  const answersSchema = db.prepare("PRAGMA table_info(answers)").all();
  console.log('🏗️  Estructura tabla answers:');
  answersSchema.forEach(col => {
    console.log(`   - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
  });
  
  // 4. Verificar datos recientes
  console.log('\n📈 DATOS RECIENTES:');
  
  const recentAnswers = db.prepare(`
    SELECT 
      a.id, 
      a.session_id, 
      a.question_id, 
      a.answer_text, 
      a.score,
      a.percentage_score,
      q.type,
      q.title,
      ts.token,
      ts.percentage_score as session_score
    FROM answers a
    JOIN questions q ON a.question_id = q.id
    JOIN test_sessions ts ON a.session_id = ts.id
    WHERE q.type = 'multiple_choice'
    ORDER BY a.id DESC
    LIMIT 5
  `).all();
  
  console.log('🔍 Últimas 5 respuestas de selección múltiple:');
  recentAnswers.forEach((answer, i) => {
    console.log(`   ${i+1}. ID: ${answer.id} | Respuesta: "${answer.answer_text}" | Score: ${answer.score} | Session Score: ${answer.session_score}`);
    console.log(`      Question: ${answer.title.substring(0, 50)}...`);
    console.log(`      Token: ${answer.token.substring(0, 10)}...`);
  });
  
  // 5. Test de escritura
  console.log('\n🧪 TEST DE ESCRITURA:');
  
  if (recentAnswers.length > 0) {
    const testAnswer = recentAnswers[0];
    const originalScore = testAnswer.score;
    const newScore = originalScore === 10 ? 5 : 10; // Cambiar score
    
    console.log(`   Cambiando score de ${originalScore} a ${newScore} en answer ID ${testAnswer.id}`);
    
    try {
      // Intentar actualizar
      const updateResult = db.prepare('UPDATE answers SET score = ? WHERE id = ?').run(newScore, testAnswer.id);
      console.log(`   ✅ Update result:`, updateResult);
      
      // Verificar cambio
      const updatedAnswer = db.prepare('SELECT score FROM answers WHERE id = ?').get(testAnswer.id);
      console.log(`   📊 Score actualizado: ${updatedAnswer.score}`);
      
      // Revertir cambio
      db.prepare('UPDATE answers SET score = ? WHERE id = ?').run(originalScore, testAnswer.id);
      console.log(`   🔄 Score revertido a: ${originalScore}`);
      
    } catch (writeError) {
      console.error('   ❌ Error en escritura:', writeError.message);
    }
  }
  
  // 6. Test de transacciones
  console.log('\n💾 TEST DE TRANSACCIONES:');
  
  try {
    const transaction = db.transaction(() => {
      // Simular actualización de respuesta y sesión
      const mockUpdate1 = db.prepare('UPDATE answers SET score = score WHERE id = 1');
      const mockUpdate2 = db.prepare('UPDATE test_sessions SET percentage_score = percentage_score WHERE id = 1');
      
      const result1 = mockUpdate1.run();
      const result2 = mockUpdate2.run();
      
      return { result1, result2 };
    });
    
    const transactionResult = transaction();
    console.log('   ✅ Transacción exitosa:', transactionResult);
    
  } catch (transactionError) {
    console.error('   ❌ Error en transacción:', transactionError.message);
  }
  
  // 7. Verificar permisos y bloqueos
  console.log('\n🔒 TEST DE PERMISOS:');
  
  try {
    // Verificar si hay bloqueos
    const isReadOnly = db.readonly;
    console.log(`   📖 Base de datos es solo lectura: ${isReadOnly}`);
    
    // Test simple de escritura
    const testWrite = db.prepare('CREATE TEMP TABLE test_write (id INTEGER)');
    testWrite.run();
    console.log('   ✅ Escritura temporal exitosa');
    
  } catch (permError) {
    console.error('   ❌ Error de permisos:', permError.message);
  }
  
  // 8. Información del sistema
  console.log('\n🖥️  INFORMACIÓN DEL SISTEMA:');
  console.log(`   - Plataforma: ${process.platform}`);
  console.log(`   - Arquitectura: ${process.arch}`);
  console.log(`   - Node.js: ${process.version}`);
  console.log(`   - Directorio de trabajo: ${process.cwd()}`);
  
  db.close();
  console.log('\n✅ Diagnóstico completado');
  
} catch (error) {
  console.error('❌ Error en diagnóstico:', error);
  console.error('Stack:', error.stack);
}