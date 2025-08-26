import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/init.js';
import crypto from 'crypto';
import puppeteer from 'puppeteer';

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
             AVG(CASE WHEN s.status = 'completed' THEN s.percentage_score END) as avg_score
      FROM candidates c
      LEFT JOIN test_sessions s ON c.id = s.candidate_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `;

    const candidates = db.prepare(candidatesQuery).all();
    
    // Format the response
    const candidatesWithStats = candidates.map(candidate => ({
      ...candidate,
      avg_score: candidate.avg_score ? Math.round(candidate.avg_score * 100) / 100 : null
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

    // Si tiene test_id, crear también la sesión correspondiente
    if (test_id) {
      const test = db.prepare('SELECT * FROM tests WHERE id = ?').get(test_id);
      
      if (test) {
        const insertSessionQuery = `
          INSERT INTO test_sessions (candidate_id, test_id, token, time_limit_minutes, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        const sessionValues = [
          result.lastInsertRowid,
          test_id,
          sessionToken,
          test.time_limit || 60,
          'pending',
          timestamp
        ];
        
        try {
          db.prepare(insertSessionQuery).run(...sessionValues);
          console.log('Sesión creada exitosamente para candidato:', result.lastInsertRowid);
        } catch (error) {
          console.error('Error creando sesión:', error);
        }
      }
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

// Invite candidate to test
router.post('/:candidateId/invite', (req, res) => {
  try {
    const candidateId = parseInt(req.params.candidateId);
    const { testId, customMessage } = req.body;

    if (!testId) {
      return res.status(400).json({ error: 'ID de prueba requerido' });
    }

    // Check if candidate exists
    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);
    
    if (!candidate) {
      return res.status(404).json({ error: 'Candidato no encontrado' });
    }

    // Check if test exists
    const test = db.prepare('SELECT * FROM tests WHERE id = ?').get(parseInt(testId));
    
    if (!test) {
      return res.status(404).json({ error: 'Prueba no encontrada' });
    }

    // Check if session already exists for this candidate and test
    const existingSession = db.prepare(`
      SELECT * FROM test_sessions 
      WHERE candidate_id = ? AND test_id = ? AND status != 'cancelled'
    `).get(candidateId, parseInt(testId));
    
    if (existingSession) {
      return res.status(400).json({ 
        error: 'El candidato ya tiene una sesión activa para esta prueba',
        sessionId: existingSession.id,
        token: existingSession.token
      });
    }

    // Create new test session
    const token = uuidv4();
    const timestamp = new Date().toISOString();
    
    const insertSessionQuery = `
      INSERT INTO test_sessions (candidate_id, test_id, token, time_limit_minutes, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const sessionValues = [
      candidateId,
      parseInt(testId),
      token,
      test.time_limit || 60,
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
      // 1. Primero obtener todas las sesiones del candidato
      const sessions = db.prepare('SELECT id FROM test_sessions WHERE candidate_id = ?').all(candidateId);
      
      // 2. Eliminar todas las respuestas de esas sesiones
      for (const session of sessions) {
        db.prepare('DELETE FROM answers WHERE session_id = ?').run(session.id);
      }
      
      // 3. Luego eliminar las sesiones
      db.prepare('DELETE FROM test_sessions WHERE candidate_id = ?').run(candidateId);
      
      // 4. Finalmente eliminar el candidato
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
    
    if (isNaN(candidateId)) {
      return res.status(400).json({ error: 'ID de candidato no válido' });
    }

    // Get candidate data with test sessions
    const candidateQuery = `
      SELECT c.*, t.name as test_name, t.description as test_description,
             ts.id as session_id, ts.status as session_status, ts.percentage_score,
             ts.created_at as session_start, ts.completed_at as session_end,
             ts.time_spent_seconds
      FROM candidates c
      LEFT JOIN test_sessions ts ON c.id = ts.candidate_id
      LEFT JOIN tests t ON ts.test_id = t.id
      WHERE c.id = ? AND ts.status = 'completed'
      ORDER BY ts.completed_at DESC
      LIMIT 1
    `;

    const candidate = db.prepare(candidateQuery).get(candidateId);
    
    if (!candidate) {
      return res.status(404).json({ error: 'Candidato o sesión completada no encontrada' });
    }

    // Get detailed answers for the session
    const answersQuery = `
      SELECT a.*, q.title as question_title, q.description as question_description,
             q.type as question_type, q.max_score, q.difficulty_level,
             q.category_id, cat.name as category_name
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      LEFT JOIN categories cat ON q.category_id = cat.id
      WHERE a.session_id = ?
      ORDER BY q.order_index
    `;

    const answers = db.prepare(answersQuery).all(candidate.session_id);

    // Calculate time spent
    const timeSpentMinutes = Math.floor((candidate.time_spent_seconds || 0) / 60);
    const timeSpentSeconds = (candidate.time_spent_seconds || 0) % 60;
    
    // Generate PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Create HTML content with 3IT branding
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: Arial, sans-serif;
            line-height: 1.4;
            color: #333;
            background: white;
          }
          
          .header {
            background: #005AEE;
            height: 60px;
            display: flex;
            align-items: center;
            padding: 0 30px;
            margin-bottom: 30px;
          }
          
          .logo {
            background: #000026;
            color: white;
            width: 50px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            margin-right: 20px;
          }
          
          .header-title {
            color: white;
            font-size: 28px;
            font-weight: bold;
          }
          
          .candidate-name {
            color: #000026;
            font-size: 18px;
            margin-bottom: 20px;
            padding-left: 30px;
          }
          
          .main-info {
            display: flex;
            justify-content: space-between;
            padding: 0 30px;
            margin-bottom: 30px;
          }
          
          .info-left {
            flex: 1;
          }
          
          .info-right {
            text-align: right;
          }
          
          .dates {
            margin-bottom: 15px;
            font-size: 14px;
          }
          
          .score-section {
            text-align: right;
          }
          
          .total-score {
            font-size: 24px;
            font-weight: bold;
            color: #000026;
          }
          
          .time-info {
            margin: 15px 0;
            font-size: 14px;
          }
          
          .percentile {
            font-weight: bold;
            color: #005AEE;
          }
          
          .info-boxes {
            display: flex;
            gap: 20px;
            padding: 0 30px;
            margin-bottom: 30px;
          }
          
          .info-box {
            flex: 1;
            background: #F2F3F3;
            padding: 20px;
            border-radius: 8px;
          }
          
          .info-box h3 {
            color: #000026;
            font-size: 16px;
            margin-bottom: 15px;
          }
          
          .info-item {
            margin-bottom: 8px;
            font-size: 14px;
          }
          
          .info-label {
            font-weight: bold;
            color: #333;
          }
          
          .category-summary {
            padding: 0 30px;
            margin-bottom: 30px;
          }
          
          .category-summary h2 {
            color: #000026;
            font-size: 20px;
            margin-bottom: 20px;
          }
          
          .category-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding: 15px;
            background: #F2F3F3;
            border-radius: 8px;
            border-left: 4px solid #005AEE;
          }
          
          .category-name {
            font-weight: bold;
            color: #000026;
          }
          
          .category-score {
            font-weight: bold;
            color: #005AEE;
            font-size: 18px;
          }
          
          .questions-summary {
            padding: 0 30px;
          }
          
          .questions-summary h2 {
            color: #000026;
            font-size: 20px;
            margin-bottom: 20px;
          }
          
          .question-item {
            margin-bottom: 20px;
            padding: 15px;
            background: #F2F3F3;
            border-radius: 8px;
            border-left: 4px solid #2CD5C4;
          }
          
          .question-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
          }
          
          .question-title {
            font-weight: bold;
            color: #000026;
            flex: 1;
          }
          
          .question-score {
            font-weight: bold;
            color: #005AEE;
            margin-left: 20px;
          }
          
          .question-details {
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">3IT</div>
          <div class="header-title">${candidate.test_name || 'Prueba Técnica'}</div>
        </div>
        
        <div class="candidate-name">
          ${candidate.name} ${candidate.lastname || ''}
        </div>
        
        <div class="main-info">
          <div class="info-left">
            <div class="dates">
              <strong>Fecha Inicio:</strong> ${new Date(candidate.session_start).toLocaleString('es-ES')}<br>
              <strong>Fecha Fin:</strong> ${new Date(candidate.session_end).toLocaleString('es-ES')}
            </div>
            <div class="time-info">
              <strong>Tiempo Total:</strong> ${Math.floor(timeSpentMinutes / 60)} Hora ${timeSpentMinutes % 60} Minutos ${timeSpentSeconds} Segundos<br>
              <strong>Percentil:</strong> <span class="percentile">95%</span>
            </div>
          </div>
          <div class="info-right">
            <div class="score-section">
              <div class="total-score">
                Puntaje Total:<br>
                ${Math.round(candidate.percentage_score || 0)}/100
              </div>
            </div>
          </div>
        </div>
        
        <div class="info-boxes">
          <div class="info-box">
            <h3>Información Candidato</h3>
            <div class="info-item">
              <span class="info-label">ID:</span> ${candidate.id}
            </div>
            <div class="info-item">
              <span class="info-label">Nombre:</span> ${candidate.name} ${candidate.lastname || ''}
            </div>
            <div class="info-item">
              <span class="info-label">Email:</span> ${candidate.email}
            </div>
          </div>
          
          <div class="info-box">
            <h3>Información Prueba</h3>
            <div class="info-item">
              <span class="info-label">Nombre/ID:</span> ${candidate.test_name} / ${candidate.test_id}
            </div>
            <div class="info-item">
              <span class="info-label">Descripción:</span> ${candidate.test_description || 'Prueba técnica'}
            </div>
            <div class="info-item">
              <span class="info-label">Estado:</span> ${candidate.session_status}
            </div>
          </div>
          
          <div class="info-box">
            <h3>Información Instancia</h3>
            <div class="info-item">
              <span class="info-label">Límite de Días:</span> 2
            </div>
            <div class="info-item">
              <span class="info-label">Tiempo Límite:</span> 120 minutos
            </div>
            <div class="info-item">
              <span class="info-label">Tipo:</span> TST
            </div>
          </div>
        </div>
        
        <div class="category-summary">
          <h2>Resumen por Categoría</h2>
          ${answers.reduce((acc, answer) => {
            const categoryName = answer.category_name || 'General';
            if (!acc[categoryName]) {
              acc[categoryName] = { total: 0, max: 0 };
            }
            acc[categoryName].total += answer.score || 0;
            acc[categoryName].max += answer.max_score || 0;
            return acc;
          }, {})}
          ${Object.entries(answers.reduce((acc, answer) => {
            const categoryName = answer.category_name || 'General';
            if (!acc[categoryName]) {
              acc[categoryName] = { total: 0, max: 0 };
            }
            acc[categoryName].total += answer.score || 0;
            acc[categoryName].max += answer.max_score || 0;
            return acc;
          }, {})).map(([category, data]) => `
            <div class="category-item">
              <div class="category-name">${category}</div>
              <div class="category-score">${Math.round(data.total)}/${Math.round(data.max)}</div>
            </div>
          `).join('')}
        </div>
        
        <div class="questions-summary">
          <h2>Resumen por Pregunta</h2>
          ${answers.map((answer, index) => `
            <div class="question-item">
              <div class="question-header">
                <div class="question-title">
                  ${index + 1}.- ${answer.question_title || 'Pregunta'}
                </div>
                <div class="question-score">
                  ${Math.round(answer.score || 0)} de ${answer.max_score || 0}
                </div>
              </div>
              <div class="question-details">
                <strong>Categoría:</strong> ${answer.category_name || 'General'} | 
                <strong>Nivel:</strong> ${answer.difficulty_level || 'Medio'} | 
                <strong>Tipo:</strong> ${answer.question_type || 'Programación'}
              </div>
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `;

    await page.setContent(htmlContent);
    await page.emulateMediaType('screen');
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    await browser.close();

    // Set headers for PDF download
    const fileName = `${candidate.name.replace(/\s+/g, '_')}-reporte-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    res.send(pdf);

  } catch (error) {
    console.error('Error al generar reporte PDF:', error);
    res.status(500).json({ 
      error: 'Error al generar el reporte PDF',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;