import express from 'express';
import { db } from '../database/init.js';

const router = express.Router();

// Simple code execution simulation (in production, use a proper sandbox)
const executeCode = (code, testCase, language) => {
  try {
    // This is a simplified version - in production you'd use a proper sandbox
    if (language === 'javascript') {
      // Create a safe evaluation context
      const func = new Function('return ' + code)();
      const input = JSON.parse(testCase.input_data);
      const result = func(input);
      return {
        success: true,
        output: String(result),
        executionTime: Math.random() * 100 // Mock execution time
      };
    }
    
    return {
      success: false,
      output: '',
      error: 'Lenguaje no soportado'
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: error.message
    };
  }
};

// Evaluate code answer
router.post('/code', (req, res) => {
  const { sessionToken, questionId, code } = req.body;

  if (!sessionToken || !questionId || !code) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  // Get session and question
  const sessionQuery = `
    SELECT ts.*, q.*, q.language, q.max_score
    FROM test_sessions ts
    JOIN questions q ON ts.test_id = (SELECT test_id FROM questions WHERE id = ?)
    WHERE ts.token = ? AND q.id = ?
  `;

  db.get(sessionQuery, [questionId, sessionToken, questionId], (err, data) => {
    if (err) {
      console.error('Error al obtener datos:', err);
      return res.status(500).json({ error: 'Error al obtener datos' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Sesión o pregunta no encontrada' });
    }

    // Get test cases for this question
    db.all('SELECT * FROM test_cases WHERE question_id = ?', [questionId], (err, testCases) => {
      if (err) {
        console.error('Error al obtener casos de prueba:', err);
        return res.status(500).json({ error: 'Error al obtener casos de prueba' });
      }

      if (testCases.length === 0) {
        return res.json({
          success: true,
          score: data.max_score,
          results: [],
          message: 'No hay casos de prueba definidos'
        });
      }

      // Execute code against all test cases
      const results = [];
      let passedCases = 0;
      let totalScore = 0;

      testCases.forEach((testCase, index) => {
        const execution = executeCode(code, testCase, data.language);
        
        const passed = execution.success && 
                      execution.output.trim() === testCase.expected_output.trim();
        
        if (passed) {
          passedCases++;
          totalScore += (data.max_score / testCases.length) * (testCase.weight || 1);
        }

        results.push({
          testCaseId: testCase.id,
          name: testCase.name,
          passed,
          expectedOutput: testCase.expected_output,
          actualOutput: execution.output,
          error: execution.error,
          executionTime: execution.executionTime,
          isHidden: testCase.is_hidden
        });
      });

      const finalScore = Math.round(totalScore * 100) / 100;
      const percentage = Math.round((passedCases / testCases.length) * 100);

      // Update answer with evaluation results
      const updateAnswerQuery = `
        UPDATE answers 
        SET score = ?, 
            percentage_score = ?,
            test_cases_passed = ?,
            test_cases_total = ?,
            compilation_successful = 1,
            execution_successful = 1
        WHERE session_id = ? AND question_id = ?
      `;

      db.run(updateAnswerQuery, [
        finalScore,
        percentage,
        passedCases,
        testCases.length,
        data.id,
        questionId
      ], (err) => {
        if (err) {
          console.error('Error al actualizar respuesta:', err);
          return res.status(500).json({ error: 'Error al actualizar evaluación' });
        }

        res.json({
          success: true,
          score: finalScore,
          maxScore: data.max_score,
          percentage,
          passedCases,
          totalCases: testCases.length,
          results: results.filter(r => !r.isHidden) // Only return non-hidden results
        });
      });
    });
  });
});

// Evaluate multiple choice answer
router.post('/multiple-choice', (req, res) => {
  const { sessionToken, questionId, selectedOption } = req.body;

  if (!sessionToken || !questionId || selectedOption === undefined) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  // Get question details
  db.get('SELECT * FROM questions WHERE id = ? AND type = "multiple_choice"', [questionId], (err, question) => {
    if (err) {
      console.error('Error al obtener pregunta:', err);
      return res.status(500).json({ error: 'Error al obtener pregunta' });
    }

    if (!question) {
      return res.status(404).json({ error: 'Pregunta no encontrada' });
    }

    const correctAnswer = question.correct_answer;
    const isCorrect = String(selectedOption) === String(correctAnswer);
    const score = isCorrect ? question.max_score : 0;
    const percentage = isCorrect ? 100 : 0;

    // Get session
    db.get('SELECT id FROM test_sessions WHERE token = ?', [sessionToken], (err, session) => {
      if (err) {
        console.error('Error al obtener sesión:', err);
        return res.status(500).json({ error: 'Error al obtener sesión' });
      }

      if (!session) {
        return res.status(404).json({ error: 'Sesión no encontrada' });
      }

      // Update answer with evaluation
      const updateAnswerQuery = `
        UPDATE answers 
        SET score = ?, 
            percentage_score = ?
        WHERE session_id = ? AND question_id = ?
      `;

      db.run(updateAnswerQuery, [score, percentage, session.id, questionId], (err) => {
        if (err) {
          console.error('Error al actualizar respuesta:', err);
          return res.status(500).json({ error: 'Error al actualizar evaluación' });
        }

        res.json({
          success: true,
          correct: isCorrect,
          score,
          maxScore: question.max_score,
          percentage,
          correctAnswer: correctAnswer
        });
      });
    });
  });
});

export default router;