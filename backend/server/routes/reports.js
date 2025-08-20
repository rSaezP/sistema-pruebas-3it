import express from 'express';
import { db } from '../database/init.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Get dashboard metrics
router.get('/dashboard', authenticateToken, (req, res) => {
  const queries = {
    totalTests: 'SELECT COUNT(*) as count FROM tests',
    totalCandidates: 'SELECT COUNT(*) as count FROM candidates',
    activeSessions: 'SELECT COUNT(*) as count FROM test_sessions WHERE status = "in_progress"',
    completedSessions: 'SELECT COUNT(*) as count FROM test_sessions WHERE status = "completed"',
    averageScore: 'SELECT AVG(percentage_score) as avg FROM test_sessions WHERE status = "completed"'
  };

  const results = {};
  let completed = 0;
  const totalQueries = Object.keys(queries).length;

  Object.entries(queries).forEach(([key, query]) => {
    db.get(query, [], (err, row) => {
      if (err) {
        console.error(`Error en consulta ${key}:`, err);
        results[key] = 0;
      } else {
        results[key] = row.count !== undefined ? row.count : (row.avg || 0);
      }
      
      completed++;
      if (completed === totalQueries) {
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

        db.all(recentSessionsQuery, [], (err, sessions) => {
          if (err) {
            console.error('Error al obtener sesiones recientes:', err);
            results.recentSessions = [];
          } else {
            results.recentSessions = sessions;
          }

          res.json(results);
        });
      }
    });
  });
});

// Get detailed session report
router.get('/session/:sessionId', authenticateToken, (req, res) => {
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

  db.get(sessionQuery, [sessionId], (err, session) => {
    if (err) {
      console.error('Error al obtener sesión:', err);
      return res.status(500).json({ error: 'Error al obtener sesión' });
    }

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

    db.all(answersQuery, [sessionId], (err, answers) => {
      if (err) {
        console.error('Error al obtener respuestas:', err);
        return res.status(500).json({ error: 'Error al obtener respuestas' });
      }

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
    });
  });
});

export default router;