import express from 'express';
import { db } from '../database/init.js';

const router = express.Router();

// Get all tests
router.get('/', (req, res) => {
  try {
    // Get tests with session statistics
    const tests = db.tests.map(test => {
      const sessions = db.test_sessions.filter(s => s.test_id === test.id);
      const completedSessions = sessions.filter(s => s.status === 'completed');
      const avgScore = completedSessions.length > 0 
        ? completedSessions.reduce((sum, s) => sum + (s.percentage_score || 0), 0) / completedSessions.length
        : 0;

      return {
        ...test,
        total_sessions: sessions.length,
        completed_sessions: completedSessions.length,
        avg_score: avgScore
      };
    });

    res.json(tests);
  } catch (error) {
    console.error('Error al obtener pruebas:', error);
    res.status(500).json({ error: 'Error al obtener pruebas' });
  }
});

// Get test by ID with questions
router.get('/:id', (req, res) => {
  const testId = req.params.id;
  
  // Get test details
  const testQuery = `SELECT * FROM tests WHERE id = ?`;
  
  db.get(testQuery, [testId], (err, test) => {
    if (err) {
      console.error('Error al obtener prueba:', err);
      return res.status(500).json({ error: 'Error al obtener prueba' });
    }
    
    if (!test) {
      return res.status(404).json({ error: 'Prueba no encontrada' });
    }

    // Get questions for this test
    const questionsQuery = `
      SELECT q.*, c.name as category_name, c.color as category_color
      FROM questions q
      LEFT JOIN categories c ON q.category_id = c.id
      WHERE q.test_id = ?
      ORDER BY q.order_index
    `;

    db.all(questionsQuery, [testId], (err, questions) => {
      if (err) {
        console.error('Error al obtener preguntas:', err);
        return res.status(500).json({ error: 'Error al obtener preguntas' });
      }

      // Get test cases for each question
      const questionIds = questions.map(q => q.id);
      
      if (questionIds.length === 0) {
        return res.json({ ...test, questions: [] });
      }

      const testCasesQuery = `
        SELECT * FROM test_cases 
        WHERE question_id IN (${questionIds.map(() => '?').join(',')})
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

        res.json({ ...test, questions });
      });
    });
  });
});

// Create new test
router.post('/', authenticateToken, (req, res) => {
  const { name, description, time_limit, questions } = req.body;

  if (!name || !questions || questions.length === 0) {
    return res.status(400).json({ error: 'Nombre y preguntas son requeridos' });
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // Insert test
    const testQuery = `
      INSERT INTO tests (name, description, time_limit, created_by)
      VALUES (?, ?, ?, ?)
    `;

    db.run(testQuery, [name, description, time_limit || 60, req.user.username], function(err) {
      if (err) {
        db.run('ROLLBACK');
        console.error('Error al crear prueba:', err);
        return res.status(500).json({ error: 'Error al crear prueba' });
      }

      const testId = this.lastID;

      // Insert questions
      let questionsProcessed = 0;
      let hasError = false;

      questions.forEach((question, index) => {
        const questionQuery = `
          INSERT INTO questions (test_id, category_id, family_id, type, title, description, 
                               difficulty, max_score, order_index, initial_code, language, 
                               options, correct_answer)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const questionValues = [
          testId,
          question.category_id || 1,
          question.family_id || 1,
          question.type,
          question.title,
          question.description,
          question.difficulty || 'Medio',
          question.max_score || 10,
          index + 1,
          question.initial_code || '',
          question.language || 'javascript',
          question.options ? JSON.stringify(question.options) : null,
          question.correct_answer || ''
        ];

        db.run(questionQuery, questionValues, function(err) {
          if (err && !hasError) {
            hasError = true;
            db.run('ROLLBACK');
            console.error('Error al crear pregunta:', err);
            return res.status(500).json({ error: 'Error al crear pregunta' });
          }

          const questionId = this.lastID;

          // Insert test cases if they exist
          if (question.testCases && question.testCases.length > 0) {
            let testCasesProcessed = 0;

            question.testCases.forEach(testCase => {
              const testCaseQuery = `
                INSERT INTO test_cases (question_id, name, input_data, expected_output, is_hidden)
                VALUES (?, ?, ?, ?, ?)
              `;

              db.run(testCaseQuery, [
                questionId,
                testCase.name || 'Caso de prueba',
                testCase.input_data || '',
                testCase.expected_output || '',
                testCase.is_hidden || 0
              ], (err) => {
                if (err && !hasError) {
                  hasError = true;
                  db.run('ROLLBACK');
                  console.error('Error al crear caso de prueba:', err);
                  return res.status(500).json({ error: 'Error al crear caso de prueba' });
                }

                testCasesProcessed++;
                if (testCasesProcessed === question.testCases.length) {
                  questionsProcessed++;
                  if (questionsProcessed === questions.length && !hasError) {
                    db.run('COMMIT');
                    res.json({ id: testId, message: 'Prueba creada exitosamente' });
                  }
                }
              });
            });
          } else {
            questionsProcessed++;
            if (questionsProcessed === questions.length && !hasError) {
              db.run('COMMIT');
              res.json({ id: testId, message: 'Prueba creada exitosamente' });
            }
          }
        });
      });
    });
  });
});

// Get categories for dropdowns
router.get('/categories/list', authenticateToken, (req, res) => {
  db.all('SELECT * FROM categories ORDER BY name', [], (err, rows) => {
    if (err) {
      console.error('Error al obtener categorías:', err);
      return res.status(500).json({ error: 'Error al obtener categorías' });
    }
    res.json(rows);
  });
});

// Get question families
router.get('/families/list', authenticateToken, (req, res) => {
  db.all('SELECT * FROM question_families ORDER BY name', [], (err, rows) => {
    if (err) {
      console.error('Error al obtener familias:', err);
      return res.status(500).json({ error: 'Error al obtener familias' });
    }
    res.json(rows);
  });
});

export default router;