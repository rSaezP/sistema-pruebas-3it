import express from 'express';
import nodemailer from 'nodemailer';
import { authenticateToken } from './auth.js';
import { db } from '../database/init.js';

const router = express.Router();

// Email configuration - to be set via environment variables
const emailConfig = {
 host: process.env.SMTP_HOST || 'smtp.gmail.com',
 port: process.env.SMTP_PORT || 587,
 secure: false,
 auth: {
   user: process.env.SMTP_USER,
   pass: process.env.SMTP_PASS
 }
};

// Create transporter
const createTransporter = () => {
 if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
   console.warn('SMTP credentials not configured. Email functionality will be disabled.');
   return null;
 }
 
 return nodemailer.createTransport(emailConfig);
};

// Email templates
const emailTemplates = {
 testInvitation: (candidateName, testName, testUrl, timeLimit) => ({
   subject: `Invitación a Prueba Técnica - ${testName}`,
   html: `
     <!DOCTYPE html>
     <html>
     <head>
       <meta charset="utf-8">
       <style>
         body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
         .container { max-width: 600px; margin: 0 auto; padding: 20px; }
         .header { background: #000026; color: white; padding: 20px; text-align: center; }
         .content { padding: 20px; background: #f9f9f9; }
         .button { 
           display: inline-block; 
           padding: 12px 24px; 
           background: #005AEE; 
           color: white; 
           text-decoration: none; 
           border-radius: 6px; 
           margin: 20px 0; 
         }
         .info-box { 
           background: #e3f2fd; 
           border-left: 4px solid #005AEE; 
           padding: 15px; 
           margin: 20px 0; 
         }
         .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
       </style>
     </head>
     <body>
       <div class="container">
         <div class="header">
           <h1>3IT - Sistema de Pruebas Técnicas</h1>
         </div>
         
         <div class="content">
           <h2>Hola ${candidateName},</h2>
           
           <p>Has sido invitado(a) a realizar la prueba técnica <strong>"${testName}"</strong>.</p>
           
           <div class="info-box">
             <h3>📋 Información de la Prueba</h3>
             <ul>
               <li><strong>Nombre:</strong> ${testName}</li>
               <li><strong>Tiempo límite:</strong> ${timeLimit} minutos</li>
               <li><strong>Modalidad:</strong> Online</li>
             </ul>
           </div>
           
           <h3>📌 Instrucciones Importantes:</h3>
           <ol>
             <li>Haz clic en el botón de abajo para acceder a la prueba</li>
             <li>Asegúrate de tener una conexión estable a internet</li>
             <li>La prueba debe completarse en una sola sesión</li>
             <li>Una vez iniciada, el tiempo comenzará a correr</li>
             <li>Evita cambiar de pestaña o minimizar el navegador</li>
           </ol>
           
           <div style="text-align: center;">
             <a href="${testUrl}" class="button">Iniciar Prueba Técnica</a>
           </div>
           
           <p><small>Si tienes alguna pregunta o problema técnico, contacta con nuestro equipo de soporte.</small></p>
         </div>
         
         <div class="footer">
           <p>© 2024 3IT - Ingeniería y Desarrollo Ltda</p>
           <p>Este es un correo automático, por favor no responder.</p>
         </div>
       </div>
     </body>
     </html>
   `,
   text: `
     Hola ${candidateName},
     
     Has sido invitado(a) a realizar la prueba técnica "${testName}".
     
     Información de la Prueba:
     - Nombre: ${testName}
     - Tiempo límite: ${timeLimit} minutos
     
     Para acceder a la prueba, visita: ${testUrl}
     
     Instrucciones importantes:
     1. Asegúrate de tener una conexión estable a internet
     2. La prueba debe completarse en una sola sesión
     3. Una vez iniciada, el tiempo comenzará a correr
     4. Evita cambiar de pestaña o minimizar el navegador
     
     Si tienes alguna pregunta, contacta con nuestro equipo de soporte.
     
     © 2024 3IT - Ingeniería y Desarrollo Ltda
   `
 }),

 testCompleted: (candidateName, testName, score, status) => ({
   subject: `Prueba Técnica Completada - ${testName}`,
   html: `
     <!DOCTYPE html>
     <html>
     <head>
       <meta charset="utf-8">
       <style>
         body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
         .container { max-width: 600px; margin: 0 auto; padding: 20px; }
         .header { background: #000026; color: white; padding: 20px; text-align: center; }
         .content { padding: 20px; background: #f9f9f9; }
         .score-box { 
           background: ${score >= 70 ? '#d4edda' : score >= 50 ? '#fff3cd' : '#f8d7da'}; 
           border: 1px solid ${score >= 70 ? '#c3e6cb' : score >= 50 ? '#ffeaa7' : '#f5c6cb'}; 
           padding: 20px; 
           border-radius: 8px; 
           text-align: center; 
           margin: 20px 0; 
         }
         .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
       </style>
     </head>
     <body>
       <div class="container">
         <div class="header">
           <h1>3IT - Sistema de Pruebas Técnicas</h1>
         </div>
         
         <div class="content">
           <h2>¡Prueba Completada! 🎉</h2>
           
           <p>Hola ${candidateName},</p>
           
           <p>Has completado exitosamente la prueba técnica <strong>"${testName}"</strong>.</p>
           
           <div class="score-box">
             <h3>Tu Puntuación</h3>
             <h2 style="font-size: 36px; margin: 10px 0;">${score}/100</h2>
             <p>Estado: <strong>${status === 'completed' ? 'Completado' : 'En Revisión'}</strong></p>
           </div>
           
           <p>Nuestro equipo revisará tus respuestas y te contactaremos pronto con los resultados del proceso de selección.</p>
           
           <p>¡Gracias por tu tiempo y dedicación!</p>
         </div>
         
         <div class="footer">
           <p>© 2024 3IT - Ingeniería y Desarrollo Ltda</p>
         </div>
       </div>
     </body>
     </html>
   `,
   text: `
     ¡Prueba Completada!
     
     Hola ${candidateName},
     
     Has completado exitosamente la prueba técnica "${testName}".
     
     Tu Puntuación: ${score}/100
     Estado: ${status === 'completed' ? 'Completado' : 'En Revisión'}
     
     Nuestro equipo revisará tus respuestas y te contactaremos pronto.
     
     ¡Gracias por tu tiempo y dedicación!
     
     © 2024 3IT - Ingeniería y Desarrollo Ltda
   `
 })
};

// Send test invitation email
router.post('/send-invitation', async (req, res) => {
 const { candidateId, testId, sessionToken } = req.body;

 if (!candidateId || !testId || !sessionToken) {
   return res.status(400).json({ error: 'Faltan datos requeridos' });
 }

 const transporter = createTransporter();
 if (!transporter) {
   return res.status(500).json({ error: 'Servicio de email no configurado' });
 }

 try {
   // Get candidate and test details
   const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);
   const test = db.prepare('SELECT * FROM tests WHERE id = ?').get(testId);

   if (!candidate || !test) {
     return res.status(404).json({ error: 'Candidato o prueba no encontrada' });
   }

   // Generate test URL
   const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
   const testUrl = `${baseUrl}/test/${sessionToken}`;

   // Prepare email
   const emailTemplate = emailTemplates.testInvitation(
     `${candidate.name} ${candidate.lastname || ''}`.trim(),
     test.name,
     testUrl,
     test.time_limit
   );

    const mailOptions = {
    from: `"3IT Pruebas Técnicas" <${process.env.SMTP_USER}>`,
    to: candidate.email,  // ← ESTO ESTÁ BIEN ✅
    subject: emailTemplate.subject,
    html: emailTemplate.html,
    text: emailTemplate.text
  };

   // Send email
   await transporter.sendMail(mailOptions);
   
    // DEBUGGING - VER A DÓNDE SE ENVÍA
  console.log('=== EMAIL DEBUG ===');
  console.log('Candidate ID:', candidateId);
  console.log('Candidate email from DB:', candidate.email);
  console.log('Mail TO field:', mailOptions.to);
  console.log('Mail FROM field:', mailOptions.from);
  console.log('==================');

// Send email
await transporter.sendMail(mailOptions);




   res.json({ 
     message: 'Invitación enviada exitosamente',
     sentTo: candidate.email
   });

 } catch (error) {
   console.error('Error sending invitation email:', error);
   res.status(500).json({ error: 'Error al enviar la invitación' });
 }
});

// Send test completion notification
router.post('/send-completion', async (req, res) => {
 const { sessionId } = req.body;

 if (!sessionId) {
   return res.status(400).json({ error: 'Session ID requerido' });
 }

 const transporter = createTransporter();
 if (!transporter) {
   return res.status(500).json({ error: 'Servicio de email no configurado' });
 }

 try {
   // Get session details with candidate and test info
   const sessionDetails = db.prepare(`
     SELECT ts.*, c.name, c.lastname, c.email, t.name as test_name
     FROM test_sessions ts
     JOIN candidates c ON ts.candidate_id = c.id
     JOIN tests t ON ts.test_id = t.id
     WHERE ts.id = ?
   `).get(sessionId);

   if (!sessionDetails) {
     return res.status(404).json({ error: 'Sesión no encontrada' });
   }

   // Prepare email
   const emailTemplate = emailTemplates.testCompleted(
     `${sessionDetails.name} ${sessionDetails.lastname || ''}`.trim(),
     sessionDetails.test_name,
     Math.round(sessionDetails.percentage_score || 0),
     sessionDetails.status
   );

   const mailOptions = {
     from: `"3IT Pruebas Técnicas" <${process.env.SMTP_USER}>`,
     to: sessionDetails.email,
     subject: emailTemplate.subject,
     html: emailTemplate.html,
     text: emailTemplate.text
   };

   // Send email
   await transporter.sendMail(mailOptions);

   res.json({ 
     message: 'Notificación de finalización enviada exitosamente',
     sentTo: sessionDetails.email
   });

 } catch (error) {
   console.error('Error sending completion email:', error);
   res.status(500).json({ error: 'Error al enviar la notificación' });
 }
});

// Test email configuration
router.post('/test-config', async (req, res) => {
 const transporter = createTransporter();
 
 if (!transporter) {
   return res.status(400).json({ 
     error: 'Configuración de email no válida',
     details: 'Verifica las variables de entorno SMTP_USER y SMTP_PASS'
   });
 }

 try {
   await transporter.verify();
   res.json({ message: 'Configuración de email válida' });
 } catch (error) {
   console.error('Email configuration test failed:', error);
   res.status(500).json({ 
     error: 'Error en la configuración de email',
     details: error.message
   });
 }
});

// Debug endpoint - temporary
router.get('/debug', async (req, res) => {
 try {
   // Ver estructura de la tabla candidates
   const tableInfo = db.prepare("PRAGMA table_info(candidates)").all();
   
   // Ver todos los candidatos (sin especificar columnas problemáticas)
   const candidates = db.prepare('SELECT * FROM candidates').all();
   const tests = db.prepare('SELECT id, name FROM tests').all();
   
   res.json({
     tableStructure: tableInfo,
     candidates,
     tests,
     env: {
       smtp_user: process.env.SMTP_USER ? 'SET' : 'NOT SET',
       smtp_pass: process.env.SMTP_PASS ? 'SET' : 'NOT SET'
     }
   });
 } catch (error) {
   res.status(500).json({ error: error.message });
 }
});

export default router;

