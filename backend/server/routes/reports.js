import express from 'express';
import { db } from '../database/init.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Get dashboard metrics
router.get('/dashboard', (req, res) => {
  try {
    const results = {};
    
    // Execute queries synchronously with better-sqlite3
    const totalTests = db.prepare('SELECT COUNT(*) as count FROM tests').get();
    results.totalTests = totalTests.count || 0;
    
    const totalCandidates = db.prepare('SELECT COUNT(*) as count FROM candidates').get();
    results.totalCandidates = totalCandidates.count || 0;
    
    const activeSessions = db.prepare("SELECT COUNT(*) as count FROM test_sessions WHERE status = 'in_progress'").get();
    results.activeSessions = activeSessions.count || 0;
    
    const completedSessions = db.prepare("SELECT COUNT(*) as count FROM test_sessions WHERE status = 'completed'").get();
    results.completedSessions = completedSessions.count || 0;
    
    const averageScore = db.prepare("SELECT AVG(percentage_score) as avg FROM test_sessions WHERE status = 'completed'").get();
    results.averageScore = Math.round(averageScore.avg || 0);
    
    // Calcular tiempo promedio real (en minutos)
    const averageTimeQuery = `
      SELECT AVG(
        CASE 
          WHEN started_at IS NOT NULL AND finished_at IS NOT NULL 
          THEN (julianday(finished_at) - julianday(started_at)) * 24 * 60
          ELSE NULL 
        END
      ) as avg_time_minutes
      FROM test_sessions 
      WHERE status = 'completed' 
        AND started_at IS NOT NULL 
        AND finished_at IS NOT NULL
    `;
    const averageTimeResult = db.prepare(averageTimeQuery).get();
    results.averageTime = Math.round(averageTimeResult.avg_time_minutes || 45);
    
    // Get recent COMPLETED sessions with duration
    const recentSessionsQuery = `
      SELECT ts.*, c.name as candidate_name, c.email, t.name as test_name,
             ts.percentage_score, ts.status, ts.finished_at, ts.created_at,
             CASE 
               WHEN ts.started_at IS NOT NULL AND ts.finished_at IS NOT NULL 
               THEN ROUND((julianday(ts.finished_at) - julianday(ts.started_at)) * 24 * 60, 0)
               ELSE ts.time_spent_seconds / 60 
             END as duration_minutes
      FROM test_sessions ts
      JOIN candidates c ON ts.candidate_id = c.id
      JOIN tests t ON ts.test_id = t.id
      WHERE ts.status = 'completed'
      ORDER BY ts.finished_at DESC
      LIMIT 10
    `;
    
    const sessions = db.prepare(recentSessionsQuery).all();
    results.recentSessions = sessions || [];
    
    // Get performance by test (real data)
    const performanceQuery = `
      SELECT t.name as test_name, 
             AVG(ts.percentage_score) as avg_score,
             COUNT(ts.id) as total_sessions
      FROM tests t
      LEFT JOIN test_sessions ts ON t.id = ts.test_id AND ts.status = 'completed'
      GROUP BY t.id, t.name
      ORDER BY t.name
    `;
    const performanceData = db.prepare(performanceQuery).all();
    results.performanceByTest = performanceData || [];
    
    // Get skills analysis by category (real data)
    const skillsQuery = `
      SELECT c.name as skill_name,
             c.color as skill_color,
             AVG(a.percentage_score) as avg_score,
             COUNT(DISTINCT a.session_id) as tested_count
      FROM categories c
      LEFT JOIN questions q ON c.id = q.category_id
      LEFT JOIN answers a ON q.id = a.question_id
      LEFT JOIN test_sessions ts ON a.session_id = ts.id AND ts.status = 'completed'
      WHERE a.percentage_score IS NOT NULL
      GROUP BY c.id, c.name, c.color
      HAVING tested_count > 0
      ORDER BY c.name
    `;
    const skillsData = db.prepare(skillsQuery).all();
    results.skillsAnalysis = skillsData || [];
    
    res.json(results);
    
  } catch (error) {
    console.error('Error en dashboard:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: error.message 
    });
  }
});

// Get detailed session report
router.get('/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;

    // Get session details
    const sessionQuery = `
      SELECT ts.*, c.name as candidate_name, c.lastname, c.email, c.position_applied,
             t.name as test_name, t.description as test_description, t.time_limit
      FROM test_sessions ts
      JOIN candidates c ON ts.candidate_id = c.id
      JOIN tests t ON ts.test_id = t.id
      WHERE ts.id = ?
    `;

    const session = db.prepare(sessionQuery).get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    // Get answers with question details
    const answersQuery = `
      SELECT a.*, q.title, q.description, q.type, q.difficulty, q.max_score as question_max_score,
             q.options, q.correct_answer,
             c.name as category_name, c.color as category_color
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      LEFT JOIN categories c ON q.category_id = c.id
      WHERE a.session_id = ?
      ORDER BY q.order_index
    `;

    const answers = db.prepare(answersQuery).all(sessionId);
    
    console.log('=== DEBUG REPORT ANSWERS ===');
    console.log('SessionId:', sessionId);
    console.log('Raw answers from DB:', answers.length);
    answers.forEach((answer, index) => {
      console.log(`Answer ${index}:`, {
        id: answer.id,
        question_id: answer.question_id,
        answer_text: answer.answer_text,
        score: answer.score,
        type: answer.type,
        options: answer.options ? answer.options.substring(0, 100) + '...' : 'null'
      });
    });

    // Process answers to add formatted information
    const processedAnswers = answers.map(answer => {
      const processed = { ...answer };
      
      // For multiple choice questions, add formatted answer text
      if (answer.type === 'multiple_choice' && answer.options) {
        console.log(`Processing multiple choice - ID ${answer.id}:`);
        console.log('  answer_text:', answer.answer_text, 'type:', typeof answer.answer_text);
        console.log('  correct_answer:', answer.correct_answer);
        console.log('  options:', answer.options);
        
        try {
          const options = JSON.parse(answer.options);
          const selectedIndex = parseInt(answer.answer_text);
          
          console.log('  Parsed selectedIndex:', selectedIndex, 'isNaN:', isNaN(selectedIndex));
          console.log('  Options array length:', options.length);
          
          if (!isNaN(selectedIndex) && options[selectedIndex]) {
            processed.formatted_answer = options[selectedIndex].text;
            processed.selected_option_text = options[selectedIndex].text;
            processed.is_correct = selectedIndex.toString() === answer.correct_answer;
            
            // Add all options for display
            processed.all_options = options;
            processed.correct_option_text = options[parseInt(answer.correct_answer)]?.text || 'No definida';
            
            console.log('  ✅ Processed successfully:', {
              formatted_answer: processed.formatted_answer,
              is_correct: processed.is_correct
            });
          } else {
            processed.formatted_answer = 'Respuesta inválida';
            processed.selected_option_text = 'No seleccionada';
            processed.is_correct = false;
            console.log('  ❌ Invalid selection - selectedIndex or options problem');
          }
        } catch (error) {
          console.error('  ❌ Error processing multiple choice answer:', error);
          processed.formatted_answer = answer.answer_text;
          processed.selected_option_text = 'Error al procesar';
          processed.is_correct = false;
        }
      } else {
        // For other question types, keep original answer text
        processed.formatted_answer = answer.answer_text;
      }
      
      return processed;
    });

    // Calculate score by category (using processed answers)
    const scoresByCategory = processedAnswers.reduce((acc, answer) => {
      const category = answer.category_name || 'Sin categoría';
      if (!acc[category]) {
        acc[category] = { total: 0, max: 0, color: answer.category_color || '#005AEE' };
      }
      acc[category].total += answer.score || 0;
      acc[category].max += answer.question_max_score || 0;
      return acc;
    }, {});

    // Calculate percentile (mock calculation - in production compare with other candidates)
    const percentile = session.percentage_score ? 
      Math.min(95, Math.max(5, session.percentage_score + Math.random() * 10 - 5)) : 0;

    res.json({
      session: { ...session, percentile },
      answers: processedAnswers,
      scoresByCategory,
      summary: {
        totalScore: session.total_score || 0,
        maxPossibleScore: session.max_possible_score || 0,
        percentageScore: session.percentage_score || 0,
        timeSpent: session.time_spent_seconds || 0,
        questionsAnswered: answers.length,
        percentile
      }
    });

  } catch (error) {
    console.error('Error al obtener sesión:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: error.message 
    });
  }
});

export default router;