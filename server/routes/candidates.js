import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/init.js';
import crypto from 'crypto';

const router = express.Router();

// Get all candidates with their test sessions
router.get('/', (req, res) => {
  try {
    const candidatesQuery = `
      SELECT c.*,
             COUNT(DISTINCT s.id) as total_tests,
             COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END) as completed_tests,
             COUNT(DISTINCT CASE WHEN s.status = 'in_progress' THEN s.id END) as in_progress_tests,
             COUNT(DISTINCT CASE WHEN s.status = 'pending' THEN s.id END) as pending_tests,
             AVG(CASE WHEN s.status = 'completed' THEN s.percentage_score END) as avg_score
      FROM candidates c
      LEFT JOIN test_sessions s ON c.id = s.candidate_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `;

    const candidates = db.prepare(candidatesQuery).all();
    
    // Format the response
    const candidatesWithStats = candidates.map(candidate => ({
      ...candidate,
      avg_score: candidate.avg_score ? Math.round(candidate.avg_score * 100) / 100 : null
    }));

    res.json(candidatesWithStats);
  } catch (error) {
    console.error('Error al obtener candidatos:', error);
    res.status(500).json({ error: 'Error al obtener candidatos' });
  }
});

// Create new candidate
router.post('/', (req, res) => {
  try {
    const { 
      name, 
      lastname, 
      email, 
      phone, 
      position_applied, 
      experience_level, 
      test_id, 
      expires_at, 
      custom_message 
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Nombre y email son requeridos' });
    }

    // Verificar si ya existe un candidato con el mismo email Y misma prueba
    const existingCandidate = db.prepare(
      'SELECT id, name, test_id FROM candidates WHERE email = ? AND test_id = ?'
    ).get(email, test_id);
    
    if (existingCandidate) {
      const testName = db.prepare('SELECT name FROM tests WHERE id = ?').get(test_id)?.name || 'esta prueba';
      return res.status(400).json({ 
        error: 'candidate_exists',
        message: `El candidato ${existingCandidate.name} ya está registrado para ${testName}`,
        candidateId: existingCandidate.id
      });
    }

    // Generate session token for the test
    const sessionToken = crypto.randomUUID();

    const insertQuery = `
      INSERT INTO candidates (
        name, lastname, email, phone, position_applied, experience_level, 
        test_id, expires_at, status, session_token, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const timestamp = new Date().toISOString();
    const values = [
      name,
      lastname || '',
      email,
      phone || null,
      position_applied || '',
      experience_level || null,
      test_id || null,
      expires_at || null,
      'pending',
      sessionToken,
      timestamp,
      timestamp
    ];

    const result = db.prepare(insertQuery).run(...values);

    res.json({ 
      id: result.lastInsertRowid, 
      sessionToken,
      message: 'Candidato creado exitosamente' 
    });
  } catch (error) {
    console.error('Error al crear candidato:', error);
    res.status(500).json({ error: 'Error al crear candidato' });
  }
});

// Invite candidate to test
router.post('/:candidateId/invite', (req, res) => {
  try {
    const candidateId = parseInt(req.params.candidateId);
    const { testId, customMessage } = req.body;

    if (!testId) {
      return res.status(400).json({ error: 'ID de prueba requerido' });
    }

    // Check if candidate exists
    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);
    
    if (!candidate) {
      return res.status(404).json({ error: 'Candidato no encontrado' });
    }

    // Check if test exists
    const test = db.prepare('SELECT * FROM tests WHERE id = ?').get(parseInt(testId));
    
    if (!test) {
      return res.status(404).json({ error: 'Prueba no encontrada' });
    }

    // Check if session already exists for this candidate and test
    const existingSession = db.prepare(`
      SELECT * FROM test_sessions 
      WHERE candidate_id = ? AND test_id = ? AND status != 'cancelled'
    `).get(candidateId, parseInt(testId));
    
    if (existingSession) {
      return res.status(400).json({ 
        error: 'El candidato ya tiene una sesión activa para esta prueba',
        sessionId: existingSession.id,
        token: existingSession.token
      });
    }

    // Create new test session
    const token = uuidv4();
    const timestamp = new Date().toISOString();
    
    const insertSessionQuery = `
      INSERT INTO test_sessions (candidate_id, test_id, token, time_limit_minutes, status, started_at, completed_at, percentage_score, time_spent_seconds, browser_info, ip_address, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const sessionValues = [
      candidateId,
      parseInt(testId),
      token,
      test.time_limit,
      'pending',
      null,
      null,
      null,
      null,
      null,
      null,
      timestamp,
      timestamp
    ];

    const result = db.prepare(insertSessionQuery).run(...sessionValues);

    const testUrl = `${req.protocol}://${req.get('host')}/test/${token}`;

    res.json({
      sessionId: result.lastInsertRowid,
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
  } catch (error) {
    console.error('Error al crear invitación:', error);
    res.status(500).json({ error: 'Error al crear invitación' });
  }
});

// Delete candidate
router.delete('/:id', (req, res) => {
  try {
    const candidateId = parseInt(req.params.id);
    
    if (isNaN(candidateId)) {
      return res.status(400).json({ error: 'ID de candidato no válido' });
    }
    
    // Verificar si el candidato existe
    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidato no encontrado' });
    }
    
    // Iniciar una transacción para asegurar la integridad de los datos
    db.prepare('BEGIN TRANSACTION').run();
    
    try {
      // Primero eliminar las sesiones relacionadas
      db.prepare('DELETE FROM test_sessions WHERE candidate_id = ?').run(candidateId);
      
      // Luego eliminar el candidato
      const result = db.prepare('DELETE FROM candidates WHERE id = ?').run(candidateId);
      
      db.prepare('COMMIT').run();
      
      if (result.changes === 0) {
        return res.status(404).json({ error: 'No se pudo eliminar el candidato' });
      }
      
      res.status(200).json({ 
        message: 'Candidato eliminado correctamente',
        candidateId: candidateId
      });
      
    } catch (error) {
      db.prepare('ROLLBACK').run();
      throw error; // Esto será capturado por el catch externo
    }
    
  } catch (error) {
    console.error('Error al eliminar candidato:', error);
    res.status(500).json({ 
      error: 'Error al eliminar el candidato',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get candidate test sessions
router.get('/:candidateId/sessions', (req, res) => {
  try {
    const candidateId = parseInt(req.params.candidateId);

    const sessionsQuery = `
      SELECT s.*, t.name as test_name, t.description as test_description
      FROM test_sessions s
      LEFT JOIN tests t ON s.test_id = t.id
      WHERE s.candidate_id = ?
      ORDER BY s.created_at DESC
    `;

    const sessions = db.prepare(sessionsQuery).all(candidateId);
    
    res.json(sessions);
  } catch (error) {
    console.error('Error al obtener sesiones:', error);
    res.status(500).json({ error: 'Error al obtener sesiones' });
  }
});

export default router;