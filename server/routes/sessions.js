import express from 'express';
import { db } from '../database/init.js';

const router = express.Router();

// Get all sessions
router.get('/', (req, res) => {
  try {
    const sessionsQuery = `
      SELECT s.*, t.name as test_name, c.name as candidate_name, c.email as candidate_email
      FROM test_sessions s
      LEFT JOIN tests t ON s.test_id = t.id
      LEFT JOIN candidates c ON s.candidate_id = c.id
      ORDER BY s.created_at DESC
    `;
    
    const sessions = db.prepare(sessionsQuery).all();
    res.json(sessions);
  } catch (error) {
    console.error('Error al obtener sesiones:', error);
    res.status(500).json({ error: 'Error al obtener sesiones' });
  }
});

// Get test session by token (public endpoint for candidates)
router.get('/token/:token', (req, res) => {
  try {
    const { token } = req.params;

    // Buscar sesión por invitation_token (CORREGIDO)
    const sessionQuery = `
      SELECT s.*, t.name as test_name, t.description as test_description, 
             t.time_limit, t.max_attempts, t.passing_score,
             c.name as candidate_name, c.email as candidate_email
      FROM test_sessions s
      LEFT JOIN tests t ON s.test_id = t.id
      LEFT JOIN candidates c ON s.candidate_id = c.id
      WHERE s.token = ?
    `;

    const session = db.prepare(sessionQuery).get(token);
    
    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    // Verificar estado de la sesión
    if (session.status === 'completed') {
      return res.status(400).json({ error: 'Esta sesión ya ha sido completada' });
    }
    
    if (session.status === 'expired') {
      return res.status(400).json({ error: 'Esta sesión ha expirado' });
    }

    // Obtener preguntas del test
    const questionsQuery = `
      SELECT q.*, c.name as category_name, c.color as category_color
      FROM questions q
      LEFT JOIN categories c ON q.category_id = c.id
      WHERE q.test_id = ?
      ORDER BY q.order_index
    `;

    const questions = db.prepare(questionsQuery).all(session.test_id);

    // Agregar time_limit_minutes que espera el frontend
    const sessionWithTimeLimit = {
      ...session,
      time_limit_minutes: session.time_limit || 60
    };

    // Respuesta en formato que espera el frontend
    res.json({
      session: sessionWithTimeLimit,
      questions: questions
    });

  } catch (error) {
    console.error('Error al obtener sesión por token:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Start test session
router.post('/:token/start', (req, res) => {
  try {
    const { token } = req.params;
    const { browserInfo, ipAddress } = req.body;

    // Find session by invitation_token (CORREGIDO)
    const session = db.prepare('SELECT * FROM test_sessions WHERE token = ?').get(token);
    
    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    if (session.status !== 'pending') {
      return res.status(400).json({ error: 'La sesión ya ha sido iniciada' });
    }

    // Update session to started
    const updateQuery = `
      UPDATE test_sessions 
      SET status = 'in_progress', started_at = ?, browser_info = ?, ip_address = ?
      WHERE token = ?
    `;
    
    const timestamp = new Date().toISOString();
    const values = [
      timestamp,
      JSON.stringify(browserInfo || {}),
      ipAddress || '',
      token
    ];

    db.prepare(updateQuery).run(...values);

    // Get test questions
    const questionsQuery = `
      SELECT q.*, c.name as category_name, c.color as category_color
      FROM questions q
      LEFT JOIN categories c ON q.category_id = c.id
      WHERE q.test_id = ?
      ORDER BY q.order_index
    `;

    const questions = db.prepare(questionsQuery).all(session.test_id);

    // Get test cases for each question (non-hidden only)
    const questionIds = questions.map(q => q.id);
    
    if (questionIds.length === 0) {
      return res.json({ 
        session: { ...session, status: 'in_progress', started_at: timestamp }, 
        questions: [] 
      });
    }

    const testCasesQuery = `
      SELECT * FROM test_cases 
      WHERE question_id IN (${questionIds.map(() => '?').join(',')}) AND is_hidden = 0
      ORDER BY question_id, id
    `;

    const testCases = db.prepare(testCasesQuery).all(...questionIds);

    // Group test cases by question
    const testCasesByQuestion = testCases.reduce((acc, testCase) => {
      if (!acc[testCase.question_id]) {
        acc[testCase.question_id] = [];
      }
      acc[testCase.question_id].push(testCase);
      return acc;
    }, {});

    // Add test cases to questions
    questions.forEach(question => {
      question.testCases = testCasesByQuestion[question.id] || [];
    });

    res.json({ 
      session: { ...session, status: 'in_progress', started_at: timestamp }, 
      questions 
    });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// Get answers for session
router.get('/:token/answers', (req, res) => {
  try {
    const { token } = req.params;

    // Find session by token
    const session = db.prepare('SELECT * FROM test_sessions WHERE token = ?').get(token);
    
    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    // Get existing answers for this session
    const answersQuery = `
      SELECT * FROM answers 
      WHERE session_id = ?
    `;

    const answers = db.prepare(answersQuery).all(session.id);
    res.json(answers);
  } catch (error) {
    console.error('Error al obtener respuestas:', error);
    res.status(500).json({ error: 'Error al obtener respuestas' });
  }
});

// Submit answer
router.post('/:token/answer', (req, res) => {
  try {
    const { token } = req.params;
    const { questionId, answer, timeSpent } = req.body;

    // Find session by invitation_token (CORREGIDO)
    const session = db.prepare('SELECT * FROM test_sessions WHERE token = ?').get(token);
    
    if (!session || session.status !== 'in_progress') {
      return res.status(400).json({ error: 'Sesión inválida o no activa' });
    }

    // Find question
    const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(parseInt(questionId));
    
    if (!question) {
      return res.status(404).json({ error: 'Pregunta no encontrada' });
    }

    // Check if answer already exists
    const existingAnswer = db.prepare(`
      SELECT * FROM answers 
      WHERE session_id = ? AND question_id = ?
    `).get(session.id, parseInt(questionId));

    const timestamp = new Date().toISOString();

    if (existingAnswer) {
      // Update existing answer
      const updateQuery = `
        UPDATE answers 
        SET answer_text = ?, time_spent_seconds = ?, last_modified_at = ?, attempts_count = ?
        WHERE session_id = ? AND question_id = ?
      `;
      
      const values = [
        answer,
        timeSpent || 0,
        timestamp,
        (existingAnswer.attempts_count || 0) + 1,
        session.id,
        parseInt(questionId)
      ];

      db.prepare(updateQuery).run(...values);
      res.json({ message: 'Respuesta actualizada exitosamente' });
    } else {
      // Create new answer
      const insertQuery = `
        INSERT INTO answers (session_id, question_id, answer_text, time_spent_seconds, max_score, attempts_count, created_at, last_modified_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        session.id,
        parseInt(questionId),
        answer,
        timeSpent || 0,
        question.max_score,
        1,
        timestamp,
        timestamp
      ];

      db.prepare(insertQuery).run(...values);
      res.json({ message: 'Respuesta guardada exitosamente' });
    }
  } catch (error) {
    console.error('Error al guardar respuesta:', error);
    res.status(500).json({ error: 'Error al guardar respuesta' });
  }
});

// Log activity route (NUEVA RUTA AGREGADA)
router.post('/:token/log-activity', (req, res) => {
  try {
    const { token } = req.params;
    const { activity_type, activity_data } = req.body;

    // Find session by token
    const session = db.prepare('SELECT * FROM test_sessions WHERE token = ?').get(token);
    
    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    // Log activity (respuesta exitosa simple por ahora)
    res.json({ message: 'Actividad registrada' });
  } catch (error) {
    console.error('Error al registrar actividad:', error);
    res.status(500).json({ error: 'Error al registrar actividad' });
  }
});

// Finish test session
router.post('/:token/finish', (req, res) => {
  try {
    const { token } = req.params;

    // Find session by invitation_token (CORREGIDO)
    const session = db.prepare('SELECT * FROM test_sessions WHERE token = ?').get(token);
    
    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    if (session.status !== 'in_progress') {
      return res.status(400).json({ error: 'La sesión no está activa' });
    }

    // Calculate time spent
    const startTime = new Date(session.started_at);
    const currentTime = new Date();
    const timeSpentSeconds = Math.floor((currentTime - startTime) / 1000);
    const timestamp = new Date().toISOString();

    // Update session status
    const updateQuery = `
      UPDATE test_sessions 
      SET status = 'completed', finished_at = ?, time_spent_seconds = ?
      WHERE token = ?
    `;
    
    const values = [timestamp, timeSpentSeconds, token];

    db.prepare(updateQuery).run(...values);

    // Actualizar también el estado del candidato
    const updateCandidateQuery = `
      UPDATE candidates 
      SET status = 'completed', updated_at = ?
      WHERE id = (SELECT candidate_id FROM test_sessions WHERE token = ?)
    `;

    console.log('🔄 Intentando actualizar candidato para token:', token);
    const candidateUpdateResult = db.prepare(updateCandidateQuery).run(timestamp, token);
    console.log('✅ Candidato actualizado. Filas afectadas:', candidateUpdateResult.changes);

    res.json({ message: 'Prueba finalizada exitosamente', timeSpent: timeSpentSeconds });
  } catch (error) {
    console.error('Error al finalizar sesión:', error);
    res.status(500).json({ error: 'Error al finalizar sesión' });
  }
});

export default router;