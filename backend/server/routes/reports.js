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
    results.averageScore = averageScore.avg || 0;
    
    // Get recent sessions
    const recentSessionsQuery = `
      SELECT ts.*, c.name as candidate_name, c.email, t.name as test_name,
             ts.percentage_score, ts.status, ts.created_at
      FROM test_sessions ts
      JOIN candidates c ON ts.candidate_id = c.id
      JOIN tests t ON ts.test_id = t.id
      ORDER BY ts.created_at DESC
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
             c.name as category_name, c.color as category_color
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      LEFT JOIN categories c ON q.category_id = c.id
      WHERE a.session_id = ?
      ORDER BY q.order_index
    `;

    const answers = db.prepare(answersQuery).all(sessionId);

    // Calculate score by category
    const scoresByCategory = answers.reduce((acc, answer) => {
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
      answers,
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