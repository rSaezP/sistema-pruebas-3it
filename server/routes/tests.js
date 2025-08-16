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
  try {
    const testId = parseInt(req.params.id);
    
    // Get test details
    const test = db.tests.find(t => t.id === testId);
    if (!test) {
      return res.status(404).json({ error: 'Prueba no encontrada' });
    }

    // Get questions for this test
    const questions = db.questions.filter(q => q.test_id === testId)
      .map(question => {
        const category = db.categories.find(c => c.id === question.category_id);
        const testCases = db.test_cases.filter(tc => tc.question_id === question.id);
        
        return {
          ...question,
          category_name: category?.name || '',
          category_color: category?.color || '#005AEE',
          test_cases: testCases
        };
      })
      .sort((a, b) => a.order_index - b.order_index);

    res.json({ ...test, questions });
  } catch (error) {
    console.error('Error al obtener prueba:', error);
    res.status(500).json({ error: 'Error al obtener prueba' });
  }
});

// Create new test
router.post('/', async (req, res) => {
  try {
    const { name, description, time_limit, max_attempts, passing_score, is_active, created_by } = req.body;
    
    const newTest = {
      id: Math.max(...db.tests.map(t => t.id), 0) + 1,
      name,
      description,
      time_limit: time_limit || 60,
      max_attempts: max_attempts || 1,
      passing_score: passing_score || 60.0,
      is_active: is_active !== undefined ? is_active : true,
      created_by: created_by || 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.tests.push(newTest);
    
    // Save to file
    const fs = await import('fs');
    const path = await import('path');
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const dbPath = path.join(__dirname, '../database/data.json');
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

    res.status(201).json({ test: newTest });
  } catch (error) {
    console.error('Error al crear prueba:', error);
    res.status(500).json({ error: 'Error al crear prueba' });
  }
});

// Create new question
router.post('/questions', async (req, res) => {
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

    const newQuestion = {
      id: Math.max(...db.questions.map(q => q.id), 0) + 1,
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
      created_at: new Date().toISOString()
    };

    db.questions.push(newQuestion);
    
    // Save to file
    const fs = await import('fs');
    const path = await import('path');
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const dbPath = path.join(__dirname, '../database/data.json');
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

    res.status(201).json({ question: newQuestion });
  } catch (error) {
    console.error('Error al crear pregunta:', error);
    res.status(500).json({ error: 'Error al crear pregunta' });
  }
});

// Create new test case
router.post('/test-cases', async (req, res) => {
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

    const newTestCase = {
      id: Math.max(...db.test_cases.map(tc => tc.id), 0) + 1,
      question_id: parseInt(question_id),
      name,
      input_data,
      expected_output,
      is_hidden: is_hidden || false,
      weight: weight || 1.0,
      timeout_ms: timeout_ms || 5000,
      created_at: new Date().toISOString()
    };

    db.test_cases.push(newTestCase);
    
    // Save to file
    const fs = await import('fs');
    const path = await import('path');
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const dbPath = path.join(__dirname, '../database/data.json');
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

    res.status(201).json({ testCase: newTestCase });
  } catch (error) {
    console.error('Error al crear caso de prueba:', error);
    res.status(500).json({ error: 'Error al crear caso de prueba' });
  }
});

export default router;