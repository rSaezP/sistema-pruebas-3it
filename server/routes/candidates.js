import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/init.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Get all candidates with their test sessions
router.get('/', authenticateToken, (req, res) => {
  const query = `
    SELECT c.*,
           COUNT(ts.id) as total_tests,
           COUNT(CASE WHEN ts.status = 'completed' THEN 1 END) as completed_tests,
           COUNT(CASE WHEN ts.status = 'in_progress' THEN 1 END) as in_progress_tests,
           COUNT(CASE WHEN ts.status = 'pending' THEN 1 END) as pending_tests,
           AVG(CASE WHEN ts.status = 'completed' THEN ts.percentage_score END) as avg_score
    FROM candidates c
    LEFT JOIN test_sessions ts ON c.id = ts.candidate_id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error al obtener candidatos:', err);
      return res.status(500).json({ error: 'Error al obtener candidatos' });
    }
    res.json(rows);
  });
});

// Create new candidate
router.post('/', authenticateToken, (req, res) => {
  const { name, lastname, email, phone, position_applied, experience_level } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Nombre y email son requeridos' });
  }

  const query = `
    INSERT INTO candidates (name, lastname, email, phone, position_applied, experience_level)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [name, lastname, email, phone, position_applied, experience_level], function(err) {
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({ error: 'El email ya está registrado' });
      }
      console.error('Error al crear candidato:', err);
      return res.status(500).json({ error: 'Error al crear candidato' });
    }

    res.json({ id: this.lastID, message: 'Candidato creado exitosamente' });
  });
});

// Invite candidate to test
router.post('/:candidateId/invite', authenticateToken, (req, res) => {
  const { candidateId } = req.params;
  const { testId, customMessage } = req.body;

  if (!testId) {
    return res.status(400).json({ error: 'ID de prueba requerido' });
  }

  // Check if candidate exists
  db.get('SELECT * FROM candidates WHERE id = ?', [candidateId], (err, candidate) => {
    if (err) {
      console.error('Error al verificar candidato:', err);
      return res.status(500).json({ error: 'Error al verificar candidato' });
    }

    if (!candidate) {
      return res.status(404).json({ error: 'Candidato no encontrado' });
    }

    // Check if test exists
    db.get('SELECT * FROM tests WHERE id = ?', [testId], (err, test) => {
      if (err) {
        console.error('Error al verificar prueba:', err);
        return res.status(500).json({ error: 'Error al verificar prueba' });
      }

      if (!test) {
        return res.status(404).json({ error: 'Prueba no encontrada' });
      }

      // Check if session already exists for this candidate and test
      db.get('SELECT * FROM test_sessions WHERE candidate_id = ? AND test_id = ? AND status != "cancelled"', 
        [candidateId, testId], (err, existingSession) => {
        if (err) {
          console.error('Error al verificar sesión existente:', err);
          return res.status(500).json({ error: 'Error al verificar sesión' });
        }

        if (existingSession) {
          return res.status(400).json({ 
            error: 'El candidato ya tiene una sesión activa para esta prueba',
            sessionId: existingSession.id,
            token: existingSession.token
          });
        }

        // Create new test session
        const token = uuidv4();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours to complete

        const sessionQuery = `
          INSERT INTO test_sessions (candidate_id, test_id, token, time_limit_minutes, status)
          VALUES (?, ?, ?, ?, 'pending')
        `;

        db.run(sessionQuery, [candidateId, testId, token, test.time_limit], function(err) {
          if (err) {
            console.error('Error al crear sesión:', err);
            return res.status(500).json({ error: 'Error al crear sesión de prueba' });
          }

          const sessionId = this.lastID;
          const testUrl = `${req.protocol}://${req.get('host')}/test/${token}`;

          // Here you would send an email invitation
          // For now, we'll just return the test URL
          
          res.json({
            sessionId,
            token,
            testUrl,
            message: 'Invitación creada exitosamente',
            candidate: {
              name: candidate.name,
              email: candidate.email
            },
            test: {
              name: test.name,
              timeLimit: test.time_limit
            }
          });
        });
      });
    });
  });
});

// Get candidate test sessions
router.get('/:candidateId/sessions', authenticateToken, (req, res) => {
  const { candidateId } = req.params;

  const query = `
    SELECT ts.*, t.name as test_name, t.description as test_description
    FROM test_sessions ts
    JOIN tests t ON ts.test_id = t.id
    WHERE ts.candidate_id = ?
    ORDER BY ts.created_at DESC
  `;

  db.all(query, [candidateId], (err, rows) => {
    if (err) {
      console.error('Error al obtener sesiones:', err);
      return res.status(500).json({ error: 'Error al obtener sesiones' });
    }
    res.json(rows);
  });
});

export default router;