import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/init.js';
import crypto from 'crypto';
import puppeteer from 'puppeteer';
import fs from 'fs';          
import path from 'path';      
import { LanguageEvaluators } from '../evaluators/LanguageEvaluators.js';

async function executeCode(code, testCase, language) {
  try {
    console.log(`[DEBUG-EXEC] Ejecutando evaluador para ${language}`);
    
    if (!LanguageEvaluators || !LanguageEvaluators.getEvaluator) {
      console.log(`[DEBUG-EXEC] LanguageEvaluators no disponible`);
      return { success: false, output: '', error: 'LanguageEvaluators not available' };
    }
    
    const evaluator = LanguageEvaluators.getEvaluator(language);
    
    if (evaluator) {
      console.log(`[DEBUG-EXEC] Evaluador encontrado para ${language}`);
      const result = await evaluator.evaluate(code, testCase, language);
      console.log(`[DEBUG-EXEC] Resultado:`, result);
      return result;
    } else {
      console.log(`[DEBUG-EXEC] No hay evaluador para ${language}`);
      return { success: false, output: '', error: 'No evaluator found' };
    }
  } catch (error) {
    console.log(`[DEBUG-EXEC] Error:`, error.message);
    return { success: false, output: '', error: error.message };
  }
}
const router = express.Router();

// Get all candidates with their test sessions
router.get('/', (req, res) => {
  try {
    
    const candidatesQuery = `
      SELECT c.*,
             COUNT(DISTINCT s.id) as total_tests,
             COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END) as completed_tests,
             COUNT(DISTINCT CASE WHEN s.status = 'in_progress' THEN s.id END) as in_progress_tests,
             COUNT(DISTINCT CASE WHEN s.status = 'pending' THEN s.id END) as pending_tests,
             ROUND(AVG(CASE WHEN s.status = 'completed' THEN s.percentage_score END)) as avg_score,
             MAX(CASE WHEN s.status = 'completed' THEN s.percentage_score END) as best_score,
             (CASE 
               WHEN COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END) > 0 THEN 'completed'
               WHEN COUNT(DISTINCT CASE WHEN s.status = 'in_progress' THEN s.id END) > 0 THEN 'in_progress'
               WHEN COUNT(DISTINCT CASE WHEN s.status = 'expired' THEN s.id END) > 0 THEN 'expired'
               ELSE c.status
             END) as actual_status
      FROM candidates c
      LEFT JOIN test_sessions s ON c.id = s.candidate_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `;

    const candidates = db.prepare(candidatesQuery).all();
    
    // Format the response
    const candidatesWithStats = candidates.map(candidate => ({
      ...candidate,
      status: candidate.actual_status, // Use calculated status based on sessions
      avg_score: candidate.avg_score // Already rounded in SQL query
    }));

    res.json(candidatesWithStats);
  } catch (error) {
    console.error('Error al obtener candidatos:', error);
    res.status(500).json({ error: 'Error al obtener candidatos' });
  }
});

// Create new candidate
router.post('/', (req, res) => {
  try {
    const { 
      name, 
      lastname, 
      email, 
      phone, 
      position_applied, 
      experience_level, 
      test_id, 
      expires_at, 
      custom_message 
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Nombre y email son requeridos' });
    }

    // Verificar si ya existe un candidato con el mismo email Y misma prueba
    const existingCandidate = db.prepare(
      'SELECT id, name, test_id FROM candidates WHERE email = ? AND test_id = ?'
    ).get(email, test_id);
    
    if (existingCandidate) {
      const testName = db.prepare('SELECT name FROM tests WHERE id = ?').get(test_id)?.name || 'esta prueba';
      return res.status(400).json({ 
        error: 'candidate_exists',
        message: `El candidato ${existingCandidate.name} ya está registrado para ${testName}`,
        candidateId: existingCandidate.id
      });
    }

    // Generate session token for the test
    const sessionToken = crypto.randomUUID();

    const insertQuery = `
      INSERT INTO candidates (
        name, lastname, email, phone, position_applied, experience_level, 
        test_id, expires_at, status, session_token, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const timestamp = new Date().toISOString();
    const values = [
      name,
      lastname || '',
      email,
      phone || null,
      position_applied || '',
      experience_level || null,
      test_id || null,
      expires_at || null,
      'pending',
      sessionToken,
      timestamp,
      timestamp
    ];

    const result = db.prepare(insertQuery).run(...values);

    console.log('=== DEBUG GENERAL ===');
    console.log('test_id recibido:', test_id);
    console.log('test_id type:', typeof test_id);
    console.log('test_id truthy:', !!test_id);
    console.log('=== DATOS RECIBIDOS COMPLETOS ===', { name, lastname, email, test_id, expires_at });

  console.log('=== DEBUG GENERAL ===');

    // Si tiene test_id, crear también la sesión correspondiente
    if (test_id) {
      console.log('=== DEBUG CREACIÓN SESIÓN ===');
      console.log('test_id:', test_id);
      
      const test = db.prepare('SELECT * FROM tests WHERE id = ?').get(test_id);
      console.log('test encontrado:', test);
      
      if (test) {
        const insertSessionQuery = `
          INSERT INTO test_sessions (candidate_id, test_id, token, time_limit_minutes, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        const sessionValues = [
          result.lastInsertRowid,
          test_id,
          sessionToken,
          test.time_limit,
          'pending',
          timestamp
        ];
        
        console.log('valores para sesión:', sessionValues);
        
        try {
          const sessionResult = db.prepare(insertSessionQuery).run(...sessionValues);
          console.log('sesión creada con ID:', sessionResult.lastInsertRowid);
        } catch (error) {
          console.error('ERROR creando sesión:', error);
        }
      } else {
        console.log('NO se encontró el test con ID:', test_id);
      }
    } else {
      console.log('NO hay test_id para crear sesión');
    }

    res.json({ 
      id: result.lastInsertRowid, 
      sessionToken,
      message: 'Candidato creado exitosamente' 
    });
  } catch (error) {
    console.error('Error al crear candidato:', error);
    res.status(500).json({ error: 'Error al crear candidato' });
  }
});

router.post('/:candidateId/invite', (req, res) => {
  try {
    const candidateId = parseInt(req.params.candidateId);
    const { testId, customMessage } = req.body;

    if (!testId) {
      return res.status(400).json({ error: 'ID de prueba requerido' });
    }

    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidato no encontrado' });
    }

    const test = db.prepare('SELECT * FROM tests WHERE id = ?').get(parseInt(testId));
    if (!test) {
      return res.status(404).json({ error: 'Prueba no encontrada' });
    }

    const token = uuidv4();
    const timestamp = new Date().toISOString();
    
    const insertSessionQuery = `
      INSERT INTO test_sessions (candidate_id, test_id, token, time_limit_minutes, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const sessionValues = [
      candidateId,           // ✅ CORREGIDO
      parseInt(testId),      // ✅ CORREGIDO  
      token,                 // ✅ CORREGIDO
      test.time_limit,
      'pending',
      timestamp
    ];

    const result = db.prepare(insertSessionQuery).run(...sessionValues);
    
    const testUrl = `${req.protocol}://${req.get('host')}/test/${token}`;

    res.json({
      sessionId: result.lastInsertRowid,
      token,
      testUrl,
      message: 'Invitación creada exitosamente',
      candidate: {
        name: candidate.name,
        email: candidate.email
      },
      test: {
        name: test.name,
        timeLimit: test.time_limit
      }
    });
  } catch (error) {
    console.error('Error al crear invitación:', error);
    res.status(500).json({ error: 'Error al crear invitación' });
  }
});

// Delete candidate
router.delete('/:id', (req, res) => {
  try {
    const candidateId = parseInt(req.params.id);
    
    if (isNaN(candidateId)) {
      return res.status(400).json({ error: 'ID de candidato no válido' });
    }
    
    // Verificar si el candidato existe
    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidato no encontrado' });
    }
    
    // Iniciar una transacción para asegurar la integridad de los datos
    db.prepare('BEGIN TRANSACTION').run();
    
    try {
      // Eliminar answers primero
      db.prepare('DELETE FROM answers WHERE session_id IN (SELECT id FROM test_sessions WHERE candidate_id = ?)').run(candidateId);
      // Eliminar test_sessions
      db.prepare('DELETE FROM test_sessions WHERE candidate_id = ?').run(candidateId);
      
      // Luego eliminar el candidato
      const result = db.prepare('DELETE FROM candidates WHERE id = ?').run(candidateId);
      
      db.prepare('COMMIT').run();
      
      if (result.changes === 0) {
        return res.status(404).json({ error: 'No se pudo eliminar el candidato' });
      }
      
      res.status(200).json({ 
        message: 'Candidato eliminado correctamente',
        candidateId: candidateId
      });
      
    } catch (error) {
      db.prepare('ROLLBACK').run();
      throw error; // Esto será capturado por el catch externo
    }
    
  } catch (error) {
    console.error('Error al eliminar candidato:', error);
    res.status(500).json({ 
      error: 'Error al eliminar el candidato',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get candidate test sessions
router.get('/:candidateId/sessions', (req, res) => {
  try {
    const candidateId = parseInt(req.params.candidateId);

    const sessionsQuery = `
      SELECT s.*, t.name as test_name, t.description as test_description
      FROM test_sessions s
      LEFT JOIN tests t ON s.test_id = t.id
      WHERE s.candidate_id = ?
      ORDER BY s.created_at DESC
    `;

    const sessions = db.prepare(sessionsQuery).all(candidateId);
    
    res.json(sessions);
  } catch (error) {
    console.error('Error al obtener sesiones:', error);
    res.status(500).json({ error: 'Error al obtener sesiones' });
  }
});

// Generate PDF report for candidate
router.get('/:id/reports/pdf', async (req, res) => {
  try {
    const candidateId = parseInt(req.params.id);

    // Get candidate data with their test session - CORREGIDO: Agregamos ts.id as session_id
    const candidateQuery = `
      SELECT c.*, ts.*, t.name as test_name, t.description as test_description,
            ts.percentage_score, ts.time_spent_seconds, ts.started_at,
            ts.finished_at, ts.id as session_id
      FROM candidates c
      LEFT JOIN test_sessions ts ON c.id = ts.candidate_id
      LEFT JOIN tests t ON ts.test_id = t.id
      WHERE c.id = ? AND ts.status = 'completed'
      ORDER BY ts.created_at DESC
      LIMIT 1
    `;
    const candidate = db.prepare(candidateQuery).get(candidateId);
    console.log('CANDIDATE DATA:', candidate);

    if (!candidate) {
      return res.status(404).json({ error: 'Candidato no encontrado o no ha completado ninguna prueba' });
    }

    // Get answers with question details
    const answersQuery = `
      SELECT a.*, q.title, q.description, q.type, q.difficulty, q.max_score as question_max_score,
            c.name as category_name, a.score
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      LEFT JOIN categories c ON q.category_id = c.id
      WHERE a.session_id = ?
      ORDER BY q.order_index
    `;

    console.log('SESSION ID PARA ANSWERS:', candidate.session_id);
    let answers;
    try {
      console.log('Buscando respuestas para session_id:', candidate.session_id);
      answers = db.prepare(answersQuery).all(candidate.session_id);
      console.log('ANSWERS encontradas:', answers.length);
    } catch (error) {
      console.error('Error buscando answers:', error.message);
      answers = [];
    }

    
      // HTML QUE COINCIDE EXACTAMENTE CON EL EJEMPLO PDF
      const generateProfessionalHTML = (candidate, answers) => {
        // Calcular tiempo total y porcentaje
        const timeSpentSeconds = candidate.time_spent_seconds || 0;
        const hours = Math.floor(timeSpentSeconds / 3600);
        const minutes = Math.floor((timeSpentSeconds % 3600) / 60);
        const seconds = timeSpentSeconds % 60;
        const timeTotal = `${hours} Hora${hours !== 1 ? 's' : ''} ${minutes} Minuto${minutes !== 1 ? 's' : ''} ${seconds} Segundo${seconds !== 1 ? 's' : ''}`;
        
        const percentageScore = candidate.percentage_score || 0;
        const totalScore = Math.round((percentageScore / 100) * 60);
        
        // Agrupar respuestas por categoría
        const categoryStats = {};
        answers.forEach(answer => {
          const category = answer.category_name || 'Programación';
          if (!categoryStats[category]) {
            categoryStats[category] = {
              name: category,
              totalScore: 0,
              maxScore: 0,
              questions: []
            };
          }
          categoryStats[category].totalScore += answer.score || 0;
          categoryStats[category].maxScore += answer.question_max_score || 0;
          categoryStats[category].questions.push(answer);
        });

        // Formatear fechas como en el ejemplo
        const formatDate = (dateString) => {
          if (!dateString) return 'N/A';
          const date = new Date(dateString);
          return date.toLocaleDateString('es-ES') + ' ' + date.toLocaleTimeString('es-ES', { hour12: false });
        };

        return `
  <!DOCTYPE html>
  <html>
  <head>
      <meta charset="UTF-8">
      <title>Reporte - ${candidate.name}</title>
      <style>
          @page {
              margin: 0;
              size: A4;
          }
          body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 0;
              background-color: white;
              font-size: 12px;
              line-height: 1.4;
          }
          .header {
              background: linear-gradient(90deg, #6366F1 0%, #8B5CF6 100%);
              color: white;
              padding: 30px 40px;
              position: relative;
              min-height: 120px;
          }
          .logo {
              background-color: black;
              color: white;
              padding: 6px 10px;
              display: inline-block;
              font-weight: bold;
              font-size: 14px;
              margin-bottom: 20px;
          }
          .header-content {
              position: relative;
          }
          .header h1 {
              margin: 0 0 5px 0;
              font-size: 28px;
              font-weight: normal;
          }
          .header h2 {
              margin: 0 0 15px 0;
              font-size: 20px;
              font-weight: normal;
          }
          .datetime {
              font-size: 14px;
              margin: 10px 0;
          }
          .score-section {
              position: absolute;
              right: 40px;
              top: 50%;
              transform: translateY(-50%);
              text-align: center;
          }
          .score-label {
              font-size: 16px;
              margin-bottom: 10px;
              font-weight: bold;
          }
          .score-number {
              font-size: 32px;
              font-weight: bold;
              margin: 10px 0;
          }
          .score-circle {
              width: 120px;
              height: 120px;
              border: 12px solid #4ADE80;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              background: white;
              margin: 15px auto 0;
          }
          .score-text {
              font-size: 24px;
              font-weight: bold;
              color: #333;
          }
          .content {
              padding: 30px 40px;
          }
          .summary-stats {
              margin: 30px 0;
              display: flex;
              gap: 30px;
              align-items: flex-start;
          }
          .summary-left {
              flex: 1;
          }
          .summary-item {
              margin: 8px 0;
              font-size: 14px;
          }
          .summary-label {
              font-weight: bold;
              display: inline-block;
              min-width: 80px;
          }
          .info-section {
              margin: 40px 0;
          }
          .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 40px;
              background: #F8F9FA;
              padding: 25px;
              border-radius: 8px;
          }
          .info-item h3 {
              margin: 0 0 15px 0;
              font-size: 16px;
              font-weight: bold;
              color: #333;
          }
          .info-value {
              margin: 8px 0;
              font-size: 14px;
              color: #555;
          }
          .info-label {
              font-weight: bold;
              color: #333;
          }
          .categories-section {
              margin: 40px 0;
          }
          .section-title {
              font-size: 24px;
              font-weight: bold;
              margin: 0 0 20px 0;
              color: #333;
          }
          .categories-header {
              display: grid;
              grid-template-columns: 2fr 1fr 1fr;
              gap: 20px;
              padding: 10px 0;
              border-bottom: 2px solid #E5E7EB;
              font-weight: bold;
              margin-bottom: 20px;
          }
          .category-item {
              display: grid;
              grid-template-columns: 2fr 1fr 1fr;
              gap: 20px;
              align-items: center;
              padding: 15px 0;
              border-left: 4px solid #4ADE80;
              padding-left: 15px;
              margin: 15px 0;
              background: #F8F9FA;
          }
          .category-name {
              font-weight: bold;
              font-size: 14px;
          }
          .category-result {
              font-size: 12px;
              color: #666;
          }
          .category-score-box {
              background: #3B82F6;
              color: white;
              padding: 8px 15px;
              border-radius: 4px;
              font-weight: bold;
              text-align: center;
              font-size: 14px;
          }
          .legend-section {
              display: flex;
              justify-content: center;
              gap: 30px;
              margin: 30px 0;
          }
          .legend-item {
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 12px;
          }
          .legend-color {
              width: 16px;
              height: 16px;
              border-radius: 3px;
          }
          .legend-green { background-color: #4ADE80; }
          .legend-orange { background-color: #FB923C; }
          .legend-red { background-color: #EF4444; }
          .questions-section {
              margin: 40px 0;
          }
          .questions-header {
              display: grid;
              grid-template-columns: 3fr 1fr 1fr 1fr;
              gap: 20px;
              padding: 10px 0;
              border-bottom: 2px solid #E5E7EB;
              font-weight: bold;
              margin-bottom: 20px;
          }
          .question-item {
              margin: 20px 0;
              padding: 20px;
              border-left: 4px solid #4ADE80;
              background: #F8F9FA;
              border-radius: 0 8px 8px 0;
          }
          .question-header-row {
              display: grid;
              grid-template-columns: 3fr 1fr 1fr 1fr;
              gap: 20px;
              align-items: center;
              margin-bottom: 15px;
          }
          .question-title {
              font-weight: bold;
              font-size: 14px;
              color: #333;
          }
          .question-category {
              text-align: center;
              font-size: 12px;
              color: #666;
          }
          .question-difficulty {
              text-align: center;
              font-size: 12px;
              padding: 4px 8px;
              border-radius: 12px;
              background: #E0F2FE;
              color: #0369A1;
          }
          .question-score {
              text-align: center;
              font-weight: bold;
              font-size: 14px;
          }
          .question-description {
              margin-top: 15px;
              padding-top: 15px;
              border-top: 1px solid #E5E7EB;
              font-size: 12px;
              line-height: 1.6;
              color: #555;
          }
          .bottom-legend {
              display: flex;
              justify-content: center;
              gap: 25px;
              margin: 30px 0;
              padding: 20px 0;
              border-top: 1px solid #E5E7EB;
          }
          .bottom-legend-item {
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 12px;
          }
          .bottom-legend-color {
              width: 16px;
              height: 16px;
              border-radius: 3px;
          }
          .legend-gray { background-color: #9CA3AF; }
          .legend-yellow { background-color: #FCD34D; }
          .candidate-answer {
              margin-top: 15px;
              padding: 15px;
              background: #F8FAFC;
              border-radius: 8px;
              border-left: 3px solid #3B82F6;
          }
          .candidate-answer strong {
              color: #1E40AF;
              display: block;
              margin-bottom: 10px;
          }
      </style>
  </head>
  <body>
      <div class="header">
          <div class="header-content">
              <div class="logo">3IT</div>
              <h1>${candidate.test_name || 'Team Eureka 3it'}</h1>
              <h2>${candidate.name} ${candidate.lastname || ''}</h2>
              <div class="datetime">
                  Fecha Inicio: ${formatDate(candidate.started_at)} Fecha Fin: ${formatDate(candidate.finished_at)}
              </div>
              <div class="score-section">
                  <div class="score-label">Puntaje Total:</div>
                  <div class="score-number">${totalScore}/60</div>
                  <div class="score-circle">
                      <div class="score-text">${Math.round(percentageScore)}%</div>
                  </div>
              </div>
          </div>
      </div>

      <div class="content">
          <div class="summary-stats">
              <div class="summary-left">
                  <div class="summary-item">
                      <span class="summary-label">Tiempo Total:</span> ${timeTotal}
                  </div>
                  <div class="summary-item">
                      <span class="summary-label">Percentil:</span> ${Math.round(percentageScore)}%
                  </div>
              </div>
          </div>

          <div class="info-section">
              <div class="info-grid">
                  <div class="info-item">
                      <h3>Información Candidato</h3>
                      <div class="info-value"><span class="info-label">Id:</span> ${candidate.id}</div>
                      <div class="info-value"><span class="info-label">Nombre:</span> ${candidate.name} ${candidate.lastname || ''}</div>
                      ${candidate.email ? `<div class="info-value"><span class="info-label">Email:</span> ${candidate.email}</div>` : ''}
                  </div>
                  <div class="info-item">
                      <h3>Información Prueba</h3>
                      <div class="info-value"><span class="info-label">Nombre/ID:</span> ${candidate.test_name || 'Team Eureka 3it'}</div>
                      <div class="info-value"><span class="info-label">Descripción:</span> ${candidate.test_description || 'Prueba técnica diseñada para los postulantes al Team Eureka.'}</div>
                  </div>
                  <div class="info-item">
                      <h3>Información Instancia</h3>
                      <div class="info-value"><span class="info-label">Tiempo Límite:</span> ${candidate.time_limit_minutes || 120} minutos</div>
                      <div class="info-value"><span class="info-label">Tipo:</span> TST</div>
                  </div>
              </div>
          </div>

          <div class="categories-section">
              <h2 class="section-title">Resumen por Categoría</h2>
              <div class="categories-header">
                  <span>Descripción</span>
                  <span>Resultado</span>
                  <span>Puntaje (Valor)</span>
              </div>
              ${Object.values(categoryStats).map(category => `
                  <div class="category-item">
                      <div>
                          <div class="category-name">${category.name}</div>
                          <div class="category-result">Resultado Categoría:</div>
                      </div>
                      <div></div>
                      <div class="category-score-box">${category.totalScore}/${category.maxScore}</div>
                  </div>
              `).join('')}
          </div>

          <div class="legend-section">
              <div class="legend-item">
                  <div class="legend-color legend-green"></div>
                  <span>Puntaje > 66%</span>
              </div>
              <div class="legend-item">
                  <div class="legend-color legend-orange"></div>
                  <span>33% < Puntaje < 66%</span>
              </div>
              <div class="legend-item">
                  <div class="legend-color legend-red"></div>
                  <span>Puntaje < 33%</span>
              </div>
          </div>

          <div class="questions-section">
              <h2 class="section-title">Resumen por Pregunta</h2>
              <div class="questions-header">
                  <span>Descripción</span>
                  <span>Categoría</span>
                  <span>Nivel de Dificultad</span>
                  <span>Puntaje</span>
              </div>
              ${answers.map((answer, i) => `
                  <div class="question-item">
                      <div class="question-header-row">
                          <div class="question-title">${i+1}.- ${answer.title || 'Pregunta sin título'}</div>
                          <div class="question-category">${answer.category_name || 'Programación'}</div>
                          <div class="question-difficulty">${answer.difficulty || 'Medio'}</div>
                          <div class="question-score">${answer.score || 0} de ${answer.question_max_score || 10}</div>
                      </div>
                      ${answer.description ? `<div class="question-description"><strong>Descripción:</strong><br>${answer.description}</div>` : ''}
                      ${answer.answer_text ? `<div class="candidate-answer"><strong>Respuesta del candidato:</strong><br><pre style="background: #f8f8f8; padding: 15px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 11px; line-height: 1.4; overflow-wrap: break-word; white-space: pre-wrap;">${answer.answer_text}</pre></div>` : '<div class="no-answer" style="color: #666; font-style: italic; margin-top: 15px;">No respondida</div>'}
                  </div>
              `).join('')}
          </div>

          <div class="bottom-legend">
              <div class="bottom-legend-item">
                  <div class="bottom-legend-color legend-gray"></div>
                  <span>No Respondido</span>
              </div>
              <div class="bottom-legend-item">
                  <div class="bottom-legend-color legend-yellow"></div>
                  <span>Parcialmente Correcto</span>
              </div>
              <div class="bottom-legend-item">
                  <div class="bottom-legend-color legend-red"></div>
                  <span>Incorrecto</span>
              </div>
              <div class="bottom-legend-item">
                  <div class="bottom-legend-color legend-green"></div>
                  <span>Correcto</span>
              </div>
          </div>
      </div>
  </body>
  </html>`;
      };

      const htmlContent = generateProfessionalHTML(candidate, answers);

      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setContent(htmlContent);
      const pdfBuffer = await page.pdf({ format: 'A4' });
      // GUARDAR PDF DIRECTO DEL PUPPETEER (SIN HTTP)
      // GUARDAR PDF DIRECTO DEL PUPPETEER (SIN HTTP)
      const testPath = path.join(process.cwd(), 'test_direct.pdf');
      fs.writeFileSync(testPath, pdfBuffer);
      console.log('PDF directo guardado en:', testPath);

      await browser.close();

      const fileName = `Reporte_${candidate.name}_${new Date().toISOString().split('T')[0]}.pdf`;

  // DEBUGGING: Verificar el buffer
  console.log('PDF Buffer length:', pdfBuffer.length);
  console.log('PDF Buffer type:', typeof pdfBuffer);
  console.log('PDF Buffer first bytes:', pdfBuffer.slice(0, 10));

  // HEADERS ALTERNATIVOS
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Length', pdfBuffer.length);
  res.setHeader('Cache-Control', 'no-cache');

  res.end(pdfBuffer, 'binary');

    } catch (error) {
      console.error('Error generando reporte PDF:', error);
      res.status(500).json({ error: 'Error al generar el reporte PDF', details: error.message });
    }
  });

  // Endpoint temporal para investigar casos de prueba de las preguntas
  router.get('/debug/test-cases/:questionId', (req, res) => {
    try {
      const questionId = parseInt(req.params.questionId);
      
      // Verificar la pregunta
      const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);
      
      // Verificar casos de prueba
      const testCases = db.prepare('SELECT * FROM test_cases WHERE question_id = ?').all(questionId);
      
      res.json({
        question,
        testCases,
        summary: {
          question_exists: !!question,
          has_test_cases: testCases.length > 0,
          test_cases_count: testCases.length
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Endpoint temporal para investigar datos del candidato 24
  router.get('/debug/candidate/:id', (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);
      
      // 1. Datos del candidato
      const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);
      
      // 2. Sesiones del candidato
      const sessions = db.prepare('SELECT * FROM test_sessions WHERE candidate_id = ?').all(candidateId);
      
      // 3. Respuestas del candidato (para todas las sesiones)
      const answers = db.prepare(`
        SELECT a.*, q.title, q.description, q.max_score as question_max_score
        FROM answers a 
        LEFT JOIN questions q ON a.question_id = q.id
        WHERE a.session_id IN (SELECT id FROM test_sessions WHERE candidate_id = ?)
      `).all(candidateId);

      // 4. Verificar si hay columna score en answers
      const answersSchema = db.prepare("PRAGMA table_info(answers)").all();
      
      res.json({
        candidate,
        sessions,
        answers,
        answersSchema,
        summary: {
          candidate_exists: !!candidate,
          sessions_count: sessions.length,
          answers_count: answers.length,
          has_score_column: answersSchema.some(col => col.name === 'score')
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message, stack: error.stack });
    }
  });

  // Función para evaluar una respuesta individual
async function evaluateAnswer(answer) {
  console.log(`[DEBUG-EVAL] Evaluando respuesta ID: ${answer.id}`);
  
  try {
    const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(answer.question_id);
    if (!question) {
      console.error(`[DEBUG-EVAL] Pregunta no encontrada para la respuesta ID: ${answer.id}`);
      return { success: false, error: 'Pregunta no encontrada' };
    }

    let testCases = [];
    try {
      testCases = db.prepare('SELECT * FROM test_cases WHERE question_id = ?').all(question.id);
    } catch (e) {
      console.error(`[DEBUG-EVAL] Error al analizar test cases para pregunta ${question.id}:`, e);
      testCases = [];
    }

    console.log(`[DEBUG-EVAL] Test cases encontrados: ${testCases.length}`);
    
    let passedTests = 0;
    let totalScore = 0;
    let maxPossibleScore = 0;
    const results = [];

    // Si no hay test cases, asignar puntaje máximo si hay respuesta
    if (testCases.length === 0) {
      console.log(`[DEBUG-EVAL] Sin test cases, verificando respuesta`);
      const hasAnswer = answer.answer_text && answer.answer_text.trim() !== '';
      const score = hasAnswer ? (question.max_score || 1) : 0;
      
      db.prepare(`
        UPDATE answers 
        SET score = ?, 
            percentage_score = ?,
            test_cases_passed = ?,
            test_cases_total = ?,
            updated_at = ?
        WHERE id = ?
      `).run(
        score,
        score * 100 / (question.max_score || 1),
        hasAnswer ? 1 : 0,
        1,
        new Date().toISOString(),
        answer.id
      );
      
      return { success: true, score, maxScore: question.max_score || 1 };
    }

    // Evaluar cada test case
    for (const testCase of testCases) {
      console.log(`[DEBUG-EVAL] Procesando test case: ${testCase.input} -> ${testCase.expected_output}`);
      
      try {
        const execution = await executeCode(answer.answer_text || answer.answer || '', testCase, question.language);
        const isCorrect = execution.success && 
                         execution.output.trim() === testCase.expected_output.trim();
        
        if (isCorrect) {
          passedTests++;
          totalScore += testCase.score || 1;
        } else if (execution.success) {


          // Aplicar crédito parcial universal
          const partialCredit = calculateUniversalPartialCredit(
            answer.answer, 
            testCase, 
            question.language
          );
          totalScore += (testCase.score || 1) * (partialCredit / 100);
        }
        
        maxPossibleScore += testCase.score || 1;
        
        results.push({
          input: testCase.input,
          expected: testCase.expected_output,
          output: execution.output,
          success: isCorrect,
          error: execution.error,
          executionTime: execution.executionTime
        });
        
      } catch (error) {
        console.error(`[DEBUG-EVAL] Error evaluando test case:`, error);
        results.push({
          input: testCase.input,
          expected: testCase.expected_output,
          output: '',
          success: false,
          error: error.message,
          executionTime: 0
        });
      }
    }

    // Calcular puntaje final
    const finalScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * (question.max_score || 1) : 0;
    const percentageScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    
    console.log(`[DEBUG-EVAL] Resultados para respuesta ${answer.id}:`);
    console.log(`- Test cases pasados: ${passedTests}/${testCases.length}`);
    console.log(`- Puntaje bruto: ${totalScore}/${maxPossibleScore}`);
    console.log(`- Puntaje final: ${finalScore}/${question.max_score}`);
    console.log(`- Porcentaje: ${percentageScore.toFixed(2)}%`);

    // Actualizar la respuesta en la base de datos
    db.prepare(`
      UPDATE answers 
      SET score = ?,
          percentage_score = ?,
          test_cases_passed = ?,
          test_cases_total = ?,
          last_modified_at = ?
      WHERE id = ?
    `).run(
      finalScore,
      percentageScore,
      passedTests,
      testCases.length,
      JSON.stringify({ results }),
      new Date().toISOString(),
      answer.id
    );

    return { 
      success: true, 
      score: finalScore, 
      maxScore: question.max_score || 1,
      passedTests,
      totalTests: testCases.length,
      percentage: percentageScore
    };
    
  } catch (error) {
    console.error(`[DEBUG-EVAL] Error en evaluateAnswer:`, error);
    return { 
      success: false, 
      error: error.message,
      answerId: answer.id
    };
  }
}

// Endpoint para re-evaluar respuestas (incluso las ya evaluadas)  
router.post('/re-evaluate-answers/:candidateId', async (req, res) => {
    try {
      const candidateId = parseInt(req.params.candidateId);
      
      // Resetear scores primero
      db.prepare(`
        UPDATE answers 
        SET score = 0, percentage_score = 0, test_cases_passed = 0, test_cases_total = 0
        WHERE session_id IN (SELECT id FROM test_sessions WHERE candidate_id = ?)
      `).run(candidateId);
      
      // Ahora evaluar con el nuevo sistema
      const fetchResponse = await fetch(`http://localhost:4000/api/candidates/evaluate-answers/${candidateId}`, {
        method: 'POST'
      });
      const result = await fetchResponse.json();
      
      const responseData = {
        message: 'Re-evaluación completada',
        evaluatedCount: result.evaluatedCount || 0,
        sessionId: result.sessionId,
        totalScore: result.totalScore || 0,
        maxPossibleScore: result.maxPossibleScore || 0,
        percentage: result.percentage || 0,
        results: result.results || []
      };
      
      console.log(`[DEBUG-EVAL] === EVALUACIÓN FINALIZADA ===`);
      console.log(`[DEBUG-EVAL] Respuestas evaluadas: ${responseData.evaluatedCount}`);
      console.log(`[DEBUG-EVAL] Puntaje final: ${responseData.totalScore}/${responseData.maxPossibleScore} (${responseData.percentage}%)`);
      
      res.json(responseData);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Endpoint para evaluar todas las respuestas sin calificar
router.post('/evaluate-answers/:candidateId', async (req, res) => {
    try {
      const candidateId = parseInt(req.params.candidateId);
      
      // Verificar si el candidato existe
      const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);
      if (!candidate) {
        return res.status(404).json({ error: 'Candidato no encontrado' });
      }
      
      console.log(`[DEBUG-EVAL] === INICIANDO EVALUACIÓN ===`);
      console.log(`[DEBUG-EVAL] Candidato: ${candidate.name} ${candidate.lastname} (ID: ${candidateId})`);
      
      // Obtener todas las respuestas del candidato (incluyendo las ya evaluadas)
        const answers = db.prepare(`
        SELECT a.*, q.language, q.max_score, q.type, ts.id as session_id
        FROM answers a
        JOIN questions q ON a.question_id = q.id
        JOIN test_sessions ts ON a.session_id = ts.id
        WHERE ts.candidate_id = ?
      `).all(candidateId);
      
      console.log(`[DEBUG-EVAL] Respuestas encontradas: ${answers.length}`);

      if (answers.length === 0) {
        return res.json({ 
          success: true,
          message: 'No hay respuestas para evaluar', 
          evaluatedCount: 0,
          candidateId,
          sessionId: null
        });
      }

      const sessionId = answers[0].session_id;
      let evaluatedCount = 0;
      let totalScore = 0;
      let maxPossibleScore = 0;
      const results = [];
      
      // Obtener el evaluador una sola vez para optimización
      const LanguageEvaluators = (await import('../evaluators/LanguageEvaluators.js')).default;
      
      // Función para ejecutar código
      const executeCode = async (code, testCase, language) => {
        console.log(`[DEBUG-EXEC] Llamando executeCode para lenguaje: ${language}`);
        console.log(`[DEBUG-EXEC] Código (primeros 100 caracteres): ${code ? code.substring(0, 100) : 'null'}`);
        console.log(`[DEBUG-EXEC] Test case: ${JSON.stringify(testCase)}`);
        
        try {
          const evaluator = LanguageEvaluators.getEvaluator(language);
          console.log(`[DEBUG-EXEC] Evaluador obtenido: ${evaluator.constructor.name}`);
          
          const result = await evaluator.evaluate(code, testCase, language);
          console.log(`[DEBUG-EXEC] Resultado de evaluate: ${JSON.stringify({
            success: result.success,
            output: result.output,
            error: result.error,
            executionTime: result.executionTime
          })}`);
          
          return result;
        } catch (error) {
          console.error(`[DEBUG-EXEC] Error en executeCode:`, error);
          return {
            success: false,
            output: '',
            error: error.message,
            executionTime: 0
          };
        }
      };

      // Evaluar cada respuesta
      for (const answer of answers) {
        try {
          console.log(`[DEBUG-EVAL] Procesando respuesta ID: ${answer.id}`);
          
          // Evaluar la respuesta
          const evaluationResult = await evaluateAnswer(answer);
          
          if (evaluationResult.success) {
            evaluatedCount++;
            totalScore += evaluationResult.score || 0;
            maxPossibleScore += evaluationResult.maxScore || 0;
            
            results.push({
              answerId: answer.id,
              questionId: answer.question_id,
              score: evaluationResult.score,
              maxScore: evaluationResult.maxScore,
              passedTests: evaluationResult.passedTests,
              totalTests: evaluationResult.totalTests,
              percentage: evaluationResult.percentage
            });
            
            console.log(`[DEBUG-EVAL] Respuesta ${answer.id} evaluada: ${evaluationResult.score}/${evaluationResult.maxScore} (${evaluationResult.percentage}%)`);
          } else {
            console.error(`[DEBUG-EVAL] Error evaluando respuesta ${answer.id}:`, evaluationResult.error);
            results.push({
              answerId: answer.id,
              questionId: answer.question_id,
              error: evaluationResult.error,
              success: false
            });
          }
        } catch (error) {
          console.error(`[DEBUG-EVAL] Excepción inesperada al evaluar respuesta ${answer.id}:`, error);
          results.push({
            answerId: answer.id,
            questionId: answer.question_id,
            error: error.message,
            stack: error.stack,
            success: false
          });
        }
      }
      
      // Calcular porcentaje total
      const percentageScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
      
      console.log(`[DEBUG-EVAL] === EVALUACIÓN FINALIZADA ===`);
      console.log(`[DEBUG-EVAL] Respuestas evaluadas: ${evaluatedCount}/${answers.length}`);
      console.log(`[DEBUG-EVAL] Puntaje total: ${totalScore.toFixed(2)}/${maxPossibleScore.toFixed(2)} (${percentageScore.toFixed(2)}%)`);
      
      // Actualizar el puntaje total de la sesión
      if (sessionId) {
          db.prepare(`
          UPDATE test_sessions 
          SET percentage_score = ?,
              finished_at = ?
          WHERE id = ?
        `).run(
          percentageScore,
          new Date().toISOString(),
          sessionId
        );
      }
      
      // Devolver resultados
      res.json({
        success: true,
        message: 'Evaluación completada exitosamente',
        evaluatedCount,
        totalAnswers: answers.length,
        totalScore: parseFloat(totalScore.toFixed(2)),
        maxPossibleScore: parseFloat(maxPossibleScore.toFixed(2)),
        percentage: parseFloat(percentageScore.toFixed(2)),
        sessionId,
        candidateId,
        results
      });
      
    } catch (error) {
      console.error('[DEBUG-EVAL] Error en evaluate-answers:', error);
      res.status(500).json({
        success: false,
        error: 'Error al evaluar respuestas',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

// Función universal de crédito parcial para todos los lenguajes
const calculateUniversalPartialCredit = (code, testCase, language) => {
  const codeLength = code ? code.trim().length : 0;
  if (codeLength < 10) return 0;
  
  let score = 0;
  
  // 40% por tener código sustancial
  if (codeLength >= 30) score += 40;
  
  // 30% por estructura básica según tipo
  if (language === 'sql' && /select.*from/i.test(code)) score += 30;
  else if (/for|while|if|function|def/i.test(code)) score += 30;
  
  // 20% por intentar resolver el problema
  if (codeLength >= 50) score += 20;
  
  return Math.min(score, 70); // Máximo 70% por crédito parcial
};

// Función para evaluar respuestas de un candidato
const evaluateCandidateAnswers = async (candidateId) => {
  try {
    console.log(`[DEBUG-EVAL] === INICIANDO EVALUACIÓN PARA CANDIDATO ${candidateId} ===`);
    const results = [];
    
    // Obtener respuestas del candidato
    const answers = db.prepare(`
      SELECT a.*, q.language, q.max_score, q.type
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      WHERE a.session_id IN (SELECT id FROM test_sessions WHERE candidate_id = ?)
    `).all(candidateId);
    
    console.log(`[DEBUG-EVAL] Respuestas encontradas: ${answers.length}`);
    
    if (answers.length === 0) {
      console.log('[DEBUG-EVAL] No hay respuestas para evaluar');
      return {
        success: true,
        message: 'No hay respuestas para evaluar',
        evaluatedCount: 0,
        results: []
      };
    }
    
    // Evaluar cada respuesta
    console.log(`[DEBUG-EVAL] === PROCESANDO ${answers.length} RESPUESTAS ===`);
    let evaluatedCount = 0;
    
    for (const answer of answers) {
      console.log(`\n[DEBUG-EVAL] --- Respuesta ID: ${answer.id} ---`);
      console.log(`[DEBUG-EVAL] Tipo: ${answer.type}, Lenguaje: ${answer.language}, Pregunta ID: ${answer.question_id}`);
      const codeForLog = (answer.answer_text || answer.answer || '');
      console.log(`[DEBUG-EVAL] Código (inicio): ${codeForLog ? codeForLog.substring(0, 100) : 'Sin respuesta'}...`);
      
      try {
        // Obtener casos de prueba para esta pregunta
        console.log(`[DEBUG-EVAL] Buscando casos de prueba para pregunta ID: ${answer.question_id}`);
        const testCases = db.prepare('SELECT * FROM test_cases WHERE question_id = ?').all(answer.question_id);
        console.log(`[DEBUG-EVAL] Casos de prueba encontrados: ${testCases.length}`);
        
        if (testCases.length === 0) {
          // Sin casos de prueba, asignar puntaje completo (para preguntas SQL/texto)
          console.log(`[DEBUG-EVAL] No hay casos de prueba, asignando puntaje completo`);
          const score = answer.max_score || 1;
          const percentage = 100;
          
          console.log(`[DEBUG-EVAL] Actualizando BD - ID: ${answer.id}, Score: ${score}, Porcentaje: ${percentage}%`);
          
          db.prepare(`
            UPDATE answers 
            SET score = ?, percentage_score = ?, test_cases_passed = 1, test_cases_total = 1
            WHERE id = ?`).run(score, percentage, passed, total, timestamp, answerId)
          
          evaluatedCount++;
          continue;
        }

          // Evaluar código contra casos de prueba
          if (answer.type === 'programming' || answer.type === 'sql') {
            console.log(`[DEBUG-EVAL] Iniciando evaluación de ${testCases.length} casos de prueba`);
            let passedCases = 0;
            let totalScore = 0;

            for (let i = 0; i < testCases.length; i++) {
              const testCase = testCases[i];
              console.log(`\n[DEBUG-TEST] --- Caso de prueba ${i+1}/${testCases.length} ---`);
              console.log(`[DEBUG-TEST] ID: ${testCase.id}, Peso: ${testCase.weight || 1}`);
              console.log(`[DEBUG-TEST] Entrada: ${testCase.input_data}`);
              console.log(`[DEBUG-TEST] Salida esperada: ${testCase.expected_output}`);
              
              const execution = await executeCode(answer.answer_text || answer.answer || '', testCase, answer.language);
              
              const passed = execution.success && 
                           execution.output && 
                           execution.output.trim() === testCase.expected_output.trim();
                           
              console.log(`[DEBUG-TEST] Resultado: ${passed ? 'APROBADO' : 'FALLIDO'}`);
              console.log(`[DEBUG-TEST] Salida obtenida: '${execution.output}'`);
              if (execution.error) {
                console.log(`[DEBUG-TEST] Error en ejecución: ${execution.error}`);
              }
              
              if (passed) {
                const caseScore = (answer.max_score / testCases.length) * (testCase.weight || 1);
                console.log(`[DEBUG-TEST] ✅ Caso APROBADO. Puntos: ${caseScore}`);
                passedCases++;
                totalScore += caseScore;
              } else {
                console.log(`[DEBUG-TEST] ❌ Caso FALLIDO. Aplicando crédito parcial...`);
                const partialCredit = calculateUniversalPartialCredit(answer.answer, testCase, answer.language);
                const caseScore = (answer.max_score / testCases.length) * (partialCredit / 100) * (testCase.weight || 1);
                console.log(`[DEBUG-TEST] Crédito parcial: ${partialCredit}%, Puntos: ${caseScore}`);
                totalScore += caseScore;
              }
              
              console.log(`[DEBUG-TEST] Puntaje acumulado: ${totalScore.toFixed(2)}/${answer.max_score}`);
          }

            const finalScore = Math.min(Math.round(totalScore * 100) / 100, answer.max_score);
            const percentage = Math.round((passedCases / testCases.length) * 100);
            
            console.log(`\n[DEBUG-EVAL] === RESULTADO FINAL ===`);
            console.log(`[DEBUG-EVAL] Respuesta ID: ${answer.id}`);
            console.log(`[DEBUG-EVAL] Casos pasados: ${passedCases}/${testCases.length}`);
            console.log(`[DEBUG-EVAL] Puntaje final: ${finalScore}/${answer.max_score}`);
            console.log(`[DEBUG-EVAL] Porcentaje: ${percentage}%`);
            
            console.log(`[DEBUG-EVAL] Actualizando base de datos...`);
            db.prepare(`
              UPDATE answers 
              SET score = ?, 
                  percentage_score = ?, 
                  test_cases_passed = ?, 
                  test_cases_total = ?,
                  last_modified_at = datetime('now')
              WHERE id = ?
            `).run(finalScore, percentage, passedCases, testCases.length, answer.id);

            results.push({ 
              questionId: answer.question_id, 
              score: finalScore, 
              passedCases, 
              totalCases: testCases.length,
              method: 'automated_evaluation',
              timestamp: new Date().toISOString()
            });
            
            console.log(`[DEBUG-EVAL] Actualización completada para respuesta ID: ${answer.id}`);
            }
          
              evaluatedCount++;
            } catch (error) {
              console.error(`Error evaluando pregunta ${answer.question_id}:`, error);
              results.push({ 
                questionId: answer.question_id, 
                error: error.message,
                method: 'error'
              });
            }
          }


      // Actualizar puntaje total de la sesión
      const sessionId = answers[0]?.session_id;
      console.log(`\n[DEBUG-SESSION] Actualizando puntaje de sesión ID: ${sessionId}`);
      
      const totalScores = db.prepare(`
        SELECT 
          COALESCE(SUM(score), 0) as total_score, 
          COALESCE(SUM(max_score), 0) as max_possible_score,
          COUNT(*) as total_answers
        FROM answers 
        WHERE session_id = ?
      `).get(sessionId);
      
      console.log(`[DEBUG-SESSION] Puntaje total: ${totalScores.total_score}/${totalScores.max_possible_score}`);
      console.log(`[DEBUG-SESSION] Respuestas totales: ${totalScores.total_answers}`);
      
      const percentage_score = totalScores.max_possible_score > 0 
        ? Math.round((totalScores.total_score / totalScores.max_possible_score) * 10000) / 100
        : 0;
        
      console.log(`[DEBUG-SESSION] Porcentaje final: ${percentage_score}%`);

      console.log(`[DEBUG-SESSION] Actualizando test_sessions...`);
      const updateResult = db.prepare(`
        UPDATE test_sessions 
        SET
          total_score = ?,
          max_possible_score = ?,
          percentage_score = ?
        WHERE id = ?
      `).run(
        totalScores.total_score, 
        totalScores.max_possible_score, 
        percentage_score, 
        sessionId
      );
      
      console.log(`[DEBUG-SESSION] Sesión actualizada. Filas afectadas: ${updateResult.changes}`);

      return {
        success: true,
        candidateId,
        evaluated: evaluatedCount,
        totalScore: totalScores.total_score,
        maxPossibleScore: totalScores.max_possible_score,
        percentageScore: Math.round(percentage_score * 100) / 100,
        results
      };
    } catch (err) {
      console.error('Error evaluando respuestas:', err);
      return {
        success: false,
        error: err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      };
    }
};

const updateSessionScore = (sessionId) => {
  try {
    const sessionData = db.prepare(`
      SELECT 
        COALESCE(SUM(score), 0) as total_score,
        COALESCE(SUM(max_score), 0) as max_possible_score
      FROM answers 
      WHERE session_id = ?
    `).get(sessionId);

    if (sessionData) {
      const percentage = sessionData.max_possible_score > 0 
        ? Math.round((sessionData.total_score / sessionData.max_possible_score) * 100) 
        : 0;
      
      const result = db.prepare(`
        UPDATE test_sessions 
        SET score = ?, percentage_score = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(sessionData.total_score, percentage, sessionId);
      
      console.log(`[DEBUG-EVAL] Sesión ${sessionId} actualizada: ${sessionData.total_score}/${sessionData.max_possible_score} (${percentage}%)`);
      
      return {
        success: true,
        sessionId,
        score: sessionData.total_score,
        maxScore: sessionData.max_possible_score,
        percentage
      };
    }
    
    return {
      success: false,
      error: 'No se encontraron datos para la sesión',
      sessionId
    };
  } catch (error) {
    console.error(`[DEBUG-EVAL] Error actualizando puntaje de sesión ${sessionId}:`, error);
    return {
      success: false,
      error: error.message,
      sessionId,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    };
  }
};

// Endpoint para evaluar respuestas de un candidato
router.post('/evaluate-candidate/:candidateId', async (req, res) => {
  try {
    const candidateId = parseInt(req.params.candidateId);
    
    // Obtener la sesión activa del candidato
    const session = db.prepare(`
      SELECT * FROM test_sessions 
      WHERE candidate_id = ? AND status = 'completed'
      ORDER BY created_at DESC 
      LIMIT 1
    `).get(candidateId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'No se encontró una sesión completada para este candidato'
      });
    }
    
    console.log(`[DEBUG-ENDPOINT] Iniciando evaluación para candidato ${candidateId}, sesión ${session.id}`);
    
    // Evaluar respuestas
    const result = await evaluateCandidateAnswers(candidateId);
    
    if (!result.success) {
      console.error(`[DEBUG-ENDPOINT] Error en evaluateCandidateAnswers: ${result.error}`);
      return res.status(500).json({
        success: false,
        error: 'Error al evaluar respuestas',
        details: result.error,
        ...(process.env.NODE_ENV === 'development' && { stack: result.stack })
      });
    }
    
    // Actualizar puntaje de la sesión
    const updateResult = updateSessionScore(session.id);
    
    if (!updateResult.success) {
      console.error(`[DEBUG-ENDPOINT] Error actualizando puntaje de sesión:`, updateResult.error);
      // Continuamos a pesar del error, ya que la evaluación se completó
    }
    
    console.log(`[DEBUG-ENDPOINT] Evaluación completada para candidato ${candidateId}`);
    
    res.json({
      success: true,
      message: 'Evaluación completada exitosamente',
      sessionId: session.id,
      candidateId,
      sessionUpdate: updateResult,
      ...result
    });
    
  } catch (error) {
    console.error('[EVAL-ERROR] Error en evaluación de candidato:', error);
    res.status(500).json({
      success: false,
      error: 'Error al evaluar respuestas',
      details: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
  });

// Endpoint para ver todos los lenguajes usados en el sistema
  router.get('/debug/languages', (req, res) => {
    try {
      // Ver qué lenguajes están en las preguntas
      const languagesInQuestions = db.prepare(`
        SELECT DISTINCT language, COUNT(*) as count
        FROM questions 
        WHERE language IS NOT NULL
        GROUP BY language
      `).all();

      // Ver los tipos de preguntas
      const questionTypes = db.prepare(`
        SELECT DISTINCT type, COUNT(*) as count
        FROM questions 
        WHERE type IS NOT NULL
        GROUP BY type
      `).all();

      // Ver las preguntas específicas de Romina
      const rominaQuestions = db.prepare(`
        SELECT q.id, q.title, q.language, q.type, q.max_score
        FROM questions q
        JOIN answers a ON q.id = a.question_id
        JOIN test_sessions ts ON a.session_id = ts.id
        WHERE ts.candidate_id = 46
        ORDER BY q.id
      `).all();

      res.json({
        languagesInQuestions,
        questionTypes,
        rominaQuestions,
        summary: {
          total_languages: languagesInQuestions.length,
          total_types: questionTypes.length,
          romina_questions_count: rominaQuestions.length
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message, stack: error.stack });
    }
  });

  // Endpoint temporal para verificar esquema de BD
  router.get('/debug/schema', (req, res) => {
    try {
      // Verificar columnas de test_sessions
      const testSessionsSchema = db.prepare("PRAGMA table_info(test_sessions)").all();

      // Verificar columnas de answers
      const answersSchema = db.prepare("PRAGMA table_info(answers)").all();

      res.json({
        test_sessions: testSessionsSchema,
        answers: answersSchema
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Endpoint temporal para arreglar language de preguntas SQL
router.post('/fix-sql-language', (req, res) => {
  try {
    // Cambiar language de las preguntas SQL
    const result = db.prepare(`
      UPDATE questions 
      SET language = 'sql' 
      WHERE type = 'sql'
    `).run();
    
    res.json({ 
      message: 'Language actualizado para preguntas SQL',
      changesCount: result.changes 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Exportar funciones para uso en otros módulos
export { 
  evaluateAnswer,
  evaluateCandidateAnswers,
  updateSessionScore,
  executeCode
};

export default router;