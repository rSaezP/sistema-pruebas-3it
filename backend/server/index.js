import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './database/init.js';
import authRoutes from './routes/auth.js';
import testsRoutes from './routes/tests.js';
import candidatesRoutes from './routes/candidates.js';
import sessionsRoutes from './routes/sessions.js';
import reportsRoutes from './routes/reports.js';
import evaluationRoutes from './routes/evaluation.js';
import evaluationExtraRoutes from './routes/evaluation-extra.js';
import emailRoutes from './routes/email.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize database
initDatabase();

// Función para verificar sesiones expiradas cada 30 minutos
const checkExpiredSessions = async () => {
  try {
    const response = await fetch(`http://localhost:${PORT}/api/candidates/update-expired-sessions`);
    const result = await response.json();
    if (result.success && result.updated_sessions > 0) {
      console.log(`🕐 [AUTO-EXPIRY] ${result.updated_sessions} sesiones marcadas como expiradas`);
    }
  } catch (error) {
    console.error('🕐 [AUTO-EXPIRY] Error:', error.message);
  }
};

// Ejecutar verificación cada 30 minutos (1800000 ms)
setInterval(checkExpiredSessions, 30 * 60 * 1000);

// Ejecutar una verificación inicial después de 10 segundos
setTimeout(checkExpiredSessions, 10000);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tests', testsRoutes);
app.use('/api/candidates', candidatesRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/evaluation', evaluationRoutes);
app.use('/api/evaluation', evaluationExtraRoutes);
app.use('/api/email', emailRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Sistema de Pruebas Técnicas 3IT - API funcionando',
    endpoints: [
      '/api/tests',
      '/api/candidates', 
      '/api/sessions',
      '/api/reports'
    ]
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: error.message
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
});