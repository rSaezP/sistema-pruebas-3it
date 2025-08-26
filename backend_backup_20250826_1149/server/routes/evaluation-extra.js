import express from 'express';
import { db } from '../database/init.js';

const router = express.Router();

// Run code for testing (before final submission)
router.post('/run-code', (req, res) => {
  const { code, language, question_id } = req.body;

  if (!code || !language) {
    return res.status(400).json({ error: 'Código y lenguaje son requeridos' });
  }

  try {
    // Enhanced execution for live testing
    const startTime = Date.now();
    let result = '';
    let error = null;
    
    if (language === 'javascript') {
      try {
        // Basic safety checks
        const dangerousPatterns = [
          /require\(/g,
          /import\s+/g,
          /process\./g,
          /global\./g,
          /window\./g,
          /document\./g,
          /eval\(/g,
          /setTimeout/g,
          /setInterval/g,
          /fetch\(/g,
          /XMLHttpRequest/g
        ];
        
        const hasDangerousCode = dangerousPatterns.some(pattern => pattern.test(code));
        if (hasDangerousCode) {
          throw new Error('Código contiene operaciones no permitidas');
        }

        // Create safe evaluation context
        const func = new Function(`
          "use strict";
          ${code}
          
          // If there's a function, call it with a sample input
          const funcNames = Object.getOwnPropertyNames(this).filter(name => 
            typeof this[name] === 'function' && 
            !['constructor', 'toString', 'valueOf'].includes(name)
          );
          
          if (funcNames.length > 0) {
            return this[funcNames[0]]([1, 2, 3]); // Sample input
          }
          
          return "Código ejecutado correctamente";
        `);
        
        result = String(func.call({}));
        
      } catch (execError) {
        error = execError.message;
      }
    } else if (language === 'python') {
      // Python simulation
      result = 'Código Python simulado ejecutado correctamente';
    } else if (language === 'sql') {
      // SQL validation
      const upperCode = code.toUpperCase();
      if (upperCode.includes('SELECT') && upperCode.includes('FROM')) {
        result = 'Consulta SQL válida';
      } else {
        error = 'Consulta SQL inválida - debe contener SELECT y FROM';
      }
    } else {
      error = 'Lenguaje no soportado';
    }

    const executionTime = Date.now() - startTime;

    res.json({
      success: !error,
      output: result,
      error: error,
      executionTime: executionTime
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      output: '',
      error: error.message
    });
  }
});

// Validate SQL query
router.post('/validate-sql', (req, res) => {
  const { sql, question_id } = req.body;

  if (!sql) {
    return res.status(400).json({ error: 'Consulta SQL requerida' });
  }

  try {
    const cleanSQL = sql.trim().toUpperCase();
    
    // Check for dangerous operations
    const dangerousPatterns = [
      /DROP\s+/g,
      /DELETE\s+/g,
      /UPDATE\s+/g,
      /INSERT\s+/g,
      /ALTER\s+/g,
      /CREATE\s+/g,
      /TRUNCATE\s+/g
    ];
    
    const hasDangerousOps = dangerousPatterns.some(pattern => pattern.test(cleanSQL));
    if (hasDangerousOps) {
      return res.json({
        valid: false,
        error: 'Operaciones de modificación no permitidas'
      });
    }
    
    // Check basic SQL structure
    if (!cleanSQL.includes('SELECT')) {
      return res.json({
        valid: false,
        error: 'Consulta debe contener SELECT'
      });
    }

    if (!cleanSQL.includes('FROM')) {
      return res.json({
        valid: false,
        error: 'Consulta debe contener FROM'
      });
    }

    // Basic syntax validation
    const openParens = (cleanSQL.match(/\(/g) || []).length;
    const closeParens = (cleanSQL.match(/\)/g) || []).length;
    
    if (openParens !== closeParens) {
      return res.json({
        valid: false,
        error: 'Paréntesis no balanceados'
      });
    }

    res.json({
      valid: true,
      message: 'Consulta SQL válida',
      suggestions: [
        'Considera usar alias para las tablas',
        'Verifica que los nombres de columnas sean correctos'
      ]
    });

  } catch (error) {
    res.status(500).json({
      valid: false,
      error: 'Error al validar SQL: ' + error.message
    });
  }
});

// Calculate percentiles for completed sessions
router.post('/calculate-percentiles', (req, res) => {
  const { test_id } = req.body;

  if (!test_id) {
    return res.status(400).json({ error: 'test_id requerido' });
  }

  // Get all completed sessions for this test
  const query = `
    SELECT id, total_score, percentage_score
    FROM test_sessions 
    WHERE test_id = ? AND status = 'completed' AND total_score IS NOT NULL
    ORDER BY percentage_score DESC
  `;

  db.all(query, [test_id], (err, sessions) => {
    if (err) {
      console.error('Error al obtener sesiones:', err);
      return res.status(500).json({ error: 'Error al calcular percentiles' });
    }

    if (sessions.length === 0) {
      return res.json({ message: 'No hay sesiones completadas para calcular percentiles' });
    }

    // Calculate percentiles for each session
    const updates = sessions.map((session, index) => {
      const percentile = Math.round(((sessions.length - index) / sessions.length) * 100);
      return { sessionId: session.id, percentile };
    });

    // Update percentiles in database
    let completed = 0;
    const total = updates.length;

    updates.forEach(update => {
      db.run(
        'UPDATE test_sessions SET percentile = ? WHERE id = ?',
        [update.percentile, update.sessionId],
        (err) => {
          if (err) {
            console.error('Error al actualizar percentil:', err);
          }
          
          completed++;
          if (completed === total) {
            res.json({
              success: true,
              updated: total,
              message: 'Percentiles calculados correctamente'
            });
          }
        }
      );
    });
  });
});

// Get session performance summary
router.get('/session-summary/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  const query = `
    SELECT 
      ts.*,
      t.name as test_name,
      c.name as candidate_name,
      c.lastname as candidate_lastname,
      c.email as candidate_email,
      COUNT(a.id) as total_answers,
      SUM(CASE WHEN a.score > 0 THEN 1 ELSE 0 END) as correct_answers,
      AVG(a.percentage_score) as avg_question_score
    FROM test_sessions ts
    LEFT JOIN tests t ON ts.test_id = t.id
    LEFT JOIN candidates c ON ts.candidate_id = c.id
    LEFT JOIN answers a ON ts.id = a.session_id
    WHERE ts.id = ?
    GROUP BY ts.id
  `;

  db.get(query, [sessionId], (err, session) => {
    if (err) {
      console.error('Error al obtener resumen de sesión:', err);
      return res.status(500).json({ error: 'Error al obtener resumen' });
    }

    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    // Get detailed answer breakdown by category
    const categoryQuery = `
      SELECT 
        cat.name as category_name,
        COUNT(a.id) as questions_count,
        AVG(a.percentage_score) as avg_score,
        SUM(a.score) as total_score,
        SUM(q.max_score) as max_possible_score
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      LEFT JOIN categories cat ON q.category_id = cat.id
      WHERE a.session_id = ?
      GROUP BY cat.id, cat.name
    `;

    db.all(categoryQuery, [sessionId], (err, categories) => {
      if (err) {
        console.error('Error al obtener breakdown por categorías:', err);
        return res.status(500).json({ error: 'Error al obtener breakdown' });
      }

      res.json({
        session,
        categories: categories || [],
        performance: {
          completion_rate: session.total_answers > 0 ? 
            Math.round((session.correct_answers / session.total_answers) * 100) : 0,
          time_efficiency: session.time_limit_minutes > 0 ? 
            Math.round((session.time_spent_seconds / 60 / session.time_limit_minutes) * 100) : 0,
          avg_question_score: Math.round(session.avg_question_score || 0)
        }
      });
    });
  });
});

export default router;