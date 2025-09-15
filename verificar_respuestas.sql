-- Script para verificar respuestas en base de datos
-- Ejecutar en SQLite Browser o línea de comandos

-- Ver las respuestas más recientes
SELECT 
  a.id,
  a.session_id,
  a.question_id,
  a.answer_text,
  a.score,
  a.percentage_score,
  q.type,
  q.title,
  q.options,
  q.correct_answer,
  ts.token
FROM answers a
JOIN questions q ON a.question_id = q.id  
JOIN test_sessions ts ON a.session_id = ts.id
WHERE q.type = 'multiple_choice'
ORDER BY a.id DESC
LIMIT 10;

-- Ver todas las sesiones recientes
SELECT 
  ts.id,
  ts.token,
  ts.status,
  c.name,
  COUNT(a.id) as total_answers
FROM test_sessions ts
LEFT JOIN candidates c ON ts.candidate_id = c.id
LEFT JOIN answers a ON ts.id = a.session_id  
GROUP BY ts.id
ORDER BY ts.id DESC
LIMIT 5;