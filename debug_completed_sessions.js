import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 DIAGNÓSTICO DE SESIONES COMPLETADAS');

try {
  const dbPath = path.join(__dirname, 'backend/server/database/pruebas_3it.db');
  const db = new Database(dbPath);
  
  console.log('\n=== 1. SESIONES COMPLETADAS ===');
  const completedSessions = db.prepare(`
    SELECT 
      s.id, 
      s.token, 
      s.status, 
      s.percentage_score, 
      s.total_score,
      c.name as candidate_name,
      t.name as test_name
    FROM test_sessions s
    LEFT JOIN candidates c ON s.candidate_id = c.id
    LEFT JOIN tests t ON s.test_id = t.id
    WHERE s.status = 'completed'
    ORDER BY s.id DESC
    LIMIT 5
  `).all();
  
  console.log('Sesiones completadas encontradas:', completedSessions.length);
  completedSessions.forEach(session => {
    console.log(`- ID: ${session.id}, Token: ${session.token}, Score: ${session.percentage_score}%, Total: ${session.total_score}`);
  });
  
  if (completedSessions.length > 0) {
    const lastSession = completedSessions[0];
    console.log(`\n=== 2. ANÁLISIS DE SESIÓN ${lastSession.id} ===`);
    
    // Revisar respuestas de la sesión
    const answers = db.prepare(`
      SELECT 
        a.id,
        a.answer_text,
        a.score,
        a.percentage_score,
        q.title,
        q.type,
        q.max_score
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      WHERE a.session_id = ?
    `).all(lastSession.id);
    
    console.log(`Respuestas encontradas: ${answers.length}`);
    answers.forEach(answer => {
      console.log(`- ${answer.title} (${answer.type}): ${answer.score}/${answer.max_score} pts`);
    });
    
    // Calcular totales
    const totalScore = answers.reduce((sum, a) => sum + (a.score || 0), 0);
    const maxScore = answers.reduce((sum, a) => sum + (a.max_score || 0), 0);
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    
    console.log(`\n=== TOTALES CALCULADOS ===`);
    console.log(`Puntaje total: ${totalScore}/${maxScore} (${percentage.toFixed(2)}%)`);
    console.log(`Puntaje en DB: ${lastSession.total_score} (${lastSession.percentage_score}%)`);
    
    console.log(`\n=== 3. TEST ENDPOINT ===`);
    console.log(`Para probar el endpoint usa:`);
    console.log(`GET http://localhost:3001/api/sessions/completed/${lastSession.token}`);
  }
  
  db.close();
  
} catch (error) {
  console.error('❌ Error:', error.message);
}