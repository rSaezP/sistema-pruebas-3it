import express from 'express';
import { db } from '../database/init.js';

const router = express.Router();

// Get test session by token (public endpoint for candidates)
router.get('/token/:token', (req, res) => {
  const { token } = req.params;

  const query = `
    SELECT ts.*, t.name as test_name, t.description as test_description, t.time_limit,
           c.name as candidate_name, c.email as candidate_email
    FROM test_sessions ts
    JOIN tests t ON ts.test_id = t.id
    JOIN candidates c ON ts.candidate_id = c.id
    WHERE ts.token = ?
  `;

  db.get(query, [token], (err, session) => {
    if (err) {
      console.error('Error al obtener sesión:', err);
      return res.status(500).json({ error: 'Error al obtener sesión' });
    }

    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    res.json(session);
  });
});

// Start test session
router.post('/:token/start', (req, res) => {
  const { token } = req.params;
  const { browserInfo, ipAddress } = req.body;

  // Get session
  db.get('SELECT * FROM test_sessions WHERE token = ?', [token], (err, session) => {
    if (err) {
      console.error('Error al obtener sesión:', err);
      return res.status(500).json({ error: 'Error al obtener sesión' });
    }

    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    if (session.status !== 'pending') {
      return res.status(400).json({ error: 'La sesión ya ha sido iniciada' });
    }

    // Update session to started
    const updateQuery = `
      UPDATE test_sessions 
      SET status = 'in_progress', 
          started_at = CURRENT_TIMESTAMP,
          browser_info = ?,
          ip_address = ?
      WHERE token = ?
    `;

    db.run(updateQuery, [JSON.stringify(browserInfo), ipAddress, token], function(err) {
      if (err) {
        console.error('Error al iniciar sesión:', err);
        return res.status(500).json({ error: 'Error al iniciar sesión' });
      }

      // Get test questions
      const questionsQuery = `
        SELECT q.*, c.name as category_name, c.color as category_color
        FROM questions q
        LEFT JOIN categories c ON q.category_id = c.id
        WHERE q.test_id = ?
        ORDER BY q.order_index
      `;

      db.all(questionsQuery, [session.test_id], (err, questions) => {
        if (err) {
          console.error('Error al obtener preguntas:', err);
          return res.status(500).json({ error: 'Error al obtener preguntas' });
        }

        // Get test cases for programming questions (only non-hidden ones)
        const programmingQuestions = questions.filter(q => q.type === 'programming');
        
        if (programmingQuestions.length === 0) {
          return res.json({ 
            session: { ...session, status: 'in_progress' }, 
            questions: questions.map(q => ({ ...q, testCases: [] }))
          });
        }

        const questionIds = programmingQuestions.map(q => q.id);
        const testCasesQuery = `
          SELECT * FROM test_cases 
          WHERE question_id IN (${questionIds.map(() => '?').join(',')}) AND is_hidden = 0
          ORDER BY question_id, id
        `;

        db.all(testCasesQuery, questionIds, (err, testCases) => {
          if (err) {
            console.error('Error al obtener casos de prueba:', err);
            return res.status(500).json({ error: 'Error al obtener casos de prueba' });
          }

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
            session: { ...session, status: 'in_progress' }, 
            questions 
          });
        });
      });
    });
  });
});

// Submit answer
router.post('/:token/answer', (req, res) => {
  const { token } = req.params;
  const { questionId, answer, timeSpent } = req.body;

  // Get session
  db.get('SELECT * FROM test_sessions WHERE token = ?', [token], (err, session) => {
    if (err) {
      console.error('Error al obtener sesión:', err);
      return res.status(500).json({ error: 'Error al obtener sesión' });
    }

    if (!session || session.status !== 'in_progress') {
      return res.status(400).json({ error: 'Sesión inválida o no activa' });
    }

    // Get question details
    db.get('SELECT * FROM questions WHERE id = ?', [questionId], (err, question) => {
      if (err) {
        console.error('Error al obtener pregunta:', err);
        return res.status(500).json({ error: 'Error al obtener pregunta' });
      }

      if (!question) {
        return res.status(404).json({ error: 'Pregunta no encontrada' });
      }

      // Check if answer already exists
      db.get('SELECT * FROM answers WHERE session_id = ? AND question_id = ?', 
        [session.id, questionId], (err, existingAnswer) => {
        
        if (err) {
          console.error('Error al verificar respuesta:', err);
          return res.status(500).json({ error: 'Error al verificar respuesta' });
        }

        const answerData = {
          answer_text: answer,
          time_spent_seconds: timeSpent || 0,
          max_score: question.max_score
        };

        if (existingAnswer) {
          // Update existing answer
          const updateQuery = `
            UPDATE answers 
            SET answer_text = ?, time_spent_seconds = ?, last_modified_at = CURRENT_TIMESTAMP,
                attempts_count = attempts_count + 1
            WHERE id = ?
          `;

          db.run(updateQuery, [answer, timeSpent || 0, existingAnswer.id], function(err) {
            if (err) {
              console.error('Error al actualizar respuesta:', err);
              return res.status(500).json({ error: 'Error al actualizar respuesta' });
            }

            res.json({ message: 'Respuesta actualizada exitosamente' });
          });
        } else {
          // Insert new answer
          const insertQuery = `
            INSERT INTO answers (session_id, question_id, answer_text, time_spent_seconds, max_score)
            VALUES (?, ?, ?, ?, ?)
          `;

          db.run(insertQuery, [session.id, questionId, answer, timeSpent || 0, question.max_score], function(err) {
            if (err) {
              console.error('Error al guardar respuesta:', err);
              return res.status(500).json({ error: 'Error al guardar respuesta' });
            }

            res.json({ message: 'Respuesta guardada exitosamente', answerId: this.lastID });
          });
        }
      });
    });
  });
});

// Finish test session
router.post('/:token/finish', (req, res) => {
  const { token } = req.params;

  db.get('SELECT * FROM test_sessions WHERE token = ?', [token], (err, session) => {
    if (err) {
      console.error('Error al obtener sesión:', err);
      return res.status(500).json({ error: 'Error al obtener sesión' });
    }

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

    // Update session status
    const updateQuery = `
      UPDATE test_sessions 
      SET status = 'completed', 
          finished_at = CURRENT_TIMESTAMP,
          time_spent_seconds = ?
      WHERE token = ?
    `;

    db.run(updateQuery, [timeSpentSeconds, token], function(err) {
      if (err) {
        console.error('Error al finalizar sesión:', err);
        return res.status(500).json({ error: 'Error al finalizar sesión' });
      }

      res.json({ message: 'Prueba finalizada exitosamente', timeSpent: timeSpentSeconds });
    });
  });
});

export default router;