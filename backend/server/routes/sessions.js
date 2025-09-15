import express from 'express';
import { db } from '../database/init.js';
import { evaluateAnswer, evaluateCandidateAnswers } from './candidates.js';

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

    console.log('=== DEBUG GET TOKEN ===');
    console.log('Token recibido:', token);

    // Buscar sesión por token (usando el campo correcto)
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
    console.log('Sesión encontrada:', session);
    
    if (!session) {
      console.log('No se encontró sesión con token:', token);
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
    console.log('Preguntas encontradas:', questions.length);

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

    console.log('=== DEBUG START SESSION ===');
    console.log('Token:', token);

    // Find session by token
    const session = db.prepare('SELECT * FROM test_sessions WHERE token = ?').get(token);
    console.log('Sesión encontrada para start:', session);
    
    if (!session) {
      console.log('No se encontró sesión para iniciar con token:', token);
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    if (session.status !== 'pending') {
      console.log('Estado de sesión inválido:', session.status);
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

    const updateResult = db.prepare(updateQuery).run(...values);
    console.log('Sesión actualizada, cambios:', updateResult.changes);

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

    const session = db.prepare('SELECT * FROM test_sessions WHERE token = ?').get(token);
    
    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    const answers = db.prepare(`
      SELECT * FROM answers 
      WHERE session_id = ?
    `).all(session.id);
    
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

    console.log('=== DEBUG SAVE ANSWER ===');
    console.log('Token:', token);
    console.log('QuestionId:', questionId);
    console.log('Answer:', answer, 'type:', typeof answer);
    console.log('TimeSpent:', timeSpent);

    // Find session by token
    const session = db.prepare('SELECT * FROM test_sessions WHERE token = ?').get(token);
    
    if (!session || session.status !== 'in_progress') {
      return res.status(400).json({ error: 'Sesión inválida o no activa' });
    }

    // Find question
    const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(parseInt(questionId));
    
    if (!question) {
      return res.status(404).json({ error: 'Pregunta no encontrada' });
    }

    // Ensure answer is not null/undefined - provide default value
    const safeAnswer = answer !== null && answer !== undefined ? String(answer) : '';
    console.log('SafeAnswer:', safeAnswer);

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
        safeAnswer,
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
      // ✅ CORRECTO - debe ser:
      const insertQuery = `
        INSERT INTO answers (session_id, question_id, answer_text, time_spent_seconds, max_score, attempts_count, last_modified_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
            
      const values = [
      session.id,
      parseInt(questionId),
      safeAnswer,
      timeSpent || 0,
      question.max_score,
      1,
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

// Finish test session

router.post('/:token/finish', async (req, res) => {
  try {
    const { token } = req.params;
    console.log('=== DEBUG FINISH ===');
    console.log('Token:', token);

    // Find session by token
    const session = db.prepare('SELECT * FROM test_sessions WHERE token = ?').get(token);
    console.log('Sesión encontrada:', session);
    
    if (!session) {
      console.log('❌ Sesión no encontrada');
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    console.log('Estado actual:', session.status);
    if (session.status !== 'in_progress') {
      console.log('❌ Estado inválido:', session.status);
      return res.status(400).json({ error: 'La sesión no está activa' });
    }

    // Calculate time spent
    const startTime = new Date(session.started_at);
    const currentTime = new Date();
    const timeSpentSeconds = Math.floor((currentTime - startTime) / 1000);
    const timestamp = new Date().toISOString();

    console.log('Tiempo calculado:', timeSpentSeconds, 'segundos');

    // Update session status
    const updateQuery = `
      UPDATE test_sessions 
      SET status = 'completed', finished_at = ?, time_spent_seconds = ?
      WHERE token = ?
    `;
    
    const values = [timestamp, timeSpentSeconds, token];
    console.log('Ejecutando UPDATE session...');
    db.prepare(updateQuery).run(...values);

    // Evaluar todas las respuestas de esta sesión
    console.log('=== INICIANDO EVALUACIÓN DE RESPUESTAS ===');
    
    // Obtener el ID del candidato para la sesión actual
    const candidate = db.prepare('SELECT candidate_id FROM test_sessions WHERE id = ?').get(session.id);
    
    if (!candidate || !candidate.candidate_id) {
      console.error('[ERROR] No se pudo obtener el ID del candidato');
    } else {
      try {
        // Llamar a la función de evaluación
        console.log(`[DEBUG] Iniciando evaluación para candidato: ${candidate.candidate_id}`);
        const evaluationResult = await evaluateCandidateAnswers(candidate.candidate_id);
        
        if (!evaluationResult.success) {
          console.error('[ERROR] Error en la evaluación:', evaluationResult.error);
        } else {
          console.log(`[DEBUG] Evaluación completada. Respuestas evaluadas: ${evaluationResult.evaluated}`);
        }
        
        // Actualizar el puntaje de la sesión
        db.prepare(`
          UPDATE test_sessions 
          SET total_score = (
            SELECT COALESCE(SUM(score), 0) 
            FROM answers 
            WHERE session_id = ?
          )
          WHERE id = ?
        `).run(session.id, session.id);
        
        // Calcular puntaje total de la sesión
        const sessionScores = db.prepare(`
          SELECT 
            COALESCE(SUM(score), 0) as total_score,
            COALESCE(SUM(q.max_score), 0) as max_possible_score
          FROM answers a
          JOIN questions q ON a.question_id = q.id
          WHERE a.session_id = ?
        `).get(session.id);
        
        const percentageScore = sessionScores.max_possible_score > 0 
          ? (sessionScores.total_score / sessionScores.max_possible_score) * 100 
          : 0;
        
        console.log(`[DEBUG] Puntaje total de la sesión: ${sessionScores.total_score}/${sessionScores.max_possible_score} (${percentageScore.toFixed(2)}%)`);
          db.prepare(`
        UPDATE test_sessions 
        SET total_score = ?, percentage_score = ?
        WHERE id = ?
      `).run(sessionScores.total_score, percentageScore, session.id);        
              
       console.log('=== EVALUACIÓN COMPLETADA ===');
        
      } catch (error) {
        console.error('[ERROR] Error durante la evaluación de respuestas:', error);
        // No fallar la petición, solo registrar el error
      }
    }

    console.log('Ejecutando UPDATE candidate...');
    db.prepare('UPDATE candidates SET status = ?, updated_at = ? WHERE id = ?')
      .run('completed', timestamp, session.candidate_id);

    console.log('✅ Finalización exitosa');
    res.json({ message: 'Prueba finalizada exitosamente', timeSpent: timeSpentSeconds });
  } catch (error) {
    console.error('❌ Error al finalizar sesión:', error);
    res.status(500).json({ error: 'Error al finalizar sesión' });
  }
});

// Get completed session results (for showing results to candidate)
router.get('/completed/:token', (req, res) => {
  try {
    const { token } = req.params;
    
    console.log('=== GET COMPLETED SESSION ===');
    console.log('Token:', token);
    
    // Get session with test and candidate data
    const sessionQuery = `
      SELECT 
        s.*, 
        t.name as test_name, 
        t.description as test_description,
        t.passing_score,
        c.name as candidate_name, 
        c.lastname as candidate_lastname,
        c.email as candidate_email
      FROM test_sessions s
      LEFT JOIN tests t ON s.test_id = t.id
      LEFT JOIN candidates c ON s.candidate_id = c.id
      WHERE s.token = ? AND s.status = 'completed'
    `;
    
    const session = db.prepare(sessionQuery).get(token);
    
    if (!session) {
      return res.status(404).json({ error: 'Sesión completada no encontrada' });
    }
    
    // Get answers with questions data
    const answersQuery = `
      SELECT 
        a.*,
        q.title as question_title,
        q.type as question_type,
        q.max_score as question_max_score
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      WHERE a.session_id = ?
      ORDER BY q.order_index
    `;
    
    const answers = db.prepare(answersQuery).all(session.id);
    
    // Calculate summary stats
    const totalQuestions = answers.length;
    const answeredQuestions = answers.filter(a => a.answer_text && a.answer_text.trim() !== '').length;
    const totalScore = answers.reduce((sum, a) => sum + (a.score || 0), 0);
    const maxPossibleScore = answers.reduce((sum, a) => sum + (a.question_max_score || 0), 0);
    const percentageScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    const passed = percentageScore >= (session.passing_score || 60);
    
    console.log('Session results:', {
      totalQuestions,
      answeredQuestions,
      totalScore,
      maxPossibleScore,
      percentageScore: percentageScore.toFixed(2),
      passed
    });
    
    res.json({
      session: {
        id: session.id,
        test_name: session.test_name,
        test_description: session.test_description,
        candidate_name: `${session.candidate_name} ${session.candidate_lastname || ''}`.trim(),
        candidate_email: session.candidate_email,
        started_at: session.started_at,
        completed_at: session.finished_at,
        time_spent_seconds: session.time_spent_seconds,
        status: session.status
      },
      results: {
        total_questions: totalQuestions,
        answered_questions: answeredQuestions,
        total_score: totalScore,
        max_possible_score: maxPossibleScore,
        percentage_score: parseFloat(percentageScore.toFixed(2)),
        passed,
        passing_score: session.passing_score || 60
      },
      answers: answers.map(a => ({
        question_title: a.question_title,
        question_type: a.question_type,
        max_score: a.question_max_score,
        score: a.score || 0,
        answered: !!(a.answer_text && a.answer_text.trim() !== '')
      }))
    });
    
  } catch (error) {
    console.error('Error al obtener sesión completada:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;