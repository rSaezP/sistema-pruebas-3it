import express from 'express';
import { db } from '../database/init.js';
import { LanguageEvaluators } from '../evaluators/LanguageEvaluators.js';

const router = express.Router();

// Use the advanced LanguageEvaluators system
const executeCode = async (code, testCase, language) => {
  try {
    console.log(`[EVAL-UNIFIED] Ejecutando evaluación para ${language}`);
    
    const evaluator = LanguageEvaluators.getEvaluator(language);
    const result = await evaluator.evaluate(code, testCase, language);
    
    console.log(`[EVAL-UNIFIED] Resultado:`, result);
    
    return {
      success: result.success,
      output: result.output,
      error: result.errors?.join(', ') || null,
      executionTime: result.executionTime || 0
    };
  } catch (error) {
    console.log(`[EVAL-UNIFIED] Error:`, error.message);
    return {
      success: false,
      output: '',
      error: error.message,
      executionTime: 0
    };
  }
};

// Evaluate code answer
router.post('/code', async (req, res) => {
  const { sessionToken, questionId, code } = req.body;

  // DEBUG: Ver qué está llegando
  console.log('=== DEBUG EVALUATION ENDPOINT ===');
  console.log('Body completo:', req.body);
  console.log('sessionToken:', sessionToken, 'tipo:', typeof sessionToken);
  console.log('questionId:', questionId, 'tipo:', typeof questionId);  
  console.log('code:', code, 'tipo:', typeof code);
  console.log('=================================');

  if (!sessionToken || !questionId || !code) {
    console.log('❌ DATOS INCOMPLETOS - Falló la validación');
    console.log('sessionToken válido:', !!sessionToken);
    console.log('questionId válido:', !!questionId);
    console.log('code válido:', !!code);
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  // Get session and question
  const sessionQuery = `
    SELECT ts.*, q.*, q.language, q.max_score
    FROM test_sessions ts
    JOIN questions q ON ts.test_id = (SELECT test_id FROM questions WHERE id = ?)
    WHERE ts.token = ? AND q.id = ?
  `;

  try {
    const data = db.prepare(sessionQuery).get(questionId, sessionToken, questionId);
    
    if (!data) {
      return res.status(404).json({ error: 'Sesión o pregunta no encontrada' });
    }

    console.log('[EVAL-UNIFIED] Sesión y pregunta encontradas:', { 
      session_id: data.id, 
      question_id: questionId,
      language: data.language 
    });

    // Get test cases for this question
    const testCases = db.prepare('SELECT * FROM test_cases WHERE question_id = ?').all(questionId);
    
    if (testCases.length === 0) {
      return res.json({
        success: true,
        score: data.max_score,
        results: [],
        message: 'No hay casos de prueba definidos'
      });
    }

    console.log(`[EVAL-UNIFIED] Casos de prueba encontrados: ${testCases.length}`);

      // Execute code against all test cases
      const results = [];
      let passedCases = 0;
      let totalScore = 0;

      // Process test cases sequentially since they're async now
      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        const execution = await executeCode(code, testCase, data.language);
        
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
      }

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

    db.prepare(updateAnswerQuery).run(
      finalScore,
      percentage,
      passedCases,
      testCases.length,
      data.id,
      questionId
    );

    console.log(`[EVAL-UNIFIED] Evaluación completada: ${passedCases}/${testCases.length} casos pasados, puntaje: ${finalScore}/${data.max_score}`);

    res.json({
      success: true,
      score: finalScore,
      maxScore: data.max_score,
      percentage,
      passedCases,
      totalCases: testCases.length,
      results: results.filter(r => !r.isHidden) // Only return non-hidden results
    });

  } catch (error) {
    console.error('Error en evaluation/code:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// Evaluate multiple choice answer
router.post('/multiple-choice', (req, res) => {
  const { sessionToken, questionId, selectedOption } = req.body;

  console.log('🔥 === EVALUATING MULTIPLE CHOICE === 🔥');
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('📝 Request body:', req.body);
  console.log('🔑 SessionToken:', sessionToken);
  console.log('❓ QuestionId:', questionId, 'type:', typeof questionId);
  console.log('✅ SelectedOption:', selectedOption, 'type:', typeof selectedOption);

  if (!sessionToken || !questionId || selectedOption === undefined) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  try {
    // Get question details (using better-sqlite3 synchronous API)
    const question = db.prepare('SELECT * FROM questions WHERE id = ? AND type = ?').get(questionId, 'multiple_choice');
    
    if (!question) {
      return res.status(404).json({ error: 'Pregunta no encontrada' });
    }

    console.log('Question found:', { id: question.id, correct_answer: question.correct_answer, max_score: question.max_score });

    const correctAnswer = question.correct_answer;
    const isCorrect = String(selectedOption) === String(correctAnswer);
    const score = isCorrect ? question.max_score : 0;
    const percentage = isCorrect ? 100 : 0;

    console.log('Evaluation:', { correctAnswer, selectedOption, isCorrect, score, percentage });

    // Get session (using better-sqlite3 synchronous API)
    const session = db.prepare('SELECT id FROM test_sessions WHERE token = ?').get(sessionToken);
    
    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    console.log('Session found:', session.id);

    // Update answer with evaluation
    const updateAnswerQuery = `
      UPDATE answers 
      SET score = ?, 
          percentage_score = ?
      WHERE session_id = ? AND question_id = ?
    `;

    const updateResult = db.prepare(updateAnswerQuery).run(score, percentage, session.id, questionId);
    console.log(`✅ Respuesta actualizada - Changes: ${updateResult.changes}, Score: ${score}/${question.max_score}`);
    
    // Verificar que realmente se actualizó
    const verifyUpdate = db.prepare('SELECT score, percentage_score FROM answers WHERE session_id = ? AND question_id = ?').get(session.id, questionId);
    console.log('🔍 Verificación post-update:', verifyUpdate);

    // Recalcular el puntaje total de la sesión
    const sessionScoreQuery = `
      SELECT 
        SUM(a.score) as total_score,
        SUM(q.max_score) as max_possible_score
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      WHERE a.session_id = ?
    `;
    
    const sessionScores = db.prepare(sessionScoreQuery).get(session.id);
    console.log('Session scores:', sessionScores);
    
    if (sessionScores && sessionScores.max_possible_score > 0) {
      const sessionPercentage = (sessionScores.total_score / sessionScores.max_possible_score) * 100;
      
      console.log(`🔄 Recalculando puntaje de sesión: ${sessionScores.total_score}/${sessionScores.max_possible_score} = ${sessionPercentage.toFixed(2)}%`);
      
      // Actualizar puntaje de la sesión (sin updated_at que no existe)
      const updateSessionQuery = `
        UPDATE test_sessions 
        SET percentage_score = ?
        WHERE id = ?
      `;
      
      const sessionUpdateResult = db.prepare(updateSessionQuery).run(
        parseFloat(sessionPercentage.toFixed(2)), 
        session.id
      );
      
      console.log(`✅ Puntaje de sesión actualizado: ${sessionPercentage.toFixed(2)}% - Changes: ${sessionUpdateResult.changes}`);
    }

    res.json({
      success: true,
      correct: isCorrect,
      score,
      maxScore: question.max_score,
      percentage,
      correctAnswer: correctAnswer
    });
    
  } catch (error) {
    console.error('❌ Error en evaluación:', error);
    return res.status(500).json({ error: 'Error al actualizar evaluación: ' + error.message });
  }
});

export default router;