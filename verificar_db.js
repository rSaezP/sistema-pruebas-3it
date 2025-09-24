import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Verificando base de datos...');

try {
  const dbPath = path.join(__dirname, 'backend/server/database/pruebas_3it.db');
  const db = new Database(dbPath);
  
  // Contar tests
  const testsCount = db.prepare('SELECT COUNT(*) as count FROM tests').get();
  console.log(`📊 Total de tests: ${testsCount.count}`);
  
  // Contar preguntas
  const questionsCount = db.prepare('SELECT COUNT(*) as count FROM questions').get();
  console.log(`❓ Total de preguntas: ${questionsCount.count}`);
  
  // Verificar la query actual de tests
  const testsQuery = `
    SELECT t.*,
           COUNT(DISTINCT s.id) as total_sessions,
           COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END) as completed_sessions,
           AVG(CASE WHEN s.status = 'completed' THEN s.percentage_score END) as avg_score,
           (SELECT COUNT(*) FROM questions WHERE test_id = t.id) as questions_count
    FROM tests t
    LEFT JOIN test_sessions s ON t.id = s.test_id
    GROUP BY t.id
    ORDER BY t.created_at DESC
    LIMIT 3
  `;
  
  console.log('\n🔬 Ejecutando query de tests...');
  const tests = db.prepare(testsQuery).all();
  
  console.log(`📝 Tests encontrados: ${tests.length}`);
  tests.forEach((test, index) => {
    console.log(`\n📋 Test ${index + 1}:`);
    console.log(`  ID: ${test.id}`);
    console.log(`  Nombre: ${test.name}`);
    console.log(`  Questions Count: ${test.questions_count}`);
    console.log(`  Total Sessions: ${test.total_sessions}`);
    console.log(`  Completed Sessions: ${test.completed_sessions}`);
    
    // Verificar preguntas para este test específico
    const questionsForTest = db.prepare('SELECT COUNT(*) as count FROM questions WHERE test_id = ?').get(test.id);
    console.log(`  Preguntas reales: ${questionsForTest.count}`);
  });
  
  db.close();
  
} catch (error) {
  console.error('❌ Error:', error.message);
}