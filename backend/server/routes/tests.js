import express from 'express';
import { db } from '../database/init.js';

const router = express.Router();

// Get all tests
router.get('/', (req, res) => {
  try {
    const testsQuery = `
      SELECT t.*,
             COUNT(DISTINCT s.id) as total_sessions,
             COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END) as completed_sessions,
             AVG(CASE WHEN s.status = 'completed' THEN s.percentage_score END) as avg_score
      FROM tests t
      LEFT JOIN test_sessions s ON t.id = s.test_id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `;

    const tests = db.prepare(testsQuery).all();
    res.json(tests);
  } catch (error) {
    console.error('Error al obtener pruebas:', error);
    res.status(500).json({ error: 'Error al obtener pruebas' });
  }
});

// Get test by ID with questions
router.get('/:id', (req, res) => {
  try {
    const testId = parseInt(req.params.id);
    
    // Get test details
    const testQuery = 'SELECT * FROM tests WHERE id = ?';
    const test = db.prepare(testQuery).get(testId);
    
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

    const questions = db.prepare(questionsQuery).all(testId);

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
      question.test_cases = testCasesByQuestion[question.id] || [];
    });

    res.json({ ...test, questions });
  } catch (error) {
    console.error('Error al obtener prueba:', error);
    res.status(500).json({ error: 'Error al obtener prueba' });
  }
});

// Create new test
router.post('/', (req, res) => {
  try {
    const { name, description, time_limit, max_attempts, passing_score, is_active, created_by } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    const insertQuery = `
      INSERT INTO tests (name, description, time_limit, max_attempts, passing_score, is_active, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const timestamp = new Date().toISOString();
    const values = [
      name,
      description || '',
      time_limit || 60,
      max_attempts || 1,
      passing_score || 60.0,
      is_active !== undefined ? (is_active ? 1 : 0) : 1,
      created_by || 'admin',
      timestamp,
      timestamp
    ];

    const result = db.prepare(insertQuery).run(...values);

    const newTest = {
      id: result.lastInsertRowid,
      name,
      description: description || '',
      time_limit: time_limit || 60,
      max_attempts: max_attempts || 1,
      passing_score: passing_score || 60.0,
      is_active: is_active !== undefined ? is_active : true,
      created_by: created_by || 'admin',
      created_at: timestamp,
      updated_at: timestamp
    };

    res.status(201).json({ test: newTest });
  } catch (error) {
    console.error('Error al crear prueba:', error);
    res.status(500).json({ error: 'Error al crear prueba' });
  }
});

// Create new question
router.post('/questions', (req, res) => {
  try {
    const { 
      test_id, 
      category_id, 
      family_id, 
      type, 
      title, 
      description, 
      difficulty, 
      max_score, 
      order_index,
      language,
      initial_code,
      database_schema,
      options,
      correct_answer
    } = req.body;
    
    // Validate required fields
    if (!test_id || !title || !description || !type) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const insertQuery = `
      INSERT INTO questions (test_id, category_id, family_id, type, title, description, difficulty, max_score, order_index, initial_code, language, database_schema, options, correct_answer, execution_timeout, allow_partial_credit, show_expected_output, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const timestamp = new Date().toISOString();
    const values = [
      parseInt(test_id),
      category_id || 1,
      family_id || 1,
      type,
      title,
      description,
      difficulty || 'Medio',
      max_score || 10,
      order_index || 1,
      initial_code || '',
      language || 'javascript',
      database_schema || '',
      typeof options === 'object' ? JSON.stringify(options) : (options || ''),
      correct_answer || '',
      5000,
      1,
      0,
      timestamp
    ];

    const result = db.prepare(insertQuery).run(...values);

    const newQuestion = {
      id: result.lastInsertRowid,
      test_id: parseInt(test_id),
      category_id: category_id || 1,
      family_id: family_id || 1,
      type,
      title,
      description,
      difficulty: difficulty || 'Medio',
      max_score: max_score || 10,
      order_index: order_index || 1,
      initial_code: initial_code || '',
      language: language || 'javascript',
      database_schema: database_schema || '',
      options: options || '',
      correct_answer: correct_answer || '',
      execution_timeout: 5000,
      allow_partial_credit: true,
      show_expected_output: false,
      created_at: timestamp
    };

    res.status(201).json({ question: newQuestion });
  } catch (error) {
    console.error('Error al crear pregunta:', error);
    res.status(500).json({ error: 'Error al crear pregunta' });
  }
});

// Update existing test
router.put('/:id', (req, res) => {
  try {
    const testId = parseInt(req.params.id);
    const { name, description, time_limit, is_active, questions } = req.body;
    
    // Check if test exists
    const existingTest = db.prepare('SELECT * FROM tests WHERE id = ?').get(testId);
    
    if (!existingTest) {
      return res.status(404).json({ error: 'Prueba no encontrada' });
    }

    // Update test data
    const updateQuery = `
      UPDATE tests 
      SET name = ?, description = ?, time_limit = ?, is_active = ?, updated_at = ?
      WHERE id = ?
    `;
    
    const timestamp = new Date().toISOString();
    const values = [
      name || existingTest.name,
      description !== undefined ? description : existingTest.description,
      time_limit || existingTest.time_limit,
      is_active !== undefined ? (is_active ? 1 : 0) : existingTest.is_active,
      timestamp,
      testId
    ];

    db.prepare(updateQuery).run(...values);

    // Handle questions update if provided
    if (questions && Array.isArray(questions)) {
      // Start transaction for questions update
      const transaction = db.transaction(() => {
        // Remove existing questions and test cases for this test
        db.prepare('DELETE FROM test_cases WHERE question_id IN (SELECT id FROM questions WHERE test_id = ?)').run(testId);
        db.prepare('DELETE FROM questions WHERE test_id = ?').run(testId);
        
        // Add updated questions
        const questionQuery = `
          INSERT INTO questions (test_id, category_id, family_id, type, title, description, difficulty, max_score, order_index, initial_code, language, database_schema, options, correct_answer, execution_timeout, allow_partial_credit, show_expected_output, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const insertQuestion = db.prepare(questionQuery);
        
        questions.forEach((question, index) => {
          const questionValues = [
            testId,
            1,
            1,
            question.type,
            question.title,
            question.description || '',
            'Medio',
            10,
            index + 1,
            '',
            question.language || 'javascript',
            '',
            typeof question.options === 'object' ? JSON.stringify(question.options) : (question.options || ''),
            question.correct_option_index !== undefined ? question.correct_option_index.toString() : '',
            5000,
            1,
            0,
            timestamp
          ];
          
          insertQuestion.run(...questionValues);
        });
      });
      
      transaction();
    }

    res.json({ message: 'Prueba actualizada correctamente' });
  } catch (error) {
    console.error('Error al actualizar prueba:', error);
    res.status(500).json({ error: 'Error al actualizar prueba' });
  }
});

// Delete existing test
router.delete('/:id', (req, res) => {
  try {
    const testId = parseInt(req.params.id);
    
    // Check if test exists
    const test = db.prepare('SELECT * FROM tests WHERE id = ?').get(testId);
    
    if (!test) {
      return res.status(404).json({ error: 'Prueba no encontrada' });
    }

    // Start transaction to delete test and related data
    const transaction = db.transaction(() => {
      // Delete test cases first (foreign key constraint)
      db.prepare('DELETE FROM test_cases WHERE question_id IN (SELECT id FROM questions WHERE test_id = ?)').run(testId);
      
      // Delete questions
      db.prepare('DELETE FROM questions WHERE test_id = ?').run(testId);
      
      // Delete test sessions
      db.prepare('DELETE FROM test_sessions WHERE test_id = ?').run(testId);
      
      // Finally delete the test
      db.prepare('DELETE FROM tests WHERE id = ?').run(testId);
    });
    
    transaction();
    res.json({ message: 'Prueba eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar prueba:', error);
    res.status(500).json({ error: 'Error al eliminar prueba' });
  }
});

// Create new test case
router.post('/test-cases', (req, res) => {
  try {
    const { 
      question_id,
      name,
      input_data,
      expected_output,
      is_hidden,
      weight,
      timeout_ms
    } = req.body;
    
    // Validate required fields
    if (!question_id || !name || input_data === undefined || expected_output === undefined) {
      return res.status(400).json({ error: 'Faltan campos requeridos para el caso de prueba' });
    }

    const insertQuery = `
      INSERT INTO test_cases (question_id, name, input_data, expected_output, is_hidden, weight, timeout_ms, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const timestamp = new Date().toISOString();
    const values = [
      parseInt(question_id),
      name,
      input_data,
      expected_output,
      is_hidden ? 1 : 0,
      weight || 1.0,
      timeout_ms || 5000,
      timestamp
    ];

    const result = db.prepare(insertQuery).run(...values);

    const newTestCase = {
      id: result.lastInsertRowid,
      question_id: parseInt(question_id),
      name,
      input_data,
      expected_output,
      is_hidden: is_hidden || false,
      weight: weight || 1.0,
      timeout_ms: timeout_ms || 5000,
      created_at: timestamp
    };

    res.status(201).json({ testCase: newTestCase });
  } catch (error) {
    console.error('Error al crear caso de prueba:', error);
    res.status(500).json({ error: 'Error al crear caso de prueba' });
  }
});

export default router;